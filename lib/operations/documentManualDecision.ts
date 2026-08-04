import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildOperationalDocumentEventInsert,
  type OperationalDocumentActorType,
  type OperationalDocumentKind,
  type OperationalDocumentStatus,
} from "@/lib/operations/documentRenewalPersistence";

export type DocumentManualDecisionAction = "approve" | "reject";

export type DocumentManualDecisionResult = {
  ok: boolean;
  documentId: string;
  profileId: string | null;
  status: "approved" | "rejected" | null;
  eventId: string | null;
  summary: string;
  actionLabel: string;
  error: string | null;
};

export async function decideOperationalDocument(input: {
  supabase: SupabaseClient;
  documentId: string;
  action: DocumentManualDecisionAction;
  actorId: string;
  actorType?: OperationalDocumentActorType;
  reason?: string | null;
  notes?: string | null;
}): Promise<DocumentManualDecisionResult> {
  const { data: documentRow, error: loadError } = await input.supabase
    .from("operational_documents")
    .select(
      "id,profile_id,document_kind,status,semester_year,semester,validation_summary",
    )
    .eq("id", input.documentId)
    .maybeSingle();

  if (loadError) return failure(input.documentId, null, loadError.message);
  if (!documentRow) return failure(input.documentId, null, "Documento operacional no encontrado.");

  const document = mapDocumentRow(documentRow as OperationalDocumentDecisionRow);
  if (!canDecideDocument(document.status)) {
    return failure(
      document.id,
      document.profileId,
      `El documento no puede decidirse desde estado ${document.status}.`,
    );
  }

  if (input.action === "reject" && !input.reason?.trim()) {
    return failure(document.id, document.profileId, "El rechazo requiere una razon.");
  }

  const status = input.action === "approve" ? "approved" : "rejected";
  const now = new Date().toISOString();
  const validationSummary = {
    ...document.validationSummary,
    manualDecision: status,
    manualDecisionAt: now,
    manualDecisionBy: input.actorId,
    manualDecisionReason: input.reason?.trim() || null,
    manualDecisionNotes: input.notes?.trim() || null,
  };
  const { error: updateError } = await input.supabase
    .from("operational_documents")
    .update({
      status,
      reviewed_by: input.actorId,
      reviewed_at: now,
      rejection_reason: status === "rejected" ? input.reason?.trim() : null,
      validation_summary: validationSummary,
      updated_at: now,
    })
    .eq("id", document.id);

  if (updateError) return failure(document.id, document.profileId, updateError.message);

  const event = buildOperationalDocumentEventInsert({
    documentId: document.id,
    profileId: document.profileId,
    eventType: status,
    actorId: input.actorId,
    actorType: input.actorType ?? "operations",
    semesterYear: document.semesterYear,
    semester: document.semester,
    summary:
      status === "approved"
        ? "Documento operacional aprobado manualmente."
        : "Documento operacional rechazado manualmente.",
    metadata: {
      documentKind: document.documentKind,
      previousStatus: document.status,
      reason: input.reason?.trim() || null,
      notes: input.notes?.trim() || null,
    },
  });
  const { data: eventRow, error: eventError } = await input.supabase
    .from("operational_document_events")
    .insert(event)
    .select("id")
    .maybeSingle();

  if (eventError) return failure(document.id, document.profileId, eventError.message);

  return {
    ok: true,
    documentId: document.id,
    profileId: document.profileId,
    status,
    eventId: (eventRow as { id?: string } | null)?.id ?? null,
    summary:
      status === "approved"
        ? "Documento aprobado y disponible como dato estructurado semestral."
        : "Documento rechazado; el usuario debe reemplazarlo para regularizar el semestre.",
    actionLabel:
      status === "approved"
        ? "Recalcular cumplimiento documental y cerrar avisos si corresponde."
        : "Esperar reemplazo documental o contactar al usuario.",
    error: null,
  };
}

type OperationalDocumentDecisionRow = {
  id: string;
  profile_id: string;
  document_kind: OperationalDocumentKind;
  status: OperationalDocumentStatus;
  semester_year: number;
  semester: "S1" | "S2";
  validation_summary: Record<string, unknown> | null;
};

function mapDocumentRow(row: OperationalDocumentDecisionRow) {
  return {
    id: row.id,
    profileId: row.profile_id,
    documentKind: row.document_kind,
    status: row.status,
    semesterYear: row.semester_year,
    semester: row.semester,
    validationSummary: row.validation_summary ?? {},
  };
}

function canDecideDocument(status: OperationalDocumentStatus): boolean {
  return ["submitted", "ocr_pending", "ocr_completed", "needs_manual_review"].includes(status);
}

function failure(
  documentId: string,
  profileId: string | null,
  error: string,
): DocumentManualDecisionResult {
  return {
    ok: false,
    documentId,
    profileId,
    status: null,
    eventId: null,
    summary: "No se pudo registrar decision documental.",
    actionLabel: "Revisar error antes de intentar nuevamente.",
    error,
  };
}
