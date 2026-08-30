import { serverEnv } from './env';
import type { EnquiryInput } from './schema';

/**
 * Transactional email via Resend.
 *
 * Every function here is best-effort: a failed notification must never fail
 * the request, because the enquiry is already safely in the database by the
 * time these are called. We log and move on.
 */

type SendArgs = { to: string | string[]; subject: string; html: string; replyTo?: string };

async function send(locals: unknown, args: SendArgs): Promise<boolean> {
  const key = serverEnv(locals, 'RESEND_API_KEY');
  const from = serverEnv(locals, 'ENQUIRY_FROM') ?? 'Alicore Website <onboarding@resend.dev>';
  if (!key) return false;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        authorization: `Bearer ${key}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: Array.isArray(args.to) ? args.to : [args.to],
        subject: args.subject,
        html: args.html,
        ...(args.replyTo ? { reply_to: args.replyTo } : {}),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string,
  );

const row = (k: string, v: string) =>
  v
    ? `<tr><td style="padding:6px 16px 6px 0;color:#6b6862;font:12px/1.5 -apple-system,sans-serif;white-space:nowrap;vertical-align:top">${esc(
        k,
      )}</td><td style="padding:6px 0;color:#12110f;font:14px/1.6 -apple-system,sans-serif">${esc(v)}</td></tr>`
    : '';

/** Alert to the Alicore team. reply_to is the enquirer, so Reply just works. */
export async function sendStaffAlert(
  locals: unknown,
  data: EnquiryInput,
  ref: string,
): Promise<boolean> {
  const to = serverEnv(locals, 'ENQUIRY_NOTIFY_TO');
  if (!to) return false;

  const html = `
<div style="max-width:560px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="background:#12110f;padding:22px 24px">
    <div style="color:#c0973f;font-size:11px;letter-spacing:.16em;text-transform:uppercase">New quote request</div>
    <div style="color:#f6f4ef;font-size:22px;margin-top:8px;letter-spacing:.02em">${esc(ref)}</div>
  </div>
  <div style="border:1px solid #e5e1d8;border-top:none;padding:24px">
    <table style="width:100%;border-collapse:collapse">
      ${row('Name', data.name)}
      ${row('Company', data.company ?? '')}
      ${row('Phone', data.phone)}
      ${row('Email', data.email)}
      ${row('Location', data.location ?? '')}
      ${row('Requirement', data.product ?? '')}
      ${row('Quantity', data.quantity ?? '')}
    </table>
    ${
      data.message
        ? `<div style="margin-top:18px;padding-top:18px;border-top:1px solid #e5e1d8">
             <div style="color:#6b6862;font-size:12px;text-transform:uppercase;letter-spacing:.14em">Message</div>
             <div style="color:#12110f;font-size:14px;line-height:1.65;margin-top:8px;white-space:pre-wrap">${esc(data.message)}</div>
           </div>`
        : ''
    }
    <div style="margin-top:22px">
      <a href="tel:${esc(data.phone)}" style="display:inline-block;background:#12110f;color:#f6f4ef;padding:12px 20px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;text-decoration:none">Call ${esc(data.name)}</a>
    </div>
  </div>
</div>`;

  return send(locals, {
    to: to.split(',').map((s) => s.trim()),
    subject: `Quote request ${ref} — ${data.name}${data.company ? `, ${data.company}` : ''}`,
    html,
    replyTo: data.email,
  });
}

/** Acknowledgement to the enquirer. Confirms receipt and gives them the ref. */
export async function sendAcknowledgement(
  locals: unknown,
  data: EnquiryInput,
  ref: string,
): Promise<boolean> {
  const html = `
<div style="max-width:520px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif">
  <div style="background:#12110f;padding:26px 24px">
    <div style="color:#f6f4ef;font-size:20px;letter-spacing:.3em">ALICORE</div>
    <div style="color:#c0973f;font-size:10px;letter-spacing:.18em;text-transform:uppercase;margin-top:8px">Architectural Products. Engineered to Elevate.</div>
  </div>
  <div style="border:1px solid #e5e1d8;border-top:none;padding:26px 24px">
    <p style="color:#12110f;font-size:16px;line-height:1.6;margin:0">Thank you, ${esc(data.name)}.</p>
    <p style="color:#4a4740;font-size:14px;line-height:1.7;margin:14px 0 0">
      We have received your enquiry and our team will review your requirement and respond with the
      right manufacturing approach.
    </p>
    <p style="color:#4a4740;font-size:14px;line-height:1.7;margin:14px 0 0">
      Your reference is <strong style="color:#b08d3c">${esc(ref)}</strong>. Please quote it if you
      get in touch before we reach you.
    </p>
    <div style="margin-top:22px;padding-top:20px;border-top:1px solid #e5e1d8;color:#6b6862;font-size:13px;line-height:1.7">
      If your enquiry is urgent, call us on 9995 495 395 or reply to this email.
    </div>
  </div>
</div>`;

  return send(locals, {
    to: data.email,
    subject: `We've received your enquiry — ${ref}`,
    html,
  });
}
