import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  decideFromScores,
  normalizeAiWorkerVerdict,
} from "./aiDocumentValidation";

describe("AI document decision thresholds", () => {
  it("rejects high forgery risk", () => {
    assert.equal(
      decideFromScores({
        confidence: 0.95,
        forgeryRisk: "high",
        hasDocuments: true,
      }),
      "rejected"
    );
  });

  it("approves only high confidence with low forgery risk", () => {
    assert.equal(
      decideFromScores({
        confidence: 0.9,
        forgeryRisk: "low",
        hasDocuments: true,
      }),
      "approved"
    );
  });

  it("marks medium forgery as dudoso", () => {
    assert.equal(
      decideFromScores({
        confidence: 0.9,
        forgeryRisk: "medium",
        hasDocuments: true,
      }),
      "dudoso"
    );
  });

  it("marks missing documents as dudoso", () => {
    assert.equal(
      decideFromScores({
        confidence: 0.9,
        forgeryRisk: "low",
        hasDocuments: false,
      }),
      "dudoso"
    );
  });

  it("never auto-approves when model says approve but forgery is medium", () => {
    const verdict = normalizeAiWorkerVerdict(
      {
        decision: "approved",
        confidence: 0.95,
        forgeryRisk: "medium",
        summary: "Parece ok pero hay dudas",
        professionalMessage: "En revisión",
        credentials: [],
      },
      "test-model",
      true
    );
    assert.equal(verdict.decision, "dudoso");
  });
});
