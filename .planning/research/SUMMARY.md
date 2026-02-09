# Research Summary: v2.0 Observability & Traceability

**Research Date:** 2026-02-09
**Sources:** OpenTelemetry docs, npm registry, codebase analysis, ONDC FIS13 spec
**Confidence:** MEDIUM-HIGH (stack decisions HIGH, async patterns MEDIUM)

## Key Findings

### Stack
- **6 packages needed** — `@opentelemetry/sdk-node`, `api`, `auto-instrumentations-node`, `instrumentation`, `exporter-trace-otlp-http`, `semantic-conventions`
- **Use HTTP exporter** over gRPC — simpler, fewer deps, works with Jaeger/Tempo
- **No tRPC instrumentation exists** — procedures appear as Express spans; manual wrapping needed
- **Express 5.x + ioredis 5.x** are supported by auto-instrumentations

### Features (Prioritized)
| Tier | Features |
|------|----------|
| **Table stakes** | Distributed traces, transactionId correlation, HTTP auto-spans, payload capture, timing, error status, OTLP export, span hierarchy, context propagation, structured logging |
| **Differentiators** | transactionId as searchable attribute, error classification (BAP/gateway/BPP), ONDC-specific attributes, callback latency tracking |
| **Anti-features** | Custom dashboard UI, PII redaction, metrics collection, frontend tracing, in-process storage |

### Architecture
- **`server/src/tracing.ts`** — new file, imported first in entry point
- **Auto-instrumented**: HTTP, Express, ioredis (zero-code)
- **Manual spans**: tRPC procedures, ONDC business logic, Ed25519 signing
- **Async callback correlation**: Store traceId in Redis keyed by transactionId, restore on callback
- **New Redis keys**: `trace:tx:{transactionId}` (24h TTL)

### Critical Pitfalls
1. **ESM import order** — tracing.ts MUST be first import (silent failure otherwise)
2. **tRPC context loss** — spans orphaned without tracing middleware
3. **Webhook trace propagation** — callbacks create new traces without Redis-based linking
4. **Span size limits** — ONDC payloads can be 50-200KB, need truncation
5. **Redis key details** — default instrumentation omits key names

## Recommended Build Order

```
Phase 1: SDK Foundation (1-2h)
  Install packages, create tracing.ts, verify auto-spans in Jaeger
    ↓
Phase 2: Core Instrumentation (2-4h)
  tRPC tracing middleware, ONDC span attributes, transactionId correlation
    ↓
Phase 3: Async Callback Correlation (3-5h) ← Highest risk
  Redis trace context storage, callback linking, payload capture
    ↓
Phase 4: Comprehensive Coverage (4-6h)
  All ONDC flows instrumented, signing spans, enriched attributes
    ↓
Phase 5: Error Classification & Logging (2-3h)
  BAP/gateway/BPP error attribution, structured logging with trace context
```

**Total estimated: 12-20 hours**

## Decision Recommendations

| Decision | Recommendation | Rationale |
|----------|---------------|-----------|
| SDK approach | `@opentelemetry/sdk-node` (unified) | Simpler than manual assembly, better defaults |
| Exporter | OTLP HTTP | Fewer deps than gRPC, works everywhere |
| Configuration | Programmatic (`tracing.ts`) | Type safety, conditional env logic |
| tRPC tracing | Manual middleware | No official instrumentation exists |
| Callback correlation | Redis-stored trace context | transactionId already threads through ONDC protocol |
| Payload capture | Full with 16KB truncation | Debugging value outweighs storage cost |
| Trace backend | Jaeger (dev), configurable via env | OTLP means any backend works |

## Risk Areas

| Risk | Impact | Mitigation |
|------|--------|------------|
| tRPC + OTel context propagation | HIGH | Test AsyncLocalStorage flow early |
| Express 5.x auto-instrumentation | MEDIUM | Test and fallback to manual if needed |
| Payload size causing span drops | MEDIUM | Configure spanLimits, truncate attributes |
| Fetch instrumentation gaps | MEDIUM | Verify outgoing ONDC calls create spans |

## Open Questions

1. Does tRPC 11.x AsyncLocalStorage carry OTel context automatically?
2. How does trace fan-out work with multiple BPP responses?
3. Performance overhead of full payload capture at scale?

## Done Criteria

Given any transactionId, you can:
- See the complete request chain (search → on_search → select → on_select → ... ) in Jaeger/Tempo
- View request/response payloads for each step
- See timing for each operation (Redis, signing, HTTP, BPP response)
- Identify error source (BAP, gateway, or BPP)
- Query by ONDC attributes (bpp_id, action, domain)

---
*Research synthesized: 2026-02-09 | 4 dimensions: Stack, Features, Architecture, Pitfalls*
