/**
 * Product catalogue.
 *
 * Copy is brand-approved text lifted from Alicore_Requirements.txt, so it lives
 * in version control rather than the database (plan section 4). Only the
 * photography is admin-managed, via `slot`.
 *
 * `keyword` records which term from the brief's SEO list each detail page owns.
 * Do not target the same keyword from two pages.
 */

export type Product = {
  slug: string;
  /** media_slots.id -- the admin Image Library placement for this card. */
  slot: string;
  /** Zero-padded index badge shown on the card image, per the mockup. */
  idx: string;
  cat: 'GFRC' | 'FRP' | 'Custom';
  name: string;
  /** Card description. Verbatim from the brief. */
  desc: string;
  /** Art-direction note for the photographer / admin uploader. */
  shot: string;
  keyword: string;
  /** Detail-page body. Expands the brief's copy without adding claims. */
  detail: string[];
  applications: string[];
};

export const products: Product[] = [
  {
    slug: 'gfrc-architectural-panels',
    slot: 'alicore-prod-1',
    idx: '01',
    cat: 'GFRC',
    name: 'GFRC Architectural Panels',
    desc: 'Lightweight architectural panels designed for contemporary facades and interiors.',
    shot: 'Large-format GFRC panel facade',
    keyword: 'GFRC panels',
    detail: [
      'Glass Fiber Reinforced Concrete panels give architects the surface quality of cast concrete at a fraction of the weight, which keeps facade loads and fixing requirements manageable on large elevations.',
      'Panels are manufactured to project drawings — dimensions, edge profiles, returns, joint layout and fixing positions are all set by the elevation rather than by a standard catalogue size.',
      'Surface finish, colour and texture are specified per project, from smooth off-form through to exposed-aggregate and textured faces.',
    ],
    applications: [
      'Building facades and rainscreen cladding',
      'Feature walls and interior cladding',
      'Soffits and fascia elements',
      'Parapet and coping details',
    ],
  },
  {
    slug: 'gfrc-cornices',
    slot: 'alicore-prod-2',
    idx: '02',
    cat: 'GFRC',
    name: 'GFRC Cornices',
    desc: 'Decorative architectural profiles manufactured with precision for exterior and interior applications.',
    shot: 'Cornice profile detail',
    keyword: 'GFRC cornice',
    detail: [
      'Cornices are produced from purpose-built moulds so the profile runs true across long elevations, with consistent projection and shadow line from one length to the next.',
      'Profiles are developed from the architect’s section drawing. Mitres, stop-ends and corner pieces are manufactured as part of the same run so details resolve cleanly on site.',
      'Suitable for both external elevations and internal ceiling and wall detailing.',
    ],
    applications: [
      'Elevation banding and string courses',
      'Parapet and roofline cornices',
      'Internal ceiling cornices and coves',
      'Window and door surrounds',
    ],
  },
  {
    slug: 'gfrc-columns-and-pillars',
    slot: 'alicore-prod-3',
    idx: '03',
    cat: 'GFRC',
    name: 'GFRC Columns & Pillars',
    desc: 'Architectural columns and structural-looking decorative elements customized to project requirements.',
    shot: 'Column cladding at entrance',
    keyword: 'GFRC columns',
    detail: [
      'Column cladding in GFRC lets an entrance or colonnade carry the visual weight of solid stone or cast concrete while remaining light enough to fix to a structural core.',
      'Shafts, bases and capitals are manufactured as matched sets, split for installation around existing structure where the sequence requires it.',
      'Fluting, entasis, tapers and plain cylindrical forms are all produced from project-specific moulds.',
    ],
    applications: [
      'Entrance colonnades and porticos',
      'Cladding to structural columns',
      'Lobby and atrium features',
      'Landscape and gateway elements',
    ],
  },
  {
    slug: 'gfrc-jalis',
    slot: 'alicore-prod-4',
    idx: '04',
    cat: 'GFRC',
    name: 'GFRC Jalis',
    desc: 'Decorative perforated screens combining traditional architectural aesthetics with modern manufacturing.',
    shot: 'Perforated jali screen',
    keyword: 'GFRC jali',
    detail: [
      'Jali screens carry a traditional architectural language into contemporary buildings, working as shading, privacy and facade articulation at the same time.',
      'Perforation geometry is developed to the project’s own pattern — module size, open area and panel dimensions are set by the elevation and the shading requirement, not by a fixed range.',
      'Manufactured as panels sized for handling and fixing, with the pattern registered across joints so the screen reads as one continuous field.',
    ],
    applications: [
      'Facade shading screens',
      'Balcony and terrace privacy screens',
      'Compound walls and boundary treatments',
      'Interior partitions and dividers',
    ],
  },
  {
    slug: 'gfrc-decorative-elements',
    slot: 'alicore-prod-5',
    idx: '05',
    cat: 'GFRC',
    name: 'GFRC Decorative Elements',
    desc: 'Custom profiles, mouldings, trims, frames and other architectural components.',
    shot: 'Moulding and trim detail',
    keyword: 'custom GFRC products',
    detail: [
      'The decorative range covers the elements that resolve an elevation: mouldings, trims, frames, brackets, medallions, sills and the transition pieces between them.',
      'Because each piece is moulded, an element that appears once and an element that repeats a hundred times are handled by the same process — only the mould economics change.',
      'Profiles are matched across a project so trims, frames and mouldings share a consistent radius, depth and finish.',
    ],
    applications: [
      'Window and door surrounds',
      'Brackets, corbels and medallions',
      'Sills, bands and skirting profiles',
      'Feature and heritage detailing',
    ],
  },
  {
    slug: 'frp-architectural-products',
    slot: 'alicore-prod-6',
    idx: '06',
    cat: 'FRP',
    name: 'FRP Architectural Products',
    desc: 'Lightweight, durable and corrosion-resistant FRP solutions for architectural and industrial applications.',
    shot: 'FRP moulded element',
    keyword: 'FRP architectural products',
    detail: [
      'Fiber Reinforced Plastic suits placements where weight, corrosion resistance or a complex moulded geometry rule out heavier materials.',
      'FRP holds fine moulded detail and comes out of the mould light enough for single-person handling on many elements, which simplifies installation on interiors and retrofit work.',
      'Its corrosion resistance makes it a practical choice for coastal exposure, wet areas and environments where cementitious or metal elements would need frequent attention.',
    ],
    applications: [
      'Domes, vaults and curved feature elements',
      'Interior feature walls and ceiling elements',
      'Coastal and high-humidity installations',
      'Industrial and service enclosures',
    ],
  },
  {
    slug: 'custom-architectural-elements',
    slot: 'alicore-prod-7',
    idx: '07',
    cat: 'Custom',
    name: 'Custom Architectural Elements',
    desc: 'Products developed according to architectural drawings, CAD designs, dimensions and project requirements.',
    shot: 'Custom element from drawing',
    keyword: 'custom architectural products manufacturer',
    detail: [
      'Most of what Alicore manufactures does not appear in a catalogue. Projects arrive as drawings, CAD files, reference photographs or a sketched intent, and the element is developed from there.',
      'The route from drawing to delivered element runs through design development, engineering, mould making, production and finishing — the same six stages set out under Custom Solutions.',
      'Both GFRC and FRP are available for custom work; material selection follows the placement, the exposure and the geometry rather than the other way round.',
    ],
    applications: [
      'Elements developed from architectural drawings',
      'One-off feature and sculptural pieces',
      'Heritage profile matching and replacement',
      'Project-specific repeating components',
    ],
  },
];

export const productBySlug = (slug: string) => products.find((p) => p.slug === slug);

/**
 * The two material tiles that lead the product grid on the home page and
 * product index, ahead of the seven cards.
 */
export const materialTiles = [
  {
    label: 'Material 01',
    code: 'GFRC',
    href: '/gfrc',
    desc: 'Glass Fiber Reinforced Concrete — panels, jalis, cornices, columns and custom architectural forms.',
    cta: 'Explore GFRC',
  },
  {
    label: 'Material 02',
    code: 'FRP',
    href: '/frp',
    desc: 'Fiber Reinforced Plastic — lightweight, corrosion-resistant elements for architectural applications.',
    cta: 'Explore FRP',
  },
] as const;

/**
 * Enquiry form picklist. The mockup's eight options, verbatim and in order --
 * see the quote-enquiry-conventions skill.
 */
export const productOptions = [
  'GFRC Architectural Panels',
  'GFRC Cornices',
  'GFRC Columns & Pillars',
  'GFRC Jalis',
  'GFRC Decorative Elements',
  'FRP Architectural Products',
  'Custom Architectural Elements',
  'Not sure yet — please advise',
] as const;
