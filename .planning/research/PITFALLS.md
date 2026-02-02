# Pitfalls Research: ONDC Health Insurance BAP

**Research Date:** 2026-02-02
**Source:** ONDC GitHub discussions, error codes, protocol analysis

## Executive Summary

ONDC implementations commonly fail on: signature verification, context field consistency, xinput form handling, and payment flow integration. Health insurance adds complexity with multi-step forms and PED declarations.

## Critical Pitfalls

### 1. Context Field Inconsistency

**Problem:** Every request in a transaction must have matching context fields. Changing `bap_id`, `bpp_id`, `transaction_id`, or `domain` mid-flow causes rejection.

**Symptoms:**
- BPP returns NACK
- Error: "Context mismatch"
- Silent failures

**Prevention:**
```typescript
// Store context from first successful on_search
const baseContext = {
  domain: 'ONDC:FIS13',
  bap_id: env.SUBSCRIBER_ID,
  bap_uri: env.SUBSCRIBER_URL,
  bpp_id: onSearchResponse.context.bpp_id,
  bpp_uri: onSearchResponse.context.bpp_uri,
  transaction_id: originalTransactionId,
  // message_id changes per request
  // timestamp changes per request
};

// Reuse for all subsequent requests
const selectContext = {
  ...baseContext,
  action: 'select',
  message_id: uuid(),
  timestamp: new Date().toISOString(),
};
```

**Phase to Address:** Select implementation (Phase 1)

---

### 2. XInput Form Submission ID Mismatch

**Problem:** The `submission_id` in select/init request must exactly match what the BPP's form returned. Typos or UUID generation on BAP side causes rejection.

**Symptoms:**
- BPP returns "Invalid submission"
- Form appears to hang
- Infinite form loop

**Prevention:**
```typescript
// WRONG: Generating our own ID
const formResponse = {
  status: 'SUCCESS',
  submission_id: uuid(), // BAD!
};

// RIGHT: Use exactly what BPP's form returned
const formResponse = {
  status: 'SUCCESS',
  submission_id: messageFromIframe.submissionId, // From postMessage
};
```

**Phase to Address:** XInput form handling (Phase 2)

---

### 3. Form Index Tracking

**Problem:** BPP provides `xinput.head.index.cur` and `xinput.head.index.max`. BAP must track which form step user is on and not skip steps.

**Symptoms:**
- "Invalid form sequence" errors
- Unexpected form repeats
- State machine confusion

**Prevention:**
```typescript
interface FormProgress {
  currentIndex: number;  // From xinput.head.index.cur
  maxIndex: number;      // From xinput.head.index.max
  headings: string[];    // From xinput.head.headings
}

// Validate before allowing submission
function canSubmitForm(progress: FormProgress, attemptedIndex: number): boolean {
  return attemptedIndex === progress.currentIndex;
}
```

**Phase to Address:** XInput form handling (Phase 2)

---

### 4. TTL Expiry

**Problem:** ONDC requests have TTL (typically P24H = 24 hours). If user abandons flow and returns later, transaction may be expired.

**Symptoms:**
- BPP returns "Transaction expired"
- Stale data in Redis
- User confusion

**Prevention:**
```typescript
// Check TTL before any operation
const transaction = await getTransaction(transactionId);
const ttlExpiry = new Date(transaction.createdAt);
ttlExpiry.setHours(ttlExpiry.getHours() + 24);

if (new Date() > ttlExpiry) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Transaction expired. Please start a new search.',
  });
}
```

**Phase to Address:** All phases (utility function)

---

### 5. Payment Gateway Integration

**Problem:** on_init provides payment URL. User must complete payment on BPP's gateway, then BAP must send confirm with correct payment reference.

**Symptoms:**
- Payment succeeds but policy not issued
- Double payments
- Lost transactions

**Prevention:**
```typescript
// 1. Store payment URL from on_init
const paymentUrl = onInitResponse.message.order.payments[0].url;
const paymentId = onInitResponse.message.order.payments[0].id;

// 2. Redirect user to payment gateway with return URL
const returnUrl = `${bapUrl}/payment-callback?txn=${transactionId}`;
window.location.href = `${paymentUrl}&return_url=${encodeURIComponent(returnUrl)}`;

// 3. On callback, verify payment status before confirm
// 4. Include payment reference in confirm request
```

**Phase to Address:** Confirm flow (Phase 4)

---

### 6. Missing ACK Handling

**Problem:** If BAP doesn't return proper ACK to callbacks, BPP may retry or mark transaction as failed.

**Symptoms:**
- Duplicate callbacks
- Transaction stuck in pending
- BPP timeout errors

**Prevention:**
```typescript
// Always return ACK immediately, process async
app.post('/api/trpc/gateway.onSelect', async (req, res) => {
  // Validate signature first
  if (!verifySignature(req)) {
    return res.json({
      message: { ack: { status: 'NACK' } },
      error: { code: '401', message: 'Invalid signature' }
    });
  }

  // Queue for processing, return ACK immediately
  await queue.add('process-on-select', req.body);

  return res.json({
    message: { ack: { status: 'ACK' } }
  });
});
```

**Phase to Address:** All callback handlers

---

### 7. Health Insurance Specific: PED Declaration

**Problem:** Pre-Existing Disease declarations are legally binding. If user skips or lies, claim may be rejected later. BAP must ensure user acknowledges this.

**Symptoms:**
- Claims rejected months later
- User complaints
- Legal issues

**Prevention:**
```typescript
// When rendering PED form, add clear disclaimer
const PEDFormWrapper = ({ children }) => (
  <div>
    <Alert variant="warning">
      <AlertTitle>Important: Pre-Existing Disease Declaration</AlertTitle>
      <AlertDescription>
        You must declare all existing health conditions. Failure to disclose
        may result in claim rejection.
      </AlertDescription>
    </Alert>
    {children}
    <Checkbox required>
      I confirm the above information is true and complete
    </Checkbox>
  </div>
);
```

**Phase to Address:** XInput form handling (Phase 2)

---

### 8. Callback URL Mismatch

**Problem:** BPP sends callbacks to `bap_uri` from context. If this doesn't match the actual endpoint or is unreachable, callbacks are lost.

**Symptoms:**
- on_* callbacks never arrive
- Transaction stuck waiting
- Works locally, fails in production

**Prevention:**
```typescript
// Ensure bap_uri in context matches actual endpoint
const bapUri = process.env.SUBSCRIBER_URL;

// Verify endpoint is reachable
// In dev: use ngrok and ensure tunnel is active
// In prod: verify DNS and SSL

// Log callback receipts for debugging
app.use('/api/trpc/gateway.on*', (req, res, next) => {
  console.log(`Callback received: ${req.path}`, {
    transactionId: req.body?.context?.transaction_id,
    action: req.body?.context?.action,
  });
  next();
});
```

**Phase to Address:** All phases (infrastructure)

---

## Error Codes Reference

| Code | Meaning | Common Cause |
|------|---------|--------------|
| 20001 | Invalid signature | Wrong key or signing algorithm |
| 20002 | Invalid request | Schema validation failed |
| 30001 | Provider not found | Wrong bpp_id |
| 30002 | Item not found | Item ID changed or expired |
| 40001 | Business error | Check error.message for details |
| 50001 | Internal error | BPP issue, retry |

## Checklist Before Each Phase

- [ ] Context fields consistent with search response
- [ ] TTL checked before operations
- [ ] Signature verification enabled for callbacks
- [ ] ACK returned immediately on callbacks
- [ ] Error responses include proper ONDC error codes
- [ ] Redis keys have appropriate TTL
- [ ] Logs include transaction_id for debugging

---

*Pitfalls analysis: 2026-02-02 | Source: ONDC FIS13 spec + GitHub discussions*
