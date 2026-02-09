# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-09)

**Core value:** Enable rapid implementation of ONDC health insurance features through rich embedded protocol context
**Current focus:** Milestone v2.0 — Observability & Traceability

## Current Position

Phase: 1 - SDK Foundation (3 plans total)
Plan: 01-01 complete, 01-02 and 01-03 remaining
Status: In progress
Last activity: 2026-02-09 — Completed 01-01-PLAN.md (OpenTelemetry packages and tracing module)

Progress: [█░░░░░░░░░] 7% (1/14 plans complete)

## v2.0 Milestone Overview

**Goal:** Full end-to-end request traceability across BAP → Gateway → BPP using OpenTelemetry

**Target features:**
- Distributed traces for all ONDC protocol operations
- transactionId-based correlation across async callbacks
- Full payload capture with timing data
- OTLP export to SigNoz (ClickHouse-backed)
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
- SigNoz as trace backend (ClickHouse storage, OTLP-native, local Docker)
- Full payload logging (no PII redaction for now)
- Server-side tracing only (frontend deferred)
- transactionId as correlation key for traces
- HTTP exporter over gRPC (simpler, fewer deps)
- Programmatic config (tracing.ts) over --require flag
- 16KB payload truncation limit to prevent span bloat
- Auto-instrumentation for HTTP/Express/ioredis
- Manual spans for tRPC procedures and ONDC business logic
- Disable FS/DNS instrumentation to reduce trace noise (01-01)
- Configure ioredis to capture Redis key names for debugging (01-01)
- Optional OTEL env vars with sensible defaults (localhost:4831, service name "ondc-bap") (01-01)

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
Stopped at: Completed 01-01-PLAN.md
Resume file: .planning/phases/01-sdk-foundation/01-02-PLAN.md
Next step: Execute plan 01-02 (SigNoz setup documentation) or continue with plan 01-03
