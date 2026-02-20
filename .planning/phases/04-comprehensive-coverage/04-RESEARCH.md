# Phase 4: Comprehensive Coverage - Research

**Researched:** 2026-02-15
**Domain:** OpenTelemetry distributed tracing, async callback correlation patterns
**Confidence:** HIGH

## Summary

This research investigates extending the established OpenTelemetry tracing pattern from search/on_search (Phase 3) to all remaining ONDC flows: select/on_select, init/on_init, confirm/on_confirm, and status/on_status. The Phase 3 implementation created a proven blueprint: serialize traceparent inside `startActiveSpan`, store in Redis-backed entry objects, restore in callbacks, create linked spans with BPP attributes, and handle errors uniformly.

Phase 4 is pattern replication, not infrastructure creation. The trace-context utilities (`serializeTraceContext`, `restoreTraceContext`, `createLinkedSpanOptions`) are already implemented and reusable. The select, init, confirm, and status procedures already exist without tracing. The stores exist without traceparent fields. This phase wires them together following the exact same pattern as search/on_search.

Additionally, Ed25519 signing operations (inside `ONDCClient.send()` → `createAuthorizationHeader()` → `tenant.signMessage()`) get instrumented with timing-only spans to identify cryptographic latency bottlenecks.

**Primary recommendation:** Copy-paste the search/on_search tracing pattern to four flows. Extend store interfaces with `traceparent?: string`. Add signing span inside `createAuthorizationHeader()`. No new abstractions, no helper extraction—keep it simple and consistent.

## Standard Stack

The established libraries/tools for this domain:

### Core (All Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @opentelemetry/api | 1.9.x | Tracing API (tracer, span, context) | OpenTelemetry standard, used in Phases 1-3 |
| @opentelemetry/sdk-node | 0.56.x | Node.js SDK with auto-instrumentation | Provides HTTP/Express/Redis spans automatically |
| Node.js crypto | Built-in | Ed25519 signing (crypto.sign) | Standard library, no dependencies |

### Supporting (Already Configured)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| W3C Trace Context propagation | Built-in | Serialize/deserialize traceparent | Via `propagation.inject/extract` |
| Redis (ioredis) | 5.x | Store traceparent in entry objects | Already instrumented in Phase 1 |

**Installation:**
```bash
# No new packages needed - all libraries installed in Phase 1
# Phase 4 uses existing infrastructure
```

## Architecture Patterns

### Recommended Code Locations (Extensions Only)
```
server/src/
├── trpc/routers/
│   └── gateway.ts          # EXTEND: Add tracing to 4 procedures + 4 callbacks
├── lib/
│   ├── select-store.ts     # EXTEND: Add traceparent field to SelectEntry
│   ├── init-store.ts       # EXTEND: Add traceparent field to InitEntry
│   ├── confirm-store.ts    # EXTEND: Add traceparent field to ConfirmEntry
│   ├── status-store.ts     # EXTEND: Add traceparent field to StatusEntry
│   └── ondc/
│       └── client.ts       # EXTEND: Add signing span in createAuthorizationHeader
└── entities/
    └── tenant.ts           # EXTEND: Wrap signMessage with span (or leave as-is)
```

### Pattern 1: Store Extension (Uniform Across All Flows)
**What:** Add `traceparent?: string` field to entry interface, extend `create*Entry()` signature
**When to use:** All four stores (select, init, confirm, status)
**Example:**
```typescript
// BEFORE (select-store.ts example)
export interface SelectEntry {
  transactionId: string;
  messageId: string;
  itemId: string;
  providerId: string;
  bppId: string;
  bppUri: string;
  createdAt: number;
}

export async function createSelectEntry(
  kv: TenantKeyValueStore,
  transactionId: string,
  messageId: string,
  itemId: string,
  providerId: string,
  bppId: string,
  bppUri: string,
): Promise<SelectEntry> {
  // ...
}

// AFTER (matching SearchEntry pattern)
export interface SelectEntry {
  transactionId: string;
  messageId: string;
  itemId: string;
  providerId: string;
  bppId: string;
  bppUri: string;
  createdAt: number;
  traceparent?: string;  // NEW
}

export async function createSelectEntry(
  kv: TenantKeyValueStore,
  transactionId: string,
  messageId: string,
  itemId: string,
  providerId: string,
  bppId: string,
  bppUri: string,
  traceparent?: string,  // NEW optional parameter
): Promise<SelectEntry> {
  const entry: SelectEntry = {
    transactionId,
    messageId,
    itemId,
    providerId,
    bppId,
    bppUri,
    createdAt: Date.now(),
    traceparent,  // Store it
  };

  const key = keyFormatter.select(transactionId, messageId);
  await kv.set(key, entry, { ttlMs: DEFAULT_STORE_TTL_MS });  // Use 30-min TTL
  return entry;
}

// Also add getSelectEntry() if missing (for callback handlers)
export async function getSelectEntry(
  kv: TenantKeyValueStore,
  transactionId: string,
  messageId: string,
): Promise<SelectEntry | null> {
  const key = keyFormatter.select(transactionId, messageId);
  return kv.get<SelectEntry>(key);
}
```

**Key points:**
- `traceparent?: string` is optional (backward compatibility)
- Passed as last parameter to `create*Entry()` (after existing params)
- `DEFAULT_STORE_TTL_MS = 30 * 60 * 1000` (30 minutes, matching search-store)
- Add `get*Entry()` function if store doesn't have one (needed by callbacks)

### Pattern 2: Outbound Procedure Tracing (Same as search)
**What:** Wrap procedure in `startActiveSpan`, set attributes, serialize context, pass to store
**When to use:** select, init, confirm, status procedures
**Example:**
```typescript
// Source: Exact pattern from gateway.search (Phase 3)

select: publicProcedure
  .input(/* existing schema */)
  .mutation(async ({ ctx, input }) => {
    const { tenant, ondcClient, kv } = ctx;

    // Wrap entire procedure in active span
    return tracer.startActiveSpan("ondc.select", async (span) => {
      try {
        const messageId = uuidv7();

        // ONDC-specific attributes (set BEFORE serializing context)
        span.setAttribute("ondc.transaction_id", input.transactionId);
        span.setAttribute("ondc.message_id", messageId);
        span.setAttribute("ondc.action", "select");
        span.setAttribute("ondc.domain", tenant.domainCode);
        span.setAttribute("ondc.bpp_id", input.bppId);
        span.setAttribute("ondc.bpp_uri", input.bppUri);

        // Serialize trace context INSIDE startActiveSpan callback
        const traceparent = serializeTraceContext();

        // Pass traceparent to store
        await createSelectEntry(
          kv,
          input.transactionId,
          messageId,
          input.itemId,
          input.providerId,
          input.bppId,
          input.bppUri,
          traceparent,  // NEW
        );

        // Build payload (existing code)
        const payload = { /* ... */ };
        const selectUrl = /* ... */;

        // Send via ONDC client (already creates ondc.http.request span)
        const response = await ondcClient.send(selectUrl, "POST", payload);

        span.setStatus({ code: SpanStatusCode.OK });
        return { ...response, transactionId: input.transactionId, messageId };
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }),
```

**Attributes to add per flow:**
- **All flows:** `ondc.transaction_id`, `ondc.message_id`, `ondc.action`, `ondc.domain`
- **Select/init/confirm/status:** `ondc.bpp_id`, `ondc.bpp_uri` (known at procedure time)

### Pattern 3: Callback Handler Tracing (Same as onSearch)
**What:** Retrieve entry, restore context, create linked span, handle errors uniformly
**When to use:** on_select, on_init, on_confirm, on_status callbacks
**Example:**
```typescript
// Source: Exact pattern from gateway.onSearch (Phase 3)

onSelect: publicProcedure
  .input(/* existing schema */)
  .mutation(async ({ ctx, input }) => {
    const { kv } = ctx;

    console.log("\n\n[on_select] Request Body:\n\n", JSON.stringify(input, null, "\t"));

    const transactionId = input.context?.transaction_id;
    const messageId = input.context?.message_id;

    // Early return if missing correlation keys
    if (!transactionId || !messageId) {
      console.warn("[on_select] Missing transaction_id or message_id");
      return { message: { ack: { status: "ACK" as const } } };
    }

    // Retrieve stored trace context from select entry
    const entry = await getSelectEntry(kv, transactionId, messageId);
    const originalSpanContext = restoreTraceContext(entry?.traceparent);

    if (!entry?.traceparent) {
      console.warn("[on_select] No trace context found for transaction:", transactionId);
    }

    // Create callback span with link to original select span
    const spanOptions = createLinkedSpanOptions(originalSpanContext, {
      kind: SpanKind.SERVER,
      attributes: {
        "ondc.transaction_id": transactionId,
        "ondc.action": "on_select",
        "ondc.bpp_id": input.context?.bpp_id || "unknown",
        "ondc.bpp_uri": input.context?.bpp_uri || "unknown",
      },
    });

    return tracer.startActiveSpan("ondc.on_select", spanOptions, async (span) => {
      try {
        await addSelectResponse(kv, transactionId, messageId, input);

        // NACK/error responses from BPP set ERROR status (uniform pattern)
        if (input.error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: `BPP error: ${input.error.code || "unknown"} - ${input.error.message || "no message"}`,
          });
        } else {
          span.setStatus({ code: SpanStatusCode.OK });
        }

        return { message: { ack: { status: "ACK" as const } } };
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }),
```

**Special cases:**
- **on_confirm:** Extract `ondc.payment_url` from `input.message?.order?.payments?.[0]?.url` and add as span attribute
- **on_status:** May be called multiple times (polling), each call creates a new linked span (traces show polling timeline)
- **Duplicate callbacks:** Always create spans (retries visible in trace, useful for debugging)

### Pattern 4: Signing Span (Minimal Attributes, Inside HTTP Client)
**What:** Wrap `tenant.signMessage()` call in `ondc.sign` span with timing-only attributes
**When to use:** Inside `ONDCClient.createAuthorizationHeader()` before calling `tenant.signMessage()`
**Example:**
```typescript
// Source: Phase 4 CONTEXT.md decision 2

async createAuthorizationHeader(body: object): Promise<string> {
  const digest = calculateDigest(body);

  // ... created/expires calculation (existing code)

  const signingString = `(created): ${created}\n(expires): ${expires}\ndigest: BLAKE-512=${digest}`;

  // NEW: Wrap signing in span for timing visibility
  const signature = await this.tracer.startActiveSpan("ondc.sign", async (span) => {
    try {
      const sig = this.tenant.signMessage(signingString);
      span.setStatus({ code: SpanStatusCode.OK });
      return sig;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      throw error;
    } finally {
      span.end();
    }
  });

  const keyId = `${this.tenant.subscriberId}|${this.tenant.uniqueKeyId.value}|ed25519`;
  return `Signature keyId="${keyId}",algorithm="ed25519",created="${created}",expires="${expires}",headers="(created) (expires) digest",signature="${signature}"`;
}
```

**Attributes:**
- **Timing only:** Span duration shows signing latency
- **No payload:** Skip algorithm, key ID, message size (CONTEXT.md decision 2)
- **Error capture:** Record exceptions if signing fails

**Alternative (if above doesn't work due to async/sync mismatch):**
```typescript
// If tenant.signMessage is sync, use this pattern instead
const signature = this.tracer.startActiveSpan("ondc.sign", (span) => {
  try {
    const sig = this.tenant.signMessage(signingString);
    span.setStatus({ code: SpanStatusCode.OK });
    return sig;
  } catch (error) {
    span.recordException(error as Error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
    throw error;
  } finally {
    span.end();
  }
});
```

### Pattern 5: Store TTL Extension (30 Minutes)
**What:** Extend `DEFAULT_STORE_TTL_MS` from 10 minutes to 30 minutes in all stores
**When to use:** select-store, init-store, confirm-store, status-store
**Example:**
```typescript
// BEFORE (various stores)
const DEFAULT_STORE_TTL_MS = 10 * 60 * 1000;  // 10 minutes

// AFTER (matching search-store)
const DEFAULT_STORE_TTL_MS = 30 * 60 * 1000;  // 30 minutes
```

**Rationale:** Late BPP callbacks (payment processing, policy issuance) may arrive 15-20 minutes after the outbound request. 30-minute TTL ensures trace context survives for correlation.

### Anti-Patterns to Avoid

**Do not serialize trace context outside startActiveSpan:**
```typescript
// BAD: Context is wrong (parent span or no span)
const traceparent = serializeTraceContext();
return tracer.startActiveSpan("ondc.select", async (span) => {
  await createSelectEntry(kv, ..., traceparent);  // Wrong span captured!
});

// GOOD: Serialize INSIDE span callback
return tracer.startActiveSpan("ondc.select", async (span) => {
  const traceparent = serializeTraceContext();  // Captures ondc.select span
  await createSelectEntry(kv, ..., traceparent);
});
```

**Do not skip early return for missing correlation keys:**
```typescript
// BAD: Attempting trace restoration without transactionId
const entry = await getSelectEntry(kv, transactionId, messageId);
// If transactionId is undefined, this fails unnecessarily

// GOOD: Early return before trace operations
if (!transactionId || !messageId) {
  console.warn("[on_select] Missing correlation keys");
  return { message: { ack: { status: "ACK" } } };
}
const entry = await getSelectEntry(kv, transactionId, messageId);
```

**Do not create callback spans without BPP attributes:**
```typescript
// BAD: Missing BPP identity for filtering
const spanOptions = createLinkedSpanOptions(originalSpanContext, {
  attributes: { "ondc.action": "on_select" },
});

// GOOD: Include BPP identity for debugging
const spanOptions = createLinkedSpanOptions(originalSpanContext, {
  kind: SpanKind.SERVER,
  attributes: {
    "ondc.transaction_id": transactionId,
    "ondc.action": "on_select",
    "ondc.bpp_id": input.context?.bpp_id || "unknown",
    "ondc.bpp_uri": input.context?.bpp_uri || "unknown",
  },
});
```

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Trace context serialization | Manual W3C header formatting | `propagation.inject/extract` | Handles versioning, edge cases, spec compliance |
| Span linking | Manual link object construction | `createLinkedSpanOptions()` | Already tested in Phase 3, correct link attributes |
| Store extension pattern | Different traceparent fields per store | Uniform `traceparent?: string` | Consistency reduces bugs, easier to reason about |
| Callback handler boilerplate | Extract helper function | Copy-paste pattern | Only 4 callbacks, abstraction adds indirection, clarity > DRY here |
| Signing span placement | Wrap in tenant.signMessage | Wrap in ONDCClient.createAuthorizationHeader | Signing is called inside auth header creation, span nesting correct |

**Key insight:** Phase 3 already validated the pattern. Phase 4 is mechanical replication, not innovation. Copy-paste with find-replace (search → select, search → init, etc.) is the correct approach.

## Common Pitfalls

### Pitfall 1: Forgetting to Import Trace Context Utilities
**What goes wrong:** TypeScript errors for `serializeTraceContext`, `restoreTraceContext`, `createLinkedSpanOptions`
**Why it happens:** Outbound procedures and callbacks need imports from `trace-context-store.ts`
**How to avoid:**
```typescript
// Add to gateway.ts imports (top of file)
import {
  createLinkedSpanOptions,
  restoreTraceContext,
  serializeTraceContext,
} from "../../lib/trace-context-store";
```
**Warning signs:** "Cannot find name 'serializeTraceContext'" TypeScript error

### Pitfall 2: Passing Wrong Number of Parameters to create*Entry()
**What goes wrong:** TypeScript error when calling store functions
**Why it happens:** Adding `traceparent` changes function signature, but call sites may have different parameter counts
**How to avoid:**
```typescript
// Check each store's create*Entry signature
// Example: status-store has DIFFERENT parameters than select-store

// select-store (6 params before traceparent)
await createSelectEntry(kv, transactionId, messageId, itemId, providerId, bppId, bppUri, traceparent);

// status-store (4 params before traceparent)
await createStatusEntry(kv, orderId, transactionId, bppId, bppUri, traceparent);

// Pass `undefined` for ttl if store has ttl parameter (like search-store)
await createSearchEntry(kv, transactionId, messageId, categoryCode, undefined, traceparent);
```
**Warning signs:** "Expected 7 arguments, but got 8" TypeScript error

### Pitfall 3: Missing getSelectEntry/getInitEntry Functions
**What goes wrong:** Callback handlers can't retrieve trace context
**Why it happens:** Not all stores have `get*Entry()` functions (only search-store does currently)
**How to avoid:**
```typescript
// Check if store has get*Entry function
// If missing, add it (copy from search-store pattern)

export async function getSelectEntry(
  kv: TenantKeyValueStore,
  transactionId: string,
  messageId: string,
): Promise<SelectEntry | null> {
  const key = keyFormatter.select(transactionId, messageId);
  return kv.get<SelectEntry>(key);
}
```
**Warning signs:** "Property 'getSelectEntry' does not exist" error in callback handler

### Pitfall 4: Span Naming Inconsistency
**What goes wrong:** Hard to filter spans in SigNoz
**Why it happens:** Using different naming conventions across procedures
**How to avoid:**
```typescript
// CONSISTENT: Use ondc.{action} pattern for all business logic spans
tracer.startActiveSpan("ondc.search", ...)
tracer.startActiveSpan("ondc.select", ...)
tracer.startActiveSpan("ondc.init", ...)
tracer.startActiveSpan("ondc.confirm", ...)
tracer.startActiveSpan("ondc.status", ...)

// Callbacks use on_{action}
tracer.startActiveSpan("ondc.on_search", ...)
tracer.startActiveSpan("ondc.on_select", ...)
tracer.startActiveSpan("ondc.on_init", ...)
tracer.startActiveSpan("ondc.on_confirm", ...)
tracer.startActiveSpan("ondc.on_status", ...)

// Signing span
tracer.startActiveSpan("ondc.sign", ...)

// HTTP client span (already exists)
tracer.startActiveSpan("ondc.http.request", ...)
```
**Warning signs:** SigNoz filter `ondc.*` doesn't show expected spans

### Pitfall 5: Not Handling on_confirm payment_url Attribute
**What goes wrong:** Missing `ondc.payment_url` attribute on on_confirm spans
**Why it happens:** Forgetting CONTEXT.md decision 4 (special attribute for payment URL)
**How to avoid:**
```typescript
// Inside onConfirm callback handler, AFTER setting base attributes
const spanOptions = createLinkedSpanOptions(originalSpanContext, {
  kind: SpanKind.SERVER,
  attributes: {
    "ondc.transaction_id": transactionId,
    "ondc.action": "on_confirm",
    "ondc.bpp_id": input.context?.bpp_id || "unknown",
    "ondc.bpp_uri": input.context?.bpp_uri || "unknown",
  },
});

return tracer.startActiveSpan("ondc.on_confirm", spanOptions, async (span) => {
  try {
    // Extract payment URL from response
    const paymentUrl = input.message?.order?.payments?.[0]?.url;
    if (paymentUrl) {
      span.setAttribute("ondc.payment_url", paymentUrl);  // ADD THIS
    }

    await addConfirmResponse(kv, transactionId, messageId, orderId, input);
    // ... rest of handler
  }
});
```
**Warning signs:** SigNoz query for `ondc.payment_url` attribute returns no results

### Pitfall 6: Forgetting to Update DEFAULT_STORE_TTL_MS
**What goes wrong:** Late callbacks (15+ minutes) lose trace context
**Why it happens:** Forgetting to extend TTL from 10 to 30 minutes
**How to avoid:**
```typescript
// Update in ALL store files (select-store, init-store, confirm-store, status-store)
// BEFORE
const DEFAULT_STORE_TTL_MS = 10 * 60 * 1000;  // 10 minutes

// AFTER
const DEFAULT_STORE_TTL_MS = 30 * 60 * 1000;  // 30 minutes (matching search-store)
```
**Warning signs:** on_confirm/on_status callbacks log "No trace context found" for late responses

## Code Examples

### Example 1: Complete select Procedure with Tracing
```typescript
// Complete pattern: wrap in span, set attributes, serialize context, pass to store
select: publicProcedure
  .input(
    z.object({
      transactionId: z.uuid(),
      bppId: z.string(),
      bppUri: z.url(),
      providerId: z.string(),
      itemId: z.string(),
      parentItemId: z.string(),
      // ... other fields
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { tenant, ondcClient, kv } = ctx;

    return tracer.startActiveSpan("ondc.select", async (span) => {
      try {
        const messageId = uuidv7();

        // ONDC attributes
        span.setAttribute("ondc.transaction_id", input.transactionId);
        span.setAttribute("ondc.message_id", messageId);
        span.setAttribute("ondc.action", "select");
        span.setAttribute("ondc.domain", tenant.domainCode);
        span.setAttribute("ondc.bpp_id", input.bppId);
        span.setAttribute("ondc.bpp_uri", input.bppUri);

        // Serialize trace context
        const traceparent = serializeTraceContext();

        // Store with traceparent
        await createSelectEntry(
          kv,
          input.transactionId,
          messageId,
          input.itemId,
          input.providerId,
          input.bppId,
          input.bppUri,
          traceparent,  // NEW
        );

        // Build payload (existing code)
        const payload = {
          context: {
            action: "select",
            bap_id: tenant.subscriberId,
            bap_uri: `https://${tenant.subscriberId}/api/ondc`,
            bpp_id: input.bppId,
            bpp_uri: input.bppUri,
            domain: tenant.domainCode,
            location: { country: { code: "IND" }, city: { code: "*" } },
            transaction_id: input.transactionId,
            message_id: messageId,
            timestamp: new Date().toISOString(),
            ttl: "PT30S",
            version: "2.0.1",
          },
          message: {
            order: {
              provider: { id: input.providerId },
              items: [{ id: input.itemId, parent_item_id: input.parentItemId }],
            },
          },
        };

        const selectUrl = input.bppUri.endsWith("/")
          ? `${input.bppUri}select`
          : `${input.bppUri}/select`;

        console.log("[Select] Sending request to:", selectUrl);
        const response = await ondcClient.send(selectUrl, "POST", payload);

        span.setStatus({ code: SpanStatusCode.OK });
        return { ...response, transactionId: input.transactionId, messageId };
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }),
```

### Example 2: Complete onSelect Callback with Tracing
```typescript
// Complete pattern: retrieve entry, restore context, create linked span, handle errors
onSelect: publicProcedure
  .input(
    z.object({
      context: z.object({
        transaction_id: z.string().optional(),
        message_id: z.string().optional(),
        bpp_id: z.string().optional(),
        bpp_uri: z.string().optional(),
      }).passthrough().optional(),
      message: z.any().optional(),
      error: z.object({
        type: z.string().optional(),
        code: z.string().optional(),
        message: z.string().optional(),
      }).passthrough().optional(),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const { kv } = ctx;

    console.log("\n\n[on_select] Request Body:\n\n", JSON.stringify(input, null, "\t"));

    const transactionId = input.context?.transaction_id;
    const messageId = input.context?.message_id;

    // Early return if missing keys
    if (!transactionId || !messageId) {
      console.warn("[on_select] Missing transaction_id or message_id");
      return { message: { ack: { status: "ACK" as const } } };
    }

    // Retrieve and restore trace context
    const entry = await getSelectEntry(kv, transactionId, messageId);
    const originalSpanContext = restoreTraceContext(entry?.traceparent);

    if (!entry?.traceparent) {
      console.warn("[on_select] No trace context found for transaction:", transactionId);
    }

    // Create linked span
    const spanOptions = createLinkedSpanOptions(originalSpanContext, {
      kind: SpanKind.SERVER,
      attributes: {
        "ondc.transaction_id": transactionId,
        "ondc.action": "on_select",
        "ondc.bpp_id": input.context?.bpp_id || "unknown",
        "ondc.bpp_uri": input.context?.bpp_uri || "unknown",
      },
    });

    return tracer.startActiveSpan("ondc.on_select", spanOptions, async (span) => {
      try {
        await addSelectResponse(kv, transactionId, messageId, input);

        // Handle BPP errors
        if (input.error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: `BPP error: ${input.error.code || "unknown"} - ${input.error.message || "no message"}`,
          });
        } else {
          span.setStatus({ code: SpanStatusCode.OK });
        }

        return { message: { ack: { status: "ACK" as const } } };
      } catch (error) {
        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: (error as Error).message,
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }),
```

### Example 3: Store Extension (select-store.ts)
```typescript
// BEFORE
export interface SelectEntry {
  transactionId: string;
  messageId: string;
  itemId: string;
  providerId: string;
  bppId: string;
  bppUri: string;
  createdAt: number;
}

const DEFAULT_STORE_TTL_MS = 10 * 60 * 1000;

export async function createSelectEntry(
  kv: TenantKeyValueStore,
  transactionId: string,
  messageId: string,
  itemId: string,
  providerId: string,
  bppId: string,
  bppUri: string,
): Promise<SelectEntry> {
  const entry: SelectEntry = {
    transactionId,
    messageId,
    itemId,
    providerId,
    bppId,
    bppUri,
    createdAt: Date.now(),
  };

  const key = keyFormatter.select(transactionId, messageId);
  await kv.set(key, entry, { ttlMs: DEFAULT_STORE_TTL_MS });
  return entry;
}

// AFTER
export interface SelectEntry {
  transactionId: string;
  messageId: string;
  itemId: string;
  providerId: string;
  bppId: string;
  bppUri: string;
  createdAt: number;
  traceparent?: string;  // NEW
}

const DEFAULT_STORE_TTL_MS = 30 * 60 * 1000;  // UPDATED from 10 to 30 minutes

export async function createSelectEntry(
  kv: TenantKeyValueStore,
  transactionId: string,
  messageId: string,
  itemId: string,
  providerId: string,
  bppId: string,
  bppUri: string,
  traceparent?: string,  // NEW
): Promise<SelectEntry> {
  const entry: SelectEntry = {
    transactionId,
    messageId,
    itemId,
    providerId,
    bppId,
    bppUri,
    createdAt: Date.now(),
    traceparent,  // NEW
  };

  const key = keyFormatter.select(transactionId, messageId);
  await kv.set(key, entry, { ttlMs: DEFAULT_STORE_TTL_MS });
  return entry;
}

// NEW: Add getSelectEntry if missing (needed by onSelect callback)
export async function getSelectEntry(
  kv: TenantKeyValueStore,
  transactionId: string,
  messageId: string,
): Promise<SelectEntry | null> {
  const key = keyFormatter.select(transactionId, messageId);
  return kv.get<SelectEntry>(key);
}
```

### Example 4: Signing Span (ONDCClient.createAuthorizationHeader)
```typescript
// BEFORE
async createAuthorizationHeader(body: object): Promise<string> {
  const digest = calculateDigest(body);

  // ... created/expires calculation (existing code)

  const signingString = `(created): ${created}\n(expires): ${expires}\ndigest: BLAKE-512=${digest}`;

  console.log("[Signing] Created:", created, "from timestamp:", bodyWithContext?.context?.timestamp);

  const signature = this.tenant.signMessage(signingString);

  const keyId = `${this.tenant.subscriberId}|${this.tenant.uniqueKeyId.value}|ed25519`;
  return `Signature keyId="${keyId}",algorithm="ed25519",created="${created}",expires="${expires}",headers="(created) (expires) digest",signature="${signature}"`;
}

// AFTER (with signing span)
async createAuthorizationHeader(body: object): Promise<string> {
  const digest = calculateDigest(body);

  // ... created/expires calculation (existing code)

  const signingString = `(created): ${created}\n(expires): ${expires}\ndigest: BLAKE-512=${digest}`;

  console.log("[Signing] Created:", created, "from timestamp:", bodyWithContext?.context?.timestamp);

  // NEW: Wrap signing in span for timing visibility
  const signature = this.tracer.startActiveSpan("ondc.sign", (span) => {
    try {
      const sig = this.tenant.signMessage(signingString);
      span.setStatus({ code: 1 as typeof SpanStatusCode.OK });
      return sig;
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({
        code: 2 as typeof SpanStatusCode.ERROR,
        message: (error as Error).message,
      });
      throw error;
    } finally {
      span.end();
    }
  });

  const keyId = `${this.tenant.subscriberId}|${this.tenant.uniqueKeyId.value}|ed25519`;
  return `Signature keyId="${keyId}",algorithm="ed25519",created="${created}",expires="${expires}",headers="(created) (expires) digest",signature="${signature}"`;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No async callback tracing | Linked spans via Redis-stored traceparent | Phase 3 (2026-02) | on_search callbacks appear in same trace as search request |
| Search-only tracing | All 5 ONDC flows traced | Phase 4 (2026-02) | Complete transactionId visibility across full user journey |
| No signing visibility | Ed25519 signing as child spans | Phase 4 (2026-02) | Cryptographic latency visible in trace waterfall |
| 10-minute trace context TTL | 30-minute TTL | Phase 3/4 (2026-02) | Late callbacks (payment, policy) still correlate |

**Deprecated/outdated:**
- Manual trace correlation via console logs: OpenTelemetry spans replace log grepping
- Per-request Redis keys without TTL extension: 30-minute TTL is new standard

## Open Questions

1. **Signing span granularity**
   - What we know: `tenant.signMessage()` is called inside `ONDCClient.createAuthorizationHeader()` which is called inside `send()`
   - What's unclear: Whether signing span should wrap just `signMessage()` or entire auth header creation (which includes digest calculation)
   - Recommendation: Wrap only `signMessage()` call (minimal span, focused on crypto operation timing)

2. **Callback helper extraction**
   - What we know: All 5 callback handlers follow identical pattern (restore → link → wrap → handle error)
   - What's unclear: Whether extracting a `wrapCallbackWithTrace()` helper reduces duplication enough to justify abstraction
   - Recommendation: Don't extract. Only 5 callbacks, pattern is clear, abstraction adds indirection. Copy-paste is fine here.

3. **Span naming for signing**
   - What we know: User decided "minimal attributes, inside HTTP client"
   - What's unclear: `ondc.sign` vs `ondc.crypto.sign` vs `ondc.signing`
   - Recommendation: `ondc.sign` (matches pattern: short, clear, filterable)

4. **on_status polling spans**
   - What we know: Status may be called multiple times (polling)
   - What's unclear: Should each poll create a new linked span or reuse the same span?
   - Recommendation: Create new linked span per poll response (trace shows polling timeline, useful for debugging slow BPP responses)

## Sources

### Primary (HIGH confidence)
- **Phase 3 Implementation:** `.planning/phases/03-async-callback-correlation/03-02-SUMMARY.md` - Exact pattern for search/on_search tracing
- **Existing Code:**
  - `server/src/trpc/routers/gateway.ts` - Current procedures and callbacks (lines 27-905)
  - `server/src/lib/search-store.ts` - SearchEntry with traceparent field (line 113)
  - `server/src/lib/trace-context-store.ts` - Reusable utilities (lines 27-102)
  - `server/src/lib/ondc/client.ts` - HTTP client and signing location (lines 30-62)
  - `server/src/entities/tenant.ts` - signMessage implementation (lines 190-210)
- **Phase 4 CONTEXT.md:** User decisions on store extension, signing spans, callback patterns, payload strategy
- **OpenTelemetry API docs:** Verified span creation, context propagation, span links APIs

### Secondary (MEDIUM confidence)
- None for this phase (all patterns already validated in Phase 3)

### Tertiary (LOW confidence)
- None (research based entirely on existing codebase and Phase 3 learnings)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed and configured in Phase 1-3
- Architecture patterns: HIGH - Phase 3 validates the exact pattern to replicate
- Store extensions: HIGH - SearchEntry pattern is clear and consistent
- Signing spans: MEDIUM - Placement inside createAuthorizationHeader is clear, but sync/async handling may need adjustment
- Pitfalls: HIGH - Based on actual Phase 3 implementation and TypeScript constraints

**Research date:** 2026-02-15
**Valid until:** 2026-03-15 (30 days - stable tech, OpenTelemetry patterns unchanged since Phase 1)

---

*Research methodology: Analyzed Phase 3 implementation (search/on_search pattern), examined existing gateway.ts procedures (select, init, confirm, status), verified store structures (select-store, init-store, confirm-store, status-store), reviewed trace-context utilities, located signing call chain, applied CONTEXT.md user decisions.*
