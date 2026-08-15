import test from "node:test";
import assert from "node:assert/strict";
import {
  geolocationFailureMessage,
  shouldRetryGeolocationWithoutHighAccuracy,
} from "./locationPermission";

test("availability GPS errors invite a commune search instead of a dead end", () => {
  const denied = geolocationFailureMessage("denied", "availability");
  assert.match(denied, /comuna/i);
  assert.doesNotMatch(denied, /profesionales cercanos/i);
});

test("retries coarse GPS after a high-accuracy timeout", () => {
  assert.equal(
    shouldRetryGeolocationWithoutHighAccuracy(
      { ok: false, code: "timeout", message: "x" },
      true,
    ),
    true,
  );
  assert.equal(
    shouldRetryGeolocationWithoutHighAccuracy(
      { ok: false, code: "denied", message: "x" },
      true,
    ),
    false,
  );
  assert.equal(
    shouldRetryGeolocationWithoutHighAccuracy(
      { ok: false, code: "timeout", message: "x" },
      false,
    ),
    false,
  );
});
