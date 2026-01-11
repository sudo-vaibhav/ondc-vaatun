# CLAUDE.md - Codebase Context

> **📚 API Documentation**: This project uses Scalar for interactive OpenAPI docs at `/api/reference`.
> **⚠️ CRITICAL**: When modifying API routes, ALWAYS update `/public/openapi.json`. See [API Documentation](#api-documentation) section below.

## Project Overview

**ondc-vaatun** is a Next.js application that provides integration endpoints for the Open Network for Digital Commerce (ONDC) platform. It handles the cryptographic operations required for ONDC network subscription and verification.

**Repository**: ondc-vaatun
**Version**: 0.1.0
**Primary Language**: TypeScript
**Framework**: Next.js 16.0.3 with App Router

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

### Core Dependencies

- **Next.js** 16.0.3 - React framework with App Router
- **React** 19.2.0 - UI library
- **TypeScript** 5.x - Type safety
- **libsodium-wrappers** 0.7.15 - Cryptographic signing operations

### UI & Styling

- **shadcn/ui** - Component library built on Radix UI primitives
- **Tailwind CSS** 4.x - Utility-first CSS framework
- **class-variance-authority** 0.7.1 - CVA for component variants
- **tailwind-merge** 3.4.0 - Merge Tailwind classes without conflicts
- **clsx** 2.1.1 - Utility for constructing className strings
- **lucide-react** 0.554.0 - Icon library
- **tw-animate-css** 1.4.0 - Animation utilities

### Documentation

- **@scalar/nextjs-api-reference** 0.9.7 - Interactive OpenAPI documentation
- **OpenAPI** 3.1.0 - API specification standard

### Development Tools

- **Biome** 2.2.0 - Code formatting and linting
- **Babel React Compiler** 1.0.0 - React optimization

### Node.js Built-ins

- **crypto** - AES-256-ECB decryption and Diffie-Hellman key exchange
- **async_hooks** - AsyncLocalStorage for request context

## Architecture

### Directory Structure

```
ondc-vaatun/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/
│   │   │   ├── ondc/
│   │   │   │   ├── on_subscribe/
│   │   │   │   │   └── route.ts     # POST /api/ondc/on_subscribe
│   │   │   │   ├── subscribe/
│   │   │   │   │   └── route.ts     # POST /api/ondc/subscribe
│   │   │   │   ├── lookup/
│   │   │   │   │   └── route.ts     # POST /api/ondc/lookup
│   │   │   │   ├── search/
│   │   │   │   │   └── route.ts     # POST /api/ondc/search
│   │   │   │   ├── on_search/
│   │   │   │   │   └── route.ts     # POST /api/ondc/on_search
│   │   │   │   ├── search-results/
│   │   │   │   │   └── route.ts     # GET /api/ondc/search-results
│   │   │   │   ├── select/
│   │   │   │   │   └── route.ts     # POST /api/ondc/select
│   │   │   │   ├── on_select/
│   │   │   │   │   └── route.ts     # POST /api/ondc/on_select
│   │   │   │   ├── select-results/
│   │   │   │   │   └── route.ts     # GET /api/ondc/select-results
│   │   │   │   └── health/
│   │   │   │       └── route.ts     # GET /api/ondc/health
│   │   │   └── reference/
│   │   │       └── route.ts         # GET /api/reference (OpenAPI docs)
│   │   ├── ondc-site-verification.html/
│   │   │   └── route.ts             # GET /ondc-site-verification.html
│   │   ├── layout.tsx               # Root layout
│   │   └── page.tsx                 # Home page
│   └── lib/
│       ├── ondc/
│       │   ├── client.ts            # ONDC API client
│       │   └── signing.ts           # Request signing utilities
│       ├── context.ts               # Request context management
│       ├── search-store.ts          # Search results store
│       └── select-store.ts          # Quote results store
├── tests/
│   └── api/                         # E2E API tests (Playwright)
│       ├── health.spec.ts           # Health endpoint tests
│       ├── registry.spec.ts         # Registry lookup/subscribe tests
│       ├── gateway.spec.ts          # Gateway search/select tests
│       └── polling.spec.ts          # Callback polling flow tests
├── public/
│   └── openapi.json                 # OpenAPI 3.1 specification
├── .env                             # Environment variables (gitignored)
├── .env.example                     # Environment template
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
├── biome.json                       # Biome config
├── CLAUDE.md                        # Codebase context (this file)
└── README.md                        # User documentation
```

### Key Components

#### 1. Cryptographic Utilities (`src/lib/ondc-utils.ts`)

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

**Implementation Details**:

- Pre-computes shared secret on module load for performance
- Uses Node.js `crypto` module for Diffie-Hellman and AES operations
- Uses `libsodium-wrappers` for Ed25519 signatures

#### 2. Subscription Endpoint (`src/app/api/ondc/on_subscribe/route.ts`)

**Route**: `POST /api/ondc/on_subscribe`

**Purpose**: Handles ONDC subscription challenge-response verification

**Flow**:

1. Receives encrypted challenge from ONDC
2. Decrypts using shared secret (Diffie-Hellman derived)
3. Returns plaintext answer

**Request Schema**:

```json
{
  "subscriber_id": "ondc-staging.vaatun.com",
  "challenge": "base64_encrypted_string"
}
```

**Response Schema**:

```json
{
  "answer": "decrypted_plaintext"
}
```

**Error Handling**:

- 400: Missing challenge
- 500: Decryption or processing errors

#### 3. Site Verification Endpoint (`src/app/ondc-site-verification.html/route.ts`)

**Route**: `GET /ondc-site-verification.html`

**Purpose**: Serves HTML page with signed meta tag for domain verification

**Response**: HTML with signed STATIC_SUBSCRIBE_REQUEST_ID in meta tag

#### 4. Health Check Endpoint (`src/app/api/ondc/health/route.ts`)

**Route**: `GET /api/ondc/health`

**Purpose**: Service health monitoring

**Response**:

```json
{
  "status": "Health OK!!"
}
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

The application requires four environment variables:

```env
ENCRYPTION_PRIVATE_KEY=<base64_x25519_private_key>
ONDC_PUBLIC_KEY=<base64_ondc_public_key>
STATIC_SUBSCRIBE_REQUEST_ID=<uuid_for_verification>
SIGNING_PRIVATE_KEY=<base64_ed25519_private_key>
```

All keys must be base64-encoded in DER format.

## ONDC Integration Flow

### Subscription Process

1. Developer configures environment with ONDC credentials
2. Developer deploys service to public HTTPS endpoint
3. Developer submits subscriber details to ONDC registry
4. ONDC calls `/api/ondc/on_subscribe` with encrypted challenge
5. Service decrypts and returns answer
6. ONDC verifies answer matches original challenge
7. Subscription activated

### Domain Verification

1. ONDC requests verification page: `GET /ondc-site-verification.html`
2. Service returns HTML with signed STATIC_SUBSCRIBE_REQUEST_ID
3. ONDC verifies signature using service's public key
4. Domain ownership confirmed

## Development Workflow

### Runtime

This project uses **Bun** as the JavaScript runtime. Bun is typically installed at `~/.bun/bin/bun`.

```bash
# Run scripts with bun
~/.bun/bin/bun run dev           # Start dev server
~/.bun/bin/bun run lint          # Run Biome linter
~/.bun/bin/bun run biome check src/  # Check specific files

# Or add to PATH in your shell profile:
# export PATH="$HOME/.bun/bin:$PATH"
```

### Local Development

```bash
bun install              # Install dependencies (or pnpm install)
cp .env.example .env     # Create environment file
# Add actual keys to .env
bun run dev              # Start dev server on :3000
```

### Code Quality

```bash
bun run lint             # Run Biome linter
bun run format           # Format code with Biome
```

### Testing

**IMPORTANT**: Run only the specific test file you changed, not the entire test suite.

```bash
# Run a specific test file
pnpm test:e2e:chromium -- tests/api/registry.spec.ts

# Run a specific test by line number
pnpm test:e2e:chromium -- tests/api/registry.spec.ts:28

# Run tests matching a pattern
pnpm test:e2e:chromium -- --grep "subscribe"
```

**When to run full test suite**:
- Major refactors affecting multiple files
- New feature additions that touch shared code
- Before creating a PR
- When explicitly requested

**When to run specific tests**:
- Fixing a single test
- Modifying a single endpoint
- Quick iteration during development

**Gateway Error Handling in Tests**:

IMPORTANT: Never use `test.skip()` to skip tests when external gateways (ONDC registry, BPPs) return errors like 500, 502, or 503. Gateway errors are valid responses in our use case and tests should handle them properly.

Instead of skipping:
```typescript
// BAD - Don't do this
if (response.status() !== 200) {
  test.skip();
  return;
}

// GOOD - Accept gateway errors as valid responses
expect([200, 502, 503]).toContain(response.status());

const data = await response.json();
// The API should still return tracking IDs even on gateway errors
expect(data).toHaveProperty("transactionId");
expect(data).toHaveProperty("messageId");
```

Why this matters:
- Gateway errors (502, 503) indicate external service issues, not bugs in our code
- Our API should handle these gracefully and still return tracking IDs
- Skipping tests hides potential issues and gives false confidence
- Tests should verify correct behavior regardless of external service availability

### Production Build

```bash
npm run build            # Build for production
npm start                # Start production server
```

## Deployment

### Current Deployment

- **Platform**: Likely Vercel (Next.js optimized)
- **Staging Subscriber ID**: `ondc-staging.vaatun.com`
- **Seeding Request ID**: `019aa6d1-8906-704b-9929-64be78bb83cc`

### Requirements

- Node.js 18+
- HTTPS endpoint (ONDC requirement)
- Environment variable support
- Always-on availability for ONDC callbacks

### Deployment Platforms

- Vercel (recommended for Next.js)
- Any platform supporting Node.js 18+ and HTTPS

## API Testing

### Health Check

```bash
curl http://localhost:3000/api/ondc/health
```

### Site Verification

```bash
curl http://localhost:3000/ondc-site-verification.html
```

### Subscription (requires valid encrypted challenge)

```bash
curl -X POST http://localhost:3000/api/ondc/on_subscribe \
  -H "Content-Type: application/json" \
  -d '{"subscriber_id": "test", "challenge": "base64_encrypted"}'
```

## Important Notes for Development

1. **Never commit `.env`** - Contains sensitive private keys
2. **Key rotation** - Periodically rotate keys for security
3. **Environment separation** - Use different keys for staging/production
4. **HTTPS required** - ONDC only accepts HTTPS endpoints
5. **Challenge uniqueness** - Each ONDC challenge is unique and single-use
6. **Error logging** - All errors logged to console for debugging
7. **Performance** - Shared secret pre-computed for fast response times
8. **Update OpenAPI docs** - ALWAYS update `/public/openapi.json` when modifying API routes (see [API Documentation](#api-documentation) section)

## Zod Schema Conventions

When defining Zod schemas for API routes:

- **Request schemas**: Use `z.object()` for strict validation of outgoing requests
- **Response schemas**: Use `z.looseObject()` to allow additional fields from external APIs

This is important because we're exploring and learning the ONDC/Beckn APIs. Using `looseObject` for responses ensures we see all fields returned by the registry/gateway, including undocumented ones.

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
- **OpenAPI Spec**: Located at `/public/openapi.json`
- **Technology**: Uses `@scalar/nextjs-api-reference` package

### Keeping OpenAPI Documentation in Sync

**CRITICAL**: Whenever you modify an API route, you MUST update the OpenAPI specification to keep the documentation accurate.

#### When to Update OpenAPI Docs

Update `/public/openapi.json` when:

1. **Adding a new API endpoint**
   - Add the route path under `paths`
   - Define request/response schemas
   - Include examples and descriptions
   - Add appropriate tags

2. **Modifying an existing endpoint**
   - Update request body schemas
   - Update response schemas
   - Modify parameters or query strings
   - Update descriptions to reflect changes

3. **Changing request/response structures**
   - Update schema definitions in `components.schemas`
   - Update examples to match new structure
   - Document any new fields or breaking changes

4. **Adding or changing error responses**
   - Add new error status codes
   - Document error response formats
   - Include error examples

#### How to Update OpenAPI Docs

**Step 1**: Read the current OpenAPI spec
```bash
# Review the existing structure
cat /public/openapi.json
```

**Step 2**: Identify the changes needed
- Find the path in `paths` object (e.g., `/api/ondc/search`)
- Locate related schemas in `components.schemas`
- Check examples match actual behavior

**Step 3**: Update the specification
- Modify request/response schemas to match code changes
- Update descriptions and examples
- Ensure schema references (`$ref`) are correct
- Validate JSON syntax

**Step 4**: Test the documentation
- Visit `/api/reference` in the browser
- Verify the endpoint appears correctly
- Test "Try it out" functionality if applicable
- Check that examples are accurate

#### Example: Adding a New Endpoint

When adding a new route like `/api/ondc/init`:

```json
{
  "paths": {
    "/api/ondc/init": {
      "post": {
        "summary": "Initialize Order",
        "description": "Initialize an order with customer details and selected item",
        "tags": ["Beckn Protocol"],
        "operationId": "init",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/InitRequest"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Init request accepted",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/AckResponse"
                }
              }
            }
          }
        }
      }
    }
  },
  "components": {
    "schemas": {
      "InitRequest": {
        "type": "object",
        "required": ["transactionId", "messageId"],
        "properties": {
          "transactionId": {
            "type": "string",
            "format": "uuid"
          },
          "messageId": {
            "type": "string",
            "format": "uuid"
          }
        }
      }
    }
  }
}
```

#### Validation Checklist

Before committing changes to routes, verify:

- [ ] OpenAPI spec updated for all endpoint changes
- [ ] Request/response schemas match actual code
- [ ] Examples are accurate and complete
- [ ] All required fields are marked as `required: true`
- [ ] Status codes match actual responses
- [ ] Error responses are documented
- [ ] Tags are appropriate and consistent
- [ ] Descriptions are clear and helpful
- [ ] JSON syntax is valid (no trailing commas, etc.)
- [ ] **E2E tests added/updated** in `tests/api/` (see [E2E Testing Requirements](#e2e-testing-requirements))

#### Testing Documentation Changes

```bash
# 1. Start dev server
pnpm dev

# 2. Visit the API docs
open http://localhost:3000/api/reference

# 3. Verify your endpoint appears
# 4. Check request/response examples
# 5. Test "Try it out" if applicable
```

### Documentation Tools

**Scalar Features**:
- Interactive API explorer with "Try it out" functionality
- Dark mode support
- Searchable endpoints
- Auto-generated request examples
- Schema validation display

**OpenAPI Resources**:
- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)
- [Scalar Documentation](https://github.com/scalar/scalar)

## Common Tasks

### Adding shadcn/ui Components

Add new components from the shadcn/ui library:

```bash
# Add a single component
pnpm dlx shadcn@latest add button

# Add multiple components
pnpm dlx shadcn@latest add accordion card dialog

# Examples of popular components
pnpm dlx shadcn@latest add button input label
pnpm dlx shadcn@latest add dropdown-menu select
pnpm dlx shadcn@latest add dialog alert-dialog
pnpm dlx shadcn@latest add table data-table
```

**How it works**:

- Components are added to `src/components/ui/`
- Each component is fully customizable (not npm packages)
- Uses CVA (class-variance-authority) for variants
- Integrates seamlessly with Tailwind CSS

**Using components**:

```typescript
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent } from "@/components/ui/card";

export default function MyComponent() {
  return (
    <Card>
      <CardHeader>Title</CardHeader>
      <CardContent>
        <Button variant="default">Click me</Button>
      </CardContent>
    </Card>
  );
}
```

### Adding New ONDC Endpoints

1. Create new route under `src/app/api/ondc/[endpoint-name]/route.ts`
2. Import utilities from `@/lib/ondc-utils`
3. Follow Next.js App Router conventions
4. Update `/public/openapi.json` with endpoint documentation
5. **Add E2E tests** in `tests/api/` folder (see below)

### E2E Testing Requirements

**IMPORTANT**: When implementing new API routes, ALWAYS add corresponding E2E tests in the `tests/api/` folder.

#### When to Add E2E Tests

Add E2E tests when:

1. **Adding Beckn protocol pairs** (x and on_x routes):
   - `search` + `on_search` → Add tests in `gateway.spec.ts` or create new spec
   - `select` + `on_select` → Add tests for the select flow
   - `init` + `on_init` → Add tests for the init flow
   - `confirm` + `on_confirm` → Add tests for the confirm flow

2. **Adding registry operations**:
   - `lookup`, `subscribe` → Add tests in `registry.spec.ts`

3. **Adding new major endpoints**:
   - Health checks, status endpoints → Add tests in `health.spec.ts`
   - New callback flows → Consider a new `*.spec.ts` file

#### Test File Organization

```
tests/api/
├── health.spec.ts      # Basic health/status endpoints
├── registry.spec.ts    # ONDC registry operations (lookup, subscribe)
├── gateway.spec.ts     # Gateway operations (search, select, init, confirm)
└── polling.spec.ts     # Callback polling and SSE flows
```

#### Test Patterns

**For request/callback pairs** (e.g., search/on_search):
```typescript
test.describe("Search Flow", () => {
  test("POST /api/ondc/search triggers gateway request", async ({ request }) => {
    // Test the outgoing request
  });

  test("POST /api/ondc/on_search stores callback response", async ({ request }) => {
    // Test callback handling with mock payload
  });

  test("GET /api/ondc/search-results returns aggregated results", async ({ request }) => {
    // Test results retrieval
  });
});
```

**For standalone endpoints**:
```typescript
test.describe("Health Endpoint", () => {
  test("GET /api/ondc/health returns 200", async ({ request }) => {
    const response = await request.get("/api/ondc/health");
    expect(response.status()).toBe(200);
  });
});
```

#### Running Tests

```bash
# Run specific test file
pnpm test:e2e:chromium -- tests/api/gateway.spec.ts

# Run tests matching pattern
pnpm test:e2e:chromium -- --grep "search"

# Run all API tests
pnpm test:e2e:chromium -- tests/api/
```

#### Test Checklist for New Endpoints

Before completing a new endpoint implementation, verify:

- [ ] E2E test file created or updated in `tests/api/`
- [ ] Tests cover success cases (200 responses)
- [ ] Tests cover error cases (400, 500 responses)
- [ ] For callback routes: tests verify storage in memory store
- [ ] For polling routes: tests verify data retrieval
- [ ] Tests run successfully: `pnpm test:e2e:chromium -- tests/api/[file].spec.ts`

### Updating Cryptographic Logic

- All crypto operations centralized in `src/lib/ondc-utils.ts`
- Maintain backward compatibility with ONDC protocol
- Test thoroughly with ONDC staging environment

### Environment Changes

1. Update `.env.example` with new variables
2. Update `getEnvVar()` calls in `ondc-utils.ts`
3. Document in README.md environment table

## Git Workflow

**Current Branch**: `main`
**Main Branch**: `main`

Recent commits:

- f191417: done
- 72d0f22: Update README.md to include subscriber IDs
- e4f17f0: Initial commit from Create Next App

## Resources

- [ONDC Official Website](https://ondc.org/)
- [ONDC Documentation](https://github.com/ONDC-Official)
- [ONDC Developer Guide](https://github.com/ONDC-Official/developer-docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [libsodium Documentation](https://doc.libsodium.org/)

## Troubleshooting

### Common Issues

1. **Missing environment variables**

   - Error: "Missing required environment variable: X"
   - Solution: Ensure all 4 variables in `.env`

2. **Decryption failures**

   - Check shared secret calculation
   - Verify ONDC_PUBLIC_KEY matches environment
   - Ensure ENCRYPTION_PRIVATE_KEY is correct

3. **Signature verification failures**

   - Verify SIGNING_PRIVATE_KEY format
   - Check STATIC_SUBSCRIBE_REQUEST_ID matches ONDC registration

4. **Build errors**
   - Run `npm install` to ensure dependencies
   - Check TypeScript errors with `npm run build`
   - Verify Node.js version is 18+

## Future Enhancements

Potential areas for expansion:

- Additional ONDC protocol endpoints (search, select, init, confirm)
- Request/response logging and analytics
- Rate limiting and security middleware
- Automated key rotation
- Multi-environment configuration
- Unit and integration tests
