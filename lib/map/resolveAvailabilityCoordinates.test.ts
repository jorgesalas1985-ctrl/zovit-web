import test from "node:test";
import assert from "node:assert/strict";
import { resolveAvailabilityCoordinates } from "./resolveAvailabilityCoordinates";

test("prefers requested GPS coordinates when they are valid", () => {
  const result = resolveAvailabilityCoordinates({
    requestedLatitude: -33.61,
    requestedLongitude: -70.57,
    savedLatitude: -33.4489,
    savedLongitude: -70.6693,
  });
  assert.deepEqual(result, {
    latitude: -33.61,
    longitude: -70.57,
    source: "requested",
  });
});

test("reuses last saved location when GPS is missing", () => {
  const result = resolveAvailabilityCoordinates({
    requestedLatitude: undefined,
    requestedLongitude: undefined,
    savedLatitude: "-33.4489",
    savedLongitude: "-70.6693",
  });
  assert.deepEqual(result, {
    latitude: -33.4489,
    longitude: -70.6693,
    source: "saved",
  });
});

test("rejects out-of-range coordinates and empty payloads", () => {
  assert.equal(
    resolveAvailabilityCoordinates({
      requestedLatitude: 999,
      requestedLongitude: -70.67,
      savedLatitude: null,
      savedLongitude: null,
    }),
    null,
  );
  assert.equal(
    resolveAvailabilityCoordinates({
      requestedLatitude: undefined,
      requestedLongitude: undefined,
      savedLatitude: undefined,
      savedLongitude: undefined,
    }),
    null,
  );
});
