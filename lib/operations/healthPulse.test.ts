import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildOperationalHealthPulse } from "./healthPulse";
import type { OperationalAuditTrail } from "./auditTrail";
import type { ControlCenterDecision } from "./controlCenter";
import type { ExecutionPolicyDecision } from "./executionPolicy";

const controlCenter: ControlCenterDecision = {
  totalProfiles: 1,
  totalItems: 0,
  requiresHumanAction: 0,
  highestPriority: null,
  priorityMetrics: {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
  },
  typeMetrics: {
    document_renewal: 0,
    manual_document_review: 0,
    account_suspension: 0,
    technical_evaluation: 0,
    second_review: 0,
    sensitive_automation: 0,
  },
  topItems: [],
  summary: "Sin pendientes.",
};

const executionPolicy: ExecutionPolicyDecision = {
  items: [],
  executableCount: 0,
  blockedCount: 0,
  manualCount: 0,
  superadminApprovalCount: 0,
  summary: "Sin acciones.",
};

const auditTrail: OperationalAuditTrail = {
  events: [],
  readyCount: 0,
  retainedCount: 0,
  blockedCount: 0,
  summary: "Sin eventos.",
};

describe("operational health pulse", () => {
  it("is healthy when there are no pending items", () => {
    const pulse = buildOperationalHealthPulse({
      controlCenter,
      executionPolicy,
      auditTrail,
    });

    assert.equal(pulse.status, "healthy");
    assert.equal(pulse.score, 100);
    assert.equal(pulse.reasons.includes("no_pending_items"), true);
  });

  it("watches automatic follow-up without human work", () => {
    const pulse = buildOperationalHealthPulse({
      controlCenter: {
        ...controlCenter,
        totalItems: 1,
        priorityMetrics: { ...controlCenter.priorityMetrics, low: 1 },
      },
      executionPolicy: {
        ...executionPolicy,
        executableCount: 1,
      },
      auditTrail: {
        ...auditTrail,
        readyCount: 1,
      },
    });

    assert.equal(pulse.status, "healthy");
    assert.equal(pulse.score, 95);
    assert.equal(pulse.reasons.includes("automatic_followup_pending"), true);
  });

  it("moves to watch when human review is pending", () => {
    const pulse = buildOperationalHealthPulse({
      controlCenter: {
        ...controlCenter,
        totalItems: 2,
        requiresHumanAction: 2,
        priorityMetrics: { ...controlCenter.priorityMetrics, high: 2 },
      },
      executionPolicy: {
        ...executionPolicy,
        manualCount: 2,
      },
      auditTrail: {
        ...auditTrail,
        retainedCount: 2,
      },
    });

    assert.equal(pulse.status, "watch");
    assert.equal(pulse.score, 80);
    assert.equal(pulse.reasons.includes("human_review_pending"), true);
  });

  it("becomes critical with blocked critical work", () => {
    const pulse = buildOperationalHealthPulse({
      controlCenter: {
        ...controlCenter,
        totalItems: 2,
        priorityMetrics: { ...controlCenter.priorityMetrics, critical: 2 },
      },
      executionPolicy: {
        ...executionPolicy,
        blockedCount: 1,
      },
      auditTrail: {
        ...auditTrail,
        blockedCount: 1,
      },
    });

    assert.equal(pulse.status, "critical");
    assert.equal(pulse.score, 0);
    assert.equal(pulse.reasons.includes("critical_priority_active"), true);
  });
});
