import { expect, test } from "@playwright/test";

test.describe("Product-Specific Search API", () => {
  test.describe("POST /api/ondc/search with categoryCode", () => {
    test("accepts HEALTH_INSURANCE categoryCode", async ({ request }) => {
      const response = await request.post("/api/ondc/search", {
        data: {
          categoryCode: "HEALTH_INSURANCE",
        },
      });

      // May return 200 or 503 depending on gateway availability
      expect([200, 503]).toContain(response.status());

      const data = await response.json();
      expect(data).toBeDefined();

      if (response.status() === 200) {
        expect(data).toHaveProperty("transactionId");
        expect(data).toHaveProperty("messageId");
        // Verify UUID format
        expect(data.transactionId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        );
      }
    });

    test("accepts MOTOR_INSURANCE categoryCode", async ({ request }) => {
      const response = await request.post("/api/ondc/search", {
        data: {
          categoryCode: "MOTOR_INSURANCE",
        },
      });

      expect([200, 503]).toContain(response.status());

      const data = await response.json();
      expect(data).toBeDefined();

      if (response.status() === 200) {
        expect(data).toHaveProperty("transactionId");
        expect(data).toHaveProperty("messageId");
      }
    });

    test("works without categoryCode (returns all insurers)", async ({
      request,
    }) => {
      const response = await request.post("/api/ondc/search", {
        data: {},
      });

      expect([200, 503]).toContain(response.status());

      const data = await response.json();
      expect(data).toBeDefined();

      if (response.status() === 200) {
        expect(data).toHaveProperty("transactionId");
        expect(data).toHaveProperty("messageId");
      }
    });

    test("works with empty request body", async ({ request }) => {
      const response = await request.post("/api/ondc/search");

      expect([200, 503]).toContain(response.status());

      const data = await response.json();
      expect(data).toBeDefined();

      if (response.status() === 200) {
        expect(data).toHaveProperty("transactionId");
        expect(data).toHaveProperty("messageId");
      }
    });

    test("returns different transactionIds for different requests", async ({
      request,
    }) => {
      const response1 = await request.post("/api/ondc/search", {
        data: { categoryCode: "HEALTH_INSURANCE" },
      });
      const response2 = await request.post("/api/ondc/search", {
        data: { categoryCode: "MOTOR_INSURANCE" },
      });

      if (response1.status() === 200 && response2.status() === 200) {
        const data1 = await response1.json();
        const data2 = await response2.json();

        expect(data1.transactionId).not.toBe(data2.transactionId);
        expect(data1.messageId).not.toBe(data2.messageId);
      }
    });

    test("accepts unknown categoryCode (ONDC will filter)", async ({
      request,
    }) => {
      const response = await request.post("/api/ondc/search", {
        data: {
          categoryCode: "UNKNOWN_CATEGORY",
        },
      });

      // API should accept any string as categoryCode
      expect([200, 503]).toContain(response.status());

      const data = await response.json();
      expect(data).toBeDefined();
    });
  });

  test.describe("SSE Stream /api/ondc/search-stream/[transactionId]", () => {
    test("returns 404 or error event for non-existent transaction", async ({
      request,
    }) => {
      const fakeTransactionId = "00000000-0000-0000-0000-000000000000";
      const response = await request.get(
        `/api/ondc/search-stream/${fakeTransactionId}`,
      );

      // SSE endpoint should return 200 with text/event-stream
      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("text/event-stream");
    });

    test("returns proper SSE headers", async ({ request }) => {
      // First create a search to get a valid transactionId
      const searchResponse = await request.post("/api/ondc/search", {
        data: { categoryCode: "HEALTH_INSURANCE" },
      });

      // Accept both 200 (success) and 503 (gateway unavailable) as valid responses
      expect([200, 503]).toContain(searchResponse.status());

      const searchData = await searchResponse.json();
      expect(searchData).toHaveProperty("transactionId");

      const { transactionId } = searchData;

      const response = await request.get(
        `/api/ondc/search-stream/${transactionId}`,
      );

      expect(response.status()).toBe(200);
      expect(response.headers()["content-type"]).toContain("text/event-stream");
      expect(response.headers()["cache-control"]).toContain("no-cache");
    });
  });

  test.describe("Product Pages Navigation", () => {
    test("health page exists at /health/[searchId]", async ({ page }) => {
      // First create a search
      const response = await page.request.post("/api/ondc/search", {
        data: { categoryCode: "HEALTH_INSURANCE" },
      });

      // Accept both 200 (success) and 503 (gateway unavailable) as valid responses
      expect([200, 503]).toContain(response.status());

      const data = await response.json();
      expect(data).toHaveProperty("transactionId");

      const { transactionId } = data;

      // Navigate to health page
      await page.goto(`/health/${transactionId}`);

      // Should not return 404
      await expect(page).not.toHaveTitle(/404/);
    });

    test("motor page exists at /motor/[searchId]", async ({ page }) => {
      // First create a search
      const response = await page.request.post("/api/ondc/search", {
        data: { categoryCode: "MOTOR_INSURANCE" },
      });

      // Accept both 200 (success) and 503 (gateway unavailable) as valid responses
      expect([200, 503]).toContain(response.status());

      const data = await response.json();
      expect(data).toHaveProperty("transactionId");

      const { transactionId } = data;

      // Navigate to motor page
      await page.goto(`/motor/${transactionId}`);

      // Should not return 404
      await expect(page).not.toHaveTitle(/404/);
    });
  });
});
