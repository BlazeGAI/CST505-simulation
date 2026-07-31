import { z } from "zod";
import type { SimulationDefinition } from "./engine";
import type { SeededRandom } from "./random";
import { RunResultSchema, type RunResult, type TraceEvent } from "../schemas/run-result";

/**
 * Week 1: System-Call Contracts. A small, fictional HarborLink sensor-
 * ingestion program crosses the user-kernel boundary in a fixed order:
 * start up, read a sensor CSV, load a config file, announce readiness,
 * write an alert log, and exit. Each of the four scenarios below changes
 * exactly one call's outcome, so comparing a failure run against the
 * normal run isolates the boundary behavior that call's contract governs.
 */
export const SYSCALL_CATEGORIES = ["process", "file", "memory", "communication", "protection"] as const;
export type SyscallCategory = (typeof SYSCALL_CATEGORIES)[number];

export const SCENARIOS = ["normal", "missing-config", "denied-write", "interrupted-write"] as const;
export type Scenario = (typeof SCENARIOS)[number];

export const SCENARIO_LABELS: Record<Scenario, string> = {
  normal: "Normal execution",
  "missing-config": "Missing configuration",
  "denied-write": "Denied log-file write",
  "interrupted-write": "Interrupted write",
};

export const SystemCallContractsParamsSchema = z.object({
  scenario: z.enum(SCENARIOS),
});
export type SystemCallContractsParams = z.infer<typeof SystemCallContractsParamsSchema>;

export const SYSTEM_CALL_CONTRACTS_DEFAULT_PARAMS: SystemCallContractsParams = {
  scenario: "normal",
};

/** The seed every student's assessed submission uses, so results are comparable across students. */
export const ASSESSED_SEED = 100;
/**
 * A distinct seed for the completed worked example, per the course design
 * document: "Include a completed demonstration using a different seed
 * scenario so the assessed results are not disclosed."
 */
export const WORKED_EXAMPLE_SEED = 900;

type Detail = { returnValue: string; errno?: string };

function buildTrace(scenario: Scenario, rng: SeededRandom): { trace: TraceEvent[]; exitCode: number | null } {
  const pid = rng.int(10000, 32000);
  const events: TraceEvent[] = [];
  let clock = 0;

  function push(category: SyscallCategory, syscall: string, args: string, result: Detail): TraceEvent {
    clock += rng.int(1, 4);
    const detailText = `${syscall}(${args}) = ${result.returnValue}${result.errno ? ` (${result.errno})` : ""}`;
    const event: TraceEvent = {
      index: events.length,
      label: `${category}:${syscall}`,
      detail: detailText,
      timestamp: clock,
      meta: { category, syscall, args, pid, ...result },
    };
    events.push(event);
    return event;
  }

  push("process", "execve", '"/usr/local/bin/harborlink-ingest"', { returnValue: "0" });
  push("protection", "prctl", "PR_SET_NO_NEW_PRIVS, 1", { returnValue: "0" });
  push("memory", "brk", "NULL", { returnValue: "0x55d2000" });
  push("file", "openat", '"sensor_readings.csv", O_RDONLY', { returnValue: "3" });
  push("file", "read", "3, buf, 4096", { returnValue: "512" });
  push("file", "read", "3, buf, 4096", { returnValue: "0" });
  push("file", "close", "3", { returnValue: "0" });

  if (scenario === "missing-config") {
    push("file", "openat", '"ingest.conf", O_RDONLY', { returnValue: "-1", errno: "ENOENT" });
    push("process", "exit_group", "78", { returnValue: "-" });
    return { trace: events, exitCode: 78 };
  }
  push("file", "openat", '"ingest.conf", O_RDONLY', { returnValue: "3" });
  push("file", "read", "3, buf, 256", { returnValue: "128" });
  push("file", "close", "3", { returnValue: "0" });
  push("communication", "sendto", '4, "READY", 5, {sun_path="/run/harborlink/status.sock"}', {
    returnValue: "5",
  });
  push("memory", "mmap", "NULL, 4096, PROT_READ|PROT_WRITE, MAP_PRIVATE|MAP_ANONYMOUS, -1, 0", {
    returnValue: "0x7f9a00000000",
  });

  if (scenario === "denied-write") {
    push("file", "openat", '"alert.log", O_WRONLY|O_CREAT|O_APPEND, 0644', {
      returnValue: "-1",
      errno: "EACCES",
    });
    push("process", "exit_group", "74", { returnValue: "-" });
    return { trace: events, exitCode: 74 };
  }
  push("file", "openat", '"alert.log", O_WRONLY|O_CREAT|O_APPEND, 0644', { returnValue: "5" });

  if (scenario === "interrupted-write") {
    push("file", "write", '5, "2026-... ALERT ...", 96', { returnValue: "-1", errno: "EINTR" });
    push("file", "write", '5, "2026-... ALERT ...", 96', { returnValue: "96" });
  } else {
    push("file", "write", '5, "2026-... ALERT ...", 96', { returnValue: "96" });
  }

  push("file", "fsync", "5", { returnValue: "0" });
  push("file", "close", "5", { returnValue: "0" });
  push("process", "exit_group", "0", { returnValue: "-" });
  return { trace: events, exitCode: 0 };
}

function runSystemCallContracts(params: SystemCallContractsParams, rng: SeededRandom): RunResult {
  const { trace, exitCode } = buildTrace(params.scenario, rng);

  const metrics: Record<string, number> = { totalCalls: trace.length, exitCode: exitCode ?? -1 };
  for (const category of SYSCALL_CATEGORIES) {
    metrics[`calls_${category}`] = trace.filter((event) => event.meta?.category === category).length;
  }
  metrics.errorReturns = trace.filter((event) => typeof event.meta?.errno === "string").length;

  return {
    schemaVersion: 1,
    moduleId: "system-call-contracts",
    scenarioId: params.scenario,
    seed: rng.seed,
    metrics,
    trace,
  };
}

export const systemCallContractsModule: SimulationDefinition<SystemCallContractsParams, RunResult> = {
  id: "system-call-contracts",
  title: "System-Call Contracts",
  schemaVersion: 1,
  paramsSchema: SystemCallContractsParamsSchema,
  resultSchema: RunResultSchema,
  defaultParams: SYSTEM_CALL_CONTRACTS_DEFAULT_PARAMS,
  run: runSystemCallContracts,
};

/**
 * Index of the first event where two traces stop matching (compared by
 * syscall label and formatted detail, which includes the return value and
 * errno). Returns null if one trace is a prefix of the other with no
 * content difference, or if the traces are identical.
 */
export function findFirstDivergenceIndex(a: readonly TraceEvent[], b: readonly TraceEvent[]): number | null {
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    if (a[i].label !== b[i].label || a[i].detail !== b[i].detail) return i;
  }
  return a.length === b.length ? null : len;
}
