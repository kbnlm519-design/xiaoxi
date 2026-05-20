/* ============================================================
   moons.js — Hero particle system
   State machine: pre → converging → singularity → exploding → idle
   API: window.heroParticles = { startSequence, skipToIdle, addRipple, setHover }
   ============================================================ */
(function () {
  'use strict';

  var canvas = document.getElementById('particleCanvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = 0, H = 0;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);

  var IS_LOW = (navigator.hardwareConcurrency || 4) <= 4;
  var BASE_COUNT = (IS_LOW || window.innerWidth < 768) ? 65 : 130;

  var state = 'pre';
  var stateStart = 0;

  var particles = [];
  var ripples   = [];

  var mouseX = -9999, mouseY = -9999;
  var isHovering = false;
  var nextMeteorAt = 0;

  function rand(a, b) { return a + Math.random() * (b - a); }

  /* --- Resize --- */
  function resize() {
    var rect = canvas.parentElement.getBoundingClientRect();
    W = rect.width  || window.innerWidth;
    H = rect.height || window.innerHeight;
    canvas.width  = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    canvas.style.width  = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  /* --- Particle factory --- */
  function makeParticle() {
    var angle = rand(0, Math.PI * 2);
    var speed = rand(2.5, 7);
    return {
      x: W / 2 + rand(-25, 25),
      y: H / 2 + rand(-25, 25),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      r: rand(1.8, 5.2),
      hue: rand(220, 280),
      phase: rand(0, Math.PI * 2),
      hx: 0, hy: 0,
      isMeteor: false,
      pushX: 0, pushY: 0
    };
  }

  function initParticles() {
    particles.length = 0;
    for (var i = 0; i < BASE_COUNT; i++) particles.push(makeParticle());
  }

  function assignHomes() {
    var cx = W / 2, cy = H / 2;
    var idleN = Math.ceil(BASE_COUNT * 0.5);
    for (var i = 0; i < BASE_COUNT; i++) {
      if (i < idleN) {
        var a = rand(0, Math.PI * 2);
        var d = rand(50, 400);
        particles[i].hx = cx + Math.cos(a) * d;
        particles[i].hy = cy + Math.sin(a) * d;
      } else {
        var a2 = rand(0, Math.PI * 2);
        particles[i].hx = cx + Math.cos(a2) * (W * 1.6);
        particles[i].hy = cy + Math.sin(a2) * (H * 1.6);
      }
    }
  }

  /* --- Drawing --- */
  function drawParticle(p, alpha) {
    if (alpha <= 0.01) return;
    var flicker = (0.85 + 0.15 * Math.sin(p.phase)) * alpha;

    if (p.isMeteor) {
      var gm = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 4);
      gm.addColorStop(0, 'rgba(255,255,255,' + (0.35 * flicker) + ')');
      gm.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gm;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,' + flicker + ')';
    } else {
      var gp = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.5);
      gp.addColorStop(0, 'hsla(' + p.hue + ',80%,85%,' + (0.22 * flicker) + ')');
      gp.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gp;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'hsla(' + p.hue + ',80%,92%,' + flicker + ')';
    }
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
  }

  function drawSingularity(t) {
    var cx = W / 2, cy = H / 2;
    var r = 40 * Math.min(t * 3, 1);

    /* outer halos */
    var mults = [7, 5, 3];
    var intensities = [0.10, 0.07, 0.04];
    for (var i = 0; i < 3; i++) {
      var gr = r * mults[i];
      var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, gr);
      g.addColorStop(0, 'rgba(164,139,255,' + (t * intensities[i]) + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx, cy, gr, 0, Math.PI * 2); ctx.fill();
    }

    /* core */
    var gc = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(r, 0.5));
    gc.addColorStop(0,    'rgba(230,215,255,' + t + ')');
    gc.addColorStop(0.45, 'rgba(164,139,255,' + (t * 0.9) + ')');
    gc.addColorStop(1,    'rgba(100,60,240,' + (t * 0.2) + ')');
    ctx.fillStyle = gc;
    ctx.beginPath(); ctx.arc(cx, cy, Math.max(r, 0.5), 0, Math.PI * 2); ctx.fill();
  }

  function drawRipples(now) {
    for (var i = ripples.length - 1; i >= 0; i--) {
      var rp = ripples[i];
      var t = (now - rp.t0) / 800;
      if (t >= 1) { ripples.splice(i, 1); continue; }
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 * (1 - t)) + ')';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.arc(rp.x, rp.y, 300 * t, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  /* --- Magnetic force --- */
  function applyMagnetic(p) {
    if (mouseX < -1000) return;
    var dx = mouseX - p.x, dy = mouseY - p.y;
    var d2 = dx * dx + dy * dy;
    var maxD2 = 250 * 250;
    if (d2 < maxD2 && d2 > 0.01) {
      var d = Math.sqrt(d2);
      var f = 0.8 * (1 - d2 / maxD2);
      p.vx += (dx / d) * f;
      p.vy += (dy / d) * f;
    }
  }

  /* --- State updates --- */
  function updateFloat() {
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.phase += 0.028;
      p.vx += rand(-0.012, 0.012);
      p.vy += rand(-0.012, 0.012);
      p.vx *= 0.975; p.vy *= 0.975;
      if (p.vx >  1) p.vx =  1; if (p.vx < -1) p.vx = -1;
      if (p.vy >  1) p.vy =  1; if (p.vy < -1) p.vy = -1;
      p.x += p.vx; p.y += p.vy;
      if (p.x < -30) p.x = W + 30; else if (p.x > W + 30) p.x = -30;
      if (p.y < -30) p.y = H + 30; else if (p.y > H + 30) p.y = -30;
      applyMagnetic(p);
      drawParticle(p, 1);
    }
  }

  function updateConverging(elapsed) {
    var dur = 1500;
    var t = elapsed / dur; if (t > 1) t = 1;
    var eased = t * t * t;
    var k = 0.02 + eased * 0.12;
    var cx = W / 2, cy = H / 2;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.phase += 0.04;
      p.x += (cx - p.x) * k;
      p.y += (cy - p.y) * k;
      drawParticle(p, 1 - eased * 0.55);
    }
    if (t >= 1) setState('singularity');
  }

  function updateSingularity(elapsed) {
    var dur = 200;
    var t = elapsed / dur; if (t > 1) t = 1;
    var cx = W / 2, cy = H / 2;
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.x += (cx - p.x) * 0.4;
      p.y += (cy - p.y) * 0.4;
    }
    drawSingularity(t);
    if (t >= 1) {
      for (var j = 0; j < particles.length; j++) {
        var q = particles[j];
        var a = rand(0, Math.PI * 2);
        var sp = rand(5, 16);
        q.vx = Math.cos(a) * sp;
        q.vy = Math.sin(a) * sp;
        q.x = W / 2 + rand(-5, 5);
        q.y = H / 2 + rand(-5, 5);
      }
      assignHomes();
      setState('exploding');
    }
  }

  function updateExploding(elapsed) {
    var dur = 400;
    var t = elapsed / dur; if (t > 1) t = 1;
    var eased = 1 - (1 - t) * (1 - t);
    for (var i = 0; i < particles.length; i++) {
      var p = particles[i];
      p.phase += 0.04;
      p.vx *= 0.88; p.vy *= 0.88;
      p.x += p.vx; p.y += p.vy;
      drawParticle(p, eased);
    }
    if (t >= 1) setState('idle');
  }

  function updateIdle(now) {
    var idleN = Math.ceil(BASE_COUNT * 0.5);
    var cx = W / 2, cy = H / 2;

    if (now > nextMeteorAt) {
      launchMeteors(idleN);
      nextMeteorAt = now + rand(5000, 10000);
    }

    for (var i = 0; i < BASE_COUNT; i++) {
      var p = particles[i];
      var active = i < idleN;
      p.phase += 0.025;
      if (!active) continue;

      /* spring to home */
      p.vx += (p.hx - p.x) * 0.012;
      p.vy += (p.hy - p.y) * 0.012;

      applyMagnetic(p);

      /* hover clustering */
      if (isHovering) {
        var hdx = cx - p.x, hdy = cy - p.y;
        var hd = Math.sqrt(hdx * hdx + hdy * hdy);
        if (hd < 250 && hd > 1) {
          p.vx += (hdx / hd) * 0.22;
          p.vy += (hdy / hd) * 0.22;
        }
      }

      /* ripple push decay */
      if (p.pushX || p.pushY) {
        p.vx += p.pushX; p.vy += p.pushY;
        p.pushX *= 0.78; p.pushY *= 0.78;
        if (Math.abs(p.pushX) < 0.005) p.pushX = 0;
        if (Math.abs(p.pushY) < 0.005) p.pushY = 0;
      }

      p.vx *= 0.87; p.vy *= 0.87;
      p.x += p.vx; p.y += p.vy;
      drawParticle(p, 0.9);
    }
  }

  function launchMeteors(idleN) {
    var cx = W / 2, cy = H / 2;
    var count = Math.floor(rand(2, 3.99));
    /* pick particles farthest from center */
    var sorted = [];
    for (var i = 0; i < idleN; i++) {
      var p = particles[i];
      var d2 = (p.x - cx) * (p.x - cx) + (p.y - cy) * (p.y - cy);
      sorted.push({ p: p, d2: d2 });
    }
    sorted.sort(function(a, b) { return b.d2 - a.d2; });

    for (var j = 0; j < Math.min(count, sorted.length); j++) {
      (function(p) {
        p.isMeteor = true;
        var tx = cx + rand(-70, 70);
        var ty = cy + rand(-70, 70);
        var dx = tx - p.x, dy = ty - p.y;
        var d = Math.sqrt(dx * dx + dy * dy) || 1;
        var sp = rand(8, 14);
        p.vx = dx / d * sp;
        p.vy = dy / d * sp;
        var delay = Math.round(d / sp * (1000 / 60)) + 350;
        setTimeout(function() { p.isMeteor = false; }, delay);
      })(sorted[j].p);
    }
  }

  /* --- Main loop --- */
  function setState(s) {
    state = s;
    stateStart = performance.now();
  }

  function loop(now) {
    requestAnimationFrame(loop);
    if (!now) now = performance.now();
    ctx.clearRect(0, 0, W, H);
    var elapsed = now - stateStart;

    if (state === 'pre' || state === 'scatter') {
      updateFloat();
    } else if (state === 'converging') {
      updateConverging(elapsed);
    } else if (state === 'singularity') {
      updateSingularity(elapsed);
    } else if (state === 'exploding') {
      updateExploding(elapsed);
    } else if (state === 'idle') {
      updateIdle(now);
    }

    drawRipples(now);
  }

  /* --- Mouse --- */
  document.addEventListener('mousemove', function(e) { mouseX = e.clientX; mouseY = e.clientY; });
  document.addEventListener('mouseleave', function() { mouseX = -9999; mouseY = -9999; });

  /* --- Public API --- */
  window.heroParticles = {
    startSequence: function() { setState('converging'); },
    skipToIdle: function() {
      assignHomes();
      var idleN = Math.ceil(BASE_COUNT * 0.5);
      for (var i = 0; i < BASE_COUNT; i++) {
        particles[i].x  = particles[i].hx + rand(-30, 30);
        particles[i].y  = particles[i].hy + rand(-30, 30);
        particles[i].vx = rand(-0.8, 0.8);
        particles[i].vy = rand(-0.8, 0.8);
      }
      nextMeteorAt = performance.now() + rand(3000, 7000);
      setState('idle');
    },
    addRipple: function(x, y) {
      ripples.push({ x: x, y: y, t0: performance.now() });
      var n = (state === 'idle') ? Math.ceil(BASE_COUNT * 0.5) : BASE_COUNT;
      for (var i = 0; i < n; i++) {
        var p = particles[i];
        var dx = p.x - x, dy = p.y - y;
        var d2 = dx * dx + dy * dy;
        if (d2 < 150 * 150 && d2 > 0.01) {
          var d = Math.sqrt(d2);
          var f = 9 * (1 - d / 150);
          p.pushX += (dx / d) * f;
          p.pushY += (dy / d) * f;
        }
      }
    },
    setHover: function(bool) { isHovering = bool; }
  };

  /* --- Init --- */
  function init() {
    resize();
    initParticles();
    setState('pre');
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', function() {
    resize();
    if (state === 'idle') assignHomes();
  });

  init();
})();
