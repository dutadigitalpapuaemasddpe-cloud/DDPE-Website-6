"use strict";

// Menguji SQL usia + wali pada Postgres lokal (PGlite), tanpa menyentuh production, lalu menjalankan API pendaftaran
// di atas RPC SQL yang nyata. Dilewati bila PGlite tidak terpasang. Jalankan dengan:
//   PGLITE_DIR=/path/ke/node_modules/@electric-sql/pglite npm test
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { witToday } = require("../api/_lib/age");

const root = path.join(__dirname, "..", "supabase", "reconcile");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const json = (status, payload) => new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
const response = () => ({ statusCode: 0, body: "", setHeader() {}, end(value) { this.body = value || ""; } });

async function loadPglite() {
  const candidates = [process.env.PGLITE_DIR && path.join(process.env.PGLITE_DIR, "dist", "index.js")].filter(Boolean);
  for (const file of candidates) {
    try { return await import(pathToFileURL(file).href); } catch (_error) { /* coba berikutnya */ }
  }
  try { return await import("@electric-sql/pglite"); } catch (_error) { return null; }
}

// Skema lokal minimal yang meniru kolom yang dipakai RPC di database live (bukan migrasi 001-004).
const BASE_SCHEMA = `
  create role anon; create role authenticated; create role service_role;
  create table public.recruitments (
    id uuid primary key default gen_random_uuid(), program_id text, pillar_id text, kind text not null,
    title text not null, scope text not null default '', requirements text not null default '',
    opens_at timestamptz, closes_at timestamptz, status text not null default 'draft', accepted_quota integer,
    minimum_age smallint, guardian_review_required boolean not null default true, result_instructions text not null default '',
    created_at timestamptz not null default now(), updated_at timestamptz not null default now());
  create table public.applications (
    id uuid primary key default gen_random_uuid(), reference_code text not null unique,
    recruitment_id uuid not null references public.recruitments(id), submission_key uuid not null unique,
    full_name text not null, email text not null, whatsapp text not null, regency text not null, province text not null,
    age smallint not null check (age between 1 and 120), activity text not null, interests text not null, motivation text not null,
    availability text not null, skills text not null default '', experience text not null default '',
    data_consent boolean not null check (data_consent), truthful_statement boolean not null check (truthful_statement),
    status text not null default 'submitted', internal_note text not null default '', notification_status text not null default 'not_sent',
    created_at timestamptz not null default now(), updated_at timestamptz not null default now(), reviewed_by uuid, reviewed_at timestamptz);
  create unique index applications_recruitment_email_idx on public.applications (recruitment_id, lower(email));
  create table public.ddpe_permissions (id uuid primary key default gen_random_uuid(), user_id uuid, permission text, scope_type text, scope_id text);
  create table public.ddpe_audit_log (id uuid primary key default gen_random_uuid(), actor_id uuid, action text, entity_type text, entity_id text, details jsonb);
`;

function sliceBetween(text, from, to) { return text.slice(text.indexOf(from), to ? text.indexOf(to) : undefined); }

async function setup(PGlite) {
  const db = new PGlite();
  await db.exec(BASE_SCHEMA);
  const old = read("20261123_ruang_pengurus/02_apply.sql");
  await db.exec(sliceBetween(old, "-- 1. Rate limit", "-- 3. Form kemitraan")); // rate limit + submit lama
  await db.exec(sliceBetween(old, "-- 4. Pendaftar", "-- 5. Kemitraan"));        // review lama
  return db;
}

const RULES = [
  { name: "DLDPE", kind: "ambassador", pillar_id: "dldpe", program_id: null, min: 14 },
  { name: "DIDPE", kind: "ambassador", pillar_id: "didpe", program_id: null, min: 14 },
  { name: "Relawan AMEX", kind: "volunteer", pillar_id: null, program_id: "amex", min: 16 }
];

function birthDate(years, daysLater) {
  const [y, m, d] = witToday().split("-").map(Number);
  return new Date(Date.UTC(y - years, m - 1, m === 2 && d === 29 ? 28 : d) + (daysLater || 0) * 86400000).toISOString().slice(0, 10);
}

let seq = 0;
function payload(years, extra, daysLater) {
  seq += 1;
  return {
    full_name: "Peserta " + seq, email: "peserta" + seq + "@example.test", whatsapp: "081234567890", regency: "Mimika", province: "Papua Tengah",
    birth_date: birthDate(years, daysLater), activity: "pelajar", interests: "Literasi digital", motivation: "Ingin belajar dan berkontribusi.",
    availability: "Akhir pekan", skills: "", experience: "", data_consent: true, truthful_statement: true, ...extra
  };
}
const GUARDIAN = { guardian_name: "Ibu Contoh", guardian_relationship: "ibu", guardian_whatsapp: "081298765432", guardian_email: "", guardian_consent: true };

async function submit(db, recruitmentId, body) {
  seq += 1;
  const key = "00000000-0000-4000-8000-" + String(seq).padStart(12, "0");
  const fingerprint = String(seq).padStart(64, "f");
  try {
    const result = await db.query("select public.submit_ddpe_application($1::uuid, $2::uuid, $3::jsonb, $4) as ref", [recruitmentId, key, JSON.stringify(body), fingerprint]);
    return { ok: true, reference: result.rows[0].ref };
  } catch (error) { return { ok: false, message: error.message }; }
}

async function openRecruitment(db, rule, minimumAge) {
  const result = await db.query(
    "insert into public.recruitments (kind, pillar_id, program_id, title, status, minimum_age) values ($1, $2, $3, $4, 'open', $5) returning id",
    [rule.kind, rule.pillar_id, rule.program_id, rule.name + " uji", minimumAge === undefined ? rule.min : minimumAge]);
  return result.rows[0].id;
}

test("SQL: matriks usia 13/14/15/16/17/18 per program ditegakkan di database", async (t) => {
  const mod = await loadPglite();
  if (!mod) return t.skip("PGlite tidak terpasang");
  const db = await setup(mod.PGlite);
  await db.exec(read("20261124_usia_wali/01_backup.sql"));
  await db.exec(read("20261124_usia_wali/02_apply.sql"));
  for (const rule of RULES) {
    const id = await openRecruitment(db, rule);
    for (let years = 13; years <= 18; years += 1) {
      const minor = years < 18;
      const allowed = years >= rule.min;
      const label = rule.name + " usia " + years;
      const withGuardian = await submit(db, id, payload(years, minor ? GUARDIAN : {}));
      if (allowed) {
        assert.ok(withGuardian.ok, label + " harus diterima: " + withGuardian.message);
        const row = (await db.query("select age, is_minor, guardian_consent, guardian_name, age_reference_date, birth_date from public.applications where reference_code = $1", [withGuardian.reference])).rows[0];
        assert.equal(row.age, years, label + " usia dihitung server");
        assert.equal(row.is_minor, minor);
        assert.equal(row.guardian_consent, minor);
        assert.equal(row.guardian_name, minor ? "Ibu Contoh" : null, "data wali hanya disimpan untuk di bawah 18");
        assert.ok(row.birth_date && row.age_reference_date, "tanggal lahir dan tanggal acuan tersimpan");
        if (minor) {
          const noConsent = await submit(db, id, payload(years, { ...GUARDIAN, guardian_consent: false }));
          assert.match(noConsent.message || "", /guardian_consent_required/, label + " tanpa persetujuan wali ditolak");
          const noGuardian = await submit(db, id, payload(years));
          assert.match(noGuardian.message || "", /guardian_consent_required/, label + " tanpa data wali ditolak");
          const badRelation = await submit(db, id, payload(years, { ...GUARDIAN, guardian_relationship: "teman" }));
          assert.match(badRelation.message || "", /guardian_consent_required/, label + " hubungan wali tidak valid ditolak");
        }
      } else {
        assert.match(withGuardian.message || "", /age_requirement_not_met/, label + " harus ditolak walau wali menyetujui");
      }
    }
    // Batas tepat: ulang tahun ke-N baru tiba besok => usia N-1 => ditolak pada batas minimum.
    const edge = await submit(db, id, payload(rule.min, GUARDIAN, 1));
    assert.match(edge.message || "", /age_requirement_not_met/, rule.name + ": ulang tahun besok belum cukup umur");
    const exact = await submit(db, id, payload(rule.min, GUARDIAN, 0));
    assert.ok(exact.ok, rule.name + ": ulang tahun hari ini cukup umur: " + exact.message);
  }
  // Usia dari klien diabaikan: kolom age dihitung dari tanggal lahir.
  const id = await openRecruitment(db, RULES[0]);
  const spoof = await submit(db, id, payload(13, { ...GUARDIAN, age: 30 }));
  assert.match(spoof.message || "", /age_requirement_not_met/);
});

test("SQL: lantai program tetap berlaku walau minimum_age angkatan lebih rendah atau kosong", async (t) => {
  const mod = await loadPglite();
  if (!mod) return t.skip("PGlite tidak terpasang");
  const db = await setup(mod.PGlite);
  await db.exec(read("20261124_usia_wali/02_apply.sql").replace(/^begin;/m, "begin;"));
  const amexLow = await openRecruitment(db, RULES[2], 12);
  assert.match((await submit(db, amexLow, payload(15, GUARDIAN))).message || "", /age_requirement_not_met/, "AMEX 15 tahun ditolak walau angkatan 12");
  assert.ok((await submit(db, amexLow, payload(16, GUARDIAN))).ok);
  const dldpeLow = await openRecruitment(db, RULES[0], 10);
  assert.match((await submit(db, dldpeLow, payload(13, GUARDIAN))).message || "", /age_requirement_not_met/);
  const none = await openRecruitment(db, RULES[0], null);
  assert.match((await submit(db, none, payload(20))).message || "", /age_requirement_unconfirmed/);
  const higher = await openRecruitment(db, RULES[0], 17);
  assert.match((await submit(db, higher, payload(16, GUARDIAN))).message || "", /age_requirement_not_met/, "angkatan boleh menaikkan batas");
});

test("SQL: tanggal lahir tidak valid ditolak; pendaftaran tertutup tetap ditolak lebih dulu", async (t) => {
  const mod = await loadPglite();
  if (!mod) return t.skip("PGlite tidak terpasang");
  const db = await setup(mod.PGlite);
  await db.exec(read("20261124_usia_wali/02_apply.sql"));
  const id = await openRecruitment(db, RULES[0]);
  for (const bad of [undefined, "", "bukan-tanggal", "2999-01-01", "1800-01-01", "1900-01-01"]) {
    const result = await submit(db, id, payload(20, { birth_date: bad }));
    assert.match(result.message || "", /invalid_birth_date/, String(bad));
  }
  await db.query("update public.recruitments set status = 'closed' where id = $1", [id]);
  assert.match((await submit(db, id, payload(20))).message || "", /recruitment_closed/);
});

test("SQL: peserta di bawah 18 tidak dapat diterima tanpa persetujuan wali (constraint + review)", async (t) => {
  const mod = await loadPglite();
  if (!mod) return t.skip("PGlite tidak terpasang");
  const db = await setup(mod.PGlite);
  await db.exec(read("20261124_usia_wali/02_apply.sql"));
  const id = await openRecruitment(db, RULES[0]);
  const ok = await submit(db, id, payload(15, GUARDIAN));
  const appId = (await db.query("select id from public.applications where reference_code = $1", [ok.reference])).rows[0].id;
  const reviewer = "11111111-1111-4111-8111-111111111111";
  await db.query("insert into public.ddpe_permissions (user_id, permission, scope_type, scope_id) values ($1, 'application_reviewer', 'organization', null)", [reviewer]);
  // Constraint database: peserta di bawah 18 tanpa persetujuan wali tidak bisa disimpan, apa pun jalurnya.
  await assert.rejects(() => db.query("insert into public.applications (reference_code, recruitment_id, submission_key, full_name, email, whatsapp, regency, province, age, is_minor, activity, interests, motivation, availability, data_consent, truthful_statement) values ('X-1', $1, gen_random_uuid(), 'Anak', 'anak@example.test', '081234567890', 'Mimika', 'Papua', 15, true, 'pelajar', 'x', 'motivasi cukup panjang sekali', 'x', true, true)", [id]), /applications_minor_guardian_check/);
  await db.query("update public.applications set guardian_consent = false where id = $1", [appId]).catch(() => {});
  // Persetujuan tercatat -> bisa diterima.
  await db.query("select public.review_ddpe_application($1::uuid, 'accepted', 'ok', $2::uuid)", [appId, reviewer]);
  assert.equal((await db.query("select status from public.applications where id = $1", [appId])).rows[0].status, "accepted");
});

test("SQL: 03_verify semua true, data lama utuh, dan rollback memulihkan fungsi lama", async (t) => {
  const mod = await loadPglite();
  if (!mod) return t.skip("PGlite tidak terpasang");
  const db = await setup(mod.PGlite);
  const id = await openRecruitment(db, RULES[0], 18);
  const legacy = await db.query("insert into public.applications (reference_code, recruitment_id, submission_key, full_name, email, whatsapp, regency, province, age, activity, interests, motivation, availability, data_consent, truthful_statement) values ('LAMA-1', $1, gen_random_uuid(), 'Peserta Lama', 'lama@example.test', '081234567890', 'Mimika', 'Papua', 22, 'bekerja', 'x', 'motivasi cukup panjang sekali', 'x', true, true) returning id", [id]);
  await db.exec(read("20261124_usia_wali/01_backup.sql"));
  await db.exec(read("20261124_usia_wali/02_apply.sql"));
  await db.exec(read("20261124_usia_wali/02_apply.sql")); // idempoten
  const verify = (await db.query(read("20261124_usia_wali/03_verify.sql"))).rows;
  assert.ok(verify.length >= 7);
  for (const row of verify) assert.equal(row.ok, true, row.cek);
  const kept = (await db.query("select age, is_minor, birth_date, full_name from public.applications where id = $1", [legacy.rows[0].id])).rows[0];
  assert.deepEqual({ ...kept }, { age: 22, is_minor: false, birth_date: null, full_name: "Peserta Lama" }, "data lama tidak berubah");
  await db.exec(read("20261124_usia_wali/04_rollback.sql"));
  const fns = (await db.query("select proname from pg_proc where proname in ('ddpe_age_on', 'ddpe_program_min_age')")).rows;
  assert.equal(fns.length, 0, "fungsi baru dihapus");
  const restored = (await db.query("select pg_get_functiondef(oid) as def from pg_proc where proname = 'submit_ddpe_application'")).rows[0].def;
  assert.ok(restored.includes("age_requirement_not_met") && !restored.includes("birth_date"), "fungsi lama dipulihkan");
  assert.equal((await db.query("select count(*)::int as n from public.applications")).rows[0].n, 1, "baris pendaftar tetap");
});

test("API -> RPC SQL nyata: batas usia 13-18 per program lewat /api/submissions", async (t) => {
  const mod = await loadPglite();
  if (!mod) return t.skip("PGlite tidak terpasang");
  const db = await setup(mod.PGlite);
  await db.exec(read("20261124_usia_wali/02_apply.sql"));
  const original = global.fetch;
  process.env.SUPABASE_URL = "https://project.test";
  process.env.SUPABASE_ANON_KEY = "k";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "s";
  process.env.DDPE_RATE_LIMIT_SECRET = "x".repeat(40);
  delete process.env.RESEND_API_KEY;
  global.fetch = async (rawUrl, init) => {
    const url = String(rawUrl);
    if (url.includes("/rest/v1/rpc/submit_ddpe_application")) {
      const body = JSON.parse(init.body);
      try {
        const result = await db.query("select public.submit_ddpe_application($1::uuid, $2::uuid, $3::jsonb, $4) as ref", [body.p_recruitment_id, body.p_submission_key, JSON.stringify(body.p_payload), body.p_fingerprint]);
        return json(200, result.rows[0].ref);
      } catch (error) { return json(400, { code: "P0001", message: error.message }); }
    }
    return json(200, []);
  };
  try {
    let n = 0;
    for (const rule of RULES) {
      const id = await openRecruitment(db, rule);
      for (let years = 13; years <= 18; years += 1) {
        n += 1;
        const res = response();
        const body = { kind: "application", recruitment_id: id, submission_key: "10000000-0000-4000-8000-" + String(n).padStart(12, "0"), ...payload(years, years < 18 ? GUARDIAN : {}) };
        await require("../api/submissions")({ method: "POST", headers: { host: "ddpe.test", "x-forwarded-for": "203.0.113." + n }, body }, res);
        const label = rule.name + " usia " + years;
        if (years >= rule.min) assert.equal(res.statusCode, 201, label + " " + res.body);
        else { assert.equal(res.statusCode, 400, label); assert.equal(JSON.parse(res.body).error, "age_requirement_not_met", label); }
      }
      // Di bawah 18 tanpa data wali ditolak oleh API sebelum menyentuh database.
      n += 1;
      const res = response();
      await require("../api/submissions")({ method: "POST", headers: { host: "ddpe.test", "x-forwarded-for": "203.0.114." + n }, body: { kind: "application", recruitment_id: id, submission_key: "10000000-0000-4000-8000-" + String(n).padStart(12, "0"), ...payload(rule.min) }, }, res);
      assert.equal(JSON.parse(res.body).error, "guardian_required", rule.name);
    }
  } finally { global.fetch = original; }
});
