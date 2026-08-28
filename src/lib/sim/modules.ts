/**
 * Catalog of the six CST505 simulation modules. This is metadata only — the
 * foundation PR ships the shell, engine contract, evidence record, and
 * export pipeline that every module will plug into. Each module's actual
 * simulation, golden-seed tests, and evidence outputs land in its own
 * follow-up pull request (see docs/roadmap.md).
 */
export type ModuleStatus = "planned" | "in-development" | "available";

export interface ModuleSummary {
  slug: string;
  weekLabel: string;
  activityLabel: string;
  title: string;
  clo: string[];
  summary: string;
  learningGoals: string[];
  status: ModuleStatus;
}

export const MODULES: ModuleSummary[] = [
  {
    slug: "system-call-contracts",
    weekLabel: "Week 1",
    activityLabel: "Activity 1.3",
    title: "System Boundaries Investigation",
    clo: ["CLO 4"],
    summary:
      "Trace a small HarborLink sensor-ingestion program across the user-kernel boundary in normal and controlled-failure runs, and locate the first divergence between them.",
    learningGoals: [
      "Analyze how system calls and privilege transitions implement operating-system protection and resource-management boundaries.",
      "Compare operating-system structural models against scenario constraints for performance, reliability, and isolation.",
      "Construct a system-context model that translates stakeholder needs into measurable operating-system design criteria.",
    ],
    status: "available",
  },
  {
    slug: "scheduling-and-concurrency",
    weekLabel: "Week 2",
    activityLabel: "Activity 2.2",
    title: "Processes, Scheduling, and Concurrency Investigation",
    clo: ["CLO 1"],
    summary:
      "Compare FIFO, round robin, and a fair-share policy against a shared HarborLink workload, then reproduce and correct an unsafe shared-buffer interleaving.",
    learningGoals: [
      "Analyze scheduling policies using response time, turnaround time, fairness, and deadline evidence.",
      "Diagnose race conditions and deadlocks from execution traces and resource-allocation graphs.",
      "Design a synchronization strategy that balances correctness, responsiveness, and overhead.",
    ],
    status: "available",
  },
  {
    slug: "virtual-memory",
    weekLabel: "Week 3",
    activityLabel: "Activity 3.2",
    title: "Memory Behavior and Virtual-Memory Investigation",
    clo: ["CLO 2"],
    summary:
      "Compare FIFO, LRU, and Clock replacement across frame allocations and workload phases to locate a working-set transition and evaluate a memory control.",
    learningGoals: [
      "Evaluate paging and page-replacement policies using page faults, locality, working sets, and overhead.",
      "Diagnose thrashing, fragmentation, and out-of-memory risk from simulated workload data.",
      "Recommend memory controls aligned to workload priorities and service constraints.",
    ],
    status: "available",
  },
  {
    slug: "crash-consistency",
    weekLabel: "Week 4",
    activityLabel: "Activity 4.2",
    title: "File-System and Crash-Consistency Investigation",
    clo: ["CLO 3"],
    summary:
      "Interrupt a create-and-append operation at controlled write boundaries, classify the resulting inconsistencies, and apply a simplified fsck-style recovery pass.",
    learningGoals: [
      "Assess file-system architectures using consistency, recovery, performance, and security criteria.",
      "Analyze I/O behavior using workload traces and benchmark evidence.",
      "Design a persistence and recovery policy for a constrained edge workload.",
    ],
    status: "available",
  },
  {
    slug: "virtualization-and-isolation",
    weekLabel: "Week 5",
    activityLabel: "Activity 5.2",
    title: "Virtualization and Isolation Investigation",
    clo: ["CLO 4"],
    summary:
      "Classify privileged and sensitive operations against the Popek-Goldberg requirements, then compare process, container, and VM boundaries under one workload.",
    learningGoals: [
      "Compare virtual machines and containers using isolation, overhead, portability, and control criteria.",
      "Evaluate processor and memory constraints using cgroup and telemetry evidence.",
      "Analyze formal virtualization requirements, shared-kernel risks, and enforceable isolation controls.",
    ],
    status: "available",
  },
  {
    slug: "integrated-failure-analysis",
    weekLabel: "Week 6",
    activityLabel: "Activity 6.2",
    title: "Integrated Failure Investigation",
    clo: ["CLO 1", "CLO 2", "CLO 3", "CLO 4"],
    summary:
      "Load Week 2-5 policy choices into a deterministic compound-incident timeline and trace the first failed constraint across subsystems, with and without mitigation.",
    learningGoals: [
      "Integrate scheduling, synchronization, memory, file-system, and security mechanisms into a coherent operating-system architecture.",
      "Evaluate an operating-system architecture under compound load and failure scenarios using simulation evidence and an established security framework.",
      "Defend a written recommendation by connecting constraints, alternatives, evidence, and tradeoffs.",
    ],
    status: "available",
  },
];

export function getModule(slug: string): ModuleSummary | undefined {
  return MODULES.find((m) => m.slug === slug);
}
