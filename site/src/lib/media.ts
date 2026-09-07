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

/** Product slots take up to this many photographs, cycled on the public site. */
export const MAX_GALLERY_POSITIONS = 5;

export type SlotImage = {
  slotId: string;
  position: number;
  alt: string;
  width: number | null;
  height: number | null;
  /** Stable public URL per width, WebP. */
  webp: Record<number, string>;
  /** Largest width, used as the <img src> fallback. */
  fallback: string;
};

export function slotPath(slotId: string, width: number, position = 1, ext = 'webp'): string {
  return `slots/${slotId}/${position}/${width}.${ext}`;
}

function buildSlotImage(
  slotId: string,
  position: number,
  alt: string,
  width: number | null,
  height: number | null,
): SlotImage {
  const webp: Record<number, string> = {};
  for (const w of VARIANT_WIDTHS) {
    webp[w] = mediaUrl(slotPath(slotId, w, position));
  }
  return {
    slotId,
    position,
    alt,
    width,
    height,
    webp,
    fallback: webp[2000] ?? '',
  };
}

/**
 * Fetch every slot's photograph at position 1. Called once per build for the
 * single-image placements (hero, about, GFRC/FRP stage, manufacturing,
 * project tiles, and a product's own detail-page hero). Product cards that
 * want the full up-to-5 gallery use `loadSlotGalleries` instead.
 *
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
      .eq('is_active', true)
      .eq('position', 1);

    if (error || !data) return map;

    for (const row of data) {
      map.set(
        row.slot_id,
        buildSlotImage(row.slot_id, 1, row.alt_text ?? '', row.width ?? null, row.height ?? null),
      );
    }
  } catch {
    // Network failure at build time -> placeholders. Never fail the build.
  }
  return map;
}

/**
 * Fetch every slot's full set of photographs (up to `MAX_GALLERY_POSITIONS`),
 * ordered by position. Used for product cards, which cycle through whatever
 * has been uploaded -- one photograph renders statically, several crossfade.
 */
export async function loadSlotGalleries(): Promise<Map<string, SlotImage[]>> {
  const map = new Map<string, SlotImage[]>();
  const supabase = anonClient();
  if (!supabase) return map;

  try {
    const { data, error } = await supabase
      .from('media_assets')
      .select('slot_id, position, alt_text, width, height')
      .eq('is_active', true)
      .order('position', { ascending: true });

    if (error || !data) return map;

    for (const row of data) {
      const image = buildSlotImage(
        row.slot_id,
        row.position ?? 1,
        row.alt_text ?? '',
        row.width ?? null,
        row.height ?? null,
      );
      const existing = map.get(row.slot_id);
      if (existing) existing.push(image);
      else map.set(row.slot_id, [image]);
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
