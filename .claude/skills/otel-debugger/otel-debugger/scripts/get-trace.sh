#!/usr/bin/env bash
# Get all spans for a trace by traceId from SigNoz
# Usage: ./get-trace.sh <traceId>
set -euo pipefail

SIGNOZ_URL="${SIGNOZ_URL:-http://localhost:4830}"
SIGNOZ_API_KEY="${SIGNOZ_API_KEY:?Set SIGNOZ_API_KEY env var (SigNoz Settings > API Keys)}"
TRACE_ID="${1:?Usage: get-trace.sh <traceId>}"

curl -s "$SIGNOZ_URL/api/v1/traces/$TRACE_ID" \
  -H "SIGNOZ-API-KEY: $SIGNOZ_API_KEY"
