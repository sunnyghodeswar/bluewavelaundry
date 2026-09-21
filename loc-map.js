(function () {
  var MAP_SRC =
    "https://maps.google.com/maps?q=18.577091,73.743629+(Blue%20Wave%20Laundry)&z=17&hl=en&output=embed";

  function fineHover() {
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }

  function loadFrame(pop) {
    var frame = pop.querySelector("iframe");
    if (!frame) return;
    if (frame.getAttribute("src") !== MAP_SRC) frame.setAttribute("src", MAP_SRC);
  }

  function openPop(pop) {
    loadFrame(pop);
    pop.classList.add("is-open");
    var btn = pop.querySelector(".loc-map-btn");
    if (btn) btn.setAttribute("aria-expanded", "true");
  }

  function closePop(pop) {
    pop.classList.remove("is-open");
    var btn = pop.querySelector(".loc-map-btn");
    if (btn) btn.setAttribute("aria-expanded", "false");
  }

  function bind(pop) {
    if (pop.getAttribute("data-bound")) return;
    pop.setAttribute("data-bound", "1");
    var btn = pop.querySelector(".loc-map-btn");
    if (!btn) return;
    loadFrame(pop);

    pop.addEventListener("mouseenter", function () {
      if (fineHover()) openPop(pop);
    });
    pop.addEventListener("mouseleave", function () {
      if (fineHover()) closePop(pop);
    });
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (fineHover()) {
        openPop(pop);
        return;
      }
      if (pop.classList.contains("is-open")) closePop(pop);
      else openPop(pop);
    });
  }

  function init() {
    document.querySelectorAll(".loc-map-pop").forEach(bind);
  }

  document.addEventListener("click", function (e) {
    document.querySelectorAll(".loc-map-pop.is-open").forEach(function (pop) {
      if (!pop.contains(e.target)) closePop(pop);
    });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Escape") return;
    document.querySelectorAll(".loc-map-pop.is-open").forEach(closePop);
  });

  var tries = 0;
  function boot() {
    init();
    if (!document.querySelector(".loc-map-pop") && tries < 24) {
      tries += 1;
      setTimeout(boot, 120);
    }
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
