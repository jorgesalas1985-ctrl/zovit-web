import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildExecutiveRecommendations } from "./executiveRecommendations";
import type { ControlCenterDecision } from "./controlCenter";
import type { ExecutionPolicyDecision } from "./executionPolicy";
import type { OperationalHealthPulse } from "./healthPulse";

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

const healthPulse: OperationalHealthPulse = {
  status: "healthy",
  score: 100,
  reasons: ["no_pending_items"],
  summary: "Saludable.",
};

describe("executive recommendations", () => {
  it("recommends monitoring when there is no pending work", () => {
    const decision = buildExecutiveRecommendations({
      controlCenter,
      executionPolicy,
      healthPulse,
    });

    assert.equal(decision.recommendations.length, 1);
    assert.equal(decision.recommendations[0]?.type, "monitor_operational_pulse");
    assert.equal(decision.highestPriority, "low");
  });

  it("prioritizes blocked actions as critical", () => {
    const decision = buildExecutiveRecommendations({
      controlCenter,
      executionPolicy: {
        ...executionPolicy,
        blockedCount: 1,
      },
      healthPulse: {
        ...healthPulse,
        status: "critical",
        score: 30,
      },
    });

    assert.equal(decision.recommendations[0]?.type, "resolve_blocked_actions");
    assert.equal(decision.recommendations[0]?.priority, "critical");
  });

  it("adds superadmin approval recommendation for sensitive actions", () => {
    const decision = buildExecutiveRecommendations({
      controlCenter,
      executionPolicy: {
        ...executionPolicy,
        superadminApprovalCount: 2,
      },
      healthPulse: {
        ...healthPulse,
        status: "watch",
        score: 75,
      },
    });

    assert.equal(
      decision.recommendations.some((item) => item.type === "request_superadmin_approval"),
      true,
    );
  });

  it("limits recommendations when requested", () => {
    const decision = buildExecutiveRecommendations({
      controlCenter: {
        ...controlCenter,
        requiresHumanAction: 2,
        priorityMetrics: { ...controlCenter.priorityMetrics, critical: 1 },
      },
      executionPolicy: {
        ...executionPolicy,
        executableCount: 1,
        manualCount: 2,
        superadminApprovalCount: 1,
      },
      healthPulse: {
        ...healthPulse,
        status: "critical",
        score: 40,
      },
      limit: 2,
    });

    assert.equal(decision.recommendations.length, 2);
    assert.equal(decision.highestPriority, "critical");
  });
});
