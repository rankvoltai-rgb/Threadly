#!/usr/bin/env bash
# Deploy Threadly to Vercel production.
#
# The CLI's scope resolution is unreliable in non-interactive shells (it parses
# --scope as a project name), so the org and project are pinned explicitly —
# the same approach Vercel documents for CI.
set -euo pipefail
export VERCEL_ORG_ID=team_MUfBgHfx1wKNnvtATR3WukQ2
export VERCEL_PROJECT_ID=prj_OfkuIQTQrLjw8uTqk7CdO4ZazjVK
exec vercel deploy --prod --yes "$@"
