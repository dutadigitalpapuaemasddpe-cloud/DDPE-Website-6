/* DDPE v8 — interaksi ringan. Semua fitur bersifat peningkatan: tanpa skrip ini halaman tetap terbaca penuh. */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var doc = document;

  function $(sel, root) { return (root || doc).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }

  /* --- Indikator gulir, bayangan header, tombol ke atas --- */
  function initChrome() {
    var bar = doc.createElement("div");
    bar.className = "v8-progress";
    bar.setAttribute("aria-hidden", "true");
    doc.body.appendChild(bar);

    var top = doc.createElement("button");
    top.type = "button";
    top.className = "v8-top";
    top.setAttribute("aria-label", "Kembali ke atas");
    top.innerHTML = '<svg aria-hidden="true" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2.6" viewBox="0 0 24 24"><path d="m18 15-6-6-6 6"/></svg>';
    top.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }); });
    doc.body.appendChild(top);

    var header = $(".site-header");
    var ticking = false;
    function update() {
      ticking = false;
      var y = window.pageYOffset || doc.documentElement.scrollTop || 0;
      var max = Math.max(1, doc.documentElement.scrollHeight - window.innerHeight);
      bar.style.transform = "scaleX(" + Math.min(1, y / max).toFixed(4) + ")";
      top.classList.toggle("is-visible", y > 700);
      if (header) header.classList.toggle("is-scrolled", y > 8);
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  /* --- Muncul saat digulir (hanya blok baru v8) --- */
  function initReveal() {
    var targets = $$(".v8-steps li, .v8-path, .v8-roles li, .v8-faq details, .v8-shot, .v8-next, .v8-compare, .v8-safe");
    if (reduce || !("IntersectionObserver" in window) || !targets.length) return;
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -30px 0px" });
    targets.forEach(function (el, i) {
      el.classList.add("v8-reveal");
      el.style.transitionDelay = Math.min(i % 4, 3) * 50 + "ms";
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) el.classList.add("is-in"); else io.observe(el);
    });
    // Pengaman: tidak ada konten yang tersembunyi bila pengamat berhenti bekerja.
    window.setTimeout(function () { targets.forEach(function (el) { el.classList.add("is-in"); }); io.disconnect(); }, 6000);
  }

  /* --- Pencari peran (tab) --- */
  function initFinder() {
    $$("[data-finder]").forEach(function (box) {
      var tabs = $$('[role="tab"]', box);
      var panels = $$('[role="tabpanel"]', box);
      function select(tab, focus) {
        tabs.forEach(function (t) {
          var on = t === tab;
          t.setAttribute("aria-selected", on ? "true" : "false");
          t.tabIndex = on ? 0 : -1;
        });
        panels.forEach(function (p) { p.hidden = p.id !== tab.getAttribute("aria-controls"); });
        if (focus) tab.focus();
      }
      tabs.forEach(function (tab, idx) {
        tab.addEventListener("click", function () { select(tab, false); });
        tab.addEventListener("keydown", function (ev) {
          var next = null;
          if (ev.key === "ArrowDown" || ev.key === "ArrowRight") next = tabs[(idx + 1) % tabs.length];
          else if (ev.key === "ArrowUp" || ev.key === "ArrowLeft") next = tabs[(idx - 1 + tabs.length) % tabs.length];
          else if (ev.key === "Home") next = tabs[0];
          else if (ev.key === "End") next = tabs[tabs.length - 1];
          if (next) { ev.preventDefault(); select(next, true); }
        });
      });
    });
  }

  /* --- Galeri: tampilan besar --- */
  function initLightbox() {
    var shots = $$("a.v8-shot");
    if (!shots.length) return;
    var box = doc.createElement("div");
    box.className = "v8-light";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-label", "Foto diperbesar");
    box.innerHTML = '<button type="button" aria-label="Tutup">×</button><div><img alt=""/><p></p></div>';
    doc.body.appendChild(box);
    var img = $("img", box), cap = $("p", box), close = $("button", box), last = null;
    function open(a) {
      last = a;
      img.src = a.getAttribute("href");
      img.alt = a.getAttribute("data-caption") || "";
      cap.textContent = a.getAttribute("data-caption") || "";
      box.classList.add("is-open");
      doc.body.style.overflow = "hidden";
      close.focus();
    }
    function shut() {
      box.classList.remove("is-open");
      doc.body.style.overflow = "";
      img.removeAttribute("src");
      if (last) last.focus();
    }
    shots.forEach(function (a) {
      a.addEventListener("click", function (ev) {
        if (ev.metaKey || ev.ctrlKey || ev.shiftKey) return;
        ev.preventDefault();
        open(a);
      });
    });
    close.addEventListener("click", shut);
    box.addEventListener("click", function (ev) { if (ev.target === box) shut(); });
    doc.addEventListener("keydown", function (ev) { if (ev.key === "Escape" && box.classList.contains("is-open")) shut(); });
  }

  /* --- Agenda terdekat + hitung mundur (data dari CMS publik) --- */
  function initNextEvent() {
    var host = $("[data-next-event]");
    if (!host || !window.fetch) return;
    var fmt = new Intl.DateTimeFormat("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jayapura" });
    var tfmt = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jayapura" });
    fetch("/api/public-site-content", { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("x");
      return r.json();
    }).then(function (data) {
      var now = Date.now();
      var list = (Array.isArray(data.events) ? data.events : []).map(function (e) {
        return { e: e, t: Date.parse(e.date) };
      }).filter(function (x) { return !isNaN(x.t) && x.t > now; }).sort(function (a, b) { return a.t - b.t; });
      if (!list.length) return;
      var next = list[0];
      $("[data-next-title]", host).textContent = String(next.e.title || "Agenda DDPE");
      var when = fmt.format(new Date(next.t)) + (String(next.e.date).indexOf("T00:00") > -1 ? "" : " · " + tfmt.format(new Date(next.t)) + " WIT");
      $("[data-next-meta]", host).textContent = when + (next.e.location ? " · " + next.e.location : "");
      host.hidden = false;
      var u = { d: $('[data-u="d"]', host), h: $('[data-u="h"]', host), m: $('[data-u="m"]', host), s: $('[data-u="s"]', host) };
      function tick() {
        var diff = Math.max(0, next.t - Date.now());
        var s = Math.floor(diff / 1000);
        u.d.textContent = String(Math.floor(s / 86400));
        u.h.textContent = String(Math.floor((s % 86400) / 3600));
        u.m.textContent = String(Math.floor((s % 3600) / 60));
        u.s.textContent = String(s % 60);
        if (diff === 0) host.hidden = true;
      }
      tick();
      window.setInterval(tick, 1000);
    }).catch(function () { /* agenda belum tersedia: blok tetap tersembunyi */ });
  }

  function init() {
    initChrome();
    initReveal();
    initFinder();
    initLightbox();
    initNextEvent();
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", init); else init();
})();

/* DDPE v9 — slideshow hero, angka hidup, gerak saat digulir, penanda logo. */
(function () {
  "use strict";
  var doc = document;
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function $$(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }

  function initSlides() {
    $$("[data-v9-slides]").forEach(function (fig) {
      var imgs = $$("img", fig), cap = fig.querySelector("[data-v9-caption]"), dots = fig.querySelector(".v9-dots");
      if (imgs.length < 2) return;
      var i = 0, timer = null;
      var buttons = imgs.map(function (img, n) {
        var b = doc.createElement("button");
        b.type = "button";
        b.setAttribute("aria-label", "Foto " + (n + 1) + ": " + (img.getAttribute("data-caption") || ""));
        b.setAttribute("aria-pressed", n === 0 ? "true" : "false");
        b.addEventListener("click", function () { show(n); restart(); });
        if (dots) dots.appendChild(b);
        return b;
      });
      function show(n) {
        imgs[i].classList.remove("is-active");
        buttons[i].setAttribute("aria-pressed", "false");
        i = n;
        var img = imgs[i];
        if (img.loading === "lazy") img.loading = "eager";
        img.classList.add("is-active");
        buttons[i].setAttribute("aria-pressed", "true");
        if (cap) cap.textContent = img.getAttribute("data-caption") || "";
      }
      function restart() {
        if (timer) window.clearInterval(timer);
        if (!reduce) timer = window.setInterval(function () { if (!doc.hidden) show((i + 1) % imgs.length); }, 6500);
      }
      // Muat foto berikutnya setelah halaman siap agar pergantian tidak berkedip.
      window.addEventListener("load", function () { imgs.slice(1).forEach(function (img) { img.loading = "eager"; }); });
      restart();
    });
  }

  function countUp(el, to) {
    if (reduce) { el.textContent = String(to); return; }
    var start = null, dur = 900;
    function step(ts) {
      if (!start) start = ts;
      var p = Math.min(1, (ts - start) / dur);
      el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
      if (p < 1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }

  function initNumbers() {
    var nums = $$("[data-v9-count]");
    var live = doc.querySelector('[data-v9-live="articles"]');
    if (live) {
      fetch("/api/public-articles?limit=1", { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
        var n = data ? (Number(data.total) || (Array.isArray(data.articles) ? data.articles.length : 0)) : 0;
        if (n > 0) { live.setAttribute("data-v9-count", String(n)); live.textContent = "0"; observe([live]); }
        else live.closest("li").hidden = true;
      }).catch(function () { live.closest("li").hidden = true; });
    }
    observe(nums);
    function observe(list) {
      if (!("IntersectionObserver" in window)) { list.forEach(function (el) { el.textContent = el.getAttribute("data-v9-count"); }); return; }
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) {
          if (!en.isIntersecting) return;
          io.unobserve(en.target);
          countUp(en.target, Number(en.target.getAttribute("data-v9-count")) || 0);
        });
      }, { threshold: 0.4 });
      list.forEach(function (el) { io.observe(el); });
    }
  }

  function initRise() {
    var sel = ".v9-impact-list li, .v9-story, .portal-quick > a, .kami-induk-card, .kami-bagan, .v9-meaning, .v9-color, .portal-section-heading, .site-card, .portal-card, .rd-card, .cms-card";
    var targets = $$(sel).filter(function (el) { return !el.closest("[hidden]") && !el.classList.contains("v8-reveal"); });
    if (reduce || !("IntersectionObserver" in window) || !targets.length) {
      targets.forEach(function (el) { if (el.classList.contains("v9-story")) el.classList.add("is-in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { threshold: 0.06, rootMargin: "0px 0px -40px 0px" });
    targets.forEach(function (el, n) {
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight && r.bottom > 0) { el.classList.add("is-in"); return; }
      if (!el.classList.contains("v9-story")) { el.classList.add("v9-rise"); el.style.transitionDelay = (n % 4) * 60 + "ms"; }
      io.observe(el);
    });
    window.setTimeout(function () { targets.forEach(function (el) { el.classList.add("is-in"); }); io.disconnect(); }, 7000);
  }

  function initLogoPins() {
    var pins = $$(".v9-pin");
    pins.forEach(function (pin) {
      pin.addEventListener("click", function () {
        var id = pin.getAttribute("data-target");
        pins.forEach(function (p) { p.setAttribute("aria-pressed", p === pin ? "true" : "false"); });
        $$(".v9-meaning").forEach(function (m) { m.classList.toggle("is-focus", m.id === id); });
        var target = doc.getElementById(id);
        if (target) target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
      });
    });
  }

  function boot() { initSlides(); initNumbers(); initRise(); initLogoPins(); }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot); else boot();
})();
