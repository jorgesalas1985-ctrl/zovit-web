import { getMasterCompetency } from "@/lib/competencies/catalog";
import type { EvaluatorProfile } from "@/lib/evaluators/types";

export type EvaluatorAssignmentDecision = {
  allowed: boolean;
  requiresSecondReview: boolean;
  reasons: Array<
    | "evaluator_inactive"
    | "competency_not_found"
    | "domain_not_allowed"
    | "target_type_not_allowed"
    | "second_review_required"
    | "allowed"
  >;
};

export function canEvaluatorHandleCompetency(input: {
  evaluator: EvaluatorProfile;
  competencyId: string;
  targetType: "student" | "professional";
}): EvaluatorAssignmentDecision {
  const reasons: EvaluatorAssignmentDecision["reasons"] = [];
  const competency = getMasterCompetency(input.competencyId);

  if (input.evaluator.status !== "active") {
    return { allowed: false, requiresSecondReview: false, reasons: ["evaluator_inactive"] };
  }

  if (!competency) {
    return { allowed: false, requiresSecondReview: false, reasons: ["competency_not_found"] };
  }

  if (!input.evaluator.scope.domains.includes(competency.domain)) {
    reasons.push("domain_not_allowed");
  }

  if (input.targetType === "student" && !input.evaluator.scope.canEvaluateStudents) {
    reasons.push("target_type_not_allowed");
  }

  if (input.targetType === "professional" && !input.evaluator.scope.canEvaluateProfessionals) {
    reasons.push("target_type_not_allowed");
  }

  const highRisk = competency.scopes.includes("high_risk");
  const requiresSecondReview =
    highRisk &&
    (!input.evaluator.scope.canApproveHighRisk ||
      input.evaluator.scope.requiresSecondReviewForHighRisk);

  if (requiresSecondReview) {
    reasons.push("second_review_required");
  }

  const blockingReasons = reasons.filter((reason) => reason !== "second_review_required");
  if (blockingReasons.length) {
    return { allowed: false, requiresSecondReview, reasons };
  }

  return {
    allowed: true,
    requiresSecondReview,
    reasons: reasons.length ? reasons : ["allowed"],
  };
}
