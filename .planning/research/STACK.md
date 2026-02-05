# Stack Research: ONDC Health Insurance BAP

**Research Date:** 2026-02-02
**Source:** ONDC-Official/ONDC-FIS-Specifications (branch: draft-FIS13-health-2.0.1)

## Executive Summary

The existing stack (Express + tRPC + Redis + libsodium) is fully capable of implementing the remaining health insurance flows. No new dependencies required. The main technical challenge is handling the **xinput form protocol** — a multi-step form submission pattern where BPPs provide HTML forms that BAPs must render and submit.

## Endpoint Requirements

### Select Flow
- **select**: Send selected item with form responses
- **on_select**: Receive quote details + next xinput form
- **Multi-round**: select → on_select may repeat 2-3 times (PED info → PAN/DOB → eKYC)

**Key Schema Elements:**
```yaml
message.order.items[].xinput:
  form_response:
    status: SUCCESS
    submission_id: <uuid>  # From previous on_select
```

### Init Flow
- **init**: Submit KYC/medical/nominee information
- **on_init**: Receive next form or final terms with payment link
- **Multi-round**: init → on_init may repeat 4-6 times (buyer → insured → medical → nominee → review)

**Key Schema Elements:**
```yaml
message.order.items[].xinput:
  form:
    id: "FO3"
    mime_type: text/html
    url: https://bpp.example/form/...
    resubmit: true
  required: true
```

### Confirm Flow
- **confirm**: Submit payment confirmation
- **on_confirm**: Receive policy document
- **Single round** (typically)

### Status Flow
- **status**: Query order status
- **on_status**: Receive current order state
- **Can be called anytime** after confirm

## State Management Requirements

### Transaction State Machine

```
SEARCH_INITIATED
  → SEARCH_COMPLETED (has catalog)
    → SELECT_FORM_PENDING (xinput form received)
      → SELECT_FORM_SUBMITTED
        → SELECT_COMPLETED (all select forms done)
          → INIT_FORM_PENDING
            → INIT_FORM_SUBMITTED
              → INIT_COMPLETED (payment link received)
                → CONFIRM_PENDING
                  → CONFIRMED (policy issued)
```

### Redis Keys Needed

| Key Pattern | Data | TTL |
|-------------|------|-----|
| `transaction:{txnId}` | Full transaction state | 24h |
| `transaction:{txnId}:forms` | Pending xinput forms | 24h |
| `transaction:{txnId}:quotes` | Quote details from on_select | 24h |
| `transaction:{txnId}:policy` | Policy from on_confirm | 7d |

## XInput Form Handling

### Form Structure from BPP

```yaml
xinput:
  head:
    descriptor:
      name: Customer Information
    index:
      min: 0
      cur: 0  # Current step
      max: 2  # Total steps
    headings:
      - PED Details
      - PAN & DOB Details
      - EKYC
  form:
    id: "FO3"
    mime_type: text/html
    url: https://bpp.example/form/ped_dtls?formid=FO3
    resubmit: true
    multiple_submissions: false
  required: true
```

### BAP Implementation Pattern

1. **Fetch form HTML** from `xinput.form.url`
2. **Render in iframe** or parse and re-render
3. **Capture submission** via postMessage or form interception
4. **Send next select/init** with `form_response.submission_id`

## Existing Code Patterns to Follow

### tRPC Router Pattern (from gateway.ts)
```typescript
export const gatewayRouter = router({
  select: publicProcedure
    .input(SelectRequestSchema)
    .mutation(async ({ input, ctx }) => {
      // Sign and send to BPP
      // Store in Redis
      // Return ACK
    }),
  onSelect: publicProcedure
    .input(OnSelectCallbackSchema)
    .mutation(async ({ input, ctx }) => {
      // Verify signature
      // Store quote/form in Redis
      // Return ACK
    }),
});
```

### Redis Store Pattern (from search-store.ts)
```typescript
export async function storeSelectResult(
  transactionId: string,
  result: OnSelectResponse
) {
  await redis.set(
    `transaction:${transactionId}:select`,
    JSON.stringify(result),
    'EX',
    86400
  );
}
```

## No New Dependencies Required

| Need | Solution |
|------|----------|
| Form URL fetching | Native `fetch()` |
| HTML parsing (optional) | String manipulation or skip (iframe) |
| State machine | Redis + TypeScript enums |
| Zod schemas | Derive from OpenAPI (manual) |

## Recommendations

1. **Create Zod schemas** from ONDC OpenAPI spec for all endpoints
2. **Implement transaction state machine** in dedicated module
3. **Add xinput form handling** as separate service
4. **Use existing signing patterns** from search implementation
5. **Follow existing Redis key patterns** but add form storage

---

*Stack analysis: 2026-02-02 | Source: ONDC FIS13 Health 2.0.1*
