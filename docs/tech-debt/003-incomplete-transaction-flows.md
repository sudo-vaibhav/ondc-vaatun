# Tech Debt: Incomplete Beckn Transaction Flows

**Priority**: High
**Category**: Feature Gap
**Effort**: High

## Problem

The Beckn protocol transaction cycle is incomplete. Only `search` and `select` flows are implemented. `init` and `confirm` flows are missing, preventing end-to-end order completion.

## Current State

| Flow | Request Route | Callback Route | Results Route | Status |
|------|---------------|----------------|---------------|--------|
| Search | ✅ `/api/ondc/search` | ✅ `/api/ondc/on_search` | ✅ `/api/ondc/search-results` | Complete |
| Select | ✅ `/api/ondc/select` | ✅ `/api/ondc/on_select` | ✅ `/api/ondc/select-results` | Complete |
| Init | ❌ Missing | ❌ Missing | ❌ Missing | Not Started |
| Confirm | ❌ Missing | ❌ Missing | ❌ Missing | Not Started |

## Required Implementation

### Init Flow

Purpose: Initialize order with customer details and billing/shipping addresses

**Routes needed**:
- `POST /api/ondc/init` - Send init request to BPP
- `POST /api/ondc/on_init` - Receive init callback from BPP
- `GET /api/ondc/init-results` - Poll for init results

**Key data**:
- Customer billing info
- Shipping/fulfillment details
- Payment terms
- Quote confirmation

### Confirm Flow

Purpose: Confirm the order and trigger fulfillment

**Routes needed**:
- `POST /api/ondc/confirm` - Send confirm request to BPP
- `POST /api/ondc/on_confirm` - Receive confirm callback from BPP
- `GET /api/ondc/confirm-results` - Poll for confirmation results

**Key data**:
- Payment details
- Order confirmation
- Fulfillment tracking info

## Files to Create

```
src/app/api/ondc/
├── init/
│   ├── route.ts
│   └── payload.ts
├── on_init/
│   └── route.ts
├── init-results/
│   └── route.ts
├── confirm/
│   ├── route.ts
│   └── payload.ts
├── on_confirm/
│   └── route.ts
└── confirm-results/
    └── route.ts

src/lib/
├── init-store.ts
└── confirm-store.ts
```

## OpenAPI Updates Required

Add to `/public/openapi.json`:
- Init request/response schemas
- Confirm request/response schemas
- All 6 new endpoints with documentation

## E2E Tests Required

Add to `tests/api/`:
- `init.spec.ts` - Init flow tests
- `confirm.spec.ts` - Confirm flow tests
- Update `polling.spec.ts` for init/confirm polling

## Acceptance Criteria

- [ ] Init flow fully implemented and tested
- [ ] Confirm flow fully implemented and tested
- [ ] OpenAPI documentation updated
- [ ] E2E tests passing
- [ ] End-to-end order placement working
