import type { SupabaseClient } from "@supabase/supabase-js";

import {
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
  claimToken?: string;
  actorId?: string | null;
  actorType?: OperationalDocumentActorType;
}): Promise<LocalOcrProcessResult> {
  if (!input.claimToken) {
    return failure(input.documentId, "Se requiere un claim OCR activo para procesar el documento.");
  }
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
      claimToken: input.claimToken,
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

  const eventMetadata = {
      engine: "local_tesseract",
      confidence: extract.confidence,
      forgeryRisk: extract.forgeryRisk,
      requiresManualReview: needsManualReview,
      reasons: extract.reasons,
    };
  const eventId = await persistOcrResult(input, document, status, {
    text: extract.text,
    extractedRut: extract.extractedRut,
    extractedBirthDate: extract.extractedBirthDate,
  }, {
    source: "local_tesseract",
    confidence: extract.confidence,
    forgeryRisk: extract.forgeryRisk,
    documentLooksLikeChileanId: extract.documentLooksLikeChileanId,
    requiresManualReview: needsManualReview,
    reasons: extract.reasons,
  }, eventMetadata);
  if (eventId instanceof Error) return failure(input.documentId, eventId.message);

  return {
    ok: true,
    documentId: document.id,
    status,
    extract,
    eventId,
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
  claimToken?: string;
  actorId?: string | null;
  actorType?: OperationalDocumentActorType;
  reason: string;
}): Promise<LocalOcrProcessResult> {
  const eventId = await persistOcrResult(input, input.document, "manual_review_requested", {}, {
    source: "local_tesseract",
    requiresManualReview: true,
    reasons: [input.reason],
  }, {
      engine: "local_tesseract",
      reason: input.reason,
  });
  if (eventId instanceof Error) return failure(input.document.id, eventId.message);

  return {
    ok: true,
    documentId: input.document.id,
    status: "manual_review_requested",
    extract: null,
    eventId,
    error: null,
  };
}

async function persistOcrResult(
  input: { supabase: SupabaseClient; claimToken?: string; actorId?: string | null; actorType?: OperationalDocumentActorType },
  document: ReturnType<typeof mapDocumentRow>,
  status: LocalOcrProcessStatus,
  extractedData: Record<string, unknown>,
  validationSummary: Record<string, unknown>,
  eventMetadata: Record<string, unknown>,
): Promise<string | Error> {
  const { data, error } = await input.supabase.rpc("intranet_persist_local_ocr_result", {
    p_document_id: document.id,
    p_claim_token: input.claimToken,
    p_result_status: status,
    p_extracted_data: extractedData,
    p_validation_summary: validationSummary,
    p_event_metadata: eventMetadata,
    p_actor_id: input.actorId ?? null,
    p_actor_type: input.actorType ?? "operations",
  });
  if (error) return new Error(error.message);
  if (typeof data !== "string") return new Error("El OCR no devolvió un evento válido.");
  return data;
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
