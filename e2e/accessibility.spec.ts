import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGES = [
  "/",
  "/demo",
  "/docs",
  "/modules/system-call-contracts",
  "/modules/scheduling-and-concurrency",
  "/modules/virtual-memory",
];

for (const path of PAGES) {
  test(`${path} has no detectable axe violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  });
}

test("the demo page's primary workflow is reachable by keyboard alone", async ({ page }) => {
  await page.goto("/demo");
  await page.getByLabel("Seed").focus();
  await page.keyboard.press("Tab"); // Event count
  await page.keyboard.press("Tab"); // Arrival pace
  await page.keyboard.press("Tab"); // Inject failure checkbox
  await page.keyboard.press("Space");
  await expect(page.getByLabel("Inject a failure partway through")).toBeChecked();
  await page.keyboard.press("Tab"); // Run simulation button
  await expect(page.getByRole("button", { name: "Run simulation" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("table").first().locator("tbody tr")).toHaveCount(1);
});

test("the System-Call Contracts page's run workflow is reachable by keyboard alone", async ({ page }) => {
  await page.goto("/modules/system-call-contracts");
  await page.getByLabel("Scenario").focus();
  await page.keyboard.press("Tab"); // Run simulation button
  await expect(page.getByRole("button", { name: "Run simulation" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("table").first().locator("tbody tr")).toHaveCount(1);
});

test("the Scheduling and Concurrency page's scheduling run workflow is reachable by keyboard alone", async ({
  page,
}) => {
  await page.goto("/modules/scheduling-and-concurrency");
  await page.getByLabel("Policy", { exact: true }).focus();
  await page.keyboard.press("Tab"); // Time quantum
  await page.keyboard.press("Tab"); // Run simulation button
  await expect(page.getByRole("button", { name: "Run simulation" }).first()).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("table").first().locator("tbody tr")).toHaveCount(1);
});
