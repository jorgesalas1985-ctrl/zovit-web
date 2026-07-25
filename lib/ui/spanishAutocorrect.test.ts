import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applySpanishAutocorrect } from "./spanishAutocorrect";

describe("spanish autocorrect", () => {
  it("fixes common accents in free text", () => {
    assert.equal(
      applySpanishAutocorrect("necesito reparacion electrica tambien"),
      "necesito reparación eléctrica también"
    );
  });

  it("preserves capitalization", () => {
    assert.equal(applySpanishAutocorrect("Informacion"), "Información");
  });

  it("does not force ambiguous words", () => {
    assert.equal(applySpanishAutocorrect("que dia"), "que día");
  });
});
