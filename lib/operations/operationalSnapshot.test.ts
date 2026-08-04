import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildOperationalSnapshot,
  OPERATIONAL_SNAPSHOT_SCHEMA_NAME,
  OPERATIONAL_SNAPSHOT_SCHEMA_VERSION,
} from "./operationalSnapshot";

describe("operational snapshot", () => {
  it("builds all operational layers from profiles", () => {
    const snapshot = buildOperationalSnapshot({
      profiles: [
        {
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
        },
      ],
      generatedAt: new Date("2026-08-01T12:00:00Z"),
    });

    assert.equal(snapshot.generatedAt, "2026-08-01T12:00:00.000Z");
    assert.equal(snapshot.metadata.schemaName, OPERATIONAL_SNAPSHOT_SCHEMA_NAME);
    assert.equal(snapshot.metadata.schemaVersion, OPERATIONAL_SNAPSHOT_SCHEMA_VERSION);
    assert.equal(snapshot.metadata.source, "in_memory_profiles");
    assert.equal(snapshot.controlCenter.totalProfiles, 1);
    assert.equal(snapshot.actionPlan.items.length > 0, true);
    assert.equal(snapshot.executionPolicy.items.length, snapshot.actionPlan.items.length);
    assert.equal(snapshot.auditTrail.events.length, snapshot.executionPolicy.items.length);
    assert.equal(snapshot.executiveRecommendations.recommendations.length > 0, true);
  });

  it("respects top item and recommendation limits", () => {
    const profiles = Array.from({ length: 3 }, (_, index) => ({
      id: `profile-${index + 1}`,
      email: `persona${index + 1}@zovit.cl`,
      first_name: `Persona ${index + 1}`,
      last_name: "ZOVIT",
      role: "professional" as const,
      can_act_as_professional: true,
      worker_registration_status: "submitted",
      identity_status: "approved" as const,
      identity_verified: true,
      biometric_verified: true,
      primary_service_profile: "experience_verified",
    }));

    const snapshot = buildOperationalSnapshot({
      profiles,
      topItemLimit: 2,
      recommendationLimit: 1,
    });

    assert.equal(snapshot.controlCenter.topItems.length, 2);
    assert.equal(snapshot.executiveRecommendations.recommendations.length, 1);
  });

  it("allows an explicit persisted source for future storage", () => {
    const snapshot = buildOperationalSnapshot({
      profiles: [],
      source: "persisted_snapshot",
    });

    assert.equal(snapshot.metadata.source, "persisted_snapshot");
  });
});
