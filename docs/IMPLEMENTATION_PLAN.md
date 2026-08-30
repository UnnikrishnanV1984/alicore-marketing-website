# Alicore Website — Implementation Plan

Status: **confirmed**, ready to build.
Inputs: `design-mockup/uploads/Alicore_Requirements.txt` (authority),
`design-mockup/Alicore Home.dc.html`, `design-mockup/Alicore Admin.dc.html`.

---

## 0. Confirmed decisions

| Decision | Choice | Rationale |
|---|---|---|
| Page structure | **Hybrid** — long-scroll home *and* real standalone pages | Brief mandates 9 pages; mockup designs a long-scroll home. Keeps the designed experience, gives each keyword cluster its own URL/title/H1. |
| Admin scope | Enquiries + Image Library + **Projects manager** | Brief requires "Coming Soon" placeholders until real data lands, implying the client adds projects over time. |
| Hosting | **Cloudflare** (GoDaddy stays registrar only) | Free tier permits commercial use; GoDaddy has no free tier and throttles Node past usability. |
| Framework | **Astro 5** static-first + React islands | 95% of the site is static content; Astro's Cloudflare adapter is first-class. |
| Database | **Supabase Postgres** (`ap-south-1`, Mumbai) | Collapses DB + object storage + staff auth into one free project, near the `+91` audience. |

---

## 0a. Where the build departs from the mockup

`CLAUDE.md` makes the brief the authority wherever it and the mockup disagree.
Every such departure is recorded here, so it can be audited without re-reading
both sources or asking whoever built it.

| Area | Mockup | Brief | Built | Why |
|---|---|---|---|---|
| Header nav | 7 items: Home, About, Products, Projects, Custom Solutions, Manufacturing, Contact | 8 items: adds GFRC and FRP, omits Manufacturing | **9 items** — the brief's 8 plus Manufacturing | GFRC and FRP are named verbatim in the brief and are the two product lines searched by name. Manufacturing is kept because the home page still carries a `#manufacturing` section; following the brief literally left it unreachable from the menu. |
| Enquiry attachment | No file input | Lists a file upload | **No file input** | Client chose the mockup. `0003_remove_enquiry_attachments.sql` drops the column and the private bucket. |
| Enquiries "Clear all" | One button wiping the queue | — | **Per-row Archive** | An irreversible wipe sitting beside live customer leads. Archive is reversible and keeps the audit trail. |
| Enquiry failure | `try/catch` that silently reports success | — | **Fails loudly**, with call/WhatsApp fallback | The prototype's silent catch loses a lead and tells the customer it worked. |
| Staff login | Hardcoded `admin` / `alicore2026` | — | **Supabase Auth** | A prototype affordance; must never reach a deployed environment. |
| Scroll spy | 250ms `setInterval` poll | — | **IntersectionObserver** | Same behaviour, no timer running for the life of the page. |

Anything not listed here follows the mockup.

---

## 1. Stack

| Layer | Choice | Free-tier notes |
|---|---|---|
| Framework | Astro 5, `@astrojs/cloudflare` adapter | — |
| UI islands | React 19 (admin, mobile nav, project filter, form) | Keep island count low; public pages ship near-zero JS |
| Styling | Tailwind CSS v4, tokens as CSS custom properties | — |
| Host | Cloudflare Workers / Pages | Commercial use permitted |
| DB | Supabase Postgres | ~500 MB |
| Object storage | Supabase Storage | ~1 GB, two buckets |
| Staff auth | Supabase Auth (email+password, signup disabled) | — |
| Email | Resend | ~3,000/mo; needs `alicore.in` SPF/DKIM |
| Spam | Cloudflare Turnstile + honeypot + WAF rate-limit rule | Unlimited |
| Keepalive | GitHub Actions daily cron to `/api/health` | Prevents Supabase 7-day inactivity pause |
| DNS/CDN | Cloudflare (nameservers repointed from GoDaddy) | — |

**Recurring cost: 0 rupees/month** beyond the existing domain renewal.

### Cloudflare Workers free-tier constraint

Free Workers allow roughly 10 ms CPU per invocation. This is why **only `/projects` and `/admin/*` are
server-rendered** — every other route is prerendered to flat HTML at build time and costs zero CPU.
Do not casually convert static routes to SSR without re-checking this budget.

---

## 2. Design tokens

Extracted verbatim from the mockup's `<helmet>` style block. These are exact — do not re-derive.

```css
:root {
  /* surfaces */
  --al-bg:        #F6F4EF;  /* warm white, page default */
  --al-panel:     #ECE8E0;  /* light concrete, alternating sections */
  --al-panel-2:   #DAD5CB;  /* image placeholder / deeper concrete */
  --al-ink:       #12110F;  /* near-black, primary text + dark sections */
  --al-ink-2:     #1A1917;  /* FRP section ground */
  --al-ink-3:     #1F1D1A;  /* project tile ground, hover on dark */
  --al-footer:    #0C0B0A;  /* footer, admin sidebar */

  /* accent — sanctioned options: #C0973F #B08D3C #8C8A82 #A8763A */
  --al-gold:      #C0973F;  /* accent ON DARK grounds */
  --al-gold-ink:  #B08D3C;  /* accent ON LIGHT grounds (contrast-corrected) */

  /* type */
  --al-display: 'Jost', sans-serif;                 /* 300 400 500 600 */
  --al-body:    'Manrope', system-ui, sans-serif;   /* 300 400 500 600 */
  --al-mono:    'JetBrains Mono', monospace;        /* 400 500 — eyebrows, labels, meta */

  /* layout */
  --al-container: 1320px;
  --al-gutter:    clamp(20px, 4vw, 48px);
  --al-section-y: clamp(80px, 10vw, 150px);
  --al-scroll-offset: 92px;
}
```

Rules that fall out of the mockup and must be respected:

- **Gold is context-dependent.** `#C0973F` on dark grounds, `#B08D3C` on light. The mockup never mixes
  them. `#B08D3C` on warm white is the accessible pairing; `#C0973F` on warm white is not.
- **Hairline grids, not cards.** Repeating blocks (products, why-us, industries, capabilities) are a 1px
  gap over an `rgba(18,17,15,.14)` background with a matching border — the "cards" are gaps, not shadowed
  boxes. There is **no `border-radius` and no `box-shadow`** anywhere except the WhatsApp FAB.
- **Eyebrow pattern.** Every section opens with a 26px gold rule plus a mono uppercase label at
  `letter-spacing:.2em`, then an H2 in Jost 400.
- **Buttons are sharp rectangles**, uppercase Jost, `letter-spacing:.1em`, `padding:16px 30px`.
  Three variants: solid ink, solid gold, hairline outline.
- Self-host all three fonts. Do **not** ship the mockup's Google Fonts `<link>` — it costs a
  render-blocking third-party round trip.

---

## 3. Site map

Prerendered unless marked otherwise.

```
/                                        Home — long-scroll, all sections, each linking out
/about                                   About Alicore
/products                                Product index (2 material tiles + 7 cards)
/products/gfrc-architectural-panels      \
/products/gfrc-cornices                   |
/products/gfrc-columns-and-pillars        |  one template, content-file driven.
/products/gfrc-jalis                      >  Each owns one long-tail keyword from the brief
/products/gfrc-decorative-elements        |  ("GFRC panels", "GFRC jali", "GFRC cornice"...).
/products/frp-architectural-products      |
/products/custom-architectural-elements  /
/gfrc                                    Material page — GFRC
/frp                                     Material page — FRP
/projects                                *** SSR *** admin-managed, filterable
/custom-solutions                        6-step process
/manufacturing                           7-step journey + Quality block
/contact                                 Full form + Call/WhatsApp/Email
/admin, /admin/enquiries,
/admin/media, /admin/projects            *** SSR, auth-gated ***
/sitemap.xml  /robots.txt  /404
```

The 7 product detail pages are additive beyond the brief's 9 — same template, data from a content file,
near-zero marginal cost, and they are how the site actually ranks for the brief's long-tail keywords.
Cut them first if scope tightens; keep the 9 core pages.

**Home to page wiring.** Home keeps every mockup section, but each section's CTA now deep-links to the
full page rather than only scrolling: "Explore GFRC Solutions" to `/gfrc`, "View All Products" to
`/products`, "Discuss Your Project" to `/contact`, "Discover Alicore" to `/about`. Anchors (`#about`,
`#products`, ...) stay live for in-page nav and the scroll-spy header.

---

## 4. Data model

Postgres. RLS enabled on every table; the browser never holds a key that can read enquiries.

```sql
-- ENQUIRIES -----------------------------------------------------------------
create table enquiries (
  id              uuid primary key default gen_random_uuid(),
  ref             text unique not null,          -- ENQ-XXXXXXX, surfaced in admin
  created_at      timestamptz not null default now(),
  name            text not null,
  company         text,
  phone           text not null,
  email           text not null,
  location        text,                          -- "Project Location"
  product         text,                          -- picklist, see section 5
  quantity        text,                          -- free text, "sq.ft / nos."
  message         text,
  attachment_path text,                          -- storage key in private bucket
  status          text not null default 'new'
                  check (status in ('new','contacted','quoted','closed','archived')),
  internal_note   text,
  source          text not null default 'web-form',
  ip_hash         text,                          -- salted hash, abuse triage only
  user_agent      text
);
create index on enquiries (created_at desc);
create index on enquiries (status) where status <> 'archived';

-- IMAGE LIBRARY -------------------------------------------------------------
-- Seeded from the admin mockup's groups array. 18 slots; ids are contractual --
-- the built pages reference them, so slot ids must not change.
create table media_slots (
  id          text primary key,      -- 'alicore-hero'
  group_title text not null,         -- 'Home — Key Visuals'
  title       text not null,         -- 'Hero'
  placeholder text not null,         -- art-direction note shown in admin
  sort_order  int  not null
);

create table media_assets (
  id          uuid primary key default gen_random_uuid(),
  slot_id     text not null references media_slots(id),
  variants    jsonb not null,        -- {"avif":{"640":"...","1280":"...","2000":"..."},"webp":{...}}
  width       int, height int,
  alt_text    text not null default '',
  uploaded_at timestamptz default now(),
  uploaded_by uuid references auth.users(id),
  is_active   boolean not null default true
);
create unique index on media_assets (slot_id) where is_active;  -- one live asset per slot

-- PROJECTS ------------------------------------------------------------------
create table projects (
  id           uuid primary key default gen_random_uuid(),
  name         text not null default 'Project Name — Coming Soon',
  location     text not null default 'Location — Coming Soon',
  category     text not null
               check (category in ('Commercial','Residential','Hospitality',
                                   'Facades','Interiors','Custom Architectural Elements')),
  material     text,                 -- 'GFRC' | 'FRP' | 'GFRC / FRP'
  product      text,                 -- 'Facade panels'
  application  text,                 -- 'Building envelope'
  image_path   text,                 -- storage key
  alt_text     text default '',
  is_published boolean not null default false,
  sort_order   int not null default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index on projects (is_published, sort_order);
```

The 18 slot ids, taken from the admin mockup and fixed for the life of the site:

```
alicore-hero  alicore-about  alicore-gfrc  alicore-frp  alicore-factory
alicore-prod-1 .. alicore-prod-7
alicore-proj-1 .. alicore-proj-6
```

Seed `projects` with the mockup's six rows (category / material / product / application preserved, names
and locations left at the "Coming Soon" defaults) so the grid is never empty.

**Not in the database, deliberately:** product cards, the 6 "Why Alicore" cards, the 6 process steps, the
7 manufacturing journey steps, the 10 industries, the GFRC/FRP bullet lists. That is brand-approved copy
straight from the brief — it lives in typed content modules under `src/content/`, version-controlled and
safe from accidental edits.

### Storage buckets

| Bucket | Access | Contents |
|---|---|---|
| `media` | public read | Site imagery. Path is **stable per slot**: `slots/{slot_id}/{variant}.{ext}` |
| `enquiry-attachments` | private | Customer drawings/CAD/PDF. Admin downloads via short-lived signed URL. |

Stable media paths mean an image swap never requires a site rebuild. Freshness is handled by a Cloudflare
purge-by-URL API call on upload (available on the free plan), so a swap goes live immediately.

### Upload paths

- **Enquiry attachments** — the browser requests a signed upload URL from `/api/upload-url`, then PUTs the
  file **straight to Supabase Storage**. The Worker never touches the file body: no size ceiling problem,
  no CPU-budget problem. The returned key is attached to the enquiry row on submit.
- **Admin images** — resized and encoded **in the browser** (canvas + WebP) at 640/1280/2000 widths, then
  POSTed to the server ready to store. `sharp` was the original plan, but it is a native Node addon and
  cannot load in a Workers isolate — there is no process to open a `.node` binary into. Doing it client-side
  costs zero server CPU, which also keeps this inside the free-tier request budget. Pre-generating
  derivatives means image delivery never depends on a vendor optimizer quota. The admin UI enforces the
  mockup's own guidance: landscape, 2000px or wider.

---

## 5. Enquiry pipeline

Form fields, in this exact order (per the `quote-enquiry-conventions` skill; the mockup's field ids
confirm it):

1. Name * 2. Company 3. Phone * 4. Email * 5. Project Location
6. Product / Requirement (select) 7. Estimated Quantity 8. Message 9. Upload Drawing / Reference

Product picklist — the mockup's eight options verbatim, ending with "Not sure yet — please advise".

Flow:

```
browser
  |- Turnstile widget solves
  |- (optional) signed-URL PUT of attachment -> Supabase Storage
  '- POST /api/enquiry
        |- Zod validate (one schema shared client + server)
        |- verify Turnstile token server-side
        |- honeypot check + Cloudflare WAF rate-limit rule on the route
        |- INSERT enquiries  (service-role key, server-only)
        |- Resend -> staff alert (reply-to = enquirer's email)
        |- Resend -> enquirer acknowledgement, quoting their ENQ- ref
        '- 200 -> render the mockup's "Enquiry Received / Thank you." panel
```

If the insert fails, **fail loudly**: show the error and surface the WhatsApp/Call fallback. The prototype
silently swallows storage errors in a `try/catch`; a lost lead is the most expensive bug this site can have.

---

## 6. Admin console

Route `/admin`, SSR, Supabase Auth session cookie (httpOnly, secure), middleware-guarded. **Signup
disabled** — staff accounts are created by invite from the Supabase dashboard. The mockup's
`admin` / `alicore2026` demo credentials are prototype-only and must not survive into any deployed
environment, including staging.

**Enquiries tab** — the mockup's five columns (Contact / Project / Requirement / Submitted / Age), the
three stat tiles (Total, Last 7 days, Oldest open), gold age-badge past 3 days. Beyond the mockup: status
dropdown, internal note, attachment download, and a real CSV file download rather than the prototype's
clipboard copy.

> **Deliberate change from the mockup:** "Clear all" is replaced by per-row **Archive**. An irreversible
> delete-everything button sitting next to live customer leads is a foot-gun. Archived rows drop out of the
> default view and stay in the database.

**Image Library tab** — the 18 slots in the mockup's three groups (Home — Key Visuals / Products /
Projects), drag-or-click upload, `sharp` variants on the server, Cloudflare purge on save, and an
**alt-text field per slot** (accessibility, and it feeds image SEO).

**Projects tab** (new) — list with add / edit / reorder / publish, fields per section 4. Unpublished
projects are invisible to `/projects`. Enforces the brief's rule: real names and locations only when
supplied.

---

## 7. SEO

- Unique title and meta description per route, drawn from the brief's keyword list without stuffing. The
  mockup's home title and description are final copy — use them verbatim for `/`.
- Canonical URLs, Open Graph and Twitter card per page, `sitemap.xml`, `robots.txt`.
- JSON-LD: `Organization` sitewide, `Product` on each product detail page, `BreadcrumbList` on nested
  routes. **No `AggregateRating`, no certification or standards markup** — nothing is verified.
- Semantic landmarks, exactly one `<h1>` per page, `<h2>` per section.
- Images: AVIF with WebP fallback, explicit `width`/`height` on every `<img>` to hold CLS at 0, hero
  preloaded, everything below the fold lazy.
- Targets: LCP under 2.5s on 4G, CLS under 0.1, Lighthouse 95+ across all four categories, axe-core clean.

---

## 8. Mobile

The mockup has **no mobile treatment** — its nav is a `flex-wrap` desktop row. This is net-new design work,
not a port:

- Hamburger to full-screen sheet nav; "Request a Quote" pinned inside it.
- Sticky bottom bar with Call and WhatsApp, per the brief's "easy WhatsApp button / easy Call button". The
  fixed circular WhatsApp FAB from the mockup must not collide with it — the FAB hides when the bar shows.
- Tap targets 44px or larger. Form inputs at 16px font or larger to stop iOS zoom-on-focus.
- The top utility bar (phone / WhatsApp / www.alicore.in) collapses to phone plus WhatsApp only.
- Verify on a real mid-range Android, not just devtools emulation.

---

## 9. File layout

```
site/
  src/
    components/
      layout/     Header.astro  Footer.astro  TopBar.astro  MobileNav.tsx  WhatsAppFab.astro
      sections/   Hero  About  Products  Gfrc  Frp  WhyAlicore  CustomSolutions
                  Projects  Manufacturing  Industries  ContactSection
      ui/         Button.astro  Eyebrow.astro  HairlineGrid.astro  SlotImage.astro
      forms/      EnquiryForm.tsx
      admin/      EnquiryTable.tsx  MediaLibrary.tsx  ProjectsManager.tsx
    content/      products.ts  why.ts  steps.ts  journey.ts  industries.ts
                  gfrc.ts  frp.ts  nav.ts  seo.ts
    layouts/      Base.astro  Page.astro  Admin.astro
    lib/          supabase.ts  schema.ts (zod)  images.ts  email.ts  turnstile.ts
    pages/        index.astro  about.astro  contact.astro  gfrc.astro  frp.astro
                  manufacturing.astro  custom-solutions.astro  projects.astro
                  products/index.astro  products/[slug].astro
                  admin/...  api/enquiry.ts  api/upload-url.ts  api/health.ts
    styles/       tokens.css  global.css
  public/
supabase/
  migrations/     0001_init.sql  0002_seed_slots.sql  0003_seed_projects.sql
docs/
.github/workflows/keepalive.yml
```

Build output stays out of `design-mockup/` — that folder is read-only reference.

---

## 10. Phases

| # | Phase | Deliverable |
|---|---|---|
| 0 | Foundation | Astro + Cloudflare adapter + Tailwind tokens + self-hosted fonts; Supabase project (`ap-south-1`), migrations, buckets, RLS; env scaffolding; CI |
| 1 | Content layer | Every string from the mockup's `renderVals()` ported into typed `src/content/` modules |
| 2 | Public site | All sections and routes, desktop and mobile, against the design system |
| 3 | Enquiry pipeline | Form to validate to Turnstile to storage to DB to Resend x2 to success state |
| 4 | Admin console | Auth, Enquiries, Image Library, Projects manager |
| 5 | SEO + performance | Meta, JSON-LD, sitemap, image pipeline, Lighthouse pass |
| 6 | QA + launch | `qa-reviewer` punch list, real-device pass, DNS cutover |

Phases 3 and 4 can run in parallel with 2 once phase 0 lands — they share only the data model.

### DNS cutover (phase 6)

1. Add `alicore.in` to Cloudflare; let it import existing records.
2. **Verify MX and any mail records survived the import** before touching nameservers — this is where
   company email gets broken.
3. Repoint nameservers at GoDaddy to the two Cloudflare ones. Propagation is typically under an hour.
4. SSL mode Full (strict); enable HSTS only after confirming the certificate.
5. Add the Turnstile site, the WAF rate-limit rule on `/api/enquiry`, and the cache-purge API token.

---

## 11. Blockers — content, not code

These gate launch and none of them are engineering work:

1. **Photography.** All 18 image slots are empty. `design-mockup/assets/` holds only four files —
   monogram, badge, lockup, one facade key visual. This site is photography-driven; it cannot ship on four
   images. The `uploads/*.jpeg` files are WhatsApp reference material and are **not** cleared for
   production use. Needs a real shoot or licensed imagery. **Highest-risk item in the project.**
2. **`[ADD EMAIL]` and `[ADD ADDRESS]`.** Still placeholders — and the mockup contradicts itself, labelling
   the field `[ADD EMAIL]` while its `mailto:` points at `info@alicore.in`. Confirm which is real.
3. **Project data.** All six tiles read "Project Name — Coming Soon" per the brief's rule. Real names,
   locations and client permission are needed before anything goes up.
4. **Social URLs.** All four footer links are `href="#"`.
5. **Confirm `9995 495 395`** is the public number and is WhatsApp-enabled.
6. **Resend needs SPF and DKIM records on `alicore.in`** — add during the DNS cutover, not after.

Until items 1 to 3 are resolved the site can be built and deployed to a staging URL, but should not go
public.

---

## 12. Hard rules for every builder

Carried from `CLAUDE.md` and the `alicore-brand-guidelines` skill. Non-negotiable:

- The brief overrides the mockup on any conflict.
- Never invent project names, clients, locations, contact details, or certifications.
- Never state or imply "number one", "largest", "world's best", "guaranteed", "100% maintenance free", ISO
  certification, or any specific testing standard.
- No cheap stock-photo look, no gradients beyond the mockup's two image scrims, no cartoon graphics, no
  rounded corners, no drop shadows, no additional colours.
- Minimal animation. Respect `prefers-reduced-motion`.
- Never ship `support.js` or `image-slot.js` — those are design-tool runtime.
- Never ship the `admin` / `alicore2026` credentials.
