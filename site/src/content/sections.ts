/**
 * Repeating section content: materials, why-us, process, journey, industries.
 *
 * All copy is transcribed from Alicore_Requirements.txt (authority) and the
 * mockup's `renderVals()`. Brand-approved text -- version-controlled, not
 * database-backed. See docs/IMPLEMENTATION_PLAN.md section 4.
 */

/* --------------------------------------------------------------------------
   Materials
   -------------------------------------------------------------------------- */

export const gfrc = {
  eyebrow: 'Material 01 — GFRC',
  heading: 'GFRC — Strength Meets Architectural Freedom',
  intro:
    'Glass Fiber Reinforced Concrete enables architects and designers to create detailed architectural forms while maintaining a lightweight and durable construction solution.',
  points: [
    'Lightweight construction',
    'High design flexibility',
    'Detailed surface finishes',
    'Custom shapes and profiles',
    'Large architectural facades',
    'Durable exterior applications',
    'Custom colours and textures',
  ],
  cta: 'Explore GFRC Solutions',
  slot: 'alicore-gfrc',
} as const;

export const frp = {
  eyebrow: 'Material 02 — FRP',
  heading: 'FRP — Lightweight. Durable. Versatile.',
  intro:
    'Our FRP solutions provide excellent design flexibility and durability for applications where lightweight construction, corrosion resistance and customized shapes are important.',
  points: [
    'Lightweight',
    'Corrosion resistant',
    'High design flexibility',
    'Custom shapes and sizes',
    'Demanding environments',
    'Low maintenance',
  ],
  cta: 'Explore FRP Solutions',
  slot: 'alicore-frp',
} as const;

/* --------------------------------------------------------------------------
   Why Alicore -- six cards
   -------------------------------------------------------------------------- */

export const why = [
  ['Custom Manufacturing', 'Products manufactured according to project drawings, dimensions and design requirements.'],
  ['Architectural Precision', 'Attention to geometry, detailing, dimensions and surface quality.'],
  ['Material Expertise', 'Specialized knowledge of GFRC and FRP manufacturing.'],
  ['Project Support', 'Support from design development through manufacturing and delivery.'],
  ['Quality Focus', 'Consistent attention to material selection, production and finishing.'],
  ['Scalable Production', 'Capability to support individual custom pieces as well as larger project requirements.'],
].map(([name, desc], i) => ({
  idx: String(i + 1).padStart(2, '0'),
  name,
  desc,
}));

/* --------------------------------------------------------------------------
   Custom Solutions -- six process steps
   -------------------------------------------------------------------------- */

export const steps = [
  ['01', 'Concept', 'Understand the architectural requirement.'],
  ['02', 'Design Development', 'Review drawings, dimensions, profiles and details.'],
  ['03', 'Engineering', 'Develop the manufacturing approach and technical specifications.'],
  ['04', 'Manufacturing', 'Produce the required architectural elements with controlled processes.'],
  ['05', 'Finishing', 'Apply the required surface finish, colour and detailing.'],
  ['06', 'Delivery', 'Prepare and deliver the products according to project requirements.'],
].map(([n, name, desc]) => ({ n, name, desc }));

/* --------------------------------------------------------------------------
   Manufacturing -- seven journey stages
   Design -> Mould Development -> Material Preparation -> Production ->
   Finishing -> Quality Check -> Delivery
   -------------------------------------------------------------------------- */

export const journey = [
  ['01', 'Design', 'Architectural intent translated into manufacturing inputs.'],
  ['02', 'Mould Development', 'Patterns and moulds built for the specified profile.'],
  ['03', 'Material Preparation', 'Mix design and material selection for the application.'],
  ['04', 'Production', 'Components produced under controlled conditions.'],
  ['05', 'Finishing', 'Surface finish, colour and texture applied.'],
  ['06', 'Quality Check', 'Dimensional and finish inspection before release.'],
  ['07', 'Delivery', 'Packed and dispatched to protect geometry and finish.'],
].map(([n, name, desc]) => ({ n, name, desc }));

/**
 * Quality block. Note what is deliberately absent: no ISO reference, no testing
 * standard, no certification claim. The brief forbids all of it unless the
 * company supplies verified evidence.
 */
export const quality = {
  heading: 'Built Around Quality',
  body: 'Quality begins with understanding the project. From material selection and mould preparation to production, finishing and final inspection, Alicore focuses on maintaining consistency across every stage of manufacturing.',
} as const;

/* --------------------------------------------------------------------------
   Industries -- ten cards
   -------------------------------------------------------------------------- */

export const industries = [
  'Residential Buildings',
  'Commercial Buildings',
  'Hospitality',
  'Retail',
  'Institutional Buildings',
  'Office Buildings',
  'Villas',
  'Interior Architecture',
  'Facade Projects',
  'Landscape & Public Spaces',
] as const;

/* --------------------------------------------------------------------------
   Projects -- filter categories
   The mockup's filter row. "All" is prepended by the component.
   -------------------------------------------------------------------------- */

export const projectCategories = [
  'Commercial',
  'Residential',
  'Hospitality',
  'Facades',
  'Interiors',
  'Custom Architectural Elements',
] as const;

/* --------------------------------------------------------------------------
   About page narrative.
   Tone per the brief: "confident but not exaggerated". No superlatives, no
   scale claims, no founding dates -- none of that has been supplied.
   -------------------------------------------------------------------------- */

export const about = {
  heading: 'About ALICORE',
  lead: 'Alicore is an architectural products manufacturing company specializing in GFRC and FRP solutions.',
  body: [
    'We work with architects, builders, developers, contractors and designers to transform architectural concepts into high-quality manufactured products.',
    'From standard architectural elements to highly customized designs, our focus is precision, durability, aesthetics and reliable project execution.',
    'Our work sits at the point where architectural design, engineering and manufacturing meet. A drawing has to become a mould, a mould has to produce a repeatable element, and that element has to arrive on site with its geometry and finish intact. Each of those steps is treated as part of the same process rather than as separate handovers.',
    'Alicore manufactures for residential, commercial, hospitality and large-scale developments, supporting both individual custom pieces and the repeating components a full elevation requires.',
  ],
} as const;
