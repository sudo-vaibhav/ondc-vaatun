---
phase: 04-comprehensive-coverage
plan: 01
subsystem: tracing
tags: [opentelemetry, otel, tracing, redis, select, signing]

# Dependency graph
requires:
  - phase: 03-async-callback-correlation
    provides: Search flow trace context storage and correlation pattern
provides:
  - Select/init/confirm/status stores with traceparent field and 30-min TTL
  - Select flow end-to-end tracing with callback correlation
  - Ed25519 signing span as child of HTTP request span
affects: [04-02, 04-03, 04-04]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Uniform traceparent storage across all transaction stores"
    - "30-minute TTL for transaction stores (select/init/confirm) to catch late callbacks"
    - "Ed25519 signing span wrapped in sync callback for proper parent-child relationship"

key-files:
  created: []
  modified:
    - server/src/lib/select-store.ts
    - server/src/lib/init-store.ts
    - server/src/lib/confirm-store.ts
    - server/src/lib/status-store.ts
    - server/src/trpc/routers/gateway.ts
    - server/src/lib/ondc/client.ts

key-decisions:
  - "Extended all 4 transaction stores with traceparent field (uniform pattern)"
  - "Set 30-min TTL for select/init/confirm to accommodate late BPP callbacks"
  - "Status store kept at 24h TTL (already exceeds correlation window)"
  - "Wrapped signing in sync callback for correct span hierarchy"

patterns-established:
  - "Trace context serialization pattern: serialize after span attributes set, store in Redis entry"
  - "Callback correlation pattern: retrieve entry, restore context, create linked span with BPP attributes"
  - "Error propagation pattern: BPP errors set span ERROR status with descriptive message"

# Metrics
duration: 3min
completed: 2026-02-15
---

# Phase 4 Plan 1: Select Flow Trace Coverage Summary

**Complete trace instrumentation for select/on_select with Ed25519 signing span and uniform traceparent storage across all transaction stores**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-15T16:13:43Z
- **Completed:** 2026-02-15T16:17:33Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Extended all 4 transaction stores (select, init, confirm, status) with traceparent field
- Implemented complete tracing for select procedure with ONDC attributes
- Implemented trace correlation for onSelect callback with BPP identity attributes
- Added Ed25519 signing span as child of HTTP request span
- Updated TTLs to 30 minutes for select/init/confirm stores

## Task Commits

Each task was committed atomically:

1. **Task 1: Extend all 4 stores with traceparent field and update TTLs** - `8ccdd96` (feat)
2. **Task 2: Add tracing to select/on_select and signing span to client.ts** - `565397a` (feat)

## Files Created/Modified

- `server/src/lib/select-store.ts` - Added traceparent field to SelectEntry, updated TTL to 30min
- `server/src/lib/init-store.ts` - Added traceparent field to InitEntry, updated TTL to 30min
- `server/src/lib/confirm-store.ts` - Added traceparent field to ConfirmEntry, updated TTL to 30min
- `server/src/lib/status-store.ts` - Added traceparent field to StatusEntry (kept 24h TTL)
- `server/src/trpc/routers/gateway.ts` - Added tracing to select/onSelect procedures
- `server/src/lib/ondc/client.ts` - Added ondc.sign span wrapping Ed25519 signing

## Decisions Made

**1. Uniform traceparent storage across all stores**
- Applied same pattern to select/init/confirm/status for consistency
- Enables future extension of tracing to all flows without pattern changes

**2. 30-minute TTL for transaction stores**
- Changed from 10 minutes to 30 minutes for select/init/confirm stores
- Accommodates late BPP callbacks (some BPPs respond slowly)
- Status store kept at 24h (policy data may be accessed much later)

**3. Signing span uses sync callback**
- Used synchronous callback pattern for ondc.sign span
- Ensures proper parent-child relationship with ondc.http.request span
- Avoids async context loss issues

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation followed Phase 3 pattern directly.

## Next Phase Readiness

**Ready for init/confirm/status tracing extension:**
- Pattern established: serialize traceparent → store in entry → retrieve in callback → create linked span
- All 4 stores have traceparent field and appropriate TTLs
- Select flow serves as working reference implementation

**Remaining work:**
- Plan 02: Add tracing to init/on_init (mirror select pattern)
- Plan 03: Add tracing to confirm/on_confirm (mirror select pattern)
- Plan 04: Add tracing to status/on_status (mirror select pattern)

**No blockers identified.**

---
*Phase: 04-comprehensive-coverage*
*Completed: 2026-02-15*
