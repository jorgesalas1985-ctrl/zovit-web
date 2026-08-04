import type { OperationalAuditTrail } from "@/lib/operations/auditTrail";
import type { ControlCenterDecision } from "@/lib/operations/controlCenter";
import type { ExecutionPolicyDecision } from "@/lib/operations/executionPolicy";

export type OperationalPulseStatus = "healthy" | "watch" | "risk" | "critical";

export type OperationalPulseReason =
  | "no_pending_items"
  | "critical_priority_active"
  | "blocked_events_active"
  | "superadmin_approval_pending"
  | "human_review_pending"
  | "automatic_followup_pending";

export type OperationalHealthPulse = {
  status: OperationalPulseStatus;
  score: number;
  reasons: OperationalPulseReason[];
  summary: string;
};

export function buildOperationalHealthPulse(input: {
  controlCenter: ControlCenterDecision;
  executionPolicy: ExecutionPolicyDecision;
  auditTrail: OperationalAuditTrail;
}): OperationalHealthPulse {
  const reasons = new Set<OperationalPulseReason>();
  let score = 100;

  if (input.controlCenter.totalItems === 0) {
    reasons.add("no_pending_items");
  }

  if (input.controlCenter.priorityMetrics.critical > 0) {
    reasons.add("critical_priority_active");
    score -= input.controlCenter.priorityMetrics.critical * 35;
  }

  if (input.auditTrail.blockedCount > 0 || input.executionPolicy.blockedCount > 0) {
    reasons.add("blocked_events_active");
    score -= Math.max(input.auditTrail.blockedCount, input.executionPolicy.blockedCount) * 30;
  }

  if (input.executionPolicy.superadminApprovalCount > 0) {
    reasons.add("superadmin_approval_pending");
    score -= input.executionPolicy.superadminApprovalCount * 20;
  }

  if (input.executionPolicy.manualCount > 0 || input.controlCenter.requiresHumanAction > 0) {
    reasons.add("human_review_pending");
    score -= Math.max(input.executionPolicy.manualCount, input.controlCenter.requiresHumanAction) * 10;
  }

  const automaticOnly =
    input.controlCenter.totalItems > 0 &&
    input.executionPolicy.executableCount > 0 &&
    input.executionPolicy.manualCount === 0 &&
    input.executionPolicy.superadminApprovalCount === 0 &&
    input.executionPolicy.blockedCount === 0;

  if (automaticOnly) {
    reasons.add("automatic_followup_pending");
    score -= 5;
  }

  const normalizedScore = Math.max(0, Math.min(100, score));
  const status = statusFromScoreAndReasons(normalizedScore, reasons);

  return {
    status,
    score: normalizedScore,
    reasons: Array.from(reasons),
    summary: summaryFromPulse(status, normalizedScore),
  };
}

function statusFromScoreAndReasons(
  score: number,
  reasons: Set<OperationalPulseReason>,
): OperationalPulseStatus {
  if (reasons.has("critical_priority_active") || reasons.has("blocked_events_active")) {
    return score <= 60 ? "critical" : "risk";
  }

  if (score >= 90) return "healthy";
  if (score >= 70) return "watch";
  if (score >= 50) return "risk";
  return "critical";
}

function summaryFromPulse(status: OperationalPulseStatus, score: number): string {
  if (status === "healthy") {
    return `Pulso operacional saludable (${score}/100).`;
  }

  if (status === "watch") {
    return `Pulso en observacion (${score}/100).`;
  }

  if (status === "risk") {
    return `Pulso operacional en riesgo (${score}/100).`;
  }

  return `Pulso operacional critico (${score}/100).`;
}
