#!/usr/bin/env bash
# Get service overview: span count, error rate, and top operations
# Usage: ./service-overview.sh [options]
#   --service <name>    Service name (default: ondc-bap)
#   --minutes <n>       Time window in minutes (default: 60)
set -euo pipefail

SIGNOZ_URL="${SIGNOZ_URL:-http://localhost:4830}"
SIGNOZ_API_KEY="${SIGNOZ_API_KEY:?Set SIGNOZ_API_KEY env var (SigNoz Settings > API Keys)}"
SERVICE="ondc-bap"
MINUTES=60

while [[ $# -gt 0 ]]; do
  case $1 in
    --service) SERVICE="$2"; shift 2;;
    --minutes) MINUTES="$2"; shift 2;;
    *) echo "Unknown option: $1" >&2; exit 1;;
  esac
done

NOW_MS=$(( $(date +%s) * 1000 ))
START_MS=$(( NOW_MS - MINUTES * 60 * 1000 ))

# Query: count spans grouped by operation name
PAYLOAD=$(python3 -c "
import json
payload = {
    'start': $START_MS,
    'end': $NOW_MS,
    'compositeQuery': {
        'queryType': 'builder',
        'panelType': 'table',
        'builderQueries': {
            'A': {
                'queryName': 'A',
                'dataSource': 'traces',
                'aggregateOperator': 'count',
                'aggregateAttribute': {'key': 'name', 'dataType': 'string', 'type': 'tag', 'isColumn': True},
                'filters': {
                    'op': 'AND',
                    'items': [
                        {'key': {'key': 'serviceName', 'dataType': 'string', 'type': 'tag', 'isColumn': True}, 'op': '=', 'value': '$SERVICE'}
                    ]
                },
                'groupBy': [{'key': 'name', 'dataType': 'string', 'type': 'tag', 'isColumn': True}],
                'orderBy': [{'columnName': 'A', 'order': 'desc'}],
                'limit': 20,
                'offset': 0,
                'stepInterval': 60,
                'expression': 'A',
                'disabled': False
            },
            'B': {
                'queryName': 'B',
                'dataSource': 'traces',
                'aggregateOperator': 'count',
                'aggregateAttribute': {'key': 'name', 'dataType': 'string', 'type': 'tag', 'isColumn': True},
                'filters': {
                    'op': 'AND',
                    'items': [
                        {'key': {'key': 'serviceName', 'dataType': 'string', 'type': 'tag', 'isColumn': True}, 'op': '=', 'value': '$SERVICE'},
                        {'key': {'key': 'hasError', 'dataType': 'bool', 'type': 'tag', 'isColumn': True}, 'op': '=', 'value': True}
                    ]
                },
                'groupBy': [{'key': 'name', 'dataType': 'string', 'type': 'tag', 'isColumn': True}],
                'orderBy': [{'columnName': 'B', 'order': 'desc'}],
                'limit': 20,
                'offset': 0,
                'stepInterval': 60,
                'expression': 'B',
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
  -d "$PAYLOAD"
