#!/usr/bin/env bash
# Full release pipeline: verify everything, then package artifacts into release/.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ typecheck"
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit

echo "→ production build"
npm run build

echo "→ backend contract test (vercel functions, mock LLM)"
node scripts/test-api-functions.mjs

echo "→ orchestrator test (mock LLM, real tool-calling loop)"
node scripts/test-orchestrator.mjs

echo "→ packaging release/"
rm -rf release
mkdir -p release
cp -r dist release/
cp -r server release/
cp -r api release/
cp README.md LICENSE NOTICE.md DEPLOY.md release/
printf '%s\n' "RS-BUILDER release $(date -u +%Y-%m-%dT%H:%M:%SZ)" > release/VERSION

echo
echo "✓ release/ ready:"
ls -la release
