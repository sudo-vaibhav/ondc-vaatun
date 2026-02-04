---
phase: 05-protocol-context-testing
plan: 02
subsystem: testing
tags: [playwright, e2e, rest-api, ondc, init, confirm]

# Dependency graph
requires:
  - phase: 05-01
    provides: Protocol specs and Zod schemas for validation
provides:
  - Complete E2E test coverage for init and confirm transaction flows
  - REST API endpoints for init, on_init, confirm, on_confirm, init-results, confirm-results
  - Validated callback storage and polling mechanisms
affects: [future protocol flow implementations, regression testing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "E2E flow tests verify complete journey: endpoint → callback → polling"
    - "Gateway error handling (503) accepted without test.skip()"
    - "Test unique IDs with timestamp+random for isolation"

key-files:
  created:
    - server/src/routes/ondc-compat.ts (init/confirm routes section)
  modified:
    - tests/api/gateway.spec.ts (added Init Flow and Confirm Flow test suites)
    - server/src/routes/ondc-compat.ts (fixed on_confirm orderId parameter)

key-decisions:
  - "Init/confirm REST API routes use same pattern as select (request → callback → polling)"
  - "Tests check payments array structure, not derived paymentUrl field"
  - "All flow tests verify both success and error response storage"

patterns-established:
  - "Callback routes extract orderId from message.order.id before storing"
  - "Flow integration tests have 3 test cases: endpoint success, callback storage, error storage"

# Metrics
duration: 11min
completed: 2026-02-05
---

# Phase 5 Plan 2: Init and Confirm Flow E2E Tests

**Complete E2E test coverage for init and confirm flows with 6 passing tests verifying endpoint responses, callback storage, and error handling**

## Performance

- **Duration:** 11 min
- **Started:** 2026-02-05T19:26:00Z
- **Completed:** 2026-02-05T19:36:53Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments
- Added 6 E2E tests covering init and confirm transaction flows (3 tests each)
- Implemented missing REST API routes for init, on_init, confirm, on_confirm, init-results, confirm-results
- Verified callback storage and polling mechanisms work correctly
- Validated BPP error response storage and retrieval

## Task Commits

Each task was committed atomically:

1. **Fix: Add missing init and confirm REST API routes** - `545278d` (fix)
   - Blocker fix (Rule 3): Tests couldn't run without these endpoints
   - Added 6 new REST routes (init, on_init, confirm, on_confirm, init-results, confirm-results)
   - Routes proxy to existing tRPC procedures with proper parameter handling

2. **Task 1 & 2: Init and Confirm Flow E2E Tests** - `0a0c0a3` (test)
   - Init Flow: 3 tests (endpoint, callback storage, error storage)
   - Confirm Flow: 3 tests (endpoint, callback storage, error storage)
   - Fixed orderId parameter in on_confirm REST route
   - Updated test assertions to check payments array structure

## Files Created/Modified
- `server/src/routes/ondc-compat.ts` - Added init/confirm REST API routes (~440 lines), fixed on_confirm orderId parameter
- `tests/api/gateway.spec.ts` - Added Init Flow Integration and Confirm Flow Integration test suites (~300 lines)

## Decisions Made
- REST API routes follow same pattern as existing select routes (validation → store entry → call BPP → return response)
- Tests verify payments array structure directly instead of expecting derived paymentUrl field
- All flow tests include error case to validate BPP error storage mechanism

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added missing init and confirm REST API routes**
- **Found during:** Test Task 1 (Init Flow E2E Tests)
- **Issue:** Tests reference `/api/ondc/init`, `/api/ondc/on_init`, `/api/ondc/confirm`, `/api/ondc/on_confirm`, `/api/ondc/init-results`, `/api/ondc/confirm-results` but these REST endpoints didn't exist. Only tRPC procedures existed.
- **Fix:** Created 6 REST API compatibility routes in `server/src/routes/ondc-compat.ts` following existing select/on_select pattern
- **Files modified:** `server/src/routes/ondc-compat.ts`
- **Verification:** All tests pass after route implementation
- **Committed in:** `545278d` (separate blocking fix commit)

**2. [Rule 1 - Bug] Fixed missing orderId parameter in on_confirm REST route**
- **Found during:** Test Task 2 (Confirm Flow E2E Tests)
- **Issue:** `addConfirmResponse` requires 5 parameters (kv, transactionId, messageId, orderId, body) but REST route was only passing 4, causing 500 error
- **Fix:** Extract `orderId` from `body.message?.order?.id` before calling `addConfirmResponse`
- **Files modified:** `server/src/routes/ondc-compat.ts` (line 736)
- **Verification:** on_confirm tests pass after fix
- **Committed in:** `0a0c0a3` (part of test commit)

**3. [Rule 1 - Bug] Fixed test assertion for payment data structure**
- **Found during:** Test Task 1 (on_init stores payment URL test)
- **Issue:** Test expected `paymentUrl` top-level field but init-store returns `payments` array. No derived `paymentUrl` field exists.
- **Fix:** Updated test to check `payments[0].url` and `payments[0].status` instead
- **Files modified:** `tests/api/gateway.spec.ts`
- **Verification:** Test passes after assertion fix
- **Committed in:** `0a0c0a3` (part of test commit)

---

**Total deviations:** 3 auto-fixed (1 blocking, 2 bugs)
**Impact on plan:** Blocking issue (missing routes) prevented test execution. Bug fixes essential for tests to pass correctly. No scope creep.

## Issues Encountered
None - deviations handled via auto-fix rules.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Complete E2E test coverage for init and confirm flows validates protocol implementation
- Ready for Phase 5 Plan 3 (if planned) or next protocol feature implementation
- Test patterns established for future transaction flow testing

---
*Phase: 05-protocol-context-testing*
*Completed: 2026-02-05*
