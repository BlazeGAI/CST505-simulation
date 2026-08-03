import type { ComponentType } from "react";
import { SystemCallContractsClient } from "./system-call-contracts-client";
import { SchedulingAndConcurrencyClient } from "./scheduling-and-concurrency-client";
import { VirtualMemoryClient } from "./virtual-memory-client";
import { VirtualizationAndIsolationClient } from "./virtualization-and-isolation-client";

/** Maps a module slug to its real client UI, once that module has shipped. */
export const MODULE_CLIENTS: Record<string, ComponentType> = {
  "system-call-contracts": SystemCallContractsClient,
  "scheduling-and-concurrency": SchedulingAndConcurrencyClient,
  "virtual-memory": VirtualMemoryClient,
  "virtualization-and-isolation": VirtualizationAndIsolationClient,
};
