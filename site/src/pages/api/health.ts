import type { APIRoute } from 'astro';
import { anonClient } from '../../lib/supabase';
import { serverEnv } from '../../lib/env';

export const prerender = false;

/**
 * Health check, pinged daily by .github/workflows/keepalive.yml.
 *
 * The point is the database round trip: Supabase pauses free-tier projects
 * after ~7 days without API traffic, and a marketing site can easily go that
 * long between enquiries. A cheap query a day keeps the project awake, and a
 * non-200 tells us the form is broken before a customer discovers it.
 *
 * The round trip uses the ANON client, so a green health check says nothing
 * about the server-only secrets the enquiry form and admin console depend on.
 * That gap cost real time to diagnose: the form returned a generic 500 while
 * health kept reporting ok. `configured` closes it by reporting, as booleans
 * only, which server-side values the Worker can actually see.
 *
 * Booleans, never values. Whether a key is set is not sensitive -- a missing
 * one is already obvious to anyone who submits the form -- but the keys
 * themselves must never leave the Worker.
 */
export const GET: APIRoute = async ({ locals }) => {
  const started = Date.now();

  const configured = {
    supabaseUrl: Boolean(serverEnv(locals, 'PUBLIC_SUPABASE_URL')),
    anonKey: Boolean(serverEnv(locals, 'PUBLIC_SUPABASE_ANON_KEY')),
    // Required. Without it every enquiry and every admin page fails.
    serviceRoleKey: Boolean(serverEnv(locals, 'SUPABASE_SERVICE_ROLE_KEY')),
    ipHashSalt: Boolean(serverEnv(locals, 'IP_HASH_SALT')),
    // Optional. Absent is a valid state, not a fault.
    resend: Boolean(serverEnv(locals, 'RESEND_API_KEY')),
    turnstile: Boolean(serverEnv(locals, 'TURNSTILE_SECRET_KEY')),
    publishToken: Boolean(serverEnv(locals, 'GITHUB_DISPATCH_TOKEN')),
  };

  const supabase = anonClient(locals);
  if (!supabase) {
    return new Response(JSON.stringify({ ok: false, error: 'supabase not configured', configured }), {
      status: 503,
      headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
    });
  }

  try {
    const { error } = await supabase
      .from('media_slots')
      .select('id', { count: 'exact', head: true });

    if (error) throw new Error(error.message);

    return new Response(
      JSON.stringify({ ok: true, db: 'reachable', ms: Date.now() - started, configured }),
      { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : 'unknown', configured }),
      { status: 503, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } },
    );
  }
};
