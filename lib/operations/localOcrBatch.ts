import type { SupabaseClient } from "@supabase/supabase-js";

import type { OperationalDocumentActorType } from "@/lib/operations/documentRenewalPersistence";
import {
  loadLocalOcrQueue,
  type LocalOcrQueue,
  type LocalOcrQueueItem,
} from "@/lib/operations/localOcrQueue";
import {
  processDocumentWithLocalOcr,
  type LocalOcrProcessResult,
  type LocalOcrProcessStatus,
} from "@/lib/operations/localOcrProcessor";

export type LocalOcrBatchItemResult = {
  documentId: string;
  ok: boolean;
  status: LocalOcrProcessStatus | "skipped" | null;
  eventId: string | null;
  error: string | null;
  actionLabel: string;
};

export type LocalOcrBatchResult = {
  attempted: number;
  completed: number;
  manualReview: number;
  failed: number;
  skipped: number;
  items: LocalOcrBatchItemResult[];
  error: string | null;
  summary: string;
};

type LocalOcrBatchInput = {
  supabase: SupabaseClient;
  limit?: number;
  actorId?: string | null;
  actorType?: OperationalDocumentActorType;
  loadQueue?: typeof loadLocalOcrQueue;
  processDocument?: typeof processDocumentWithLocalOcr;
};

export async function processLocalOcrBatch(
  input: LocalOcrBatchInput,
): Promise<LocalOcrBatchResult> {
  const limit = normalizeBatchLimit(input.limit);
  const loadQueue = input.loadQueue ?? loadLocalOcrQueue;
  const processDocument = input.processDocument ?? processDocumentWithLocalOcr;
  const queue = await loadQueue(input.supabase, { limit });

  if (queue.error) {
    return buildBatchResult({
      attempted: 0,
      completed: 0,
      manualReview: 0,
      failed: 0,
      skipped: 0,
      items: [],
      error: queue.error,
    });
  }

  const items: LocalOcrBatchItemResult[] = [];
  let attempted = 0;
  let completed = 0;
  let manualReview = 0;
  let failed = 0;
  let skipped = 0;

  for (const item of queue.items.slice(0, limit)) {
    if (!canProcessWithBatch(item)) {
      skipped += 1;
      items.push({
        documentId: item.documentId,
        ok: true,
        status: "skipped",
        eventId: null,
        error: "Documento ya esta en revision manual.",
        actionLabel: "Abrir detalle y resolver revision manual pendiente.",
      });
      continue;
    }

    attempted += 1;
    const result = await processDocument({
      supabase: input.supabase,
      documentId: item.documentId,
      actorId: input.actorId,
      actorType: input.actorType,
    });

    items.push(mapProcessResult(result));

    if (!result.ok) {
      failed += 1;
    } else if (result.status === "ocr_completed") {
      completed += 1;
    } else if (result.status === "manual_review_requested") {
      manualReview += 1;
    }
  }

  return buildBatchResult({
    attempted,
    completed,
    manualReview,
    failed,
    skipped,
    items,
    error: null,
  });
}

function canProcessWithBatch(item: LocalOcrQueueItem): boolean {
  return item.status === "submitted" || item.status === "ocr_pending";
}

function mapProcessResult(result: LocalOcrProcessResult): LocalOcrBatchItemResult {
  return {
    documentId: result.documentId,
    ok: result.ok,
    status: result.status,
    eventId: result.eventId,
    error: result.error,
    actionLabel: actionLabelForProcessResult(result),
  };
}

function actionLabelForProcessResult(result: LocalOcrProcessResult): string {
  if (!result.ok) return "Revisar error de procesamiento OCR local.";
  if (result.status === "ocr_completed") {
    return "Validar datos OCR y aprobar o rechazar el documento.";
  }
  if (result.status === "manual_review_requested") {
    return "Abrir detalle y revisar manualmente antes de decidir.";
  }
  return "Revisar estado del documento en cola.";
}

function normalizeBatchLimit(limit: number | undefined): number {
  if (!limit || !Number.isFinite(limit) || limit <= 0) return 3;
  return Math.min(Math.floor(limit), 5);
}

function buildBatchResult(
  input: Omit<LocalOcrBatchResult, "summary">,
): LocalOcrBatchResult {
  return {
    ...input,
    summary: buildSummary(input),
  };
}

function buildSummary(input: Omit<LocalOcrBatchResult, "summary">): string {
  if (input.error) return `No se pudo cargar la cola OCR local: ${input.error}`;

  return [
    `Procesados ${input.attempted} documentos en lote local.`,
    `Completados: ${input.completed}.`,
    `Revision manual: ${input.manualReview}.`,
    `Fallidos: ${input.failed}.`,
    `Omitidos: ${input.skipped}.`,
  ].join(" ");
}
