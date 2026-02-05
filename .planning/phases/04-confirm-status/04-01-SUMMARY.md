---
phase: 04-confirm-status
plan: 01
subsystem: backend/stores
tags: [redis, confirm, status, state-management, ondc]

dependency-graph:
  requires: [03-init-flow]
  provides: [confirm-store, status-store, key-formatter-updates]
  affects: [04-02-gateway-procedures, 04-03-payment-callback]

tech-stack:
  added: []
  patterns: [redis-store, pub-sub, orderId-keyed-lookup]

key-files:
  created:
    - server/src/lib/confirm-store.ts
    - server/src/lib/status-store.ts
  modified:
    - server/src/infra/key-value/redis/key-formatter.ts

decisions:
  - id: confirm-uses-transaction-message-keys
    choice: "Confirm store keyed by transactionId+messageId (like init-store)"
    rationale: "Matches existing pattern, confirm request has both IDs"
  - id: status-uses-order-keys
    choice: "Status store keyed by orderId only"
    rationale: "Status polling starts after on_confirm provides orderId; simpler lookup"
  - id: status-24h-ttl
    choice: "24 hour TTL for status store (vs 10 min for confirm)"
    rationale: "Policy data may be accessed later; user may return next day"
  - id: policy-document-extraction
    choice: "Extract policyDocument by code='policy-doc' or mime_type='application/pdf'"
    rationale: "ONDC spec uses these markers for policy document identification"

metrics:
  duration: "4 min"
  completed: "2026-02-04"
---

# Phase 04 Plan 01: Confirm and Status Stores Summary

Redis-backed stores for confirm and status transaction state management following the established init-store pattern.

## One-Liner

Confirm-store (10 min TTL, transactionId+messageId keys) and status-store (24h TTL, orderId-only keys) with Redis state management and pub/sub notifications.

## What Was Built

### 1. Key Formatter Updates (`key-formatter.ts`)

Added CONFIRM and STATUS prefixes to KEY_PREFIXES and new functions:
- `confirmKey(transactionId, messageId)` -> `confirm:${transactionId}:${messageId}`
- `confirmChannel(transactionId, messageId)` -> `confirm:${transactionId}:${messageId}:updates`
- `statusKey(orderId)` -> `status:${orderId}`
- `statusChannel(orderId)` -> `status:${orderId}:updates`

Key difference: status uses orderId only (from on_confirm response), not transactionId+messageId.

### 2. Confirm Store (`confirm-store.ts`)

Follows init-store pattern exactly with these types:
- `ConfirmEntry`: transactionId, messageId, orderId?, itemId, providerId, bppId, bppUri, quoteId, amount, confirmTimestamp, createdAt
- `OnConfirmResponse`: context, message.order with id, status, provider, items, quote, payments, fulfillments, cancellation_terms
- `ConfirmResult`: found, transactionId, messageId, orderId?, hasResponse, paymentStatus?, paymentUrl?, orderStatus?, provider?, items?, quote?, error?

Operations:
- `createConfirmEntry()` - Create entry with 10 minute TTL
- `addConfirmResponse()` - Store response, extract orderId from message.order.id, publish to channel
- `getConfirmEntry()` / `getConfirmResponse()` - Retrieve stored data
- `subscribeToConfirm()` - Subscribe to pub/sub channel
- `getConfirmResult()` - Assemble full result with paymentStatus, paymentUrl, orderStatus extraction

### 3. Status Store (`status-store.ts`)

Simpler than confirm-store - keyed by orderId only:
- `StatusEntry`: orderId, transactionId, bppId, bppUri, statusTimestamp, createdAt
- `PolicyDocument`: descriptor (code, name, short_desc, long_desc), mime_type?, url?
- `OnStatusResponse`: context, message.order with documents (PolicyDocument[])
- `StatusResult`: found, orderId, transactionId, hasResponse, orderStatus?, paymentStatus?, fulfillmentStatus?, policyDocument?, provider?, items?, quote?, payments?, fulfillments?, documents?, error?

Operations:
- `createStatusEntry()` - Create entry with 24 hour TTL
- `addStatusResponse()` - Store response, publish to channel
- `getStatusEntry()` / `getStatusResponse()` - Retrieve stored data
- `subscribeToStatus()` - Subscribe to pub/sub channel
- `getStatusResult()` - Assemble result with policyDocument extraction by code or mime_type

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Confirm keyed by transactionId+messageId | Matches init-store pattern; confirm request has both IDs |
| Status keyed by orderId only | Status polling starts after on_confirm provides orderId; simpler lookup |
| Status uses 24h TTL | Policy data may be accessed later; user may return next day |
| Policy document extraction by code or mime_type | ONDC spec uses `code: "policy-doc"` or `mime_type: "application/pdf"` markers |

## Commits

| Hash | Message |
|------|---------|
| bcf5de8 | feat(04-01): add confirm and status key formatters |
| d71f04b | feat(04-01): create confirm-store.ts |
| 71868c3 | feat(04-01): create status-store.ts |

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

**Ready for 04-02-PLAN.md (Gateway Procedures)**

Dependencies satisfied:
- [x] confirm-store exports createConfirmEntry, addConfirmResponse, getConfirmResult
- [x] status-store exports createStatusEntry, addStatusResponse, getStatusResult
- [x] keyFormatter exports confirm, confirmChannel, status, statusChannel

Next plan will add:
- gateway.confirm procedure using createConfirmEntry
- gateway.onConfirm callback using addConfirmResponse
- gateway.status procedure using createStatusEntry
- gateway.onStatus callback using addStatusResponse
- results.getConfirmResults using getConfirmResult
- results.getStatusResults using getStatusResult
