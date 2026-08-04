import assert from "node:assert/strict";
import test from "node:test";

import { closeResolvedDocumentNotificationsBatch } from "@/lib/operations/documentNotificationCleanupBatch";

function createSupabaseMock() {
  return {
    from(table: string) {
      if (table === "profiles") {
        return {
          select() {
            return this;
          },
          in() {
            return this;
          },
          limit() {
            return Promise.resolve({
              data: [
                {
                  id: "profile-1",
                  first_name: "Ana",
                  last_name: "Perez",
                  role: "professional",
                  primary_service_profile: "technical",
                  worker_registration_status: "approved",
                },
              ],
              error: null,
            });
          },
        };
      }

      if (table === "operational_documents") {
        return {
          select() {
            return this;
          },
          in() {
            return this;
          },
          eq() {
            return this;
          },
          then(resolve: (value: { data: unknown[]; error: null }) => void) {
            resolve({
              data: [
                {
                  id: "doc-1",
                  profile_id: "profile-1",
                  document_kind: "identity",
                  status: "approved",
                  semester_year: 2026,
                  semester: "S2",
                  submitted_at: "2026-08-10T10:00:00.000Z",
                  updated_at: "2026-08-11T10:00:00.000Z",
                },
                {
                  id: "doc-2",
                  profile_id: "profile-1",
                  document_kind: "credential",
                  status: "approved",
                  semester_year: 2026,
                  semester: "S2",
                  submitted_at: "2026-08-10T10:00:00.000Z",
                  updated_at: "2026-08-11T10:00:00.000Z",
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
        is() {
          return this;
        },
        in(field: string) {
          if (field === "title") {
            return Promise.resolve({ data: [{ id: "notification-1" }], error: null });
          }
          return Promise.resolve({ error: null });
        },
        update() {
          return this;
        },
      };
    },
  };
}

test("closes resolved document notifications in batch", async () => {
  const result = await closeResolvedDocumentNotificationsBatch({
    supabase: createSupabaseMock() as never,
    limit: 1,
  });

  assert.equal(result.checkedProfiles, 1);
  assert.equal(result.closed, 1);
  assert.equal(result.failed, 0);
});
