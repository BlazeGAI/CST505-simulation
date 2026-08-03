import { test, expect } from "@playwright/test";

test.describe("Integrated Failure Analysis module", () => {
  test("the default (weakest-policy) configuration fails at the very first stage: scheduling", async ({ page }) => {
    await page.goto("/modules/integrated-failure-analysis");
    await expect(
      page.getByRole("heading", { name: "Integrated Operating-System Failure Analysis" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Run simulation" }).click();

    const resultsTable = page.getByRole("region", { name: "3. Compare results" }).getByRole("table");
    const row = resultsTable.locator("tbody tr").first();
    await expect(row).toContainText("Scheduling");
    await expect(row.locator("td").last()).toHaveText("0 / 4");
  });

  test("applying the fully mitigated policies holds every stage", async ({ page }) => {
    await page.goto("/modules/integrated-failure-analysis");

    await page.getByRole("button", { name: "Run simulation" }).click(); // default (weakest) first
    await page.getByRole("button", { name: "Apply fully mitigated policies" }).click();
    await page.getByRole("button", { name: "Run simulation" }).click();

    const resultsTable = page.getByRole("region", { name: "3. Compare results" }).getByRole("table");
    const rows = resultsTable.locator("tbody tr");
    await expect(rows).toHaveCount(2);

    const mitigatedRow = rows.nth(0);
    await expect(mitigatedRow).toContainText("None (fully mitigated)");
    await expect(mitigatedRow.locator("td").last()).toHaveText("4 / 4");
  });

  test("fixing only the scheduling policy moves the first failure to the memory stage", async ({ page }) => {
    await page.goto("/modules/integrated-failure-analysis");

    await page.getByRole("button", { name: "Run simulation" }).click(); // default (weakest)
    await page.getByLabel("Scheduling policy").selectOption("fair-share");
    await page.getByRole("button", { name: "Run simulation" }).click();

    const resultsTable = page.getByRole("region", { name: "3. Compare results" }).getByRole("table");
    const rows = resultsTable.locator("tbody tr");
    await expect(rows.nth(0)).toContainText("Memory");
    await expect(rows.nth(1)).toContainText("Scheduling");

    const run = page.locator("details", { hasText: "run #2" });
    await run.locator("summary").click();
    await expect(run.getByRole("cell", { name: "Held", exact: true }).first()).toBeVisible();
    await expect(run.getByRole("cell", { name: "Never reached" }).first()).toBeVisible();
  });

  test("fill the evidence record and export JSON", async ({ page }) => {
    await page.goto("/modules/integrated-failure-analysis");
    await page.getByRole("button", { name: "Run simulation" }).click();

    await page.getByLabel("Prediction").fill("Scheduling should fail first under the default weak policies.");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download JSON" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("integrated-failure-analysis-evidence.json");
  });
});
