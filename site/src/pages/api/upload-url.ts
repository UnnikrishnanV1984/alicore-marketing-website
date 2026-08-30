import type { APIRoute } from 'astro';
import { serviceClient } from '../../lib/supabase';
import { ATTACHMENT_MAX_BYTES } from '../../lib/schema';

export const prerender = false;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

const ALLOWED_EXT = new Set(['pdf', 'jpg', 'jpeg', 'png', 'webp', 'dwg', 'dxf', 'zip']);

/** Strip anything that could escape the key namespace or confuse storage. */
function safeName(filename: string): string | null {
  const base = filename.split(/[\\/]/).pop() ?? '';
  const ext = base.includes('.') ? base.split('.').pop()!.toLowerCase() : '';
  if (!ALLOWED_EXT.has(ext)) return null;

  const stem = base
    .slice(0, base.length - ext.length - 1)
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);

  return `${stem || 'drawing'}.${ext}`;
}

/**
 * Issues a short-lived signed upload URL so the browser can PUT the drawing
 * straight into private storage.
 *
 * The file never passes through this Worker: a 25MB CAD file would exceed both
 * the practical body limit and the free-tier CPU budget (plan section 4).
 */
export const POST: APIRoute = async ({ request, locals }) => {
  let body: { filename?: string; size?: number; contentType?: string };
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Malformed request.' }, 400);
  }

  if (!body.filename) return json({ error: 'No file name supplied.' }, 400);

  if (typeof body.size === 'number' && body.size > ATTACHMENT_MAX_BYTES) {
    return json({ error: 'That file is over 25 MB.' }, 413);
  }

  const name = safeName(body.filename);
  if (!name) return json({ error: 'That file type is not accepted.' }, 415);

  // Namespaced by date and a random id so two uploads never collide and the
  // key cannot be guessed.
  const day = new Date().toISOString().slice(0, 10);
  const path = `${day}/${crypto.randomUUID()}/${name}`;

  try {
    const supabase = serviceClient(locals);
    const { data, error } = await supabase.storage
      .from('enquiry-attachments')
      .createSignedUploadUrl(path);

    if (error || !data) throw new Error(error?.message ?? 'no signed url');

    return json({ signedUrl: data.signedUrl, path });
  } catch (err) {
    console.error('[upload-url] failed', err);
    return json({ error: 'Could not prepare the upload.' }, 500);
  }
};
