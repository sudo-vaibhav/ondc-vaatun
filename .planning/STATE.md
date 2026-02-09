# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-09)

**Core value:** Enable rapid implementation of ONDC health insurance features through rich embedded protocol context
**Current focus:** Milestone v2.0 — Observability & Traceability

## Current Position

Phase: 2 - Core Instrumentation (3 plans total)
Plan: 3 of 3 complete (02-01, 02-02, 02-03)
Status: Phase complete
Last activity: 2026-02-09 — Completed 02-02-PLAN.md (Add ONDC search span)

Progress: [█████░░░░░] 36% (5/14 plans complete)

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
- Use port range 4830-4836 for SigNoz services to avoid conflicts (01-02)
- HTTP OTLP on port 4831 (container 4318) for BAP trace export (01-02)
- 72h trace retention in ClickHouse for local development (01-02)
- Separate OTel collector config file mounted as Docker volume (01-02)
- Tracing import placed as first line before all other imports (critical for auto-instrumentation) (01-03)
- Tracer name "ondc-bap-trpc" version "0.1.0" for tRPC-specific spans (02-01)
- Span naming: trpc.{type}.{path} for easy filtering by procedure type (02-01)
- Applied tracing middleware to publicProcedure base - all procedures inherit automatically (02-01)
- Capture full Authorization header without truncation (CONTEXT.md decision 4) (02-03)
- Serialize body once and reuse for both fetch and span attribute (02-03)
- Use numeric literals for SpanStatusCode enum to avoid runtime import (02-03)
- sendWithAck inherits tracing by delegating to send() (02-03)
- Use startActiveSpan for ONDC business logic spans to enable child span propagation via AsyncLocalStorage (02-02)
- Capture ONDC attributes at span creation time (immediately after generating IDs) (02-02)
- Search procedure as prototype for Phase 4 extension to all gateway procedures (02-02)

### Pending Todos

None yet.

### Blockers/Concerns

**Known risks from research (PITFALLS.md):**
1. ✅ ESM import order violation - RESOLVED (01-03: tracing.ts is first import)
2. tRPC context loss - may need custom middleware for AsyncLocalStorage
3. Async webhook trace propagation - requires Redis-based correlation
4. Large ONDC payloads - need truncation to prevent span drops
5. ✅ Redis instrumentation - RESOLVED (01-01: ioredis configured to capture keys)

## Session Continuity

Last session: 2026-02-09 12:38:52Z
Stopped at: Completed 02-02-PLAN.md (Add ONDC search span)
Resume file: None
Next step: Phase 2 complete. Ready for Phase 3 (Transaction Context Propagation)
