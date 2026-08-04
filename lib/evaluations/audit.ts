import type { EvaluationAssignmentReadinessDecision } from "@/lib/evaluations/assignments";
import type { TechnicalEvaluationDecision } from "@/lib/evaluations/types";

export type EvaluationAuditRisk = "low" | "medium" | "high" | "blocked";

export type EvaluationAuditAction =
  | "allow_progress"
  | "request_evidence"
  | "request_evaluator"
  | "manual_review"
  | "second_review"
  | "block_certification";

export type EvaluationAuditReason =
  | "assignment_not_ready"
  | "evaluator_missing"
  | "evidence_missing"
  | "evaluation_rejected"
  | "second_review_required"
  | "certification_allowed"
  | "manual_review_required";

export type EvaluationAuditDecision = {
  risk: EvaluationAuditRisk;
  canApproveCertification: boolean;
  requiresHumanReview: boolean;
  actions: EvaluationAuditAction[];
  reasons: EvaluationAuditReason[];
  summary: string;
};

export function auditEvaluationForCertification(input: {
  assignment: EvaluationAssignmentReadinessDecision;
  evaluation: TechnicalEvaluationDecision;
}): EvaluationAuditDecision {
  const actions = new Set<EvaluationAuditAction>();
  const reasons = new Set<EvaluationAuditReason>();

  if (!input.assignment.ready) {
    reasons.add("assignment_not_ready");
    actions.add("manual_review");
  }

  if (input.assignment.reasons.includes("evaluator_not_assigned")) {
    reasons.add("evaluator_missing");
    actions.add("request_evaluator");
  }

  if (
    input.assignment.reasons.includes("evidence_pending") ||
    input.evaluation.reasons.includes("missing_evidence")
  ) {
    reasons.add("evidence_missing");
    actions.add("request_evidence");
  }

  if (!input.evaluation.canIssueCertification) {
    reasons.add("evaluation_rejected");
    actions.add("block_certification");
  }

  if (input.assignment.requiresSecondReview || input.evaluation.requiresSupervision) {
    reasons.add("second_review_required");
    actions.add("second_review");
  }

  const requiresHumanReview = actions.has("manual_review") || actions.has("second_review");
  const canApproveCertification =
    input.assignment.ready && input.evaluation.canIssueCertification && !requiresHumanReview;

  if (canApproveCertification) {
    reasons.add("certification_allowed");
    actions.add("allow_progress");
  } else if (requiresHumanReview) {
    reasons.add("manual_review_required");
  }

  const risk = resolveAuditRisk({
    canApproveCertification,
    requiresHumanReview,
    blocksCertification: actions.has("block_certification"),
  });

  return {
    risk,
    canApproveCertification,
    requiresHumanReview,
    actions: Array.from(actions),
    reasons: Array.from(reasons),
    summary: summaryFromDecision({
      canApproveCertification,
      requiresHumanReview,
      actions,
    }),
  };
}

function resolveAuditRisk(input: {
  canApproveCertification: boolean;
  requiresHumanReview: boolean;
  blocksCertification: boolean;
}): EvaluationAuditRisk {
  if (input.blocksCertification) return "blocked";
  if (input.requiresHumanReview) return "high";
  if (input.canApproveCertification) return "low";
  return "medium";
}

function summaryFromDecision(input: {
  canApproveCertification: boolean;
  requiresHumanReview: boolean;
  actions: Set<EvaluationAuditAction>;
}): string {
  if (input.canApproveCertification) {
    return "La evaluacion cumple las condiciones para avanzar a certificacion.";
  }

  if (input.actions.has("block_certification")) {
    return "La certificacion queda bloqueada hasta resolver la evaluacion tecnica.";
  }

  if (input.actions.has("request_evaluator")) {
    return "Falta asignar un evaluador antes de avanzar.";
  }

  if (input.actions.has("request_evidence")) {
    return "Falta evidencia tecnica verificable para auditar la evaluacion.";
  }

  if (input.requiresHumanReview) {
    return "La evaluacion debe pasar por revision humana antes de continuar.";
  }

  return "La evaluacion queda en observacion hasta completar las condiciones pendientes.";
}
