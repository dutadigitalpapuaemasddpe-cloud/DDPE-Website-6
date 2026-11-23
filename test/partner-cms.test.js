"use strict";

// Alur Kelola Mitra: Tambah -> Simpan (Draf) -> Terbit -> Tampil Publik -> Edit -> Arsip.
// Penyimpanan adalah basis data palsu di memori (meniru save_ddpe_cms_setting); production tidak disentuh.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const json = (status, payload) => new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
const response = () => ({ statusCode: 0, body: "", setHeader() {}, end(value) { this.body = value || ""; } });
const ORG = (permission) => ({ permission, scope_type: "organization", scope_id: null });
const LEGACY = (id, order) => ({ id, name: "Mitra " + id.toUpperCase(), category: "Komunitas", summary: "Mitra lama.", summary_en: "", logo: "assets/x.png", logo_alt: "Logo", website: "", order, featured: true, status: "published" });

function backend(permissions, seed) {
  const store = new Map();
  (seed || []).forEach((p, i) => store.set("cms_partner:" + p.id, { value: p, updated_at: "2026-11-24T00:00:0" + i + "Z", is_public: true }));
  let tick = 10;
  global.fetch = async (rawUrl, init) => {
    const url = decodeURIComponent(rawUrl);
    const body = init && init.body ? JSON.parse(init.body) : null;
    if (url.endsWith("/auth/v1/user")) return json(200, { id: "editor-1" });
    if (url.includes("/rest/v1/ddpe_permissions")) return json(200, permissions);
    if (url.includes("/rest/v1/ddpe_audit_log")) return json(201, []);
    if (url.includes("/rpc/save_ddpe_cms_setting")) {
      if (!permissions.some((p) => p.permission === "content_editor")) return json(400, { code: "P0001", message: "forbidden" });
      if (!/^cms_(page|event|partner):[a-zA-Z0-9_.-]+$/.test(body.p_key)) return json(400, { code: "P0001", message: "invalid_key" });
      const current = store.get(body.p_key);
      if ((current ? current.updated_at : null) !== (body.p_version || null)) return json(400, { code: "P0001", message: "cms_conflict" });
      store.set(body.p_key, { value: body.p_value, is_public: true, updated_at: "2026-11-25T00:00:" + String(++tick).padStart(2, "0") + "Z" });
      return json(200, null);
    }
    if (url.includes("/rest/v1/site_settings")) {
      const m = url.match(/setting_key=eq\.([^&]+)/);
      const publicOnly = url.includes("is_public=eq.true");
      const rows = [...store.entries()]
        .filter(([k, r]) => (m ? k === m[1] : k.startsWith("cms_partner:")) && (!publicOnly || r.is_public))
        .map(([k, r]) => ({ setting_key: k, value: r.value, updated_at: r.updated_at }));
      if (!m && !url.includes("cms_partner")) return json(200, []);
      return json(200, rows);
    }
    throw new Error("Permintaan tak terduga: " + url);
  };
  return store;
}

function load() {
  Object.keys(require.cache).filter((k) => k.startsWith(path.join(root, "api"))).forEach((k) => delete require.cache[k]);
  process.env.SUPABASE_URL = "https://isolated.test";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service";
  process.env.SUPABASE_ANON_KEY = "test-anon";
  return { admin: require("../api/admin"), pub: require("../api/public-site-content"), media: require("../api/media") };
}
async function admin(h, method, input, query) {
  const res = response();
  await h.admin({ method, headers: { authorization: "Bearer t", origin: "https://www.ddpe.my.id", host: "www.ddpe.my.id" }, query: query || {}, body: input, [Symbol.asyncIterator]: async function* () { if (input) yield Buffer.from(JSON.stringify(input)); } }, res);
  return { status: res.statusCode, body: JSON.parse(res.body || "{}") };
}
async function publicData(h) {
  const res = response();
  await h.pub({ method: "GET", headers: {}, query: {} }, res);
  return JSON.parse(res.body);
}
const BASE = { id: "mitra-uji", name: "Mitra Uji", category: "Pendidikan", summary: "Deskripsi uji.", summary_en: "", logo: "", logo_alt: "", website: "https://example.org", order: 5, featured: false, status: "draft" };

test("Tambah -> Simpan -> Terbit -> Tampil Publik -> Edit -> Arsip, mitra lama tidak berubah", async () => {
  const legacy = [LEGACY("a", 1), LEGACY("b", 2), LEGACY("c", 3)];
  backend([ORG("content_editor"), ORG("publisher")], legacy);
  const h = load();

  let list = await admin(h, "GET", null, { view: "partners" });
  assert.equal(list.body.partners.length, 3);

  let saved = await admin(h, "POST", { action: "save_partner", partner: BASE, version: null });
  assert.equal(saved.status, 200);
  let pub = await publicData(h);
  assert.deepEqual(pub.partners.map((p) => p.id), ["a", "b", "c"], "Draf tidak tampil publik");
  assert.equal(pub.partners_managed, true);

  list = await admin(h, "GET", null, { view: "partners" });
  const draft = list.body.partners.find((p) => p.id === "mitra-uji");
  saved = await admin(h, "POST", { action: "save_partner", partner: { ...BASE, status: "published" }, version: draft.version });
  assert.equal(saved.status, 200);
  pub = await publicData(h);
  assert.deepEqual(pub.partners.map((p) => p.id), ["mitra-uji", "a", "b", "c"].sort((x, y) => ({ a: 1, b: 2, c: 3, "mitra-uji": 5 }[x] - { a: 1, b: 2, c: 3, "mitra-uji": 5 }[y])), "Terbit tampil, urut sesuai urutan tampil");
  assert.ok(!("status" in pub.partners[0]) && !("version" in pub.partners[0]));

  list = await admin(h, "GET", null, { view: "partners" });
  const live = list.body.partners.find((p) => p.id === "mitra-uji");
  saved = await admin(h, "POST", { action: "save_partner", partner: { ...BASE, status: "published", name: "Mitra Uji Baru", order: 0 }, version: live.version });
  assert.equal(saved.status, 200);
  pub = await publicData(h);
  assert.equal(pub.partners[0].name, "Mitra Uji Baru");

  list = await admin(h, "GET", null, { view: "partners" });
  const edited = list.body.partners.find((p) => p.id === "mitra-uji");
  const archived = await admin(h, "POST", { action: "archive_partner", id: "mitra-uji", version: edited.version });
  assert.equal(archived.status, 200);
  pub = await publicData(h);
  assert.deepEqual(pub.partners.map((p) => p.id), ["a", "b", "c"], "Arsip hilang dari publik; mitra lama utuh dan tidak ganda");
  list = await admin(h, "GET", null, { view: "partners" });
  assert.equal(list.body.partners.find((p) => p.id === "mitra-uji").status, "archived");
});

test("Izin: editor tanpa penerbit tidak dapat menerbitkan atau mengubah mitra Terbit; tanpa izin ditolak", async () => {
  backend([ORG("content_editor")], [LEGACY("a", 1)]);
  const h = load();
  assert.equal((await admin(h, "POST", { action: "save_partner", partner: BASE, version: null })).status, 200, "Draf boleh");
  assert.equal((await admin(h, "POST", { action: "save_partner", partner: { ...BASE, id: "x2", status: "published" }, version: null })).status, 403);
  assert.equal((await admin(h, "POST", { action: "archive_partner", id: "a", version: null })).status, 403);

  backend([ORG("partnership_reviewer")], []);
  const h2 = load();
  assert.equal((await admin(h2, "GET", null, { view: "partners" })).status, 403);
  assert.equal((await admin(h2, "POST", { action: "save_partner", partner: BASE, version: null })).status, 403);
});

test("Validasi: tautan, logo, nama, status, urutan; konflik versi", async () => {
  backend([ORG("content_editor"), ORG("publisher")], []);
  const h = load();
  for (const bad of [{ website: "javascript:alert(1)" }, { website: "http://x.org" }, { logo: "javascript:x" }, { logo: "http://x.org/a.png" }, { name: "" }, { status: "live" }, { order: -1 }, { order: 1.5 }, { id: "a b" }]) {
    assert.equal((await admin(h, "POST", { action: "save_partner", partner: { ...BASE, ...bad }, version: null })).status, 400, JSON.stringify(bad));
  }
  assert.equal((await admin(h, "POST", { action: "save_partner", partner: { ...BASE, logo: "assets/a.png" }, version: null })).status, 200);
  assert.equal((await admin(h, "POST", { action: "save_partner", partner: BASE, version: null })).status, 409, "versi basi -> cms_conflict");
});

test("Publik: belum ada data CMS -> managed false (halaman memakai daftar bawaan); semua diarsipkan -> kosong", async () => {
  backend([ORG("content_editor"), ORG("publisher")], []);
  let h = load();
  let pub = await publicData(h);
  assert.equal(pub.partners_managed, false);
  assert.deepEqual(pub.partners, []);
  backend([ORG("content_editor"), ORG("publisher")], [{ ...LEGACY("a", 1), status: "archived" }]);
  h = load();
  pub = await publicData(h);
  assert.equal(pub.partners_managed, true);
  assert.deepEqual(pub.partners, []);
});

test("Hapus permanen hanya untuk Draf/Arsip", async () => {
  backend([ORG("content_editor"), ORG("publisher")], [LEGACY("a", 1)]);
  const h = load();
  assert.equal((await admin(h, "POST", { action: "delete_partner", id: "a" })).status, 409);
  let list = await admin(h, "GET", null, { view: "partners" });
  await admin(h, "POST", { action: "archive_partner", id: "a", version: list.body.partners[0].version });
  list = await admin(h, "GET", null, { view: "partners" });
  assert.equal((await admin(h, "POST", { action: "delete_partner", id: "a", version: list.body.partners[0].version })).status, 200);
  assert.equal((await admin(h, "GET", null, { view: "partners" })).body.partners.length, 0);
});

test("Unggah logo: batas 2 MB dan jalur partners/ ada di media.js; SQL & UI terpasang", () => {
  const media = fs.readFileSync(path.join(root, "api/media.js"), "utf8");
  assert.match(media, /partner_logo/);
  assert.match(media, /"partners\/"/);
  const dash = fs.readFileSync(path.join(root, "dashboard.html"), "utf8");
  assert.match(dash, /Daftar Mitra/);
  assert.match(dash, /Pengajuan Kemitraan/);
  assert.match(dash, /id="partnership-list"/);
  const sql = fs.readFileSync(path.join(root, "supabase/reconcile/20261125_mitra_cms/02_apply.sql"), "utf8");
  assert.match(sql, /\(page\|event\|partner\)/);
  assert.equal((sql.match(/'cms_partner:[a-z-]+'/g) || []).length, 3);
  assert.match(sql, /on conflict \(setting_key\) do nothing/);
});
