import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildOperationalActionPlan } from "./actionPlan";

describe("operational action plan", () => {
  it("marks document renewal reminders as automatic", () => {
    const plan = buildOperationalActionPlan({
      items: [
        {
          id: "profile-1:document-renewal",
          type: "document_renewal",
          priority: "low",
          title: "Renovacion",
          summary: "Pendiente.",
          requiresHumanAction: false,
          dueAt: "2026-12-31",
        },
      ],
    });

    assert.equal(plan.automaticCount, 1);
    assert.equal(plan.items[0]?.mode, "automatic");
    assert.equal(plan.items[0]?.kind, "send_document_reminder");
  });

  it("marks document review as manual", () => {
    const plan = buildOperationalActionPlan({
      items: [
        {
          id: "profile-1:manual-document-review",
          type: "manual_document_review",
          priority: "high",
          title: "Revision",
          summary: "Pendiente.",
          requiresHumanAction: true,
          dueAt: null,
        },
      ],
    });

    assert.equal(plan.manualCount, 1);
    assert.equal(plan.items[0]?.mode, "manual");
    assert.equal(plan.items[0]?.kind, "review_documents");
  });

  it("requires superadmin approval for sensitive automation", () => {
    const plan = buildOperationalActionPlan({
      items: [
        {
          id: "profile-1:sensitive-automation",
          type: "sensitive_automation",
          priority: "high",
          title: "Automatizacion",
          summary: "Sensible.",
          requiresHumanAction: true,
          dueAt: null,
        },
      ],
    });

    assert.equal(plan.superadminApprovalCount, 1);
    assert.equal(plan.items[0]?.mode, "superadmin_approval");
    assert.equal(plan.items[0]?.kind, "approve_sensitive_automation");
  });
});
