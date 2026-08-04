import assert from "node:assert/strict";
import test from "node:test";

import type { SemesterCloseActionItem } from "@/lib/operations/semesterCloseActionItems";
import { decideSemesterCloseExecutionPolicy } from "@/lib/operations/semesterCloseExecutionPolicy";

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

test("retains superadmin actions for approval", () => {
  const policy = decideSemesterCloseExecutionPolicy([
    action({
      type: "request_superadmin_review",
      owner: "superadmin",
      priority: "critical",
    }),
  ]);

  assert.equal(policy.superadminCount, 1);
  assert.equal(policy.items[0]?.status, "requires_superadmin_approval");
  assert.equal(policy.items[0]?.canExecuteAutomatically, false);
});

test("separates preparation actions from manual resolution", () => {
  const policy = decideSemesterCloseExecutionPolicy([
    action({ type: "generate_snapshot", owner: "operations", priority: "high" }),
    action({ type: "resolve_critical_items", owner: "operations", priority: "critical" }),
  ]);

  assert.equal(policy.preparationCount, 1);
  assert.equal(policy.manualCount, 1);
  assert.equal(policy.superadminCount, 0);
  assert.deepEqual(
    policy.items.map((item) => item.status),
    ["ready_for_preparation", "requires_manual_action"],
  );
});
