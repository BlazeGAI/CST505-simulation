import { test, expect } from "@playwright/test";

test.describe("Virtual Memory module", () => {
  test("the manual-calculation table shows Belady's anomaly before any simulation is run", async ({ page }) => {
    await page.goto("/modules/virtual-memory");
    await expect(page.getByRole("heading", { name: "Memory Behavior and Virtual-Memory Investigation" })).toBeVisible();

    const manualTable = page.getByRole("region", { name: /Manual calculation/ }).getByRole("table");
    const rows = manualTable.locator("tbody tr");
    await expect(rows).toHaveCount(2);
    // 3 frames: FIFO 9 faults, optimal 7. 4 frames: FIFO 10 (the anomaly), optimal 6.
    await expect(rows.nth(0).locator("td")).toHaveText(["3", "9", "7"]);
    await expect(rows.nth(1).locator("td")).toHaveText(["4", "10", "6"]);
  });

  test("LRU faults less than FIFO at 4 frames, and the trace highlights faults", async ({ page }) => {
    await page.goto("/modules/virtual-memory");

    await page.getByRole("button", { name: "Run simulation" }).click(); // FIFO, 4 frames (defaults)
    await page.getByLabel("Policy", { exact: true }).selectOption("lru");
    await page.getByRole("button", { name: "Run simulation" }).click();

    const resultsTable = page.getByRole("region", { name: "4. Compare results" }).getByRole("table").first();
    const rows = resultsTable.locator("tbody tr");
    await expect(rows).toHaveCount(2);

    const fifoFaults = Number(await rows.nth(1).locator("td").nth(4).innerText());
    const lruFaults = Number(await rows.nth(0).locator("td").nth(4).innerText());
    expect(lruFaults).toBeLessThan(fifoFaults);

    const lruRun = page.locator("details", { hasText: "run #2" });
    await lruRun.locator("summary").click();
    await expect(lruRun.getByRole("cell", { name: "Fault", exact: true }).first()).toBeVisible();
  });

  test("the isolateAnalytics control improves the post-sweep recovery hit rate", async ({ page }) => {
    await page.goto("/modules/virtual-memory");

    await page.getByRole("button", { name: "Run simulation" }).click(); // control off
    await page.getByLabel("Isolate the analytics phase (memory control)").check();
    await page.getByRole("button", { name: "Run simulation" }).click(); // control on

    const resultsTable = page.getByRole("region", { name: "4. Compare results" }).getByRole("table").first();
    const rows = resultsTable.locator("tbody tr");
    await expect(rows.nth(0)).toContainText("On");
    await expect(rows.nth(1)).toContainText("Off");

    const onRecovery = await rows.nth(0).locator("td").last().innerText();
    const offRecovery = await rows.nth(1).locator("td").last().innerText();
    const onHits = Number(onRecovery.split("/")[0].trim());
    const offHits = Number(offRecovery.split("/")[0].trim());
    expect(onHits).toBeGreaterThan(offHits);
  });

  test("fill the evidence record and export JSON", async ({ page }) => {
    await page.goto("/modules/virtual-memory");
    await page.getByRole("button", { name: "Run simulation" }).click();

    await page.getByLabel("Prediction").fill("LRU should fault less than FIFO at 4 frames.");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download JSON" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("virtual-memory-evidence.json");
  });
});
