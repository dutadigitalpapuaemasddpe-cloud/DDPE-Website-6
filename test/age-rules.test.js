"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const age = require("../api/_lib/age");

const DLDPE = { kind: "ambassador", pillar_id: "dldpe", program_id: null };
const DIDPE = { kind: "ambassador", pillar_id: "didpe", program_id: null };
const AMEX = { kind: "volunteer", pillar_id: null, program_id: "amex" };
const MIN = { dldpe: 14, didpe: 14, amex: 16 };

test("batas usia per program: DLDPE 14, DIDPE 14, Relawan AMEX 16", () => {
  assert.equal(age.programMinAge(DLDPE), 14);
  assert.equal(age.programMinAge(DIDPE), 14);
  assert.equal(age.programMinAge(AMEX), 16);
  assert.equal(age.programMinAge({ kind: "volunteer", program_id: "lain" }), 14);
  // nilai angkatan tidak bisa menurunkan batas program, tetapi boleh menaikkannya
  assert.equal(age.effectiveMinAge({ ...AMEX, minimum_age: 14 }), 16);
  assert.equal(age.effectiveMinAge({ ...DLDPE, minimum_age: 13 }), 14);
  assert.equal(age.effectiveMinAge({ ...DLDPE, minimum_age: 17 }), 17);
  assert.equal(age.effectiveMinAge({ ...DLDPE, minimum_age: null }), null);
});

test("usia dihitung dari tanggal lahir dan tanggal acuan; ulang tahun yang belum tiba tidak dihitung", () => {
  assert.equal(age.ageOn("2012-06-15", "2026-06-14"), 13);
  assert.equal(age.ageOn("2012-06-15", "2026-06-15"), 14);
  assert.equal(age.ageOn("2012-06-15", "2026-12-31"), 14);
  assert.equal(age.ageOn("2024-02-29", "2025-02-28"), 0);
  assert.equal(age.ageOn("2024-02-29", "2025-03-01"), 1);
  assert.equal(age.witToday(Date.UTC(2026, 10, 23, 14, 59)), "2026-11-23");
  assert.equal(age.witToday(Date.UTC(2026, 10, 23, 15, 0)), "2026-11-24", "WIT = UTC+9");
});

test("tanggal lahir tidak valid ditolak", () => {
  const ref = "2026-11-24";
  for (const bad of ["", "2012-13-01", "2012-02-30", "24-11-2012", "2026-11-25", "1899-12-31", null, 20, "2012-6-5"]) {
    assert.equal(age.parseBirthDate(bad, ref), null, String(bad));
  }
  assert.equal(age.parseBirthDate("2026-11-24", ref), "2026-11-24");
  assert.equal(age.parseBirthDate("2012-02-29", ref), "2012-02-29");
});

test("matriks usia 13-18 per program menurut aturan JavaScript", () => {
  for (const [name, program] of [["dldpe", DLDPE], ["didpe", DIDPE], ["amex", AMEX]]) {
    for (let years = 13; years <= 18; years += 1) {
      assert.equal(years >= age.effectiveMinAge({ ...program, minimum_age: MIN[name] }), years >= MIN[name], name + " " + years);
    }
  }
});
