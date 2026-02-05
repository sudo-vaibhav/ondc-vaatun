# Architecture

**Analysis Date:** 2026-02-02

## Pattern Overview

**Overall:** Layered monorepo with domain-driven design (DDD) principles

**Key Characteristics:**
- Cryptographic operations layer isolated in `Tenant` singleton entity
- tRPC for end-to-end type-safe API communication
- Redis for distributed state management and pub/sub messaging
- Callback-driven architecture for ONDC Beckn protocol (on_search, on_select, on_confirm)
- Client-server separation with independent dev servers (Express 4822, Vite 4823)

## Layers

**API Gateway (tRPC Adapter):**
- Purpose: Type-safe RPC interface over HTTP, automatic request/response validation
- Location: `server/src/trpc/`
- Contains: Router definitions, context factory, procedure definitions
- Depends on: Tenant entity, key-value store, ONDC client
- Used by: Frontend via `@trpc/react-query` hooks, external integrations via HTTP

**Domain/Business Logic:**
- Purpose: Core ONDC integration logic, registry/gateway operations
- Location: `server/src/trpc/routers/` (registry.ts, gateway.ts, health.ts, results.ts)
- Contains: Search/select/init/confirm transaction flows, registry lookups
- Depends on: Tenant entity, ONDCClient, search/select stores
- Used by: tRPC procedures

**Cryptographic Layer:**
- Purpose: Handles Ed25519 signing, AES-256-ECB decryption, Diffie-Hellman key exchange
- Location: `server/src/entities/tenant.ts`
- Contains: Tenant singleton with private keys, decryption/signing methods
- Depends on: Node.js crypto module, libsodium (via node native crypto)
- Used by: ONDCClient for request signing, site verification handler

**Data Persistence:**
- Purpose: Redis-based key-value store with tenant isolation and pub/sub
- Location: `server/src/infra/key-value/redis/`
- Contains: Connection pooling, tenant-scoped operations, callback subscription
- Depends on: ioredis client
- Used by: Search/select result storage, transaction state management

**Integration Layer:**
- Purpose: Communicates with ONDC registry and gateway endpoints
- Location: `server/src/lib/ondc/`
- Contains: ONDCClient for HTTP requests, signing utilities, payload builders
- Depends on: Tenant for cryptographic operations, fetch API
- Used by: Registry and gateway routers

**Express Middleware & Routing:**
- Purpose: HTTP routing, CORS, request parsing, error handling
- Location: `server/src/app.ts`, `server/src/routes/`
- Contains: Route handlers (site verification, SSE, ONDC compatibility routes)
- Depends on: tRPC middleware, Express
- Used by: HTTP clients, browser

**React Frontend:**
- Purpose: User interface for testing ONDC flows, results visualization
- Location: `client/src/`
- Contains: File-based routes (TanStack Router), components, tRPC hooks
- Depends on: tRPC client, React, Tailwind CSS
- Used by: End users

## Data Flow

**Search Flow:**

1. User initiates search → Frontend mutation `gateway.search`
2. tRPC procedure generates UUIDs (transactionId, messageId)
3. Creates search entry in Redis with empty results
4. ONDCClient builds signed request, sends to ONDC gateway
5. Gateway sends `on_search` callback → tRPC procedure
6. Results stored in Redis indexed by transactionId
7. Frontend polls/streams from `results.getSearchResults` or SSE endpoint
8. Results rendered as provider cards with item listings

**Select Flow:**

1. Similar to search: `gateway.select` mutation
2. Stores selected item details in Redis
3. BPP responds with `on_select` callback
4. Quote/pricing details persisted and retrieved via `results.getSelectResults`

**Registry Operations:**

1. Client calls `registry.lookup` (query) or `registry.subscribe` (mutation)
2. ONDCClient sends to ONDC registry with proper signatures
3. Response validated against Zod schemas
4. Registry returns subscriber list or acknowledgment

**Callback Reception:**

1. ONDC network sends webhook to `/api/trpc/gateway.onSearch` (POST)
2. tRPC middleware validates request signature (currently basic)
3. Data stored in Redis with transactionId as key
4. SSE clients notified of updates via pub/sub
5. Poll-based clients retrieve updated data on next query

**State Management:**

- Redis maps: `tenant:{subscriberId}:transaction:{transactionId}` → transaction object
- Search results: `tenant:{subscriberId}:search:{transactionId}` → full on_search response
- Select results: `tenant:{subscriberId}:select:{transactionId}` → full on_select response
- TTL on all keys (configurable, typically 24 hours)

## Key Abstractions

**Tenant Entity:**
- Purpose: Encapsulates ONDC credentials, cryptographic keys, domain configuration
- Examples: `server/src/entities/tenant.ts`
- Pattern: Singleton with lazy initialization, validates env vars via Zod
- Public Interface: `subscriberId`, `domainCode`, `decryptChallenge()`, `signMessage()`, `signSubscribeRequestId()`

**Value Objects:**
- Purpose: Type-safe domain identifiers (UUID, Id, CaseInsensitiveId)
- Examples: `server/src/value-objects/uuid.ts`, `server/src/value-objects/id.ts`
- Pattern: Immutable classes with validation in constructor
- Prevents: Mixing different identifier types (e.g., passing subscriber_id where request_id expected)

**ONDCClient:**
- Purpose: Abstraction over HTTP requests to ONDC endpoints with automatic signing
- Examples: `server/src/lib/ondc/client.ts`
- Pattern: Takes Tenant as constructor dependency, handles Authorization header creation
- Methods: `send<T>()` for POST/GET requests, `createAuthorizationHeader()` for signature generation

**TenantKeyValueStore:**
- Purpose: Redis operations with automatic key prefixing and pub/sub
- Examples: `server/src/infra/key-value/redis/store.ts`
- Pattern: Factory pattern with `create()` static method, wraps ioredis connection
- Key Operations: `set()`, `get()`, `list()`, `subscribe()` with TTL support

**Search/Select Stores:**
- Purpose: Domain-specific logic for persisting and retrieving transaction results
- Examples: `server/src/lib/search-store.ts`, `server/src/lib/select-store.ts`
- Pattern: Functional module with operations like `createSearchEntry()`, `addSearchResponse()`, `getSearchResults()`

## Entry Points

**Server Entry Point:**
- Location: `server/src/index.ts`
- Triggers: `node src/index.ts` or `pnpm dev:server`
- Responsibilities: Start Express app on port 4822, establish ngrok tunnel if configured, log endpoints

**HTTP Routes:**
- `GET /health` - Basic health check (Express)
- `GET /ondc-site-verification.html` - Domain verification (Express)
- `POST /api/trpc/*` - tRPC batch endpoint (Express + tRPC middleware)
- `GET /api/ondc/search-stream/:transactionId` - Server-sent events (Express)
- `GET /api/reference` - Scalar OpenAPI documentation (Express)

**tRPC Procedures:**
- `health.check` - Query returning status
- `registry.lookup` - Query ONDC registry
- `registry.subscribe` - Mutate to subscribe to ONDC
- `gateway.search` - Mutate to initiate search
- `gateway.onSearch` - Mutate (callback handler for ONDC)
- `gateway.select` - Mutate to select item
- `gateway.onSelect` - Mutate (callback handler for ONDC)
- `results.getSearchResults` - Query to retrieve stored results
- `results.getSelectResults` - Query to retrieve stored results

**Client Entry Point:**
- Location: `client/src/main.tsx`
- Triggers: `pnpm dev:client` or `pnpm build`
- Responsibilities: Initialize React with TRPCProvider, render router, mount to #root element

**Client Routes:**
- `/` - Home page with hero, CTA, insurance cards
- `/directory` - ONDC participant directory
- `/health/:searchId` - Health insurance search results view
- `/motor/:searchId` - Motor insurance search results view
- `/search-results/:transactionId` - Poll-based search results display
- `/search-results-streamed/:transactionId` - SSE-based search results display
- `/quote/:transactionId/:messageId` - Quote details and purchase flow

## Error Handling

**Strategy:** Layered error handling with context-aware responses

**Patterns:**

1. **Zod Schema Validation** (`server/src/trpc/routers/`):
   - Input validation at tRPC procedure level
   - Automatic 400 response for invalid input
   - Uses strict `z.object()` for requests, loose `.passthrough()` for external API responses

2. **Tenant Initialization** (`server/src/entities/tenant.ts`):
   - Zod env validation at startup
   - Missing keys throw during singleton instantiation
   - Cryptographic key validation (base64 format, length checks)

3. **ONDC Client** (`server/src/lib/ondc/client.ts`):
   - Fetch error handling with response status checking
   - Non-200 responses parsed and logged with full error text
   - Throws typed Error with context (URL, method, response)

4. **Express Global Handler** (`server/src/app.ts`, lines 82-98):
   - Catches unhandled errors from routes
   - Prevents double-sending headers (checks `res.headersSent`)
   - Extracts status from error.status or defaults to 500
   - Includes stack trace in dev, omits in production

5. **tRPC Context** (`server/src/trpc/context.ts`):
   - Redis connection failures propagate up
   - REDIS_URL validation on context creation
   - Throws if Redis unavailable

6. **Callback Handling** (`server/src/trpc/routers/gateway.ts`):
   - on_search/on_select check for transaction_id, warns if missing
   - Error fields in input stored as-is (no validation failure)
   - Always returns ACK regardless of processing success

## Cross-Cutting Concerns

**Logging:**
- Console.log with prefixes: `[Server]`, `[Lookup]`, `[Search]`, `[Signing]`, `[on_search]`
- Context about operations (URLs, payloads, responses)
- Error logging with full error objects
- No structured logging library (raw console)

**Validation:**
- Zod schemas at tRPC input layer
- Value object constructors (UUID validates regex)
- Tenant env validation with refine() for complex rules
- API responses loosely validated (passthrough for flexibility)

**Authentication:**
- No user authentication (public endpoints)
- Request signing via Ed25519 (ONDC protocol requirement)
- Domain verification via signed subscribe request
- All procedures marked `publicProcedure` in tRPC

**Request Signing:**
- BLAKE-512 digest of request body
- HTTP Signature spec with created/expires timestamps
- Signature string format: `(created): X\n(expires): Y\ndigest: BLAKE-512=Z`
- Authorization header: `Signature keyId="...",algorithm="ed25519",created="...",expires="...",headers="(created) (expires) digest",signature="..."`

**State Management:**
- No client-side state framework (React Context for purchaser info only)
- Redux/Zustand not used
- tRPC Query for server state sync
- Redis as single source of truth

**Concurrency:**
- Non-blocking async/await throughout
- Connection pooling for Redis (ioredis handles internally)
- SSE streams for real-time callbacks (kept alive with periodic keep-alives)
- No mutex/locking (Redis ops are atomic)

