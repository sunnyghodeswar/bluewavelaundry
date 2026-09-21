(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (window.innerWidth < 640) return;

  var ticking = false;
  var stopT = 0;

  function glassOn() {
    var bars = document.querySelectorAll(".float-bar, .sel-bar");
    if (!bars.length) return;
    bars.forEach(function (el) { el.classList.add("is-gliding"); });
    clearTimeout(stopT);
    stopT = setTimeout(function () {
      bars.forEach(function (el) { el.classList.remove("is-gliding"); });
    }, 180);
  }

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

  function onUserScroll() {
    glassOn();
    onScroll();
  }

  window.addEventListener("scroll", onUserScroll, { passive: true });
  window.addEventListener("touchmove", glassOn, { passive: true });
  window.addEventListener("resize", onScroll);
  function start() {
    onScroll();
    setTimeout(onScroll, 300);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
