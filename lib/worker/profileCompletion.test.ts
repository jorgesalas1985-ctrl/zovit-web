import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ensureStudentTraining } from "./classify";
import { documentKindFromFolder } from "./documentKind";
import { buildWorkerProfileCompletion } from "./profileCompletion";
import { resolveRequiredDocumentKinds } from "./requiredDocuments";
import { createEmptyWorkerDraft } from "./draft";
import { getMissingDocumentIssue, getRegistrationFormIssue } from "./validate";

function completeStudentForm() {
  const draft = createEmptyWorkerDraft({
    firstName: "Ana",
    lastName: "Pérez",
    rut: "12.345.678-5",
    birthDate: "01/01/2000",
    phone: "+56911111111",
    email: "ana@example.com",
    address: "Getsemaní 0301",
    commune: "Puente Alto",
  });
  draft.participations = ["training"];
  draft.participation = "training";
  draft.suggestedProfiles = ["in_training"];
  draft.primaryProfile = "in_training";
  draft.training.institution = "Duoc UC";
  draft.training.career = "Administración";
  draft.services = [
    {
      categorySlug: "apoyo",
      categoryName: "Apoyo",
      specialtySlug: "tareas-basicas",
      specialtyName: "Tareas básicas",
      requiresCredential: false,
      authorizationStatus: "pending",
    },
  ];
  draft.availability.days = ["Lunes"];
  draft.availability.communes = "Puente Alto";
  draft.consentAccepted = true;
  return draft;
}

describe("document kind mapping", () => {
  it("maps enrollment uploads to student_enrollment", () => {
    assert.equal(documentKindFromFolder("enrollment"), "student_enrollment");
    assert.equal(documentKindFromFolder("training"), "student_enrollment");
    assert.equal(documentKindFromFolder("cred-abc"), "credential");
  });
});

describe("required documents", () => {
  it("asks students for the study document instead of a professional credential", () => {
    assert.deepEqual(resolveRequiredDocumentKinds({ accountKind: "student" }), [
      "student_enrollment",
    ]);
  });
});

describe("student training defaults", () => {
  it("adds the training path so the enrollment field is visible", () => {
    const draft = ensureStudentTraining(createEmptyWorkerDraft(), true);
    assert.ok(draft.participations.includes("training"));
    assert.ok(draft.suggestedProfiles.includes("in_training"));
  });
});

describe("profile completion", () => {
  it("keeps a completed student form at 86% until the study document is uploaded", () => {
    const draft = completeStudentForm();
    const completion = buildWorkerProfileCompletion({ draft, isStudent: true });

    assert.equal(completion.percent, 86);
    assert.equal(completion.remainingPercent, 14);
    assert.equal(completion.formComplete, true);
    assert.equal(completion.documentsComplete, false);
    assert.equal(completion.certificateUnlocked, false);
    assert.equal(completion.target?.fieldId, "training.enrollment");
    assert.equal(completion.target?.step, 3);
    assert.match(completion.missingDocumentLabel, /alumno regular|estudios/i);
    assert.equal(completion.items[1].actionLabel, "Revisar documentos");
  });

  it("reaches 100% and unlocks the certificate after the enrollment file is attached", () => {
    const draft = completeStudentForm();
    draft.training.enrollmentStoragePath = "user/enrollment/file.pdf";
    draft.training.enrollmentDocName = "alumno-regular.pdf";

    const completion = buildWorkerProfileCompletion({ draft, isStudent: true });
    assert.equal(completion.percent, 100);
    assert.equal(completion.documentsComplete, true);
    assert.equal(completion.certificateUnlocked, true);
    assert.equal(completion.target, null);
  });

  it("still points to the enrollment field when document compliance fails to load", () => {
    const draft = completeStudentForm();
    const completion = buildWorkerProfileCompletion({
      draft,
      isStudent: true,
      documentComplianceError: "No se pudo cargar tu estado documental.",
    });

    assert.equal(completion.target?.fieldId, "training.enrollment");
    assert.equal(completion.items[1].status, "error");
    assert.match(completion.items[1].description, /estado documental|alumno regular|matrícula/i);
  });
});

describe("form vs document issues", () => {
  it("treats a missing enrollment file as a document issue, not a form issue", () => {
    const draft = completeStudentForm();
    assert.equal(getRegistrationFormIssue(draft), null);
    assert.equal(getMissingDocumentIssue(draft)?.fieldId, "training.enrollment");
  });
});
