import { expect, test } from "@playwright/test";

test.describe("Health API", () => {
  test("GET /api/ondc/health returns 200 with status", async ({ request }) => {
    const response = await request.get("/api/ondc/health");

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data).toHaveProperty("status");
    expect(data.status).toBe("Health OK!!");
  });

  test("GET /api/ondc/health returns JSON content type", async ({
    request,
  }) => {
    const response = await request.get("/api/ondc/health");

    expect(response.headers()["content-type"]).toContain("application/json");
  });
});
