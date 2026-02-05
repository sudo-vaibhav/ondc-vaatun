# Codebase Structure

**Analysis Date:** 2026-02-02

## Directory Layout

```
ondc-vaatun/
├── server/                         # Express + tRPC backend
│   ├── src/
│   │   ├── index.ts                # Entry point (port 4822)
│   │   ├── app.ts                  # Express app, middleware setup
│   │   ├── entities/               # Domain entities
│   │   │   └── tenant.ts           # ONDC credentials, crypto ops
│   │   ├── value-objects/          # Type-safe identifiers
│   │   │   ├── uuid.ts             # UUID validation
│   │   │   ├── id.ts               # Generic string ID
│   │   │   └── case-insensitive-id.ts  # Case-insensitive ID base
│   │   ├── trpc/                   # tRPC routing and procedures
│   │   │   ├── trpc.ts             # tRPC initialization
│   │   │   ├── context.ts          # Request context factory
│   │   │   ├── index.ts            # App router composition
│   │   │   └── routers/            # Domain-specific routers
│   │   │       ├── health.ts       # Health check procedure
│   │   │       ├── registry.ts     # ONDC registry (lookup, subscribe)
│   │   │       ├── gateway.ts      # Beckn protocol (search, select, init, confirm)
│   │   │       └── results.ts      # Result retrieval queries
│   │   ├── routes/                 # Raw Express routes (non-tRPC)
│   │   │   ├── site-verification.ts   # GET /ondc-site-verification.html
│   │   │   ├── sse.ts              # GET /api/ondc/search-stream/:transactionId
│   │   │   └── ondc-compat.ts      # POST /api/ondc/* (backward compat)
│   │   ├── lib/                    # Shared business logic
│   │   │   ├── ondc/               # ONDC integration
│   │   │   │   ├── client.ts       # HTTP client with signing
│   │   │   │   ├── signing.ts      # Blake2b digest calculation
│   │   │   │   └── payload.ts      # Request builders
│   │   │   ├── search-store.ts     # Search transaction storage
│   │   │   └── select-store.ts     # Select transaction storage
│   │   └── infra/                  # Infrastructure
│   │       └── key-value/
│   │           └── redis/          # Redis store implementation
│   │               ├── store.ts    # TenantKeyValueStore class
│   │               ├── connection-pool.ts  # Connection management
│   │               ├── key-formatter.ts    # Key prefixing logic
│   │               └── types.ts    # TypeScript interfaces
│   ├── public/                     # Static assets (production)
│   │   ├── openapi.json            # OpenAPI 3.1 specification
│   │   └── index.html              # SPA fallback
│   ├── package.json
│   └── tsconfig.json
│
├── client/                         # Vite + React + TanStack Router
│   ├── src/
│   │   ├── main.tsx                # React entry point
│   │   ├── routes/                 # File-based routing (TanStack Router)
│   │   │   ├── __root.tsx          # Root layout with providers
│   │   │   ├── index.tsx           # Home page (/)
│   │   │   ├── directory/
│   │   │   │   └── index.tsx       # /directory
│   │   │   ├── health/
│   │   │   │   └── $searchId.tsx   # /health/:searchId
│   │   │   ├── motor/
│   │   │   │   └── $searchId.tsx   # /motor/:searchId
│   │   │   ├── quote/
│   │   │   │   └── $transactionId/
│   │   │   │       └── $messageId.tsx  # /quote/:transactionId/:messageId
│   │   │   ├── search-results/
│   │   │   │   └── $transactionId.tsx  # /search-results/:transactionId
│   │   │   └── search-results-streamed/
│   │   │       └── $transactionId.tsx  # /search-results-streamed/:transactionId
│   │   ├── trpc/                   # tRPC client setup
│   │   │   ├── client.ts           # tRPC React Query client
│   │   │   └── Provider.tsx        # TRPCProvider + QueryClientProvider
│   │   ├── components/             # React components
│   │   │   ├── ui/                 # shadcn/ui components (auto-generated)
│   │   │   ├── home/               # Home page sections
│   │   │   │   ├── HeroSection.tsx
│   │   │   │   ├── CTABanner.tsx
│   │   │   │   ├── HowItWorks.tsx
│   │   │   │   ├── InsuranceCards.tsx
│   │   │   │   ├── TrustStrip.tsx
│   │   │   │   ├── WhyONDC.tsx
│   │   │   │   ├── QuoteWidget.tsx
│   │   │   │   ├── LiveSearchContext.tsx
│   │   │   │   └── PrismSphere.tsx
│   │   │   ├── product/            # Search results components
│   │   │   │   ├── ProductHeader.tsx
│   │   │   │   ├── HealthItemCard.tsx
│   │   │   │   └── MotorItemCard.tsx
│   │   │   ├── search/             # Search result display
│   │   │   │   ├── ItemCard.tsx
│   │   │   │   └── ProviderCard.tsx
│   │   │   ├── quote/              # Quote/purchase components
│   │   │   │   ├── QuoteBreakdown.tsx
│   │   │   │   └── XInputForm.tsx
│   │   │   ├── purchaser/          # Purchaser info components
│   │   │   │   └── PurchaserInfoDialog.tsx
│   │   │   ├── header.tsx          # Top nav
│   │   │   ├── Footer.tsx
│   │   │   ├── SearchTrigger.tsx
│   │   │   ├── StreamedSearchTrigger.tsx
│   │   │   ├── SubscriptionTrigger.tsx
│   │   │   ├── ApiTrigger.tsx
│   │   │   └── theme-provider.tsx  # Dark mode provider
│   │   ├── lib/                    # Utilities
│   │   │   ├── purchaser-context.tsx  # Client-side purchaser state
│   │   │   └── utils.ts            # Helpers (clsx, etc)
│   │   ├── globals.css             # Tailwind styles
│   │   └── routeTree.gen.ts        # Auto-generated (don't edit)
│   ├── vite.config.ts              # Vite + TanStack Router plugin
│   ├── index.html                  # HTML entry point
│   ├── package.json
│   └── tsconfig.json
│
├── tests/                          # E2E tests (Playwright)
│   └── api/
│       ├── health.spec.ts          # Health endpoint tests
│       ├── registry.spec.ts        # Registry lookup/subscribe tests
│       ├── gateway.spec.ts         # Search/select callback tests
│       └── polling.spec.ts         # Result polling tests
│
├── docs/                           # Documentation
│   ├── local-setup/                # Local development guides
│   ├── prds/                       # Product requirements
│   │   └── features/               # Feature documentation
│   └── tech-debt/                  # Known issues and TODOs
│
├── scripts/                        # Build/deployment scripts
├── public/                         # Client public assets
├── .env.example                    # Environment template
├── .env                            # Environment variables (gitignored)
├── package.json                    # Root workspace config
├── pnpm-workspace.yaml             # pnpm monorepo definition
├── tsconfig.json                   # Base TypeScript config
├── biome.json                      # Code formatting/linting config
├── playwright.config.ts            # E2E test configuration
├── CLAUDE.md                       # Project context (this repo)
└── README.md                       # User documentation
```

## Directory Purposes

**server/src/:**
- Purpose: Backend TypeScript source code
- Contains: Express app, tRPC routers, business logic, infrastructure
- Key files: `index.ts` (start), `app.ts` (Express setup), `trpc/index.ts` (router composition)

**server/src/entities/:**
- Purpose: Domain entities with business logic encapsulation
- Contains: Tenant entity with cryptographic operations
- Key files: `tenant.ts` (singleton with Ed25519 signing, AES-256 decryption)

**server/src/value-objects/:**
- Purpose: Type-safe identifiers to prevent ID mixing
- Contains: UUID (validates UUID regex), Id (generic), CaseInsensitiveId (base class)
- Prevents: Passing wrong ID type to function expecting another ID type

**server/src/trpc/:**
- Purpose: tRPC router definitions and request context
- Contains: Procedure definitions, context factory, router composition
- Entry point: `index.ts` exports `appRouter` and `AppRouter` type
- Routers: `health`, `registry`, `gateway`, `results`

**server/src/trpc/routers/:**
- Purpose: Domain-specific tRPC procedure implementations
- `health.ts`: Single `check` query returning status
- `registry.ts`: `lookup` query, `subscribe` mutation for ONDC registry
- `gateway.ts`: `search`, `onSearch`, `select`, `onSelect` for Beckn protocol
- `results.ts`: `getSearchResults`, `getSelectResults` queries for stored data

**server/src/routes/:**
- Purpose: Raw Express routes not using tRPC (special cases)
- `site-verification.ts`: GET /ondc-site-verification.html (serves HTML with signed token)
- `sse.ts`: Server-sent events for real-time result streaming
- `ondc-compat.ts`: Legacy REST routes for backward compatibility

**server/src/lib/ondc/:**
- Purpose: ONDC integration utilities
- `client.ts`: HTTPClient with automatic request signing, handles Authorization header
- `signing.ts`: Blake2b-512 digest calculation for request signing
- `payload.ts`: Request builders for search/select/init/confirm

**server/src/lib/:**
- Purpose: Shared business logic
- `search-store.ts`: Create/retrieve search transactions and results
- `select-store.ts`: Create/retrieve select transactions and results
- Uses: TenantKeyValueStore for Redis operations

**server/src/infra/key-value/redis/:**
- Purpose: Redis data persistence with tenant isolation
- `store.ts`: TenantKeyValueStore class with set/get/list/subscribe methods
- `connection-pool.ts`: Manages ioredis connections for commands and subscriptions
- `key-formatter.ts`: Prefixes all keys with tenant ID
- `types.ts`: TypeScript interfaces

**server/public/:**
- Purpose: Static assets served in production
- `openapi.json`: OpenAPI 3.1 spec for /api/reference endpoint
- `index.html`: SPA fallback for client routes

**client/src/routes/:**
- Purpose: File-based routing with TanStack Router
- Naming: `index.tsx` for index routes, `$param.tsx` for dynamic segments, `_layout.tsx` for layout-only
- Layout: `__root.tsx` wraps all routes with TRPCProvider and theme
- Structure: Domain-based (health, motor, quote, search-results)

**client/src/components/:**
- Purpose: React UI components organized by domain
- `ui/`: shadcn/ui primitives (Button, Card, Dialog, etc - auto-generated by shadcn CLI)
- `home/`: Homepage sections (Hero, CTA, HowItWorks, etc)
- `product/`: Insurance product display (ItemCard, ProviderCard)
- `search/`: Search result components
- `quote/`: Quote display and purchase flow
- `purchaser/`: Purchaser info input dialog

**client/src/lib/:**
- Purpose: Utilities and client-side state
- `purchaser-context.tsx`: React Context for purchaser information across routes
- `utils.ts`: Helper functions (clsx, cn, etc)

**client/src/trpc/:**
- Purpose: tRPC client setup and providers
- `client.ts`: createTRPCReact instance, httpBatchLink config
- `Provider.tsx`: TRPCProvider + QueryClientProvider wrapper

**tests/api/:**
- Purpose: End-to-end tests with Playwright
- `health.spec.ts`: Health check endpoint
- `registry.spec.ts`: Registry lookup and subscribe
- `gateway.spec.ts`: Search and select with callback handling
- `polling.spec.ts`: Result polling from Redis

## Key File Locations

**Entry Points:**
- `server/src/index.ts` - Start Express server, establish ngrok tunnel
- `client/src/main.tsx` - Initialize React, render router
- `server/src/app.ts` - Express middleware setup, route mounting

**Configuration:**
- `server/src/trpc/trpc.ts` - tRPC initialization with publicProcedure
- `server/src/trpc/context.ts` - Context factory (Tenant, ONDCClient, KeyValueStore)
- `client/src/trpc/client.ts` - tRPC React client with httpBatchLink
- `client/src/routes/__root.tsx` - Root layout with TRPCProvider

**Core Logic:**
- `server/src/entities/tenant.ts` - Cryptographic operations, key storage
- `server/src/lib/ondc/client.ts` - HTTP client with signing
- `server/src/infra/key-value/redis/store.ts` - Redis operations
- `server/src/lib/search-store.ts` - Search transaction lifecycle
- `server/src/lib/select-store.ts` - Select transaction lifecycle

**Testing:**
- `tests/api/` - All Playwright test files
- Run: `pnpm test:e2e -- tests/api/FILENAME.spec.ts --timeout=30000`

## Naming Conventions

**Files:**
- Lowercase with hyphens: `site-verification.ts`, `search-store.ts`
- React components: PascalCase: `HeroSection.tsx`, `ItemCard.tsx`
- Test files: `.spec.ts` or `.test.ts` suffix
- Auto-generated: `routeTree.gen.ts` (never edit)

**Directories:**
- Lowercase kebab-case: `key-value`, `value-objects`, `search-results`
- Feature groupings: `components/home/`, `components/product/`
- Layers: `entities/`, `infra/`, `lib/`, `routes/`

**Exports:**
- Default exports for single responsibility modules (e.g., `export const TenantKeyValueStore`)
- Named exports for utilities and hooks (e.g., `export function createSearchEntry()`)
- Types: `export type AppRouter = typeof appRouter`

**tRPC Routers:**
- File: `{feature}Router` (e.g., `healthRouter`, `registryRouter`)
- Procedures: camelCase with domain context (e.g., `search`, `onSearch`, `lookup`, `subscribe`)

**React Hooks:**
- Custom hooks: `useXxx` (e.g., `useParams()` from TanStack Router, `useQuery()` from tRPC)
- Providers: `XxxProvider` and `useXxx` context (e.g., `PurchaserProvider`, `usePurchaser()`)

## Where to Add New Code

**New Beckn API Procedure:**
1. Add procedure to appropriate router in `server/src/trpc/routers/`
2. If creating new router (e.g., `init.ts`):
   - Export const `initRouter = router({...})`
   - Add to `server/src/trpc/index.ts`: `init: initRouter`
3. Add Zod input/output validation
4. Write E2E test in `tests/api/`
5. Update `server/public/openapi.json` with new endpoint

**New React Route:**
1. Create file in `client/src/routes/` following naming conventions
2. Use `createFileRoute()` and export `Route`
3. Add route component that uses `trpc` hooks if needed
4. TanStack Router auto-regenerates `routeTree.gen.ts`

**New Component:**
1. Create in `client/src/components/{category}/`
2. Use shadcn/ui components from `client/src/components/ui/`
3. Style with Tailwind CSS utility classes
4. Export from component file

**New Utility:**
1. Shared server logic: `server/src/lib/`
2. Shared client logic: `client/src/lib/`
3. Domain-specific store logic: `server/src/lib/{domain}-store.ts`
4. Generic utilities: Extract to `lib/utils.ts`

**Database/Store Operations:**
1. Add method to `TenantKeyValueStore` in `server/src/infra/key-value/redis/store.ts`
2. Add domain-specific store function in `server/src/lib/{domain}-store.ts`
3. Call from tRPC routers via `ctx.kv`

## Special Directories

**server/public/:**
- Purpose: Static assets served in production only
- Generated: `openapi.json` must be manually updated when APIs change
- Committed: Yes (contains OpenAPI spec and SPA fallback HTML)

**client/src/routes/:**
- Purpose: File-based routing definitions
- Generated: `routeTree.gen.ts` auto-generated (don't edit)
- Committed: Yes (for route file definitions), No (for routeTree.gen.ts)

**node_modules/:**
- Purpose: Dependencies
- Generated: Yes (from pnpm install)
- Committed: No (in .gitignore)

**dist/, build/:**
- Purpose: Build outputs
- Generated: Yes (`pnpm build`)
- Committed: No (in .gitignore)

