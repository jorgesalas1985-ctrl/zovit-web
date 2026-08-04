import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideResponsibleMatch, rankResponsibleMatches } from "./responsibleMatching";
import type { ResponsibleMatchCandidate, ResponsibleMatchRequest } from "./types";

const request: ResponsibleMatchRequest = {
  serviceId: "digital-help",
  requiredCompetencyIds: ["digital-basic-support"],
  riskLevel: "low",
  requiresCertification: false,
  allowsSupervisedWork: true,
};

const candidate: ResponsibleMatchCandidate = {
  profileId: "candidate-1",
  displayName: "Persona ZOVIT",
  distanceKm: 4,
  rating: 4.9,
  completedJobs: 12,
  competencyIds: ["digital-basic-support"],
  certificationIds: [],
  scopes: ["autonomous_work", "low_risk"],
  operational: {
    status: "habilitado",
    canAppearInSearch: true,
    canAcceptWork: true,
    requiresManualReview: false,
    requiresSupervision: false,
    semester: { year: 2026, code: "S2", startsAt: "2026-08-01", endsAt: "2026-12-31" },
    reasons: ["ready"],
  },
  automation: {
    signals: ["ready_for_low_risk_work"],
    suggestedActions: ["allow_low_risk_matching"],
    requiresHumanApproval: false,
    summary: "Listo para bajo riesgo.",
  },
};

describe("responsible matching", () => {
  it("accepts eligible low-risk candidates", () => {
    const decision = decideResponsibleMatch(request, candidate);

    assert.equal(decision.eligible, true);
    assert.equal(decision.score > 50, true);
  });

  it("blocks candidates missing required competencies", () => {
    const decision = decideResponsibleMatch(request, {
      ...candidate,
      competencyIds: [],
    });

    assert.equal(decision.eligible, false);
    assert.equal(decision.reasons.includes("missing_competency"), true);
  });

  it("ranks eligible candidates before blocked candidates", () => {
    const [first, second] = rankResponsibleMatches(request, [
      { ...candidate, profileId: "blocked", competencyIds: [] },
      candidate,
    ]);

    assert.equal(first.candidateId, "candidate-1");
    assert.equal(first.eligible, true);
    assert.equal(second.eligible, false);
  });
});
