/* ============================================================
   hero.js — Hero section center content & animation sequence
   Handles: name display, terminal typewriter, subtitle cycling,
            entry animation, parallax, hover, click ripple
   Depends on: moons.js (window.heroParticles API)
   ============================================================ */
(function () {
  'use strict';

  var sec1 = document.getElementById('sec-1');
  if (!sec1) return;

  /* --- Accessibility: reduce motion --- */
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* --- First-visit gate --- */
  var isFirstVisit = !sessionStorage.getItem('xiaoxi_intro_played');

  /* --- Subtitle sentences --- */
  var subtitles = [
    '小溪 · 一个用 AI 创造的人',
    '我用 AI 设计，也被 AI 设计',
    'Human heart. Machine mind.',
    'Designed by feeling, dreamt by code',
    '一半少女，一半程序'
  ];
  var subIdx = 0;
  var subCycleTimer = null;

  /* ============================================================
     Inject styles
     ============================================================ */
  var style = document.createElement('style');
  style.textContent = [
    '#hero-center {',
    '  position: absolute;',
    '  top: 50%; left: 50%;',
    '  transform: translate(-50%, -50%);',
    '  display: flex; flex-direction: column; align-items: center;',
    '  pointer-events: none;',
    '  z-index: 3;',
    '  will-change: transform;',
    '}',

    '#hero-name {',
    '  font-family: "Fraunces","Cormorant Garamond",Georgia,"Times New Roman",serif;',
    '  font-size: clamp(60px,18vw,260px);',
    '  font-weight: 300;',
    '  color: #F0EAFF;',
    '  line-height: 1;',
    '  letter-spacing: 0;',
    '  opacity: 0;',
    '  filter: blur(20px);',
    '  user-select: none;',
    '  cursor: default;',
    '  pointer-events: auto;',
    '  transition: letter-spacing 0.4s ease, text-shadow 0.4s ease;',
    '}',

    '#hero-name.breathing {',
    '  animation: heroBreath 2.4s ease-in-out infinite;',
    '}',

    '@keyframes heroBreath {',
    '  0%,100% { opacity: 1.0; }',
    '  50%      { opacity: 0.92; }',
    '}',

    '#hero-name.hovered {',
    '  letter-spacing: 0.05em;',
    '  text-shadow: 0 0 30px rgba(164,139,255,0.4);',
    '}',

    '#hero-subtitle {',
    '  position: relative;',
    '  height: 28px;',
    '  margin-top: 60px;',
    '  display: flex; align-items: center; justify-content: center;',
    '  overflow: visible;',
    '}',

    '.sub-line {',
    '  position: absolute;',
    '  font-family: "JetBrains Mono","SF Mono",Consolas,"Courier New",monospace;',
    '  font-size: clamp(12px,1.4vw,18px);',
    '  letter-spacing: 0.15em;',
    '  color: rgba(240,234,255,0.6);',
    '  white-space: nowrap;',
    '  opacity: 0;',
    '  filter: blur(8px);',
    '  transform: translateY(10px);',
    '  transition: opacity 0.5s ease, filter 0.5s ease, transform 0.5s ease;',
    '}',

    '.sub-line.visible {',
    '  opacity: 1;',
    '  filter: blur(0px);',
    '  transform: translateY(0px);',
    '}',

    '.sub-line.exit-up {',
    '  opacity: 0;',
    '  filter: blur(6px);',
    '  transform: translateY(-10px);',
    '}',

    '#hero-terminal {',
    '  position: absolute;',
    '  left: 80px;',
    '  bottom: 120px;',
    '  font-family: "JetBrains Mono","SF Mono",Consolas,"Courier New",monospace;',
    '  font-size: 13px;',
    '  line-height: 1.85;',
    '  color: rgba(255,255,255,0.5);',
    '  z-index: 4;',
    '  pointer-events: none;',
    '  opacity: 1;',
    '  transition: opacity 0.5s ease;',
    '}',

    '@media (max-width: 768px) {',
    '  #hero-name { font-size: 28vw; }',
    '  .sub-line { font-size: 14px; }',
    '  #hero-terminal { left: 24px; bottom: 80px; }',
    '}'
  ].join('\n');
  document.head.appendChild(style);

  /* ============================================================
     Build DOM
     ============================================================ */
  var center = document.createElement('div');
  center.id = 'hero-center';

  var nameEl = document.createElement('div');
  nameEl.id = 'hero-name';
  nameEl.textContent = 'Xiaoxi';
  nameEl.setAttribute('aria-label', 'Xiaoxi');

  var subWrap = document.createElement('div');
  subWrap.id = 'hero-subtitle';

  /* Two alternating spans for crossfade */
  var subA = document.createElement('span');
  subA.className = 'sub-line';
  subA.textContent = subtitles[0];
  var subB = document.createElement('span');
  subB.className = 'sub-line';
  subB.textContent = subtitles[1];
  subWrap.appendChild(subA);
  subWrap.appendChild(subB);

  center.appendChild(nameEl);
  center.appendChild(subWrap);
  sec1.appendChild(center);

  var terminal = document.createElement('div');
  terminal.id = 'hero-terminal';
  sec1.appendChild(terminal);

  /* ============================================================
     Typewriter
     ============================================================ */
  var typingQueue = [];
  var isTyping = false;

  function typewriterLine(text, callback) {
    var line = document.createElement('div');
    terminal.appendChild(line);
    var i = 0;
    function tick() {
      if (i < text.length) {
        line.textContent += text[i++];
        setTimeout(tick, 30);
      } else if (callback) {
        callback();
      }
    }
    tick();
  }

  /* ============================================================
     Name reveal
     ============================================================ */
  function revealName() {
    nameEl.style.transition = 'opacity 1.2s ease, filter 1.2s ease, letter-spacing 0.4s ease, text-shadow 0.4s ease';
    nameEl.style.opacity = '1';
    nameEl.style.filter  = 'blur(0px)';
  }

  function startBreathing() {
    nameEl.style.transition = 'letter-spacing 0.4s ease, text-shadow 0.4s ease';
    nameEl.classList.add('breathing');
  }

  /* ============================================================
     Subtitle cycling
     ============================================================ */
  var currentSub = subA;
  var nextSub    = subB;
  var subInitialized = false;

  function showFirstSubtitle() {
    subA.textContent = subtitles[0];
    subA.classList.add('visible');
    subInitialized = true;
  }

  function cycleSubtitle() {
    subIdx = (subIdx + 1) % subtitles.length;
    nextSub.textContent = subtitles[subIdx];
    nextSub.classList.remove('visible', 'exit-up');
    nextSub.style.transform = 'translateY(10px)';

    /* current exits upward */
    currentSub.classList.remove('visible');
    currentSub.classList.add('exit-up');

    /* next fades in 0.1s later */
    setTimeout(function () {
      nextSub.classList.add('visible');
      /* swap roles */
      var tmp = currentSub;
      currentSub = nextSub;
      nextSub = tmp;
    }, 100);

    /* clean up exit class after transition */
    setTimeout(function () {
      nextSub.classList.remove('exit-up');
    }, 650);
  }

  function startSubtitleCycle() {
    subCycleTimer = setInterval(cycleSubtitle, 8000);
  }

  /* ============================================================
     Skip-to-idle (return visit / reduced motion)
     ============================================================ */
  function enterIdleImmediately() {
    terminal.style.display = 'none';

    nameEl.style.transition = 'none';
    nameEl.style.opacity = '1';
    nameEl.style.filter  = 'blur(0px)';
    /* defer breathing class to next frame so transition:none takes effect */
    requestAnimationFrame(function () {
      startBreathing();
    });

    showFirstSubtitle();
    startSubtitleCycle();
    startParallax();
    attachNameHover();

    if (window.heroParticles) window.heroParticles.skipToIdle();
  }

  /* ============================================================
     Full entry sequence (first visit)
     ============================================================ */
  function runEntrySequence() {
    var T = function(ms, fn) { setTimeout(fn, ms); };

    /* 0.2s: terminal line 1 */
    T(200, function () {
      typewriterLine('> initializing neural network...');
    });

    /* 1.0s: terminal line 2 */
    T(1000, function () {
      typewriterLine('> loading creator.profile');
    });

    /* 1.7s: terminal line 3 */
    T(1700, function () {
      typewriterLine('> identity matrix: resolving...');
    });

    /* 2.2s: particles start converging */
    T(2200, function () {
      if (window.heroParticles) window.heroParticles.startSequence();
    });

    /* 3.9s: fade out terminal */
    T(3900, function () {
      terminal.style.opacity = '0';
    });

    /* 4.3s: reveal name */
    T(4300, function () {
      revealName();
    });

    /* 5.5s: show subtitle */
    T(5500, function () {
      showFirstSubtitle();
    });

    /* 6.5s: idle state, attach interactivity */
    T(6500, function () {
      sessionStorage.setItem('xiaoxi_intro_played', '1');
      startBreathing();
      startSubtitleCycle();
      startParallax();
      attachNameHover();
      terminal.style.display = 'none';
    });
  }

  /* ============================================================
     Parallax (lerp follow)
     ============================================================ */
  var pMouseX = 0, pMouseY = 0;
  var pCurrX  = 0, pCurrY  = 0;
  var parallaxRunning = false;

  function startParallax() {
    if (parallaxRunning) return;
    parallaxRunning = true;

    document.addEventListener('mousemove', function (e) {
      var vw = window.innerWidth, vh = window.innerHeight;
      pMouseX = ((e.clientX / vw) - 0.5) * -30;  /* ±15 at edges */
      pMouseY = ((e.clientY / vh) - 0.5) * -30;
    });

    function parallaxLoop() {
      if (!parallaxRunning) return;
      pCurrX += (pMouseX - pCurrX) * 0.07;
      pCurrY += (pMouseY - pCurrY) * 0.07;
      var tx = Math.max(-15, Math.min(15, pCurrX));
      var ty = Math.max(-15, Math.min(15, pCurrY));
      center.style.transform = 'translate(calc(-50% + ' + tx.toFixed(2) + 'px), calc(-50% + ' + ty.toFixed(2) + 'px))';
      requestAnimationFrame(parallaxLoop);
    }
    parallaxLoop();
  }

  /* ============================================================
     Name hover
     ============================================================ */
  function attachNameHover() {
    nameEl.addEventListener('mouseenter', function () {
      nameEl.classList.add('hovered');
      if (window.heroParticles) window.heroParticles.setHover(true);
    });
    nameEl.addEventListener('mouseleave', function () {
      nameEl.classList.remove('hovered');
      if (window.heroParticles) window.heroParticles.setHover(false);
    });
    nameEl.style.pointerEvents = 'auto';
  }

  /* ============================================================
     Click ripple (on sec-1 background)
     ============================================================ */
  sec1.addEventListener('click', function (e) {
    /* ignore clicks on name element itself */
    if (e.target === nameEl) return;
    if (window.heroParticles) window.heroParticles.addRipple(e.clientX, e.clientY);
  });

  /* ============================================================
     Boot — wait for intro to be dismissed
     ============================================================ */
  function boot() {
    if (reducedMotion) {
      enterIdleImmediately();
      return;
    }

    if (!isFirstVisit) {
      enterIdleImmediately();
      return;
    }

    /* First visit: run full sequence */
    runEntrySequence();
  }

  /* Intro overlay is dismissed by user click — then we start */
  window.addEventListener('intro-dismissed', function () {
    boot();
  });

  /* Safety: if intro already gone (edge case), boot immediately */
  if (window.introReady) boot();

})();
