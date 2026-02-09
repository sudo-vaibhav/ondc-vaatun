# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-09)

**Core value:** Enable rapid implementation of ONDC health insurance features through rich embedded protocol context
**Current focus:** Milestone v2.0 — Observability & Traceability

## Current Position

Phase: 1 - SDK Foundation
Plan: —
Status: Ready to plan
Last activity: 2026-02-09 — Roadmap created for v2.0

Progress: [░░░░░░░░░░] 0% (0/14 plans complete)

## v2.0 Milestone Overview

**Goal:** Full end-to-end request traceability across BAP → Gateway → BPP using OpenTelemetry

**Target features:**
- Distributed traces for all ONDC protocol operations
- transactionId-based correlation across async callbacks
- Full payload capture with timing data
- OTLP export to Jaeger/Grafana Tempo
- Error source attribution (BAP/gateway/BPP)

**Total phases:** 5
**Total plans:** 14
**Estimated duration:** 12-20 hours (based on research)

## v1.0 Performance Metrics (archived)

- Total plans completed: 19
- Average duration: 5.4 min
- Total execution time: 1.88 hours

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Key decisions from v1.0 affecting v2.0 work:

- Response schemas use z.looseObject() for BPP passthrough - Allow extra fields
- Request schemas use z.object() for strict validation - Control outgoing payloads
- ABC Insurance is reliable test BPP - Use for E2E and manual testing
- Init/confirm REST API routes follow same pattern as select (validation → store → call BPP → return)

### v2.0 Decisions

- OpenTelemetry (OTLP) for vendor-neutral tracing
- Full payload logging (no PII redaction for now)
- Server-side tracing only (frontend deferred)
- transactionId as correlation key for traces
- HTTP exporter over gRPC (simpler, fewer deps)
- Programmatic config (tracing.ts) over --require flag
- 16KB payload truncation limit to prevent span bloat
- Auto-instrumentation for HTTP/Express/ioredis
- Manual spans for tRPC procedures and ONDC business logic

### Pending Todos

None yet.

### Blockers/Concerns

**Known risks from research (PITFALLS.md):**
1. ESM import order violation - tracing.ts MUST be first import
2. tRPC context loss - may need custom middleware for AsyncLocalStorage
3. Async webhook trace propagation - requires Redis-based correlation
4. Large ONDC payloads - need truncation to prevent span drops
5. Redis instrumentation - may need config to capture key names

## Session Continuity

Last session: 2026-02-09
Stopped at: Roadmap creation complete
Resume file: .planning/ROADMAP.md
Next step: Run `/gsd:plan-phase 1` to start Phase 1: SDK Foundation
