---
phase: 02-core-instrumentation
plan: 01
subsystem: tracing
tags: [opentelemetry, trpc, observability, middleware, spans]

# Dependency graph
requires:
  - phase: 01-sdk-foundation
    provides: OpenTelemetry SDK setup with auto-instrumentation
provides:
  - tRPC tracing middleware applied to publicProcedure
  - Automatic span creation for all 19 tRPC procedures
  - Span attributes: trpc.procedure, trpc.type
  - Error capture with exception recording
affects: [02-02, 02-03, 03-01, 03-02, 03-03, 04-01]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "tRPC middleware pattern for cross-cutting concerns"
    - "OpenTelemetry manual span instrumentation with tracer.startActiveSpan"

key-files:
  created: []
  modified:
    - server/src/trpc/trpc.ts

key-decisions:
  - "Tracer name: 'ondc-bap-trpc' version '0.1.0' for tRPC-specific spans"
  - "Span naming: trpc.{type}.{path} (e.g., trpc.query.health.check)"
  - "Applied middleware to publicProcedure base - all procedures inherit automatically"

patterns-established:
  - "Middleware applied to publicProcedure - single point for cross-cutting concerns"
  - "Error handling: recordException + setStatus(ERROR) + re-throw pattern"
  - "Always call span.end() in finally block to ensure completion"

# Metrics
duration: 1m 40s
completed: 2026-02-09
---

# Phase 02 Plan 01: tRPC Tracing Middleware

**Every tRPC procedure now wrapped in OpenTelemetry span with automatic error capture and procedure/type attributes**

## Performance

- **Duration:** 1m 40s
- **Started:** 2026-02-09T12:33:12Z
- **Completed:** 2026-02-09T12:34:52Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- Added OpenTelemetry tracing middleware to tRPC's publicProcedure base
- All 19 existing tRPC procedures across 4 routers (health, registry, gateway, results) now automatically instrumented
- Span attributes include trpc.procedure (path) and trpc.type (query/mutation)
- Full error handling with exception recording and ERROR status

## Task Commits

Each task was committed atomically:

1. **Task 1: Add tracing middleware to publicProcedure** - `12ad561` (feat)

## Files Created/Modified
- `server/src/trpc/trpc.ts` - Added tracingMiddleware that wraps all procedure calls in OpenTelemetry spans

## Decisions Made

1. **Tracer instance naming**: Used "ondc-bap-trpc" with version "0.1.0" to distinguish tRPC spans from HTTP/Express spans
2. **Span naming pattern**: `trpc.{type}.{path}` makes it easy to filter traces by procedure type (query vs mutation)
3. **Middleware attachment point**: Applied to publicProcedure base rather than individual procedures - zero changes needed in router files
4. **Error propagation**: recordException + setStatus(ERROR) + re-throw ensures traces capture failures while preserving error handling

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation was straightforward.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Ready for Phase 02 Plan 02 (ONDC business logic span instrumentation).

Foundation complete:
- tRPC procedures now have spans in the trace hierarchy
- Error capture working automatically
- Span attributes populate correctly

Next steps:
- Add manual spans for ONDC business logic (search, select, init, confirm)
- Add context propagation for transactionId correlation
- Add payload attribute capture with truncation

---
*Phase: 02-core-instrumentation*
*Completed: 2026-02-09*
