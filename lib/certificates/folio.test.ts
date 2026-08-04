import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { maskChileanRut, normalizeCertificateFolio } from "./folio";

describe("certificate folio", () => {
  it("normalizes urls and bare ids", () => {
    assert.equal(
      normalizeCertificateFolio("https://zovit.cl/certificados/ZV-261234567"),
      "ZV-261234567",
    );
    assert.equal(normalizeCertificateFolio("zv261234567"), "ZV-261234567");
    assert.equal(normalizeCertificateFolio("261234567"), "ZV-261234567");
  });

  it("masks rut like credential", () => {
    assert.equal(maskChileanRut("16.032.189-K"), "******-K");
  });
});
