import assert from "node:assert/strict";
import test from "node:test";

import { loadOwnDocumentCompliance } from "@/lib/operations/ownDocumentCompliance";

function queryResult(data: unknown[] | null, error: { message: string } | null = null) {
  return {
    select() {
      return this;
    },
    eq() {
      return this;
    },
    then(resolve: (value: { data: unknown[] | null; error: { message: string } | null }) => void) {
      resolve({ data, error });
    },
  };
}

test("loads own document compliance for current semester", async () => {
  const supabase = {
    from() {
      return queryResult([
        {
          id: "doc-1",
          document_kind: "identity",
          status: "approved",
          semester_year: 2026,
          semester: "S2",
          submitted_at: "2026-08-10T10:00:00.000Z",
          updated_at: "2026-08-10T10:00:00.000Z",
        },
        {
          id: "doc-2",
          document_kind: "credential",
          status: "approved",
          semester_year: 2026,
          semester: "S2",
          submitted_at: "2026-08-10T10:00:00.000Z",
          updated_at: "2026-08-10T10:00:00.000Z",
        },
      ]);
    },
  };

  const result = await loadOwnDocumentCompliance({
    supabase: supabase as never,
    profileId: "profile-1",
    now: new Date("2026-08-20T12:00:00"),
  });

  assert.equal(result.error, null);
  assert.equal(result.compliance.status, "complete");
  assert.equal(result.nextStep, "none");
  assert.match(result.actionLabel, /completos/);
});

test("guides user to wait when documents are pending review", async () => {
  const supabase = {
    from() {
      return queryResult([
        {
          id: "doc-1",
          document_kind: "identity",
          status: "pending_review",
          semester_year: 2026,
          semester: "S2",
          submitted_at: "2026-08-10T10:00:00.000Z",
          updated_at: "2026-08-10T10:00:00.000Z",
        },
        {
          id: "doc-2",
          document_kind: "credential",
          status: "pending_review",
          semester_year: 2026,
          semester: "S2",
          submitted_at: "2026-08-10T10:00:00.000Z",
          updated_at: "2026-08-10T10:00:00.000Z",
        },
      ]);
    },
  };

  const result = await loadOwnDocumentCompliance({
    supabase: supabase as never,
    profileId: "profile-1",
    now: new Date("2026-08-20T12:00:00"),
  });

  assert.equal(result.compliance.status, "pending_review");
  assert.equal(result.nextStep, "wait_review");
  assert.match(result.actionLabel, /esperando revision/);
});

test("returns controlled error when document table is unavailable", async () => {
  const supabase = {
    from() {
      return queryResult(null, { message: "relation does not exist" });
    },
  };

  const result = await loadOwnDocumentCompliance({
    supabase: supabase as never,
    profileId: "profile-1",
  });

  assert.match(result.error ?? "", /relation does not exist/);
  assert.equal(result.nextStep, "upload_documents");
});
