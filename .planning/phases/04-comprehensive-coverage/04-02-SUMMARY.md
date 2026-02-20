---
phase: 04-comprehensive-coverage
plan: 02
subsystem: tracing
tags: [opentelemetry, tracing, ondc, init, confirm, status, payment-url]

# Dependency graph
requires:
  - phase: 04-01
    provides: "Select flow tracing + store traceparent infrastructure"
provides:
  - "Init/on_init flow traced with ONDC attributes"
  - "Confirm/on_confirm flow traced with ondc.payment_url extraction"
  - "Status/on_status flow traced with orderId-based correlation"
  - "All 10 gateway procedures (5 outbound + 5 callbacks) fully traced"
affects: [05-phase-spans, manual-testing, production-monitoring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "orderId-based trace correlation for status flow (different from transactionId+messageId pattern)"
    - "Payment URL extraction as span attribute for business insights"
    - "Uniform callback error handling with SpanStatusCode.ERROR"

key-files:
  created: []
  modified:
    - server/src/trpc/routers/gateway.ts

key-decisions:
  - "Status/on_status uses orderId-only lookup (not transactionId+messageId) because status can be polled multiple times"
  - "ondc.payment_url extracted from on_confirm response for payment flow visibility"
  - "ondc.order_id attribute added to status spans for filtering/correlation"

patterns-established:
  - "Callback trace restoration: getEntry → restoreTraceContext → createLinkedSpanOptions"
  - "BPP identity attributes on all callback spans (bpp_id, bpp_uri)"
  - "Span attributes set immediately after ID generation (inside startActiveSpan)"

# Metrics
duration: 3.5min
completed: 2026-02-15
---

# Phase 04 Plan 02: Comprehensive Coverage Summary

**All 10 gateway procedures traced: init/confirm/status flows with payment URL capture and orderId-based correlation**

## Performance

- **Duration:** 3 min 30 sec
- **Started:** 2026-02-15T16:35:58Z
- **Completed:** 2026-02-15T16:39:28Z
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments
- Init/on_init flow fully traced with ONDC attributes and linked spans
- Confirm/on_confirm flow traced with special ondc.payment_url attribute extraction
- Status/on_status flow traced with orderId-based correlation (different pattern)
- All 5 outbound procedures create ondc.{action} spans
- All 5 callbacks create linked ondc.on_{action} spans with BPP identity

## Task Commits

Each task was committed atomically:

1. **Task 1: Add tracing to init/on_init and confirm/on_confirm** - `c6aacb8` (feat)
2. **Task 2: Add tracing to status/on_status** - `9589736` (feat)

## Files Created/Modified
- `server/src/trpc/routers/gateway.ts` - Added tracing to init, onInit, confirm, onConfirm, status, onStatus procedures

## Decisions Made

**1. orderId-based correlation for status flow**
- Status flow uses `getStatusEntry(kv, orderId)` with 2 params (not 3 like other stores)
- Rationale: Status can be polled multiple times for same order, orderId is the stable key
- Each poll creates a NEW linked span showing polling timeline

**2. Payment URL extraction as span attribute**
- Extract `input.message?.order?.payments?.[0]?.url` in onConfirm callback
- Set as `ondc.payment_url` span attribute
- Rationale: Payment URLs are business-critical for transaction completion, need visibility in traces

**3. ondc.order_id attribute on status spans**
- Added to both outbound status and callback on_status spans
- Rationale: Enables filtering/correlation in trace UI when debugging order-specific issues

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - straightforward mechanical application of established patterns from Plan 04-01.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for Phase 5 (Phase-Level Spans):**
- All ONDC protocol operations traced end-to-end
- Trace context propagation working across all flows
- Payment URL visibility for transaction monitoring
- orderId correlation for status polling scenarios

**No blockers.**

---
*Phase: 04-comprehensive-coverage*
*Completed: 2026-02-15*
