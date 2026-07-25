import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { chileanDateToIso, isoToChileanDate, isValidChileanDate } from "./chileanDate";

describe("chilean date format", () => {
  it("parses day/month/year", () => {
    assert.equal(chileanDateToIso("02/05/1985"), "1985-05-02");
    assert.equal(chileanDateToIso("2-5-1985"), "1985-05-02");
    assert.equal(isValidChileanDate("31/12/2000"), true);
  });

  it("rejects invalid calendars", () => {
    assert.equal(chileanDateToIso("31/02/2000"), null);
    assert.equal(isValidChileanDate("13/13/2000"), false);
  });

  it("formats ISO to Chilean display", () => {
    assert.equal(isoToChileanDate("1985-05-02"), "02/05/1985");
  });
});
