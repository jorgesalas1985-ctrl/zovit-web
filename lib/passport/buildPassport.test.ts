import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildDigitalPassport } from "./buildPassport";

describe("digital passport", () => {
  it("builds identity and education sections from current profile fields", () => {
    const passport = buildDigitalPassport({
      id: "profile-1",
      email: "persona@zovit.cl",
      role: "professional",
      can_act_as_client: true,
      can_act_as_professional: true,
      active_mode: "professional",
      identity_status: "approved",
      identity_verified: true,
      biometric_verified: true,
      study_verification_status: "pending",
      study_verified: false,
    });

    assert.equal(passport.sections.find((section) => section.id === "identity")?.status, "complete");
    assert.equal(passport.sections.find((section) => section.id === "education")?.status, "partial");
  });

  it("maps in-training professional passports to student and professional roles", () => {
    const passport = buildDigitalPassport({
      id: "profile-2",
      role: "professional",
      can_act_as_client: true,
      can_act_as_professional: true,
      active_mode: "professional",
      primary_service_profile: "in_training",
    });

    assert.equal(passport.roles.includes("student"), true);
    assert.equal(passport.roles.includes("professional"), true);
  });
});
