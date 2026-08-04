import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  OperationalDocumentActorType,
  OperationalDocumentEventType,
  OperationalDocumentKind,
  OperationalDocumentStatus,
} from "@/lib/operations/documentRenewalPersistence";

export type OperationalDocumentDetail = {
  document: {
    documentId: string;
    profileId: string;
    documentKind: OperationalDocumentKind;
    status: OperationalDocumentStatus;
    storageBucket: string;
    storagePath: string;
    originalName: string | null;
    mimeType: string | null;
    fileSizeBytes: number | null;
    semesterYear: number;
    semester: "S1" | "S2";
    extractedData: Record<string, unknown>;
    extractedFields: OperationalDocumentExtractedField[];
    validationSummary: Record<string, unknown>;
    ocrEngine: string | null;
    ocrProcessedAt: string | null;
    reviewedBy: string | null;
    reviewedAt: string | null;
    rejectionReason: string | null;
    reviewHint: string;
    canDecide: boolean;
    submittedAt: string;
    updatedAt: string;
  } | null;
  events: OperationalDocumentDetailEvent[];
  error: string | null;
};

export type OperationalDocumentExtractedField = {
  label: string;
  value: string;
};

export type OperationalDocumentDetailEvent = {
  eventId: string;
  eventType: OperationalDocumentEventType;
  actorId: string | null;
  actorType: OperationalDocumentActorType;
  summary: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export async function loadOperationalDocumentDetail(
  supabase: SupabaseClient,
  documentId: string,
): Promise<OperationalDocumentDetail> {
  const { data: documentRow, error: documentError } = await supabase
    .from("operational_documents")
    .select(
      "id,profile_id,document_kind,status,storage_bucket,storage_path,original_name,mime_type,file_size_bytes,semester_year,semester,extracted_data,validation_summary,ocr_engine,ocr_processed_at,reviewed_by,reviewed_at,rejection_reason,submitted_at,updated_at",
    )
    .eq("id", documentId)
    .maybeSingle();

  if (documentError) return emptyDetail(documentError.message);
  if (!documentRow) return emptyDetail("Documento operacional no encontrado.");

  const { data: eventRows, error: eventError } = await supabase
    .from("operational_document_events")
    .select("id,event_type,actor_id,actor_type,summary,metadata,created_at")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false })
    .limit(20);

  if (eventError) return emptyDetail(eventError.message);

  return {
    document: mapDocumentRow(documentRow as OperationalDocumentDetailRow),
    events: ((eventRows ?? []) as OperationalDocumentDetailEventRow[]).map(mapEventRow),
    error: null,
  };
}

type OperationalDocumentDetailRow = {
  id: string;
  profile_id: string;
  document_kind: OperationalDocumentKind;
  status: OperationalDocumentStatus;
  storage_bucket: string;
  storage_path: string;
  original_name: string | null;
  mime_type: string | null;
  file_size_bytes: number | null;
  semester_year: number;
  semester: "S1" | "S2";
  extracted_data: Record<string, unknown> | null;
  validation_summary: Record<string, unknown> | null;
  ocr_engine: string | null;
  ocr_processed_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  submitted_at: string;
  updated_at: string;
};

type OperationalDocumentDetailEventRow = {
  id: string;
  event_type: OperationalDocumentEventType;
  actor_id: string | null;
  actor_type: OperationalDocumentActorType;
  summary: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function mapDocumentRow(row: OperationalDocumentDetailRow): NonNullable<OperationalDocumentDetail["document"]> {
  return {
    documentId: row.id,
    profileId: row.profile_id,
    documentKind: row.document_kind,
    status: row.status,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    originalName: row.original_name,
    mimeType: row.mime_type,
    fileSizeBytes: row.file_size_bytes,
    semesterYear: row.semester_year,
    semester: row.semester,
    extractedData: row.extracted_data ?? {},
    extractedFields: buildExtractedFields(row),
    validationSummary: row.validation_summary ?? {},
    ocrEngine: row.ocr_engine,
    ocrProcessedAt: row.ocr_processed_at,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
    rejectionReason: row.rejection_reason,
    reviewHint: buildReviewHint(row),
    canDecide: canDecideStatus(row.status),
    submittedAt: row.submitted_at,
    updatedAt: row.updated_at,
  };
}

function buildExtractedFields(row: OperationalDocumentDetailRow): OperationalDocumentExtractedField[] {
  const extracted = row.extracted_data ?? {};
  const validation = row.validation_summary ?? {};
  const fields: OperationalDocumentExtractedField[] = [];

  addField(fields, "RUT extraido", extracted.extractedRut);
  addField(fields, "Fecha nacimiento extraida", extracted.extractedBirthDate);
  addField(fields, "Texto OCR", truncateText(extracted.text));

  if (typeof validation.confidence === "number" && Number.isFinite(validation.confidence)) {
    fields.push({
      label: "Confianza OCR",
      value: `${Math.round(validation.confidence * 100)}%`,
    });
  }

  addField(fields, "Riesgo detectado", validation.forgeryRisk);

  if (Array.isArray(validation.reasons) && validation.reasons.length > 0) {
    fields.push({
      label: "Razones",
      value: validation.reasons
        .filter((reason): reason is string => typeof reason === "string")
        .join(", "),
    });
  }

  return fields;
}

function addField(
  fields: OperationalDocumentExtractedField[],
  label: string,
  value: unknown,
) {
  if (typeof value !== "string" || !value.trim()) return;
  fields.push({ label, value: value.trim() });
}

function truncateText(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  return value.trim().slice(0, 500);
}

function canDecideStatus(status: OperationalDocumentStatus): boolean {
  return ["submitted", "ocr_pending", "ocr_completed", "needs_manual_review"].includes(status);
}

function buildReviewHint(row: OperationalDocumentDetailRow): string {
  if (!canDecideStatus(row.status)) {
    if (row.status === "approved") return "Documento ya aprobado; no requiere nueva decision.";
    if (row.status === "rejected") return "Documento rechazado; esperar reemplazo del usuario.";
    if (row.status === "expired") return "Documento vencido; solicitar renovacion documental.";
    return "Documento reemplazado o fuera de flujo de decision.";
  }

  const validation = row.validation_summary ?? {};
  const requiresManualReview = validation.requiresManualReview === true;
  const confidence =
    typeof validation.confidence === "number" && Number.isFinite(validation.confidence)
      ? validation.confidence
      : null;

  if (requiresManualReview) {
    return "Revisar manualmente antes de aprobar: el OCR local marco dudas o baja confianza.";
  }

  if (row.status === "ocr_completed" && confidence !== null && confidence >= 0.65) {
    return "OCR local completado con confianza suficiente; validar visualmente antes de aprobar.";
  }

  if (row.status === "ocr_pending") {
    return "OCR solicitado o pendiente; procesar OCR local antes de decidir si corresponde.";
  }

  return "Revisar archivo y datos disponibles antes de tomar decision documental.";
}

function mapEventRow(row: OperationalDocumentDetailEventRow): OperationalDocumentDetailEvent {
  return {
    eventId: row.id,
    eventType: row.event_type,
    actorId: row.actor_id,
    actorType: row.actor_type,
    summary: row.summary,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  };
}

function emptyDetail(error: string): OperationalDocumentDetail {
  return {
    document: null,
    events: [],
    error,
  };
}
