import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { evaluateWorkerOperationalStatus } from "./worker";

describe("worker operational status", () => {
  it("requires supervision for in-training profiles with current documents", () => {
    const decision = evaluateWorkerOperationalStatus({
      workerStatus: "verified",
      primaryProfile: "in_training",
      reviewedAt: "2026-08-20",
      now: new Date("2026-09-01T12:00:00"),
    });

    assert.equal(decision.status, "habilitado_con_supervision");
    assert.equal(decision.requiresSupervision, true);
  });

  it("suspends workers with expired credentials", () => {
    const decision = evaluateWorkerOperationalStatus({
      workerStatus: "verified",
      primaryProfile: "certified",
      reviewedAt: "2026-08-20",
      credentials: [{ status: "verified", expiresAt: "2026-08-31" }],
      now: new Date("2026-09-01T12:00:00"),
    });

    assert.equal(decision.status, "suspendido_por_documentos");
    assert.equal(decision.canAppearInSearch, false);
  });

  it("keeps pending credentials in manual review", () => {
    const decision = evaluateWorkerOperationalStatus({
      workerStatus: "submitted",
      primaryProfile: "experience_verified",
      credentials: [{ status: "pending", updatedAt: "2026-08-20" }],
      now: new Date("2026-09-01T12:00:00"),
    });

    assert.equal(decision.status, "pendiente_revision");
    assert.equal(decision.requiresManualReview, true);
  });
});
