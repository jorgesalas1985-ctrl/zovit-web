import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideCarnetVerdict } from "./aiCarnetOcr";

describe("carnet AI decision", () => {
  it("auto-approves clear match with low forgery", () => {
    assert.equal(
      decideCarnetVerdict({
        confidence: 0.92,
        forgeryRisk: "low",
        rutMatches: true,
        birthDateMatches: true,
        isAdult: true,
        hasImages: true,
        extractedRut: "12345678-5",
        extractedBirthDate: "1990-03-15",
      }),
      "approved"
    );
  });

  it("rejects rut mismatch", () => {
    assert.equal(
      decideCarnetVerdict({
        confidence: 0.95,
        forgeryRisk: "low",
        rutMatches: false,
        birthDateMatches: true,
        isAdult: true,
        hasImages: true,
        extractedRut: "11111111-1",
        extractedBirthDate: "1990-03-15",
      }),
      "rejected"
    );
  });

  it("leaves medium forgery for human review", () => {
    assert.equal(
      decideCarnetVerdict({
        confidence: 0.9,
        forgeryRisk: "medium",
        rutMatches: true,
        birthDateMatches: true,
        isAdult: true,
        hasImages: true,
        extractedRut: "12345678-5",
        extractedBirthDate: "1990-03-15",
      }),
      "dudoso"
    );
  });
});
