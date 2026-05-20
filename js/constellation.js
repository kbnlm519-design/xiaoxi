/* ============================================================
   constellation.js — interactive star field for outro section
   · Drifting stars with connecting lines
   · Mouse attracts nearby stars
   · Stars pulse and twinkle
   ============================================================ */

(function () {
  const canvas = document.getElementById('constCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const section = document.getElementById('sec-6');
  let W = 0, H = 0;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  let running = false;

  function resize() {
    const r = (section || canvas.parentElement).getBoundingClientRect();
    W = r.width || window.innerWidth;
    H = r.height || window.innerHeight;
    canvas.width = W * DPR; canvas.height = H * DPR;
    canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }

  const STAR_COUNT = 130;
  let stars = [];

  function buildStars() {
    stars = Array.from({ length: STAR_COUNT }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.14,
      vy: (Math.random() - 0.5) * 0.14,
      r: Math.random() * 1.5 + 0.3,
      phase: Math.random() * Math.PI * 2,
      twinkleSpeed: 0.004 + Math.random() * 0.016,
      hue: 240 + Math.random() * 60,
    }));
  }

  let mx = -9999, my = -9999;
  if (section) {
    section.addEventListener('mousemove', e => {
      const r = section.getBoundingClientRect();
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
    });
    section.addEventListener('mouseleave', () => { mx = -9999; my = -9999; });
  }

  const LINK_DIST = 115;
  const ATTRACT_RADIUS = 160;
  const ATTRACT_FORCE = 0.09;

  function draw() {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);

    stars.forEach(s => {
      s.phase += s.twinkleSpeed;
      s.x += s.vx; s.y += s.vy;

      // wrap
      if (s.x < -8) s.x = W + 8;
      if (s.x > W + 8) s.x = -8;
      if (s.y < -8) s.y = H + 8;
      if (s.y > H + 8) s.y = -8;

      // mouse attraction
      if (mx > -100) {
        const dx = mx - s.x, dy = my - s.y;
        const d = Math.hypot(dx, dy);
        if (d < ATTRACT_RADIUS && d > 0) {
          const f = (ATTRACT_RADIUS - d) / ATTRACT_RADIUS * ATTRACT_FORCE;
          s.vx += dx / d * f;
          s.vy += dy / d * f;
        }
      }
      // dampen
      s.vx *= 0.992; s.vy *= 0.992;
    });

    // draw connections
    for (let i = 0; i < stars.length; i++) {
      for (let j = i + 1; j < stars.length; j++) {
        const dx = stars[i].x - stars[j].x;
        const dy = stars[i].y - stars[j].y;
        const d = Math.hypot(dx, dy);
        if (d < LINK_DIST) {
          const a = (1 - d / LINK_DIST) * 0.28;
          const midHue = (stars[i].hue + stars[j].hue) / 2;
          ctx.strokeStyle = `hsla(${midHue}, 80%, 75%, ${a})`;
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(stars[i].x, stars[i].y);
          ctx.lineTo(stars[j].x, stars[j].y);
          ctx.stroke();
        }
      }
    }

    // draw stars
    stars.forEach(s => {
      const glow = 0.55 + 0.45 * Math.sin(s.phase);
      const coreA = 0.7 + 0.3 * Math.sin(s.phase * 1.3);

      // halo
      const g = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 5);
      g.addColorStop(0, `hsla(${s.hue}, 90%, 82%, ${glow * 0.45})`);
      g.addColorStop(1, 'hsla(0,0%,0%,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r * 5, 0, Math.PI * 2);
      ctx.fill();

      // core
      ctx.fillStyle = `hsla(${s.hue}, 60%, 92%, ${coreA})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();

      // cross sparkle for brighter stars
      if (s.r > 1.2) {
        const len = s.r * 3.5 * glow;
        ctx.strokeStyle = `hsla(${s.hue}, 80%, 90%, ${glow * 0.3})`;
        ctx.lineWidth = 0.5;
        ctx.beginPath();
        ctx.moveTo(s.x - len, s.y); ctx.lineTo(s.x + len, s.y);
        ctx.moveTo(s.x, s.y - len); ctx.lineTo(s.x, s.y + len);
        ctx.stroke();
      }
    });

    requestAnimationFrame(draw);
  }

  function init() {
    if (running) return;
    running = true;
    resize();
    buildStars();
    draw();
  }

  window.addEventListener('resize', () => {
    if (!running) return;
    resize();
  });

  // Start lazily when section enters view
  const io = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) {
      init();
      io.disconnect();
    }
  }, { threshold: 0.08 });

  if (section) io.observe(section);
  else init();

})();
