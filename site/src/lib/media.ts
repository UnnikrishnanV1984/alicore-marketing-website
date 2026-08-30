/**
 * Image slot resolution.
 *
 * The central constraint: public pages are prerendered, but their imagery is
 * admin-managed at runtime. We reconcile that with STABLE PATHS --
 *
 *     media/slots/{slot_id}/{width}.{ext}
 *
 * The built HTML points at a URL that never changes for the life of the slot.
 * Replacing an image overwrites the object at that path and purges the
 * Cloudflare cache entry, so the swap is live without a rebuild.
 *
 * A rebuild is only needed when a slot goes from EMPTY to FILLED (or back),
 * because that flips between a placeholder block and an <img>. The admin
 * triggers a deploy hook in that case -- see MediaLibrary.
 */

import { anonClient, mediaUrl } from './supabase';

export const VARIANT_WIDTHS = [640, 1280, 2000] as const;
export type VariantWidth = (typeof VARIANT_WIDTHS)[number];

export type SlotImage = {
  slotId: string;
  alt: string;
  width: number | null;
  height: number | null;
  /** Stable public URL per width, WebP. */
  webp: Record<number, string>;
  /** Largest width, used as the <img src> fallback. */
  fallback: string;
};

export function slotPath(slotId: string, width: number, ext = 'webp'): string {
  return `slots/${slotId}/${width}.${ext}`;
}

function buildSlotImage(
  slotId: string,
  alt: string,
  width: number | null,
  height: number | null,
): SlotImage {
  const webp: Record<number, string> = {};
  for (const w of VARIANT_WIDTHS) {
    webp[w] = mediaUrl(slotPath(slotId, w));
  }
  return {
    slotId,
    alt,
    width,
    height,
    webp,
    fallback: webp[2000] ?? '',
  };
}

/**
 * Fetch every slot that currently has a live image. Called once per build.
 * Returns an empty map on any failure -- a missing or unreachable Supabase
 * project renders placeholders rather than breaking the build.
 */
export async function loadSlotImages(): Promise<Map<string, SlotImage>> {
  const map = new Map<string, SlotImage>();
  const supabase = anonClient();
  if (!supabase) return map;

  try {
    const { data, error } = await supabase
      .from('media_assets')
      .select('slot_id, alt_text, width, height')
      .eq('is_active', true);

    if (error || !data) return map;

    for (const row of data) {
      map.set(
        row.slot_id,
        buildSlotImage(row.slot_id, row.alt_text ?? '', row.width ?? null, row.height ?? null),
      );
    }
  } catch {
    // Network failure at build time -> placeholders. Never fail the build.
  }
  return map;
}

/** `srcset` string for a resolved slot. */
export function srcSet(image: SlotImage): string {
  return VARIANT_WIDTHS.map((w) => `${image.webp[w]} ${w}w`).join(', ');
}
