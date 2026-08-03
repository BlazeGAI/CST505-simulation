import type { ComponentType } from "react";
import { SystemCallContractsClient } from "./system-call-contracts-client";
import { SchedulingAndConcurrencyClient } from "./scheduling-and-concurrency-client";
import { VirtualMemoryClient } from "./virtual-memory-client";
import { CrashConsistencyClient } from "./crash-consistency-client";
import { VirtualizationAndIsolationClient } from "./virtualization-and-isolation-client";
import { IntegratedFailureAnalysisClient } from "./integrated-failure-analysis-client";

/** Maps a module slug to its real client UI, once that module has shipped. */
export const MODULE_CLIENTS: Record<string, ComponentType> = {
  "system-call-contracts": SystemCallContractsClient,
  "scheduling-and-concurrency": SchedulingAndConcurrencyClient,
  "virtual-memory": VirtualMemoryClient,
  "crash-consistency": CrashConsistencyClient,
  "virtualization-and-isolation": VirtualizationAndIsolationClient,
  "integrated-failure-analysis": IntegratedFailureAnalysisClient,
};
