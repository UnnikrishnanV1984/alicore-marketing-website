import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { buildEnv, serverEnv } from './env';

/**
 * Anon client. Subject to RLS -- can read published projects and active media,
 * and nothing else. Safe to use at build time and in the browser.
 */
export function anonClient(locals?: unknown): SupabaseClient | null {
  const url = locals ? serverEnv(locals, 'PUBLIC_SUPABASE_URL') : buildEnv('PUBLIC_SUPABASE_URL');
  const key = locals
    ? serverEnv(locals, 'PUBLIC_SUPABASE_ANON_KEY')
    : buildEnv('PUBLIC_SUPABASE_ANON_KEY');
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * Service-role client. BYPASSES RLS -- server-side only.
 *
 * Never import this into a `.tsx` island or any file that reaches the browser
 * bundle. It is used only by /api/* endpoints and admin SSR pages.
 */
export function serviceClient(locals: unknown): SupabaseClient {
  const url = serverEnv(locals, 'PUBLIC_SUPABASE_URL');
  const key = serverEnv(locals, 'SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) {
    throw new Error(
      'Supabase service role is not configured. Set PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Public object URL for a path in the `media` bucket. */
export function mediaUrl(path: string, locals?: unknown): string {
  const base = locals ? serverEnv(locals, 'PUBLIC_SUPABASE_URL') : buildEnv('PUBLIC_SUPABASE_URL');
  if (!base) return '';
  return `${base}/storage/v1/object/public/media/${path}`;
}
