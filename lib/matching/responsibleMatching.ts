import type {
  ResponsibleMatchCandidate,
  ResponsibleMatchDecision,
  ResponsibleMatchRequest,
} from "@/lib/matching/types";

function hasAllRequiredCompetencies(
  candidate: ResponsibleMatchCandidate,
  request: ResponsibleMatchRequest,
): boolean {
  return request.requiredCompetencyIds.every((id) => candidate.competencyIds.includes(id));
}

function hasCertificationForRequest(
  candidate: ResponsibleMatchCandidate,
  request: ResponsibleMatchRequest,
): boolean {
  if (!request.requiresCertification) return true;
  return request.requiredCompetencyIds.some((id) => candidate.certificationIds.includes(id));
}

function baseScore(candidate: ResponsibleMatchCandidate): number {
  let score = 50;

  if (candidate.distanceKm != null && candidate.distanceKm <= 5) score += 15;
  else if (candidate.distanceKm != null && candidate.distanceKm <= 15) score += 8;

  if (candidate.rating != null && candidate.rating >= 4.8) score += 15;
  else if (candidate.rating != null && candidate.rating >= 4.5) score += 10;

  if (candidate.completedJobs >= 20) score += 15;
  else if (candidate.completedJobs >= 5) score += 8;

  return score;
}

export function decideResponsibleMatch(
  request: ResponsibleMatchRequest,
  candidate: ResponsibleMatchCandidate,
): ResponsibleMatchDecision {
  const reasons: ResponsibleMatchDecision["reasons"] = [];

  if (!candidate.operational.canAcceptWork) {
    return {
      candidateId: candidate.profileId,
      eligible: false,
      score: 0,
      requiresSupervision: false,
      reasons: ["operational_block"],
    };
  }

  if (!hasAllRequiredCompetencies(candidate, request)) {
    reasons.push("missing_competency");
  }

  if (!hasCertificationForRequest(candidate, request)) {
    reasons.push("missing_certification");
  }

  const requiresSupervision =
    candidate.operational.requiresSupervision ||
    candidate.automation.signals.includes("supervision_required");

  if (requiresSupervision) {
    reasons.push("supervision_required");
  }

  if (request.riskLevel === "high" && (requiresSupervision || !candidate.scopes.includes("high_risk"))) {
    reasons.push("high_risk_not_allowed");
  }

  if (requiresSupervision && !request.allowsSupervisedWork) {
    reasons.push("high_risk_not_allowed");
  }

  const blockingReasons = reasons.filter((reason) => reason !== "supervision_required");
  if (blockingReasons.length) {
    return {
      candidateId: candidate.profileId,
      eligible: false,
      score: 0,
      requiresSupervision,
      reasons,
    };
  }

  const score = baseScore(candidate);
  if (candidate.distanceKm != null && candidate.distanceKm <= 15) reasons.push("distance_bonus");
  if (candidate.rating != null && candidate.rating >= 4.5) reasons.push("rating_bonus");
  if (candidate.completedJobs >= 5) reasons.push("experience_bonus");

  return {
    candidateId: candidate.profileId,
    eligible: true,
    score,
    requiresSupervision,
    reasons: reasons.length ? reasons : ["eligible"],
  };
}

export function rankResponsibleMatches(
  request: ResponsibleMatchRequest,
  candidates: ResponsibleMatchCandidate[],
): ResponsibleMatchDecision[] {
  return candidates
    .map((candidate) => decideResponsibleMatch(request, candidate))
    .sort((a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score);
}
