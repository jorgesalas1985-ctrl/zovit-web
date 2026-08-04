import assert from "node:assert/strict";
import test from "node:test";

import { createDocumentEventNotifications } from "@/lib/operations/documentNotificationBridge";

function createSupabaseMock(options?: { existing?: boolean }) {
  const inserts: unknown[] = [];

  return {
    inserts,
    supabase: {
      from(table: string) {
        if (table === "operational_document_events") {
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
              return Promise.resolve({
                data: [
                  {
                    id: "event-1",
                    profile_id: "profile-1",
                    event_type: "semester_renewal_reminder",
                    summary: "Recordatorio preparado.",
                    semester_year: 2026,
                    semester: "S2",
                    metadata: {
                      deadlineAt: "2026-12-31",
                      missingKinds: ["identity"],
                    },
                    created_at: "2026-12-10T10:00:00.000Z",
                  },
                ],
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
          ilike() {
            return this;
          },
          limit() {
            return Promise.resolve({
              data: options?.existing ? [{ id: "notification-old" }] : [],
              error: null,
            });
          },
          insert(payload: unknown) {
            inserts.push(payload);
            return {
              select() {
                return {
                  maybeSingle() {
                    return Promise.resolve({
                      data: { id: "notification-1" },
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

test("creates in-app notification from document reminder event", async () => {
  const mock = createSupabaseMock();
  const result = await createDocumentEventNotifications({
    supabase: mock.supabase as never,
  });

  assert.equal(result.checked, 1);
  assert.equal(result.created, 1);
  assert.deepEqual(result.notificationIds, ["notification-1"]);
  assert.equal(mock.inserts.length, 1);
  assert.equal("semesterYear" in (mock.inserts[0] as Record<string, unknown>), false);
  assert.equal("semester" in (mock.inserts[0] as Record<string, unknown>), false);
});

test("skips notification when same title and body already exist", async () => {
  const mock = createSupabaseMock({ existing: true });
  const result = await createDocumentEventNotifications({
    supabase: mock.supabase as never,
  });

  assert.equal(result.created, 0);
  assert.equal(result.skipped, 1);
  assert.equal(mock.inserts.length, 0);
});
