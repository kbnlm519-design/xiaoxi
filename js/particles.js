/* ============================================================
   particles.js — site-wide interactive ambient layer
   · Fixed canvas behind everything: floating neural network dots
   · Mouse-reactive: dots are gently attracted/repelled by cursor
   · Cursor sparkle trail on movement
   ============================================================ */

(function () {

  // ===== AMBIENT NEURAL NETWORK (background, all sections) =====
  const ambCanvas = document.createElement('canvas');
  ambCanvas.id = 'ambientNet';
  ambCanvas.style.cssText = [
    'position:fixed', 'inset:0', 'pointer-events:none',
    'z-index:2', 'opacity:0', 'transition:opacity 1.8s ease',
    'mix-blend-mode:screen'
  ].join(';');
  document.body.insertBefore(ambCanvas, document.body.firstChild);

  const ambCtx = ambCanvas.getContext('2d');
  let AW = window.innerWidth, AH = window.innerHeight;
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  function ambResize() {
    AW = window.innerWidth; AH = window.innerHeight;
    ambCanvas.width = AW * DPR; ambCanvas.height = AH * DPR;
    ambCanvas.style.width = AW + 'px'; ambCanvas.style.height = AH + 'px';
    ambCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  ambResize();
  window.addEventListener('resize', () => { ambResize(); buildAmbDots(); });

  // Fade in after moons animation finishes (~3.5 s)
  setTimeout(() => { ambCanvas.style.opacity = '1'; }, 3500);

  const AMB_COUNT = 55;
  let ambDots = [];

  function buildAmbDots() {
    ambDots = Array.from({ length: AMB_COUNT }, () => ({
      x: Math.random() * AW,
      y: Math.random() * AH,
      vx: (Math.random() - 0.5) * 0.22,
      vy: (Math.random() - 0.5) * 0.22,
      r: Math.random() * 1.8 + 0.5,
      phase: Math.random() * Math.PI * 2,
      speed: 0.006 + Math.random() * 0.014,
    }));
  }
  buildAmbDots();

  let amx = AW / 2, amy = AH / 2;
  window.addEventListener('mousemove', e => { amx = e.clientX; amy = e.clientY; });

  const AMB_LINK_DIST = 110;

  function ambDraw() {
    ambCtx.clearRect(0, 0, AW, AH);

    ambDots.forEach(d => {
      d.phase += d.speed;
      d.x += d.vx; d.y += d.vy;
      if (d.x < 0) d.x = AW; if (d.x > AW) d.x = 0;
      if (d.y < 0) d.y = AH; if (d.y > AH) d.y = 0;

      // gentle mouse repulsion
      const dx = d.x - amx, dy = d.y - amy;
      const dist = Math.hypot(dx, dy);
      if (dist < 140 && dist > 0) {
        const force = (140 - dist) / 140 * 0.055;
        d.vx += dx / dist * force;
        d.vy += dy / dist * force;
      }
      d.vx *= 0.994; d.vy *= 0.994;
    });

    // draw connections
    for (let i = 0; i < ambDots.length; i++) {
      for (let j = i + 1; j < ambDots.length; j++) {
        const dx = ambDots[i].x - ambDots[j].x;
        const dy = ambDots[i].y - ambDots[j].y;
        const d = Math.hypot(dx, dy);
        if (d < AMB_LINK_DIST) {
          const a = (1 - d / AMB_LINK_DIST) * 0.10;
          ambCtx.strokeStyle = `rgba(167,139,250,${a})`;
          ambCtx.lineWidth = 0.6;
          ambCtx.beginPath();
          ambCtx.moveTo(ambDots[i].x, ambDots[i].y);
          ambCtx.lineTo(ambDots[j].x, ambDots[j].y);
          ambCtx.stroke();
        }
      }
    }

    // draw dots
    ambDots.forEach(d => {
      const a = 0.12 + 0.08 * Math.sin(d.phase);
      ambCtx.fillStyle = `rgba(180,155,255,${a})`;
      ambCtx.beginPath();
      ambCtx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
      ambCtx.fill();
    });

    requestAnimationFrame(ambDraw);
  }
  ambDraw();

  // ===== CURSOR SPARKLE TRAIL =====
  const spCanvas = document.createElement('canvas');
  spCanvas.id = 'sparkleTrail';
  spCanvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:998;';
  document.body.appendChild(spCanvas);

  const spCtx = spCanvas.getContext('2d');
  let SW = window.innerWidth, SH = window.innerHeight;

  function spResize() {
    SW = window.innerWidth; SH = window.innerHeight;
    spCanvas.width = SW * DPR; spCanvas.height = SH * DPR;
    spCanvas.style.width = SW + 'px'; spCanvas.style.height = SH + 'px';
    spCtx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  spResize();
  window.addEventListener('resize', spResize);

  const sparks = [];
  let smx = -200, smy = -200, lastSmx = -200, lastSmy = -200;

  window.addEventListener('mousemove', e => {
    lastSmx = smx; lastSmy = smy;
    smx = e.clientX; smy = e.clientY;

    const dist = Math.hypot(smx - lastSmx, smy - lastSmy);
    const count = Math.min(5, Math.ceil(dist / 10));

    for (let i = 0; i < count; i++) {
      const t = i / Math.max(count - 1, 1);
      const px = lastSmx + (smx - lastSmx) * t;
      const py = lastSmy + (smy - lastSmy) * t;
      const hue = Math.random() < 0.55 ? 250 + Math.random() * 30 : 285 + Math.random() * 25;
      sparks.push({
        x: px + (Math.random() - 0.5) * 6,
        y: py + (Math.random() - 0.5) * 6,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2 - 0.4,
        r: Math.random() * 2.2 + 0.8,
        life: 1,
        decay: 0.018 + Math.random() * 0.022,
        hue,
      });
    }
  });

  function spDraw() {
    spCtx.clearRect(0, 0, SW, SH);

    for (let i = sparks.length - 1; i >= 0; i--) {
      const p = sparks[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy -= 0.025;
      p.life -= p.decay;

      if (p.life <= 0) { sparks.splice(i, 1); continue; }

      const a = p.life * 0.55;
      const r = p.r * p.life;

      const g = spCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3.5);
      g.addColorStop(0, `hsla(${p.hue},100%,82%,${a})`);
      g.addColorStop(1, `hsla(${p.hue},100%,82%,0)`);
      spCtx.fillStyle = g;
      spCtx.beginPath();
      spCtx.arc(p.x, p.y, r * 3.5, 0, Math.PI * 2);
      spCtx.fill();

      spCtx.fillStyle = `hsla(${p.hue},80%,92%,${a * 0.85})`;
      spCtx.beginPath();
      spCtx.arc(p.x, p.y, r, 0, Math.PI * 2);
      spCtx.fill();
    }

    requestAnimationFrame(spDraw);
  }
  spDraw();

})();
