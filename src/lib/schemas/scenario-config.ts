import { z } from "zod";
import { SCHEMA_VERSIONS } from "./version";

/**
 * Envelope around a module's own params object. Every module defines its
 * own `params` shape (see SimulationDefinition.paramsSchema); this envelope
 * is the versioned, module-agnostic wrapper that storage and export code
 * operate on without needing to know each module's internals.
 */
export const ScenarioConfigSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSIONS.scenarioConfig),
  moduleId: z.string().min(1),
  scenarioId: z.string().min(1),
  seed: z.number().int(),
  params: z.record(z.string(), z.unknown()),
});

export type ScenarioConfig = z.infer<typeof ScenarioConfigSchema>;

export function createScenarioConfig(input: {
  moduleId: string;
  scenarioId: string;
  seed: number;
  params: Record<string, unknown>;
}): ScenarioConfig {
  return {
    schemaVersion: SCHEMA_VERSIONS.scenarioConfig,
    ...input,
  };
}
