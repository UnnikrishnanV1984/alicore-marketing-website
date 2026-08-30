import type { APIContext } from 'astro';
import { currentUser, tryRefresh, type StaffUser } from './auth';
import { serverEnv } from './env';

/**
 * Shared helpers for /api/admin/*.
 *
 * The middleware guards /admin pages; these endpoints live under /api and so
 * must check for themselves. Never assume the guard ran.
 */

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export async function requireStaff(context: APIContext): Promise<StaffUser | Response> {
  let user = await currentUser(context.locals, context.cookies);
  if (!user) user = await tryRefresh(context.locals, context.cookies);
  if (!user) return json({ error: 'Not signed in.' }, 401);
  return user;
}

export function isResponse(v: unknown): v is Response {
  return v instanceof Response;
}

/**
 * Purge specific URLs from Cloudflare's edge cache.
 *
 * Media paths are stable per slot, so replacing an image reuses the same URL.
 * Without this the old photograph would stay cached at the edge; with it, the
 * swap is live immediately and no rebuild is needed (plan section 4).
 */
export async function purgeCloudflare(locals: unknown, urls: string[]): Promise<void> {
  const zone = serverEnv(locals, 'CF_ZONE_ID');
  const token = serverEnv(locals, 'CF_PURGE_TOKEN');
  if (!zone || !token || urls.length === 0) return;

  try {
    await fetch(`https://api.cloudflare.com/client/v4/zones/${zone}/purge_cache`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ files: urls }),
    });
  } catch {
    // A stale edge entry expires on its own. Never fail an upload over this.
  }
}
