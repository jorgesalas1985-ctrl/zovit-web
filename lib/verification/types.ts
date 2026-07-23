import type { UserRole } from "@/lib/auth/roles";

export type IdentityStatus = "none" | "pending" | "approved" | "rejected";

export type IdentityDocumentType =
  | "cedula_front"
  | "cedula_back"
  | "certificado_antecedentes"
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
  selfie: "Selfie biométrica",
  liveness_proof: "Prueba de vida",
};

export const IDENTITY_STATUS_LABELS: Record<IdentityStatus, string> = {
  none: "Sin verificar",
  pending: "En revisión",
  approved: "Verificado",
  rejected: "Rechazado",
};

const BASE_REQUIRED: IdentityDocumentType[] = [
  "cedula_front",
  "cedula_back",
  "selfie",
  "liveness_proof",
];

export function getRequiredDocuments(role: UserRole): IdentityDocumentType[] {
  if (role === "professional" || role === "admin") {
    return [...BASE_REQUIRED, "certificado_antecedentes"];
  }
  return BASE_REQUIRED;
}

export function getCarnetDocuments(): IdentityDocumentType[] {
  return ["cedula_front", "cedula_back"];
}

export function getBiometricDocuments(): IdentityDocumentType[] {
  return ["selfie", "liveness_proof"];
}

export function hasAllRequiredDocuments(
  role: UserRole,
  documents: Pick<IdentityDocument, "document_type">[]
): boolean {
  const required = getRequiredDocuments(role);
  const uploaded = new Set(documents.map((doc) => doc.document_type));
  return required.every((type) => uploaded.has(type));
}

export function hasBiometricDocuments(documents: Pick<IdentityDocument, "document_type">[]): boolean {
  return getBiometricDocuments().every((type) =>
    documents.some((doc) => doc.document_type === type)
  );
}
