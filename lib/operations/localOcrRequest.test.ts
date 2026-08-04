import assert from "node:assert/strict";
import test from "node:test";

import { requestLocalOcrForDocument } from "@/lib/operations/localOcrRequest";

function createSupabaseMock(documentStatus = "submitted") {
  const calls: string[] = [];
  const inserts: unknown[] = [];

  return {
    calls,
    inserts,
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
                  status: documentStatus,
                  storage_bucket: "worker-credentials",
                  storage_path: "profile-1/docs/file.pdf",
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
            inserts.push(payload);
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

test("requests local OCR and records event", async () => {
  const mock = createSupabaseMock();
  const result = await requestLocalOcrForDocument({
    supabase: mock.supabase as never,
    documentId: "doc-1",
    actorId: "admin-1",
    actorType: "operations",
  });

  assert.equal(result.ok, true);
  assert.equal(result.document?.status, "ocr_pending");
  assert.equal(result.eventId, "event-1");
  assert.equal((mock.inserts[0] as Record<string, unknown>).semester_year, 2026);
  assert.equal((mock.inserts[0] as Record<string, unknown>).semester, "S2");
  assert.deepEqual(mock.calls, [
    "operational_documents",
    "operational_documents",
    "operational_document_events",
  ]);
});

test("rejects OCR request from terminal document status", async () => {
  const mock = createSupabaseMock("approved");
  const result = await requestLocalOcrForDocument({
    supabase: mock.supabase as never,
    documentId: "doc-1",
  });

  assert.equal(result.ok, false);
  assert.match(result.error ?? "", /no puede pasar a OCR/);
});
