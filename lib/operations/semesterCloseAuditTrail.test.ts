import assert from "node:assert/strict";
import test from "node:test";

import type { SemesterCloseActionItem } from "@/lib/operations/semesterCloseActionItems";
import { decideSemesterCloseExecutionPolicy } from "@/lib/operations/semesterCloseExecutionPolicy";
import { buildSemesterCloseAuditTrail } from "@/lib/operations/semesterCloseAuditTrail";

function action(
  partial: Pick<SemesterCloseActionItem, "type" | "owner" | "priority">,
): SemesterCloseActionItem {
  return {
    id: partial.type,
    type: partial.type,
    title: partial.type,
    summary: partial.type,
    priority: partial.priority,
    owner: partial.owner,
    reason: "ready_for_close",
  };
}

test("builds audit events from close execution policy", () => {
  const policy = decideSemesterCloseExecutionPolicy([
    action({ type: "generate_snapshot", owner: "operations", priority: "high" }),
    action({
      type: "request_superadmin_review",
      owner: "superadmin",
      priority: "critical",
    }),
  ]);

  const auditTrail = buildSemesterCloseAuditTrail({
    policy,
    now: new Date("2026-12-31T10:00:00.000Z"),
  });

  assert.equal(auditTrail.events.length, 2);
  assert.equal(auditTrail.preparedCount, 1);
  assert.equal(auditTrail.retainedCount, 1);
  assert.equal(auditTrail.superadminCount, 1);
  assert.equal(auditTrail.events[0]?.createdAt, "2026-12-31T10:00:00.000Z");
  assert.deepEqual(
    auditTrail.events.map((event) => event.eventType),
    ["close_action_prepared", "close_action_retained_superadmin"],
  );
});
