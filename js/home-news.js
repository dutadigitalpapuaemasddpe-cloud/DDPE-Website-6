(function () {
  "use strict";

  var container = document.getElementById("home-news");
  var state = document.getElementById("home-news-state");
  var lastLoaded = 0;

  if (!container || !state) return;

  // Opt-in card layout; older home templates keep their two-story layout.
  var cardLayout = container.dataset.newsLayout === "cards";
  var requestedLimit = Number(container.dataset.newsLimit);
  var articleLimit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 6) : 2;

  function text(value) {
    return typeof value === "string" ? value : "";
  }

  function safeImage(value) {
    var image = text(value).trim();
    if (/^(assets\/|https:\/\/)/i.test(image) || /^\/api\/article-image\?id=[a-zA-Z0-9_-]{1,128}$/.test(image) || /^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]{1,5000000}$/i.test(image)) return image;
    return "";
  }

  function field(row, primary, secondary) {
    return text(row[primary] || row[secondary]);
  }

  function makeArticle(row, featured) {
    var link = document.createElement("a");
    var copy = document.createElement("div");
    var label = document.createElement("span");
    var heading = document.createElement("h3");
    var excerpt = document.createElement("p");
    var date = document.createElement("time");
    var title = text(row.title);
    var publishedAt = field(row, "published_at", "publishedAt");
    var imageUrl = safeImage(field(row, "cover_image", "coverImage"));

    link.className = featured ? "site-news-feature" : "site-news-side";
    link.href = "artikel.html?id=" + encodeURIComponent(text(row.slug || row.id));
    label.className = "site-news-label";
    label.textContent = field(row, "category_label", "categoryLabel") || "Berita";
    heading.textContent = title;
    excerpt.textContent = text(row.excerpt);
    date.className = "site-news-date";
    var publishedDate = publishedAt ? new Date(publishedAt) : null;
    var validDate = publishedDate && !Number.isNaN(publishedDate.getTime());
    if (validDate) date.dateTime = publishedAt;
    date.textContent = validDate ? publishedDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jayapura" }) : "";

    if ((featured || cardLayout) && imageUrl) {
      var image = document.createElement("img");
      image.src = imageUrl;
      image.alt = "";
      image.loading = "lazy";
      image.width = 640;
      image.height = cardLayout ? 360 : 426;
      if (cardLayout) image.addEventListener("error", function () {
        image.replaceWith(makePlaceholder());
      }, { once: true });
      link.appendChild(image);
    } else if (cardLayout) {
      link.appendChild(makePlaceholder());
    }

    copy.className = featured ? "site-news-feature-copy" : "";
    if (cardLayout) copy.append(label, date, heading, excerpt);
    else copy.append(label, heading, excerpt, date);
    link.appendChild(copy);
    return link;
  }

  function makePlaceholder() {
    var placeholder = document.createElement("div");
    placeholder.className = "site-news-placeholder";
    placeholder.setAttribute("aria-hidden", "true");
    placeholder.textContent = "DDPE";
    return placeholder;
  }

  async function loadPublished() {
    state.textContent = "Memuat berita terbit…";
    try {
      var response = await fetch("/api/public-articles", { cache: "no-store" });
      if (!response.ok) throw new Error("HTTP " + response.status);
      var payload = await response.json();
      var rows = payload.articles;
      if (!Array.isArray(rows) || rows.length === 0) {
        container.hidden = true;
        state.hidden = false;
        state.textContent = "Belum ada berita terbit.";
        lastLoaded = Date.now();
        return;
      }

      container.replaceChildren();
      rows.filter(function (row) { return row && text(row.id) && text(row.title); }).slice(0, articleLimit).forEach(function (row, index) {
        container.appendChild(makeArticle(row, index === 0));
      });
      container.hidden = container.childElementCount === 0;
      state.hidden = container.childElementCount > 0;
      state.textContent = "Berita terbit belum dapat ditampilkan.";
      lastLoaded = Date.now();
    } catch (error) {
      container.hidden = true;
      state.hidden = false;
      state.textContent = "Berita belum dapat dimuat. Periksa koneksi dan coba lagi.";
      lastLoaded = Date.now();
    }
  }

  loadPublished();
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible" && Date.now() - lastLoaded > 30000) loadPublished();
  });
})();
