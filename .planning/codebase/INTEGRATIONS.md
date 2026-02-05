# External Integrations

**Analysis Date:** 2026-02-02

## APIs & External Services

**ONDC Network (Primary Integration):**
- ONDC Gateway - Beckn protocol transactions (search, select, init, confirm)
  - URL: `ONDC_GATEWAY_URL` environment variable (staging: `https://staging.gateway.proteantech.in`)
  - Implementation: `server/src/lib/ondc/client.ts`
  - Auth: Ed25519 signature-based authentication (Signature header)
  - Protocol: HTTP POST with cryptographic signing

- ONDC Registry - Subscriber management and lookup
  - URL: `ONDC_REGISTRY_URL` environment variable (staging: `https://staging.registry.ondc.org`)
  - Implementation: `server/src/trpc/routers/registry.ts`
  - Auth: Ed25519 signature-based authentication
  - Operations:
    - `lookup` - Query registry for subscriber information
    - `subscribe` - Register subscriber with network
    - `onSubscribe` - Receive subscription confirmation callbacks
  - Protocol: HTTP POST with cryptographic signing

**Authentication Mechanism:**
- Algorithm: Ed25519 (libsodium-wrappers)
- Signing string format: `(created): {timestamp}\n(expires): {expiry}\ndigest: BLAKE-512={digest}`
- Header format: `Signature keyId="{id}|{uniqueKeyId}|ed25519",algorithm="ed25519",created="{created}",expires="{expires}",headers="(created) (expires) digest",signature="{sig}"`
- Clock drift offset: 3 seconds
- Signature expiry: 300 seconds (5 minutes)
- Implementation: `server/src/lib/ondc/signing.ts`

**Request Signing:**
- Digest algorithm: Blake2b-512 over JSON stringified body
- Automatic signing: `ONDCClient` handles signing in `server/src/lib/ondc/client.ts`
- Body encoding: JSON, Content-Type: application/json
- Request size limit: 10MB (Express middleware)

## Data Storage

**Databases:**
- Not applicable - no persistent database

**Key-Value Store:**
- Redis (ioredis 5.6.1)
  - Connection: `REDIS_URL` environment variable
  - Purpose: Temporary storage of search results, select results, and subscription callbacks
  - Client library: ioredis
  - Connection pooling: Separate command pool and subscriber pool
    - Command pool: Regular operations (GET, SET, KEYS, etc.)
    - Subscriber pool: Pub/Sub operations (SUBSCRIBE, PUBLISH)
  - Implementation: `server/src/infra/key-value/redis/`
  - Features:
    - TTL support for result expiry
    - Channel-based Pub/Sub for real-time updates
    - Key formatting with tenant isolation (`server/src/infra/key-value/redis/key-formatter.ts`)

**File Storage:**
- Local filesystem only
- Serves compiled client assets from `server/public/` in production
- OpenAPI specification: `server/public/openapi.json` (static file)

**Caching:**
- TanStack Query on client (in-memory with server state)
- Redis on server (for search/select result persistence across requests)

## Authentication & Identity

**Auth Provider:**
- Custom implementation using cryptographic signing

**Tenant Management:**
- Singleton pattern: `Tenant.getInstance()`
- Location: `server/src/entities/tenant.ts`
- Manages:
  - Subscriber ID (domain name, e.g., "vaatun.com")
  - Domain code (e.g., "ONDC:FIS13" for insurance)
  - Encryption keys (X25519 for key exchange)
  - Signing keys (Ed25519 for message signatures)
  - Unique key ID for signature identification

**Environment Variables (Cryptographic Keys):**
- `ENCRYPTION_PRIVATE_KEY` - X25519 private key (base64, DER format)
- `ENCRYPTION_PUBLIC_KEY` - X25519 public key (derived or provided)
- `ONDC_PUBLIC_KEY` - ONDC's X25519 public key (base64, DER format)
- `SIGNING_PRIVATE_KEY` - Ed25519 private key (base64)
- `SIGNING_PUBLIC_KEY` - Ed25519 public key (derived or provided)
- `STATIC_SUBSCRIBE_REQUEST_ID` - UUID for domain verification (immutable)
- `STATIC_UNIQUE_KEY_ID` - Identifier in signature keyId field
- `SUBSCRIBER_ID` - Domain name (must contain ".")
- `DOMAIN_CODE` - ONDC domain (default: "ONDC:FIS13")

**Cryptographic Flow:**
1. Diffie-Hellman key exchange: Client X25519 private + ONDC public → shared secret
2. Challenge decryption: AES-256-ECB using shared secret (ONDC sends encrypted challenge)
3. Message signing: Ed25519 over request payload for authentication
4. Request digest: Blake2b-512 over JSON body

## Monitoring & Observability

**Error Tracking:**
- None (no external service)

**Logs:**
- Console logging (console.log, console.error)
- Locations:
  - Server startup: `server/src/index.ts`
  - ONDC requests: `server/src/lib/ondc/client.ts`
  - Request signing: `server/src/lib/ondc/client.ts`
  - tRPC procedures: Various router files
  - ngrok tunnel: `server/src/index.ts`
- Production logging: Stack traces included in dev, hidden in production

**Health Check:**
- Endpoint: `GET /health` (raw Express route)
- Response: `{ status: "Health OK!!", ready: true }`
- Location: `server/src/app.ts`
- No external service dependency

## CI/CD & Deployment

**Hosting:**
- Platform-agnostic (any Node.js 18+ host)
- Recommended: Docker container or managed Node.js platform

**CI Pipeline:**
- Not detected (Playwright E2E tests exist but no CI configuration)

**Deployment Approach:**
1. `pnpm build` - Compiles client (→ `server/public/`) and server (→ `dist/index.js`)
2. `pnpm start` - Starts production server
3. Server auto-detects production mode via `NODE_ENV`
4. Serves client from Express static file handler

**Deployment Checklist:**
- Set `NODE_ENV=production`
- Provide all required environment variables
- Configure Redis instance and `REDIS_URL`
- Use HTTPS endpoint (ONDC requirement)
- Ensure ngrok is NOT used in production (`NODE_ENV === "production"` check)

## Environment Configuration

**Required Environment Variables:**
```
# ONDC Integration
DOMAIN_CODE=ONDC:FIS13
ENCRYPTION_PRIVATE_KEY=<base64_x25519_private_key>
ENCRYPTION_PUBLIC_KEY=<base64_x25519_public_key>
ONDC_GATEWAY_URL=https://staging.gateway.proteantech.in
ONDC_PUBLIC_KEY=<base64_ondc_public_key>
ONDC_REGISTRY_URL=https://staging.registry.ondc.org

# Cryptographic Keys
SIGNING_PUBLIC_KEY=<base64_ed25519_public_key>
SIGNING_PRIVATE_KEY=<base64_ed25519_private_key>
STATIC_SUBSCRIBE_REQUEST_ID=<uuid>
STATIC_UNIQUE_KEY_ID=<string>

# Network
SUBSCRIBER_ID=<domain_name>
REDIS_URL=redis://host:6379

# Server
PORT=4822
NODE_ENV=development|production

# Optional - Development
NGROK_AUTHTOKEN=<token>

# Optional - Feature Flags
FEATURE_VERIFY_CALLBACKS=true
```

**Secrets Location:**
- `.env` file (gitignored, never committed)
- Template: `.env.example`
- Required for local development and production deployment

**Key Format:**
- All cryptographic keys: base64-encoded DER format
- X25519 keys: 32 bytes → base64
- Ed25519 keys: 32 bytes (private) or 32 bytes (public) → base64

## Webhooks & Callbacks

**Incoming Webhook Endpoints:**
- `POST /api/ondc/on_search` - Search results from BPP
  - Handler: `server/src/trpc/routers/gateway.ts`
  - Storage: Redis (via TenantKeyValueStore)
  - Processing: Stores results with transaction ID key

- `POST /api/ondc/on_select` - Selection confirmation from BPP
  - Handler: `server/src/trpc/routers/gateway.ts`
  - Storage: Redis
  - Processing: Stores selected item details

- `POST /api/ondc/on_subscribe` - Subscription confirmation from ONDC Registry
  - Handler: `server/src/trpc/routers/registry.ts`
  - Storage: Redis
  - Processing: Stores subscriber details

**Signature Verification for Callbacks:**
- Feature: `FEATURE_VERIFY_CALLBACKS` environment variable
- Default: `true` (enabled)
- Verification: Ed25519 signature validation on incoming webhook payloads
- Implementation location: tRPC routers

**Server-Initiated Requests:**
- `POST /api/ondc/lookup` - Query ONDC registry
  - Destination: `ONDC_REGISTRY_URL`
  - Signed request via `ONDCClient`

- `POST /api/ondc/subscribe` - Register with ONDC
  - Destination: `ONDC_REGISTRY_URL`
  - Signed request via `ONDCClient`

- `POST /api/ondc/search` - Initiate search across BPPs
  - Destination: `ONDC_GATEWAY_URL`
  - Signed request via `ONDCClient`
  - Expects async callback on `/api/ondc/on_search`

- `POST /api/ondc/select` - Select item from search results
  - Destination: `ONDC_GATEWAY_URL`
  - Signed request via `ONDCClient`
  - Expects async callback on `/api/ondc/on_select`

**Callback Polling:**
- Endpoint: `GET /api/ondc/search-results` - Retrieve stored search results
  - tRPC procedure: `results.getSearchResults`
  - Queries Redis for transaction ID

- Endpoint: `GET /api/ondc/select-results` - Retrieve stored selection results
  - tRPC procedure: `results.getSelectResults`
  - Queries Redis for transaction ID

**Server-Sent Events (SSE):**
- Endpoint: `GET /api/ondc/search-stream/:transactionId`
  - Handler: `server/src/routes/sse.ts`
  - Purpose: Real-time streaming of search results
  - Connection: Long-lived HTTP with Server-Sent Events
  - Implementation: Raw Express route (not tRPC)

## Domain Verification

**Site Verification Endpoint:**
- URL: `GET /ondc-site-verification.html`
- Purpose: Prove domain ownership to ONDC registry
- Handler: `server/src/routes/site-verification.ts`
- Response: HTML page with signed verification data
- Signing: Uses `SIGNING_PRIVATE_KEY` and `STATIC_SUBSCRIBE_REQUEST_ID`
- ONDC Requirement: Must be accessible at domain root

## OpenAPI Documentation

**Interactive Documentation:**
- URL: `GET /api/reference`
- Provider: Scalar (@scalar/express-api-reference)
- Specification: `server/public/openapi.json`
- Theme: Purple
- Location: `server/src/app.ts`

**OpenAPI Spec Serving:**
- URL: `GET /openapi.json`
- File location: `server/public/openapi.json`
- Format: OpenAPI 3.1.0
- Manual sync: Must be updated when tRPC procedures change

## Development Tunneling

**ngrok Integration:**
- Library: @ngrok/ngrok 1.4.0
- Activation: `NGROK_AUTHTOKEN` environment variable
- Auto-connects: On server startup if authtoken is set
- Disabled in production: Explicitly skipped when `NODE_ENV === "production"`
- Custom domain: Uses `SUBSCRIBER_ID` as ngrok domain
- Purpose: Enable local development with ONDC callbacks (requires internet-facing URL)
- Implementation: `server/src/index.ts`

---

*Integration audit: 2026-02-02*
