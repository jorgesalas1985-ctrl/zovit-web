import test from "node:test";
import assert from "node:assert/strict";
import { isFinancialAdminRoute, resolvePanelViewMode, resolvePostLoginPath } from "./roles";

test("detects financial admin routes", () => {
  assert.equal(isFinancialAdminRoute("/admin/pagos"), true);
  assert.equal(isFinancialAdminRoute("/intranet/finanzas"), true);
  assert.equal(isFinancialAdminRoute("/intranet/admin"), false);
  assert.equal(isFinancialAdminRoute("/panel"), false);
});

test("keeps student accounts from resolving as professional panel mode", () => {
  const profile = {
    role: "professional" as const,
    account_kind: "student" as const,
    can_act_as_client: true,
    can_act_as_professional: true,
    active_mode: "professional" as const,
  };

  assert.equal(resolvePanelViewMode(profile), "client");
});

test("routes student accounts to the alumno landing path after login", () => {
  const profile = {
    role: "professional" as const,
    account_kind: "student" as const,
    can_act_as_client: true,
    can_act_as_professional: true,
    active_mode: "professional" as const,
    intranet_role: null,
  };

  assert.equal(resolvePostLoginPath(null, profile), "/alumno");
});
