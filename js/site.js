(function () {
  "use strict";

  var translations = {
    id: {
      "nav.about": "Tentang DDPE",
      "nav.program": "Pilar & Program",
      "nav.partners": "Mitra DDPE",
      "nav.activities": "Kegiatan",
      "nav.news": "Berita",
      "nav.contact": "Kontak",
      "nav.consultation": "Konsultasi",
      "nav.search": "Cari berita dan informasi DDPE",
      "nav.location": "Mimika, Papua Tengah · Ruang belajar dan kolaborasi pemuda",
      "nav.join": "Terlibat",
      "nav.joinDdpe": "Gabung DDPE",
      "nav.app": "Masuk Aplikasi",
      "nav.appShort": "Masuk",
      "nav.label": "Navigasi utama",
      "mega.aboutMain": "Kenali DDPE",
      "mega.aboutOrganization": "Organisasi",
      "mega.aboutProfile": "Profil DDPE",
      "mega.aboutVision": "Visi dan Misi",
      "mega.aboutPillars": "Dua Pilar DDPE",
      "mega.aboutLeadership": "Kepengurusan",
      "mega.aboutCore": "Pengurus Induk",
      "mega.aboutDldpe": "Pengurus DLDPE",
      "mega.aboutDidpe": "Pengurus DIDPE",
      "mega.aboutCollaboration": "Kolaborasi",
      "mega.aboutPartners": "Mitra DDPE",
      "mega.aboutCooperation": "Kerja Sama",
      "mega.programMain": "Semua Pilar dan Program",
      "mega.programPillars": "Pilar DDPE",
      "mega.programDldpe": "DLDPE — Duta Literasi Digital Papua Emas",
      "mega.programDidpe": "DIDPE — Duta Inovasi Digital Papua Emas",
      "mega.programGroup": "Program",
      "mega.programAmex": "AMEX — Asa Mimika Expedition",
      "mega.programVolunteer": "DDPE Volunteer",
      "mega.programAll": "Semua Program",
      "mega.activitiesMain": "Semua Kegiatan",
      "mega.activitiesExplore": "Jelajahi",
      "mega.activitiesUpcoming": "Agenda Mendatang",
      "mega.activitiesPast": "Kegiatan Terlaksana",
      "mega.activitiesRelated": "Informasi Terkait",
      "mega.programDldpeShort": "Program DLDPE",
      "mega.programDidpeShort": "Program DIDPE",
      "mega.programAmexShort": "Informasi AMEX",
      "mega.newsMain": "Semua Berita",
      "mega.newsInformation": "Informasi DDPE",
      "mega.newsLatest": "Berita Terbaru",
      "mega.newsPress": "Siaran Pers",
      "mega.newsTopics": "Topik Tersedia",
      "mega.newsDigital": "Digital Papua",
      "mega.newsPublication": "Publikasi",
      "mega.joinMain": "Peluang Keterlibatan",
      "mega.joinAmbassador": "Menjadi Duta",
      "mega.joinDldpe": "Pendaftaran DLDPE",
      "mega.joinDidpe": "Pendaftaran DIDPE",
      "mega.joinVolunteer": "Menjadi Relawan",
      "mega.joinVolunteerLink": "DDPE Volunteer",
      "mega.joinOpenings": "Angkatan/Pendaftaran Relawan yang Tersedia",
      "mega.joinCollaborate": "Berkolaborasi",
      "mega.joinPartnership": "Ajukan Kemitraan",
      "home.partnerTitle": "Mitra DDPE",
      "home.partnerIntro": "Partner resmi DDPE yang mendukung ekosistem dan kolaborasi komunitas.",
      "home.partnerLink": "Lihat Semua Mitra",
      "partners.pageTitle": "Mitra resmi DDPE",
      "partners.pageIntro": "Mitra resmi DDPE adalah organisasi dan komunitas yang mendukung ekosistem pemuda, literasi, dan inovasi digital di Papua.",
      "partners.badge": "Mitra",
      "partners.featured": "Mitra unggulan",
      "partners.view": "Lihat profil",
      "menu.open": "Buka menu",
      "menu.close": "Tutup menu",
      "lang.label": "Bahasa",
      "lang.active": "Bahasa aktif",
      "lang.id": "ID",
      "lang.en": "EN"
    },
    en: {
      "nav.about": "About DDPE",
      "nav.program": "Pillars & Programs",
      "nav.partners": "Our Partners",
      "nav.activities": "Activities",
      "nav.news": "News",
      "nav.contact": "Contact",
      "nav.consultation": "Consultation",
      "nav.search": "Search DDPE news and information",
      "nav.location": "Mimika, Central Papua · Youth learning and collaboration",
      "nav.join": "Get Involved",
      "nav.joinDdpe": "Join DDPE",
      "nav.app": "Open the App",
      "nav.appShort": "Sign in",
      "nav.label": "Main navigation",
      "mega.aboutMain": "Meet DDPE",
      "mega.aboutOrganization": "Organization",
      "mega.aboutProfile": "DDPE Profile",
      "mega.aboutVision": "Vision and Mission",
      "mega.aboutPillars": "DDPE's Two Pillars",
      "mega.aboutLeadership": "Leadership",
      "mega.aboutCore": "Core Organization",
      "mega.aboutDldpe": "DLDPE Leadership",
      "mega.aboutDidpe": "DIDPE Leadership",
      "mega.aboutCollaboration": "Collaboration",
      "mega.aboutPartners": "DDPE Partners",
      "mega.aboutCooperation": "Partnerships",
      "mega.programMain": "All Pillars and Programs",
      "mega.programPillars": "DDPE Pillars",
      "mega.programDldpe": "DLDPE — Papua Emas Digital Literacy Ambassadors",
      "mega.programDidpe": "DIDPE — Papua Emas Digital Innovation Ambassadors",
      "mega.programGroup": "Programs",
      "mega.programAmex": "AMEX — Asa Mimika Expedition",
      "mega.programVolunteer": "DDPE Volunteer",
      "mega.programAll": "All Programs",
      "mega.activitiesMain": "All Activities",
      "mega.activitiesExplore": "Explore",
      "mega.activitiesUpcoming": "Upcoming Agenda",
      "mega.activitiesPast": "Completed Activities",
      "mega.activitiesRelated": "Related Information",
      "mega.programDldpeShort": "DLDPE Program",
      "mega.programDidpeShort": "DIDPE Program",
      "mega.programAmexShort": "AMEX Information",
      "mega.newsMain": "All News",
      "mega.newsInformation": "DDPE Information",
      "mega.newsLatest": "Latest News",
      "mega.newsPress": "Press Releases",
      "mega.newsTopics": "Available Topics",
      "mega.newsDigital": "Digital Papua",
      "mega.newsPublication": "Publications",
      "mega.joinMain": "Get Involved",
      "mega.joinAmbassador": "Become an Ambassador",
      "mega.joinDldpe": "DLDPE Registration",
      "mega.joinDidpe": "DIDPE Registration",
      "mega.joinVolunteer": "Become a Volunteer",
      "mega.joinVolunteerLink": "DDPE Volunteer",
      "mega.joinOpenings": "Available Volunteer Cohorts and Openings",
      "mega.joinCollaborate": "Collaborate",
      "mega.joinPartnership": "Propose a Partnership",
      "home.partnerTitle": "Our Partners",
      "home.partnerIntro": "Official DDPE partners supporting the wider civic and digital community ecosystem.",
      "home.partnerLink": "View All Partners",
      "partners.pageTitle": "Official DDPE partners",
      "partners.pageIntro": "The official partners of DDPE are organizations and communities supporting Papua's youth, digital literacy, and innovation ecosystem.",
      "partners.badge": "Partner",
      "partners.featured": "Featured partner",
      "partners.view": "View profile",
      "menu.open": "Open menu",
      "menu.close": "Close menu",
      "lang.label": "Language",
      "lang.active": "Active language",
      "lang.id": "ID",
      "lang.en": "EN"
    }
  };

  var partnerSeed = [
    {
      name: "Ruangnmp.id",
      label: "Ruangnmp.id",
      summaryId: "Komunitas ruang belajar dan kolaborasi yang mendorong ekosistem digital terarah di Papua.",
      summaryEn: "A learning and collaboration community that supports a more purposeful digital ecosystem in Papua.",
      featured: true,
      logo: "assets/logo.ruangnmp.jpg",
      initials: "RN"
    },
    {
      name: "Kwaran Kuala Kencana",
      label: "Kwaran Kuala Kencana",
      summaryId: "Jaringan komunitas yang memperkuat semangat kolaborasi dan penguatan kepemudaan di wilayah Kuala Kencana.",
      summaryEn: "A community network strengthening youth collaboration and civic engagement in the Kuala Kencana area.",
      featured: true,
      logo: "assets/logo_mitra_Kwaran_KualaKencana.png",
      initials: "KK"
    },
    {
      name: "SMKS PK YAPIS TIK TIMIKA",
      label: "SMKS PK YAPIS TIK TIMIKA",
      summaryId: "Satuan pendidikan mitra yang membuka ruang sinergi literasi, teknologi, dan pengembangan generasi muda.",
      summaryEn: "A partner school supporting opportunities for literacy, technology, and youth development through practical collaboration.",
      featured: true,
      logo: "assets/Logo_Mitra_Yapis.jpeg",
      initials: "YP"
    }
  ];

  function normaliseLang(value) {
    return value === "en" ? "en" : "id";
  }

  function readLangFromStorage() {
    try {
      var requested = new URLSearchParams(window.location.search).get("lang");
      if (requested === "id" || requested === "en") return requested;
      var saved = window.localStorage.getItem("ddpe-lang");
      if (saved) return normaliseLang(saved);
    } catch (error) {}
    return "id";
  }

  function ensureUrlLang(lang) {
    var url = new URL(window.location.href);
    url.searchParams.set("lang", lang);
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, "", url.toString());
    }
  }

  function applyLanguage(lang) {
    var safeLang = normaliseLang(lang);
    var root = document.documentElement;
    root.lang = safeLang === "en" ? "en" : "id";
    window.__ddpeLang = safeLang;
    try { window.localStorage.setItem("ddpe-lang", safeLang); } catch (error) {}
    ensureUrlLang(safeLang);

    document.querySelectorAll("[data-i18n]").forEach(function (element) {
      var key = element.getAttribute("data-i18n");
      if (!key || !translations[safeLang][key]) return;
      element.textContent = translations[safeLang][key];
    });

    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (element) {
      var key = element.getAttribute("data-i18n-placeholder");
      if (!key || !translations[safeLang][key]) return;
      element.setAttribute("placeholder", translations[safeLang][key]);
    });

    document.querySelectorAll("[data-i18n-aria]").forEach(function (element) {
      var key = element.getAttribute("data-i18n-aria");
      if (!key || !translations[safeLang][key]) return;
      element.setAttribute("aria-label", translations[safeLang][key]);
    });

    applyPartnerCopy(safeLang);
    document.querySelectorAll(".rd-language-note").forEach(function (note) { note.hidden = safeLang !== "en"; });

    var switcherButtons = document.querySelectorAll(".site-lang-switcher button");
    switcherButtons.forEach(function (button) {
      var isActive = button.dataset.lang === safeLang;
      button.setAttribute("aria-pressed", isActive ? "true" : "false");
      button.classList.toggle("is-active", isActive);
    });
  }

  function injectLanguageSwitcher() {
    var navWrap = document.querySelector(".site-nav-wrap");
    if (!navWrap || navWrap.querySelector(".site-lang-switcher")) return;

    var switcher = document.createElement("div");
    switcher.className = "site-lang-switcher";
    switcher.setAttribute("role", "group");
    switcher.setAttribute("data-i18n-aria", "lang.label");
    switcher.innerHTML = [
      '<button type="button" data-lang="id" aria-pressed="true">ID</button>',
      '<button type="button" data-lang="en" aria-pressed="false">EN</button>'
    ].join("");

    switcher.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-lang]");
      if (!button) return;
      applyLanguage(button.dataset.lang);
    });

    navWrap.appendChild(switcher);
  }

  function createHeaderIcon(name) {
    var namespace = "http://www.w3.org/2000/svg";
    var icon = document.createElementNS(namespace, "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("width", "18");
    icon.setAttribute("height", "18");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "1.8");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("aria-hidden", "true");

    var shapes = name === "search"
      ? [{ tag: "circle", attrs: { cx: "11", cy: "11", r: "7" } }, { tag: "path", attrs: { d: "m20 20-4-4" } }]
      : name === "contact"
        ? [{ tag: "rect", attrs: { x: "3", y: "5", width: "18", height: "14", rx: "2" } }, { tag: "path", attrs: { d: "m3 7 9 6 9-6" } }]
        : [{ tag: "path", attrs: { d: "M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" } }, { tag: "path", attrs: { d: "M8 11h8M8 15h5" } }];

    shapes.forEach(function (shape) {
      var element = document.createElementNS(namespace, shape.tag);
      Object.keys(shape.attrs).forEach(function (key) { element.setAttribute(key, shape.attrs[key]); });
      icon.appendChild(element);
    });
    return icon;
  }

  function createPageIcon(name) {
    var icons = {
      profile: [{ tag: "circle", attrs: { cx: "12", cy: "8", r: "3" } }, { tag: "path", attrs: { d: "M5 20v-1a7 7 0 0 1 14 0v1M4 4h16v16H4z" } }],
      structure: [{ tag: "circle", attrs: { cx: "12", cy: "5", r: "2" } }, { tag: "circle", attrs: { cx: "5", cy: "18", r: "2" } }, { tag: "circle", attrs: { cx: "19", cy: "18", r: "2" } }, { tag: "path", attrs: { d: "M12 7v5M5 16v-3h14v3" } }],
      program: [{ tag: "circle", attrs: { cx: "12", cy: "12", r: "9" } }, { tag: "path", attrs: { d: "m15.5 8.5-2 5-5 2 2-5 5-2zM12 3v2M21 12h-2" } }],
      activities: [{ tag: "rect", attrs: { x: "3", y: "5", width: "18", height: "16", rx: "2" } }, { tag: "path", attrs: { d: "M16 3v4M8 3v4M3 10h18M8 14h3M8 17h6" } }],
      news: [{ tag: "path", attrs: { d: "M5 4h15v16H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM7 8h9M7 12h9M7 16h5" } }],
      involvement: [{ tag: "circle", attrs: { cx: "9", cy: "8", r: "3" } }, { tag: "path", attrs: { d: "M3 20v-1a6 6 0 0 1 12 0v1M17 8h4M19 6v4M17 16h4" } }],
      partnership: [{ tag: "path", attrs: { d: "M8 12.5 6.5 14a3 3 0 0 1-4-4l4-4a3 3 0 0 1 4.5.5M16 11.5l1.5-1.5a3 3 0 0 1 4 4l-4 4a3 3 0 0 1-4.5-.5M8 16l8-8" } }],
      contact: [{ tag: "rect", attrs: { x: "3", y: "5", width: "18", height: "14", rx: "2" } }, { tag: "path", attrs: { d: "m3 7 9 6 9-6" } }],
      consultation: [{ tag: "path", attrs: { d: "M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5Z" } }, { tag: "path", attrs: { d: "M8 11h8M8 15h5" } }],
      privacy: [{ tag: "path", attrs: { d: "M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z" } }, { tag: "path", attrs: { d: "m9 12 2 2 4-4" } }],
      registration: [{ tag: "path", attrs: { d: "M7 3h10v4h3v14H4V7h3zM8 12h8M8 16h8" } }, { tag: "path", attrs: { d: "M9 3v4M15 3v4" } }],
      partners: [{ tag: "circle", attrs: { cx: "8", cy: "8", r: "3" } }, { tag: "circle", attrs: { cx: "17", cy: "9", r: "2.5" } }, { tag: "path", attrs: { d: "M2.5 20v-1a5.5 5.5 0 0 1 11 0v1M14 15a4.5 4.5 0 0 1 7.5 3.3v1.2" } }]
    };
    var namespace = "http://www.w3.org/2000/svg";
    var icon = document.createElementNS(namespace, "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "1.5");
    icon.setAttribute("stroke-linecap", "round");
    icon.setAttribute("stroke-linejoin", "round");
    icon.setAttribute("aria-hidden", "true");
    (icons[name] || icons.program).forEach(function (shape) {
      var element = document.createElementNS(namespace, shape.tag);
      Object.keys(shape.attrs).forEach(function (key) { element.setAttribute(key, shape.attrs[key]); });
      icon.appendChild(element);
    });
    return icon;
  }

  function addPageIcon() {
    var heading = document.querySelector(".site-page-heading, .site-news-heading, .site-article-heading, .site-not-found");
    if (!heading || heading.querySelector(".site-page-visual")) return;
    var pageKey = window.location.pathname.split("/").pop() || "index.html";
    var pageIcons = {
      "tentang.html": "profile", "struktur.html": "structure", "program.html": "program",
      "kegiatan.html": "activities", "berita.html": "news", "artikel.html": "news",
      "daftar.html": "registration", "terlibat.html": "involvement", "kemitraan.html": "partnership",
      "kontak.html": "contact", "konsultasi.html": "consultation", "mitra.html": "partners",
      "privasi.html": "privacy"
    };
    var visual = document.createElement("span");
    visual.className = "site-page-visual";
    visual.setAttribute("aria-hidden", "true");
    visual.appendChild(createPageIcon(pageIcons[pageKey] || "program"));
    heading.appendChild(visual);
  }

  function addHeaderIcon(link, name) {
    if (link.dataset.iconReady === "true") return;
    var label = document.createElement("span");
    var key = link.dataset.i18n;
    if (key) label.dataset.i18n = key;
    label.textContent = link.textContent.trim();
    link.removeAttribute("data-i18n");
    link.replaceChildren(createHeaderIcon(name), label);
    link.dataset.iconReady = "true";
  }

  function initMegaNavigation() {
    var header = document.querySelector(".site-header");
    var navigation = document.getElementById("site-nav");
    var menuToggle = document.querySelector(".site-menu-toggle");
    if (!header || !navigation || navigation.dataset.enhanced === "true") return;
    navigation.dataset.enhanced = "true";

    var triggers = Array.prototype.slice.call(navigation.querySelectorAll("[data-site-menu-trigger]"));
    var panels = Array.prototype.slice.call(navigation.querySelectorAll("[data-site-menu-panel]"));
    var activePages = {
      about: ["visi-misi.html", "pengurus-induk.html", "pengurus-dldpe.html", "pengurus-didpe.html", "tentang.html", "struktur.html", "mitra.html", "kemitraan.html", "kontak.html", "privasi.html"],
      program: ["program.html", "program-dldpe.html", "program-didpe.html", "program-amex.html", "program-volunteer.html"],
      activities: ["kegiatan.html", "agenda.html", "kegiatan-terlaksana.html"],
      news: ["berita.html", "artikel.html"],
      join: ["terlibat.html", "daftar.html", "pendaftaran-dldpe.html", "pendaftaran-didpe.html", "pendaftaran-volunteer.html"]
    };
    var currentPath = window.location.pathname.split("/").pop() || "index.html";
    var contactLink = navigation.querySelector('.site-nav-utility[href="kontak.html"]');
    if (contactLink && !navigation.querySelector("[data-site-consultation-link]")) {
      var consultationLink = document.createElement("a");
      consultationLink.className = "site-nav-utility";
      consultationLink.href = "konsultasi.html";
      consultationLink.dataset.i18n = "nav.consultation";
      consultationLink.dataset.siteConsultationLink = "true";
      consultationLink.textContent = "Konsultasi";
      contactLink.insertAdjacentElement("beforebegin", consultationLink);
    }

    var navWrap = header.querySelector(".site-nav-wrap");
    var quickLinks = navWrap.querySelector(".site-quick-links");
    if (!quickLinks) {
      quickLinks = document.createElement("div");
      quickLinks.className = "site-quick-links";
      quickLinks.setAttribute("aria-label", "Tautan cepat");
      navWrap.appendChild(quickLinks);
    }

    var languageSwitcher = navWrap.querySelector(".site-lang-switcher");
    if (languageSwitcher) quickLinks.appendChild(languageSwitcher);

    var utilityLinks = Array.prototype.slice.call(navigation.querySelectorAll(".site-nav-utility"));
    utilityLinks.forEach(function (link) { addHeaderIcon(link, link.href.indexOf("kontak.html") >= 0 ? "contact" : "consultation"); });

    var utilityBar = header.querySelector(".site-utility-bar");
    if (!utilityBar) {
      utilityBar = document.createElement("div");
      utilityBar.className = "site-utility-bar";
      var utilityInner = document.createElement("div");
      utilityInner.className = "site-container site-utility-inner";
      var location = document.createElement("span");
      location.dataset.i18n = "nav.location";
      location.textContent = translations.id["nav.location"];
      var searchLink = document.createElement("a");
      searchLink.className = "site-search-link";
      searchLink.href = "berita.html#news-search";
      searchLink.dataset.i18nAria = "nav.search";
      searchLink.setAttribute("aria-label", translations.id["nav.search"]);
      searchLink.appendChild(createHeaderIcon("search"));
      utilityInner.append(location, searchLink);
      utilityBar.appendChild(utilityInner);
      header.insertBefore(utilityBar, navWrap);
    }

    function syncUtilityLinks() {
      var isMobile = window.matchMedia("(max-width: 1080px)").matches;
      utilityLinks.forEach(function (link) {
        if (isMobile) navigation.appendChild(link);
        else quickLinks.insertBefore(link, languageSwitcher || null);
      });
    }
    syncUtilityLinks();

    triggers.forEach(function (trigger) {
      var group = trigger.dataset.siteMenuTrigger;
      trigger.classList.toggle("is-current", (activePages[group] || []).includes(currentPath));
    });

    header.querySelectorAll(".site-nav a[href], .site-quick-links a[href]").forEach(function (link) {
      var linkPath = new URL(link.href, window.location.href).pathname.split("/").pop() || "index.html";
      if (linkPath === currentPath) link.setAttribute("aria-current", "page");
    });

    function closePanels() {
      triggers.forEach(function (trigger) {
        trigger.setAttribute("aria-expanded", "false");
        trigger.classList.remove("is-open");
      });
      panels.forEach(function (panel) { panel.hidden = true; });
    }

    function closeNavigation() {
      closePanels();
      navigation.classList.remove("is-open");
      if (menuToggle) {
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", translations[window.__ddpeLang || readLangFromStorage()]["menu.open"]);
      }
    }

    triggers.forEach(function (trigger) {
      trigger.addEventListener("click", function () {
        var panelId = trigger.getAttribute("aria-controls");
        var panel = document.getElementById(panelId);
        var wasOpen = trigger.getAttribute("aria-expanded") === "true";
        closePanels();
        if (!wasOpen && panel) {
          panel.hidden = false;
          trigger.setAttribute("aria-expanded", "true");
          trigger.classList.add("is-open");
        }
      });
    });

    if (menuToggle) {
      menuToggle.addEventListener("click", function () {
        var open = menuToggle.getAttribute("aria-expanded") !== "true";
        if (open) {
          navigation.classList.add("is-open");
          menuToggle.setAttribute("aria-expanded", "true");
          menuToggle.setAttribute("aria-label", translations[window.__ddpeLang || readLangFromStorage()]["menu.close"]);
        } else {
          closeNavigation();
        }
      });
    }

    navigation.addEventListener("click", function (event) {
      if (event.target.closest("a")) closeNavigation();
    });

    header.addEventListener("focusout", function (event) {
      if (!header.contains(event.relatedTarget)) closeNavigation();
    });

    document.addEventListener("pointerdown", function (event) {
      if (!header.contains(event.target)) closeNavigation();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      var openTrigger = triggers.find(function (trigger) { return trigger.getAttribute("aria-expanded") === "true"; });
      var drawerOpen = Boolean(menuToggle && menuToggle.getAttribute("aria-expanded") === "true");
      if (!openTrigger && !drawerOpen) return;
      closeNavigation();
      if (drawerOpen && menuToggle) menuToggle.focus();
      else if (openTrigger) openTrigger.focus();
    });

    window.addEventListener("resize", function () {
      syncUtilityLinks();
      if (window.innerWidth > 1080) closeNavigation();
    });
  }

  // Daftar mitra: sumber utama /api/public-site-content (mitra Terbit dari dashboard).
  // partnerSeed hanya cadangan bila API gagal atau belum ada data CMS sama sekali.
  var partnerItems = partnerSeed.map(function (p) {
    return { name: p.name, category: "Mitra", summary: p.summaryId, summary_en: p.summaryEn, logo: p.logo, logo_alt: "Logo " + p.name, website: "", featured: p.featured };
  });

  function safePartnerUrl(value, allowRelative) {
    if (!value) return "";
    try {
      var u = new URL(value, window.location.href);
      if (u.protocol !== "https:" && !(allowRelative && u.origin === window.location.origin)) return "";
      return u.href;
    } catch (error) { return ""; }
  }

  function partnerCard(partner, showAll, lang) {
    var card = document.createElement("article");
    card.className = "site-partner-card";
    var mark = document.createElement("div");
    mark.className = "site-partner-mark";
    var logo = safePartnerUrl(partner.logo, true);
    if (logo) {
      var img = document.createElement("img");
      img.src = logo;
      img.alt = partner.logo_alt || "";
      img.loading = "lazy";
      mark.appendChild(img);
    } else {
      mark.setAttribute("aria-hidden", "true");
      mark.textContent = String(partner.name).replace(/[^A-Za-z0-9 ]/g, "").split(/\s+/).slice(0, 2).map(function (w) { return w.charAt(0); }).join("").toUpperCase();
    }
    var copy = document.createElement("div");
    copy.className = "site-partner-copy";
    var eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = showAll ? (partner.category || "Mitra") : "Mitra unggulan";
    var title = document.createElement("h3");
    var site = safePartnerUrl(partner.website, false);
    if (site) {
      var link = document.createElement("a");
      link.href = site;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = partner.name;
      title.appendChild(link);
    } else title.textContent = partner.name;
    var summary = document.createElement("p");
    summary.setAttribute("data-partner-summary", "");
    summary.textContent = lang === "en" && partner.summary_en ? partner.summary_en : partner.summary;
    copy.append(eyebrow, title, summary);
    card.append(mark, copy);
    card._partner = partner;
    return card;
  }

  function paintPartners() {
    var lang = readLangFromStorage();
    document.querySelectorAll("[data-partner-list]").forEach(function (target) {
      var showAll = target.getAttribute("data-partner-list") === "all";
      var items = showAll ? partnerItems : partnerItems.filter(function (item) { return item.featured; });
      target.replaceChildren.apply(target, items.map(function (p) { return partnerCard(p, showAll, lang); }));
      target.hidden = false;
    });
  }

  function renderPartnerCards() {
    if (!document.querySelector("[data-partner-list]")) return;
    var done = false;
    function finish(items) {
      if (done) return;
      done = true;
      if (items) partnerItems = items;
      paintPartners();
    }
    var timer = window.setTimeout(function () { finish(null); }, 4000);
    fetch("/api/public-site-content", { headers: { Accept: "application/json" } })
      .then(function (r) { if (!r.ok) throw new Error("partners"); return r.json(); })
      .then(function (data) {
        window.clearTimeout(timer);
        // Ada data CMS -> pakai (termasuk daftar kosong bila semua diarsipkan); belum ada -> daftar bawaan.
        finish(data && data.partners_managed && Array.isArray(data.partners) ? data.partners : null);
      })
      .catch(function () { window.clearTimeout(timer); finish(null); });
  }

  function applyPartnerCopy(lang) {
    document.querySelectorAll(".site-partner-card").forEach(function (card) {
      var partner = card._partner;
      if (!partner) return;
      var copy = card.querySelector("[data-partner-summary]");
      if (copy) copy.textContent = lang === "en" && partner.summary_en ? partner.summary_en : partner.summary;
      var eyebrow = card.querySelector(".site-partner-copy .eyebrow");
      var showAll = card.parentNode && card.parentNode.getAttribute("data-partner-list") === "all";
      if (eyebrow) eyebrow.textContent = showAll ? (lang === "en" && (partner.category === "Mitra" || !partner.category) ? "Partner" : partner.category || "Mitra") : (lang === "en" ? "Featured partner" : "Mitra unggulan");
    });
  }

  function initHeroCarousels() {
    document.querySelectorAll("[data-hero-carousel]").forEach(function (carousel) {
      var slides = Array.prototype.slice.call(carousel.querySelectorAll("[data-hero-slide]"));
      var dots = carousel.querySelector("[data-hero-dots]");
      var previous = carousel.querySelector("[data-hero-prev]");
      var next = carousel.querySelector("[data-hero-next]");
      var track = carousel.querySelector("[data-hero-track]");
      if (slides.length < 2 || !dots || !previous || !next || !track) return;

      var activeIndex = slides.findIndex(function (slide) { return !slide.hidden; });
      if (activeIndex < 0) activeIndex = 0;

      slides.forEach(function (slide, index) {
        slide.setAttribute("aria-label", (index + 1) + " dari " + slides.length);
        var dot = document.createElement("button");
        dot.type = "button";
        dot.className = "site-hero-dot";
        dot.setAttribute("aria-label", "Tampilkan foto " + (index + 1));
        dot.setAttribute("aria-pressed", index === activeIndex ? "true" : "false");
        dot.addEventListener("click", function () { showSlide(index); });
        dots.appendChild(dot);
      });

      function showSlide(index) {
        activeIndex = (index + slides.length) % slides.length;
        slides.forEach(function (slide, slideIndex) {
          slide.hidden = slideIndex !== activeIndex;
          slide.classList.toggle("is-active", slideIndex === activeIndex);
          var image = slide.querySelector("img");
          if (slideIndex === activeIndex && image) image.loading = "eager";
          carousel.querySelectorAll(".site-hero-dot")[slideIndex].setAttribute("aria-pressed", slideIndex === activeIndex ? "true" : "false");
        });
      }

      previous.addEventListener("click", function () { showSlide(activeIndex - 1); });
      next.addEventListener("click", function () { showSlide(activeIndex + 1); });
      carousel.addEventListener("keydown", function (event) {
        if (event.key === "ArrowLeft") showSlide(activeIndex - 1);
        if (event.key === "ArrowRight") showSlide(activeIndex + 1);
      });

      var touchStartX = null;
      var suppressSwipeClick = false;
      var suppressSwipeClickTimer = 0;
      track.addEventListener("click", function (event) {
        if (!suppressSwipeClick) return;
        event.preventDefault();
        suppressSwipeClick = false;
        window.clearTimeout(suppressSwipeClickTimer);
      });
      track.addEventListener("pointerdown", function (event) {
        if (event.pointerType === "mouse") return;
        touchStartX = event.clientX;
      });
      track.addEventListener("pointerup", function (event) {
        if (touchStartX === null) return;
        var distance = event.clientX - touchStartX;
        touchStartX = null;
        if (Math.abs(distance) < 45) return;
        event.preventDefault();
        suppressSwipeClick = true;
        window.clearTimeout(suppressSwipeClickTimer);
        suppressSwipeClickTimer = window.setTimeout(function () { suppressSwipeClick = false; }, 350);
        showSlide(activeIndex + (distance < 0 ? 1 : -1));
      });
      track.addEventListener("pointercancel", function () { touchStartX = null; });
      showSlide(activeIndex);
    });
  }

  async function applyPublishedSiteCopy() {
    const pageKey=location.pathname.split('/').pop() || 'index.html';
    function make(tag,text,cls){const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;}
    function safe(value){try{const u=new URL(value,location.href);return ['https:','mailto:'].includes(u.protocol) || u.origin===location.origin ? u.href:'';}catch(_){return '';}}
    function card(c,tag){
      const box=make(tag || 'article',null,'cms-public-card');
      if(c.image && safe(c.image)){const img=make('img');img.src=safe(c.image);img.alt=c.alt || '';img.loading='lazy';box.append(img);}
      const copy=make('div',null,'cms-public-copy');copy.append(make(tag==='section'?'h2':'h3',c.title));
      (c.text || '').split(/\n\s*\n/).filter(Boolean).forEach(t=>copy.append(make('p',t)));
      if(c.button&&c.href&&safe(c.href)){const a=make('a',c.button,'site-button site-button-primary');a.href=safe(c.href);copy.append(a);}
      box.append(copy);return box;
    }
    try {
      const r=await fetch('/api/public-site-content',{cache:'no-store'});if(!r.ok)throw Error();const data=await r.json(),copy=data.pages && data.pages[pageKey];
      if(document.getElementById("leadership-directory") && window.DDPELeadership){if(!data.leadership)throw Error();window.DDPELeadership.apply(data.leadership);return;}
      if(copy){
        const h=document.querySelector('main h1'),p=document.querySelector(pageKey==='index.html'?'.site-home-welcome-copy':'.site-page-heading > p:not(.eyebrow),.site-news-heading > p:not(.eyebrow)');
        if(h){h.textContent=copy.title;h.removeAttribute('data-i18n');}if(p){p.textContent=copy.intro;p.removeAttribute('data-i18n');}
        const description=document.querySelector('meta[name=description]');if(description)description.content=copy.intro;
        if(Array.isArray(copy.sections)){
          document.querySelectorAll('[data-cms-section]').forEach(host=>{
            const section=copy.sections.find(s=>s.id===host.dataset.cmsSection);host.hidden=!section;
            if(section){host.removeAttribute('aria-labelledby');host.replaceChildren();const content=card(section,'section');host.append(content);if(section.cards.length){const grid=make('div',null,'cms-public-grid');section.cards.forEach(c=>grid.append(card(c)));host.append(grid);}}
          });
          const extra=document.querySelector('[data-cms-extra]');if(extra){extra.replaceChildren();copy.sections.filter(s=>!Array.from(document.querySelectorAll('[data-cms-section]')).some(n=>n.dataset.cmsSection===s.id)).forEach(s=>{const section=card(s,'section');section.id=s.id;const grid=make('div',null,'cms-public-grid');s.cards.forEach(c=>grid.append(card(c)));section.append(grid);extra.append(section);});}
        }
      }
      const host=document.querySelector('[data-cms-events]');
      if(host && Array.isArray(data.events)){
        host.replaceChildren(make('h2',pageKey==='kegiatan-terlaksana.html' || pageKey==='media.html'?'Dokumentasi kegiatan':'Agenda & kegiatan DDPE'));
        const rows=data.events.filter(e=>pageKey==='agenda.html'?e.status==='upcoming':['kegiatan-terlaksana.html','media.html'].includes(pageKey)?e.status==='completed':true);
        const grid=make('div',null,'cms-public-grid');rows.forEach(e=>{const box=card(e);const date=new Date(e.date);const meta=make('div',null,'cms-event-meta');meta.append(make('strong',new Intl.DateTimeFormat('id-ID',{day:'numeric',month:'short',year:'numeric',timeZone:'Asia/Jayapura'}).format(date)),make('span',(e.date.includes('T00:00')?'':new Intl.DateTimeFormat('id-ID',{hour:'2-digit',minute:'2-digit',timeZone:'Asia/Jayapura'}).format(date)+' WIT · ')+e.location),make('span',e.status==='upcoming'?'Akan datang':'Terlaksana'));box.prepend(meta);grid.append(box);});host.append(grid);
        if(!rows.length)host.append(make('p','Belum ada kegiatan pada kategori ini.'));
        if(pageKey==='agenda.html'){const old=document.getElementById('amex');if(old)old.hidden=true;}
        if(pageKey==='index.html'){const old=document.querySelector('.portal-event');if(old)old.hidden=true;}
      }
    }catch(_){const directoryState=document.getElementById('leadership-state');if(directoryState)directoryState.textContent='Pembaruan direktori belum dapat dimuat. Susunan awal 2026–2028 ditampilkan.';const state=document.querySelector('[data-cms-events] [role=status]');if(state)state.textContent='Agenda belum dapat dimuat. Muat ulang halaman untuk mencoba lagi.';}
  }

  var year = document.querySelector("[data-current-year]");
  if (year) year.textContent = String(new Date().getFullYear());

  renderPartnerCards();
  initHeroCarousels();
  injectLanguageSwitcher();
  initMegaNavigation();
  applyLanguage(readLangFromStorage());
  applyPartnerCopy(readLangFromStorage());
  addPageIcon();
  applyPublishedSiteCopy();

  var revealTargets = document.querySelectorAll([
    ".site-hero-copy", ".site-hero-photo", ".site-intro-grid > *", ".site-section-heading",
    ".site-pillar", ".site-partner-card", ".site-amex-label", ".site-amex-copy", ".site-empty-state",
    ".site-news-grid", ".site-page-heading", ".site-opportunity", ".site-program-detail", ".site-fieldwork-band", ".site-fieldwork-card",
    ".site-program-amex", ".site-org-parent", ".site-org-branches article",
    ".site-org-volunteer", ".site-about-hero", ".site-copy", ".site-form-shell",
    ".site-contact-block", ".site-involve-heading", ".site-involve-list"
  ].join(","));
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!reducedMotion && "IntersectionObserver" in window && revealTargets.length) {
    revealTargets.forEach(function (element, index) {
      element.classList.add("site-reveal");
      element.style.setProperty("--reveal-delay", Math.min(index % 4, 3) * 65 + "ms");
    });
    document.body.classList.add("site-motion-enabled");

    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -36px 0px" });

    revealTargets.forEach(function (element) {
      var bounds = element.getBoundingClientRect();
      if (bounds.top < window.innerHeight && bounds.bottom > 0) {
        element.classList.add("is-visible");
      } else {
        observer.observe(element);
      }
    });

    window.addEventListener("scroll", function () {
      revealTargets.forEach(function (element) {
        var bounds = element.getBoundingClientRect();
        if (bounds.top < window.innerHeight - 24 && bounds.bottom > 24) {
          element.classList.add("is-visible");
          observer.unobserve(element);
        }
      });
    }, { passive: true });

    window.setTimeout(function () {
      revealTargets.forEach(function (element) { element.classList.add("is-visible"); });
      observer.disconnect();
    }, 2400);
  }
})();