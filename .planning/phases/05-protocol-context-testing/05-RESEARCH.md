# Phase 5: Protocol Context & Testing - Research

**Researched:** 2026-02-04
**Domain:** Protocol documentation and E2E API testing
**Confidence:** HIGH

## Summary

Phase 5 embeds ONDC FIS13 health insurance protocol specifications directly in the codebase and establishes comprehensive E2E test coverage for all transaction flows (select, init, confirm, status). This phase enables "vibe-coding" where developers have immediate access to authoritative examples and schemas, reducing reliance on external documentation during implementation.

The research covers three core areas:
1. **Protocol Documentation Structure** - How to organize and embed ONDC FIS13 specifications from GitHub as reference material
2. **Zod Schema Patterns** - Best practices for defining strict request schemas and loose response schemas for ONDC protocol compliance
3. **E2E Testing Patterns** - Comprehensive flow testing strategies for async callback APIs with polling mechanisms

The standard approach for 2026 is to store protocol specs as YAML files in a dedicated `/docs/protocol/` directory, define strict Zod schemas using Zod 4's `z.object()` for requests and `z.looseObject()` for responses, and write flow-based E2E tests that verify complete user journeys from API call through callback to polling result.

**Primary recommendation:** Fetch ONDC FIS13 health insurance examples from GitHub API into `/docs/protocol/ondc/fis13/health/`, create comprehensive Zod schemas in shared location for reuse, and write flow integration tests that mirror real user journeys rather than isolated endpoint tests.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zod | 4.x | Runtime schema validation | TypeScript-first, zero dependencies, infers static types, widely adopted for API validation |
| Playwright | 1.58+ | E2E testing framework | Built-in API testing, auto-waiting, supports request interception, unified UI/API testing |
| GitHub CLI (`gh`) | Latest | Protocol spec fetching | Official GitHub tool, base64 decode built-in, direct API access for ONDC specs |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| js-yaml | 4.x | YAML parsing | If converting fetched YAML specs to JSON programmatically |
| @types/node | Latest | Node.js types | For crypto.randomUUID() and other Node APIs in tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zod | Yup | Yup has larger bundle size, less TypeScript integration, Zod preferred for 2026 |
| Playwright | Cypress | Cypress doesn't support native request context API, Playwright better for API testing |
| GitHub CLI | Direct API calls | More verbose, requires manual base64 decode, gh CLI is simpler |

**Installation:**
```bash
# Already installed in project
# Zod: pnpm add zod
# Playwright: pnpm add -D @playwright/test
# GitHub CLI: brew install gh (or download from GitHub)
```

## Architecture Patterns

### Recommended Protocol Documentation Structure
```
docs/
├── protocol/                    # All protocol specs
│   └── ondc/                   # ONDC-specific protocols
│       └── fis13/              # Financial services domain
│           └── health/         # Health insurance (version 2.0.1)
│               ├── README.md   # Overview and links
│               ├── schemas/    # Full OpenAPI schema
│               │   └── build.yaml
│               └── examples/   # Request/response examples
│                   ├── select/
│                   │   ├── select-request-personal-info.yaml
│                   │   ├── select-request-ped-info.yaml
│                   │   └── select-request-pan-dob-info.yaml
│                   ├── on_select/
│                   │   └── on_select-request-ped-info.yaml
│                   ├── init/
│                   │   ├── init-request-buyer-info.yaml
│                   │   └── init-request-medical-info.yaml
│                   ├── on_init/
│                   ├── confirm/
│                   │   ├── confirm-request.yaml
│                   │   └── confirm-request-renewal.yaml
│                   ├── on_confirm/
│                   ├── status/
│                   │   └── status-request.yaml
│                   └── on_status/
```

### Pattern 1: Fetching Protocol Specs
**What:** Use GitHub CLI to fetch ONDC FIS13 examples directly from official repository
**When to use:** During setup phase, or when updating to new protocol version
**Example:**
```bash
# Source: CLAUDE.md section "Accessing ONDC FIS Specifications via GitHub API"

# 1. List available example directories
gh api "repos/ONDC-Official/ONDC-FIS-Specifications/contents/api/components/examples/health-insurance?ref=draft-FIS13-health-2.0.1" --jq '.[].name'

# 2. Fetch specific example (e.g., select request)
gh api "repos/ONDC-Official/ONDC-FIS-Specifications/contents/api/components/examples/health-insurance/select/select-request-personal-info.yaml?ref=draft-FIS13-health-2.0.1" --jq '.content' | base64 -d > docs/protocol/ondc/fis13/health/examples/select/select-request-personal-info.yaml

# 3. Fetch full OpenAPI schema
gh api "repos/ONDC-Official/ONDC-FIS-Specifications/contents/api/build/build.yaml?ref=draft-FIS13-health-2.0.1" --jq '.content' | base64 -d > docs/protocol/ondc/fis13/health/schemas/build.yaml
```

### Pattern 2: Zod Schema Organization
**What:** Define shared Zod schemas for ONDC protocol types, using strict validation for requests and loose validation for responses
**When to use:** For all tRPC procedures interacting with ONDC protocol
**Example:**
```typescript
// Source: Current codebase pattern + Zod 4 migration guide (https://zod.dev/v4/changelog)
// Location: server/src/lib/ondc/schemas.ts

import { z } from "zod";

// Context schema (used in all ONDC messages) - loose for responses
export const ONDCContextSchema = z.looseObject({
  domain: z.string(),
  action: z.string(),
  bap_id: z.string(),
  bap_uri: z.string(),
  bpp_id: z.string().optional(),
  bpp_uri: z.string().optional(),
  transaction_id: z.string(),
  message_id: z.string(),
  timestamp: z.string(),
  ttl: z.string(),
  version: z.string(),
  location: z.looseObject({
    country: z.looseObject({ code: z.string() }),
    city: z.looseObject({ code: z.string() }),
  }),
});

// Error schema (used in callback responses)
export const ONDCErrorSchema = z.looseObject({
  type: z.string(),
  code: z.string(),
  message: z.string(),
});

// Quote schema (from on_select, on_init responses)
export const ONDCQuoteSchema = z.looseObject({
  id: z.string().optional(),
  price: z.looseObject({
    currency: z.string(),
    value: z.string(),
  }),
  breakup: z.array(
    z.looseObject({
      title: z.string(),
      price: z.looseObject({
        currency: z.string(),
        value: z.string(),
      }),
    })
  ).optional(),
  ttl: z.string().optional(),
});

// Select request schema (strict - what we send)
export const SelectRequestSchema = z.object({
  transactionId: z.uuid(),
  bppId: z.string(),
  bppUri: z.url(),
  providerId: z.string(),
  itemId: z.string(),
  parentItemId: z.string(),
  xinputFormId: z.string().optional(),
  xinputSubmissionId: z.string().optional(),
  addOns: z.array(
    z.object({
      id: z.string(),
      quantity: z.number().int().positive(),
    })
  ).optional(),
});

// on_select response schema (loose - what we receive)
export const OnSelectResponseSchema = z.looseObject({
  context: ONDCContextSchema,
  message: z.looseObject({
    order: z.looseObject({
      provider: z.looseObject({
        id: z.string(),
        descriptor: z.looseObject({
          name: z.string(),
          images: z.array(z.looseObject({ url: z.string() })).optional(),
        }).optional(),
      }),
      items: z.array(z.any()),
      quote: ONDCQuoteSchema,
      xinput: z.looseObject({
        form: z.looseObject({ url: z.string() }).optional(),
      }).optional(),
    }),
  }).optional(),
  error: ONDCErrorSchema.optional(),
});
```

### Pattern 3: E2E Flow Testing
**What:** Test complete user flows from initial API call through callback to polling result, not individual endpoints in isolation
**When to use:** For all ONDC transaction flows (search→on_search, select→on_select, init→on_init, confirm→on_confirm, status→on_status)
**Example:**
```typescript
// Source: tests/api/polling.spec.ts + Playwright best practices (https://www.browserstack.com/guide/playwright-best-practices)

test.describe("Select Flow Integration", () => {
  test("select endpoint returns messageId, on_select stores quote, polling retrieves it", async ({ request }) => {
    const transactionId = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    // Step 1: Call select endpoint (may fail to reach BPP, that's OK)
    const selectResponse = await request.post("/api/ondc/select", {
      data: {
        transactionId,
        bppId: "abc-insurance.ondc.org",
        bppUri: "https://abc-insurance.ondc.org/api/ondc",
        providerId: "P1",
        itemId: "I1",
        parentItemId: "I1",
      },
    });

    // Accept 200 (success) or 503 (BPP unreachable) - both valid
    expect([200, 503].includes(selectResponse.status())).toBe(true);

    if (selectResponse.status() === 503) {
      // BPP unreachable, skip rest of test
      return;
    }

    const selectData = await selectResponse.json();
    expect(selectData).toHaveProperty("messageId");
    const { messageId } = selectData;

    // Step 2: Simulate on_select callback from BPP
    const onSelectResponse = await request.post("/api/ondc/on_select", {
      data: {
        context: {
          transaction_id: transactionId,
          message_id: messageId,
          bpp_id: "abc-insurance.ondc.org",
          timestamp: new Date().toISOString(),
        },
        message: {
          order: {
            provider: { id: "P1", descriptor: { name: "ABC Insurance" } },
            items: [{ id: "I1" }],
            quote: {
              price: { currency: "INR", value: "15000.00" },
              breakup: [
                { title: "Base Premium", price: { currency: "INR", value: "12000.00" } },
                { title: "GST", price: { currency: "INR", value: "3000.00" } },
              ],
            },
          },
        },
      },
    });

    expect(onSelectResponse.status()).toBe(200);
    const onSelectData = await onSelectResponse.json();
    expect(onSelectData.message.ack.status).toBe("ACK");

    // Step 3: Poll for results - should return the quote
    const pollResponse = await request.get(
      `/api/ondc/select-results?transaction_id=${transactionId}&message_id=${messageId}`
    );

    expect(pollResponse.status()).toBe(200);
    const pollData = await pollResponse.json();
    expect(pollData.found).toBe(true);
    expect(pollData.hasResponse).toBe(true);
    expect(pollData.quote).toBeDefined();
    expect(pollData.quote.price.value).toBe("15000.00");
    expect(pollData.provider.descriptor.name).toBe("ABC Insurance");
  });

  test("on_select with BPP error is handled gracefully", async ({ request }) => {
    const transactionId = `test-err-${Date.now()}`;
    const messageId = `msg-err-${Date.now()}`;

    // Simulate on_select callback with error
    await request.post("/api/ondc/on_select", {
      data: {
        context: {
          transaction_id: transactionId,
          message_id: messageId,
        },
        error: {
          type: "DOMAIN-ERROR",
          code: "40001",
          message: "Product not available in your area",
        },
      },
    });

    // Poll for results - should have error info
    const pollResponse = await request.get(
      `/api/ondc/select-results?transaction_id=${transactionId}&message_id=${messageId}`
    );

    const pollData = await pollResponse.json();
    expect(pollData.error).toBeDefined();
    expect(pollData.error.code).toBe("40001");
  });
});
```

### Anti-Patterns to Avoid
- **Testing endpoints in isolation:** Don't write separate tests for `/api/ondc/select`, `/api/ondc/on_select`, and `/api/ondc/select-results`. Test the complete flow together to verify integration.
- **Using test.skip() for gateway errors:** Never skip tests when external BPPs return 500/502/503. These are valid responses in ONDC ecosystem. Use `expect([200, 503].includes(status))` instead.
- **Strict schemas for callback responses:** Don't use `z.object()` for on_search, on_select, on_init, on_confirm, on_status responses. BPPs may add additional fields. Use `z.looseObject()` to allow passthrough.
- **Hardcoded test data without uniqueness:** Always generate unique transaction IDs per test using `Date.now()` or `crypto.randomUUID()` to avoid cross-test pollution.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Fetching GitHub files | Custom HTTP client with base64 decode | GitHub CLI (`gh api`) | Built-in authentication, automatic base64 decode with `--jq '.content' \| base64 -d`, handles rate limits |
| UUID generation | Math.random() string slicing | `crypto.randomUUID()` (Node.js native) | RFC 4122 compliant, cryptographically random, no dependencies |
| Schema validation | Manual object checking with typeof | Zod | Type inference, clear error messages, composable, industry standard |
| API request chaining in tests | Manual promise chains | Playwright request context | Built-in retry logic, automatic cookie/auth handling, request tracing |
| YAML to JSON conversion | String parsing with regex | js-yaml library | Handles all YAML features (anchors, aliases), battle-tested |

**Key insight:** Protocol testing involves many edge cases (timeouts, retries, partial responses, BPP errors). Using battle-tested libraries like Playwright prevents reinventing async handling, retry logic, and error recovery mechanisms.

## Common Pitfalls

### Pitfall 1: Stale Protocol Documentation
**What goes wrong:** ONDC FIS13 specs evolve (currently 2.0.1, may become 2.0.2). Local copies of examples become outdated, causing validation mismatches.
**Why it happens:** One-time manual copy of specs without tracking source branch or version.
**How to avoid:**
- Document the source branch in `docs/protocol/ondc/fis13/health/README.md` (e.g., "Sourced from draft-FIS13-health-2.0.1 on 2026-02-04")
- Add comment at top of each YAML file: `# Source: ONDC-Official/ONDC-FIS-Specifications @ draft-FIS13-health-2.0.1`
- Create a script to refresh specs: `scripts/update-protocol-specs.sh`
**Warning signs:** Validation errors with "unexpected field" or "missing required field" when testing against real BPPs after protocol update.

### Pitfall 2: Over-Strict Response Schemas
**What goes wrong:** Using `z.object()` (default Zod behavior) for on_select, on_init, on_confirm responses strips unknown fields. If BPP sends additional vendor-specific fields, they're silently removed, breaking features that depend on them.
**Why it happens:** Misunderstanding Zod's default behavior - `z.object()` strips unrecognized keys.
**How to avoid:**
- Use `z.looseObject()` for ALL callback response schemas (on_search, on_select, on_init, on_confirm, on_status)
- Use strict `z.object()` only for request schemas (search, select, init, confirm, status) where we control the payload
- Document this convention in Zod schema files
**Warning signs:** BPP-specific features (custom tags, additional provider metadata) not appearing in UI despite being present in raw callback logs.

### Pitfall 3: Flaky Flow Tests Due to Race Conditions
**What goes wrong:** Test calls `/api/ondc/select`, immediately polls `/api/ondc/select-results`, then simulates `/api/ondc/on_select` callback. Polling happens before callback storage completes, causing intermittent failures.
**Why it happens:** Async operations in Redis/memory store aren't awaited properly, or poll happens before callback is processed.
**How to avoid:**
- Structure tests in correct order: `select` → `on_select` → `poll` (not `select` → `poll` → `on_select`)
- Use Playwright's built-in retry with `expect().toPass()` for polling assertions
- Set reasonable timeouts: 30 seconds for gateway calls, 10 seconds for polling
- In real app, use smart polling with exponential backoff (already implemented in frontend)
**Warning signs:** Tests pass 80% of the time but occasionally fail with "hasResponse: false" despite callback being logged.

### Pitfall 4: Missing Flow Coverage
**What goes wrong:** Only testing happy path (success responses). Real-world issues (BPP errors, timeouts, malformed responses) aren't caught until production.
**Why it happens:** E2E tests focus on "does it work" rather than "what happens when it doesn't work."
**How to avoid:**
- Test error responses for every flow: on_select with error object, on_init with error, etc.
- Test timeout scenarios: callback never arrives (polling returns hasResponse: false after timeout)
- Test partial data: on_select with missing optional fields
- Test BPP unavailability: select returns 503 from gateway
**Warning signs:** Production errors like "Cannot read property 'quote' of undefined" despite tests passing.

### Pitfall 5: Incorrect Schema Imports in Tests
**What goes wrong:** Test hardcodes expected response structure instead of using Zod schemas. When protocol changes, schemas are updated but tests aren't, causing false positives.
**Why it happens:** Tests written independently of schemas, duplicating validation logic.
**How to avoid:**
- Import Zod schemas in tests: `import { OnSelectResponseSchema } from 'server/src/lib/ondc/schemas'`
- Use `schema.parse(response)` in tests to validate structure
- Alternatively, use schema.safeParse() and assert `success: true`
**Warning signs:** Schemas updated for protocol 2.0.2 but tests still expect 2.0.1 field names.

## Code Examples

Verified patterns from official sources:

### Fetching and Organizing Protocol Specs
```bash
# Source: CLAUDE.md + ONDC-Official/ONDC-FIS-Specifications repository
# Create directory structure
mkdir -p docs/protocol/ondc/fis13/health/{schemas,examples/{select,on_select,init,on_init,confirm,on_confirm,status,on_status}}

# Fetch full schema
gh api "repos/ONDC-Official/ONDC-FIS-Specifications/contents/api/build/build.yaml?ref=draft-FIS13-health-2.0.1" \
  --jq '.content' | base64 -d > docs/protocol/ondc/fis13/health/schemas/build.yaml

# Fetch select examples
for file in select-request-personal-info.yaml select-request-ped-info.yaml select-request-pan-dob-info.yaml; do
  gh api "repos/ONDC-Official/ONDC-FIS-Specifications/contents/api/components/examples/health-insurance/select/${file}?ref=draft-FIS13-health-2.0.1" \
    --jq '.content' | base64 -d > docs/protocol/ondc/fis13/health/examples/select/${file}
done

# Fetch on_select examples
for file in on_select-request-personal-info.yaml on_select-request-ped-info.yaml; do
  gh api "repos/ONDC-Official/ONDC-FIS-Specifications/contents/api/components/examples/health-insurance/on_select/${file}?ref=draft-FIS13-health-2.0.1" \
    --jq '.content' | base64 -d > docs/protocol/ondc/fis13/health/examples/on_select/${file}
done

# Repeat for init, on_init, confirm, on_confirm, status, on_status
```

### Zod Schema Composition Pattern
```typescript
// Source: Zod documentation (https://zod.dev/api) + current codebase patterns
// Location: server/src/lib/ondc/schemas.ts

import { z } from "zod";

// Base schemas (reusable across endpoints)
const DescriptorSchema = z.looseObject({
  name: z.string(),
  short_desc: z.string().optional(),
  long_desc: z.string().optional(),
  images: z.array(z.looseObject({ url: z.string() })).optional(),
});

const PriceSchema = z.looseObject({
  currency: z.string(),
  value: z.string(),
});

// Compose into larger schemas
const ItemSchema = z.looseObject({
  id: z.string(),
  parent_item_id: z.string().optional(),
  descriptor: DescriptorSchema.optional(),
  price: PriceSchema.optional(),
  category_ids: z.array(z.string()).optional(),
  tags: z.array(
    z.looseObject({
      descriptor: DescriptorSchema.optional(),
      list: z.array(
        z.looseObject({
          descriptor: DescriptorSchema.optional(),
          value: z.string().optional(),
        })
      ).optional(),
    })
  ).optional(),
});

// Use in router
export const onSelectInput = z.looseObject({
  context: ONDCContextSchema,
  message: z.looseObject({
    order: z.looseObject({
      provider: z.looseObject({
        id: z.string(),
        descriptor: DescriptorSchema.optional(),
      }),
      items: z.array(ItemSchema),
      quote: ONDCQuoteSchema.optional(),
    }),
  }).optional(),
  error: ONDCErrorSchema.optional(),
});
```

### Complete Init Flow Test
```typescript
// Source: tests/api/gateway.spec.ts + Playwright API testing guide
test.describe("Init Flow Integration", () => {
  test("init endpoint triggers payment URL, on_init stores it, polling retrieves it", async ({ request }) => {
    // Generate unique IDs
    const transactionId = `test-init-${Date.now()}`;

    // Step 1: Call init endpoint
    const initResponse = await request.post("/api/ondc/init", {
      data: {
        transactionId,
        bppId: "abc-insurance.ondc.org",
        bppUri: "https://abc-insurance.ondc.org/api/ondc",
        providerId: "P1",
        itemId: "I1",
        parentItemId: "I1",
        xinputFormId: "F1",
        submissionId: "sub-123",
        customerName: "Test User",
        customerEmail: "test@example.com",
        customerPhone: "9876543210",
        amount: "15000.00",
      },
    });

    // Handle BPP unavailability gracefully
    expect([200, 503].includes(initResponse.status())).toBe(true);

    if (initResponse.status() === 503) {
      return; // BPP unreachable, acceptable
    }

    const initData = await initResponse.json();
    const { messageId } = initData;
    expect(messageId).toBeDefined();

    // Step 2: Simulate on_init callback with payment URL
    const onInitResponse = await request.post("/api/ondc/on_init", {
      data: {
        context: {
          transaction_id: transactionId,
          message_id: messageId,
          bpp_id: "abc-insurance.ondc.org",
          timestamp: new Date().toISOString(),
        },
        message: {
          order: {
            provider: { id: "P1" },
            items: [{ id: "I1" }],
            payments: [
              {
                url: "https://payment-gateway.example.com/pay/abc123",
                type: "PRE-FULFILLMENT",
                status: "NOT-PAID",
              },
            ],
            quote: {
              id: "Q1",
              price: { currency: "INR", value: "15000.00" },
            },
          },
        },
      },
    });

    expect(onInitResponse.status()).toBe(200);

    // Step 3: Poll for init results
    const pollResponse = await request.get(
      `/api/ondc/init-results?transaction_id=${transactionId}&message_id=${messageId}`
    );

    expect(pollResponse.status()).toBe(200);
    const pollData = await pollResponse.json();
    expect(pollData.found).toBe(true);
    expect(pollData.hasResponse).toBe(true);
    expect(pollData.paymentUrl).toBe("https://payment-gateway.example.com/pay/abc123");
    expect(pollData.quote.id).toBe("Q1");
  });
});
```

### Status Flow Test with Policy Document
```typescript
// Source: Current codebase patterns + FIS13 specification
test.describe("Status Flow Integration", () => {
  test("status endpoint retrieves policy details and documents", async ({ request }) => {
    const transactionId = `test-status-${Date.now()}`;
    const orderId = `order-${Date.now()}`;

    // Step 1: Call status endpoint
    const statusResponse = await request.post("/api/ondc/status", {
      data: {
        transactionId,
        orderId,
        bppId: "abc-insurance.ondc.org",
        bppUri: "https://abc-insurance.ondc.org/api/ondc",
      },
    });

    expect([200, 503].includes(statusResponse.status())).toBe(true);

    if (statusResponse.status() === 503) {
      return;
    }

    // Step 2: Simulate on_status callback with policy document
    await request.post("/api/ondc/on_status", {
      data: {
        context: {
          transaction_id: transactionId,
          bpp_id: "abc-insurance.ondc.org",
          timestamp: new Date().toISOString(),
        },
        message: {
          order: {
            id: orderId,
            status: "COMPLETE",
            provider: { id: "P1", descriptor: { name: "ABC Insurance" } },
            items: [
              {
                id: "I1",
                descriptor: { name: "Health Plan Premium" },
              },
            ],
            fulfillments: [
              {
                id: "F1",
                type: "POLICY",
                state: { descriptor: { code: "GRANTED" } },
                stops: [
                  {
                    time: {
                      range: {
                        start: "2026-01-01T00:00:00Z",
                        end: "2026-12-31T23:59:59Z",
                      },
                    },
                  },
                ],
              },
            ],
            documents: [
              {
                descriptor: { code: "policy-doc" },
                url: "https://abc-insurance.example.com/policies/POL123.pdf",
                mime_type: "application/pdf",
              },
            ],
          },
        },
      },
    });

    // Step 3: Poll for status results
    const pollResponse = await request.get(
      `/api/ondc/status-results?order_id=${orderId}`
    );

    expect(pollResponse.status()).toBe(200);
    const pollData = await pollResponse.json();
    expect(pollData.found).toBe(true);
    expect(pollData.hasResponse).toBe(true);
    expect(pollData.policy).toBeDefined();
    expect(pollData.policy.status).toBe("COMPLETE");
    expect(pollData.policy.policyDocument).toBe("https://abc-insurance.example.com/policies/POL123.pdf");
    expect(pollData.policy.validFrom).toBeDefined();
    expect(pollData.policy.validTo).toBeDefined();
  });
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `.strict()` method on Zod schemas | `z.strictObject()` top-level function | Zod 4.0 (2025) | Clearer API, better tree-shaking, `.strict()` deprecated |
| `.passthrough()` method | `z.looseObject()` top-level function | Zod 4.0 (2025) | More intuitive naming, backwards compatible |
| Cypress for API testing | Playwright request context | 2024-2025 | Native API testing, no need for cy.request() workarounds |
| Manual YAML fetching with curl | GitHub CLI with base64 decode | 2023+ | Single command, authentication built-in |
| Separate Zod schemas per endpoint | Composed base schemas | 2024+ trend | DRY, consistent validation, easier updates |

**Deprecated/outdated:**
- `z.object().passthrough()`: Use `z.looseObject()` in Zod 4
- `z.object().strict()`: Use `z.strictObject()` in Zod 4
- Testing with `cy.request()` in Cypress: Use Playwright's native request context
- Storing protocol specs as JSON: YAML is canonical format from ONDC, keep as YAML for diffing

## Open Questions

Things that couldn't be fully resolved:

1. **Schema Validation in Production**
   - What we know: Zod schemas add runtime overhead (parsing + validation). Current implementation validates callback inputs.
   - What's unclear: Should we validate BPP responses in production or only in tests? Trade-off is safety vs. performance.
   - Recommendation: Validate all callbacks in production (errors are critical), but use `safeParse()` and log validation failures rather than throwing. Performance impact is negligible for callback volume.

2. **Protocol Version Drift**
   - What we know: ONDC FIS13 health is currently 2.0.1, may update to 2.0.2. Changes are usually additive (new optional fields).
   - What's unclear: How often to refresh protocol docs? Should we version them?
   - Recommendation: Add version metadata to README, refresh quarterly or when BPP validation errors increase. Don't version internally (single source of truth).

3. **Test BPP Reliability**
   - What we know: ABC Insurance is documented as reliable test BPP. Other BPPs may return 500/502/503.
   - What's unclear: Should E2E tests use real ABC Insurance or mock server? Real BPP tests dependencies but is flaky.
   - Recommendation: Use real ABC Insurance for smoke tests (1-2 critical flows), use mocked callbacks for comprehensive coverage. This balances real-world validation with test stability.

## Sources

### Primary (HIGH confidence)
- [Zod Documentation](https://zod.dev/) - Defining schemas, migration guide v4
- [Zod GitHub Repository](https://github.com/colinhacks/zod) - TypeScript-first schema validation
- [Playwright Best Practices](https://www.browserstack.com/guide/playwright-best-practices) - 15 best practices for 2026
- [Playwright API Testing](https://www.browserstack.com/guide/playwright-api-test) - API testing in 2026
- [ONDC-Official/ONDC-FIS-Specifications](https://github.com/ONDC-Official/ONDC-FIS-Specifications) - Official protocol repository
- CLAUDE.md - Project-specific ONDC GitHub API access patterns (verified in codebase)
- Current codebase (server/src/trpc/routers/gateway.ts, tests/api/*.spec.ts) - Existing patterns

### Secondary (MEDIUM confidence)
- [How to Validate Data with Zod in TypeScript](https://oneuptime.com/blog/post/2026-01-25-zod-validation-typescript/view) - 2026 validation patterns
- [End-to-End API Testing Guide](https://zuplo.com/learning-center/end-to-end-api-testing-guide) - API E2E best practices
- [Building Comprehensive E2E Test Suite with Playwright](https://dev.to/bugslayer/building-a-comprehensive-e2e-test-suite-with-playwright-lessons-from-100-test-cases-171k) - Lessons from 100+ test cases
- [Monorepo Documentation Structure](https://www.mindfulchase.com/deep-dives/monorepo-fundamentals-deep-dives-into-unified-codebases/structuring-your-monorepo-best-practices-for-directory-and-code-organization.html) - Best practices for directory organization

### Tertiary (LOW confidence)
- [ONDC Financial Services Developer Guide](https://ondc-official.github.io/ONDC-FIS-Specifications/) - Interactive docs (JavaScript-heavy, prefer GitHub API)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Zod and Playwright are established standards, verified in official docs and current codebase
- Architecture: HIGH - Protocol structure verified from ONDC GitHub, Zod patterns documented in v4 migration guide, test patterns verified in current codebase
- Pitfalls: HIGH - Derived from actual codebase patterns (looseObject for responses), Playwright best practices guides, and Zod migration notes

**Research date:** 2026-02-04
**Valid until:** 30 days (stable domain - protocol specs change slowly, Zod 4 is current, Playwright stable)
