import { expect, test } from "@playwright/test";

test.describe("Homepage", () => {
  test("should load the homepage successfully", async ({ page }) => {
    // Navigate to the homepage
    await page.goto("/");

    // Check that the page title contains "ONDC Vaatun"
    await expect(
      page.getByRole("heading", { name: "ONDC Vaatun", level: 1 }),
    ).toBeVisible();

    // Verify the main badge is present
    await expect(page.getByText("ONDC Network Integration")).toBeVisible();

    // Check for key sections
    await expect(
      page.getByRole("heading", { name: "What is ONDC?" }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Features" })).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "API Directory" }),
    ).toBeVisible();
  });

  test("should have working navigation links", async ({ page }) => {
    await page.goto("/");

    // Note: API Documentation link removed - OpenAPI docs disabled due to
    // zod-to-openapi not working in a type-safe way with Zod v4

    // Check Open Directory button
    const directoryLink = page.getByRole("link", { name: /Open Directory/i });
    await expect(directoryLink).toBeVisible();
    await expect(directoryLink).toHaveAttribute("href", "/directory");
  });

  test("should display all feature cards", async ({ page }) => {
    await page.goto("/");

    // Verify all 6 feature cards are present
    await expect(
      page.getByText("Subscription Verification", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Domain Verification", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Secure Key Management", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText("Health Monitoring", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText("TypeScript", { exact: true })).toBeVisible();
    await expect(
      page.getByText("High Performance", { exact: true }),
    ).toBeVisible();
  });

  test("should have external links with correct attributes", async ({
    page,
  }) => {
    await page.goto("/");

    // Check ONDC website link
    const ondcLink = page
      .getByRole("link", { name: "Open Network for Digital Commerce" })
      .first();
    await expect(ondcLink).toHaveAttribute("href", "https://ondc.org/");
    await expect(ondcLink).toHaveAttribute("target", "_blank");
    await expect(ondcLink).toHaveAttribute("rel", "noopener noreferrer");

    // Check Vaatun website link in the footer (skip the header logo)
    const vaatunLinks = page.getByRole("link", { name: "Vaatun" });
    const footerVaatunLink = vaatunLinks.nth(1); // Second occurrence is in footer
    await expect(footerVaatunLink).toHaveAttribute(
      "href",
      "https://www.vaatun.com",
    );
    await expect(footerVaatunLink).toHaveAttribute("target", "_blank");
    await expect(footerVaatunLink).toHaveAttribute(
      "rel",
      "noopener noreferrer",
    );
  });
});
