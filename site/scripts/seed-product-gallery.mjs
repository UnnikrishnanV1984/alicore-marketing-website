// One-off import: uploads the client-supplied product photographs from a
// local folder into Supabase, filling the up-to-5-per-category galleries
// added for the "Products" media_slots group.
//
// Run from site/ so it resolves @supabase/supabase-js and sharp:
//   node scripts/seed-product-gallery.mjs "C:\Users\...\Alicore-images"
//
// Reads Supabase credentials from the repo-root .env (PUBLIC_SUPABASE_URL,
// SUPABASE_SERVICE_ROLE_KEY) -- the same file the app itself uses.
//
// Matches files by the category name that leads their filename, e.g.
// "GFRC Cornices_1.jpeg" -> the GFRC Cornices product slot, position 1.
// Files that don't start with a recognised category name (WhatsApp exports,
// the video, etc.) are skipped and reported.

import { createClient } from '@supabase/supabase-js';
import sharp from 'sharp';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VARIANT_WIDTHS = [640, 1280, 2000];
const MAX_POSITIONS = 5;

// slot ids from supabase/migrations/0002_seed.sql -- must match exactly.
const CATEGORY_TO_SLOT = {
  'GFRC Architectural Panels': 'alicore-prod-1',
  'GFRC Cornices': 'alicore-prod-2',
  'GFRC Columns & Pillars': 'alicore-prod-3',
  'GFRC Jalis': 'alicore-prod-4',
  'GFRC Decorative Elements': 'alicore-prod-5',
  'FRP Architectural Products': 'alicore-prod-6',
  'Custom Architectural Elements': 'alicore-prod-7',
};

function loadEnv() {
  const path = join(__dirname, '..', '..', '.env');
  const env = {};
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m) env[m[1]] = m[2].trim();
  }
  return env;
}

function groupFiles(dir) {
  const groups = new Map();
  const skipped = [];

  for (const name of readdirSync(dir)) {
    const match = Object.keys(CATEGORY_TO_SLOT)
      .sort((a, b) => b.length - a.length) // longest/most-specific prefix first
      .find((cat) => name.startsWith(cat));

    if (!match) {
      skipped.push(name);
      continue;
    }

    const rest = name.slice(match.length); // e.g. "_1.jpeg" or "_22.jpeg"
    const numMatch = rest.match(/(\d+)/);
    const n = numMatch ? parseInt(numMatch[1], 10) : 0;

    if (!groups.has(match)) groups.set(match, []);
    groups.get(match).push({ file: name, n });
  }

  for (const list of groups.values()) {
    list.sort((a, b) => a.n - b.n);
  }

  return { groups, skipped };
}

async function main() {
  const dir = process.argv[2];
  if (!dir) {
    console.error('Usage: node scripts/seed-product-gallery.mjs <folder>');
    process.exit(1);
  }

  const env = loadEnv();
  const url = env.PUBLIC_SUPABASE_URL;
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in site/.env');
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { groups, skipped } = groupFiles(dir);

  for (const [category, files] of groups) {
    const slotId = CATEGORY_TO_SLOT[category];
    const chosen = files.slice(0, MAX_POSITIONS);
    if (files.length > MAX_POSITIONS) {
      console.warn(
        `${category}: ${files.length} files found, only uploading the first ${MAX_POSITIONS} (${chosen
          .map((f) => f.file)
          .join(', ')})`,
      );
    }

    for (let i = 0; i < chosen.length; i++) {
      const position = i + 1;
      const { file } = chosen[i];
      const fullPath = join(dir, file);
      const input = readFileSync(fullPath);
      const meta = await sharp(input).metadata();

      // The site always requests /640.webp, /1280.webp and /2000.webp (see
      // lib/media.ts VARIANT_WIDTHS) -- the path must be named by that nominal
      // target, not by the clamped pixel width, or every target below the
      // source's actual width collapses onto the same filename and the site
      // requests URLs that were never written.
      const variants = { webp: {} };
      for (const target of VARIANT_WIDTHS) {
        const width = Math.min(target, meta.width ?? target);
        const buf = await sharp(input).resize({ width }).webp({ quality: 82 }).toBuffer();
        const path = `slots/${slotId}/${position}/${target}.webp`;

        const { error } = await supabase.storage
          .from('media')
          .upload(path, buf, { contentType: 'image/webp', upsert: true, cacheControl: '31536000' });
        if (error) throw new Error(`${path}: ${error.message}`);
        variants.webp[target] = path;
      }

      await supabase
        .from('media_assets')
        .update({ is_active: false })
        .eq('slot_id', slotId)
        .eq('position', position)
        .eq('is_active', true);

      const { error: insertError } = await supabase.from('media_assets').insert({
        slot_id: slotId,
        position,
        variants,
        width: meta.width ?? null,
        height: meta.height ?? null,
        alt_text: '',
        is_active: true,
      });
      if (insertError) throw new Error(insertError.message);

      console.log(`${slotId} position ${position} <- ${file}`);
    }
  }

  if (skipped.length) {
    console.log('\nSkipped (no matching category prefix):');
    for (const s of skipped) console.log(`  ${s}`);
  }

  console.log('\nDone. Rebuild the site (or hit Publish in /admin/media) to see the new photographs.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
