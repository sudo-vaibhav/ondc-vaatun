---
phase: 03-async-callback-correlation
plan: 02
subsystem: observability
completed: 2026-02-10
duration: 1 minute

tags:
  - opentelemetry
  - trace-context
  - async-correlation
  - span-links
  - callback-tracing

requires:
  - 03-01-PLAN.md (Trace Context Storage Foundation)
  - 02-02-PLAN.md (ONDC search span)

provides:
  - Working search/on_search trace correlation
  - BPP callback attribution (bpp_id, bpp_uri attributes)
  - BPP error detection (SpanStatusCode.ERROR on NACK)
  - Orphan trace handling for missing context

affects:
  - 04-xx-PLAN.md (Phase 4 extends pattern to select/init/confirm)

tech-stack:
  added: []
  patterns:
    - "Linked spans for async callback correlation"
    - "BPP identity tagging on callback spans"
    - "SpanStatusCode.ERROR for BPP NACK/errors"

key-files:
  created: []
  modified:
    - server/src/trpc/routers/gateway.ts

decisions:
  - id: 03-02-001
    choice: "Store traceparent inside startActiveSpan callback"
    rationale: "Ensures active span context is available for serialization"
    date: 2026-02-10
  - id: 03-02-002
    choice: "Early return if no transaction_id (before trace restoration)"
    rationale: "No point restoring trace context if callback has no transactionId"
    date: 2026-02-10
---

# Phase 3 Plan 02: Search/OnSearch Trace Integration Summary

**One-liner:** Wire trace context into search/on_search flow with linked spans and BPP attribution

## What Was Built

This plan completes the async callback correlation pattern for the search/on_search flow:

1. **Trace context storage in search mutation**:
   - Added `serializeTraceContext()` import from trace-context-store
   - Called `serializeTraceContext()` inside `startActiveSpan` callback (after setting attributes)
   - Passed traceparent to `createSearchEntry()` as 6th parameter

2. **Trace context restoration in onSearch mutation**:
   - Added imports: `getSearchEntry`, `restoreTraceContext`, `createLinkedSpanOptions`, `SpanKind`
   - Retrieved search entry with `getSearchEntry()` to get traceparent
   - Restored SpanContext with `restoreTraceContext(entry?.traceparent)`
   - Created linked span options with BPP identity attributes
   - Wrapped entire callback handler in `tracer.startActiveSpan("ondc.on_search", ...)`
   - Handled BPP NACK/error responses with `SpanStatusCode.ERROR`
   - Added exception handling with `span.recordException()` and proper cleanup

**End-to-end flow:**
1. User calls `gateway.search` → tRPC middleware creates trace
2. ondc.search span stores traceparent in Redis via `createSearchEntry()`
3. BPP sends callback to `gateway.onSearch` (separate HTTP request)
4. onSearch retrieves traceparent, creates linked span with same traceId
5. SigNoz shows both spans in same trace tree, linked via SpanLink

## Implementation Notes

### Search Procedure Changes

**Before:**
```typescript
span.setAttribute("ondc.subscriber_id", tenant.subscriberId);

await createSearchEntry(
  kv,
  transactionId,
  messageId,
  input.categoryCode,
);
```

**After:**
```typescript
span.setAttribute("ondc.subscriber_id", tenant.subscriberId);

// Serialize trace context for callback correlation
const traceparent = serializeTraceContext();

await createSearchEntry(
  kv,
  transactionId,
  messageId,
  input.categoryCode,
  undefined,  // ttl (use default)
  traceparent,
);
```

**Why serialize inside startActiveSpan?**
The active span context must be available for `serializeTraceContext()` to capture the current traceId and spanId. Calling it outside the span would serialize a parent span or no span at all.

### OnSearch Procedure Changes

**Before:**
```typescript
.mutation(async ({ ctx, input }) => {
  const { kv } = ctx;
  const transactionId = input.context?.transaction_id;

  if (transactionId) {
    await addSearchResponse(kv, transactionId, input);
  } else {
    console.warn("[on_search] No transaction_id found in context");
  }

  return { message: { ack: { status: "ACK" as const } } };
}),
```

**After:**
```typescript
.mutation(async ({ ctx, input }) => {
  const { kv } = ctx;
  const transactionId = input.context?.transaction_id;

  // Early return if no transactionId
  if (!transactionId) {
    console.warn("[on_search] No transaction_id found in context");
    return { message: { ack: { status: "ACK" as const } } };
  }

  // Retrieve and restore trace context
  const entry = await getSearchEntry(kv, transactionId);
  const originalSpanContext = restoreTraceContext(entry?.traceparent);

  if (!entry?.traceparent) {
    console.warn("[on_search] No trace context found for transaction:", transactionId);
  }

  // Create linked span with BPP identity
  const spanOptions = createLinkedSpanOptions(originalSpanContext, {
    kind: SpanKind.SERVER,
    attributes: {
      "ondc.transaction_id": transactionId,
      "ondc.action": "on_search",
      "ondc.bpp_id": input.context?.bpp_id || "unknown",
      "ondc.bpp_uri": input.context?.bpp_uri || "unknown",
    },
  });

  // Wrap handler in linked span
  return tracer.startActiveSpan("ondc.on_search", spanOptions, async (span) => {
    try {
      await addSearchResponse(kv, transactionId, input);

      // Handle BPP NACK/errors
      if (input.error) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `BPP error: ${input.error.code || "unknown"} - ${input.error.message || "no message"}`,
        });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }

      return { message: { ack: { status: "ACK" as const } } };
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      throw error;
    } finally {
      span.end();
    }
  });
}),
```

### Key Design Decisions Applied

**BPP Identity Attributes (CONTEXT.md decision 2):**
Each on_search span is tagged with:
- `ondc.bpp_id`: Identifies which BPP sent the callback
- `ondc.bpp_uri`: BPP's endpoint for debugging
- `ondc.action`: "on_search" for easy filtering
- `ondc.transaction_id`: Correlation key

**NACK as ERROR (CONTEXT.md decision 2):**
BPP error responses set `SpanStatusCode.ERROR`:
```typescript
if (input.error) {
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: `BPP error: ${input.error.code} - ${input.error.message}`,
  });
}
```

This makes failed BPP callbacks visible in SigNoz error dashboards.

**Missing Context Handling (CONTEXT.md decision 3):**
If no traceparent exists:
- Log `console.warn` for visibility
- Continue processing (callback data still stored)
- Create orphan trace (new traceId, no link)
- Don't fail the callback (BPP still gets ACK)

**Multiple BPP Callbacks:**
Each BPP that responds creates its own on_search span:
- All spans share same traceId (from restored context)
- Each has unique spanId and BPP identity attributes
- Appear as sibling spans in trace waterfall
- All linked to the original ondc.search span

## Verification

### TypeScript Compilation
```bash
cd server && npx tsc --noEmit
```
**Result:** No new errors introduced (pre-existing errors unrelated to trace changes)

### Code Inspection
✅ `serializeTraceContext()` imported and called in search
✅ `traceparent` passed to `createSearchEntry()` with `undefined` for ttl
✅ `getSearchEntry()` called to retrieve traceparent in onSearch
✅ `restoreTraceContext()` and `createLinkedSpanOptions()` used correctly
✅ `SpanKind.SERVER` specified for callback span
✅ BPP attributes (bpp_id, bpp_uri) present on span
✅ BPP errors set `SpanStatusCode.ERROR`
✅ Missing traceparent logs warning, doesn't crash

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1-2 | f0d7702 | Integrate trace context into search/on_search flow |

## Testing Notes

**Manual verification deferred:**
This plan focused on code integration. Phase 5 (E2E Testing & Validation) will include:
- E2E test verifying traceparent storage during search
- E2E test verifying trace context restoration during on_search callback
- Manual SigNoz verification of linked spans
- Multi-BPP callback testing (multiple linked spans)

**Expected SigNoz behavior:**
1. Search by transactionId in SigNoz → see full trace waterfall
2. Trace contains:
   - Root span: `trpc.mutation.gateway.search`
   - Child: `ondc.search` (from gateway.search)
   - Child: `ondc.http.request` (ONDC client sending request)
   - Sibling: `ondc.on_search` (from BPP callback, linked to ondc.search)

## Next Phase Readiness

**Blocking issues:** None

**Recommendations for Phase 4 (Extend to Select/Init/Confirm):**
1. Follow the exact same pattern established in this plan:
   - Import `serializeTraceContext` in outbound procedures (select, init, confirm)
   - Call `serializeTraceContext()` inside `startActiveSpan` after setting attributes
   - Pass traceparent to respective store functions (createSelectEntry, etc.)
   - Import `getSearchEntry` → `getSelectEntry` (etc.) in callback procedures
   - Restore trace context with `restoreTraceContext(entry?.traceparent)`
   - Create linked span with `createLinkedSpanOptions()`
   - Wrap callback handler in `tracer.startActiveSpan()`

2. **No code changes to trace-context-store.ts needed** - utilities are reusable as-is

3. **Consider consolidating callback handler logic** - common pattern could be extracted to reduce duplication across on_select/on_init/on_confirm/on_status

## Key Decisions

### 1. Store traceparent inside startActiveSpan callback

**Context:** Need to serialize trace context during search procedure

**Options considered:**
- A) Call `serializeTraceContext()` before `startActiveSpan`
- B) Call `serializeTraceContext()` inside `startActiveSpan` callback (after setting attributes)
- C) Call `serializeTraceContext()` after `startActiveSpan` completes

**Decision:** Option B (inside startActiveSpan, after attributes)

**Rationale:**
- Active span context must be available for serialization
- Calling before span would capture parent context (tRPC procedure span, not ondc.search)
- Calling after span ends would capture nothing (span already cleaned up)
- Placement after `setAttribute` calls ensures all ONDC attributes are set first

### 2. Early return if no transaction_id (before trace restoration)

**Context:** onSearch callback can theoretically arrive without transactionId

**Options considered:**
- A) Proceed with trace restoration anyway (will fail gracefully)
- B) Early return before trace restoration

**Decision:** Option B (early return)

**Rationale:**
- No transactionId → can't retrieve search entry → traceparent unavailable anyway
- Avoid unnecessary Redis call (`getSearchEntry` would fail)
- Simpler code flow (clear intent: "no transactionId, can't correlate, ACK and exit")
- Original behavior preserved (callback still ACKs)

## Statistics

- **Files modified:** 1 (gateway.ts)
- **Lines added:** 68
- **Lines removed:** 14
- **Net change:** +54 lines
- **TypeScript errors introduced:** 0
- **Backward compatibility breaks:** 0
- **Functions added:** 0 (reused existing utilities)

## References

- **Plan 03-01-SUMMARY.md:** Trace context utilities and SearchEntry extension
- **CONTEXT.md Decision #2:** BPP identity attributes and NACK as ERROR
- **CONTEXT.md Decision #3:** Missing context as orphan trace
- **OpenTelemetry Span Links:** https://opentelemetry.io/docs/concepts/signals/traces/#span-links
- **W3C Trace Context:** https://www.w3.org/TR/trace-context/
