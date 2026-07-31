import type { z } from "zod";
import { SeededRandom } from "./random";

/**
 * Contract every simulation module implements. A module is a pure function
 * of (params, seed) -> result: no network access, no wall-clock reads, no
 * hidden global state. That purity is what lets a scenario be re-run,
 * compared, exported, and graded identically on any machine.
 */
export interface SimulationDefinition<TParams, TResult> {
  /** Stable identifier, e.g. "syscall-contracts". Used in routes, storage keys, and exports. */
  id: string;
  /** Human-readable name shown in the UI. */
  title: string;
  /** Schema version for this module's params/result shape (see docs/architecture.md). */
  schemaVersion: number;
  /** Validates and parses raw scenario configuration before a run. */
  paramsSchema: z.ZodType<TParams>;
  /** Validates the shape of a run result, e.g. before persisting or exporting it. */
  resultSchema: z.ZodType<TResult>;
  /** The published default configuration every student starts from. */
  defaultParams: TParams;
  /**
   * Executes one deterministic run. Implementations must not use
   * Math.random(), Date.now(), or any other non-deterministic source —
   * derive all randomness from the provided SeededRandom instance.
   */
  run(params: TParams, rng: SeededRandom): TResult;
}

/** Wraps run() with param validation and a fresh seeded generator. */
export function runSimulation<TParams, TResult>(
  definition: SimulationDefinition<TParams, TResult>,
  rawParams: unknown,
  seed: number,
): TResult {
  const params = definition.paramsSchema.parse(rawParams);
  const rng = new SeededRandom(seed);
  const result = definition.run(params, rng);
  return definition.resultSchema.parse(result);
}
