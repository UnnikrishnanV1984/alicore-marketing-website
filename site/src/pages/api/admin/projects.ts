import type { APIRoute } from 'astro';
import { z } from 'zod';
import { serviceClient } from '../../../lib/supabase';
import { json, requireStaff, isResponse } from '../../../lib/admin-api';
import { projectCategories } from '../../../content/sections';

export const prerender = false;

const projectSchema = z.object({
  name: z.string().trim().min(1).max(160),
  location: z.string().trim().min(1).max(160),
  category: z.enum(projectCategories as unknown as [string, ...string[]]),
  material: z.string().trim().max(80).optional().or(z.literal('')),
  product: z.string().trim().max(120).optional().or(z.literal('')),
  application: z.string().trim().max(120).optional().or(z.literal('')),
  imagePath: z.string().trim().max(120).optional().or(z.literal('')),
  altText: z.string().trim().max(300).optional().or(z.literal('')),
  isPublished: z.boolean(),
  sortOrder: z.number().int().min(0).max(9999),
});

const toRow = (d: z.infer<typeof projectSchema>) => ({
  name: d.name,
  location: d.location,
  category: d.category,
  material: d.material || null,
  product: d.product || null,
  application: d.application || null,
  image_path: d.imagePath || null,
  alt_text: d.altText || '',
  is_published: d.isPublished,
  sort_order: d.sortOrder,
});

export const POST: APIRoute = async (context) => {
  const staff = await requireStaff(context);
  if (isResponse(staff)) return staff;

  const parsed = projectSchema.safeParse(await context.request.json().catch(() => null));
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? 'Invalid project.' }, 400);
  }

  try {
    const supabase = serviceClient(context.locals);
    const { data, error } = await supabase
      .from('projects')
      .insert(toRow(parsed.data))
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    return json({ ok: true, id: data.id });
  } catch (err) {
    console.error('[admin/projects] create failed', err);
    return json({ error: 'Could not create the project.' }, 500);
  }
};

export const PATCH: APIRoute = async (context) => {
  const staff = await requireStaff(context);
  if (isResponse(staff)) return staff;

  const body = (await context.request.json().catch(() => null)) as
    | (Record<string, unknown> & { id?: string })
    | null;
  if (!body?.id || typeof body.id !== 'string') return json({ error: 'No project id.' }, 400);

  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: parsed.error.issues[0]?.message ?? 'Invalid project.' }, 400);
  }

  try {
    const supabase = serviceClient(context.locals);
    const { error } = await supabase.from('projects').update(toRow(parsed.data)).eq('id', body.id);
    if (error) throw new Error(error.message);
    return json({ ok: true });
  } catch (err) {
    console.error('[admin/projects] update failed', err);
    return json({ error: 'Could not save the project.' }, 500);
  }
};

export const DELETE: APIRoute = async (context) => {
  const staff = await requireStaff(context);
  if (isResponse(staff)) return staff;

  const id = context.url.searchParams.get('id');
  if (!id) return json({ error: 'No project id.' }, 400);

  try {
    const supabase = serviceClient(context.locals);
    const { error } = await supabase.from('projects').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return json({ ok: true });
  } catch (err) {
    console.error('[admin/projects] delete failed', err);
    return json({ error: 'Could not delete the project.' }, 500);
  }
};
