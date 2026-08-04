import assert from "node:assert/strict";
import test from "node:test";

import { decideOperationalDocument } from "@/lib/operations/documentManualDecision";

function createDecisionSupabaseMock(status = "needs_manual_review") {
  const updates: unknown[] = [];
  const inserts: unknown[] = [];

  return {
    updates,
    inserts,
    supabase: {
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
                  status,
                  semester_year: 2026,
                  semester: "S2",
                  validation_summary: { source: "local_tesseract" },
                },
                error: null,
              });
            },
            update(payload: unknown) {
              updates.push(payload);
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
                    return Promise.resolve({ data: { id: "event-1" }, error: null });
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

test("approves operational document and creates audit event", async () => {
  const mock = createDecisionSupabaseMock();
  const result = await decideOperationalDocument({
    supabase: mock.supabase as never,
    documentId: "doc-1",
    action: "approve",
    actorId: "admin-1",
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "approved");
  assert.equal(result.eventId, "event-1");
  assert.match(result.summary, /dato estructurado/);
  assert.match(result.actionLabel, /Recalcular cumplimiento/);
  assert.equal(mock.updates.length, 1);
  assert.equal(mock.inserts.length, 1);
  assert.equal((mock.inserts[0] as Record<string, unknown>).semester_year, 2026);
  assert.equal((mock.inserts[0] as Record<string, unknown>).semester, "S2");
});

test("requires reason when rejecting operational document", async () => {
  const mock = createDecisionSupabaseMock();
  const result = await decideOperationalDocument({
    supabase: mock.supabase as never,
    documentId: "doc-1",
    action: "reject",
    actorId: "admin-1",
  });

  assert.equal(result.ok, false);
  assert.match(result.error ?? "", /requiere una razon/);
  assert.match(result.actionLabel, /Revisar error/);
  assert.equal(mock.updates.length, 0);
});

test("rejects operational document and guides replacement", async () => {
  const mock = createDecisionSupabaseMock();
  const result = await decideOperationalDocument({
    supabase: mock.supabase as never,
    documentId: "doc-1",
    action: "reject",
    actorId: "admin-1",
    reason: "Documento ilegible",
  });

  assert.equal(result.ok, true);
  assert.equal(result.status, "rejected");
  assert.match(result.summary, /debe reemplazarlo/);
  assert.match(result.actionLabel, /Esperar reemplazo/);
});

test("does not decide documents already approved", async () => {
  const mock = createDecisionSupabaseMock("approved");
  const result = await decideOperationalDocument({
    supabase: mock.supabase as never,
    documentId: "doc-1",
    action: "approve",
    actorId: "admin-1",
  });

  assert.equal(result.ok, false);
  assert.match(result.error ?? "", /no puede decidirse/);
});
