import type { CompetencyScope } from "@/lib/competencies/types";

export type ZovitCertificationStatus =
  | "draft"
  | "pending_evaluation"
  | "approved"
  | "issued"
  | "expired"
  | "suspended"
  | "revoked";

export type ZovitEvaluationResult = "not_started" | "pending" | "approved" | "rejected";

export type ZovitCertification = {
  id: string;
  profileId: string;
  competencyId: string;
  status: ZovitCertificationStatus;
  evaluationResult: ZovitEvaluationResult;
  scopes: CompetencyScope[];
  issuedAt: string | null;
  expiresAt: string | null;
  version: string;
};

export type CertificationEligibilityInput = {
  competencyId: string;
  evaluationResult: ZovitEvaluationResult;
  hasVerifiedIdentity: boolean;
  hasExternalLicense?: boolean;
  hasOnlyAcademicTraining?: boolean;
  blocked?: boolean;
};

export type CertificationEligibilityDecision = {
  eligible: boolean;
  reasons: Array<
    | "identity_required"
    | "evaluation_required"
    | "external_license_or_evaluation_required"
    | "academic_training_is_not_certification"
    | "blocked"
    | "eligible"
  >;
};
