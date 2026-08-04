import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ADULT_AGE_ERROR,
  getAgeInYears,
  isAdultInChile,
  validateAdultBirthDate,
} from "./age";

describe("majority age Chile", () => {
  it("accepts adults and rejects minors", () => {
    const today = new Date("2026-07-26T15:00:00.000Z");
    assert.equal(isAdultInChile("26/07/2008", today), true);
    assert.equal(isAdultInChile("27/07/2008", today), false);
    assert.equal(validateAdultBirthDate("01/01/2015", today), ADULT_AGE_ERROR);
    assert.equal(validateAdultBirthDate("15/03/1990", today), null);
  });

  it("computes age in years", () => {
    const today = new Date("2026-07-26T15:00:00.000Z");
    assert.equal(getAgeInYears("1990-03-15", today), 36);
    assert.equal(getAgeInYears("2008-07-26", today), 18);
    assert.equal(getAgeInYears("2008-07-27", today), 17);
  });
});
