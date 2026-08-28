"use client";

import { EVIDENCE_RECORD_FIELDS, type EvidenceRecord } from "@/lib/schemas/evidence-record";

interface EvidenceRecordFormProps {
  value: EvidenceRecord;
  onChange: (next: EvidenceRecord) => void;
}

/**
 * Renders the revised Simulation Evidence Record every module reuses.
 * Every module PR wires this same component to its own scenario/seed
 * instead of re-implementing the form.
 */
export function EvidenceRecordForm({ value, onChange }: EvidenceRecordFormProps) {
  function setField(key: keyof EvidenceRecord, fieldValue: string) {
    onChange({ ...value, [key]: fieldValue, updatedAt: new Date().toISOString() });
  }

  return (
    <div className="space-y-5">
      <div>
        <label htmlFor="ser-prepared-by" className="block text-sm font-medium">
          Evidence package label{" "}
          <span className="text-slate-500 dark:text-slate-400">
            (optional, stays in this browser; do not enter personal information)
          </span>
        </label>
        <input
          id="ser-prepared-by"
          type="text"
          value={value.preparedBy}
          onChange={(e) => setField("preparedBy", e.target.value)}
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
      </div>

      {EVIDENCE_RECORD_FIELDS.map((field) => {
        const inputId = `ser-${field.key}`;
        const helpId = `${inputId}-help`;
        const helpText =
          field.key === "directObservation" && value.moduleId === "virtualization-and-isolation"
            ? "No parallel live observation is required for Week 5. State that this controlled simulation is the primary applied environment."
            : field.helpText;
        return (
          <div key={field.key}>
            <label htmlFor={inputId} className="block text-sm font-medium">
              {field.label}
            </label>
            <p id={helpId} className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              {helpText}
            </p>
            <textarea
              id={inputId}
              aria-describedby={helpId}
              value={value[field.key] ?? ""}
              onChange={(e) => setField(field.key, e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
        );
      })}
    </div>
  );
}
