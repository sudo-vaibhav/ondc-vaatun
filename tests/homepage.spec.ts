import { expect, test } from "@playwright/test";

test.describe("Homepage", () => {
  test("should load the homepage successfully", async ({ page }) => {
    // Navigate to the homepage
    await page.goto("/");

    // Wait for DOM to be ready (not networkidle as SSE connections stay open)
    await page.waitForLoadState("domcontentloaded");

    // Check that the header contains "ONDC Vaatun" link
    await expect(page.getByRole("link", { name: "ONDC Vaatun" })).toBeVisible();

    // Verify the hero badge is present
    await expect(page.getByText("Powered by ONDC")).toBeVisible();

    // Check the main headline
    await expect(
      page.getByRole("heading", { name: /Insurance/i, level: 1 }),
    ).toBeVisible();

    // Check for key section headings (use heading role for more specificity)
    await expect(
      page.getByRole("heading", { name: "Choose Your Coverage", level: 2 }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: /How Buying Insurance on ONDC Works/i,
        level: 2,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "The ONDC Advantage", level: 2 }),
    ).toBeVisible();
  });

  test("should have working navigation and CTA buttons", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Check Get Instant Quotes button in hero
    await expect(
      page.getByRole("button", { name: /Get Instant Quotes/i }),
    ).toBeVisible();

    // Check See How It Works button
    await expect(
      page.getByRole("button", { name: /See How It Works/i }),
    ).toBeVisible();
  });

  test("should display insurance cards", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Verify insurance type cards are present (use level 3 for card headings)
    await expect(
      page.getByRole("heading", { name: "Health Insurance", level: 3 }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Motor Insurance", level: 3 }),
    ).toBeVisible();

    // Verify CTA buttons for each insurance type
    await expect(
      page.getByRole("button", { name: /Explore Health Plans/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Explore Motor Plans/i }),
    ).toBeVisible();
  });

  test("should display ONDC advantage features", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Verify ONDC advantage feature headings (level 3)
    await expect(
      page.getByRole("heading", { name: "Truly Open Marketplace", level: 3 }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", {
        name: "What You See Is What You Pay",
        level: 3,
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Privacy by Design", level: 3 }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Freedom to Switch", level: 3 }),
    ).toBeVisible();
  });

  test("should display how it works steps", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Verify how it works step headings (level 3) - use first() for desktop view
    // (mobile view also has these headings but hidden via CSS)
    await expect(
      page
        .getByRole("heading", { name: "Tell Us What You Need", level: 3 })
        .first(),
    ).toBeVisible();
    await expect(
      page
        .getByRole("heading", { name: "We Search the Network", level: 3 })
        .first(),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Compare & Choose", level: 3 }).first(),
    ).toBeVisible();
    await expect(
      page
        .getByRole("heading", { name: "Get Covered Instantly", level: 3 })
        .first(),
    ).toBeVisible();
  });
});
