/**
 * Environment access.
 *
 * Two different sources depending on when the code runs:
 *   - build time (prerendered pages)  -> import.meta.env
 *   - request time (SSR on Workers)   -> Astro.locals.runtime.env
 *
 * `serverEnv(locals)` checks the runtime binding first and falls back to the
 * build-time value, so the same helper works in both places.
 */

type RuntimeLocals = {
  runtime?: { env?: Record<string, string | undefined> };
};

export function serverEnv(locals: unknown, key: string): string | undefined {
  const runtime = (locals as RuntimeLocals | undefined)?.runtime?.env;
  const fromRuntime = runtime?.[key];
  if (fromRuntime) return fromRuntime;
  return (import.meta.env as Record<string, unknown>)[key] as string | undefined;
}

/** Build-time-only read. Safe for prerendered pages and PUBLIC_ values. */
export function buildEnv(key: string): string | undefined {
  return (import.meta.env as Record<string, unknown>)[key] as string | undefined;
}

export function requireEnv(locals: unknown, key: string): string {
  const value = serverEnv(locals, key);
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${key}. ` +
        `Set it locally in .env and in production with: wrangler secret put ${key}`,
    );
  }
  return value;
}

/**
 * True when Supabase is configured. The build must not fail just because a
 * developer has no project wired up yet -- pages fall back to placeholders.
 */
export function hasSupabase(): boolean {
  return Boolean(buildEnv('PUBLIC_SUPABASE_URL') && buildEnv('PUBLIC_SUPABASE_ANON_KEY'));
}
