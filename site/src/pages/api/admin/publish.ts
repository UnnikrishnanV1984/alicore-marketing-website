import type { APIRoute } from 'astro';
import { serverEnv } from '../../../lib/env';
import { json, requireStaff, isResponse } from '../../../lib/admin-api';

export const prerender = false;

/**
 * Triggers a site rebuild.
 *
 * Public pages are prerendered, so anything baked in at build time -- contact
 * details, social links, whether an image slot is filled -- only reaches the
 * live site after a rebuild. This posts to a Cloudflare deploy hook so staff
 * can publish without a developer.
 *
 * Deliberately not automatic on every save: an editor correcting four fields
 * would otherwise queue four builds. They press Publish when they are done.
 */
export const POST: APIRoute = async (context) => {
  const staff = await requireStaff(context);
  if (isResponse(staff)) return staff;

  const hook = serverEnv(context.locals, 'CF_DEPLOY_HOOK');
  if (!hook) {
    return json(
      {
        error:
          'No deploy hook is configured, so the site cannot be rebuilt from here. Ask a developer to set CF_DEPLOY_HOOK.',
      },
      501,
    );
  }

  try {
    const res = await fetch(hook, { method: 'POST' });
    if (!res.ok) throw new Error(`deploy hook returned ${res.status}`);
    return json({ ok: true });
  } catch (err) {
    console.error('[admin/publish] deploy hook failed', err);
    return json({ error: 'Could not start the rebuild. Please try again.' }, 502);
  }
};
