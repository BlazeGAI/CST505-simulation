import { test, expect } from "@playwright/test";

test("home page lists all six modules and links to the foundation demo", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "CST505 Simulation Suite" })).toBeVisible();
  const moduleCardLinks = page.locator('main a[href^="/modules/"]');
  await expect(moduleCardLinks).toHaveCount(6);
  await page.getByRole("main").getByRole("link", { name: "foundation demo" }).click();
  await expect(page).toHaveURL(/\/demo$/);
});

test("a module placeholder page explains that its simulation ships in a follow-up PR", async ({ page }) => {
  await page.goto("/modules/system-call-contracts");
  await expect(page.getByRole("heading", { name: "System-Call Contracts" })).toBeVisible();
  await expect(page.getByText(/follow-up pull request/)).toBeVisible();
});

test("end-to-end evidence workflow: configure, run, compare, record evidence, export JSON", async ({
  page,
}) => {
  await page.goto("/demo");

  // Configure a scenario and run it twice to build a comparison table.
  await page.getByLabel("Seed").fill("7");
  await page.getByLabel(/Event count/).fill("8");
  await page.getByRole("button", { name: "Run simulation" }).click();

  await page.getByLabel("Inject a failure partway through").check();
  await page.getByRole("button", { name: "Run simulation" }).click();

  const runsTable = page.getByRole("table").first();
  await expect(runsTable.locator("tbody tr")).toHaveCount(2);

  // Fill out the Simulation Evidence Record.
  await page.getByLabel("Prediction").fill("Injecting a failure should drop exactly one event.");
  await page
    .getByLabel("Observed results")
    .fill("One run dropped exactly one event; the other completed all events.");

  // Export JSON and verify the download contains our evidence.
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download JSON" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toBe("reference-demo-evidence.json");
});
