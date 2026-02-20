# Phase 4: Comprehensive Coverage - Context

**Gathered:** 2026-02-13
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend the tracing pattern established in Phase 3 (search/on_search) to all remaining ONDC flows: select/on_select, init/on_init, confirm/on_confirm, status/on_status. Add Ed25519 signing spans and enriched attributes. No new tracing infrastructure — purely replicating and wiring existing patterns.

**Scope:**
- 4 outbound procedures (select, init, confirm, status) get traceparent storage
- 4 callback handlers (on_select, on_init, on_confirm, on_status) get trace restoration + linked spans
- Ed25519 signing gets per-call spans inside the HTTP client
- `ondc.payment_url` attribute on on_confirm spans
- All stores extended with traceparent field and 30-min TTL

**Not in scope:**
- New tracing infrastructure (done in Phases 1-3)
- Payload capture on business logic spans (HTTP auto-instrumentation handles it)
- Truncation limits (deferred — revisit if span drops occur)
- Frontend/browser tracing (deferred to v2.x)

</domain>

<decisions>
## Implementation Decisions

### 1. Store Extension Pattern
- **Decision:** Uniform treatment for all stores
- **Details:** select-store, init-store, confirm-store, and status-store all get:
  - `traceparent?: string` field on their entry interface
  - Optional `traceparent` parameter on `create*Entry()`
  - `DEFAULT_STORE_TTL_MS` extended to 30 minutes (matching search-store)
- **Rationale:** One transactionId search in SigNoz shows the entire user journey end-to-end. Later stages (payment, policy issuance) are the ones that break most — they need correlation the most.

### 2. Signing Span Granularity
- **Decision:** One span per `signMessage()` call, minimal attributes, inside the HTTP client
- **Details:**
  - Each `signMessage()` invocation creates an `ondc.sign` child span of the HTTP request span
  - Attributes: timing only (span duration). No algorithm name, key ID, or message size.
  - Span lives inside `client.ts` where signing actually happens
  - Skip startup DH shared secret computation — one-time boot operation, not useful in request traces
- **Rationale:** Signing is a per-request operation that could be a latency bottleneck. Timing visibility is sufficient for debugging.

### 3. Callback Span Pattern
- **Decision:** Same linked span pattern for ALL callbacks, uniform error handling
- **Details:**
  - on_select, on_init, on_confirm, on_status use identical code pattern as on_search
  - All callbacks get linked spans with BPP identity attributes (bpp_id, bpp_uri)
  - Single-BPP flows (select onwards) will naturally have one span instead of many
  - Each on_status poll response gets its own linked span (trace shows polling timeline)
  - Duplicate callbacks (BPP retries) always create spans — retries visible in trace, useful for debugging
  - All callbacks check `input.error` and set `SpanStatusCode.ERROR` uniformly
- **Rationale:** Consistent code pattern across all flows. No special-casing reduces bugs. Retry visibility is valuable.

### 4. Payload Capture Strategy
- **Decision:** HTTP-level only, no payload on callback spans, no truncation limits for now
- **Details:**
  - Outbound payloads: Already captured by HTTP auto-instrumentation on `ondc.http.request` spans (Phase 2)
  - Business logic spans (`ondc.select`, `ondc.init`, etc.): No payload duplication — only ONDC attributes (transactionId, action, etc.)
  - Callback spans: No `input` payload capture — HTTP auto-instrumentation already has the inbound request body
  - Truncation: Skip 16KB limit for now to move fast. Revisit if span drops occur in production.
  - Exception: `ondc.payment_url` captured as dedicated attribute on on_confirm spans for easy SigNoz filtering
- **Rationale:** Avoid redundant data. HTTP spans already capture bodies. Business logic spans add semantic context (attributes) not raw payloads.

### Claude's Discretion
- Exact order of store extensions (can parallelize or sequence)
- Whether to extract a shared callback handler helper to reduce duplication
- Signing span naming convention (`ondc.sign` vs `ondc.crypto.sign`)
- How to handle stores that may have different `create*Entry()` signatures

</decisions>

<specifics>
## Specific Ideas

- ONDC FIS13 spec: Intermediary/broker ID (`fulfillment.agent.person.id`) is sent only in search. Subsequent flows use transactionId for correlation. No need to propagate broker ID in trace attributes beyond the search span.
- Phase 3's on_search pattern (03-02-SUMMARY.md) is the template: import utilities, getEntry, restoreTraceContext, createLinkedSpanOptions, startActiveSpan with SpanKind.SERVER
- Consider extracting a `wrapCallbackWithTrace()` helper since all 5 callback handlers follow the same pattern

</specifics>

<deferred>
## Deferred Ideas

- Payload truncation limits (revisit if SigNoz drops spans due to size)
- Flow-specific error severity (on_confirm errors more critical than on_search)
- Signing span enrichment (algorithm, key ID) if timing alone proves insufficient

</deferred>

---

*Phase: 04-comprehensive-coverage*
*Context gathered: 2026-02-13*
