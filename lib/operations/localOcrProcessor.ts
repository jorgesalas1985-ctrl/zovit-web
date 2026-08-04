import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildOperationalDocumentEventInsert,
  type OperationalDocumentActorType,
  type OperationalDocumentKind,
  type OperationalDocumentStatus,
} from "@/lib/operations/documentRenewalPersistence";
import { analyzeImagesWithLocalOcr, type LocalOcrExtract } from "@/lib/verification/localCarnetOcr";

export type LocalOcrProcessStatus =
  | "ocr_completed"
  | "manual_review_requested";

export type LocalOcrProcessResult = {
  ok: boolean;
  documentId: string;
  status: LocalOcrProcessStatus | null;
  extract: LocalOcrExtract | null;
  eventId: string | null;
  error: string | null;
};

export async function processDocumentWithLocalOcr(input: {
  supabase: SupabaseClient;
  documentId: string;
  actorId?: string | null;
  actorType?: OperationalDocumentActorType;
}): Promise<LocalOcrProcessResult> {
  const { data: documentRow, error: loadError } = await input.supabase
    .from("operational_documents")
    .select(
      "id,profile_id,document_kind,status,storage_bucket,storage_path,mime_type,semester_year,semester",
    )
    .eq("id", input.documentId)
    .maybeSingle();

  if (loadError) return failure(input.documentId, loadError.message);
  if (!documentRow) return failure(input.documentId, "Documento operacional no encontrado.");

  const document = mapDocumentRow(documentRow as OperationalDocumentRow);
  if (!["submitted", "ocr_pending"].includes(document.status)) {
    return failure(
      input.documentId,
      `El documento no puede procesarse con OCR desde estado ${document.status}.`,
    );
  }

  if (!document.mimeType?.startsWith("image/")) {
    return markManualReview({
      supabase: input.supabase,
      document,
      actorId: input.actorId,
      actorType: input.actorType,
      reason: "El OCR local inicial solo procesa imagenes. PDF queda para revision manual o conversion local futura.",
    });
  }

  const { data: file, error: downloadError } = await input.supabase.storage
    .from(document.storageBucket)
    .download(document.storagePath);

  if (downloadError) return failure(input.documentId, downloadError.message);
  if (!file) return failure(input.documentId, "No se pudo descargar el archivo.");

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");
  const extract = await analyzeImagesWithLocalOcr([
    {
      label: document.documentKind,
      mime: document.mimeType,
      base64,
    },
  ]);
  const needsManualReview =
    extract.confidence < 0.65 || extract.forgeryRisk !== "low";
  const status: LocalOcrProcessStatus = needsManualReview
    ? "manual_review_requested"
    : "ocr_completed";

  const { error: updateError } = await input.supabase
    .from("operational_documents")
    .update({
      status: needsManualReview ? "needs_manual_review" : "ocr_completed",
      extracted_data: {
        text: extract.text,
        extractedRut: extract.extractedRut,
        extractedBirthDate: extract.extractedBirthDate,
      },
      validation_summary: {
        source: "local_tesseract",
        confidence: extract.confidence,
        forgeryRisk: extract.forgeryRisk,
        documentLooksLikeChileanId: extract.documentLooksLikeChileanId,
        requiresManualReview: needsManualReview,
        reasons: extract.reasons,
      },
      ocr_engine: "local_tesseract",
      ocr_processed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", document.id);

  if (updateError) return failure(input.documentId, updateError.message);

  const event = buildOperationalDocumentEventInsert({
    documentId: document.id,
    profileId: document.profileId,
    eventType: needsManualReview ? "manual_review_requested" : "ocr_completed",
    actorId: input.actorId,
    actorType: input.actorType ?? "operations",
    semesterYear: document.semesterYear,
    semester: document.semester,
    metadata: {
      engine: "local_tesseract",
      confidence: extract.confidence,
      forgeryRisk: extract.forgeryRisk,
      requiresManualReview: needsManualReview,
      reasons: extract.reasons,
    },
  });
  const { data: eventRow, error: eventError } = await input.supabase
    .from("operational_document_events")
    .insert(event)
    .select("id")
    .maybeSingle();

  if (eventError) return failure(input.documentId, eventError.message);

  return {
    ok: true,
    documentId: document.id,
    status,
    extract,
    eventId: (eventRow as { id?: string } | null)?.id ?? null,
    error: null,
  };
}

type OperationalDocumentRow = {
  id: string;
  profile_id: string;
  document_kind: OperationalDocumentKind;
  status: OperationalDocumentStatus;
  storage_bucket: string;
  storage_path: string;
  mime_type: string | null;
  semester_year: number;
  semester: "S1" | "S2";
};

function mapDocumentRow(row: OperationalDocumentRow) {
  return {
    id: row.id,
    profileId: row.profile_id,
    documentKind: row.document_kind,
    status: row.status,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    semesterYear: row.semester_year,
    semester: row.semester,
  };
}

async function markManualReview(input: {
  supabase: SupabaseClient;
  document: ReturnType<typeof mapDocumentRow>;
  actorId?: string | null;
  actorType?: OperationalDocumentActorType;
  reason: string;
}): Promise<LocalOcrProcessResult> {
  const { error: updateError } = await input.supabase
    .from("operational_documents")
    .update({
      status: "needs_manual_review",
      validation_summary: {
        source: "local_tesseract",
        requiresManualReview: true,
        reasons: [input.reason],
      },
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.document.id);

  if (updateError) return failure(input.document.id, updateError.message);

  const event = buildOperationalDocumentEventInsert({
    documentId: input.document.id,
    profileId: input.document.profileId,
    eventType: "manual_review_requested",
    actorId: input.actorId,
    actorType: input.actorType ?? "operations",
    semesterYear: input.document.semesterYear,
    semester: input.document.semester,
    metadata: {
      engine: "local_tesseract",
      reason: input.reason,
    },
  });
  const { data: eventRow, error: eventError } = await input.supabase
    .from("operational_document_events")
    .insert(event)
    .select("id")
    .maybeSingle();

  if (eventError) return failure(input.document.id, eventError.message);

  return {
    ok: true,
    documentId: input.document.id,
    status: "manual_review_requested",
    extract: null,
    eventId: (eventRow as { id?: string } | null)?.id ?? null,
    error: null,
  };
}

function failure(documentId: string, error: string): LocalOcrProcessResult {
  return {
    ok: false,
    documentId,
    status: null,
    extract: null,
    eventId: null,
    error,
  };
}
