import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

const PAGES = [
  "/",
  "/demo",
  "/docs",
  "/modules/system-call-contracts",
  "/modules/scheduling-and-concurrency",
  "/modules/virtual-memory",
  "/modules/crash-consistency",
  "/modules/virtualization-and-isolation",
  "/modules/integrated-failure-analysis",
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

test("the Virtual Memory page's run workflow is reachable by keyboard alone", async ({ page }) => {
  await page.goto("/modules/virtual-memory");
  await page.getByLabel("Policy", { exact: true }).focus();
  await page.keyboard.press("Tab"); // Frames
  await page.keyboard.press("Tab"); // Isolate-analytics checkbox
  await page.keyboard.press("Tab"); // Run simulation button
  await expect(page.getByRole("button", { name: "Run simulation" })).toBeFocused();
  await page.keyboard.press("Enter");
  const resultsTable = page.getByRole("region", { name: "4. Compare results" }).getByRole("table");
  await expect(resultsTable.locator("tbody tr")).toHaveCount(1);
});

test("the Integrated Failure Analysis page's run workflow is reachable by keyboard alone", async ({ page }) => {
  await page.goto("/modules/integrated-failure-analysis");
  await page.getByLabel("Scheduling policy").focus();
  await page.keyboard.press("Tab"); // Durability policy
  await page.keyboard.press("Tab"); // Isolation boundary
  await page.keyboard.press("Tab"); // Memory control checkbox
  await page.keyboard.press("Tab"); // Run simulation button
  await expect(page.getByRole("button", { name: "Run simulation" })).toBeFocused();
  await page.keyboard.press("Enter");
  const resultsTable = page.getByRole("region", { name: "3. Compare results" }).getByRole("table");
  await expect(resultsTable.locator("tbody tr")).toHaveCount(1);
});

test("the Crash Consistency page's crash-point run workflow is reachable by keyboard alone", async ({ page }) => {
  await page.goto("/modules/crash-consistency");
  await page.getByLabel("Crash point", { exact: true }).focus();
  await page.keyboard.press("Tab"); // Run simulation button
  await expect(page.getByRole("button", { name: "Run simulation" }).first()).toBeFocused();
  await page.keyboard.press("Enter");
  const resultsTable = page.getByRole("region", { name: "3. Configure and run: crash point" }).getByRole("table");
  await expect(resultsTable.locator("tbody tr")).toHaveCount(1);
});

test("the Virtualization and Isolation page's run workflow is reachable by keyboard alone", async ({ page }) => {
  await page.goto("/modules/virtualization-and-isolation");
  await page.getByLabel("Isolation boundary").focus();
  await page.keyboard.press("Tab"); // Run simulation button
  await expect(page.getByRole("button", { name: "Run simulation" })).toBeFocused();
  await page.keyboard.press("Enter");
  const resultsTable = page.getByRole("region", { name: "4. Compare results" }).getByRole("table");
  await expect(resultsTable.locator("tbody tr")).toHaveCount(1);
});
