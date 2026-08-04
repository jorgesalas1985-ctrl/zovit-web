import assert from "node:assert/strict";
import test from "node:test";

import { prepareDocumentRenewalReminderEvents } from "@/lib/operations/documentRenewalReminderPreparation";

const dashboard = {
  period: {
    year: 2026,
    code: "S2" as const,
    startsAt: "2026-08-01",
    endsAt: "2026-12-31",
  },
  totalProfiles: 1,
  complete: 0,
  open: 0,
  dueSoon: 1,
  pendingReview: 0,
  suspensionReady: 0,
  error: null,
  summary: "Cumplimiento documental evaluado para 1 perfiles.",
  profiles: [
    {
      profileId: "profile-1",
      displayName: "Ana Perez",
      role: "professional",
      primaryServiceProfile: "technical",
      workerRegistrationStatus: "approved",
      compliance: {
        status: "due_soon" as const,
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
        daysUntilDeadline: 10,
        shouldSuspend: false,
        requiresManualReview: false,
        reasons: ["required_documents_missing" as const, "required_documents_due_soon" as const],
        summary: "Plazo documental semestral proximo a vencer.",
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
        if (table !== "operational_document_events") {
          throw new Error(`Unexpected table ${table}`);
        }

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
                return Promise.resolve({ data: [{ id: "event-1" }], error: null });
              },
            };
          },
        };
      },
    },
  };
}

test("prepares renewal reminder events for due soon profiles", async () => {
  const mock = createSupabaseMock();
  const result = await prepareDocumentRenewalReminderEvents({
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

test("skips reminder events already prepared", async () => {
  const mock = createSupabaseMock(["profile-1"]);
  const result = await prepareDocumentRenewalReminderEvents({
    supabase: mock.supabase as never,
    dashboard,
  });

  assert.equal(result.prepared, 0);
  assert.equal(result.skipped, 1);
  assert.equal(mock.inserts.length, 0);
});
