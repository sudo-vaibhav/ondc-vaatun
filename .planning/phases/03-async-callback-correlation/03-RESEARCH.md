# Phase 3: Async Callback Correlation - Research

**Researched:** 2026-02-10
**Domain:** OpenTelemetry async trace correlation, W3C TraceContext, span links
**Confidence:** HIGH

## Summary

This phase implements async trace correlation for ONDC callbacks using OpenTelemetry's W3C TraceContext propagation and span links. ONDC callbacks arrive as separate HTTP requests from BPP servers without trace context, requiring manual correlation via transactionId stored in Redis.

The standard approach involves:
1. Serializing trace context (traceparent) into Redis when the search request is made
2. Retrieving trace context from Redis when callbacks arrive
3. Restoring the original trace using span links (not parent-child relationships, since the original span has ended)

The W3C TraceContext specification provides a standardized format (version-traceId-parentId-traceFlags) that OpenTelemetry's propagation API can serialize/deserialize. Span links allow associating callback spans with the original request span across different trace timelines, which is ideal for async operations where timing is unpredictable.

**Primary recommendation:** Use OpenTelemetry's `propagation.inject()` to serialize trace context into a string, store it in the existing search entry object in Redis, then use `propagation.extract()` + `startActiveSpan` with `links` parameter to create linked callback spans.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @opentelemetry/api | Latest | Trace API, propagation, context | Core OTel API package, already in use (Phase 1) |
| @opentelemetry/sdk-node | Latest | W3CTraceContextPropagator | Default propagator, already configured (Phase 1) |

### Supporting
None - all required libraries already installed in Phase 1.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Span links | Parent-child spans | Parent-child requires active context at callback time, which we don't have. Links work for async workflows. |
| W3C traceparent | Custom format | Custom formats break interoperability. W3C is the standard. |
| Single trace | New trace per callback | New traces lose correlation. User's decision (CONTEXT.md) is single trace. |

**Installation:**
None required - dependencies already installed.

## Architecture Patterns

### Recommended Project Structure
```
server/src/
├── lib/
│   ├── search-store.ts        # Modified: add traceparent to SearchEntry
│   └── trace-context-store.ts # NEW: OTel-specific serialization utilities
├── trpc/
│   └── routers/
│       └── gateway.ts          # Modified: save/restore trace context
```

### Pattern 1: Serialize Trace Context on Request

**What:** Use OpenTelemetry's propagation API to serialize the current trace context into W3C traceparent format, then store it in Redis alongside the search entry.

**When to use:** When initiating a request that will receive async callbacks (search, select, init, confirm).

**Example:**
```typescript
// Source: https://opentelemetry.io/docs/languages/js/propagation/
import { context, propagation } from '@opentelemetry/api';

// In gateway.search mutation (after createSearchEntry)
const carrier = {};
propagation.inject(context.active(), carrier);

// carrier now contains: { traceparent: "00-abc123...-def456...-01", tracestate: "..." }
const traceparent = carrier.traceparent;

// Store in Redis via modified createSearchEntry()
await createSearchEntry(kv, transactionId, messageId, categoryCode, ttl, traceparent);
```

**Key insight:** The propagation API handles all W3C format details (version, hex encoding, validation). Don't manually construct traceparent strings.

### Pattern 2: Restore Trace Context on Callback

**What:** Retrieve the stored traceparent from Redis, use `propagation.extract()` to reconstruct the SpanContext, then create a new span with a link to the original span.

**When to use:** When receiving async callbacks (on_search, on_select, on_init, on_confirm).

**Example:**
```typescript
// Source: https://opentelemetry.io/docs/languages/js/propagation/
// Source: https://opentelemetry.io/docs/concepts/signals/traces/ (span links)
import { context, propagation, trace, SpanKind } from '@opentelemetry/api';

// In gateway.onSearch mutation
const entry = await getSearchEntry(kv, transactionId);

if (!entry?.traceparent) {
  console.warn('[onSearch] No trace context found for transaction:', transactionId);
  // Continue without trace correlation
}

// Extract trace context from stored traceparent
const carrier = { traceparent: entry.traceparent };
const extractedContext = propagation.extract(context.active(), carrier);

// Get the original span context for linking
const originalSpanContext = trace.getSpanContext(extractedContext);

const tracer = trace.getTracer("ondc-bap", "0.1.0");

// Create callback span with link to original span
tracer.startActiveSpan(
  "ondc.on_search",
  {
    kind: SpanKind.SERVER,
    links: originalSpanContext ? [{
      context: originalSpanContext,
      attributes: {
        "link.type": "async_callback",
        "link.reason": "BPP callback for search request"
      }
    }] : [],
    attributes: {
      "ondc.transaction_id": transactionId,
      "ondc.bpp_id": input.context?.bpp_id,
      "ondc.action": "on_search"
    }
  },
  async (span) => {
    try {
      // Handle callback logic
      await addSearchResponse(kv, transactionId, input);
      span.setStatus({ code: SpanStatusCode.OK });
      return { message: { ack: { status: "ACK" } } };
    } catch (error) {
      span.recordException(error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
      throw error;
    } finally {
      span.end();
    }
  }
);
```

**Key insight:** Use `links` array in `startActiveSpan` options, not parent-child relationship. The original span has already ended by the time the callback arrives.

### Pattern 3: Handle Missing Context Gracefully

**What:** If trace context is missing from Redis (expired, never stored, or Redis failure), create an orphaned trace for the callback rather than failing.

**When to use:** Always - defensive coding for async callback handlers.

**Example:**
```typescript
const entry = await getSearchEntry(kv, transactionId);

if (!entry?.traceparent) {
  console.warn('[onSearch] No trace context found, creating orphan trace');
  // Continue with no links - span will be in its own trace
}

// extractedContext will be the default context if traceparent is undefined
const carrier = { traceparent: entry?.traceparent };
const extractedContext = propagation.extract(context.active(), carrier);
```

**Key insight:** Missing trace context is a degraded state, not a fatal error. The callback data is still valuable even without trace correlation.

### Pattern 4: Embedded Storage Pattern

**What:** Store trace context as a field within the existing search entry object rather than creating a separate Redis key.

**When to use:** When you already have a logical "entry" object that represents the operation.

**Example:**
```typescript
// Modified SearchEntry interface
export interface SearchEntry {
  transactionId: string;
  messageId: string;
  searchTimestamp: string;
  categoryCode?: string;
  createdAt: number;
  ttlMs: number;
  ttlExpiresAt: number;
  traceparent?: string;  // NEW: W3C trace context
}

// Modified createSearchEntry
export async function createSearchEntry(
  kv: TenantKeyValueStore,
  transactionId: string,
  messageId: string,
  categoryCode?: string,
  ttl = "PT5M",
  traceparent?: string,  // NEW parameter
): Promise<SearchEntry> {
  const entry: SearchEntry = {
    // ... existing fields
    traceparent,  // Store alongside other metadata
  };

  const key = keyFormatter.search(transactionId);
  await kv.set(key, entry, { ttlMs: DEFAULT_STORE_TTL_MS });
  return entry;
}
```

**Why this pattern:**
- Single Redis operation (not two)
- Natural grouping: trace context belongs with the entry it's tracing
- Callback handler already calls `getSearchEntry()` - no extra lookup needed
- Simpler code: fewer Redis keys to manage

### Anti-Patterns to Avoid

- **Manually parsing traceparent strings:** Use `propagation.extract()` instead. Manual parsing is error-prone and doesn't handle edge cases.
- **Creating parent-child spans for callbacks:** The original span has ended. Use span links instead.
- **Storing entire SpanContext objects:** Store the serialized traceparent string, not JavaScript objects. Objects don't survive Redis serialization correctly.
- **Assuming trace context exists:** Always check for undefined/null and handle missing context gracefully.
- **Using separate Redis keys for trace context:** Embed in the existing entry object to reduce Redis operations and key sprawl.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| W3C traceparent serialization | Custom string formatting | `propagation.inject()` | Handles version, validation, hex encoding, edge cases automatically |
| SpanContext reconstruction | Manual object creation | `propagation.extract()` | Creates valid SpanContext with correct isRemote flag |
| Trace ID validation | Regex or manual checks | OTel's `isSpanContextValid()` | Implements full W3C spec validation rules |
| Trace flags parsing | Bit manipulation | Let propagator handle it | Sampled flag and future flags handled correctly |

**Key insight:** The W3C TraceContext specification has subtle validation rules (all-zero IDs are invalid, version bytes, trace flags). OpenTelemetry's propagation API implements these correctly.

## Common Pitfalls

### Pitfall 1: Trying to Create Parent-Child Spans for Callbacks

**What goes wrong:** Developers attempt to use `trace.setSpan()` or `context.with()` to make the callback span a child of the original span. This creates broken traces because the original span has already ended and its context is no longer active.

**Why it happens:** Parent-child relationships are the default mental model for spans, so it's natural to try this first.

**How to avoid:** Use span links instead of parent-child relationships for async callbacks. Links are designed for exactly this scenario - associating spans when causality exists but timing is unpredictable.

**Warning signs:**
- Callback spans appear in separate traces from the original request
- Spans show overlapping time ranges that don't make sense
- SigNoz shows disconnected trace fragments

**Solution:**
```typescript
// BAD: Trying to make callback a child
const parentSpan = trace.getActiveSpan(); // This is undefined at callback time!
tracer.startActiveSpan("on_search", { parent: parentSpan }, ...); // Won't work

// GOOD: Using span links
tracer.startActiveSpan("on_search", {
  links: [{ context: originalSpanContext }]
}, ...);
```

### Pitfall 2: Invalid SpanContext from Missing isRemote Flag

**What goes wrong:** When manually creating SpanContext objects, forgetting to set `isRemote: true` causes OpenTelemetry to reject the context as invalid.

**Why it happens:** The `isRemote` flag is required by the OTel spec but easy to forget when manually constructing SpanContext objects.

**How to avoid:** Always use `propagation.extract()` to reconstruct SpanContext from traceparent strings. The propagator sets `isRemote: true` automatically.

**Warning signs:**
- Console warnings about "invalid SpanContext"
- Trace correlation silently failing
- New traces created instead of linking to existing traces

**Solution:**
```typescript
// BAD: Manual SpanContext creation (missing isRemote)
const spanContext = {
  traceId: "abc123...",
  spanId: "def456...",
  traceFlags: 1
}; // Missing isRemote!

// GOOD: Use propagation.extract()
const carrier = { traceparent: storedTraceparent };
const extractedContext = propagation.extract(context.active(), carrier);
const spanContext = trace.getSpanContext(extractedContext); // Has isRemote: true
```

### Pitfall 3: Wrong TTL for Trace Context vs Transaction Data

**What goes wrong:** Setting trace context TTL to match the transaction data TTL (e.g., 10 minutes) causes late-arriving BPP callbacks to lose trace correlation.

**Why it happens:** Natural assumption that trace context should expire with the data it's tracing.

**How to avoid:** User decision (CONTEXT.md) is 30 minutes for trace context TTL, longer than the 10-minute search entry TTL. This catches late BPP callbacks while still expiring unused entries.

**Warning signs:**
- Late callbacks (>10min) create orphan traces
- Some BPP responses are correlated, others aren't

**Solution:**
```typescript
// Store search entry with 10-minute TTL
await kv.set(searchKey, entry, { ttlMs: 10 * 60 * 1000 });

// Trace context lives longer (embedded in same entry, but entry TTL is extended in practice)
// OR: Store trace context separately with longer TTL
await kv.set(traceContextKey, traceparent, { ttlMs: 30 * 60 * 1000 });
```

**NOTE:** CONTEXT.md decision is to embed traceparent in the search entry, so the entry's TTL should be extended to 30 minutes, OR the trace context should be stored separately with its own TTL.

### Pitfall 4: Missing Context Crashes Callback Handler

**What goes wrong:** Callback handler crashes or returns errors when trace context is missing from Redis, causing ONDC callbacks to fail with NACK responses.

**Why it happens:** Not handling the case where Redis has expired the entry or the entry was never created (edge case).

**How to avoid:** Always check for undefined/null trace context and continue processing the callback even if trace context is missing. Log a warning but don't throw an error.

**Warning signs:**
- Callbacks fail with 500 errors
- Redis expiration causes callback failures
- ONDC BPPs receive NACK responses unexpectedly

**Solution:**
```typescript
// BAD: Assumes trace context exists
const { traceparent } = await getSearchEntry(kv, transactionId);
const extractedContext = propagation.extract(context.active(), { traceparent });

// GOOD: Handle missing context
const entry = await getSearchEntry(kv, transactionId);

if (!entry?.traceparent) {
  console.warn('[onSearch] No trace context found, creating orphan trace');
  // Continue with default context - callback data is still valuable
}

const carrier = { traceparent: entry?.traceparent };
const extractedContext = propagation.extract(context.active(), carrier);
```

### Pitfall 5: Forgetting to Store Trace Context in Request Handler

**What goes wrong:** Developer implements the callback restoration logic but forgets to store the trace context in the request handler, so callbacks never have context to restore.

**Why it happens:** Two-part implementation (store + restore) means it's easy to forget one half.

**How to avoid:** Implement both parts in the same commit/PR. Add console.log statements to verify storage is happening.

**Warning signs:**
- All callbacks create orphan traces
- Redis inspection shows search entries without traceparent fields
- Console shows "No trace context found" warnings on every callback

**Solution:**
```typescript
// gateway.search mutation - MUST add after createSearchEntry()
const carrier = {};
propagation.inject(context.active(), carrier);
const traceparent = carrier.traceparent;

// Modify createSearchEntry() to accept and store traceparent
await createSearchEntry(kv, transactionId, messageId, categoryCode, ttl, traceparent);

console.log('[Search] Stored trace context:', traceparent); // Verify it's working
```

## Code Examples

Verified patterns from official sources:

### Serializing Trace Context (Request Handler)

```typescript
// Source: https://opentelemetry.io/docs/languages/js/propagation/
import { context, propagation, trace, SpanStatusCode } from '@opentelemetry/api';

// In gateway.search mutation
export const gatewayRouter = router({
  search: publicProcedure
    .input(/* ... */)
    .mutation(async ({ ctx, input }) => {
      const { tenant, ondcClient, kv } = ctx;

      return tracer.startActiveSpan("ondc.search", async (span) => {
        try {
          const transactionId = uuidv7();
          const messageId = uuidv7();

          // Set attributes
          span.setAttribute("ondc.transaction_id", transactionId);
          span.setAttribute("ondc.message_id", messageId);
          span.setAttribute("ondc.action", "search");

          // Serialize current trace context
          const carrier = {};
          propagation.inject(context.active(), carrier);
          const traceparent = carrier.traceparent as string | undefined;

          // Store search entry WITH trace context
          await createSearchEntry(
            kv,
            transactionId,
            messageId,
            input.categoryCode,
            "PT5M",
            traceparent  // NEW: pass trace context
          );

          // Rest of search logic...
          const payload = createSearchPayload(tenant, transactionId, messageId, input.categoryCode);
          const response = await ondcClient.send(gatewayUrl, "POST", payload);

          span.setStatus({ code: SpanStatusCode.OK });
          return { ...response, transactionId, messageId };
        } catch (error) {
          span.recordException(error as Error);
          span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
          throw error;
        } finally {
          span.end();
        }
      });
    }),
});
```

### Restoring Trace Context (Callback Handler)

```typescript
// Source: https://opentelemetry.io/docs/languages/js/propagation/
// Source: https://opentelemetry.io/docs/concepts/signals/traces/
import { context, propagation, trace, SpanStatusCode, SpanKind } from '@opentelemetry/api';

const tracer = trace.getTracer("ondc-bap", "0.1.0");

export const gatewayRouter = router({
  onSearch: publicProcedure
    .input(/* ... */)
    .mutation(async ({ ctx, input }) => {
      const { kv } = ctx;
      const transactionId = input.context?.transaction_id;

      if (!transactionId) {
        console.warn('[on_search] No transaction_id in context');
        return { message: { ack: { status: "ACK" } } };
      }

      // Retrieve search entry (includes stored trace context)
      const entry = await getSearchEntry(kv, transactionId);

      // Extract trace context from stored traceparent
      let extractedContext = context.active();
      let originalSpanContext = undefined;

      if (entry?.traceparent) {
        const carrier = { traceparent: entry.traceparent };
        extractedContext = propagation.extract(context.active(), carrier);
        originalSpanContext = trace.getSpanContext(extractedContext);
      } else {
        console.warn('[on_search] No trace context found for transaction:', transactionId);
      }

      // Create callback span with link to original span
      return tracer.startActiveSpan(
        "ondc.on_search",
        {
          kind: SpanKind.SERVER,
          links: originalSpanContext ? [{
            context: originalSpanContext,
            attributes: {
              "link.type": "async_callback",
            }
          }] : [],
          attributes: {
            "ondc.transaction_id": transactionId,
            "ondc.bpp_id": input.context?.bpp_id || "unknown",
            "ondc.bpp_uri": input.context?.bpp_uri,
            "ondc.action": "on_search",
          }
        },
        async (span) => {
          try {
            // Handle callback
            await addSearchResponse(kv, transactionId, input);

            if (input.error) {
              span.setStatus({
                code: SpanStatusCode.ERROR,
                message: `BPP error: ${input.error.message}`
              });
            } else {
              span.setStatus({ code: SpanStatusCode.OK });
            }

            return { message: { ack: { status: "ACK" } } };
          } catch (error) {
            span.recordException(error as Error);
            span.setStatus({
              code: SpanStatusCode.ERROR,
              message: (error as Error).message
            });
            throw error;
          } finally {
            span.end();
          }
        }
      );
    }),
});
```

### Modified SearchEntry Interface

```typescript
// server/src/lib/search-store.ts
export interface SearchEntry {
  transactionId: string;
  messageId: string;
  searchTimestamp: string;
  categoryCode?: string;
  createdAt: number;
  ttlMs: number;
  ttlExpiresAt: number;
  traceparent?: string;  // NEW: W3C trace context for callback correlation
}

export async function createSearchEntry(
  kv: TenantKeyValueStore,
  transactionId: string,
  messageId: string,
  categoryCode?: string,
  ttl = "PT5M",
  traceparent?: string,  // NEW parameter
): Promise<SearchEntry> {
  const now = Date.now();
  const ttlMs = parseTtlToMs(ttl);

  const entry: SearchEntry = {
    transactionId,
    messageId,
    searchTimestamp: new Date().toISOString(),
    categoryCode,
    createdAt: now,
    ttlMs,
    ttlExpiresAt: now + ttlMs,
    traceparent,  // Store trace context
  };

  const key = keyFormatter.search(transactionId);
  await kv.set(key, entry, { ttlMs: DEFAULT_STORE_TTL_MS });

  if (traceparent) {
    console.log('[SearchStore] Stored trace context for transaction:', transactionId);
  }

  return entry;
}
```

### Utility Module for Trace Context Operations

```typescript
// server/src/lib/trace-context-store.ts
// NEW FILE: Reusable utilities for trace context serialization/restoration

import { context, propagation, trace, type Span, type SpanOptions } from '@opentelemetry/api';

/**
 * Serialize the current active trace context into W3C traceparent format
 * @returns traceparent string or undefined if no active span
 */
export function serializeTraceContext(): string | undefined {
  const activeSpan = trace.getActiveSpan();
  if (!activeSpan) {
    return undefined;
  }

  const carrier: Record<string, unknown> = {};
  propagation.inject(context.active(), carrier);
  return carrier.traceparent as string | undefined;
}

/**
 * Restore trace context from a W3C traceparent string
 * @param traceparent W3C traceparent string from storage
 * @returns SpanContext for creating linked spans, or undefined if invalid
 */
export function restoreTraceContext(traceparent: string | undefined) {
  if (!traceparent) {
    return undefined;
  }

  const carrier = { traceparent };
  const extractedContext = propagation.extract(context.active(), carrier);
  return trace.getSpanContext(extractedContext);
}

/**
 * Create span options with a link to a restored trace context
 * @param originalSpanContext SpanContext from restoreTraceContext()
 * @param baseOptions Base span options (kind, attributes, etc.)
 * @returns Span options with links array
 */
export function createLinkedSpanOptions(
  originalSpanContext: ReturnType<typeof trace.getSpanContext>,
  baseOptions: SpanOptions = {}
): SpanOptions {
  return {
    ...baseOptions,
    links: originalSpanContext ? [
      {
        context: originalSpanContext,
        attributes: {
          "link.type": "async_callback",
        }
      }
    ] : [],
  };
}
```

**Usage of utility module:**

```typescript
// In search request
import { serializeTraceContext } from '../../lib/trace-context-store';

const traceparent = serializeTraceContext();
await createSearchEntry(kv, transactionId, messageId, categoryCode, ttl, traceparent);

// In callback handler
import { restoreTraceContext, createLinkedSpanOptions } from '../../lib/trace-context-store';

const entry = await getSearchEntry(kv, transactionId);
const originalSpanContext = restoreTraceContext(entry?.traceparent);

const spanOptions = createLinkedSpanOptions(originalSpanContext, {
  kind: SpanKind.SERVER,
  attributes: {
    "ondc.transaction_id": transactionId,
    "ondc.action": "on_search",
  }
});

tracer.startActiveSpan("ondc.on_search", spanOptions, async (span) => {
  // Callback logic
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom correlation IDs | W3C TraceContext | 2020-2021 | Standardized format enables cross-vendor interoperability |
| Parent-child only | Span links | 2019 (OTel spec) | Enables async workflow correlation without timing constraints |
| Manual traceparent parsing | propagation.inject/extract | OTel 1.0 (2021) | Handles edge cases and validation automatically |
| Separate context storage | Embedded in entry objects | Emerging pattern | Reduces Redis operations, simpler code |

**Deprecated/outdated:**
- **Custom trace ID formats**: Use W3C traceparent. Custom formats break interoperability with other OTel systems.
- **Storing serialized SpanContext objects**: Store traceparent string instead. Objects don't survive JSON serialization correctly.
- **Using parent-child spans for async callbacks**: Use span links. Parent-child requires active context which async callbacks don't have.

## Open Questions

1. **TTL Strategy for Embedded Trace Context**
   - What we know: CONTEXT.md specifies 30-minute TTL for trace context, but search entry has 10-minute TTL
   - What's unclear: Should we extend the search entry TTL to 30 minutes, or store trace context separately?
   - Recommendation: Extend search entry TTL to 30 minutes. Simpler code (single Redis key), and search entries are small (~500 bytes with traceparent). Phase 4 can revisit if separate storage is needed.

2. **Multiple BPP Callback Span Attributes**
   - What we know: Each BPP creates its own callback span, all linked to the same original span
   - What's unclear: Should we add a "callback sequence number" attribute to distinguish first/second/nth callback?
   - Recommendation: Start without sequence numbers. SigNoz shows timestamps, so ordering is visible. Add if user feedback indicates it's needed.

3. **Trace Context Storage When SDK is Disabled**
   - What we know: CONTEXT.md says "Always store" regardless of SDK state (even no-op)
   - What's unclear: Should we skip storage if `serializeTraceContext()` returns undefined (no active span)?
   - Recommendation: Store undefined/null in the entry. Simplest code path - no conditional logic. Redis stores it as JSON null. Phase 4 can optimize if needed.

## Sources

### Primary (HIGH confidence)
- [W3C Trace Context Specification](https://www.w3.org/TR/trace-context/) - Official W3C standard
- [OpenTelemetry Context Propagation](https://opentelemetry.io/docs/concepts/context-propagation/) - Official OTel docs
- [OpenTelemetry JavaScript Propagation](https://opentelemetry.io/docs/languages/js/propagation/) - Official JS SDK docs with code examples
- [OpenTelemetry JavaScript Context](https://opentelemetry.io/docs/languages/js/context/) - Official context.with() documentation
- [OpenTelemetry Traces - Span Links](https://opentelemetry.io/docs/concepts/signals/traces/) - Official span links documentation
- [OpenTelemetry Tracing API Spec](https://opentelemetry.io/docs/specs/otel/trace/api/) - Official API specification
- [OpenTelemetry Propagators API Spec](https://opentelemetry.io/docs/specs/otel/context/api-propagators/) - Official propagators specification

### Secondary (MEDIUM confidence)
- [OpenTelemetry Context Propagation Guide - Uptrace](https://uptrace.dev/opentelemetry/context-propagation) - Verified with official docs
- [OpenTelemetry Context Propagation - Better Stack](https://betterstack.com/community/guides/observability/otel-context-propagation/) - Verified patterns
- [How to Use OpenTelemetry Context Propagation - OneUpTime](https://oneuptime.com/blog/post/2026-02-02-opentelemetry-context-propagation/view) - Recent 2026 article
- [OpenTelemetry Custom Context Propagation - DoorDash](https://careersatdoordash.com/blog/leveraging-opentelemetry-for-custom-context-propagation/) - Real-world Redis storage pattern
- [startSpan vs startActiveSpan - Jessitron](https://jessitron.com/2022/02/08/startspan-vs-startactivespan-in-opentelemetry-js/) - Explains active span context

### Tertiary (LOW confidence)
- [How to Fix Missing Trace ID Issues - OneUpTime](https://oneuptime.com/blog/post/2026-01-24-opentelemetry-missing-trace-id/view) - Common issues, not official
- GitHub issues for OpenTelemetry JS - Community discussions, not specifications

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - W3C TraceContext and OTel propagation API are industry standards, official specifications
- Architecture: HIGH - Patterns verified with official OTel documentation and W3C spec
- Pitfalls: MEDIUM - Based on GitHub issues and community experience, verified where possible with official docs

**Research date:** 2026-02-10
**Valid until:** 2026-03-10 (30 days - stable specification, minor SDK updates possible)
