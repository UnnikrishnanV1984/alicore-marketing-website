// Applies the slot metadata in supabase/migrations/0010_image_library_audit.sql
// through the API, for the same reason seed-slot-image.mjs exists: this project
// has no SQL runner wired up, so a migration's row changes are replayed here.
//
// Declarative and re-runnable -- the table below is the intended state of
// media_slots, so running it twice changes nothing the second time. If a slot
// is added to a migration later, add it here too.
//
// Slot METADATA only. Nothing here touches media_assets or storage: which
// photographs exist is not something a re-runnable sync can reason about, and
// the one-time asset moves live in image-library-audit.mjs instead.
//
//   node scripts/apply-slot-metadata.mjs [--apply]

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes('--apply');

// group | sort | title | placeholder, in tab order. The placeholders are the
// art-direction notes written for each placement and shown on the live site
// while a slot is empty -- they are reproduced here so this stays a full
// picture of the intended state, not so they can be rewritten.
const SLOTS = [
  ['alicore-hero', 'Home', 10, 'Hero — background wall', 'Portrait photograph for one frame of the hero wall'],
  ['alicore-why', 'Home', 20, 'Behind "Why Choose Alicore?"', 'Wide architectural photograph used behind the Why Choose Alicore section'],

  ['alicore-about', 'About', 110, 'Who We Are — stage photographs', 'Close-up: GFRC surface texture / finished panel'],
  ['alicore-cap-1', 'About', 120, 'Custom Manufacturing', 'Panel being cast or moulded to a project drawing'],
  ['alicore-cap-2', 'About', 130, 'Material Expertise', 'GFRC and FRP material or texture close-up'],
  ['alicore-cap-3', 'About', 140, 'Project Support', 'Drawing review or site coordination'],
  ['alicore-cap-4', 'About', 150, 'Scalable Production', 'Multiple panels in production on the factory floor'],

  ['alicore-gfrc', 'Products', 210, 'GFRC section — stage photograph', 'GFRC facade / jali screen close-up'],
  ['alicore-frp', 'Products', 220, 'FRP section — stage photograph', 'FRP element / moulded component photo'],
  ['alicore-prod-1', 'Products', 230, 'GFRC Architectural Panels', 'Large-format GFRC panel facade'],
  ['alicore-prod-2', 'Products', 240, 'GFRC Cornices', 'Cornice profile detail'],
  ['alicore-prod-3', 'Products', 250, 'GFRC Columns & Pillars', 'Column cladding at entrance'],
  ['alicore-prod-4', 'Products', 260, 'GFRC Jalis', 'Perforated jali screen'],
  ['alicore-prod-5', 'Products', 270, 'GFRC Decorative Elements', 'Moulding and trim detail'],
  ['alicore-prod-6', 'Products', 280, 'FRP Architectural Products', 'FRP moulded element'],
  ['alicore-prod-7', 'Products', 290, 'Custom Architectural Elements', 'Custom element from drawing'],

  ['alicore-factory', 'Manufacturing', 310, 'Production floor — two photographs', 'Production floor: GFRC spray / mould work'],
  ['alicore-journey', 'Manufacturing', 320, 'Behind the six stages', 'Wide photograph behind the Design / Mould Development steps'],
  ['alicore-planning', 'Manufacturing', 330, 'Behind "Planning a project?"', 'Wide photograph behind the manufacturing page closing band'],

  ['alicore-custom', 'Custom Solutions', 410, 'Behind "Your Design. Our Manufacturing."', 'Wide photograph behind "Your Design. Our Manufacturing."'],

  ['alicore-proj-1', 'Projects', 510, 'Commercial', 'Commercial facade — GFRC panel system'],
  ['alicore-proj-2', 'Projects', 520, 'Facades', 'Jali screen facade detail'],
  ['alicore-proj-3', 'Projects', 530, 'Residential', 'Villa elevation with cornices'],
  ['alicore-proj-4', 'Projects', 540, 'Interiors — FRP', 'Lobby feature element'],
  ['alicore-proj-5', 'Projects', 550, 'Interiors', 'Interior GFRC panelling'],
  ['alicore-proj-6', 'Projects', 560, 'Custom Elements', 'Custom moulded element close-up'],
];

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

async function main() {
  const { data: existing, error } = await supabase.from('media_slots').select('*');
  if (error) throw new Error(error.message);
  const byId = new Map(existing.map((s) => [s.id, s]));

  const intended = new Set(SLOTS.map(([id]) => id));
  const extra = existing.filter((s) => !intended.has(s.id));
  if (extra.length) {
    console.log('Slots in the database that the site does not use:');
    for (const s of extra) console.log(`  ${s.id} (${s.group_title} / ${s.title})`);
    console.log('  Left alone — removing a slot also has to remove its files.\n');
  }

  let changed = 0;
  for (const [id, group_title, sort_order, title, placeholder] of SLOTS) {
    const row = byId.get(id);
    if (!row) {
      console.log(`MISSING slot ${id} — its migration has not been applied.`);
      continue;
    }
    const diff = [];
    if (row.group_title !== group_title) diff.push(`group ${row.group_title} -> ${group_title}`);
    if (row.sort_order !== sort_order) diff.push(`sort ${row.sort_order} -> ${sort_order}`);
    if (row.title !== title) diff.push(`title "${row.title}" -> "${title}"`);
    if (row.placeholder !== placeholder) diff.push('placeholder');
    if (!diff.length) continue;

    changed += 1;
    console.log(`${APPLY ? '' : '[dry run] '}${id}: ${diff.join(', ')}`);
    if (!APPLY) continue;
    const { error: updErr } = await supabase
      .from('media_slots')
      .update({ group_title, sort_order, title, placeholder })
      .eq('id', id);
    if (updErr) throw new Error(`${id}: ${updErr.message}`);
  }

  console.log(
    changed
      ? APPLY
        ? `\nUpdated ${changed} slots.`
        : `\n${changed} slots would change. Re-run with --apply.`
      : '\nSlot metadata already matches.',
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
