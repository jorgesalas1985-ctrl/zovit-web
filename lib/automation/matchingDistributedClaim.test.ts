import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const sql = readFileSync("supabase/SPRINT_37_AUTO_MATCH_DISTRIBUTED_CLAIM.sql", "utf8");
const source = readFileSync("lib/automation/inviteProfessionals.ts", "utf8");

test("matching claim serializes concurrent callers and recovers expired leases", () => {
  assert.match(sql, /request_auto_match_claims/);
  assert.match(sql, /for update/);
  assert.match(sql, /claim_row\.lease_expires_at > now_ts/);
  assert.match(sql, /now_ts \+ interval '5 minutes'/);
  assert.match(sql, /attempt_count = c\.attempt_count \+ 1/);
});

test("complete is transactional and invitations are idempotent", () => {
  assert.match(sql, /primary key \(request_id, recipient_id, delivery_kind\)/);
  assert.match(sql, /on conflict do nothing/);
  assert.match(sql, /insert into public\.notifications/);
  assert.match(sql, /update public\.solicitudes_de_servicio set auto_matched_at = now_ts/);
  assert.ok(sql.indexOf("insert into public.notifications") < sql.indexOf("auto_matched_at = now_ts"));
});

test("TypeScript uses claim before candidate calculation and RPC completion", () => {
  assert.match(source, /rpc\("intranet_claim_request_auto_match"/);
  assert.match(source, /rpc\("intranet_complete_request_auto_match"/);
  assert.doesNotMatch(source, /from\("notifications"\)\.insert/);
  assert.doesNotMatch(source, /update\(\{ auto_matched_at/);
});
