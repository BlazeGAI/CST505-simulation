/**
 * Central place to bump schema versions. Every persisted or exported
 * document embeds one of these numbers so that a future format change can
 * be detected and migrated instead of silently misread. See
 * docs/architecture.md, question 6 ("How are scenario and export formats
 * versioned?").
 */
export const SCHEMA_VERSIONS = {
  scenarioConfig: 1,
  runResult: 1,
  evidenceRecord: 1,
  exportPackage: 1,
} as const;
