# ONDC Vaatun - Feature Roadmap PRD

## Document Information

**Version**: 1.0
**Last Updated**: 2025-01-22
**Status**: Draft
**Owner**: Engineering Team

---

## Executive Summary

This PRD outlines the technical implementation roadmap to evolve the current ONDC Vaatun codebase from a basic subscription/verification service into a comprehensive ONDC network participant application. The roadmap is based on industry best practices from the redBus ONDC integration and adapted for Next.js architecture.

**Current State**: Basic ONDC subscription and domain verification endpoints
**Target State**: Full-featured ONDC Buyer/Seller App with complete network integration

---

## Strategic Goals

1. **Complete ONDC Network Integration**: Implement all required endpoints for ONDC protocol compliance
2. **Multi-Environment Support**: Enable seamless deployment across staging, preprod, and production environments
3. **Developer Experience**: Provide clear documentation, configuration tools, and debugging capabilities
4. **Production Readiness**: Implement monitoring, logging, and error handling for production deployments
5. **Extensibility**: Build a modular architecture that supports both Buyer App and Seller App implementations

---

## Feature Roadmap

### Phase 1: Enhanced Configuration & Key Management (Week 1-2)

#### 1.1 Environment-Based Configuration System

**Priority**: P0 (Critical)
**Effort**: 2-3 days

**Description**:
Implement a robust configuration system to manage multiple ONDC environments (staging, preprod, production).

**Requirements**:
- Create environment-specific config files (e.g., `config/staging.yaml`, `config/preprod.yaml`, `config/production.yaml`)
- Support for both YAML and environment variables
- Configuration validation on startup
- Type-safe configuration interface using TypeScript

**Config Structure**:
```yaml
environment: staging | preprod | production

app:
  buyerAppUrl: https://ondc-staging.vaatun.com
  buyerAppUri: /
  networkParticipantType: buyerApp | sellerApp
  domain: ONDC:TRV11 | ONDC:RET11 | etc.

ondc:
  gatewayUrl: https://staging.gateway.proteantech.in
  registryUrl: https://staging.registry.ondc.org
  ondcPublicKey: <base64_encoded_key>

keys:
  signingPrivateKey: <base64_encoded_key>
  signingPublicKey: <base64_encoded_key>
  encryptionPrivateKey: <base64_encoded_key>
  encryptionPublicKey: <base64_encoded_key>

identity:
  subscriberId: ondc-staging.vaatun.com
  uniqueKeyId: <uuid>
  city: "*"
  country: IND
```

**Technical Implementation**:
- Create `src/lib/config/` directory
- Use `js-yaml` for YAML parsing
- Implement config loader with validation using Zod
- Add config types in `src/types/config.ts`

**Files to Create**:
- `src/lib/config/index.ts` - Config loader
- `src/lib/config/validator.ts` - Zod schemas
- `config/staging.yaml` - Staging environment config
- `config/preprod.yaml` - Preprod environment config
- `config/production.yaml` - Production environment config
- `src/types/config.ts` - TypeScript types

**Acceptance Criteria**:
- [ ] Configuration loads correctly for all environments
- [ ] Invalid config throws descriptive errors
- [ ] Environment variables override YAML values
- [ ] Type-safe access to all config values

---

#### 1.2 Key Management & Generation Tools

**Priority**: P0 (Critical)
**Effort**: 2 days

**Description**:
Build CLI tools for generating and managing cryptographic key pairs required for ONDC integration.

**Requirements**:
- Generate Ed25519 signing key pairs
- Generate X25519 encryption key pairs
- Validate existing keys
- Export keys in required formats (base64, DER)

**Technical Implementation**:
- Create `scripts/generate-keys.ts` for key generation
- Use `@noble/ed25519` for Ed25519 keys
- Use `libsodium-wrappers` for X25519 keys
- Output keys to `.env.local` or display securely

**CLI Commands**:
```bash
# Generate new key pairs
pnpm run keys:generate

# Validate existing keys
pnpm run keys:validate

# Rotate keys (generate new + update config)
pnpm run keys:rotate
```

**Files to Create**:
- `scripts/generate-keys.ts` - Key generation script
- `scripts/validate-keys.ts` - Key validation script
- `src/lib/crypto/key-generator.ts` - Core key generation logic
- `docs/key-management.md` - Key management documentation

**Acceptance Criteria**:
- [ ] Script generates valid Ed25519 key pairs
- [ ] Script generates valid X25519 key pairs
- [ ] Keys are output in correct base64 format
- [ ] Validation script detects invalid keys
- [ ] Documentation explains key rotation process

---

### Phase 2: Complete Subscription Flow (Week 2-3)

#### 2.1 Subscribe API Implementation

**Priority**: P0 (Critical)
**Effort**: 3 days

**Description**:
Implement the complete `/subscribe` API flow including request signing, async response handling, and subscription verification.

**Requirements**:
- POST endpoint to initiate ONDC subscription
- Generate properly signed subscription requests
- Handle async callback from ONDC `/on_subscribe`
- Implement challenge-response decryption
- Store subscription status in database/state

**API Flow**:
```
1. POST /api/ondc/subscribe
   ↓
2. App → ONDC /subscribe (signed request)
   ↓
3. ONDC → App /api/ondc/on_subscribe (encrypted challenge)
   ↓
4. App → ONDC (decrypted answer)
   ↓
5. Subscription confirmed
```

**Request Signing Requirements**:
- Authorization header with Blake2b-512 digest
- X-Gateway-Authorization with Ed25519 signature
- Proper timestamp and request_id handling

**Technical Implementation**:
- Create `src/app/api/ondc/subscribe/route.ts`
- Implement request signing in `src/lib/ondc/signing.ts`
- Update `src/app/api/ondc/on_subscribe/route.ts` with challenge decryption
- Add subscription state management

**Files to Create/Update**:
- `src/app/api/ondc/subscribe/route.ts` - Subscribe endpoint
- `src/lib/ondc/signing.ts` - Request signing utilities
- `src/lib/ondc/verification.ts` - Signature verification
- `src/types/ondc.ts` - ONDC API types
- `src/lib/db/subscription.ts` - Subscription state management

**Acceptance Criteria**:
- [ ] Subscribe request properly signed
- [ ] Challenge correctly decrypted
- [ ] Subscription status persisted
- [ ] Error handling for failed subscriptions
- [ ] Integration tests pass

---

#### 2.2 Lookup & Verification

**Priority**: P1 (High)
**Effort**: 1 day

**Description**:
Implement subscription verification by calling ONDC's `/lookup` endpoint.

**Requirements**:
- POST endpoint to check subscription status
- Call ONDC `/lookup` API
- Display subscription details (status, validity, keys)
- Admin UI to view subscription status

**Technical Implementation**:
- Create `src/app/api/ondc/lookup/route.ts`
- Create admin page `src/app/admin/subscription/page.tsx`
- Implement ONDC API client in `src/lib/ondc/client.ts`

**Files to Create**:
- `src/app/api/ondc/lookup/route.ts` - Lookup endpoint
- `src/app/admin/subscription/page.tsx` - Admin subscription page
- `src/lib/ondc/client.ts` - ONDC API client
- `src/components/SubscriptionStatus.tsx` - Status display component

**Acceptance Criteria**:
- [ ] Lookup returns accurate subscription status
- [ ] Admin page displays all subscription details
- [ ] Handles unsubscribed state gracefully
- [ ] Shows expiry dates and validity period

---

### Phase 3: ONDC Protocol Implementation (Week 3-5)

#### 3.1 Search & Discovery (Buyer App)

**Priority**: P1 (High)
**Effort**: 5 days

**Description**:
Implement ONDC search and discovery flow for buyer applications.

**API Endpoints**:
- `POST /api/ondc/search` - Initiate product/service search
- `POST /api/ondc/on_search` - Receive search results from sellers

**Flow**:
```
Buyer App → Gateway: /search
Gateway → Seller Apps: /search (broadcast)
Seller Apps → Gateway: /on_search
Gateway → Buyer App: /on_search (aggregated results)
```

**Request Structure**:
```typescript
interface SearchRequest {
  context: ONDCContext;
  message: {
    intent: {
      item?: { descriptor: { name: string } };
      fulfillment?: { end: { location: { gps: string } } };
      category?: { id: string };
      provider?: { id: string };
    };
  };
}
```

**Technical Implementation**:
- Create `src/app/api/ondc/search/route.ts`
- Create `src/app/api/ondc/on_search/route.ts`
- Implement request validation using Zod
- Store search results in cache (Redis/memory)
- Create UI for search functionality

**Files to Create**:
- `src/app/api/ondc/search/route.ts`
- `src/app/api/ondc/on_search/route.ts`
- `src/lib/ondc/schemas/search.ts` - Zod schemas
- `src/lib/cache/search-results.ts` - Result caching
- `src/app/search/page.tsx` - Search UI
- `src/components/SearchForm.tsx`
- `src/components/SearchResults.tsx`

**Acceptance Criteria**:
- [ ] Search request properly formatted and signed
- [ ] On_search callback receives and stores results
- [ ] Results cached for quick retrieval
- [ ] UI displays search results correctly
- [ ] Filters work (category, location, etc.)

---

#### 3.2 Select & Quote (Buyer App)

**Priority**: P1 (High)
**Effort**: 4 days

**Description**:
Implement item selection and quote generation flow.

**API Endpoints**:
- `POST /api/ondc/select` - Select items from catalog
- `POST /api/ondc/on_select` - Receive quote from seller
- `POST /api/ondc/init` - Initialize order
- `POST /api/ondc/on_init` - Receive order initialization response

**Technical Implementation**:
- Create select/on_select route handlers
- Create init/on_init route handlers
- Implement quote validation
- Create cart management system
- Build checkout UI

**Files to Create**:
- `src/app/api/ondc/select/route.ts`
- `src/app/api/ondc/on_select/route.ts`
- `src/app/api/ondc/init/route.ts`
- `src/app/api/ondc/on_init/route.ts`
- `src/lib/ondc/schemas/select.ts`
- `src/lib/ondc/schemas/init.ts`
- `src/lib/cart/index.ts` - Cart management
- `src/app/cart/page.tsx` - Cart UI
- `src/app/checkout/page.tsx` - Checkout UI

**Acceptance Criteria**:
- [ ] Select request includes chosen items
- [ ] Quote received and validated
- [ ] Cart persists across sessions
- [ ] Checkout flow completes successfully
- [ ] Price breakdowns displayed correctly

---

#### 3.3 Order Confirmation (Buyer App)

**Priority**: P1 (High)
**Effort**: 3 days

**Description**:
Implement order confirmation and payment flow.

**API Endpoints**:
- `POST /api/ondc/confirm` - Confirm order with payment
- `POST /api/ondc/on_confirm` - Receive order confirmation

**Technical Implementation**:
- Create confirm/on_confirm route handlers
- Integrate payment gateway (mock for staging)
- Store order details in database
- Send order confirmation emails
- Create order management UI

**Files to Create**:
- `src/app/api/ondc/confirm/route.ts`
- `src/app/api/ondc/on_confirm/route.ts`
- `src/lib/ondc/schemas/confirm.ts`
- `src/lib/db/orders.ts` - Order persistence
- `src/lib/payments/index.ts` - Payment integration
- `src/app/orders/page.tsx` - Orders list
- `src/app/orders/[orderId]/page.tsx` - Order details

**Acceptance Criteria**:
- [ ] Order confirmed successfully
- [ ] Payment processed (or mocked)
- [ ] Order stored in database
- [ ] Confirmation email sent
- [ ] Order visible in UI

---

#### 3.4 Post-Order Management

**Priority**: P2 (Medium)
**Effort**: 5 days

**Description**:
Implement post-order operations (status, track, cancel, update, support).

**API Endpoints**:
- `POST /api/ondc/status` - Get order status
- `POST /api/ondc/on_status` - Receive status update
- `POST /api/ondc/track` - Track order
- `POST /api/ondc/on_track` - Receive tracking info
- `POST /api/ondc/cancel` - Cancel order
- `POST /api/ondc/on_cancel` - Receive cancellation confirmation
- `POST /api/ondc/update` - Update order
- `POST /api/ondc/on_update` - Receive update confirmation
- `POST /api/ondc/support` - Get support info
- `POST /api/ondc/on_support` - Receive support details

**Technical Implementation**:
- Create route handlers for all endpoints
- Implement order state machine
- Build order tracking UI
- Add cancellation/modification flows
- Integrate support ticket system

**Files to Create**:
- `src/app/api/ondc/status/route.ts`
- `src/app/api/ondc/on_status/route.ts`
- `src/app/api/ondc/track/route.ts`
- `src/app/api/ondc/on_track/route.ts`
- `src/app/api/ondc/cancel/route.ts`
- `src/app/api/ondc/on_cancel/route.ts`
- `src/app/api/ondc/update/route.ts`
- `src/app/api/ondc/on_update/route.ts`
- `src/app/api/ondc/support/route.ts`
- `src/app/api/ondc/on_support/route.ts`
- `src/lib/orders/state-machine.ts`
- `src/components/OrderTracking.tsx`
- `src/components/OrderActions.tsx`

**Acceptance Criteria**:
- [ ] Order status updates in real-time
- [ ] Tracking information displayed correctly
- [ ] Cancellation flow works end-to-end
- [ ] Order modifications supported
- [ ] Support info accessible

---

### Phase 4: Seller App Implementation (Week 6-8)

#### 4.1 Catalog Management

**Priority**: P2 (Medium)
**Effort**: 7 days

**Description**:
Implement seller catalog management and on_search response generation.

**Requirements**:
- CRUD operations for product catalog
- Category management
- Inventory management
- Price management
- Image uploads
- Respond to buyer search requests

**Technical Implementation**:
- Create catalog database schema
- Build catalog management API
- Implement on_search response generation
- Create seller dashboard UI
- Add product listing forms

**Files to Create**:
- `src/lib/db/schema/catalog.ts`
- `src/app/api/catalog/route.ts` - Catalog CRUD
- `src/app/api/catalog/[productId]/route.ts`
- `src/lib/seller/catalog-manager.ts`
- `src/lib/seller/search-handler.ts`
- `src/app/seller/dashboard/page.tsx`
- `src/app/seller/products/page.tsx`
- `src/app/seller/products/new/page.tsx`
- `src/components/seller/ProductForm.tsx`
- `src/components/seller/CatalogTable.tsx`

**Acceptance Criteria**:
- [ ] Products can be created/updated/deleted
- [ ] Categories managed effectively
- [ ] Inventory tracked accurately
- [ ] Images uploaded and displayed
- [ ] Search requests generate proper responses

---

#### 4.2 Order Fulfillment

**Priority**: P2 (Medium)
**Effort**: 5 days

**Description**:
Implement seller-side order fulfillment workflow.

**Requirements**:
- Receive and process buyer orders
- Generate quotes (on_select)
- Confirm orders (on_confirm)
- Update order status
- Handle cancellations/returns

**Technical Implementation**:
- Create order processing pipeline
- Implement fulfillment state machine
- Build seller order management UI
- Add notification system

**Files to Create**:
- `src/lib/seller/order-processor.ts`
- `src/lib/seller/fulfillment-manager.ts`
- `src/app/seller/orders/page.tsx`
- `src/app/seller/orders/[orderId]/page.tsx`
- `src/components/seller/OrderCard.tsx`
- `src/components/seller/FulfillmentActions.tsx`
- `src/lib/notifications/index.ts`

**Acceptance Criteria**:
- [ ] Orders received from buyers
- [ ] Quotes generated automatically
- [ ] Orders confirmed by seller
- [ ] Status updates sent to buyers
- [ ] Cancellations handled properly

---

### Phase 5: Infrastructure & DevOps (Week 8-9)

#### 5.1 Logging & Monitoring

**Priority**: P1 (High)
**Effort**: 3 days

**Description**:
Implement comprehensive logging and monitoring for production deployments.

**Requirements**:
- Structured logging for all ONDC API calls
- Request/response logging
- Error tracking and alerting
- Performance monitoring
- Webhook delivery tracking

**Technical Implementation**:
- Integrate Pino for structured logging
- Add request/response middleware
- Set up Sentry for error tracking
- Add performance metrics
- Create logging dashboard

**Tools**:
- `pino` - Structured logging
- `pino-http` - HTTP logging middleware
- `@sentry/nextjs` - Error tracking
- `prom-client` - Prometheus metrics

**Files to Create**:
- `src/lib/logger/index.ts`
- `src/middleware/logging.ts`
- `src/lib/monitoring/metrics.ts`
- `src/lib/monitoring/sentry.ts`
- `instrumentation.ts` - Next.js instrumentation
- `docs/monitoring.md`

**Acceptance Criteria**:
- [ ] All API calls logged with request ID
- [ ] Errors tracked in Sentry
- [ ] Performance metrics collected
- [ ] Logs searchable and queryable
- [ ] Alerts configured for critical errors

---

#### 5.2 Testing Infrastructure

**Priority**: P1 (High)
**Effort**: 4 days

**Description**:
Build comprehensive testing suite for ONDC integration.

**Requirements**:
- Unit tests for crypto utilities
- Integration tests for API endpoints
- End-to-end tests for complete flows
- Mock ONDC gateway for testing
- Test data generators

**Technical Implementation**:
- Set up Vitest for unit tests
- Use Playwright for E2E tests
- Create ONDC mock server
- Add test utilities and fixtures

**Files to Create**:
- `vitest.config.ts`
- `playwright.config.ts`
- `tests/unit/crypto.test.ts`
- `tests/unit/signing.test.ts`
- `tests/integration/subscribe.test.ts`
- `tests/integration/search.test.ts`
- `tests/e2e/buyer-flow.test.ts`
- `tests/mocks/ondc-gateway.ts`
- `tests/fixtures/test-data.ts`
- `tests/utils/test-helpers.ts`

**Acceptance Criteria**:
- [ ] >80% code coverage for critical paths
- [ ] All API endpoints have integration tests
- [ ] E2E tests cover complete user flows
- [ ] Mock gateway behaves like real ONDC
- [ ] Tests run in CI/CD pipeline

---

#### 5.3 Database & State Management

**Priority**: P1 (High)
**Effort**: 3 days

**Description**:
Implement persistent storage for orders, subscriptions, and catalog.

**Requirements**:
- Choose database (PostgreSQL recommended)
- Design schema for orders, catalog, subscriptions
- Implement ORM/query builder
- Add migrations
- Set up database backups

**Technical Implementation**:
- Use Prisma as ORM
- Design normalized schema
- Create seed data
- Add database utilities

**Files to Create**:
- `prisma/schema.prisma`
- `prisma/migrations/`
- `prisma/seed.ts`
- `src/lib/db/client.ts`
- `src/lib/db/repositories/orders.ts`
- `src/lib/db/repositories/catalog.ts`
- `src/lib/db/repositories/subscriptions.ts`
- `docs/database-schema.md`

**Acceptance Criteria**:
- [ ] Database schema covers all entities
- [ ] Migrations run successfully
- [ ] Seed data available for development
- [ ] Queries optimized for performance
- [ ] Backups configured

---

### Phase 6: UI/UX Enhancements (Week 9-10)

#### 6.1 Buyer Experience

**Priority**: P2 (Medium)
**Effort**: 5 days

**Description**:
Build polished buyer-facing UI for search, browse, checkout.

**Requirements**:
- Product search with filters
- Product detail pages
- Shopping cart
- Checkout flow
- Order history
- Order tracking

**Technical Implementation**:
- Use shadcn/ui components
- Implement responsive design
- Add loading states
- Optimize for performance

**Files to Create**:
- `src/app/shop/page.tsx` - Product listing
- `src/app/shop/[productId]/page.tsx` - Product details
- `src/components/buyer/ProductCard.tsx`
- `src/components/buyer/ProductFilters.tsx`
- `src/components/buyer/Cart.tsx`
- `src/components/buyer/CheckoutForm.tsx`
- `src/components/buyer/OrderHistory.tsx`

**Acceptance Criteria**:
- [ ] Search returns relevant results
- [ ] Filters work correctly
- [ ] Product pages load quickly
- [ ] Checkout flow is intuitive
- [ ] Orders tracked accurately

---

#### 6.2 Seller Dashboard

**Priority**: P2 (Medium)
**Effort**: 5 days

**Description**:
Build comprehensive seller dashboard for managing products and orders.

**Requirements**:
- Analytics dashboard
- Product management
- Order management
- Inventory tracking
- Performance metrics

**Files to Create**:
- `src/app/seller/page.tsx` - Dashboard home
- `src/components/seller/AnalyticsDashboard.tsx`
- `src/components/seller/OrdersTable.tsx`
- `src/components/seller/InventoryStatus.tsx`
- `src/components/seller/PerformanceMetrics.tsx`

**Acceptance Criteria**:
- [ ] Dashboard shows key metrics
- [ ] Products easily manageable
- [ ] Orders processable quickly
- [ ] Inventory levels visible
- [ ] Performance tracked

---

### Phase 7: Advanced Features (Week 11-12)

#### 7.1 Webhook Reliability

**Priority**: P2 (Medium)
**Effort**: 3 days

**Description**:
Implement webhook retry mechanism and delivery guarantees.

**Requirements**:
- Webhook queue system
- Retry with exponential backoff
- Dead letter queue for failed webhooks
- Webhook delivery monitoring

**Technical Implementation**:
- Use Bull or BullMQ for queue
- Implement retry logic
- Add webhook logs
- Create admin UI for monitoring

**Files to Create**:
- `src/lib/webhooks/queue.ts`
- `src/lib/webhooks/retry.ts`
- `src/lib/webhooks/monitor.ts`
- `src/app/admin/webhooks/page.tsx`

**Acceptance Criteria**:
- [ ] Webhooks queued reliably
- [ ] Retries happen automatically
- [ ] Failed webhooks visible in UI
- [ ] Manual retry possible

---

#### 7.2 Multi-Domain Support

**Priority**: P3 (Low)
**Effort**: 4 days

**Description**:
Support multiple ONDC domains (Retail, Travel, Agriculture, etc.).

**Requirements**:
- Domain-specific configurations
- Domain-specific schemas
- Domain switcher UI
- Domain-specific validation

**Files to Create**:
- `src/lib/domains/retail.ts`
- `src/lib/domains/travel.ts`
- `src/lib/domains/agriculture.ts`
- `src/lib/domains/registry.ts`
- `src/components/DomainSwitcher.tsx`

**Acceptance Criteria**:
- [ ] Multiple domains configurable
- [ ] Schemas validate per domain
- [ ] UI adapts to domain
- [ ] Switching domains works

---

#### 7.3 Rate Limiting & Throttling

**Priority**: P2 (Medium)
**Effort**: 2 days

**Description**:
Implement rate limiting to prevent abuse and comply with ONDC limits.

**Requirements**:
- API rate limiting
- Per-IP throttling
- Graceful degradation
- Rate limit headers

**Technical Implementation**:
- Use upstash/ratelimit or similar
- Implement middleware
- Add rate limit responses

**Files to Create**:
- `src/middleware/rate-limit.ts`
- `src/lib/rate-limit/index.ts`
- `src/lib/rate-limit/config.ts`

**Acceptance Criteria**:
- [ ] Endpoints rate-limited
- [ ] Headers include limit info
- [ ] Exceeding limits handled gracefully
- [ ] Admin can adjust limits

---

## Technical Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Next.js App                          │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Buyer UI     │  │ Seller UI    │  │ Admin UI     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐  │
│  │              API Routes Layer                        │  │
│  │  /api/ondc/*  /api/catalog/*  /api/orders/*        │  │
│  └──────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ ONDC Client  │  │ Auth Service │  │ Cache Layer  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Crypto Utils │  │ Signing      │  │ Queue System │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ PostgreSQL   │  │ Redis        │  │ File Storage │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
                           ↕
┌─────────────────────────────────────────────────────────────┐
│                    ONDC Network                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Gateway      │  │ Registry     │  │ Participants │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure (Proposed)

```
ondc-vaatun/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── ondc/
│   │   │   │   ├── subscribe/route.ts
│   │   │   │   ├── on_subscribe/route.ts
│   │   │   │   ├── search/route.ts
│   │   │   │   ├── on_search/route.ts
│   │   │   │   ├── select/route.ts
│   │   │   │   ├── on_select/route.ts
│   │   │   │   ├── init/route.ts
│   │   │   │   ├── on_init/route.ts
│   │   │   │   ├── confirm/route.ts
│   │   │   │   ├── on_confirm/route.ts
│   │   │   │   ├── status/route.ts
│   │   │   │   ├── on_status/route.ts
│   │   │   │   ├── track/route.ts
│   │   │   │   ├── on_track/route.ts
│   │   │   │   ├── cancel/route.ts
│   │   │   │   ├── on_cancel/route.ts
│   │   │   │   ├── update/route.ts
│   │   │   │   ├── on_update/route.ts
│   │   │   │   ├── support/route.ts
│   │   │   │   ├── on_support/route.ts
│   │   │   │   └── lookup/route.ts
│   │   │   ├── catalog/
│   │   │   └── orders/
│   │   ├── shop/ (buyer UI)
│   │   ├── seller/ (seller UI)
│   │   └── admin/ (admin UI)
│   ├── lib/
│   │   ├── ondc/
│   │   │   ├── client.ts
│   │   │   ├── signing.ts
│   │   │   ├── verification.ts
│   │   │   ├── schemas/
│   │   │   └── utils.ts
│   │   ├── config/
│   │   ├── crypto/
│   │   ├── db/
│   │   ├── cache/
│   │   ├── webhooks/
│   │   ├── logger/
│   │   └── monitoring/
│   ├── components/
│   │   ├── buyer/
│   │   ├── seller/
│   │   └── admin/
│   └── types/
├── config/
│   ├── staging.yaml
│   ├── preprod.yaml
│   └── production.yaml
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── scripts/
│   ├── generate-keys.ts
│   └── validate-keys.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── docs/
    ├── prds/
    ├── api/
    └── guides/
```

---

## Success Metrics

### Technical Metrics
- API response time < 200ms (p95)
- Webhook delivery success rate > 99%
- Zero data loss on order processing
- 99.9% uptime SLA
- < 1% error rate on ONDC API calls

### Business Metrics
- Successfully complete end-to-end buyer journey
- Successfully process seller orders
- Pass ONDC certification for production
- Support 1000+ concurrent users
- Handle 10k+ orders per day

---

## Dependencies & Prerequisites

### External Services
- ONDC Staging/Preprod/Production access
- Domain names (3x for environments)
- SSL certificates
- PostgreSQL database
- Redis cache (optional but recommended)
- Email service (SendGrid/SES)
- File storage (S3/Cloudinary)

### Development Tools
- Node.js 18+
- pnpm package manager
- Docker (for local dev)
- Git

---

## Risk Assessment

### High Risk
1. **ONDC API Changes**: ONDC protocol may change without notice
   - *Mitigation*: Version-locked schemas, subscribe to ONDC updates, comprehensive tests

2. **Cryptographic Errors**: Incorrect signing/encryption breaks integration
   - *Mitigation*: Extensive testing, use proven libraries, code review

3. **Webhook Reliability**: Missing webhooks causes order failures
   - *Mitigation*: Queue system, retries, monitoring, manual intervention UI

### Medium Risk
1. **Scale**: High traffic may overwhelm infrastructure
   - *Mitigation*: Caching, rate limiting, horizontal scaling

2. **Data Consistency**: Async nature may cause state issues
   - *Mitigation*: Event sourcing, idempotency, transaction management

### Low Risk
1. **UI/UX**: Poor experience may reduce adoption
   - *Mitigation*: User testing, iterative improvements, analytics

---

## Appendix

### Reference Links
- [ONDC Official Docs](https://github.com/ONDC-Official/developer-docs)
- [ONDC Protocol Specs](https://github.com/ONDC-Official/ONDC-Protocol-Specs)
- [Beckn Protocol](https://github.com/beckn/protocol-specifications)
- [redBus Integration Article](https://medium.com/redbus-in/integrate-with-ondc-a-comprehensive-guide-about-technical-apis-965ed313f5d3)

### Glossary
- **BAP**: Buyer App (application used by buyers)
- **BPP**: Seller App (application used by sellers)
- **Gateway**: ONDC network gateway that routes requests
- **Registry**: Service that maintains list of network participants
- **ONDC**: Open Network for Digital Commerce
- **Beckn**: Open protocol specification used by ONDC

---

## Version History

| Version | Date       | Author | Changes                           |
|---------|------------|--------|-----------------------------------|
| 1.0     | 2025-01-22 | Team   | Initial PRD based on redBus guide |

---

## Approval

This PRD requires approval from:
- [ ] Engineering Lead
- [ ] Product Manager
- [ ] Security Team
- [ ] DevOps Team
