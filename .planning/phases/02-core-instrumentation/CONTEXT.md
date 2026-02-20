# Phase 2: Core Instrumentation — Discussion Context

**Date**: 2026-02-09
**Phase goal**: tRPC procedures and ONDC client requests create manual spans with transactionId attributes

## Decisions

### 1. tRPC Middleware Scope: All procedures
- Tracing middleware wraps ALL 18 tRPC procedures (health, registry, gateway, results)
- Simple universal middleware on `publicProcedure` base
- Rationale: comprehensive coverage outweighs slight noise increase

### 2. Span Attribute Depth: Full ONDC set
- Capture all available ONDC attributes on spans:
  - `ondc.transaction_id` — always present
  - `ondc.message_id` — always present
  - `ondc.action` — search, select, init, confirm, status
  - `ondc.domain` — e.g. "ONDC:FIS13"
  - `ondc.bpp_id` — present in select/init/confirm flows
  - `ondc.bpp_uri` — present in select/init/confirm flows
  - `ondc.subscriber_id` — our BAP ID
- Rationale: front-load attribute capture so Phase 4 focuses on extending to all flows, not adding attributes

### 3. Payload Capture: Metadata + full body
- Outgoing ONDC HTTP requests capture BOTH:
  - Individual metadata attributes: URL, HTTP method, status code, content-length
  - Full request body as single span attribute (JSON stringified, 16KB truncation limit from Phase 1)
- Rationale: maximum debugging value for dev/staging; 16KB limit prevents span bloat

### 4. Authorization Header: Full capture
- Capture entire Authorization header as-is in span attributes
- No truncation, no hashing, no omission
- Rationale: dev/staging environment; Ed25519 signatures aren't secret; helps debug signing issues

## Architecture Notes

### Current State (from codebase exploration)
- **Zero middleware** exists — all procedures use `publicProcedure` directly
- **19 total procedures**: health(1), registry(3), gateway(10), results(5)
- **ONDCClient.send()** is the single HTTP call point for all outbound ONDC requests
- **Singleton context**: tenant, ondcClient, kv are created once and reused
- **Express middleware stack**: CORS → health → JSON → routes → tRPC → error handler

### Gateway Router Pattern
Outbound procedures (search, select, init, confirm, status):
1. Generate transaction/message IDs (UUID v7)
2. Store entry in KV
3. Build payload with tenant config
4. Call `ondcClient.send()` → BPP/gateway
5. Return IDs

Inbound procedures (onSearch, onSelect, onInit, onConfirm, onStatus):
1. Extract transaction ID from context
2. Store response in KV
3. Return ACK

### Key Instrumentation Points
1. **tRPC middleware** — wraps every procedure call in a span
2. **ONDCClient.send()** — manual span for outbound HTTP with full payload
3. **Span hierarchy target**: HTTP request → tRPC procedure → ONDC action → HTTP client
