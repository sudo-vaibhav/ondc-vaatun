# Architecture Research: ONDC Health Insurance BAP

**Research Date:** 2026-02-02
**Source:** Existing codebase analysis + ONDC FIS13 specification

## Executive Summary

The existing architecture (tRPC routers + Redis stores + Tenant signing) is well-suited for the remaining flows. Main additions needed:
1. New tRPC procedures for select/init/confirm/status
2. Transaction state machine
3. XInput form orchestration
4. Frontend pages for each flow stage

## Existing Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (React)                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Home Page   │  │ Health Page │  │ Search Results Page │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└────────────────────────────┬────────────────────────────────┘
                             │ tRPC
┌────────────────────────────┴────────────────────────────────┐
│                      Server (Express)                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   tRPC Routers                       │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │    │
│  │  │ gateway  │  │ registry │  │ results  │          │    │
│  │  │ (search) │  │ (lookup) │  │ (poll)   │          │    │
│  │  └──────────┘  └──────────┘  └──────────┘          │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                     Services                         │    │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │    │
│  │  │ Tenant   │  │ ONDC     │  │ Redis    │          │    │
│  │  │ (sign)   │  │ Client   │  │ Stores   │          │    │
│  │  └──────────┘  └──────────┘  └──────────┘          │    │
│  └─────────────────────────────────────────────────────┘    │
└────────────────────────────┬────────────────────────────────┘
                             │
┌────────────────────────────┴────────────────────────────────┐
│                         Redis                                │
│  search:{txnId}  │  select:{txnId}  │  ...                  │
└─────────────────────────────────────────────────────────────┘
```

## Target Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client (React)                        │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │
│  │ Search   │ │ Select/  │ │ Init/    │ │ Confirm/ │       │
│  │ Results  │→│ Forms    │→│ KYC      │→│ Payment  │       │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │
│       ↓            ↓            ↓            ↓              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              XInput Form Handler                      │  │
│  │  (iframe renderer, form state, submission handler)    │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────────┬────────────────────────────────┘
                             │ tRPC
┌────────────────────────────┴────────────────────────────────┐
│                      Server (Express)                        │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   tRPC Routers                       │    │
│  │  gateway: search, on_search, select, on_select,     │    │
│  │           init, on_init, confirm, on_confirm,       │    │
│  │           status, on_status                         │    │
│  │  results: getSelectResults, getInitResults, ...     │    │
│  └─────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Transaction State Machine               │    │
│  │  Tracks: current_step, form_index, quote, policy    │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## New Components

### 1. Extended Gateway Router

```typescript
// server/src/trpc/routers/gateway.ts (additions)

export const gatewayRouter = router({
  // Existing
  search: ...,
  onSearch: ...,

  // New
  select: publicProcedure
    .input(SelectRequestSchema)
    .mutation(async ({ input, ctx }) => {
      const response = await ctx.ondcClient.select(input);
      await ctx.transactionStore.updateState(input.context.transaction_id, 'SELECT_SENT');
      return response;
    }),

  onSelect: publicProcedure
    .input(OnSelectCallbackSchema)
    .mutation(async ({ input, ctx }) => {
      await ctx.selectStore.store(input.context.transaction_id, input);
      await ctx.transactionStore.updateState(input.context.transaction_id, 'SELECT_RECEIVED');
      return { message: { ack: { status: 'ACK' } } };
    }),

  init: publicProcedure
    .input(InitRequestSchema)
    .mutation(...),

  onInit: publicProcedure
    .input(OnInitCallbackSchema)
    .mutation(...),

  confirm: publicProcedure
    .input(ConfirmRequestSchema)
    .mutation(...),

  onConfirm: publicProcedure
    .input(OnConfirmCallbackSchema)
    .mutation(...),

  status: publicProcedure
    .input(StatusRequestSchema)
    .mutation(...),

  onStatus: publicProcedure
    .input(OnStatusCallbackSchema)
    .mutation(...),
});
```

### 2. Transaction State Machine

```typescript
// server/src/lib/transaction-state.ts

export enum TransactionState {
  SEARCH_INITIATED = 'SEARCH_INITIATED',
  SEARCH_COMPLETED = 'SEARCH_COMPLETED',
  SELECT_SENT = 'SELECT_SENT',
  SELECT_FORM_RECEIVED = 'SELECT_FORM_RECEIVED',
  SELECT_COMPLETED = 'SELECT_COMPLETED',
  INIT_SENT = 'INIT_SENT',
  INIT_FORM_RECEIVED = 'INIT_FORM_RECEIVED',
  INIT_COMPLETED = 'INIT_COMPLETED',
  CONFIRM_SENT = 'CONFIRM_SENT',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
}

export interface TransactionContext {
  transactionId: string;
  state: TransactionState;
  bppId?: string;
  bppUri?: string;
  selectedItemId?: string;
  currentFormIndex?: number;
  totalForms?: number;
  quoteId?: string;
  policyId?: string;
}
```

### 3. XInput Form Store

```typescript
// server/src/lib/xinput-store.ts

export interface XInputForm {
  formId: string;
  url: string;
  mimeType: string;
  required: boolean;
  headings: string[];
  currentIndex: number;
  maxIndex: number;
}

export async function storeCurrentForm(
  transactionId: string,
  form: XInputForm
): Promise<void>;

export async function getCurrentForm(
  transactionId: string
): Promise<XInputForm | null>;
```

### 4. Frontend Routes

```
client/src/routes/
├── health/
│   ├── $searchId.tsx              # Search results (existing)
│   ├── select/
│   │   └── $transactionId.tsx     # Select + form flow
│   ├── init/
│   │   └── $transactionId.tsx     # Init + KYC flow
│   ├── confirm/
│   │   └── $transactionId.tsx     # Payment + confirm
│   └── policy/
│       └── $transactionId.tsx     # Policy view
```

### 5. XInput Form Component

```typescript
// client/src/components/xinput/XInputFormRenderer.tsx

interface XInputFormRendererProps {
  formUrl: string;
  formId: string;
  onSubmit: (submissionId: string) => void;
  onError: (error: Error) => void;
}

// Renders BPP form in iframe, captures submission via postMessage
```

## Data Flow

### Select Flow
```
User clicks "Get Quote"
  → Client: trpc.gateway.select.mutate({ orderId, itemId })
  → Server: Sign request, send to BPP
  → BPP: Returns ACK
  → Server: Store in Redis, return ACK

BPP sends on_select callback
  → Server: /api/trpc/gateway.onSelect
  → Server: Verify signature, store result
  → Server: Return ACK

User polls for result
  → Client: trpc.results.getSelectResults.query({ transactionId })
  → Server: Read from Redis
  → Client: Render form from xinput.form.url
```

### Form Submission Flow
```
User submits form in iframe
  → BPP receives form data directly
  → BPP generates submission_id
  → iframe posts message to parent with submission_id

Client receives submission_id
  → Client: trpc.gateway.select.mutate({
      ...,
      xinput: { form_response: { submission_id, status: 'SUCCESS' } }
    })
  → Repeat until all forms complete
```

## Integration Points

### With Existing Search Flow
- After on_search, user can navigate to select page
- Transaction ID carries through entire flow
- BPP ID/URI from search result used for subsequent calls

### With Redis
- Reuse existing connection from search-store
- Add new key patterns for select/init/confirm
- Consider using Redis hashes for transaction state

### With Tenant/Signing
- All outgoing requests use existing signing infrastructure
- All incoming callbacks verify signature (if FEATURE_VERIFY_CALLBACKS)

## Build Order

1. **Phase 1**: Select endpoints + basic UI
2. **Phase 2**: XInput form handling
3. **Phase 3**: Init endpoints + forms
4. **Phase 4**: Confirm + payment integration
5. **Phase 5**: Status + policy view

Dependencies:
- Select must work before Init
- Init must work before Confirm
- XInput handling needed for both Select and Init

---

*Architecture analysis: 2026-02-02*
