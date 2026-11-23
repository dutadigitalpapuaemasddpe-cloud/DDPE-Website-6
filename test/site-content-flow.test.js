"use strict";

// Alur Konten Halaman: pengurus -> /api/admin (save_site_content) -> penyimpanan terisolasi -> /api/public-site-content.
// Penyimpanan di sini adalah basis data palsu di memori; production tidak disentuh.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const defaults = require("../data/cms-defaults.json");
const json = (status, payload) => new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
const response = () => ({ statusCode: 0, body: "", setHeader() {}, end(value) { this.body = value || ""; } });
const ORG = (permission) => ({ permission, scope_type: "organization", scope_id: null });

function isolatedBackend(permissions) {
  const store = new Map(); // setting_key -> { value, updated_at }
  let tick = 0;
  global.fetch = async (rawUrl, init) => {
    const url = decodeURIComponent(rawUrl);
    const method = (init && init.method) || "GET";
    const body = init && init.body ? JSON.parse(init.body) : null;
    if (url.endsWith("/auth/v1/user")) return json(200, { id: "editor-1" });
    if (url.includes("/rest/v1/ddpe_permissions")) return json(200, permissions);
    if (url.includes("/rest/v1/ddpe_audit_log")) return json(201, []);
    if (url.includes("/rpc/save_ddpe_cms_setting")) {
      // Meniru save_ddpe_cms_setting: izin editor organisasi, kunci valid, dan kunci versi (cms_conflict).
      if (!permissions.some((p) => p.permission === "content_editor")) return json(400, { code: "P0001", message: "forbidden" });
      if (!/^cms_(page|event):[a-zA-Z0-9_.-]+$/.test(body.p_key)) return json(400, { code: "P0001", message: "invalid_key" });
      const current = store.get(body.p_key);
      if ((current ? current.updated_at : null) !== (body.p_version || null)) return json(400, { code: "P0001", message: "cms_conflict" });
      store.set(body.p_key, { value: body.p_value, updated_at: new Date(Date.UTC(2026, 10, 24, 0, 0, ++tick)).toISOString() });
      return json(200, null);
    }
    if (url.includes("/rest/v1/site_settings")) {
      if (url.includes("setting_key=eq.leadership")) return json(200, []);
      if (url.includes("cms_event")) return json(200, []);
      const rows = [...store.entries()].filter(([key]) => key.startsWith("cms_page:")).map(([key, row]) => ({ setting_key: key, value: row.value, updated_at: row.updated_at }));
      return json(200, rows);
    }
    throw new Error("unexpected request " + method + " " + url);
  };
  return store;
}

async function adminSave(body) {
  const res = response();
  await require("../api/admin")({ method: "POST", headers: { authorization: "Bearer t", host: "ddpe.test" }, body: { action: "save_site_content", ...body } }, res);
  return { status: res.statusCode, body: JSON.parse(res.body || "{}") };
}
async function adminPages() {
  const res = response();
  await require("../api/admin")({ method: "GET", query: { view: "site_content" }, headers: { authorization: "Bearer t", host: "ddpe.test" } }, res);
  return { status: res.statusCode, pages: (JSON.parse(res.body || "{}")).pages };
}
async function publicPages() {
  const res = response();
  await require("../api/public-site-content")({ method: "GET" }, res);
  assert.equal(res.statusCode, 200);
  return JSON.parse(res.body).pages;
}
function withEnv(fn) {
  return async () => {
    const original = global.fetch;
    process.env.SUPABASE_URL = "https://project.test";
    process.env.SUPABASE_ANON_KEY = "k";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "s";
    try { await fn(); } finally { global.fetch = original; }
  };
}
const card = (id, extra) => ({ id, title: "Judul " + id, text: "Paragraf satu.\n\nParagraf dua.", image: "", alt: "", button: "", href: "", ...extra });
const page = (extra) => ({ page_key: "program-dldpe.html", title: "Duta Literasi Digital", intro: "Pengantar halaman program yang cukup panjang.", sections: [{ ...card("section-1", { button: "Daftar", href: "pendaftaran-dldpe.html" }), cards: [card("card-1", { image: "https://db.test/foto.webp", alt: "Foto kegiatan" })] }], ...extra });

test("edit -> simpan -> API publik menyajikan konten yang sama; halaman lain tidak berubah", withEnv(async () => {
  const store = isolatedBackend([ORG("content_editor")]);
  assert.deepEqual(await publicPages(), {}, "sebelum diterbitkan: tidak ada penimpaan, halaman memakai teks bawaan");
  const saved = await adminSave(page());
  assert.equal(saved.status, 200);
  const published = await publicPages();
  assert.deepEqual(Object.keys(published), ["program-dldpe.html"]);
  const live = published["program-dldpe.html"];
  assert.equal(live.title, "Duta Literasi Digital");
  assert.equal(live.sections[0].title, "Judul section-1");
  assert.equal(live.sections[0].button, "Daftar");
  assert.equal(live.sections[0].cards[0].image, "https://db.test/foto.webp");
  assert.equal(store.size, 1);
  // Mengubah halaman kedua tidak menyentuh yang pertama.
  await adminSave({ page_key: "kontak.html", title: "Hubungi Kami", intro: "Pengantar halaman kontak yang cukup panjang.", sections: [] });
  assert.equal((await publicPages())["program-dldpe.html"].title, "Duta Literasi Digital");
  assert.equal((await publicPages())["kontak.html"].title, "Hubungi Kami");
}));

test("kunci versi: simpan dengan versi usang ditolak, versi terbaru diterima", withEnv(async () => {
  isolatedBackend([ORG("content_editor")]);
  assert.equal((await adminSave(page({ version: null }))).status, 200);
  const version = (await adminPages()).pages["program-dldpe.html"].version;
  assert.ok(version, "API admin mengembalikan versi untuk dikirim balik");
  const stale = await adminSave(page({ title: "Versi lama", version: null }));
  assert.equal(stale.status, 409);
  assert.equal(stale.body.error, "cms_conflict");
  assert.equal((await publicPages())["program-dldpe.html"].title, "Duta Literasi Digital", "konflik tidak menimpa data");
  assert.equal((await adminSave(page({ title: "Versi baru", version }))).status, 200);
  assert.equal((await publicPages())["program-dldpe.html"].title, "Versi baru");
}));

test("izin: tanpa login 401, penerbit tanpa izin editor 403, data tidak berubah", withEnv(async () => {
  const store = isolatedBackend([ORG("publisher")]);
  assert.equal((await adminSave(page())).status, 403);
  assert.equal(store.size, 0);
  const res = response();
  await require("../api/admin")({ method: "POST", headers: { host: "ddpe.test" }, body: { action: "save_site_content", ...page() } }, res);
  assert.equal(res.statusCode, 401);
  // Penerbit boleh membaca (mode lihat di dashboard).
  assert.equal((await adminPages()).status, 200);
}));

test("payload tidak valid ditolak dan tidak tersimpan", withEnv(async () => {
  const store = isolatedBackend([ORG("content_editor")]);
  const bad = [
    page({ title: "" }),
    page({ intro: "" }),
    page({ page_key: "dashboard.html" }),
    page({ page_key: "../api/admin" }),
    page({ sections: [{ ...card("s1", { title: "" }), cards: [] }] }),
    page({ sections: [{ ...card("s1", { href: "javascript:alert(1)", button: "x" }), cards: [] }] }),
    page({ sections: [{ ...card("s1", { image: "http://tidak-aman.test/a.jpg" }), cards: [] }] }),
    page({ sections: [{ ...card("s1"), cards: [] }, { ...card("s1"), cards: [] }] }),
    page({ sections: Array.from({ length: 31 }, (_, i) => ({ ...card("s" + i), cards: [] })) }),
    page({ sections: [{ ...card("s1"), cards: Array.from({ length: 21 }, (_, i) => card("c" + i)) }] }),
    page({ sections: [{ ...card("bad id!"), cards: [] }] })
  ];
  for (const payload of bad) {
    const result = await adminSave(payload);
    assert.equal(result.status, 400, JSON.stringify(payload).slice(0, 80));
  }
  assert.equal(store.size, 0);
}));

test("API publik hanya menyajikan halaman yang dikenal CMS dan mengabaikan kunci asing", withEnv(async () => {
  const store = isolatedBackend([ORG("content_editor")]);
  store.set("cms_page:rahasia.html", { value: { title: "Rahasia", intro: "Tidak boleh keluar.", sections: [] }, updated_at: "2026-11-24T00:00:00.000Z" });
  await adminSave(page());
  assert.deepEqual(Object.keys(await publicPages()), ["program-dldpe.html"]);
}));

test("kontrak halaman publik: setiap halaman CMS punya tempat tampil, dan pilihan dashboard sama dengan daftar halaman", () => {
  const dashboard = fs.readFileSync(path.join(root, "dashboard.html"), "utf8");
  const selectBlock = dashboard.slice(dashboard.indexOf('id="site-content-page"'), dashboard.indexOf("</select>", dashboard.indexOf('id="site-content-page"')));
  const options = [...selectBlock.matchAll(/<option value="([^"]+)"/g)].map((m) => m[1]).sort();
  assert.deepEqual(options, Object.keys(defaults).sort(), "pilihan halaman dashboard = cms-defaults.json");
  const admin = fs.readFileSync(path.join(root, "api/admin.js"), "utf8");
  for (const key of Object.keys(defaults)) assert.ok(admin.includes('"' + key + '"'), key + " ada di daftar API admin");
  for (const [key, value] of Object.entries(defaults)) {
    const html = fs.readFileSync(path.join(root, key), "utf8");
    if (key === "struktur.html") {
      // Pengecualian yang dijelaskan di dashboard: halaman ini menampilkan direktori Kepengurusan.
      assert.ok(html.includes('id="leadership-directory"'), "struktur memakai direktori Kepengurusan");
      continue;
    }
    assert.ok(/site-home-welcome-copy|site-page-heading|site-news-heading/.test(html), key + " punya tempat pengantar");
    const hosts = [...html.matchAll(/data-cms-section="([^"]+)"/g)].map((m) => m[1]);
    for (const section of value.sections) {
      assert.ok(hosts.includes(section.id) || html.includes("data-cms-extra"), key + " " + section.id + " punya tempat tampil");
    }
  }
});

test("dashboard Konten Halaman: langkah Halaman -> Section -> Elemen, pratinjau, dan hanya tombol yang didukung backend", () => {
  const html = fs.readFileSync(path.join(root, "dashboard.html"), "utf8");
  const code = fs.readFileSync(path.join(root, "js/dashboard-content.js"), "utf8");
  const panel = html.slice(html.indexOf('data-panel="site_content"'), html.indexOf('data-panel="leadership"'));
  for (const id of ["site-content-form", "site-content-page", "cms-outline", "cms-sections", "add-section", "cms-preview", "cms-publish", "cms-reset", "cms-defaults", "site-content-feedback", "cms-preview-dialog"]) {
    assert.ok(panel.includes('id="' + id + '"'), id);
  }
  assert.ok(!/Simpan Draft|Simpan draf/i.test(panel), "tidak ada tombol draf palsu: backend hanya menyimpan versi terbit");
  assert.match(code, /action: "save_site_content"/);
  assert.match(code, /\/api\/public-site-content/, "penerbitan diverifikasi lewat API publik");
  assert.match(code, /window\.confirm\("Terbitkan perubahan/);
});
