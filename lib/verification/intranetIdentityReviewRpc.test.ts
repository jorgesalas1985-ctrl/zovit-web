import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migration = readFileSync(resolve(process.cwd(), "supabase/SPRINT_32_INTRANET_IDENTITY_REVIEW_RPC.sql"), "utf8");

test("identity review RPC accepts only authenticated HR or super-admin reviewers", () => {
  assert.match(migration, /actor_id uuid := auth\.uid\(\)/);
  assert.match(migration, /not in \('hr_admin', 'super_admin'\)/);
  assert.match(migration, /to authenticated/);
  assert.doesNotMatch(migration, /to service_role/);
});

test("identity review RPC rejects invalid states and invalid review inputs before writes", () => {
  assert.match(migration, /p_action not in \('approve', 'reject'\)/);
  assert.match(migration, /p_action = 'approve' and not p_carnet_birth_matches/);
  assert.match(migration, /p_action = 'approve' and not p_biometric_face_matches/);
  assert.match(migration, /p_action = 'reject' and rejection_reason is null/);
  assert.match(migration, /target_identity_status <> 'pending'/);
});

test("identity review RPC blocks rejecting a super-admin target", () => {
  assert.match(migration, /p_action = 'reject' and target_intranet_role = 'super_admin'/);
});

test("identity review RPC atomically writes approval or rejection with reviewer audit fields", () => {
  assert.match(migration, /language plpgsql[\s\S]*security definer[\s\S]*as \$\$/);
  assert.match(migration, /update public\.profiles[\s\S]*get diagnostics updated_profile_count = row_count/);
  assert.match(migration, /update public\.identity_documents[\s\S]*reviewed_by = actor_id[\s\S]*reviewed_at = now_ts/);
  assert.ok(migration.indexOf("update public.profiles") < migration.indexOf("update public.identity_documents"));
});
