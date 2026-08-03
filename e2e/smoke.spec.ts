import { test, expect } from "@playwright/test";

test("home page lists all six modules and links into each one", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Simulation Suite", level: 1 })).toBeVisible();

  const moduleCardLinks = page.locator('main a[href^="/modules/"]');
  await expect(moduleCardLinks).toHaveCount(6);

  await moduleCardLinks.first().click();
  await expect(page).toHaveURL(/\/modules\//);
  await expect(page.getByRole("button", { name: "Run simulation" }).first()).toBeVisible();
});
