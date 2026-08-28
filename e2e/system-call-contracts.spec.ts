import { test, expect } from "@playwright/test";

test.describe("System-Call Contracts module", () => {
  test("run normal and a failure scenario, compare, and export JSON", async ({ page }) => {
    await page.goto("/modules/system-call-contracts");
    await expect(page.getByRole("heading", { name: "System Boundaries Investigation" })).toBeVisible();

    // Run the normal scenario, then the denied-write failure scenario.
    await page.getByRole("button", { name: "Run simulation" }).click();
    await page.getByLabel("Scenario").selectOption("denied-write");
    await page.getByRole("button", { name: "Run simulation" }).click();

    const comparisonTable = page.getByRole("table").first();
    await expect(comparisonTable.locator("tbody tr")).toHaveCount(2);
    await expect(comparisonTable.locator("tbody tr").first()).toContainText("74"); // exit code

    // Expand the failure run's trace and confirm the divergence is flagged.
    // Runs are numbered newest-first, so the just-run failure scenario is #2.
    const failureRun = page.locator("details", { hasText: "Trace for run #2" });
    await failureRun.locator("summary").click();
    await expect(failureRun.getByText("first divergence")).toBeVisible();

    await page.getByLabel("Prediction").fill("The alert-log openat should fail with EACCES.");
    await page
      .getByLabel("Simulated results")
      .fill("openat on alert.log returned -1 EACCES; the program exited 74.");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download JSON" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("system-call-contracts-evidence.json");
  });

  test("the category filter hides unchecked categories from the run's trace", async ({ page }) => {
    await page.goto("/modules/system-call-contracts");
    await page.getByRole("button", { name: "Run simulation" }).click();
    const runDetails = page.locator("details", { hasText: "Trace for run #1" });
    await runDetails.locator("summary").click();

    const processCells = runDetails.getByRole("cell", { name: "process", exact: true });
    await expect(processCells.first()).toBeVisible();
    await page.getByRole("checkbox", { name: "Process", exact: true }).uncheck();
    await expect(processCells).toHaveCount(0);
  });

  test("the worked example uses a different seed than the assessed run", async ({ page }) => {
    await page.goto("/modules/system-call-contracts");
    await expect(page.getByText(/Worked example \(seed 900/)).toBeVisible();
    await expect(page.getByText(/Seed.*100.*is the published default/)).toBeVisible();
  });
});
