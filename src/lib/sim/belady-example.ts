/**
 * Week 3: Virtual Memory — the manual-calculation reference. This is the
 * classic reference string used to teach Belady's anomaly (Belady, Nelson,
 * & Shedler, 1969): under FIFO, *more* frames can produce *more* faults,
 * which is why "give it more memory" isn't a safe intuition for every
 * replacement policy. It is deliberately fixed (not seeded) — every
 * student calculates the same string by hand before checking it here.
 *
 * Optimal (Belady's OPT) always evicts the resident page whose next use is
 * furthest in the future (or never reused). It requires knowing the future
 * reference sequence, which is exactly why it is a theoretical bound, not
 * something an online operating system can implement.
 */
export const BELADY_REFERENCE_STRING = [1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5] as const;
export const BELADY_FRAME_COUNTS = [3, 4] as const;

export interface ReplacementStep {
  index: number;
  page: number;
  fault: boolean;
  framesAfter: number[];
  evicted: number | null;
}

function simulateFIFO(refs: readonly number[], frameCount: number): ReplacementStep[] {
  const frames: number[] = [];
  const queue: number[] = [];
  const steps: ReplacementStep[] = [];
  for (let i = 0; i < refs.length; i++) {
    const page = refs[i];
    if (frames.includes(page)) {
      steps.push({ index: i, page, fault: false, framesAfter: [...frames], evicted: null });
      continue;
    }
    let evicted: number | null = null;
    if (frames.length >= frameCount) {
      evicted = queue.shift()!;
      frames.splice(frames.indexOf(evicted), 1);
    }
    frames.push(page);
    queue.push(page);
    steps.push({ index: i, page, fault: true, framesAfter: [...frames], evicted });
  }
  return steps;
}

function simulateOptimal(refs: readonly number[], frameCount: number): ReplacementStep[] {
  const frames: number[] = [];
  const steps: ReplacementStep[] = [];
  for (let i = 0; i < refs.length; i++) {
    const page = refs[i];
    if (frames.includes(page)) {
      steps.push({ index: i, page, fault: false, framesAfter: [...frames], evicted: null });
      continue;
    }
    let evicted: number | null = null;
    if (frames.length >= frameCount) {
      let worstPage = frames[0];
      let worstNextUse = -1;
      for (const candidate of frames) {
        const nextUse = refs.indexOf(candidate, i + 1);
        const distance = nextUse === -1 ? Infinity : nextUse;
        if (distance > worstNextUse) {
          worstNextUse = distance;
          worstPage = candidate;
        }
      }
      evicted = worstPage;
      frames.splice(frames.indexOf(evicted), 1);
    }
    frames.push(page);
    steps.push({ index: i, page, fault: true, framesAfter: [...frames], evicted });
  }
  return steps;
}

export interface BeladyComparison {
  frameCount: number;
  fifo: ReplacementStep[];
  fifoFaults: number;
  optimal: ReplacementStep[];
  optimalFaults: number;
}

export function computeBeladyComparison(frameCount: number): BeladyComparison {
  const fifo = simulateFIFO(BELADY_REFERENCE_STRING, frameCount);
  const optimal = simulateOptimal(BELADY_REFERENCE_STRING, frameCount);
  return {
    frameCount,
    fifo,
    fifoFaults: fifo.filter((s) => s.fault).length,
    optimal,
    optimalFaults: optimal.filter((s) => s.fault).length,
  };
}

export function computeBeladyComparisons(): BeladyComparison[] {
  return BELADY_FRAME_COUNTS.map((count) => computeBeladyComparison(count));
}
