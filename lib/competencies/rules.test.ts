import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canUseCompetencyAutonomously,
  isEducationOnlyLevel,
  isZovitCertifiedLevel,
  requiresSupervisionForCompetency,
} from "./rules";

describe("competency rules", () => {
  it("does not treat academic competency as ZOVIT certification", () => {
    assert.equal(isEducationOnlyLevel("academic_competency"), true);
    assert.equal(isZovitCertifiedLevel("academic_competency"), false);
  });

  it("requires supervision for education-only competencies", () => {
    assert.equal(
      requiresSupervisionForCompetency({
        competencyId: "electricity-basic-installation",
        level: "academic_competency",
        source: "education",
        verified: true,
      }),
      true,
    );
  });

  it("allows autonomous work only when certified or externally licensed and scoped for it", () => {
    assert.equal(
      canUseCompetencyAutonomously({
        competencyId: "digital-basic-support",
        level: "current",
        source: "zovit_evaluation",
        verified: true,
      }),
      true,
    );

    assert.equal(
      canUseCompetencyAutonomously({
        competencyId: "digital-basic-support",
        level: "academic_competency",
        source: "education",
        verified: true,
      }),
      false,
    );
  });
});
