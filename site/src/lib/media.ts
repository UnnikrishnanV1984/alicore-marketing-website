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

/**
 * How long a browser may reuse a stored photograph.
 *
 * A year, which is only safe because an upload now writes to a path nobody has
 * used before -- see `slotPath`. A URL whose bytes can never change may be
 * cached forever; that is the whole bargain.
 */
export const MEDIA_MAX_AGE_SECONDS = 31536000;
export type VariantWidth = (typeof VARIANT_WIDTHS)[number];

/** Product slots take up to this many photographs, cycled on the public site. */
export const MAX_GALLERY_POSITIONS = 5;

export type SlotImage = {
  slotId: string;
  position: number;
  alt: string;
  width: number | null;
  height: number | null;
  /** Public URL per width, WebP. Changes when the photograph is replaced. */
  webp: Record<number, string>;
  /** Largest width, used as the <img src> fallback. */
  fallback: string;
};

/**
 * Where one variant of one photograph lives.
 *
 * `version` is the upload's own token, so replacing a photograph writes to a
 * path nothing has ever served. Omit it and you get the pre-versioning path,
 * which is what every asset uploaded before this change still uses.
 *
 * The stable-path scheme this replaces did not survive contact with the CDN.
 * It assumed that overwriting an object would eventually reach browsers, and
 * it does not: Supabase serves storage through a CDN that caches by path for
 * as long as the object's own Cache-Control says, offers no purge on this
 * plan, and -- measured, not assumed -- ignores the query string completely,
 * so `?v=` busts a browser cache only to be handed the same stale bytes back
 * from the edge. A new path is the only thing that reliably changes what a
 * visitor sees.
 *
 * The cost is that the built HTML now carries a URL that changes when the
 * photograph does, so a replacement needs a rebuild -- the admin console's
 * "Publish to the live site" button, which it already prompts for.
 */
export function slotPath(
  slotId: string,
  width: number,
  position = 1,
  ext = 'webp',
  version?: string | null,
): string {
  const base = `slots/${slotId}/${position}`;
  return version ? `${base}/${version}/${width}.${ext}` : `${base}/${width}.${ext}`;
}

/** The `variants` column: width -> stored path, per format. */
export type StoredVariants = { webp?: Record<string, string> } | null | undefined;

/** Pick the stored path for a width, falling back to the pre-versioning one. */
function pathForWidth(
  variants: StoredVariants,
  slotId: string,
  position: number,
  width: number,
): string {
  const stored = variants?.webp?.[String(width)];
  return stored ?? slotPath(slotId, width, position);
}

function buildSlotImage(
  slotId: string,
  position: number,
  alt: string,
  width: number | null,
  height: number | null,
  variants?: StoredVariants,
): SlotImage {
  const webp: Record<number, string> = {};
  for (const w of VARIANT_WIDTHS) {
    webp[w] = mediaUrl(pathForWidth(variants, slotId, position, w));
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
      .select('slot_id, alt_text, width, height, variants')
      .eq('is_active', true)
      .eq('position', 1);

    if (error || !data) return map;

    for (const row of data) {
      map.set(
        row.slot_id,
        buildSlotImage(
          row.slot_id,
          1,
          row.alt_text ?? '',
          row.width ?? null,
          row.height ?? null,
          row.variants as StoredVariants,
        ),
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
      .select('slot_id, position, alt_text, width, height, variants')
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
        row.variants as StoredVariants,
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
