# Phase 2: Core Instrumentation - Research

**Researched:** 2026-02-09
**Domain:** OpenTelemetry manual instrumentation, tRPC middleware, HTTP client tracing
**Confidence:** HIGH

## Summary

This phase implements manual span creation in tRPC procedures and ONDC HTTP client requests, building on the auto-instrumentation foundation from Phase 1. The research confirms that OpenTelemetry provides robust APIs for manual instrumentation through `tracer.startActiveSpan()`, tRPC supports type-safe middleware via `t.procedure.use()`, and Node.js fetch/undici can be instrumented through built-in diagnostics channels.

The standard approach is to:
1. Create tRPC middleware using `t.procedure.use()` that wraps all procedure calls in spans with `startActiveSpan`
2. Add manual child spans within gateway procedures using `startActiveSpan` for ONDC-specific operations
3. Instrument `ONDCClient.send()` by creating manual spans that capture full request/response payloads as span attributes
4. Use semantic conventions for standard attributes and domain-specific namespaces for custom ONDC attributes

Context propagation works automatically via AsyncLocalStorage when using `startActiveSpan`, ensuring child spans maintain proper parent-child relationships without manual context passing.

**Primary recommendation:** Use `tracer.startActiveSpan()` for all manual spans to maintain context hierarchy, implement tRPC middleware on the base `publicProcedure` for universal coverage, and capture payloads as span attributes with the 16KB limit from Phase 1.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @opentelemetry/api | ^1.9.0 | Tracing API for manual instrumentation | Official OpenTelemetry API, provides `trace.getTracer()` and span creation methods |
| @opentelemetry/sdk-node | ^0.211.0 | SDK initialization and configuration | Already installed in Phase 1, provides NodeSDK |
| @opentelemetry/semantic-conventions | ^1.39.0 | Standard attribute names | Ensures consistency with OpenTelemetry ecosystem |
| @opentelemetry/auto-instrumentations-node | ^0.69.0 | Includes HTTP/undici/Express/ioredis instrumentation | Provides baseline auto-instrumentation for fetch/HTTP |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @opentelemetry/instrumentation-undici | Bundled in auto-instrumentations | Instruments Node.js fetch API via undici | Automatically enabled, captures basic HTTP metadata |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| startActiveSpan | startSpan | startSpan doesn't propagate context, breaking span hierarchy - avoid unless measuring independent operations |
| tRPC middleware | Manual wrapping | Middleware is type-safe and reusable, manual wrapping is error-prone and violates DRY |
| Span attributes | Span events | Attributes are queryable/filterable, events are chronological logs - use attributes for metadata |

**Installation:**
```bash
# All packages already installed from Phase 1
# No additional dependencies required
```

## Architecture Patterns

### Recommended Project Structure
```
server/src/
├── lib/
│   ├── tracing.ts           # OpenTelemetry SDK initialization (Phase 1)
│   └── ondc/
│       ├── client.ts         # ONDCClient with manual spans
│       └── signing.ts        # Crypto utilities (unchanged)
├── trpc/
│   ├── trpc.ts               # tRPC init with tracing middleware
│   ├── context.ts            # Context factory (unchanged)
│   └── routers/
│       ├── gateway.ts        # Procedures with ONDC-specific spans
│       └── ...               # Other routers
└── index.ts                  # Entry point (imports tracing.ts first)
```

### Pattern 1: tRPC Tracing Middleware
**What:** Middleware that wraps every procedure call in a span with procedure metadata
**When to use:** Apply once to base `publicProcedure` to instrument all 18 procedures

**Example:**
```typescript
// Source: https://trpc.io/docs/server/middlewares
// Combined with https://opentelemetry.io/docs/languages/js/instrumentation/
import { trace } from '@opentelemetry/api';
import { initTRPC } from '@trpc/server';
import type { Context } from './context';

const t = initTRPC.context<Context>().create();

const tracer = trace.getTracer('ondc-bap-trpc', '0.1.0');

const tracingMiddleware = t.middleware(async (opts) => {
  return tracer.startActiveSpan(
    `trpc.${opts.type}.${opts.path}`,
    async (span) => {
      try {
        span.setAttribute('trpc.procedure', opts.path);
        span.setAttribute('trpc.type', opts.type);

        const result = await opts.next();
        span.setStatus({ code: 1 }); // SpanStatusCode.OK = 1
        return result;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message }); // SpanStatusCode.ERROR = 2
        throw error;
      } finally {
        span.end();
      }
    }
  );
});

export const publicProcedure = t.procedure.use(tracingMiddleware);
export const router = t.router;
```

**Key principles:**
- Use `startActiveSpan` to maintain context propagation
- Always call `span.end()` in finally block to prevent leaked spans
- Record exceptions and set ERROR status on failures
- Return `opts.next()` result to preserve tRPC return value

### Pattern 2: Manual Child Spans for ONDC Operations
**What:** Create child spans within procedures for ONDC-specific business logic (search, select, init, confirm, status)
**When to use:** In gateway router procedures after the tRPC middleware span is active

**Example:**
```typescript
// Source: https://signoz.io/opentelemetry/add-manual-span-to-traces-nodejs/
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('ondc-bap', '0.1.0');

export const gatewayRouter = router({
  search: publicProcedure
    .input(SearchRequestSchema)
    .mutation(async ({ ctx, input }) => {
      return tracer.startActiveSpan('ondc.search', async (span) => {
        try {
          const transactionId = uuidv7();
          const messageId = uuidv7();

          // Add ONDC attributes (from CONTEXT.md decisions)
          span.setAttribute('ondc.transaction_id', transactionId);
          span.setAttribute('ondc.message_id', messageId);
          span.setAttribute('ondc.action', 'search');
          span.setAttribute('ondc.domain', input.domain || 'ONDC:FIS13');
          span.setAttribute('ondc.subscriber_id', ctx.tenant.subscriberId);

          // Build payload
          const payload = buildSearchPayload(input, transactionId, messageId);

          // Store in KV (auto-instrumented by ioredis)
          await ctx.kv.set(`search:${transactionId}`, JSON.stringify(payload));

          // HTTP call (will create child span via ONDCClient)
          await ctx.ondcClient.send(gatewayUrl, 'POST', payload);

          span.end();
          return { transactionId, messageId };
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: 2, message: (error as Error).message });
          throw error;
        }
      });
    }),
});
```

### Pattern 3: HTTP Client Instrumentation with Payload Capture
**What:** Manual span creation in `ONDCClient.send()` that captures full request/response payloads
**When to use:** Wrap all outgoing ONDC HTTP requests to BPPs/gateways

**Example:**
```typescript
// Source: https://opentelemetry.io/docs/languages/js/instrumentation/
// Combined with CONTEXT.md decision 3 (payload capture)
import { trace } from '@opentelemetry/api';

export class ONDCClient {
  private tracer = trace.getTracer('ondc-bap-http', '0.1.0');

  async send<T>(url: string | URL, method: 'POST' | 'GET', body: object): Promise<T> {
    return this.tracer.startActiveSpan('http.client.ondc', async (span) => {
      try {
        // HTTP metadata attributes
        span.setAttribute('http.url', url.toString());
        span.setAttribute('http.method', method);

        // Authorization header (CONTEXT.md decision 4: full capture)
        const authHeader = await this.createAuthorizationHeader(body);
        span.setAttribute('http.request.header.authorization', authHeader);

        // Full request body (CONTEXT.md decision 3: JSON stringified)
        const bodyJson = JSON.stringify(body);
        span.setAttribute('http.request.body', bodyJson); // 16KB limit from Phase 1
        span.setAttribute('http.request.body.size', bodyJson.length);

        // Make request (undici auto-instrumentation will create child span)
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: authHeader,
          },
          body: bodyJson,
        });

        // Response metadata
        span.setAttribute('http.status_code', response.status);
        span.setAttribute('http.response.header.content-length',
          response.headers.get('content-length') || '0');

        if (!response.ok) {
          const errorText = await response.text();
          span.setAttribute('http.response.body', errorText);
          throw new Error(`ONDC Request Failed [${response.status}]: ${errorText}`);
        }

        const data = await response.json();
        span.setAttribute('http.response.body', JSON.stringify(data));

        span.setStatus({ code: 1 }); // OK
        span.end();
        return data as T;
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({ code: 2, message: (error as Error).message });
        span.end();
        throw error;
      }
    });
  }
}
```

### Pattern 4: Custom Attribute Naming Convention
**What:** Use domain-specific namespace for ONDC attributes following OpenTelemetry conventions
**When to use:** All custom attributes specific to ONDC protocol

**Convention:**
```typescript
// Source: https://opentelemetry.io/docs/specs/semconv/general/naming/
// Custom namespace: "ondc.*" for ONDC protocol attributes
// Format: {namespace}.{property} using snake_case for multi-word properties

// Standard ONDC attributes (from CONTEXT.md decision 2)
span.setAttribute('ondc.transaction_id', transactionId);
span.setAttribute('ondc.message_id', messageId);
span.setAttribute('ondc.action', 'search');         // search, select, init, confirm, status
span.setAttribute('ondc.domain', 'ONDC:FIS13');
span.setAttribute('ondc.bpp_id', bppId);
span.setAttribute('ondc.bpp_uri', bppUri);
span.setAttribute('ondc.subscriber_id', subscriberId);

// Use standard HTTP semantic conventions for HTTP attributes
span.setAttribute('http.method', 'POST');
span.setAttribute('http.status_code', 200);
span.setAttribute('http.url', url.toString());

// tRPC-specific attributes
span.setAttribute('trpc.procedure', 'gateway.search');
span.setAttribute('trpc.type', 'mutation');
```

**Rules:**
- NEVER use `otel.*` prefix (reserved for OpenTelemetry specification)
- Use dot-separated namespaces: `ondc.transaction_id` not `ondcTransactionId`
- Use snake_case within multi-word properties: `ondc.bpp_id` not `ondc.bppId`
- Follow semantic conventions for standard HTTP/network attributes
- Keep custom attributes under domain namespace: `ondc.*`, `trpc.*`

### Anti-Patterns to Avoid

- **Using `startSpan` instead of `startActiveSpan`:** Context won't propagate, breaking parent-child relationships. Always use `startActiveSpan` for operations that create child spans.

- **Not calling `span.end()` in finally block:** Leads to leaked spans that never export. Always use try-catch-finally with `span.end()` in finally.

- **Setting attributes after `span.end()`:** Attributes set after ending are ignored. Set all attributes before calling `span.end()`.

- **Over-instrumentation:** Creating spans for every function creates noise. Aim for 5-15 custom spans per request. In this phase: 1 tRPC span + 1 ONDC action span + 1 HTTP client span = 3 spans per gateway operation.

- **High-cardinality attributes:** Don't use user IDs, random UUIDs, or timestamps as attribute values for grouping. Use transactionId for correlation but don't create millions of unique values for filtering.

- **Not recording exceptions:** Always call `span.recordException(error)` and `span.setStatus({ code: 2 })` on errors. Missing error info makes traces useless for debugging.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Context propagation across async | Manual context passing in function args | AsyncLocalStorage via startActiveSpan | OpenTelemetry SDK manages context automatically via Node.js AsyncLocalStorage. Manual context breaks easily with Promise chains. |
| HTTP request tracing | Manual timing and logging | undici auto-instrumentation (bundled) | Auto-instrumentation already captures HTTP spans via diagnostics_channel. Manual timing misses edge cases (redirects, retries). |
| Span hierarchy management | Manually passing parent span | tracer.startActiveSpan callback pattern | Active span propagates automatically within callback scope. Manual parent tracking is error-prone and breaks with nested operations. |
| Attribute naming conventions | Custom snake_case/camelCase mix | OpenTelemetry Semantic Conventions | Standard conventions ensure compatibility with observability backends and query tools. Custom naming breaks ecosystem tooling. |
| Request/response body capture | Custom logging to span events | Span attributes with 16KB limit | Attributes are queryable and indexed, events are chronological logs. Attributes better for debugging payloads. Phase 1 already configured 16KB limit. |

**Key insight:** OpenTelemetry's auto-instrumentation and context propagation solve 80% of tracing needs. Manual spans should add business context (ONDC attributes), not reinvent HTTP/timing mechanics.

## Common Pitfalls

### Pitfall 1: Context Loss in tRPC Middleware
**What goes wrong:** Child spans created in procedures don't appear under tRPC procedure span, creating flat traces instead of hierarchy.

**Why it happens:** Using `startSpan` instead of `startActiveSpan` in middleware, or not awaiting the span callback properly.

**How to avoid:**
- Always use `startActiveSpan` in tRPC middleware
- Await the entire `opts.next()` chain inside the span callback
- Return the result from `startActiveSpan` to preserve tRPC response

**Warning signs:**
- Spans appear as separate traces instead of single hierarchical trace
- HTTP client spans show no parent
- SigNoz shows disconnected spans for same transactionId

### Pitfall 2: Span Not Ended on Error
**What goes wrong:** When procedures throw errors, spans remain open indefinitely, never exporting to SigNoz.

**Why it happens:** `span.end()` only called in try block, error path bypasses it.

**How to avoid:**
```typescript
// BAD: span.end() in try block only
const result = await opts.next();
span.end();
return result;

// GOOD: span.end() in finally block
try {
  const result = await opts.next();
  return result;
} finally {
  span.end();
}
```

**Warning signs:**
- Missing spans in SigNoz for failed requests
- Memory growth in Node.js process
- Console warnings about unsent spans on shutdown

### Pitfall 3: Undici Auto-Instrumentation Disabled
**What goes wrong:** `ONDCClient.send()` HTTP spans appear but have no underlying HTTP metadata (status codes, timing).

**Why it happens:** Undici instrumentation is bundled in `getNodeAutoInstrumentations()` but Node.js 18+ uses fetch backed by undici. If undici instrumentation is disabled or misconfigured, fetch calls won't be traced.

**How to avoid:**
- Verify undici is NOT in disabled list in `getNodeAutoInstrumentations()` config
- Check that `@opentelemetry/instrumentation-undici` is included in auto-instrumentations bundle
- Test with `curl` to see if HTTP spans appear under manual span

**Warning signs:**
- Manual `http.client.ondc` span appears but no child HTTP span
- No `http.status_code` or timing data on network requests
- Redis spans work but fetch spans don't

### Pitfall 4: Payload Truncation Without Awareness
**What goes wrong:** Large ONDC payloads (>16KB) get truncated silently, missing critical debugging data.

**Why it happens:** Phase 1 set `attributeValueLengthLimit: 16384` to prevent span bloat. JSON.stringify large payloads exceeds this limit.

**How to avoid:**
- Check payload size before setting attribute: `bodyJson.length`
- Log warning if payload exceeds 16KB
- Consider storing oversized payloads in KV and referencing by ID in span

**Warning signs:**
- Partial JSON in span attributes ending mid-object
- SigNoz shows truncated strings with no indication
- Complex ONDC responses missing critical fields

### Pitfall 5: Authorization Header Length Exceeds Limit
**What goes wrong:** Ed25519 signature in Authorization header is 500+ characters. Combined with full payload (16KB), single span exceeds backend limits.

**Why it happens:** Decision 4 requires full Authorization capture. Signature format is `Signature keyId="...",algorithm="...",created="...",expires="...",headers="...",signature="..."` with base64 signature ~344 chars.

**How to avoid:**
- Authorization header is ~500 chars, well under 16KB limit
- If combined attributes approach limit, prioritize: Authorization > request body > response body
- Monitor span export errors in OpenTelemetry logs

**Warning signs:**
- Spans with both auth header and full payload fail to export
- SigNoz shows partial or missing spans for ONDC requests
- Node.js logs "span attribute limit exceeded" warnings

### Pitfall 6: tRPC Batching Breaks Span Hierarchy
**What goes wrong:** When tRPC batches multiple client requests into single HTTP call, spans for individual procedures appear as siblings instead of children of HTTP request span.

**Why it happens:** tRPC httpBatchLink bundles requests, Express sees one HTTP request, auto-instrumentation creates one HTTP span, but tRPC unbundles and calls multiple procedures.

**How to avoid:**
- Accept this behavior for batched requests - it's correct (multiple procedures, one HTTP request)
- Don't try to force parent-child relationship between HTTP span and multiple procedure spans
- Use `transactionId` attributes for correlation instead of span hierarchy

**Warning signs:**
- This is NOT a warning sign - multiple procedure spans under one HTTP span is expected for batched requests
- Only investigate if SINGLE procedure call creates multiple HTTP spans or breaks hierarchy

## Code Examples

Verified patterns from official sources:

### Getting a Tracer Instance
```typescript
// Source: https://opentelemetry.io/docs/languages/js/instrumentation/
import { trace } from '@opentelemetry/api';

// Get tracer with service name and version
const tracer = trace.getTracer('service-name', '1.0.0');

// In this project:
const tracer = trace.getTracer('ondc-bap-trpc', '0.1.0');    // tRPC middleware
const tracer = trace.getTracer('ondc-bap', '0.1.0');         // ONDC operations
const tracer = trace.getTracer('ondc-bap-http', '0.1.0');    // HTTP client
```

### Creating Active Spans with Error Handling
```typescript
// Source: https://signoz.io/opentelemetry/add-manual-span-to-traces-nodejs/
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('ondc-bap', '0.1.0');

return tracer.startActiveSpan('operation-name', async (span) => {
  try {
    span.setAttribute('key', 'value');
    span.addEvent('Operation started');

    const result = await doWork();

    span.setStatus({ code: SpanStatusCode.OK });
    span.end();
    return result;
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: (error as Error).message
    });
    span.end();
    throw error;
  }
});
```

### tRPC Middleware Pattern
```typescript
// Source: https://trpc.io/docs/server/middlewares
const customMiddleware = t.middleware(async (opts) => {
  // Pre-execution logic
  const start = Date.now();

  const result = await opts.next();

  // Post-execution logic
  const duration = Date.now() - start;
  console.log(`${opts.path} took ${duration}ms`);

  return result;
});

// Apply to procedure
export const publicProcedure = t.procedure.use(customMiddleware);
```

### Modifying Context in Middleware
```typescript
// Source: https://trpc.io/docs/server/middlewares
const authMiddleware = t.middleware(async (opts) => {
  if (!opts.ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }

  // Narrow context type
  return opts.next({
    ctx: {
      user: opts.ctx.user, // Now guaranteed non-null
    },
  });
});
```

### Getting Active Span
```typescript
// Source: https://opentelemetry.io/docs/languages/js/context/
import { trace } from '@opentelemetry/api';

// Get currently active span (within startActiveSpan callback)
const activeSpan = trace.getActiveSpan();

if (activeSpan) {
  activeSpan.setAttribute('additional.attribute', 'value');
}
```

### Undici Instrumentation Configuration
```typescript
// Source: https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/instrumentation-undici
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

const sdk = new NodeSDK({
  instrumentations: [
    getNodeAutoInstrumentations({
      // Undici enabled by default, configure if needed
      '@opentelemetry/instrumentation-undici': {
        requireParentforSpans: true,  // Only trace if parent span exists
        requestHook: (span, request) => {
          span.setAttribute('custom.attribute', 'value');
        },
        headersToSpanAttributes: {
          requestHeaders: ['authorization', 'content-type'],
          responseHeaders: ['content-length'],
        },
      },
    }),
  ],
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| startSpan for all manual spans | startActiveSpan for hierarchy-creating operations | OpenTelemetry JS 1.0 (2023) | Context propagates automatically, eliminates manual parent span passing |
| async_hooks for context | AsyncLocalStorage (Node.js 14.8+) | Node.js 14.8.0 (2020), OTel default since 2023 | 80% performance improvement, avoids DoS vulnerability |
| Separate fetch instrumentation | Undici instrumentation covers fetch | Node.js 18 (2022), fetch backed by undici | Single instrumentation for both fetch and undici, automatic in auto-instrumentations |
| request/response hooks in HTTP instrumentation | diagnostics_channel for undici | Undici 5.12.0+ (2023) | More reliable interception, less monkey-patching |
| Manual span attribute limits | spanLimits config in SDK | OpenTelemetry 1.0+ | Prevents span bloat, configurable per deployment |

**Deprecated/outdated:**
- **AsyncHooksContextManager**: Replaced by AsyncLocalStorage-based context manager (performance + Node.js v24 improvements)
- **@opentelemetry/instrumentation-http for fetch**: Doesn't work with Node.js fetch, use undici instrumentation instead
- **startSpan for nested operations**: Use startActiveSpan to maintain context, startSpan only for leaf operations with no children
- **Span events for payloads**: Use attributes (queryable) instead of events (chronological logs) for debugging data

## Open Questions

Things that couldn't be fully resolved:

1. **Does getNodeAutoInstrumentations include undici by default?**
   - What we know: `@opentelemetry/auto-instrumentations-node` bundles many instrumentations including undici support. The package documentation shows undici in the instrumentation map.
   - What's unclear: Whether undici instrumentation is enabled by default or requires explicit configuration. The codebase shows Phase 1 uses `getNodeAutoInstrumentations()` with no undici-specific config.
   - Recommendation: Verify by testing - make a fetch call and check if HTTP spans appear. If not, explicitly enable undici in auto-instrumentations config. Document finding in Phase 2 implementation notes.

2. **What's the actual limit for combined span attributes?**
   - What we know: Phase 1 set `attributeValueLengthLimit: 16384` (16KB per attribute). Authorization header is ~500 chars. Request body can be several KB.
   - What's unclear: Is there a total span size limit beyond per-attribute limit? SigNoz may have backend limits.
   - Recommendation: Monitor span export success in Phase 2. If exports fail, add logic to prioritize attributes (auth > request > response) and truncate response body first.

3. **Should tRPC middleware span be parent of ONDC action span?**
   - What we know: tRPC middleware creates span first, gateway procedure creates "ondc.search" span second. With startActiveSpan, ondc.search becomes child of tRPC span.
   - What's unclear: Is this the desired hierarchy? Or should they be siblings under HTTP request span?
   - Recommendation: Implement as parent-child (tRPC → ONDC action → HTTP client). It's semantically correct: tRPC procedure orchestrates ONDC action which makes HTTP call. Test in SigNoz to validate visualization.

## Sources

### Primary (HIGH confidence)
- [OpenTelemetry JavaScript Instrumentation](https://opentelemetry.io/docs/languages/js/instrumentation/) - Manual span creation patterns
- [tRPC Middlewares Documentation](https://trpc.io/docs/server/middlewares) - Middleware pattern and context modification
- [SigNoz Manual Instrumentation Guide](https://signoz.io/opentelemetry/add-manual-span-to-traces-nodejs/) - Node.js-specific examples
- [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/general/naming/) - Attribute naming rules
- [OpenTelemetry Context Management](https://opentelemetry.io/docs/languages/js/context/) - Context propagation patterns
- [Undici Instrumentation](https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/instrumentation-undici) - HTTP client tracing
- [startSpan vs startActiveSpan (Jessitron)](https://jessitron.com/2022/02/08/startspan-vs-startactivespan-in-opentelemetry-js/) - Context propagation differences
- [startSpan vs startActiveSpan (Honeycomb)](https://www.honeycomb.io/blog/startspan-versus-startactivespan-opentelemetry) - When to use each

### Secondary (MEDIUM confidence)
- [OpenTelemetry AsyncLocalStorage Performance](https://opentelemetry.io/blog/2026/oteljs-nodejs-dos-mitigation/) - AsyncLocalStorage as preferred approach (2026)
- [The Hidden Cost of Async Context](https://blog.platformatic.dev/the-hidden-cost-of-context) - Performance implications of context propagation
- [OpenTelemetry Custom Spans](https://oneuptime.com/blog/post/2026-02-02-opentelemetry-custom-spans/view) - Span lifecycle management (2026)
- [Over-instrumentation Anti-Pattern](https://oneuptime.com/blog/post/2026-02-02-opentelemetry-custom-spans/view) - Common mistakes (2026)

### Tertiary (LOW confidence)
- [OpenTelemetry Fetch Instrumentation Status](https://github.com/open-telemetry/opentelemetry-js/issues/4333) - Node.js fetch not directly instrumented, use undici
- [tRPC Span Hierarchy Issues](https://github.com/getsentry/sentry-javascript/discussions/12246) - tRPC middleware and batching behavior

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All packages installed in Phase 1, official OpenTelemetry libraries
- Architecture: HIGH - Patterns verified from official docs and established blog posts (Jessitron, Honeycomb)
- Pitfalls: MEDIUM - Based on community issues and documented anti-patterns, but not all tested in this codebase

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days - OpenTelemetry stable, slow-moving)

**Note:** Node.js 24 (Oct 2024) includes AsyncLocalStorage performance improvements directly benefiting OpenTelemetry. Current project uses Node.js 18+, already has AsyncLocalStorage support.
