import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildOperationalReviewQueue } from "./reviewQueue";
import type { EcosystemAutomationDecision } from "@/lib/ecosystem/automation";
import type { EvaluationAuditDecision } from "@/lib/evaluations/audit";
import type { RenewalDecision } from "@/lib/operational/renewal";
import type { OperationalDecision } from "@/lib/operational/status";

const operational: OperationalDecision = {
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

const renewal: RenewalDecision = {
  status: "complete",
  semester: operational.semester,
  deadlineAt: "2026-12-31",
  daysUntilDeadline: 30,
  shouldSuspend: false,
  requiresManualReview: false,
  actions: ["no_action"],
  reasons: ["renewal_current"],
  summary: "Renovacion completa.",
};

const evaluationAudit: EvaluationAuditDecision = {
  risk: "low",
  canApproveCertification: true,
  requiresHumanReview: false,
  actions: ["allow_progress"],
  reasons: ["certification_allowed"],
  summary: "Puede avanzar.",
};

const automation: EcosystemAutomationDecision = {
  signals: [],
  suggestedActions: [],
  requiresHumanApproval: false,
  summary: "Sin automatizaciones criticas sugeridas.",
};

describe("operational review queue", () => {
  it("returns no items when there is nothing pending", () => {
    const decision = buildOperationalReviewQueue({
      profileId: "profile-1",
      operational,
      renewal,
      evaluationAudit,
      automation,
    });

    assert.equal(decision.items.length, 0);
    assert.equal(decision.highestPriority, null);
    assert.equal(decision.requiresHumanAction, false);
  });

  it("prioritizes account suspension as critical", () => {
    const decision = buildOperationalReviewQueue({
      profileId: "profile-1",
      operational: { ...operational, canAcceptWork: false },
      renewal: {
        ...renewal,
        status: "blocked",
        shouldSuspend: true,
        actions: ["suspend_account"],
        reasons: ["documents_expired"],
        summary: "Documentos vencidos.",
      },
      evaluationAudit,
      automation,
    });

    assert.equal(decision.highestPriority, "critical");
    assert.equal(decision.items[0]?.type, "account_suspension");
  });

  it("adds human review for pending document validation", () => {
    const decision = buildOperationalReviewQueue({
      profileId: "profile-1",
      operational,
      renewal: {
        ...renewal,
        status: "submitted",
        requiresManualReview: true,
        actions: ["request_manual_review"],
        reasons: ["documents_pending_review"],
        summary: "Documentos pendientes.",
      },
      evaluationAudit,
      automation,
    });

    assert.equal(decision.requiresHumanAction, true);
    assert.equal(decision.items[0]?.type, "manual_document_review");
  });

  it("adds second review when evaluation audit requires it", () => {
    const decision = buildOperationalReviewQueue({
      profileId: "profile-1",
      operational,
      renewal,
      evaluationAudit: {
        ...evaluationAudit,
        risk: "high",
        canApproveCertification: false,
        requiresHumanReview: true,
        actions: ["second_review"],
        reasons: ["second_review_required"],
        summary: "Requiere segunda revision.",
      },
      automation,
    });

    assert.equal(decision.items[0]?.type, "second_review");
    assert.equal(decision.items[0]?.priority, "high");
  });
});
