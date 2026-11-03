# Deploying Alicore to Cloudflare

The site is **live at https://alicore.in** (since 2026-11-03). The
workers.dev URL still works and is kept as a fallback — see "The domain" at
the end for what the cutover involved and what is still outstanding.

Every page carries `<meta name="robots" content="noindex">` while the site is
on a `workers.dev` host, so the fallback URL cannot be indexed and compete
with the real domain for the same copy.

---

## 1. Create the KV namespace

Astro's Cloudflare adapter wires sessions to KV. The public site does not use
sessions — staff auth rides on cookies — but the Worker will not boot without
the binding.

```bash
cd site
npx wrangler login
npx wrangler kv namespace create SESSION
```

It prints an id. Uncomment the `[[kv_namespaces]]` block at the bottom of
`site/wrangler.toml` and paste it in. The id is **not** a secret — it belongs
in the committed file.

---

## 2. GitHub repository settings

`Settings → Secrets and variables → Actions`

### Secrets — never commit these, never paste them into a chat

| Name | Where it comes from |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare → My Profile → API Tokens → Create Token → **Edit Cloudflare Workers** template |
| `CLOUDFLARE_ACCOUNT_ID` | Workers & Pages → right sidebar, or the `dash.cloudflare.com/<id>` URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabase → Project Settings → API. Browser-safe, but kept here so it is set in one place |
There is no `SITE_URL` secret. The keepalive workflow reads the
`PUBLIC_SITE_URL` **variable** instead — a public URL is not a secret, and
pointing both at one value means the ping follows the site to a new domain by
itself. It was a secret once, was never actually set, and the job failed
silently for weeks as a result.

The API token needs, at minimum: **Account → Workers Scripts: Edit**,
**Account → Workers KV Storage: Edit**, **Account → Account Settings: Read**.
Add **Zone → Workers Routes: Edit** only when attaching the custom domain.

### Variables — inlined into the browser bundle, so not secret

| Name | Value |
|---|---|
| `PUBLIC_SITE_URL` | `https://alicore.in` — one value drives canonicals, sitemap, JSON-LD, `og:image` and `robots.txt` |
| `PUBLIC_SUPABASE_URL` | `https://<ref>.supabase.co` — the project URL, **not** the REST endpoint |

That is the whole list. **Do not add phone, WhatsApp, email, address or social
links here.** Staff edit those in the admin console and they live in the
`site_settings` table; a copy in CI variables is a second source of truth that
goes stale the first time someone changes a number, and the copy would win on
any build where the database happened to be unreachable.

The deploy workflow sets `PUBLIC_REQUIRE_DB=1` so that build *fails* instead
of silently publishing the offline fallbacks. A red deploy gets investigated;
a green deploy serving last year's phone number does not.

> `PUBLIC_SUPABASE_URL` is the one field with a common failure mode. The
> dashboard shows the REST endpoint (`.../rest/v1/`) next to the project URL,
> and supabase-js appends its own `/rest/v1` — the doubled path returns
> `PGRST125` on every query, which reads like a missing table. The code
> normalises both forms, but set it correctly anyway.

---

## 3. Worker secrets

Run from `site/`. These are read at request time by the SSR routes.

```bash
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY   # required
npx wrangler secret put IP_HASH_SALT                # required
npx wrangler secret put GITHUB_DISPATCH_TOKEN       # for the Publish button
npx wrangler secret put RESEND_API_KEY              # optional — enquiry emails
npx wrangler secret put TURNSTILE_SECRET_KEY        # optional — form spam
npx wrangler secret put CF_ZONE_ID                  # optional — cache purge
npx wrangler secret put CF_PURGE_TOKEN              # optional
```

**`SUPABASE_SERVICE_ROLE_KEY` bypasses row-level security entirely.** Anyone
holding it has full read/write on the database. It is server-only and must
never be imported into a `.tsx` island or any file that reaches the browser.

Without `RESEND_API_KEY` enquiries still save — only the email alert is
skipped, and it never fails the request.

---

## 4. The Publish button

Contact details, social links, and whether an image slot is filled are all
baked into prerendered HTML, so changing them in the admin console needs a
rebuild. Publish triggers one.

**A "deploy hook" — a URL you POST to with no credentials — is a Cloudflare
*Pages* feature and does not exist for Workers.** This site is a Worker built
by GitHub Actions, so the trigger is GitHub's `workflow_dispatch` API.

Create a **fine-grained personal access token**:

- GitHub → Settings → Developer settings → Personal access tokens → Fine-grained
- Repository access: **only** `alicore-marketing-website`
- Repository permissions: **Actions: Read and write**
- Nothing else. Set an expiry and diarise the renewal.

Then `npx wrangler secret put GITHUB_DISPATCH_TOKEN`.

`GITHUB_REPO`, `GITHUB_WORKFLOW` and `GITHUB_BRANCH` are already in
`wrangler.toml` under `[vars]` — not secret, so they stay in the committed file.

If the token later expires, Publish reports *"the publishing token was
rejected"* rather than a bare 502, and the editor's changes are still saved.

### What does and does not need a publish

| Change | Live immediately? |
|---|---|
| Replacing a photo that already exists | **Yes** — paths are stable, only a cache purge |
| Enquiry alert recipients | **Yes** — read at request time |
| Filling a slot that was empty | No — needs a build |
| Contact details, social links | No — needs a build |
| Projects | No — needs a build |

---

## 5. Deploy

Push to `main`, or run the workflow manually from the Actions tab. It
typechecks, builds, and runs `wrangler deploy`.

### Verify

```bash
curl -s  https://alicore.in/api/health      # {"ok":true,"db":"reachable"}
curl -s  https://alicore.in/robots.txt      # must advertise the sitemap, NOT say "Staging deploy"
curl -sI https://alicore.in/about | head -1 # 200, not 307
curl -sI https://www.alicore.in/gfrc        # 301 to https://alicore.in/gfrc — path preserved, not the home page
```

Then check by hand: `/admin` logs in, the image library lists 18 slots,
Publish returns success, and a test enquiry appears in the queue.

**Delete the test enquiry afterwards** — it lands in the same table as real
customer leads.

---

## 6. The domain

**The apex `alicore.in` is canonical, not `www`.** `content/site.ts`,
`robots.txt.ts` and `astro.config.mjs` all default to `https://alicore.in`.

Done on 2026-11-03. GoDaddy stays the registrar; only the nameservers moved
(`ns53`/`ns54.domaincontrol.com` → `danica`/`simon.ns.cloudflare.com`). The
registry locks `clientUpdateProhibited` and friends are GoDaddy's ordinary
ones and never blocked anything done from their own dashboard. Nothing needed
preserving: the domain had no MX, TXT or CAA records, only the parking A
records, so the cutover could not break mail or any other service.

What the sequence actually was, including the two steps that are not obvious:

1. Cloudflare → Add a site → `alicore.in`, Free plan; copy the two nameservers
2. GoDaddy → Domain settings → Nameservers → **Change** → paste both. The zone
   went **Active** in about ten minutes
3. **Delete the two parking A records Cloudflare imported during its DNS scan**
   (`15.197.148.33`, `3.33.130.190`). Until they are gone, adding the custom
   domain fails with *"Hostname 'alicore.in' already has externally managed DNS
   records"*. This is the step that blocks everything else
4. Worker → Settings → Domains & Routes → Add → **Custom domain** → `alicore.in`.
   A plain *route* also works but leaves a phantom origin record behind and
   disagrees with `custom_domain = true` in `wrangler.toml`
5. Redirect `www` → apex with a zone **Redirect Rule**: hostname equals
   `www.alicore.in` → **dynamic** 301 to
   `concat("https://alicore.in", http.request.uri.path)`, preserve query string.
   Dynamic, not static — a static redirect sends every page to the home page.
   And a zone rule, not middleware: static assets are served ahead of the
   Worker, so a redirect in code would never run for a static page.
   **Keep the `www` CNAME.** The rule only fires if the request reaches
   Cloudflare at all, which needs that record
6. Uncomment the routes line in `site/wrangler.toml` and set the
   `PUBLIC_SITE_URL` Actions variable to `https://alicore.in` **in the same
   push**, so one build moves the canonicals and drops the staging `noindex`
   together. Between the custom domain going live and that build landing, the
   site answers on the real domain while asking not to be indexed

Keep `workers_dev = true`: it costs nothing, stays noindex, and is the way
back in if the custom domain misbehaves.

### Still outstanding

- **SSL/TLS → Edge Certificates → Always Use HTTPS: ON.** `http://alicore.in/`
  currently answers **200 over plain HTTP** instead of redirecting. `www` is
  already safe only because the Redirect Rule fires regardless of scheme.
  Consider HSTS afterwards, once the redirect has been stable for a while
- **DNS → Settings → Bot Preference Sync: OFF.** It prepends Cloudflare's own
  rules to `robots.txt`, and that file is generated by the app from the
  Projects toggle. Two systems writing one file is how a page gets disallowed
  by accident
- **Supabase → Authentication → URL Configuration → Site URL:**
  `https://alicore.in`, so staff password-reset links stop landing on
  workers.dev
- Submit the sitemap in Google Search Console, and verify the property

### The API token in `.env` cannot touch DNS

It returns `403 Authentication error` on this zone's DNS records — it carries
Workers and Zone:Read scope only. Zone-level work (DNS records, Redirect
Rules, SSL settings) is dashboard-only unless the token is reissued with
**Zone → DNS: Edit** and **Zone → Workers Routes: Edit** on `alicore.in`.
