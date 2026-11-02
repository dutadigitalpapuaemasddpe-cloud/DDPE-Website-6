(function () {
  "use strict";

  var form = document.getElementById("partnership-form");
  if (!form) return;
  var button = form.querySelector('button[type="submit"]');
  var feedback = document.getElementById("partnership-feedback");
  var requestKey = window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID() : "";

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!form.reportValidity()) return;
    if (!requestKey) {
      feedback.textContent = "Buka halaman melalui HTTPS agar formulir dapat dikirim dengan aman.";
      feedback.dataset.state = "error";
      return;
    }
    button.disabled = true;
    feedback.textContent = "Menyimpan minat kerja sama…";
    feedback.dataset.state = "";
    var data = new FormData(form);
    var payload = Object.fromEntries(data.entries());
    payload.kind = "partnership";
    payload.submission_key = requestKey;
    payload.data_consent = data.has("data_consent");
    try {
      var response = await fetch("/api/submissions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      var result = await response.json();
      if (!response.ok) {
        var errors = {
          too_many_attempts: "Terlalu banyak percobaan. Tunggu satu menit lalu coba lagi.",
          check_required_fields: "Periksa kembali isian yang wajib diisi.",
          submission_service_not_configured: "Layanan belum dikonfigurasi. Pesan belum disimpan.",
          submission_not_saved: "Pesan belum tersimpan. Periksa koneksi dan coba lagi."
        };
        throw new Error(errors[result.error] || "Pesan belum tersimpan. Periksa koneksi dan coba lagi.");
      }
      feedback.textContent = "Minat kerja sama tersimpan. Nomor referensi: " + result.reference + ". Tim akan meninjau pesan ini.";
      feedback.dataset.state = "success";
      form.reset();
      button.textContent = "Terkirim";
    } catch (error) {
      feedback.textContent = error.message || "Pesan belum tersimpan. Periksa koneksi dan coba lagi.";
      feedback.dataset.state = "error";
      button.disabled = false;
    }
  });
})();