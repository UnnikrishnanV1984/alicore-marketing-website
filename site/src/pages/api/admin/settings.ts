import type { APIRoute } from 'astro';
import { z } from 'zod';
import { serviceClient } from '../../../lib/supabase';
import { json, requireStaff, isResponse } from '../../../lib/admin-api';

export const prerender = false;

/** Empty means "not set yet" and is always allowed. */
const optionalUrl = z
  .string()
  .trim()
  .max(300)
  .refine((v) => v === '' || /^https:\/\/\S+\.\S+/.test(v), {
    message: 'Enter a full https:// address, or leave it blank.',
  });

const optionalEmail = z
  .string()
  .trim()
  .max(200)
  .refine((v) => v === '' || z.string().email().safeParse(v).success, {
    message: 'Enter a valid email address, or leave it blank.',
  });

const settingsSchema = z.object({
  phoneDisplay: z.string().trim().min(3, 'Enter the phone number as it should read on the site.').max(40),
  phoneE164: z
    .string()
    .trim()
    .regex(/^\+\d{7,15}$/, 'Use international format, e.g. +919995495395.'),
  whatsappE164: z
    .string()
    .trim()
    .regex(/^\d{7,15}$/, 'Digits only, with country code and no plus, e.g. 919995495395.'),
  email: optionalEmail,
  address: z.string().trim().max(300),
  instagram: optionalUrl,
  facebook: optionalUrl,
  linkedin: optionalUrl,
  youtube: optionalUrl,
  notifyEmails: z
    .string()
    .trim()
    .max(400)
    .refine(
      (v) =>
        v === '' ||
        v
          .split(',')
          .map((s) => s.trim())
          .every((s) => z.string().email().safeParse(s).success),
      { message: 'Enter one or more valid email addresses, separated by commas.' },
    ),
});

export const PATCH: APIRoute = async (context) => {
  const staff = await requireStaff(context);
  if (isResponse(staff)) return staff;

  const parsed = settingsSchema.safeParse(await context.request.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return json({ error: issue?.message ?? 'Invalid settings.', field: issue?.path[0] }, 400);
  }
  const d = parsed.data;

  try {
    const supabase = serviceClient(context.locals);
    const { error } = await supabase
      .from('site_settings')
      .update({
        phone_display: d.phoneDisplay,
        phone_e164: d.phoneE164,
        whatsapp_e164: d.whatsappE164,
        email: d.email,
        address: d.address,
        instagram: d.instagram,
        facebook: d.facebook,
        linkedin: d.linkedin,
        youtube: d.youtube,
        notify_emails: d.notifyEmails,
        updated_by: staff.id,
      })
      .eq('id', true);

    if (error) throw new Error(error.message);
    return json({ ok: true });
  } catch (err) {
    console.error('[admin/settings] update failed', err);
    return json({ error: 'Could not save the settings.' }, 500);
  }
};
