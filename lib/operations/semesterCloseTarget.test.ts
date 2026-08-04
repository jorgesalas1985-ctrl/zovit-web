import assert from "node:assert/strict";
import test from "node:test";

import { resolveSemesterCloseTarget } from "@/lib/operations/semesterCloseTarget";

test("resolves active first semester before closing window", () => {
  const target = resolveSemesterCloseTarget(new Date("2026-04-15T12:00:00.000Z"));

  assert.equal(target.mode, "active_semester");
  assert.equal(target.year, 2026);
  assert.equal(target.semester, "S1");
  assert.equal(target.shouldPrepareClose, false);
  assert.equal(target.endsAt, "2026-07-31");
});

test("resolves first semester closing window near july 31", () => {
  const target = resolveSemesterCloseTarget(new Date("2026-07-20T12:00:00.000Z"));

  assert.equal(target.mode, "closing_window");
  assert.equal(target.semester, "S1");
  assert.equal(target.shouldPrepareClose, true);
});

test("resolves active second semester and its closing window", () => {
  const active = resolveSemesterCloseTarget(new Date("2026-08-01T12:00:00.000Z"));
  const closing = resolveSemesterCloseTarget(new Date("2026-12-20T12:00:00.000Z"));

  assert.equal(active.mode, "active_semester");
  assert.equal(active.semester, "S2");
  assert.equal(closing.mode, "closing_window");
  assert.equal(closing.endsAt, "2026-12-31");
});

test("uses previous second semester during january and february", () => {
  const target = resolveSemesterCloseTarget(new Date("2027-01-10T12:00:00.000Z"));

  assert.equal(target.mode, "out_of_semester");
  assert.equal(target.year, 2026);
  assert.equal(target.semester, "S2");
  assert.equal(target.shouldPrepareClose, true);
});

test("uses first semester as pending close before august starts", () => {
  const target = resolveSemesterCloseTarget(new Date("2026-02-10T12:00:00.000Z"));

  assert.equal(target.mode, "out_of_semester");
  assert.equal(target.year, 2025);
  assert.equal(target.semester, "S2");
});
