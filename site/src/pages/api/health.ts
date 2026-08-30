import type { APIRoute } from 'astro';
import { anonClient } from '../../lib/supabase';

export const prerender = false;

/**
 * Health check, pinged daily by .github/workflows/keepalive.yml.
 *
 * The point is the database round trip: Supabase pauses free-tier projects
 * after ~7 days without API traffic, and a marketing site can easily go that
 * long between enquiries. A cheap query a day keeps the project awake, and a
 * non-200 tells us the form is broken before a customer discovers it.
 */
export const GET: APIRoute = async ({ locals }) => {
  const started = Date.now();

  const supabase = anonClient(locals);
  if (!supabase) {
    return new Response(JSON.stringify({ ok: false, error: 'supabase not configured' }), {
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
      JSON.stringify({ ok: true, db: 'reachable', ms: Date.now() - started }),
      { status: 200, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : 'unknown' }),
      { status: 503, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } },
    );
  }
};
