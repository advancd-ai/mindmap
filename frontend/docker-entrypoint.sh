#!/bin/sh
set -e
# Generate runtime-config.js from container environment (Compose / Kubernetes).
# Same variable names as Vite for consistency: VITE_API_URL, VITE_ADSENSE_ENABLED
HTML_DIR=/usr/share/nginx/html
{
  printf 'window.__RUNTIME_CONFIG__ = '
  jq -n \
    --arg url "${VITE_API_URL:-}" \
    --arg ads "${VITE_ADSENSE_ENABLED:-true}" \
    '{VITE_API_URL: $url, VITE_ADSENSE_ENABLED: $ads}'
  printf ';\n'
} >"$HTML_DIR/runtime-config.js"

exec nginx -g 'daemon off;'
