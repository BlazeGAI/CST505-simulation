import { z } from "zod";
import { SCHEMA_VERSIONS } from "./version";

/**
 * Module-agnostic envelope for one simulation run. `metrics` holds
 * summary numbers (for comparison tables); `trace` holds the ordered,
 * inspectable events a student annotates. Each module's UI renders its own
 * richer trace/metric shapes on top of this envelope — see each module's PR.
 */
export const TraceEventSchema = z.object({
  index: z.number().int().nonnegative(),
  label: z.string(),
  detail: z.string().optional(),
  timestamp: z.number().nonnegative(),
});

export const RunResultSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSIONS.runResult),
  moduleId: z.string().min(1),
  scenarioId: z.string().min(1),
  seed: z.number().int(),
  metrics: z.record(z.string(), z.number()),
  trace: z.array(TraceEventSchema),
});

export type TraceEvent = z.infer<typeof TraceEventSchema>;
export type RunResult = z.infer<typeof RunResultSchema>;
