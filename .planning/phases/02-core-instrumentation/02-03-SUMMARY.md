---
phase: 02-core-instrumentation
plan: 03
subsystem: observability
tags: [opentelemetry, tracing, http-client, ondc, instrumentation]

# Dependency graph
requires:
  - phase: 01-sdk-foundation
    provides: OpenTelemetry SDK configured with OTLP export, 16KB span limits, auto-instrumentation active
provides:
  - Manual span instrumentation in ONDCClient.send() capturing full request/response payloads
  - HTTP-level tracing with Authorization header capture (no truncation)
  - Error tracking with exception recording and ERROR status
affects: [03-trpc-procedure-spans, 04-action-context-spans, distributed-tracing]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Manual span creation with tracer.startActiveSpan()"
    - "Full payload capture at HTTP client layer"
    - "Single JSON serialization with reuse for efficiency"
    - "Authorization header capture as-is without truncation"

key-files:
  created: []
  modified:
    - server/src/lib/ondc/client.ts

key-decisions:
  - "Capture full Authorization header without truncation (CONTEXT.md decision 4)"
  - "Serialize body once and reuse for both fetch and span attribute"
  - "Use numeric literals for SpanStatusCode enum to avoid runtime import"
  - "sendWithAck inherits tracing by delegating to send()"

patterns-established:
  - "Manual span pattern: wrap async method body in startActiveSpan with try/catch/finally"
  - "HTTP metadata attributes: http.url, http.method, http.status_code"
  - "Request attributes: http.request.body, http.request.body.size, http.request.header.authorization"
  - "Response attributes: http.response.body"
  - "Error handling: recordException + setStatus(ERROR) before throw"

# Metrics
duration: 1min
completed: 2026-02-09
---

# Phase 2 Plan 3: HTTP Client Instrumentation Summary

**ONDCClient.send() wrapped in OpenTelemetry spans capturing full request/response payloads and Authorization headers for every outgoing ONDC HTTP request**

## Performance

- **Duration:** 1min 11sec
- **Started:** 2026-02-09T12:33:36Z
- **Completed:** 2026-02-09T12:34:47Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Every outgoing ONDC HTTP request now creates a span named "ondc.http.request"
- Full request body captured as JSON string (subject to 16KB SDK limit from Phase 1)
- Complete Authorization header captured with no truncation
- Response status and body captured for both success and error cases
- Failed requests record exception details and set ERROR status
- Body serialized once and reused for efficiency

## Task Commits

Each task was committed atomically:

1. **Task 1: Add manual span to ONDCClient.send() with payload capture** - `4c94414` (feat)

## Files Created/Modified

- `server/src/lib/ondc/client.ts` - Added OpenTelemetry manual span wrapping send() method with full request/response capture

## Decisions Made

1. **Authorization header capture without truncation** - Decided to capture full Authorization header as-is, allowing SDK's 16KB attribute limit to apply uniformly. This ensures complete signature debugging capability (CONTEXT.md decision 4).

2. **Single body serialization** - Serialize request body once into `bodyJson` variable and reuse for both fetch body and span attribute. Avoids redundant JSON.stringify() calls.

3. **Numeric SpanStatusCode literals** - Use `1 as typeof SpanStatusCode.OK` and `2 as typeof SpanStatusCode.ERROR` instead of importing enum values, avoiding potential runtime dependency issues.

4. **sendWithAck inheritance** - Did not modify sendWithAck() method. It inherits all tracing behavior by delegating to send(), maintaining single responsibility.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - implementation proceeded smoothly. Pre-existing TypeScript configuration issues in the codebase (Zod ESM imports, crypto module defaults) are unrelated to this change and do not affect the tracing functionality.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

**Ready for tRPC procedure instrumentation (Phase 2 Plan 4):**
- HTTP client layer now fully instrumented
- Spans will nest under tRPC procedure spans when those are added
- Full request/response payloads available in traces for debugging
- Authorization signature debugging capability complete

**Foundation for distributed tracing:**
- Each HTTP request has a unique span
- Span hierarchy: tRPC procedure → ONDC action → HTTP request (when chain complete)
- transactionId correlation ready to connect async callbacks

---
*Phase: 02-core-instrumentation*
*Completed: 2026-02-09*
