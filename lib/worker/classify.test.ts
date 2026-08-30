import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  pickPrimaryProfile,
  suggestFromGuidedAssistant,
  suggestProfilesFromParticipation,
  suggestProfilesFromParticipations,
} from "./classify";
import { specialtyRequiresCredential } from "./regulatedServices";
import { createEmptyWorkerDraft } from "./draft";
import {
  getStepValidationIssue,
  validateAntecedentsStep,
  validateParticipationStep,
  validatePersonalStep,
} from "./validate";

describe("worker classification", () => {
  it("maps participation choices to service profiles", () => {
    assert.deepEqual(suggestProfilesFromParticipation("certified"), ["certified"]);
    assert.deepEqual(suggestProfilesFromParticipation("experience"), ["experience_verified"]);
    assert.deepEqual(suggestProfilesFromParticipation("training"), ["in_training"]);
    assert.deepEqual(suggestProfilesFromParticipation("community"), [
      "community_collaborator",
    ]);
  });

  it("maps multiple participation choices to combined profiles", () => {
    const profiles = suggestProfilesFromParticipations([
      "certified",
      "experience",
      "training",
      "community",
    ]);
    assert.ok(profiles.includes("certified"));
    assert.ok(profiles.includes("experience_verified"));
    assert.ok(profiles.includes("in_training"));
    assert.ok(profiles.includes("community_collaborator"));
    assert.equal(profiles.length, 4);
  });

  it("guided assistant can suggest multiple non-hierarchical profiles", () => {
    const profiles = suggestFromGuidedAssistant({
      hasFormalCredential: false,
      hasExperience: true,
      isStudying: true,
      wantsSupportTasks: true,
    });
    assert.ok(profiles.includes("experience_verified"));
    assert.ok(profiles.includes("in_training"));
    assert.ok(profiles.includes("community_collaborator"));
  });

  it("picks a primary profile without implying superiority ranking beyond priority", () => {
    assert.equal(
      pickPrimaryProfile(["community_collaborator", "certified"]),
      "certified"
    );
  });
});

describe("regulated services", () => {
  it("flags electricity and gas specialties as credential-required", () => {
    assert.equal(specialtyRequiresCredential("electricidad-domiciliaria"), true);
    assert.equal(specialtyRequiresCredential("gasfiteria", "Gasfitería"), true);
    assert.equal(specialtyRequiresCredential("paseo-mascotas", "Paseo de mascotas"), false);
  });
});

describe("worker validation", () => {
  it("requires personal fields before continuing", () => {
    const draft = createEmptyWorkerDraft();
    assert.match(validatePersonalStep(draft) ?? "", /nombres/i);
  });

  it("requires participation choice", () => {
    const draft = createEmptyWorkerDraft({
      firstName: "Ana",
      lastName: "Pérez",
      rut: "11.111.111-1",
      birthDate: "01/01/1990",
      phone: "+56911111111",
      email: "ana@example.com",
      commune: "Santiago",
    });
    // Fix RUT to a valid checksum for validation path used later
    draft.personal.rut = "11.111.111-1";
    assert.match(validateParticipationStep(draft) ?? "", /participar/i);
  });

  it("requires credentials when certified path is selected", () => {
    const draft = createEmptyWorkerDraft({
      firstName: "Ana",
      lastName: "Pérez",
      phone: "+56911111111",
      email: "ana@example.com",
      commune: "Santiago",
    });
    draft.personal.rut = "12.345.678-5";
    draft.personal.birthDate = "01/01/1990";
    draft.participations = ["certified"];
    draft.participation = "certified";
    draft.suggestedProfiles = ["certified"];
    assert.match(validateAntecedentsStep(draft) ?? "", /certificación/i);
  });

  it("points to enrollment field when training document is missing", () => {
    const draft = createEmptyWorkerDraft();
    draft.participations = ["training"];
    draft.suggestedProfiles = ["in_training"];
    draft.training.institution = "Duoc UC";
    draft.training.career = "Administración";
    const issue = getStepValidationIssue(3, draft);
    assert.equal(issue?.fieldId, "training.enrollment");
  });
});
