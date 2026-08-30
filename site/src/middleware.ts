import { defineMiddleware } from 'astro:middleware';
import { currentUser, tryRefresh } from './lib/auth';

/**
 * Guards the admin console.
 *
 * /admin itself is the login screen and stays public; everything beneath it
 * requires a validated session. Admin responses are also marked no-store and
 * noindex -- a cached enquiry queue on a shared machine would be a leak.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (!pathname.startsWith('/admin')) return next();

  // The login page and its POST handler must stay reachable.
  if (pathname === '/admin' || pathname === '/admin/') return next();

  let user = await currentUser(context.locals, context.cookies);
  if (!user) user = await tryRefresh(context.locals, context.cookies);

  if (!user) {
    const to = encodeURIComponent(pathname);
    return context.redirect(`/admin?next=${to}`, 302);
  }

  // Hand the verified identity to the page so it does not re-check.
  (context.locals as Record<string, unknown>).staff = user;

  const response = await next();
  response.headers.set('cache-control', 'no-store, private');
  response.headers.set('x-robots-tag', 'noindex, nofollow');
  return response;
});
