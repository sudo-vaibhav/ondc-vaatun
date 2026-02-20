---
name: otel-debugger
description: >
  Query OpenTelemetry traces and logs from SigNoz to debug ONDC transaction flows.
  Use when: (1) E2E or manual tests fail and you need to see what happened on the server,
  (2) Investigating ONDC protocol errors (search/select/init/confirm/status failures),
  (3) Checking if callbacks (on_search, on_select, etc.) were received,
  (4) Diagnosing latency or timeout issues, (5) Reviewing error spans and exception details,
  (6) Correlating request-callback pairs via transaction_id.
  Triggers: "check traces", "debug the test failure", "what happened on the server",
  "check logs for errors", "look at the trace", "why did on_search fail", "check SigNoz".
---

# OTel Debugger

Query traces and logs from the local SigNoz instance to debug ONDC BAP server issues.

## Prerequisites

1. SigNoz running: `pnpm signoz:up`
2. BAP server exporting traces: `OTEL_EXPORTER_OTLP_ENDPOINT` set in `.env`
3. API key: set `SIGNOZ_API_KEY` env var

All scripts require `SIGNOZ_API_KEY`. Create one in SigNoz UI: Settings > API Keys > New Key (Viewer role is sufficient). The auth header used is `SIGNOZ-API-KEY`.

## Scripts

All scripts at `scripts/` relative to this skill. Default service: `ondc-bap`. Default time window: 60 minutes.

| Script | Purpose | Key flags |
|--------|---------|-----------|
| `get-trace.sh <traceId>` | Fetch all spans for a trace | traceId as hex string |
| `query-traces.sh` | Search traces with filters | `--txn`, `--operation`, `--errors`, `--minutes`, `--limit` |
| `query-logs.sh` | Search logs with filters | `--severity`, `--pattern`, `--minutes`, `--limit` |
| `list-errors.sh` | List error spans | `--minutes`, `--limit` |
| `service-overview.sh` | Span counts by operation | `--minutes` |

## Debugging Workflows

### 1. Test failure -- find the error

```bash
# Get recent errors
scripts/list-errors.sh --minutes 5

# Or search for error spans directly
scripts/query-traces.sh --errors --minutes 5
```

Read the error details. If a traceId is present, drill in:

```bash
scripts/get-trace.sh <traceId>
```

### 2. ONDC transaction investigation

When you have a `transactionId` (from test output, API response, or client logs):

```bash
# Find all spans for this transaction
scripts/query-traces.sh --txn <transactionId>

# Find related logs
scripts/query-logs.sh --txn <transactionId>
```

The traces show the full flow: outbound request span, HTTP child span, and (if received) the linked callback span.

### 3. Callback not received

If `on_search`/`on_select` etc. never arrived:

```bash
# Check if callback span exists
scripts/query-traces.sh --txn <transactionId> --operation "ondc.on_search.callback"
```

Empty result means the callback never hit the server. Check:
- Gateway/BPP returned ACK? (look at outbound span attributes)
- Correct BAP URI configured? (`bap_uri` in outbound span)
- Network/firewall blocking inbound?

### 4. Latency diagnosis

```bash
# Get service overview to spot slow operations
scripts/service-overview.sh --minutes 15
```

Then drill into a specific slow trace by its traceId.

### 5. Check if SigNoz is healthy

```bash
curl -sf http://localhost:4830/api/v1/health | python3 -m json.tool
```

## ONDC Span Attributes

Key attributes set on ONDC spans for filtering:

| Attribute | Description | Example |
|-----------|-------------|---------|
| `ondc.action` | Protocol action | `search`, `on_search`, `select` |
| `ondc.transaction_id` | Transaction ID | `019b-...` |
| `ondc.message_id` | Message ID | `019b-...` |
| `ondc.bpp_id` | BPP subscriber ID | `bpp.example.com` |
| `ondc.domain` | ONDC domain | `ONDC:FIS13` |
| `ondc.error.code` | BPP error code | `30001` |
| `ondc.error.source` | Error classification | `bpp`, `gateway`, `network` |

## Custom Queries

For queries beyond what the scripts support, see [references/signoz-api.md](references/signoz-api.md) for the full SigNoz Query Service API reference with filter syntax and curl examples.
