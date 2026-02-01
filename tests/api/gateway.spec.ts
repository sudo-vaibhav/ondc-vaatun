import { expect, test } from "@playwright/test";

test.describe("Gateway API", () => {
  test.describe("POST /api/ondc/search", () => {
    test("returns 200 with transaction and message IDs", async ({
      request,
    }) => {
      const response = await request.post("/api/ondc/search");
      const body = await response.text();

      // May return 200 or 503 depending on gateway availability
      expect(
        [200, 503].includes(response.status()),
        `Expected 200 or 503 but got ${response.status()}. Response body: ${body}`,
      ).toBe(true);

      if (response.status() === 200) {
        const data = JSON.parse(body);
        expect(data).toBeDefined();
        expect(data).toHaveProperty("transactionId");
        expect(data).toHaveProperty("messageId");
        // Verify UUID format
        expect(data.transactionId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        );
        expect(data.messageId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        );
      }
    });

    test("returns JSON content type", async ({ request }) => {
      const response = await request.post("/api/ondc/search");
      const body = await response.text();

      expect(
        response.headers()["content-type"],
        `Expected JSON content-type. Response body: ${body}`,
      ).toContain("application/json");
    });
  });

  test.describe("POST /api/ondc/select", () => {
    test("returns 400 when required fields are missing", async ({
      request,
    }) => {
      const response = await request.post("/api/ondc/select", {
        data: {},
      });
      const body = await response.text();

      expect(
        response.status(),
        `Expected 400 but got ${response.status()}. Response body: ${body}`,
      ).toBe(400);

      const data = JSON.parse(body);
      expect(data).toHaveProperty("error");
      expect(data.error).toBe("Missing required fields");
      expect(data).toHaveProperty("required");
      expect(data.required).toContain("transactionId");
      expect(data.required).toContain("bppId");
      expect(data.required).toContain("bppUri");
      expect(data.required).toContain("providerId");
      expect(data.required).toContain("itemId");
    });

    test("returns 400 when partial fields provided", async ({ request }) => {
      const response = await request.post("/api/ondc/select", {
        data: {
          transactionId: "019abc12-3456-7890-abcd-ef1234567890",
          bppId: "test-bpp",
          // Missing bppUri, providerId, itemId
        },
      });
      const body = await response.text();

      expect(
        response.status(),
        `Expected 400 but got ${response.status()}. Response body: ${body}`,
      ).toBe(400);
    });

    test("accepts valid request payload structure", async ({ request }) => {
      const response = await request.post("/api/ondc/select", {
        data: {
          transactionId: "019abc12-3456-7890-abcd-ef1234567890",
          bppId: "ondc-mock-server.example.com",
          bppUri: "https://ondc-mock-server.example.com/api/ondc",
          providerId: "provider-001",
          itemId: "item-001",
          parentItemId: "item-001",
        },
      });
      const body = await response.text();

      // Will fail to reach BPP but should accept the request
      expect(
        [200, 503].includes(response.status()),
        `Expected 200 or 503 but got ${response.status()}. Response body: ${body}`,
      ).toBe(true);

      if (response.status() === 200) {
        const data = JSON.parse(body);
        expect(data).toBeDefined();
        expect(data).toHaveProperty("transactionId");
        expect(data).toHaveProperty("messageId");
      }
    });

    test("accepts optional xinput fields", async ({ request }) => {
      const response = await request.post("/api/ondc/select", {
        data: {
          transactionId: "019abc12-3456-7890-abcd-ef1234567890",
          bppId: "ondc-mock-server.example.com",
          bppUri: "https://ondc-mock-server.example.com/api/ondc",
          providerId: "provider-001",
          itemId: "item-001",
          parentItemId: "item-001",
          xinputFormId: "form-001",
          xinputSubmissionId: "submission-001",
        },
      });
      const body = await response.text();

      // Should not fail validation due to optional fields
      expect(
        [200, 503].includes(response.status()),
        `Expected 200 or 503 but got ${response.status()}. Response body: ${body}`,
      ).toBe(true);
    });

    test("accepts optional addOns field", async ({ request }) => {
      const response = await request.post("/api/ondc/select", {
        data: {
          transactionId: "019abc12-3456-7890-abcd-ef1234567890",
          bppId: "ondc-mock-server.example.com",
          bppUri: "https://ondc-mock-server.example.com/api/ondc",
          providerId: "provider-001",
          itemId: "item-001",
          parentItemId: "item-001",
          addOns: [
            { id: "addon-001", quantity: 1 },
            { id: "addon-002", quantity: 2 },
          ],
        },
      });
      const body = await response.text();

      expect(
        [200, 503].includes(response.status()),
        `Expected 200 or 503 but got ${response.status()}. Response body: ${body}`,
      ).toBe(true);
    });

    test("returns JSON content type", async ({ request }) => {
      const response = await request.post("/api/ondc/select", {
        data: {
          transactionId: "019abc12-3456-7890-abcd-ef1234567890",
          bppId: "test",
          bppUri: "https://test.com",
          providerId: "p1",
          itemId: "i1",
          parentItemId: "i1",
        },
      });
      const body = await response.text();

      expect(
        response.headers()["content-type"],
        `Expected JSON content-type. Response body: ${body}`,
      ).toContain("application/json");
    });
  });

  test.describe("POST /api/ondc/on_search", () => {
    test("returns ACK for valid on_search callback", async ({ request }) => {
      const response = await request.post("/api/ondc/on_search", {
        data: {
          context: {
            domain: "ONDC:FIS13",
            action: "on_search",
            bap_id: "test-bap",
            bap_uri: "https://test-bap.com",
            bpp_id: "test-bpp",
            bpp_uri: "https://test-bpp.com",
            transaction_id: "019abc12-3456-7890-abcd-ef1234567890",
            message_id: "019abc12-3456-7890-abcd-ef1234567891",
            timestamp: new Date().toISOString(),
            version: "2.0.1",
          },
          message: {
            catalog: {
              providers: [
                {
                  id: "provider-001",
                  descriptor: { name: "Test Provider" },
                  items: [
                    { id: "item-001", descriptor: { name: "Test Item" } },
                  ],
                },
              ],
            },
          },
        },
      });
      const body = await response.text();

      expect(
        response.status(),
        `Expected 200 but got ${response.status()}. Response body: ${body}`,
      ).toBe(200);

      const data = JSON.parse(body);
      expect(data).toHaveProperty("message");
      expect(data.message).toHaveProperty("ack");
      expect(data.message.ack).toHaveProperty("status");
      expect(data.message.ack.status).toBe("ACK");
    });

    test("returns ACK even without transaction_id (with warning)", async ({
      request,
    }) => {
      const response = await request.post("/api/ondc/on_search", {
        data: {
          context: {
            action: "on_search",
          },
          message: {},
        },
      });
      const body = await response.text();

      // Should still return ACK even if transaction_id is missing
      expect(
        response.status(),
        `Expected 200 but got ${response.status()}. Response body: ${body}`,
      ).toBe(200);

      const data = JSON.parse(body);
      expect(data.message.ack.status).toBe("ACK");
    });

    test("handles passthrough fields in request", async ({ request }) => {
      const response = await request.post("/api/ondc/on_search", {
        data: {
          context: {
            transaction_id: "019abc12-3456-7890-abcd-ef1234567890",
            extra_context_field: "allowed",
          },
          message: {
            catalog: {},
            extra_message_field: "also allowed",
          },
          custom_field: "passthrough works",
        },
      });
      const body = await response.text();

      expect(
        response.status(),
        `Expected 200 but got ${response.status()}. Response body: ${body}`,
      ).toBe(200);
    });

    test("returns JSON content type", async ({ request }) => {
      const response = await request.post("/api/ondc/on_search", {
        data: { context: {}, message: {} },
      });
      const body = await response.text();

      expect(
        response.headers()["content-type"],
        `Expected JSON content-type. Response body: ${body}`,
      ).toContain("application/json");
    });
  });

  test.describe("POST /api/ondc/on_select", () => {
    test("returns ACK for valid on_select callback", async ({ request }) => {
      const response = await request.post("/api/ondc/on_select", {
        data: {
          context: {
            domain: "ONDC:FIS13",
            action: "on_select",
            bap_id: "test-bap",
            bap_uri: "https://test-bap.com",
            bpp_id: "test-bpp",
            bpp_uri: "https://test-bpp.com",
            transaction_id: "019abc12-3456-7890-abcd-ef1234567890",
            message_id: "019abc12-3456-7890-abcd-ef1234567891",
            timestamp: new Date().toISOString(),
            version: "2.0.1",
          },
          message: {
            order: {
              provider: { id: "provider-001" },
              items: [{ id: "item-001" }],
              quote: {
                price: { currency: "INR", value: "15000.00" },
                breakup: [
                  {
                    title: "Base Premium",
                    price: { currency: "INR", value: "12000.00" },
                  },
                  {
                    title: "GST",
                    price: { currency: "INR", value: "3000.00" },
                  },
                ],
              },
            },
          },
        },
      });
      const body = await response.text();

      expect(
        response.status(),
        `Expected 200 but got ${response.status()}. Response body: ${body}`,
      ).toBe(200);

      const data = JSON.parse(body);
      expect(data).toHaveProperty("message");
      expect(data.message).toHaveProperty("ack");
      expect(data.message.ack.status).toBe("ACK");
    });

    test("returns ACK for on_select with error", async ({ request }) => {
      const response = await request.post("/api/ondc/on_select", {
        data: {
          context: {
            transaction_id: "019abc12-3456-7890-abcd-ef1234567890",
            message_id: "019abc12-3456-7890-abcd-ef1234567891",
          },
          error: {
            type: "DOMAIN-ERROR",
            code: "40001",
            message: "Item not available",
          },
        },
      });
      const body = await response.text();

      expect(
        response.status(),
        `Expected 200 but got ${response.status()}. Response body: ${body}`,
      ).toBe(200);

      const data = JSON.parse(body);
      expect(data.message.ack.status).toBe("ACK");
    });

    test("handles passthrough fields in request", async ({ request }) => {
      const response = await request.post("/api/ondc/on_select", {
        data: {
          context: {
            transaction_id: "019abc12-3456-7890-abcd-ef1234567890",
            message_id: "019abc12-3456-7890-abcd-ef1234567891",
            custom_field: "allowed",
          },
          message: {
            order: {
              quote: { price: { currency: "INR", value: "100" } },
              extra_order_field: "passthrough",
            },
          },
        },
      });
      const body = await response.text();

      expect(
        response.status(),
        `Expected 200 but got ${response.status()}. Response body: ${body}`,
      ).toBe(200);
    });

    test("returns JSON content type", async ({ request }) => {
      const response = await request.post("/api/ondc/on_select", {
        data: { context: {}, message: {} },
      });
      const body = await response.text();

      expect(
        response.headers()["content-type"],
        `Expected JSON content-type. Response body: ${body}`,
      ).toContain("application/json");
    });
  });
});
