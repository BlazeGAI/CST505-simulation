const CONTEXTS: Record<string, { heading: string; body: string; comparison: string }> = {
  "system-call-contracts": {
    heading: "Theory, observation, and controlled simulation",
    body: "Complete the approved Week 1 Linux, Windows, or instructor-provided observation before this simulation. Redact usernames, machine names, and identifying paths. The observation provides authentic context; this deterministic trace isolates the user-kernel boundary and controlled failure.",
    comparison: "In your evidence package, identify what the live or supplied observation showed that this model did not, what the simulation isolated that the observation could not, and the Chapter 1 concept connecting them.",
  },
  "scheduling-and-concurrency": {
    heading: "Connect CPU observation to controlled policy evidence",
    body: "Bring the approved process and CPU observation from Activity 2.2. Treat a process list or CPU graph as an observation, not proof of the hidden scheduler. This model holds the workload constant so policy and synchronization mechanisms can be compared.",
    comparison: "Explain what the live or supplied evidence revealed, what it could not establish about the exact scheduler, and what the repeatable simulation adds.",
  },
  "virtual-memory": {
    heading: "Connect memory observation to the virtual-memory model",
    body: "Use the approved five-stage memory observation or instructor-provided evidence alongside this simulation. Do not intentionally exhaust system memory, and do not diagnose thrashing from a single change in memory use or fault count.",
    comparison: "Identify what the observation could not establish about replacement policy, what this simplified model cannot establish about a production memory manager, and the Chapter 3 concept connecting both.",
  },
  "crash-consistency": {
    heading: "Separate storage observation from crash-consistency evidence",
    body: "The approved file-system observation shows organization and allocation bookkeeping; it does not directly test crash consistency. This model provides controlled crash timing, durable-state comparison, and simplified recovery.",
    comparison: "State what was directly observed, what was simulated, which Chapters 4 and 5 principle explains each result, and what still requires production storage-stack validation.",
  },
  "virtualization-isolation": {
    heading: "Primary applied environment for Week 5",
    body: "This controlled simulation is the primary applied environment for Activity 5.2. Keep formal Popek-Goldberg classification, simulated boundary behavior, and operational assumptions separate; the app does not launch real containers or virtual machines.",
    comparison: "Identify which conclusion follows from a formal textbook requirement, which is supported only by the HarborLink model, and which needs production validation.",
  },
  "integrated-failure-analysis": {
    heading: "Integrate protection evidence with the compound incident",
    body: "Complete Activity 6.1 and the approved Week 6 protection observation first. Import valid JSON packages from Simulations 2-5, preserve the immutable baseline, and restore it before each individual-control comparison.",
    comparison: "Connect the protection observation to the integrated architecture: label what the observation supports, what the simulation supports, and what remains unverified in production.",
  },
};

export function CourseEvidenceContext({ moduleId }: { moduleId: string }) {
  const context = CONTEXTS[moduleId];
  if (!context) return null;

  return (
    <aside className="mt-6 rounded-lg border border-indigo-200 bg-indigo-50/60 p-4 text-sm text-slate-700 dark:border-indigo-900 dark:bg-indigo-950/20 dark:text-slate-200">
      <h2 className="font-semibold text-slate-900 dark:text-white">{context.heading}</h2>
      <p className="mt-1 leading-relaxed">{context.body}</p>
      <p className="mt-2 leading-relaxed"><strong>Comparison prompt:</strong> {context.comparison}</p>
    </aside>
  );
}
