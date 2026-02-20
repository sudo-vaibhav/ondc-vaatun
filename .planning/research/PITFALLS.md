# Pitfalls: OpenTelemetry Integration for ONDC BAP

**Project:** ONDC Health Insurance BAP - Observability (v2.0)
**Researched:** 2026-02-09
**Confidence:** MEDIUM

## Executive Summary

OpenTelemetry integration has 5 critical pitfalls and 6 moderate ones. The most dangerous are ESM import order (silent failure), tRPC context loss (orphaned spans), and async webhook trace propagation (broken correlation). All are preventable with awareness.

## Critical Pitfalls

### 1. ESM Import Order Violation

**What goes wrong:** Auto-instrumentation silently fails. No spans appear for Express, HTTP, or ioredis.

**Why it happens:** OpenTelemetry must patch module loaders BEFORE target libraries are imported. If Express imports before `tracing.ts`, the monkey-patching misses it.

**Specific to this stack:**
- `server/src/index.ts` currently imports `./app` which imports Express
- Dev uses `tsx --env-file ../.env src/index.ts` which runs entry point directly

**Prevention:**
```typescript
// server/src/index.ts
import './tracing';        // MUST be first import
import { app } from './app'; // After tracing
```

**Detection:** No HTTP/Express spans in Jaeger despite requests working. Enable `OTEL_LOG_LEVEL=debug` to verify instrumentation loaded.

---

### 2. tRPC Context Loss (Orphaned Spans)

**What goes wrong:** Manual spans created inside tRPC procedures are not children of the HTTP request span. They appear as separate root traces.

**Why it happens:** tRPC middleware may break Node.js AsyncLocalStorage chain. If trace context is lost between Express handler and tRPC procedure, spans become orphaned.

**Prevention:** Create a tRPC middleware that explicitly carries trace context:

```typescript
// server/src/trpc/tracing-middleware.ts
import { trace, context } from '@opentelemetry/api';

export const tracingMiddleware = t.middleware(async ({ path, type, next }) => {
  const tracer = trace.getTracer('ondc-bap');
  return tracer.startActiveSpan(`trpc.${path}`, async (span) => {
    span.setAttribute('rpc.method', path);
    span.setAttribute('rpc.type', type);
    try {
      const result = await next();
      return result;
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR });
      throw error;
    } finally {
      span.end();
    }
  });
});
```

**Detection:** Span appears as root (no parent) in Jaeger. Should be child of HTTP span.

---

### 3. Async Webhook Trace Propagation Failure

**What goes wrong:** on_search, on_select callbacks create new traces instead of linking to the original search/select trace.

**Why it happens:** ONDC callbacks arrive as separate HTTP requests from BPPs. There's no W3C traceparent header (BPPs don't propagate it). The only correlation key is transactionId.

**Prevention:**

1. On outgoing request: Store trace context in Redis
```typescript
const span = trace.getActiveSpan();
await redis.set(`trace:tx:${transactionId}`, JSON.stringify({
  traceId: span.spanContext().traceId,
  spanId: span.spanContext().spanId,
}), 'EX', 86400);
```

2. On callback: Restore parent context via span link
```typescript
const stored = await redis.get(`trace:tx:${transactionId}`);
if (stored) {
  const { traceId } = JSON.parse(stored);
  const carrier = { traceparent: `00-${traceId}-...-01` };
  const parentContext = propagation.extract(ROOT_CONTEXT, carrier);
  // Create span with link to parent
}
```

**Detection:** Callbacks appear as separate traces in Jaeger. Query by transactionId shows 2+ unlinked traces.

---

### 4. Large Span Attribute Size Limits

**What goes wrong:** ONDC payloads (especially on_search with multiple providers) can be 50-200KB. Spans with full payloads get silently dropped by exporters or backends.

**Why it happens:** OTLP has default attribute value limits. BatchSpanProcessor may drop oversized spans.

**Prevention:**
```typescript
// Configure span limits in SDK initialization
const sdk = new NodeSDK({
  spanLimits: {
    attributeValueLengthLimit: 16384, // 16KB max per attribute
  },
});

// Truncate payloads before setting attributes
function safeSetPayload(span, key, payload) {
  const json = JSON.stringify(payload);
  span.setAttribute(key, json.length > 16000 ? json.slice(0, 16000) + '...[truncated]' : json);
}
```

**Detection:** Spans appear in Jaeger but payload attributes are missing. Check exporter debug logs.

---

### 5. Redis Instrumentation Missing Key Details

**What goes wrong:** Redis spans show generic "redis.command" but not which key was accessed or what data was stored.

**Why it happens:** Default ioredis instrumentation captures command name but may not include arguments due to security/size concerns.

**Prevention:**
```typescript
getNodeAutoInstrumentations({
  '@opentelemetry/instrumentation-ioredis': {
    dbStatementSerializer: (cmdName, cmdArgs) => {
      return `${cmdName} ${cmdArgs[0] || ''}`; // Include key name
    },
  },
});
```

**Detection:** Redis spans show "SET" but not "SET search:019b..." — check span attributes for db.statement.

---

## Moderate Pitfalls

### 6. Express 5.x Compatibility

**What goes wrong:** Express 5.x changed middleware/routing internals. Auto-instrumentation may not create spans correctly or may create duplicates.

**Prevention:** Test span lifecycle explicitly. If auto-instrumentation fails, use manual Express middleware as fallback.

### 7. Fetch Instrumentation Missing

**What goes wrong:** Outgoing HTTP calls to ONDC registry/gateway show no client spans.

**Why it happens:** Node.js native `fetch` (Node 18+) needs separate instrumentation from http/https modules. The ONDC client uses `fetch()`.

**Prevention:** Verify `auto-instrumentations-node` includes fetch support. If not, add `@opentelemetry/instrumentation-fetch` explicitly.

### 8. Dev vs Production Config Mismatch

**What goes wrong:** Tracing works in dev (`tsx watch`) but fails in production build.

**Prevention:** Test production build locally before deploying. Validate env vars exist. Ensure instrumentation file survives bundling.

### 9. Span Naming Inconsistencies

**What goes wrong:** Generic span names like "middleware" or "handler" instead of "ondc.search".

**Prevention:** Always use explicit span names with semantic conventions.

### 10. Missing Resource Attributes

**What goes wrong:** Can't distinguish dev/staging/production traces in Jaeger.

**Prevention:** Set `service.name`, `service.version`, `deployment.environment` in SDK resource config.

### 11. Forgetting to Flush on Shutdown

**What goes wrong:** Last spans before server shutdown are lost.

**Prevention:** Handle SIGTERM to flush spans before exit.

## Phase-Specific Warnings

| Phase | Likely Pitfall | Mitigation |
|-------|---------------|------------|
| Phase 1: SDK Setup | ESM import order (#1) | Validate with test request + Jaeger |
| Phase 1: SDK Setup | Span size limits (#4) | Configure spanLimits upfront |
| Phase 2: Core Instrumentation | tRPC context loss (#2) | Implement tracing middleware |
| Phase 2: Core Instrumentation | Express 5.x (#6) | Test span lifecycle |
| Phase 2: Core Instrumentation | Fetch missing (#7) | Verify client spans |
| Phase 3: Async Flows | Webhook propagation (#3) | Store trace context in Redis |
| Phase 4: Custom Attributes | Redis details (#5) | Configure dbStatementSerializer |
| Phase 5: Validation | Dev/prod mismatch (#8) | Test production build |

## Validation Checklist

Before deploying OpenTelemetry:

- [ ] ESM import order: `tracing.ts` runs before any app code
- [ ] tRPC spans: nested under HTTP request spans (not orphaned)
- [ ] Webhook traces: on_search continues search trace (via Redis)
- [ ] Large payloads: 200KB ONDC response logged without span drop
- [ ] Redis details: Span shows command + key name
- [ ] Fetch spans: Outgoing ONDC API calls visible
- [ ] Express 5.x: No duplicate or missing spans
- [ ] Dev vs prod: Tracing works in both environments
- [ ] Resource attributes: service.name, deployment.environment set
- [ ] Graceful shutdown: Spans flush on SIGTERM

## Sources

- OpenTelemetry JavaScript SDK patterns (general knowledge)
- Node.js ESM instrumentation requirements
- tRPC middleware async context patterns
- Express 5.x changes from 4.x
- Confidence: MEDIUM (custom patterns need validation)

---
*Pitfalls analysis for v2.0 Observability | 2026-02-09*
