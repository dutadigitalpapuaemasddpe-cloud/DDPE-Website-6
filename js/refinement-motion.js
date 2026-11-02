(function () {
  'use strict';
  var preference = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (preference.matches || !('IntersectionObserver' in window)) return;
  var targets = Array.from(document.querySelectorAll('.rd-section-title, .rd-card, .rd-photo, .rd-status, .rd-steps, .ip-identity, .hm-quick'));
  var observer;
  function showAll() {
    targets.forEach(function (el) { el.classList.add('motion-visible'); });
    if (observer) observer.disconnect();
  }
  try {
    observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('motion-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });
    targets.forEach(function (el) {
      el.classList.add('motion-watch');
      if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('motion-visible');
      else observer.observe(el);
    });
    // Fallback prevents hidden content if observations stop in an embedded preview.
    window.setTimeout(showAll, 12000);
    window.addEventListener('beforeprint', showAll);
    if (preference.addEventListener) preference.addEventListener('change', showAll);
  } catch (_error) { showAll(); }
})();
