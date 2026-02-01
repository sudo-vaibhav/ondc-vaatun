import { expect, test } from "@playwright/test";

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

  test("GET /api/ondc/health returns JSON content type", async ({
    request,
  }) => {
    const response = await request.get("/api/ondc/health");
    const body = await response.text();

    expect(
      response.headers()["content-type"],
      `Expected JSON content-type. Response body: ${body}`,
    ).toContain("application/json");
  });
});
