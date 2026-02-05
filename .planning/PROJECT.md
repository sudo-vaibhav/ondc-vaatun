# ONDC Health Insurance BAP

## What This Is

A consumer-facing Buyer App Platform (BAP) for purchasing health insurance through the ONDC network. Users search for health insurance products, select a plan, complete KYC, pay, and receive their policy — all via ONDC's open protocol. The codebase is designed to be "vibe-codable" — Claude can implement any endpoint or page with minimal guidance because the ONDC protocol context is embedded.

## Core Value

**Enable rapid implementation of ONDC health insurance features through rich embedded protocol context.** When given a command like "implement the /init endpoint", Claude should have everything needed — protocol specs, existing patterns, and domain knowledge — to build it correctly without back-and-forth.

## Requirements

### Validated

<!-- Shipped and confirmed working. Inferred from existing codebase. -->

- ✓ **INFRA-01**: Express + tRPC server with type-safe API layer — existing
- ✓ **INFRA-02**: Redis-based state management for transactions — existing
- ✓ **INFRA-03**: Ed25519 signing and ONDC authorization headers — existing
- ✓ **INFRA-04**: Tenant entity with cryptographic operations — existing
- ✓ **INFRA-05**: ONDC registry lookup and subscribe operations — existing
- ✓ **UI-01**: Home page with insurance category cards — existing
- ✓ **SEARCH-01**: Health insurance search flow (gateway.search) — existing
- ✓ **SEARCH-02**: on_search callback handler with Redis storage — existing
- ✓ **SEARCH-03**: Health insurance product listing page — existing

### Active

<!-- Current scope. Building toward these. -->

- [ ] **SELECT-01**: User can select a health insurance product and get detailed quote
- [ ] **SELECT-02**: on_select callback properly persists quote details
- [ ] **SELECT-03**: Quote display page shows coverage, premium, terms
- [ ] **INIT-01**: User can enter KYC details (personal info, nominees, medical history)
- [ ] **INIT-02**: init request sent to BPP with proper payload structure
- [ ] **INIT-03**: on_init callback captures final terms and payment link
- [ ] **INIT-04**: KYC form page with validation and submission
- [ ] **CONFIRM-01**: User can confirm order after reviewing final terms
- [ ] **CONFIRM-02**: confirm request triggers payment flow
- [ ] **CONFIRM-03**: on_confirm callback captures policy document
- [ ] **CONFIRM-04**: Payment/confirmation page
- [ ] **STATUS-01**: User can check policy status post-purchase
- [ ] **STATUS-02**: status/on_status endpoints implemented
- [ ] **STATUS-03**: Policy status page
- [ ] **CONTEXT-01**: ONDC FIS13 health insurance specs embedded in codebase documentation
- [ ] **CONTEXT-02**: Example payloads and flow diagrams accessible to Claude
- [ ] **CONTEXT-03**: Pattern documentation for how this codebase implements ONDC flows
- [ ] **TEST-01**: E2E tests for each new endpoint
- [ ] **TEST-02**: Protocol compliance validation in test suite

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Quote comparison page — ONDC protocol doesn't have standardized comparison; each BPP returns asynchronously
- Motor insurance — Health only for this milestone
- Marine insurance — Health only for this milestone
- Life insurance — Health only for this milestone
- User authentication — Public prototype; auth deferred to future milestone
- Policy renewal flows — New purchase flow first, renewals later
- Claims flow — Purchase flow first, claims integration later
- Multi-tenant support — Single subscriber configuration for now

## Context

**ONDC Protocol:**
- Domain code: `ONDC:FIS13` (Financial Services - Insurance)
- Spec branch: `draft-FIS13-health-2.0.1` in [ONDC-Official/ONDC-FIS-Specifications](https://github.com/ONDC-Official/ONDC-FIS-Specifications)
- Flow: search → on_search → select → on_select → init → on_init → confirm → on_confirm → status → on_status
- All requests require Ed25519 signed Authorization headers
- Callbacks are webhooks from BPPs to our callback URL

**Existing Codebase:**
- Monorepo: Express + tRPC backend (port 4822), Vite + React frontend (port 4823)
- Search and on_search working; select/init/confirm/status need implementation
- Redis stores transaction state keyed by transactionId
- Tenant singleton handles cryptographic operations
- tRPC provides end-to-end type safety

**ONDC Spec Access:**
- OpenAPI spec: `gh api "repos/ONDC-Official/ONDC-FIS-Specifications/contents/api/build/build.yaml?ref=draft-FIS13-health-2.0.1"`
- Example payloads: `gh api "repos/ONDC-Official/ONDC-FIS-Specifications/contents/api/components/examples/health-insurance/{endpoint}?ref=draft-FIS13-health-2.0.1"`
- Flows: `gh api "repos/ONDC-Official/ONDC-FIS-Specifications/contents/api/components/flows/health-insurance?ref=draft-FIS13-health-2.0.1"`

## Constraints

- **Protocol**: Must comply with ONDC FIS13 2.0.1 health insurance specification
- **Testing**: All new endpoints must have E2E tests; codebase must remain functional at all times
- **Architecture**: Follow existing patterns (tRPC routers, Redis stores, Tenant signing)
- **Documentation**: Changes to API routes must update OpenAPI spec at `server/public/openapi.json`

## Testing Notes

**Reliable BPP for Testing:** ABC Insurance Ltd (`abc-insurance` BPP)
- Most reliable BPP on ONDC staging network for health insurance
- Use for E2E tests, manual testing, and demo workflows
- Other BPPs (BAGIC, etc.) may return 500 errors intermittently — this is expected behavior

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Health insurance only for v1 | Focus over breadth; motor/marine/life can follow same patterns later | — Pending |
| No quote comparison | ONDC protocol doesn't standardize this; defer to v2 if protocol improves | — Pending |
| Embed protocol specs in codebase | Enables vibe-coding; Claude has context without asking | — Pending |
| E2E testing required for all endpoints | Ensures compliance and prevents regressions | — Pending |

---
*Last updated: 2026-02-02 after initialization*
