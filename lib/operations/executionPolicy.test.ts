import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideExecutionPolicy } from "./executionPolicy";
import type { OperationalActionPlan } from "./actionPlan";

const basePlan: OperationalActionPlan = {
  items: [],
  automaticCount: 0,
  manualCount: 0,
  superadminApprovalCount: 0,
  summary: "Plan base.",
};

describe("execution policy", () => {
  it("allows automatic actions to execute", () => {
    const decision = decideExecutionPolicy({
      plan: {
        ...basePlan,
        items: [
          {
            queueItemId: "action-1",
            mode: "automatic",
            kind: "send_document_reminder",
            title: "Enviar recordatorio",
            summary: "Automatico.",
          },
        ],
      },
    });

    assert.equal(decision.executableCount, 1);
    assert.equal(decision.items[0]?.status, "executable");
  });

  it("holds manual actions for human work", () => {
    const decision = decideExecutionPolicy({
      plan: {
        ...basePlan,
        items: [
          {
            queueItemId: "action-1",
            mode: "manual",
            kind: "review_documents",
            title: "Revisar documentos",
            summary: "Manual.",
          },
        ],
      },
    });

    assert.equal(decision.manualCount, 1);
    assert.equal(decision.items[0]?.canExecuteNow, false);
  });

  it("requires superadmin approval before sensitive actions execute", () => {
    const decision = decideExecutionPolicy({
      plan: {
        ...basePlan,
        items: [
          {
            queueItemId: "action-1",
            mode: "superadmin_approval",
            kind: "approve_sensitive_automation",
            title: "Aprobar",
            summary: "Sensible.",
          },
        ],
      },
    });

    assert.equal(decision.superadminApprovalCount, 1);
    assert.equal(decision.items[0]?.status, "requires_superadmin_approval");
  });

  it("allows superadmin-approved sensitive actions", () => {
    const decision = decideExecutionPolicy({
      plan: {
        ...basePlan,
        items: [
          {
            queueItemId: "action-1",
            mode: "superadmin_approval",
            kind: "approve_sensitive_automation",
            title: "Aprobar",
            summary: "Sensible.",
          },
        ],
      },
      superadminApprovedActionIds: ["action-1"],
    });

    assert.equal(decision.executableCount, 1);
    assert.equal(decision.items[0]?.status, "executable");
  });

  it("blocks explicitly blocked actions even if they are automatic", () => {
    const decision = decideExecutionPolicy({
      plan: {
        ...basePlan,
        items: [
          {
            queueItemId: "action-1",
            mode: "automatic",
            kind: "suspend_for_documents",
            title: "Suspender",
            summary: "Automatico.",
          },
        ],
      },
      blockedActionIds: ["action-1"],
    });

    assert.equal(decision.blockedCount, 1);
    assert.equal(decision.items[0]?.canExecuteNow, false);
  });
});
