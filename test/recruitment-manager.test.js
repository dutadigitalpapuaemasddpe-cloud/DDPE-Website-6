"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const USER = "11111111-1111-4111-8111-111111111111";
const ORG = (permission) => ({ permission, scope_type: "organization", scope_id: null });
const json = (status, payload) => new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
const response = () => ({ statusCode: 0, body: "", setHeader() {}, end(value) { this.body = value || ""; } });
const iso = (offsetMs) => new Date(Date.now() + offsetMs).toISOString();
const DAY = 86400000;
const { witToday } = require("../api/_lib/age");
// Tanggal lahir tepat N tahun penuh pada hari ini (WIT); offsetDays > 0 membuatnya lebih muda (ulang tahun belum tiba).
function birthFor(years, offsetDays) {
  const [y, m, d] = witToday().split("-").map(Number);
  const date = new Date(Date.UTC(y - years, m - 1, m === 2 && d === 29 ? 28 : d) + (offsetDays || 0) * DAY);
  return date.toISOString().slice(0, 10);
}

// Basis data palsu di memori. Fungsi RPC meniru aturan submit_ddpe_application di
// supabase/reconcile/20261123_ruang_pengurus/02_apply.sql (status, jendela waktu, usia).
function fakeBackend(permissions) {
  const state = { recruitments: [], applications: [], patches: [], counter: 0 };
  global.fetch = async (rawUrl, init) => {
    const url = decodeURIComponent(rawUrl);
    const method = (init && init.method) || "GET";
    const body = init && init.body ? JSON.parse(init.body) : null;
    if (url.endsWith("/auth/v1/user")) return json(200, { id: USER });
    if (url.includes("/rest/v1/ddpe_permissions")) return json(200, permissions);
    if (url.includes("/rest/v1/ddpe_audit_log")) return json(201, []);
    if (url.includes("/rest/v1/rpc/submit_ddpe_application")) {
      const row = state.recruitments.find((item) => item.id === body.p_recruitment_id);
      const now = Date.now();
      if (!row || row.status !== "open" || (row.opens_at && Date.parse(row.opens_at) > now) || (row.closes_at && Date.parse(row.closes_at) <= now)) {
        return json(400, { code: "P0001", message: "recruitment_closed" });
      }
      state.applications.push(body.p_payload);
      return json(200, "DDPE-TEST000001");
    }
    if (url.includes("/rpc/consume_ddpe_rate_limit")) return json(200, true);
    if (url.includes("/rest/v1/recruitments")) {
      if (method === "POST") {
        const row = { id: "00000000-0000-4000-8000-" + String(++state.counter).padStart(12, "0"), ...body };
        state.recruitments.push(row);
        return json(201, [row]);
      }
      if (method === "PATCH") {
        const id = url.match(/id=eq\.([^&]+)/)[1];
        const row = state.recruitments.find((item) => item.id === id);
        if (!row) return json(200, []);
        state.patches.push(body);
        Object.assign(row, body);
        return json(200, [row]);
      }
      if (url.includes("status=eq.open")) return json(200, state.recruitments.filter((item) => item.status === "open"));
      const id = (url.match(/id=eq\.([^&]+)/) || [])[1];
      return json(200, id ? state.recruitments.filter((item) => item.id === id) : state.recruitments);
    }
    return json(200, []);
  };
  return state;
}

async function admin(body) {
  const res = response();
  await require("../api/admin")({ method: "POST", headers: { authorization: "Bearer t", host: "ddpe.test" }, body }, res);
  return { status: res.statusCode, body: JSON.parse(res.body) };
}
async function publicList() {
  const res = response();
  await require("../api/public-recruitments")({ method: "GET", query: {} }, res);
  return JSON.parse(res.body).recruitments;
}
async function apply(recruitmentId) {
  process.env.DDPE_RATE_LIMIT_SECRET = "x".repeat(40);
  const res = response();
  await require("../api/submissions")({ method: "POST", headers: { host: "ddpe.test", "x-forwarded-for": "203.0.113.9" }, body: {
    kind: "application", recruitment_id: recruitmentId, submission_key: "22222222-2222-4222-8222-222222222222",
    full_name: "Calon Duta", email: "calon@example.test", whatsapp: "081234567890", regency: "Mimika", province: "Papua Tengah",
    birth_date: birthFor(20), activity: "mahasiswa", interests: "Literasi digital", motivation: "Ingin belajar dan berkontribusi bagi pemuda Papua.",
    availability: "Akhir pekan", data_consent: true, truthful_statement: true
  } }, res);
  return { status: res.statusCode, body: JSON.parse(res.body || "{}") };
}
function withEnv(fn) {
  return async () => {
    const original = global.fetch;
    process.env.SUPABASE_URL = "https://project.test";
    process.env.SUPABASE_ANON_KEY = "k";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "s";
    delete process.env.RESEND_API_KEY;
    try { await fn(); } finally { global.fetch = original; }
  };
}
const draft = (extra) => ({
  action: "save_recruitment", kind: "ambassador", pillar_id: "dldpe", title: "Pendaftaran Duta DLDPE Angkatan II",
  scope: "Duta literasi digital", requirements: "Berusia 14 tahun ke atas", minimum_age: 14,
  opens_at: iso(-DAY), closes_at: iso(DAY), ...extra
});

test("alur pengurus -> API -> publik: simpan, buka, daftar, tutup, daftar ditolak", withEnv(async () => {
  const state = fakeBackend([ORG("content_editor"), ORG("publisher")]);
  const created = await admin(draft());
  assert.equal(created.status, 201);
  const id = created.body.recruitment.id;
  assert.equal(created.body.recruitment.status, "draft");
  assert.deepEqual(await publicList(), [], "draf tidak tampil di publik");
  assert.equal((await apply(id)).status, 409, "draf menolak pendaftaran");

  assert.equal((await admin({ action: "publish_recruitment", id })).status, 200);
  assert.deepEqual((await publicList()).map((row) => row.id), [id], "periode terbuka tampil di publik");
  assert.equal((await apply(id)).status, 201);
  assert.equal(state.applications.length, 1);

  assert.equal((await admin({ action: "close_recruitment", id })).status, 200);
  assert.deepEqual(await publicList(), [], "periode ditutup hilang dari publik");
  const rejected = await apply(id);
  assert.equal(rejected.status, 409);
  assert.equal(rejected.body.error, "recruitment_closed");
  assert.equal(state.applications.length, 1, "pendaftaran baru tidak tersimpan setelah ditutup");
}));

test("menyimpan periode yang sedang terbuka tidak menutupnya diam-diam", withEnv(async () => {
  const state = fakeBackend([ORG("content_editor"), ORG("publisher")]);
  const id = (await admin(draft())).body.recruitment.id;
  await admin({ action: "publish_recruitment", id });
  const edited = await admin(draft({ id, title: "Judul baru angkatan II" }));
  assert.equal(edited.status, 200);
  assert.equal(edited.body.recruitment.status, "open");
  assert.ok(!("status" in state.patches[state.patches.length - 1]), "PATCH simpan tidak mengirim status");
  assert.equal((await publicList()).length, 1);
}));

test("validasi tanggal, usia, dan hak akses", withEnv(async () => {
  fakeBackend([ORG("content_editor")]);
  assert.equal((await admin(draft({ opens_at: iso(DAY), closes_at: iso(-DAY) }))).body.error, "check_recruitment_dates");
  assert.equal((await admin(draft({ opens_at: "bukan-tanggal" }))).body.error, "check_recruitment_dates");
  assert.equal((await admin(draft({ title: "" }))).body.error, "check_recruitment_fields");
  const id = (await admin(draft())).body.recruitment.id;
  const blocked = await admin({ action: "publish_recruitment", id });
  assert.equal(blocked.status, 403, "editor tanpa izin penerbit tidak dapat membuka");

  const state = fakeBackend([ORG("content_editor"), ORG("publisher")]);
  const under = await admin(draft({ minimum_age: 13 }));
  assert.equal(under.status, 400, "batas usia DLDPE tidak boleh di bawah 14");
  assert.equal(under.body.error, "check_recruitment_age");
  const amex = await admin(draft({ kind: "volunteer", pillar_id: "", program_id: "amex", minimum_age: 15 }));
  assert.equal(amex.body.error, "check_recruitment_age", "batas usia AMEX tidak boleh di bawah 16");
  const dflt = await admin(draft({ kind: "volunteer", pillar_id: "", program_id: "amex", minimum_age: "" }));
  assert.equal(dflt.body.recruitment.minimum_age, 16, "kosong = batas program");
  assert.equal((await admin({ action: "publish_recruitment", id: dflt.body.recruitment.id })).status, 200, "usia 16 boleh dibuka untuk AMEX");
  state.recruitments.push({ id: "99999999-9999-4999-8999-999999999999", kind: "ambassador", pillar_id: "didpe", minimum_age: 13, status: "draft" });
  assert.equal((await admin({ action: "publish_recruitment", id: "99999999-9999-4999-8999-999999999999" })).body.error, "age_requirement_below_program");
  assert.equal((await admin({ action: "publish_recruitment", id: "tidak-ada" })).status, 404);
}));

test("periode terbuka tidak boleh diubah menjadi tidak valid melalui Simpan", withEnv(async () => {
  fakeBackend([ORG("content_editor"), ORG("publisher")]);
  const id = (await admin(draft())).body.recruitment.id;
  await admin({ action: "publish_recruitment", id });
  assert.equal((await admin(draft({ id, minimum_age: 13 }))).body.error, "check_recruitment_age");
  assert.equal((await admin(draft({ id, opens_at: iso(-3 * DAY), closes_at: iso(-DAY) }))).body.error, "recruitment_outside_window");
}));

test("penolakan pendaftaran ditegakkan di database, bukan hanya di formulir", () => {
  const sql = fs.readFileSync(path.join(__dirname, "..", "supabase/reconcile/20261123_ruang_pengurus/02_apply.sql"), "utf8");
  const fn = sql.slice(sql.indexOf("function public.submit_ddpe_application"), sql.indexOf("function public.submit_ddpe_partnership"));
  assert.match(fn, /status <> 'open'/);
  assert.match(fn, /opens_at > now\(\)/);
  assert.match(fn, /closes_at <= now\(\)/);
  assert.match(fn, /raise exception 'recruitment_closed'/);
});

test("halaman publik membaca status dari API dan dashboard memakai aksi Buka/Tutup/Simpan", () => {
  const root = path.join(__dirname, "..");
  const opportunities = fs.readFileSync(path.join(root, "js/opportunities.js"), "utf8");
  assert.match(opportunities, /\/api\/public-recruitments/);
  assert.match(opportunities, /tidak sedang dibuka/);
  const apply = fs.readFileSync(path.join(root, "js/apply-form.js"), "utf8");
  assert.match(apply, /recruitment_closed/);
  const html = fs.readFileSync(path.join(root, "dashboard.html"), "utf8");
  for (const id of ["recruitment-form", "recruitment-list", "new-recruitment", "recruitment-feedback", "save-recruitment", "recruitment-track"]) {
    assert.ok(html.includes('id="' + id + '"'), id);
  }
  const dashboard = fs.readFileSync(path.join(root, "js/dashboard.js"), "utf8");
  for (const action of ["save_recruitment", "publish_recruitment", "close_recruitment"]) assert.ok(dashboard.includes(action), action);
});
