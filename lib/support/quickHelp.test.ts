import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { answerQuickHelp } from "./quickHelp";

describe("quick help", () => {
  it("answers verification questions", () => {
    const result = answerQuickHelp("cómo verifico mi carnet?");
    assert.equal(result.confidence, "high");
    assert.match(result.answer, /verific/i);
  });

  it("answers payment questions", () => {
    const result = answerQuickHelp("cuando se libera el pago protegido");
    assert.equal(result.confidence, "high");
    assert.match(result.answer, /protegido|Mercado/i);
  });
});
