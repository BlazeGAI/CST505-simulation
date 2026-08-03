import type { ComponentType } from "react";
import { SystemCallContractsClient } from "./system-call-contracts-client";
import { VirtualMemoryClient } from "./virtual-memory-client";

/** Maps a module slug to its real client UI, once that module has shipped. */
export const MODULE_CLIENTS: Record<string, ComponentType> = {
  "system-call-contracts": SystemCallContractsClient,
  "virtual-memory": VirtualMemoryClient,
};
