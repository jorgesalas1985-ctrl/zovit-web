import assert from "node:assert/strict";
import test from "node:test";
import { applySuperAdminTourProfile, readTourAccountFromCookie } from "./applyTourProfile";

const superAdmin = {
  role: "admin" as const,
  account_kind: "client",
  can_act_as_client: true,
  can_act_as_professional: true,
  active_mode: "client" as const,
  intranet_role: "super_admin",
};

test("only a real super admin can be overlaid by the floating tour button", () => {
  const student = {
    ...superAdmin,
    intranet_role: null,
    account_kind: "student",
  };
  assert.equal(applySuperAdminTourProfile(student, "company")?.account_kind, "student");
});

test("touring as student makes the super admin act as a student account", () => {
  const next = applySuperAdminTourProfile(superAdmin, "student");
  assert.equal(next?.account_kind, "student");
  assert.equal(next?.role, "professional");
  assert.equal(next?.intranet_role, null);
  assert.equal(next?.active_mode, "client");
});

test("touring as company makes the super admin act as a company account", () => {
  const next = applySuperAdminTourProfile(superAdmin, "company");
  assert.equal(next?.account_kind, "company");
  assert.equal(next?.role, "client");
  assert.equal(next?.can_act_as_professional, false);
});

test("super admin tour leaves the real super admin profile untouched", () => {
  const next = applySuperAdminTourProfile(superAdmin, "super_admin");
  assert.equal(next?.intranet_role, "super_admin");
  assert.equal(next?.account_kind, "client");
});

test("reads the tour cookie used by the floating button", () => {
  assert.equal(readTourAccountFromCookie("zovit-sa-tour=student; other=1"), "student");
  assert.equal(readTourAccountFromCookie("theme=dark"), null);
});
