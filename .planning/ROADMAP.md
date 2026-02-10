# Roadmap: ONDC Health Insurance BAP

## Overview

This roadmap delivers full end-to-end request traceability across BAP → Gateway → BPP using OpenTelemetry. The goal is to enable debugging any transactionId by viewing the complete request chain with timing and payloads in SigNoz (ClickHouse-backed, OTLP-native). Each phase builds on distributed tracing fundamentals: SDK initialization, auto-instrumentation, manual business logic spans, async callback correlation, and error attribution.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: SDK Foundation** - OpenTelemetry SDK installed and auto-instrumentation verified
- [x] **Phase 2: Core Instrumentation** - tRPC procedures and ONDC requests create spans with attributes
- [ ] **Phase 3: Async Callback Correlation** - Callbacks link to parent traces via transactionId
- [ ] **Phase 4: Comprehensive Coverage** - All ONDC flows instrumented with enriched attributes
- [ ] **Phase 5: Error Classification & Logging** - Error source attribution and structured logging

## Phase Details

### Phase 1: SDK Foundation
**Goal**: OpenTelemetry SDK integrated, auto-instrumentation working for HTTP/Express/Redis operations
**Depends on**: Nothing (first phase)
**Requirements**: OTEL-01, OTEL-06
**Success Criteria** (what must be TRUE):
  1. OpenTelemetry packages installed (sdk-node, api, auto-instrumentations, otlp exporter)
  2. tracing.ts exists and initializes SDK with OTLP HTTP exporter
  3. tracing.ts is imported first in server entry point
  4. Health check request creates HTTP/Express spans visible in SigNoz
  5. SigNoz UI shows service name "ondc-bap" with spans for incoming requests
  6. Redis commands (GET, SET) appear as child spans with command names
**Plans**: 3 plans

Plans:
- [x] 01-01-PLAN.md — Install OpenTelemetry packages and create tracing.ts with SDK initialization
- [x] 01-02-PLAN.md — Configure OTLP exporter, resource attributes, and span limits
- [x] 01-03-PLAN.md — Update server entry point to import tracing first, add SigNoz docker-compose, verify traces

### Phase 2: Core Instrumentation
**Goal**: tRPC procedures and ONDC client requests create manual spans with transactionId attributes
**Depends on**: Phase 1
**Requirements**: OTEL-02, OTEL-05
**Success Criteria** (what must be TRUE):
  1. tRPC tracing middleware creates spans for all procedures
  2. gateway.search creates a child span labeled "ondc.search"
  3. transactionId and messageId captured as span attributes
  4. Outgoing ONDC HTTP requests show as child spans with full request payloads
  5. HTTP client spans include full Authorization header
  6. Span hierarchy shows: HTTP request → tRPC procedure → ONDC action → HTTP client
**Plans**: 3 plans

Plans:
- [x] 02-01-PLAN.md — Add tRPC tracing middleware to publicProcedure for universal span creation
- [x] 02-02-PLAN.md — Add ondc.search manual span to gateway.search with ONDC-specific attributes
- [x] 02-03-PLAN.md — Wrap ONDCClient.send() in manual span with full payload and auth header capture

### Phase 3: Async Callback Correlation
**Goal**: ONDC callbacks (on_search) link back to their originating request traces via transactionId stored in Redis
**Depends on**: Phase 2
**Requirements**: OTEL-03, OTEL-04
**Success Criteria** (what must be TRUE):
  1. Search request stores W3C traceparent in Redis embedded in search entry
  2. on_search callback retrieves stored traceparent and creates linked span
  3. SigNoz shows on_search span linked to search span via span link and transactionId attribute
  4. Redis operations for trace storage appear as child spans with key names (already done in Phase 1)
  5. Trace context TTL is 30 minutes (embedded in search entry with extended TTL)
  6. Multiple BPP responses to same search all link to same parent trace as sibling spans
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md — Create trace context utility module and extend search store with traceparent support
- [x] 03-02-PLAN.md — Wire trace context storage into search and restoration into on_search callback

### Phase 4: Comprehensive Coverage
**Goal**: All ONDC flows (select, init, confirm, status) fully instrumented with enriched attributes
**Depends on**: Phase 3
**Requirements**: OTEL-02, OTEL-04, OTEL-05
**Success Criteria** (what must be TRUE):
  1. Select flow creates spans for select request and on_select callback
  2. Init flow creates spans for init request and on_init callback
  3. Confirm flow creates spans for confirm request and on_confirm callback
  4. Status flow creates spans for status request and on_status callback
  5. Ed25519 signing operations appear as child spans with timing
  6. ONDC-specific attributes added: ondc.action, ondc.domain, ondc.bpp_id
  7. Response payloads captured with 16KB truncation limit
**Plans**: 3 plans

Plans:
- [ ] 04-01-PLAN.md — Add tracing to select and on_select with callback correlation
- [ ] 04-02-PLAN.md — Add tracing to init/on_init and confirm/on_confirm flows
- [ ] 04-03-PLAN.md — Add signing spans and ONDC-specific span attributes

### Phase 5: Error Classification & Logging
**Goal**: Errors classified by source (BAP/gateway/BPP) and logs correlated with traces
**Depends on**: Phase 4
**Requirements**: OTEL-07, OTEL-08
**Success Criteria** (what must be TRUE):
  1. Failed spans marked with error status and exception details
  2. error.source attribute distinguishes "bap", "gateway", "bpp" failures
  3. BPP 500 errors attributed as error.source="bpp"
  4. Gateway timeout errors attributed as error.source="gateway"
  5. Validation errors attributed as error.source="bap"
  6. Console logs include traceId and spanId for correlation
  7. Structured logging library integrated with OpenTelemetry context
**Plans**: 2 plans

Plans:
- [ ] 05-01-PLAN.md — Add error classification logic to ONDC client and callback handlers
- [ ] 05-02-PLAN.md — Integrate structured logging with trace context injection

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. SDK Foundation | 3/3 | Complete | 2026-02-09 |
| 2. Core Instrumentation | 3/3 | Complete | 2026-02-09 |
| 3. Async Callback Correlation | 2/2 | Complete | 2026-02-10 |
| 4. Comprehensive Coverage | 0/3 | Not Started | — |
| 5. Error Classification & Logging | 0/2 | Not Started | — |
