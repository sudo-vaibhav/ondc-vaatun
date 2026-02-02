# Technology Stack

**Analysis Date:** 2026-02-02

## Languages

**Primary:**
- TypeScript 5.9.3 - Full codebase (server, client, tests)
- JavaScript (ES2022 target) - Runtime execution

**Secondary:**
- JSON - Configuration and build manifests
- CSS/Tailwind - Styling through utility classes

## Runtime

**Environment:**
- Node.js 18+ (explicitly required, but build targets ES2022 compatible with Node 24)
- Server target: `--target=node24` in esbuild configuration

**Package Manager:**
- pnpm (workspaces enabled)
- Lockfile: `pnpm-lock.yaml` (generated, not shown in repo but standard)

## Frameworks

**Core - Server:**
- Express 5.0.1 - HTTP server framework with middleware support
- tRPC 11.0.0 - End-to-end typesafe RPC APIs
- @trpc/server 11.0.0 - Server-side tRPC implementation
- Zod 4.3.6 - Schema validation and runtime type checking

**Core - Client:**
- React 19.0.0 - UI framework
- Vite 7.3.1 - Frontend build tool and dev server (port 4823)
- TanStack Router 1.157.18 - File-based routing with type safety
- TanStack Query 5.80.0 - Data fetching and caching layer
- @trpc/react-query 11.0.0 - React bindings for tRPC

**UI Components:**
- shadcn/ui (via radix-ui primitives) - Component library
- Radix UI primitives:
  - @radix-ui/react-checkbox 1.1.0
  - @radix-ui/react-dialog 1.1.0
  - @radix-ui/react-hover-card 1.1.0
  - @radix-ui/react-label 2.1.0
  - @radix-ui/react-scroll-area 1.2.0
  - @radix-ui/react-select 2.1.0
  - @radix-ui/react-separator 1.1.0
  - @radix-ui/react-slot 1.1.0

**Styling & Utilities:**
- Tailwind CSS 4.0.0 - Utility-first CSS framework with Vite integration
- class-variance-authority 0.7.1 - Component variant management
- tailwind-merge 3.4.0 - Merge Tailwind classes without conflicts
- clsx 2.1.1 - Conditional className builder
- tw-animate-css 1.4.0 - Animation utilities for Tailwind
- next-themes 0.4.0 - Theme provider (light/dark mode)

**Animations & Graphics:**
- motion 12.15.0 - Animation library
- lucide-react 0.563.0 - Icon library
- @splinetool/react-spline 4.0.0 - 3D graphics component

**Notifications:**
- sonner 2.0.7 - Toast notifications library

**Documentation:**
- @scalar/express-api-reference 0.8.39 - Interactive OpenAPI documentation
- Scalar UI theme: "purple"

## Key Dependencies

**Critical - Cryptography:**
- libsodium-wrappers 0.8.2 - Ed25519 signing and Diffie-Hellman key exchange
- Node.js crypto module - Blake2b-512 digest calculation

**Critical - Data Storage:**
- ioredis 5.6.1 - Redis client with connection pooling support
  - Used for search results, select results, and subscription callbacks
  - Separate connections for command vs pub/sub operations

**Infrastructure:**
- @ngrok/ngrok 1.4.0 - Ngrok tunneling for local development (auto-connects if NGROK_AUTHTOKEN set)
- cors 2.8.5 - CORS middleware for Express
- express 5.0.1 - HTTP server

**Utilities:**
- uuid 13.0.0 - UUID generation (v4)

## Configuration

**Environment:**
- Configured via `.env` file with the following structure:
  - ONDC configuration: `DOMAIN_CODE`, `ENCRYPTION_PRIVATE_KEY`, `ENCRYPTION_PUBLIC_KEY`
  - API endpoints: `ONDC_GATEWAY_URL`, `ONDC_REGISTRY_URL`
  - Signing keys: `SIGNING_PUBLIC_KEY`, `SIGNING_PRIVATE_KEY`, `STATIC_SUBSCRIBE_REQUEST_ID`, `STATIC_UNIQUE_KEY_ID`
  - Networking: `SUBSCRIBER_ID`, `REDIS_URL`, `PORT` (default: 4822)
  - Features: `FEATURE_VERIFY_CALLBACKS` (boolean, signature verification for callbacks)
  - Development: `NGROK_AUTHTOKEN` (for auto-tunnel setup)

**Build:**
- TypeScript configuration: `tsconfig.json` (root) with project references
  - Shared compiler options: ES2022 target, strict mode, bundler module resolution
- esbuild configuration in `server/package.json`:
  - Platform: node
  - Format: ESM (ES modules)
  - Bundles dependencies into single file: `dist/index.js`
  - Excludes external binaries: pg-native, canvas, @ngrok/ngrok

## Development Tools

**Code Quality:**
- Biome 2.3.13 - Unified linter and formatter (biome format, biome check)
  - Configured with Tailwind CSS support
  - React/Next.js rules enabled
  - Import organization enabled

**TypeScript Execution:**
- tsx 4.0.0 - TypeScript execution for Node.js with .env file support
- typescript 5.9.3 - TypeScript compiler

**Build Tools:**
- esbuild 0.27.2 - High-performance bundler for server
- Vite plugins:
  - @tanstack/router-plugin - Auto-generates route tree (`routeTree.gen.ts`)
  - @vitejs/plugin-react - React Fast Refresh
  - @tailwindcss/vite - Tailwind CSS integration

**Testing:**
- @playwright/test 1.57.0 - E2E testing framework
- Configuration: `playwright.config.ts`

**Utilities:**
- concurrently 9.2.1 - Run multiple dev servers in parallel
- dotenv 17.2.3 - Environment variable loading
- dotenv-cli 11.0.0 - Run commands with dotenv in context

## Platform Requirements

**Development:**
- Node.js 18+
- pnpm (workspaces support)
- Redis instance (for local development)
- Optional: ngrok account with auth token (for tunnel testing)

**Production:**
- Node.js 18+
- Redis instance
- HTTPS endpoint (ONDC requirement)
- Static file serving from `server/public/` (built client assets)

**Deployment Target:**
- Any Node.js 18+ hosting platform
- Server port: 4822 (configurable via `PORT` env var)
- Client served from same Express instance in production

## Build Process

**Development:**
```bash
pnpm install                    # Install all workspace dependencies
pnpm dev                        # Start server + client concurrently
pnpm dev:server                 # Start server only (tsx watch)
pnpm dev:client                 # Start client only (Vite dev server)
```

**Production:**
```bash
pnpm build                      # Build client → server/public, then server
pnpm build:client               # Vite build to ../server/public
pnpm build:server               # esbuild to dist/index.js
pnpm start                      # Run node dist/index.js
```

**Code Quality:**
```bash
pnpm lint                       # Run Biome linter with --write
pnpm format                     # Format with Biome
pnpm check                      # Run all checks (alias for lint)
```

**Testing:**
```bash
pnpm test:e2e                   # Playwright headless tests
pnpm test:e2e:headed           # Playwright with browser visible
pnpm test:e2e:ui               # Playwright UI runner
pnpm test:e2e:report           # View HTML test report
```

## Architecture Notes

**Monorepo Structure:**
- pnpm workspaces with two packages: `server`, `client`
- Root `tsconfig.json` uses project references for unified compilation
- Shared dev tools and scripts at root level

**Type Safety:**
- tRPC provides end-to-end type safety between server and client
- Client imports `AppRouter` type from server via `server-types` (auto-generated)
- Zod schemas ensure runtime validation on both sides

**Module Resolution:**
- Path alias `@/*` configured in both `server/tsconfig.json` and `client/tsconfig.json`
- Maps to `./src/*` in respective packages

**Module Format:**
- Server: ESM (ES modules) via `"type": "module"` in `server/package.json`
- Client: ESM via Vite
- Build outputs ESM format with `--format=esm` in esbuild

---

*Stack analysis: 2026-02-02*
