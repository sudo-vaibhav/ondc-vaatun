# Tech Debt: Configuration Gaps

**Priority**: Low
**Category**: Configuration
**Effort**: Low

## Problem

Several operational parameters are missing from environment configuration, using hardcoded defaults instead.

## Missing Configuration Options

### 1. Redis Configuration

Current: Only `REDIS_URL` is configurable.

Missing:
```env
# Connection pool settings
REDIS_POOL_SIZE=10
REDIS_POOL_MIN_IDLE=2

# Timeouts
REDIS_CONNECT_TIMEOUT_MS=5000
REDIS_COMMAND_TIMEOUT_MS=3000

# Retry settings
REDIS_RETRY_ATTEMPTS=3
REDIS_RETRY_DELAY_MS=100
```

### 2. HTTP Request Timeouts

Current: Hardcoded or using fetch defaults.

Missing:
```env
# Gateway request settings
GATEWAY_REQUEST_TIMEOUT_MS=30000
GATEWAY_RETRY_ATTEMPTS=2
GATEWAY_RETRY_DELAY_MS=1000

# Registry request settings
REGISTRY_REQUEST_TIMEOUT_MS=10000
```

### 3. Logging Configuration

Current: Uses `console.log` with no configuration.

Missing:
```env
# Logging
LOG_LEVEL=info                    # error, warn, info, debug, trace
LOG_FORMAT=json                   # json or pretty
LOG_INCLUDE_TIMESTAMP=true
LOG_REDACT_PII=true
```

### 4. Feature Flags

Missing:
```env
# Feature flags
FEATURE_SIGNATURE_VERIFICATION=true
FEATURE_RATE_LIMITING=true
FEATURE_REQUEST_LOGGING=true
```

### 5. ONDC Protocol Settings

Missing:
```env
# Protocol settings
ONDC_DEFAULT_TTL=PT30S
ONDC_SEARCH_TTL=PT30S
ONDC_SELECT_TTL=PT30S
ONDC_INIT_TTL=PT30S
ONDC_CONFIRM_TTL=PT30S
```

### 6. Rate Limiting

Missing:
```env
# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_BY=ip                  # ip or subscriber_id
```

### 7. Cache Settings

Missing:
```env
# Cache TTLs
CACHE_SEARCH_RESULTS_TTL_S=300
CACHE_SELECT_RESULTS_TTL_S=300
CACHE_REGISTRY_LOOKUP_TTL_S=3600
```

## Current `.env.example`

```env
ENCRYPTION_PRIVATE_KEY=<base64_x25519_private_key>
ONDC_PUBLIC_KEY=<base64_ondc_public_key>
STATIC_SUBSCRIBE_REQUEST_ID=<uuid_for_verification>
SIGNING_PRIVATE_KEY=<base64_ed25519_private_key>
REDIS_URL=redis://localhost:6379
```

## Proposed `.env.example`

```env
# ===========================================
# ONDC Credentials (Required)
# ===========================================
ENCRYPTION_PRIVATE_KEY=<base64_x25519_private_key>
ONDC_PUBLIC_KEY=<base64_ondc_public_key>
STATIC_SUBSCRIBE_REQUEST_ID=<uuid_for_verification>
SIGNING_PRIVATE_KEY=<base64_ed25519_private_key>

# ===========================================
# Redis Configuration
# ===========================================
REDIS_URL=redis://localhost:6379
REDIS_POOL_SIZE=10
REDIS_CONNECT_TIMEOUT_MS=5000
REDIS_COMMAND_TIMEOUT_MS=3000

# ===========================================
# HTTP Client Settings
# ===========================================
GATEWAY_REQUEST_TIMEOUT_MS=30000
GATEWAY_RETRY_ATTEMPTS=2
REGISTRY_REQUEST_TIMEOUT_MS=10000

# ===========================================
# Logging
# ===========================================
LOG_LEVEL=info
LOG_FORMAT=json
LOG_REDACT_PII=true

# ===========================================
# ONDC Protocol
# ===========================================
ONDC_DEFAULT_TTL=PT30S

# ===========================================
# Feature Flags
# ===========================================
FEATURE_SIGNATURE_VERIFICATION=false
FEATURE_RATE_LIMITING=false

# ===========================================
# Rate Limiting (if enabled)
# ===========================================
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# ===========================================
# Cache TTLs
# ===========================================
CACHE_SEARCH_RESULTS_TTL_S=300
CACHE_REGISTRY_LOOKUP_TTL_S=3600
```

## Implementation

### 1. Create Config Module

```typescript
// src/lib/config.ts
import { z } from "zod";

const ConfigSchema = z.object({
  redis: z.object({
    url: z.string().url(),
    poolSize: z.number().default(10),
    connectTimeoutMs: z.number().default(5000),
    commandTimeoutMs: z.number().default(3000),
  }),
  gateway: z.object({
    requestTimeoutMs: z.number().default(30000),
    retryAttempts: z.number().default(2),
  }),
  logging: z.object({
    level: z.enum(["error", "warn", "info", "debug", "trace"]).default("info"),
    format: z.enum(["json", "pretty"]).default("json"),
    redactPii: z.boolean().default(true),
  }),
  features: z.object({
    signatureVerification: z.boolean().default(false),
    rateLimiting: z.boolean().default(false),
  }),
});

export const config = ConfigSchema.parse({
  redis: {
    url: process.env.REDIS_URL,
    poolSize: parseInt(process.env.REDIS_POOL_SIZE || "10"),
    // ...
  },
  // ...
});
```

### 2. Update Code to Use Config

```typescript
// Before
const timeout = 30000;

// After
import { config } from "@/lib/config";
const timeout = config.gateway.requestTimeoutMs;
```

## Acceptance Criteria

- [ ] All hardcoded values extracted to config
- [ ] Config module with Zod validation
- [ ] `.env.example` updated with all options
- [ ] Sensible defaults for all optional values
- [ ] Documentation for each config option
- [ ] Startup validation of required config
