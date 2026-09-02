import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const sql = readFileSync("supabase/SPRINT_42_IDENTITY_AI_REVIEW_CLAIM.sql", "utf8");
const process = readFileSync("lib/verification/processIdentityAiReview.ts", "utf8");
const apply = readFileSync("lib/verification/applyIdentityAiVerdict.ts", "utf8");

test("identity AI claim serializes work and recovers expired leases", () => {
  assert.match(sql, /intranet_identity_ai_review_claims/);
  assert.match(sql, /status in \('claimed', 'completed'\)/);
  assert.match(sql, /existing_status = 'claimed' and existing_lease > now_ts/);
  assert.match(sql, /lease_expires_at = now_ts \+ interval '10 minutes'/);
});

test("only a valid automation claim can persist verdict metadata", () => {
  assert.match(sql, /claim_status <> 'claimed' or claim_lease <= now\(\)/);
  assert.match(sql, /p_document_metadata jsonb/);
  assert.match(sql, /jsonb_each\(coalesce\(p_document_metadata/);
  assert.match(apply, /intranet_apply_identity_ai_verdict_automation_claimed/);
  assert.match(process, /rpc\("intranet_claim_identity_ai_review"/);
  assert.match(process, /claimToken/);
});

test("automatic processing claims before OCR while human reviews keep their existing RPC", () => {
  assert.ok(process.indexOf('rpc("intranet_claim_identity_ai_review"') < process.indexOf("processIdentityAiReview(row.id, actor, claimToken)"));
  assert.match(apply, /intranet_apply_identity_ai_verdict_human/);
  assert.match(process, /intranet_fail_identity_ai_review_claim/);
});
