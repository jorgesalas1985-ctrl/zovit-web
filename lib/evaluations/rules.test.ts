import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideTechnicalEvaluation } from "./rules";

describe("technical evaluation rules", () => {
  it("rejects evaluations without verified evidence", () => {
    const decision = decideTechnicalEvaluation({
      competencyId: "digital-basic-support",
      score: 95,
      evidence: [],
      approvedScopes: ["autonomous_work", "low_risk"],
    });

    assert.equal(decision.status, "rejected");
    assert.equal(decision.canIssueCertification, false);
    assert.equal(decision.reasons.includes("missing_evidence"), true);
  });

  it("rejects evaluations below threshold", () => {
    const decision = decideTechnicalEvaluation({
      competencyId: "digital-basic-support",
      score: 70,
      evidence: [{ type: "practical_test", description: "Prueba practica", verified: true }],
      approvedScopes: ["autonomous_work", "low_risk"],
    });

    assert.equal(decision.status, "rejected");
    assert.equal(decision.reasons.includes("score_below_threshold"), true);
  });

  it("approves low-risk evaluations with evidence and enough score", () => {
    const decision = decideTechnicalEvaluation({
      competencyId: "digital-basic-support",
      score: 92,
      evidence: [{ type: "practical_test", description: "Prueba practica", verified: true }],
      approvedScopes: ["autonomous_work", "low_risk"],
    });

    assert.equal(decision.status, "approved");
    assert.equal(decision.canIssueCertification, true);
    assert.equal(decision.requiresSupervision, false);
  });
});
