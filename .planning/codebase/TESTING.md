# Testing Patterns

**Analysis Date:** 2026-02-02

## Test Framework

**Runner:**
- Playwright (v5+) for E2E testing
- Config: `playwright.config.ts` at root
- Single browser (Chromium only): Reduces ngrok rate-limiting issues
- No parallelization by default: `fullyParallel: false` (360 req/min limit on ngrok)
- Max 2 workers in local dev: `workers: process.env.CI ? 1 : 2`

**Assertion Library:**
- Playwright's built-in assertions: `expect()`
- No external assertion library

**Run Commands:**
```bash
pnpm test:e2e                   # Run all E2E tests (headless)
pnpm test:e2e:headed           # Run with visible browser for debugging
pnpm test:e2e:ui               # Interactive Playwright UI
pnpm test:e2e:report           # View HTML test report
pnpm test:e2e -- tests/api/health.spec.ts --timeout=30000  # Run specific test file
```

**Important:**
- NEVER run full test suite unless explicitly requested
- ALWAYS target specific test files
- Set `--timeout=30000` to prevent hanging on slow endpoints
- `forbidOnly: true` on CI prevents accidental `.only()` commits

## Test File Organization

**Location:**
- All E2E tests in `tests/` directory
- Organized by feature: `tests/api/`, `tests/homepage.spec.ts`
- Files named with `.spec.ts` extension

**Naming:**
```
tests/
├── api/
│   ├── health.spec.ts          # Health check endpoints
│   ├── registry.spec.ts        # ONDC registry operations (lookup, subscribe, on_subscribe)
│   ├── gateway.spec.ts         # Gateway operations (search, select)
│   ├── polling.spec.ts         # Callback polling and result retrieval
│   └── product-search.spec.ts  # Product search flows
└── homepage.spec.ts            # Homepage UI tests
```

**Structure:**
```typescript
// Standard test file structure
import { expect, test } from "@playwright/test";

test.describe("Feature Name", () => {
  test.describe("Endpoint or Component", () => {
    test("specific behavior", async ({ request }) => {
      // Test implementation
    });
  });
});
```

## Test Structure

**Suite Organization:**
```typescript
// From tests/api/health.spec.ts
test.describe("Health API", () => {
  test("GET /api/ondc/health returns 200 with status", async ({ request }) => {
    const response = await request.get("/api/ondc/health");
    const body = await response.text();

    expect(
      response.status(),
      `Expected 200 but got ${response.status()}. Response body: ${body}`,
    ).toBe(200);

    const data = JSON.parse(body);
    expect(data).toHaveProperty("status");
    expect(data.status).toBe("Health OK!!");
  });
});
```

**Patterns:**
- Nested `test.describe()` blocks organize by endpoint
- One test per specific behavior/assertion group
- Each test is independent; no shared state between tests
- Always include response body in error messages for debugging

**Setup:**
- No test fixtures or factories
- No database setup/teardown
- Playwright `webServer` auto-starts dev servers: Defined in `playwright.config.ts`
  ```typescript
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:4823",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  }
  ```

**Teardown:**
- None required; stateless HTTP tests
- Tests reuse running dev servers

## Mocking

**Framework:** No mocking library used

**Patterns:**
- No mocking: Tests hit real endpoints
- Real database: Redis runs locally for development
- Real external APIs: Tests accept external API failures as valid responses

**What to NOT Mock:**
- External APIs (ONDC registry, BPPs, gateways)
- Database operations (Redis is local, always available)
- HTTP calls (test against real running server)

**What to Test:**
- HTTP status codes: 200, 400, 500, 502, 503 all valid depending on context
- Response structure: Correct fields present in JSON
- Content-Type headers
- Error messages when applicable

## External Gateway Error Handling

**IMPORTANT Testing Principle:**

Never use `test.skip()` when external gateways (ONDC registry, BPPs) return error statuses like 500, 502, or 503. These are valid responses in ONDC use cases, not test failures.

**Bad Pattern (DO NOT USE):**
```typescript
// WRONG - Don't skip tests on gateway errors
if (response.status() !== 200) {
  test.skip();
  return;
}
```

**Good Pattern (CORRECT):**
```typescript
// RIGHT - Accept gateway errors as valid responses
expect([200, 502, 503]).toContain(response.status());

if (response.status() === 200) {
  const data = JSON.parse(body);
  expect(data).toBeDefined();
  // Additional assertions for success case
}
```

**Examples from Codebase:**

From `tests/api/registry.spec.ts`:
```typescript
test("returns 200 with subscriber data", async ({ request }) => {
  const response = await request.get("/api/ondc/lookup");
  const body = await response.text();

  // May return 200 with data or 500 if registry is unreachable
  expect(
    [200, 500].includes(response.status()),
    `Expected 200 or 500 but got ${response.status()}. Response body: ${body}`,
  ).toBe(true);

  if (response.status() === 200) {
    const data = JSON.parse(body);
    expect(data).toBeDefined();
    expect(Array.isArray(data)).toBe(true);
  }
});
```

From `tests/api/gateway.spec.ts`:
```typescript
test("returns 200 or 503 depending on gateway availability", async ({ request }) => {
  const response = await request.post("/api/ondc/search");
  const body = await response.text();

  expect(
    [200, 503].includes(response.status()),
    `Expected 200 or 503 but got ${response.status()}. Response body: ${body}`,
  ).toBe(true);

  if (response.status() === 200) {
    const data = JSON.parse(body);
    expect(data).toHaveProperty("transactionId");
    expect(data).toHaveProperty("messageId");
  }
});
```

## Fixtures and Factories

**Test Data:**
- No factories or builders
- Request payloads created inline in tests
- Generated IDs: Use `Date.now()` and `Math.random()` for unique test data
  ```typescript
  const uniqueTransactionId = `unknown-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  ```

**UUID Format Validation:**
Tests verify proper UUID generation:
```typescript
expect(data.transactionId).toMatch(
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
);
```

**Location:**
- No separate fixtures directory
- Test data defined inline where used

## Coverage

**Requirements:** Not enforced, not measured

**Approach:**
- Critical path coverage: Health, registry, gateway endpoints
- Error case coverage: 400, 500 status codes tested
- No coverage thresholds or reports

## Test Types

**Unit Tests:**
- Not used; E2E tests provide sufficient coverage
- No Jest or Vitest configuration

**Integration Tests:**
- All tests are effectively integration tests
- Test against real running servers (local dev servers)
- Use real Redis instance
- Call real ONDC endpoints (accept failures)

**E2E Tests:**
- Full browser-based testing with Playwright
- Test HTTP API directly via `request` fixture
- No UI automation (test API endpoints, not rendered pages)
- 1168 lines total across all E2E tests (6 spec files)

**Test Scope by File:**

**health.spec.ts (29 lines):**
- Basic health check endpoint
- Simple 200 status and response structure tests

**registry.spec.ts (126 lines):**
- ONDC registry lookup and subscribe operations
- Challenge validation and error handling
- Handles external API failures gracefully

**gateway.spec.ts (390 lines):**
- Search and select operations
- Field validation and error responses
- UUID format validation
- Gateway availability handling (200, 503)

**polling.spec.ts (307 lines):**
- Search and select results polling
- Missing parameter validation
- Unknown ID handling
- Response structure validation

**product-search.spec.ts (195 lines):**
- Product search workflow
- Multiple provider responses
- Quote details retrieval

**homepage.spec.ts (121 lines):**
- Homepage rendering
- Navigation to directory and search pages
- Page content validation

## Common Patterns

**Async Testing:**
```typescript
test("async operation", async ({ request }) => {
  const response = await request.post("/api/ondc/search");
  const body = await response.text();

  // Assertions follow
});
```

**Error Testing:**
```typescript
test("returns 400 when required fields are missing", async ({ request }) => {
  const response = await request.post("/api/ondc/select", {
    data: {}, // Missing required fields
  });
  const body = await response.text();

  expect(response.status()).toBe(400);

  const data = JSON.parse(body);
  expect(data).toHaveProperty("error");
  expect(data.error).toBe("Missing required fields");
});
```

**Response Structure Validation:**
```typescript
test("returns correct response structure", async ({ request }) => {
  const response = await request.get("/api/ondc/lookup");
  const body = await response.text();

  expect(response.status()).toBe(200);

  const data = JSON.parse(body);
  expect(data).toBeDefined();
  expect(Array.isArray(data)).toBe(true);

  // Validate each item structure
  if (data.length > 0) {
    expect(data[0]).toHaveProperty("subscriber_id");
  }
});
```

**Content-Type Validation:**
```typescript
test("returns JSON content type", async ({ request }) => {
  const response = await request.get("/api/ondc/health");
  const body = await response.text();

  expect(
    response.headers()["content-type"],
    `Expected JSON content-type. Response body: ${body}`,
  ).toContain("application/json");
});
```

## Configuration Details

**Playwright Config (`playwright.config.ts`):**
- Base URL: `http://localhost:4823` (client dev server)
- Screenshots: Captured automatically on every test
- Traces: Collected on first retry for debugging
- HTML reporter: Saved to `playwright-report/`
- Retries: 2 on CI, 0 locally
- Timeout: Default 30 seconds per test

**CI-Specific:**
- Single worker: Prevent ngrok rate-limiting
- Retry failed tests: Up to 2 times
- Forbid `.only()`: Prevent accidental test isolation
- HTML report generated for manual review

## Debugging Tests

**Run with Browser:**
```bash
pnpm test:e2e:headed -- tests/api/health.spec.ts
```

**Interactive UI:**
```bash
pnpm test:e2e:ui
```

**View Reports:**
```bash
pnpm test:e2e:report
```

**Inspect Response:**
Add detailed logging to test:
```typescript
test("debug response", async ({ request }) => {
  const response = await request.get("/api/ondc/health");
  const body = await response.text();

  console.log("Status:", response.status());
  console.log("Body:", body);
  console.log("Headers:", response.headers());
});
```

---

*Testing analysis: 2026-02-02*
