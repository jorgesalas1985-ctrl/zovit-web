import type { OperationalDocumentKind } from "@/lib/operations/documentRenewalPersistence";

/** Mapea la carpeta de subida del registro trabajador al tipo documental operativo. */
export function documentKindFromFolder(folder: string): OperationalDocumentKind {
  const normalized = folder.trim().toLowerCase();

  if (normalized === "identity" || normalized.startsWith("identity-")) {
    return "identity";
  }
  if (normalized === "licenses" || normalized.startsWith("license")) {
    return "license";
  }
  if (
    normalized === "enrollment" ||
    normalized === "student" ||
    normalized === "training" ||
    normalized.startsWith("enrollment") ||
    normalized.startsWith("student") ||
    normalized.startsWith("training")
  ) {
    return "student_enrollment";
  }
  if (normalized === "background" || normalized.startsWith("background")) {
    return "background";
  }
  if (
    normalized === "docs" ||
    normalized === "credentials" ||
    normalized.startsWith("cred-") ||
    normalized.startsWith("cred_")
  ) {
    return "credential";
  }

  return "other";
}

export const DOCUMENT_KIND_LABELS: Record<OperationalDocumentKind, string> = {
  identity: "Documento de identidad",
  credential: "Título, licencia o certificación",
  license: "Licencia habilitante",
  student_enrollment: "Certificado de alumno regular / documento de estudios",
  background: "Certificado de antecedentes",
  other: "Documento de respaldo",
};
