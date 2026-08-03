import { test, expect } from "@playwright/test";

test.describe("Virtualization and Isolation module", () => {
  test("the manual-calculation table flags the one sensitive-but-unprivileged instruction", async ({ page }) => {
    await page.goto("/modules/virtualization-and-isolation");
    await expect(page.getByRole("heading", { name: "Virtualization and Isolation" })).toBeVisible();

    const manualTable = page.getByRole("region", { name: /Manual calculation/ }).getByRole("table");
    const rows = manualTable.locator("tbody tr");
    await expect(rows).toHaveCount(10);

    const popfRow = rows.filter({ hasText: "POPF" });
    await expect(popfRow.locator("td").nth(2)).toHaveText("No"); // not privileged
    await expect(popfRow.locator("td").nth(3)).toHaveText("Yes"); // sensitive

    await expect(page.getByText(/POPF.*sensitive but NOT privileged/)).toBeVisible();
  });

  test("only a VM boundary avoids CPU starvation AND contains the kernel-level fault", async ({ page }) => {
    await page.goto("/modules/virtualization-and-isolation");

    await page.getByRole("button", { name: "Run simulation" }).click(); // process (default)
    await page.getByLabel("Isolation boundary").selectOption("vm");
    await page.getByRole("button", { name: "Run simulation" }).click();

    const resultsTable = page.getByRole("region", { name: "4. Compare results" }).getByRole("table");
    const rows = resultsTable.locator("tbody tr");
    await expect(rows).toHaveCount(2);

    const vmRow = rows.nth(0);
    const processRow = rows.nth(1);
    await expect(vmRow).toContainText("Hardware-virtualized VM");
    await expect(vmRow.locator("td").nth(1)).toHaveText("0 / 30");
    await expect(vmRow).toContainText("Yes"); // fault contained
    await expect(processRow).toContainText("Bare process");
    await expect(processRow.locator("td").nth(3)).toHaveText("No"); // fault not contained
  });

  test("an unbounded container starves the primary tenant just like a bare process, despite looking isolated", async ({
    page,
  }) => {
    await page.goto("/modules/virtualization-and-isolation");

    await page.getByRole("button", { name: "Run simulation" }).click(); // process (default)
    await page.getByLabel("Isolation boundary").selectOption("container-unbounded");
    await page.getByRole("button", { name: "Run simulation" }).click();

    const resultsTable = page.getByRole("region", { name: "4. Compare results" }).getByRole("table");
    const rows = resultsTable.locator("tbody tr");
    const containerRow = rows.nth(0);
    const processRow = rows.nth(1);
    const containerStarvation = await containerRow.locator("td").nth(1).innerText();
    const processStarvation = await processRow.locator("td").nth(1).innerText();
    expect(containerStarvation).toBe(processStarvation);

    const containerRun = page.locator("details", { hasText: "container, no cgroup limits" });
    await containerRun.locator("summary").click();
    await expect(containerRun.getByRole("cell", { name: /starved/i }).first()).toBeVisible();
  });

  test("fill the evidence record and export JSON", async ({ page }) => {
    await page.goto("/modules/virtualization-and-isolation");
    await page.getByRole("button", { name: "Run simulation" }).click();

    await page.getByLabel("Prediction").fill("Only the VM boundary should contain the kernel-level fault.");
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Download JSON" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe("virtualization-isolation-evidence.json");
  });
});
