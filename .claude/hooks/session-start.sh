#!/bin/bash
# Installs the site's npm packages at the start of a Claude Code cloud session,
# so `npm test`, `npm run build` and `npm run dev` work right away.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR"
npm install --no-audit --no-fund
