import assert from "node:assert/strict";
import test from "node:test";

import { prepareDocumentSuspensionEvents } from "@/lib/operations/documentSuspensionPreparation";

const dashboard = {
  period: {
    year: 2026,
    code: "S2" as const,
    startsAt: "2026-08-01",
    endsAt: "2026-12-31",
  },
  totalProfiles: 2,
  complete: 0,
  open: 1,
  dueSoon: 0,
  pendingReview: 0,
  suspensionReady: 1,
  error: null,
  summary: "1 de 2 perfiles estan listos para suspension documental.",
  profiles: [
    {
      profileId: "profile-1",
      displayName: "Ana Perez",
      role: "professional",
      primaryServiceProfile: "technical",
      workerRegistrationStatus: "approved",
      compliance: {
        status: "suspension_ready" as const,
        period: {
          year: 2026,
          code: "S2" as const,
          startsAt: "2026-08-01",
          endsAt: "2026-12-31",
        },
        requiredKinds: ["identity" as const],
        approvedKinds: [],
        missingKinds: ["identity" as const],
        pendingKinds: [],
        rejectedKinds: [],
        expiredKinds: [],
        deadlineAt: "2026-12-31",
        daysUntilDeadline: -10,
        shouldSuspend: true,
        requiresManualReview: false,
        reasons: ["required_documents_missing" as const, "deadline_passed" as const],
        summary: "Cuenta lista para suspension documental.",
      },
    },
  ],
  topProfiles: [],
};

function createSupabaseMock(existingProfileIds: string[] = []) {
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
            eq() {
              return this;
            },
            in() {
              return Promise.resolve({
                data: existingProfileIds.map((profile_id) => ({ profile_id })),
                error: null,
              });
            },
            insert(events: unknown[]) {
              inserts.push(...events);
              return {
                select() {
                  return Promise.resolve({
                    data: [{ id: "event-1" }],
                    error: null,
                  });
                },
              };
            },
          };
        }

        throw new Error(`Unexpected table ${table}`);
      },
    },
  };
}

test("prepares document suspension events for new candidates", async () => {
  const mock = createSupabaseMock();
  const result = await prepareDocumentSuspensionEvents({
    supabase: mock.supabase as never,
    dashboard,
    actorId: "admin-1",
  });

  assert.equal(result.prepared, 1);
  assert.equal(result.skipped, 0);
  assert.deepEqual(result.eventIds, ["event-1"]);
  assert.equal(mock.inserts.length, 1);
  const event = (mock.inserts[0] as Record<string, unknown>[])[0] as Record<string, unknown>;
  assert.equal(event.semester_year, 2026);
  assert.equal(event.semester, "S2");
});

test("skips document suspension events already prepared", async () => {
  const mock = createSupabaseMock(["profile-1"]);
  const result = await prepareDocumentSuspensionEvents({
    supabase: mock.supabase as never,
    dashboard,
  });

  assert.equal(result.prepared, 0);
  assert.equal(result.skipped, 1);
  assert.equal(mock.inserts.length, 0);
});
