# Deploying Alicore to Cloudflare

First target is a **workers.dev staging URL**, so nothing waits on DNS.
`alicore.in` is not delegated yet — see "Attaching the domain" at the end.

Every page carries `<meta name="robots" content="noindex">` while the site is
on a `workers.dev` host, so the staging URL cannot be indexed and later
compete with the real domain for the same copy.

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
| `SITE_URL` | The deployed URL, used by the keepalive workflow |

The API token needs, at minimum: **Account → Workers Scripts: Edit**,
**Account → Workers KV Storage: Edit**, **Account → Account Settings: Read**.
Add **Zone → Workers Routes: Edit** only when attaching the custom domain.

### Variables — inlined into the browser bundle, so not secret

| Name | Value |
|---|---|
| `PUBLIC_SITE_URL` | `https://alicore-site.<your-subdomain>.workers.dev` |
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
curl -s https://<your-worker-url>/api/health          # {"ok":true,"db":"reachable"}
curl -s https://<your-worker-url>/robots.txt          # must say "Staging deploy"
curl -sI https://<your-worker-url>/about | head -1    # 200, not 307
```

Then check by hand: `/admin` logs in, the image library lists 18 slots,
Publish returns success, and a test enquiry appears in the queue.

**Delete the test enquiry afterwards** — it lands in the same table as real
customer leads.

---

## 6. Attaching the domain later

`alicore.in` currently returns NXDOMAIN from every resolver: no NS, no SOA.
It is either unregistered or registered at GoDaddy and never delegated.

Once it resolves:

1. Cloudflare → Add a site → `alicore.in`, and copy the two nameservers it gives
2. GoDaddy → Domain settings → Nameservers → **Change** → paste both
3. Wait for the zone to show **Active** (usually under an hour)
4. Add to `site/wrangler.toml`:
   ```toml
   routes = [{ pattern = "www.alicore.in", custom_domain = true }]
   ```
5. Change `PUBLIC_SITE_URL` to `https://www.alicore.in` and redeploy —
   canonicals, sitemap, JSON-LD and `robots.txt` all derive from it, and the
   staging `noindex` disappears on its own once the host is no longer
   `workers.dev`
6. Add a redirect rule sending `alicore.in/*` to `https://www.alicore.in/$1`
7. Submit the sitemap in Google Search Console

Keep GoDaddy as registrar. Only the nameservers move.
