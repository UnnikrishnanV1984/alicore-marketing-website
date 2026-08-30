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
  build: {
    inlineStylesheets: 'auto',
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport',
  },
});
