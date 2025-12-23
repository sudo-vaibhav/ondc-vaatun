# Technical Documentation Page PRD

## Document Information

**Version**: 1.0
**Created**: 2025-12-24
**Status**: Draft
**Parent PRD**: [Insurance Marketplace Overview](../homepage-insurance-redesign.md)

---

## Page Overview

**Route**: `/tech`
**Purpose**: Technical documentation hub for developers, integration partners, and technical stakeholders
**Target Audience**: Developers, technical architects, integration partners, ONDC participants

---

## Content Migration

This page consolidates all technical content currently on the homepage. The following sections will be moved here:

### From Current Homepage

1. **API Endpoints Section**
   - POST `/api/ondc/on_subscribe`
   - GET `/ondc-site-verification.html`
   - GET `/api/ondc/health`

2. **Technical Features**
   - Subscription Verification (AES-256-ECB)
   - Domain Verification (Ed25519)
   - Secure Key Management
   - Health Monitoring
   - TypeScript support
   - High Performance (DH shared secrets)

3. **Tech Stack Display**
   - Next.js 16, React 19, TypeScript
   - shadcn/ui, Tailwind CSS
   - libsodium, Node.js Crypto
   - Biome, Lucide Icons

4. **What is ONDC (Technical)**
   - Full technical explanation
   - Protocol details

---

## Page Structure

```
/tech                          → Technical Documentation Hub
├── /tech/api                  → API Reference
│   ├── /tech/api/subscribe    → Subscription Endpoints
│   ├── /tech/api/search       → Search Endpoints
│   ├── /tech/api/select       → Select/Quote Endpoints
│   └── /tech/api/order        → Order Endpoints
├── /tech/integration          → Integration Guide
│   ├── /tech/integration/quickstart
│   └── /tech/integration/authentication
└── /tech/developers           → Developer Resources
    ├── /tech/developers/keys
    └── /tech/developers/testing
```

---

## Page Layout

```
┌────────────────────────────────────────────────────────────────────┐
│                      HEADER (shared)                                │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  HERO: Technical Documentation                                     │
│  "Build on ONDC with Vaatun"                                       │
│  [Quick Start] [API Reference]                                     │
│                                                                     │
├──────────────────────┬─────────────────────────────────────────────┤
│                      │                                              │
│  SIDEBAR NAV         │  MAIN CONTENT AREA                          │
│                      │                                              │
│  Overview            │  Content changes based on route              │
│  ├─ Introduction     │                                              │
│  ├─ Architecture     │                                              │
│  └─ Tech Stack       │                                              │
│                      │                                              │
│  API Reference       │                                              │
│  ├─ Authentication   │                                              │
│  ├─ Subscription     │                                              │
│  ├─ Search           │                                              │
│  ├─ Select           │                                              │
│  ├─ Init             │                                              │
│  ├─ Confirm          │                                              │
│  └─ Status           │                                              │
│                      │                                              │
│  Guides              │                                              │
│  ├─ Quick Start      │                                              │
│  ├─ Key Generation   │                                              │
│  ├─ Local Dev        │                                              │
│  └─ Deployment       │                                              │
│                      │                                              │
│  Resources           │                                              │
│  ├─ ONDC Protocol    │                                              │
│  ├─ Postman          │                                              │
│  └─ GitHub           │                                              │
│                      │                                              │
└──────────────────────┴─────────────────────────────────────────────┘
│                      FOOTER (shared)                                │
└────────────────────────────────────────────────────────────────────┘
```

---

## Section Details

### Hero Section

**Layout**: Full-width, developer-focused aesthetic
**Background**: Dark/code-themed or subtle grid pattern

**Headline**:
```
Build on ONDC with Vaatun
```

**Subheadline**:
```
Technical documentation for integrating with the Open Network for Digital Commerce.
Complete API reference, integration guides, and developer resources.
```

**CTAs**:
- Primary: "Quick Start Guide →"
- Secondary: "API Reference"

**Quick Links** (horizontal pills):
```
[Subscription API]  [Search API]  [Order API]  [Authentication]  [GitHub]
```

---

### Overview Section (`/tech`)

#### Introduction

```markdown
## Welcome to Vaatun Technical Documentation

Vaatun provides a complete integration layer for participating in the ONDC
network. Whether you're building a Buyer App (BAP) or Seller App (BPP),
this documentation covers everything you need to get started.

### What You Can Build

- **Buyer Applications**: Enable your users to discover and purchase
  insurance products from any seller on the ONDC network
- **Seller Applications**: List your insurance products on the open
  network and receive orders from any buyer app
- **Integration Services**: Connect existing systems to ONDC using
  our APIs
```

#### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        Your Application                      │
├─────────────────────────────────────────────────────────────┤
│                    Vaatun Integration Layer                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Crypto Utils │  │ Signing      │  │ Verification │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
├─────────────────────────────────────────────────────────────┤
│                      ONDC Network                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Gateway      │  │ Registry     │  │ Participants │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

#### Tech Stack

Display the current tech stack with version badges:

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.0.3 | React framework |
| React | 19.2.0 | UI library |
| TypeScript | 5.x | Type safety |
| libsodium | 0.7.15 | Cryptographic operations |
| shadcn/ui | latest | Component library |
| Tailwind CSS | 4.x | Styling |

---

### API Reference Section

#### Authentication

**Endpoint Documentation Format**:

```markdown
## Authentication

All ONDC API calls require cryptographic authentication using:
- **Ed25519 signatures** for request signing
- **X25519 key exchange** for encryption
- **Blake2b-512** for request digest

### Headers

| Header | Description |
|--------|-------------|
| `Authorization` | Blake2b-512 digest of request body |
| `X-Gateway-Authorization` | Ed25519 signature with key details |

### Signature Format

\`\`\`
Signature keyId="subscriber_id|unique_key_id|ed25519",
algorithm="ed25519",
created="unix_timestamp",
expires="unix_timestamp",
headers="(created) (expires) digest",
signature="base64_signature"
\`\`\`
```

#### Subscription Endpoints

**POST /api/ondc/on_subscribe**

```markdown
## On Subscribe

Handles ONDC subscription challenge-response verification.

### Request

\`\`\`http
POST /api/ondc/on_subscribe
Content-Type: application/json
\`\`\`

\`\`\`json
{
  "subscriber_id": "ondc-staging.vaatun.com",
  "challenge": "encrypted_challenge_base64"
}
\`\`\`

### Response

\`\`\`json
{
  "answer": "decrypted_challenge_plaintext"
}
\`\`\`

### How It Works

1. ONDC encrypts a random challenge using AES-256-ECB
2. Encryption key is derived via Diffie-Hellman (your private + ONDC public)
3. Your service decrypts and returns the plaintext
4. ONDC verifies the answer matches the original challenge

### Error Responses

| Status | Description |
|--------|-------------|
| 400 | Missing challenge in request |
| 500 | Decryption failed |
```

**GET /ondc-site-verification.html**

```markdown
## Site Verification

Serves HTML page with signed meta tag for domain verification.

### Request

\`\`\`http
GET /ondc-site-verification.html
\`\`\`

### Response

\`\`\`html
<html>
  <head>
    <meta name="ondc-site-verification"
          content="SIGNED_UNIQUE_KEY_ID" />
  </head>
  <body>ONDC Site Verification Page</body>
</html>
\`\`\`

### Signature Details

The content is your `STATIC_SUBSCRIBE_REQUEST_ID` signed with your
Ed25519 signing key (SIGNING_PRIVATE_KEY).
```

**GET /api/ondc/health**

```markdown
## Health Check

Monitor service availability.

### Request

\`\`\`http
GET /api/ondc/health
\`\`\`

### Response

\`\`\`json
{
  "status": "Health OK!!"
}
\`\`\`
```

---

### Guides Section

#### Quick Start

```markdown
## Quick Start

Get up and running with Vaatun in under 10 minutes.

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm
- ONDC staging credentials

### 1. Clone and Install

\`\`\`bash
git clone https://github.com/vaatun/ondc-vaatun.git
cd ondc-vaatun
pnpm install
\`\`\`

### 2. Configure Environment

\`\`\`bash
cp .env.example .env
\`\`\`

Edit `.env` with your ONDC credentials:

\`\`\`env
ENCRYPTION_PRIVATE_KEY=<your_x25519_private_key>
ONDC_PUBLIC_KEY=<ondc_public_key>
STATIC_SUBSCRIBE_REQUEST_ID=<your_uuid>
SIGNING_PRIVATE_KEY=<your_ed25519_private_key>
\`\`\`

### 3. Generate Keys (if needed)

\`\`\`bash
pnpm run keys:generate
\`\`\`

### 4. Start Development Server

\`\`\`bash
pnpm dev
\`\`\`

### 5. Verify Installation

\`\`\`bash
curl http://localhost:3000/api/ondc/health
# Expected: {"status":"Health OK!!"}
\`\`\`
```

#### Key Generation Guide

```markdown
## Key Generation

Vaatun requires two key pairs for ONDC integration.

### Key Types

| Key | Algorithm | Purpose |
|-----|-----------|---------|
| Signing Key | Ed25519 | Request signing, verification |
| Encryption Key | X25519 | Challenge decryption |

### Generate Keys

\`\`\`bash
pnpm run keys:generate
\`\`\`

This outputs:
- `SIGNING_PRIVATE_KEY` - Keep secret
- `SIGNING_PUBLIC_KEY` - Share with ONDC registry
- `ENCRYPTION_PRIVATE_KEY` - Keep secret
- `ENCRYPTION_PUBLIC_KEY` - Share with ONDC registry

### Key Format

All keys are base64-encoded. The format expected:

\`\`\`
-----BEGIN PRIVATE KEY-----
<base64_encoded_der>
-----END PRIVATE KEY-----
\`\`\`

For environment variables, use only the base64 portion without headers.
```

---

### Resources Section

**External Links**:
- ONDC Official Documentation
- ONDC Protocol Specifications
- Beckn Protocol
- GitHub Repository
- Postman Collection (if available)

**Downloads**:
- Postman Collection
- OpenAPI Specification
- Sample .env file

---

## Design Specifications

### Visual Style

- **Theme**: Dark mode default (code-friendly), light mode toggle
- **Typography**: Monospace for code, sans-serif for prose
- **Code Blocks**: Syntax highlighting, copy button
- **Navigation**: Sticky sidebar, breadcrumbs

### Component Requirements

| Component | Description |
|-----------|-------------|
| `DocsSidebar` | Collapsible navigation tree |
| `CodeBlock` | Syntax-highlighted code with copy |
| `EndpointCard` | API endpoint documentation |
| `TableOfContents` | Right-side page navigation |
| `Callout` | Info, warning, danger callouts |
| `Tabs` | Language/framework switcher |

### Interactive Elements

- **Try It**: Interactive API console (future)
- **Copy Buttons**: On all code blocks
- **Search**: Full-text documentation search
- **Version Selector**: API versioning (future)

---

## Technical Implementation

### Recommended Approach

Consider using a documentation framework:
- **Fumadocs** (Next.js native)
- **Nextra** (Next.js documentation)
- **Custom MDX** implementation

### File Structure

```
src/
├── app/
│   └── tech/
│       ├── layout.tsx          # Docs layout with sidebar
│       ├── page.tsx            # Overview
│       ├── api/
│       │   ├── page.tsx        # API overview
│       │   ├── subscribe/
│       │   ├── search/
│       │   └── ...
│       ├── integration/
│       │   ├── page.tsx
│       │   ├── quickstart/
│       │   └── ...
│       └── developers/
│           ├── page.tsx
│           └── ...
├── content/
│   └── docs/                   # MDX content files
│       ├── api/
│       ├── guides/
│       └── ...
└── components/
    └── docs/
        ├── Sidebar.tsx
        ├── CodeBlock.tsx
        ├── EndpointCard.tsx
        └── ...
```

### Content Management

- Store documentation in MDX files
- Use frontmatter for metadata
- Enable component imports in MDX
- Auto-generate navigation from file structure

---

## SEO Requirements

### Meta Tags

```html
<title>Technical Documentation — Vaatun ONDC Integration</title>
<meta name="description" content="Complete API reference and integration guides for building on ONDC with Vaatun. Subscription, search, and order APIs." />
<meta name="robots" content="index, follow" />
```

### Structured Data

```json
{
  "@context": "https://schema.org",
  "@type": "TechArticle",
  "headline": "Vaatun ONDC Integration Documentation",
  "description": "Technical documentation for ONDC integration",
  "author": {
    "@type": "Organization",
    "name": "Vaatun"
  }
}
```

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Time to First Integration | < 1 day |
| Documentation Bounce Rate | < 50% |
| Search Usage | Track popular queries |
| API Call Success Rate | > 99% |
| Support Tickets (docs-related) | Decreasing trend |

---

## Open Questions

1. **API Console**: Should we include interactive API testing?
2. **Versioning**: How to handle API version changes?
3. **Changelog**: Separate changelog page or inline?
4. **Community**: GitHub discussions or separate forum?

---

## Appendix

### Current Homepage Content to Migrate

**Features Cards**:
1. Subscription Verification — AES-256-ECB encryption
2. Domain Verification — Ed25519 signatures
3. Secure Key Management — Environment-based configuration
4. Health Monitoring — Service availability endpoints
5. TypeScript — Full type safety
6. High Performance — Pre-computed DH shared secrets

**Tech Stack Badge**:
- Next.js 16
- React 19
- TypeScript
- shadcn/ui
- Tailwind CSS
- libsodium
- Node.js Crypto
- Biome
- Lucide Icons

---

## Approvals

- [ ] Engineering Lead
- [ ] Developer Experience Lead
- [ ] Technical Writer
