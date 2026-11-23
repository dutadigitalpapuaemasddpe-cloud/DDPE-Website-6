/* Ruang Pengurus: buka/tutup sidebar di layar sempit. Tidak menyentuh logika dashboard.js. */
(function () {
  "use strict";
  var sidebar = document.getElementById("dash-sidebar");
  var scrim = document.getElementById("dash-scrim");
  var toggle = document.querySelector(".dash-menu-toggle");
  if (!sidebar || !scrim || !toggle) return;
  var narrow = window.matchMedia("(max-width: 900px)");

  function setOpen(open, restoreFocus) {
    sidebar.classList.toggle("is-open", open);
    scrim.classList.toggle("is-visible", open);
    toggle.setAttribute("aria-expanded", String(open));
    document.body.classList.toggle("dash-menu-open", open);
    if (open) {
      var first = sidebar.querySelector("button:not([hidden])");
      if (first) first.focus();
    } else if (restoreFocus) {
      toggle.focus();
    }
  }

  toggle.addEventListener("click", function () {
    setOpen(!sidebar.classList.contains("is-open"));
  });
  scrim.addEventListener("click", function () { setOpen(false, true); });
  sidebar.addEventListener("click", function (event) {
    if (narrow.matches && event.target.closest("[data-view]")) setOpen(false, true);
  });
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && sidebar.classList.contains("is-open")) setOpen(false, true);
  });
  var onChange = function () { if (!narrow.matches) setOpen(false); };
  if (narrow.addEventListener) narrow.addEventListener("change", onChange);
  else narrow.addListener(onChange);
})();
