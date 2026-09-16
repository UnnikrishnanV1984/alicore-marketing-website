/**
 * Removes superseded image uploads: media_assets rows with is_active = false,
 * and the storage objects that only they point at.
 *
 * Every upload supersedes the previous one rather than replacing it, so the
 * library accumulates history that nothing can reach -- the admin Image
 * Library queries is_active = true and offers no way back to an older version.
 *
 * WHY THIS IS NOT A DELETE-BY-ROW
 *
 * Early uploads wrote a flat path, slots/<slot>/<position>/<width>.webp, and
 * each new upload overwrote those same three files in place (x-upsert). Later
 * uploads write slots/<slot>/<position>/<version>/<width>.webp instead. So a
 * superseded row from the flat era names exactly the files the CURRENT active
 * row is still serving. Deleting a row's files because the row is superseded
 * would take live images off the website.
 *
 * Every candidate is therefore checked against the set of paths held by active
 * rows, and anything in that set is spared. At the time of writing that spared
 * 30 of 109 paths -- roughly a third.
 *
 * Usage (from the repo root, with .env present):
 *
 *   node supabase/scripts/prune-superseded-media.mjs           # report only
 *   node supabase/scripts/prune-superseded-media.mjs --apply   # delete
 *
 * The dry run is the default on purpose. Read it before applying: deletion is
 * not reversible and there is no other copy of these files.
 */
import fs from 'node:fs';
import path from 'node:path';

const APPLY = process.argv.includes('--apply');

const envPath = path.resolve(process.cwd(), '.env');
if (!fs.existsSync(envPath)) {
  console.error('No .env found in', process.cwd(), '-- run this from the repo root.');
  process.exit(1);
}
const env = Object.fromEntries(
  fs
    .readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith('#') && l.includes('='))
    .map((l) => [
      l.slice(0, l.indexOf('=')).trim(),
      l.slice(l.indexOf('=') + 1).trim().replace(/^['"]|['"]$/g, ''),
    ])
);

const URL_BASE = env.PUBLIC_SUPABASE_URL;
const KEY = env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_BASE || !KEY) {
  console.error('PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must both be set in .env');
  process.exit(1);
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

/** variants is { webp: { "640": path, ... } }. Flatten it to a list of paths. */
function pathsOf(asset) {
  const out = [];
  for (const group of Object.values(asset.variants ?? {})) {
    if (typeof group === 'string') out.push(group);
    else for (const p of Object.values(group ?? {})) if (typeof p === 'string') out.push(p);
  }
  return out;
}

/** Both storage layouts exist, so walk rather than assume a depth. */
async function walk(prefix, depth = 0) {
  if (depth > 5) return [];
  const rows = await fetch(`${URL_BASE}/storage/v1/object/list/media`, {
    method: 'POST',
    headers: { ...H, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prefix, limit: 1000, sortBy: { column: 'name', order: 'asc' } }),
  }).then((r) => r.json());
  if (!Array.isArray(rows)) return [];

  const out = [];
  for (const row of rows) {
    const full = prefix + row.name;
    // A "folder" comes back with no id and no metadata.
    if (row.id === null || row.metadata == null) out.push(...(await walk(`${full}/`, depth + 1)));
    else out.push({ path: full, size: row.metadata?.size ?? 0 });
  }
  return out;
}

const assets = await fetch(`${URL_BASE}/rest/v1/media_assets?select=*`, { headers: H }).then((r) =>
  r.json()
);
if (!Array.isArray(assets)) {
  console.error('Could not read media_assets:', assets);
  process.exit(1);
}

const livePaths = new Set();
for (const a of assets.filter((x) => x.is_active)) for (const p of pathsOf(a)) livePaths.add(p);

const stale = assets.filter((a) => !a.is_active);
const named = [...new Set(stale.flatMap(pathsOf))];
const removable = named.filter((p) => !livePaths.has(p));
const spared = named.filter((p) => livePaths.has(p));

const mb = (n) => `${(n / 1048576).toFixed(1)} MB`;
const onDisk = await walk('slots/');
const size = new Map(onDisk.map((f) => [f.path, f.size]));
const bytes = removable.reduce((t, p) => t + (size.get(p) ?? 0), 0);

console.log(`media_assets rows        : ${assets.length} (${stale.length} superseded)`);
console.log(`storage objects          : ${onDisk.length}`);
console.log(`paths named by stale rows: ${named.length}`);
console.log(`  spared (a live row still serves them): ${spared.length}`);
console.log(`  removable                           : ${removable.length}  ${mb(bytes)}`);

if (!APPLY) {
  console.log('\nDry run — nothing was deleted. Re-run with --apply.');
  process.exit(0);
}

const del = await fetch(`${URL_BASE}/storage/v1/object/media`, {
  method: 'DELETE',
  headers: { ...H, 'Content-Type': 'application/json' },
  body: JSON.stringify({ prefixes: removable }),
});
const removed = await del.json();
console.log(
  '\nstorage:',
  del.status,
  Array.isArray(removed) ? `${removed.length} objects removed` : JSON.stringify(removed).slice(0, 300)
);

const rowDel = await fetch(`${URL_BASE}/rest/v1/media_assets?is_active=eq.false`, {
  method: 'DELETE',
  headers: { ...H, Prefer: 'return=representation' },
});
const rows = await rowDel.json();
console.log(
  'rows   :',
  rowDel.status,
  Array.isArray(rows) ? `${rows.length} rows removed` : JSON.stringify(rows).slice(0, 300)
);

// Prove the live site still resolves. This is the check that matters.
const after = await fetch(`${URL_BASE}/rest/v1/media_assets?select=slot_id,position,variants`, {
  headers: H,
}).then((r) => r.json());
const present = new Set((await walk('slots/')).map((f) => f.path));
const broken = [];
for (const a of after) for (const p of pathsOf(a)) if (!present.has(p)) broken.push(`${a.slot_id} pos${a.position} -> ${p}`);

console.log(`\nrows remaining: ${after.length}, storage objects remaining: ${present.size}`);
console.log(`live rows pointing at a missing file: ${broken.length}`);
for (const b of broken) console.log('  !!', b);
process.exit(broken.length ? 1 : 0);
