import assert from "node:assert/strict";
import test from "node:test";

import { getZovitOwnerUserId, isZovitRealOwner } from "@/lib/intranet/ownerAuth";

const original = process.env.ZOVIT_OWNER_USER_ID;
const owner = "7375e428-2a6a-447b-b87e-1ac8c78f5757";

test("recognizes only the configured owner UUID with super-admin role", () => {
  process.env.ZOVIT_OWNER_USER_ID = owner;
  assert.equal(getZovitOwnerUserId(), owner);
  assert.equal(isZovitRealOwner(owner, "super_admin"), true);
  assert.equal(isZovitRealOwner("11111111-1111-4111-8111-111111111111", "super_admin"), false);
  assert.equal(isZovitRealOwner(owner, "hr_admin"), false);
});

test("fails closed when the owner UUID is absent or malformed", () => {
  delete process.env.ZOVIT_OWNER_USER_ID;
  assert.equal(getZovitOwnerUserId(), null);
  assert.equal(isZovitRealOwner(owner, "super_admin"), false);
  process.env.ZOVIT_OWNER_USER_ID = "not-a-uuid";
  assert.equal(getZovitOwnerUserId(), null);
  assert.equal(isZovitRealOwner(owner, "super_admin"), false);
  if (original === undefined) delete process.env.ZOVIT_OWNER_USER_ID;
  else process.env.ZOVIT_OWNER_USER_ID = original;
});
