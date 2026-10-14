#!/usr/bin/env bash
# Full release pipeline: verify everything, then package artifacts into release/.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ typecheck"
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit

echo "→ production build"
npm run build

echo "→ single-file preview build"
npm run build:preview
mv -f preview/index.html preview/rs-builder.html

echo "→ smoke test (jsdom)"
npm run smoke

echo "→ backend contract test (standalone server)"
node scripts/test-backend.mjs

echo "→ backend contract test (vercel functions)"
node scripts/test-api-functions.mjs

echo "→ orchestrator test (mock LLM, real tool-calling loop)"
node scripts/test-orchestrator.mjs

echo "→ packaging release/"
rm -rf release
mkdir -p release
cp -r dist release/dist
cp preview/rs-builder.html release/rs-builder.html
mkdir -p release/server release/api
cp server/core.mjs server/agent-server.mjs release/server/
mkdir -p release/api/v1
cp api/v1/runs.mjs api/v1/health.mjs api/v1/cron.mjs release/api/v1/
cp README.md LICENSE NOTICE.md DEPLOY.md release/
printf '%s\n' "RS-BUILDER release $(date -u +%Y-%m-%dT%H:%M:%SZ)" > release/VERSION

echo
echo "✓ release/ ready:"
ls -la release
