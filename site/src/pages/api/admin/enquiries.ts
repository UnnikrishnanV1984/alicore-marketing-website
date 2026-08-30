import type { APIRoute } from 'astro';
import { z } from 'zod';
import { serviceClient } from '../../../lib/supabase';
import { json, requireStaff, isResponse } from '../../../lib/admin-api';

export const prerender = false;

const patchSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(['new', 'contacted', 'quoted', 'closed', 'archived']).optional(),
  internalNote: z.string().max(2000).optional(),
});

/** Update an enquiry's status or internal note. */
export const PATCH: APIRoute = async (context) => {
  const staff = await requireStaff(context);
  if (isResponse(staff)) return staff;

  let body: unknown;
  try {
    body = await context.request.json();
  } catch {
    return json({ error: 'Malformed request.' }, 400);
  }

  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return json({ error: 'Invalid update.' }, 400);

  const patch: Record<string, unknown> = {};
  if (parsed.data.status) patch.status = parsed.data.status;
  if (parsed.data.internalNote !== undefined) patch.internal_note = parsed.data.internalNote;
  if (Object.keys(patch).length === 0) return json({ error: 'Nothing to update.' }, 400);

  try {
    const supabase = serviceClient(context.locals);
    const { error } = await supabase.from('enquiries').update(patch).eq('id', parsed.data.id);
    if (error) throw new Error(error.message);
    return json({ ok: true });
  } catch (err) {
    console.error('[admin/enquiries] update failed', err);
    return json({ error: 'Could not save the change.' }, 500);
  }
};

/**
 * Short-lived signed download for an enquiry attachment.
 *
 * The bucket is private, so this is the only route to the file. 5 minutes is
 * enough to click through and short enough that a copied URL is not a leak.
 */
export const GET: APIRoute = async (context) => {
  const staff = await requireStaff(context);
  if (isResponse(staff)) return staff;

  const path = context.url.searchParams.get('attachment');
  if (!path) return json({ error: 'No attachment specified.' }, 400);

  try {
    const supabase = serviceClient(context.locals);
    const { data, error } = await supabase.storage
      .from('enquiry-attachments')
      .createSignedUrl(path, 300);
    if (error || !data) throw new Error(error?.message ?? 'no url');
    return context.redirect(data.signedUrl, 302);
  } catch (err) {
    console.error('[admin/enquiries] signed url failed', err);
    return json({ error: 'Could not open that file.' }, 500);
  }
};
