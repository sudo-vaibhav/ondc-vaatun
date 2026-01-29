# Tech Debt: Console Logging and Observability

**Priority**: Medium
**Category**: Operations
**Effort**: Medium

## Problem

The codebase uses `console.log` extensively (33 occurrences) with full payload dumps. This creates several issues:

1. **Log volume**: Production logs will be enormous
2. **Data privacy**: Full payloads may contain PII
3. **No log levels**: Cannot filter debug vs error logs
4. **No structure**: Difficult to parse/query logs
5. **No correlation**: Hard to trace requests across services

## Affected Files

All API route handlers and utility files:
- `src/app/api/ondc/search/route.ts`
- `src/app/api/ondc/select/route.ts`
- `src/app/api/ondc/on_search/route.ts`
- `src/app/api/ondc/on_select/route.ts`
- `src/lib/ondc/client.ts`
- `src/infra/key-value/redis/store.ts`
- And ~25 more locations

## Current Behavior

```typescript
// Typical logging pattern found throughout codebase
console.log("[Search] Sending request to:", gatewayUrl);
console.log("[Search] Payload:", JSON.stringify(payload, null, "\t"));
console.log("[Search] ONDC Response:", JSON.stringify(response, null, 2));
console.error("[Search] Error:", error);
```

## Proposed Solution

### 1. Implement Structured Logger

```typescript
// src/lib/logger.ts
import pino from "pino";

export const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  formatters: {
    level: (label) => ({ level: label }),
  },
  redact: {
    paths: [
      "*.customer.contact.email",
      "*.customer.contact.phone",
      "*.billing.address",
      "*.fulfillment.end.location",
    ],
    censor: "[REDACTED]",
  },
});

// Request-scoped child logger
export function createRequestLogger(context: {
  transactionId: string;
  messageId: string;
  action: string;
}) {
  return logger.child(context);
}
```

### 2. Log Levels

| Level | Use Case |
|-------|----------|
| `error` | Failures requiring attention |
| `warn` | Recoverable issues, degraded service |
| `info` | Key business events (request/response) |
| `debug` | Detailed flow information |
| `trace` | Full payloads (development only) |

### 3. Structured Log Format

```json
{
  "level": "info",
  "time": "2024-01-15T10:30:00.000Z",
  "transactionId": "uuid",
  "messageId": "uuid",
  "action": "search",
  "msg": "Gateway request sent",
  "gatewayUrl": "https://...",
  "responseStatus": 200,
  "durationMs": 150
}
```

### 4. PII Redaction

Automatically redact sensitive fields:
- Customer contact details
- Addresses
- Payment information
- Authentication tokens

### 5. Request Correlation

Use AsyncLocalStorage context for automatic correlation:

```typescript
// All logs within a request automatically include IDs
log.info({ providers: 5 }, "Search results received");
// Output includes transactionId, messageId from context
```

## Environment Configuration

```env
LOG_LEVEL=info              # error, warn, info, debug, trace
LOG_FORMAT=json             # json or pretty
LOG_REDACT_PII=true         # Enable PII redaction
LOG_INCLUDE_PAYLOAD=false   # Include full payloads (debug only)
```

## Migration Steps

1. Add `pino` dependency
2. Create logger module with redaction rules
3. Create request-scoped logger factory
4. Replace all `console.log` with structured logger calls
5. Add correlation ID propagation
6. Configure log shipping (if applicable)

## Acceptance Criteria

- [ ] Structured logger implemented
- [ ] All console.log replaced with logger calls
- [ ] PII redaction working
- [ ] Log levels configurable via environment
- [ ] Request correlation IDs in all logs
- [ ] Documentation for log configuration
