import test from "node:test";
import assert from "node:assert/strict";
import {
  shouldRetryGeolocationWithoutHighAccuracy,
  type BrowserLocationResult,
} from "./locationPermission";

const failure = (code: "denied" | "unavailable" | "timeout" | "unsupported"): BrowserLocationResult => ({
  ok: false,
  code,
  message: code,
});

test("reintenta sin alta precisión después de timeout o ubicación no disponible", () => {
  assert.equal(shouldRetryGeolocationWithoutHighAccuracy(failure("timeout"), true), true);
  assert.equal(shouldRetryGeolocationWithoutHighAccuracy(failure("unavailable"), true), true);
});

test("no reintenta permisos denegados ni llamadas que ya usaron baja precisión", () => {
  assert.equal(shouldRetryGeolocationWithoutHighAccuracy(failure("denied"), true), false);
  assert.equal(shouldRetryGeolocationWithoutHighAccuracy(failure("timeout"), false), false);
});
