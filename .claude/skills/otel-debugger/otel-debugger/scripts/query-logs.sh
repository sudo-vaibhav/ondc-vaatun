#!/usr/bin/env bash
# Query logs from SigNoz with filters
# Usage: ./query-logs.sh [options]
#   --service <name>      Filter by service (default: ondc-bap)
#   --severity <level>    Filter by severity (ERROR, WARN, INFO, DEBUG)
#   --pattern <text>      Filter by body containing text
#   --minutes <n>         Time window in minutes (default: 60)
#   --limit <n>           Max results (default: 50)
set -euo pipefail

SIGNOZ_URL="${SIGNOZ_URL:-http://localhost:4830}"
SIGNOZ_API_KEY="${SIGNOZ_API_KEY:?Set SIGNOZ_API_KEY env var (SigNoz Settings > API Keys)}"
SERVICE="ondc-bap"
SEVERITY=""
PATTERN=""
MINUTES=60
LIMIT=50

while [[ $# -gt 0 ]]; do
  case $1 in
    --service)  SERVICE="$2"; shift 2;;
    --severity) SEVERITY="$2"; shift 2;;
    --pattern)  PATTERN="$2"; shift 2;;
    --minutes)  MINUTES="$2"; shift 2;;
    --limit)    LIMIT="$2"; shift 2;;
    *) echo "Unknown option: $1" >&2; exit 1;;
  esac
done

NOW_MS=$(( $(date +%s) * 1000 ))
START_MS=$(( NOW_MS - MINUTES * 60 * 1000 ))

FILTERS=$(python3 -c "
import json
items = []
items.append({'key': {'key': 'service.name', 'dataType': 'string', 'type': 'resource', 'isColumn': False}, 'op': '=', 'value': '$SERVICE'})
sev = '$SEVERITY'
if sev:
    items.append({'key': {'key': 'severity_text', 'dataType': 'string', 'type': 'tag', 'isColumn': True}, 'op': '=', 'value': sev})
pat = '$PATTERN'
if pat:
    items.append({'key': {'key': 'body', 'dataType': 'string', 'type': 'tag', 'isColumn': True}, 'op': 'contains', 'value': pat})

payload = {
    'start': $START_MS,
    'end': $NOW_MS,
    'compositeQuery': {
        'queryType': 'builder',
        'panelType': 'list',
        'builderQueries': {
            'A': {
                'queryName': 'A',
                'dataSource': 'logs',
                'aggregateOperator': 'noop',
                'filters': {'op': 'AND', 'items': items},
                'orderBy': [{'columnName': 'timestamp', 'order': 'desc'}],
                'limit': $LIMIT,
                'offset': 0,
                'stepInterval': 60,
                'expression': 'A',
                'disabled': False
            }
        }
    }
}
print(json.dumps(payload))
")

curl -s -X POST "$SIGNOZ_URL/api/v3/query_range" \
  -H "SIGNOZ-API-KEY: $SIGNOZ_API_KEY" \
  -H "Content-Type: application/json" \
  -d "$FILTERS"
