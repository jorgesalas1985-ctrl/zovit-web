import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
const sql = readFileSync(resolve(process.cwd(), "supabase/SPRINT_33_INTRANET_RETURN_TO_REVIEW_RPC.sql"), "utf8");
test("return-to-review RPC authorizes and atomically resets only approved identities", () => {
  assert.match(sql, /auth\.uid\(\)/); assert.match(sql, /'hr_admin', 'super_admin'/);
  assert.match(sql, /identity_status = 'approved'/); assert.match(sql, /update public\.identity_documents/);
  assert.match(sql, /not found then raise exception 'La identidad ya no está aprobada'/);
  assert.match(sql, /to authenticated/); assert.doesNotMatch(sql, /to service_role/);
});
