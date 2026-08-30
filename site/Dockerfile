# =============================================================================
# Alicore website — local container
#
# Runs the real Cloudflare runtime (workerd) via `wrangler dev`, not a Node
# shim, so what you see locally is what Cloudflare will execute. The SSR routes
# (/projects, /admin/*, /api/*) therefore behave identically to production.
#
# Debian, not Alpine: workerd is a glibc binary and will not start against musl.
# Node 22, not 20: wrangler's undici dependency requires >=22.19.
# =============================================================================

# --- build -------------------------------------------------------------------
FROM node:22-bookworm-slim AS build

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# PUBLIC_* values are inlined into the bundle at build time, so they have to be
# present here rather than at run time.
ARG PUBLIC_SITE_URL=http://localhost:4000
ARG PUBLIC_SUPABASE_URL=
ARG PUBLIC_SUPABASE_ANON_KEY=
ARG PUBLIC_TURNSTILE_SITE_KEY=
ARG PUBLIC_PHONE_DISPLAY=9995\ 495\ 395
ARG PUBLIC_PHONE_E164=+919995495395
ARG PUBLIC_WHATSAPP_E164=919995495395
ARG PUBLIC_EMAIL=
ARG PUBLIC_ADDRESS=

ENV PUBLIC_SITE_URL=$PUBLIC_SITE_URL \
    PUBLIC_SUPABASE_URL=$PUBLIC_SUPABASE_URL \
    PUBLIC_SUPABASE_ANON_KEY=$PUBLIC_SUPABASE_ANON_KEY \
    PUBLIC_TURNSTILE_SITE_KEY=$PUBLIC_TURNSTILE_SITE_KEY \
    PUBLIC_PHONE_DISPLAY=$PUBLIC_PHONE_DISPLAY \
    PUBLIC_PHONE_E164=$PUBLIC_PHONE_E164 \
    PUBLIC_WHATSAPP_E164=$PUBLIC_WHATSAPP_E164 \
    PUBLIC_EMAIL=$PUBLIC_EMAIL \
    PUBLIC_ADDRESS=$PUBLIC_ADDRESS

COPY . .
RUN npm run build

# --- run ---------------------------------------------------------------------
FROM node:22-bookworm-slim AS run

WORKDIR /app

# Only wrangler is needed to serve; the app's own dependencies are already
# bundled into dist/_worker.js by the build.
COPY package.json package-lock.json ./
RUN npm install --no-save --no-audit --no-fund wrangler@4 \
    && npm cache clean --force

COPY --from=build /app/dist ./dist
COPY wrangler.docker.toml ./wrangler.toml
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

ENV CI=true \
    WRANGLER_SEND_METRICS=false \
    NODE_ENV=production

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=25s --retries=4 \
  CMD node -e "fetch('http://127.0.0.1:4000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]

# --ip 0.0.0.0 so the port is reachable from outside the container.
CMD ["npx", "wrangler", "dev", "--local", "--ip", "0.0.0.0", "--port", "4000"]
