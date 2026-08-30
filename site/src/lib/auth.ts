import type { AstroCookies } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { serverEnv } from './env';

/**
 * Staff authentication, backed by Supabase Auth.
 *
 * Replaces the mockup's hardcoded `admin` / `alicore2026` check, which was a
 * prototype affordance and must never reach a deployed environment.
 *
 * The access token lives in an httpOnly cookie so no script can read it, and
 * every guarded request re-validates it against Supabase rather than trusting
 * its contents.
 */

export const SESSION_COOKIE = 'al_session';
export const REFRESH_COOKIE = 'al_refresh';

function authClient(locals: unknown) {
  const url = serverEnv(locals, 'PUBLIC_SUPABASE_URL');
  const key = serverEnv(locals, 'PUBLIC_SUPABASE_ANON_KEY');
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type StaffUser = { id: string; email: string };

/** Exchange credentials for a session. Returns null on any failure. */
export async function signIn(
  locals: unknown,
  email: string,
  password: string,
): Promise<{ accessToken: string; refreshToken: string; user: StaffUser } | null> {
  const supabase = authClient(locals);
  if (!supabase) return null;

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.session || !data.user) return null;

  return {
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    user: { id: data.user.id, email: data.user.email ?? '' },
  };
}

/** Validate the cookie against Supabase. Never trust the token's own claims. */
export async function currentUser(
  locals: unknown,
  cookies: AstroCookies,
): Promise<StaffUser | null> {
  const token = cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const supabase = authClient(locals);
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email ?? '' };
  } catch {
    return null;
  }
}

export function setSessionCookies(
  cookies: AstroCookies,
  accessToken: string,
  refreshToken: string,
) {
  const base = {
    httpOnly: true,
    secure: true,
    sameSite: 'lax' as const,
    path: '/',
  };
  cookies.set(SESSION_COOKIE, accessToken, { ...base, maxAge: 60 * 60 });
  cookies.set(REFRESH_COOKIE, refreshToken, { ...base, maxAge: 60 * 60 * 24 * 30 });
}

export function clearSessionCookies(cookies: AstroCookies) {
  cookies.delete(SESSION_COOKIE, { path: '/' });
  cookies.delete(REFRESH_COOKIE, { path: '/' });
}

/** Refresh an expired access token using the long-lived refresh cookie. */
export async function tryRefresh(
  locals: unknown,
  cookies: AstroCookies,
): Promise<StaffUser | null> {
  const refreshToken = cookies.get(REFRESH_COOKIE)?.value;
  if (!refreshToken) return null;

  const supabase = authClient(locals);
  if (!supabase) return null;

  try {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session || !data.user) return null;

    setSessionCookies(cookies, data.session.access_token, data.session.refresh_token);
    return { id: data.user.id, email: data.user.email ?? '' };
  } catch {
    return null;
  }
}
