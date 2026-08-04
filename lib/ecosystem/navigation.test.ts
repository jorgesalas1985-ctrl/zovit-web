import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getEcosystemNavigation } from "./navigation";

describe("ecosystem navigation", () => {
  it("shows current client links only for client profiles", () => {
    const items = getEcosystemNavigation({
      role: "client",
      can_act_as_client: true,
      can_act_as_professional: false,
      active_mode: "client",
    });

    assert.deepEqual(
      items.map((item) => item.id),
      ["client-map", "client-requests", "student-passport"],
    );
  });

  it("does not expose future superadmin vault routes by default", () => {
    const items = getEcosystemNavigation({
      role: "admin",
      intranet_role: "super_admin",
      can_act_as_client: true,
      can_act_as_professional: true,
      active_mode: "client",
    });

    assert.equal(items.some((item) => item.id === "founder-vault"), false);
    assert.equal(items.some((item) => item.id === "superadmin-ai"), false);
    assert.equal(items.some((item) => item.id === "superadmin-ocr"), false);
  });

  it("can include future superadmin governance links when explicitly requested", () => {
    const items = getEcosystemNavigation(
      {
        role: "admin",
        intranet_role: "super_admin",
        can_act_as_client: true,
        can_act_as_professional: true,
        active_mode: "client",
      },
      { includeFuture: true },
    );

    assert.equal(items.some((item) => item.id === "founder-vault"), true);
    assert.equal(items.some((item) => item.id === "superadmin-ai"), true);
    assert.equal(items.some((item) => item.id === "superadmin-ocr"), true);
  });
});
