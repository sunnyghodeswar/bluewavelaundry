(function () {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var old = document.querySelector(".bubble-layer");
  if (old) old.style.display = "none";

  var field = document.createElement("div");
  field.setAttribute("aria-hidden", "true");
  field.style.cssText = "position:absolute;left:0;top:0;width:100%;height:0;pointer-events:none;z-index:41;overflow:visible;";
  document.body.appendChild(field);

  var urls = [];
  var bubbles = [];
  var drums = [];
  var running = true;
  var last = 0;
  var mobile = window.innerWidth < 640;
  var DRUM_MAX = mobile ? 12 : 16;
  var PER_SCENE = 2;
  var emitIn = 0.4;
  var dressIn = 0.6;
  var SCENE_SEL = [
    'img[src*="hero-pickup"]',
    'img[src*="hero-clean"]',
    'img[src*="hero-fold"]',
    'img[src*="tile-"]',
    'img[src*="how-"]',
    'img[src*="cta-pickup"]',
    ".plan-machine",
    ".cta",
    ".how-frame",
    ".hero-pics img"
  ].join(",");
  var W = window.innerWidth;
  var H = window.innerHeight;
  var mx = 0;
  var my = 0;
  var hasPointer = false;
  var seeded = false;
  var cardOn = {};
  var sceneCache = [];
  var sceneAt = 0;

  function bake(hue) {
    var s = 128;
    var c = document.createElement("canvas");
    c.width = s;
    c.height = s;
    var g = c.getContext("2d");
    var r = s * 0.46;
    var cx = s / 2;
    var cy = s / 2;
    var film = g.createRadialGradient(cx - r * 0.18, cy - r * 0.22, r * 0.04, cx, cy, r);
    film.addColorStop(0, "rgba(255,255,255,0.7)");
    film.addColorStop(0.1, "rgba(255,255,255,0.12)");
    film.addColorStop(0.45, "rgba(255,255,255,0.04)");
    film.addColorStop(0.72, "hsla(" + hue + ",75%,65%,0.14)");
    film.addColorStop(0.88, "hsla(" + ((hue + 70) % 360) + ",90%,58%,0.42)");
    film.addColorStop(0.95, "rgba(255,255,255,0.7)");
    film.addColorStop(1, "rgba(18,48,92,0.32)");
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fillStyle = film;
    g.fill();
    if (typeof g.createConicGradient === "function") {
      var irid = g.createConicGradient(0.35, cx, cy);
      irid.addColorStop(0, "hsla(" + hue + ",90%,62%,0.12)");
      irid.addColorStop(0.16, "hsla(" + ((hue + 55) % 360) + ",95%,58%,0.5)");
      irid.addColorStop(0.34, "hsla(" + ((hue + 120) % 360) + ",90%,55%,0.32)");
      irid.addColorStop(0.52, "hsla(" + ((hue + 190) % 360) + ",95%,62%,0.48)");
      irid.addColorStop(0.7, "hsla(" + ((hue + 250) % 360) + ",85%,58%,0.36)");
      irid.addColorStop(0.86, "hsla(" + ((hue + 310) % 360) + ",90%,60%,0.26)");
      irid.addColorStop(1, "hsla(" + hue + ",90%,62%,0.12)");
      g.beginPath();
      g.arc(cx, cy, r * 0.97, 0, Math.PI * 2);
      g.strokeStyle = irid;
      g.lineWidth = r * 0.07;
      g.stroke();
    }
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.strokeStyle = "rgba(11,27,43,0.22)";
    g.lineWidth = 1.1;
    g.stroke();
    g.beginPath();
    g.ellipse(cx - r * 0.32, cy - r * 0.38, r * 0.18, r * 0.1, -0.6, 0, Math.PI * 2);
    g.fillStyle = "rgba(255,255,255,0.95)";
    g.fill();
    return c.toDataURL("image/png");
  }

  function rand(a, b) {
    return a + Math.random() * (b - a);
  }

  function sizeField() {
    field.style.height = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      H
    ) + "px";
  }

  function liveDrums() {
    var br = document.body.getBoundingClientRect();
    var out = [];
    var i;
    var box;
    var nodes = document.querySelectorAll(".plan-drum");
    for (i = 0; i < nodes.length; i++) {
      box = nodes[i].getBoundingClientRect();
      if (box.width < 8 || box.height < 8) continue;
      out.push({
        x: box.left - br.left + box.width / 2,
        y: box.top - br.top + box.height * 0.46,
        sprite: i % urls.length,
        fromNav: false
      });
    }
    var logos = document.querySelectorAll(".bw-nav .logo-img, .bw-nav .logo img");
    for (i = 0; i < logos.length; i++) {
      box = logos[i].getBoundingClientRect();
      if (box.width < 8 || box.height < 8) continue;
      var machine = box.height;
      out.push({
        x: box.left - br.left + machine * 0.5,
        y: box.top - br.top + box.height * 0.52,
        sprite: 1,
        fromNav: true
      });
    }
    return out;
  }

  function cacheDrums() {
    drums = liveDrums();
    if (!drums.length) {
      drums.push({ x: W * 0.5, y: Math.max(H * 0.55, 360), sprite: 1, fromNav: false });
    }
  }

  function graphicHost(el) {
    if (!el || !el.closest) return el || null;
    return el.closest(".how-frame") || el.closest(".cta") || el.closest(".plan-machine") || el;
  }

  function liveGraphics() {
    var now = Date.now();
    if (sceneCache.length && now - sceneAt < 400) return sceneCache;
    var br = document.body.getBoundingClientRect();
    var nodes = document.querySelectorAll(SCENE_SEL);
    var seen = [];
    var out = [];
    var i;
    var host;
    var box;
    for (i = 0; i < nodes.length; i++) {
      host = graphicHost(nodes[i]);
      if (!host || seen.indexOf(host) !== -1) continue;
      box = host.getBoundingClientRect();
      if (box.width < 64 || box.height < 64) continue;
      seen.push(host);
      out.push({
        el: host,
        x: box.left - br.left,
        y: box.top - br.top,
        w: box.width,
        h: box.height,
        sprite: out.length % urls.length
      });
    }
    sceneCache = out;
    sceneAt = now;
    return out;
  }

  function bubblesOn(host) {
    var key = graphicHost(host);
    var n = 0;
    for (var i = 0; i < bubbles.length; i++) {
      if (bubbles[i].fromScene && graphicHost(bubbles[i].sceneEl) === key) n++;
    }
    return n;
  }

  function drumCount() {
    var n = 0;
    for (var i = 0; i < bubbles.length; i++) {
      if (!bubbles[i].fromScene && !bubbles[i].cardId) n++;
    }
    return n;
  }

  function scenePoint(scene) {
    return {
      x: scene.x + rand(0.16, 0.84) * scene.w,
      y: scene.y + rand(0.18, 0.82) * scene.h,
      sprite: scene.sprite,
      fromNav: false,
      fromScene: true,
      sceneEl: scene.el
    };
  }

  function graphicOf(el) {
    var list = liveGraphics();
    var host = graphicHost(el);
    for (var i = 0; i < list.length; i++) {
      if (list[i].el === host) return list[i];
    }
    return list[0] || null;
  }

  function spawnOnGraphic(scene) {
    var b = { el: makeEl() };
    launch(b, false, scenePoint(scene));
    bubbles.push(b);
  }

  function dressGraphics() {
    var list = liveGraphics();
    var i;
    var scene;
    for (i = 0; i < list.length; i++) {
      scene = list[i];
      while (bubblesOn(scene.el) < PER_SCENE) spawnOnGraphic(scene);
    }
  }

  function relaunchOnGraphic(b) {
    var scene = graphicOf(b.sceneEl);
    if (!scene) return false;
    launch(b, false, scenePoint(scene));
    b.alpha = 0;
    b.fadeIn = true;
    b.fadeOut = false;
    paint(b);
    return true;
  }

  function pickDrum() {
    cacheDrums();
    var nav = [];
    var rest = [];
    for (var i = 0; i < drums.length; i++) {
      if (drums[i].fromNav) nav.push(drums[i]);
      else rest.push(drums[i]);
    }
    if (nav.length && (Math.random() < 0.5 || !rest.length)) {
      return nav[(Math.random() * nav.length) | 0];
    }
    if (rest.length) return rest[(Math.random() * rest.length) | 0];
    return drums[0];
  }

  function paint(b) {
    var s = b.pop ? 1 + b.pop * 1.5 : 1;
    var o = b.pop ? Math.max(0, 1 - b.pop) * b.alpha : b.alpha;
    b.el.style.transform = "translate3d(" + b.tx + "px," + b.ty + "px,0) scale(" + s + ")";
    b.el.style.opacity = String(o);
  }

  function sourceFromEl(el, sprite) {
    var br = document.body.getBoundingClientRect();
    var box = el.getBoundingClientRect();
    return {
      x: box.left - br.left + box.width / 2,
      y: box.top - br.top + box.height * 0.4,
      sprite: sprite == null ? 1 : sprite,
      fromNav: false,
      fromCard: true
    };
  }

  function pickRadius(kind) {
    var roll = Math.random();
    if (kind === "nav") return rand(6, 11);
    if (kind === "card") return rand(7, 14);
    if (kind === "scene") {
      if (roll < 0.6) return rand(7, 12);
      if (roll < 0.92) return rand(12, 16);
      return rand(16, 20);
    }
    if (roll < 0.55) return rand(7, 12);
    if (roll < 0.9) return rand(12, 18);
    return rand(18, 24);
  }

  function launch(b, aloft, src) {
    src = src || pickDrum();
    b.r = pickRadius(src.fromScene ? "scene" : src.fromCard ? "card" : src.fromNav ? "nav" : "drum");
    b.x0 = src.x;
    b.y0 = src.y;
    b.dir = src.fromNav ? 1 : src.fromScene ? (Math.random() < 0.7 ? -1 : 1) : -1;
    b.sprite = src.sprite % urls.length;
    b.alpha = src.fromScene ? rand(0.9, 1) : rand(0.82, 1);
    b.pop = 0;
    b.px = 0;
    b.py = 0;
    b.wob = rand(0, Math.PI * 2);
    b.wobSp = rand(0.7, 1.6);
    b.wobAmp = src.fromScene ? rand(0.08, 0.24) : rand(0.14, 0.42);
    b.fromScene = !!src.fromScene;
    b.sceneEl = src.fromScene ? src.sceneEl : null;
    b.fadeOut = false;
    b.fadeIn = false;
    if (src.fromScene) {
      b.vy = rand(0.06, 0.18);
      b.vx = rand(-0.14, 0.14);
      b.tx = rand(-8, 8);
      b.ty = rand(-8, 8);
    } else if (src.fromCard) {
      b.vy = rand(0.28, 0.62);
      b.vx = rand(-0.62, 0.62);
      b.tx = rand(-14, 14);
      b.ty = rand(-10, 6);
    } else if (Math.random() < 0.38) {
      b.vy = rand(0.08, 0.2);
      b.vx = rand(0.18, 0.42) * (Math.random() < 0.5 ? -1 : 1);
      if (aloft) {
        b.tx = rand(24 - src.x, W - 24 - src.x);
        if (b.dir > 0) {
          var down = Math.max(H, field.offsetHeight || H);
          b.ty = rand(24, Math.max(80, down * 0.85));
        } else {
          b.ty = rand(-Math.max(80, src.y * 0.95), src.y * 0.22);
        }
      } else {
        b.tx = rand(-10, 10);
        b.ty = b.dir > 0 ? rand(6, 18) : rand(-8, 6);
      }
    } else {
      b.vy = rand(0.22, 0.5);
      b.vx = rand(-0.18, 0.18);
      if (aloft) {
        b.tx = rand(24 - src.x, W - 24 - src.x);
        if (b.dir > 0) {
          var down2 = Math.max(H, field.offsetHeight || H);
          b.ty = rand(24, Math.max(80, down2 * 0.85));
        } else {
          b.ty = rand(-Math.max(80, src.y * 0.95), src.y * 0.22);
        }
      } else {
        b.tx = rand(-10, 10);
        b.ty = b.dir > 0 ? rand(6, 18) : rand(-8, 6);
      }
    }
    var d = (b.r * 2) + "px";
    b.el.style.width = d;
    b.el.style.height = d;
    b.el.style.left = (b.x0 - b.r) + "px";
    b.el.style.top = (b.y0 - b.r) + "px";
    b.el.style.backgroundImage = "url(" + (urls[b.sprite] || urls[0]) + ")";
    b.cardId = src.fromCard ? src.cardId || b.cardId : null;
    if (!src.fromScene) b.fromScene = false;
    paint(b);
  }

  function makeEl() {
    var el = document.createElement("span");
    el.style.cssText = "position:absolute;display:block;border-radius:50%;pointer-events:none;will-change:transform;background-repeat:no-repeat;background-position:center;background-size:100% 100%;";
    field.appendChild(el);
    return el;
  }

  function spawnFromDrum() {
    cacheDrums();
    if (drumCount() >= DRUM_MAX) return;
    var b = { el: makeEl() };
    launch(b, false);
    bubbles.push(b);
  }

  function cardId(el) {
    return el.getAttribute("data-tile") || (el.querySelector("img") && el.querySelector("img").alt) || "";
  }

  function burstFromCard(el) {
    if (!seeded) return;
    var id = cardId(el);
    if (!id) return;
    if (cardOn[id]) {
      cardOn[id] = false;
      for (var p = 0; p < bubbles.length; p++) {
        if (bubbles[p].cardId === id && !bubbles[p].pop) bubbles[p].pop = 0.01;
      }
      return;
    }
    cardOn[id] = true;
    sizeField();
    var src = sourceFromEl(el);
    var n = 3 + ((Math.random() * 3) | 0);
    for (var i = 0; i < n; i++) {
      var b = { el: makeEl() };
      bubbles.push(b);
      launch(b, false, {
        x: src.x + rand(-18, 18),
        y: src.y + rand(-12, 12),
        sprite: (Math.random() * urls.length) | 0,
        fromNav: false,
        fromCard: true,
        cardId: id
      });
    }
  }

  function seed() {
    W = window.innerWidth;
    H = window.innerHeight;
    sizeField();
    cacheDrums();
    var start = mobile ? 10 : 12;
    while (drumCount() < start) {
      var b = { el: makeEl() };
      launch(b, true);
      bubbles.push(b);
    }
    dressGraphics();
    seeded = true;
  }

  function dropBubble(i) {
    var b = bubbles[i];
    if (b.el && b.el.parentNode) b.el.parentNode.removeChild(b.el);
    bubbles.splice(i, 1);
  }

  function tick(now) {
    if (!running) return;
    requestAnimationFrame(tick);
    if (!seeded) return;
    var dt = Math.min(0.05, (now - last) / 1000) || 0.016;
    last = now;
    var step = dt * 60;

    emitIn -= dt;
    if (emitIn <= 0) {
      emitIn = rand(1.6, 2.4);
      spawnFromDrum();
      if (Math.random() < 0.35) spawnFromDrum();
    }
    dressIn -= dt;
    if (dressIn <= 0) {
      dressIn = 0.9;
      dressGraphics();
    }

    for (var i = 0; i < bubbles.length; i++) {
      var b = bubbles[i];
      if (b.pop > 0) {
        b.pop += dt * 2.6;
        if (b.pop >= 1) {
          if (b.cardId) {
            dropBubble(i);
            i--;
          } else {
            launch(b, false);
          }
          continue;
        }
        paint(b);
        continue;
      }
      if (b.fadeOut) {
        b.alpha -= dt * 2.8;
        if (b.alpha <= 0) {
          if (!relaunchOnGraphic(b)) {
            dropBubble(i);
            i--;
          }
        } else {
          paint(b);
        }
        continue;
      }
      if (b.fadeIn) {
        b.alpha += dt * 2.8;
        if (b.alpha >= 0.95) {
          b.alpha = 0.95;
          b.fadeIn = false;
        }
      }
      b.wob += dt * b.wobSp;
      if (hasPointer) {
        var x = b.x0 + b.tx;
        var y = b.y0 + b.ty;
        var dx = x - mx;
        var dy = y - my;
        var dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        var reach = 70 + b.r;
        if (dist < reach) {
          var fall = 1 - dist / reach;
          fall *= fall;
          b.px += (dx / dist) * fall * 0.9;
          b.py += (dy / dist) * fall * 0.9;
        }
      }
      b.px *= 0.9;
      b.py *= 0.9;
      b.tx += (b.vx + Math.sin(b.wob) * b.wobAmp + b.px) * step;
      b.ty += (b.dir * b.vy + b.py) * step;
      if (!b.fromScene) {
        if (b.x0 + b.tx < -b.r) b.tx = W + b.r - b.x0;
        else if (b.x0 + b.tx > W + b.r) b.tx = -b.r - b.x0;
      }
      var y = b.y0 + b.ty;
      var pageH = field.offsetHeight || document.documentElement.scrollHeight;
      if (b.fromScene) {
        if (b.tx * b.tx + b.ty * b.ty > 10000) {
          b.fadeOut = true;
          paint(b);
          continue;
        }
      } else if ((b.dir < 0 && y < -40) || (b.dir > 0 && y > pageH + 40)) {
        if (b.cardId) {
          dropBubble(i);
          i--;
        } else {
          launch(b, false);
        }
        continue;
      }
      paint(b);
    }
  }

  urls = [bake(195), bake(215), bake(155)];
  seed();
  requestAnimationFrame(tick);

  var tries = 0;
  var wait = setInterval(function () {
    tries++;
    var found = liveDrums();
    if (found.length) {
      drums = found;
      for (var i = 0; i < bubbles.length; i++) {
        if (!bubbles[i].cardId && !bubbles[i].fromScene) launch(bubbles[i], true);
      }
      dressGraphics();
      sizeField();
      clearInterval(wait);
    } else if (tries > 50) {
      clearInterval(wait);
    }
  }, 120);

  window.addEventListener("pointermove", function (e) {
    if (mobile || e.pointerType === "touch") return;
    var br = document.body.getBoundingClientRect();
    mx = e.clientX - br.left;
    my = e.clientY - br.top;
    hasPointer = true;
  }, { passive: true });

  window.addEventListener("pointerdown", function (e) {
    var br = document.body.getBoundingClientRect();
    mx = e.clientX - br.left;
    my = e.clientY - br.top;
    hasPointer = true;
    if (e.target.closest && e.target.closest("#book button")) return;
    for (var i = 0; i < bubbles.length; i++) {
      var b = bubbles[i];
      if (b.pop || b.fromScene) continue;
      var dx = b.x0 + b.tx - mx;
      var dy = b.y0 + b.ty - my;
      if (dx * dx + dy * dy < (b.r + 16) * (b.r + 16)) b.pop = 0.01;
    }
  }, { passive: true });

  document.addEventListener("click", function (e) {
    var btn = e.target.closest && e.target.closest("#book button");
    if (!btn) return;
    burstFromCard(btn);
  });

  document.addEventListener("pointerleave", function () {
    hasPointer = false;
  });

  window.addEventListener("resize", function () {
    W = window.innerWidth;
    H = window.innerHeight;
    mobile = W < 640;
    sizeField();
    cacheDrums();
    sceneCache = [];
  });

  document.addEventListener("visibilitychange", function () {
    running = document.visibilityState !== "hidden";
    if (running) {
      last = 0;
      requestAnimationFrame(tick);
    }
  });
})();
