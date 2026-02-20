---
phase: 05-error-classification-logging
plan: 01
subsystem: observability
tags: [opentelemetry, error-attribution, tracing, error-handling]

# Dependency graph
requires:
  - phase: 04-comprehensive-coverage
    provides: Tracing for all 5 gateway flows (search/select/init/confirm/status)
provides:
  - Error source classification (bap/bpp/gateway/network) on all error spans
  - BPP NACK error attribution with full error object capture
  - error.source attribute on every HTTP client and gateway error
affects: [05-error-classification-logging, monitoring, debugging, incident-response]

# Tech tracking
tech-stack:
  added: []
  patterns: [error-source-classification, span-error-attribution]

key-files:
  created:
    - server/src/lib/ondc/error-classifier.ts
  modified:
    - server/src/lib/ondc/client.ts
    - server/src/trpc/routers/gateway.ts

key-decisions:
  - "4-source error classification: bap (our code), bpp (4xx/5xx), gateway (registry/lookup), network (DNS/timeout/ECONNREFUSED)"
  - "BPP NACK responses get full error object as bpp.error span attribute"
  - "All error spans include error.source, error.message, and error.code (when available)"
  - "HTTP error responses (4xx/5xx) set error.source='bpp' before throw in ONDCClient"
  - "Network failures (no response) classified by error code/message patterns"

patterns-established:
  - "classifyErrorSource(error, response?, url?) pattern for error attribution"
  - "Span error enrichment: setAttribute('error.source') before recordException()"
  - "BPP NACK handling: 4 span attributes (error.source, error.message, error.code, bpp.error)"

# Metrics
duration: 3min
completed: 2026-02-16
---

# Phase 05 Plan 01: Error Classification & Attribution Summary

**Error source classification (bap/bpp/gateway/network) on all ONDC spans with full BPP NACK capture**

## Performance

- **Duration:** 3 min 3 sec
- **Started:** 2026-02-16T07:38:17Z
- **Completed:** 2026-02-16T07:41:16Z
- **Tasks:** 2
- **Files modified:** 3
- **Commits:** 2 task commits

## Accomplishments

- Error classifier with 4-source taxonomy (bap/bpp/gateway/network) based on error patterns, HTTP status, and URL context
- ONDCClient.send() enriches error spans with error.source, error.message, and error.code attributes
- All 10 gateway procedures (5 outbound + 5 callbacks) set error.source on every error path
- BPP NACK responses captured with full error object as bpp.error attribute
- 15 error attribution points across gateway router (5 NACK blocks + 10 catch blocks)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create error classifier and integrate into ONDCClient** - `12469f8` (feat)
2. **Task 2: Add error.source attribution to callback NACK handlers** - `09a210b` (feat)

## Files Created/Modified

- `server/src/lib/ondc/error-classifier.ts` - Error source classifier with 4 categories based on error properties, response status, and URL patterns
- `server/src/lib/ondc/client.ts` - ONDCClient.send() now classifies errors and enriches spans with error.source/message/code; response variable refactored for catch block access
- `server/src/trpc/routers/gateway.ts` - All 5 callback NACK blocks set error.source='bpp' with full error capture; all 10 catch blocks set error.source='bap'

## Decisions Made

1. **4-source taxonomy:** bap (validation/code errors), bpp (HTTP 4xx/5xx), gateway (registry/lookup ops), network (DNS/timeout/connection failures)
2. **Classification logic priority:** No response → network patterns; response with 4xx/5xx → bpp; URL/message contains gateway/registry → gateway; default → bap
3. **BPP NACK enrichment:** 4 attributes (error.source, error.message, error.code, bpp.error) for full error context in SigNoz
4. **HTTP error response attribution:** Set error.source='bpp' in non-ok response path before throwing (response exists but failed)
5. **Response variable refactoring:** Moved `response` declaration before try block to make it available in catch for classification

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation was straightforward.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Error source attribution complete. Ready for Plan 02 (pino structured logging migration).

All error spans now have error.source attribute for filtering in SigNoz:
- Filter by `error.source='bpp'` to see BPP failures
- Filter by `error.source='network'` to see connectivity issues
- Filter by `error.source='gateway'` to see registry/lookup failures
- Filter by `error.source='bap'` to see our own validation/code errors

BPP NACK responses include full error object as JSON in bpp.error attribute for deep debugging.

---
*Phase: 05-error-classification-logging*
*Completed: 2026-02-16*
