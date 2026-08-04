import assert from "node:assert/strict";
import test from "node:test";

import { loadDocumentEventInbox } from "@/lib/operations/documentEventInbox";

function eventsQuery(data: unknown[] | null, error: { message: string } | null = null) {
  return {
    select() {
      return this;
    },
    order() {
      return this;
    },
    limit() {
      return this;
    },
    eq() {
      return Promise.resolve({ data, error });
    },
    then(resolve: (value: { data: unknown[] | null; error: { message: string } | null }) => void) {
      resolve({ data, error });
    },
  };
}

function profilesQuery(data: unknown[] | null, error: { message: string } | null = null) {
  return {
    select() {
      return this;
    },
    in() {
      return Promise.resolve({ data, error });
    },
  };
}

test("loads document event inbox with priorities and profile names", async () => {
  const supabase = {
    from(table: string) {
      if (table === "operational_document_events") {
        return eventsQuery([
          {
            id: "event-1",
            document_id: null,
            profile_id: "profile-1",
            event_type: "semester_suspension_ready",
            actor_type: "system",
            summary: "Perfil listo para suspension documental semestral.",
            semester_year: 2026,
            semester: "S2",
            metadata: {},
            created_at: "2027-01-10T10:00:00.000Z",
          },
          {
            id: "event-2",
            document_id: "doc-2",
            profile_id: "profile-2",
            event_type: "semester_renewal_reminder",
            actor_type: "operations",
            summary: "Recordatorio semestral preparado.",
            semester_year: 2026,
            semester: "S2",
            metadata: {},
            created_at: "2027-01-09T10:00:00.000Z",
          },
        ]);
      }

      return profilesQuery([
        { id: "profile-1", first_name: "Ana", last_name: "Perez" },
        { id: "profile-2", first_name: "Luis", last_name: "Rojas" },
      ]);
    },
  };

  const inbox = await loadDocumentEventInbox(supabase as never);

  assert.equal(inbox.total, 2);
  assert.equal(inbox.critical, 1);
  assert.equal(inbox.medium, 1);
  assert.equal(inbox.humanActionRequired, 1);
  assert.equal(inbox.automaticFollowUps, 1);
  assert.equal(inbox.items[0].displayName, "Ana Perez");
  assert.equal(inbox.items[0].priority, "critical");
  assert.equal(inbox.items[0].requiresHumanAction, true);
  assert.match(inbox.items[0].actionLabel, /suspension documental/);
  assert.equal(inbox.items[1].requiresHumanAction, false);
  assert.match(inbox.items[1].actionLabel, /Seguimiento automatico/);
});

test("returns controlled error when event table is unavailable", async () => {
  const supabase = {
    from() {
      return eventsQuery(null, { message: "relation does not exist" });
    },
  };

  const inbox = await loadDocumentEventInbox(supabase as never);

  assert.equal(inbox.total, 0);
  assert.equal(inbox.humanActionRequired, 0);
  assert.match(inbox.error ?? "", /relation does not exist/);
});
