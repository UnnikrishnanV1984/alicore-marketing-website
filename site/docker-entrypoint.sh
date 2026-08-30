#!/bin/sh
# =============================================================================
# Bridges container environment variables into Worker bindings.
#
# `wrangler dev` exposes secrets to the Worker from a .dev.vars file, not from
# the process environment, so anything passed with `docker run -e` or compose's
# env_file would otherwise be invisible to the app. This writes the ones we
# recognise into .dev.vars at start-up.
#
# Nothing is required. With no variables set the site runs in its offline mode:
# pages render, image slots show their art-direction placeholders, and the
# enquiry form fails loudly with the WhatsApp fallback rather than pretending
# to have saved a lead.
# =============================================================================
set -eu

VARS="PUBLIC_SUPABASE_URL
PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
TURNSTILE_SECRET_KEY
RESEND_API_KEY
ENQUIRY_NOTIFY_TO
ENQUIRY_FROM
IP_HASH_SALT
CF_ZONE_ID
CF_PURGE_TOKEN"

: > .dev.vars
count=0

for key in $VARS; do
  value=$(printenv "$key" 2>/dev/null || true)
  if [ -n "$value" ]; then
    printf '%s=%s\n' "$key" "$value" >> .dev.vars
    count=$((count + 1))
  fi
done

if [ "$count" -eq 0 ]; then
  echo "[alicore] No backend variables set — running in offline mode."
  echo "[alicore] Pages render with placeholder imagery; the enquiry form will"
  echo "[alicore] report a failure instead of saving. This is expected."
else
  echo "[alicore] Bridged $count backend variable(s) into the Worker."
fi

echo "[alicore] Starting workerd on :4000"
exec "$@"
