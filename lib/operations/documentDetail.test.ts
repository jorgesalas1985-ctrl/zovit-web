import assert from "node:assert/strict";
import test from "node:test";

import { loadOperationalDocumentDetail } from "@/lib/operations/documentDetail";

function createDetailSupabaseMock() {
  return {
    from(table: string) {
      if (table === "operational_documents") {
        return {
          select() {
            return this;
          },
          eq() {
            return this;
          },
          maybeSingle() {
            return Promise.resolve({
              data: {
                id: "doc-1",
                profile_id: "profile-1",
                document_kind: "credential",
                status: "ocr_completed",
                storage_bucket: "worker-credentials",
                storage_path: "profile-1/docs/file.jpg",
                original_name: "file.jpg",
                mime_type: "image/jpeg",
                file_size_bytes: 1234,
                semester_year: 2026,
                semester: "S2",
                extracted_data: {
                  extractedRut: "11111111-1",
                  extractedBirthDate: "1990-01-01",
                  text: "Cedula de identidad",
                },
                validation_summary: {
                  confidence: 0.88,
                  forgeryRisk: "low",
                  reasons: ["rut_detected"],
                },
                ocr_engine: "local_tesseract",
                ocr_processed_at: "2026-08-10T10:00:00.000Z",
                reviewed_by: null,
                reviewed_at: null,
                rejection_reason: null,
                submitted_at: "2026-08-10T09:00:00.000Z",
                updated_at: "2026-08-10T10:00:00.000Z",
              },
              error: null,
            });
          },
        };
      }

      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        order() {
          return this;
        },
        limit() {
          return Promise.resolve({
            data: [
              {
                id: "event-1",
                event_type: "ocr_completed",
                actor_id: null,
                actor_type: "operations",
                summary: "OCR local completado para documento.",
                metadata: { confidence: 0.88 },
                created_at: "2026-08-10T10:00:00.000Z",
              },
            ],
            error: null,
          });
        },
      };
    },
  };
}

test("loads operational document detail with events", async () => {
  const detail = await loadOperationalDocumentDetail(
    createDetailSupabaseMock() as never,
    "doc-1",
  );

  assert.equal(detail.error, null);
  assert.equal(detail.document?.documentId, "doc-1");
  assert.equal(detail.document?.extractedData.extractedRut, "11111111-1");
  assert.deepEqual(detail.document?.extractedFields.slice(0, 2), [
    { label: "RUT extraido", value: "11111111-1" },
    { label: "Fecha nacimiento extraida", value: "1990-01-01" },
  ]);
  assert.equal(
    detail.document?.extractedFields.some(
      (field) => field.label === "Confianza OCR" && field.value === "88%",
    ),
    true,
  );
  assert.equal(detail.document?.canDecide, true);
  assert.match(detail.document?.reviewHint ?? "", /confianza suficiente/);
  assert.equal(detail.events.length, 1);
});

test("returns controlled error when document is missing", async () => {
  const supabase = {
    from() {
      return {
        select() {
          return this;
        },
        eq() {
          return this;
        },
        maybeSingle() {
          return Promise.resolve({ data: null, error: null });
        },
      };
    },
  };

  const detail = await loadOperationalDocumentDetail(supabase as never, "doc-1");

  assert.equal(detail.document, null);
  assert.match(detail.error ?? "", /no encontrado/);
});
