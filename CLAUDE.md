# CLAUDE.md - Codebase Context

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

### Development Tools
- **Biome** 2.2.0 - Code formatting and linting
- **Babel React Compiler** 1.0.0 - React optimization

### Node.js Built-ins
- **crypto** - AES-256-ECB decryption and Diffie-Hellman key exchange

## Architecture

### Directory Structure

```
ondc-vaatun/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/ondc/
│   │   │   ├── on_subscribe/
│   │   │   │   └── route.ts         # POST /api/ondc/on_subscribe
│   │   │   └── health/
│   │   │       └── route.ts         # GET /api/ondc/health
│   │   ├── ondc-site-verification.html/
│   │   │   └── route.ts             # GET /ondc-site-verification.html
│   │   ├── layout.tsx               # Root layout
│   │   └── page.tsx                 # Home page
│   └── lib/
│       └── ondc-utils.ts            # Cryptographic utilities
├── .env                             # Environment variables (gitignored)
├── .env.example                     # Environment template
├── package.json                     # Dependencies
├── tsconfig.json                    # TypeScript config
├── biome.json                       # Biome config
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
- `REQUEST_ID` - Unique identifier for site verification
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

**Response**: HTML with signed REQUEST_ID in meta tag

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
   - Used for signing REQUEST_ID for domain verification

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
REQUEST_ID=<uuid_for_verification>
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
2. Service returns HTML with signed REQUEST_ID
3. ONDC verifies signature using service's public key
4. Domain ownership confirmed

## Development Workflow

### Local Development
```bash
npm install              # Install dependencies
cp .env.example .env     # Create environment file
# Add actual keys to .env
npm run dev              # Start dev server on :3000
```

### Code Quality
```bash
npm run lint             # Run Biome linter
npm run format           # Format code with Biome
```

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
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardContent } from "@/components/ui/card"

export default function MyComponent() {
  return (
    <Card>
      <CardHeader>Title</CardHeader>
      <CardContent>
        <Button variant="default">Click me</Button>
      </CardContent>
    </Card>
  )
}
```

### Adding New ONDC Endpoints
1. Create new route under `src/app/api/ondc/[endpoint-name]/route.ts`
2. Import utilities from `@/lib/ondc-utils`
3. Follow Next.js App Router conventions
4. Update README.md with endpoint documentation

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
   - Check REQUEST_ID matches ONDC registration

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
