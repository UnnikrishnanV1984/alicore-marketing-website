import type { APIRoute } from 'astro';
import { serviceClient, mediaUrl } from '../../../lib/supabase';
import { slotPath, VARIANT_WIDTHS } from '../../../lib/media';
import { json, requireStaff, isResponse, purgeCloudflare } from '../../../lib/admin-api';

export const prerender = false;

/**
 * Receives the pre-resized WebP variants produced in the browser and writes
 * them to their stable per-slot paths.
 *
 * Variants are generated client-side because `sharp` is a native Node addon
 * and cannot load in a Workers isolate. Canvas resize + WebP encode in the
 * browser gives the same three widths at zero server CPU -- which is also what
 * keeps this inside the free-tier budget.
 */
export const POST: APIRoute = async (context) => {
  const staff = await requireStaff(context);
  if (isResponse(staff)) return staff;

  let form: FormData;
  try {
    form = await context.request.formData();
  } catch {
    return json({ error: 'Malformed upload.' }, 400);
  }

  const slotId = String(form.get('slotId') ?? '');
  const altText = String(form.get('altText') ?? '').slice(0, 300);
  const width = Number(form.get('width') ?? 0) || null;
  const height = Number(form.get('height') ?? 0) || null;

  if (!slotId) return json({ error: 'No slot specified.' }, 400);

  try {
    const supabase = serviceClient(context.locals);

    // Reject unknown slot ids -- the set is fixed and referenced by built pages.
    const { data: slot } = await supabase
      .from('media_slots')
      .select('id')
      .eq('id', slotId)
      .maybeSingle();
    if (!slot) return json({ error: 'Unknown image slot.' }, 404);

    const variants: Record<string, Record<number, string>> = { webp: {} };
    const purge: string[] = [];

    for (const w of VARIANT_WIDTHS) {
      const file = form.get(`variant_${w}`);
      if (!(file instanceof File)) continue;

      const path = slotPath(slotId, w);
      const { error } = await supabase.storage
        .from('media')
        .upload(path, file, { contentType: 'image/webp', upsert: true, cacheControl: '31536000' });

      if (error) throw new Error(`${path}: ${error.message}`);

      variants.webp[w] = path;
      purge.push(mediaUrl(path, context.locals));
    }

    if (Object.keys(variants.webp).length === 0) {
      return json({ error: 'No image data was received.' }, 400);
    }

    // Supersede the previous asset rather than deleting it -- the partial
    // unique index allows exactly one active row per slot.
    await supabase
      .from('media_assets')
      .update({ is_active: false })
      .eq('slot_id', slotId)
      .eq('is_active', true);

    const { error: insertError } = await supabase.from('media_assets').insert({
      slot_id: slotId,
      variants,
      width,
      height,
      alt_text: altText,
      uploaded_by: staff.id,
      is_active: true,
    });
    if (insertError) throw new Error(insertError.message);

    // Stable paths mean the old file is cached at the edge under the same URL.
    await purgeCloudflare(context.locals, purge);

    return json({ ok: true, slotId });
  } catch (err) {
    console.error('[admin/media] upload failed', err);
    return json({ error: err instanceof Error ? err.message : 'Upload failed.' }, 500);
  }
};

/** Update alt text without re-uploading the photograph. */
export const PATCH: APIRoute = async (context) => {
  const staff = await requireStaff(context);
  if (isResponse(staff)) return staff;

  let body: { slotId?: string; altText?: string };
  try {
    body = await context.request.json();
  } catch {
    return json({ error: 'Malformed request.' }, 400);
  }
  if (!body.slotId) return json({ error: 'No slot specified.' }, 400);

  try {
    const supabase = serviceClient(context.locals);
    const { error } = await supabase
      .from('media_assets')
      .update({ alt_text: (body.altText ?? '').slice(0, 300) })
      .eq('slot_id', body.slotId)
      .eq('is_active', true);
    if (error) throw new Error(error.message);
    return json({ ok: true });
  } catch (err) {
    console.error('[admin/media] alt update failed', err);
    return json({ error: 'Could not save the description.' }, 500);
  }
};
