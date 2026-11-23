/* Ruang Pengurus > Konten Halaman: Halaman -> Section -> Elemen, pratinjau, dan penerbitan.
   Memakai API yang sudah ada (/api/admin save_site_content, /api/public-site-content) tanpa mengubah backend.
   Backend menyimpan satu versi per halaman yang langsung tampil publik, jadi hanya ada Terbitkan (tanpa "draf server"). */
(function () {
  "use strict";

  var D = null; // diisi dari window.DDPEDashboard saat dipakai
  var form = document.getElementById("site-content-form");
  if (!form) return;

  var els = {
    page: document.getElementById("site-content-page"),
    info: document.getElementById("cms-page-info"),
    warning: document.getElementById("cms-page-warning"),
    link: document.getElementById("site-content-preview-link"),
    outline: document.getElementById("cms-outline"),
    pane: document.getElementById("cms-sections"),
    add: document.getElementById("add-section"),
    dirty: document.getElementById("cms-dirty"),
    feedback: document.getElementById("site-content-feedback"),
    reset: document.getElementById("cms-reset"),
    defaults: document.getElementById("cms-defaults"),
    preview: document.getElementById("cms-preview"),
    publish: document.getElementById("cms-publish"),
    dialog: document.getElementById("cms-preview-dialog")
  };

  var LIMITS = { sections: 30, cards: 20, title: 180, pageTitle: 120, intro: 700, text: 5000, alt: 220, button: 80, href: 1200, image: 1200 };
  var pages = {};          // halaman tersimpan dari API admin
  var defaults = null;     // data/cms-defaults.json
  var state = null;        // { key, title, intro, sections, selected, version, saved, hosts, dirty }
  var token = 0;           // mencegah balapan saat berpindah halaman
  var canEdit = true;

  function dash() { if (!D) D = window.DDPEDashboard; return D; }
  function el(tag, text, cls) {
    var n = document.createElement(tag);
    if (text !== undefined && text !== null) n.textContent = text;
    if (cls) n.className = cls;
    return n;
  }
  function clone(v) { return JSON.parse(JSON.stringify(v)); }
  function emptyCard() { return { id: "c-" + (window.crypto && crypto.randomUUID ? crypto.randomUUID() : Date.now() + "-" + Math.random().toString(16).slice(2)), title: "", text: "", image: "", alt: "", button: "", href: "" }; }
  function say(message, kind) { els.feedback.textContent = message || ""; els.feedback.dataset.state = kind || ""; }

  // Aturan URL yang sama dengan js/editorial.js url(): HTTPS (atau mailto untuk tautan); relatif dianggap milik situs.
  function validUrl(value, image) {
    if (!value) return true;
    if (/[\u0000- \\]/.test(value)) return false;
    try {
      var u = new URL(value, "https://www.ddpe.my.id/");
      return (u.protocol === "https:" || (!image && u.protocol === "mailto:")) && !u.username && !u.password;
    } catch (_error) { return false; }
  }

  /* ---------- Validasi ---------- */
  // Mengembalikan { errors: [{path, message}], warnings: [...] }. Galat memblokir Terbitkan; peringatan hanya informasi.
  function validate(st) {
    var errors = [], warnings = [];
    var err = function (path, message) { errors.push({ path: path, message: message }); };
    var warn = function (path, message) { warnings.push({ path: path, message: message }); };
    if (st.title.trim().length < 4) err("page", "Judul halaman minimal 4 karakter.");
    if (st.title.length > LIMITS.pageTitle) err("page", "Judul halaman maksimal " + LIMITS.pageTitle + " karakter.");
    if (!st.intro.trim()) err("page", "Pengantar halaman wajib diisi.");
    if (st.intro.length > LIMITS.intro) err("page", "Pengantar maksimal " + LIMITS.intro + " karakter (sekarang " + st.intro.length + ").");
    if (st.sections.length > LIMITS.sections) err("page", "Maksimal " + LIMITS.sections + " section per halaman.");
    st.sections.forEach(function (section, i) {
      var name = "Section " + (i + 1) + (section.title ? " (" + section.title + ")" : "");
      var check = function (item, path, label) {
        if (!item.title.trim()) err(path, label + ": judul wajib diisi.");
        if (item.title.length > LIMITS.title) err(path, label + ": judul maksimal " + LIMITS.title + " karakter.");
        if (item.text.length > LIMITS.text) err(path, label + ": teks maksimal " + LIMITS.text + " karakter.");
        if (item.image && !validUrl(item.image, true)) err(path, label + ": alamat gambar harus HTTPS atau nama berkas di situs.");
        if (item.href && !validUrl(item.href, false)) err(path, label + ": tautan tombol harus HTTPS, mailto:, atau nama halaman situs.");
        if (item.image && !item.alt.trim()) warn(path, label + ": isi keterangan gambar agar dapat dibaca pembaca layar.");
        if (item.button && !item.href) err(path, label + ": tombol “" + item.button + "” belum punya tautan.");
        if (item.href && !item.button) warn(path, label + ": tautan tidak akan tampil karena teks tombol kosong.");
      };
      check(section, "s" + i, name);
      if (section.cards.length > LIMITS.cards) err("s" + i, name + ": maksimal " + LIMITS.cards + " kartu.");
      section.cards.forEach(function (card, j) { check(card, "s" + i + "c" + j, name + ", kartu " + (j + 1)); });
    });
    return { errors: errors, warnings: warnings };
  }

  /* ---------- Pemeriksaan halaman publik (apakah section punya tempat tampil) ---------- */
  async function inspectPublicPage(key) {
    try {
      var response = await fetch("/" + key, { cache: "no-store" });
      if (!response.ok) return null;
      var doc = new DOMParser().parseFromString(await response.text(), "text/html");
      return {
        hosts: Array.prototype.map.call(doc.querySelectorAll("[data-cms-section]"), function (n) { return n.getAttribute("data-cms-section"); }),
        extra: Boolean(doc.querySelector("[data-cms-extra]")),
        directory: Boolean(doc.getElementById("leadership-directory")),
        intro: Boolean(doc.querySelector(key === "index.html" ? ".site-home-welcome-copy" : ".site-page-heading > p:not(.eyebrow),.site-news-heading > p:not(.eyebrow)"))
      };
    } catch (_error) { return null; }
  }

  function placement(section) {
    var hosts = state.hosts;
    if (!hosts) return { kind: "unknown", label: "Lokasi tampil belum dapat diperiksa" };
    if (hosts.directory) return { kind: "none", label: "Tidak tampil (halaman memakai direktori Kepengurusan)" };
    if (hosts.hosts.indexOf(section.id) !== -1) return { kind: "host", label: "Tampil di tempatnya" };
    if (hosts.extra) return { kind: "extra", label: "Tampil di bagian bawah halaman" };
    return { kind: "none", label: "Tidak tampil: halaman ini tidak punya tempat untuk section ini" };
  }

  /* ---------- Status & penanda perubahan ---------- */
  function snapshot(st) { return JSON.stringify({ t: st.title, i: st.intro, s: st.sections }); }
  function markDirty() {
    if (!state) return;
    state.dirty = snapshot(state) !== state.saved;
    els.dirty.textContent = state.dirty ? "Ada perubahan yang belum diterbitkan." : (state.publishedAt ? "Diterbitkan " + state.publishedAt + "." : "Belum ada perubahan.");
    els.dirty.dataset.state = state.dirty ? "dirty" : "";
    els.reset.disabled = !state.dirty || !canEdit;
    updatePublishButton();
  }

  function pageBlocked() { return Boolean(state && state.hosts && state.hosts.directory); }
  function updatePublishButton() {
    els.publish.disabled = !canEdit || pageBlocked() || !state || state.busy;
    els.publish.title = !canEdit ? "Akun Anda tidak memiliki izin mengedit konten." : pageBlocked() ? "Halaman ini tidak membaca Konten Halaman." : "";
  }

  /* ---------- Render: ringkasan halaman & outline ---------- */
  function renderInfo() {
    var saved = pages[state.key];
    var parts = [];
    parts.push(saved && saved.version ? "Sudah diubah dari konten bawaan. Terakhir diterbitkan " + new Date(saved.version).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jayapura" }) + " WIT." : "Masih memakai konten bawaan situs. Perubahan pertama akan menggantikannya.");
    els.info.textContent = parts.join(" ");
    els.link.href = state.key;
    var warning = "";
    if (state.hosts && state.hosts.directory) warning = "Halaman ini menampilkan direktori Kepengurusan dan tidak membaca Konten Halaman. Kelola isinya lewat modul Kelola Kepengurusan. Penerbitan dinonaktifkan agar tidak ada perubahan yang tersimpan tetapi tidak tampil.";
    else if (state.hosts && !state.hosts.intro) warning = "Pengantar halaman tidak ditampilkan pada halaman ini. Judul dan section tetap dibaca.";
    else if (!state.hosts) warning = "Tata letak halaman publik belum dapat diperiksa. Lokasi tampil tiap section tidak ditandai.";
    els.warning.hidden = !warning;
    els.warning.textContent = warning;
  }

  function renderOutline() {
    els.outline.replaceChildren();
    var item = function (id, label, sub, badge) {
      var li = el("li");
      var b = el("button", null, "cms-outline-item" + (state.selected === id ? " is-active" : ""));
      b.type = "button";
      b.setAttribute("aria-current", state.selected === id ? "true" : "false");
      b.appendChild(el("span", label, "cms-outline-label"));
      if (sub) b.appendChild(el("span", sub, "cms-outline-sub"));
      if (badge) b.appendChild(el("span", badge.label, "cms-badge cms-badge-" + badge.kind));
      b.addEventListener("click", function () {
        state.selected = id; renderAll();
        if (window.innerWidth <= 1100) els.pane.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      li.appendChild(b);
      els.outline.appendChild(li);
    };
    item("page", "Judul & pengantar halaman", state.title || "Belum ada judul", null);
    state.sections.forEach(function (section, i) {
      var p = placement(section);
      item("s" + i, (i + 1) + ". " + (section.title || "Section tanpa judul"), section.cards.length ? section.cards.length + " kartu" : "", p);
    });
    els.add.disabled = !canEdit || state.sections.length >= LIMITS.sections;
  }

  /* ---------- Render: editor elemen ---------- */
  function field(parent, label, value, onInput, opts) {
    opts = opts || {};
    var wrap = el("label", null, "cms-field");
    wrap.appendChild(el("span", label, "cms-field-label"));
    var input = el(opts.multiline ? "textarea" : "input");
    if (opts.multiline) input.rows = opts.rows || 5;
    input.value = value || "";
    if (opts.max) input.maxLength = opts.max;
    if (opts.placeholder) input.placeholder = opts.placeholder;
    if (opts.type) input.type = opts.type;
    input.disabled = !canEdit;
    input.addEventListener("input", function () { onInput(input.value); markDirty(); refreshLive(); });
    wrap.appendChild(input);
    if (opts.hint) wrap.appendChild(el("small", opts.hint, "cms-hint"));
    if (opts.counter) {
      var counter = el("small", "", "cms-hint cms-counter");
      var update = function () { counter.textContent = input.value.length + " / " + opts.max + " karakter"; };
      input.addEventListener("input", update); update();
      wrap.appendChild(counter);
    }
    parent.appendChild(wrap);
    return input;
  }

  function imageField(parent, item) {
    var box = el("div", null, "cms-image");
    box.appendChild(el("span", "Gambar", "cms-field-label"));
    var preview = el("img", null, "cms-image-preview");
    preview.alt = item.alt || "";
    preview.hidden = !item.image;
    if (item.image) preview.src = item.image;
    var status = el("p", item.image ? "Gambar terpasang." : "Belum ada gambar (opsional).", "site-form-feedback");
    status.setAttribute("role", "status");
    var progress = el("progress"); progress.max = 100; progress.hidden = true;
    var file = el("input"); file.type = "file"; file.accept = "image/jpeg,image/png,image/webp"; file.disabled = !canEdit;
    var actions = el("div", null, "cms-image-actions");
    var remove = el("button", "Hapus gambar", "cms-link-button"); remove.type = "button"; remove.hidden = !item.image; remove.disabled = !canEdit;
    remove.addEventListener("click", function () { item.image = ""; item.alt = ""; markDirty(); renderPane(); renderOutline(); refreshLive(); });
    file.addEventListener("change", async function () {
      if (!file.files[0]) return;
      if (!item.alt || item.alt.trim().length < 4) {
        status.textContent = "Isi keterangan gambar (minimal 4 karakter) di bawah, lalu pilih gambar lagi.";
        status.dataset.state = "error";
        file.value = "";
        altInput.focus();
        return;
      }
      file.disabled = true;
      try {
        status.dataset.state = ""; progress.hidden = false; progress.removeAttribute("value");
        status.textContent = "Mengompres dan mengunggah gambar…";
        var result = await dash().uploadImage(file.files[0], item.alt, function (info) {
          if (info.stage === "upload") { progress.value = info.percent; status.textContent = "Mengunggah gambar… " + info.percent + "%"; }
        });
        item.image = result.url;
        preview.src = result.url; preview.hidden = false; remove.hidden = false;
        status.textContent = "Gambar terunggah. Terbitkan perubahan agar tampil di situs.";
        status.dataset.state = "success";
        markDirty(); refreshLive();
      } catch (error) {
        status.textContent = error.message; status.dataset.state = "error";
      } finally { progress.hidden = true; file.disabled = !canEdit; file.value = ""; }
    });
    var altInput = field(box, "Keterangan gambar (wajib untuk gambar baru)", item.alt, function (v) { item.alt = v; preview.alt = v; }, { max: LIMITS.alt, placeholder: "Jelaskan isi gambar" });
    box.appendChild(preview);
    actions.appendChild(file);
    actions.appendChild(remove);
    box.appendChild(actions);
    box.appendChild(progress);
    box.appendChild(status);
    parent.appendChild(box);
  }

  function buttonFields(parent, item) {
    var box = el("div", null, "cms-button-fields");
    box.appendChild(el("span", "Tombol (opsional)", "cms-field-label"));
    var row = el("div", null, "cms-two");
    field(row, "Teks tombol", item.button, function (v) { item.button = v; }, { max: LIMITS.button, placeholder: "Contoh: Selengkapnya" });
    field(row, "Tautan tombol", item.href, function (v) { item.href = v; }, { max: LIMITS.href, placeholder: "kontak.html atau https://…", hint: "Nama halaman situs, alamat https://, atau mailto:. Tombol tampil bila teks dan tautan keduanya diisi." });
    box.appendChild(row);
    parent.appendChild(box);
  }

  function elementEditor(parent, item, opts) {
    field(parent, opts.titleLabel || "Judul", item.title, function (v) { item.title = v; if (opts.onTitle) opts.onTitle(); }, { max: LIMITS.title });
    field(parent, "Teks", item.text, function (v) { item.text = v; }, { multiline: true, rows: opts.rows || 6, max: LIMITS.text, counter: true, hint: "Pisahkan paragraf dengan satu baris kosong." });
    imageField(parent, item);
    buttonFields(parent, item);
  }

  function renderPane() {
    els.pane.replaceChildren();
    var selected = state.selected;
    if (selected === "page") {
      var card = el("section", null, "cms-card");
      card.appendChild(el("h3", "Judul & pengantar halaman"));
      card.appendChild(el("p", "Judul tampil sebagai judul utama halaman; pengantar tampil di bawahnya dan dipakai sebagai deskripsi pencarian.", "cms-lead"));
      field(card, "Judul halaman", state.title, function (v) { state.title = v; var s = els.outline.querySelector(".is-active .cms-outline-sub"); if (s) s.textContent = v || "Belum ada judul"; }, { max: LIMITS.pageTitle });
      field(card, "Pengantar halaman", state.intro, function (v) { state.intro = v; }, { multiline: true, rows: 4, max: LIMITS.intro, counter: true });
      els.pane.appendChild(card);
      return;
    }
    var index = Number(selected.slice(1));
    var section = state.sections[index];
    if (!section) { state.selected = "page"; return renderPane(); }
    var p = placement(section);
    var head = el("div", null, "cms-pane-head");
    head.appendChild(el("h3", "Section " + (index + 1)));
    head.appendChild(el("span", p.label, "cms-badge cms-badge-" + p.kind));
    els.pane.appendChild(head);
    var main = el("section", null, "cms-card");
    main.appendChild(el("h4", "Isi section"));
    elementEditor(main, section, { titleLabel: "Judul section", onTitle: function () { var l = els.outline.querySelector(".is-active .cms-outline-label"); if (l) l.textContent = (index + 1) + ". " + (section.title || "Section tanpa judul"); } });
    var tools = el("div", null, "site-dashboard-actions cms-section-tools");
    var up = el("button", "Naikkan"); up.type = "button"; up.disabled = !canEdit || index === 0;
    up.addEventListener("click", function () { swap(index, index - 1); });
    var down = el("button", "Turunkan"); down.type = "button"; down.disabled = !canEdit || index === state.sections.length - 1;
    down.addEventListener("click", function () { swap(index, index + 1); });
    var del = el("button", "Hapus section", "cms-danger"); del.type = "button"; del.disabled = !canEdit;
    del.addEventListener("click", function () {
      if (!window.confirm("Hapus section ini dari halaman? Perubahan baru tampil setelah Anda menerbitkan.")) return;
      state.sections.splice(index, 1); state.selected = "page"; markDirty(); renderAll();
    });
    tools.append(up, down, del);
    main.appendChild(tools);
    els.pane.appendChild(main);

    var cards = el("section", null, "cms-card");
    cards.appendChild(el("h4", "Kartu dalam section ini (" + section.cards.length + ")"));
    if (!section.cards.length) cards.appendChild(el("p", "Belum ada kartu. Kartu tampil sebagai kotak-kotak di bawah isi section (misalnya program atau poin penting).", "cms-lead"));
    section.cards.forEach(function (card, j) {
      var details = el("details", null, "cms-card-item");
      if (state.openCard === section.id + ":" + card.id) details.open = true;
      details.addEventListener("toggle", function () { state.openCard = details.open ? section.id + ":" + card.id : (state.openCard === section.id + ":" + card.id ? "" : state.openCard); });
      var summary = el("summary", "Kartu " + (j + 1) + ": " + (card.title || "tanpa judul"));
      details.appendChild(summary);
      var body = el("div", null, "cms-card-body");
      elementEditor(body, card, { titleLabel: "Judul kartu", rows: 4, onTitle: function () { summary.textContent = "Kartu " + (j + 1) + ": " + (card.title || "tanpa judul"); } });
      var actions = el("div", null, "site-dashboard-actions");
      var upC = el("button", "Naikkan"); upC.type = "button"; upC.disabled = !canEdit || j === 0;
      upC.addEventListener("click", function () { var t = section.cards[j - 1]; section.cards[j - 1] = card; section.cards[j] = t; markDirty(); renderPane(); refreshLive(); });
      var downC = el("button", "Turunkan"); downC.type = "button"; downC.disabled = !canEdit || j === section.cards.length - 1;
      downC.addEventListener("click", function () { var t = section.cards[j + 1]; section.cards[j + 1] = card; section.cards[j] = t; markDirty(); renderPane(); refreshLive(); });
      var rm = el("button", "Hapus kartu", "cms-danger"); rm.type = "button"; rm.disabled = !canEdit;
      rm.addEventListener("click", function () { if (!window.confirm("Hapus kartu ini?")) return; section.cards.splice(j, 1); markDirty(); renderAll(); });
      actions.append(upC, downC, rm);
      body.appendChild(actions);
      details.appendChild(body);
      cards.appendChild(details);
    });
    var addCard = el("button", "Tambah kartu"); addCard.type = "button"; addCard.disabled = !canEdit || section.cards.length >= LIMITS.cards;
    addCard.addEventListener("click", function () {
      var c = emptyCard(); section.cards.push(c); state.openCard = section.id + ":" + c.id; markDirty(); renderAll();
    });
    cards.appendChild(addCard);
    els.pane.appendChild(cards);
  }

  function swap(a, b) {
    var t = state.sections[a]; state.sections[a] = state.sections[b]; state.sections[b] = t;
    state.selected = "s" + b; markDirty(); renderAll();
  }

  function renderAll() { renderInfo(); renderOutline(); renderPane(); markDirty(); refreshLive(); }

  // Perbarui pratinjau bila dialog sedang terbuka.
  function refreshLive() { if (els.dialog.open) buildPreview(); }

  /* ---------- Pratinjau ---------- */
  // Meniru renderer publik (js/site.js applyPublishedSiteCopy) agar tampilan kartu sama.
  function buildPreview() {
    var frame = els.dialog.querySelector("iframe");
    var origin = location.origin;
    frame.srcdoc = '<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><base href="' + origin + '/"><link rel="stylesheet" href="css/site.css"><link rel="stylesheet" href="css/cms.css"><style>body{background:#fff}.cms-preview-note{margin:0;padding:10px 20px;background:#16203a;color:#fff;font:14px system-ui}.cms-preview-warn{margin:12px 0;padding:10px 14px;border-left:3px solid #b8892d;background:#faf8f4;font:14px system-ui}</style><body><p class="cms-preview-note">Pratinjau konten. Belum diterbitkan. Tata letak halaman asli dapat sedikit berbeda.</p><main class="site-container" id="root" style="padding-block:32px"></main></body></html>';
    frame.onload = function () {
      var doc = frame.contentDocument, root = doc.getElementById("root");
      var make = function (tag, text, cls) { var n = doc.createElement(tag); if (text) n.textContent = text; if (cls) n.className = cls; return n; };
      var safe = function (value) { try { var u = new URL(value, origin + "/"); return ["https:", "mailto:"].indexOf(u.protocol) !== -1 || u.origin === origin ? u.href : ""; } catch (_e) { return ""; } };
      var card = function (c, tag) {
        var box = make(tag || "article", null, "cms-public-card");
        if (c.image && safe(c.image)) { var img = make("img"); img.src = safe(c.image); img.alt = c.alt || ""; box.appendChild(img); }
        var copy = make("div", null, "cms-public-copy");
        copy.appendChild(make(tag === "section" ? "h2" : "h3", c.title));
        (c.text || "").split(/\n\s*\n/).filter(Boolean).forEach(function (t) { copy.appendChild(make("p", t)); });
        if (c.button && c.href && safe(c.href)) { var a = make("a", c.button, "site-button site-button-primary"); a.href = safe(c.href); copy.appendChild(a); }
        box.appendChild(copy);
        return box;
      };
      root.appendChild(make("h1", state.title));
      root.appendChild(make("p", state.intro));
      state.sections.forEach(function (section) {
        var p = placement(section);
        if (p.kind === "none") root.appendChild(make("p", "Section “" + section.title + "” tidak akan tampil di halaman publik: " + p.label.toLowerCase() + ".", "cms-preview-warn"));
        var host = make("div", null, "cms-public-sections");
        host.appendChild(card(section, "section"));
        if (section.cards.length) { var grid = make("div", null, "cms-public-grid"); section.cards.forEach(function (c) { grid.appendChild(card(c)); }); host.appendChild(grid); }
        root.appendChild(host);
      });
    };
  }

  /* ---------- Memuat halaman ---------- */
  async function loadDefaults() {
    if (defaults) return defaults;
    var response = await fetch("/data/cms-defaults.json");
    if (!response.ok) throw new Error("Konten bawaan belum dapat dimuat.");
    defaults = await response.json();
    return defaults;
  }

  async function loadPage(key, opts) {
    opts = opts || {};
    var mine = ++token;
    say("");
    els.info.textContent = "Memuat halaman…";
    try {
      var all = await loadDefaults();
      var hosts = await inspectPublicPage(key);
      if (mine !== token) return;
      var base = all[key] || { title: "", intro: "", sections: [] };
      var saved = pages[key] || {};
      var norm = function (src) { return { title: src.title || "", intro: src.intro || "", sections: clone(src.sections || []).map(normalizeSection) }; };
      var original = norm({ title: saved.title || base.title, intro: saved.intro || base.intro, sections: Array.isArray(saved.sections) ? saved.sections : base.sections });
      var chosen = opts.useDefaults ? norm(base) : original;
      state = {
        key: key, title: chosen.title, intro: chosen.intro, sections: chosen.sections, selected: "page", openCard: "",
        version: saved.version || null, hosts: hosts, publishedAt: "", busy: false,
        saved: snapshot(original) // penanda perubahan: dibandingkan dengan versi yang sedang tersimpan
      };
      renderAll();
    } catch (error) {
      if (mine === token) { els.info.textContent = ""; say(error.message || "Halaman belum dapat dimuat.", "error"); }
    }
  }

  function normalizeSection(s) {
    var item = function (x) { return { id: x.id, title: x.title || "", text: x.text || "", image: x.image || "", alt: x.alt || "", button: x.button || "", href: x.href || "" }; };
    var out = item(s);
    out.cards = (s.cards || []).map(item);
    return out;
  }

  /* ---------- Aksi ---------- */
  async function publish() {
    if (!state || state.busy) return;
    var result = validate(state);
    if (result.errors.length) {
      var first = result.errors[0];
      state.selected = first.path === "page" ? "page" : "s" + first.path.slice(1).split("c")[0];
      renderAll();
      say(result.errors.length + " hal perlu diperbaiki: " + result.errors.map(function (e) { return e.message; }).slice(0, 3).join(" ") + (result.errors.length > 3 ? " …" : ""), "error");
      return;
    }
    var label = els.page.options[els.page.selectedIndex].text;
    var note = result.warnings.length ? "\n\nCatatan: " + result.warnings.slice(0, 3).map(function (w) { return w.message; }).join(" ") : "";
    if (!window.confirm("Terbitkan perubahan halaman “" + label + "”? Perubahan langsung tampil di situs publik." + note)) return;
    state.busy = true; updatePublishButton();
    var idle = els.publish.textContent;
    els.publish.textContent = "Menerbitkan…";
    say("Menyimpan dan menerbitkan…");
    try {
      var saved = await dash().request("/api/admin", { method: "POST", body: { action: "save_site_content", page_key: state.key, title: state.title.trim(), intro: state.intro.trim(), sections: clone(state.sections), version: state.version } });
      if (!saved.saved) throw new Error("Perubahan belum tersimpan.");
      pages = (await dash().request("/api/admin?view=site_content")).pages || pages;
      state.version = (pages[state.key] || {}).version || null;
      state.saved = snapshot(state);
      state.publishedAt = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jayapura" }) + " WIT";
      var verified = await verifyPublic();
      say(verified ? "Diterbitkan dan terverifikasi: API publik sudah menyajikan versi ini, jadi halaman publik akan menampilkannya saat dimuat." : "Tersimpan, tetapi API publik belum menyajikan versi ini. Muat ulang beberapa saat lagi; bila tetap sama, hubungi pengelola teknis.", verified ? "success" : "error");
      renderInfo(); markDirty();
    } catch (error) {
      say(error.message, "error");
    } finally {
      state.busy = false; els.publish.textContent = idle; updatePublishButton();
    }
  }

  // Memastikan konten yang baru diterbitkan memang dibaca jalur publik (/api/public-site-content), bukan hanya tersimpan.
  async function verifyPublic() {
    try {
      var response = await fetch("/api/public-site-content", { cache: "no-store" });
      if (!response.ok) return false;
      var data = await response.json();
      var page = data.pages && data.pages[state.key];
      return Boolean(page) && page.title === state.title.trim() && page.intro === state.intro.trim() &&
        JSON.stringify((page.sections || []).map(function (s) { return [s.id, s.title, s.cards.length]; })) === JSON.stringify(state.sections.map(function (s) { return [s.id, s.title.trim(), s.cards.length]; }));
    } catch (_error) { return false; }
  }

  /* ---------- Event ---------- */
  els.page.addEventListener("change", function () {
    if (state && state.dirty && !window.confirm("Ada perubahan yang belum diterbitkan pada halaman ini. Pindah halaman dan buang perubahan?")) { els.page.value = state.key; return; }
    loadPage(els.page.value);
  });
  els.add.addEventListener("click", function () {
    if (!state || state.sections.length >= LIMITS.sections) return;
    var s = emptyCard(); s.cards = []; state.sections.push(s); state.selected = "s" + (state.sections.length - 1);
    markDirty(); renderAll();
    var first = els.pane.querySelector("input"); if (first) first.focus();
  });
  els.reset.addEventListener("click", function () {
    if (!state || !window.confirm("Batalkan semua perubahan yang belum diterbitkan pada halaman ini?")) return;
    loadPage(state.key);
  });
  els.defaults.addEventListener("click", function () {
    if (!state || !canEdit || !window.confirm("Ganti isi formulir dengan konten bawaan situs untuk halaman ini? Belum diterbitkan sampai Anda menekan Terbitkan.")) return;
    loadPage(state.key, { useDefaults: true }).then(function () { if (state) say("Konten bawaan dimuat ke formulir. Periksa, lalu Terbitkan bila sudah sesuai."); });
  });
  els.preview.addEventListener("click", function () { if (!state) return; buildPreview(); els.dialog.showModal(); });
  form.addEventListener("submit", function (event) { event.preventDefault(); publish(); });
  window.addEventListener("beforeunload", function (event) { if (state && state.dirty) { event.preventDefault(); event.returnValue = ""; } });

  window.DDPEContent = {
    render: async function (result) {
      pages = (result && result.pages) || {};
      canEdit = dash().has("content_editor");
      form.querySelectorAll("#cms-defaults").forEach(function (b) { b.disabled = !canEdit; });
      await loadPage(els.page.value);
    },
    reset: function () { pages = {}; state = null; els.pane.replaceChildren(); els.outline.replaceChildren(); },
    // Dipakai tes: fungsi murni.
    _validate: validate, _validUrl: validUrl
  };
})();
