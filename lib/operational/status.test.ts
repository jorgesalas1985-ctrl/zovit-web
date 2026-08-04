import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateOperationalStatus,
  getSemesterPeriod,
  wasRenewedInCurrentSemester,
} from "./status";

const verifiedBase = {
  identityStatus: "approved" as const,
  identityVerified: true,
  biometricVerified: true,
  documentStatus: "verified" as const,
};

describe("operational status", () => {
  it("maps March to July as first semester", () => {
    assert.deepEqual(getSemesterPeriod(new Date("2026-03-01T12:00:00")), {
      year: 2026,
      code: "S1",
      startsAt: "2026-03-01",
      endsAt: "2026-07-31",
    });
  });

  it("maps August to December as second semester", () => {
    assert.deepEqual(getSemesterPeriod(new Date("2026-12-31T12:00:00")), {
      year: 2026,
      code: "S2",
      startsAt: "2026-08-01",
      endsAt: "2026-12-31",
    });
  });

  it("marks documents as renewed only inside the active semester", () => {
    assert.equal(
      wasRenewedInCurrentSemester("2026-07-15", new Date("2026-07-31T12:00:00")),
      true,
    );
    assert.equal(
      wasRenewedInCurrentSemester("2026-07-15", new Date("2026-08-01T12:00:00")),
      false,
    );
  });

  it("suspends when documents are expired", () => {
    const decision = evaluateOperationalStatus({
      ...verifiedBase,
      documentExpiresAt: "2026-07-31",
      lastDocumentRenewalAt: "2026-07-01",
      now: new Date("2026-08-01T12:00:00"),
    });

    assert.equal(decision.status, "suspendido_por_documentos");
    assert.equal(decision.canAcceptWork, false);
  });

  it("requires semester renewal even when the document is otherwise verified", () => {
    const decision = evaluateOperationalStatus({
      ...verifiedBase,
      lastDocumentRenewalAt: "2026-07-15",
      now: new Date("2026-08-02T12:00:00"),
    });

    assert.equal(decision.status, "pendiente_documentos");
    assert.deepEqual(decision.reasons, ["documents_due_this_semester"]);
  });

  it("allows supervised operation when documents and identity are current", () => {
    const decision = evaluateOperationalStatus({
      ...verifiedBase,
      lastDocumentRenewalAt: "2026-08-15",
      supervisionMode: "required",
      now: new Date("2026-09-01T12:00:00"),
    });

    assert.equal(decision.status, "habilitado_con_supervision");
    assert.equal(decision.canAppearInSearch, true);
    assert.equal(decision.requiresSupervision, true);
  });
});
