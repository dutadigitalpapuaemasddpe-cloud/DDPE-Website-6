/* Ruang Pengurus > Kemitraan: tab Daftar Mitra (CMS mitra) dan Pengajuan Kemitraan.
   Memakai /api/admin (view=partners, save_partner, archive_partner, delete_partner) dan unggah logo lewat /api/media. */
(function () {
  "use strict";
  var form = document.getElementById("partner-form");
  if (!form) return;

  var STATUS = { published: "Terbit", draft: "Draf", archived: "Diarsipkan" };
  var LOGO_MAX = 2 * 1024 * 1024;
  var rows = [];
  var inquiryRenderer = null;
  var D = function () { return window.DDPEDashboard; };
  var $ = function (id) { return document.getElementById(id); };
  var list = $("partner-list"), feedback = $("partner-feedback");
  var tabs = Array.prototype.slice.call(document.querySelectorAll("[data-partner-tab]"));
  var logoFile = $("partner-logo-file"), logoPreview = $("partner-logo-preview");

  function say(message, kind) { feedback.textContent = message || ""; feedback.dataset.state = kind || ""; }
  function el(tag, text, cls) { var n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; }
  function btn(label, cls, fn) { var b = el("button", label, cls || "site-button site-button-outline"); b.type = "button"; b.addEventListener("click", fn); return b; }
  function slugify(name) { return String(name).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "mitra"; }
  function canPublish() { return D().has("publisher"); }

  function showTab(name) {
    tabs.forEach(function (t) { t.setAttribute("aria-selected", String(t.dataset.partnerTab === name)); });
    $("partners-pane").hidden = name !== "partners";
    $("inquiries-pane").hidden = name !== "inquiries";
  }
  tabs.forEach(function (t) { t.addEventListener("click", function () { showTab(t.dataset.partnerTab); }); });

  function setLogo(url, alt) {
    form.elements.logo.value = url || "";
    logoPreview.hidden = !url;
    if (url) { logoPreview.src = url; logoPreview.alt = alt || ""; }
  }
  function openForm(row) {
    form.reset();
    form.hidden = false;
    $("partner-form-title").textContent = row ? "Edit mitra" : "Tambah mitra";
    var r = row || { id: "", version: "", name: "", category: "Komunitas", summary: "", summary_en: "", website: "", logo: "", logo_alt: "", order: rows.length ? Math.max.apply(null, rows.map(function (x) { return x.order; })) + 1 : 1, featured: false, status: "draft" };
    ["id", "version", "name", "category", "summary", "summary_en", "website", "logo_alt", "order"].forEach(function (k) { form.elements[k].value = r[k] == null ? "" : r[k]; });
    form.elements.status.value = r.status;
    form.elements.featured.checked = !!r.featured;
    // Penerbitan membutuhkan izin penerbit; editor biasa hanya dapat menyimpan Draf/Arsip.
    Array.prototype.forEach.call(form.elements.status.options, function (o) { o.disabled = o.value === "published" && !canPublish(); });
    setLogo(r.logo, r.logo_alt);
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    form.elements.name.focus();
  }
  function closeForm() { form.hidden = true; form.reset(); setLogo("", ""); }

  function validate() {
    var f = form.elements, order = Number(f.order.value);
    if (f.name.value.trim().length < 2) return "Nama mitra minimal 2 karakter.";
    if (!f.category.value.trim()) return "Kategori wajib diisi.";
    if (f.status.value === "published" && !f.summary.value.trim()) return "Deskripsi wajib diisi sebelum diterbitkan.";
    if (f.website.value && !/^https:\/\/[^\s]+$/.test(f.website.value.trim())) return "Tautan harus diawali https://.";
    if (!Number.isInteger(order) || order < 0 || order > 10000) return "Urutan tampil harus bilangan bulat 0–10000.";
    return "";
  }

  logoFile.addEventListener("change", async function () {
    var file = logoFile.files[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) { say("Logo harus JPG, PNG, atau WebP.", "error"); logoFile.value = ""; return; }
    if (file.size > 12 * 1024 * 1024) { say("Berkas terlalu besar. Pilih logo di bawah 2 MB.", "error"); logoFile.value = ""; return; }
    var alt = form.elements.logo_alt.value.trim() || "Logo " + (form.elements.name.value.trim() || "mitra DDPE");
    try {
      say("Mengunggah logo…");
      var result = await D().uploadImage(file, alt, null, "partner_logo");
      form.elements.logo_alt.value = alt;
      setLogo(result.url, alt);
      say("Logo terunggah. Simpan mitra untuk menerapkannya.", "success");
    } catch (error) { say(error.message, "error"); }
    logoFile.value = "";
  });
  $("partner-logo-clear").addEventListener("click", function () { setLogo("", ""); });

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    var problem = validate();
    if (problem) { say(problem, "error"); return; }
    var f = form.elements, name = f.name.value.trim();
    var partner = {
      id: f.id.value || slugify(name) + "-" + Math.random().toString(36).slice(2, 6),
      name: name, category: f.category.value.trim(), summary: f.summary.value.trim(), summary_en: f.summary_en.value.trim(),
      logo: f.logo.value, logo_alt: f.logo_alt.value.trim(), website: f.website.value.trim(), order: Number(f.order.value),
      featured: f.featured.checked, status: f.status.value
    };
    var save = $("partner-save");
    save.disabled = true;
    try {
      await D().request("/api/admin", { method: "POST", body: { action: "save_partner", partner: partner, version: f.version.value || null } });
      closeForm();
      await load();
      say(partner.status === "published" ? "Mitra tersimpan dan tampil di website." : "Mitra tersimpan (belum tampil di website).", "success");
    } catch (error) { say(error.message, "error"); } finally { save.disabled = false; }
  });
  $("partner-cancel").addEventListener("click", closeForm);
  $("partner-new").addEventListener("click", function () { openForm(null); });
  $("partner-status-filter").addEventListener("change", draw);

  async function act(row, action, confirmText) {
    if (confirmText && !window.confirm(confirmText)) return;
    try {
      await D().request("/api/admin", { method: "POST", body: { action: action, id: row.id, version: row.version } });
      await load();
      say("Perubahan tersimpan.", "success");
    } catch (error) { say(error.message, "error"); }
  }
  async function setStatus(row, status) {
    var next = Object.assign({}, row, { status: status });
    delete next.version;
    try {
      await D().request("/api/admin", { method: "POST", body: { action: "save_partner", partner: next, version: row.version } });
      await load();
      say(status === "published" ? "Mitra diterbitkan dan tampil di website." : "Mitra dikembalikan ke Draf.", "success");
    } catch (error) { say(error.message, "error"); }
  }

  function draw() {
    var filter = $("partner-status-filter").value;
    list.replaceChildren();
    rows.filter(function (r) { return filter === "semua" || r.status === filter; }).forEach(function (row) {
      var item = el("article", null, "site-admin-item partner-item");
      var thumb = el("div", null, "partner-thumb");
      if (row.logo) { var img = document.createElement("img"); img.src = row.logo; img.alt = ""; img.loading = "lazy"; thumb.appendChild(img); }
      else thumb.textContent = row.name.slice(0, 2).toUpperCase();
      var main = el("div", null, "site-admin-item-main");
      main.appendChild(el("strong", row.name));
      var meta = el("div", null, "partner-meta");
      var badge = el("span", STATUS[row.status], "partner-badge"); badge.dataset.status = row.status;
      meta.append(badge, el("span", row.category), el("span", "Urutan " + row.order));
      if (row.featured) meta.appendChild(el("span", "Di beranda"));
      main.append(meta, el("p", row.summary));
      var actions = el("div", null, "site-admin-actions");
      var locked = row.status === "published" && !canPublish();
      actions.appendChild(btn("Edit", null, function () { openForm(row); }));
      if (row.status !== "published") { var pub = btn("Terbitkan", "site-button site-button-primary", function () { setStatus(row, "published"); }); pub.disabled = !canPublish(); actions.appendChild(pub); }
      else { var un = btn("Jadikan Draf", null, function () { setStatus(row, "draft"); }); un.disabled = locked; actions.appendChild(un); }
      if (row.status !== "archived") { var ar = btn("Arsipkan", null, function () { act(row, "archive_partner", "Arsipkan " + row.name + "? Mitra tidak lagi tampil di website dan dapat dipulihkan."); }); ar.disabled = locked; actions.appendChild(ar); }
      else actions.appendChild(btn("Hapus permanen", null, function () { act(row, "delete_partner", "Hapus permanen " + row.name + "? Tindakan ini tidak dapat dibatalkan."); }));
      item.append(thumb, main, actions);
      list.appendChild(item);
    });
    if (!list.childElementCount) list.appendChild(el("p", rows.length ? "Tidak ada mitra dengan status ini." : "Belum ada mitra. Pilih Tambah mitra."));
  }

  async function load() { rows = (await D().request("/api/admin?view=partners")).partners || []; draw(); }

  // Dipanggil dashboard.js saat panel Kemitraan dibuka. inquiries === null berarti tanpa izin peninjau.
  window.DDPEPartners = {
    render: async function (inquiries, renderInquiries) {
      var d = D(), canManage = d.has("content_editor") || d.has("publisher");
      var tabPartners = $("tab-partners"), tabInquiries = $("tab-inquiries");
      tabPartners.hidden = !canManage;
      tabInquiries.hidden = inquiries === null;
      if (canManage) await load();
      if (inquiries !== null) renderInquiries(inquiries);
      var current = tabs.find(function (t) { return t.getAttribute("aria-selected") === "true" && !t.hidden; });
      showTab(current ? current.dataset.partnerTab : canManage ? "partners" : "inquiries");
    }
  };
})();
