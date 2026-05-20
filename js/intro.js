/* ============================================================
   intro.js — cinematic landing animation
   Moon particles scatter → converge to "AI" → Enter button
   Preloads sphere thumbnail images while animation plays
   ============================================================ */

(function () {
  const overlay = document.getElementById('intro-overlay');
  const canvas  = document.getElementById('introCanvas');
  if (!overlay || !canvas) return;

  const ctx = canvas.getContext('2d');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  let W = window.innerWidth, H = window.innerHeight;

  // State variables declared early — used inside resize() which is called immediately
  const MOON_COUNT = 160;
  let phase        = 'scatter';
  let t0           = performance.now();
  let enterShown   = false;
  let dismissed    = false;
  const SCATTER_TIME = 1100;
  const GATHER_TIME  = 1900;
  const moons = [];
  const rand = (a, b) => a + Math.random() * (b - a);

  // ─── Canvas sizing ───
  function resize() {
    W = window.innerWidth; H = window.innerHeight;
    canvas.width  = W * DPR; canvas.height = H * DPR;
    canvas.style.width  = W + 'px'; canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (phase !== 'scatter') buildTargets();
  }
  resize();
  window.addEventListener('resize', resize);

  // ─── Phase label ───
  const phaseEl = document.createElement('div');
  phaseEl.id = 'intro-phase';
  phaseEl.textContent = '[ INIT ] · scattering';
  overlay.appendChild(phaseEl);

  // ─── Sample "AI" letter pixels for target positions ───
  let targets = [];
  function buildTargets() {
    const off = document.createElement('canvas');
    off.width = W; off.height = H;
    const c = off.getContext('2d');
    const fs = Math.min(W * 0.44, H * 0.68);
    c.font = `900 ${fs}px "Cormorant Garamond","Georgia",serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = '#fff';
    c.fillText('AI', W / 2, H / 2 - H * 0.04);

    const img = c.getImageData(0, 0, W, H);
    targets = [];
    let step = Math.max(3, Math.round(Math.sqrt((W * H) / (MOON_COUNT * 28))));
    for (let attempt = 0; attempt < 4; attempt++) {
      targets = [];
      for (let y = 0; y < H; y += step)
        for (let x = 0; x < W; x += step)
          if (img.data[(y * W + x) * 4 + 3] > 128) targets.push({ x, y });
      if (targets.length >= MOON_COUNT) break;
      step = Math.max(2, step - 1);
    }
    // Fisher-Yates shuffle
    for (let i = targets.length - 1; i > 0; i--) {
      const j = (Math.random() * (i + 1)) | 0;
      [targets[i], targets[j]] = [targets[j], targets[i]];
    }
  }

  // ─── Moon particles ───

  function createMoons() {
    moons.length = 0;
    for (let i = 0; i < MOON_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = rand(3.5, 8.5);
      moons.push({
        x:  W / 2 + rand(-60, 60),
        y:  H / 2 + rand(-60, 60),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        r:  rand(2.5, 7.5),
        tx: 0, ty: 0,
        hue:   rand(215, 285),
        phase: rand(0, Math.PI * 2),
      });
    }
  }

  function assignTargets() {
    const used = new Uint8Array(targets.length || 1);
    moons.forEach(m => {
      let best = -1, bestD = Infinity;
      for (let k = 0; k < 28; k++) {
        const i = (Math.random() * targets.length) | 0;
        if (used[i]) continue;
        const dx = targets[i].x - m.x, dy = targets[i].y - m.y;
        const d = dx * dx + dy * dy;
        if (d < bestD) { bestD = d; best = i; }
      }
      if (best === -1)
        for (let k = 0; k < targets.length; k++) if (!used[k]) { best = k; break; }
      if (best !== -1) { used[best] = 1; m.tx = targets[best].x; m.ty = targets[best].y; }
      else { m.tx = m.x; m.ty = m.y; }
    });
  }

  // ─── Draw a single moon ───
  function drawMoon(m) {
    // glow halo
    const g = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.r * 5);
    g.addColorStop(0,   `hsla(${m.hue},100%,88%,.40)`);
    g.addColorStop(0.4, `hsla(${m.hue},100%,75%,.10)`);
    g.addColorStop(1,   'hsla(0,0%,0%,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(m.x, m.y, m.r * 5, 0, Math.PI * 2); ctx.fill();

    // core dot
    const flicker = 0.86 + 0.14 * Math.sin(m.phase);
    ctx.fillStyle = `rgba(248,244,255,${flicker})`;
    ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2); ctx.fill();
  }

  // ─── State machine loop ───
  function loop() {
    if (dismissed) return;
    const elapsed = performance.now() - t0;
    ctx.clearRect(0, 0, W, H);

    if (phase === 'scatter' && elapsed >= SCATTER_TIME) {
      phase = 'gather';
      t0 = performance.now();
      buildTargets();
      assignTargets();
      phaseEl.textContent = '[ CONVERGE ] · forming patterns';
    }
    if (phase === 'gather' && elapsed >= GATHER_TIME) {
      phase = 'settled';
      phaseEl.style.opacity = '0';
      if (!enterShown) {
        enterShown = true;
        setTimeout(() => {
          const enterEl = document.getElementById('intro-enter');
          if (enterEl) enterEl.classList.add('visible');
        }, 320);
      }
    }

    moons.forEach(m => {
      m.phase += 0.042;
      if (phase === 'scatter') {
        m.x += m.vx; m.y += m.vy;
        // velocity is already damped by the interval below
      } else {
        const k = phase === 'settled' ? 0.055 : 0.070;
        m.x += (m.tx - m.x) * k;
        m.y += (m.ty - m.y) * k;
      }
      drawMoon(m);
    });

    requestAnimationFrame(loop);
  }

  // ─── Dismiss handler ───
  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    // Signal the rest of the page
    window.introReady = true;
    window.dispatchEvent(new CustomEvent('intro-dismissed'));
    // Fade out and remove
    overlay.style.transition = 'opacity 0.9s cubic-bezier(.4,0,.2,1)';
    overlay.style.opacity = '0';
    setTimeout(() => {
      overlay.style.display = 'none';
      overlay.remove();
    }, 950);
  }

  overlay.addEventListener('click', dismiss);
  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && !dismissed) dismiss();
  });

  // ─── Page load progress bar ───
  const loadBar = document.getElementById('page-load-bar');
  const TOTAL_ASSETS = 45;
  let loadedCount = 0;

  function setBarProgress(pct) {
    if (!loadBar) return;
    loadBar.style.width = pct + '%';
  }

  function onAssetLoad() {
    loadedCount++;
    // 10% reserved for window.load; images fill 0→90%
    setBarProgress(Math.round(loadedCount / TOTAL_ASSETS * 90));
  }

  function finishBar() {
    if (!loadBar) return;
    loadBar.style.width = '100%';
    setTimeout(() => loadBar.classList.add('complete'), 300);
  }

  window.addEventListener('load', finishBar);

  // ─── Preload sphere images while animation plays ───
  function preloadSphere() {
    setBarProgress(2); // show a tiny sliver immediately
    for (let i = 1; i <= 45; i++) {
      const img = new Image();
      img.onload = img.onerror = onAssetLoad;
      img.src = `assets/images/thumbs/photo_${i}.jpg`;
    }
  }
  setTimeout(preloadSphere, 80);

  // ─── Damp scatter velocity smoothly ───
  const damper = setInterval(() => {
    moons.forEach(m => { m.vx *= 0.91; m.vy *= 0.91; });
  }, 32);
  setTimeout(() => clearInterval(damper), SCATTER_TIME);

  createMoons();
  loop();

})();
