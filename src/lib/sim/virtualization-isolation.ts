import { z } from "zod";
import type { SimulationDefinition } from "./engine";
import type { SeededRandom } from "./random";
import { RunResultSchema, type RunResult, type TraceEvent } from "../schemas/run-result";

/**
 * Week 5: Virtualization and Isolation. One host runs two HarborLink
 * tenants — a steady PRIMARY service and a NOISY neighbor — under one of
 * four isolation boundaries. The workload is identical across boundaries;
 * only the enforcement mechanism changes, which is exactly the point: a
 * container's namespaces *look* like isolation whether or not a cgroup cap
 * is actually configured, but only the enforced cap protects the primary
 * tenant's CPU share, and only a hardware VM boundary survives a
 * kernel-level fault in the noisy tenant, because containers still share
 * one kernel with their host.
 */
export const BOUNDARY_TYPES = ["process", "container-unbounded", "container-limited", "vm"] as const;
export type BoundaryType = (typeof BOUNDARY_TYPES)[number];

export const BOUNDARY_LABELS: Record<BoundaryType, string> = {
  process: "Bare process (no isolation)",
  "container-unbounded": "Container, no cgroup limits",
  "container-limited": "Container, cgroup CPU cap",
  vm: "Hardware-virtualized VM",
};

export const VirtualizationIsolationParamsSchema = z.object({
  boundary: z.enum(BOUNDARY_TYPES),
});
export type VirtualizationIsolationParams = z.infer<typeof VirtualizationIsolationParamsSchema>;

export const VIRTUALIZATION_ISOLATION_DEFAULT_PARAMS: VirtualizationIsolationParams = {
  boundary: "process",
};

/** Published seed every student's assessed comparison must use. */
export const ASSESSED_SEED = 100;

export const TOTAL_TICKS = 30;
export const NOISY_BURST_START = 12;
export const NOISY_BURST_END = 20;
export const FAULT_TICK = 25;
const HOST_CPU_CAPACITY = 100;

interface BoundaryProfile {
  /** Hard ceiling on the noisy tenant's CPU share, or null if unenforced. */
  noisyCpuCap: number | null;
  /** Whether a kernel-level fault in the noisy tenant reaches the primary tenant. */
  sharesKernel: boolean;
  memoryCapEnforced: boolean;
  overheadRange: readonly [number, number];
  bootLatencyRange: readonly [number, number];
}

const BOUNDARY_PROFILES: Record<BoundaryType, BoundaryProfile> = {
  process: {
    noisyCpuCap: null,
    sharesKernel: true,
    memoryCapEnforced: false,
    overheadRange: [0, 2],
    bootLatencyRange: [5, 15],
  },
  "container-unbounded": {
    noisyCpuCap: null,
    sharesKernel: true,
    memoryCapEnforced: false,
    overheadRange: [4, 8],
    bootLatencyRange: [90, 180],
  },
  "container-limited": {
    noisyCpuCap: 30,
    sharesKernel: true,
    memoryCapEnforced: true,
    overheadRange: [5, 10],
    bootLatencyRange: [100, 220],
  },
  vm: {
    noisyCpuCap: 50,
    sharesKernel: false,
    memoryCapEnforced: true,
    overheadRange: [25, 40],
    bootLatencyRange: [2500, 4500],
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function primaryDemandAt(rng: SeededRandom): number {
  return clamp(35 + rng.int(-5, 5), 0, HOST_CPU_CAPACITY);
}

function noisyDemandAt(tick: number, rng: SeededRandom): number {
  if (tick >= NOISY_BURST_START && tick <= NOISY_BURST_END) {
    return clamp(70 + rng.int(-10, 10), 0, HOST_CPU_CAPACITY);
  }
  return clamp(10 + rng.int(-5, 5), 0, HOST_CPU_CAPACITY);
}

/** Splits the host's fixed CPU capacity between the two tenants for one tick. */
function allocate(
  profile: BoundaryProfile,
  primaryDemand: number,
  noisyDemand: number,
): { primaryAllocated: number; noisyAllocated: number } {
  if (profile.noisyCpuCap === null) {
    const total = primaryDemand + noisyDemand;
    if (total <= HOST_CPU_CAPACITY) return { primaryAllocated: primaryDemand, noisyAllocated: noisyDemand };
    const scale = HOST_CPU_CAPACITY / total;
    return { primaryAllocated: primaryDemand * scale, noisyAllocated: noisyDemand * scale };
  }
  const noisyAllocated = Math.min(noisyDemand, profile.noisyCpuCap);
  const primaryAllocated = Math.min(primaryDemand, HOST_CPU_CAPACITY - noisyAllocated);
  return { primaryAllocated, noisyAllocated };
}

function runVirtualizationIsolation(params: VirtualizationIsolationParams, rng: SeededRandom): RunResult {
  const profile = BOUNDARY_PROFILES[params.boundary];
  const trace: TraceEvent[] = [];

  const bootLatencyMs = rng.int(profile.bootLatencyRange[0], profile.bootLatencyRange[1]);
  const overheadPercent = rng.int(profile.overheadRange[0], profile.overheadRange[1]);
  trace.push({
    index: trace.length,
    label: "system:boot",
    detail: `${BOUNDARY_LABELS[params.boundary]} boundary boots in ${bootLatencyMs}ms (${overheadPercent}% steady-state overhead).`,
    timestamp: 0,
    meta: { event: "boot", bootLatencyMs, overheadPercent },
  });

  let cpuStarvationTicks = 0;
  let totalCpuDeficit = 0;
  let primaryAllocatedSum = 0;
  let noisyAllocatedSum = 0;
  let downAfterFault = false;

  for (let tick = 0; tick < TOTAL_TICKS; tick++) {
    const primaryDemand = primaryDemandAt(rng);
    const noisyDemand = noisyDemandAt(tick, rng);
    const { primaryAllocated, noisyAllocated } = downAfterFault
      ? { primaryAllocated: 0, noisyAllocated: 0 }
      : allocate(profile, primaryDemand, noisyDemand);
    const deficit = Math.max(0, primaryDemand - primaryAllocated);
    if (deficit > 0) cpuStarvationTicks += 1;
    totalCpuDeficit += deficit;
    primaryAllocatedSum += primaryAllocated;
    noisyAllocatedSum += noisyAllocated;

    const phase =
      tick === NOISY_BURST_START
        ? "noisy neighbor's CPU burst begins"
        : tick === NOISY_BURST_END + 1
          ? "noisy neighbor's CPU burst ends"
          : null;
    if (phase) {
      trace.push({
        index: trace.length,
        label: "system:phase",
        detail: phase,
        timestamp: tick,
        meta: { event: "phase" },
      });
    }

    trace.push({
      index: trace.length,
      label: `tick:${tick}`,
      detail: downAfterFault
        ? `both tenants are down after the uncontained kernel fault at tick ${FAULT_TICK} — primary demanded ${primaryDemand}% but got 0%.`
        : `primary demands ${primaryDemand}%, gets ${primaryAllocated.toFixed(1)}%; noisy demands ${noisyDemand}%, gets ${noisyAllocated.toFixed(1)}%${
            deficit > 0 ? ` — primary starved by ${deficit.toFixed(1)}%` : ""
          }`,
      timestamp: tick,
      meta: {
        event: "tick",
        primaryDemand,
        primaryAllocated: Number(primaryAllocated.toFixed(1)),
        noisyDemand,
        noisyAllocated: Number(noisyAllocated.toFixed(1)),
        starved: deficit > 0,
        downAfterFault,
      },
    });

    if (tick === FAULT_TICK) {
      const contained = !profile.sharesKernel;
      trace.push({
        index: trace.length,
        label: "noisy:kernel-fault",
        detail: contained
          ? "the noisy tenant triggers a kernel-level fault; the hypervisor boundary contains it — the primary tenant is unaffected."
          : "the noisy tenant triggers a kernel-level fault; because this boundary shares one kernel with the primary tenant, the fault reaches it too — both tenants go down for the rest of this run.",
        timestamp: tick,
        meta: { event: "kernel-fault", contained },
      });
      if (!contained) downAfterFault = true;
    }
  }

  const metrics: Record<string, number> = {
    totalTicks: TOTAL_TICKS,
    cpuStarvationTicks,
    totalCpuDeficit: Number(totalCpuDeficit.toFixed(1)),
    avgPrimaryCpuAllocated: Number((primaryAllocatedSum / TOTAL_TICKS).toFixed(1)),
    avgNoisyCpuAllocated: Number((noisyAllocatedSum / TOTAL_TICKS).toFixed(1)),
    overheadPercent,
    bootLatencyMs,
    memoryCapEnforced: profile.memoryCapEnforced ? 1 : 0,
    faultContained: profile.sharesKernel ? 0 : 1,
  };

  return {
    schemaVersion: 1,
    moduleId: "virtualization-isolation",
    scenarioId: params.boundary,
    seed: rng.seed,
    metrics,
    trace,
  };
}

export const virtualizationIsolationModule: SimulationDefinition<VirtualizationIsolationParams, RunResult> = {
  id: "virtualization-isolation",
  title: "Isolation Boundary Comparison",
  schemaVersion: 1,
  paramsSchema: VirtualizationIsolationParamsSchema,
  resultSchema: RunResultSchema,
  defaultParams: VIRTUALIZATION_ISOLATION_DEFAULT_PARAMS,
  run: runVirtualizationIsolation,
};
