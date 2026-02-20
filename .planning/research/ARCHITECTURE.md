# Architecture: OpenTelemetry Integration for ONDC BAP

**Project:** ONDC Health Insurance BAP - Observability (v2.0)
**Researched:** 2026-02-09
**Confidence:** MEDIUM

## Executive Summary

OpenTelemetry integration into the existing Express + tRPC + Redis stack requires:
1. SDK initialization before all other imports (`server/src/tracing.ts`)
2. Auto-instrumentation for HTTP/Express/ioredis (zero-code)
3. Manual spans for tRPC procedures and ONDC business logic
4. Async callback correlation via Redis-stored trace context
5. OTLP export to Jaeger/Tempo

The main architectural challenge is linking async ONDC callbacks (on_search, on_select, etc.) back to their originating request traces via transactionId.

## Current Architecture (Tracing Touchpoints)

```
Client (React) ─── tRPC ───> Express Server
                               │
                    ┌──────────┴──────────┐
                    │    tRPC Routers      │
                    │  gateway.*           │ ← Manual spans needed
                    │  results.*           │
                    │  registry.*          │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
         ONDC Client      Redis Stores      Tenant
         (fetch)          (ioredis)         (signing)
         ← Auto-span     ← Auto-span      ← Manual span
              │
              ↓
    ONDC Gateway / BPPs
         (external)
              │
              ↓ (async callback)
    Express callback routes
         ← Need trace linking
```

## Target Architecture

```
┌─────────────────────────────────────────────────────┐
│              server/src/tracing.ts                    │
│  NodeSDK + AutoInstrumentations + OTLP Exporter     │
│  MUST be imported before all other code              │
└─────────────────────┬───────────────────────────────┘
                      │
┌─────────────────────┴───────────────────────────────┐
│                  Express Server                       │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  Auto-Instrumented (zero-code)               │    │
│  │  - HTTP incoming/outgoing requests           │    │
│  │  - Express middleware + route handlers        │    │
│  │  - ioredis commands (GET, SET, HSET, etc.)   │    │
│  │  - DNS lookups                                │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  Manually Instrumented                        │    │
│  │  - tRPC procedure spans (gateway.search, etc.)│    │
│  │  - ONDC request spans (with transactionId)    │    │
│  │  - Callback trace linking (via Redis lookup)  │    │
│  │  - Ed25519 signing spans                      │    │
│  │  - Error classification (BAP/gateway/BPP)     │    │
│  └─────────────────────────────────────────────┘    │
│                                                       │
│  ┌─────────────────────────────────────────────┐    │
│  │  Trace Context Storage (Redis)                │    │
│  │  trace:tx:{transactionId} → { traceId,       │    │
│  │    spanId, createdAt }                        │    │
│  │  TTL: 24h (matches ONDC transaction TTL)      │    │
│  └─────────────────────────────────────────────┘    │
└───────────────────────┬─────────────────────────────┘
                        │ OTLP HTTP
                        ↓
              ┌─────────────────┐
              │  Jaeger / Tempo  │
              │  (port 4318)     │
              └─────────────────┘
```

## Key Integration Points

### 1. Initialization (tracing.ts)

Must be the **first import** in `server/src/index.ts`. OpenTelemetry patches module loaders — if Express/ioredis are imported first, auto-instrumentation won't work.

```
server/src/index.ts
  import './tracing';     // FIRST
  import express from ...  // After tracing
  import { app } from ... // After tracing
```

### 2. tRPC Procedure Instrumentation

No official tRPC instrumentation exists. tRPC procedures appear as Express HTTP spans automatically. For procedure-level detail, wrap with manual spans:

```
HTTP span (auto) → Express route span (auto) → tRPC procedure span (manual)
                                                  └→ ONDC client span (manual)
                                                  └→ Redis span (auto)
                                                  └→ Signing span (manual)
```

### 3. Async Callback Trace Correlation

The critical architectural challenge. ONDC uses async webhooks:

```
Request flow:   BAP → Gateway → BPP     (creates trace T1)
Callback flow:  BPP → BAP               (separate HTTP request, new trace T2)
```

**Solution:** Store trace context in Redis keyed by transactionId:

1. On outgoing request (search/select/init/confirm/status):
   - Get active span's traceId + spanId
   - Store in Redis: `trace:tx:{transactionId}` → `{ traceId, spanId }`

2. On incoming callback (on_search/on_select/on_init/on_confirm/on_status):
   - Extract transactionId from callback payload
   - Lookup stored traceId from Redis
   - Create span link to original trace

### 4. ONDC-Specific Span Attributes

Custom attributes for ONDC queryability:

| Attribute | Example | Purpose |
|-----------|---------|---------|
| `ondc.transaction_id` | `019b-...` | Primary correlation key |
| `ondc.message_id` | `msg-...` | Per-request identifier |
| `ondc.action` | `search`, `on_search` | Protocol action |
| `ondc.domain` | `ONDC:FIS13` | Domain code |
| `ondc.bpp_id` | `abc-insurance` | BPP identifier |
| `error.source` | `bap`, `gateway`, `bpp` | Error attribution |

### 5. Redis Key Additions

New keys for trace context storage alongside existing transaction data:

| Key Pattern | Value | TTL |
|-------------|-------|-----|
| `trace:tx:{transactionId}` | `{ traceId, spanId, createdAt }` | 24h |

Uses existing `TenantKeyValueStore` — no new infrastructure needed.

## Anti-Patterns to Avoid

1. **Don't instrument trivial operations** (<1ms computational functions)
2. **Don't create separate traces for callbacks** — link them to the parent trace
3. **Don't store full payloads in span attributes without size limits** — truncate at 10KB
4. **Don't use `--require` flag** — use programmatic setup for type safety
5. **Don't install individual instrumentation packages** alongside auto-instrumentations

## Build Order (5 Phases)

### Phase 1: SDK Foundation
- Install packages, create `tracing.ts`, modify entry point
- Verify: HTTP/Express/Redis spans appear in Jaeger
- Effort: 1-2 hours

### Phase 2: tRPC + ONDC Spans
- Manual spans for gateway procedures
- Add transactionId attributes
- Effort: 2-4 hours

### Phase 3: Async Callback Correlation
- Trace context storage in Redis
- Callback handlers restore parent context
- Effort: 3-5 hours (highest risk)

### Phase 4: Comprehensive Coverage
- Instrument all ONDC flows (select, init, confirm, status)
- Add signing spans, enrich attributes
- Effort: 4-6 hours

### Phase 5: Error Classification & Logging
- Error source attribution (BAP/gateway/BPP)
- Structured logging with trace context
- Effort: 2-3 hours

**Total: 12-20 hours**

## Open Questions

1. Does tRPC 11.x AsyncLocalStorage context carry OTel context automatically?
2. How to handle trace fan-out when multiple BPPs respond to one search?
3. Performance overhead of full payload logging for multi-KB ONDC payloads?

## Sources

- Training knowledge (OpenTelemetry patterns, Node.js async context)
- Codebase analysis (Express 5.x, tRPC 11.x, ioredis 5.x structure)
- Confidence: MEDIUM (async callback correlation is a custom pattern)

---
*Architecture analysis for v2.0 Observability | 2026-02-09*
