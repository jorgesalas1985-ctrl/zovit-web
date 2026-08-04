import type { SupabaseClient } from "@supabase/supabase-js";

import { getSemesterPeriod } from "@/lib/operational/status";

export type OperationalDocumentKind =
  | "identity"
  | "credential"
  | "license"
  | "student_enrollment"
  | "background"
  | "other";

export type OperationalDocumentStatus =
  | "submitted"
  | "ocr_pending"
  | "ocr_completed"
  | "needs_manual_review"
  | "approved"
  | "rejected"
  | "expired"
  | "replaced";

export type OperationalDocumentEventType =
  | "submitted"
  | "replaced"
  | "ocr_requested"
  | "ocr_completed"
  | "manual_review_requested"
  | "approved"
  | "rejected"
  | "expired"
  | "semester_renewal_reminder"
  | "semester_suspension_ready"
  | "post_decision_sync_failed";

export type OperationalDocumentActorType =
  | "user"
  | "operations"
  | "supervisor"
  | "superadmin"
  | "system";

export type OperationalDocumentInsert = {
  profile_id: string;
  document_kind: OperationalDocumentKind;
  storage_bucket: string;
  storage_path: string;
  original_name: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  status: OperationalDocumentStatus;
  semester_year: number;
  semester: "S1" | "S2";
  extracted_data: Record<string, unknown>;
  validation_summary: Record<string, unknown>;
};

export type OperationalDocumentEventInsert = {
  document_id?: string | null;
  profile_id: string;
  event_type: OperationalDocumentEventType;
  semester_year: number;
  semester: "S1" | "S2";
  actor_id?: string | null;
  actor_type: OperationalDocumentActorType;
  summary: string;
  metadata: Record<string, unknown>;
};

export type RegisterOperationalDocumentResult = {
  documentId: string | null;
  eventId: string | null;
  error: string | null;
};

export function buildOperationalDocumentInsert(input: {
  profileId: string;
  documentKind: OperationalDocumentKind;
  bucket: string;
  path: string;
  originalName?: string | null;
  mimeType?: string | null;
  fileSizeBytes?: number | null;
  status?: OperationalDocumentStatus;
  now?: Date;
}): OperationalDocumentInsert {
  const semester = closeableSemester(input.now ?? new Date());

  return {
    profile_id: input.profileId,
    document_kind: input.documentKind,
    storage_bucket: input.bucket,
    storage_path: input.path,
    original_name: input.originalName ?? null,
    mime_type: input.mimeType ?? null,
    file_size_bytes: input.fileSizeBytes ?? null,
    status: input.status ?? "submitted",
    semester_year: semester.year,
    semester: semester.code,
    extracted_data: {},
    validation_summary: {
      source: "document_upload",
      requiresOcr: true,
      requiresManualReview: false,
    },
  };
}

export function buildOperationalDocumentEventInsert(input: {
  documentId?: string | null;
  profileId: string;
  eventType: OperationalDocumentEventType;
  actorId?: string | null;
  actorType?: OperationalDocumentActorType;
  summary?: string;
  metadata?: Record<string, unknown>;
  semesterYear?: number;
  semester?: "S1" | "S2";
  now?: Date;
}): OperationalDocumentEventInsert {
  const semester = closeableSemester(input.now ?? new Date());

  return {
    document_id: input.documentId ?? null,
    profile_id: input.profileId,
    event_type: input.eventType,
    semester_year: input.semesterYear ?? semester.year,
    semester: input.semester ?? semester.code,
    actor_id: input.actorId ?? null,
    actor_type: input.actorType ?? "user",
    summary: input.summary ?? summaryFromEventType(input.eventType),
    metadata: input.metadata ?? {},
  };
}

export async function registerOperationalDocument(input: {
  supabase: SupabaseClient;
  document: OperationalDocumentInsert;
  actorId?: string | null;
  actorType?: OperationalDocumentActorType;
}): Promise<RegisterOperationalDocumentResult> {
  const { data: documentRow, error: documentError } = await input.supabase
    .from("operational_documents")
    .insert(input.document)
    .select("id")
    .maybeSingle();

  if (documentError) {
    return {
      documentId: null,
      eventId: null,
      error: documentError.message,
    };
  }

  const documentId = (documentRow as { id?: string } | null)?.id ?? null;
  const event = buildOperationalDocumentEventInsert({
    documentId,
    profileId: input.document.profile_id,
    eventType: "submitted",
    actorId: input.actorId,
    actorType: input.actorType ?? "user",
    metadata: {
      documentKind: input.document.document_kind,
      storagePath: input.document.storage_path,
    },
  });

  const { data: eventRow, error: eventError } = await input.supabase
    .from("operational_document_events")
    .insert(event)
    .select("id")
    .maybeSingle();

  if (eventError) {
    return {
      documentId,
      eventId: null,
      error: eventError.message,
    };
  }

  return {
    documentId,
    eventId: (eventRow as { id?: string } | null)?.id ?? null,
    error: null,
  };
}

function closeableSemester(date: Date): { year: number; code: "S1" | "S2" } {
  const semester = getSemesterPeriod(date);

  if (semester.code === "S1" || semester.code === "S2") {
    return { year: semester.year, code: semester.code };
  }

  return { year: date.getFullYear() - 1, code: "S2" };
}

function summaryFromEventType(eventType: OperationalDocumentEventType): string {
  if (eventType === "submitted") return "Documento operacional ingresado.";
  if (eventType === "replaced") return "Documento operacional reemplazado.";
  if (eventType === "ocr_requested") return "OCR local solicitado para documento.";
  if (eventType === "ocr_completed") return "OCR local completado para documento.";
  if (eventType === "manual_review_requested") return "Revision manual solicitada.";
  if (eventType === "approved") return "Documento operacional aprobado.";
  if (eventType === "rejected") return "Documento operacional rechazado.";
  if (eventType === "expired") return "Documento operacional vencido.";
  if (eventType === "semester_renewal_reminder") {
    return "Recordatorio de renovacion documental semestral.";
  }
  if (eventType === "post_decision_sync_failed") {
    return "Sincronizacion posterior a decision documental pendiente.";
  }
  return "Documento listo para suspension semestral.";
}
