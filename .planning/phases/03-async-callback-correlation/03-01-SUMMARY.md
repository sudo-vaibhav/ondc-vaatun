---
phase: 03-async-callback-correlation
plan: 01
subsystem: observability
completed: 2026-02-10
duration: 11 minutes

tags:
  - opentelemetry
  - trace-context
  - w3c-traceparent
  - async-correlation
  - redis-storage

requires:
  - 02-01-PLAN.md (tRPC tracing middleware)
  - 02-02-PLAN.md (ONDC search span)

provides:
  - Trace context serialization/restoration utilities
  - SearchEntry with traceparent field
  - 30-minute TTL for late-arriving callbacks

affects:
  - 03-02-PLAN.md (will use trace-context-store.ts utilities)
  - 04-xx-PLAN.md (Phase 4 extends pattern to select/init/confirm)

tech-stack:
  added:
    - "@opentelemetry/api propagation API for W3C trace context"
  patterns:
    - "W3C traceparent format for trace context storage"
    - "SpanLink relationship for async callback correlation"

key-files:
  created:
    - server/src/lib/trace-context-store.ts
  modified:
    - server/src/lib/search-store.ts

decisions:
  - id: 03-01-001
    choice: "Use OpenTelemetry propagation API for traceparent serialization"
    rationale: "Standard W3C format, automatic handling of traceId/spanId/flags"
    date: 2026-02-10
  - id: 03-01-002
    choice: "Embed traceparent in SearchEntry (not separate Redis key)"
    rationale: "Atomic storage, no extra Redis call, reuses getSearchEntry() flow"
    date: 2026-02-10
  - id: 03-01-003
    choice: "Extend DEFAULT_STORE_TTL_MS from 10 to 30 minutes"
    rationale: "Catch late-arriving BPP callbacks per CONTEXT.md decision #3"
    date: 2026-02-10
---

# Phase 3 Plan 01: Trace Context Storage Foundation Summary

**One-liner:** W3C traceparent serialization utilities and SearchEntry extension for async callback correlation

## What Was Built

This plan establishes the foundational infrastructure for correlating async ONDC callbacks with their originating requests:

1. **Trace context utility module** (`trace-context-store.ts`):
   - `serializeTraceContext()`: Captures W3C traceparent from active span using OTel propagation API
   - `restoreTraceContext()`: Reconstructs SpanContext from stored traceparent string
   - `createLinkedSpanOptions()`: Creates SpanOptions with SpanLink for async callback correlation

2. **Extended SearchEntry data model**:
   - Added optional `traceparent` field (backward-compatible)
   - Modified `createSearchEntry()` to accept traceparent parameter
   - Increased `DEFAULT_STORE_TTL_MS` from 10 to 30 minutes

**Key insight:** By embedding traceparent in the existing search entry object, we achieve atomic storage with no extra Redis calls. The callback handler already calls `getSearchEntry()`, so trace context is immediately available.

## Implementation Notes

### Trace Context Store Design

The utility module leverages OpenTelemetry's propagation API rather than manually parsing W3C traceparent strings:

```typescript
// Serialization - let OTel handle the format
const carrier: Record<string, string> = {};
propagation.inject(context.active(), carrier);
return carrier.traceparent; // "00-traceId-spanId-flags"

// Restoration - OTel sets isRemote: true automatically
const carrier = { traceparent };
const extractedContext = propagation.extract(context.active(), carrier);
const spanContext = trace.getSpanContext(extractedContext);
```

This approach:
- Avoids manual string parsing (error-prone, brittle)
- Ensures compliance with W3C Trace Context specification
- Automatically handles future format changes
- Sets `isRemote: true` on restored SpanContext (correct for cross-process correlation)

### SearchEntry Extension

The changes to `search-store.ts` are minimal and backward-compatible:

```typescript
export interface SearchEntry {
  // ... existing fields ...
  traceparent?: string; // NEW: optional field
}

export async function createSearchEntry(
  // ... existing parameters ...
  traceparent?: string, // NEW: optional parameter
): Promise<SearchEntry> {
  const entry: SearchEntry = {
    // ... existing fields ...
    traceparent, // NEW: stored atomically with entry
  };
  await kv.set(key, entry, { ttlMs: DEFAULT_STORE_TTL_MS });
}
```

**Backward compatibility:**
- Existing code without traceparent continues to work (field is optional)
- Pre-existing search entries can be read (missing field is undefined)
- TTL increase affects all entries uniformly (simpler than per-entry TTL)

### TTL Increase Rationale

Extended `DEFAULT_STORE_TTL_MS` from 10 to 30 minutes based on CONTEXT.md decision #3:

**Why 30 minutes?**
- BPP callbacks can arrive late due to network delays, retries, or slow processing
- 10-minute TTL was too aggressive for the async nature of ONDC callbacks
- 30 minutes provides buffer while still preventing indefinite storage
- Same TTL applies to both search entries and their responses (simplicity)

**Impact:**
- Slightly higher Redis memory usage (mitigated by TTL)
- Better callback capture rate (fewer "orphan trace" scenarios)

## Deviations from Plan

None - plan executed exactly as written.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | 358402a | Create trace context utility module |
| 2 | a372b6c | Extend SearchEntry with traceparent and 30-minute TTL |

## Testing Notes

**Verification performed:**
- TypeScript compilation: No errors in modified files
- Exported functions: All three utilities present (serialize, restore, createLinked)
- SearchEntry interface: traceparent field exists
- DEFAULT_STORE_TTL_MS: Value is 30 * 60 * 1000 (30 minutes)

**Testing deferred to Plan 03-02:**
Plan 03-02 will integrate these utilities into the actual search/on_search flow. That plan will include:
- E2E test verifying traceparent storage during search
- E2E test verifying trace context restoration during on_search callback
- Manual SigNoz verification of linked spans

## Next Phase Readiness

**Blocking issues:** None

**Recommendations for 03-02:**
1. Import `serializeTraceContext()` in the search procedure (after `startActiveSpan`)
2. Pass traceparent to `createSearchEntry()` in the same block
3. Import `restoreTraceContext()` and `createLinkedSpanOptions()` in onSearch handler
4. Extract traceparent via `getSearchEntry()` (already called for response storage)
5. Create callback span with restored context using `createLinkedSpanOptions()`

**Pattern for Phase 4 (select/init/confirm):**
This exact pattern repeats for other gateway operations:
- Serialize trace context when creating entry (select-store, init-store, etc.)
- Restore trace context when callback arrives (on_select, on_init, etc.)
- Reuse the same three utility functions (no duplication)

## Key Decisions

### 1. Use OpenTelemetry propagation API for traceparent serialization

**Context:** Need to store trace context in Redis for async callback correlation

**Options considered:**
- A) Manual traceparent string construction (format: `00-${traceId}-${spanId}-${flags}`)
- B) Use OpenTelemetry propagation.inject/extract API
- C) Store full SpanContext object as JSON

**Decision:** Option B (propagation API)

**Rationale:**
- Standard W3C format guaranteed
- Automatic handling of version, flags, and future format changes
- Less code, fewer bugs
- `isRemote: true` set automatically on restore

### 2. Embed traceparent in SearchEntry (not separate Redis key)

**Context:** Need to store trace context alongside search metadata

**Options considered:**
- A) Separate Redis key: `trace:{transactionId}` → traceparent string
- B) Embed in SearchEntry object: add `traceparent?: string` field

**Decision:** Option B (embedded field)

**Rationale:**
- Atomic storage: traceparent written in same Redis SET as search entry
- No extra Redis call: `getSearchEntry()` already retrieves it
- Simpler cleanup: single TTL handles both entry and trace context
- Logical grouping: trace context is metadata about the search

### 3. Extend DEFAULT_STORE_TTL_MS from 10 to 30 minutes

**Context:** BPP callbacks can arrive late due to async nature of ONDC

**Options considered:**
- A) Keep 10-minute TTL (existing value)
- B) Extend to 30 minutes
- C) Make TTL configurable per search

**Decision:** Option B (30 minutes, applied uniformly)

**Rationale:**
- 10 minutes too aggressive for late-arriving BPP callbacks
- 30 minutes provides buffer while still preventing indefinite storage
- Uniform TTL simpler than per-entry configuration
- CONTEXT.md decision #3 explicitly recommends this

## Statistics

- **Files created:** 1 (trace-context-store.ts)
- **Files modified:** 1 (search-store.ts)
- **Lines added:** ~110 (including comments)
- **TypeScript errors introduced:** 0
- **Backward compatibility breaks:** 0

## References

- **OpenTelemetry Propagation API:** https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_api.html#propagation
- **W3C Trace Context Spec:** https://www.w3.org/TR/trace-context/
- **CONTEXT.md Decision #3:** 30-minute TTL for late-arriving callbacks
- **CONTEXT.md Decision #4:** Embed traceparent in search entry (atomic storage)
