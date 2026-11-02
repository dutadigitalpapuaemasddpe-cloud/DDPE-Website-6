(function () {
  "use strict";

  var sections = Array.from(document.querySelectorAll("[data-opportunity]"));
  var labels = { dldpe: "Duta Literasi Digital", didpe: "Duta Inovasi Digital", volunteer: "Relawan" };

  function status(section, message) {
    var target = section.querySelector("[data-opportunity-result]");
    if (target) target.textContent = message;
  }

  function addLink(section, recruitment) {
    var link = document.createElement("a");
    link.className = "site-button site-button-primary site-open-recruitment";
    link.href = "daftar.html?recruitment_id=" + encodeURIComponent(recruitment.id);
    link.textContent = recruitment.title + " · Daftar";
    section.querySelector("[data-opportunity-links]").appendChild(link);
  }

  async function load() {
    sections.forEach(function (section) {
      section.querySelector("[data-opportunity-links]").replaceChildren();
    });
    try {
      var response = await fetch("/api/public-recruitments", { cache: "no-store" });
      if (!response.ok) throw new Error("recruitments_unavailable");
      var payload = await response.json();
      var rows = payload.recruitments;
      if (!Array.isArray(rows)) throw new Error("invalid_recruitments_response");

      sections.forEach(function (section) {
        var path = section.getAttribute("data-opportunity");
        var matching = rows.filter(function (row) {
          if (path === "volunteer") return row.kind === "volunteer";
          if (row.kind !== "ambassador") return false;
          var pillar = String(row.pillar_id || "").toLowerCase();
          return path === "dldpe" ? pillar === "dldpe" : pillar === "didpe";
        });
        var now = Date.now();
        matching = matching.filter(function (row) {
          return (!row.opens_at || Date.parse(row.opens_at) <= now) && (!row.closes_at || Date.parse(row.closes_at) > now);
        });
        if (!matching.length) {
          status(section, labels[path] + " saat ini tidak sedang dibuka.");
          return;
        }
        status(section, "Pendaftaran terbuka. Pilih angkatan yang ingin diikuti:");
        matching.forEach(function (row) { addLink(section, row); });
      });
    } catch (_error) {
      sections.forEach(function (section) { status(section, "Status belum dapat diverifikasi karena layanan sedang tidak tersedia."); });
    }
  }

  load();
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") load();
  });
})();