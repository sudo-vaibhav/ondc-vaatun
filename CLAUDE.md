# CLAUDE.md - Codebase Context

> **📚 API Documentation**: This project uses Scalar for interactive OpenAPI docs at `/api/reference`.
> **⚠️ CRITICAL**: When modifying API routes, ALWAYS update `server/public/openapi.json`. See [API Documentation](#api-documentation) section below.

## Project Overview

**ondc-vaatun** is a monorepo application that provides integration endpoints for the Open Network for Digital Commerce (ONDC) platform. It handles the cryptographic operations required for ONDC network subscription and verification.

**Repository**: ondc-vaatun
**Version**: 0.1.0
**Primary Language**: TypeScript
**Architecture**: Express + tRPC backend, Vite + React + TanStack Router frontend

## Purpose

This service acts as a backend integration layer for ONDC network participation. It provides:

1. **Subscription Verification**: Handles ONDC's challenge-response mechanism to verify network subscription
2. **Domain Verification**: Serves a signed verification page to prove domain ownership
3. **Health Monitoring**: Provides health check endpoints for service monitoring
4. **Beckn Protocol Integration**: Complete implementation of search, select, init, confirm transaction flows
5. **Registry Operations**: Lookup and subscribe to ONDC network participants
6. **Interactive API Documentation**: Scalar-powered OpenAPI documentation at `/api/reference`

## What is ONDC?

ONDC (Open Network for Digital Commerce) is a Government of India initiative to democratize e-commerce by creating an open, interoperable network. It allows buyers and sellers to transact across different platforms without being locked into a single marketplace.

## Tech Stack

### Monorepo Structure

- **pnpm workspaces** - Monorepo package management
- **concurrently** - Parallel dev server execution

### Server (Express + tRPC)

- **Express** 5.x - HTTP server framework
- **tRPC** 11.x - End-to-end typesafe APIs
- **Zod** 4.x - Schema validation
- **ioredis** 5.x - Redis client for Node.js
- **libsodium-wrappers** 0.7.15 - Cryptographic signing operations
- **Node.js** 18+ - JavaScript runtime

### Client (Vite + React)

- **Vite** 6.x - Frontend build tool
- **React** 19.x - UI library
- **TanStack Router** 1.x - File-based routing with full type safety
- **TanStack Query** 5.x - Data fetching and caching
- **@trpc/react-query** 11.x - tRPC React bindings

### UI & Styling

- **shadcn/ui** - Component library built on Radix UI primitives
- **Tailwind CSS** 4.x - Utility-first CSS framework
- **class-variance-authority** 0.7.x - CVA for component variants
- **tailwind-merge** 3.x - Merge Tailwind classes without conflicts
- **clsx** 2.x - Utility for constructing className strings
- **lucide-react** 0.562.x - Icon library
- **motion** 12.x - Animation library
- **Spline** - 3D graphics

### Documentation

- **@scalar/express-api-reference** - Interactive OpenAPI documentation
- **OpenAPI** 3.1.0 - API specification standard

### Development Tools

- **Biome** 2.x - Code formatting and linting
- **tsx** 4.x - TypeScript execution for Node.js
- **Playwright** - E2E testing

## Architecture

### Directory Structure

```
ondc-vaatun/
├── package.json                    # Root workspace configuration
├── pnpm-workspace.yaml             # pnpm workspace definition
├── tsconfig.json                   # Base TypeScript config with references
├── biome.json                      # Biome config
├── playwright.config.ts            # E2E test configuration
├── server/
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts                # Entry point (port 4822)
│       ├── app.ts                  # Express app with middleware
│       ├── trpc/
│       │   ├── trpc.ts             # tRPC initialization
│       │   ├── context.ts          # Request context
│       │   ├── index.ts            # App router composition
│       │   └── routers/
│       │       ├── registry.ts     # lookup, subscribe, on_subscribe
│       │       ├── gateway.ts      # search, on_search, select, on_select
│       │       ├── health.ts       # health check
│       │       └── results.ts      # search-results, select-results
│       ├── routes/
│       │   ├── site-verification.ts  # GET /ondc-site-verification.html
│       │   └── sse.ts                # SSE streaming endpoints
│       ├── infra/
│       │   └── key-value/
│       │       └── redis/          # Redis store implementation
│       ├── entities/
│       │   └── tenant.ts           # Tenant with crypto operations
│       └── lib/
│           ├── ondc/
│           │   ├── client.ts       # ONDC API client with signing
│           │   └── signing.ts      # Request signing utilities
│           ├── search-store.ts     # Search results store
│           ├── select-store.ts     # Select results store
│           └── context.ts          # AsyncLocalStorage context
├── client/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts              # Vite config with TanStack Router plugin
│   ├── index.html
│   └── src/
│       ├── main.tsx                # React entry point
│       ├── globals.css             # Tailwind styles
│       ├── routeTree.gen.ts        # Auto-generated route tree
│       ├── routes/
│       │   ├── __root.tsx          # Root layout with providers
│       │   ├── index.tsx           # Home page (/)
│       │   ├── directory/
│       │   │   └── index.tsx       # /directory
│       │   ├── health/
│       │   │   └── $searchId.tsx   # /health/:searchId
│       │   ├── motor/
│       │   │   └── $searchId.tsx   # /motor/:searchId
│       │   ├── quote/
│       │   │   └── $transactionId/
│       │   │       └── $messageId.tsx  # /quote/:transactionId/:messageId
│       │   ├── search-results/
│       │   │   └── $transactionId.tsx  # /search-results/:transactionId
│       │   └── search-results-streamed/
│       │       └── $transactionId.tsx  # /search-results-streamed/:transactionId
│       ├── trpc/
│       │   ├── client.ts           # tRPC client with httpBatchLink
│       │   └── Provider.tsx        # TRPCProvider + QueryClientProvider
│       ├── components/
│       │   ├── ui/                 # shadcn/ui components
│       │   ├── home/               # Home page sections
│       │   ├── product/            # Product cards
│       │   ├── purchaser/          # Purchaser forms
│       │   ├── quote/              # Quote display
│       │   └── search/             # Search results
│       └── lib/
│           ├── utils.ts            # Utility functions
│           └── purchaser-context.tsx  # Client-side context
├── tests/
│   └── api/                        # E2E API tests (Playwright)
│       ├── health.spec.ts
│       ├── registry.spec.ts
│       ├── gateway.spec.ts
│       └── polling.spec.ts
├── .env                            # Environment variables (gitignored)
├── .env.example                    # Environment template
├── CLAUDE.md                       # Codebase context (this file)
└── README.md                       # User documentation
```

### tRPC Router Structure

```typescript
// server/src/trpc/index.ts
export const appRouter = router({
  health: healthRouter,      // health.check
  registry: registryRouter,  // lookup, subscribe, onSubscribe
  gateway: gatewayRouter,    // search, onSearch, select, onSelect
  results: resultsRouter,    // getSearchResults, getSelectResults
});

export type AppRouter = typeof appRouter;
```

### API Route Mapping

| Old Next.js Route | tRPC Procedure | Type |
|-------------------|----------------|------|
| POST /api/ondc/health | health.check | query |
| POST /api/ondc/lookup | registry.lookup | mutation |
| POST /api/ondc/subscribe | registry.subscribe | mutation |
| POST /api/ondc/on_subscribe | registry.onSubscribe | mutation |
| POST /api/ondc/search | gateway.search | mutation |
| POST /api/ondc/on_search | gateway.onSearch | mutation |
| GET /api/ondc/search-results | results.getSearchResults | query |
| POST /api/ondc/select | gateway.select | mutation |
| POST /api/ondc/on_select | gateway.onSelect | mutation |
| GET /api/ondc/select-results | results.getSelectResults | query |

**Non-tRPC Routes** (raw Express):
- `GET /ondc-site-verification.html` - Domain verification (HTML response)
- `GET /api/ondc/search-stream/:transactionId` - SSE streaming

### TanStack Router File Conventions

```
routes/
├── __root.tsx              # Root layout, wraps all routes
├── index.tsx               # Index route (/)
├── $param.tsx              # Dynamic segment (/users/$userId)
├── _layout.tsx             # Layout route (non-URL segment)
└── directory/
    └── index.tsx           # Nested index (/directory)
```

**Route Parameters**: Use `$` prefix for dynamic segments (e.g., `$searchId.tsx`)

**Route Loaders**: Prefetch data before rendering
```typescript
export const Route = createFileRoute('/health/$searchId')({
  component: HealthSearchPage,
  loader: async ({ params }) => {
    return { searchId: params.searchId };
  },
});
```

### Key Components

#### 1. Cryptographic Utilities (`server/src/lib/ondc/signing.ts`)

**Purpose**: Handles all cryptographic operations for ONDC integration

**Key Functions**:
- `decryptAES256ECB()` - Decrypts ONDC challenges using AES-256-ECB
- `signMessage()` - Signs messages using Ed25519 (libsodium)
- Manages Diffie-Hellman key exchange for shared secret derivation

**Environment Variables**:
- `ENCRYPTION_PRIVATE_KEY` - X25519 private key (base64, DER format)
- `ONDC_PUBLIC_KEY` - ONDC's public key (base64, DER format)
- `STATIC_SUBSCRIBE_REQUEST_ID` - Unique identifier for site verification
- `SIGNING_PRIVATE_KEY` - Ed25519 private key for signing (base64)

#### 2. tRPC Context (`server/src/trpc/context.ts`)

**Purpose**: Provides request-scoped context for tRPC procedures

```typescript
export const createContext = ({ req, res }: CreateExpressContextOptions) => {
  return {
    req,
    res,
    tenant: getCurrentTenant(),
    searchStore: getSearchStore(),
    selectStore: getSelectStore(),
  };
};
```

#### 3. tRPC Client (`client/src/trpc/client.ts`)

**Purpose**: Type-safe API client for the frontend

```typescript
import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from 'server/src/trpc';

export const trpc = createTRPCReact<AppRouter>();
```

## Cryptographic Details

### Key Exchange Protocol

1. **Diffie-Hellman Key Exchange**:
   - Client generates X25519 key pair
   - ONDC provides their public key
   - Shared secret = DH(client_private, ondc_public)

2. **Challenge Encryption**:
   - Algorithm: AES-256-ECB
   - Key: Shared secret from DH exchange
   - ONDC encrypts random challenge
   - Client decrypts to prove key possession

3. **Message Signing**:
   - Algorithm: Ed25519 (via libsodium)
   - Used for signing STATIC_SUBSCRIBE_REQUEST_ID for domain verification

### Security Considerations

- Private keys stored in environment variables (never committed)
- Shared secret pre-computed at startup (not recalculated per request)
- No IV used with ECB mode (ONDC protocol requirement)
- Separate staging and production keys required

## Environment Configuration

```env
# ONDC Cryptographic Keys
ENCRYPTION_PRIVATE_KEY=<base64_x25519_private_key>
ONDC_PUBLIC_KEY=<base64_ondc_public_key>
STATIC_SUBSCRIBE_REQUEST_ID=<uuid_for_verification>
SIGNING_PRIVATE_KEY=<base64_ed25519_private_key>

# Redis
REDIS_URL=redis://localhost:6379

# Server
PORT=4822
NODE_ENV=development
```

All keys must be base64-encoded in DER format.

## Development Workflow

### Runtime

This project uses **Node.js** as the JavaScript runtime with **pnpm** for package management.

### Local Development

```bash
pnpm install              # Install all workspace dependencies
cp .env.example .env      # Create environment file
# Add actual keys to .env
pnpm dev                  # Start both server (4822) and client (4823)
```

**Individual workspace commands**:
```bash
pnpm dev:server           # Start server only
pnpm dev:client           # Start client only
```

### Code Quality

```bash
pnpm lint                 # Run Biome linter
pnpm format               # Format code with Biome
pnpm check                # Run all checks
```

### Testing

**IMPORTANT**:
1. Run only the specific test file you changed, NOT the entire test suite
2. Always use timeouts to prevent hanging tests
3. Tests require dev servers running

```bash
# Run a specific test file with timeout (PREFERRED)
pnpm test:e2e -- tests/api/health.spec.ts --timeout=30000

# Run a specific test by line number
pnpm test:e2e -- tests/api/registry.spec.ts:28 --timeout=30000

# Run tests matching a pattern
pnpm test:e2e -- --grep "health" --timeout=30000

# Run with headed browser for debugging
pnpm test:e2e:headed -- tests/api/health.spec.ts --timeout=60000
```

**Available test commands**:
- `pnpm test:e2e` - Run playwright tests (headless)
- `pnpm test:e2e:headed` - Run with visible browser
- `pnpm test:e2e:ui` - Run with Playwright UI
- `pnpm test:e2e:report` - Show HTML report

**NEVER run full test suite** unless explicitly requested. Always target specific files.

**Gateway Error Handling in Tests**:

IMPORTANT: Never use `test.skip()` to skip tests when external gateways (ONDC registry, BPPs) return errors like 500, 502, or 503. Gateway errors are valid responses in our use case and tests should handle them properly.

```typescript
// BAD - Don't do this
if (response.status() !== 200) {
  test.skip();
  return;
}

// GOOD - Accept gateway errors as valid responses
expect([200, 502, 503]).toContain(response.status());
```

### Production Build

```bash
pnpm build                # Build client and server
pnpm start                # Start production server (serves client from server/public)
```

## Deployment

### Current Deployment

- **Platform**: Any Node.js 18+ host
- **Server Port**: 4822
- **Staging Subscriber ID**: `ondc-staging.vaatun.com`
- **Seeding Request ID**: `019aa6d1-8906-704b-9929-64be78bb83cc`

### Requirements

- Node.js 18+
- Redis instance
- HTTPS endpoint (ONDC requirement)
- Environment variable support
- Always-on availability for ONDC callbacks

## API Testing

### Health Check

```bash
curl http://localhost:4822/api/ondc/health
```

### Site Verification

```bash
curl http://localhost:4822/ondc-site-verification.html
```

### tRPC Endpoints

```bash
# Using tRPC batch format
curl -X POST http://localhost:4822/api/trpc/registry.lookup \
  -H "Content-Type: application/json" \
  -d '{"json": {"subscriber_id": "test"}}'
```

## Important Notes for Development

1. **Never commit `.env`** - Contains sensitive private keys
2. **Key rotation** - Periodically rotate keys for security
3. **Environment separation** - Use different keys for staging/production
4. **HTTPS required** - ONDC only accepts HTTPS endpoints
5. **Challenge uniqueness** - Each ONDC challenge is unique and single-use
6. **Error logging** - All errors logged to console for debugging
7. **Performance** - Shared secret pre-computed for fast response times
8. **Update OpenAPI docs** - ALWAYS update `server/public/openapi.json` when modifying API routes
9. **Type sharing** - Import `AppRouter` type from server in client for type safety

## Zod Schema Conventions

When defining Zod schemas for tRPC procedures:

- **Request schemas**: Use `z.object()` for strict validation of outgoing requests
- **Response schemas**: Use `z.looseObject()` to allow additional fields from external APIs

```typescript
// Request - strict validation (what we send)
const LookupRequestSchema = z.object({
  subscriber_id: z.string().optional(),
  type: z.enum(["bap", "bpp", "bg"]).optional(),
});

// Response - loose validation (what we receive)
const SubscriberSchema = z.looseObject({
  subscriber_id: z.string(),
  signing_public_key: z.string(),
  // ... additional fields will pass through
});
```

## API Documentation

### OpenAPI Specification

This project includes comprehensive OpenAPI documentation powered by Scalar:

- **Interactive Documentation**: Available at `/api/reference`
- **OpenAPI Spec**: Located at `server/public/openapi.json`
- **Technology**: Uses `@scalar/express-api-reference` package

### Keeping OpenAPI Documentation in Sync

**CRITICAL**: Whenever you modify a tRPC procedure or Express route, you MUST update the OpenAPI specification to keep the documentation accurate.

#### When to Update OpenAPI Docs

Update `server/public/openapi.json` when:

1. **Adding a new tRPC procedure** - Add the route path under `paths`
2. **Modifying an existing procedure** - Update request/response schemas
3. **Changing request/response structures** - Update schema definitions
4. **Adding or changing error responses** - Document error formats

#### Testing Documentation Changes

```bash
# 1. Start dev server
pnpm dev

# 2. Visit the API docs
open http://localhost:4822/api/reference

# 3. Verify endpoints appear correctly
```

## Common Tasks

### Adding shadcn/ui Components

```bash
# Run from client directory
cd client
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add dialog card
```

Components are added to `client/src/components/ui/`

### Adding New tRPC Procedures

1. Create or update router in `server/src/trpc/routers/`
2. Add procedure to the router
3. Export from `server/src/trpc/index.ts`
4. Update `server/public/openapi.json`
5. Add E2E tests in `tests/api/`

### Adding New Routes (TanStack Router)

1. Create route file in `client/src/routes/` following naming conventions
2. TanStack Router plugin auto-generates `routeTree.gen.ts`
3. Use `createFileRoute` for route definition
4. Import and use `trpc` hooks for data fetching

```typescript
// client/src/routes/example/$id.tsx
import { createFileRoute } from '@tanstack/react-router';
import { trpc } from '@/trpc/client';

export const Route = createFileRoute('/example/$id')({
  component: ExamplePage,
});

function ExamplePage() {
  const { id } = Route.useParams();
  const { data } = trpc.example.getById.useQuery({ id });
  return <div>{data?.name}</div>;
}
```

### E2E Testing Requirements

**IMPORTANT**: When implementing new API routes, ALWAYS add corresponding E2E tests in the `tests/api/` folder.

#### Test File Organization

```
tests/api/
├── health.spec.ts      # Basic health/status endpoints
├── registry.spec.ts    # ONDC registry operations (lookup, subscribe)
├── gateway.spec.ts     # Gateway operations (search, select, init, confirm)
└── polling.spec.ts     # Callback polling and SSE flows
```

#### Test Checklist for New Endpoints

- [ ] E2E test file created or updated in `tests/api/`
- [ ] Tests cover success cases (200 responses)
- [ ] Tests cover error cases (400, 500 responses)
- [ ] For callback routes: tests verify storage in memory store
- [ ] For polling routes: tests verify data retrieval

### Environment Changes

1. Update `.env.example` with new variables
2. Document in README.md environment table

## Resources

- [ONDC Official Website](https://ondc.org/)
- [ONDC Documentation](https://github.com/ONDC-Official)
- [ONDC Developer Guide](https://github.com/ONDC-Official/developer-docs)
- [tRPC Documentation](https://trpc.io/docs)
- [TanStack Router Documentation](https://tanstack.com/router/latest)
- [Vite Documentation](https://vite.dev/)
- [libsodium Documentation](https://doc.libsodium.org/)

## Accessing ONDC FIS Specifications via GitHub API

The ONDC FIS (Financial Services) specifications are hosted on GitHub. The interactive documentation site at `ondc-official.github.io` is JavaScript-heavy and difficult to scrape. Use the GitHub API directly to pull specs.

### Repository and Branches

- **Repository**: `ONDC-Official/ONDC-FIS-Specifications`
- **Health Insurance Branch**: `draft-FIS13-health-2.0.1`
- **Motor Insurance Branch**: `draft-FIS13-motor-2.0.1`
- **Marine Insurance Branch**: `draft-FIS13-marine-2.0.1`

### Key Commands

**List available branches:**
```bash
gh api repos/ONDC-Official/ONDC-FIS-Specifications/branches --jq '.[].name' | grep -i "FIS13"
```

**Fetch OpenAPI spec (full schema):**
```bash
gh api "repos/ONDC-Official/ONDC-FIS-Specifications/contents/api/build/build.yaml?ref=draft-FIS13-health-2.0.1" --jq '.content' | base64 -d
```

**List example payloads:**
```bash
gh api "repos/ONDC-Official/ONDC-FIS-Specifications/contents/api/components/examples/health-insurance?ref=draft-FIS13-health-2.0.1" --jq '.[].name'
```

**Fetch specific example (e.g., search request):**
```bash
gh api "repos/ONDC-Official/ONDC-FIS-Specifications/contents/api/components/examples/health-insurance/search/search-request.yaml?ref=draft-FIS13-health-2.0.1" --jq '.content' | base64 -d
```

**Fetch callback example (e.g., on_search response):**
```bash
gh api "repos/ONDC-Official/ONDC-FIS-Specifications/contents/api/components/examples/health-insurance/on_search?ref=draft-FIS13-health-2.0.1" --jq '.[].name'
```

### Directory Structure in Spec Repo

```
api/
├── build/
│   └── build.yaml              # Full OpenAPI spec
└── components/
    ├── examples/
    │   └── health-insurance/
    │       ├── search/         # search-request.yaml
    │       ├── on_search/      # on_search response examples
    │       ├── select/         # select-request.yaml
    │       ├── on_select/      # on_select response examples
    │       ├── init/           # init-request.yaml
    │       ├── on_init/        # on_init response examples
    │       ├── confirm/        # confirm-request.yaml
    │       ├── on_confirm/     # on_confirm response examples
    │       ├── status/         # status-request.yaml
    │       └── on_status/      # on_status response examples
    ├── flows/
    │   └── health-insurance/   # Flow diagrams and sequences
    └── attributes/             # Field-level documentation
```

### When to Use

- **Implementing new endpoints**: Fetch the example request/response for that endpoint
- **Debugging payload issues**: Compare your payload against official examples
- **Understanding field requirements**: Check the OpenAPI spec schemas
- **Protocol updates**: Check if branch has new versions (e.g., `2.0.2`)

### Domain Codes

| Domain | Code | Spec Branch Prefix |
|--------|------|-------------------|
| Health Insurance | ONDC:FIS13 | draft-FIS13-health |
| Motor Insurance | ONDC:FIS13 | draft-FIS13-motor |
| Marine Insurance | ONDC:FIS13 | draft-FIS13-marine |
| Life Insurance | ONDC:FIS13 | draft-FIS13-life |

## Troubleshooting

### Common Issues

1. **Missing environment variables**
   - Error: "Missing required environment variable: X"
   - Solution: Ensure all variables in `.env`

2. **Decryption failures**
   - Check shared secret calculation
   - Verify ONDC_PUBLIC_KEY matches environment
   - Ensure ENCRYPTION_PRIVATE_KEY is correct

3. **Signature verification failures**
   - Verify SIGNING_PRIVATE_KEY format
   - Check STATIC_SUBSCRIBE_REQUEST_ID matches ONDC registration

4. **tRPC client errors**
   - Verify server is running on port 4822
   - Check CORS configuration in `server/src/app.ts`
   - Ensure `AppRouter` type is correctly imported

5. **TanStack Router issues**
   - Run `pnpm dev:client` to regenerate route tree
   - Check route file naming follows conventions
   - Verify `vite.config.ts` has router plugin configured

6. **Redis connection errors**
   - Verify Redis is running
   - Check `REDIS_URL` environment variable
   - Test connection with `redis-cli ping`
