import assert from "node:assert/strict";
import test from "node:test";

import { runDocumentDecisionEffects } from "@/lib/operations/documentDecisionEffects";

function createSupabaseMock(options?: { documentError?: string }) {
  const updates: unknown[] = [];
  const filters: unknown[] = [];
  const events: unknown[] = [];

  return {
    updates,
    filters,
    events,
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
            then(resolve: (value: { data: unknown[] | null; error: { message: string } | null }) => void) {
              resolve({
                data: options?.documentError
                  ? null
                  : [
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
                    ],
                error: options?.documentError ? { message: options.documentError } : null,
              });
            },
          };
        }

        if (table === "operational_document_events") {
          return {
            insert(payload: unknown) {
              events.push(payload);
              return {
                select() {
                  return {
                    maybeSingle() {
                      return Promise.resolve({ data: { id: "event-sync-1" }, error: null });
                    },
                  };
                },
              };
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
          is() {
            return this;
          },
          ilike(field: string, value: string) {
            filters.push({ field, value });
            return this;
          },
          in(field: string, values: unknown[]) {
            if (field === "title") {
              return Promise.resolve({
                data: [{ id: "notification-1" }, { id: "notification-2" }],
                error: null,
              });
            }

            updates.push(values);
            return Promise.resolve({ error: null });
          },
          update(payload: unknown) {
            updates.push(payload);
            return this;
          },
        };
      },
    },
  };
}

test("runs document decision effects and closes resolved notifications", async () => {
  const mock = createSupabaseMock();
  const result = await runDocumentDecisionEffects({
    supabase: mock.supabase as never,
    profileId: "profile-1",
  });

  assert.equal(result.complianceStatus, "complete");
  assert.equal(result.notificationsClosed, 2);
  assert.equal(result.eventId, null);
  assert.equal(result.error, null);
  assert.match(result.summary, /2 aviso/);
  assert.deepEqual(mock.filters, [{ field: "body", value: "%semestre 2026-S2%" }]);
  assert.equal(mock.events.length, 0);
});

test("returns controlled effect error when compliance cannot be loaded", async () => {
  const mock = createSupabaseMock({ documentError: "relation does not exist" });
  const result = await runDocumentDecisionEffects({
    supabase: mock.supabase as never,
    profileId: "profile-1",
    documentId: "doc-1",
    actorId: "admin-1",
    actorType: "operations",
  });

  assert.equal(result.notificationsClosed, 0);
  assert.equal(result.eventId, "event-sync-1");
  assert.match(result.error ?? "", /relation does not exist/);
  assert.equal((mock.events[0] as Record<string, unknown>).event_type, "post_decision_sync_failed");
  assert.equal((mock.events[0] as Record<string, unknown>).document_id, "doc-1");
  assert.equal((mock.events[0] as Record<string, unknown>).actor_id, "admin-1");
});
