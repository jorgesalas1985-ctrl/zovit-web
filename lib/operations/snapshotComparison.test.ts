import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildOperationalSnapshot } from "./operationalSnapshot";
import { compareOperationalSnapshots } from "./snapshotComparison";

const pendingProfile = {
  id: "profile-1",
  email: "persona@zovit.cl",
  first_name: "Persona",
  last_name: "ZOVIT",
  role: "professional" as const,
  can_act_as_professional: true,
  worker_registration_status: "submitted",
  identity_status: "approved" as const,
  identity_verified: true,
  biometric_verified: true,
  primary_service_profile: "experience_verified",
};

describe("operational snapshot comparison", () => {
  it("stays stable when snapshots have the same state", () => {
    const previous = buildOperationalSnapshot({ profiles: [] });
    const current = buildOperationalSnapshot({ profiles: [] });
    const comparison = compareOperationalSnapshots({ previous, current });

    assert.equal(comparison.trend, "stable");
    assert.equal(comparison.score.delta, 0);
  });

  it("improves when pending work is cleared", () => {
    const previous = buildOperationalSnapshot({ profiles: [pendingProfile] });
    const current = buildOperationalSnapshot({ profiles: [] });
    const comparison = compareOperationalSnapshots({ previous, current });

    assert.equal(comparison.trend, "improved");
    assert.equal(comparison.totalItems.delta < 0, true);
  });

  it("worsens when more human review appears", () => {
    const previous = buildOperationalSnapshot({ profiles: [] });
    const current = buildOperationalSnapshot({
      profiles: [
        pendingProfile,
        {
          ...pendingProfile,
          id: "profile-2",
          email: "persona2@zovit.cl",
        },
      ],
    });
    const comparison = compareOperationalSnapshots({ previous, current });

    assert.equal(comparison.trend, "worsened");
    assert.equal(comparison.humanActions.delta > 0, true);
  });
});
