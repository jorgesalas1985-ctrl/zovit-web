import assert from "node:assert/strict";
import test from "node:test";

import {
  closeResolvedDocumentNotifications,
  shouldCloseDocumentNotifications,
} from "@/lib/operations/documentNotificationCleanup";

test("decides when document notifications can be closed", () => {
  assert.equal(shouldCloseDocumentNotifications("complete"), true);
  assert.equal(shouldCloseDocumentNotifications("pending_review"), true);
  assert.equal(shouldCloseDocumentNotifications("due_soon"), false);
  assert.equal(shouldCloseDocumentNotifications("suspension_ready"), false);
});

test("marks unread document notifications as read when compliance is complete", async () => {
  const updates: unknown[] = [];
  const filters: unknown[] = [];
  const supabase = {
    from() {
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
  };

  const result = await closeResolvedDocumentNotifications({
    supabase: supabase as never,
    profileId: "profile-1",
    status: "complete",
    semesterYear: 2026,
    semester: "S2",
    now: new Date("2026-08-20T12:00:00.000Z"),
  });

  assert.equal(result.closed, 2);
  assert.equal(updates.length, 2);
  assert.deepEqual(filters, [{ field: "body", value: "%semestre 2026-S2%" }]);
});

test("does not close notifications while renewal is still due soon", async () => {
  const result = await closeResolvedDocumentNotifications({
    supabase: {} as never,
    profileId: "profile-1",
    status: "due_soon",
  });

  assert.equal(result.checked, 0);
  assert.equal(result.closed, 0);
});
