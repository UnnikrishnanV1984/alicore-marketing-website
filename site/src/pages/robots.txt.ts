import type { APIRoute } from 'astro';

const SITE = import.meta.env.PUBLIC_SITE_URL || 'https://www.alicore.in';

/**
 * The admin console and the API surface are disallowed. /admin is also
 * middleware-guarded and rel="nofollow" from the footer -- robots.txt is the
 * courtesy layer, not the security one.
 */
export const GET: APIRoute = () =>
  new Response(
    `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: ${SITE}/sitemap-index.xml
`,
    { headers: { 'content-type': 'text/plain; charset=utf-8' } },
  );
