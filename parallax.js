(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var ticking = false;

  function update() {
    var vh = window.innerHeight || 1;
    var depth = window.innerWidth < 640 ? 8 : 14;
    document.querySelectorAll("[data-px]").forEach(function (el) {
      var r = el.getBoundingClientRect();
      if (r.bottom < -80 || r.top > vh + 80) return;
      var p = (r.top + r.height / 2 - vh / 2) / vh;
      el.style.setProperty("--px", (p * depth).toFixed(2) + "px");
    });
    ticking = false;
  }

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  function start() {
    onScroll();
    setTimeout(onScroll, 300);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
