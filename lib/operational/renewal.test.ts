import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideSemesterRenewal } from "./renewal";

describe("semester renewal rules", () => {
  it("marks renewal complete when documents were renewed in the active semester", () => {
    const decision = decideSemesterRenewal({
      documentStatus: "verified",
      lastDocumentRenewalAt: "2026-08-15",
      now: new Date("2026-09-01T12:00:00"),
    });

    assert.equal(decision.status, "complete");
    assert.equal(decision.shouldSuspend, false);
    assert.deepEqual(decision.reasons, ["renewal_current"]);
  });

  it("opens renewal when verified documents were not renewed in the active semester", () => {
    const decision = decideSemesterRenewal({
      documentStatus: "verified",
      lastDocumentRenewalAt: "2026-07-31",
      now: new Date("2026-08-02T12:00:00"),
    });

    assert.equal(decision.status, "open");
    assert.equal(decision.deadlineAt, "2026-12-31");
    assert.equal(decision.actions.includes("open_renewal"), true);
  });

  it("sends reminders near the end of the semester", () => {
    const decision = decideSemesterRenewal({
      documentStatus: "verified",
      lastDocumentRenewalAt: "2026-07-31",
      reminderDaysBeforeDeadline: 30,
      now: new Date("2026-12-10T12:00:00"),
    });

    assert.equal(decision.status, "due_soon");
    assert.equal(decision.actions.includes("send_reminder"), true);
  });

  it("queues manual review when documents are pending", () => {
    const decision = decideSemesterRenewal({
      documentStatus: "pending",
      now: new Date("2026-04-10T12:00:00"),
    });

    assert.equal(decision.status, "submitted");
    assert.equal(decision.requiresManualReview, true);
    assert.equal(decision.actions.includes("request_manual_review"), true);
  });

  it("suspends when documents are rejected", () => {
    const decision = decideSemesterRenewal({
      documentStatus: "rejected",
      now: new Date("2026-09-01T12:00:00"),
    });

    assert.equal(decision.status, "blocked");
    assert.equal(decision.shouldSuspend, true);
  });

  it("detects months outside the operational semester calendar", () => {
    const decision = decideSemesterRenewal({
      documentStatus: "verified",
      lastDocumentRenewalAt: "2025-12-15",
      now: new Date("2026-01-10T12:00:00"),
    });

    assert.equal(decision.status, "out_of_semester");
    assert.deepEqual(decision.actions, ["no_action"]);
  });
});
