import assert from "node:assert/strict";
import test from "node:test";

import { summarizeSemesterCloseActions } from "@/lib/operations/semesterCloseActionSummary";
import type { SemesterCloseActionItem } from "@/lib/operations/semesterCloseActionItems";

function action(
  partial: Pick<SemesterCloseActionItem, "type" | "priority" | "owner">,
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

test("summarizes actions by priority and owner", () => {
  const summary = summarizeSemesterCloseActions([
    action({ type: "resolve_critical_items", priority: "critical", owner: "operations" }),
    action({ type: "request_superadmin_review", priority: "critical", owner: "superadmin" }),
    action({ type: "document_observations", priority: "medium", owner: "operations" }),
  ]);

  assert.equal(summary.total, 3);
  assert.equal(summary.byPriority.critical, 2);
  assert.equal(summary.byPriority.medium, 1);
  assert.equal(summary.byOwner.operations, 2);
  assert.equal(summary.byOwner.superadmin, 1);
  assert.equal(summary.highestPriority, "critical");
  assert.equal(summary.summary, "2 accion critica debe resolverse antes de cerrar.");
});

test("summarizes clean close action", () => {
  const summary = summarizeSemesterCloseActions([
    action({ type: "finalize_semester_close", priority: "low", owner: "operations" }),
  ]);

  assert.equal(summary.total, 1);
  assert.equal(summary.highestPriority, "low");
  assert.equal(summary.summary, "1 accion recomendada permite preparar el cierre.");
});
