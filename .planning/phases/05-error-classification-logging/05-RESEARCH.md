# Phase 5: Error Classification & Logging - Research

**Researched:** 2026-02-16
**Domain:** Structured logging with OpenTelemetry integration and error source attribution
**Confidence:** HIGH

## Summary

This research covers how to implement structured logging with pino and error source classification for an OpenTelemetry-instrumented Express/tRPC application. The standard approach uses pino as the logging library with automatic trace context injection via `@opentelemetry/instrumentation-pino`, and classifies errors by source (BAP/BPP/gateway/network) using HTTP status codes and error types. The codebase currently has 119 console.* calls that need migration to structured logging.

Based on the user's decisions, the implementation will use pino with automatic OpenTelemetry instrumentation for trace context injection, classify errors into 4 categories (bap/bpp/gateway/network), and migrate all console.log calls to structured pino logging. The error classification logic will be centralized in the ONDC HTTP client where all outbound errors originate.

**Primary recommendation:** Use `@opentelemetry/instrumentation-pino` for automatic trace context injection, classify errors by HTTP status codes in the ONDC client, and migrate console.* calls to pino in order of criticality (error handlers first, then callbacks, then request flows, then startup logs last).

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| pino | ^9.x | Fast JSON logger | Industry standard for Node.js structured logging, fastest logger available, built-in OpenTelemetry support |
| @opentelemetry/instrumentation-pino | ^0.57.x | Auto-inject trace context | Official OpenTelemetry instrumentation, automatically adds trace_id/span_id to logs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pino-pretty | ^13.x | Dev-friendly log formatting | Development only (install as devDependency), prettifies JSON logs with colors |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| @opentelemetry/instrumentation-pino | Manual mixin function | Instrumentation is cleaner, mixin requires manual context.active() calls and less flexible |
| pino-pretty (development) | jq pipe | pino-pretty is purpose-built for pino, jq is generic but requires extra shell setup |
| pino | winston | pino is 5x faster, simpler API, better OTel support; winston has more transports but complexity |

**Installation:**
```bash
pnpm add pino @opentelemetry/instrumentation-pino
pnpm add -D pino-pretty
```

## Architecture Patterns

### Recommended Project Structure
```
server/src/
├── lib/
│   └── logger.ts           # Pino logger factory with conditional transport
├── lib/ondc/
│   ├── client.ts           # Error classification logic (classifyErrorSource)
│   └── error-classifier.ts # Error source classification helper
└── tracing.ts              # Add PinoInstrumentation to instrumentations array
```

### Pattern 1: Conditional Transport for Dev/Prod
**What:** Use pino-pretty in development, JSON in production via conditional transport
**When to use:** All environments - configuration determines output format
**Example:**
```typescript
// Source: pino-pretty documentation + Better Stack guide
import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  transport: isDevelopment ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname', // Less noise
    },
  } : undefined, // Production uses default JSON output
});
```

### Pattern 2: Automatic Trace Context Injection
**What:** Use `@opentelemetry/instrumentation-pino` to auto-inject trace_id/span_id into every log
**When to use:** Always - required for trace-log correlation
**Example:**
```typescript
// Source: @opentelemetry/instrumentation-pino npm docs
// In tracing.ts
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';

instrumentations: [
  getNodeAutoInstrumentations({
    // ... existing config
  }),
  new PinoInstrumentation({
    // Optional: customize field names (defaults are trace_id, span_id, trace_flags)
    logKeys: {
      traceId: 'trace_id',
      spanId: 'span_id',
      traceFlags: 'trace_flags',
    },
  }),
],
```

### Pattern 3: HTTP Error Classification
**What:** Classify errors by source using HTTP status codes and error types
**When to use:** In ONDC HTTP client error handler - single point of error classification
**Example:**
```typescript
// Source: HTTP status code standards + OpenTelemetry error recording best practices
type ErrorSource = 'bap' | 'bpp' | 'gateway' | 'network';

function classifyErrorSource(error: Error, response?: Response): ErrorSource {
  // Network failures (fetch errors before response)
  if (!response) {
    if (error.message.includes('ECONNREFUSED') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('DNS')) {
      return 'network';
    }
  }

  // HTTP response errors
  if (response) {
    const status = response.status;

    // BPP errors (4xx/5xx from BPP endpoint)
    if (status >= 400 && status < 600) {
      return 'bpp';
    }
  }

  // Gateway errors (ONDC registry/routing failures)
  // These are identifiable by URL pattern or specific error messages
  if (error.message.includes('gateway') ||
      error.message.includes('registry')) {
    return 'gateway';
  }

  // Default to BAP (our validation/code errors)
  return 'bap';
}
```

### Pattern 4: Error Span Enrichment
**What:** Always use span.recordException() and add error.source attribute
**When to use:** Every error handler in traced code
**Example:**
```typescript
// Source: OpenTelemetry error recording spec
try {
  await ondcClient.send(url, 'POST', payload);
} catch (error) {
  const errorSource = classifyErrorSource(error as Error);

  // Record full exception with stack trace
  span.recordException(error as Error);

  // Add error source classification
  span.setAttribute('error.source', errorSource);

  // Set span status to ERROR
  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: (error as Error).message,
  });

  // Structured logging with context
  logger.error({ error, errorSource }, 'ONDC request failed');

  throw error;
}
```

### Pattern 5: Request/Callback Logging
**What:** Log every ONDC request and callback at info level with structured context
**When to use:** Gateway routers, callback handlers
**Example:**
```typescript
// Source: CONTEXT.md decisions + pino best practices
// Outbound request
logger.info({
  action: 'search',
  transactionId,
  messageId,
  gatewayUrl: gatewayUrl.toString(),
}, 'Sending ONDC request');

// Callback arrival
logger.info({
  action: 'on_search',
  transactionId,
  bppId: input.context?.bpp_id,
}, 'Received ONDC callback');

// BPP NACK/error response
if (input.error) {
  logger.warn({
    transactionId,
    bppError: input.error,
  }, 'BPP returned NACK response');
}
```

### Anti-Patterns to Avoid
- **Using console.* in traced code:** Loses trace correlation, no structured fields, can't query in SigNoz
- **Adding transactionId to log lines manually:** Traces already have ONDC context in span attributes, redundant
- **Recording same exception multiple times:** OpenTelemetry spec says NOT RECOMMENDED - record once at error origin
- **Setting ERROR status for BPP 4xx responses:** 4xx is client error, server worked correctly - use OK status with error attribute
- **Pretty printing in production:** Kills performance, use JSON for log aggregators

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Trace context injection | Custom context.active() mixin | @opentelemetry/instrumentation-pino | Official instrumentation handles edge cases, auto-updates with OTel SDK, tested in production |
| Log formatting | Custom JSON.stringify wrapper | pino with conditional transport | pino is 5x faster, handles circular refs, buffers efficiently, 10 years battle-tested |
| Error classification logic | Ad-hoc if/else in each handler | Centralized classifier function | Single source of truth, consistent attribution, easier to test/update |
| Development log prettification | Custom colorization | pino-pretty | Handles all pino features (child loggers, serializers, multi-line), actively maintained |

**Key insight:** Logging seems trivial but has deep performance/correctness implications. Pino is the fastest logger because it uses worker threads, Sonicboom buffering, and avoids JSON.stringify for hot paths. Custom solutions miss these optimizations and are slower by 5-10x.

## Common Pitfalls

### Pitfall 1: Installing pino-pretty as Production Dependency
**What goes wrong:** Production logs become slow and harder to parse by log aggregators
**Why it happens:** Developers copy-paste dev config to production or forget to check NODE_ENV
**How to avoid:** Install pino-pretty as devDependency only, use conditional transport checking NODE_ENV
**Warning signs:** Logs in production have ANSI color codes, log aggregator can't parse fields, high CPU usage for logging

### Pitfall 2: Not Recording Exceptions Before Rethrowing
**What goes wrong:** Error loses trace context when rethrown, appears in different span or no span
**Why it happens:** Assuming throw error automatically records to active span
**How to avoid:** Always call span.recordException(error) before throw error
**Warning signs:** Errors visible in logs but missing from span events in SigNoz

### Pitfall 3: Overclassifying BPP Errors as BAP Errors
**What goes wrong:** BPP returning 500 gets attributed to BAP, hiding BPP reliability issues
**Why it happens:** Error classification defaults to 'bap' without checking HTTP status
**How to avoid:** Check response.status first, classify 4xx/5xx as 'bpp' before falling back to 'bap'
**Warning signs:** All errors show error.source=bap in SigNoz, no BPP errors visible

### Pitfall 4: Adding Duplicate Context Fields
**What goes wrong:** Log lines contain both trace_id (from instrumentation) and manually added transactionId
**Why it happens:** Not understanding that span attributes already carry ONDC context
**How to avoid:** Trust OTel instrumentation for trace_id/span_id, only log fields NOT in span attributes
**Warning signs:** Log line size balloons, duplicate data in SigNoz correlation

### Pitfall 5: Forgetting to Import Tracing Before Pino
**What goes wrong:** PinoInstrumentation doesn't auto-instrument, logs have no trace context
**Why it happens:** Import order matters - pino must be imported after tracing.ts initializes SDK
**How to avoid:** Keep import "./tracing" as first line in entry point, create logger after SDK init
**Warning signs:** Logs appear in console but trace_id/span_id are always missing

## Code Examples

Verified patterns from official sources:

### Logger Factory with Conditional Transport
```typescript
// Source: SigNoz pino guide + Better Stack pino guide
// server/src/lib/logger.ts
import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),

  // Only use pretty transport in development
  transport: isDevelopment ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss Z',
      ignore: 'pid,hostname', // Reduce noise
      singleLine: false, // Multi-line for readability
    },
  } : undefined, // Production uses fast JSON output
});

// Usage in files
import { logger } from '../lib/logger';

logger.info({ transactionId, action: 'search' }, 'Starting ONDC search');
logger.error({ error, errorSource: 'bpp' }, 'BPP request failed');
```

### Enable Pino Instrumentation in OpenTelemetry SDK
```typescript
// Source: @opentelemetry/instrumentation-pino npm package
// server/src/tracing.ts (add to existing file)
import { PinoInstrumentation } from '@opentelemetry/instrumentation-pino';

// Inside NodeSDK initialization
instrumentations: [
  getNodeAutoInstrumentations({
    // ... existing auto-instrumentation config
  }),
  new PinoInstrumentation({
    // Use default field names (trace_id, span_id, trace_flags)
    // These match SigNoz expectations
  }),
],
```

### Error Classification in ONDC Client
```typescript
// Source: HTTP status code standards + CONTEXT.md decisions
// server/src/lib/ondc/client.ts (modify existing error handler)
import { logger } from '../logger';

type ErrorSource = 'bap' | 'bpp' | 'gateway' | 'network';

function classifyErrorSource(
  error: Error,
  response?: Response,
  url?: string
): ErrorSource {
  // Network connectivity failures
  if (!response) {
    if (error.message.includes('ECONNREFUSED') ||
        error.message.includes('ETIMEDOUT') ||
        error.message.includes('ENOTFOUND') ||
        error.message.includes('DNS') ||
        error.name === 'AbortError') {
      return 'network';
    }
  }

  // HTTP errors from BPP
  if (response && response.status >= 400) {
    return 'bpp';
  }

  // Gateway/registry failures (by URL pattern)
  if (url?.includes('/lookup') ||
      url?.includes('/subscribe') ||
      error.message.toLowerCase().includes('gateway') ||
      error.message.toLowerCase().includes('registry')) {
    return 'gateway';
  }

  // Default: our validation/code errors
  return 'bap';
}

// In ONDCClient.send() error handler
catch (error) {
  const errorSource = classifyErrorSource(
    error as Error,
    response,
    url.toString()
  );

  // Span enrichment
  span.recordException(error as Error);
  span.setAttribute('error.source', errorSource);
  span.setStatus({
    code: 2 as typeof SpanStatusCode.ERROR,
    message: (error as Error).message,
  });

  // Structured logging (trace context auto-injected)
  logger.error({
    error: (error as Error).message,
    errorSource,
    url: url.toString(),
  }, 'ONDC request failed');

  throw error;
}
```

### BPP NACK Response Handling
```typescript
// Source: CONTEXT.md decisions + OpenTelemetry error recording spec
// In callback handlers (on_search, on_select, etc.)
import { logger } from '../../lib/logger';

// Check for BPP error response
if (input.error) {
  // Log as warning (BPP's problem, not ours)
  logger.warn({
    transactionId,
    bppError: input.error,
    bppId: input.context?.bpp_id,
  }, 'BPP returned NACK response');

  // Set span status to ERROR with source attribution
  span.setAttribute('error.source', 'bpp');
  span.setAttribute('error.code', input.error.code || 'unknown');
  span.setAttribute('bpp.error', JSON.stringify(input.error));

  span.setStatus({
    code: SpanStatusCode.ERROR,
    message: `BPP error: ${input.error.code || 'unknown'} - ${input.error.message || 'no message'}`,
  });
}
```

### Migration Pattern for Console Statements
```typescript
// Source: Existing codebase console.* analysis + pino best practices

// BEFORE: Console logging
console.log("[Search] Sending request to:", gatewayUrl.toString());
console.log("[Search] Payload:", JSON.stringify(payload, null, "\t"));

// AFTER: Structured logging
logger.info({
  action: 'search',
  gatewayUrl: gatewayUrl.toString(),
  payload, // pino serializes objects automatically
}, 'Sending ONDC search request');

// BEFORE: Console error
console.error(`[ONDCClient] Error sending to ${url}:`, error);

// AFTER: Structured error (trace context auto-injected)
logger.error({
  error: (error as Error).message,
  url: url.toString(),
}, 'ONDC request failed');

// BEFORE: Console warn
console.warn("[on_search] No transaction_id found in context");

// AFTER: Structured warning
logger.warn({
  action: 'on_search',
  context: input.context,
}, 'Missing transaction_id in callback context');
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual trace ID injection | @opentelemetry/instrumentation-pino | 2023 (v0.30+) | Automatic trace context in all logs, no manual context.active() calls |
| pino-pretty as dependency | pino-pretty as devDependency + conditional transport | 2022 (pino v8) | Production perf improvement, clear dev/prod separation |
| Single logger instance | Logger factory with conditional config | 2021 (pino v7) | Environment-aware configuration, cleaner imports |
| Custom error classification | Centralized classifier by HTTP status | Ongoing best practice | Consistent error attribution, easier to test |

**Deprecated/outdated:**
- `pino.pretty()` method: Deprecated in pino v7, use transport instead
- Log sending via PinoInstrumentation: Superseded by pino-opentelemetry-transport for production (we don't need it, just correlation)
- Manual mixin for trace context: Still works but instrumentation is cleaner and recommended

## Open Questions

Things that couldn't be fully resolved:

1. **Should we use pino-opentelemetry-transport for log sending?**
   - What we know: It sends logs as OTLP log signals to SigNoz alongside traces
   - What's unclear: Whether SigNoz handles log ingestion well, if it adds value over trace-correlated console logs
   - Recommendation: Skip for now, just use correlation (trace_id/span_id in logs). Can add later if needed

2. **What log retention policy in SigNoz?**
   - What we know: SigNoz stores logs in ClickHouse, configurable retention
   - What's unclear: Default retention period, disk usage implications
   - Recommendation: Check SigNoz docs during implementation, start with 7-day retention

3. **Should we log full payloads to pino or only to spans?**
   - What we know: Spans already have full payloads (http.request.body attribute)
   - What's unclear: If duplicating to logs adds value or just burns disk
   - Recommendation: Log metadata only (transactionId, action, url), not full payload - reduces duplication

4. **Network error timeout thresholds?**
   - What we know: fetch() uses default timeout (none)
   - What's unclear: What timeout threshold distinguishes slow BPP from network failure
   - Recommendation: Accept current behavior, classify AbortError as network, let ONDC gateway handle timeouts

## Sources

### Primary (HIGH confidence)
- [@opentelemetry/instrumentation-pino - npm](https://www.npmjs.com/package/@opentelemetry/instrumentation-pino) - Installation, configuration, log correlation setup
- [Pino Logger: Complete Node.js Guide with Examples [2026] | SigNoz](https://signoz.io/guides/pino-logger/) - Development vs production setup, OTel integration patterns
- [A Complete Guide to Pino Logging in Node.js | Better Stack Community](https://betterstack.com/community/guides/logging/how-to-install-setup-and-use-pino-to-log-node-js-applications/) - Basic configuration, transport patterns
- [Recording errors | OpenTelemetry](https://opentelemetry.io/docs/specs/semconv/general/recording-errors/) - Error recording best practices, recordException usage
- [pino-pretty - GitHub](https://github.com/pinojs/pino-pretty) - Dev-only usage, performance considerations

### Secondary (MEDIUM confidence)
- [How to Inject Trace IDs into Application Logs with OpenTelemetry SDKs](https://oneuptime.com/blog/post/2026-02-06-inject-trace-ids-application-logs-opentelemetry/view) - Trace context injection patterns
- [How to Use OpenTelemetry Span Status (Unset, Ok, Error) Correctly](https://oneuptime.com/blog/post/2026-02-06-otel-span-status-correct-error-classification/view) - 4xx vs 5xx error status guidelines
- [HTTP response status codes - MDN](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status) - HTTP status code meanings for classification
- [Deep Observability in Node.js Using OpenTelemetry and Pino](https://dzone.com/articles/observability-nodejs-opentelemetry-pino) - Integration patterns

### Tertiary (LOW confidence)
- Web search results for pino child logger patterns - Community examples, unverified

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - pino and @opentelemetry/instrumentation-pino are industry standard with official docs
- Architecture: HIGH - Patterns verified from official pino docs, OpenTelemetry specs, and SigNoz guides
- Pitfalls: MEDIUM - Derived from community experiences and documentation warnings, some are hypothetical

**Research date:** 2026-02-16
**Valid until:** 2026-04-16 (60 days - logging libraries are stable, slow-moving domain)
