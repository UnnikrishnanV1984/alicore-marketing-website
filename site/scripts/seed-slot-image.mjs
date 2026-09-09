// Uploads one photograph into one media slot -- the single-image counterpart
// to seed-product-gallery.mjs, for slots that hold a single picture (the
// hero, the GFRC/FRP stages, the Why Choose Alicore background, and so on).
//
// Run from site/ so it resolves @supabase/supabase-js and sharp:
//   node scripts/seed-slot-image.mjs alicore-why "C:\path\to\photo.jpg" ["alt text"]
//
// Reads Supabase credentials from the repo-root .env (PUBLIC_SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY) -- the same file the app itself uses.
//
// The slot row must already exist (it is created by a migration); this only
// writes the image. Any photograph already at position 1 is deactivated
// rather than deleted, matching how the admin console replaces an image.

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VARIANT_WIDTHS = [640, 1280, 2000];
const POSITION = 1;

function loadEnv() {
  const path = join(__dirname, '..', '..', '.env');
  const env = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

async function main() {
  const [slotId, file, alt = ''] = process.argv.slice(2);
  if (!slotId || !file) {
    console.error('Usage: node scripts/seed-slot-image.mjs <slot-id> <file> [alt text]');
    process.exit(1);
  }

  const env = loadEnv();
  const url = env.PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in the repo-root .env');
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: slot, error: slotError } = await supabase
    .from('media_slots')
    .select('id,title')
    .eq('id', slotId)
    .maybeSingle();
  if (slotError) throw new Error(slotError.message);
  if (!slot) throw new Error(`No such slot "${slotId}" -- run its migration first.`);

  const input = readFileSync(file);
  const meta = await sharp(input).metadata();

  // The site always requests /640.webp, /1280.webp and /2000.webp (see
  // lib/media.ts VARIANT_WIDTHS), so each path is named by that nominal
  // target rather than by the clamped pixel width -- otherwise every target
  // above the source's own width collapses onto one file and the site asks
  // for URLs that were never written.
  const variants = { webp: {} };
  for (const target of VARIANT_WIDTHS) {
    const width = Math.min(target, meta.width ?? target);
    const buf = await sharp(input).resize({ width }).webp({ quality: 82 }).toBuffer();
    const path = `slots/${slotId}/${POSITION}/${target}.webp`;

    const { error } = await supabase.storage
      .from('media')
      .upload(path, buf, { contentType: 'image/webp', upsert: true, cacheControl: '31536000' });
    if (error) throw new Error(`${path}: ${error.message}`);
    variants.webp[target] = path;
    console.log(`  uploaded ${path} (${width}px, ${(buf.length / 1024).toFixed(0)}kb)`);
  }

  await supabase
    .from('media_assets')
    .update({ is_active: false })
    .eq('slot_id', slotId)
    .eq('position', POSITION)
    .eq('is_active', true);

  const { error: insertError } = await supabase.from('media_assets').insert({
    slot_id: slotId,
    position: POSITION,
    variants,
    width: meta.width ?? null,
    height: meta.height ?? null,
    alt_text: alt,
    is_active: true,
  });
  if (insertError) throw new Error(insertError.message);

  console.log(`\n${slotId} ("${slot.title}") position ${POSITION} <- ${file}`);
  console.log('Done. The slot went from empty to filled, so the site needs a rebuild.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
