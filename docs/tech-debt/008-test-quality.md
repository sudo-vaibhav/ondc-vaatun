# Tech Debt: Test Quality Improvements

**Priority**: Medium
**Category**: Testing
**Effort**: Medium

## Problem

Current E2E tests have weak assertions and limited coverage, providing false confidence in code correctness.

## Issues Identified

### 1. Tests Accept Both Success and Failure

**File: `tests/api/gateway.spec.ts:10-11`**
```typescript
// This test passes whether the API works or not
expect([200, 503]).toContain(response.status());
```

**Problem**: Test passes regardless of whether the service is working. External dependency failures are masked.

### 2. Invalid Test Data

**File: `tests/api/polling.spec.ts:19`**
```typescript
const uniqueTransactionId = `unknown-${Date.now()}-${Math.random()...}`;
```

**Problem**: Not a valid UUID, relies on lenient parsing.

### 3. Missing Edge Case Coverage

No tests for:
- Malformed ONDC requests
- Invalid signatures
- Race conditions in concurrent requests
- Timeout scenarios
- Partial response handling
- Schema validation failures

### 4. No Unit Tests

All tests are E2E integration tests. No unit tests for:
- Cryptographic functions
- Schema validation
- Store operations
- Utility functions

## Proposed Solutions

### 1. Strengthen Gateway Test Assertions

```typescript
// Better approach - test actual behavior
test.describe("Search Flow", () => {
  test("returns transaction IDs on gateway success", async ({ request }) => {
    const response = await request.post("/api/ondc/search", { data: validPayload });

    // If gateway is up, verify full success
    if (response.status() === 200) {
      const data = await response.json();
      expect(data).toHaveProperty("transactionId");
      expect(data.transactionId).toMatch(/^[0-9a-f-]{36}$/);
      expect(data).toHaveProperty("messageId");
    }

    // If gateway is down, verify graceful degradation
    if (response.status() === 502 || response.status() === 503) {
      const data = await response.json();
      expect(data).toHaveProperty("error");
      expect(data.error).toHaveProperty("code");
    }
  });

  test("returns 400 for invalid payload", async ({ request }) => {
    const response = await request.post("/api/ondc/search", {
      data: { invalid: "payload" },
    });
    expect(response.status()).toBe(400);
  });
});
```

### 2. Use Valid Test Data

```typescript
// Use proper UUIDs
import { randomUUID } from "crypto";

const validTransactionId = randomUUID();
const validMessageId = randomUUID();

// Or use a factory
function createTestContext() {
  return {
    transactionId: randomUUID(),
    messageId: randomUUID(),
    timestamp: new Date().toISOString(),
  };
}
```

### 3. Add Edge Case Tests

```typescript
// tests/api/validation.spec.ts

test.describe("Request Validation", () => {
  test("rejects missing required fields", async ({ request }) => {
    const response = await request.post("/api/ondc/search", {
      data: { message: {} }, // Missing context
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  test("rejects invalid domain", async ({ request }) => {
    const response = await request.post("/api/ondc/search", {
      data: {
        domain: "INVALID_DOMAIN",
        // ...
      },
    });
    expect(response.status()).toBe(400);
  });

  test("handles malformed JSON gracefully", async ({ request }) => {
    const response = await request.post("/api/ondc/search", {
      headers: { "Content-Type": "application/json" },
      data: "not valid json{",
    });
    expect(response.status()).toBe(400);
  });
});
```

### 4. Add Unit Tests

```typescript
// tests/unit/crypto.test.ts
import { describe, test, expect } from "vitest";
import { signMessage, verifySignature } from "@/lib/ondc/signing";

describe("Cryptographic Operations", () => {
  test("signMessage produces valid Ed25519 signature", () => {
    const message = "test message";
    const signature = signMessage(message, testPrivateKey);

    expect(signature).toMatch(/^[A-Za-z0-9+/=]+$/); // Base64
    expect(verifySignature(message, signature, testPublicKey)).toBe(true);
  });

  test("rejects tampered messages", () => {
    const message = "test message";
    const signature = signMessage(message, testPrivateKey);

    expect(verifySignature("tampered", signature, testPublicKey)).toBe(false);
  });
});
```

### 5. Add Store Unit Tests

```typescript
// tests/unit/search-store.test.ts
import { describe, test, expect, beforeEach } from "vitest";
import { SearchStore } from "@/lib/search-store";

describe("SearchStore", () => {
  let store: SearchStore;

  beforeEach(() => {
    store = new SearchStore();
  });

  test("creates entry with correct initial state", () => {
    const entry = store.createEntry("tx-1", "msg-1");
    expect(entry.status).toBe("pending");
    expect(entry.providers).toEqual([]);
  });

  test("aggregates multiple provider responses", () => {
    store.createEntry("tx-1", "msg-1");
    store.addResponse("tx-1", mockResponse1);
    store.addResponse("tx-1", mockResponse2);

    const results = store.getResults("tx-1");
    expect(results.providers).toHaveLength(2);
  });
});
```

## Test File Organization

```
tests/
├── api/                    # E2E tests (existing)
│   ├── health.spec.ts
│   ├── registry.spec.ts
│   ├── gateway.spec.ts
│   ├── polling.spec.ts
│   └── validation.spec.ts  # NEW
├── unit/                   # NEW - Unit tests
│   ├── crypto.test.ts
│   ├── search-store.test.ts
│   ├── select-store.test.ts
│   └── schemas.test.ts
└── fixtures/               # NEW - Test data
    ├── search-response.json
    ├── select-response.json
    └── factories.ts
```

## Acceptance Criteria

- [ ] All tests use valid UUIDs
- [ ] Tests distinguish success from failure cases
- [ ] Edge case tests added for validation
- [ ] Unit tests for crypto functions
- [ ] Unit tests for store operations
- [ ] Test fixtures organized in dedicated folder
- [ ] Test coverage reporting enabled
