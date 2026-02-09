# ONDC Vaatun - Complete Documentation

A Next.js application for integrating with the Open Network for Digital Commerce (ONDC) platform. This service handles ONDC subscription verification, message signing, and provides comprehensive endpoints for ONDC network participation focused on Financial Services (Insurance).

## Table of Contents

- [What is ONDC?](#what-is-ondc)
- [Quick Start](#quick-start)
- [Features](#features)
- [Architecture](#architecture)
- [Environment Setup](#environment-setup)
- [API Endpoints](#api-endpoints)
- [Development](#development)
- [Deployment](#deployment)
- [Additional Documentation](#additional-documentation)

## What is ONDC?

[ONDC (Open Network for Digital Commerce)](https://ondc.org/) is an initiative by the Government of India to democratize digital commerce by creating an open, interoperable network. It enables buyers and sellers to transact regardless of the platform they use.

This application focuses on **ONDC:FIS13** (Financial Services - Insurance domain).

## Quick Start

### Prerequisites

- Node.js 18+ or Bun
- pnpm (recommended) or npm
- ONDC credentials (encryption keys, signing keys)

### Installation

1. Clone and install:

```bash
git clone <repository-url>
cd ondc-vaatun
pnpm install
```

2. Configure environment:

```bash
cp .env.example .env
# Edit .env with your ONDC credentials
```

3. Start development server:

```bash
pnpm dev
# Access at http://localhost:4823
```

## Features

### Core ONDC Integration

- **Subscription Verification** - Challenge-response verification for ONDC network subscription ([src/app/api/ondc/on_subscribe/route.ts](../src/app/api/ondc/on_subscribe/route.ts))
- **Domain Verification** - Serve signed verification page for domain ownership ([src/app/ondc-site-verification.html/route.ts](../src/app/ondc-site-verification.html/route.ts))
- **Health Check** - Monitor service availability ([src/app/api/ondc/health/route.ts](../src/app/api/ondc/health/route.ts))

### Advanced Features

- **Registry Lookup** - Query ONDC registry for network participants ([src/app/api/ondc/lookup/route.ts](../src/app/api/ondc/lookup/route.ts))
- **Search API** - Initiate insurance product searches ([src/app/api/ondc/search/route.ts](../src/app/api/ondc/search/route.ts))
- **Select API** - Request quotes for specific insurance products ([src/app/api/ondc/select/route.ts](../src/app/api/ondc/select/route.ts))
- **Callback Handlers** - Process async callbacks (`on_search`, `on_select`) ([src/app/api/ondc/on_search/route.ts](../src/app/api/ondc/on_search/route.ts), [src/app/api/ondc/on_select/route.ts](../src/app/api/ondc/on_select/route.ts))

### Developer Features

- **TypeScript** - Full type safety with Zod schema validation
- **Tenant Architecture** - Singleton pattern for secure credential management
- **Request Context** - AsyncLocalStorage-based context for clean API design
- **ONDC Client** - Automatic request signing and header management
- **Value Objects** - Type-safe IDs and UUIDs
- **API Reference** - Interactive OpenAPI documentation at `/api/reference`

## Architecture

### Directory Structure

```
ondc-vaatun/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/
│   │   │   ├── ondc/                # ONDC API endpoints
│   │   │   │   ├── on_subscribe/    # Subscription verification
│   │   │   │   ├── subscribe/       # Initiate subscription
│   │   │   │   ├── health/          # Health check
│   │   │   │   ├── lookup/          # Registry lookup
│   │   │   │   ├── search/          # Initiate search
│   │   │   │   ├── on_search/       # Search results callback
│   │   │   │   ├── select/          # Request quote
│   │   │   │   ├── on_select/       # Quote callback
│   │   │   │   ├── search-results/  # Search results storage
│   │   │   │   └── select-results/  # Quote results storage
│   │   │   └── reference/           # OpenAPI documentation
│   │   ├── directory/               # Network participant directory UI
│   │   ├── search-results/          # Search results UI
│   │   ├── quote/                   # Quote breakdown UI
│   │   ├── layout.tsx               # Root layout with theme
│   │   └── page.tsx                 # Home page
│   ├── components/
│   │   ├── ui/                      # shadcn/ui components
│   │   ├── search/                  # Search-related components
│   │   ├── quote/                   # Quote-related components
│   │   └── *.tsx                    # Shared components
│   ├── entities/
│   │   └── tenant.ts                # Tenant entity (credential management)
│   ├── lib/
│   │   ├── ondc/
│   │   │   ├── client.ts            # ONDC API client
│   │   │   └── signing.ts           # Request signing utilities
│   │   ├── context.ts               # Request context management
│   │   ├── utils.ts                 # UI utilities
│   │   ├── search-store.ts          # Search results store
│   │   └── select-store.ts          # Quote results store
│   └── value-objects/
│       ├── id.ts                    # Generic ID value object
│       ├── uuid.ts                  # UUID value object
│       └── case-insensitive-id.ts   # Case-insensitive ID
├── docs/                            # Documentation
│   ├── TENANT_ARCHITECTURE.md       # Tenant entity deep dive
│   └── prds/                        # Product requirements
└── public/                          # Static assets

```

### Core Architecture Patterns

#### 1. Tenant Entity Pattern

The [Tenant entity](../src/entities/tenant.ts) is the cornerstone of ONDC credential management:

- **Singleton Pattern** - Single instance throughout the application
- **Encapsulated Credentials** - Private keys never exposed outside the class
- **Pre-computed Secrets** - Shared secrets computed once at startup for performance
- **Type-safe API** - All cryptographic operations through well-defined methods

```typescript
const tenant = Tenant.getInstance();
const decrypted = tenant.decryptChallenge(challenge);
const signature = await tenant.signMessage(message);
```

See [Tenant Architecture](./TENANT_ARCHITECTURE.md) for detailed documentation.

#### 2. Request Context Pattern

Using Node.js AsyncLocalStorage to provide request-scoped context:

```typescript
// In route handlers
export const POST = createONDCHandler(async (request, { tenant, ondcClient }) => {
  // Context automatically available
  const response = await ondcClient.send(url, "POST", payload);
  return NextResponse.json(response);
});
```

See [src/lib/context.ts](../src/lib/context.ts:1-104) for implementation.

#### 3. ONDC Client Pattern

Automatic request signing and header management:

```typescript
const ondcClient = new ONDCClient(tenant);

// Automatically signs request with ONDC authorization header
const response = await ondcClient.send(
  "https://gateway.ondc.org/search",
  "POST",
  searchPayload
);

// Or use ACK helper for async endpoints
const ack = await ondcClient.sendWithAck(url, payload);
```

See [src/lib/ondc/client.ts](../src/lib/ondc/client.ts:1-134) for implementation.

### Tech Stack

#### Core Dependencies

- **Next.js** 16.1.1 - React framework with App Router
- **React** 19.2.3 - UI library
- **TypeScript** 5.9.3 - Type safety
- **Zod** 4.2.1 - Runtime type validation
- **libsodium-wrappers** 0.7.15 - Ed25519 cryptographic signing

#### UI & Styling

- **shadcn/ui** - Component library built on Radix UI primitives
- **Tailwind CSS** 4.1.18 - Utility-first CSS framework
- **next-themes** 0.4.6 - Dark/light theme support
- **lucide-react** 0.554.0 - Icon library
- **motion** 12.23.26 - Animation library

#### Development Tools

- **Biome** 2.3.10 - Fast formatter and linter
- **Babel React Compiler** 1.0.0 - React optimization

#### Node.js Built-ins

- **crypto** - X25519 key exchange, AES-256-ECB encryption
- **async_hooks** - AsyncLocalStorage for request context

## Environment Setup

### Required Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Subscriber Identity
SUBSCRIBER_ID=ondc-staging.vaatun.com
UNIQUE_KEY_ID=custom-key-id
STATIC_SUBSCRIBE_REQUEST_ID=019aa6d1-8906-704b-9929-64be78bb83cc

# Domain (must be ONDC:FIS13 for insurance)
DOMAIN_CODE=ONDC:FIS13

# Encryption Keys (X25519, base64 encoded DER format)
ENCRYPTION_PRIVATE_KEY=your_encryption_private_key_here
ENCRYPTION_PUBLIC_KEY=your_encryption_public_key_here
ONDC_PUBLIC_KEY=your_ondc_public_key_here

# Signing Keys (Ed25519, base64 encoded)
SIGNING_PRIVATE_KEY=your_signing_private_key_here
SIGNING_PUBLIC_KEY=your_signing_public_key_here

# ONDC Network URLs
ONDC_REGISTRY_URL=https://registry.ondc.org/ondc
ONDC_GATEWAY_URL=https://gateway.ondc.org
```

### Environment Variable Details

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `SUBSCRIBER_ID` | string | Your domain name registered with ONDC | `ondc-staging.vaatun.com` |
| `UNIQUE_KEY_ID` | string | Identifier for your key pair | `custom-key-id` |
| `STATIC_SUBSCRIBE_REQUEST_ID` | UUID | Static UUID for site verification | `019aa6d1-8906-...` |
| `DOMAIN_CODE` | enum | ONDC domain (must be `ONDC:FIS13`) | `ONDC:FIS13` |
| `ENCRYPTION_PRIVATE_KEY` | base64 | X25519 private key (PKCS#8 DER) | `MC4CAQAwBQYD...` |
| `ENCRYPTION_PUBLIC_KEY` | base64 | Your X25519 public key (SPKI DER) | `MCowBQYDK2Vu...` |
| `ONDC_PUBLIC_KEY` | base64 | ONDC's X25519 public key (SPKI DER) | `MCowBQYDK2Vu...` |
| `SIGNING_PRIVATE_KEY` | base64 | Ed25519 private key (raw) | `gjMvb5yp77UV...` |
| `SIGNING_PUBLIC_KEY` | base64 | Your Ed25519 public key (raw) | `MCowBQYDK2Vu...` |
| `ONDC_REGISTRY_URL` | URL | ONDC registry endpoint | `https://registry.ondc.org/ondc` |
| `ONDC_GATEWAY_URL` | URL | ONDC gateway endpoint | `https://gateway.ondc.org` |

### Cryptographic Details

#### Key Exchange Protocol

1. **Diffie-Hellman (X25519)**:
   - Generate X25519 key pair for your subscriber
   - ONDC provides their public key
   - Shared secret = DH(your_private, ondc_public)
   - Used for AES-256-ECB encryption of subscription challenges

2. **Message Signing (Ed25519)**:
   - Generate Ed25519 key pair for your subscriber
   - Sign all outgoing ONDC requests
   - ONDC verifies signatures using your public key

#### Signature Format

All outgoing ONDC requests include an Authorization header:

```
Signature keyId="subscriber_id|unique_key_id|ed25519",
          algorithm="ed25519",
          created="1640000000",
          expires="1640000300",
          headers="(created) (expires) digest",
          signature="base64_signature"
```

The signing string format:

```
(created): 1640000000
(expires): 1640000300
digest: BLAKE-512=<blake512_hash_of_body>
```

See [src/lib/ondc/signing.ts](../src/lib/ondc/signing.ts) for implementation details.

## API Endpoints

### Core ONDC Endpoints

#### Health Check

**GET** `/api/ondc/health`

Check service health status.

```bash
curl http://localhost:4823/api/ondc/health
```

Response:
```json
{
  "status": "Health OK!!"
}
```

#### Subscription Challenge

**POST** `/api/ondc/on_subscribe`

Handles ONDC subscription challenge-response verification.

Request:
```json
{
  "subscriber_id": "ondc-staging.vaatun.com",
  "challenge": "encrypted_challenge_string"
}
```

Response:
```json
{
  "answer": "decrypted_plaintext"
}
```

**How it works:**
1. ONDC encrypts a random challenge using AES-256-ECB with shared secret
2. Endpoint decrypts using Diffie-Hellman derived key
3. Returns plaintext to prove key possession

#### Domain Verification

**GET** `/ondc-site-verification.html`

Serves HTML page with signed meta tag for domain verification.

```bash
curl http://localhost:4823/ondc-site-verification.html
```

Response:
```html
<html>
  <head>
    <meta name="ondc-site-verification" content="SIGNED_REQUEST_ID" />
  </head>
  <body>ONDC Site Verification Page</body>
</html>
```

### Registry & Discovery

#### Registry Lookup

**GET** `/api/ondc/lookup?subscriber_id=example.com&type=bpp`

Query ONDC registry for network participants.

Parameters:
- `subscriber_id` (optional) - Filter by subscriber ID
- `type` (optional) - Filter by type: `bap`, `bpp`, or `bg`

Response:
```json
[
  {
    "subscriber_id": "insurance-provider.com",
    "type": "bpp",
    "signing_public_key": "base64_key",
    "valid_until": "2025-12-31T23:59:59Z"
  }
]
```

### Transaction Flow

The ONDC transaction flow follows a request-callback pattern:

```
BAP (You) → Gateway → BPP (Provider)
                ↓
BAP ← Gateway ← BPP (callback: on_search, on_select, etc.)
```

#### 1. Search for Insurance Products

**POST** `/api/ondc/search`

Initiate a search for insurance products.

Request:
```json
{
  "domain": "ONDC:FIS13",
  "intent": {
    "category": {
      "descriptor": {
        "code": "MOTOR_INSURANCE"
      }
    }
  }
}
```

Response:
```json
{
  "message": {
    "ack": {
      "status": "ACK"
    }
  }
}
```

Results arrive asynchronously at `POST /api/ondc/on_search`.

#### 2. Receive Search Results

**POST** `/api/ondc/on_search`

Callback endpoint for receiving search results from providers.

Request (from ONDC network):
```json
{
  "context": { ... },
  "message": {
    "catalog": {
      "providers": [
        {
          "id": "provider-1",
          "descriptor": {
            "name": "Insurer XYZ"
          },
          "items": [
            {
              "id": "motor-policy-1",
              "descriptor": {
                "name": "Comprehensive Motor Insurance"
              }
            }
          ]
        }
      ]
    }
  }
}
```

Results are stored and accessible via UI at `/search-results/[transactionId]`.

#### 3. Select Product & Request Quote

**POST** `/api/ondc/select`

Request a quote for a specific insurance product.

Request:
```json
{
  "provider_id": "provider-1",
  "item_id": "motor-policy-1",
  "customer": {
    "person": {
      "name": "John Doe"
    }
  }
}
```

Response:
```json
{
  "message": {
    "ack": {
      "status": "ACK"
    }
  }
}
```

Quote arrives asynchronously at `POST /api/ondc/on_select`.

#### 4. Receive Quote

**POST** `/api/ondc/on_select`

Callback endpoint for receiving quote details.

Request (from ONDC network):
```json
{
  "context": { ... },
  "message": {
    "order": {
      "quote": {
        "price": {
          "value": "5000",
          "currency": "INR"
        },
        "breakup": [
          {
            "title": "Base Premium",
            "price": { "value": "4500", "currency": "INR" }
          }
        ]
      }
    }
  }
}
```

Quote is stored and accessible via UI at `/quote/[transactionId]/[messageId]`.

### UI Pages

#### Directory Page

**GET** `/directory`

Browse ONDC network participants with filtering and search.

#### Search Results

**GET** `/search-results/[transactionId]`

View insurance products from search operation.

#### Quote Breakdown

**GET** `/quote/[transactionId]/[messageId]`

View detailed quote breakdown with pricing and coverage.

## Development

### Local Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Or use shortcuts
pnpm d    # alias for dev
```

Access the application at [http://localhost:4823](http://localhost:4823).

### Code Quality

```bash
# Run linter and formatter
pnpm lint

# Format code only
pnpm format

# Build for production (includes lint + format)
pnpm build
```

### Testing Endpoints

#### Test with ngrok

For testing ONDC callbacks, you need a public URL:

```bash
# Start ngrok tunnel
pnpm ngrok
# or
pnpm n    # alias

# Update ONDC registry with your ngrok URL
```

#### Manual Testing

```bash
# Health check
curl http://localhost:4823/api/ondc/health

# Domain verification
curl http://localhost:4823/ondc-site-verification.html

# Registry lookup
curl 'http://localhost:4823/api/ondc/lookup?type=bpp'

# Search (requires full payload)
curl -X POST http://localhost:4823/api/ondc/search \
  -H "Content-Type: application/json" \
  -d @search-payload.json
```

### Adding shadcn/ui Components

```bash
# Add individual components
pnpm dlx shadcn@latest add button
pnpm dlx shadcn@latest add card dialog

# Components are added to src/components/ui/
```

Usage:
```typescript
import { Button } from "@/components/ui/button";

export default function MyComponent() {
  return <Button variant="default">Click me</Button>;
}
```

### Zod Schema Conventions

When defining Zod schemas for API routes:

- **Request schemas**: Use `z.object()` for strict validation of outgoing requests
- **Response schemas**: Use `z.looseObject()` to allow additional fields from external APIs

This is important because we're exploring ONDC APIs. Using `looseObject` ensures we see all fields returned, including undocumented ones.

```typescript
// Request - strict (what we send)
const LookupRequestSchema = z.object({
  subscriber_id: z.string().optional(),
  type: z.enum(["bap", "bpp", "bg"]).optional(),
});

// Response - loose (what we receive)
const SubscriberSchema = z.looseObject({
  subscriber_id: z.string(),
  signing_public_key: z.string(),
  // ... additional fields pass through
});
```

### Running SigNoz (Trace Visualization)

SigNoz provides distributed trace visualization for debugging and monitoring ONDC request flows. It uses ClickHouse for storage and exposes an OTLP collector to receive traces from the BAP server.

#### Prerequisites

- Docker Desktop installed and running

#### SigNoz Commands

| Command | Description |
|---------|-------------|
| `pnpm signoz:up` | Start SigNoz services in background |
| `pnpm signoz:down` | Stop SigNoz services |
| `pnpm signoz:clean` | Stop and remove all data (reset) |
| `pnpm signoz:logs` | View SigNoz container logs |

#### Quick Start

```bash
# Start SigNoz
pnpm signoz:up

# Access SigNoz UI
open http://localhost:4830
```

#### Port Mapping

| Service | Port | Purpose |
|---------|------|---------|
| Frontend (UI) | 4830 | Web interface for viewing traces |
| OTLP HTTP | 4831 | Trace ingestion endpoint (used by BAP) |
| OTLP gRPC | 4832 | Alternative trace ingestion |
| Query Service API | 4833 | Backend API |
| Query Service Metrics | 4834 | Prometheus metrics |
| ClickHouse Native | 4835 | Database connection |
| ClickHouse HTTP | 4836 | Database HTTP API |

#### Architecture

SigNoz consists of 4 services:

1. **ClickHouse** - Database for storing trace data (72h retention)
2. **OTel Collector** - Receives OTLP traces from BAP server
3. **Query Service** - API for querying trace data
4. **Frontend** - Web UI for visualizing traces

All services run in Docker containers with persistent storage for ClickHouse data.

#### Troubleshooting

**Containers won't start:**
```bash
# Check Docker is running
docker ps

# View logs
pnpm signoz:logs
```

**Data corruption:**
```bash
# Reset all data
pnpm signoz:clean
pnpm signoz:up
```

## Deployment

### Current Deployment

- **Platform**: Vercel (recommended for Next.js)
- **Staging Subscriber ID**: `ondc-staging.vaatun.com`
- **Staging Request ID**: `019aa6d1-8906-704b-9929-64be78bb83cc`

### Deployment Requirements

- Node.js 18+ runtime
- HTTPS endpoint (required by ONDC)
- Environment variable support
- Always-on availability for ONDC callbacks

### Deploy to Vercel

1. Push code to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables from `.env.example`
4. Deploy

### Deploy to Other Platforms

Ensure your platform supports:
- Node.js 18+
- Environment variables
- HTTPS (required by ONDC)
- Persistent processes for AsyncLocalStorage

### Post-Deployment

1. **Update ONDC Registry** - Register your public URL and subscriber ID
2. **Verify Domain** - Ensure `/ondc-site-verification.html` is accessible
3. **Test Subscription** - ONDC will call `/api/ondc/on_subscribe` with challenge
4. **Monitor Logs** - Check console for Tenant initialization and request signing

## ONDC Subscription Process

Complete flow for subscribing to the ONDC network:

1. **Generate Keys**
   - Generate X25519 key pair for encryption
   - Generate Ed25519 key pair for signing
   - Obtain ONDC's public key for your environment

2. **Configure Environment**
   - Add all keys to `.env`
   - Set subscriber ID (your domain)
   - Set unique key ID (identifier for key pair)

3. **Deploy Service**
   - Deploy to public HTTPS endpoint
   - Ensure all endpoints are accessible

4. **Domain Verification**
   - Verify `/ondc-site-verification.html` is accessible
   - Check signed meta tag is present

5. **Register with ONDC**
   - Submit subscriber details to ONDC registry
   - Provide subscriber ID, public keys, domain

6. **Challenge-Response**
   - ONDC calls `/api/ondc/on_subscribe` with encrypted challenge
   - Service decrypts and returns answer
   - Subscription activated on success

## Additional Documentation

### Architecture Deep Dives

- **[Tenant Architecture](./TENANT_ARCHITECTURE.md)** - Complete guide to the Tenant entity system
- **[CLAUDE.md](../CLAUDE.md)** - Detailed codebase context for AI assistants

### Product Requirements

- **[Feature PRDs](./prds/features/)** - Product requirements for upcoming features
- **[Website Design](./prds/features/website-design/)** - UI/UX design specifications

### External Resources

- [ONDC Official Website](https://ondc.org/)
- [ONDC Financial Services Developer Guide](https://ondc-official.github.io/ONDC-FIS-Specifications/)
- [ONDC GitHub](https://github.com/ONDC-Official)
- [ONDC Developer Docs](https://github.com/ONDC-Official/developer-docs)
- [Next.js Documentation](https://nextjs.org/docs)
- [libsodium Documentation](https://doc.libsodium.org/)

### Internal Resources

- [ONDC Financial Services Access Guide](https://docs.google.com/presentation/d/1CDfFTOJp8Hm5TTLvTS-_os8R9b7WfIcbv3RH4-g0Lg8)
- [Process Flow - FigJam](https://www.figma.com/board/YkfXnnXN2D0h3N1X3ciUhq/)
- [Insurance BRD](https://docs.google.com/document/d/1bsnil7bGb2F_pLQSisd4s2z_ztGC8Yz62wsPTOG1OX4)
- [ONDC Integration Intro - Recording](https://vaatun-my.sharepoint.com/:v:/p/vaibhav/IQBqk2Nni_MwRaYPt8gg1eBfAS_ogT68d-BgYCZJmrRwSV8?e=B65tQc)
- [Vaatun ↔ ONDC WhatsApp Group](https://chat.whatsapp.com/LPJNarWRQ3VG8wOXoBptfb)

## Security

### Best Practices

- Never commit `.env` to version control
- Keep private keys secure and encrypted
- Use different keys for staging and production
- Rotate keys periodically
- Monitor endpoints for unauthorized access
- Validate all incoming ONDC requests
- Use HTTPS for all production endpoints

### Key Management

All sensitive keys are:
- Stored in environment variables
- Encapsulated in the Tenant entity
- Never exposed in logs or responses
- Validated on startup with Zod schemas

## Troubleshooting

### Common Issues

#### Missing Environment Variables

```
Error: Missing required environment variable: SIGNING_PRIVATE_KEY
```

**Solution**: Ensure all variables from `.env.example` are set in `.env`.

#### Decryption Failures

```
Error: Failed to decrypt challenge
```

**Solutions**:
- Verify `ENCRYPTION_PRIVATE_KEY` is correct
- Check `ONDC_PUBLIC_KEY` matches your environment
- Ensure shared secret calculation is correct (32 bytes for AES-256)

#### Signature Verification Failures

```
Error: Invalid signature
```

**Solutions**:
- Verify `SIGNING_PRIVATE_KEY` format
- Check clock drift between servers (signing uses timestamps)
- Ensure signing string format matches ONDC specs
- Verify `UNIQUE_KEY_ID` matches registered key

#### Tenant Initialization Failures

```
Error: Failed to initialize Tenant
```

**Solutions**:
- Check all environment variables are base64 encoded
- Verify key formats (PKCS#8 DER for encryption, raw for signing)
- Review Tenant logs for specific error

#### ONDC Request Failures

```
Error: ONDC Request Failed [401]: Unauthorized
```

**Solutions**:
- Verify Authorization header format
- Check signature generation
- Ensure `SUBSCRIBER_ID` and `UNIQUE_KEY_ID` match registry
- Verify public key registered with ONDC

### Debug Mode

Enable detailed logging by checking console output:

```typescript
// Tenant initialization logs
console.log("[Tenant] Initialized successfully:", { ... });

// Request signing logs
console.log("[Signing] Created:", created, "→", new Date(...));
```

## Contributing

When adding new features:

1. **Use Tenant Entity** - Never access environment variables directly
2. **Use Context Pattern** - Wrap route handlers with `createONDCHandler`
3. **Add Zod Schemas** - Validate all inputs and outputs
4. **Follow Patterns** - Match existing code style
5. **Update Documentation** - Keep docs in sync with code changes

## License

[Your License Here]

## Support

For issues and questions:
- GitHub Issues: [repository-url]/issues
- ONDC WhatsApp Group: [link]
- Email: [your-email@example.com]