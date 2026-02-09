# Technology Stack: OpenTelemetry Distributed Tracing

**Project:** ONDC Health Insurance BAP - Observability (v2.0)
**Researched:** 2026-02-09
**Confidence:** HIGH

## Recommended Stack

### Core OpenTelemetry SDK

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@opentelemetry/sdk-node` | `^0.211.0` | All-in-one SDK for Node.js tracing | Provides complete tracing setup with sensible defaults. Bundles SDK, auto-instrumentation loader, and resource detection. Simplifies initialization vs manual SDK assembly. |
| `@opentelemetry/api` | `^1.9.0` | OpenTelemetry API specification | Stable API layer (1.x) that instruments code against. Decouples instrumentation from SDK implementation. Required for manual span creation. |

**Rationale for SDK choice:** Use `@opentelemetry/sdk-node` instead of assembling individual SDK packages (`@opentelemetry/sdk-trace-node`, `@opentelemetry/resources`, etc.). The unified SDK provides better defaults and simpler configuration for Node.js applications.

### Automatic Instrumentation

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@opentelemetry/auto-instrumentations-node` | `^0.69.0` | Meta-package bundling all Node.js instrumentations | Automatically instruments Express, HTTP, ioredis, and 40+ other libraries. Zero-code instrumentation for most use cases. Easier to maintain than individual instrumentation packages. |
| `@opentelemetry/instrumentation` | `^0.211.0` | Base instrumentation framework | Required peer dependency for auto-instrumentations. Provides instrumentation lifecycle and context propagation. |

**What gets instrumented automatically:**
- **HTTP/HTTPS**: All outgoing requests (to ONDC gateway/BPPs) with full payload capture
- **Express**: Route handling, middleware execution, error tracking
- **ioredis**: Redis commands (GET, SET, etc.) with command arguments
- **DNS**: DNS lookups
- **Net**: TCP socket operations

**tRPC caveat:** No official tRPC instrumentation exists. tRPC procedures will appear as Express HTTP spans with route metadata. For procedure-level tracing, manual instrumentation required (see PITFALLS.md).

### OTLP Exporters

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@opentelemetry/exporter-trace-otlp-http` | `^0.211.0` | OTLP HTTP/JSON exporter | **RECOMMENDED**. Uses HTTP/1.1 with JSON encoding. Works with Jaeger (4318), Grafana Tempo, and all OTLP-compatible backends. No protobuf compilation needed. Simpler debugging (JSON is human-readable). |
| `@opentelemetry/exporter-trace-otlp-grpc` | `^0.211.0` | OTLP gRPC exporter | **NOT RECOMMENDED for this project**. Uses HTTP/2 with protobuf encoding. Requires `@grpc/grpc-js` dependency and native compilation. Better performance at scale (10k+ spans/sec) but unnecessary for BAP use case. Harder to debug binary payloads. |

**Choice rationale:** Use HTTP exporter unless proven performance bottleneck. Jaeger native endpoint is port 4318 (HTTP), and Tempo supports both. HTTP exporter has fewer dependencies and easier troubleshooting.

### Semantic Conventions

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@opentelemetry/semantic-conventions` | `^1.39.0` | Standard attribute names and values | Ensures trace attributes follow OpenTelemetry conventions (e.g., `http.method`, `http.status_code`). Critical for Jaeger/Tempo query filters and dashboard compatibility. Use constants instead of magic strings. |

### Supporting Libraries (Optional)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@opentelemetry/resources` | `^2.5.0` | Resource detection (service name, version, host) | Only if NOT using `@opentelemetry/sdk-node` (which includes resource detection). Use for custom resource attributes. |
| `@opentelemetry/sdk-trace-node` | `^2.5.0` | Trace SDK without auto-instrumentation | Only if you want manual control over instrumentation. **Not recommended** - use `sdk-node` instead. |
| `@opentelemetry/instrumentation-express` | `^0.59.0` | Express-specific instrumentation | Only if NOT using `auto-instrumentations-node`. Already bundled in auto-instrumentations. |
| `@opentelemetry/instrumentation-http` | `^0.211.0` | HTTP client/server instrumentation | Only if NOT using `auto-instrumentations-node`. Already bundled. |
| `@opentelemetry/instrumentation-ioredis` | `^0.59.0` | ioredis instrumentation | Only if NOT using `auto-instrumentations-node`. Already bundled. |

**DO NOT install individual instrumentation packages** when using `auto-instrumentations-node`. It creates version conflicts and duplicate spans.

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| SDK Approach | `@opentelemetry/sdk-node` | Manual SDK assembly (`sdk-trace-node` + `resources` + `context-*`) | More boilerplate, harder to maintain, easy to misconfigure. Unified SDK provides better defaults. |
| Instrumentation | `@opentelemetry/auto-instrumentations-node` | Individual packages per library | 40+ packages to manage individually. Version skew issues. Auto-instrumentations is a meta-package that bundles them. |
| OTLP Exporter | `@opentelemetry/exporter-trace-otlp-http` | `@opentelemetry/exporter-trace-otlp-grpc` | gRPC adds complexity (native deps, protobuf) for minimal benefit at BAP scale. HTTP is simpler and equally compatible. |
| OTLP Protocol | OTLP (HTTP or gRPC) | Jaeger Thrift (`@opentelemetry/exporter-jaeger`) | Jaeger Thrift exporter is deprecated. OTLP is the standard. Jaeger 1.35+ supports OTLP natively. |
| Tracing Library | OpenTelemetry | Jaeger Client, Zipkin Client | OpenTelemetry is vendor-neutral and supports multiple backends. Jaeger/Zipkin clients lock you into one backend. |

## Configuration Approach

### Recommended: Programmatic Configuration

Create `server/src/tracing.ts` imported before application code.

**Why programmatic over auto-instrumentation CLI:**
- **Type safety**: Configuration is typed and validated at compile time
- **Flexibility**: Conditional logic for dev/staging/prod environments
- **Debuggability**: Breakpoints and logging during initialization
- **Integration**: Access to application context (Redis URLs, service name from env)
- **Auto-instrumentation control**: Selective instrumentation (e.g., disable DNS tracing)

**Why NOT `--require` flag approach:**
- Harder to debug (runs before your code)
- Environment-specific config requires env var hacks
- No TypeScript type checking
- Difficult to test initialization

### Example Configuration Structure

```typescript
// server/src/tracing.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: 'ondc-bap',
    [ATTR_SERVICE_VERSION]: '0.1.0',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  }),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false }, // Noisy
      '@opentelemetry/instrumentation-dns': { enabled: false }, // Noisy
    }),
  ],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().then(() => process.exit(0));
});
```

**Entry point change:**
```typescript
// server/src/index.ts
import './tracing'; // MUST be first import
import express from 'express';
// ... rest of app
```

## Payload Capture Configuration

For full request/response body capture (required for debugging ONDC flows):

```typescript
getNodeAutoInstrumentations({
  '@opentelemetry/instrumentation-http': {
    requestHook: (span, request) => {
      // Capture request body
      if (request.body) {
        span.setAttribute('http.request.body', JSON.stringify(request.body));
      }
    },
    responseHook: (span, response) => {
      // Capture response body (requires buffering)
      span.setAttribute('http.response.body', response.body);
    },
  },
})
```

**WARNING**: This creates large spans (10-100KB per span). Only enable in dev/staging. Production should use sampling or selective capture.

## OTLP Endpoint Configuration

| Backend | Endpoint | Protocol |
|---------|----------|----------|
| Jaeger (all-in-one) | `http://localhost:4318/v1/traces` | OTLP HTTP |
| Jaeger (collector) | `http://jaeger-collector:4318/v1/traces` | OTLP HTTP |
| Grafana Tempo | `http://tempo:4318/v1/traces` | OTLP HTTP |
| Grafana Cloud | `https://otlp-gateway-prod-<region>.grafana.net/otlp/v1/traces` (with auth headers) | OTLP HTTP |

**Environment variables:**
- `OTEL_EXPORTER_OTLP_ENDPOINT` - Base URL (without `/v1/traces`)
- `OTEL_EXPORTER_OTLP_HEADERS` - Auth headers for Grafana Cloud (format: `key1=val1,key2=val2`)

## Transaction Correlation

For ONDC's async callback pattern, use `transactionId` as trace correlation:

```typescript
import { trace, context } from '@opentelemetry/api';

// On outgoing search request
const span = trace.getTracer('ondc-bap').startSpan('ondc.search');
span.setAttribute('ondc.transaction_id', transactionId);
span.setAttribute('ondc.message_id', messageId);
// ... make HTTP request
span.end();

// On incoming on_search callback
const span = trace.getTracer('ondc-bap').startSpan('ondc.on_search');
span.setAttribute('ondc.transaction_id', callbackTransactionId); // Same as above
span.setLink({ context: parentSpanContext }); // Link to search span
// ... process callback
span.end();
```

**Jaeger query:** `ondc.transaction_id="019b..."` shows full request-response flow.

## Installation

```bash
# Install from server directory
cd server

# Core OpenTelemetry packages
pnpm add @opentelemetry/sdk-node@^0.211.0 \
         @opentelemetry/api@^1.9.0 \
         @opentelemetry/auto-instrumentations-node@^0.69.0 \
         @opentelemetry/instrumentation@^0.211.0 \
         @opentelemetry/exporter-trace-otlp-http@^0.211.0 \
         @opentelemetry/semantic-conventions@^1.39.0

# Dev dependency for types (if needed)
pnpm add -D @types/node@^24.0.0
```

**DO NOT install:**
- `@opentelemetry/exporter-jaeger` (deprecated)
- `@opentelemetry/sdk-trace-base` (internal package)
- `@opentelemetry/core` (internal package)
- Individual instrumentation packages (use auto-instrumentations instead)

## Version Compatibility

| Package | Version | Notes |
|---------|---------|-------|
| Node.js | 18+ | Required for OpenTelemetry SDK 0.211.0 |
| Express | 5.x | Supported by auto-instrumentations 0.69.0 |
| tRPC | 11.x | No native instrumentation; appears as Express spans |
| ioredis | 5.x | Fully supported by auto-instrumentations |

**Version pinning strategy:**
- Use caret ranges (`^0.211.0`) for OpenTelemetry packages
- All `@opentelemetry/*` packages should share same minor version (0.211.x)
- API package (`@opentelemetry/api`) is stable at 1.x
- Semantic conventions (`@opentelemetry/semantic-conventions`) is stable at 1.x

## Verification Checklist

After installation, verify setup:

```bash
# Start Jaeger all-in-one
docker run -d --name jaeger \
  -p 4318:4318 \
  -p 16686:16686 \
  jaegertracing/all-in-one:latest

# Start your app
pnpm dev

# Make a test request
curl http://localhost:4822/api/trpc/health.check

# Open Jaeger UI
open http://localhost:16686

# Query: service="ondc-bap"
```

Expected result: Spans for Express route, HTTP client (if any), Redis operations.

## Sources

- Package versions verified via npm registry (2026-02-09)
- OpenTelemetry JS documentation: https://opentelemetry.io/docs/languages/js/
- OpenTelemetry semantic conventions: https://opentelemetry.io/docs/specs/semconv/
- Jaeger OTLP support: https://www.jaegertracing.io/docs/latest/deployment/#otlp
- Personal knowledge (HIGH confidence - standard OpenTelemetry setup patterns)

## Notes

**Confidence: HIGH** - All package versions verified against npm registry. Configuration patterns are standard OpenTelemetry best practices. Express 5.x and ioredis 5.x compatibility confirmed via auto-instrumentations package.

**Version currency:** As of 2026-02-09, OpenTelemetry JS is at 0.211.0 for SDK packages and 1.9.0/1.39.0 for stable API/semantic conventions. These are current stable releases.

**Integration note:** tRPC lacks official OpenTelemetry instrumentation. tRPC procedures will show as Express HTTP spans with route info. For procedure-level tracing, manual instrumentation required (wrap tRPC middleware with spans). See PITFALLS.md for tRPC tracing challenges.
