# ONDC Health Insurance BAP

## What This Is

A consumer-facing Buyer App Platform (BAP) for purchasing health insurance through the ONDC network. Users search for health insurance products, select a plan, complete KYC, pay, and receive their policy — all via ONDC's open protocol. The codebase is designed to be "vibe-codable" — Claude can implement any endpoint or page with minimal guidance because the ONDC protocol context is embedded.

## Core Value

**Enable rapid implementation of ONDC health insurance features through rich embedded protocol context.** When given a command like "implement the /init endpoint", Claude should have everything needed — protocol specs, existing patterns, and domain knowledge — to build it correctly without back-and-forth.

## Requirements

### Validated

<!-- Shipped and confirmed working. -->

- ✓ **INFRA-01**: Express + tRPC server with type-safe API layer — v1.0
- ✓ **INFRA-02**: Redis-based state management for transactions — v1.0
- ✓ **INFRA-03**: Ed25519 signing and ONDC authorization headers — v1.0
- ✓ **INFRA-04**: Tenant entity with cryptographic operations — v1.0
- ✓ **INFRA-05**: ONDC registry lookup and subscribe operations — v1.0
- ✓ **UI-01**: Home page with insurance category cards — v1.0
- ✓ **SEARCH-01**: Health insurance search flow (gateway.search) — v1.0
- ✓ **SEARCH-02**: on_search callback handler with Redis storage — v1.0
- ✓ **SEARCH-03**: Health insurance product listing page — v1.0
- ✓ **SELECT-01**: User can select a health insurance product and get detailed quote — v1.0
- ✓ **SELECT-02**: on_select callback properly persists quote details — v1.0
- ✓ **SELECT-03**: Quote display page shows coverage, premium, terms — v1.0
- ✓ **INIT-01**: User can enter KYC details (personal info, nominees, medical history) — v1.0
- ✓ **INIT-02**: init request sent to BPP with proper payload structure — v1.0
- ✓ **INIT-03**: on_init callback captures final terms and payment link — v1.0
- ✓ **INIT-04**: KYC form page with validation and submission — v1.0
- ✓ **CONFIRM-01**: User can confirm order after reviewing final terms — v1.0
- ✓ **CONFIRM-02**: confirm request triggers payment flow — v1.0
- ✓ **CONFIRM-03**: on_confirm callback captures policy document — v1.0
- ✓ **CONFIRM-04**: Payment/confirmation page — v1.0
- ✓ **STATUS-01**: User can check policy status post-purchase — v1.0
- ✓ **STATUS-02**: status/on_status endpoints implemented — v1.0
- ✓ **STATUS-03**: Policy status page — v1.0
- ✓ **CONTEXT-01**: ONDC FIS13 health insurance specs embedded — v1.0
- ✓ **CONTEXT-02**: Example payloads and flow diagrams accessible — v1.0
- ✓ **CONTEXT-03**: Pattern documentation for ONDC flows — v1.0
- ✓ **TEST-01**: E2E tests for each endpoint — v1.0
- ✓ **TEST-02**: Protocol compliance validation in test suite — v1.0

### Active

<!-- Current scope: v2.0 Observability & Traceability -->

- [ ] **OTEL-01**: OpenTelemetry SDK integrated into Express server
- [ ] **OTEL-02**: Every outgoing ONDC request (search, select, init, confirm, status) creates a trace span with full payload
- [ ] **OTEL-03**: Every callback (on_search, on_select, on_init, on_confirm, on_status) linked to parent trace via transactionId
- [ ] **OTEL-04**: Internal operations (Redis reads/writes, signing) visible as child spans
- [ ] **OTEL-05**: HTTP headers, request/response bodies, and timing captured in span attributes
- [ ] **OTEL-06**: OTLP exporter configured for vendor-neutral backend export
- [ ] **OTEL-07**: Structured logging with transactionId correlation
- [ ] **OTEL-08**: Error classification — distinguish BAP errors, gateway errors, and BPP errors

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- Frontend/browser tracing — Server-side first; frontend tracing deferred
- Custom dashboard UI — Use SigNoz (ClickHouse-backed, accepts OTLP natively)
- PII redaction in traces — Full payloads needed for debugging; revisit for production
- Metrics/alerting — Focus on tracing first; metrics can layer on top later
- Quote comparison page — ONDC protocol doesn't standardize comparison
- Motor/Marine/Life insurance — Health only for now
- User authentication — Public prototype; auth deferred
- Policy renewal/claims flows — Purchase flow only

## Current Milestone: v2.0 Observability & Traceability

**Goal:** Full end-to-end request traceability across BAP → Gateway → BPP using OpenTelemetry, so any transactionId can be traced through the complete ONDC flow with timing and payloads.

**Target features:**
- OpenTelemetry instrumentation for all ONDC protocol operations
- transactionId-based trace correlation across outgoing requests and async callbacks
- Full payload capture (headers, bodies, timing) in span attributes
- OTLP export to SigNoz (ClickHouse-backed, OTLP-native)
- Structured logging with trace context
- Error classification (BAP vs gateway vs BPP failures)

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
| Health insurance only for v1 | Focus over breadth; motor/marine/life can follow same patterns later | ✓ Good |
| No quote comparison | ONDC protocol doesn't standardize this; defer to v2 if protocol improves | ✓ Good |
| Embed protocol specs in codebase | Enables vibe-coding; Claude has context without asking | ✓ Good |
| E2E testing required for all endpoints | Ensures compliance and prevents regressions | ✓ Good |
| OpenTelemetry (OTLP) for tracing | Vendor-neutral; export to Jaeger, Tempo, Datadog without code changes | — Pending |
| Full payload logging | Needed for debugging ONDC flows; PII redaction deferred to production hardening | — Pending |
| Server-side tracing only for v2.0 | Frontend tracing adds complexity; server traces cover the critical path | — Pending |
| transactionId as correlation key | ONDC protocol already threads this through all requests in a flow | — Pending |

---
*Last updated: 2026-02-09 after milestone v2.0 start*
