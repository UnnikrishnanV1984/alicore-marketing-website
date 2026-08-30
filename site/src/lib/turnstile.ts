import { serverEnv } from './env';

/**
 * Server-side Turnstile verification.
 *
 * Returns true when no secret is configured, so local development and any
 * environment without Turnstile still accepts enquiries. The honeypot and
 * rate limiting remain active in that case.
 */
export async function verifyTurnstile(
  locals: unknown,
  token: string | undefined,
  ip: string | null,
): Promise<boolean> {
  const secret = serverEnv(locals, 'TURNSTILE_SECRET_KEY');
  if (!secret) return true;
  if (!token) return false;

  try {
    const body = new FormData();
    body.append('secret', secret);
    body.append('response', token);
    if (ip) body.append('remoteip', ip);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body,
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    // Verification service unreachable. Do NOT reject the enquiry -- losing a
    // real lead is worse than admitting one that might be spam, and the
    // honeypot still applies.
    return true;
  }
}

/** Salted hash of the caller's IP, for abuse triage. Never store the raw IP. */
export async function hashIp(locals: unknown, ip: string | null): Promise<string | null> {
  if (!ip) return null;
  const salt = serverEnv(locals, 'IP_HASH_SALT') ?? '';
  const data = new TextEncoder().encode(`${salt}:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .slice(0, 16)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
