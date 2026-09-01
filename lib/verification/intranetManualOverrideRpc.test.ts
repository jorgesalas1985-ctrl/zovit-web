import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migration = readFileSync(resolve(process.cwd(), "supabase/SPRINT_34_INTRANET_MANUAL_OVERRIDE_OWNER_RPC.sql"), "utf8");

test("manual-override owner configuration is private and never versioned with an owner UUID", () => {
  assert.match(migration, /create table if not exists public\.intranet_owner_config/);
  assert.match(migration, /owner_user_id uuid not null/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /revoke all privileges on table public\.intranet_owner_config from anon/);
  assert.match(migration, /revoke all privileges on table public\.intranet_owner_config from authenticated/);
  assert.doesNotMatch(migration, /UUID_REAL_DEL_OWNER|ZOVIT_OWNER_USER_ID|NEXT_PUBLIC|[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i);
});

test("manual-override RPC requires the configured owner and super-admin role", () => {
  assert.match(migration, /actor_id uuid := auth\.uid\(\)/);
  assert.match(migration, /from public\.intranet_owner_config[\s\S]*where singleton = true/);
  assert.match(migration, /actor_id <> configured_owner_id/);
  assert.match(migration, /actor_intranet_role <> 'super_admin'/);
  assert.match(migration, /grant execute on function public\.intranet_manual_override_identity_verification\(uuid, text\) to authenticated/);
  assert.doesNotMatch(migration, /to service_role/);
});

test("manual-override validates confirmation, safe state, protected target, and atomic writes", () => {
  assert.match(migration, /p_confirmation <> 'APROBAR SIN VERIFICACION'/);
  assert.match(migration, /target_intranet_role = 'super_admin'/);
  assert.match(migration, /target_identity_status <> 'pending'/);
  assert.match(migration, /update public\.profiles[\s\S]*get diagnostics updated_profile_count = row_count/);
  assert.match(migration, /update public\.identity_documents[\s\S]*reviewed_by = actor_id/);
  assert.match(migration, /insert into public\.intranet_identity_manual_override_audit/);
  assert.ok(migration.indexOf("update public.profiles") < migration.indexOf("update public.identity_documents"));
  assert.ok(migration.indexOf("update public.identity_documents") < migration.indexOf("insert into public.intranet_identity_manual_override_audit"));
});
