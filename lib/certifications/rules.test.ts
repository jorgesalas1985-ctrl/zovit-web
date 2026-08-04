import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canIssueZovitCertification,
  evaluateCertificationEligibility,
} from "./rules";

describe("ZOVIT certification rules", () => {
  it("does not issue certification from academic training alone", () => {
    const decision = evaluateCertificationEligibility({
      competencyId: "plumbing-basic-repair",
      evaluationResult: "not_started",
      hasVerifiedIdentity: true,
      hasOnlyAcademicTraining: true,
    });

    assert.equal(decision.eligible, false);
    assert.equal(decision.reasons.includes("academic_training_is_not_certification"), true);
    assert.equal(decision.reasons.includes("evaluation_required"), true);
  });

  it("allows certification after approved ZOVIT evaluation", () => {
    assert.equal(
      canIssueZovitCertification({
        competencyId: "digital-basic-support",
        evaluationResult: "approved",
        hasVerifiedIdentity: true,
      }),
      true,
    );
  });

  it("requires identity before issuing certification", () => {
    const decision = evaluateCertificationEligibility({
      competencyId: "digital-basic-support",
      evaluationResult: "approved",
      hasVerifiedIdentity: false,
    });

    assert.equal(decision.eligible, false);
    assert.deepEqual(decision.reasons, ["identity_required"]);
  });

  it("requires evaluation or external license for regulated competencies", () => {
    const decision = evaluateCertificationEligibility({
      competencyId: "electricity-basic-installation",
      evaluationResult: "pending",
      hasVerifiedIdentity: true,
      hasExternalLicense: false,
    });

    assert.equal(decision.eligible, false);
    assert.deepEqual(decision.reasons, ["external_license_or_evaluation_required"]);
  });
});
