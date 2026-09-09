// One-off companion to supabase/migrations/0010_image_library_audit.sql.
//
// The migration is pure SQL and cannot touch storage. Three things here do:
//
//  1. Move the About stage's second photograph from position 3 to position 2,
//     files included. The library used to offer three placements for a stage
//     that renders two, with the middle one labelled "Unused"; dropping it
//     leaves a hole unless the photograph after it moves down.
//
//  2. Clear the photograph uploaded to `alicore-hero`. That slot pointed at
//     nothing for as long as the hero has served its own files, so whatever
//     was uploaded there was never on the site. The slot now backs the hero's
//     nine frames, and a single landscape image sitting in frame 1 would crop
//     to a portrait sliver next to eight photographs chosen for that shape.
//
//  3. Delete stored files that no longer correspond to a placement: the
//     pre-gallery path shape (slots/<id>/<width>.webp, before positions
//     existed) and the odd widths an early seeding script wrote by naming each
//     file after its clamped pixel width instead of the nominal target. The
//     site only ever requests 640, 1280 and 2000.
//
// Safe to run more than once: every step checks for what it is about to do.
//
//   node scripts/image-library-audit.mjs [--apply]
//
// Without --apply it prints what it would do and changes nothing.

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const WIDTHS = ['640', '1280', '2000'];
const APPLY = process.argv.includes('--apply');

function loadEnv() {
  const env = {};
  for (const line of readFileSync(join(__dirname, '..', '..', '.env'), 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

const env = loadEnv();
const supabase = createClient(env.PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function say(action, detail) {
  console.log(`${APPLY ? '' : '[dry run] '}${action}  ${detail}`);
}

async function moveAboutPanel() {
  const { data: rows, error } = await supabase
    .from('media_assets')
    .select('id, position')
    .eq('slot_id', 'alicore-about')
    .eq('is_active', true);
  if (error) throw new Error(error.message);

  const atThree = rows.find((r) => r.position === 3);
  if (!atThree) {
    console.log('About: nothing at position 3 — already moved.');
    return;
  }

  // A row at position 2 alongside one at position 3 is the placement that was
  // labelled "Unused" -- the only state in which that row is stale. Once the
  // move has happened, position 2 IS the left panel, so this has to be keyed
  // on position 3 still existing rather than on position 2 existing.
  const staleMiddle = rows.find((r) => r.position === 2);
  if (staleMiddle) {
    say('delete row', 'media_assets alicore-about position 2 (the unused middle placement)');
    if (APPLY) {
      const { error: delErr } = await supabase.from('media_assets').delete().eq('id', staleMiddle.id);
      if (delErr) throw new Error(delErr.message);
    }
  }

  for (const w of WIDTHS) {
    const from = `slots/alicore-about/3/${w}.webp`;
    const to = `slots/alicore-about/2/${w}.webp`;
    say('move file', `${from} -> ${to}`);
    if (!APPLY) continue;
    // The unused middle placement had its own files. copy() refuses to write
    // over an existing object, so clear the destination first.
    await supabase.storage.from('media').remove([to]);
    const { error: copyErr } = await supabase.storage.from('media').copy(from, to);
    if (copyErr) throw new Error(`${from}: ${copyErr.message}`);
    const { error: rmErr } = await supabase.storage.from('media').remove([from]);
    if (rmErr) throw new Error(`${from}: ${rmErr.message}`);
  }

  say('move row', 'media_assets alicore-about position 3 -> 2');
  if (APPLY) {
    const { error: updErr } = await supabase
      .from('media_assets')
      .update({ position: 2 })
      .eq('id', atThree.id);
    if (updErr) throw new Error(updErr.message);
  }
}

async function clearHero() {
  const { data: rows, error } = await supabase
    .from('media_assets')
    .select('id, position')
    .eq('slot_id', 'alicore-hero')
    .eq('is_active', true);
  if (error) throw new Error(error.message);
  if (!rows.length) {
    console.log('Hero: no uploaded photograph — nothing to clear.');
    return;
  }
  for (const row of rows) {
    say('delete row', `media_assets alicore-hero position ${row.position}`);
    if (!APPLY) continue;
    const { error: delErr } = await supabase.from('media_assets').delete().eq('id', row.id);
    if (delErr) throw new Error(delErr.message);
  }
}

/** Every object in the bucket, walked depth-first. */
async function listAll(prefix = '', depth = 0, out = []) {
  const { data, error } = await supabase.storage.from('media').list(prefix, { limit: 1000 });
  if (error) throw new Error(`${prefix}: ${error.message}`);
  for (const entry of data) {
    const path = prefix ? `${prefix}/${entry.name}` : entry.name;
    // A folder comes back with a null id and no metadata.
    if (entry.id === null && depth < 4) await listAll(path, depth + 1, out);
    else out.push(path);
  }
  return out;
}

async function deleteOrphanFiles() {
  const { data: assets, error } = await supabase
    .from('media_assets')
    .select('slot_id, position')
    .eq('is_active', true);
  if (error) throw new Error(error.message);
  const live = new Set(assets.map((a) => `${a.slot_id}/${a.position ?? 1}`));

  const orphans = [];
  for (const path of await listAll()) {
    const m = path.match(/^slots\/([^/]+)\/(\d+)\/(\d+)\.webp$/);
    if (!m) {
      orphans.push([path, 'path shape predates positions']);
      continue;
    }
    const [, slot, position, width] = m;
    if (!live.has(`${slot}/${position}`)) orphans.push([path, 'no placement uses it']);
    else if (!WIDTHS.includes(width)) orphans.push([path, 'width the site never requests']);
  }

  if (!orphans.length) {
    console.log('Storage: no orphan files.');
    return;
  }
  for (const [path, why] of orphans) say('delete file', `${path}  (${why})`);
  if (!APPLY) return;

  // remove() takes a batch, but a long list is easier to read back in chunks.
  for (let i = 0; i < orphans.length; i += 50) {
    const batch = orphans.slice(i, i + 50).map(([p]) => p);
    const { error: rmErr } = await supabase.storage.from('media').remove(batch);
    if (rmErr) throw new Error(rmErr.message);
  }
  console.log(`Deleted ${orphans.length} orphan files.`);
}

async function main() {
  await moveAboutPanel();
  await clearHero();
  await deleteOrphanFiles();
  console.log(APPLY ? '\nDone.' : '\nDry run only. Re-run with --apply to make these changes.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
