# Alicore website

Astro 5 + React islands, deployed to Cloudflare Workers, backed by Supabase.
Architecture and rationale: [`../docs/IMPLEMENTATION_PLAN.md`](../docs/IMPLEMENTATION_PLAN.md).

```
npm install
cp .env.example .env      # fill in the values below
npm run dev               # http://localhost:4321
npm run build             # prerender + build the Worker
npm run check             # typecheck .astro/.tsx
```

The site runs without any backend configured — pages render, image slots show their
art-direction placeholders, and the enquiry form fails loudly with the WhatsApp
fallback. That is deliberate, so the front end can be worked on before Supabase exists.

## Node version

Use **Node 22 LTS**. Node 20 builds fine, but `wrangler`'s `undici` dependency
requires ≥22.19, so `wrangler dev` and `wrangler deploy` are unreliable below that.
CI pins 22.

## One-time setup

### 1. Supabase

Create a project in **`ap-south-1` (Mumbai)** — closest region to the audience.

```bash
supabase link --project-ref <ref>
supabase db push          # runs supabase/migrations/*.sql
```

That creates the four tables, the RLS policies, both storage buckets, and seeds the
18 image slots plus the six placeholder projects.

Then, in the dashboard:

- **Authentication → Providers → Email**: turn **off** "Enable signups". Staff accounts
  are invite-only.
- **Authentication → Users → Invite**: invite each staff email address.

### 2. Resend

Verify `alicore.in` and add the SPF/DKIM records **during** the DNS cutover, not after.
Without them, enquiry alerts land in spam.

### 3. Cloudflare Turnstile

Create a widget for `alicore.in`. Without a site key the form still works — the
honeypot and rate limiting stay active — but you will get more spam.

### 4. KV namespace

Astro's Cloudflare adapter wires sessions to KV. The site does not use sessions
(staff auth rides on signed cookies) but the binding must exist:

```bash
wrangler kv namespace create SESSION
```

Paste the id into the commented block in `wrangler.toml`.

## Environment

`PUBLIC_*` values are inlined at build time — set them in `.env` locally and in the CI
build environment. Everything else is a runtime secret:

```bash
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put TURNSTILE_SECRET_KEY
wrangler secret put RESEND_API_KEY
wrangler secret put ENQUIRY_NOTIFY_TO      # comma-separated is fine
wrangler secret put IP_HASH_SALT           # any long random string
wrangler secret put CF_ZONE_ID
wrangler secret put CF_PURGE_TOKEN         # needs Zone → Cache Purge
```

`SUPABASE_SERVICE_ROLE_KEY` bypasses RLS. It is only ever read in `/api/*` and admin
SSR pages. Never import `serviceClient` into a `.tsx` island.

## Deploy

```bash
npm run deploy            # astro build && wrangler deploy
```

### DNS cutover

1. Add `alicore.in` to Cloudflare; let it import the existing records.
2. **Verify MX and mail records survived the import before touching nameservers.**
   This is where company email gets broken.
3. Repoint the nameservers at GoDaddy. Propagation is usually under an hour.
4. SSL mode Full (strict). Enable HSTS only after confirming the certificate.
5. Add the WAF rate-limiting rule on `/api/enquiry`.
6. Add `SITE_URL` to the repo's GitHub Actions secrets so the keepalive cron can run.

### The keepalive cron is not optional

Supabase pauses free-tier projects after ~7 days without API traffic. A marketing site
can easily go a week between enquiries, and a paused project means a broken contact
form. `.github/workflows/keepalive.yml` pings `/api/health` daily to prevent it.

## How images work

Public pages are prerendered, but their photography is admin-managed. That is
reconciled with **stable paths**:

```
media/slots/{slot_id}/{640|1280|2000}.webp
```

The built HTML points at a URL that never changes. Replacing an image overwrites the
object and purges that URL from Cloudflare's cache, so the swap is live with no
rebuild. A rebuild is only needed when a slot goes from *empty* to *filled*, because
that flips between a placeholder block and an `<img>`.

Variants are generated **in the browser** (canvas → WebP at three widths). `sharp`
cannot run in a Workers isolate — it is a native Node addon, and there is no process to
load a `.node` binary into. Doing it client-side costs zero server CPU.

The 18 slot ids are referenced directly by the built pages. **Do not rename them.**

## Where things live

| Path | What |
|---|---|
| `src/content/` | All site copy, typed. Brand-approved text from the brief — edit here, not in components. |
| `src/components/sections/` | One component per mockup section, reused across home and the standalone pages. |
| `src/lib/` | Supabase clients, validation schema, media resolution, auth, email. |
| `src/pages/api/` | Enquiry intake, signed uploads, health check, admin actions. |
| `src/styles/tokens.css` | Design tokens, extracted verbatim from the mockup. Add no colours outside this file. |
| `supabase/migrations/` | Schema and seed. |

## Ground rules

Carried from `CLAUDE.md` and the `alicore-brand-guidelines` skill:

- The requirements brief overrides the mockup on any conflict.
- Never invent project names, clients, locations, contact details or certifications.
- No "number one", "largest", "world's best", "guaranteed", "100% maintenance free",
  ISO certification or any testing standard — none of it is verified.
- No rounded corners, no drop shadows, no gradients beyond the mockup's two image
  scrims, no additional colours.
- Minimal animation; `prefers-reduced-motion` is respected.
- Never ship `support.js` / `image-slot.js` (design-tool runtime) or the mockup's
  `admin` / `alicore2026` demo credentials.
