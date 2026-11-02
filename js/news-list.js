(function () {
  "use strict";

  var pageSize = 9;
  var featured = document.getElementById("news-featured");
  var pills = document.querySelectorAll("[data-news-category]");
  var page = 0;
  var search = document.getElementById("news-search");
  var category = document.getElementById("news-category");
  var list = document.getElementById("news-list");
  var state = document.getElementById("news-state");
  var pagination = document.getElementById("news-pagination");
  var cache = [];
  var request = 0;
  search.value = new URLSearchParams(window.location.search).get("q") || "";
  var requestedCategory = new URLSearchParams(window.location.search).get("category");

  if (requestedCategory && Array.prototype.some.call(category.options, function (option) { return option.value === requestedCategory; })) {
    category.value = requestedCategory;
  }

  function safeImage(value) {
    var url = typeof value === "string" ? value.trim() : "";
    return /^assets\/[a-zA-Z0-9_./-]+$/.test(url) || /^https:\/\//i.test(url) || /^\/api\/article-image\?id=[a-zA-Z0-9_-]{1,128}$/.test(url) || /^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]{1,5000000}$/.test(url) ? url : "assets/tim-ddpe-banner.jpg";
  }

  function makeItem(article, headline) {
    var link = document.createElement("a");
    var image = document.createElement("img");
    var copy = document.createElement("div");
    var label = document.createElement("span");
    var heading = document.createElement("h2");
    var excerpt = document.createElement("p");
    var byline = document.createElement("time");
    link.className = headline ? "site-news-row news-headline-card" : "site-news-row";
    link.href = "artikel.html?id=" + encodeURIComponent(article.slug || article.id);
    image.src = safeImage(article.cover_image);
    image.alt = article.cover_alt || "";
    image.width = 800;
    image.height = 500;
    image.loading = headline ? "eager" : "lazy";
    image.addEventListener("error", function () { image.removeAttribute("src"); image.classList.add("news-image-missing"); image.alt = "Illustrasi berita tidak tersedia"; }, { once: true });
    label.className = "site-news-label";
    label.textContent = article.category_label || "Berita";
    heading.textContent = article.title;
    excerpt.textContent = article.excerpt || "";
    byline.dateTime = article.published_at || "";
    byline.textContent = article.published_at ? new Date(article.published_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jayapura" }) + " · WIT" : "";
    copy.className = "site-news-row-copy";
    copy.append(label, byline, heading, excerpt);
    if (headline) { var action = document.createElement("span"); action.className = "headline-action"; action.textContent = "Baca selengkapnya →"; copy.appendChild(action); }
    link.append(image, copy);
    return link;
  }

  function render() {
    var term = search.value.trim().toLocaleLowerCase("id-ID");
    var selected = category.value;
    pills.forEach(function (button) { button.setAttribute("aria-pressed", String(button.dataset.newsCategory === selected)); });
    if (featured) {
      featured.replaceChildren();
      featured.hidden = !cache.length;
      if (cache.length) featured.appendChild(makeItem(cache[0], true));
    }
    var filtered = cache.filter(function (article) {
      var matchesCategory = selected === "semua" || article.category === selected;
      var matchesSearch = !term || (article.title + " " + article.excerpt + " " + (article.tags || []).join(" ")).toLocaleLowerCase("id-ID").includes(term);
      return matchesCategory && matchesSearch && (term || selected !== "semua" || !featured || article !== cache[0]);
    });
    var pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
    page = Math.min(page, pageCount - 1);
    list.replaceChildren();
    filtered.slice(page * pageSize, (page + 1) * pageSize).forEach(function (article) { list.appendChild(makeItem(article)); });
    state.hidden = true;
    pagination.hidden = filtered.length <= pageSize;
    document.getElementById("news-page-label").textContent = "Halaman " + (page + 1) + " dari " + pageCount;
    document.getElementById("news-previous").disabled = page === 0;
    document.getElementById("news-next").disabled = page >= pageCount - 1;
    if (!filtered.length) {
      state.hidden = false;
      state.textContent = cache.length === 1 && !term && selected === "semua" && featured ? "Berita terbaru ditampilkan di atas." : cache.length ? "Tidak ada berita yang cocok dengan filter ini." : "Belum ada berita terbit.";
    }
  }

  async function load() {
    var currentRequest = ++request;
    state.hidden = false;
    state.textContent = "Memuat berita terbit…";
    try {
      var response = await fetch("/api/public-articles?limit=50", { cache: "no-store" });
      if (!response.ok) throw new Error("news_unavailable");
      var payload = await response.json();
      var nextPage=1;
      while(payload.total && payload.articles.length < payload.total){
        var more=await fetch('/api/public-articles?limit=50&page='+nextPage++,{cache:'no-store'});
        if(!more.ok)throw new Error('news_unavailable');
        var batch=await more.json();if(!batch.articles || !batch.articles.length)break;
        payload.articles.push.apply(payload.articles,batch.articles);
      }
      if (currentRequest !== request) return;
      cache = Array.isArray(payload.articles) ? payload.articles.filter(function (row) { return row && row.id && row.title; }).sort(function (a,b) { return (Date.parse(b.published_at) || 0) - (Date.parse(a.published_at) || 0); }) : [];
      page = 0;
      render();
    } catch (_error) {
      if (currentRequest !== request) return;
      cache = [];
      if (featured) { featured.replaceChildren(); featured.hidden = true; }
      state.hidden = false;
      state.textContent = "Berita tidak dapat dimuat. Data lokal tidak digunakan sebagai pengganti konten server.";
      list.replaceChildren();
      pagination.hidden = true;
    }
  }

  function updateCategoryUrl() {
    var url = new URL(window.location.href);
    if (category.value === "semua") url.searchParams.delete("category");
    else url.searchParams.set("category", category.value);
    window.history.replaceState({}, "", url.toString());
  }

  search.addEventListener("input", function () { page = 0; render(); });
  pills.forEach(function (button) { button.addEventListener("click", function () { category.value = button.dataset.newsCategory; page = 0; updateCategoryUrl(); render(); }); });
  category.addEventListener("change", function () { page = 0; updateCategoryUrl(); render(); });
  document.getElementById("news-previous").addEventListener("click", function () { page -= 1; render(); });
  document.getElementById("news-next").addEventListener("click", function () { page += 1; render(); });
  document.addEventListener("visibilitychange", function () {
    if (document.visibilityState === "visible") load();
  });
  load();
})();
