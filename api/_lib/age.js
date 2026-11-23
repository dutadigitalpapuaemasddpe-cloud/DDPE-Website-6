"use strict";

// Aturan usia pendaftaran DDPE. Sumber kebenaran tetap fungsi SQL (ddpe_program_min_age, ddpe_age_on);
// modul ini meniru aturan yang sama agar API menolak lebih awal dan dashboard menyetel default yang konsisten.
const WIT_OFFSET_MS = 9 * 3600 * 1000;
const ADULT_AGE = 18;
const DEFAULT_MIN_AGE = 14;
const PROGRAM_MIN_AGE = { dldpe: 14, didpe: 14, amex: 16 };

function programKey(recruitment) {
  const program = String((recruitment && recruitment.program_id) || "").toLowerCase();
  const pillar = String((recruitment && recruitment.pillar_id) || "").toLowerCase();
  if (program.startsWith("amex") || pillar.startsWith("amex")) return "amex";
  if (recruitment && recruitment.kind === "ambassador" && (pillar === "dldpe" || pillar === "didpe")) return pillar;
  return null;
}

// Batas terendah yang boleh ditetapkan untuk sebuah angkatan.
function programMinAge(recruitment) {
  const key = programKey(recruitment);
  return key ? PROGRAM_MIN_AGE[key] : DEFAULT_MIN_AGE;
}

// Batas yang berlaku saat pendaftaran: yang lebih tinggi antara nilai angkatan dan batas program.
function effectiveMinAge(recruitment) {
  const configured = recruitment && Number.isInteger(Number(recruitment.minimum_age)) && recruitment.minimum_age !== null ? Number(recruitment.minimum_age) : null;
  if (configured === null) return null;
  return Math.max(configured, programMinAge(recruitment));
}

// Tanggal acuan: hari ini di WIT (Asia/Jayapura, UTC+9) dalam format YYYY-MM-DD.
function witToday(now) {
  return new Date((now === undefined ? Date.now() : now) + WIT_OFFSET_MS).toISOString().slice(0, 10);
}

// Tanggal lahir valid: format YYYY-MM-DD, tanggal kalender nyata, tidak di masa depan, dan tidak sebelum 1900.
function parseBirthDate(value, referenceDate) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  if (year < 1900 || value > (referenceDate || witToday())) return null;
  return value;
}

// Usia penuh pada tanggal acuan; ulang tahun yang belum tiba pada tanggal acuan tidak dihitung.
function ageOn(birthDate, referenceDate) {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [ry, rm, rd] = referenceDate.split("-").map(Number);
  return ry - by - (rm < bm || (rm === bm && rd < bd) ? 1 : 0);
}

module.exports = { ADULT_AGE, DEFAULT_MIN_AGE, PROGRAM_MIN_AGE, programKey, programMinAge, effectiveMinAge, witToday, parseBirthDate, ageOn };
