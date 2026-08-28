import { z } from "zod";
import { SCHEMA_VERSIONS } from "./version";

/**
 * The Simulation Evidence Record (SER): the one reflective artifact every
 * module reuses, per the course design document's Start Here overview.
 * Field names below map directly to that overview's list — model and
 * assumptions, prediction, parameters tested, simulated results, cited
 * interpretation, architecture implication, counterexample or complication,
 * unresolved question, and limitation. The revised course also requires
 * students to distinguish a live or instructor-supplied observation from
 * controlled simulation evidence and compare the two where applicable.
 * Nothing in this record is transmitted anywhere; it
 * lives only in the browser's local storage until the student exports it.
 */
export const EvidenceRecordSchema = z.object({
  schemaVersion: z.literal(SCHEMA_VERSIONS.evidenceRecord),
  moduleId: z.string().min(1),
  scenarioId: z.string().min(1),
  seed: z.number().int(),
  preparedBy: z.string().default(""),
  directObservation: z.string().default(""),
  modelAndAssumptions: z.string().default(""),
  prediction: z.string().default(""),
  parametersTested: z.string().default(""),
  observedResults: z.string().default(""),
  evidenceComparison: z.string().default(""),
  citedInterpretation: z.string().default(""),
  architectureImplication: z.string().default(""),
  counterexampleOrComplication: z.string().default(""),
  unresolvedQuestion: z.string().default(""),
  limitation: z.string().default(""),
  updatedAt: z.string(),
});

export type EvidenceRecord = z.infer<typeof EvidenceRecordSchema>;

export const EVIDENCE_RECORD_FIELDS: {
  key: keyof Pick<
    EvidenceRecord,
    | "directObservation"
    | "modelAndAssumptions"
    | "prediction"
    | "parametersTested"
    | "observedResults"
    | "evidenceComparison"
    | "citedInterpretation"
    | "architectureImplication"
    | "counterexampleOrComplication"
    | "unresolvedQuestion"
    | "limitation"
  >;
  label: string;
  helpText: string;
}[] = [
  {
    key: "directObservation",
    label: "Live or supplied observation",
    helpText:
      "Summarize only what the approved live-system or instructor-provided evidence directly showed.",
  },
  {
    key: "modelAndAssumptions",
    label: "Model and assumptions",
    helpText: "Name the governing theory or model and the assumptions it requires.",
  },
  {
    key: "prediction",
    label: "Prediction",
    helpText: "Write this before you run the simulation.",
  },
  {
    key: "parametersTested",
    label: "Parameters tested",
    helpText: "List the seed and the controls you changed, one at a time.",
  },
  {
    key: "observedResults",
    label: "Simulated results",
    helpText: "State what the generated trace or metrics showed, without presenting it as live-system evidence.",
  },
  {
    key: "evidenceComparison",
    label: "Evidence-source comparison",
    helpText:
      "Explain what the live or supplied observation showed, what the controlled simulation isolated, and the textbook concept connecting them.",
  },
  {
    key: "citedInterpretation",
    label: "Cited interpretation",
    helpText: "Explain why the theory predicts this result; cite the textbook or a required resource.",
  },
  {
    key: "architectureImplication",
    label: "Architecture implication",
    helpText: "State what this result implies for a HarborLink design decision.",
  },
  {
    key: "counterexampleOrComplication",
    label: "Counterexample or complication",
    helpText: "Identify a case, assumption, or result that complicates the clean conclusion.",
  },
  {
    key: "unresolvedQuestion",
    label: "Unresolved question",
    helpText: "Identify what remains uncertain or requires additional production evidence.",
  },
  {
    key: "limitation",
    label: "Limitation",
    helpText: "State what this simulation cannot establish.",
  },
];

export function createEmptyEvidenceRecord(input: {
  moduleId: string;
  scenarioId: string;
  seed: number;
}): EvidenceRecord {
  return {
    schemaVersion: SCHEMA_VERSIONS.evidenceRecord,
    moduleId: input.moduleId,
    scenarioId: input.scenarioId,
    seed: input.seed,
    preparedBy: "",
    directObservation: "",
    modelAndAssumptions: "",
    prediction: "",
    parametersTested: "",
    observedResults: "",
    evidenceComparison: "",
    citedInterpretation: "",
    architectureImplication: "",
    counterexampleOrComplication: "",
    unresolvedQuestion: "",
    limitation: "",
    updatedAt: new Date(0).toISOString(),
  };
}
