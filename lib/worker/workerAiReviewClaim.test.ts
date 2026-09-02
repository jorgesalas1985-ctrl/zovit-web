import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
const sql = readFileSync("supabase/SPRINT_41_WORKER_AI_REVIEW_CLAIM.sql", "utf8");
const batch = readFileSync("lib/worker/processWorkerAiBatch.ts", "utf8");
const apply = readFileSync("lib/worker/applyAiVerdict.ts", "utf8");
test("worker AI claims serialize, expire and verify tokens", () => {
  assert.match(sql,/profile_id uuid primary key/); assert.match(sql,/lease_expires_at > now_ts/); assert.match(sql,/attempt_count=c\.attempt_count\+1/); assert.match(sql,/intranet_assert_worker_ai_review_claim/);
});
test("batch claims before OCR and verdict verifies then completes", () => {
  assert.ok(batch.indexOf('rpc("intranet_claim_worker_ai_review"') < batch.indexOf("processWorkerAiReview(row.profile_id"));
  assert.match(apply,/rpc\("intranet_assert_worker_ai_review_claim"/); assert.match(batch,/rpc\("intranet_complete_worker_ai_review_claim"/);
});
