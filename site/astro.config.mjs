// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwind from '@tailwindcss/vite';
import { loadEnv } from 'vite';

// This file runs before Astro populates import.meta.env, so a local build would
// otherwise see none of .env -- only CI, which sets real environment variables.
// loadEnv merges both, so the two behave the same.
const ENV = { ...loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), ''), ...process.env };

const SITE = ENV.PUBLIC_SITE_URL || 'https://www.alicore.in';

/**
 * Is the Projects section switched on?
 *
 * /projects is SSR and redirects to / whenever the Settings toggle is off, so
 * listing it in the sitemap hands crawlers a URL that 302s -- a "Page with
 * redirect" error in Search Console, and wasted crawl on a site this size.
 *
 * The toggle lives in the database, which the sitemap cannot see at build
 * time, so it is read here. The build already fails without a readable
 * site_settings row (PUBLIC_REQUIRE_DB in the deploy workflow), so this call
 * succeeding is not a new dependency. If it does fail, the page is INCLUDED:
 * advertising a redirect is a warning, silently dropping a live page from the
 * sitemap is lost discovery, and the first is the cheaper mistake.
 */
async function projectsAreVisible() {
  const base = (ENV.PUBLIC_SUPABASE_URL ?? '').replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  const key = ENV.PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) return true;
  try {
    const res = await fetch(`${base}/rest/v1/site_settings?select=show_projects&limit=1`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const [row] = await res.json();
    return row?.show_projects ?? true;
  } catch (err) {
    console.warn('[sitemap] could not read show_projects, keeping /projects listed:', err.message);
    return true;
  }
}

const showProjects = await projectsAreVisible();
if (!showProjects) console.log('[sitemap] Projects is switched off — /projects excluded');

export default defineConfig({
  site: SITE,
  // Static by default. Individual routes opt into SSR with
  // `export const prerender = false` -- currently only /projects and /admin/*.
  // See docs/IMPLEMENTATION_PLAN.md section 1 (Workers CPU budget).
  output: 'static',
  adapter: cloudflare({
    imageService: 'passthrough',
    platformProxy: { enabled: true },
  }),
  integrations: [
    react(),
    sitemap({
      filter: (page) =>
        !page.includes('/admin') && (showProjects || !/\/projects\/?$/.test(new URL(page).pathname)),
    }),
  ],
  vite: {
    plugins: [tailwind()],
  },
  // Canonicals, internal links and the Cloudflare assets config
  // (html_handling = "drop-trailing-slash") all address pages without a
  // trailing slash. Astro's sitemap follows this setting, and left at the
  // default it emitted /about/ -- so every URL we handed a crawler 307'd to a
  // different URL than the one the page's own canonical tag claimed.
  trailingSlash: 'never',
  build: {
    inlineStylesheets: 'auto',
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});
