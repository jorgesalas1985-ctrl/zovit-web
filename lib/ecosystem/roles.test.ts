import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ecosystemRolesFromProfile,
  hasEcosystemPermission,
  primaryEcosystemHome,
  resolvePrimaryEcosystemRole,
} from "./roles";

describe("ecosystem roles", () => {
  it("maps current client profiles to the client ecosystem role", () => {
    const roles = ecosystemRolesFromProfile({
      role: "client",
      can_act_as_client: true,
      can_act_as_professional: false,
      active_mode: "client",
    });

    assert.deepEqual(roles, ["client"]);
  });

  it("maps in-training professionals as student and professional", () => {
    const roles = ecosystemRolesFromProfile({
      role: "professional",
      can_act_as_client: true,
      can_act_as_professional: true,
      active_mode: "professional",
      primary_service_profile: "in_training",
    });

    assert.deepEqual(roles, ["student", "client", "professional"]);
  });

  it("keeps superadmin as the only role with founder vault permission", () => {
    assert.equal(
      hasEcosystemPermission({ role: "admin", intranet_role: "hr_admin" }, "access_founder_vault"),
      false,
    );
    assert.equal(
      hasEcosystemPermission({ role: "admin", intranet_role: "super_admin" }, "access_founder_vault"),
      true,
    );
  });

  it("prioritizes superadmin over public roles", () => {
    const role = resolvePrimaryEcosystemRole({
      role: "admin",
      can_act_as_client: true,
      can_act_as_professional: true,
      active_mode: "client",
      intranet_role: "super_admin",
    });

    assert.equal(role, "superadmin");
    assert.equal(primaryEcosystemHome(role), "/intranet/finanzas");
  });
});
