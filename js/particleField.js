/* ============================================================
   particleField.js — reusable floating-dot particle field
   Distilled from the Hero idle dots (moons.js) into a small
   configurable factory. Vanilla-JS stand-in for a component:
   options object replaces props.

   createParticleField(canvas, {
     count,     // particle count on desktop (halved < 768px)
     opacity,   // overall layer opacity (canvas style)
     speed,     // velocity multiplier (1 = lively, 0.5 = calm)
     links,     // draw connection lines between near dots
     linkDist,  // px distance under which links are drawn
     hueMin, hueMax
   })

   Auto-inits any <canvas data-particle-field> from data-* attrs.
   Respects prefers-reduced-motion (renders a single static frame).
   ============================================================ */
(function () {
  'use strict';

  function createParticleField(canvas, opts) {
    if (!canvas) return;
    opts = opts || {};
    var ctx = canvas.getContext('2d');
    var DPR = Math.min(window.devicePixelRatio || 1, 2);
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    var count    = opts.count != null ? opts.count : 50;
    var speed    = opts.speed != null ? opts.speed : 1;
    var links    = !!opts.links;
    var linkDist = opts.linkDist || 110;
    var hueMin   = opts.hueMin != null ? opts.hueMin : 220;
    var hueMax   = opts.hueMax != null ? opts.hueMax : 280;
    if (opts.opacity != null) canvas.style.opacity = opts.opacity;

    var W = 0, H = 0, particles = [];
    function rand(a, b) { return a + Math.random() * (b - a); }
    function effCount() { return W < 768 ? Math.round(count / 2) : count; }  /* 移动端再减半 */

    function resize() {
      var rect = canvas.parentElement.getBoundingClientRect();
      W = rect.width || window.innerWidth;
      H = rect.height || window.innerHeight;
      canvas.width = Math.round(W * DPR);
      canvas.height = Math.round(H * DPR);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    }

    function build() {
      particles = [];
      var n = effCount();
      for (var i = 0; i < n; i++) {
        var a = rand(0, Math.PI * 2);
        var v = rand(0.05, 0.3) * speed;
        particles.push({
          x: rand(0, W), y: rand(0, H),
          vx: Math.cos(a) * v, vy: Math.sin(a) * v,
          r: rand(0.6, 2.6), hue: rand(hueMin, hueMax),
          phase: rand(0, Math.PI * 2), sp: rand(0.006, 0.02)
        });
      }
    }

    function drawDot(p) {
      var fl = 0.7 + 0.3 * Math.sin(p.phase);
      var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3.5);
      g.addColorStop(0, 'hsla(' + p.hue + ',80%,85%,' + (0.22 * fl) + ')');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'hsla(' + p.hue + ',80%,92%,' + fl + ')';
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
    }

    function drawLinks() {
      for (var i = 0; i < particles.length; i++) {
        for (var j = i + 1; j < particles.length; j++) {
          var dx = particles[i].x - particles[j].x;
          var dy = particles[i].y - particles[j].y;
          var d = Math.hypot(dx, dy);
          if (d < linkDist) {
            var al = (1 - d / linkDist) * 0.10;
            ctx.strokeStyle = 'rgba(167,139,250,' + al + ')';
            ctx.lineWidth = 0.6;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    }

    function render(animate) {
      ctx.clearRect(0, 0, W, H);
      if (animate) {
        for (var i = 0; i < particles.length; i++) {
          var p = particles[i];
          p.phase += p.sp;
          p.x += p.vx; p.y += p.vy;
          if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
          if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;
        }
      }
      if (links) drawLinks();
      for (var k = 0; k < particles.length; k++) drawDot(particles[k]);
    }

    resize(); build();
    window.addEventListener('resize', function () { resize(); build(); if (reduce) render(false); });

    if (reduce) {
      render(false);  /* 减少动画：静止一帧 */
    } else {
      (function loop() { render(true); requestAnimationFrame(loop); })();
    }
  }

  window.createParticleField = createParticleField;

  /* ── auto-init from data attributes ── */
  function initFields() {
    var nodes = document.querySelectorAll('[data-particle-field]');
    Array.prototype.forEach.call(nodes, function (c) {
      createParticleField(c, {
        count:    c.dataset.count    != null ? parseFloat(c.dataset.count)    : 50,
        opacity:  c.dataset.opacity  != null ? parseFloat(c.dataset.opacity)  : 1,
        speed:    c.dataset.speed    != null ? parseFloat(c.dataset.speed)    : 1,
        links:    c.dataset.links === 'true',
        linkDist: c.dataset.linkDist != null ? parseFloat(c.dataset.linkDist) : 110
      });
    });
  }

  if (document.readyState !== 'loading') initFields();
  else document.addEventListener('DOMContentLoaded', initFields);
})();
