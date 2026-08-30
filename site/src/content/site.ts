/**
 * Sitewide brand constants, contact details and navigation.
 *
 * Contact details read from env so the brief's `[ADD EMAIL]` / `[ADD ADDRESS]`
 * placeholders can be filled without a code change (plan section 11). Where a
 * value is still missing we render the placeholder verbatim rather than
 * inventing one -- CLAUDE.md: "Don't invent contact details."
 */

const env = import.meta.env;

export const PLACEHOLDER_EMAIL = '[ADD EMAIL]';
export const PLACEHOLDER_ADDRESS = '[ADD ADDRESS]';

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

export const contact = {
  phoneDisplay: env.PUBLIC_PHONE_DISPLAY || '9995 495 395',
  phoneHref: `tel:${env.PUBLIC_PHONE_E164 || '+919995495395'}`,
  whatsappNumber: env.PUBLIC_WHATSAPP_E164 || '919995495395',
  /** Prefilled WhatsApp message, per the mockup's FAB title attribute. */
  whatsappHref: `https://wa.me/${env.PUBLIC_WHATSAPP_E164 || '919995495395'}?text=${encodeURIComponent(
    'Hello Alicore, I would like to discuss an architectural products requirement.',
  )}`,
  email: env.PUBLIC_EMAIL || '',
  emailDisplay: env.PUBLIC_EMAIL || PLACEHOLDER_EMAIL,
  emailHref: env.PUBLIC_EMAIL ? `mailto:${env.PUBLIC_EMAIL}` : '',
  address: env.PUBLIC_ADDRESS || '',
  addressDisplay: env.PUBLIC_ADDRESS || PLACEHOLDER_ADDRESS,
} as const;

/**
 * Social links. All four are `href="#"` in the mockup -- until real URLs are
 * supplied these render as plain text, not dead links. A link that goes
 * nowhere is worse than no link.
 */
export const social: { label: string; href: string }[] = [
  { label: 'Instagram', href: '' },
  { label: 'Facebook', href: '' },
  { label: 'LinkedIn', href: '' },
  { label: 'YouTube', href: '' },
];

/**
 * Primary navigation. `anchor` is the in-page target used on the long-scroll
 * home page; `href` is the standalone page. The header links to the page and
 * the scroll-spy highlights by anchor when we are on `/`.
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
