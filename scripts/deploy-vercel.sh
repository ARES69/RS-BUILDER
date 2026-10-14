#!/usr/bin/env bash
# Deploy frontend + agent backend to Vercel in one go.
# Needs: VERCEL_TOKEN exported (or an interactive `vercel login` beforehand).
set -euo pipefail
cd "$(dirname "$0")/.."

if ! command -v vercel >/dev/null 2>&1; then
  echo "→ installing vercel CLI"
  npm i -g vercel --no-audit --no-fund
fi

TOKEN_ARG=()
if [[ -n "${VERCEL_TOKEN:-}" ]]; then TOKEN_ARG=(--token "$VERCEL_TOKEN"); fi

echo "→ linking project"
vercel link --yes "${TOKEN_ARG[@]:-}"

echo "→ setting VITE_AGENT_API_URL=/api for production (same-origin backend)"
vercel env rm VITE_AGENT_API_URL production --yes "${TOKEN_ARG[@]:-}" 2>/dev/null || true
printf '/api' | vercel env add VITE_AGENT_API_URL production "${TOKEN_ARG[@]:-}"

echo "→ deploying to production"
vercel deploy --prod --yes "${TOKEN_ARG[@]:-}"

echo
echo "✓ deployed. Backend endpoints on your deployment:"
echo "    GET  https://<your-deployment>/api/v1/health"
echo "    POST https://<your-deployment>/api/v1/runs   (SSE)"
