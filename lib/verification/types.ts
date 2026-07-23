import type { UserRole } from "@/lib/auth/roles";

export type IdentityStatus = "none" | "pending" | "approved" | "rejected";

export type IdentityDocumentType = "cedula_front" | "cedula_back" | "certificado_antecedentes";

export type IdentityDocument = {
  id: string;
  profile_id: string;
  document_type: IdentityDocumentType;
  storage_path: string;
  status: "uploaded" | "approved" | "rejected";
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type IdentityVerificationState = {
  identity_status: IdentityStatus;
  identity_verified: boolean;
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
  cedula_front: "Cédula de identidad (frontal)",
  cedula_back: "Cédula de identidad (reverso)",
  certificado_antecedentes: "Certificado de antecedentes",
};

export const IDENTITY_STATUS_LABELS: Record<IdentityStatus, string> = {
  none: "Sin verificar",
  pending: "En revisión",
  approved: "Verificado",
  rejected: "Rechazado",
};

export function getRequiredDocuments(role: UserRole): IdentityDocumentType[] {
  const base: IdentityDocumentType[] = ["cedula_front", "cedula_back"];
  if (role === "professional" || role === "admin") {
    return [...base, "certificado_antecedentes"];
  }
  return base;
}

export function hasAllRequiredDocuments(
  role: UserRole,
  documents: Pick<IdentityDocument, "document_type">[]
): boolean {
  const required = getRequiredDocuments(role);
  const uploaded = new Set(documents.map((doc) => doc.document_type));
  return required.every((type) => uploaded.has(type));
}
