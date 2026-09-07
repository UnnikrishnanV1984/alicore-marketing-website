import type { APIRoute } from 'astro';
import { serviceClient } from '../../../lib/supabase';
import { json, requireStaff, isResponse } from '../../../lib/admin-api';

export const prerender = false;

/**
 * A single-field shortcut for is_published, used by the Image Library's
 * Projects group so staff can hide a project's photo tile without leaving
 * that screen. The full editor at /admin/projects uses the general-purpose
 * PATCH on /api/admin/projects instead, which validates the whole row.
 */
export const PATCH: APIRoute = async (context) => {
  const staff = await requireStaff(context);
  if (isResponse(staff)) return staff;

  const body = (await context.request.json().catch(() => null)) as
    | { id?: string; isPublished?: boolean }
    | null;

  if (!body?.id || typeof body.id !== 'string') return json({ error: 'No project id.' }, 400);
  if (typeof body.isPublished !== 'boolean') return json({ error: 'Missing isPublished.' }, 400);

  try {
    const supabase = serviceClient(context.locals);
    const { error } = await supabase
      .from('projects')
      .update({ is_published: body.isPublished })
      .eq('id', body.id);
    if (error) throw new Error(error.message);
    return json({ ok: true });
  } catch (err) {
    console.error('[admin/project-visibility] update failed', err);
    return json({ error: 'Could not change visibility.' }, 500);
  }
};
