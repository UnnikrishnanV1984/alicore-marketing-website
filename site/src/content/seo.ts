/**
 * Per-route SEO metadata.
 *
 * Keywords come from Alicore_Requirements.txt. The brief says "Do not
 * keyword-stuff" -- so each route owns ONE primary term and reads as prose.
 * The `/` title and description are the mockup's <helmet> values verbatim;
 * those are final copy, not placeholders.
 */

export type Meta = { title: string; description: string };

export const defaultMeta: Meta = {
  title:
    'Alicore — Architectural Products, Engineered to Elevate | GFRC, FRP, Precast & Facade Manufacturer',
  description:
    'Alicore manufactures premium GFRC, FRP, precast and facade architectural products — panels, jalis, cornices, columns and custom elements — for architects, developers and contractors.',
};

export const meta: Record<string, Meta> = {
  '/': defaultMeta,

  '/about': {
    title: 'About Alicore — Architectural Products Manufacturer',
    description:
      'Alicore is an architectural products manufacturing company specializing in GFRC and FRP solutions for architects, builders, developers, contractors and designers.',
  },

  '/products': {
    title: 'Architectural Products — GFRC & FRP Range | Alicore',
    description:
      'GFRC panels, cornices, columns, jalis and decorative elements, plus FRP architectural products and fully custom elements manufactured to project drawings.',
  },

  '/gfrc': {
    title: 'GFRC Manufacturer — Panels, Jalis, Cornices & Columns | Alicore',
    description:
      'Glass Fiber Reinforced Concrete architectural products manufactured to project drawings — lightweight, detailed and durable for facades and interiors.',
  },

  '/frp': {
    title: 'FRP Manufacturer — Architectural Products | Alicore',
    description:
      'Lightweight, corrosion-resistant FRP architectural products with high design flexibility and custom shapes for demanding architectural environments.',
  },

  '/projects': {
    title: 'Projects — Architecture in Detail | Alicore',
    description:
      'GFRC and FRP architectural elements across commercial, residential, hospitality, facade and interior projects, from concept to completed installation.',
  },

  '/custom-solutions': {
    title: 'Custom GFRC & FRP Products — Your Design, Our Manufacturing | Alicore',
    description:
      'Alicore develops custom architectural products from drawings, CAD files and design concepts through a six-stage process from concept to delivery.',
  },

  '/manufacturing': {
    title: 'Manufacturing — From Design to Reality | Alicore',
    description:
      'Material expertise, mould development and controlled production processes turning architectural concepts into finished GFRC and FRP elements.',
  },

  '/contact': {
    title: 'Contact Alicore — Request a Quote for Your Project',
    description:
      'Share your architectural requirement, drawing or project details and our team will respond with the right manufacturing approach. Call or WhatsApp us directly.',
  },
};

/** Product detail pages. Each owns one long-tail term from the brief's list. */
export const productMeta: Record<string, Meta> = {
  'gfrc-architectural-panels': {
    title: 'GFRC Panels — Architectural Facade Panels | Alicore',
    description:
      'Lightweight GFRC architectural panels for contemporary facades and interiors, manufactured to project dimensions, edge profiles and surface finishes.',
  },
  'gfrc-cornices': {
    title: 'GFRC Cornice Manufacturer — Architectural Profiles | Alicore',
    description:
      'Precision GFRC cornices and decorative profiles for exterior elevations and interior detailing, produced from purpose-built project moulds.',
  },
  'gfrc-columns-and-pillars': {
    title: 'GFRC Columns & Pillars — Architectural Column Cladding | Alicore',
    description:
      'GFRC architectural columns and column cladding — shafts, bases and capitals manufactured as matched sets to project requirements.',
  },
  'gfrc-jalis': {
    title: 'GFRC Jali Manufacturer — Perforated Screens | Alicore',
    description:
      'GFRC jali screens combining traditional perforated architectural patterns with modern manufacturing, for facade shading, privacy and interior partitions.',
  },
  'gfrc-decorative-elements': {
    title: 'Custom GFRC Products — Mouldings, Trims & Frames | Alicore',
    description:
      'Custom GFRC profiles, mouldings, trims, frames, brackets and sills manufactured to match project detailing across an elevation.',
  },
  'frp-architectural-products': {
    title: 'FRP Architectural Products — Lightweight & Corrosion Resistant | Alicore',
    description:
      'FRP architectural elements for domes, curved features, interiors and coastal exposure, where weight and corrosion resistance matter.',
  },
  'custom-architectural-elements': {
    title: 'Custom Architectural Products Manufacturer — GFRC & FRP | Alicore',
    description:
      'Architectural elements developed from drawings, CAD files and reference images, manufactured in GFRC or FRP to project specification.',
  },
};
