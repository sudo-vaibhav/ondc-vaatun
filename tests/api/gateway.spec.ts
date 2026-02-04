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

  test.describe("Select Flow Integration", () => {
    test("select endpoint returns messageId on success", async ({
      request,
    }) => {
      const transactionId = `019abc12-3456-7890-abcd-${Date.now().toString(16)}`;

      // Call select - will fail to reach mock BPP but validates the endpoint works
      const selectResponse = await request.post("/api/ondc/select", {
        data: {
          transactionId,
          bppId: "test-bpp.example.com",
          bppUri: "https://test-bpp.example.com/api/ondc",
          providerId: "provider-001",
          itemId: "item-001",
          parentItemId: "item-001",
        },
      });
      const selectBody = await selectResponse.text();

      // Accept 200 (success) or 503 (BPP unreachable) as valid responses
      // Per CLAUDE.md: Never use test.skip() for gateway errors
      expect(
        [200, 503].includes(selectResponse.status()),
        `Expected 200 or 503 but got ${selectResponse.status()}. Response body: ${selectBody}`,
      ).toBe(true);

      const selectData = JSON.parse(selectBody);

      // On 200 success, verify messageId and transactionId
      if (selectResponse.status() === 200) {
        expect(selectData).toHaveProperty("messageId");
        expect(selectData).toHaveProperty("transactionId");
        expect(selectData.transactionId).toBe(transactionId);

        // Verify UUID format for messageId
        expect(selectData.messageId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        );
      }
      // On 503, verify error response structure (BPP was unreachable)
      // The messageId is not returned on error in current implementation
    });

    test("on_select callback stores response for polling", async ({
      request,
    }) => {
      const transactionId = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const messageId = `msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // Step 1: Simulate on_select callback
      const onSelectResponse = await request.post("/api/ondc/on_select", {
        data: {
          context: {
            domain: "ONDC:FIS13",
            action: "on_select",
            bap_id: "test-bap",
            bap_uri: "https://test-bap.com",
            bpp_id: "test-bpp",
            bpp_uri: "https://test-bpp.com",
            transaction_id: transactionId,
            message_id: messageId,
            timestamp: new Date().toISOString(),
            ttl: "PT30S",
          },
          message: {
            order: {
              provider: { id: "P1", descriptor: { name: "Test Insurance Co" } },
              items: [
                {
                  id: "I1",
                  descriptor: { name: "Health Plan Basic" },
                  price: { currency: "INR", value: "5000" },
                },
              ],
              quote: {
                price: { currency: "INR", value: "5500" },
                breakup: [
                  {
                    title: "BASE_PRICE",
                    price: { currency: "INR", value: "5000" },
                  },
                  { title: "TAX", price: { currency: "INR", value: "500" } },
                ],
                ttl: "P15D",
              },
            },
          },
        },
      });

      expect(onSelectResponse.status()).toBe(200);
      const onSelectData = await onSelectResponse.json();
      expect(onSelectData.message.ack.status).toBe("ACK");

      // Step 2: Poll for results - should have the quote
      const pollResponse = await request.get(
        `/api/ondc/select-results?transaction_id=${transactionId}&message_id=${messageId}`,
      );

      expect(pollResponse.status()).toBe(200);

      const pollData = await pollResponse.json();
      expect(pollData.found).toBe(true);
      expect(pollData.hasResponse).toBe(true);
      expect(pollData.quote).toBeDefined();
      expect(pollData.quote.price.value).toBe("5500");
      expect(pollData.provider.descriptor.name).toBe("Test Insurance Co");
    });

    test("getSelectResults returns error info when BPP returns error", async ({
      request,
    }) => {
      const transactionId = `test-err-${Date.now()}`;
      const messageId = `msg-err-${Date.now()}`;

      // Simulate on_select callback with error
      await request.post("/api/ondc/on_select", {
        data: {
          context: {
            domain: "ONDC:FIS13",
            action: "on_select",
            transaction_id: transactionId,
            message_id: messageId,
            timestamp: new Date().toISOString(),
          },
          error: {
            type: "DOMAIN-ERROR",
            code: "40001",
            message: "Product not available in your area",
          },
        },
      });

      // Poll for results
      const pollResponse = await request.get(
        `/api/ondc/select-results?transaction_id=${transactionId}&message_id=${messageId}`,
      );

      expect(pollResponse.status()).toBe(200);

      const pollData = await pollResponse.json();
      expect(pollData.found).toBe(true);
      expect(pollData.hasResponse).toBe(true);
      expect(pollData.error).toBeDefined();
      expect(pollData.error.code).toBe("40001");
    });
  });

  test.describe("Status Flow Integration", () => {
    test("status endpoint returns messageId on success", async ({
      request,
    }) => {
      const transactionId = `test-status-${Date.now()}`;
      const orderId = `order-${Date.now()}`;

      // Call status - will fail to reach mock BPP but validates the endpoint works
      const statusResponse = await request.post("/api/ondc/status", {
        data: {
          transactionId,
          orderId,
          bppId: "test-bpp.example.com",
          bppUri: "https://test-bpp.example.com/api/ondc",
        },
      });
      const statusBody = await statusResponse.text();

      // Accept 200 (success) or 503 (BPP unreachable) as valid responses
      expect(
        [200, 503].includes(statusResponse.status()),
        `Expected 200 or 503 but got ${statusResponse.status()}. Response body: ${statusBody}`,
      ).toBe(true);

      // On 200 success, verify messageId, transactionId, and orderId
      if (statusResponse.status() === 200) {
        const statusData = JSON.parse(statusBody);
        expect(statusData).toHaveProperty("messageId");
        expect(statusData).toHaveProperty("transactionId");
        expect(statusData).toHaveProperty("orderId");
        expect(statusData.transactionId).toBe(transactionId);
        expect(statusData.orderId).toBe(orderId);

        // Verify UUID format for messageId
        expect(statusData.messageId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        );
      }
    });

    test("on_status stores policy details for polling", async ({
      request,
    }) => {
      const transactionId = `test-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const orderId = `order-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // Step 1: Simulate on_status callback with full policy details
      const onStatusResponse = await request.post("/api/ondc/on_status", {
        data: {
          context: {
            transaction_id: transactionId,
            bpp_id: "test-bpp",
            timestamp: new Date().toISOString(),
          },
          message: {
            order: {
              id: orderId,
              status: "COMPLETE",
              provider: { id: "P1", descriptor: { name: "Test Insurance Co" } },
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
                },
              ],
              documents: [
                {
                  descriptor: { code: "policy-doc" },
                  url: "https://test-insurance.example.com/policies/POL123.pdf",
                  mime_type: "application/pdf",
                },
              ],
            },
          },
        },
      });

      expect(onStatusResponse.status()).toBe(200);
      const onStatusData = await onStatusResponse.json();
      expect(onStatusData.message.ack.status).toBe("ACK");

      // Step 2: Poll for results - should have the policy details
      const pollResponse = await request.get(
        `/api/ondc/status-results?order_id=${orderId}`,
      );

      expect(pollResponse.status()).toBe(200);

      const pollData = await pollResponse.json();
      expect(pollData.found).toBe(true);
      expect(pollData.hasResponse).toBe(true);
      expect(pollData.orderId).toBe(orderId);
      expect(pollData.orderStatus).toBe("COMPLETE");
      expect(pollData.provider).toBeDefined();
      expect(pollData.provider.descriptor.name).toBe("Test Insurance Co");
      expect(pollData.items).toBeDefined();
      expect(pollData.items[0].descriptor.name).toBe("Health Plan Premium");
      expect(pollData.policyDocument).toBeDefined();
      expect(pollData.policyDocument.url).toBe(
        "https://test-insurance.example.com/policies/POL123.pdf",
      );
    });

    test("on_status stores policy with documents", async ({ request }) => {
      const transactionId = `test-docs-${Date.now()}`;
      const orderId = `order-docs-${Date.now()}`;

      // Simulate on_status callback with multiple documents
      await request.post("/api/ondc/on_status", {
        data: {
          context: {
            transaction_id: transactionId,
            bpp_id: "test-bpp",
            timestamp: new Date().toISOString(),
          },
          message: {
            order: {
              id: orderId,
              status: "COMPLETE",
              provider: { id: "P1" },
              fulfillments: [
                {
                  id: "F1",
                  type: "POLICY",
                  state: { descriptor: { code: "GRANTED" } },
                },
              ],
              documents: [
                {
                  descriptor: { code: "policy-doc" },
                  url: "https://test-insurance.example.com/policies/POL456.pdf",
                  mime_type: "application/pdf",
                },
                {
                  descriptor: { code: "terms-and-conditions" },
                  url: "https://test-insurance.example.com/terms.pdf",
                  mime_type: "application/pdf",
                },
              ],
            },
          },
        },
      });

      // Poll for results
      const pollResponse = await request.get(
        `/api/ondc/status-results?order_id=${orderId}`,
      );

      expect(pollResponse.status()).toBe(200);

      const pollData = await pollResponse.json();
      expect(pollData.found).toBe(true);
      expect(pollData.hasResponse).toBe(true);
      expect(pollData.documents).toBeDefined();
      expect(pollData.documents.length).toBe(2);
      expect(pollData.policyDocument).toBeDefined();
      expect(pollData.policyDocument.descriptor.code).toBe("policy-doc");
      expect(pollData.policyDocument.url).toBe(
        "https://test-insurance.example.com/policies/POL456.pdf",
      );
    });

    test("on_status with BPP error stores error for polling", async ({
      request,
    }) => {
      const orderId = `order-err-${Date.now()}`;

      // Step 1: Simulate on_status callback with error
      await request.post("/api/ondc/on_status", {
        data: {
          context: { bpp_id: "test-bpp", timestamp: new Date().toISOString() },
          message: { order: { id: orderId } },
          error: {
            type: "DOMAIN-ERROR",
            code: "40004",
            message: "Order not found",
          },
        },
      });

      // Step 2: Poll for results - should have the error
      const pollResponse = await request.get(
        `/api/ondc/status-results?order_id=${orderId}`,
      );

      expect(pollResponse.status()).toBe(200);

      const pollData = await pollResponse.json();
      expect(pollData.found).toBe(true);
      expect(pollData.hasResponse).toBe(true);
      expect(pollData.error).toBeDefined();
      expect(pollData.error.code).toBe("40004");
      expect(pollData.error.message).toBe("Order not found");
    });
  });

  test.describe("Init Flow Integration", () => {
    test("init endpoint returns messageId on success", async ({ request }) => {
      const transactionId = `test-init-${Date.now()}`;

      const response = await request.post("/api/ondc/init", {
        data: {
          transactionId,
          bppId: "test-bpp.example.com",
          bppUri: "https://test-bpp.example.com/api/ondc",
          providerId: "provider-001",
          itemId: "item-001",
          parentItemId: "item-001",
          xinputFormId: "form-001",
          submissionId: "sub-001",
          customerName: "Test User",
          customerEmail: "test@example.com",
          customerPhone: "9876543210",
          amount: "15000.00",
        },
      });
      const body = await response.text();

      // Accept 200 (success) or 503 (BPP unreachable) as valid responses
      // Per CLAUDE.md: Never use test.skip() for gateway errors
      expect(
        [200, 503].includes(response.status()),
        `Expected 200 or 503 but got ${response.status()}. Response body: ${body}`,
      ).toBe(true);

      // On 200 success, verify messageId and transactionId
      if (response.status() === 200) {
        const data = JSON.parse(body);
        expect(
          data,
          `Expected response to have messageId and transactionId. Response: ${body}`,
        ).toHaveProperty("messageId");
        expect(data).toHaveProperty("transactionId");
        expect(data.transactionId).toBe(transactionId);

        // Verify UUID format for messageId
        expect(data.messageId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        );
      }
    });

    test("on_init stores payment URL for polling", async ({ request }) => {
      const transactionId = `test-init-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const messageId = `msg-init-${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // Step 1: Simulate on_init callback
      const onInitResponse = await request.post("/api/ondc/on_init", {
        data: {
          context: {
            transaction_id: transactionId,
            message_id: messageId,
            bpp_id: "test-bpp",
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

      expect(
        onInitResponse.status(),
        `Expected 200 but got ${onInitResponse.status()}`,
      ).toBe(200);
      const onInitData = await onInitResponse.json();
      expect(onInitData.message.ack.status).toBe("ACK");

      // Step 2: Poll for results - should have the payment URL
      const pollResponse = await request.get(
        `/api/ondc/init-results?transaction_id=${transactionId}&message_id=${messageId}`,
      );

      expect(
        pollResponse.status(),
        `Expected 200 but got ${pollResponse.status()}`,
      ).toBe(200);

      const pollData = await pollResponse.json();
      expect(
        pollData.found,
        `Expected found=true. Response: ${JSON.stringify(pollData)}`,
      ).toBe(true);
      expect(
        pollData.hasResponse,
        `Expected hasResponse=true. Response: ${JSON.stringify(pollData)}`,
      ).toBe(true);
      expect(
        pollData.payments,
        `Expected payments to be defined. Response: ${JSON.stringify(pollData)}`,
      ).toBeDefined();
      expect(
        Array.isArray(pollData.payments),
        `Expected payments to be an array. Response: ${JSON.stringify(pollData)}`,
      ).toBe(true);
      expect(pollData.payments[0].url).toBe(
        "https://payment-gateway.example.com/pay/abc123",
      );
      expect(pollData.payments[0].status).toBe("NOT-PAID");
    });

    test("on_init with BPP error stores error for polling", async ({
      request,
    }) => {
      const transactionId = `test-init-err-${Date.now()}`;
      const messageId = `msg-init-err-${Date.now()}`;

      // Simulate on_init callback with error
      const onInitResponse = await request.post("/api/ondc/on_init", {
        data: {
          context: {
            transaction_id: transactionId,
            message_id: messageId,
            timestamp: new Date().toISOString(),
          },
          error: {
            type: "DOMAIN-ERROR",
            code: "40002",
            message: "KYC validation failed",
          },
        },
      });

      expect(onInitResponse.status()).toBe(200);
      const onInitData = await onInitResponse.json();
      expect(onInitData.message.ack.status).toBe("ACK");

      // Poll for results - should have the error
      const pollResponse = await request.get(
        `/api/ondc/init-results?transaction_id=${transactionId}&message_id=${messageId}`,
      );

      expect(pollResponse.status()).toBe(200);

      const pollData = await pollResponse.json();
      expect(pollData.found).toBe(true);
      expect(pollData.hasResponse).toBe(true);
      expect(pollData.error).toBeDefined();
      expect(pollData.error.code).toBe("40002");
    });
  });

  test.describe("Confirm Flow Integration", () => {
    test("confirm endpoint returns messageId on success", async ({
      request,
    }) => {
      const transactionId = `test-confirm-${Date.now()}`;

      const response = await request.post("/api/ondc/confirm", {
        data: {
          transactionId,
          bppId: "test-bpp.example.com",
          bppUri: "https://test-bpp.example.com/api/ondc",
          providerId: "provider-001",
          itemId: "item-001",
          parentItemId: "item-001",
          xinputFormId: "form-001",
          submissionId: "sub-001",
          customerName: "Test User",
          customerEmail: "test@example.com",
          customerPhone: "9876543210",
          quoteId: "quote-001",
          amount: "15000.00",
          quoteBreakup: [
            {
              title: "Base Premium",
              price: { currency: "INR", value: "12000.00" },
            },
            { title: "GST", price: { currency: "INR", value: "3000.00" } },
          ],
        },
      });
      const body = await response.text();

      // Accept 200 (success) or 503 (BPP unreachable)
      expect(
        [200, 503].includes(response.status()),
        `Expected 200 or 503 but got ${response.status()}. Response body: ${body}`,
      ).toBe(true);

      // On 200 success, verify messageId and transactionId
      if (response.status() === 200) {
        const data = JSON.parse(body);
        expect(data).toHaveProperty("messageId");
        expect(data).toHaveProperty("transactionId");
        expect(data.transactionId).toBe(transactionId);

        // Verify UUID format for messageId
        expect(data.messageId).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
        );
      }
    });

    test("on_confirm stores order and policy for polling", async ({
      request,
    }) => {
      const transactionId = `test-confirm-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const messageId = `msg-confirm-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const orderId = `order-confirm-${Date.now()}`;

      // Step 1: Simulate on_confirm callback
      const onConfirmResponse = await request.post("/api/ondc/on_confirm", {
        data: {
          context: {
            transaction_id: transactionId,
            message_id: messageId,
            bpp_id: "test-bpp",
            timestamp: new Date().toISOString(),
          },
          message: {
            order: {
              id: orderId,
              status: "ACTIVE",
              provider: {
                id: "P1",
                descriptor: { name: "Test Insurance Co" },
              },
              items: [
                { id: "I1", descriptor: { name: "Health Plan Premium" } },
              ],
              fulfillments: [
                {
                  id: "F1",
                  type: "POLICY",
                  state: { descriptor: { code: "GRANTED" } },
                },
              ],
              payments: [
                {
                  collected_by: "BPP",
                  status: "PAID",
                  type: "PRE-FULFILLMENT",
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

      expect(onConfirmResponse.status()).toBe(200);
      const onConfirmData = await onConfirmResponse.json();
      expect(onConfirmData.message.ack.status).toBe("ACK");

      // Step 2: Poll for results - should have the order
      const pollResponse = await request.get(
        `/api/ondc/confirm-results?transaction_id=${transactionId}&message_id=${messageId}`,
      );

      expect(pollResponse.status()).toBe(200);

      const pollData = await pollResponse.json();
      expect(pollData.found).toBe(true);
      expect(pollData.hasResponse).toBe(true);
      expect(pollData.orderId).toBe(orderId);
    });

    test("on_confirm with BPP error stores error for polling", async ({
      request,
    }) => {
      const transactionId = `test-confirm-err-${Date.now()}`;
      const messageId = `msg-confirm-err-${Date.now()}`;

      // Simulate on_confirm callback with error
      await request.post("/api/ondc/on_confirm", {
        data: {
          context: {
            transaction_id: transactionId,
            message_id: messageId,
            timestamp: new Date().toISOString(),
          },
          error: {
            type: "DOMAIN-ERROR",
            code: "40003",
            message: "Payment verification failed",
          },
        },
      });

      // Poll for results
      const pollResponse = await request.get(
        `/api/ondc/confirm-results?transaction_id=${transactionId}&message_id=${messageId}`,
      );

      expect(pollResponse.status()).toBe(200);

      const pollData = await pollResponse.json();
      expect(pollData.found).toBe(true);
      expect(pollData.hasResponse).toBe(true);
      expect(pollData.error).toBeDefined();
      expect(pollData.error.code).toBe("40003");
    });
  });
});
