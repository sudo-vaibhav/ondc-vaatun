#!/usr/bin/env bash
# Query traces from SigNoz with filters
# Usage: ./query-traces.sh [options]
#   --service <name>      Filter by service (default: ondc-bap)
#   --operation <name>    Filter by operation name (e.g., ondc.search)
#   --txn <id>            Filter by ondc.transaction_id
#   --errors              Only error spans
#   --minutes <n>         Time window in minutes (default: 60)
#   --limit <n>           Max results (default: 20)
set -euo pipefail

SIGNOZ_URL="${SIGNOZ_URL:-http://localhost:4830}"
SIGNOZ_API_KEY="${SIGNOZ_API_KEY:?Set SIGNOZ_API_KEY env var (SigNoz Settings > API Keys)}"
SERVICE="ondc-bap"
OPERATION=""
TXN_ID=""
ERRORS_ONLY=false
MINUTES=60
LIMIT=20

while [[ $# -gt 0 ]]; do
  case $1 in
    --service)   SERVICE="$2"; shift 2;;
    --operation) OPERATION="$2"; shift 2;;
    --txn)       TXN_ID="$2"; shift 2;;
    --errors)    ERRORS_ONLY=true; shift;;
    --minutes)   MINUTES="$2"; shift 2;;
    --limit)     LIMIT="$2"; shift 2;;
    *) echo "Unknown option: $1" >&2; exit 1;;
  esac
done

NOW_MS=$(( $(date +%s) * 1000 ))
START_MS=$(( NOW_MS - MINUTES * 60 * 1000 ))

# Build filter items JSON
FILTERS=$(python3 -c "
import json
items = []
items.append({'key': {'key': 'serviceName', 'dataType': 'string', 'type': 'tag', 'isColumn': True}, 'op': '=', 'value': '$SERVICE'})
op = '$OPERATION'
if op:
    items.append({'key': {'key': 'name', 'dataType': 'string', 'type': 'tag', 'isColumn': True}, 'op': '=', 'value': op})
txn = '$TXN_ID'
if txn:
    items.append({'key': {'key': 'ondc.transaction_id', 'dataType': 'string', 'type': 'tag', 'isColumn': False}, 'op': '=', 'value': txn})
if $( [ "$ERRORS_ONLY" = true ] && echo True || echo False ):
    items.append({'key': {'key': 'hasError', 'dataType': 'bool', 'type': 'tag', 'isColumn': True}, 'op': '=', 'value': True})

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
                'filters': {'op': 'AND', 'items': items},
                'selectColumns': [
                    {'key': 'serviceName', 'dataType': 'string', 'type': 'tag', 'isColumn': True},
                    {'key': 'name', 'dataType': 'string', 'type': 'tag', 'isColumn': True},
                    {'key': 'durationNano', 'dataType': 'float64', 'type': 'tag', 'isColumn': True},
                    {'key': 'hasError', 'dataType': 'bool', 'type': 'tag', 'isColumn': True},
                    {'key': 'traceID', 'dataType': 'string', 'type': 'tag', 'isColumn': True},
                    {'key': 'spanID', 'dataType': 'string', 'type': 'tag', 'isColumn': True}
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
