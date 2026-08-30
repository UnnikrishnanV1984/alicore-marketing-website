import type { APIRoute } from 'astro';

const SITE = import.meta.env.PUBLIC_SITE_URL || 'https://www.alicore.in';

/**
 * A workers.dev deploy is a staging URL, and it must not be indexed.
 *
 * Left crawlable it would compete with www.alicore.in for the same copy the
 * moment the real domain goes live -- and the staging URL, being indexed
 * first, can win. Cleaning that up afterwards is far more work than blocking
 * it now, so the host decides the policy.
 */
const isStaging = /\.workers\.dev$/i.test(new URL(SITE).hostname);

const PRODUCTION = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/

Sitemap: ${SITE}/sitemap-index.xml
`;

// Crawling is ALLOWED here on purpose. Every page carries
// <meta name="robots" content="noindex"> and a blocked crawler would never
// read it -- Disallow hides the directive rather than enforcing it. No
// sitemap is advertised, so nothing invites discovery either.
const STAGING = `# Staging deploy (${SITE}) — noindex, see the meta tag on every page.
User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
`;

/**
 * The admin console and the API surface are disallowed in production. /admin
 * is also middleware-guarded and rel="nofollow" from the footer -- robots.txt
 * is the courtesy layer, not the security one.
 */
export const GET: APIRoute = () =>
  new Response(isStaging ? STAGING : PRODUCTION, {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
