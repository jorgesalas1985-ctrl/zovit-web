import type { CompetencyScope } from "@/lib/competencies/types";
import type { EcosystemAutomationDecision } from "@/lib/ecosystem/automation";
import type { OperationalDecision } from "@/lib/operational/status";

export type ServiceRiskLevel = "low" | "medium" | "high";

export type ResponsibleMatchRequest = {
  serviceId: string;
  requiredCompetencyIds: string[];
  riskLevel: ServiceRiskLevel;
  requiresCertification: boolean;
  allowsSupervisedWork: boolean;
};

export type ResponsibleMatchCandidate = {
  profileId: string;
  displayName: string;
  distanceKm: number | null;
  rating: number | null;
  completedJobs: number;
  competencyIds: string[];
  certificationIds: string[];
  scopes: CompetencyScope[];
  operational: OperationalDecision;
  automation: EcosystemAutomationDecision;
};

export type ResponsibleMatchDecision = {
  candidateId: string;
  eligible: boolean;
  score: number;
  requiresSupervision: boolean;
  reasons: Array<
    | "operational_block"
    | "missing_competency"
    | "missing_certification"
    | "high_risk_not_allowed"
    | "supervision_required"
    | "distance_bonus"
    | "rating_bonus"
    | "experience_bonus"
    | "eligible"
  >;
};
