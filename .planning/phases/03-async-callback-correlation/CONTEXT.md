# Phase 3: Async Callback Correlation - Context

**Gathered:** 2026-02-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Link ONDC callbacks (on_search) back to their originating request traces via transactionId stored in Redis. This phase implements the pattern for the search/on_search flow only — Phase 4 extends it to select, init, confirm, and status.

The core challenge: ONDC callbacks are separate HTTP requests from BPP servers. They don't carry the original trace context. We bridge the gap by storing trace context in Redis keyed by transactionId, then restoring it when callbacks arrive.

</domain>

<decisions>
## Implementation Decisions

### 1. Trace linking strategy
- **Single trace**: Restore the original traceId so on_search appears in the same trace tree as the originating search request
- **Sibling placement**: on_search span is a sibling of the original tRPC span (child of root), not a child of ondc.search
- **Span link to ended span**: Store the spanId from the ondc.search span. The callback span gets a SpanLink referencing the original span (not parent-child, since the original span has already ended)
- **Debugging flow**: Search by transactionId in SigNoz, see everything in one trace waterfall — request + all callbacks

### 2. Multi-BPP response handling
- **Parallel siblings**: Each BPP's on_search callback creates its own span at the same level, all sharing the same restored traceId. Trace waterfall shows them as concurrent events
- **BPP identity**: Tag each on_search span with `ondc.bpp_id` and `ondc.bpp_uri` from the callback context
- **NACK as ERROR**: BPP NACK/error responses set SpanStatusCode.ERROR with the BPP's error message. Transport failures (network error, malformed JSON) are also ERROR
- **No payload size attribute**: Auto-instrumentation HTTP spans already capture payload data

### 3. Missing context behavior
- **Orphan trace on missing context**: If no trace context exists in Redis for a transactionId, create a new trace with a fresh traceId. Callback data is still captured, just not linked to the original
- **Console.warn on missing context**: Log a warning when trace context is missing so it's visible but doesn't fail the callback
- **30-minute TTL**: Trace context TTL is 30 minutes (longer than search entry's 10 min TTL) to catch late-arriving BPP callbacks
- **Always store**: Store trace context regardless of SDK state (even no-op). Simplest code path, no conditional logic

### 4. Context storage design
- **Embedded in search entry**: Add W3C traceparent string as a field in the existing search entry object. Callback reads it via getSearchEntry() — no extra Redis call
- **W3C traceparent format**: Store the full traceparent string (`version-traceId-spanId-flags`). Standard format, easy to parse
- **Utility module**: Create a `trace-context-store.ts` utility that handles OTel-specific logic (serializing/parsing traceparent, creating spans with restored context). Phase 4 reuses this for select/init/confirm
- **Atomic storage**: Modify createSearchEntry() to accept optional trace context parameter. Stored in the same Redis write — one round-trip

### Claude's Discretion
- W3C traceparent parsing implementation details
- Exact span attribute names for callback spans (beyond the decided ondc.bpp_id, ondc.bpp_uri)
- Error message formatting for NACK responses
- Internal structure of trace-context-store.ts utility module

</decisions>

<specifics>
## Specific Ideas

- Search entry already stores transactionId, messageId, categoryCode, timestamps — adding traceparent is a natural extension
- The callback handler in gateway.ts extracts transactionId from `input.context.transaction_id` — this is the lookup key
- addSearchResponse() already calls getSearchEntry() internally — trace context is available without extra work
- Existing Pub/Sub pattern (`search:{transactionId}:updates`) is unaffected by this change
- Phase 2 established the tracer naming convention: `trace.getTracer("ondc-bap", "0.1.0")`

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 03-async-callback-correlation*
*Context gathered: 2026-02-10*
