import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canTransitionEvaluationAssignment,
  decideEvaluationAssignmentReadiness,
} from "./assignments";
import type { OperationalDecision } from "@/lib/operational/status";

const readyOperationalDecision: OperationalDecision = {
  status: "habilitado",
  canAppearInSearch: true,
  canAcceptWork: true,
  requiresManualReview: false,
  requiresSupervision: false,
  semester: {
    year: 2026,
    code: "S2",
    startsAt: "2026-08-01",
    endsAt: "2026-12-31",
  },
  reasons: ["ready"],
};

describe("evaluation assignment rules", () => {
  it("allows the expected evaluation workflow", () => {
    const decision = canTransitionEvaluationAssignment("assigned", "accepted");

    assert.equal(decision.allowed, true);
    assert.deepEqual(decision.reasons, ["transition_allowed"]);
  });

  it("blocks skipped transitions", () => {
    const decision = canTransitionEvaluationAssignment("draft", "completed");

    assert.equal(decision.allowed, false);
    assert.deepEqual(decision.reasons, ["transition_not_allowed"]);
  });

  it("does not reopen finalized assignments", () => {
    const decision = canTransitionEvaluationAssignment("completed", "in_progress");

    assert.equal(decision.allowed, false);
    assert.deepEqual(decision.reasons, ["assignment_finalized"]);
  });

  it("requires an evaluator before assignment is ready", () => {
    const decision = decideEvaluationAssignmentReadiness({
      targetOperational: readyOperationalDecision,
      evidenceCount: 1,
    });

    assert.equal(decision.ready, false);
    assert.equal(decision.reasons.includes("evaluator_not_assigned"), true);
  });

  it("marks the assignment ready when evaluator, profile and evidence are valid", () => {
    const decision = decideEvaluationAssignmentReadiness({
      targetOperational: readyOperationalDecision,
      evaluatorDecision: {
        allowed: true,
        requiresSecondReview: false,
        reasons: ["allowed"],
      },
      evidenceCount: 2,
    });

    assert.equal(decision.ready, true);
    assert.equal(decision.reasons.includes("ready_to_assign"), true);
  });
});
