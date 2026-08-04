import type { SupabaseClient } from "@supabase/supabase-js";

import {
  buildOperationalDocumentEventInsert,
  type OperationalDocumentActorType,
  type OperationalDocumentKind,
  type OperationalDocumentStatus,
} from "@/lib/operations/documentRenewalPersistence";

export type LocalOcrRequestDocument = {
  id: string;
  profileId: string;
  documentKind: OperationalDocumentKind;
  status: OperationalDocumentStatus;
  storageBucket: string;
  storagePath: string;
  semesterYear: number;
  semester: "S1" | "S2";
};

export type RequestLocalOcrResult = {
  ok: boolean;
  document: LocalOcrRequestDocument | null;
  eventId: string | null;
  error: string | null;
};

export async function requestLocalOcrForDocument(input: {
  supabase: SupabaseClient;
  documentId: string;
  actorId?: string | null;
  actorType?: OperationalDocumentActorType;
}): Promise<RequestLocalOcrResult> {
  const { data: documentRow, error: loadError } = await input.supabase
    .from("operational_documents")
    .select("id,profile_id,document_kind,status,storage_bucket,storage_path,semester_year,semester")
    .eq("id", input.documentId)
    .maybeSingle();

  if (loadError) {
    return failure(loadError.message);
  }

  if (!documentRow) {
    return failure("Documento operacional no encontrado.");
  }

  const document = mapDocumentRow(documentRow as OperationalDocumentRow);
  if (!["submitted", "ocr_pending"].includes(document.status)) {
    return {
      ok: false,
      document,
      eventId: null,
      error: `El documento no puede pasar a OCR desde estado ${document.status}.`,
    };
  }

  const { error: updateError } = await input.supabase
    .from("operational_documents")
    .update({
      status: "ocr_pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.documentId);

  if (updateError) {
    return {
      ok: false,
      document,
      eventId: null,
      error: updateError.message,
    };
  }

  const event = buildOperationalDocumentEventInsert({
    documentId: document.id,
    profileId: document.profileId,
    eventType: "ocr_requested",
    actorId: input.actorId,
    actorType: input.actorType ?? "operations",
    semesterYear: document.semesterYear,
    semester: document.semester,
    metadata: {
      documentKind: document.documentKind,
      storageBucket: document.storageBucket,
      storagePath: document.storagePath,
      engine: "local_tesseract",
    },
  });

  const { data: eventRow, error: eventError } = await input.supabase
    .from("operational_document_events")
    .insert(event)
    .select("id")
    .maybeSingle();

  if (eventError) {
    return {
      ok: false,
      document,
      eventId: null,
      error: eventError.message,
    };
  }

  return {
    ok: true,
    document: {
      ...document,
      status: "ocr_pending",
    },
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
  semester_year: number;
  semester: "S1" | "S2";
};

function mapDocumentRow(row: OperationalDocumentRow): LocalOcrRequestDocument {
  return {
    id: row.id,
    profileId: row.profile_id,
    documentKind: row.document_kind,
    status: row.status,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    semesterYear: row.semester_year,
    semester: row.semester,
  };
}

function failure(error: string): RequestLocalOcrResult {
  return {
    ok: false,
    document: null,
    eventId: null,
    error,
  };
}
