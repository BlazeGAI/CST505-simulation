import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EvidenceRecordForm } from "./evidence-record-form";
import { createEmptyEvidenceRecord } from "@/lib/schemas/evidence-record";

describe("EvidenceRecordForm", () => {
  it("renders a labeled control for every required field", () => {
    const value = createEmptyEvidenceRecord({
      moduleId: "reference-demo",
      scenarioId: "reference-demo-normal",
      seed: 42,
    });
    render(<EvidenceRecordForm value={value} onChange={() => {}} />);

    for (const label of [
      "Evidence package label",
      "Live or supplied observation",
      "Model and assumptions",
      "Prediction",
      "Parameters tested",
      "Simulated results",
      "Evidence-source comparison",
      "Cited interpretation",
      "Architecture implication",
      "Counterexample or complication",
      "Unresolved question",
      "Limitation",
    ]) {
      expect(screen.getByLabelText(new RegExp(label))).toBeInTheDocument();
    }
  });

  it("calls onChange with the updated field and a fresh timestamp", () => {
    const value = createEmptyEvidenceRecord({
      moduleId: "reference-demo",
      scenarioId: "reference-demo-normal",
      seed: 42,
    });
    const onChange = vi.fn();
    render(<EvidenceRecordForm value={value} onChange={onChange} />);

    const prediction = screen.getByLabelText("Prediction");
    fireEvent.change(prediction, { target: { value: "x" } });

    expect(onChange).toHaveBeenCalled();
    const lastCall = onChange.mock.calls.at(-1)?.[0];
    expect(lastCall.prediction).toBe("x");
    expect(lastCall.updatedAt).not.toBe(value.updatedAt);
  });

  it("shows the independent-control reminder only for Week 5 evidence", () => {
    const week5 = createEmptyEvidenceRecord({
      moduleId: "virtualization-and-isolation",
      scenarioId: "assessed",
      seed: 505,
    });
    const { unmount } = render(<EvidenceRecordForm value={week5} onChange={() => {}} />);
    expect(screen.getByText(/No parallel live observation is required for Week 5/i)).toBeInTheDocument();
    unmount();

    const week2 = createEmptyEvidenceRecord({
      moduleId: "scheduling-and-concurrency",
      scenarioId: "assessed",
      seed: 505,
    });
    render(<EvidenceRecordForm value={week2} onChange={() => {}} />);
    expect(screen.queryByText(/No parallel live observation is required for Week 5/i)).not.toBeInTheDocument();
  });
});
