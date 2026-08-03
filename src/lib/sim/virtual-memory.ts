import { z } from "zod";
import type { SimulationDefinition } from "./engine";
import type { SeededRandom } from "./random";
import { RunResultSchema, type RunResult, type TraceEvent } from "../schemas/run-result";

/**
 * Week 3: Virtual Memory. A seeded reference string sweeps through four
 * labeled HarborLink workload phases with different locality: steady
 * ingestion (tight working set), an alert burst (very tight), a dashboard
 * query (wider), and an analytics scan (poor locality, long sweep). FIFO,
 * LRU, and Clock compete for a small, adjustable number of physical frames.
 */
export const POLICIES = ["fifo", "lru", "clock"] as const;
export type Policy = (typeof POLICIES)[number];

export const VirtualMemoryParamsSchema = z.object({
  policy: z.enum(POLICIES),
  frames: z.number().int().min(2).max(8),
  isolateAnalytics: z.boolean(),
});
export type VirtualMemoryParams = z.infer<typeof VirtualMemoryParamsSchema>;

export const VIRTUAL_MEMORY_DEFAULT_PARAMS: VirtualMemoryParams = {
  policy: "fifo",
  frames: 4,
  isolateAnalytics: false,
};

/** Published seed every student's assessed comparison must use. */
export const ASSESSED_SEED = 100;

const THRASHING_WINDOW = 8;
const THRASHING_FAULT_RATE = 0.6;
const WORKING_SET_WINDOW = 10;
const PROTECTED_FRAME_COUNT = 2;

interface PageReference {
  page: number;
  phase: string;
  isWrite: boolean;
}

function generateReferenceString(rng: SeededRandom): PageReference[] {
  const refs: PageReference[] = [];

  for (let i = 0; i < 16; i++) {
    // A hot pair (0,1) is reused far more often than a rotating cold set
    // (2,3,4): the classic pattern that separates LRU (keeps hot pages
    // resident because they're recently touched) from FIFO (evicts by
    // insertion age regardless of how recently a page was reused).
    const page = rng.bool(0.55) ? rng.pick([0, 1]) : rng.pick([2, 3, 4]);
    refs.push({ page, phase: "steady-ingestion", isWrite: rng.bool(0.3) });
  }
  for (let i = 0; i < 8; i++) {
    refs.push({ page: rng.int(5, 6), phase: "alert-burst", isWrite: rng.bool(0.4) });
  }
  for (let i = 0; i < 10; i++) {
    refs.push({ page: rng.int(7, 11), phase: "dashboard-query", isWrite: rng.bool(0.2) });
  }
  for (let i = 0; i < 14; i++) {
    // A mostly-sequential sweep with occasional revisits: poor locality by design.
    const page = rng.bool(0.75) ? 12 + i : 12 + rng.int(0, Math.max(0, i - 1));
    refs.push({ page, phase: "analytics-scan", isWrite: rng.bool(0.5) });
  }
  for (let i = 0; i < 6; i++) {
    // Ingestion resumes after the analytics sweep. This is what makes the
    // isolateAnalytics control observable: whichever hot ingestion pages
    // survived the sweep turn into hits here instead of faults.
    const page = rng.bool(0.6) ? rng.pick([0, 1]) : rng.pick([7, 8]);
    refs.push({ page, phase: "ingestion-recovery", isWrite: rng.bool(0.3) });
  }
  return refs;
}

interface Frame {
  page: number;
  dirty: boolean;
  refBit: boolean;
}

function runVirtualMemory(params: VirtualMemoryParams, rng: SeededRandom): RunResult {
  const refs = generateReferenceString(rng);
  const trace: TraceEvent[] = [];

  const resident = new Map<number, Frame>(); // page -> frame state
  const insertionOrder: number[] = []; // FIFO order of resident pages
  const lastUsed = new Map<number, number>(); // LRU timestamps
  const clockOrder: number[] = []; // Clock circular order
  let clockHand = 0;
  const pinnedPages = new Set<number>();

  let clock = 0;
  let hits = 0;
  let faults = 0;
  let writeBacks = 0;
  let totalFaultServiceTicks = 0;
  let analyticsFaults = 0;
  let analyticsHits = 0;
  let recoveryFaults = 0;
  let recoveryHits = 0;
  const hitFaultSequence: boolean[] = []; // true = fault
  let thrashingDetectedAtIndex = -1;
  let thrashingWindowFaultRate = 0;
  let analyticsPhaseEntered = false;

  function pickVictim(): number {
    const candidates = (params.policy === "fifo" ? insertionOrder : params.policy === "lru" ? [...resident.keys()] : clockOrder).filter(
      (p) => resident.has(p) && !pinnedPages.has(p),
    );
    if (params.policy === "fifo") return candidates[0];
    if (params.policy === "lru") {
      return candidates.reduce((oldest, p) => ((lastUsed.get(p) ?? 0) < (lastUsed.get(oldest) ?? 0) ? p : oldest));
    }
    // Clock: sweep from the hand, clearing reference bits, until an unpinned page with refBit=false is found.
    for (let steps = 0; steps < clockOrder.length * 2; steps++) {
      const page = clockOrder[clockHand % clockOrder.length];
      clockHand = (clockHand + 1) % clockOrder.length;
      if (!resident.has(page) || pinnedPages.has(page)) continue;
      const frame = resident.get(page)!;
      if (frame.refBit) {
        frame.refBit = false;
        continue;
      }
      return page;
    }
    return candidates[0];
  }

  function evict(): { evictedPage: number; wasDirty: boolean } {
    const victim = pickVictim();
    const frame = resident.get(victim)!;
    resident.delete(victim);
    const orderIndex = insertionOrder.indexOf(victim);
    if (orderIndex !== -1) insertionOrder.splice(orderIndex, 1);
    const clockIndex = clockOrder.indexOf(victim);
    if (clockIndex !== -1) clockOrder.splice(clockIndex, 1);
    lastUsed.delete(victim);
    return { evictedPage: victim, wasDirty: frame.dirty };
  }

  refs.forEach((ref, i) => {
    if (params.isolateAnalytics && ref.phase === "analytics-scan" && !analyticsPhaseEntered) {
      analyticsPhaseEntered = true;
      const protectedCandidates = [...resident.keys()].slice(0, Math.min(PROTECTED_FRAME_COUNT, resident.size));
      for (const page of protectedCandidates) pinnedPages.add(page);
    }

    clock += 1;
    const isHit = resident.has(ref.page);
    let evictedPage: number | null = null;
    let evictedDirty = false;

    if (isHit) {
      hits += 1;
      const frame = resident.get(ref.page)!;
      frame.refBit = true;
      if (ref.isWrite) frame.dirty = true;
      lastUsed.set(ref.page, clock);
    } else {
      faults += 1;
      const serviceTicks = rng.int(3, 6);
      totalFaultServiceTicks += serviceTicks;
      clock += serviceTicks;
      if (resident.size >= params.frames) {
        const result = evict();
        evictedPage = result.evictedPage;
        evictedDirty = result.wasDirty;
        if (result.wasDirty) writeBacks += 1;
      }
      resident.set(ref.page, { page: ref.page, dirty: ref.isWrite, refBit: true });
      insertionOrder.push(ref.page);
      clockOrder.push(ref.page);
      lastUsed.set(ref.page, clock);
    }

    if (ref.phase === "analytics-scan") {
      if (isHit) analyticsHits += 1;
      else analyticsFaults += 1;
    }
    if (ref.phase === "ingestion-recovery") {
      if (isHit) recoveryHits += 1;
      else recoveryFaults += 1;
    }

    hitFaultSequence.push(!isHit);
    if (i >= THRASHING_WINDOW - 1 && thrashingDetectedAtIndex === -1) {
      const window = hitFaultSequence.slice(i - THRASHING_WINDOW + 1, i + 1);
      const windowFaultRate = window.filter(Boolean).length / THRASHING_WINDOW;
      if (windowFaultRate >= THRASHING_FAULT_RATE) {
        thrashingDetectedAtIndex = i;
        thrashingWindowFaultRate = Number(windowFaultRate.toFixed(2));
      }
    }

    trace.push({
      index: trace.length,
      label: `${ref.phase}:${isHit ? "hit" : "fault"}`,
      detail:
        `page ${ref.page} (${ref.phase}) ${isHit ? "hit" : "fault"}` +
        (evictedPage !== null ? `; evicted page ${evictedPage} (${evictedDirty ? "dirty, written back" : "clean"})` : ""),
      timestamp: clock,
      meta: { phase: ref.phase, page: ref.page, isHit, evictedPage, evictedDirty },
    });
  });

  const recentWindow = refs.slice(-WORKING_SET_WINDOW).map((r) => r.page);
  const workingSetEstimate = new Set(recentWindow).size;

  const metrics: Record<string, number> = {
    frames: params.frames,
    totalRefs: refs.length,
    hits,
    faults,
    hitRate: Number((hits / refs.length).toFixed(3)),
    faultRate: Number((faults / refs.length).toFixed(3)),
    writeBacks,
    totalFaultServiceTicks,
    workingSetEstimate,
    thrashingDetectedAtIndex,
    thrashingWindowFaultRate,
    controlApplied: params.isolateAnalytics ? 1 : 0,
    analyticsFaults,
    analyticsHits,
    recoveryFaults,
    recoveryHits,
  };

  return {
    schemaVersion: 1,
    moduleId: "virtual-memory",
    scenarioId: params.policy,
    seed: rng.seed,
    metrics,
    trace,
  };
}

export const virtualMemoryModule: SimulationDefinition<VirtualMemoryParams, RunResult> = {
  id: "virtual-memory",
  title: "Virtual Memory Replacement",
  schemaVersion: 1,
  paramsSchema: VirtualMemoryParamsSchema,
  resultSchema: RunResultSchema,
  defaultParams: VIRTUAL_MEMORY_DEFAULT_PARAMS,
  run: runVirtualMemory,
};
