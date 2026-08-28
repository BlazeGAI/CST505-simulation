import { test, expect } from "@playwright/test";

test.describe("Integrated Failure Analysis module", () => {
  test("imports the explicitly selected SJF/STCF run from a Simulation 2 package", async ({ page }) => {
    await page.goto("/modules/integrated-failure-analysis");
    const pkg = {
      schemaVersion: 2,
      appVersion: "0.3.0",
      exportedAt: "2026-08-28T00:00:00.000Z",
      moduleId: "scheduling-and-concurrency",
      moduleTitle: "Processes, Scheduling, and Concurrency Investigation",
      runs: [{
        config: {
          schemaVersion: 1,
          moduleId: "scheduling-policy",
          scenarioId: "fifo",
          scenarioVersion: "1.0.0",
          engineVersion: "1.0.0",
          seed: 505,
          params: { policy: "fifo", timeQuantum: 4 },
        },
        result: {
          schemaVersion: 1,
          moduleId: "scheduling-policy",
          scenarioId: "fifo",
          seed: 505,
          metrics: {},
          trace: [],
        },
      }, {
        config: {
          schemaVersion: 1,
          moduleId: "scheduling-policy",
          scenarioId: "sjf-stcf",
          scenarioVersion: "1.0.0",
          engineVersion: "1.0.0",
          seed: 505,
          params: { policy: "sjf-stcf", timeQuantum: 4 },
        },
        result: {
          schemaVersion: 1,
          moduleId: "scheduling-policy",
          scenarioId: "sjf-stcf",
          seed: 505,
          metrics: {},
          trace: [],
        },
      }],
      selectedRun: { configModuleId: "scheduling-policy", scenarioId: "sjf-stcf" },
      evidenceRecord: {
        schemaVersion: 1,
        moduleId: "scheduling-and-concurrency",
        scenarioId: "assessed",
        seed: 505,
        updatedAt: "2026-08-28T00:00:00.000Z",
      },
    };

    await page.getByLabel("JSON evidence packages from Simulations 2-5").setInputFiles({
      name: "simulation-2.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(pkg)),
    });

    await expect(page.getByRole("status")).toContainText("Loaded 1 package");
    await expect(page.getByLabel("Scheduling policy")).toHaveValue("sjf-stcf");
  });

  test("the default (weakest-policy) configuration fails at the very first stage: scheduling", async ({ page }) => {
    await page.goto("/modules/integrated-failure-analysis");
    await expect(
      page.getByRole("heading", { name: "Integrated Failure Investigation" }),
    ).toBeVisible();

    await page.getByRole("button", { name: "Run simulation" }).click();

    const resultsTable = page.getByRole("region", { name: "4. Compare results" }).getByRole("table");
    const row = resultsTable.locator("tbody tr").first();
    await expect(row).toContainText("Scheduling");
    await expect(row.locator("td").last()).toHaveText("0 / 4");
  });

  test("applying the fully mitigated policies holds every stage", async ({ page }) => {
    await page.goto("/modules/integrated-failure-analysis");

    await page.getByRole("button", { name: "Run simulation" }).click(); // default (weakest) first
    await page.getByRole("button", { name: "Apply fully mitigated policies" }).click();
    await page.getByRole("button", { name: "Run simulation" }).click();

    const resultsTable = page.getByRole("region", { name: "4. Compare results" }).getByRole("table");
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

    const resultsTable = page.getByRole("region", { name: "4. Compare results" }).getByRole("table");
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
