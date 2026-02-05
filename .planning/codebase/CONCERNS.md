# Codebase Concerns

**Analysis Date:** 2026-02-02

## Tech Debt

**Hardcoded Company Metadata:**
- Issue: Company registration details (Vaatun Technologies, addresses, GST/PAN, email) are hardcoded directly in API request handlers
- Files: `server/src/routes/ondc-compat.ts` (lines 93-110), `server/src/trpc/routers/registry.ts` (similar hardcoded values)
- Impact: Cannot support multi-tenant deployments. Changing company details requires code modifications and redeploy. Difficult to test with different entity details.
- Fix approach: Extract to environment variables or database. Create a tenant metadata configuration system that allows per-environment customization without code changes.

**Global Singleton Context Caching:**
- Issue: Both `server/src/routes/ondc-compat.ts` (lines 24-43) and `server/src/trpc/context.ts` (lines 14-44) cache context globally with `cachedContext` variable
- Files: `server/src/routes/ondc-compat.ts`, `server/src/trpc/context.ts`
- Impact: Redis connection is never refreshed. If Redis becomes unavailable mid-request, stale connections persist. No connection health checks or recovery. Per-request initialization pattern would be more resilient.
- Fix approach: Remove global caching, create connections per-request with health checks. Implement connection retry logic with exponential backoff. Add Redis connection pool monitoring.

**Duplicate Route Implementations:**
- Issue: Identical business logic exists in two places - REST routes in `server/src/routes/ondc-compat.ts` and tRPC routers in `server/src/trpc/routers/`. Both handle search, select, subscribe operations identically.
- Files: `server/src/routes/ondc-compat.ts` (search: lines 176-199, select: lines 226-303), `server/src/trpc/routers/gateway.ts` (search: lines 12-46, select: lines 98+)
- Impact: Maintenance burden - bug fixes must be applied twice. Inconsistencies risk emerging between implementations. Code duplication violates DRY principle.
- Fix approach: Remove REST compatibility layer and migrate fully to tRPC. If backwards compatibility is needed, have REST routes delegate to tRPC internally rather than duplicating logic.

**Extensive Console Logging in Production Code:**
- Issue: 67 console.log/warn/error calls throughout server codebase for debugging
- Files: `server/src/routes/ondc-compat.ts` (11 logs), `server/src/trpc/routers/gateway.ts` (11 logs), `server/src/lib/ondc/client.ts` (2 logs), and throughout
- Impact: Performance overhead. Sensitive debug information logged (request bodies, signing data, transaction IDs). No structured logging, making production debugging and monitoring difficult. Log noise makes actual errors hard to spot.
- Fix approach: Replace with structured logger (winston, pino, or similar). Add log levels and filters. Redact sensitive data from logs. Implement centralized error tracking (Sentry).

**In-Memory Subscription Callbacks System:**
- Issue: `server/src/infra/key-value/redis/connection-pool.ts` lines 17-18 use JavaScript `Map` for pub/sub callbacks instead of Redis channels
- Files: `server/src/infra/key-value/redis/connection-pool.ts`, `server/src/infra/key-value/redis/store.ts`
- Impact: Callbacks only exist in process memory. Lost on process restart. Doesn't scale to multiple server instances. EventSource connections (SSE) become unreliable in clustered deployments.
- Fix approach: Use Redis pub/sub directly for all subscriptions. Maintain in-memory callback registry only as a cache layer with fallback to Redis.

## Known Bugs

**Missing Transaction TTL Cleanup:**
- Symptoms: Search and select entries accumulate in Redis indefinitely if callbacks never arrive
- Files: `server/src/lib/search-store.ts` (TTL set at line ~185), `server/src/lib/select-store.ts`
- Trigger: Create search transaction but don't receive `on_search` callback within TTL window. Entry persists in Redis forever.
- Current mitigation: TTL is set when entry created, but no confirmation that Redis enforces it. No cleanup job monitoring expired entries.
- Workaround: Manual Redis cleanup or restart. Monitor Redis memory usage.
- Fix approach: Verify TTL configuration actually works. Add Redis EXPIRE callback monitoring. Implement background cleanup job that scans for orphaned entries.

**SSE Stream Connection Leak on Client Disconnect:**
- Symptoms: Memory usage grows if client disconnects during active SSE stream
- Files: `server/src/routes/sse.ts` (cleanup at line 33-36, but subscription may not unsubscribe properly)
- Trigger: Client closes browser/connection while receiving SSE updates. Server may not receive 'close' event reliably in all scenarios.
- Workaround: Rely on TTL intervals (line 104-126) to eventually clean up.
- Fix approach: Add timeout-based cleanup. Ensure all references (unsubscribe, intervals) are cleared even if close event fails. Use WeakMap for listener tracking.

**Challenge Decryption Errors Not Properly Logged:**
- Symptoms: on_subscribe decryption failures return 500 with minimal context
- Files: `server/src/routes/ondc-compat.ts` line 166, `server/src/entities/tenant.ts` decryption method
- Trigger: Malformed challenge, wrong encryption keys, or ONDC protocol version mismatch
- Current mitigation: Generic error response (line 171-172)
- Workaround: Check error logs for details
- Fix approach: Log decryption failure details (key length, algorithm, error) without exposing keys. Return structured error response with error code for client handling.

## Security Considerations

**Private Keys Exposed in Environment Variables:**
- Risk: Cryptographic private keys (ENCRYPTION_PRIVATE_KEY, SIGNING_PRIVATE_KEY) stored as plain text in .env file and process.env
- Files: `server/src/entities/tenant.ts` (lines 30-80 validation), `.env.example`
- Current mitigation: .env file gitignored (documented in CLAUDE.md). Environment variables validated on startup.
- Recommendations:
  1. Use secrets management system (AWS Secrets Manager, HashiCorp Vault, etc.)
  2. Implement key rotation mechanism
  3. Add audit logging for key access
  4. Enforce strict file permissions on .env files
  5. Never log full key values, use key IDs/fingerprints only

**No Request Authentication on Callbacks:**
- Risk: ONDC callbacks (`on_subscribe`, `on_search`, `on_select`) from external networks not verified
- Files: `server/src/routes/ondc-compat.ts` (lines 147, 202, 306), `server/src/trpc/routers/gateway.ts` (onSearch, onSelect procedures)
- Current mitigation: .env variable FEATURE_VERIFY_CALLBACKS exists but not visible in code
- Recommendations:
  1. Implement signature verification for all callback requests
  2. Validate sender identity (ONDC network participants)
  3. Rate limiting on callback endpoints
  4. Add request ID tracking to detect replay attacks
  5. Use HMAC or Ed25519 signatures for callback validation

**No CORS Validation on Callbacks:**
- Risk: ONDC callback endpoints (REST routes) may accept requests from unauthorized origins due to cors middleware
- Files: `server/src/app.ts` line 20-26 - CORS allows any origin in dev, specific CLIENT_URL in prod
- Current mitigation: CORS configured but callback handlers not callback-specific
- Recommendations:
  1. Create separate CORS configuration for callback endpoints
  2. Whitelist ONDC gateway/registry IPs/domains only
  3. Reject OPTIONS preflight for callback routes
  4. Implement additional origin verification in handler

**Error Messages Leak Implementation Details:**
- Risk: Error responses may expose internal paths, database structure, or system information
- Files: `server/src/lib/ondc/client.ts` (line 81), multiple error handlers
- Current mitigation: Stack traces only in non-production (app.ts line 96)
- Recommendations:
  1. Use error codes instead of full messages in responses
  2. Log full errors server-side, return generic messages to clients
  3. Implement error translation layer
  4. Audit all error responses for information leakage

## Performance Bottlenecks

**Expensive JSON Parsing in SSE Validation:**
- Problem: LiveSearchContext.tsx (lines 194-211) parses JSON for every SSE event from string to verify schema
- Files: `client/src/components/home/LiveSearchContext.tsx` (lines 194-211)
- Cause: EventSource emits string data, must parse and validate with Zod for each update. Large catalog responses (many providers/items) cause repeated parsing.
- Improvement path:
  1. Parse JSON once at source (SSE sender on server)
  2. Cache validation schema results for duplicate structures
  3. Use incremental validation (only validate delta, not full state)
  4. Implement parsing debounce/throttle if updates flood

**Redis Keys Query Performance:**
- Problem: `server/src/infra/key-value/redis/store.ts` line 82-86 uses KEYS command for pattern matching
- Files: `server/src/infra/key-value/redis/store.ts` (keys method)
- Cause: KEYS is O(N) operation that blocks Redis. Scanning entire keyspace for pattern matches slow at scale.
- Improvement path:
  1. Replace KEYS with SCAN command for non-blocking iteration
  2. Use Redis sorted sets with score-based filtering instead of pattern matching
  3. Implement separate index structure for common queries
  4. Cache query results with TTL

**No Connection Pooling Limits:**
- Problem: Redis connection pool in `connection-pool.ts` grows unbounded - new client created per redisUrl without max limit
- Files: `server/src/infra/key-value/redis/connection-pool.ts` (lines 11-28)
- Cause: Map stores one connection per URL but no pool size management. In multi-tenant scenario, could create hundreds of connections.
- Improvement path:
  1. Add configurable max pool size
  2. Implement connection reuse with lease pattern
  3. Add pool monitoring and metrics
  4. Close idle connections after timeout

**Synchronous Crypto Operations:**
- Problem: Challenge decryption and message signing are synchronous, blocking event loop
- Files: `server/src/entities/tenant.ts` (decryptChallenge, signMessage methods), `server/src/lib/ondc/client.ts` (line 55)
- Cause: libsodium-wrappers uses synchronous operations. Large requests could block server.
- Improvement path:
  1. Use libsodium's async-capable alternatives if available
  2. Implement worker thread pool for crypto operations
  3. Cache pre-computed values (shared secret already done, good)
  4. Profile actual impact under load before optimizing

## Fragile Areas

**Search Results Store State Management:**
- Files: `server/src/lib/search-store.ts` (330 lines, complex state machine)
- Why fragile: Multiple independent operations (createSearchEntry, addSearchResponse, getSearchResults) modify shared search state. No atomic transactions. TTL and response tracking are decoupled. Race conditions possible between entry expiration and response arrival.
- Safe modification:
  1. Add locks/mutexes around state transitions
  2. Use Redis transactions (MULTI/EXEC) for multi-step operations
  3. Add state validation at each step
  4. Write comprehensive tests for race conditions
- Test coverage: Limited - only basic smoke tests exist in `tests/api/`

**Select Results Store State Machine:**
- Files: `server/src/lib/select-store.ts` (329 lines, mirrors search-store complexity)
- Why fragile: Similar issues to search-store. Quote calculation depends on multiple responses arriving in correct order. No validation of response sequence. Add-ons and xinput field handling is fragile.
- Safe modification:
  1. Add state assertions before processing responses
  2. Validate response sequence and completeness
  3. Add defensive null/undefined checks
  4. Document expected state transitions
- Test coverage: Minimal - basic tests only

**ONDC Request Payload Generation:**
- Files: `server/src/lib/ondc/payload.ts` (113 lines, generates complex Beckn protocol structures)
- Why fragile: Hard-coded nested object structures. No schema validation of generated payloads. Easy to break protocol compliance with small changes. Version mismatches between client expectations and ONDC protocol.
- Safe modification:
  1. Use Zod schemas to validate outgoing payloads
  2. Add protocol version management
  3. Add serialization tests to verify against ONDC spec
  4. Document required fields for each operation
- Test coverage: None - no unit tests for payload generation

**Tenant Singleton Pattern:**
- Files: `server/src/entities/tenant.ts` (lines 89-213)
- Why fragile: Static getInstance() pattern at line 90. If Tenant.getInstance() called before environment fully initialized, silent failure. No reinitialize mechanism for testing. Circular dependency possible if other singletons depend on Tenant.
- Safe modification:
  1. Use dependency injection instead of singletons
  2. Add explicit initialization phase
  3. Add validation errors that crash server loudly
  4. Support test fixture overrides
- Test coverage: No unit tests for Tenant class

## Scaling Limits

**Single Redis Instance Dependency:**
- Current capacity: Single Redis instance serves all state (search entries, select entries, subscriptions, pub/sub)
- Limit: Memory limit of single Redis node. Breaks if Redis unavailable (no automatic failover). No sharding support.
- Scaling path:
  1. Implement Redis Sentinel for automatic failover
  2. Add Redis Cluster support with key-based sharding
  3. Separate pub/sub into dedicated Redis instance
  4. Implement caching layer (in-process with distributed invalidation)

**In-Process SSE Subscriptions:**
- Current capacity: Maximum concurrent SSE connections limited by process file descriptors and memory
- Limit: Single Node.js process can handle ~10k-50k concurrent connections depending on data size. No horizontal scaling possible.
- Scaling path:
  1. Implement Redis Pub/Sub bridging for inter-process communication
  2. Use cluster module or load balancer with sticky sessions
  3. Switch to dedicated real-time infrastructure (Socket.io, etc.)
  4. Implement graceful connection migration for deploys

**Client-Side Memory with Large Catalogs:**
- Current capacity: Browser memory accumulating all search results in React state
- Limit: Large catalogs (100+ providers, 1000+ items) cause browser slowdown/crashes
- Scaling path:
  1. Implement virtual scrolling with lazy loading
  2. Paginate results instead of loading all at once
  3. Use IndexedDB for persistent client-side caching
  4. Stream results incrementally to UI

## Dependencies at Risk

**libsodium-wrappers 0.8.2:**
- Risk: Library is synchronous wrapper around Rust libsodium. Synchronous crypto can block event loop. No async alternative in Node.js ecosystem has same coverage.
- Impact: Blocks all requests during signing/decryption. Crypto operations not parallelizable. If crypto becomes bottleneck, must rewrite with native modules.
- Migration plan:
  1. Evaluate `sodium-plus` (pure JS, slower)
  2. Evaluate `@noble/hashes` + `@noble/ed25519` for partial functionality
  3. Consider Node.js built-in crypto module for supported algorithms
  4. Last resort: Fork libsodium-wrappers to add async support

**Express 5.0.1 (Latest):**
- Risk: Express 5.0 is very recent (released early 2024). Breaking changes from v4. Limited real-world production experience. May have undiscovered edge cases in error handling.
- Impact: Breaking changes in middleware handling (async/await). Error handling differences. May need code changes on minor version updates.
- Migration plan:
  1. Pin to stable 5.x.x version once v5.1+ released with more stability
  2. Alternatively, downgrade to v4.18.x LTS for stability
  3. Maintain compatibility layer if staying on v5

**@ngrok/ngrok 1.4.0:**
- Risk: ngrok embedded SDK is separate from standalone ngrok. Relatively new. Uses WebSockets internally. May have connection stability issues.
- Impact: Automatic ngrok tunnel startup (referenced in package.json) could fail silently. Complicates deployment.
- Migration plan:
  1. Consider removing ngrok from production code, use it only in development
  2. Implement proper tunnel setup in CI/CD instead
  3. Use environment variable to disable ngrok initialization

## Missing Critical Features

**No Graceful Shutdown:**
- Problem: Server has no shutdown handler. In-flight requests terminate abruptly on deploy.
- Blocks: Zero-downtime deployments. Connection cleanup. Database transaction rollback.
- Fix approach: Implement SIGTERM handler that closes HTTP server, waits for in-flight requests, closes Redis connections, then exits.

**No Request Context Logging:**
- Problem: Cannot trace individual requests through system. No request IDs or correlation tracking.
- Blocks: Debugging production issues. Performance profiling. Distributed tracing.
- Fix approach: Add request ID middleware. Attach IDs to all logs and Redis operations. Implement correlation header support for cross-service tracing.

**No Health Check for Redis:**
- Problem: Only basic "/health" endpoint checks if context can be created. Doesn't verify Redis connectivity.
- Blocks: Load balancer cannot detect Redis failures. Servers marked healthy when unable to serve requests.
- Fix approach: Add Redis PING in health endpoint. Implement separate readiness vs liveness probes. Return 503 if Redis unhealthy.

**No Metrics or Observability:**
- Problem: Cannot measure request latency, error rates, or resource usage. No prometheus/metrics export.
- Blocks: Performance monitoring. Alerting on issues. Capacity planning.
- Fix approach: Add metrics middleware (prometheus). Track request latency, error rate, Redis command duration. Export metrics endpoint.

## Test Coverage Gaps

**No Unit Tests for Core Entities:**
- What's not tested: Tenant class (crypto operations, initialization), OnSearchResponse/OnSelectResponse parsing
- Files: `server/src/entities/tenant.ts`, `server/src/lib/search-store.ts`, `server/src/lib/select-store.ts`
- Risk: Changes to cryptographic operations could break silently. State machine bugs in search/select stores not caught until production.
- Priority: High

**No Tests for Payload Generation:**
- What's not tested: `server/src/lib/ondc/payload.ts` - completely untested. No verification that generated payloads match ONDC spec.
- Files: `server/src/lib/ondc/payload.ts`
- Risk: Protocol version mismatches, missing fields, incorrect structure - all possible. Would only be caught if ONDC rejects request.
- Priority: High

**Limited E2E Test Coverage:**
- What's not tested: Multi-step flows (search → select → init → confirm). Error cases for BPP responses. Timeout and retry scenarios.
- Files: `tests/api/` contains only basic smoke tests
- Risk: Integration bugs between services only caught in staging. Circuit breaks not tested.
- Priority: Medium

**No Performance Tests:**
- What's not tested: Large catalog search performance. SSE streaming with hundreds of concurrent clients. Redis operations at scale.
- Files: No performance test files exist
- Risk: Cannot detect performance regressions until production load. Scaling limits unknown.
- Priority: Medium

**No Security Tests:**
- What's not tested: Request forgery prevention. Signature validation on callbacks. SQL injection in Redis operations (none exist but no validation framework).
- Files: No security test files exist
- Risk: Security vulnerabilities not caught in CI/CD.
- Priority: High

---

*Concerns audit: 2026-02-02*
