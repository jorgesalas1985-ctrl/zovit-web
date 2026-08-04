import type { CompetencyScope } from "@/lib/competencies/types";

export type TechnicalEvaluationStatus =
  | "draft"
  | "scheduled"
  | "in_review"
  | "approved"
  | "approved_with_supervision"
  | "rejected"
  | "expired";

export type TechnicalEvaluationEvidenceType =
  | "practical_test"
  | "document_review"
  | "portfolio"
  | "interview"
  | "external_license"
  | "field_observation";

export type TechnicalEvaluationEvidence = {
  type: TechnicalEvaluationEvidenceType;
  description: string;
  verified: boolean;
};

export type TechnicalEvaluation = {
  id: string;
  profileId: string;
  competencyId: string;
  evaluatorId: string | null;
  status: TechnicalEvaluationStatus;
  score: number | null;
  evidence: TechnicalEvaluationEvidence[];
  approvedScopes: CompetencyScope[];
  requiresSupervision: boolean;
  decisionReason: string | null;
  evaluatedAt: string | null;
  expiresAt: string | null;
};

export type TechnicalEvaluationDecision = {
  status: TechnicalEvaluationStatus;
  canIssueCertification: boolean;
  requiresSupervision: boolean;
  approvedScopes: CompetencyScope[];
  reasons: Array<
    | "missing_evidence"
    | "score_required"
    | "score_below_threshold"
    | "high_risk_requires_supervision"
    | "approved"
  >;
};
