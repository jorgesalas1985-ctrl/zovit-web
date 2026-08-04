import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildOperationalAuditTrail } from "./auditTrail";
import type { ExecutionPolicyDecision } from "./executionPolicy";

const emptyPolicy: ExecutionPolicyDecision = {
  items: [],
  executableCount: 0,
  blockedCount: 0,
  manualCount: 0,
  superadminApprovalCount: 0,
  summary: "Sin acciones.",
};

describe("operational audit trail", () => {
  it("creates a ready event for executable actions", () => {
    const trail = buildOperationalAuditTrail({
      policy: {
        ...emptyPolicy,
        items: [
          {
            queueItemId: "profile-1:document-renewal",
            mode: "automatic",
            kind: "send_document_reminder",
            title: "Enviar recordatorio",
            summary: "Automatico.",
            status: "executable",
            canExecuteNow: true,
            reasons: ["automatic_action_allowed"],
          },
        ],
      },
      now: new Date("2026-08-01T12:00:00Z"),
    });

    assert.equal(trail.readyCount, 1);
    assert.equal(trail.events[0]?.eventType, "action_ready");
    assert.equal(trail.events[0]?.actorType, "system");
    assert.equal(trail.events[0]?.createdAt, "2026-08-01T12:00:00.000Z");
  });

  it("creates a manual retained event for manual actions", () => {
    const trail = buildOperationalAuditTrail({
      policy: {
        ...emptyPolicy,
        items: [
          {
            queueItemId: "profile-1:manual-document-review",
            mode: "manual",
            kind: "review_documents",
            title: "Revisar documentos",
            summary: "Manual.",
            status: "requires_manual_action",
            canExecuteNow: false,
            reasons: ["manual_action_required"],
          },
        ],
      },
    });

    assert.equal(trail.retainedCount, 1);
    assert.equal(trail.events[0]?.eventType, "action_retained_manual");
    assert.equal(trail.events[0]?.actorType, "human");
  });

  it("creates a superadmin retained event for sensitive actions", () => {
    const trail = buildOperationalAuditTrail({
      policy: {
        ...emptyPolicy,
        items: [
          {
            queueItemId: "profile-1:sensitive-automation",
            mode: "superadmin_approval",
            kind: "approve_sensitive_automation",
            title: "Aprobar automatizacion",
            summary: "Sensible.",
            status: "requires_superadmin_approval",
            canExecuteNow: false,
            reasons: ["superadmin_approval_required"],
          },
        ],
      },
    });

    assert.equal(trail.retainedCount, 1);
    assert.equal(trail.events[0]?.eventType, "action_retained_superadmin");
    assert.equal(trail.events[0]?.actorType, "superadmin");
  });

  it("keeps policy metadata on blocked events", () => {
    const trail = buildOperationalAuditTrail({
      policy: {
        ...emptyPolicy,
        items: [
          {
            queueItemId: "profile-1:blocked",
            mode: "automatic",
            kind: "suspend_for_documents",
            title: "Suspender",
            summary: "Bloqueado.",
            status: "blocked",
            canExecuteNow: false,
            reasons: ["action_blocked"],
          },
        ],
      },
    });

    assert.equal(trail.blockedCount, 1);
    assert.equal(trail.events[0]?.metadata.status, "blocked");
    assert.deepEqual(trail.events[0]?.metadata.reasons, ["action_blocked"]);
  });
});
