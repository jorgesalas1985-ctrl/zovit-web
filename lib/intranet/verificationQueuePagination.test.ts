import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { parseVerificationQueueCursor } from "@/lib/intranet/verificationQueue";

const queue = readFileSync("lib/intranet/verificationQueue.ts", "utf8");
const sql = readFileSync("supabase/SPRINT_45_VERIFICATION_QUEUE_KEYSET.sql", "utf8");

test("accepts a stable timestamp and id cursor", () => {
  assert.deepEqual(
    parseVerificationQueueCursor("2026-09-02T10:00:00.000Z|11111111-1111-1111-1111-111111111111"),
    { submittedAt: "2026-09-02T10:00:00.000Z", id: "11111111-1111-1111-1111-111111111111" },
  );
  assert.equal(parseVerificationQueueCursor("invalid"), null);
});

test("uses keyset ordering and a bounded page instead of offset", () => {
  assert.match(sql, /profiles \(identity_status, identity_submitted_at, id\)/);
  assert.match(queue, /VERIFICATION_QUEUE_PAGE_SIZE = 50/);
  assert.match(queue, /identity_submitted_at\.gt/);
  assert.match(queue, /id\.gt/);
  assert.match(queue, /\.order\("identity_submitted_at"/);
  assert.match(queue, /\.order\("id"/);
  assert.doesNotMatch(queue, /\.range\(/);
});

test("repair reads are constrained to the same page size", () => {
  const limits = queue.match(/\.limit\(VERIFICATION_QUEUE_PAGE_SIZE\)/g) ?? [];
  assert.ok(limits.length >= 3);
});
