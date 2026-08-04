import type { CertificationEligibilityDecision } from "@/lib/certifications/types";
import type { TechnicalEvaluationDecision } from "@/lib/evaluations/types";
import type { OperationalDecision } from "@/lib/operational/status";

export type EcosystemAutomationSignal =
  | "identity_pending"
  | "documents_pending"
  | "manual_review_needed"
  | "evaluation_needed"
  | "certification_blocked"
  | "supervision_required"
  | "ready_for_low_risk_work"
  | "ready_for_autonomous_work";

export type EcosystemAutomationAction =
  | "request_identity_verification"
  | "request_document_renewal"
  | "send_to_manual_review"
  | "recommend_technical_evaluation"
  | "recommend_supervised_work"
  | "allow_low_risk_matching"
  | "allow_autonomous_matching"
  | "block_sensitive_matching";

export type EcosystemAutomationDecision = {
  signals: EcosystemAutomationSignal[];
  suggestedActions: EcosystemAutomationAction[];
  requiresHumanApproval: boolean;
  summary: string;
};

export function decideEcosystemAutomation(input: {
  operational: OperationalDecision;
  certification: CertificationEligibilityDecision;
  evaluation: TechnicalEvaluationDecision;
}): EcosystemAutomationDecision {
  const signals = new Set<EcosystemAutomationSignal>();
  const actions = new Set<EcosystemAutomationAction>();

  if (input.operational.reasons.includes("identity_not_verified")) {
    signals.add("identity_pending");
    actions.add("request_identity_verification");
  }

  if (
    input.operational.reasons.includes("documents_missing") ||
    input.operational.reasons.includes("documents_due_this_semester") ||
    input.operational.reasons.includes("documents_expired")
  ) {
    signals.add("documents_pending");
    actions.add("request_document_renewal");
  }

  if (input.operational.requiresManualReview) {
    signals.add("manual_review_needed");
    actions.add("send_to_manual_review");
  }

  if (!input.evaluation.canIssueCertification) {
    signals.add("evaluation_needed");
    actions.add("recommend_technical_evaluation");
  }

  if (!input.certification.eligible) {
    signals.add("certification_blocked");
  }

  if (input.operational.requiresSupervision || input.evaluation.requiresSupervision) {
    signals.add("supervision_required");
    actions.add("recommend_supervised_work");
    actions.add("block_sensitive_matching");
  }

  if (input.operational.canAcceptWork && !input.operational.requiresSupervision) {
    signals.add("ready_for_low_risk_work");
    actions.add("allow_low_risk_matching");
  }

  if (
    input.operational.canAcceptWork &&
    !input.operational.requiresSupervision &&
    input.certification.eligible &&
    input.evaluation.canIssueCertification
  ) {
    signals.add("ready_for_autonomous_work");
    actions.add("allow_autonomous_matching");
  }

  const requiresHumanApproval =
    actions.has("send_to_manual_review") ||
    actions.has("block_sensitive_matching") ||
    actions.has("allow_autonomous_matching");

  return {
    signals: [...signals],
    suggestedActions: [...actions],
    requiresHumanApproval,
    summary: buildAutomationSummary([...signals], [...actions]),
  };
}

function buildAutomationSummary(
  signals: EcosystemAutomationSignal[],
  actions: EcosystemAutomationAction[],
): string {
  if (actions.includes("allow_autonomous_matching")) {
    return "Perfil listo para matching autonomo, sujeto a politicas de riesgo y auditoria.";
  }

  if (signals.includes("supervision_required")) {
    return "Perfil puede avanzar con trabajos supervisados y bloqueo de asignaciones sensibles.";
  }

  if (signals.includes("evaluation_needed")) {
    return "Perfil requiere evaluacion tecnica antes de certificacion ZOVIT.";
  }

  if (signals.includes("documents_pending")) {
    return "Perfil requiere regularizacion documental antes de operar.";
  }

  if (signals.includes("identity_pending")) {
    return "Perfil requiere verificacion de identidad.";
  }

  return "Sin automatizaciones criticas sugeridas.";
}
