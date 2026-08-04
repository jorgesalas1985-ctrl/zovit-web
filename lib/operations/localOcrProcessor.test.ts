import assert from "node:assert/strict";
import test from "node:test";

import { processDocumentWithLocalOcr } from "@/lib/operations/localOcrProcessor";

function createPdfSupabaseMock() {
  const calls: string[] = [];
  const events: unknown[] = [];

  return {
    calls,
    events,
    supabase: {
      from(table: string) {
        calls.push(table);

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
                  status: "ocr_pending",
                  storage_bucket: "worker-credentials",
                  storage_path: "profile-1/docs/file.pdf",
                  mime_type: "application/pdf",
                  semester_year: 2026,
                  semester: "S2",
                },
                error: null,
              });
            },
            update() {
              return {
                eq() {
                  return Promise.resolve({ error: null });
                },
              };
            },
          };
        }

        return {
          insert(payload: unknown) {
            events.push(payload);
            return {
              select() {
                return {
                  maybeSingle() {
                    return Promise.resolve({
                      data: { id: "event-1" },
                      error: null,
                    });
                  },
                };
              },
            };
          },
        };
      },
    },
  };
}

test("routes PDFs to manual review without running OCR", async () => {
  const mock = createPdfSupabaseMock();
  const result = await processDocumentWithLocalOcr({
    supabase: mock.supabase as never,
    documentId: "doc-1",
    actorId: "admin-1",
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "manual_review_requested");
  assert.equal(result.extract, null);
  assert.equal(result.eventId, "event-1");
  assert.equal((mock.events[0] as Record<string, unknown>).semester_year, 2026);
  assert.equal((mock.events[0] as Record<string, unknown>).semester, "S2");
  assert.deepEqual(mock.calls, [
    "operational_documents",
    "operational_documents",
    "operational_document_events",
  ]);
});
