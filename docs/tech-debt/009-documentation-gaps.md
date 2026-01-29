# Tech Debt: Documentation Gaps

**Priority**: Low
**Category**: Documentation
**Effort**: Low-Medium

## Problem

The codebase lacks inline documentation, making it harder for new developers to understand ONDC-specific concepts and implementation details.

## Issues Identified

### 1. No JSDoc Comments on Public Functions

```typescript
// Current - no documentation
export async function createAuthorizationHeader(body: any): Promise<string> {
  // Implementation
}

// Should have JSDoc explaining:
// - What the authorization header is for
// - Format of the header
// - When to use it
```

### 2. Missing ONDC Field Explanations

ONDC-specific fields lack context:

```typescript
// What does TTL mean in this context? Format?
ttl: "PT30S"

// What are valid domain values?
domain: "ONDC:FIS13"

// What does this code mean?
code: "BUYER_FINDER_FEES_PERCENTAGE"
```

### 3. No Architecture Decision Records (ADRs)

Key decisions not documented:
- Why pre-compute shared secret at startup?
- Why use ECB mode (ONDC requirement)?
- Why passthrough in schemas?
- Why separate stores for search/select?

### 4. Missing API Examples in README

README lacks practical examples of:
- How to call each endpoint
- Expected request/response formats
- Error scenarios

## Proposed Solutions

### 1. Add JSDoc to Public Functions

```typescript
/**
 * Creates an ONDC-compliant authorization header for API requests.
 *
 * The header follows Beckn protocol specification:
 * `Signature keyId="subscriber_id|key_id|algorithm",
 *  algorithm="ed25519", created="timestamp", expires="timestamp",
 *  headers="(created) (expires) digest", signature="base64_signature"`
 *
 * @param body - The request body to sign (will be hashed with BLAKE-512)
 * @returns Base64-encoded authorization header string
 *
 * @example
 * const header = await createAuthorizationHeader({
 *   context: { ... },
 *   message: { ... }
 * });
 * // Returns: "Signature keyId=..."
 *
 * @see https://developers.becknprotocol.io/docs/security/signing
 */
export async function createAuthorizationHeader(
  body: SignableBody
): Promise<string> {
  // Implementation
}
```

### 2. Add Inline Comments for ONDC Fields

```typescript
/**
 * TTL (Time To Live) in ISO 8601 duration format.
 * PT30S = 30 seconds - how long BPPs have to respond.
 * @see https://en.wikipedia.org/wiki/ISO_8601#Durations
 */
ttl: "PT30S",

/**
 * ONDC domain identifier.
 * - ONDC:FIS13 = Financial Services (Insurance)
 * - ONDC:RET10 = Retail (Grocery)
 * - ONDC:TRV10 = Travel (Mobility)
 * @see https://ondc.org/domain-specifications
 */
domain: "ONDC:FIS13",
```

### 3. Create Architecture Decision Records

Create `docs/adr/` folder:

```markdown
# ADR-001: Pre-computed Shared Secret

## Status
Accepted

## Context
ONDC challenge decryption requires a shared secret derived from
Diffie-Hellman key exchange.

## Decision
Pre-compute shared secret at module load time rather than per-request.

## Consequences
- Faster response times (no DH computation per request)
- Requires restart to rotate keys
- Simpler code path
```

### 4. Expand README with Examples

```markdown
## API Examples

### Search for Insurance Products

```bash
curl -X POST http://localhost:3000/api/ondc/search \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "ONDC:FIS13",
    "searchType": "health",
    "insuranceType": "health_insurance",
    "city": "std:080"
  }'
```

Response:
```json
{
  "transactionId": "uuid",
  "messageId": "uuid",
  "status": "pending"
}
```
```

### 5. Create Glossary

```markdown
# ONDC Glossary

| Term | Meaning |
|------|---------|
| BAP | Buyer Application Provider - the buyer-facing app |
| BPP | Backend Provider Platform - the seller's system |
| BG | Beckn Gateway - routes messages between BAP/BPP |
| TTL | Time To Live - response deadline |
| Context | Metadata about the transaction (IDs, timestamps) |
| Message | The actual business payload |
```

## Files to Create/Update

```
docs/
├── adr/
│   ├── 001-precomputed-shared-secret.md
│   ├── 002-ecb-mode-requirement.md
│   └── 003-passthrough-schemas.md
├── GLOSSARY.md
└── API_EXAMPLES.md

README.md (update with examples section)
```

## Acceptance Criteria

- [ ] JSDoc on all public functions
- [ ] ONDC fields have inline explanations
- [ ] ADRs for key architectural decisions
- [ ] README includes API examples
- [ ] Glossary of ONDC/Beckn terms
- [ ] Code comments explain "why" not "what"
