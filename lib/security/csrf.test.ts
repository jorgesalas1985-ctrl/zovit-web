import test from "node:test";
import assert from "node:assert/strict";
import { assertSameOrigin, isLocalDevPair } from "./csrf";

test("allows same-origin POSTs including localhost", () => {
  const request = new Request("http://localhost:3000/api/map/availability", {
    method: "POST",
    headers: { origin: "http://localhost:3000" },
  });
  assert.deepEqual(assertSameOrigin(request), { ok: true });
});

test("allows localhost Origin against 127.0.0.1 in development", () => {
  const env = process.env as { NODE_ENV?: string };
  const previous = env.NODE_ENV;
  env.NODE_ENV = "development";
  try {
    assert.equal(
      isLocalDevPair("http://localhost:3000", "http://127.0.0.1:3000/api/map/availability"),
      true,
    );
    const request = new Request("http://127.0.0.1:3000/api/map/availability", {
      method: "POST",
      headers: { origin: "http://localhost:3000" },
    });
    assert.deepEqual(assertSameOrigin(request), { ok: true });
  } finally {
    env.NODE_ENV = previous;
  }
});

test("rejects cross-site origins", () => {
  const request = new Request("https://zovit.cl/api/map/availability", {
    method: "POST",
    headers: { origin: "https://evil.example" },
  });
  assert.equal(assertSameOrigin(request).ok, false);
});
