# Feature Landscape: Observability & Tracing for ONDC BAP

**Domain:** Distributed tracing for async webhook API service
**Researched:** 2026-02-09
**Confidence:** MEDIUM (based on industry-standard observability practices; external tool access unavailable for verification)

## Executive Summary

For an API service that makes outgoing requests and receives async callbacks (like ONDC BAP), observability features fall into three tiers:

1. **Table stakes** — Without these, you can't debug production issues or understand system behavior
2. **Differentiators** — Competitive advantages that accelerate debugging and improve operational confidence
3. **Anti-features** — Things that seem valuable but add complexity without commensurate benefit for this milestone

The ONDC BAP's architecture (outgoing requests → external processing → async webhook callbacks) makes trace correlation and request/response payload capture critical table stakes. Unlike typical microservices, the "transaction" spans multiple services with unpredictable timing, making timing analysis and error classification essential.

---

## Table Stakes

Features users expect. Missing these means observability is incomplete or unusable.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Distributed trace creation** | Every outgoing request (search, select, init, confirm, status) must create a trace | Low | OpenTelemetry SDK provides this |
| **Trace correlation via transactionId** | Callbacks must link to parent trace so full flow is visible | Medium | ONDC already threads transactionId through all requests |
| **HTTP instrumentation (auto)** | Automatic span creation for all HTTP requests/responses | Low | OpenTelemetry Express middleware |
| **Request/response payload capture** | Full headers + bodies in span attributes for debugging | Medium | Manual attribute setting; watch payload size |
| **Timing data** | Start time, end time, duration for every operation | Low | OpenTelemetry captures automatically |
| **Error status in spans** | Failed operations marked with error status + stack traces | Low | Standard OpenTelemetry error recording |
| **OTLP export** | Export traces to any OTLP-compatible backend (Jaeger, Tempo, Datadog, etc.) | Low | Standard exporter configuration |
| **Span hierarchy** | Child spans for Redis operations, signing, internal logic | Medium | Manual span creation for non-HTTP operations |
| **Context propagation** | Trace context flows through AsyncLocalStorage for tRPC handlers | Medium | Critical for linking tRPC procedures to HTTP request |
| **Structured logging with trace IDs** | Logs include traceId/spanId for correlation | Low | OpenTelemetry logger integration |

### Why These Are Table Stakes

**For ONDC BAP specifically:**
- **Async nature** — Callbacks arrive seconds to minutes after requests. Without trace correlation, impossible to know which search led to which on_search.
- **External dependencies** — BPPs/gateways are black boxes. Payload capture is the only way to see what they returned.
- **Debugging requirement** — User's transactionId is the query key. "Show me everything that happened for transaction X" must work.
- **Error attribution** — Is the failure ours (BAP), the gateway's, or the BPP's? Span hierarchy + timing reveals this.

---

## Differentiators

Features that set this observability implementation apart. Not expected, but highly valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **transactionId as root span name** | Makes traces searchable by business ID in Jaeger/Tempo UI | Low | Set span name on root span creation |
| **Error classification attributes** | Span attributes: `error.source` = "bap" \| "gateway" \| "bpp" | Low | Parse error response to determine source |
| **ONDC-specific span attributes** | `ondc.action`, `ondc.domain`, `ondc.bpp_id`, `ondc.item_id` | Medium | Makes traces queryable by ONDC context |
| **Payload size limits** | Truncate payloads >10KB to avoid span bloat | Low | Prevents backend overload |
| **Callback latency tracking** | Measure time between outgoing request and callback arrival | Medium | Store request timestamp in Redis, calculate on callback |
| **Redis operation spans** | Visibility into cache hits/misses, set/get operations | Medium | Manual span creation around ioredis calls |
| **Signing operation spans** | Visibility into Ed25519 signing time (usually <1ms but good to verify) | Low | Manual span around libsodium calls |
| **Sampling configuration** | Sample 100% in dev/staging, 10% in prod (configurable) | Low | Reduces backend costs in production |
| **Multi-backend export** | Export to both Jaeger (local dev) and cloud backend (prod) | Medium | Useful for hybrid setups |
| **Span links** | Link related transactions (e.g., select → init → confirm for same policy) | Medium | Requires storing previous traceIds in Redis |

### Why These Are Differentiators

**transactionId searchability** — Jaeger/Tempo UIs typically search by traceId (opaque UUID). Making transactionId the span name or a searchable attribute means users can paste their transactionId directly.

**Error source attribution** — When a BPP returns 500, distinguishing "gateway forwarded BPP error" from "gateway itself failed" saves debugging hours.

**ONDC-specific attributes** — Being able to filter traces by `ondc.bpp_id = "abc-insurance"` or `ondc.action = "search"` enables pattern analysis across transactions.

**Callback latency** — ONDC SLA requires callbacks within seconds. Measuring this reveals slow BPPs and timeout issues.

---

## Anti-Features

Features to explicitly NOT build. Common mistakes in observability implementations.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Custom dashboard UI** | Reinventing Jaeger/Grafana is high effort, low ROI | Use existing visualization tools (Jaeger, Grafana Tempo) |
| **In-process trace storage** | Memory/disk bloat; BAP becomes stateful | Export via OTLP to external backend |
| **PII redaction in spans** | Complex and fragile; easy to miss fields | Full payload logging for v2.0; defer redaction to production hardening |
| **Metrics collection** | Conflates tracing with metrics; different concerns | Focus on tracing first; add Prometheus metrics layer later |
| **Alerting** | Requires metrics + thresholds; premature for v2.0 | Observability first, alerting once patterns understood |
| **Frontend/browser tracing** | Adds JS bundle size + backend complexity | Server-side only; client tracing deferred to v3.0 |
| **Trace stitching across tenants** | Multi-tenancy not in scope for prototype | Single-tenant trace correlation sufficient |
| **Custom span processors** | Over-engineering; built-in processors sufficient | Use BatchSpanProcessor (OpenTelemetry default) |
| **Trace-based testing** | Asserting on spans in tests is brittle | Use E2E tests for behavior; traces for debugging only |

### Why These Are Anti-Features

**Custom dashboard** — OpenTelemetry's entire value is vendor-neutrality. Building a custom UI defeats this and locks you into your own implementation.

**PII redaction** — Insurance payloads contain names, Aadhaar numbers, medical history. Redacting reliably requires deep schema knowledge and is error-prone. For a prototype, full payloads enable debugging; production hardening can add redaction later.

**Metrics conflation** — Tracing answers "what happened?" (causality); metrics answer "how much?" (volume/rate). Mixing these adds complexity. Tracing first; metrics can layer on top once trace collection is stable.

**Frontend tracing** — Browser → BAP traces are useful but add JS bundle size, CORS complexity, and backend span volume. Server-side tracing covers the critical path (BAP → Gateway → BPP).

---

## Feature Dependencies

```
HTTP Instrumentation (auto)
    ↓
Trace Creation
    ↓
Context Propagation → Span Hierarchy
    ↓                       ↓
Trace Correlation      Child Spans (Redis, Signing)
    ↓
Payload Capture
    ↓
OTLP Export
    ↓
External Visualization (Jaeger, Tempo)
```

**Critical path:**
1. HTTP instrumentation must work first (auto-spans for tRPC requests)
2. Context propagation links tRPC procedures to root HTTP span
3. Manual child spans for non-HTTP operations (Redis, signing)
4. Payload capture adds debugging value
5. OTLP export makes traces visible externally

**Optional enhancements:**
- Error classification (layered on top of basic spans)
- ONDC attributes (query/filter enhancement)
- Callback latency (timing analysis)

---

## MVP Recommendation

For v2.0 observability milestone, prioritize:

### Phase 1: Core Tracing (Must Have)
1. OpenTelemetry SDK + Express instrumentation
2. Auto-spans for all HTTP requests (incoming tRPC, outgoing ONDC)
3. OTLP exporter to Jaeger (local dev) or Tempo (staging/prod)
4. Context propagation via AsyncLocalStorage
5. transactionId correlation (W3C baggage or span attributes)

### Phase 2: Payload & Hierarchy (High Value)
6. Request/response payload capture in span attributes
7. Child spans for Redis operations
8. Child spans for signing operations
9. Error status recording

### Phase 3: Enhancements (Nice to Have)
10. Error classification (BAP vs gateway vs BPP)
11. ONDC-specific span attributes
12. Callback latency measurement
13. Payload size truncation

### Defer to Post-MVP
- Sampling configuration (use 100% for prototype)
- Multi-backend export (single backend sufficient for v2.0)
- Span links (complex; low ROI for initial implementation)
- Structured logging integration (traces alone sufficient for debugging)

---

## Implementation Complexity

| Feature | Effort | Risk | Blocker? |
|---------|--------|------|----------|
| OpenTelemetry SDK setup | 2 hours | Low | No — standard integration |
| Express auto-instrumentation | 1 hour | Low | No — official package |
| Context propagation | 4 hours | Medium | **Yes** — tRPC + AsyncLocalStorage quirks |
| Payload capture | 3 hours | Medium | No — attribute setting |
| Redis spans | 3 hours | Low | No — wrap ioredis calls |
| Signing spans | 1 hour | Low | No — wrap libsodium calls |
| OTLP export config | 2 hours | Low | No — standard config |
| Error classification | 2 hours | Low | No — response parsing |
| ONDC attributes | 2 hours | Low | No — extract from payload |
| Callback latency | 3 hours | Medium | No — Redis timestamp storage |

**Total MVP (Phases 1-2):** ~16-20 hours

---

## Success Metrics

How do we know observability is "done"?

### Functional Criteria
- [ ] Given a transactionId, can view complete trace in Jaeger/Tempo
- [ ] Trace shows all ONDC actions (search, select, init, confirm, status)
- [ ] Each span includes request/response payloads
- [ ] Callbacks (on_search, on_select, etc.) linked to parent trace
- [ ] Redis operations visible as child spans
- [ ] Errors marked with span.status = error
- [ ] Timing data reveals bottlenecks (e.g., slow BPP responses)

### Debugging Scenarios
1. **User reports "quote never loaded"** → Trace shows on_select never arrived (gateway timeout)
2. **BPP returns 500** → Span attributes show BPP error message; error.source = "bpp"
3. **Redis is slow** → Redis span durations reveal cache latency spike
4. **Signing failed** → Signing span shows error + stack trace

### Non-Functional Criteria
- Trace export latency <5s (spans visible in Jaeger within seconds)
- No performance degradation (auto-instrumentation overhead <5%)
- No payload truncation for typical ONDC responses (<100KB)

---

## Sources

**Confidence: MEDIUM** — Based on industry-standard observability practices (OpenTelemetry standard, distributed tracing patterns, async system debugging requirements). External verification unavailable due to tool access restrictions.

**References (from training knowledge):**
- OpenTelemetry specification for trace semantics
- OpenTelemetry Node.js SDK documentation
- Distributed tracing best practices for webhook-based architectures
- OTLP exporter configuration patterns
- AsyncLocalStorage usage with Express middleware

**Domain-specific reasoning:**
- ONDC BAP architecture (outgoing requests + async callbacks) requires trace correlation
- transactionId already threads through ONDC protocol (natural correlation key)
- Insurance payloads contain PII (redaction complexity noted)
- External dependencies (gateways, BPPs) are opaque (payload capture essential)

**Gaps requiring validation:**
- OpenTelemetry + tRPC integration patterns (may have quirks)
- AsyncLocalStorage propagation through tRPC procedure calls
- OTLP exporter performance characteristics at scale
- Optimal payload size limits for span attributes

---

*Features analysis for observability milestone | Based on OpenTelemetry standards & async webhook patterns | 2026-02-09*
