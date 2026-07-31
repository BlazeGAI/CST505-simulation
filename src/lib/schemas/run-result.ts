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
  /**
   * Optional structured extras a module attaches beyond the generic
   * label/detail/timestamp fields (e.g. a syscall's category, arguments,
   * return value, errno, and PID). Additive and optional, so it never
   * requires a schemaVersion bump: older records without `meta` still
   * parse, and export code that doesn't know about it just ignores it.
   */
  meta: z.record(z.string(), z.unknown()).optional(),
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
