---
phase: 03-init-flow
plan: 05
subsystem: ui
tags: [react, tanstack-router, tanstack-query, trpc, polling, kyc, payment-redirect]

# Dependency graph
requires:
  - phase: 03-01
    provides: init/on_init tRPC procedures, getInitResults query
  - phase: 03-04
    provides: 5-step KYCForm with Nominee and Review steps
provides:
  - Init polling page with 60s timeout and payment redirect
  - Quote page integrated with KYCForm and init mutation
  - Auto-retry init mutation (3 attempts, exponential backoff)
  - BPP error display directly to users
affects: [04-confirm-flow]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Init polling with 60s timeout and 2s intervals"
    - "Auto-redirect to payment URL after 3 seconds"
    - "Auto-retry mutation with exponential backoff (1s, 2s, 4s capped at 5s)"
    - "Retry count display during pending state"

key-files:
  created:
    - client/src/routes/init/$transactionId/$messageId.tsx
  modified:
    - client/src/routes/quote/$transactionId/$messageId.tsx
    - server/src/lib/select-store.ts

key-decisions:
  - "Payment URL auto-redirects after 3 seconds with manual button as backup"
  - "BPP errors displayed directly as per user decision"
  - "Retry count shown during pending state for transparency"
  - "Additional form requirements handled via redirect to BPP URL"

patterns-established:
  - "Init polling page pattern for payment flow"
  - "Mutation auto-retry pattern for network resilience"

# Metrics
duration: 5min
completed: 2026-02-04
---

# Phase 3 Plan 05: Init Polling and Quote Integration Summary

**Init polling page with payment redirect and quote page integration with auto-retry init mutation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-04T03:03:35Z
- **Completed:** 2026-02-04T03:08:38Z
- **Tasks:** 3
- **Files created:** 1
- **Files modified:** 2

## Accomplishments

- Created init polling page that polls getInitResults with 60s timeout
- Auto-redirects to BPP payment URL after approval (3s delay with manual button)
- Displays BPP errors directly to users per user decision
- Handles additional form requirements via redirect to BPP URL
- Integrated KYCForm into quote page with working Proceed button
- Init mutation auto-retries 3 times with exponential backoff (1s, 2s, 4s capped at 5s)
- Shows retry count during pending state for transparency
- Error only shown after all retries exhausted per user decision
- Added bppId/bppUri to SelectResult for init requests

## Task Commits

Each task was committed atomically:

1. **Task 1: Create init polling and redirect page** - `65f7b95` (feat)
2. **Task 2: Wire quote page to init flow with auto-retry** - `bf5943c` (feat)
3. **Task 3: Add bppId/bppUri to SelectResult** - `02ea364` (feat)

## Files Created/Modified

- `client/src/routes/init/$transactionId/$messageId.tsx` - Init polling page with payment redirect
- `client/src/routes/quote/$transactionId/$messageId.tsx` - Integrated KYCForm and init mutation with auto-retry
- `server/src/lib/select-store.ts` - Added bppId/bppUri to SelectResult interface and return

## Decisions Made

- **3-second auto-redirect to payment:** Gives user time to see success state while ensuring smooth flow
- **Manual button as backup:** Users can click immediately if they don't want to wait
- **BPP errors displayed directly:** Per user decision, raw error codes and messages shown
- **Retry count visibility:** Shows "(Retry X/3)" during pending state for transparency
- **Additional form via redirect:** When BPP requires more forms, redirect to their URL

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript errors in codebase related to spread types in gateway.ts
- Union type narrowing issues in tRPC results (existing pattern, not blocking)

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 3 (Init Flow) complete
- End-to-end flow from search -> quote -> KYC -> init -> payment redirect working
- Ready for Phase 4 (Confirm & Status Flows)
- Payment callback handling and confirm endpoint needed next

---
*Phase: 03-init-flow*
*Completed: 2026-02-04*
