export type CompetencyDomain =
  | "electricity"
  | "plumbing"
  | "construction"
  | "climatization"
  | "mechanics"
  | "digital"
  | "general_support";

export type CompetencyLevel =
  | "academic_recorded"
  | "module_approved"
  | "academic_competency"
  | "evaluated_competency"
  | "zovit_certified"
  | "current"
  | "expired"
  | "suspended"
  | "revoked";

export type CompetencyScope =
  | "supervised_work"
  | "autonomous_work"
  | "diagnosis_only"
  | "full_execution"
  | "low_risk"
  | "high_risk"
  | "requires_external_license"
  | "requires_renewal"
  | "not_for_final_clients";

export type CompetencyStatus = "draft" | "active" | "deprecated" | "archived";

export type MasterCompetency = {
  id: string;
  name: string;
  domain: CompetencyDomain;
  description: string;
  defaultLevel: CompetencyLevel;
  scopes: CompetencyScope[];
  status: CompetencyStatus;
  version: string;
  relatedServiceKeywords: string[];
};

export type UserCompetencyEvidence = {
  competencyId: string;
  level: CompetencyLevel;
  source: "education" | "zovit_evaluation" | "experience" | "external_license" | "manual_review";
  verified: boolean;
  issuedAt?: string | null;
  expiresAt?: string | null;
};
