(function () {
  "use strict";

  var cfg = {};
  var client = null;
  var session = null;
  var permissionRows = [];
  var applicationRows = [];
  var currentView = "";
  var loginForm = document.getElementById("login-form");
  var loginFeedback = document.getElementById("login-feedback");
  var app = document.getElementById("dashboard-app");
  var login = document.getElementById("dashboard-login");
  var alert = document.getElementById("dashboard-alert");
  var articleForm = document.getElementById("article-form");
  var recruitmentForm = document.getElementById("recruitment-form");
  var permissionForm = document.getElementById("permission-form");
  var siteContentForm = document.getElementById("site-content-form");
  var siteContentPages = {};
  var selectedImage = null;
  var cmsSections = [];
  var cmsDefaults = {};
  var pageVersion = null;
  var editor = document.getElementById("article-editor");
  var previewUrl = "";

  function node(tag, value, className) {
    var element = document.createElement(tag);
    if (value !== undefined && value !== null) element.textContent = String(value);
    if (className) element.className = className;
    return element;
  }

  function setMessage(target, message, kind) {
    target.textContent = message;
    target.dataset.state = kind || "";
  }

  function has(permission) {
    return permissionRows.some(function (row) {
      if (row.permission !== permission) return false;
      if (["content_editor", "publisher", "partnership_reviewer"].includes(permission)) return row.scope_type === "organization" && row.scope_id === null;
      return true;
    });
  }

  function sessionToken() {
    return session && session.access_token;
  }

  async function adminRequest(path, options) {
    if (!sessionToken()) throw new Error("Sesi berakhir. Masuk kembali.");
    var response = await fetch(path, {
      method: options && options.method ? options.method : "GET",
      headers: {
        Authorization: "Bearer " + sessionToken(),
        ...(options && options.body ? { "Content-Type": "application/json" } : {})
      },
      body: options && options.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store"
    });
    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok) {
      var messages = {
        cms_conflict: "Konten sudah diubah pengurus lain. Muat ulang sebelum menyimpan.",
        slug_already_exists: "Slug sudah dipakai artikel lain. Ubah slug.",
        check_leadership_fields: "Periksa nama, jabatan, status, masa bakti, dan URL foto pengurus.",
        check_article_fields: "Periksa judul, slug, dan isi (minimal 20 karakter), serta batas panjang metadata.",
        quota_reached: "Kuota peserta yang diterima sudah penuh.",
        last_access_manager: "Izin pengelola terakhir tidak dapat dicabut.",
        application_not_found: "Pendaftar tidak ditemukan pada cakupan izin Anda.",
        forbidden: "Akun tidak memiliki izin untuk tindakan ini.",
        recruitment_outside_window: "Jadwal pembukaan belum dimulai atau sudah berakhir.",
        age_requirement_unconfirmed: "Isi batas usia resmi terlebih dahulu sebelum membuka pendaftaran.",
        check_recruitment_age: "Usia minimum di bawah batas program (DLDPE/DIDPE 14 tahun, AMEX 16 tahun).",
        age_requirement_below_program: "Usia minimum periode ini di bawah batas program. Edit dan perbaiki sebelum membuka.",
        guardian_consent_required: "Peserta di bawah 18 tahun tidak dapat diterima tanpa catatan persetujuan orang tua/wali.",
        check_recruitment_fields: "Periksa judul, deskripsi, syarat, program, kuota, dan batas usia.",
        check_recruitment_dates: "Tanggal tidak valid atau waktu tutup tidak setelah waktu mulai.",
        recruitment_not_found: "Periode pendaftaran tidak ditemukan.",
        article_not_submitted: "Ajukan draf terlebih dahulu sebelum diterbitkan.",
        revision_not_submitted: "Ajukan revisi terlebih dahulu sebelum diterbitkan."
      };
      throw new Error(messages[payload.error] || "Permintaan gagal. Periksa izin dan koneksi, lalu coba lagi.");
    }
    return payload;
  }

  function activateView(view) {
    currentView = view;
    document.querySelectorAll("[data-panel]").forEach(function (panel) { panel.hidden = panel.dataset.panel !== view; });
    document.querySelectorAll("[data-view]").forEach(function (button) { button.classList.toggle("is-active", button.dataset.view === view); });
    refreshView(view);
  }

  function renderPermissions(rows) {
    var list = document.getElementById("permission-list");
    list.replaceChildren();
    if (!rows.length) {
      list.appendChild(node("p", "Belum ada izin pada cakupan akun ini."));
      return;
    }
    rows.forEach(function (row) {
      var item = node("article", null, "site-admin-item");
      var details = node("div");
      details.appendChild(node("strong", row.email || row.user_id));
      details.appendChild(node("p", (row.office_title ? row.office_title + " · " : "") + row.permission + " · " + row.scope_type + (row.scope_id ? " / " + row.scope_id : "")));
      item.appendChild(details);
      if (row.user_id !== (session.user && session.user.id)) {
        var revoke = node("button", "Cabut izin", "site-button site-button-outline");
        revoke.type = "button";
        revoke.addEventListener("click", async function () {
          if (!window.confirm("Cabut izin " + row.permission + " dari akun ini?")) return;
          try {
            await adminRequest("/api/admin", { method: "POST", body: { action: "revoke_permission", id: row.id } });
            await refreshView("permissions");
          } catch (error) { setMessage(alert, error.message, "error"); }
        });
        item.appendChild(revoke);
      }
      list.appendChild(item);
    });
  }

  function updateSiteContentPreview() {
    var title = siteContentForm.elements.title.value.trim();
    var intro = siteContentForm.elements.intro.value.trim();
    var pageKey = siteContentForm.elements.page_key.value;
    document.getElementById("site-content-preview-title").textContent = title || "Judul halaman";
    document.getElementById("site-content-preview-intro").textContent = intro || "Pengantar halaman akan terlihat di sini.";
    document.getElementById("site-content-preview-link").href = pageKey;
  }

  async function loadSiteContentForm() {
    var pageKey=siteContentForm.elements.page_key.value;
    if(!Object.keys(cmsDefaults).length){const r=await fetch('/data/cms-defaults.json');if(!r.ok)throw Error('Konten awal belum dapat dimuat.');cmsDefaults=await r.json();}
    if(pageKey!==siteContentForm.elements.page_key.value)return;
    const base=cmsDefaults[pageKey] || {title:'',intro:'',sections:[]},saved=siteContentPages[pageKey] || {};
    siteContentForm.elements.title.value=saved.title || base.title;
    siteContentForm.elements.intro.value=saved.intro || base.intro;
    pageVersion=saved.version || null;
    cmsSections=structuredClone(Array.isArray(saved.sections)?saved.sections:base.sections);
    renderSections();updateSiteContentPreview();
  }

  async function renderSiteContent(result) {
    siteContentPages = result.pages || {};
    await loadSiteContentForm();
  }

  async function renderPermissionsView() {
    var result = await adminRequest("/api/admin?view=permissions");
    renderPermissions(result.permissions || []);
  }

  function fillArticle(row, revision) {
    articleForm.elements.id.value = revision ? row.article_id : row.id || "";
    articleForm.elements.revision_id.value = revision ? row.id : "";
    articleForm.elements.title.value = row.title || "";
    articleForm.elements.slug.value = row.slug || "";
    articleForm.elements.excerpt.value = row.excerpt || "";
    articleForm.elements.category.value = row.category || "berita";
    articleForm.elements.cover_url.value = row.cover_url || "";
    articleForm.elements.cover_media_id.value = row.cover_media_id || "";
    articleForm.elements.cover_alt.value = row.cover_alt || "";
    articleForm.elements.body.value = row.body || "";
    editor.innerHTML = DDPEEditorial.clean(row.body || "");
    ["author","author_bio","cover_caption","meta_description"].forEach(k=>articleForm.elements[k].value=row[k] || "");
    articleForm.elements.tags.value=(row.tags || []).join(", ");
    articleForm.elements.slug.dataset.manual="true";
    selectedImage=null; document.getElementById("article-image").value="";document.getElementById("article-image-preview").hidden=true;
    document.getElementById("seo-counter").textContent=(row.meta_description || "").length+" karakter · sasaran 120–160";
    articleForm.dataset.revisionArticle = revision ? row.article_id : "";
    setMessage(document.getElementById("article-feedback"), revision ? "Revisi dimuat. Simpan atau ajukan perubahan." : "Draf dimuat ke formulir.");
  }

  function renderArticles(result) {
    var list = document.getElementById("article-list");
    var revisions = document.getElementById("revision-list");
    list.replaceChildren();
    revisions.replaceChildren();
    (result.articles || []).forEach(function (article) {
      var item = node("article", null, "site-admin-item");
      var meta = node("div");
      meta.appendChild(node("strong", article.title));
      meta.appendChild(node("p", article.status + (article.legacy_id ? " · ID lama: " + article.legacy_id : "")));
      item.appendChild(meta);
      var edit = node("button", article.status === "published" ? "Buat revisi" : "Edit draf", "site-button site-button-outline");
      edit.type = "button";
      edit.addEventListener("click", function () { fillArticle(article, false); });
      item.appendChild(edit);
      if(has("publisher") && article.status!=="archived"){
        var archive=node("button","Arsipkan","site-button site-button-outline");archive.type="button";
        archive.onclick=async function(){if(!confirm("Arsipkan berita ini dari halaman publik?"))return;try{await adminRequest("/api/admin",{method:"POST",body:{action:"archive_article",id:article.id}});await refreshView("articles");}catch(err){setMessage(alert,err.message,"error");}};item.appendChild(archive);
      }
      if (article.status === "submitted" && has("publisher")) {
        var publish = node("button", "Terbitkan", "site-button site-button-primary");
        publish.type = "button";
        publish.addEventListener("click", async function () {
          try {
            await adminRequest("/api/admin", { method: "POST", body: { action: "publish_article", id: article.id } });
            setMessage(alert, "Berita diterbitkan.", "success");
            await renderArticles(await adminRequest("/api/admin?view=articles"));
          } catch (error) { setMessage(alert, error.message, "error"); }
        });
        item.appendChild(publish);
      }
      list.appendChild(item);
    });
    (result.revisions || []).forEach(function (revision) {
      var item = node("article", null, "site-admin-item");
      var meta = node("div");
      meta.appendChild(node("strong", revision.title));
      meta.appendChild(node("p", revision.status + " · revisi artikel"));
      item.appendChild(meta);
      var load = node("button", "Tinjau", "site-button site-button-outline");
      load.type = "button";
      load.addEventListener("click", function () { fillArticle(revision, true); });
      item.appendChild(load);
      if (revision.status === "draft" && has("content_editor")) {
        var submit = node("button", "Ajukan", "site-button site-button-outline");
        submit.type = "button";
        submit.addEventListener("click", async function () {
          try {
            await adminRequest("/api/admin", { method: "POST", body: { action: "submit_article", revision_id: revision.id } });
            await renderArticles(await adminRequest("/api/admin?view=articles"));
          } catch (error) { setMessage(alert, error.message, "error"); }
        });
        item.appendChild(submit);
      }
      if (revision.status === "submitted" && has("publisher")) {
        var publishRevision = node("button", "Terbitkan revisi", "site-button site-button-primary");
        publishRevision.type = "button";
        publishRevision.addEventListener("click", async function () {
          try {
            await adminRequest("/api/admin", { method: "POST", body: { action: "publish_article", id: revision.article_id, revision_id: revision.id } });
            setMessage(alert, "Revisi artikel diterbitkan.", "success");
            await renderArticles(await adminRequest("/api/admin?view=articles"));
          } catch (error) { setMessage(alert, error.message, "error"); }
        });
        item.appendChild(publishRevision);
      }
      revisions.appendChild(item);
    });
    if (!list.childElementCount) list.appendChild(node("p", "Belum ada artikel yang tersimpan."));
    if (!revisions.childElementCount) revisions.appendChild(node("p", "Belum ada revisi."));
  }

  var WIT_OFFSET_MS = 9 * 3600 * 1000;
  var recruitmentFeedback = document.getElementById("recruitment-feedback");
  var recruitmentState = document.getElementById("recruitment-state");
  var recruitmentTrack = document.getElementById("recruitment-track");
  var recruitmentTracks = {
    dldpe: { kind: "ambassador", pillar_id: "dldpe", program_id: "", min_age: 14 },
    didpe: { kind: "ambassador", pillar_id: "didpe", program_id: "", min_age: 14 },
    amex: { kind: "volunteer", pillar_id: "", program_id: "amex", min_age: 16 }
  };
  var CUSTOM_MIN_AGE = 14;

  function trackMinAge() {
    var preset = recruitmentTracks[recruitmentTrack.value];
    return preset ? preset.min_age : CUSTOM_MIN_AGE;
  }

  function toWitInput(iso) {
    if (!iso) return "";
    var time = Date.parse(iso);
    return Number.isNaN(time) ? "" : new Date(time + WIT_OFFSET_MS).toISOString().slice(0, 16);
  }

  function formatWit(iso) {
    return iso ? new Date(iso).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jayapura" }) + " WIT" : "";
  }

  function recruitmentStatus(row) {
    var now = Date.now();
    var starts = row.opens_at ? Date.parse(row.opens_at) : null;
    var ends = row.closes_at ? Date.parse(row.closes_at) : null;
    if (row.status === "open") {
      if (starts !== null && starts > now) return { label: "Terjadwal", live: false, note: "Status Terbuka, tetapi belum mulai. Tampil di publik pada " + formatWit(row.opens_at) + "." };
      if (ends !== null && ends <= now) return { label: "Berakhir", live: false, note: "Jadwal sudah lewat. Pendaftaran baru ditolak server." };
      return { label: "Terbuka", live: true, note: "Tampil di publik dan menerima pendaftaran." };
    }
    if (row.status === "closed") return { label: "Ditutup", live: false, note: "Tidak tampil di publik. Pendaftaran baru ditolak server." };
    return { label: "Draf", live: false, note: "Belum dibuka. Tidak tampil di publik." };
  }

  function setTrackFromRow(row) {
    var track = "custom";
    if (row.kind === "ambassador" && row.pillar_id === "dldpe" && !row.program_id) track = "dldpe";
    else if (row.kind === "ambassador" && row.pillar_id === "didpe" && !row.program_id) track = "didpe";
    else if (row.kind === "volunteer" && row.program_id === "amex" && !row.pillar_id) track = "amex";
    recruitmentTrack.value = track;
  }

  function applyTrack(forceDefault) {
    var preset = recruitmentTracks[recruitmentTrack.value];
    if (!preset) return;
    recruitmentForm.elements.kind.value = preset.kind;
    recruitmentForm.elements.pillar_id.value = preset.pillar_id;
    recruitmentForm.elements.program_id.value = preset.program_id;
    var minAge = recruitmentForm.elements.minimum_age;
    minAge.min = preset.min_age;
    if (!minAge.value || Number(minAge.value) < preset.min_age || forceDefault) minAge.value = preset.min_age;
  }

  function describeRecruitment(row) {
    if (!row) return "Periode baru: tersimpan sebagai draf dan belum tampil di publik.";
    var state = recruitmentStatus(row);
    return "Status: " + state.label + ". " + state.note;
  }

  function resetRecruitmentForm() {
    recruitmentForm.reset();
    recruitmentForm.elements.id.value = "";
    recruitmentTrack.value = "dldpe";
    applyTrack(true);
    recruitmentState.textContent = describeRecruitment(null);
    setMessage(recruitmentFeedback, "");
  }

  function fillRecruitment(row) {
    recruitmentForm.elements.id.value = row.id;
    recruitmentForm.elements.kind.value = row.kind;
    recruitmentForm.elements.title.value = row.title;
    recruitmentForm.elements.pillar_id.value = row.pillar_id || "";
    recruitmentForm.elements.program_id.value = row.program_id || "";
    recruitmentForm.elements.scope.value = row.scope || "";
    recruitmentForm.elements.requirements.value = row.requirements || "";
    recruitmentForm.elements.opens_at.value = toWitInput(row.opens_at);
    recruitmentForm.elements.closes_at.value = toWitInput(row.closes_at);
    recruitmentForm.elements.accepted_quota.value = row.accepted_quota === null ? "" : row.accepted_quota;
    recruitmentForm.elements.minimum_age.value = row.minimum_age === null ? "" : row.minimum_age;
    recruitmentForm.elements.result_instructions.value = row.result_instructions || "";
    setTrackFromRow(row);
    recruitmentForm.elements.minimum_age.min = trackMinAge();
    recruitmentState.textContent = describeRecruitment(row);
    setMessage(recruitmentFeedback, "Periode dimuat ke formulir. Ubah lalu pilih Simpan.");
    recruitmentForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function recruitmentAction(button, action, row, confirmText, busyText, doneText) {
    if (!window.confirm(confirmText)) return;
    var label = button.textContent;
    button.disabled = true;
    button.textContent = busyText;
    setMessage(recruitmentFeedback, busyText);
    try {
      await adminRequest("/api/admin", { method: "POST", body: { action: action, id: row.id } });
      await refreshView("recruitments");
      setMessage(recruitmentFeedback, doneText + " “" + row.title + "”.", "success");
    } catch (error) {
      button.disabled = false;
      button.textContent = label;
      setMessage(recruitmentFeedback, error.message, "error");
    }
  }

  function renderRecruitments(rows) {
    var list = document.getElementById("recruitment-list");
    list.replaceChildren();
    (rows || []).forEach(function (row) {
      var state = recruitmentStatus(row);
      var item = node("article", null, "site-admin-item recruitment-item");
      var details = node("div");
      var heading = node("strong", row.title);
      details.appendChild(heading);
      details.appendChild(node("span", state.label, "recruitment-badge recruitment-badge-" + (state.live ? "open" : row.status === "closed" || state.label === "Berakhir" ? "closed" : "draft")));
      details.appendChild(node("p", state.note));
      var schedule = row.opens_at || row.closes_at
        ? "Jadwal: " + (row.opens_at ? formatWit(row.opens_at) : "segera") + " – " + (row.closes_at ? formatWit(row.closes_at) : "tanpa batas")
        : "Jadwal belum ditetapkan";
      details.appendChild(node("p", (row.kind === "volunteer" ? "Relawan" : "Duta") + " · " + schedule + " · usia minimum: " + (row.minimum_age === null ? "belum ditentukan" : row.minimum_age) + " · kuota: " + (row.accepted_quota === null ? "tidak ditetapkan" : row.accepted_quota)));
      item.appendChild(details);
      var actions = node("div", null, "recruitment-actions");
      var edit = node("button", "Edit", "site-button site-button-outline");
      edit.type = "button";
      edit.addEventListener("click", function () { fillRecruitment(row); });
      actions.appendChild(edit);
      if (row.status !== "open" && has("publisher")) {
        var open = node("button", "Buka", "site-button site-button-primary");
        open.type = "button";
        open.addEventListener("click", function () {
          recruitmentAction(open, "publish_recruitment", row,
            "Buka pendaftaran “" + row.title + "”? Formulir langsung tampil di situs publik sesuai jadwal.",
            "Membuka…", "Pendaftaran dibuka:");
        });
        actions.appendChild(open);
      }
      if (row.status === "open" && has("publisher")) {
        var close = node("button", "Tutup", "site-button site-button-outline");
        close.type = "button";
        close.addEventListener("click", function () {
          recruitmentAction(close, "close_recruitment", row,
            "Tutup pendaftaran “" + row.title + "” sekarang? Pendaftaran baru akan ditolak.",
            "Menutup…", "Pendaftaran ditutup:");
        });
        actions.appendChild(close);
      }
      item.appendChild(actions);
      list.appendChild(item);
    });
    if (!list.childElementCount) list.appendChild(node("p", "Belum ada periode pendaftaran."));
  }

  function renderApplications(rows) {
    var list = document.getElementById("application-list");
    applicationRows = rows || [];
    var filterDefinitions = [
      { id: "application-pillar-filter", key: "pillar_id", label: "Pilar" },
      { id: "application-program-filter", key: "program_id", label: "Program" },
      { id: "application-recruitment-filter", key: "id", label: "Angkatan" }
    ];
    filterDefinitions.forEach(function (filter) {
      var select = document.getElementById(filter.id);
      var selected = select.value;
      var values = new Map();
      applicationRows.forEach(function (row) {
        var recruitment = Array.isArray(row.recruitment) ? row.recruitment[0] : row.recruitment;
        var key = filter.key === "id" ? row.recruitment_id : recruitment && recruitment[filter.key];
        if (key) values.set(key, filter.key === "id" ? (recruitment && recruitment.title) || key : key);
      });
      select.replaceChildren(new Option("Semua " + filter.label.toLowerCase(), "semua"));
      values.forEach(function (label, value) { select.add(new Option(label, value)); });
      if (Array.from(select.options).some(function (option) { return option.value === selected; })) select.value = selected;
    });
    var searchTerm = document.getElementById("application-search").value.trim().toLowerCase();
    var statusFilter = document.getElementById("application-status-filter").value;
    var pillarFilter = document.getElementById("application-pillar-filter").value;
    var programFilter = document.getElementById("application-program-filter").value;
    var recruitmentFilter = document.getElementById("application-recruitment-filter").value;
    var visibleRows = applicationRows.filter(function (row) {
      var recruitment = Array.isArray(row.recruitment) ? row.recruitment[0] : row.recruitment;
      var haystack = [row.full_name, row.email, row.reference_code].join(" ").toLowerCase();
      return (!searchTerm || haystack.includes(searchTerm)) &&
        (statusFilter === "semua" || row.status === statusFilter) &&
        (pillarFilter === "semua" || (recruitment && recruitment.pillar_id === pillarFilter)) &&
        (programFilter === "semua" || (recruitment && recruitment.program_id === programFilter)) &&
        (recruitmentFilter === "semua" || row.recruitment_id === recruitmentFilter);
    });
    list.replaceChildren();
    visibleRows.forEach(function (row) {
      var recruitment = Array.isArray(row.recruitment) ? row.recruitment[0] : row.recruitment;
      var item = node("article", null, "site-admin-item site-application-item");
      var details = node("div", null, "site-admin-item-main");
      details.appendChild(node("strong", row.full_name + " · " + row.reference_code));
      if (recruitment) details.appendChild(node("p", recruitment.title));
      details.appendChild(node("p", row.regency + ", " + row.province + " · " + row.activity + " · usia " + row.age + " · " + row.status));
      details.appendChild(node("p", row.email + " · " + row.whatsapp));
      if (row.birth_date) details.appendChild(node("p", "Tanggal lahir: " + row.birth_date + " (usia dihitung saat mendaftar)"));
      if (row.is_minor) {
        var guardianRelation = { ayah: "Ayah", ibu: "Ibu", wali: "Wali" }[row.guardian_relationship] || "Wali";
        details.appendChild(node("p", "Di bawah 18 tahun. " + guardianRelation + ": " + (row.guardian_name || "-") + " · " + (row.guardian_whatsapp || "-") + (row.guardian_email ? " · " + row.guardian_email : "") + (row.guardian_consent ? " · persetujuan tercatat" : " · persetujuan BELUM tercatat"), "application-guardian"));
      }
      var notificationStatus = { not_sent: "Belum terkirim / email belum dikonfigurasi", not_configured: "Belum terkirim / email belum dikonfigurasi", prepared: "Status pengiriman perlu diperiksa", queued: "Status pengiriman perlu diperiksa", failed: "Notifikasi email gagal terkirim", sent: "Notifikasi email terkirim" }[row.notification_status] || "Status email tidak diketahui";
      details.appendChild(node("p", notificationStatus));
      details.appendChild(node("p", "Minat: " + row.interests));
      details.appendChild(node("p", "Motivasi: " + row.motivation));
      details.appendChild(node("p", "Ketersediaan: " + row.availability));
      if (row.internal_note) details.appendChild(node("p", "Catatan internal: " + row.internal_note));
      var note = document.createElement("textarea");
      note.rows = 2;
      note.maxLength = 2000;
      note.placeholder = "Catatan internal (opsional)";
      note.value = row.internal_note || "";
      details.appendChild(note);
      var actions = node("div", null, "site-admin-actions");
      ["reviewing", "accepted", "rejected"].forEach(function (status) {
        if (["accepted", "rejected"].includes(row.status)) return;
        var button = node("button", { reviewing: "Tandai ditinjau", accepted: "Terima", rejected: "Tolak" }[status], status === "accepted" ? "site-button site-button-primary" : "site-button site-button-outline");
        button.type = "button";
        button.addEventListener("click", async function () {
          try {
            await adminRequest("/api/admin", { method: "PATCH", body: { action: "review_application", id: row.id, status, note: note.value } });
            await refreshView("applications");
          } catch (error) { setMessage(alert, error.message, "error"); }
        });
        actions.appendChild(button);
      });
      var message = "Halo " + row.full_name + ", kami menghubungi Anda terkait pendaftaran DDPE dengan referensi " + row.reference_code + ".";
      var email = node("a", "Buka email");
      email.href = "mailto:" + encodeURIComponent(row.email) + "?subject=" + encodeURIComponent("Informasi pendaftaran DDPE") + "&body=" + encodeURIComponent(message);
      var phone = String(row.whatsapp || "").replace(/\D/g, "");
      if (phone) {
        var whatsapp = node("a", "Buka WhatsApp");
        whatsapp.href = "https://wa.me/" + phone + "?text=" + encodeURIComponent(message);
        whatsapp.target = "_blank";
        whatsapp.rel = "noopener noreferrer";
        actions.append(email, whatsapp);
      } else actions.append(email);
      actions.appendChild(node("span", "Membuka aplikasi pesan tidak menandai pemberitahuan terkirim.", "site-form-feedback"));
      item.append(details, actions);
      list.appendChild(item);
    });
    if (!list.childElementCount) list.appendChild(node("p", applicationRows.length ? "Tidak ada pendaftar yang cocok dengan filter ini." : "Tidak ada pendaftar pada cakupan izin Anda."));
  }

  function renderPartnerships(rows) {
    var list = document.getElementById("partnership-list");
    list.replaceChildren();
    (rows || []).forEach(function (row) {
      var item = node("article", null, "site-admin-item site-application-item");
      var details = node("div", null, "site-admin-item-main");
      details.appendChild(node("strong", row.organization_name + " · " + row.reference_code));
      details.appendChild(node("p", row.contact_name + " · " + row.email + " · " + row.whatsapp));
      details.appendChild(node("p", row.collaboration_type + " · " + row.status));
      details.appendChild(node("p", row.message));
      var note = document.createElement("textarea");
      note.rows = 2;
      note.maxLength = 2000;
      note.placeholder = "Catatan internal (opsional)";
      note.value = row.internal_note || "";
      details.appendChild(note);
      var actions = node("div", null, "site-admin-actions");
      ["reviewing", "closed"].forEach(function (status) {
        if (row.status === "closed" || row.status === "archived") return;
        var button = node("button", status === "reviewing" ? "Tandai ditinjau" : "Tutup", status === "closed" ? "site-button site-button-outline" : "site-button site-button-primary");
        button.type = "button";
        button.addEventListener("click", async function () {
          try {
            await adminRequest("/api/admin", { method: "PATCH", body: { action: "review_partnership", id: row.id, status, note: note.value } });
            await refreshView("partnerships");
          } catch (error) { setMessage(alert, error.message, "error"); }
        });
        actions.appendChild(button);
      });
      item.append(details, actions);
      list.appendChild(item);
    });
    if (!list.childElementCount) list.appendChild(node("p", "Tidak ada minat kemitraan pada layanan ini."));
  }

  async function refreshView(view) {
    try {
      setMessage(alert, "Memuat data…");
      if (view === "leadership") renderLeadership(await adminRequest("/api/admin?view=leadership"));
      if (view === "events") renderEvents((await adminRequest("/api/admin?view=events")).events);
      if (view === "comments") renderComments((await adminRequest("/api/admin?view=comments")).comments);
      if (view === "articles") renderArticles(await adminRequest("/api/admin?view=articles"));
      if (view === "site_content") await renderSiteContent(await adminRequest("/api/admin?view=site_content"));
      if (view === "recruitments") renderRecruitments((await adminRequest("/api/admin?view=recruitments")).recruitments);
      if (view === "applications") renderApplications((await adminRequest("/api/admin?view=applications")).applications);
      if (view === "partnerships") renderPartnerships((await adminRequest("/api/admin?view=partnerships")).inquiries);
      if (view === "permissions") await renderPermissionsView();
      setMessage(alert, "Data dimuat dari server.", "success");
    } catch (error) { setMessage(alert, error.message, "error"); }
  }

  function showDashboard(grants) {
    permissionRows = grants || [];
    login.hidden = true;
    app.hidden = false;
    document.getElementById("account-email").textContent = session.user && session.user.email ? session.user.email : "Akun terverifikasi";
    document.querySelectorAll("[data-permission]").forEach(function (element) {
      var required = element.dataset.permission.split(",");
      element.hidden = !required.some(has);
    });
    document.querySelectorAll("[data-view]").forEach(function (button) {
      if (!button.hidden && !currentView) activateView(button.dataset.view);
    });
    document.getElementById("publish-now").hidden=!(has("publisher") && has("content_editor"));
    if (has("application_exporter")) document.getElementById("export-applications").hidden = false;
  }

  async function establishSession(nextSession) {
    session = nextSession;
    if (!session) {
      currentView="";
      document.querySelectorAll("[data-panel]").forEach(p=>p.hidden=true);
      document.querySelectorAll(".site-admin-list").forEach(p=>p.replaceChildren());
      articleForm.reset();editor.replaceChildren();cmsSections=[];siteContentPages={};
      app.hidden = true;
      login.hidden = false;
      permissionRows = [];
      return;
    }
    try {
      var result = await adminRequest("/api/admin?view=me");
      if (!result.permissions || result.permissions.length === 0) {
        app.hidden = true;
        login.hidden = false;
        await client.auth.signOut();
        setMessage(loginFeedback, "Akun terdaftar, tetapi belum diberi izin pengurus. Hubungi pengelola akses.", "error");
        return;
      }
      showDashboard(result.permissions);
      setMessage(alert, "Akses diverifikasi untuk akun ini.", "success");
    } catch (error) {
      app.hidden = true;
      login.hidden = false;
      setMessage(loginFeedback, error.message, "error");
    }
  }

  async function resizeImage(file) {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 12 * 1024 * 1024) throw new Error("Pilih JPG, PNG, atau WebP hingga 12 MB.");
    var image = await createImageBitmap(file);
    var scale = Math.min(1, 1800 / image.width, 1800 / image.height);
    var canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    image.close();
    var blob = await new Promise(function (resolve) { canvas.toBlob(resolve, "image/webp", 0.82); });
    if (!blob || blob.size > 3 * 1024 * 1024) throw new Error("Ukuran hasil kompresi melebihi 3 MB.");
    return blob;
  }

  async function uploadCover(file, alt) {
    var status = document.getElementById("article-image-status");
    status.textContent = "Mengompres gambar…";
    status.dataset.state = "";
    var blob = await resizeImage(file);
    var bytes = new Uint8Array(await blob.arrayBuffer());
    var binary = "";
    for (var offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode.apply(null, bytes.subarray(offset, offset + 0x8000));
    var result = await new Promise(function (resolve, reject) {
      var request = new XMLHttpRequest();
      request.open("POST", "/api/media");
      request.setRequestHeader("Authorization", "Bearer " + sessionToken());
      request.setRequestHeader("Content-Type", "application/json");
      request.upload.addEventListener("progress", function (event) {
        if (event.lengthComputable) status.textContent = "Mengunggah gambar… " + Math.round(event.loaded / event.total * 100) + "%";
      });
      request.addEventListener("load", function () {
        var payload = {};
        try { payload = JSON.parse(request.responseText); } catch (_error) {}
        if (request.status >= 200 && request.status < 300) resolve(payload);
        else reject(new Error(payload.error === "alt_text_required" ? "Teks alternatif gambar wajib diisi." : "Unggah gagal. Tidak ada referensi gambar yang disimpan."));
      });
      request.addEventListener("error", function () { reject(new Error("Jaringan gagal. Gambar belum tersimpan.")); });
      request.addEventListener("abort", function () { reject(new Error("Unggah dibatalkan. Gambar belum tersimpan.")); });
      request.send(JSON.stringify({ data: btoa(binary), alt: alt.trim() }));
    });
    articleForm.elements.cover_url.value = result.url;
    articleForm.elements.cover_media_id.value = result.id;
    articleForm.elements.cover_alt.value = result.alt;
    document.getElementById("article-image-status").textContent = "Gambar tersimpan di Storage. URL sampul telah diisi.";
    document.getElementById("article-image-status").dataset.state = "success";
    selectedImage = null;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = "";
    document.getElementById("article-image-preview").hidden = true;
    document.getElementById("article-image").value = "";
  }

  function setSelectedImage(file) {
    var status = document.getElementById("article-image-status");
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 12 * 1024 * 1024) {
      selectedImage = null;
      status.textContent = "Pilih JPG, PNG, atau WebP hingga 12 MB. Gambar belum diunggah.";
      status.dataset.state = "error";
      return;
    }
    selectedImage = file;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    var preview = document.getElementById("article-image-preview");
    preview.src = previewUrl;
    preview.hidden = false;
    status.textContent = file.name + " · " + (file.size / 1024 / 1024).toFixed(1) + " MB. Isi alt text sebelum menyimpan.";
    status.dataset.state = "";
  }

  document.querySelectorAll("[data-view]").forEach(function (button) {
    button.addEventListener("click", function () { activateView(button.dataset.view); });
  });
  document.querySelectorAll("[data-refresh]").forEach(function (button) {
    button.addEventListener("click", function () { refreshView(button.dataset.refresh); });
  });
  ["application-search", "application-status-filter", "application-pillar-filter", "application-program-filter", "application-recruitment-filter"].forEach(function (id) {
    document.getElementById(id).addEventListener("input", function () { renderApplications(applicationRows); });
    document.getElementById(id).addEventListener("change", function () { renderApplications(applicationRows); });
  });

  loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!loginForm.reportValidity()) return;
    if (!client) return setMessage(loginFeedback, "Konfigurasi Supabase belum tersedia.", "error");
    var data = new FormData(loginForm);
    setMessage(loginFeedback, "Memverifikasi akun…");
    var result = await client.auth.signInWithPassword({ email: data.get("email"), password: data.get("password") });
    if (result.error) return setMessage(loginFeedback, "Email atau kata sandi tidak cocok.", "error");
    await establishSession(result.data.session);
  });

  document.getElementById("sign-out").addEventListener("click", async function () {
    await client.auth.signOut();
    await establishSession(null);
  });

  articleForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    articleForm.elements.body.value=DDPEEditorial.clean(editor.innerHTML);
    if (!articleForm.reportValidity()) return;
    var publishNow = event.submitter && event.submitter.id === "publish-now";
    var saveButton = articleForm.querySelector('button[type="submit"]');
    saveButton.disabled = true;
    document.getElementById("publish-now").disabled=true;
    var data = new FormData(articleForm);
    var body = Object.fromEntries(data.entries());
    var image = selectedImage;
    try {
      if (image) {
        await uploadCover(image, document.getElementById("article-image-alt").value);
        body.cover_url = articleForm.elements.cover_url.value;
        body.cover_media_id = articleForm.elements.cover_media_id.value;
        body.cover_alt = articleForm.elements.cover_alt.value;
      }
      body.action = "save_article";
      if (articleForm.elements.revision_id.value) {
        body.id = articleForm.elements.id.value;
        body.revision_id = articleForm.elements.revision_id.value;
      }
      var saved = await adminRequest("/api/admin", { method: "POST", body });
      articleForm.elements.slug.dataset.manual="true";
      if (saved.article) {
        articleForm.elements.id.value = saved.article.id;
        articleForm.elements.revision_id.value = "";
        articleForm.dataset.revisionArticle = "";
      }
      if (saved.revision) {
        articleForm.elements.revision_id.value = saved.revision.id;
        articleForm.dataset.revisionArticle = saved.revision.article_id;
      }
      if(publishNow){
        const id=articleForm.elements.id.value, revision_id=articleForm.elements.revision_id.value || undefined;
        await adminRequest("/api/admin",{method:"POST",body:{action:"submit_article",id,revision_id}});
        await adminRequest("/api/admin",{method:"POST",body:{action:"publish_article",id,revision_id}});
        articleForm.elements.revision_id.value="";
      }
      setMessage(document.getElementById("article-feedback"), publishNow ? "Artikel diterbitkan." : "Draf tersimpan di server. Belum diterbitkan.", "success");
      renderArticles(await adminRequest("/api/admin?view=articles"));
    } catch (error) {
      setMessage(document.getElementById("article-feedback"), error.message, "error");
    } finally {
      saveButton.disabled = false;
      document.getElementById("publish-now").disabled=false;
    }
  });

  document.getElementById("submit-article").addEventListener("click", async function () {
    var id = articleForm.elements.id.value;
    var revisionId = articleForm.elements.revision_id.value;
    if (!id) return setMessage(document.getElementById("article-feedback"), "Simpan draf terlebih dahulu.", "error");
    try {
      await adminRequest("/api/admin", { method: "POST", body: revisionId ? { action: "submit_article", revision_id: revisionId } : { action: "submit_article", id } });
      setMessage(document.getElementById("article-feedback"), "Diajukan kepada penerbit. Versi publik belum berubah.", "success");
      renderArticles(await adminRequest("/api/admin?view=articles"));
    } catch (error) { setMessage(document.getElementById("article-feedback"), error.message, "error"); }
  });

  document.getElementById("article-image").addEventListener("change", function () {
    setSelectedImage(this.files[0]);
  });

  var dropzone = document.getElementById("article-dropzone");
  ["dragenter", "dragover"].forEach(function (eventName) {
    dropzone.addEventListener(eventName, function (event) {
      event.preventDefault();
      dropzone.classList.add("is-dragging");
    });
  });
  ["dragleave", "drop"].forEach(function (eventName) {
    dropzone.addEventListener(eventName, function (event) {
      event.preventDefault();
      dropzone.classList.remove("is-dragging");
    });
  });
  dropzone.addEventListener("drop", function (event) {
    setSelectedImage(event.dataTransfer && event.dataTransfer.files[0]);
  });

  recruitmentTrack.addEventListener("change", function () { applyTrack(true); });
  recruitmentForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    var saveButton = document.getElementById("save-recruitment");
    if (!recruitmentForm.reportValidity()) return;
    var data = new FormData(recruitmentForm);
    var body = Object.fromEntries(data.entries());
    var opens = body.opens_at ? Date.parse(body.opens_at + ":00+09:00") : null;
    var closes = body.closes_at ? Date.parse(body.closes_at + ":00+09:00") : null;
    if (opens !== null && Number.isNaN(opens) || closes !== null && Number.isNaN(closes)) return setMessage(recruitmentFeedback, "Format tanggal tidak valid.", "error");
    if (opens !== null && closes !== null && closes <= opens) return setMessage(recruitmentFeedback, "Waktu tutup harus setelah waktu mulai.", "error");
    if (!body.minimum_age) body.minimum_age = trackMinAge();
    if (Number(body.minimum_age) < trackMinAge()) return setMessage(recruitmentFeedback, "Usia minimum untuk program ini tidak boleh di bawah " + trackMinAge() + " tahun.", "error");
    body.action = "save_recruitment";
    body.guardian_review_required = true;
    body.opens_at = opens === null ? null : new Date(opens).toISOString();
    body.closes_at = closes === null ? null : new Date(closes).toISOString();
    saveButton.disabled = true;
    var idle = saveButton.textContent;
    saveButton.textContent = "Menyimpan…";
    try {
      var result = await adminRequest("/api/admin", { method: "POST", body });
      var saved = result && result.recruitment;
      setMessage(recruitmentFeedback, "Periode tersimpan" + (saved ? " (status: " + recruitmentStatus(saved).label + ")" : "") + ". Gunakan Buka atau Tutup pada daftar untuk mengubah status.", "success");
      if (saved) { recruitmentForm.elements.id.value = saved.id; recruitmentState.textContent = describeRecruitment(saved); }
      await refreshView("recruitments");
    } catch (error) { setMessage(recruitmentFeedback, error.message, "error"); }
    finally { saveButton.disabled = false; saveButton.textContent = idle; }
  });

  document.getElementById("new-recruitment").addEventListener("click", resetRecruitmentForm);
  applyTrack(false);

  siteContentForm.elements.page_key.addEventListener("change", loadSiteContentForm);
  siteContentForm.elements.title.addEventListener("input", updateSiteContentPreview);
  siteContentForm.elements.intro.addEventListener("input", updateSiteContentPreview);
  siteContentForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!siteContentForm.reportValidity()) return;
    var button = siteContentForm.querySelector('button[type="submit"]');
    button.disabled = true;
    setMessage(document.getElementById("site-content-feedback"), "Menyimpan salinan halaman…");
    try {
      var data = new FormData(siteContentForm);
      var page = data.get("page_key");
      var result = await adminRequest("/api/admin", {
        method: "POST",
        body: { action: "save_site_content", page_key: page, title: data.get("title"), intro: data.get("intro"), sections: cmsSections, version: pageVersion }
      });
      siteContentPages=(await adminRequest("/api/admin?view=site_content")).pages; pageVersion=siteContentPages[page].version;
      setMessage(document.getElementById("site-content-feedback"), result.saved ? "Perubahan tersimpan dan sudah dipublikasikan." : "Perubahan belum tersimpan.", result.saved ? "success" : "error");
    } catch (error) {
      setMessage(document.getElementById("site-content-feedback"), error.message, "error");
    } finally { button.disabled = false; }
  });

  permissionForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!permissionForm.reportValidity()) return;
    var data = new FormData(permissionForm);
    var body = Object.fromEntries(data.entries());
    body.action = "grant_permission";
    if (body.scope_type === "organization") body.scope_id = null;
    try {
      await adminRequest("/api/admin", { method: "POST", body });
      setMessage(document.getElementById("permission-feedback"), "Izin disimpan dan dicatat.", "success");
      permissionForm.reset();
      await refreshView("permissions");
    } catch (error) { setMessage(document.getElementById("permission-feedback"), error.message, "error"); }
  });

  document.getElementById("export-applications").addEventListener("click", async function () {
    try {
      var response = await fetch("/api/admin?view=applications&format=csv", { headers: { Authorization: "Bearer " + sessionToken() }, cache: "no-store" });
      if (!response.ok) throw new Error("Ekspor ditolak atau gagal. Pastikan izin ekspor masih aktif.");
      var blob = await response.blob();
      var url = URL.createObjectURL(blob);
      var link = document.createElement("a");
      link.href = url;
      link.download = "ddpe-lamaran.csv";
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) { setMessage(alert, error.message, "error"); }
  });

  document.querySelector('[name="scope_type"]').addEventListener("change", function () {
    var field = permissionForm.elements.scope_id;
    field.required = this.value !== "organization";
    field.disabled = this.value === "organization";
    if (field.disabled) field.value = "";
  });

  async function initializeAuth() {
    if (!window.supabase || !window.supabase.createClient) {
      document.getElementById("dashboard-config-state").textContent = "SDK autentikasi belum tersedia. Periksa koneksi dan coba lagi.";
      loginForm.querySelector("button[type=submit]").disabled = true;
      return;
    }
    try {
      var response = await fetch("/api/public-config", { cache: "no-store" });
      if (!response.ok) throw new Error("public_config_not_available");
      cfg = await response.json();
    } catch (_error) {
      document.getElementById("dashboard-config-state").textContent = "Supabase Auth belum dikonfigurasi untuk Preview ini. Login dinonaktifkan.";
      loginForm.querySelector("button[type=submit]").disabled = true;
      return;
    }
    if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) {
      document.getElementById("dashboard-config-state").textContent = "Supabase Auth belum dikonfigurasi untuk Preview ini. Login dinonaktifkan.";
      loginForm.querySelector("button[type=submit]").disabled = true;
      return;
    }

    document.getElementById("dashboard-config-state").hidden = true;
    client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    client.auth.onAuthStateChange(function (event, nextSession) {
      if (event !== "INITIAL_SESSION" && event !== "TOKEN_REFRESHED" && event !== "SIGNED_IN" && event !== "SIGNED_OUT") return;
      establishSession(nextSession);
    });
    client.auth.getSession().then(function (result) { establishSession(result.data.session); });
  }

  const editorial=window.DDPEEditorial;
  function slugify(s){return s.normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100).replace(/-$/,'');}
  articleForm.elements.title.addEventListener('input',()=>{if(articleForm.elements.slug.dataset.manual!=='true')articleForm.elements.slug.value=slugify(articleForm.elements.title.value);});
  articleForm.elements.slug.addEventListener('input',()=>articleForm.elements.slug.dataset.manual=articleForm.elements.slug.value?'true':'false');
  articleForm.elements.meta_description.addEventListener('input',()=>{document.getElementById('seo-counter').textContent=articleForm.elements.meta_description.value.length+' karakter · sasaran 120–160';});
  document.querySelectorAll('[data-format]').forEach(button=>{button.addEventListener('mousedown',e=>e.preventDefault());button.addEventListener('click',()=>{editor.focus();document.execCommand(button.dataset.format,false,button.dataset.value || null);});});
  document.getElementById('editor-link').onclick=()=>{const link=prompt('Alamat tautan HTTPS:');if(!link)return;const safe=editorial.url(link);if(!safe)return setMessage(document.getElementById('article-feedback'),'Alamat tautan tidak valid.','error');editor.focus();document.execCommand('createLink',false,safe);};
  editor.addEventListener('paste',event=>{event.preventDefault();const data=event.clipboardData;document.execCommand('insertHTML',false,editorial.clean(data.getData('text/html') || data.getData('text/plain')));});
  document.getElementById('publish-now').type='submit';
  document.getElementById('new-article').onclick=()=>{articleForm.reset();articleForm.elements.id.value='';articleForm.elements.revision_id.value='';articleForm.elements.cover_media_id.value='';articleForm.elements.slug.dataset.manual='false';editor.replaceChildren();selectedImage=null;document.getElementById('article-image-preview').hidden=true;setMessage(document.getElementById('article-feedback'),'Artikel baru.');};
  document.getElementById('preview-article').onclick=()=>{
    const a=Object.fromEntries(new FormData(articleForm));a.body=editorial.clean(editor.innerHTML);a.tags=a.tags.split(',').map(t=>t.trim()).filter(Boolean);a.id=a.id || 'preview';
    const dialog=document.getElementById('article-preview');dialog.querySelector('iframe').srcdoc='<!doctype html><html lang="id"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><link rel="stylesheet" href="'+location.origin+'/css/site.css"><link rel="stylesheet" href="'+location.origin+'/css/editorial.css"><body class="ddpe-reader"><p>Pratinjau draf — belum dipublikasikan. Tombol interaktif dinonaktifkan.</p><main class="site-container"><article>'+editorial.render(a)+'</article></main></body></html>';dialog.showModal();
  };
  async function uploadImage(file,alt){
    if(!file)throw Error('Pilih gambar terlebih dahulu.');if(!alt || alt.trim().length<4)throw Error('Isi keterangan foto minimal 4 karakter.');
    const blob=await resizeImage(file), bytes=new Uint8Array(await blob.arrayBuffer());let bin='';for(let i=0;i<bytes.length;i+=0x8000)bin+=String.fromCharCode.apply(null,bytes.subarray(i,i+0x8000));
    return adminRequest('/api/media',{method:'POST',body:{data:btoa(bin),alt:alt.trim()}});
  }
  let selection=null;
  editor.addEventListener('keyup',captureSelection);editor.addEventListener('mouseup',captureSelection);
  function captureSelection(){const s=window.getSelection();if(s.rangeCount && editor.contains(s.anchorNode))selection=s.getRangeAt(0).cloneRange();}
  document.getElementById('insert-image').onclick=async function(){
    this.disabled=true;try{const alt=document.getElementById('inline-alt').value,result=await uploadImage(document.getElementById('inline-image').files[0],alt);editor.focus();if(selection && editor.contains(selection.commonAncestorContainer)){const s=window.getSelection();s.removeAllRanges();s.addRange(selection);}else{const r=document.createRange();r.selectNodeContents(editor);r.collapse(false);const s=window.getSelection();s.removeAllRanges();s.addRange(r);}
    document.execCommand('insertHTML',false,'<figure><img src="'+editorial.esc(result.url)+'" alt="'+editorial.esc(alt)+'"><figcaption>'+editorial.esc(alt)+'</figcaption></figure><p><br></p>');setMessage(document.getElementById('article-feedback'),'Gambar disisipkan. Simpan artikel untuk menyimpan perubahan.');}
    catch(err){setMessage(document.getElementById('article-feedback'),err.message,'error');}finally{this.disabled=false;}
  };
  function button(label,fn){const b=node('button',label);b.type='button';b.onclick=fn;return b;}
  function field(parent,label,value,change,multiline){const wrap=node('label',label),input=node(multiline?'textarea':'input');input.value=value || '';input.maxLength=multiline?5000:1200;input.oninput=()=>change(input.value);wrap.append(input);parent.append(wrap);return input;}
  function editCard(parent,card){
    field(parent,'Judul',card.title,v=>card.title=v).maxLength=180;
    field(parent,'Teks',card.text,v=>card.text=v,true);
    const image=field(parent,'URL gambar',card.image,v=>card.image=v);
    field(parent,'Keterangan / alt gambar',card.alt,v=>card.alt=v).maxLength=220;
    const label=node('label','Unggah gambar'),input=node('input');input.type='file';input.accept='image/jpeg,image/png,image/webp';label.append(input);parent.append(label);
    input.onchange=async()=>{input.disabled=true;try{const result=await uploadImage(input.files[0],card.alt);card.image=result.url;image.value=result.url;setMessage(document.getElementById('site-content-feedback'),'Gambar diunggah. Simpan perubahan halaman.');}catch(err){setMessage(document.getElementById('site-content-feedback'),err.message,'error');}finally{input.disabled=false;}};
    field(parent,'Teks tombol',card.button,v=>card.button=v).maxLength=80;field(parent,'Link tombol',card.href,v=>card.href=v);
  }
  function emptyCard(){return {id:'c-'+crypto.randomUUID(),title:'Judul baru',text:'',image:'',alt:'',button:'',href:''};}
  function renderSections(){
    const host=document.getElementById('cms-sections');host.replaceChildren();
    cmsSections.forEach((section,i)=>{const wrap=node('details',null,'cms-section-editor');const summary=node('summary',section.title || 'Section '+(i+1));wrap.append(summary);editCard(wrap,section);
      const actions=node('div',null,'site-dashboard-actions');actions.append(button('Hapus section',()=>{if(confirm('Hapus section ini dari halaman setelah disimpan?')){cmsSections.splice(i,1);renderSections();}}));wrap.append(actions);
      section.cards.forEach((card,j)=>{const box=node('fieldset'),legend=node('legend','Kartu '+(j+1));box.append(legend);editCard(box,card);box.append(button('Hapus kartu',()=>{section.cards.splice(j,1);renderSections();}));wrap.append(box);});
      wrap.append(button('Tambah kartu',()=>{if(section.cards.length>=20)return;section.cards.push(emptyCard());renderSections();}));host.append(wrap);
    });
  }
  document.getElementById('add-section').onclick=()=>{if(cmsSections.length>=30)return;cmsSections.push({...emptyCard(),cards:[]});renderSections();};
  const eventForm=document.getElementById('event-form');
  function resetEvent(){eventForm.reset();eventForm.elements.id.value='';eventForm.elements.version.value='';}
  document.getElementById('new-event').onclick=resetEvent;
  function renderEvents(rows){const list=document.getElementById('event-list');list.replaceChildren();if(!rows.length)list.append(node('p','Belum ada kegiatan. Tambahkan melalui formulir.'));rows.forEach(row=>{const item=node('article',null,'site-admin-item');item.append(node('h3',row.title),node('p',row.date.slice(0,16).replace('T',' ')+' WIT · '+(row.status==='upcoming'?'Akan datang':'Terlaksana')));item.append(button('Edit',()=>{resetEvent();Object.keys(row).forEach(k=>{if(eventForm.elements[k] && k!=='upload')eventForm.elements[k].value=k==='date'?row[k].slice(0,16):row[k];});}),button('Hapus',async()=>{if(!confirm('Hapus kegiatan ini?'))return;try{await adminRequest('/api/admin',{method:'POST',body:{action:'delete_event',id:row.id,version:row.version}});await refreshView('events');}catch(err){setMessage(alert,err.message,'error');}}));list.append(item);});}
  eventForm.onsubmit=async ev=>{ev.preventDefault();if(!eventForm.reportValidity())return;const b=eventForm.querySelector('[type=submit]');b.disabled=true;try{const data=Object.fromEntries(new FormData(eventForm));if(data.upload && data.upload.size)data.image=(await uploadImage(data.upload,data.alt)).url;delete data.upload;const version=data.version || null;delete data.version;data.id=data.id || 'event-'+crypto.randomUUID();data.date=data.date+'+09:00';await adminRequest('/api/admin',{method:'POST',body:{action:'save_event',event:data,version}});resetEvent();await refreshView('events');setMessage(document.getElementById('event-feedback'),'Kegiatan tersimpan dan tampil di halaman publik.','success');}catch(err){setMessage(document.getElementById('event-feedback'),err.message,'error');}finally{b.disabled=false;}};
  function renderComments(rows){const host=document.getElementById('comment-list');host.replaceChildren();if(!rows.length)host.append(node('p','Belum ada komentar.'));rows.forEach(row=>{const item=node('article',null,'site-admin-item');item.append(node('strong',row.name+' · '+row.status),node('p',row.body));['approved','rejected'].forEach(status=>item.append(button(status==='approved'?'Tampilkan':'Sembunyikan',async()=>{try{await adminRequest('/api/admin',{method:'POST',body:{action:'moderate_comment',id:row.id,status}});await refreshView('comments');}catch(err){setMessage(alert,err.message,'error');}})));host.append(item);});}

  let leadershipData={members:[]},leadershipVersion=null;
  const leadershipForm=document.getElementById('leadership-form'),leadershipFeedback=document.getElementById('leadership-feedback');
  function newLeader(){leadershipForm.reset();leadershipForm.elements.id.value='';leadershipForm.elements.period_start.value=2026;leadershipForm.elements.period_end.value=2028;leadershipForm.elements.order.value=leadershipData.members.length+1;leadershipForm.elements.name.required=true;document.getElementById('leadership-photo-preview').hidden=true;}
  function showLeadershipPhoto(value){const image=document.getElementById('leadership-photo-preview');const url=DDPEEditorial.url(value,true);image.hidden=!url;if(url)image.src=url;}
  async function persistLeadership(next){const result=await adminRequest('/api/admin',{method:'POST',body:{action:'save_leadership',leadership:next,version:leadershipVersion}});if(!result.saved)throw Error('Data belum tersimpan.');renderLeadership(await adminRequest('/api/admin?view=leadership'));}
  function renderLeadership(result){
    leadershipData=result.leadership || {members:[]};leadershipVersion=result.version || null;
    const list=document.getElementById('leadership-list');list.replaceChildren();
    ['induk','dldpe','didpe'].forEach(unit=>{list.append(node('h3',unit==='induk'?'Pengurus Induk':unit.toUpperCase()));const rows=leadershipData.members.filter(m=>m.unit===unit).sort((a,b)=>a.order-b.order);if(!rows.length)list.append(node('p','Belum ada posisi pada unit ini. Tambahkan melalui formulir.'));rows.forEach(m=>{
      const item=node('article',null,'site-admin-item');item.append(node('strong',m.name || m.role),node('p',m.role+' · '+m.period_start+'–'+m.period_end+' · '+(m.status==='active'?'Terisi':m.status==='selection'?'Dalam Tahap Pemilihan':'Terbuka')));
      item.append(button('Edit',()=>{newLeader();Object.entries(m).forEach(([k,v])=>{if(leadershipForm.elements[k])leadershipForm.elements[k].value=v;});leadershipForm.elements.name.required=m.status==='active';showLeadershipPhoto(m.photo);leadershipForm.elements.name.focus();}),button('Hapus',async()=>{if(!confirm('Hapus '+(m.name || m.role)+' dari direktori publik?'))return;try{await persistLeadership({members:leadershipData.members.filter(x=>x.id!==m.id)});newLeader();setMessage(leadershipFeedback,'Data pengurus dihapus.','success');}catch(err){setMessage(leadershipFeedback,err.message,'error');}}));list.append(item);
    });});
  }
  leadershipForm.elements.status.onchange=()=>{leadershipForm.elements.name.required=leadershipForm.elements.status.value==='active';};
  leadershipForm.elements.photo.oninput=()=>showLeadershipPhoto(leadershipForm.elements.photo.value);
  document.getElementById('new-leader').onclick=newLeader;
  leadershipForm.onsubmit=async event=>{
    event.preventDefault();if(!leadershipForm.reportValidity())return;
    const submit=leadershipForm.querySelector('[type=submit]');submit.disabled=true;
    try{const raw=Object.fromEntries(new FormData(leadershipForm));if(Number(raw.period_end)<Number(raw.period_start))throw Error('Tahun akhir masa bakti harus sama atau setelah tahun awal.');
      if(raw.upload && raw.upload.size){const asset=await uploadImage(raw.upload,raw.alt || 'Foto profil '+raw.name);raw.photo=asset.url;raw.alt=asset.alt;}
      delete raw.upload;raw.id=raw.id || 'person-'+crypto.randomUUID();['level','order','period_start','period_end'].forEach(k=>raw[k]=Number(raw[k]));
      const next=leadershipData.members.filter(m=>m.id!==raw.id).concat(raw);await persistLeadership({members:next});newLeader();setMessage(leadershipFeedback,'Kepengurusan tersimpan dan tersedia di direktori publik.','success');
    }catch(err){setMessage(leadershipFeedback,err.message,'error');}finally{submit.disabled=false;}
  };

  initializeAuth();
})();