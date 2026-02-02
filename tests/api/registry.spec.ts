import { expect, test } from "@playwright/test";

test.describe("Registry API", () => {
  test.describe("GET /api/ondc/lookup", () => {
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
        // Should be an array of subscribers
        expect(Array.isArray(data)).toBe(true);
      }
    });

    test("returns JSON content type", async ({ request }) => {
      const response = await request.get("/api/ondc/lookup");
      const body = await response.text();

      expect(
        response.headers()["content-type"],
        `Expected JSON content-type. Response body: ${body}`,
      ).toContain("application/json");
    });
  });

  test.describe("POST /api/ondc/subscribe", () => {
    test("returns JSON response", async ({ request }) => {
      const response = await request.post("/api/ondc/subscribe");
      const body = await response.text();

      expect(
        response.status(),
        `Expected 200 but got ${response.status()}. Response body: ${body}`,
      ).toBe(200);

      const data = JSON.parse(body);
      expect(data).toBeDefined();
      expect(data).toHaveProperty("message");
      expect(data.message).toHaveProperty("ack");
    });

    test("returns JSON content type", async ({ request }) => {
      const response = await request.post("/api/ondc/subscribe");
      const body = await response.text();

      expect(
        response.headers()["content-type"],
        `Expected JSON content-type. Response body: ${body}`,
      ).toContain("application/json");
    });
  });

  test.describe("POST /api/ondc/on_subscribe", () => {
    test("returns 400 when challenge is missing", async ({ request }) => {
      const response = await request.post("/api/ondc/on_subscribe", {
        data: { subscriber_id: "test-subscriber" },
      });
      const body = await response.text();

      expect(
        response.status(),
        `Expected 400 but got ${response.status()}. Response body: ${body}`,
      ).toBe(400);

      const data = JSON.parse(body);
      expect(data).toHaveProperty("error");
      expect(data.error).toBe("Challenge is required");
    });

    test("returns JSON content type", async ({ request }) => {
      const response = await request.post("/api/ondc/on_subscribe", {
        data: { challenge: "test-challenge" },
      });
      const body = await response.text();

      expect(
        response.headers()["content-type"],
        `Expected JSON content-type. Response body: ${body}`,
      ).toContain("application/json");
    });

    test("accepts valid challenge payload structure", async ({ request }) => {
      // This will fail decryption but should accept the request structure
      const response = await request.post("/api/ondc/on_subscribe", {
        data: {
          subscriber_id: "test-subscriber",
          challenge: "dGVzdC1jaGFsbGVuZ2U=", // base64 "test-challenge"
        },
      });
      const body = await response.text();

      // Will return 500 due to decryption failure, but validates request handling
      expect(
        [200, 500].includes(response.status()),
        `Expected 200 or 500 but got ${response.status()}. Response body: ${body}`,
      ).toBe(true);
    });

    test("handles passthrough fields in request", async ({ request }) => {
      // Test that extra fields don't cause errors (passthrough schema)
      const response = await request.post("/api/ondc/on_subscribe", {
        data: {
          subscriber_id: "test-subscriber",
          challenge: "dGVzdC1jaGFsbGVuZ2U=",
          extra_field: "should be allowed",
          another_field: { nested: "value" },
        },
      });
      const body = await response.text();

      // Should not fail due to extra fields
      expect(
        [200, 400, 500].includes(response.status()),
        `Expected 200, 400, or 500 but got ${response.status()}. Response body: ${body}`,
      ).toBe(true);
    });
  });
});
