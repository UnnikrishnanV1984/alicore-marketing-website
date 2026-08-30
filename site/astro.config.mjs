// @ts-check
import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwind from '@tailwindcss/vite';

const SITE = process.env.PUBLIC_SITE_URL || 'https://www.alicore.in';

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
      filter: (page) => !page.includes('/admin'),
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
