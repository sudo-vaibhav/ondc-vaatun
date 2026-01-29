# Tech Debt: Missing Signature Verification for ONDC Callbacks

**Priority**: Critical
**Category**: Security
**Effort**: Medium
**Status**: IMPLEMENTED

## Problem

Incoming callbacks from BPPs (`on_search`, `on_select`, `on_init`, `on_confirm`) accept any response without validating the Beckn authorization signature. This violates the Beckn protocol specification and poses a security risk.

## Affected Files

- `src/app/api/ondc/on_search/route.ts`
- `src/app/api/ondc/on_select/route.ts`
- Future: `on_init`, `on_confirm` routes

## Security Impact

- **Spoofing**: Malicious actors could send fake `on_search` responses
- **Data Integrity**: No guarantee response came from legitimate BPP
- **Compliance**: Non-compliant with ONDC/Beckn security requirements

## Implementation (Completed)

### New Files Created

1. **`src/lib/ondc/verification.ts`** - Core verification utilities:
   - `parseAuthorizationHeader()` - Parses Beckn Signature header
   - `parseKeyId()` - Extracts subscriber_id from keyId
   - `lookupSubscriberKey()` - Fetches public key from registry with caching
   - `verifyEd25519Signature()` - Verifies signature using crypto module
   - `verifyBecknCallback()` - Main verification orchestrator

### Modified Files

2. **`src/lib/context.ts`** - Added new callback handler wrapper:
   - `createONDCCallbackHandler()` - New wrapper for callback routes with optional verification
   - Parses body once, passes to handler
   - Returns 401 with NACK on verification failure

3. **`src/app/api/ondc/on_search/route.ts`** - Updated to use new wrapper:
   - Uses `createONDCCallbackHandler` instead of `createONDCHandler`
   - Verification controlled by `FEATURE_VERIFY_CALLBACKS` env var

4. **`src/app/api/ondc/on_select/route.ts`** - Updated to use new wrapper:
   - Same pattern as on_search

5. **`.env.example`** - Added feature flag:
   ```env
   FEATURE_VERIFY_CALLBACKS=false
   ```

### How It Works

1. When `FEATURE_VERIFY_CALLBACKS=true`:
   - Callback routes extract Authorization header
   - Parse signature parameters (keyId, algorithm, created, expires, signature)
   - Validate timestamps (not expired, not in future)
   - Lookup sender's public key from ONDC registry (cached for 1 hour)
   - Reconstruct signing string: `(created): X\n(expires): Y\ndigest: BLAKE-512=Z`
   - Verify Ed25519 signature
   - Reject with 401 + NACK if invalid

2. When `FEATURE_VERIFY_CALLBACKS=false` (default):
   - No verification, behaves as before

### Usage

```typescript
// In callback routes (on_search, on_select, etc.)
export const POST = createONDCCallbackHandler(
  async (_request, body, { kv }) => {
    // body is already parsed
    const transactionId = body.context?.transaction_id;
    await addSearchResponse(kv, transactionId, body);
    return NextResponse.json({ message: { ack: { status: "ACK" } } });
  },
  { verifyCallback: process.env.FEATURE_VERIFY_CALLBACKS === "true" },
);
```

### Caching

Registry lookups are cached in Redis with key pattern:
- Key: `registry:pubkey:{subscriber_id}`
- TTL: 1 hour (3600 seconds)

## References

- [Beckn Protocol Auth Specification](https://developers.becknprotocol.io/docs/security/authentication)
- [ONDC Signing Guide](https://github.com/ONDC-Official/developer-docs/blob/main/docs/signing.md)

## Acceptance Criteria

- [x] Signature verification implemented for callback routes
- [x] Invalid signatures return 401 Unauthorized with NACK
- [x] Expired signatures rejected
- [x] Registry public key lookup with caching (1 hour TTL)
- [x] Feature flag to enable/disable (`FEATURE_VERIFY_CALLBACKS`)
- [ ] Unit tests for signature verification
- [ ] E2E tests with valid/invalid signatures

## Remaining Work

1. Add unit tests for `verification.ts` functions
2. Add E2E tests for callback routes with/without valid signatures
3. Apply same pattern to future `on_init`, `on_confirm` routes
