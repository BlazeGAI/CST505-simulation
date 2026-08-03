import { z } from "zod";
import type { SimulationDefinition } from "./engine";
import type { SeededRandom } from "./random";
import { RunResultSchema, type RunResult, type TraceEvent } from "../schemas/run-result";

/**
 * Week 4: Crash Consistency. A minimal on-disk file system - a superblock,
 * an inode bitmap, a data bitmap, one inode table entry, one directory,
 * and one data block - executes a fixed, ordered create-and-append write
 * sequence for a HarborLink alert log. A crash point interrupts that
 * sequence after a specific write; a generic fsck pass then classifies
 * whatever inconsistency resulted and reports what it could repair,
 * what it lost, and what it could only leave ambiguous.
 */
export const CRASH_POINTS = ["w1", "w3", "w4", "w5", "none"] as const;
export type CrashPoint = (typeof CRASH_POINTS)[number];

export const CRASH_POINT_LABELS: Record<CrashPoint, string> = {
  w1: "After W1 (inode bitmap only)",
  w3: "After W3 (data bitmap allocated, no content yet)",
  w4: "After W4 (data written, not yet reachable)",
  w5: "After W5 (inode complete, no directory entry)",
  none: "No crash (all six writes land)",
};

export const CrashConsistencyParamsSchema = z.object({
  crashPoint: z.enum(CRASH_POINTS),
});
export type CrashConsistencyParams = z.infer<typeof CrashConsistencyParamsSchema>;

export const CRASH_CONSISTENCY_DEFAULT_PARAMS: CrashConsistencyParams = { crashPoint: "none" };

/** Published seed every student's assessed run must use. */
export const ASSESSED_SEED = 100;

const TOTAL_INODES = 8;
const TOTAL_BLOCKS = 16;
const TARGET_INODE = 0;
const TARGET_BLOCK = 0;
const LOG_CONTENT = "2026-08-03T00:00:00Z ALERT sensor threshold exceeded";

interface Inode {
  size: number;
  blocks: number[];
}

interface DiskState {
  inodeBitmap: boolean[];
  dataBitmap: boolean[];
  inodes: (Inode | null)[];
  dataBlocks: (string | null)[];
  directory: Record<string, number>;
}

function emptyDisk(): DiskState {
  return {
    inodeBitmap: new Array(TOTAL_INODES).fill(false),
    dataBitmap: new Array(TOTAL_BLOCKS).fill(false),
    inodes: new Array(TOTAL_INODES).fill(null),
    dataBlocks: new Array(TOTAL_BLOCKS).fill(null),
    directory: {},
  };
}

interface WriteStep {
  id: string;
  kind: "metadata" | "data";
  description: string;
  apply: (disk: DiskState) => void;
}

const WRITE_SEQUENCE: WriteStep[] = [
  {
    id: "w1",
    kind: "metadata",
    description: `Set inode bitmap bit ${TARGET_INODE} (allocate inode)`,
    apply: (disk) => {
      disk.inodeBitmap[TARGET_INODE] = true;
    },
  },
  {
    id: "w2",
    kind: "metadata",
    description: `Initialize inode ${TARGET_INODE} (size 0, no blocks)`,
    apply: (disk) => {
      disk.inodes[TARGET_INODE] = { size: 0, blocks: [] };
    },
  },
  {
    id: "w3",
    kind: "metadata",
    description: `Set data bitmap bit ${TARGET_BLOCK} (allocate data block)`,
    apply: (disk) => {
      disk.dataBitmap[TARGET_BLOCK] = true;
    },
  },
  {
    id: "w4",
    kind: "data",
    description: `Write log record into block ${TARGET_BLOCK}`,
    apply: (disk) => {
      disk.dataBlocks[TARGET_BLOCK] = LOG_CONTENT;
    },
  },
  {
    id: "w5",
    kind: "metadata",
    description: `Update inode ${TARGET_INODE}: size and block pointer`,
    apply: (disk) => {
      disk.inodes[TARGET_INODE] = { size: LOG_CONTENT.length, blocks: [TARGET_BLOCK] };
    },
  },
  {
    id: "w6",
    kind: "metadata",
    description: `Add directory entry "alert.log" -> inode ${TARGET_INODE}`,
    apply: (disk) => {
      disk.directory["alert.log"] = TARGET_INODE;
    },
  },
];

const CRASH_AFTER_STEP: Record<CrashPoint, number> = { w1: 1, w3: 3, w4: 4, w5: 5, none: 6 };

/**
 * Derives what each on-disk structure looks like once exactly
 * `writesDurable` of the six ordered writes have landed. Shared by the UI
 * so its "intended vs. durable at this crash point" table stays in sync
 * with the write sequence above by construction, rather than duplicating it.
 */
export function deriveStructureState(writesDurable: number) {
  return {
    inodeBitmapBit: writesDurable >= 1,
    inodeStruct:
      writesDurable >= 2
        ? { size: writesDurable >= 5 ? LOG_CONTENT.length : 0, blocks: writesDurable >= 5 ? [TARGET_BLOCK] : [] }
        : null,
    dataBitmapBit: writesDurable >= 3,
    blockContent: writesDurable >= 4 ? LOG_CONTENT : null,
    directoryEntry: writesDurable >= 6,
  };
}

export const CRASH_CONSISTENCY_TOTAL_WRITES = WRITE_SEQUENCE.length;

const SEVERITY_ORDER = [
  "unreachable-data",
  "missing-directory-reference",
  "bitmap-disagreement",
  "orphaned-allocation",
  "invalid-size",
] as const;
type FindingCategory = (typeof SEVERITY_ORDER)[number];

interface Finding {
  category: FindingCategory;
  detail: string;
  action: string;
  outcome: "repaired" | "lost" | "ambiguous";
}

function referencedBlocks(disk: DiskState): Set<number> {
  const referenced = new Set<number>();
  for (const inode of disk.inodes) {
    if (inode) for (const b of inode.blocks) referenced.add(b);
  }
  return referenced;
}

function referencedInodes(disk: DiskState): Set<number> {
  return new Set(Object.values(disk.directory));
}

/** A simplified fsck pass. Mutates a clone of `disk` and reports every finding; never silently restores the writes that never landed. */
function runFsck(disk: DiskState): { recovered: DiskState; findings: Finding[] } {
  const recovered: DiskState = JSON.parse(JSON.stringify(disk));
  const findings: Finding[] = [];
  const referencedB = referencedBlocks(disk);
  const referencedI = referencedInodes(disk);

  // Orphaned allocation: bitmap says allocated, no structure exists.
  for (let i = 0; i < disk.inodeBitmap.length; i++) {
    if (disk.inodeBitmap[i] && disk.inodes[i] === null) {
      recovered.inodeBitmap[i] = false;
      findings.push({
        category: "orphaned-allocation",
        detail: `Inode bitmap bit ${i} is set but no inode structure was ever written.`,
        action: `Cleared inode bitmap bit ${i}.`,
        outcome: "repaired",
      });
    }
  }

  // Unreachable data / bitmap disagreement on data blocks.
  for (let b = 0; b < disk.dataBitmap.length; b++) {
    if (disk.dataBitmap[b] && !referencedB.has(b)) {
      const hasContent = disk.dataBlocks[b] !== null;
      recovered.dataBitmap[b] = false;
      if (hasContent) {
        findings.push({
          category: "unreachable-data",
          detail: `Block ${b} contains written data ("${disk.dataBlocks[b]}") but no inode references it.`,
          action: `Freed data bitmap bit ${b}. The write is not recoverable without a pointer to it.`,
          outcome: "lost",
        });
      } else {
        findings.push({
          category: "bitmap-disagreement",
          detail: `Data bitmap bit ${b} is set but the block was never written and nothing references it.`,
          action: `Freed data bitmap bit ${b}.`,
          outcome: "repaired",
        });
      }
    }
  }

  // Missing directory reference: a well-formed inode with no path to it.
  for (let i = 0; i < disk.inodes.length; i++) {
    const inode = disk.inodes[i];
    if (inode && !referencedI.has(i)) {
      const lostFoundName = `lost+found/inode_${i}`;
      recovered.directory[lostFoundName] = i;
      findings.push({
        category: "missing-directory-reference",
        detail: `Inode ${i} is well-formed (size ${inode.size}, blocks [${inode.blocks.join(", ")}]) but no directory entry points to it.`,
        action: `Relinked as "${lostFoundName}" rather than discarding it.`,
        outcome: inode.size > 0 ? "ambiguous" : "repaired",
      });
    }
  }

  // Invalid size: declared size doesn't match bytes actually reachable via block pointers.
  for (let i = 0; i < disk.inodes.length; i++) {
    const inode = disk.inodes[i];
    if (!inode) continue;
    const reachableBytes = inode.blocks.reduce((sum, b) => sum + (disk.dataBlocks[b]?.length ?? 0), 0);
    if (inode.size !== reachableBytes) {
      recovered.inodes[i] = { ...inode, size: reachableBytes };
      findings.push({
        category: "invalid-size",
        detail: `Inode ${i} declares size ${inode.size} but only ${reachableBytes} bytes are reachable via its block pointers.`,
        action: `Corrected inode ${i}'s size field to ${reachableBytes}.`,
        outcome: "repaired",
      });
    }
  }

  findings.sort((a, b) => SEVERITY_ORDER.indexOf(a.category) - SEVERITY_ORDER.indexOf(b.category));
  return { recovered, findings };
}

function runCrashConsistency(params: CrashConsistencyParams, rng: SeededRandom): RunResult {
  const disk = emptyDisk();
  const trace: TraceEvent[] = [];
  const stepsToApply = CRASH_AFTER_STEP[params.crashPoint];
  let clock = 0;

  WRITE_SEQUENCE.forEach((step, index) => {
    clock += rng.int(1, 3);
    const applied = index < stepsToApply;
    if (applied) step.apply(disk);
    trace.push({
      index: trace.length,
      label: `${step.kind}:${step.id}`,
      detail: `${step.description}${applied ? "" : " -- CRASH: not durable"}`,
      timestamp: clock,
      meta: { step: step.id, kind: step.kind, applied },
    });
  });

  const crashed = params.crashPoint !== "none";
  if (crashed) {
    clock += rng.int(2, 5);
    trace.push({
      index: trace.length,
      label: "system:crash",
      detail: `Power loss after write ${WRITE_SEQUENCE[stepsToApply - 1]?.id ?? "none"}; remaining writes never reached disk.`,
      timestamp: clock,
      meta: { step: "crash", kind: "system", applied: true },
    });
  }

  const { recovered, findings } = runFsck(disk);
  for (const finding of findings) {
    clock += rng.int(1, 2);
    trace.push({
      index: trace.length,
      label: `fsck:${finding.category}`,
      detail: `${finding.detail} ${finding.action} (${finding.outcome})`,
      timestamp: clock,
      meta: { step: "fsck", kind: "recovery", category: finding.category, outcome: finding.outcome },
    });
  }

  const metrics: Record<string, number> = {
    writesIntended: WRITE_SEQUENCE.length,
    writesDurableBeforeCrash: stepsToApply,
    findingsCount: findings.length,
    repairedCount: findings.filter((f) => f.outcome === "repaired").length,
    lostCount: findings.filter((f) => f.outcome === "lost").length,
    ambiguousCount: findings.filter((f) => f.outcome === "ambiguous").length,
    fileReachableAfterRecovery: recovered.directory["alert.log"] !== undefined ? 1 : 0,
    fileReachableViaLostFound: Object.keys(recovered.directory).some((k) => k.startsWith("lost+found/")) ? 1 : 0,
  };

  return {
    schemaVersion: 1,
    moduleId: "crash-consistency",
    scenarioId: params.crashPoint,
    seed: rng.seed,
    metrics,
    trace,
  };
}

export const crashConsistencyModule: SimulationDefinition<CrashConsistencyParams, RunResult> = {
  id: "crash-consistency",
  title: "Crash Consistency",
  schemaVersion: 1,
  paramsSchema: CrashConsistencyParamsSchema,
  resultSchema: RunResultSchema,
  defaultParams: CRASH_CONSISTENCY_DEFAULT_PARAMS,
  run: runCrashConsistency,
};
