import assert from "node:assert/strict";
import test from "node:test";

import { processLocalOcrBatch } from "@/lib/operations/localOcrBatch";

const baseQueueItem = {
  profileId: "profile-1",
  documentKind: "credential" as const,
  storageBucket: "worker-credentials",
  storagePath: "document.pdf",
  mimeType: "application/pdf",
  semesterYear: 2026,
  semester: "S2" as const,
  submittedAt: "2026-08-10T10:00:00.000Z",
  priority: "medium" as const,
  reason: "Documento operacional requiere OCR local para extraer datos estructurados.",
  actionLabel: "Procesar con OCR local cuando haya turno disponible.",
  requiresHumanAction: false,
};

test("processes local OCR queue in a small sequential batch", async () => {
  const processed: string[] = [];
  const batch = await processLocalOcrBatch({
    supabase: {} as never,
    limit: 5,
    loadQueue: async () => ({
      items: [
        { ...baseQueueItem, documentId: "doc-1", status: "ocr_pending" },
        { ...baseQueueItem, documentId: "doc-2", status: "submitted" },
        { ...baseQueueItem, documentId: "doc-3", status: "needs_manual_review" },
      ],
      total: 3,
      critical: 1,
      high: 0,
      medium: 2,
      low: 0,
      humanActionRequired: 1,
      automaticCandidates: 2,
      error: null,
    }),
    processDocument: async ({ documentId }) => {
      processed.push(documentId);
      return {
        ok: true,
        documentId,
        status: documentId === "doc-1" ? "ocr_completed" : "manual_review_requested",
        extract: null,
        eventId: `event-${documentId}`,
        error: null,
      };
    },
  });

  assert.deepEqual(processed, ["doc-1", "doc-2"]);
  assert.equal(batch.attempted, 2);
  assert.equal(batch.completed, 1);
  assert.equal(batch.manualReview, 1);
  assert.equal(batch.failed, 0);
  assert.equal(batch.skipped, 1);
  assert.match(batch.items[0]?.actionLabel ?? "", /aprobar o rechazar/);
  assert.match(batch.items[1]?.actionLabel ?? "", /revisar manualmente/);
  assert.match(batch.items[2]?.actionLabel ?? "", /revision manual pendiente/);
  assert.match(batch.summary, /Procesados 2 documentos/);
});

test("returns controlled batch error when queue cannot be loaded", async () => {
  const batch = await processLocalOcrBatch({
    supabase: {} as never,
    loadQueue: async () => ({
      items: [],
      total: 0,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      humanActionRequired: 0,
      automaticCandidates: 0,
      error: "relation does not exist",
    }),
  });

  assert.equal(batch.attempted, 0);
  assert.match(batch.error ?? "", /relation does not exist/);
  assert.match(batch.summary, /No se pudo cargar/);
});
