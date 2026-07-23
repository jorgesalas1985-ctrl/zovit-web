import type { UserRole } from "@/lib/auth/roles";

export type IdentityStatus = "none" | "pending" | "approved" | "rejected";

export type IdentityDocumentType =
  | "cedula_front"
  | "cedula_back"
  | "certificado_antecedentes"
  | "certificado_estudios"
  | "selfie"
  | "liveness_proof";

export type IdentityDocument = {
  id: string;
  profile_id: string;
  document_type: IdentityDocumentType;
  storage_path: string;
  status: "uploaded" | "approved" | "rejected";
  admin_notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

export type IdentityVerificationState = {
  identity_status: IdentityStatus;
  identity_verified: boolean;
  biometric_verified: boolean;
  identity_verified_at: string | null;
  identity_submitted_at: string | null;
  identity_rejection_reason: string | null;
  study_verification_status: IdentityStatus;
  study_verified: boolean;
  study_submitted_at: string | null;
  study_rejection_reason: string | null;
  documents: IdentityDocument[];
};

export type PendingVerificationUser = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  rut: string | null;
  role: UserRole;
  identity_submitted_at: string | null;
  documents: IdentityDocument[];
};

export const IDENTITY_DOCUMENT_LABELS: Record<IdentityDocumentType, string> = {
  cedula_front: "Carnet / cédula (frontal)",
  cedula_back: "Carnet / cédula (reverso)",
  certificado_antecedentes: "Certificado de antecedentes",
  certificado_estudios: "Certificado de estudios",
  selfie: "Selfie biométrica",
  liveness_proof: "Prueba de vida",
};

export const IDENTITY_STATUS_LABELS: Record<IdentityStatus, string> = {
  none: "Sin verificar",
  pending: "En revisión",
  approved: "Verificado",
  rejected: "Rechazado",
};

const BIOMETRIC_REQUIRED: IdentityDocumentType[] = [
  "cedula_front",
  "cedula_back",
  "selfie",
  "liveness_proof",
];

const STUDY_CERTIFICATE_TYPES: IdentityDocumentType[] = ["certificado_estudios"];

export function getBiometricRequiredDocuments(): IdentityDocumentType[] {
  return BIOMETRIC_REQUIRED;
}

export function getStudyCertificateDocuments(): IdentityDocumentType[] {
  return STUDY_CERTIFICATE_TYPES;
}

/** @deprecated Use getBiometricRequiredDocuments for identity flow. */
export function getRequiredDocuments(_role: UserRole): IdentityDocumentType[] {
  return getBiometricRequiredDocuments();
}

export function getCarnetDocuments(): IdentityDocumentType[] {
  return ["cedula_front", "cedula_back"];
}

export function getBiometricDocuments(): IdentityDocumentType[] {
  return ["selfie", "liveness_proof"];
}

export function hasAllBiometricDocuments(
  documents: Pick<IdentityDocument, "document_type">[]
): boolean {
  const uploaded = new Set(documents.map((doc) => doc.document_type));
  return BIOMETRIC_REQUIRED.every((type) => uploaded.has(type));
}

/** @deprecated Use hasAllBiometricDocuments. */
export function hasAllRequiredDocuments(
  _role: UserRole,
  documents: Pick<IdentityDocument, "document_type">[]
): boolean {
  return hasAllBiometricDocuments(documents);
}

export function hasBiometricDocuments(documents: Pick<IdentityDocument, "document_type">[]): boolean {
  return getBiometricDocuments().every((type) =>
    documents.some((doc) => doc.document_type === type)
  );
}

export function hasStudyCertificateDocument(
  documents: Pick<IdentityDocument, "document_type">[]
): boolean {
  return documents.some((doc) => doc.document_type === "certificado_estudios");
}

export function needsBiometricOnboarding(identityStatus: IdentityStatus | null | undefined): boolean {
  return identityStatus === "none" || identityStatus === "rejected";
}

export function canAccessPanel(identityStatus: IdentityStatus | null | undefined): boolean {
  return identityStatus === "pending" || identityStatus === "approved";
}

export function canAccessStudyCertificates(role: UserRole): boolean {
  return role === "professional" || role === "admin";
}
