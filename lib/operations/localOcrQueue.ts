import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  OperationalDocumentKind,
  OperationalDocumentStatus,
} from "@/lib/operations/documentRenewalPersistence";

export type LocalOcrQueuePriority = "critical" | "high" | "medium" | "low";

export type LocalOcrQueueItem = {
  documentId: string;
  profileId: string;
  documentKind: OperationalDocumentKind;
  status: OperationalDocumentStatus;
  storageBucket: string;
  storagePath: string;
  mimeType: string | null;
  semesterYear: number;
  semester: "S1" | "S2";
  submittedAt: string;
  priority: LocalOcrQueuePriority;
  reason: string;
  actionLabel: string;
  requiresHumanAction: boolean;
};

export type LocalOcrQueue = {
  items: LocalOcrQueueItem[];
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  humanActionRequired: number;
  automaticCandidates: number;
  error: string | null;
};

export async function loadLocalOcrQueue(
  supabase: SupabaseClient,
  input?: {
    limit?: number;
  },
): Promise<LocalOcrQueue> {
  const limit = normalizeLimit(input?.limit);
  const { data, error } = await supabase
    .from("operational_documents")
    .select(
      "id,profile_id,document_kind,status,storage_bucket,storage_path,mime_type,semester_year,semester,submitted_at",
    )
    .in("status", ["submitted", "ocr_pending", "ocr_completed", "needs_manual_review"])
    .order("submitted_at", { ascending: true })
    .limit(limit);

  if (error) {
    return emptyQueue(error.message);
  }

  const items = ((data ?? []) as OperationalDocumentQueueRow[])
    .map(mapQueueRow)
    .sort(compareQueueItems);

  return {
    items,
    total: items.length,
    critical: items.filter((item) => item.priority === "critical").length,
    high: items.filter((item) => item.priority === "high").length,
    medium: items.filter((item) => item.priority === "medium").length,
    low: items.filter((item) => item.priority === "low").length,
    humanActionRequired: items.filter((item) => item.requiresHumanAction).length,
    automaticCandidates: items.filter((item) => !item.requiresHumanAction).length,
    error: null,
  };
}

type OperationalDocumentQueueRow = {
  id: string;
  profile_id: string;
  document_kind: OperationalDocumentKind;
  status: OperationalDocumentStatus;
  storage_bucket: string;
  storage_path: string;
  mime_type: string | null;
  semester_year: number;
  semester: "S1" | "S2";
  submitted_at: string;
};

function mapQueueRow(row: OperationalDocumentQueueRow): LocalOcrQueueItem {
  const priority = priorityForDocument(row);

  return {
    documentId: row.id,
    profileId: row.profile_id,
    documentKind: row.document_kind,
    status: row.status,
    storageBucket: row.storage_bucket,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    semesterYear: row.semester_year,
    semester: row.semester,
    submittedAt: row.submitted_at,
    priority,
    reason: reasonForPriority(priority, row),
    actionLabel: actionLabelForDocument(row),
    requiresHumanAction: requiresHumanAction(row),
  };
}

function priorityForDocument(row: OperationalDocumentQueueRow): LocalOcrQueuePriority {
  if (row.status === "needs_manual_review") return "critical";
  if (row.status === "ocr_completed") return "high";
  if (row.document_kind === "identity" || row.document_kind === "license") return "high";
  if (row.document_kind === "credential" || row.document_kind === "student_enrollment") {
    return "medium";
  }
  return "low";
}

function reasonForPriority(
  priority: LocalOcrQueuePriority,
  row: OperationalDocumentQueueRow,
): string {
  if (priority === "critical") {
    return "Documento requiere revision manual antes de continuar.";
  }

  if (row.status === "ocr_completed") {
    return "OCR local completado; documento listo para decision humana.";
  }

  if (priority === "high") {
    return "Documento sensible debe procesarse con OCR local prioritario.";
  }

  if (priority === "medium") {
    return "Documento operacional requiere OCR local para extraer datos estructurados.";
  }

  return `Documento ${row.document_kind} queda en cola de baja prioridad.`;
}

function requiresHumanAction(row: OperationalDocumentQueueRow): boolean {
  return row.status === "needs_manual_review" || row.status === "ocr_completed";
}

function actionLabelForDocument(row: OperationalDocumentQueueRow): string {
  if (row.status === "needs_manual_review") {
    return "Abrir detalle y revisar manualmente antes de decidir.";
  }

  if (row.status === "ocr_completed") {
    return "Validar datos OCR y aprobar o rechazar.";
  }

  if (row.status === "ocr_pending") {
    return "Procesar con OCR local cuando haya turno disponible.";
  }

  if (row.mime_type?.startsWith("image/")) {
    return "Solicitar o procesar OCR local para extraer datos.";
  }

  return "Derivar a revision manual o convertir localmente antes de OCR.";
}

function compareQueueItems(left: LocalOcrQueueItem, right: LocalOcrQueueItem): number {
  const priorityDelta = priorityWeight(right.priority) - priorityWeight(left.priority);
  if (priorityDelta !== 0) return priorityDelta;
  return Date.parse(left.submittedAt) - Date.parse(right.submittedAt);
}

function priorityWeight(priority: LocalOcrQueuePriority): number {
  if (priority === "critical") return 4;
  if (priority === "high") return 3;
  if (priority === "medium") return 2;
  return 1;
}

function normalizeLimit(limit: number | undefined): number {
  if (!limit || !Number.isFinite(limit) || limit <= 0) {
    return 20;
  }

  return Math.min(Math.floor(limit), 100);
}

function emptyQueue(error: string | null): LocalOcrQueue {
  return {
    items: [],
    total: 0,
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    humanActionRequired: 0,
    automaticCandidates: 0,
    error,
  };
}
