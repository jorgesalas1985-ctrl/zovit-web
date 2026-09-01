import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/SPRINT_31_INTRANET_IDENTITY_RESUBMISSION_RPC_RESULT.sql"),
  "utf8",
);

test("identity resubmission RPC authorizes only the authenticated intranet reviewer", () => {
  assert.match(migration, /actor_id uuid := auth\.uid\(\)/);
  assert.match(migration, /actor_id is null[\s\S]*raise exception 'Acceso no autorizado'/);
  assert.match(migration, /actor_intranet_role, ''\) not in \('hr_admin', 'super_admin'\)/);
  assert.match(migration, /grant execute on function public\.intranet_request_identity_resubmission\(uuid, uuid\[\], text\) to authenticated/);
  assert.doesNotMatch(migration, /to service_role/);
});

test("identity resubmission RPC rejects invalid states and foreign documents before writes", () => {
  assert.match(migration, /where id = p_profile_id[\s\S]*for update/);
  assert.match(migration, /target_identity_status <> 'pending'/);
  assert.match(migration, /profile_id = p_profile_id[\s\S]*id = any\(p_document_ids\)[\s\S]*for update/);
  assert.match(migration, /owned_document_count <> requested_document_count[\s\S]*no pertenecen a esta identidad/);
});

test("identity resubmission RPC writes documents, profile, and notification in one transactional function", () => {
  assert.match(migration, /language plpgsql[\s\S]*security definer[\s\S]*as \$\$/);
  assert.match(migration, /update public\.identity_documents[\s\S]*get diagnostics updated_document_count = row_count/);
  assert.match(migration, /updated_document_count <> requested_document_count[\s\S]*raise exception/);
  assert.match(migration, /update public\.profiles[\s\S]*get diagnostics updated_profile_count = row_count/);
  assert.match(migration, /updated_profile_count <> 1[\s\S]*raise exception/);
  assert.match(migration, /insert into public\.notifications/);
  assert.ok(
    migration.indexOf("update public.identity_documents") < migration.indexOf("update public.profiles")
      && migration.indexOf("update public.profiles") < migration.indexOf("insert into public.notifications"),
  );
});
