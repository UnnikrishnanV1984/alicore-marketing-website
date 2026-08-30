/**
 * Sitewide brand constants and navigation.
 *
 * Contact details and social links are admin-editable and live in
 * lib/settings.ts -- import `loadContact()` for those.
 */

const env = import.meta.env;

export const site = {
  name: 'Alicore',
  nameLockup: 'ALICORE',
  tagline: 'Architectural Products. Engineered to Elevate.',
  descriptor: 'Architectural Products',
  strapline: 'GFRC | FRP | Custom Architectural Solutions.',
  domain: 'www.alicore.in',
  url: env.PUBLIC_SITE_URL || 'https://www.alicore.in',
  copyrightYear: 2026,
} as const;

/**
 * Primary navigation. `anchor` is the in-page target used on the long-scroll
 * home page; `href` is the standalone page. The header links to the page and
 * the scroll-spy highlights by anchor when we are on `/`.
 *
 * The brief and the mockup disagree here, so this list follows neither exactly
 * (see the divergence table in docs/IMPLEMENTATION_PLAN.md):
 *
 *   GFRC, FRP     from the brief, which names the header items verbatim and
 *                 overrides the mockup per CLAUDE.md. They are also the two
 *                 product lines people search for by name.
 *   Manufacturing from the mockup. The brief omits it, but the home page still
 *                 carries a #manufacturing section -- dropping the link left a
 *                 section of the page unreachable from the menu.
 */
export const nav = [
  { label: 'Home', href: '/', anchor: '#top', id: 'top' },
  { label: 'About', href: '/about', anchor: '#about', id: 'about' },
  { label: 'Products', href: '/products', anchor: '#products', id: 'products' },
  { label: 'GFRC', href: '/gfrc', anchor: '#gfrc', id: 'gfrc' },
  { label: 'FRP', href: '/frp', anchor: '#frp', id: 'frp' },
  { label: 'Projects', href: '/projects', anchor: '#projects', id: 'projects' },
  { label: 'Custom Solutions', href: '/custom-solutions', anchor: '#custom', id: 'custom' },
  { label: 'Manufacturing', href: '/manufacturing', anchor: '#manufacturing', id: 'manufacturing' },
  { label: 'Contact', href: '/contact', anchor: '#contact', id: 'contact' },
] as const;

/** Footer "Quick Links" -- the brief names exactly these five. */
export const footerQuickLinks = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Products', href: '/products' },
  { label: 'Projects', href: '/projects' },
  { label: 'Contact', href: '/contact' },
] as const;

export const footerProductLinks = [
  { label: 'GFRC Panels & Jalis', href: '/gfrc' },
  { label: 'Cornices & Columns', href: '/products/gfrc-cornices' },
  { label: 'FRP Architectural Products', href: '/frp' },
  { label: 'Custom Elements', href: '/custom-solutions' },
  { label: 'Manufacturing', href: '/manufacturing' },
] as const;

/** The four hero pillars beneath the fold. */
export const pillars = [
  { n: '01', code: 'GFRC', full: 'Glass Fiber Reinforced Concrete' },
  { n: '02', code: 'FRP', full: 'Fiber Reinforced Plastic' },
  { n: '03', code: 'PRECAST', full: 'Precision · Strength · Performance' },
  { n: '04', code: 'FACADE', full: 'Elevating Spaces · Defining Style' },
] as const;

/** The four capability tiles in the "Who We Are" section. */
export const capabilities = [
  { k: 'Custom Manufacturing', v: 'Made to project drawings and dimensions' },
  { k: 'Material Expertise', v: 'GFRC and FRP systems' },
  { k: 'Project Support', v: 'Design development to delivery' },
  { k: 'Scalable Production', v: 'Single pieces to full projects' },
] as const;
