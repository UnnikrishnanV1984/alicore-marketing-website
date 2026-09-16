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
  const url = serverEnv(locals, 'PUBLIC_SUPABASE_URL')?.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
  const key = serverEnv(locals, 'PUBLIC_SUPABASE_ANON_KEY');
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export type StaffUser = { id: string; email: string };

/**
 * Not every Supabase Auth user is Alicore staff.
 *
 * Nothing on the website creates accounts, but the project's own signup
 * endpoint is open (Authentication -> Sign In / Providers -> "Allow new users
 * to sign up"), so without a check here any stranger who confirmed an email
 * address would land in the console and read every customer enquiry.
 *
 * Two ways to say who is staff, checked in this order:
 *
 *  1. ADMIN_EMAILS -- a comma-separated list of exact addresses, set as a
 *     Worker secret. Use this when staff are on mixed domains.
 *  2. Otherwise, any address at the company domain. This is the default
 *     because it cannot lock anyone out: the accounts an administrator
 *     creates in Supabase are at this domain, and a stranger cannot confirm
 *     an address there.
 *
 * This is the console's boundary, not the data's -- the database has its own
 * (see supabase/migrations/0012_restrict_staff_access.sql). Both matter: the
 * anon key ships in the public bundle, so an account that is refused here can
 * still query Supabase directly unless the row policies refuse it too.
 */
const STAFF_DOMAIN = 'alicore.in';

export function isStaffEmail(locals: unknown, email: string): boolean {
  const address = email.trim().toLowerCase();
  if (!address) return false;

  const list = serverEnv(locals, 'ADMIN_EMAILS');
  if (list && list.trim()) {
    return list
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
      .includes(address);
  }

  return address.endsWith(`@${STAFF_DOMAIN}`);
}

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

  // Correct credentials for a non-staff account still fail, and fail with the
  // same wording as a wrong password -- the login screen deliberately does not
  // tell a stranger whether their account exists.
  if (!isStaffEmail(locals, data.user.email ?? '')) return null;

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
    // Re-checked on every request, not just at sign-in, so removing an address
    // from ADMIN_EMAILS takes effect immediately rather than when the cookie
    // happens to expire.
    if (!isStaffEmail(locals, data.user.email ?? '')) return null;
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

    // A 30-day refresh cookie must not outlive the account's staff status.
    if (!isStaffEmail(locals, data.user.email ?? '')) return null;

    setSessionCookies(cookies, data.session.access_token, data.session.refresh_token);
    return { id: data.user.id, email: data.user.email ?? '' };
  } catch {
    return null;
  }
}
