import { anonClient, mediaUrl } from './supabase';
import { slotPath, VARIANT_WIDTHS } from './media';
import { projectCategories } from '../content/sections';

export type Project = {
  id: string;
  name: string;
  location: string;
  category: string;
  material: string | null;
  product: string | null;
  application: string | null;
  imagePath: string | null;
  altText: string;
};

/**
 * Published projects, newest sort_order first.
 *
 * `image_path` holds a media slot id (e.g. "alicore-proj-1"), so tiles resolve
 * through the same stable-path scheme as every other image.
 *
 * Returns [] on any failure. A project grid that is briefly empty is a much
 * better outcome than a build that fails or a page that 500s.
 */
export async function loadPublishedProjects(locals?: unknown): Promise<Project[]> {
  const supabase = anonClient(locals);
  if (!supabase) return [];

  try {
    const { data, error } = await supabase
      .from('projects')
      .select('id, name, location, category, material, product, application, image_path, alt_text')
      .eq('is_published', true)
      .order('sort_order', { ascending: true });

    if (error || !data) return [];

    return data.map((r) => ({
      id: r.id,
      name: r.name,
      location: r.location,
      category: r.category,
      material: r.material,
      product: r.product,
      application: r.application,
      imagePath: r.image_path,
      altText: r.alt_text ?? '',
    }));
  } catch {
    return [];
  }
}

/** Only offer filter chips for categories that actually have published work. */
export function activeCategories(projects: Project[]): string[] {
  const present = new Set(projects.map((p) => p.category));
  return projectCategories.filter((c) => present.has(c));
}

export function projectImage(project: Project, locals?: unknown) {
  if (!project.imagePath) return null;
  const webp: Record<number, string> = {};
  for (const w of VARIANT_WIDTHS) {
    webp[w] = mediaUrl(slotPath(project.imagePath, w), locals);
  }
  return {
    src: webp[2000],
    srcset: VARIANT_WIDTHS.map((w) => `${webp[w]} ${w}w`).join(', '),
  };
}
