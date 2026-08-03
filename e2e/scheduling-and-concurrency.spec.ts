import { readFileSync } from "fs";
import { test, expect } from "@playwright/test";

test.describe("Scheduling and Concurrency module", () => {
  test("compare two scheduling policies and inspect the queue-state log", async ({ page }) => {
    await page.goto("/modules/scheduling-and-concurrency");
    await expect(page.getByRole("heading", { name: "Scheduling and Concurrency" })).toBeVisible();

    const schedulingForm = page.locator("form").filter({ has: page.getByLabel("Policy") });
    await schedulingForm.getByRole("button", { name: "Run simulation" }).click();
    await schedulingForm.getByLabel("Policy").selectOption("fair-share");
    await schedulingForm.getByRole("button", { name: "Run simulation" }).click();

    const comparisonTable = page.getByRole("table").first();
    await expect(comparisonTable.locator("tbody tr")).toHaveCount(2);
    // Fair-share (run #2) should miss zero deadlines; FIFO (run #1) misses some.
    await expect(comparisonTable.locator("tbody tr").first()).toContainText("0 / 4");

    const fairShareRun = page.locator("details", { hasText: "Fair-share" });
    await fairShareRun.locator("summary").click();
    await expect(fairShareRun.getByRole("table")).toBeVisible();
  });

  test("the unsafe ring buffer loses an update; the mutex-corrected version is correct", async ({ page }) => {
    await page.goto("/modules/scheduling-and-concurrency");

    const ringBufferForm = page.locator("form").filter({ has: page.getByLabel("Synchronization") });
    await ringBufferForm.getByRole("button", { name: "Run simulation" }).click();
    await ringBufferForm.getByLabel("Synchronization").selectOption("mutex");
    await ringBufferForm.getByRole("button", { name: "Run simulation" }).click();

    const ringBufferSection = page.locator("section", { has: page.getByRole("heading", { name: /ring-buffer/i }) });
    const comparisonTable = ringBufferSection.getByRole("table").first();
    const rows = comparisonTable.locator("tbody tr");
    await expect(rows).toHaveCount(2);
    // Mutex run (#2, newest/first row) is correct; unsafe run (#1) is not.
    await expect(rows.nth(0)).toContainText("Yes");
    await expect(rows.nth(1)).toContainText("No");

    const unsafeRun = page.locator("details", { hasText: "Unsafe" });
    await unsafeRun.locator("summary").click();
    await expect(unsafeRun.getByText(/overwrites "alert-A"/)).toBeVisible();
  });

  test("export combines both scheduling and ring-buffer runs into one evidence package", async ({ page }) => {
    await page.goto("/modules/scheduling-and-concurrency");

    await page
      .locator("form")
      .filter({ has: page.getByLabel("Policy") })
      .getByRole("button", { name: "Run simulation" })
      .click();
    await page
      .locator("form")
      .filter({ has: page.getByLabel("Synchronization") })
      .getByRole("button", { name: "Run simulation" })
      .click();

    await page.getByLabel("Prediction").fill("Fair-share should protect the safety-alert deadline.");

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download JSON" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("scheduling-and-concurrency-evidence.json");

    const path = await download.path();
    expect(path).toBeTruthy();
    const pkg = JSON.parse(readFileSync(path!, "utf-8"));
    const moduleIds = pkg.runs.map((r: { config: { moduleId: string } }) => r.config.moduleId);
    expect(moduleIds).toContain("scheduling-policy");
    expect(moduleIds).toContain("ring-buffer");
  });
});
