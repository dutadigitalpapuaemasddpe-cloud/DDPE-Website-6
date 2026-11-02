(function () {
  "use strict";

  var params = new URLSearchParams(window.location.search);
  var recruitmentId = params.get("recruitment_id") || "";
  var state = document.getElementById("application-state");
  var shell = document.getElementById("application-shell");
  var form = document.getElementById("application-form");
  var button = form && form.querySelector('button[type="submit"]');
  var feedback = document.getElementById("application-feedback");
  var requestKey = window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : "";
  var recruitmentOpen = false;

  function showError(message) {
    feedback.textContent = message;
    feedback.dataset.state = "error";
  }

  async function loadRecruitment() {
    if (!recruitmentId) {
      state.textContent = "Pilih kesempatan dari halaman Terlibat untuk membuka formulir yang sesuai.";
      return;
    }
    try {
      var response = await fetch("/api/public-recruitments?id=" + encodeURIComponent(recruitmentId), { cache: "no-store" });
      if (!response.ok) throw new Error("recruitment_lookup_failed");
      var payload = await response.json();
      var recruitment = Array.isArray(payload.recruitments) ? payload.recruitments[0] : null;
      var now = Date.now();
      if (!recruitment || (recruitment.opens_at && Date.parse(recruitment.opens_at) > now) || (recruitment.closes_at && Date.parse(recruitment.closes_at) <= now)) {
        state.textContent = "Pendaftaran ini tidak sedang dibuka. Kembali ke halaman Terlibat untuk melihat status terbaru.";
        return;
      }
      recruitmentOpen = true;
      state.hidden = true;
      shell.hidden = false;
      document.getElementById("recruitment-id").value = recruitment.id;
      document.getElementById("recruitment-title").textContent = recruitment.title;
      document.getElementById("application-kind").textContent = recruitment.kind === "volunteer" ? "Pendaftaran relawan" : "Pendaftaran Duta";
      document.getElementById("recruitment-details").textContent = [recruitment.scope, recruitment.requirements].filter(Boolean).join("\n\n");
      document.getElementById("recruitment-deadline").textContent = recruitment.closes_at
        ? "Pendaftaran ditutup " + new Date(recruitment.closes_at).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jayapura" }) + " WIT."
        : "Jadwal penutupan belum dicantumkan.";
      if (!requestKey) {
        button.disabled = true;
        showError("Browser tidak dapat membuat kunci pengiriman aman. Buka halaman melalui HTTPS.");
      }
    } catch (_error) {
      state.textContent = "Status belum dapat diverifikasi karena layanan sedang tidak tersedia. Coba muat ulang halaman.";
    }
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!recruitmentOpen || !form.reportValidity() || !requestKey) return;
    button.disabled = true;
    feedback.textContent = "Mengirim dan menyimpan pendaftaran…";
    feedback.dataset.state = "";
    var data = new FormData(form);
    var payload = Object.fromEntries(data.entries());
    payload.kind = "application";
    payload.submission_key = requestKey;
    payload.recruitment_id = recruitmentId;
    payload.data_consent = data.has("data_consent");
    payload.truthful_statement = data.has("truthful_statement");
    try {
      var response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      var result = await response.json();
      if (!response.ok) {
        var errors = {
          recruitment_closed: "Pendaftaran baru saja ditutup. Data belum disimpan.",
          already_submitted: "Alamat email ini sudah digunakan untuk pendaftaran pada angkatan ini.",
          too_many_attempts: "Terlalu banyak percobaan. Tunggu satu menit lalu coba lagi.",
          check_required_fields: "Periksa kembali isian yang wajib diisi. Data belum disimpan."
        };
        throw new Error(errors[result.error] || "Pendaftaran belum tersimpan. Periksa koneksi dan coba lagi.");
      }
      var notificationMessage = result.notification === "sent"
        ? " Notifikasi data dasar sudah dikirim ke pengelola DDPE."
        : result.notification === "failed"
          ? " Notifikasi email belum terkirim; pengurus tetap dapat melihat pendaftaran di dashboard."
          : " Data tersimpan; notifikasi email belum dikonfigurasi pada server ini.";
      feedback.textContent = "Pendaftaran tersimpan. Nomor referensi: " + result.reference + ". Simpan nomor ini untuk komunikasi dengan tim DDPE." + notificationMessage;
      feedback.dataset.state = "success";
      form.reset();
      button.textContent = "Terkirim";
    } catch (error) {
      showError(error.message || "Pendaftaran belum tersimpan. Periksa koneksi dan coba lagi.");
      button.disabled = false;
    }
  });

  loadRecruitment();
})();