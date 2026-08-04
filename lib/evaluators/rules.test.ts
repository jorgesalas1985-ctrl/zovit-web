import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canEvaluatorHandleCompetency } from "./rules";
import type { EvaluatorProfile } from "./types";

const evaluator: EvaluatorProfile = {
  profileId: "evaluator-1",
  status: "active",
  scope: {
    domains: ["digital"],
    canEvaluateStudents: true,
    canEvaluateProfessionals: true,
    canApproveHighRisk: false,
    requiresSecondReviewForHighRisk: true,
  },
};

describe("evaluator rules", () => {
  it("allows active evaluators inside their competency domain", () => {
    const decision = canEvaluatorHandleCompetency({
      evaluator,
      competencyId: "digital-basic-support",
      targetType: "student",
    });

    assert.equal(decision.allowed, true);
    assert.deepEqual(decision.reasons, ["allowed"]);
  });

  it("blocks evaluators outside their domain", () => {
    const decision = canEvaluatorHandleCompetency({
      evaluator,
      competencyId: "plumbing-basic-repair",
      targetType: "student",
    });

    assert.equal(decision.allowed, false);
    assert.equal(decision.reasons.includes("domain_not_allowed"), true);
  });

  it("blocks inactive evaluators", () => {
    const decision = canEvaluatorHandleCompetency({
      evaluator: { ...evaluator, status: "suspended" },
      competencyId: "digital-basic-support",
      targetType: "student",
    });

    assert.equal(decision.allowed, false);
    assert.deepEqual(decision.reasons, ["evaluator_inactive"]);
  });
});
