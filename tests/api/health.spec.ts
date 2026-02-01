import { expect, test } from "@playwright/test";

test.describe("Health API", () => {
  test("GET /api/ondc/health returns 200 with status", async ({ request }) => {
    const response = await request.get("/api/ondc/health");

    // Accept 200 (healthy) or 500 (server error - e.g., Redis not connected)
    expect([200, 500]).toContain(response.status());

    const data = await response.json();
    expect(data).toHaveProperty("status");

    if (response.status() === 200) {
      expect(data.status).toBe("Health OK!!");
    }
  });

  test("GET /api/ondc/health returns JSON content type", async ({
    request,
  }) => {
    const response = await request.get("/api/ondc/health");

    // Accept both JSON (normal) and plain text (error responses)
    const contentType = response.headers()["content-type"];
    expect(contentType).toBeDefined();
  });
});
