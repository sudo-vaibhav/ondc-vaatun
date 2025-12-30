import { expect, test } from "@playwright/test";

test.describe("Polling API", () => {
  test.describe("GET /api/ondc/search-results", () => {
    test("returns 400 when transaction_id is missing", async ({ request }) => {
      const response = await request.get("/api/ondc/search-results");

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty("error");
      expect(data.error).toBe("Missing transaction_id query parameter");
    });

    test("returns not found for unknown transaction_id", async ({
      request,
    }) => {
      // Use a unique transaction ID that won't exist in the store
      const uniqueTransactionId = `unknown-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const response = await request.get(
        `/api/ondc/search-results?transaction_id=${uniqueTransactionId}`,
      );

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("found");
      expect(data.found).toBe(false);
      expect(data).toHaveProperty("transactionId");
      expect(data.transactionId).toBe(uniqueTransactionId);
      expect(data).toHaveProperty("responseCount");
      expect(data.responseCount).toBe(0);
      expect(data).toHaveProperty("providers");
      expect(Array.isArray(data.providers)).toBe(true);
      expect(data.providers).toHaveLength(0);
    });

    test("returns JSON content type", async ({ request }) => {
      const response = await request.get(
        "/api/ondc/search-results?transaction_id=test-id",
      );
      expect(response.headers()["content-type"]).toContain("application/json");
    });
  });

  test.describe("GET /api/ondc/select-results", () => {
    test("returns 400 when transaction_id is missing", async ({ request }) => {
      const response = await request.get("/api/ondc/select-results");

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty("error");
      expect(data.error).toBe(
        "Missing transaction_id or message_id query parameters",
      );
    });

    test("returns 400 when message_id is missing", async ({ request }) => {
      const response = await request.get(
        "/api/ondc/select-results?transaction_id=019abc12-3456-7890-abcd-ef1234567890",
      );

      expect(response.status()).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty("error");
    });

    test("returns not found for unknown transaction_id and message_id", async ({
      request,
    }) => {
      // Use unique IDs that won't exist in the store
      const uniqueTransactionId = `unknown-txn-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const uniqueMessageId = `unknown-msg-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const response = await request.get(
        `/api/ondc/select-results?transaction_id=${uniqueTransactionId}&message_id=${uniqueMessageId}`,
      );

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty("found");
      expect(data.found).toBe(false);
      expect(data).toHaveProperty("transactionId");
      expect(data.transactionId).toBe(uniqueTransactionId);
      expect(data).toHaveProperty("messageId");
      expect(data.messageId).toBe(uniqueMessageId);
      expect(data).toHaveProperty("hasResponse");
      expect(data.hasResponse).toBe(false);
    });

    test("returns JSON content type", async ({ request }) => {
      const response = await request.get(
        "/api/ondc/select-results?transaction_id=test&message_id=test",
      );
      expect(response.headers()["content-type"]).toContain("application/json");
    });
  });

  test.describe("Search Flow Integration", () => {
    test("search creates entry that can be polled, on_search updates it", async ({
      request,
    }) => {
      // Step 1: Initiate a search (may fail to reach gateway, but should create entry)
      const searchResponse = await request.post("/api/ondc/search");

      // Skip integration test if gateway is unreachable
      if (searchResponse.status() !== 200) {
        test.skip();
        return;
      }

      const searchData = await searchResponse.json();
      const { transactionId, messageId } = searchData;

      expect(transactionId).toBeDefined();
      expect(messageId).toBeDefined();

      // Step 2: Poll for results (should find the entry, but no responses yet)
      const pollResponse = await request.get(
        `/api/ondc/search-results?transaction_id=${transactionId}`,
      );

      expect(pollResponse.status()).toBe(200);

      const pollData = await pollResponse.json();
      expect(pollData.found).toBe(true);
      expect(pollData.transactionId).toBe(transactionId);
      expect(pollData.responseCount).toBeGreaterThanOrEqual(0);

      // Step 3: Simulate an on_search callback
      const onSearchResponse = await request.post("/api/ondc/on_search", {
        data: {
          context: {
            transaction_id: transactionId,
            message_id: "callback-message-id",
            bpp_id: "test-bpp",
            bpp_uri: "https://test-bpp.com",
            timestamp: new Date().toISOString(),
          },
          message: {
            catalog: {
              descriptor: { name: "Test Catalog" },
              providers: [
                {
                  id: "provider-001",
                  descriptor: { name: "Test Provider" },
                  items: [
                    { id: "item-001", descriptor: { name: "Test Insurance" } },
                  ],
                },
              ],
            },
          },
        },
      });

      expect(onSearchResponse.status()).toBe(200);

      // Step 4: Poll again - should now have the response
      const pollResponse2 = await request.get(
        `/api/ondc/search-results?transaction_id=${transactionId}`,
      );

      expect(pollResponse2.status()).toBe(200);

      const pollData2 = await pollResponse2.json();
      expect(pollData2.found).toBe(true);
      expect(pollData2.responseCount).toBeGreaterThanOrEqual(1);
      expect(pollData2.providers.length).toBeGreaterThanOrEqual(1);
      expect(pollData2.responses.length).toBeGreaterThanOrEqual(1);
    });
  });

  test.describe("Select Flow Integration", () => {
    test("select creates entry that can be polled, on_select updates it", async ({
      request,
    }) => {
      const transactionId = "019abc12-3456-7890-abcd-integration-test";

      // Step 1: Initiate a select (will fail to reach BPP but should create entry)
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

      // Skip if select fails (BPP unreachable is expected)
      if (selectResponse.status() !== 200) {
        // Still test on_select and polling independently
        test.skip();
        return;
      }

      const selectData = await selectResponse.json();
      const { messageId } = selectData;

      // Step 2: Poll for results (should find entry, no response yet)
      const pollResponse = await request.get(
        `/api/ondc/select-results?transaction_id=${transactionId}&message_id=${messageId}`,
      );

      expect(pollResponse.status()).toBe(200);

      const pollData = await pollResponse.json();
      expect(pollData.found).toBe(true);
      expect(pollData.hasResponse).toBe(false);

      // Step 3: Simulate an on_select callback
      const onSelectResponse = await request.post("/api/ondc/on_select", {
        data: {
          context: {
            transaction_id: transactionId,
            message_id: messageId,
            bpp_id: "test-bpp.example.com",
            bpp_uri: "https://test-bpp.example.com/api/ondc",
            timestamp: new Date().toISOString(),
          },
          message: {
            order: {
              provider: { id: "provider-001" },
              items: [{ id: "item-001" }],
              quote: {
                price: { currency: "INR", value: "15000.00" },
                breakup: [
                  {
                    title: "Premium",
                    price: { currency: "INR", value: "15000.00" },
                  },
                ],
              },
            },
          },
        },
      });

      expect(onSelectResponse.status()).toBe(200);

      // Step 4: Poll again - should now have the quote
      const pollResponse2 = await request.get(
        `/api/ondc/select-results?transaction_id=${transactionId}&message_id=${messageId}`,
      );

      expect(pollResponse2.status()).toBe(200);

      const pollData2 = await pollResponse2.json();
      expect(pollData2.found).toBe(true);
      expect(pollData2.hasResponse).toBe(true);
      expect(pollData2.quote).toBeDefined();
      expect(pollData2.quote.price.value).toBe("15000.00");
    });

    test("on_select creates entry if it does not exist", async ({
      request,
    }) => {
      const transactionId = `test-${Date.now()}`;
      const messageId = `msg-${Date.now()}`;

      // Simulate on_select without prior select call
      const onSelectResponse = await request.post("/api/ondc/on_select", {
        data: {
          context: {
            transaction_id: transactionId,
            message_id: messageId,
            bpp_id: "late-response-bpp",
            bpp_uri: "https://late-response-bpp.com",
            timestamp: new Date().toISOString(),
          },
          message: {
            order: {
              provider: { id: "provider-late" },
              items: [{ id: "item-late" }],
              quote: {
                price: { currency: "INR", value: "10000.00" },
              },
            },
          },
        },
      });

      expect(onSelectResponse.status()).toBe(200);

      // Poll should find the entry created by on_select
      const pollResponse = await request.get(
        `/api/ondc/select-results?transaction_id=${transactionId}&message_id=${messageId}`,
      );

      expect(pollResponse.status()).toBe(200);

      const pollData = await pollResponse.json();
      expect(pollData.found).toBe(true);
      expect(pollData.hasResponse).toBe(true);
    });
  });
});
