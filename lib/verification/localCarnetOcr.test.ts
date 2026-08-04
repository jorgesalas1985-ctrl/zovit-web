import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  extractBirthDateFromText,
  extractRutFromText,
  scoreDocumentText,
} from "./localCarnetOcr";

describe("local carnet OCR helpers", () => {
  it("extracts Chilean RUT", () => {
    assert.equal(extractRutFromText("RUN 16.032.189-K NACIONALIDAD"), "16032189-K");
  });

  it("flags email screenshot as high forgery", () => {
    const score = scoreDocumentText("Tenpo - Tu caso ha sido resuelto Gmail");
    assert.equal(score.forgeryRisk, "high");
    assert.equal(score.documentLooksLikeChileanId, false);
  });

  it("extracts birth date", () => {
    assert.equal(extractBirthDateFromText("Fecha de nacimiento 15/03/1990 Chile"), "1990-03-15");
  });
});
