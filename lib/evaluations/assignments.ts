import type { EvaluatorAssignmentDecision } from "@/lib/evaluators/rules";
import type { OperationalDecision } from "@/lib/operational/status";

export type EvaluationAssignmentStatus =
  | "draft"
  | "assigned"
  | "accepted"
  | "in_progress"
  | "submitted"
  | "reviewed"
  | "completed"
  | "cancelled"
  | "expired";

export type EvaluationAssignmentTargetType = "student" | "professional";

export type EvaluationAssignmentReason =
  | "transition_allowed"
  | "transition_not_allowed"
  | "assignment_finalized"
  | "target_not_ready"
  | "evaluator_not_assigned"
  | "evaluator_not_allowed"
  | "evidence_pending"
  | "second_review_required"
  | "ready_to_assign";

export type EvaluationAssignment = {
  id: string;
  targetProfileId: string;
  targetType: EvaluationAssignmentTargetType;
  evaluatorProfileId: string | null;
  competencyId: string;
  status: EvaluationAssignmentStatus;
  evidenceCount: number;
  requiresSecondReview: boolean;
  assignedAt: string | null;
  dueAt: string | null;
  completedAt: string | null;
};

export type EvaluationAssignmentTransitionDecision = {
  allowed: boolean;
  from: EvaluationAssignmentStatus;
  to: EvaluationAssignmentStatus;
  reasons: EvaluationAssignmentReason[];
};

export type EvaluationAssignmentReadinessDecision = {
  ready: boolean;
  canStartEvaluation: boolean;
  requiresSecondReview: boolean;
  summary: string;
  reasons: EvaluationAssignmentReason[];
};

const FINAL_STATUSES = new Set<EvaluationAssignmentStatus>(["completed", "cancelled", "expired"]);

const ALLOWED_TRANSITIONS: Record<EvaluationAssignmentStatus, EvaluationAssignmentStatus[]> = {
  draft: ["assigned", "cancelled", "expired"],
  assigned: ["accepted", "cancelled", "expired"],
  accepted: ["in_progress", "cancelled", "expired"],
  in_progress: ["submitted", "cancelled", "expired"],
  submitted: ["reviewed", "cancelled", "expired"],
  reviewed: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  expired: [],
};

export function canTransitionEvaluationAssignment(
  from: EvaluationAssignmentStatus,
  to: EvaluationAssignmentStatus,
): EvaluationAssignmentTransitionDecision {
  if (FINAL_STATUSES.has(from)) {
    return {
      allowed: false,
      from,
      to,
      reasons: ["assignment_finalized"],
    };
  }

  const allowed = ALLOWED_TRANSITIONS[from].includes(to);

  return {
    allowed,
    from,
    to,
    reasons: [allowed ? "transition_allowed" : "transition_not_allowed"],
  };
}

export function decideEvaluationAssignmentReadiness(input: {
  targetOperational: OperationalDecision;
  evaluatorDecision?: EvaluatorAssignmentDecision | null;
  evidenceCount?: number;
}): EvaluationAssignmentReadinessDecision {
  const reasons: EvaluationAssignmentReason[] = [];

  if (!input.targetOperational.canAcceptWork && !input.targetOperational.requiresManualReview) {
    reasons.push("target_not_ready");
  }

  if (!input.evaluatorDecision) {
    reasons.push("evaluator_not_assigned");
  } else if (!input.evaluatorDecision.allowed) {
    reasons.push("evaluator_not_allowed");
  }

  if ((input.evidenceCount ?? 0) <= 0) {
    reasons.push("evidence_pending");
  }

  const requiresSecondReview = Boolean(input.evaluatorDecision?.requiresSecondReview);
  if (requiresSecondReview) {
    reasons.push("second_review_required");
  }

  const blockingReasons = reasons.filter((reason) => reason !== "second_review_required");
  const ready = blockingReasons.length === 0;
  const canStartEvaluation = ready || reasons.length === 1 && reasons[0] === "evidence_pending";

  if (ready) {
    reasons.push("ready_to_assign");
  }

  return {
    ready,
    canStartEvaluation,
    requiresSecondReview,
    summary: summaryFromReasons(reasons),
    reasons,
  };
}

function summaryFromReasons(reasons: EvaluationAssignmentReason[]): string {
  if (reasons.includes("target_not_ready")) {
    return "El perfil aun no esta listo para iniciar una evaluacion tecnica.";
  }

  if (reasons.includes("evaluator_not_assigned")) {
    return "Falta asignar un evaluador autorizado para esta competencia.";
  }

  if (reasons.includes("evaluator_not_allowed")) {
    return "El evaluador seleccionado no tiene alcance suficiente para esta evaluacion.";
  }

  if (reasons.includes("evidence_pending")) {
    return "La evaluacion necesita evidencia tecnica antes de emitir una decision.";
  }

  if (reasons.includes("second_review_required")) {
    return "La evaluacion puede avanzar, pero requerira segunda revision.";
  }

  return "La asignacion esta lista para avanzar.";
}
