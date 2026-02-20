#!/usr/bin/env bash
# List recent error spans from SigNoz
# Usage: ./list-errors.sh [options]
#   --service <name>    Filter by service (default: ondc-bap)
#   --minutes <n>       Time window in minutes (default: 60)
#   --limit <n>         Max results (default: 20)
set -euo pipefail

SIGNOZ_URL="${SIGNOZ_URL:-http://localhost:4830}"
SIGNOZ_API_KEY="${SIGNOZ_API_KEY:?Set SIGNOZ_API_KEY env var (SigNoz Settings > API Keys)}"
SERVICE="ondc-bap"
MINUTES=60
LIMIT=20

while [[ $# -gt 0 ]]; do
  case $1 in
    --service) SERVICE="$2"; shift 2;;
    --minutes) MINUTES="$2"; shift 2;;
    --limit)   LIMIT="$2"; shift 2;;
    *) echo "Unknown option: $1" >&2; exit 1;;
  esac
done

NOW_MS=$(( $(date +%s) * 1000 ))
START_MS=$(( NOW_MS - MINUTES * 60 * 1000 ))

FILTERS=$(python3 -c "
import json
payload = {
    'start': $START_MS,
    'end': $NOW_MS,
    'compositeQuery': {
        'queryType': 'builder',
        'panelType': 'list',
        'builderQueries': {
            'A': {
                'queryName': 'A',
                'dataSource': 'traces',
                'aggregateOperator': 'noop',
                'filters': {
                    'op': 'AND',
                    'items': [
                        {'key': {'key': 'serviceName', 'dataType': 'string', 'type': 'tag', 'isColumn': True}, 'op': '=', 'value': '$SERVICE'},
                        {'key': {'key': 'hasError', 'dataType': 'bool', 'type': 'tag', 'isColumn': True}, 'op': '=', 'value': True}
                    ]
                },
                'selectColumns': [
                    {'key': 'serviceName', 'dataType': 'string', 'type': 'tag', 'isColumn': True},
                    {'key': 'name', 'dataType': 'string', 'type': 'tag', 'isColumn': True},
                    {'key': 'durationNano', 'dataType': 'float64', 'type': 'tag', 'isColumn': True},
                    {'key': 'traceID', 'dataType': 'string', 'type': 'tag', 'isColumn': True},
                    {'key': 'spanID', 'dataType': 'string', 'type': 'tag', 'isColumn': True},
                    {'key': 'statusMessage', 'dataType': 'string', 'type': 'tag', 'isColumn': True}
                ],
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
