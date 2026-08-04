import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildControlCenterProfileQueue } from "./controlCenterProfiles";

describe("control center profile adapter", () => {
  it("builds a review queue from an existing profile shape", () => {
    const queue = buildControlCenterProfileQueue({
      id: "profile-1",
      email: "persona@zovit.cl",
      first_name: "Persona",
      last_name: "ZOVIT",
      role: "professional",
      can_act_as_professional: true,
      worker_registration_status: "submitted",
      identity_status: "approved",
      identity_verified: true,
      biometric_verified: true,
      primary_service_profile: "experience_verified",
    });

    assert.equal(queue.profileId, "profile-1");
    assert.equal(queue.displayName, "Persona ZOVIT");
    assert.equal(queue.queue.items.some((item) => item.type === "manual_document_review"), true);
  });
});
