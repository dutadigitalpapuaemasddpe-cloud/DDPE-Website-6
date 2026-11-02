(function () {
  "use strict";

  if (!document.body.classList.contains("ddpe-interior")) return;
  var navigation = document.querySelector(".ip-index");
  if (!navigation || navigation.dataset.ipIndexReady) return;

  var items = Array.from(navigation.querySelectorAll('a[href^="#"]')).map(function (link) {
    var id;
    try { id = decodeURIComponent(link.hash.slice(1)); } catch (_error) { return null; }
    var section = document.getElementById(id);
    return section ? { link: link, section: section } : null;
  }).filter(Boolean);
  if (!items.length) return;
  navigation.dataset.ipIndexReady = "true";

  function activate(item) {
    items.forEach(function (candidate) {
      if (candidate === item) candidate.link.setAttribute("aria-current", "location");
      else candidate.link.removeAttribute("aria-current");
    });
  }

  function activateHash() {
    var item = items.find(function (candidate) { return candidate.link.hash === window.location.hash; });
    if (item) activate(item);
    return Boolean(item);
  }

  var queued = false;
  function updateFromScroll() {
    queued = false;
    var current = items[0];
    items.forEach(function (item) {
      if (item.section.getBoundingClientRect().top <= 128) current = item;
    });
    activate(current);
  }

  function scheduleUpdate() {
    if (queued) return;
    queued = true;
    window.requestAnimationFrame(updateFromScroll);
  }

  items.forEach(function (item) {
    item.link.addEventListener("click", function () { activate(item); });
  });
  window.addEventListener("scroll", scheduleUpdate, { passive: true });
  window.addEventListener("resize", scheduleUpdate);
  window.addEventListener("hashchange", function () {
    if (!activateHash()) scheduleUpdate();
  });
  window.addEventListener("pageshow", function () {
    if (!activateHash()) scheduleUpdate();
  });
  if (!activateHash()) updateFromScroll();
})();
