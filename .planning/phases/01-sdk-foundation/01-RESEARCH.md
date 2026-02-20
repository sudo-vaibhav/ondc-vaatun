# Phase 1: SDK Foundation - Research

**Researched:** 2026-02-09
**Domain:** OpenTelemetry SDK Integration for Node.js Express + tRPC
**Confidence:** HIGH

## Summary

Phase 1 establishes OpenTelemetry tracing foundation for the ONDC BAP application. The stack consists of 6 core packages that provide auto-instrumentation for Express 5.x, HTTP/HTTPS clients, and ioredis 5.x operations. The critical architectural requirement is import order: tracing initialization MUST occur before any application code imports to enable auto-instrumentation monkey-patching.

**Current state:** Server uses `tsx --env-file ../.env src/index.ts` for development with Express 5.0.1, ioredis 5.6.1, and tRPC 11.x. Entry point (`server/src/index.ts`) currently imports `./app` which loads Express before any tracing setup exists.

**Target state:** New `server/src/tracing.ts` file imported first in entry point, configuring NodeSDK with OTLP HTTP exporter pointing to local SigNoz on port 4318. Auto-instrumentation captures HTTP/Express/Redis spans visible in SigNoz UI with service name "ondc-bap".

**Primary recommendation:** Install 6 OpenTelemetry packages, create tracing.ts with programmatic SDK initialization, prepend import to index.ts, and verify with SigNoz docker-compose local deployment.

## Standard Stack

The established libraries/tools for Node.js OpenTelemetry integration:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@opentelemetry/sdk-node` | `^0.211.0` | All-in-one Node.js SDK | Bundles SDK, auto-instrumentation loader, resource detection. Simplifies setup vs manual SDK assembly. Official recommendation for Node.js. |
| `@opentelemetry/api` | `^1.9.0` | OpenTelemetry API specification | Stable 1.x API for manual span creation. Decouples instrumentation from SDK. Required for custom spans. |
| `@opentelemetry/auto-instrumentations-node` | `^0.69.0` | Meta-package with 40+ instrumentations | Zero-code instrumentation for Express, HTTP, ioredis, DNS. Single package vs managing individual libraries. |
| `@opentelemetry/instrumentation` | `^0.211.0` | Base instrumentation framework | Required peer dependency for auto-instrumentations. Provides lifecycle and context propagation. |
| `@opentelemetry/exporter-trace-otlp-http` | `^0.211.0` | OTLP HTTP/JSON exporter | Vendor-neutral export to Jaeger/Tempo/SigNoz. HTTP/JSON is easier to debug than gRPC protobuf. |
| `@opentelemetry/semantic-conventions` | `^1.39.0` | Standard attribute names | Constants for `http.method`, `http.status_code`, etc. Required for dashboard compatibility and query filters. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@opentelemetry/resources` | `^2.5.0` | Resource detection | Already bundled in sdk-node. Only needed for custom resource attributes beyond service name. |
| `@opentelemetry/instrumentation-express` | `^0.59.0` | Express-specific instrumentation | Already bundled in auto-instrumentations-node. DO NOT install separately. |
| `@opentelemetry/instrumentation-http` | `^0.211.0` | HTTP client/server instrumentation | Already bundled in auto-instrumentations-node. DO NOT install separately. |
| `@opentelemetry/instrumentation-ioredis` | `^0.59.0` | ioredis Redis client instrumentation | Already bundled in auto-instrumentations-node. DO NOT install separately. |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| OTLP HTTP exporter | `@opentelemetry/exporter-trace-otlp-grpc` | gRPC requires native compilation, protobuf complexity. Better performance at 10k+ spans/sec but overkill for BAP use case. HTTP is simpler. |
| Unified SDK | Manual SDK assembly (`sdk-trace-node` + `resources` + `context-*`) | More boilerplate, harder to maintain. Unified SDK has better defaults and simpler config. |
| OTLP exporter | `@opentelemetry/exporter-jaeger` (Thrift) | Deprecated. OTLP is vendor-neutral standard. Jaeger 1.35+ supports OTLP natively. |
| Auto-instrumentations | Individual packages per library (40+ packages) | Version skew between packages. Auto-instrumentations is a curated bundle with compatibility guarantees. |

**Installation:**
```bash
# Install from server directory
cd server

pnpm add @opentelemetry/sdk-node@^0.211.0 \
         @opentelemetry/api@^1.9.0 \
         @opentelemetry/auto-instrumentations-node@^0.69.0 \
         @opentelemetry/instrumentation@^0.211.0 \
         @opentelemetry/exporter-trace-otlp-http@^0.211.0 \
         @opentelemetry/semantic-conventions@^1.39.0
```

## Architecture Patterns

### Recommended Project Structure
```
server/
├── src/
│   ├── tracing.ts           # MUST be created - SDK initialization
│   ├── index.ts             # Modified - import './tracing' as first line
│   ├── app.ts               # Unchanged - Express setup
│   └── ...
└── package.json             # Modified - add 6 new dependencies
```

### Pattern 1: Programmatic SDK Initialization
**What:** Create `server/src/tracing.ts` that initializes NodeSDK before any application code runs. Import this file first in entry point.

**When to use:** Always. Programmatic config provides type safety, conditional logic (dev vs prod), and debuggability compared to CLI `--require` flag approach.

**Example:**
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
      '@opentelemetry/instrumentation-fs': { enabled: false }, // Too noisy
      '@opentelemetry/instrumentation-dns': { enabled: false }, // Too noisy
    }),
  ],
});

sdk.start();

// Graceful shutdown
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => console.log('[OpenTelemetry] SDK shut down successfully'))
    .catch((error) => console.error('[OpenTelemetry] Error shutting down SDK', error))
    .finally(() => process.exit(0));
});
```

### Pattern 2: Entry Point Import Order
**What:** Import tracing.ts before any other application code. Critical for auto-instrumentation to patch Express/ioredis module loaders.

**When to use:** Always. If Express imports before tracing.ts, auto-instrumentation silently fails.

**Example:**
```typescript
// server/src/index.ts (MODIFIED)
import './tracing';              // MUST BE FIRST IMPORT
import ngrok from '@ngrok/ngrok'; // After tracing
import { app } from './app';      // After tracing

// Rest of server startup code unchanged
const PORT = process.env.PORT || 4822;
// ...
```

### Pattern 3: Span Size Limits (Critical for ONDC Payloads)
**What:** Configure spanLimits to handle large ONDC payloads (on_search can be 50-200KB). Default limits may drop oversized spans.

**When to use:** Phase 1 setup. ONDC responses are multi-KB JSON. Must configure before first span creation.

**Example:**
```typescript
// In tracing.ts NodeSDK config
const sdk = new NodeSDK({
  // ... other config
  spanLimits: {
    attributeValueLengthLimit: 16384, // 16KB per attribute (ONDC requirement)
  },
});
```

### Pattern 4: Redis Command Visibility
**What:** Configure ioredis instrumentation to include Redis key names in span attributes, not just command names.

**When to use:** Phase 1 setup for debugging. Default captures command ("GET") but not key ("search:019b...").

**Example:**
```typescript
// In getNodeAutoInstrumentations config
getNodeAutoInstrumentations({
  '@opentelemetry/instrumentation-ioredis': {
    dbStatementSerializer: (cmdName, cmdArgs) => {
      // Include first argument (key name) in span
      return `${cmdName} ${cmdArgs[0] || ''}`;
    },
  },
  // ... other instrumentations
});
```

### Anti-Patterns to Avoid
- **Installing individual instrumentation packages alongside auto-instrumentations-node:** Creates duplicate spans and version conflicts. Use auto-instrumentations exclusively.
- **Using `--require` flag for initialization:** Loses type safety, harder to debug, no conditional logic. Use programmatic import instead.
- **Importing tracing.ts after Express:** Auto-instrumentation silently fails. Tracing import MUST be first.
- **No span size limits:** ONDC payloads exceed default limits, causing silent span drops. Configure spanLimits upfront.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP request tracing | Custom middleware to log requests | `@opentelemetry/auto-instrumentations-node` | Captures timing, headers, status codes, errors automatically. Handles edge cases like aborted requests, redirects, timeouts. |
| Redis command logging | Wrap ioredis with custom logging | `@opentelemetry/instrumentation-ioredis` (bundled) | Captures command timing, errors, connection pooling. Auto-links to parent span. |
| Express route tracing | Custom middleware per route | `@opentelemetry/instrumentation-express` (bundled) | Captures route params, middleware execution, error handling. Works with Express 5.x async routes. |
| Context propagation across async | Manual AsyncLocalStorage setup | OpenTelemetry SDK context manager | Handles edge cases like Promise.all, event emitters, timers. Tested across Node.js versions. |
| OTLP export format | Manually construct OTLP JSON | `@opentelemetry/exporter-trace-otlp-http` | Handles protobuf encoding, retries, batching, backpressure. OTLP spec compliance. |

**Key insight:** Auto-instrumentation handles 90% of tracing needs with zero code. Manual spans only needed for business logic (tRPC procedures, ONDC actions, signing operations). Don't reinvent infrastructure-level tracing.

## Common Pitfalls

### Pitfall 1: ESM Import Order Violation
**What goes wrong:** Auto-instrumentation silently fails. No HTTP/Express/Redis spans appear in SigNoz despite requests working.

**Why it happens:** OpenTelemetry must patch module loaders BEFORE target libraries (Express, ioredis) are imported. Node.js ESM executes imports sequentially top-to-bottom. If `import { app } from './app'` runs before `import './tracing'`, Express is already loaded and can't be patched.

**How to avoid:** Always import tracing.ts as the FIRST line in index.ts. Verify with debug logging or environment variable `OTEL_LOG_LEVEL=debug`.

**Warning signs:**
- Server starts successfully
- Health check returns 200
- SigNoz shows no traces
- No error messages (silent failure)

**Detection:**
```bash
# Enable debug logging to verify instrumentation loaded
OTEL_LOG_LEVEL=debug pnpm dev

# Should see: "[OpenTelemetry] Registered instrumentation: ExpressInstrumentation"
```

### Pitfall 2: Missing Span Size Limits
**What goes wrong:** Large ONDC payloads (on_search responses with multiple providers, 50-200KB) cause spans to be silently dropped by exporter or backend.

**Why it happens:** Default OTLP attribute value limit is 4KB. ONDC on_search responses easily exceed this. BatchSpanProcessor drops oversized spans without error.

**How to avoid:** Configure `spanLimits.attributeValueLengthLimit: 16384` (16KB) in NodeSDK initialization. Truncate payloads before setting attributes if needed.

**Warning signs:**
- Some spans appear but response body attribute is missing
- Exporter debug logs show "span dropped" messages
- Intermittent trace gaps for large responses

**Prevention:**
```typescript
// In tracing.ts
const sdk = new NodeSDK({
  spanLimits: {
    attributeValueLengthLimit: 16384, // 16KB limit
  },
});

// For payloads larger than 16KB, truncate:
function safeSetPayload(span, key, payload) {
  const json = JSON.stringify(payload);
  if (json.length > 15000) {
    span.setAttribute(key, json.slice(0, 15000) + '...[truncated]');
  } else {
    span.setAttribute(key, json);
  }
}
```

### Pitfall 3: Redis Instrumentation Missing Key Details
**What goes wrong:** Redis spans show command name ("GET", "SET") but not which key was accessed or what data was stored.

**Why it happens:** Default ioredis instrumentation captures command name for security/privacy (keys may contain PII). Doesn't include arguments by default.

**How to avoid:** Configure `dbStatementSerializer` in auto-instrumentations to include first argument (key name).

**Warning signs:**
- Redis spans appear in trace
- Span name is generic "redis.command"
- Can't distinguish between different Redis operations
- No `db.statement` attribute with key name

**Prevention:**
```typescript
// In getNodeAutoInstrumentations config
'@opentelemetry/instrumentation-ioredis': {
  dbStatementSerializer: (cmdName, cmdArgs) => {
    // Include key name (first arg) for debugging
    return `${cmdName} ${cmdArgs[0] || ''}`;
  },
},
```

### Pitfall 4: Forgetting SIGTERM Graceful Shutdown
**What goes wrong:** Last spans before server shutdown are lost. Final traces incomplete.

**Why it happens:** NodeSDK buffers spans before export (BatchSpanProcessor). If process exits immediately on SIGTERM, buffered spans are dropped.

**How to avoid:** Add SIGTERM handler that calls `sdk.shutdown()` which flushes spans before exit.

**Warning signs:**
- Traces end abruptly without final spans
- Server restart loses in-flight traces
- Health check shows 200 but no span recorded

**Prevention:**
```typescript
// In tracing.ts
process.on('SIGTERM', () => {
  sdk.shutdown()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
});
```

### Pitfall 5: Dev vs Production Config Mismatch
**What goes wrong:** Tracing works with `tsx watch` in dev but fails in production build (`pnpm build` + `node dist/index.js`).

**Why it happens:**
- ESM import resolution differs between tsx and node
- esbuild bundling may inline or tree-shake tracing initialization
- Environment variables missing in production

**How to avoid:** Test production build locally before deploying. Ensure tracing.ts is not excluded from bundle. Verify OTEL_EXPORTER_OTLP_ENDPOINT set in production env.

**Warning signs:**
- Dev environment shows traces
- Staging/production shows no traces
- Build completes without errors
- No instrumentation logs in production

**Prevention:**
```bash
# Test production build locally
pnpm build
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces node dist/index.js

# Check esbuild doesn't exclude tracing
# server/package.json build script already has correct config
```

### Pitfall 6: Express 5.x Async Route Compatibility
**What goes wrong:** Express 5.x async route handlers may not create proper span hierarchies. Child spans become orphaned.

**Why it happens:** Express 5.x changed async error handling. Auto-instrumentation may not maintain context across async boundaries in new Express version.

**How to avoid:** Verify span hierarchy with a test request. If spans are orphaned, add explicit context binding or wait for instrumentation update.

**Warning signs:**
- HTTP span appears
- Route handler operations appear as separate root spans
- tRPC procedure spans not children of HTTP span

**Prevention:** Test explicitly in Phase 1 verification. Express 5.x support confirmed in instrumentation 0.59.0+, but validate with actual requests.

## Code Examples

Verified patterns from official sources:

### Complete tracing.ts Implementation
```typescript
// server/src/tracing.ts
// Source: OpenTelemetry Node.js documentation + SigNoz integration guide
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION
} from '@opentelemetry/semantic-conventions';

// Initialize OTLP exporter pointing to SigNoz
const traceExporter = new OTLPTraceExporter({
  url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
  headers: {}, // Add auth headers if needed for cloud backends
});

// Configure resource attributes
const resource = new Resource({
  [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'ondc-bap',
  [ATTR_SERVICE_VERSION]: '0.1.0',
  'deployment.environment': process.env.NODE_ENV || 'development',
});

// Initialize SDK with auto-instrumentations
const sdk = new NodeSDK({
  resource,
  traceExporter,
  spanLimits: {
    attributeValueLengthLimit: 16384, // 16KB for ONDC payloads
  },
  instrumentations: [
    getNodeAutoInstrumentations({
      // Disable noisy instrumentations
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },

      // Configure ioredis to include key names
      '@opentelemetry/instrumentation-ioredis': {
        dbStatementSerializer: (cmdName, cmdArgs) => {
          return `${cmdName} ${cmdArgs[0] || ''}`;
        },
      },
    }),
  ],
});

// Start SDK
sdk.start();
console.log('[OpenTelemetry] SDK initialized');

// Graceful shutdown on SIGTERM
process.on('SIGTERM', () => {
  sdk
    .shutdown()
    .then(() => {
      console.log('[OpenTelemetry] SDK shut down successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('[OpenTelemetry] Error shutting down SDK', error);
      process.exit(1);
    });
});
```

### Modified Entry Point
```typescript
// server/src/index.ts (MODIFIED)
// Source: Current codebase + OpenTelemetry integration pattern
import './tracing'; // MUST BE FIRST IMPORT

import ngrok from '@ngrok/ngrok';
import { app } from './app';

const PORT = process.env.PORT || 4822;
const NGROK_DOMAIN = process.env.SUBSCRIBER_ID;

app.listen(PORT, async () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);
  console.log(`[Server] tRPC endpoint: http://localhost:${PORT}/api/trpc`);
  console.log(`[Server] Health check: http://localhost:${PORT}/health`);
  console.log(`[Server] API docs: http://localhost:${PORT}/api/reference`);

  // ngrok tunnel setup (unchanged)
  const isProduction = process.env.NODE_ENV === 'production';
  if (!isProduction && process.env.NGROK_AUTHTOKEN) {
    try {
      const listener = await ngrok.connect({
        addr: PORT,
        authtoken_from_env: true,
        domain: NGROK_DOMAIN,
      });
      console.log(`[ngrok] Tunnel established at: ${listener.url()}`);
    } catch (err) {
      console.error('[ngrok] Failed to establish tunnel:', err);
    }
  } else if (isProduction) {
    console.log('[ngrok] Skipped in production environment');
  }
});
```

### SigNoz Docker Compose (Local Development)
```yaml
# docker-compose.signoz.yml
# Source: SigNoz official docker-compose for clickhouse setup
version: '3.8'

services:
  clickhouse:
    image: clickhouse/clickhouse-server:24.1.2-alpine
    container_name: signoz-clickhouse
    volumes:
      - clickhouse-data:/var/lib/clickhouse
    ports:
      - "9000:9000"
      - "8123:8123"
    environment:
      - CLICKHOUSE_DB=signoz

  otel-collector:
    image: signoz/signoz-otel-collector:0.88.11
    container_name: signoz-otel-collector
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP (used by our app)
    depends_on:
      - clickhouse

  query-service:
    image: signoz/query-service:0.44.2
    container_name: signoz-query-service
    command: ["-config=/root/config/prometheus.yml"]
    ports:
      - "6060:6060"
      - "8080:8080"
    environment:
      - ClickHouseUrl=tcp://clickhouse:9000
    depends_on:
      - clickhouse

  frontend:
    image: signoz/frontend:0.44.2
    container_name: signoz-frontend
    ports:
      - "3301:3301"
    environment:
      - FRONTEND_API_ENDPOINT=http://query-service:8080
    depends_on:
      - query-service

volumes:
  clickhouse-data:
```

### OTel Collector Config (Minimal)
```yaml
# otel-collector-config.yaml
# Source: SigNoz OpenTelemetry Collector configuration
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318
        cors:
          allowed_origins:
            - "http://localhost:4822"  # BAP server

processors:
  batch:
    timeout: 5s
    send_batch_size: 1024

exporters:
  clickhouse:
    endpoint: tcp://clickhouse:9000?database=signoz
    ttl: 72h

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [clickhouse]
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Jaeger Thrift exporter | OTLP exporter | OpenTelemetry 1.0 (2021) | Vendor-neutral export. Works with Jaeger, Tempo, SigNoz, cloud backends. |
| Manual SDK assembly | `@opentelemetry/sdk-node` | OpenTelemetry JS 1.0+ | Simpler setup, better defaults, fewer config mistakes. |
| Individual instrumentation packages | `@opentelemetry/auto-instrumentations-node` | OpenTelemetry JS 0.30+ | Single meta-package, version compatibility guaranteed. |
| `--require` flag initialization | Programmatic import | Current best practice | Type safety, conditional logic, debuggability. |
| Node.js 14/16 | Node.js 18+ | OpenTelemetry JS 2.0 (Jan 2025) | SDK 2.x requires Node 18.19+. Dropped Node 14/16 support. |

**Deprecated/outdated:**
- `@opentelemetry/exporter-jaeger`: Deprecated. Use OTLP exporter with Jaeger's OTLP receiver.
- `@opentelemetry/plugin-*`: Replaced by `@opentelemetry/instrumentation-*` packages.
- Node.js 14/16 support: OpenTelemetry JS 2.x requires Node 18.19+ or 20.6+.

## Open Questions

Things that couldn't be fully resolved:

1. **Express 5.x Auto-Instrumentation Compatibility**
   - What we know: Express instrumentation 0.59.0+ exists, recent guides show Express 5.x examples
   - What's unclear: No explicit "Express 5.x supported" statement in docs
   - Recommendation: Test explicitly in Plan 3 verification step. If spans orphaned, flag for manual context binding.

2. **tRPC Context Propagation**
   - What we know: No official tRPC instrumentation exists. tRPC uses AsyncLocalStorage internally.
   - What's unclear: Whether tRPC 11.x async middleware maintains OpenTelemetry context automatically
   - Recommendation: Verify in Phase 1 tests. If context lost, defer tRPC manual spans to Phase 2.

3. **SigNoz Minimal Docker Compose**
   - What we know: Official docker-compose uses includes pattern, requires cloning full repo
   - What's unclear: Exact minimal services needed vs full production stack
   - Recommendation: Use simplified docker-compose with 4 services (clickhouse, collector, query-service, frontend). Test locally.

## Sources

### Primary (HIGH confidence)
- npm registry (verified 2026-02-09):
  - [@opentelemetry/sdk-node](https://www.npmjs.com/package/@opentelemetry/sdk-node) - Version 0.211.0
  - [@opentelemetry/auto-instrumentations-node](https://www.npmjs.com/package/@opentelemetry/auto-instrumentations-node) - Version 0.69.0
  - [@opentelemetry/exporter-trace-otlp-http](https://www.npmjs.com/package/@opentelemetry/exporter-trace-otlp-http) - Version 0.211.0
  - [@opentelemetry/semantic-conventions](https://www.npmjs.com/package/@opentelemetry/semantic-conventions) - Version 1.39.0
- [OpenTelemetry Node.js Documentation](https://opentelemetry.io/docs/languages/js/getting-started/nodejs/)
- [SigNoz Docker Installation](https://signoz.io/docs/install/docker/)
- [OpenTelemetry JavaScript SDK 2.0 Announcement](https://opentelemetry.io/blog/2025/otel-js-sdk-2-0/)

### Secondary (MEDIUM confidence)
- [SigNoz OpenTelemetry Collector Configuration](https://signoz.io/docs/opentelemetry-collection-agents/opentelemetry-collector/configuration/)
- [How to Set Up SigNoz as Self-Hosted OpenTelemetry Backend](https://oneuptime.com/blog/post/2026-02-06-signoz-self-hosted-opentelemetry-backend/view) - Recent 2026 guide
- [@opentelemetry/instrumentation-ioredis](https://www.npmjs.com/package/@opentelemetry/instrumentation-ioredis) - dbStatementSerializer config
- [OpenTelemetry Express Instrumentation](https://www.npmjs.com/package/@opentelemetry/instrumentation-express)

### Tertiary (LOW confidence - flagged for validation)
- Express 5.x compatibility: Inferred from recent examples, needs explicit testing
- tRPC context propagation: Assumed compatible, needs Phase 1 verification

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All versions verified via npm registry 2026-02-09
- Architecture: HIGH - Standard OpenTelemetry patterns, SigNoz official docs
- Pitfalls: MEDIUM - ESM import order is known issue, Express 5.x needs validation
- SigNoz docker-compose: MEDIUM - Simplified from official setup, needs local testing

**Research date:** 2026-02-09
**Valid until:** 2026-04-09 (60 days - OpenTelemetry JS releases monthly but breaking changes rare)

**Phase 1 specific notes:**
- Entry point currently at `server/src/index.ts` with `tsx --env-file ../.env` command
- Express app defined in `server/src/app.ts` with CORS, tRPC middleware, static routes
- Redis client exists at `server/src/infra/key-value/redis/` using ioredis 5.6.1
- Health check endpoint available for verification testing
- Development uses tsx watch, production uses esbuild bundle
- Environment variables managed via root `.env` file (not server/.env)

**Critical Phase 1 requirements:**
1. Import order: tracing.ts MUST be first import in index.ts
2. Span limits: Configure 16KB limit for ONDC payloads upfront
3. Redis visibility: Configure dbStatementSerializer in Phase 1
4. SigNoz local: Docker compose must expose 4318 for OTLP HTTP
5. Verification: Health check request must show spans in SigNoz UI with service name "ondc-bap"
6. Redis spans: GET/SET commands must appear as child spans with key names visible
