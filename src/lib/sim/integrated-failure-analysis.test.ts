import { describe, expect, it } from "vitest";
import { runSimulation } from "./engine";
import {
  integratedFailureAnalysisModule,
  ASSESSED_SEED,
  STAGE_IDS,
  INTEGRATED_FAILURE_ANALYSIS_DEFAULT_PARAMS,
  FULLY_MITIGATED_PARAMS,
  type IntegratedFailureAnalysisParams,
} from "./integrated-failure-analysis";

function run(params: IntegratedFailureAnalysisParams) {
  return runSimulation(integratedFailureAnalysisModule, params, ASSESSED_SEED);
}

describe("integratedFailureAnalysisModule golden seed (assessed seed 100)", () => {
  it("the default (weakest-policy) configuration fails at the very first stage: scheduling", () => {
    const result = run(INTEGRATED_FAILURE_ANALYSIS_DEFAULT_PARAMS);
    expect(result.metrics).toMatchObject({
      firstFailedStageIndex: 0,
      stagesReached: 1,
      stagesHeld: 0,
      stagesFailed: 1,
      fullyMitigated: 0,
    });
  });

  it("the fully mitigated configuration reaches and holds every stage", () => {
    const result = run(FULLY_MITIGATED_PARAMS);
    expect(result.metrics).toMatchObject({
      firstFailedStageIndex: -1,
      stagesReached: STAGE_IDS.length,
      stagesHeld: STAGE_IDS.length,
      stagesFailed: 0,
      fullyMitigated: 1,
    });
  });

  it("fixing only scheduling moves the first failure to the next stage: memory", () => {
    const result = run({ ...INTEGRATED_FAILURE_ANALYSIS_DEFAULT_PARAMS, schedulingPolicy: "fair-share" });
    expect(result.metrics).toMatchObject({ firstFailedStageIndex: 1, stagesReached: 2 });
  });

  it("fixing scheduling and memory moves the first failure to durability", () => {
    const result = run({
      ...INTEGRATED_FAILURE_ANALYSIS_DEFAULT_PARAMS,
      schedulingPolicy: "fair-share",
      memoryControlEnabled: true,
    });
    expect(result.metrics).toMatchObject({ firstFailedStageIndex: 2, stagesReached: 3 });
  });

  it("fixing every stage but isolation moves the first failure to isolation, the last stage", () => {
    const result = run({ ...FULLY_MITIGATED_PARAMS, isolationBoundary: "process" });
    expect(result.metrics).toMatchObject({ firstFailedStageIndex: 3, stagesReached: 4, fullyMitigated: 0 });
  });

  it("stages after the first failure are logged as never reached, not as passing or failing", () => {
    const result = run(INTEGRATED_FAILURE_ANALYSIS_DEFAULT_PARAMS);
    const unreached = result.trace.filter((e) => e.meta?.reached === false);
    expect(unreached).toHaveLength(STAGE_IDS.length - 1);
    for (const event of unreached) {
      expect(event.meta?.constraintHeld).toBeUndefined();
    }
  });

  it("is deterministic: same seed and params produce an identical result", () => {
    expect(run(INTEGRATED_FAILURE_ANALYSIS_DEFAULT_PARAMS)).toEqual(run(INTEGRATED_FAILURE_ANALYSIS_DEFAULT_PARAMS));
  });

  it("rejects an unknown policy value for any of the four subsystems", () => {
    expect(() =>
      runSimulation(
        integratedFailureAnalysisModule,
        { ...INTEGRATED_FAILURE_ANALYSIS_DEFAULT_PARAMS, schedulingPolicy: "shortest-job-first" },
        ASSESSED_SEED,
      ),
    ).toThrow();
  });
});
