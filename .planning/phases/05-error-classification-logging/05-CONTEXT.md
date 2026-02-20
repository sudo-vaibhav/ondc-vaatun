# Phase 5: Error Classification & Logging - Context

**Gathered:** 2026-02-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Classify errors by source (BAP/gateway/BPP/network) on spans, and replace console.log with structured pino logging correlated to traces via traceId/spanId. This phase does NOT add new tracing spans — it enriches existing spans with error attribution and adds a structured logging layer.

</domain>

<decisions>
## Implementation Decisions

### Error source classification
- 4 error sources: `bap` (our validation errors), `bpp` (BPP 4xx/5xx responses), `gateway` (ONDC registry/routing failures), `network` (timeouts, unreachable endpoints)
- Classification by HTTP status code: 4xx/5xx from BPP = `bpp`, timeouts = `network`, registry/routing failures = `gateway`, our validation errors = `bap`
- Gateway is a catch-all for "not our fault and not BPP"
- Network is specifically for connectivity failures (timeouts, DNS, connection refused)
- Classification logic centralized in the ONDC HTTP client (one place classifies all outbound errors)

### Structured logging approach
- Use **pino** as the logging library (fast JSON, good OTel integration)
- Output format: pretty-printed for development, JSON lines for production (configurable via NODE_ENV or env var)
- Every log line includes: traceId, spanId, level, message, timestamp (minimal fields)
- Do NOT add transactionId/action to log lines — traces already carry ONDC context
- Replace ALL console.log/console.error/console.warn calls in server/src/ with structured pino logger
- Startup/config logs keep existing behavior, just migrated to pino

### Error span enrichment
- Always capture stack traces on error spans (all error sources)
- Use `span.recordException()` for ALL errors (creates exception events with stack traces)
- BPP NACK responses: capture the full NACK error object as a span attribute
- Minimal error attributes: `error.source`, `error.message`, `error.code` (if available)
- Do NOT add verbose attributes like error.type, error.bpp_response, http.status_code beyond what already exists

### Log level strategy
- **info**: Every outbound ONDC request (search, select, init, confirm, status)
- **info**: Every callback arrival (on_search, on_select, on_init, on_confirm, on_status)
- **warn**: BPP NACK/error responses in callbacks (BPP's problem, not critical for us)
- **error**: BAP-side exceptions (our code failures)
- Startup/config logs: keep existing behavior as-is, just migrate to pino

### Claude's Discretion
- Pino configuration details (transport setup, serializers)
- How to inject traceId/spanId into pino context (OTel pino instrumentation or manual)
- Error classification helper function signature and location
- Migration order for console.log replacement

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches for pino setup and error classification patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-error-classification-logging*
*Context gathered: 2026-02-15*
