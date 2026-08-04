import assert from "node:assert/strict";
import test from "node:test";

import { loadDocumentComplianceDashboard } from "@/lib/operations/documentComplianceDashboard";

function profileQuery(data: unknown[] | null, error: { message: string } | null = null) {
  return {
    select() {
      return this;
    },
    in() {
      return this;
    },
    limit() {
      return Promise.resolve({ data, error });
    },
  };
}

function documentQuery(data: unknown[] | null, error: { message: string } | null = null) {
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
    then(resolve: (value: { data: unknown[] | null; error: { message: string } | null }) => void) {
      resolve({ data, error });
    },
  };
}

test("builds document compliance dashboard including profiles with missing documents", async () => {
  const supabase = {
    from(table: string) {
      if (table === "profiles") {
        return profileQuery([
          {
            id: "profile-1",
            first_name: "Ana",
            last_name: "Perez",
            role: "professional",
            primary_service_profile: "technical",
            worker_registration_status: "approved",
          },
          {
            id: "profile-2",
            first_name: "Luis",
            last_name: "Rojas",
            role: "professional",
            primary_service_profile: "technical",
            worker_registration_status: "approved",
          },
        ]);
      }

      return documentQuery([
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
      ]);
    },
  };

  const dashboard = await loadDocumentComplianceDashboard(supabase as never, {
    now: new Date("2026-08-20T12:00:00"),
  });

  assert.equal(dashboard.totalProfiles, 2);
  assert.equal(dashboard.complete, 1);
  assert.equal(dashboard.open, 1);
  assert.equal(dashboard.profiles.length, 2);
  assert.equal(dashboard.profiles[0].displayName, "Luis Rojas");
  assert.equal(dashboard.topProfiles[0].displayName, "Luis Rojas");
});

test("returns controlled error when operational documents are unavailable", async () => {
  const supabase = {
    from(table: string) {
      if (table === "profiles") {
        return profileQuery([
          {
            id: "profile-1",
            first_name: "Ana",
            last_name: "Perez",
            role: "professional",
            primary_service_profile: "technical",
            worker_registration_status: "approved",
          },
        ]);
      }

      return documentQuery(null, { message: "relation does not exist" });
    },
  };

  const dashboard = await loadDocumentComplianceDashboard(supabase as never);

  assert.equal(dashboard.totalProfiles, 0);
  assert.equal(dashboard.profiles.length, 0);
  assert.equal(dashboard.topProfiles.length, 0);
  assert.match(dashboard.error ?? "", /relation does not exist/);
});
