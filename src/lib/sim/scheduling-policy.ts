import { z } from "zod";
import type { SimulationDefinition } from "./engine";
import type { SeededRandom } from "./random";
import { RunResultSchema, type RunResult, type TraceEvent } from "../schemas/run-result";

/**
 * Week 2: Scheduling and Concurrency (scheduling half). Five HarborLink
 * workload classes compete for one CPU under four policies. Every job
 * eventually receives its full CPU burst regardless of policy, so "total
 * service received" can't distinguish policies — what changes is *when*
 * each class is served, which response time, waiting time, and the
 * fairness index (below) are built to expose.
 */
export const POLICIES = ["fifo", "sjf-stcf", "round-robin", "fair-share"] as const;
export type Policy = (typeof POLICIES)[number];

export const WORKLOAD_CLASSES = [
  { id: "safety-alert", priority: 5, burstRange: [2, 4] as const, count: 2, deadlineOffset: 10, hasIO: false },
  {
    id: "sensor-ingestion",
    priority: 4,
    burstRange: [3, 5] as const,
    count: 2,
    deadlineOffset: 18,
    hasIO: true,
    ioWaitRange: [2, 3] as const,
  },
  { id: "operator-dashboard", priority: 3, burstRange: [2, 3] as const, count: 2, deadlineOffset: null, hasIO: false },
  { id: "file-compaction", priority: 2, burstRange: [6, 9] as const, count: 2, deadlineOffset: null, hasIO: false },
  { id: "batch-analytics", priority: 1, burstRange: [8, 12] as const, count: 2, deadlineOffset: null, hasIO: false },
] as const;
export type WorkloadClassId = (typeof WORKLOAD_CLASSES)[number]["id"];

export const SchedulingPolicyParamsSchema = z.object({
  policy: z.enum(POLICIES),
  timeQuantum: z.number().int().min(2).max(6),
});
export type SchedulingPolicyParams = z.infer<typeof SchedulingPolicyParamsSchema>;

export const SCHEDULING_POLICY_DEFAULT_PARAMS: SchedulingPolicyParams = {
  policy: "fifo",
  timeQuantum: 4,
};

/** Published seed every student's assessed comparison must use. */
export const ASSESSED_SEED = 100;

const MAX_TICKS = 300;

interface Job {
  id: string;
  classId: WorkloadClassId;
  priority: number;
  arrival: number;
  totalBurst: number;
  remainingBurst: number;
  deadline: number | null;
  hasIO: boolean;
  ioWait: number;
  ioTaken: boolean;
  firstDispatch: number | null;
  waitingTicks: number;
  completion: number | null;
  runSinceQuantumStart: number;
}

function generateJobs(rng: SeededRandom): Job[] {
  const jobs: Job[] = [];
  for (const cls of WORKLOAD_CLASSES) {
    for (let i = 0; i < cls.count; i++) {
      const arrival = rng.int(0, 24);
      const burst = rng.int(cls.burstRange[0], cls.burstRange[1]);
      const ioWait = cls.hasIO ? rng.int(cls.ioWaitRange[0], cls.ioWaitRange[1]) : 0;
      jobs.push({
        id: `${cls.id}-${i + 1}`,
        classId: cls.id,
        priority: cls.priority,
        arrival,
        totalBurst: burst,
        remainingBurst: burst,
        deadline: cls.deadlineOffset === null ? null : arrival + cls.deadlineOffset,
        hasIO: cls.hasIO,
        ioWait,
        ioTaken: false,
        firstDispatch: null,
        waitingTicks: 0,
        completion: null,
        runSinceQuantumStart: 0,
      });
    }
  }
  return jobs.sort((a, b) => a.arrival - b.arrival || a.id.localeCompare(b.id));
}

/** Index (within `ready`) of the job the policy would pick from the front of its queue. */
function selectIndex(policy: Policy, ready: Job[]): number {
  if (policy === "fair-share") {
    const topPriority = Math.max(...ready.map((j) => j.priority));
    return ready.findIndex((j) => j.priority === topPriority);
  }
  if (policy === "sjf-stcf") {
    let shortestIndex = 0;
    for (let i = 1; i < ready.length; i += 1) {
      const candidate = ready[i];
      const shortest = ready[shortestIndex];
      if (
        candidate.remainingBurst < shortest.remainingBurst ||
        (candidate.remainingBurst === shortest.remainingBurst &&
          (candidate.arrival < shortest.arrival ||
            (candidate.arrival === shortest.arrival && candidate.id.localeCompare(shortest.id) < 0)))
      ) {
        shortestIndex = i;
      }
    }
    return shortestIndex;
  }
  return 0;
}

function runScheduler(params: SchedulingPolicyParams, rng: SeededRandom): RunResult {
  const jobs = generateJobs(rng);
  const trace: TraceEvent[] = [];
  let clock = 0;
  let notArrived = [...jobs];
  const ready: Job[] = [];
  let blocked: Job[] = [];
  let current: Job | null = null;

  function push(classId: string, event: string, detail: string, meta: Record<string, unknown> = {}) {
    trace.push({
      index: trace.length,
      label: `${classId}:${event}`,
      detail,
      timestamp: clock,
      meta: { classId, event, ...meta },
    });
  }

  function completeJob(job: Job) {
    job.completion = clock;
    push(job.classId, "complete", `${job.id} completes`, { jobId: job.id });
    if (job.deadline !== null && job.completion > job.deadline) {
      push(job.classId, "deadline-missed", `${job.id} missed its deadline (${job.deadline})`, { jobId: job.id });
    }
  }

  while (jobs.some((j) => j.completion === null) && clock < MAX_TICKS) {
    // Phase A: arrivals join the back of the ready queue.
    for (const job of notArrived.filter((j) => j.arrival === clock)) {
      ready.push(job);
      push(job.classId, "arrival", `${job.id} arrives (burst ${job.totalBurst})`, { jobId: job.id });
    }
    notArrived = notArrived.filter((j) => j.arrival !== clock);

    // Phase B: I/O completions.
    for (const job of [...blocked]) {
      job.ioWait -= 1;
      if (job.ioWait <= 0) {
        blocked = blocked.filter((j) => j !== job);
        completeJob(job);
      }
    }

    // Phase C: decide whether the current job continues, or a new one is dispatched.
    const shortestReadyBurst = ready.length > 0
      ? Math.min(...ready.map((job) => job.remainingBurst))
      : Number.POSITIVE_INFINITY;
    const shorterJobReady =
      current !== null &&
      params.policy === "sjf-stcf" &&
      shortestReadyBurst < current.remainingBurst;
    const quantumExpired =
      current !== null &&
      (params.policy === "round-robin" || params.policy === "fair-share") &&
      current.runSinceQuantumStart >= params.timeQuantum;
    const mustYield = shorterJobReady || quantumExpired;
    if (current && mustYield) {
      ready.push(current);
      const reason = shorterJobReady ? "shorter remaining job became ready" : "quantum expired";
      push(current.classId, "preempt", `${current.id} preempted (${reason})`, { jobId: current.id, reason });
      current = null;
    }
    if (!current && ready.length > 0) {
      const index = selectIndex(params.policy, ready);
      current = ready.splice(index, 1)[0];
      current.runSinceQuantumStart = 0;
      push(current.classId, "dispatch", `${current.id} dispatched`, { jobId: current.id });
    }

    // Phase D: everyone still waiting accrues a waiting tick.
    for (const job of ready) job.waitingTicks += 1;

    // Phase E: run the dispatched job for this tick.
    if (current) {
      if (current.firstDispatch === null) current.firstDispatch = clock;
      current.remainingBurst -= 1;
      current.runSinceQuantumStart += 1;
      if (current.remainingBurst === 0) {
        if (current.hasIO && !current.ioTaken) {
          current.ioTaken = true;
          blocked.push(current);
          push(current.classId, "io-block", `${current.id} blocks for I/O (${current.ioWait} ticks)`, {
            jobId: current.id,
          });
        } else {
          completeJob(current);
        }
        current = null;
      }
    }

    clock += 1;
  }

  const makespan = clock;
  const completed = jobs.filter((j) => j.completion !== null);
  const busyTicks = completed.reduce((sum, j) => sum + j.totalBurst, 0);
  const responseTimes = completed.map((j) => (j.firstDispatch ?? j.completion!) - j.arrival);
  const waitingTimes = completed.map((j) => j.waitingTicks);
  const turnaroundTimes = completed.map((j) => j.completion! - j.arrival);
  const slowdowns = completed.map((j) => (j.completion! - j.arrival) / j.totalBurst);

  const deadlineJobs = jobs.filter((j) => j.deadline !== null);
  const deadlineMisses = deadlineJobs.filter((j) => j.completion !== null && j.completion > j.deadline!).length;

  const sumSlowdown = slowdowns.reduce((a, b) => a + b, 0);
  const sumSlowdownSq = slowdowns.reduce((a, b) => a + b * b, 0);
  const fairnessIndex = sumSlowdownSq > 0 ? (sumSlowdown * sumSlowdown) / (slowdowns.length * sumSlowdownSq) : 1;

  const avg = (values: number[]) => (values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0);

  const metrics: Record<string, number> = {
    totalJobs: jobs.length,
    completedJobs: completed.length,
    makespan,
    avgResponseTime: Number(avg(responseTimes).toFixed(2)),
    avgWaitingTime: Number(avg(waitingTimes).toFixed(2)),
    avgTurnaroundTime: Number(avg(turnaroundTimes).toFixed(2)),
    cpuUtilization: Number((busyTicks / makespan).toFixed(3)),
    throughput: Number((completed.length / makespan).toFixed(3)),
    fairnessIndex: Number(fairnessIndex.toFixed(3)),
    deadlineJobs: deadlineJobs.length,
    deadlineMisses,
  };

  return {
    schemaVersion: 1,
    moduleId: "scheduling-policy",
    scenarioId: params.policy,
    seed: rng.seed,
    metrics,
    trace,
  };
}

export const schedulingPolicyModule: SimulationDefinition<SchedulingPolicyParams, RunResult> = {
  id: "scheduling-policy",
  title: "Scheduling Policy Comparison",
  schemaVersion: 1,
  paramsSchema: SchedulingPolicyParamsSchema,
  resultSchema: RunResultSchema,
  defaultParams: SCHEDULING_POLICY_DEFAULT_PARAMS,
  run: runScheduler,
};
