# SigNoz Query Service API Reference

Base URL: `http://localhost:4830` (configurable via `SIGNOZ_URL` env var)

Auth: `SIGNOZ-API-KEY: <key>` header on all endpoints except health/version. Create API keys in SigNoz UI: Settings > API Keys.

## Table of Contents

- [Core Endpoints](#core-endpoints)
- [Query Range (Main Query Endpoint)](#query-range)
- [Filter Syntax](#filter-syntax)
- [Trace-Specific Endpoints](#trace-specific-endpoints)
- [Log Queries](#log-queries)
- [Service Endpoints](#service-endpoints)
- [Error Endpoints](#error-endpoints)
- [Autocomplete](#autocomplete)

## Core Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/v1/health` | No | Health check |
| GET | `/api/v1/version` | No | Version info |
| POST | `/api/v3/query_range` | Yes | **Main query endpoint** for traces, logs, metrics |
| GET | `/api/v1/traces/{traceId}` | Yes | Get trace by ID |
| POST | `/api/v2/traces/waterfall/{traceId}` | Yes | Waterfall view of trace |

## Query Range

`POST /api/v3/query_range` -- unified endpoint for all signal types.

### Trace List Query

```json
{
  "start": 1700000000000,
  "end": 1700003600000,
  "compositeQuery": {
    "queryType": "builder",
    "panelType": "list",
    "builderQueries": {
      "A": {
        "queryName": "A",
        "dataSource": "traces",
        "aggregateOperator": "noop",
        "filters": {
          "op": "AND",
          "items": [
            {
              "key": {"key": "serviceName", "dataType": "string", "type": "tag", "isColumn": true},
              "op": "=",
              "value": "ondc-bap"
            }
          ]
        },
        "selectColumns": [
          {"key": "serviceName", "dataType": "string", "type": "tag", "isColumn": true},
          {"key": "name", "dataType": "string", "type": "tag", "isColumn": true},
          {"key": "durationNano", "dataType": "float64", "type": "tag", "isColumn": true},
          {"key": "hasError", "dataType": "bool", "type": "tag", "isColumn": true},
          {"key": "traceID", "dataType": "string", "type": "tag", "isColumn": true}
        ],
        "orderBy": [{"columnName": "timestamp", "order": "desc"}],
        "limit": 20,
        "offset": 0,
        "stepInterval": 60,
        "expression": "A",
        "disabled": false
      }
    }
  }
}
```

### Timestamps

- `start`/`end`: Unix milliseconds
- Shell helper: `$(( $(date +%s) * 1000 ))` for current time

## Filter Syntax

### Filter Item Structure

```json
{
  "key": {
    "key": "<attribute_name>",
    "dataType": "string|int64|float64|bool",
    "type": "tag|resource",
    "isColumn": true
  },
  "op": "=",
  "value": "<value>"
}
```

### Column vs Tag Attributes

- **Column attributes** (`isColumn: true`): Built-in trace fields -- `serviceName`, `name`, `durationNano`, `hasError`, `traceID`, `spanID`, `parentSpanID`, `httpMethod`, `httpUrl`, `responseStatusCode`
- **Tag attributes** (`isColumn: false`): Custom span attributes -- `ondc.transaction_id`, `ondc.action`, `ondc.bpp_id`, etc.

### Operators

`=`, `!=`, `>`, `>=`, `<`, `<=`, `in`, `nin`, `contains`, `ncontains`, `regex`, `nregex`, `like`, `nlike`, `exists`, `nexists`

### Common Filter Patterns

**By ONDC transaction:**
```json
{"key": {"key": "ondc.transaction_id", "dataType": "string", "type": "tag"}, "op": "=", "value": "txn-123"}
```

**Error spans only:**
```json
{"key": {"key": "hasError", "dataType": "bool", "type": "tag", "isColumn": true}, "op": "=", "value": true}
```

**By operation name (e.g., search):**
```json
{"key": {"key": "name", "dataType": "string", "type": "tag", "isColumn": true}, "op": "=", "value": "ondc.search"}
```

**Root spans only:**
```json
{"key": {"key": "parentSpanID", "dataType": "string", "type": "tag", "isColumn": true}, "op": "=", "value": ""}
```

## Trace-Specific Endpoints

### Get Trace

```bash
curl "$SIGNOZ_URL/api/v1/traces/<traceId>"
```

### Waterfall View

```bash
curl -X POST "$SIGNOZ_URL/api/v2/traces/waterfall/<traceId>" \
  -H "Content-Type: application/json" -d '{}'
```

### List Trace Fields

```bash
curl "$SIGNOZ_URL/api/v2/traces/fields"
```

## Log Queries

Same query_range endpoint with `dataSource: "logs"`.

### Log List Query

```json
{
  "start": 1700000000000,
  "end": 1700003600000,
  "compositeQuery": {
    "queryType": "builder",
    "panelType": "list",
    "builderQueries": {
      "A": {
        "queryName": "A",
        "dataSource": "logs",
        "aggregateOperator": "noop",
        "filters": {
          "op": "AND",
          "items": [
            {"key": {"key": "severity_text", "dataType": "string", "type": "tag", "isColumn": true}, "op": "=", "value": "ERROR"},
            {"key": {"key": "service_name", "dataType": "string", "type": "tag", "isColumn": true}, "op": "=", "value": "ondc-bap"}
          ]
        },
        "orderBy": [{"columnName": "timestamp", "order": "desc"}],
        "limit": 50,
        "offset": 0,
        "stepInterval": 60,
        "expression": "A",
        "disabled": false
      }
    }
  }
}
```

### Log Filter Keys

Column attributes: `severity_text`, `service_name`, `body`, `timestamp`, `trace_id`, `span_id`

## Service Endpoints

```bash
# List services with stats
curl -X POST "$SIGNOZ_URL/api/v2/services" \
  -d '{"start": "<epoch_seconds>", "end": "<epoch_seconds>"}'

# Top operations for a service
curl -X POST "$SIGNOZ_URL/api/v2/service/top_operations" \
  -d '{"start": "<epoch_seconds>", "end": "<epoch_seconds>", "service": "ondc-bap"}'

# Simple service list
curl "$SIGNOZ_URL/api/v1/services/list"
```

## Error Endpoints

```bash
# List errors (grouped exceptions)
curl -X POST "$SIGNOZ_URL/api/v1/listErrors" \
  -d '{
    "start": "<epoch_seconds>",
    "end": "<epoch_seconds>",
    "limit": 20,
    "offset": 0,
    "orderParam": "lastSeen",
    "order": "descending",
    "serviceName": "ondc-bap"
  }'
```

`orderParam` values: `exceptionType`, `exceptionCount`, `firstSeen`, `lastSeen`, `serviceName`

## Autocomplete

```bash
# Available attribute keys for traces
curl "$SIGNOZ_URL/api/v3/autocomplete/attribute_keys?dataSource=traces&limit=50"

# Available values for an attribute
curl "$SIGNOZ_URL/api/v3/autocomplete/attribute_values?dataSource=traces&attributeKey=ondc.action&limit=20"
```

## Aggregate Operators

For time-series or scalar queries, replace `"aggregateOperator": "noop"` with:
`count`, `count_distinct`, `sum`, `avg`, `min`, `max`, `p50`, `p90`, `p95`, `p99`, `rate`

Set `panelType: "graph"` for time-series, `panelType: "value"` for scalar.
