import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { auditEvaluationForCertification } from "./audit";
import type { EvaluationAssignmentReadinessDecision } from "./assignments";
import type { TechnicalEvaluationDecision } from "./types";

const readyAssignment: EvaluationAssignmentReadinessDecision = {
  ready: true,
  canStartEvaluation: true,
  requiresSecondReview: false,
  summary: "Lista para avanzar.",
  reasons: ["ready_to_assign"],
};

const approvedEvaluation: TechnicalEvaluationDecision = {
  status: "approved",
  canIssueCertification: true,
  requiresSupervision: false,
  approvedScopes: ["autonomous_work", "low_risk"],
  reasons: ["approved"],
};

describe("evaluation audit rules", () => {
  it("allows certification when assignment and evaluation are complete", () => {
    const decision = auditEvaluationForCertification({
      assignment: readyAssignment,
      evaluation: approvedEvaluation,
    });

    assert.equal(decision.canApproveCertification, true);
    assert.equal(decision.risk, "low");
    assert.equal(decision.actions.includes("allow_progress"), true);
  });

  it("requests an evaluator when the assignment has none", () => {
    const decision = auditEvaluationForCertification({
      assignment: {
        ...readyAssignment,
        ready: false,
        reasons: ["evaluator_not_assigned"],
      },
      evaluation: approvedEvaluation,
    });

    assert.equal(decision.canApproveCertification, false);
    assert.equal(decision.requiresHumanReview, true);
    assert.equal(decision.actions.includes("request_evaluator"), true);
  });

  it("blocks certification when the technical evaluation is rejected", () => {
    const decision = auditEvaluationForCertification({
      assignment: readyAssignment,
      evaluation: {
        ...approvedEvaluation,
        status: "rejected",
        canIssueCertification: false,
        approvedScopes: [],
        reasons: ["score_below_threshold"],
      },
    });

    assert.equal(decision.canApproveCertification, false);
    assert.equal(decision.risk, "blocked");
    assert.equal(decision.actions.includes("block_certification"), true);
  });

  it("requires second review when supervision is needed", () => {
    const decision = auditEvaluationForCertification({
      assignment: {
        ...readyAssignment,
        requiresSecondReview: true,
        reasons: ["second_review_required"],
      },
      evaluation: {
        ...approvedEvaluation,
        status: "approved_with_supervision",
        requiresSupervision: true,
      },
    });

    assert.equal(decision.canApproveCertification, false);
    assert.equal(decision.requiresHumanReview, true);
    assert.equal(decision.actions.includes("second_review"), true);
  });
});
