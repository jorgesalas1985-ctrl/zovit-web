import type { CompetencyDomain } from "@/lib/competencies/types";

export type EvaluatorStatus = "active" | "inactive" | "suspended";

export type EvaluatorScope = {
  domains: CompetencyDomain[];
  canEvaluateStudents: boolean;
  canEvaluateProfessionals: boolean;
  canApproveHighRisk: boolean;
  requiresSecondReviewForHighRisk: boolean;
};

export type EvaluatorProfile = {
  profileId: string;
  status: EvaluatorStatus;
  scope: EvaluatorScope;
};
