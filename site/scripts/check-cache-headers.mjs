// Every built page must have a no-store line in public/_headers.
//
// Cloudflare merges the headers of every matching rule rather than letting the
// most specific one win, so the document rules cannot be a `/*` catch-all --
// that would join onto /_astro's immutable entry and make the hashed build
// output uncacheable too. One rule per route is the price, and a route added
// without its rule goes back to being cached at the edge with no validator,
// which is the bug this file exists to prevent. Catch it at build time.
//
//   node scripts/check-cache-headers.mjs

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function pages(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (name === '_worker.js') continue;
    if (statSync(path).isDirectory()) pages(path, out);
    else if (name.endsWith('.html')) out.push(path);
  }
  return out;
}

const routes = pages(join(root, 'dist')).map((p) =>
  '/' + relative(join(root, 'dist'), p).split(sep).join('/').replace(/\/?index\.html$/, ''),
);

const rules = readFileSync(join(root, 'public', '_headers'), 'utf8')
  .split('\n')
  .filter((l) => l.startsWith('/'))
  .map((l) => l.trim());

const covered = (route) =>
  rules.some((r) =>
    r.endsWith('/*') ? route.startsWith(r.slice(0, -1)) : r === route || (r === '/' && route === ''),
  );

const missing = routes.filter((r) => !covered(r));
if (missing.length) {
  console.error('These pages have no rule in public/_headers, so the edge will cache them:');
  for (const r of missing) console.error(`  ${r || '/'}`);
  console.error('\nAdd a "Cache-Control: no-store" rule for each.');
  process.exit(1);
}
console.log(`_headers covers all ${routes.length} pages.`);
