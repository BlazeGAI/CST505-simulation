import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("Theme toggle", () => {
  test("defaults to the OS color scheme when no choice has been saved", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveClass(/dark/);

    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("clicking the toggle switches the theme and persists it across a reload", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveClass(/dark/);

    const toggle = page.getByRole("button", { name: "Switch to dark theme" });
    await toggle.click();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeVisible();

    // Persists even though the OS preference is still light.
    await page.reload();
    await expect(page.locator("html")).toHaveClass(/dark/);
    await expect(page.getByRole("button", { name: "Switch to light theme" })).toBeVisible();

    // Toggling back to light overrides the saved choice too.
    await page.getByRole("button", { name: "Switch to light theme" }).click();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
    await page.reload();
    await expect(page.locator("html")).not.toHaveClass(/dark/);
  });

  test("the dark theme has no detectable axe violations on the home page", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/");
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
});
