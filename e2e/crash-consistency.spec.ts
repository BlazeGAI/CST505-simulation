import { readFileSync } from "fs";
import { test, expect } from "@playwright/test";

test.describe("Crash Consistency module", () => {
  test("crashing after W4 loses the write; crashing after W5 recovers it via lost+found", async ({ page }) => {
    await page.goto("/modules/crash-consistency");
    await expect(page.getByRole("heading", { name: "Crash Consistency" })).toBeVisible();

    const crashForm = page.locator("form").filter({ has: page.getByLabel("Crash point") });
    await crashForm.getByLabel("Crash point").selectOption("w4");
    await crashForm.getByRole("button", { name: "Run simulation" }).click();
    await crashForm.getByLabel("Crash point").selectOption("w5");
    await crashForm.getByRole("button", { name: "Run simulation" }).click();

    const crashSection = page.locator("section", { has: page.getByRole("heading", { name: /crash point/ }) });
    const rows = crashSection.getByRole("table").locator("tbody tr");
    await expect(rows).toHaveCount(2);
    // Newest first: w5 is row 0 (ambiguous, fully recovered via lost+found), w4 is row 1 (the
    // log content itself is lost, even though an empty inode stub still gets relinked).
    await expect(rows.nth(0)).toContainText("Via lost+found");
    await expect(rows.nth(1)).toContainText("Data lost");

    const w4Run = page.locator("details", { hasText: "After W4" });
    await w4Run.locator("summary").click();
    await expect(w4Run.getByText(/is not recoverable without a pointer/)).toBeVisible();
  });

  test("the intended-vs-durable worksheet reflects exactly which writes landed", async ({ page }) => {
    await page.goto("/modules/crash-consistency");
    const crashForm = page.locator("form").filter({ has: page.getByLabel("Crash point") });
    await crashForm.getByLabel("Crash point").selectOption("w3");
    await crashForm.getByRole("button", { name: "Run simulation" }).click();

    const run = page.locator("details", { hasText: "After W3" });
    await run.locator("summary").click();
    const worksheet = run.getByRole("table").first();
    await expect(worksheet.locator("tbody tr").filter({ hasText: "Data block 0" })).toContainText("-");
  });

  test("batched sequential writes show far higher bandwidth but a much larger at-risk window than small sync writes", async ({
    page,
  }) => {
    await page.goto("/modules/crash-consistency");
    const ioForm = page.locator("form").filter({ has: page.getByLabel("Write pattern") });
    await ioForm.getByRole("button", { name: "Run simulation" }).click(); // sync-small (default)
    await ioForm.getByLabel("Write pattern").selectOption("batch-sequential");
    await ioForm.getByRole("button", { name: "Run simulation" }).click();

    const ioSection = page.locator("section", { has: page.getByRole("heading", { name: /I\/O pattern/ }) });
    const rows = ioSection.getByRole("table").locator("tbody tr");
    await expect(rows).toHaveCount(2);
    const batchBandwidth = parseFloat((await rows.nth(0).locator("td").nth(3).innerText()).replace(" MB/s", ""));
    const syncBandwidth = parseFloat((await rows.nth(1).locator("td").nth(3).innerText()).replace(" MB/s", ""));
    expect(batchBandwidth).toBeGreaterThan(syncBandwidth * 50);
  });

  test("export combines the crash-consistency and I/O run histories into one evidence package", async ({ page }) => {
    await page.goto("/modules/crash-consistency");
    await page
      .locator("form")
      .filter({ has: page.getByLabel("Crash point") })
      .getByRole("button", { name: "Run simulation" })
      .click();
    await page
      .locator("form")
      .filter({ has: page.getByLabel("Write pattern") })
      .getByRole("button", { name: "Run simulation" })
      .click();

    await page.getByLabel("Prediction").fill("Crashing after W4 should lose the write.");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download JSON" }).click();
    const download = await downloadPromise;
    const path = await download.path();
    const pkg = JSON.parse(readFileSync(path!, "utf-8"));
    const moduleIds = pkg.runs.map((r: { config: { moduleId: string } }) => r.config.moduleId);
    expect(moduleIds).toContain("crash-consistency-fs");
    expect(moduleIds).toContain("io-benchmark");
  });
});
