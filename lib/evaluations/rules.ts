import { getMasterCompetency } from "@/lib/competencies/catalog";
import type { TechnicalEvaluation, TechnicalEvaluationDecision } from "@/lib/evaluations/types";

const APPROVAL_SCORE = 80;

export function decideTechnicalEvaluation(
  evaluation: Pick<
    TechnicalEvaluation,
    "competencyId" | "score" | "evidence" | "approvedScopes"
  >,
): TechnicalEvaluationDecision {
  const reasons: TechnicalEvaluationDecision["reasons"] = [];
  const verifiedEvidence = evaluation.evidence.filter((item) => item.verified);
  const competency = getMasterCompetency(evaluation.competencyId);
  const highRisk = Boolean(competency?.scopes.includes("high_risk"));

  if (!verifiedEvidence.length) {
    reasons.push("missing_evidence");
  }

  if (evaluation.score == null) {
    reasons.push("score_required");
  } else if (evaluation.score < APPROVAL_SCORE) {
    reasons.push("score_below_threshold");
  }

  if (highRisk) {
    reasons.push("high_risk_requires_supervision");
  }

  if (reasons.some((reason) => reason !== "high_risk_requires_supervision")) {
    return {
      status: "rejected",
      canIssueCertification: false,
      requiresSupervision: false,
      approvedScopes: [],
      reasons,
    };
  }

  if (highRisk) {
    return {
      status: "approved_with_supervision",
      canIssueCertification: true,
      requiresSupervision: true,
      approvedScopes: evaluation.approvedScopes,
      reasons,
    };
  }

  return {
    status: "approved",
    canIssueCertification: true,
    requiresSupervision: false,
    approvedScopes: evaluation.approvedScopes,
    reasons: ["approved"],
  };
}
