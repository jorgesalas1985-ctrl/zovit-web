import assert from "node:assert/strict";
import test from "node:test";

import { loadLocalOcrQueue } from "@/lib/operations/localOcrQueue";

function queryResult(data: unknown[] | null, error: { message: string } | null = null) {
  return {
    select() {
      return this;
    },
    in() {
      return this;
    },
    order() {
      return this;
    },
    limit() {
      return Promise.resolve({ data, error });
    },
  };
}

test("loads and prioritizes local OCR queue", async () => {
  const supabase = {
    from() {
      return queryResult([
        {
          id: "doc-1",
          profile_id: "profile-1",
          document_kind: "credential",
          status: "submitted",
          storage_bucket: "worker-credentials",
          storage_path: "a.pdf",
          mime_type: "application/pdf",
          semester_year: 2026,
          semester: "S2",
          submitted_at: "2026-08-10T10:00:00.000Z",
        },
        {
          id: "doc-2",
          profile_id: "profile-2",
          document_kind: "identity",
          status: "submitted",
          storage_bucket: "worker-credentials",
          storage_path: "b.jpg",
          mime_type: "image/jpeg",
          semester_year: 2026,
          semester: "S2",
          submitted_at: "2026-08-11T10:00:00.000Z",
        },
        {
          id: "doc-3",
          profile_id: "profile-3",
          document_kind: "background",
          status: "needs_manual_review",
          storage_bucket: "worker-credentials",
          storage_path: "c.pdf",
          mime_type: "application/pdf",
          semester_year: 2026,
          semester: "S2",
          submitted_at: "2026-08-12T10:00:00.000Z",
        },
        {
          id: "doc-4",
          profile_id: "profile-4",
          document_kind: "credential",
          status: "ocr_completed",
          storage_bucket: "worker-credentials",
          storage_path: "d.jpg",
          mime_type: "image/jpeg",
          semester_year: 2026,
          semester: "S2",
          submitted_at: "2026-08-09T10:00:00.000Z",
        },
      ]);
    },
  };

  const queue = await loadLocalOcrQueue(supabase as never);

  assert.equal(queue.total, 4);
  assert.equal(queue.critical, 1);
  assert.equal(queue.high, 2);
  assert.equal(queue.medium, 1);
  assert.equal(queue.humanActionRequired, 2);
  assert.equal(queue.automaticCandidates, 2);
  assert.deepEqual(
    queue.items.map((item) => item.documentId),
    ["doc-3", "doc-4", "doc-2", "doc-1"],
  );
  assert.match(queue.items[0]?.actionLabel ?? "", /revisar manualmente/);
  assert.equal(queue.items[0]?.requiresHumanAction, true);
  assert.match(queue.items[2]?.actionLabel ?? "", /OCR local/);
});

test("returns controlled error when document table is unavailable", async () => {
  const supabase = {
    from() {
      return queryResult(null, { message: "relation does not exist" });
    },
  };

  const queue = await loadLocalOcrQueue(supabase as never);

  assert.equal(queue.total, 0);
  assert.equal(queue.humanActionRequired, 0);
  assert.match(queue.error ?? "", /relation does not exist/);
});
