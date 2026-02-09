---
phase: 02-core-instrumentation
plan: 02
subsystem: tracing
tags: [opentelemetry, ondc, gateway, business-logic, spans]

# Dependency graph
requires:
  - phase: 02-01
    provides: tRPC tracing middleware on publicProcedure
  - phase: 02-03
    provides: ONDCClient.send() HTTP tracing
provides:
  - Manual ondc.search span in gateway.search procedure
  - ONDC-specific span attributes: transaction_id, message_id, action, domain, subscriber_id
  - Three-level span hierarchy: tRPC procedure → ONDC action → HTTP client
affects: [04-01, 04-02, 04-03, 04-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Manual ONDC business logic spans with startActiveSpan"
    - "ONDC attribute capture at span creation time"
    - "ActiveSpan propagation to child spans via AsyncLocalStorage"

key-files:
  created: []
  modified:
    - server/src/trpc/routers/gateway.ts

key-decisions:
  - "Use startActiveSpan so ONDCClient.send() span becomes child via AsyncLocalStorage"
  - "Capture ONDC attributes immediately after generating transactionId/messageId"
  - "Only search procedure modified in this plan (prototype for Phase 4 extension)"

patterns-established:
  - "Manual span wrapping ONDC procedure body with try/catch/finally"
  - "ONDC attributes: transaction_id, message_id, action, domain, subscriber_id"
  - "Error handling: recordException + setStatus(ERROR) + re-throw + span.end() in finally"

# Metrics
duration: 1m 31s
completed: 2026-02-09
---

# Phase 02 Plan 02: ONDC Search Span Instrumentation

**Gateway.search procedure creates child ondc.search span with ONDC-specific attributes, establishing the middle layer of the span hierarchy**

## Performance

- **Duration:** 1m 31s
- **Started:** 2026-02-09T12:37:21Z
- **Completed:** 2026-02-09T12:38:52Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added manual ondc.search span to gateway.search mutation handler
- Captured ONDC-specific attributes: transaction_id, message_id, action, domain, subscriber_id
- Established three-level span hierarchy: HTTP request → tRPC procedure → ONDC action → HTTP client
- Used startActiveSpan to propagate context to ONDCClient.send() child span

## Task Commits

Each task was committed atomically:

1. **Task 1: Add ondc.search span to gateway.search procedure** - `b3d9851` (feat)

## Files Created/Modified
- `server/src/trpc/routers/gateway.ts` - Added manual ondc.search span wrapping search mutation body with ONDC attributes

## Decisions Made

1. **Span propagation mechanism**: Used `tracer.startActiveSpan()` instead of `tracer.startSpan()` so ONDCClient.send() automatically becomes a child span via AsyncLocalStorage context propagation
2. **Attribute capture timing**: Set ONDC attributes immediately after generating transactionId and messageId, before any async operations
3. **Prototype approach**: Modified only search procedure in this plan; Phase 4 will extend this pattern to all gateway procedures (select, init, confirm, status)
4. **No BPP attributes for search**: Intentionally omitted ondc.bpp_id and ondc.bpp_uri from search span since search goes to gateway, not specific BPP

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation was straightforward.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Phase 03 (Transaction Context Propagation).

Foundation complete:
- Three-level span hierarchy working: tRPC → ONDC action → HTTP client
- ONDC attributes captured correctly
- Span propagation via AsyncLocalStorage confirmed
- Error handling with exception recording working

Next steps:
- Phase 03: Add transactionId-based trace correlation for async callbacks
- Phase 04: Extend manual ONDC span pattern to all gateway procedures (select, init, confirm, status)
- Phase 04: Add ondc.bpp_id and ondc.bpp_uri attributes for BPP-targeted calls

---
*Phase: 02-core-instrumentation*
*Completed: 2026-02-09*
