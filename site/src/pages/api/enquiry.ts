import type { APIRoute } from 'astro';
import { enquirySchema, makeRef } from '../../lib/schema';
import { serviceClient } from '../../lib/supabase';
import { verifyTurnstile, hashIp } from '../../lib/turnstile';
import { sendStaffAlert, sendAcknowledgement } from '../../lib/email';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export const POST: APIRoute = async ({ request, locals, clientAddress }) => {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: 'Malformed request.' }, 400);
  }

  const parsed = enquirySchema.safeParse(payload);
  if (!parsed.success) {
    return json(
      { error: parsed.error.issues[0]?.message ?? 'Please check the form and try again.' },
      400,
    );
  }
  const data = parsed.data;

  // Honeypot. Return 200 so a bot cannot distinguish a rejection from success
  // and start probing, but write nothing.
  if (data.website) return json({ ref: makeRef() });

  const ip = clientAddress ?? request.headers.get('cf-connecting-ip');

  const human = await verifyTurnstile(locals, data.turnstileToken, ip);
  if (!human) {
    return json({ error: 'We could not verify that you are human. Please try again.' }, 403);
  }

  const ref = makeRef();

  // The database write is the only step that may not fail silently. Everything
  // after it is best-effort: once the row exists, the lead is safe.
  try {
    const supabase = serviceClient(locals);
    const { error } = await supabase.from('enquiries').insert({
      ref,
      name: data.name,
      company: data.company || null,
      phone: data.phone,
      email: data.email,
      location: data.location || null,
      product: data.product || null,
      quantity: data.quantity || null,
      message: data.message || null,
      attachment_path: data.attachmentPath || null,
      ip_hash: await hashIp(locals, ip),
      user_agent: request.headers.get('user-agent')?.slice(0, 400) ?? null,
    });

    if (error) throw new Error(error.message);
  } catch (err) {
    console.error('[enquiry] insert failed', err);
    // Surface the failure. The form shows the WhatsApp/call fallback so the
    // enquiry is not simply lost -- see plan section 5.
    return json(
      { error: 'We could not save your enquiry. Please call or WhatsApp us instead.' },
      500,
    );
  }

  // Signed download link for the staff alert, valid 7 days. The file itself
  // stays in the private bucket and remains reachable from the admin console.
  let attachmentUrl: string | null = null;
  if (data.attachmentPath) {
    try {
      const supabase = serviceClient(locals);
      const { data: signed } = await supabase.storage
        .from('enquiry-attachments')
        .createSignedUrl(data.attachmentPath, 60 * 60 * 24 * 7);
      attachmentUrl = signed?.signedUrl ?? null;
    } catch {
      /* the admin console can still reach it */
    }
  }

  const [staffOk] = await Promise.all([
    sendStaffAlert(locals, data, ref, attachmentUrl),
    sendAcknowledgement(locals, data, ref),
  ]);

  if (!staffOk) {
    // Saved, but nobody was told. Worth a log line -- it means someone has to
    // be watching the admin queue.
    console.warn(`[enquiry] ${ref} stored but staff alert was not sent`);
  }

  return json({ ref });
};
