import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideEcosystemAutomation } from "./automation";
import type { CertificationEligibilityDecision } from "@/lib/certifications/types";
import type { TechnicalEvaluationDecision } from "@/lib/evaluations/types";
import type { OperationalDecision } from "@/lib/operational/status";

const operationalReady: OperationalDecision = {
  status: "habilitado",
  canAppearInSearch: true,
  canAcceptWork: true,
  requiresManualReview: false,
  requiresSupervision: false,
  semester: { year: 2026, code: "S2", startsAt: "2026-08-01", endsAt: "2026-12-31" },
  reasons: ["ready"],
};

const certificationEligible: CertificationEligibilityDecision = {
  eligible: true,
  reasons: ["eligible"],
};

const evaluationApproved: TechnicalEvaluationDecision = {
  status: "approved",
  canIssueCertification: true,
  requiresSupervision: false,
  approvedScopes: ["autonomous_work", "low_risk"],
  reasons: ["approved"],
};

describe("ecosystem automation", () => {
  it("requests renewal when documents are pending", () => {
    const decision = decideEcosystemAutomation({
      operational: {
        ...operationalReady,
        status: "pendiente_documentos",
        canAcceptWork: false,
        canAppearInSearch: false,
        reasons: ["documents_due_this_semester"],
      },
      certification: { eligible: false, reasons: ["evaluation_required"] },
      evaluation: { ...evaluationApproved, canIssueCertification: false, status: "rejected" },
    });

    assert.equal(decision.signals.includes("documents_pending"), true);
    assert.equal(decision.suggestedActions.includes("request_document_renewal"), true);
  });

  it("recommends technical evaluation before certification", () => {
    const decision = decideEcosystemAutomation({
      operational: operationalReady,
      certification: { eligible: false, reasons: ["evaluation_required"] },
      evaluation: { ...evaluationApproved, canIssueCertification: false, status: "rejected" },
    });

    assert.equal(decision.signals.includes("evaluation_needed"), true);
    assert.equal(decision.suggestedActions.includes("recommend_technical_evaluation"), true);
  });

  it("allows autonomous matching only when all gates are ready", () => {
    const decision = decideEcosystemAutomation({
      operational: operationalReady,
      certification: certificationEligible,
      evaluation: evaluationApproved,
    });

    assert.equal(decision.signals.includes("ready_for_autonomous_work"), true);
    assert.equal(decision.suggestedActions.includes("allow_autonomous_matching"), true);
    assert.equal(decision.requiresHumanApproval, true);
  });
});
