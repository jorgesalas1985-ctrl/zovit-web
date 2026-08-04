import type { SupabaseClient } from "@supabase/supabase-js";

import {
  evaluateDocumentSemesterCompliance,
  resolveDocumentCompliancePeriod,
  type DocumentSemesterCompliance,
  type SemesterDocumentEvidence,
} from "@/lib/operations/documentSemesterCompliance";
import type { OperationalDocumentKind } from "@/lib/operations/documentRenewalPersistence";

export type OwnDocumentComplianceResult = {
  compliance: DocumentSemesterCompliance;
  actionLabel: string;
  nextStep: "none" | "upload_documents" | "wait_review" | "replace_documents";
  error: string | null;
};

export async function loadOwnDocumentCompliance(input: {
  supabase: SupabaseClient;
  profileId: string;
  requiredKinds?: OperationalDocumentKind[];
  now?: Date;
}): Promise<OwnDocumentComplianceResult> {
  const requiredKinds = input.requiredKinds ?? ["identity", "credential"];
  const period = resolveDocumentCompliancePeriod(input.now);
  const { data, error } = await input.supabase
    .from("operational_documents")
    .select("id,document_kind,status,semester_year,semester,submitted_at,updated_at")
    .eq("profile_id", input.profileId)
    .eq("semester_year", period.year)
    .eq("semester", period.code);

  if (error) {
    return {
      ...buildOwnComplianceResult({
        documents: [],
        requiredKinds,
        now: input.now,
        error: error.message,
      }),
    };
  }

  return buildOwnComplianceResult({
    documents: ((data ?? []) as OperationalDocumentRow[]).map(mapDocumentRow),
    requiredKinds,
    now: input.now,
    error: null,
  });
}

type OperationalDocumentRow = {
  id: string;
  document_kind: OperationalDocumentKind;
  status: SemesterDocumentEvidence["status"];
  semester_year: number;
  semester: "S1" | "S2";
  submitted_at: string | null;
  updated_at: string | null;
};

function mapDocumentRow(row: OperationalDocumentRow): SemesterDocumentEvidence {
  return {
    documentId: row.id,
    documentKind: row.document_kind,
    status: row.status,
    semesterYear: row.semester_year,
    semester: row.semester,
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
  };
}

function buildOwnComplianceResult(input: {
  documents: SemesterDocumentEvidence[];
  requiredKinds: OperationalDocumentKind[];
  now?: Date;
  error: string | null;
}): OwnDocumentComplianceResult {
  const compliance = evaluateDocumentSemesterCompliance({
    documents: input.documents,
    requiredKinds: input.requiredKinds,
    now: input.now,
  });

  return {
    compliance,
    actionLabel: buildActionLabel(compliance),
    nextStep: resolveNextStep(compliance),
    error: input.error,
  };
}

function resolveNextStep(
  compliance: DocumentSemesterCompliance,
): OwnDocumentComplianceResult["nextStep"] {
  if (compliance.status === "complete") return "none";
  if (compliance.status === "pending_review") return "wait_review";
  if (compliance.rejectedKinds.length > 0 || compliance.expiredKinds.length > 0) {
    return "replace_documents";
  }
  return "upload_documents";
}

function buildActionLabel(compliance: DocumentSemesterCompliance): string {
  const nextStep = resolveNextStep(compliance);

  if (nextStep === "none") {
    return "Tus documentos semestrales estan completos.";
  }

  if (nextStep === "wait_review") {
    return "Tus documentos fueron ingresados y estan esperando revision ZOVIT.";
  }

  if (nextStep === "replace_documents") {
    return "Reemplaza los documentos rechazados o vencidos para regularizar tu cuenta.";
  }

  if (compliance.status === "due_soon") {
    return "Sube o renueva tus documentos antes del cierre del semestre.";
  }

  return "Sube los documentos requeridos para habilitar tu cuenta.";
}
