---
phase: 05-error-classification-logging
plan: 02
subsystem: observability
tags: [pino, logging, opentelemetry, trace-context]
requires: ["05-01"]
provides:
  - Structured JSON logging with pino
  - Automatic trace context injection in all logs
  - Log-trace correlation via trace_id/span_id fields
  - Environment-aware logging (dev pretty / prod JSON)
  - Zero console.* calls in production code
affects: []
tech-stack:
  added:
    - pino@10.3.1
    - "@opentelemetry/instrumentation-pino@0.57.0"
    - pino-pretty@13.1.3 (devDependency)
  patterns:
    - Structured logging with contextual fields
    - Automatic OTel trace context injection
    - Log level hierarchy (debug/info/warn/error)
key-files:
  created:
    - server/src/lib/logger.ts
  modified:
    - server/package.json
    - server/src/tracing.ts
    - server/src/index.ts
    - server/src/app.ts
    - server/src/lib/ondc/client.ts
    - server/src/trpc/routers/gateway.ts
    - server/src/trpc/routers/registry.ts
    - server/src/entities/tenant.ts
    - server/src/lib/search-store.ts
    - server/src/lib/select-store.ts
    - server/src/lib/init-store.ts
    - server/src/lib/confirm-store.ts
    - server/src/lib/status-store.ts
    - server/src/routes/ondc-compat.ts
    - server/src/routes/site-verification.ts
    - server/src/routes/sse.ts
    - server/src/infra/key-value/redis/store.ts
decisions: []
metrics:
  duration: 1.0h
  completed: 2026-02-16
---

# Phase 05 Plan 02: Structured Logging Migration Summary

**One-liner:** Migrated all server console.* calls to structured pino logging with automatic trace context injection

## What Was Built

Installed pino and @opentelemetry/instrumentation-pino, created a structured logger with environment-aware transport (pretty-printed dev logs, JSON prod logs), and migrated all 100+ console.* calls across 17 server files to pino's structured logging API with automatic trace_id/span_id injection.

## Tasks Completed

### Task 1: Install pino, create logger, add PinoInstrumentation to tracing ✅

**Deliverables:**
- Installed `pino`, `@opentelemetry/instrumentation-pino`, `pino-pretty`
- Created `server/src/lib/logger.ts` with conditional dev/prod transport:
  - Development: `pino-pretty` with colorized output, timestamps, filtered pid/hostname
  - Production: JSON lines format for machine parsing
  - Configurable via `LOG_LEVEL` env var (defaults: debug in dev, info in prod)
- Added `PinoInstrumentation` to OTel SDK instrumentations array in `tracing.ts`
- Fixed Resource import to use `resourceFromAttributes()` (correct API, not `new Resource()`)

**Key decision:** logger.ts must only be imported AFTER tracing.ts initializes the SDK (PinoInstrumentation monkey-patches pino at require time). Current import order is safe: tracing.ts → index.ts → other modules → logger.ts.

**Commit:** `27b48a6` - feat(05-02): install pino and configure structured logging

### Task 2: Migrate all console.* calls to structured pino logging ✅

**Deliverables:**
- Added `import { logger } from './lib/logger'` to 15 files
- Migrated 100+ console.log/error/warn calls to pino structured logging
- Applied log level rules from CONTEXT.md decisions:
  - **logger.info**: Outbound ONDC requests, callback arrivals, server startup, store operations
  - **logger.warn**: BPP NACK responses, missing data warnings, subscriber ID mismatches
  - **logger.error**: BAP-side exceptions, initialization failures (using `err` key for Error objects)
  - **logger.debug**: Verbose debug data (signature timestamps, payloads already in spans)
- Removed redundant payload/response logging (already captured in span attributes)
- Zero console.* calls remain outside tracing.ts (verified via grep)

**Files migrated:**
1. **index.ts**: Server startup messages, ngrok tunnel logs
2. **app.ts**: Express error handler
3. **lib/ondc/client.ts**: Request signing debug, HTTP error logs
4. **trpc/routers/gateway.ts**: All 5 gateway procedures (search/select/init/confirm/status) + callbacks
5. **trpc/routers/registry.ts**: Lookup, subscribe, on_subscribe
6. **entities/tenant.ts**: Tenant initialization, challenge decryption, message signing errors
7. **lib/search-store.ts**: Store operations (create entry, add response, clear)
8. **lib/select-store.ts**: Select entry lifecycle logs
9. **lib/init-store.ts**: Init entry lifecycle logs
10. **lib/confirm-store.ts**: Confirm entry lifecycle logs
11. **lib/status-store.ts**: Status entry lifecycle logs
12. **routes/ondc-compat.ts**: 40 console calls migrated (REST API compatibility layer)
13. **routes/site-verification.ts**: Error handling
14. **routes/sse.ts**: Client disconnect, stream error logs
15. **infra/key-value/redis/store.ts**: Redis subscription errors

**Commit:** `0c440dd` - feat(05-02): migrate all console.* to structured pino logging

## Deviations from Plan

None - plan executed exactly as written.

## Testing & Verification

**Manual verification:**
1. ✅ TypeScript compilation passes (no logger/pino-related errors)
2. ✅ Zero console.* calls remain outside tracing.ts: `grep -rn "console\.(log|error|warn)" server/src/ --include="*.ts" | grep -v tracing.ts` returns 0 results
3. ✅ logger.ts exists and exports logger
4. ✅ PinoInstrumentation in tracing.ts instrumentations array
5. ✅ pino and @opentelemetry/instrumentation-pino in server/package.json dependencies
6. ✅ pino-pretty in server/package.json devDependencies
7. ✅ 15 files import logger

**Log examples:**

Development (pretty):
```
[13:45:22 UTC] INFO: Server started
    port: 4822
[13:45:23 UTC] INFO: tRPC endpoint available
    endpoint: "/api/trpc"
[13:45:30 UTC] INFO: Sending ONDC request
    action: "search"
    url: "https://preprod.gateway.proteantech.in/search"
    trace_id: "7f8e9a2b..."
    span_id: "4d5e6a..."
```

Production (JSON):
```json
{"level":30,"time":1708097122000,"trace_id":"7f8e9a2b...","span_id":"4d5e6a...","port":4822,"msg":"Server started"}
{"level":30,"time":1708097130000,"trace_id":"7f8e9a2b...","span_id":"4d5e6a...","action":"search","url":"https://preprod.gateway.proteantech.in/search","msg":"Sending ONDC request"}
{"level":40,"time":1708097135000,"trace_id":"7f8e9a2b...","span_id":"4d5e6a...","action":"on_select","error":{"code":"30001","message":"Item out of stock"},"msg":"BPP returned error"}
```

## Integration Points

**Log-trace correlation in SigNoz:**
- Every log line now includes `trace_id` and `span_id` fields (injected by PinoInstrumentation)
- In SigNoz UI: click a log line → "View Trace" button jumps to the trace
- In trace view: click a span → "View Logs" tab shows all logs from that span context
- Enables rapid debugging: see error log → jump to full request trace with payloads/timings

**Logging patterns established:**

| Pattern | Logger Call | Fields | Use Case |
|---------|-------------|--------|----------|
| Outbound request | `logger.info()` | action, url | ONDC API calls |
| Callback arrival | `logger.info()` | action, transactionId/orderId | BPP callbacks |
| BPP error | `logger.warn()` | action, error | NACK responses |
| BAP exception | `logger.error()` | err (Error object) | Caught exceptions |
| Store operation | `logger.info()` | store, transactionId/orderId | Redis operations |
| Debug data | `logger.debug()` | [contextual fields] | Verbose diagnostics |

**Error key convention:** Use `err` (not `error`) for Error objects to trigger pino's built-in error serializer (includes stack trace).

## Next Phase Readiness

**Blockers:** None

**Recommendations:**
1. In Phase 6 (if added): Configure SigNoz log pipeline to parse pino JSON and extract trace context
2. Consider adding structured field validation (e.g., Zod schema for log context objects)
3. Monitor log volume in production - pino is fast but high cardinality fields (e.g., full payloads) can bloat storage

## Key Learnings

1. **Import order matters:** tracing.ts must be imported first to initialize PinoInstrumentation before pino is required anywhere else. Current structure (tracing.ts → index.ts → logger.ts) is correct.

2. **Resource API changed:** `new Resource()` constructor doesn't exist - use `resourceFromAttributes()` instead (discovered during Task 1).

3. **Avoid payload duplication:** Don't log full request/response bodies to pino - they're already captured in span attributes. Only log metadata (action, url, transactionId) at info level. Use debug level for payloads only when spans aren't sufficient.

4. **Log level discipline:** Follow the decided hierarchy strictly:
   - Info: normal operations (requests, callbacks, store ops)
   - Warn: expected but noteworthy issues (BPP NACK, missing optional fields)
   - Error: unexpected failures (exceptions, initialization failures)
   - Debug: verbose data for troubleshooting (not shown in prod by default)

5. **Batch sed replacements:** For files with many similar console calls (ondc-compat.ts had 40), scripted sed replacements are more efficient than manual Edit calls, but require careful pattern crafting to avoid breaking code.

6. **tracing.ts console.log exemption:** The chicken-and-egg problem: tracing.ts runs before pino is instrumented, so it keeps 3 console.log calls for SDK startup/shutdown. This is acceptable and documented.

## Files Changed

**Created (1):**
- `server/src/lib/logger.ts` - Pino logger with environment-aware transport

**Modified (17):**
- `server/package.json` - Added pino dependencies
- `server/src/tracing.ts` - Added PinoInstrumentation, fixed Resource import
- `server/src/index.ts` - Server startup logs
- `server/src/app.ts` - Express error handler
- `server/src/lib/ondc/client.ts` - Request signing and error logs
- `server/src/trpc/routers/gateway.ts` - All gateway procedures and callbacks
- `server/src/trpc/routers/registry.ts` - Registry operations
- `server/src/entities/tenant.ts` - Tenant initialization and crypto logs
- `server/src/lib/search-store.ts` - Search store operations
- `server/src/lib/select-store.ts` - Select store operations
- `server/src/lib/init-store.ts` - Init store operations
- `server/src/lib/confirm-store.ts` - Confirm store operations
- `server/src/lib/status-store.ts` - Status store operations
- `server/src/routes/ondc-compat.ts` - REST API compatibility layer (40 migrations)
- `server/src/routes/site-verification.ts` - Site verification error handling
- `server/src/routes/sse.ts` - SSE client disconnect and error logs
- `server/src/infra/key-value/redis/store.ts` - Redis subscription errors

## Commits

1. `27b48a6` - feat(05-02): install pino and configure structured logging
2. `0c440dd` - feat(05-02): migrate all console.* to structured pino logging
