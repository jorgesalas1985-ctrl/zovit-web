import type { IdentityStatus } from "@/lib/verification/types";

export type OperationalStatus =
  | "habilitado"
  | "habilitado_con_supervision"
  | "pendiente_documentos"
  | "pendiente_revision"
  | "suspendido_por_documentos"
  | "suspendido_por_riesgo"
  | "no_habilitado";

export type OperationalReason =
  | "identity_not_verified"
  | "biometric_not_verified"
  | "documents_missing"
  | "documents_pending_review"
  | "documents_rejected"
  | "documents_expired"
  | "documents_due_this_semester"
  | "risk_block_active"
  | "supervision_required"
  | "ready";

export type DocumentValidationStatus =
  | "missing"
  | "pending"
  | "verified"
  | "rejected"
  | "expired";

export type SupervisionMode = "none" | "required" | "optional";

export type SemesterCode = "S1" | "S2" | "OUT_OF_SEMESTER";

export type SemesterPeriod = {
  year: number;
  code: SemesterCode;
  startsAt: string | null;
  endsAt: string | null;
};

export type OperationalProfileInput = {
  identityStatus: IdentityStatus | null | undefined;
  identityVerified: boolean | null | undefined;
  biometricVerified: boolean | null | undefined;
  documentStatus: DocumentValidationStatus;
  documentExpiresAt?: string | null;
  lastDocumentRenewalAt?: string | null;
  riskBlockActive?: boolean | null;
  supervisionMode?: SupervisionMode | null;
  now?: Date;
};

export type OperationalDecision = {
  status: OperationalStatus;
  canAppearInSearch: boolean;
  canAcceptWork: boolean;
  requiresManualReview: boolean;
  requiresSupervision: boolean;
  semester: SemesterPeriod;
  reasons: OperationalReason[];
};

export const OPERATIONAL_STATUS_LABELS: Record<OperationalStatus, string> = {
  habilitado: "Habilitado",
  habilitado_con_supervision: "Habilitado con supervision",
  pendiente_documentos: "Pendiente documentos",
  pendiente_revision: "Pendiente revision",
  suspendido_por_documentos: "Suspendido por documentos",
  suspendido_por_riesgo: "Suspendido por riesgo",
  no_habilitado: "No habilitado",
};

export function getSemesterPeriod(date = new Date()): SemesterPeriod {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;

  if (month >= 3 && month <= 7) {
    return {
      year,
      code: "S1",
      startsAt: `${year}-03-01`,
      endsAt: `${year}-07-31`,
    };
  }

  if (month >= 8 && month <= 12) {
    return {
      year,
      code: "S2",
      startsAt: `${year}-08-01`,
      endsAt: `${year}-12-31`,
    };
  }

  return {
    year,
    code: "OUT_OF_SEMESTER",
    startsAt: null,
    endsAt: null,
  };
}

export function isDocumentExpired(expiresAt: string | null | undefined, now = new Date()): boolean {
  if (!expiresAt) return false;
  const expiry = new Date(`${expiresAt}T23:59:59`);
  return Number.isFinite(expiry.getTime()) && expiry < now;
}

export function wasRenewedInCurrentSemester(
  renewedAt: string | null | undefined,
  now = new Date(),
): boolean {
  if (!renewedAt) return false;

  const semester = getSemesterPeriod(now);
  if (!semester.startsAt || !semester.endsAt) return false;

  const renewed = new Date(`${renewedAt.slice(0, 10)}T00:00:00`);
  const starts = new Date(`${semester.startsAt}T00:00:00`);
  const ends = new Date(`${semester.endsAt}T23:59:59`);

  return Number.isFinite(renewed.getTime()) && renewed >= starts && renewed <= ends;
}

export function evaluateOperationalStatus(input: OperationalProfileInput): OperationalDecision {
  const now = input.now ?? new Date();
  const semester = getSemesterPeriod(now);
  const reasons: OperationalReason[] = [];

  if (input.riskBlockActive) {
    return {
      status: "suspendido_por_riesgo",
      canAppearInSearch: false,
      canAcceptWork: false,
      requiresManualReview: true,
      requiresSupervision: false,
      semester,
      reasons: ["risk_block_active"],
    };
  }

  if (input.identityStatus !== "approved" || !input.identityVerified) {
    reasons.push("identity_not_verified");
  }

  if (!input.biometricVerified) {
    reasons.push("biometric_not_verified");
  }

  if (input.documentStatus === "missing") {
    reasons.push("documents_missing");
  }

  if (input.documentStatus === "pending") {
    reasons.push("documents_pending_review");
  }

  if (input.documentStatus === "rejected") {
    reasons.push("documents_rejected");
  }

  if (input.documentStatus === "expired" || isDocumentExpired(input.documentExpiresAt, now)) {
    reasons.push("documents_expired");
  }

  if (
    semester.code !== "OUT_OF_SEMESTER" &&
    input.documentStatus === "verified" &&
    !wasRenewedInCurrentSemester(input.lastDocumentRenewalAt, now)
  ) {
    reasons.push("documents_due_this_semester");
  }

  if (reasons.includes("documents_expired")) {
    return {
      status: "suspendido_por_documentos",
      canAppearInSearch: false,
      canAcceptWork: false,
      requiresManualReview: false,
      requiresSupervision: false,
      semester,
      reasons,
    };
  }

  if (reasons.includes("documents_rejected")) {
    return {
      status: "no_habilitado",
      canAppearInSearch: false,
      canAcceptWork: false,
      requiresManualReview: true,
      requiresSupervision: false,
      semester,
      reasons,
    };
  }

  if (reasons.includes("documents_missing") || reasons.includes("documents_due_this_semester")) {
    return {
      status: "pendiente_documentos",
      canAppearInSearch: false,
      canAcceptWork: false,
      requiresManualReview: false,
      requiresSupervision: false,
      semester,
      reasons,
    };
  }

  if (
    reasons.includes("identity_not_verified") ||
    reasons.includes("biometric_not_verified") ||
    reasons.includes("documents_pending_review")
  ) {
    return {
      status: "pendiente_revision",
      canAppearInSearch: false,
      canAcceptWork: false,
      requiresManualReview: true,
      requiresSupervision: false,
      semester,
      reasons,
    };
  }

  if (input.supervisionMode === "required") {
    return {
      status: "habilitado_con_supervision",
      canAppearInSearch: true,
      canAcceptWork: true,
      requiresManualReview: false,
      requiresSupervision: true,
      semester,
      reasons: ["supervision_required"],
    };
  }

  return {
    status: "habilitado",
    canAppearInSearch: true,
    canAcceptWork: true,
    requiresManualReview: false,
    requiresSupervision: false,
    semester,
    reasons: ["ready"],
  };
}
