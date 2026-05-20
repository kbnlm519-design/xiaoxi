/* ============================================================
   sphere.js — CSS 3D Photo Sphere
   Phase 1: photos appear scattered in 3D space
   Phase 2: fly & assemble into rotating sphere
   Phase 3: interactive — drag / zoom / click to open
   IMPORTANT: animation triggered by IntersectionObserver,
              not on page-load, so scatter is always visible.
   ============================================================ */

(function () {
  'use strict';

  var container = document.getElementById('sphereCanvas');
  if (!container) return;

  var COUNT = 45;
  var R     = 340;   /* sphere radius, px */

  /* ── keyframes ── */
  var sty = document.createElement('style');
  sty.textContent =
    '@keyframes sfFlash{0%{opacity:0}20%{opacity:1}100%{opacity:0}}' +
    '#sphereLoadBar{transition:opacity .5s ease}' +
    '#sphereLoadText{transition:opacity .5s ease}';
  document.head.appendChild(sty);

  /* ── progress bar ── */
  var bar = document.createElement('div');
  bar.id  = 'sphereLoadBar';
  bar.innerHTML = '<div id="sphereLoadFill"></div>';
  container.appendChild(bar);

  var barTxt = document.createElement('div');
  barTxt.id  = 'sphereLoadText';
  barTxt.textContent = 'LOADING · 0 / ' + COUNT;
  container.appendChild(barTxt);

  var loadN = 0;
  var imagesReady = false;   /* true once all thumbnails have finished loading */
  function tick() {
    loadN++;
    var f = document.getElementById('sphereLoadFill');
    var t = document.getElementById('sphereLoadText');
    if (f) f.style.width = Math.round(loadN / COUNT * 100) + '%';
    if (t) t.textContent = 'LOADING · ' + loadN + ' / ' + COUNT;
    if (loadN >= COUNT) {
      imagesReady = true;
      setTimeout(function () {
        bar.style.opacity = barTxt.style.opacity = '0';
      }, 600);
      maybeStart();
    }
  }

  /* ── CSS-3D stage ── */
  var stage = document.createElement('div');
  stage.style.cssText = [
    'position:absolute','inset:0',
    'perspective:900px','overflow:hidden',
    'user-select:none'
  ].join(';');
  container.appendChild(stage);

  /* ── group — rotated by JS ── */
  var grp = document.createElement('div');
  grp.style.cssText = [
    'position:absolute','top:50%','left:50%',
    'width:0','height:0',
    'transform-style:preserve-3d',
    'will-change:transform',
    'transform:rotateX(0deg) rotateY(0deg)'
  ].join(';');
  stage.appendChild(grp);

  /* ══════════════════════════════════════════════
     Build photo nodes — store ALL params up front
  ══════════════════════════════════════════════ */
  var photos = [];
  var nodes  = [];

  for (var i = 0; i < COUNT; i++) {
    var phi   = Math.acos(-1 + (2 * i) / COUNT);
    var theta = Math.sqrt(COUNT * Math.PI) * phi;

    /* sphere-surface angles */
    var lat = 90  - phi   * 180 / Math.PI;   /* +90 top … -90 bottom */
    var lng = -(theta * 180 / Math.PI);      /* azimuth */

    /* random scatter params — stored so they are stable across re-renders */
    var sx  = (Math.random() - 0.5) * (window.innerWidth  * 1.9);
    var sy  = (Math.random() - 0.5) * (window.innerHeight * 1.7);
    var sz  = (Math.random() - 0.5) * 750;
    var rry = Math.random() * 360;            /* random Y-tumble */
    var rrx = (Math.random() - 0.5) * 180;   /* random X-tumble */
    var sr  = (Math.random() - 0.5) * 200;   /* random Z-tilt   */

    photos.push({
      thumb : 'assets/images/thumbs/photo_' + (i + 1) + '.jpg',
      full  : 'assets/images/medium/photo_'  + (i + 1) + '.jpg',
      idx   : i
    });

    var item = document.createElement('div');
    item.style.cssText = [
      'position:absolute',
      'width:110px','height:110px','margin:-55px -55px',
      'transform-style:preserve-3d',
      'pointer-events:none',
      'opacity:0'
    ].join(';');

    var img = document.createElement('img');
    img.alt = ''; img.draggable = false;
    img.style.cssText = [
      'width:100%','height:100%',
      'object-fit:cover','border-radius:8px',
      'display:block','pointer-events:none',
      'box-shadow:0 4px 24px rgba(0,0,0,.72)'
    ].join(';');
    img.onload = img.onerror = tick;
    img.src = photos[i].thumb;

    item.appendChild(img);
    grp.appendChild(item);

    nodes.push({
      item : item, img : img,
      lat  : lat,  lng : lng,
      sx   : sx,   sy  : sy,  sz  : sz,
      rry  : rry,  rrx : rrx, sr  : sr,
      idx  : i
    });

    /* initial state: scatter position, invisible */
    item.style.transform = tfScatter(nodes[i]);
  }

  /* ══════════════════════════════════════════════
     Transform helpers
     SAME function-list in both → CSS can tween!
     scatter : random 3-D position + random angles
     sphere  : origin + sphere angles + radius push
  ══════════════════════════════════════════════ */
  function tfScatter(n) {
    return [
      'translateX('  + n.sx.toFixed(1)  + 'px)',
      'translateY('  + n.sy.toFixed(1)  + 'px)',
      'translateZ('  + n.sz.toFixed(1)  + 'px)',
      'rotateY('     + n.rry.toFixed(2) + 'deg)',   /* random tumble */
      'rotateX('     + n.rrx.toFixed(2) + 'deg)',
      'translateZ(0px)',
      'rotateZ('     + n.sr.toFixed(1)  + 'deg)',
      'scale(0.28)'
    ].join(' ');
  }

  function tfSphere(n) {
    return [
      'translateX(0px)',
      'translateY(0px)',
      'translateZ(0px)',
      'rotateY('  + n.lng.toFixed(2) + 'deg)',      /* sphere angles */
      'rotateX('  + n.lat.toFixed(2) + 'deg)',
      'translateZ(' + R + 'px)',
      'rotateZ(0deg)',
      'scale(1)'
    ].join(' ');
  }

  /* ══════════════════════════════════════════════
     Animation — triggered ONLY when section is
     scrolled into view (IntersectionObserver).
     This guarantees the user SEES the scatter.
  ══════════════════════════════════════════════ */
  var animated = false;

  function startAnimation() {
    if (animated) return;
    animated = true;

    /* ─ Phase 1: staggered scatter fade-in ─ */
    var STAGGER_IN = 16;          /* ms between each photo */
    nodes.forEach(function (n, i) {
      setTimeout(function () {
        n.item.style.transition = 'opacity 0.45s ease';
        n.item.style.opacity    = '1';
      }, i * STAGGER_IN);
    });

    /* ─ Phase 2: assembly ─ */
    var HOLD     = 1100;          /* ms to see scatter before assembly */
    var ASS_OFF  = COUNT * STAGGER_IN + HOLD;   /* ~1820 ms */
    var ASS_LAG  = 20;            /* ms stagger between each photo flying */

    nodes.forEach(function (n, i) {
      setTimeout(function () {
        var dur = (880 + Math.random() * 360).toFixed(0);
        n.item.style.transition =
          'transform ' + dur + 'ms cubic-bezier(0.34,1.52,0.64,1),' +
          'opacity 0.25s ease';
        n.item.style.transform = tfSphere(n);
      }, ASS_OFF + i * ASS_LAG);
    });

    /* ─ Phase 3: enable interaction ─ */
    var ENABLE_T = ASS_OFF + COUNT * ASS_LAG + 1400;

    setTimeout(function () {
      /* glow flash */
      var fl = document.createElement('div');
      fl.style.cssText = [
        'position:absolute','inset:0','z-index:6','pointer-events:none',
        'background:radial-gradient(ellipse 70% 60% at 50% 50%,rgba(167,139,250,.2),transparent 70%)',
        'animation:sfFlash 2s ease forwards'
      ].join(';');
      container.appendChild(fl);
      setTimeout(function () { fl.remove(); }, 2100);

      /* per-item hover + click */
      nodes.forEach(function (n) {
        n.item.style.transition    = 'none';
        n.item.style.pointerEvents = 'auto';
        n.item.style.cursor        = 'pointer';
        n.img.style.transition     = 'transform .22s ease, box-shadow .22s ease';

        n.item.addEventListener('mouseenter', function () {
          if (isDragging) return;
          n.img.style.transform = 'scale(1.22)';
          n.img.style.boxShadow = '0 0 30px rgba(167,139,250,.75),0 8px 28px rgba(0,0,0,.6)';
          container.style.cursor = 'pointer';
          if (window.setCursorHover) window.setCursorHover(true);
        });
        n.item.addEventListener('mouseleave', function () {
          n.img.style.transform = '';
          n.img.style.boxShadow = '0 4px 24px rgba(0,0,0,.72)';
          container.style.cursor = 'grab';
          if (window.setCursorHover) window.setCursorHover(false);
        });
        n.item.addEventListener('click', function () {
          if (hasDragged) return;
          if (window.openLightbox) window.openLightbox(n.idx, photos);
        });
      });

      sphereReady = true;
      velY        = 0.22;
      container.style.cursor = 'grab';
    }, ENABLE_T);
  }

  /* ── Gate assembly on image readiness so the sphere never appears
        half-empty: assemble only once all thumbs are loaded (or a max
        timeout) AND the section has been scrolled into view. ── */
  var inView        = false;
  var startGated    = false;
  var startTimedOut = false;
  var fallbackTimer = null;

  function maybeStart() {
    if (startGated) return;
    if (inView && (imagesReady || startTimedOut)) {
      startGated = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);
      startAnimation();
    }
  }

  var observer = new IntersectionObserver(function (entries) {
    if (entries[0].isIntersecting) {
      observer.disconnect();
      inView = true;
      /* safety net: never wait more than 8s even on very slow networks */
      fallbackTimer = setTimeout(function () {
        startTimedOut = true;
        maybeStart();
      }, 8000);
      maybeStart();
    }
  }, { threshold: 0.18 });
  observer.observe(container);

  /* ══════════════════════════════════════════════
     Sphere rotation — drag / auto-spin / zoom
  ══════════════════════════════════════════════ */
  var rotX = 0, rotY = 0;
  var velX = 0, velY = 0;
  var isDragging  = false;
  var hasDragged  = false;
  var prevX = 0,  prevY = 0;
  var lastInteract = 0;
  var persp        = 900;
  var sphereReady  = false;

  function applyRot() {
    rotX = Math.max(-82, Math.min(82, rotX));
    grp.style.transform =
      'rotateX(' + rotX.toFixed(3) + 'deg) rotateY(' + rotY.toFixed(3) + 'deg)';
  }

  function onDown(e) {
    if (!sphereReady) return;
    isDragging = true; hasDragged = false;
    lastInteract = performance.now();
    var p = e.touches ? e.touches[0] : e;
    prevX = p.clientX; prevY = p.clientY;
    velX  = 0; velY = 0;
    container.style.cursor = 'grabbing';
  }
  function onMove(e) {
    if (!isDragging) return;
    var p  = e.touches ? e.touches[0] : e;
    var dx = p.clientX - prevX;
    var dy = p.clientY - prevY;
    prevX  = p.clientX; prevY = p.clientY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) hasDragged = true;
    rotY += dx * 0.40;
    rotX -= dy * 0.40;
    velY  = dx * 0.13;
    velX  = -dy * 0.13;
    applyRot();
  }
  function onUp() {
    isDragging = false;
    if (sphereReady) container.style.cursor = 'grab';
  }

  container.addEventListener('mousedown',  onDown);
  window.addEventListener('mousemove',     onMove);
  window.addEventListener('mouseup',       onUp);
  container.addEventListener('touchstart', onDown, { passive: true });
  window.addEventListener('touchmove',     onMove, { passive: true });
  window.addEventListener('touchend',      onUp);

  container.addEventListener('wheel', function (e) {
    e.preventDefault();
    persp = Math.max(420, Math.min(1800, persp + e.deltaY * 0.65));
    stage.style.perspective = persp + 'px';
  }, { passive: false });

  /* ── render loop ── */
  function animate() {
    requestAnimationFrame(animate);
    if (!sphereReady || isDragging) return;
    if (performance.now() - lastInteract > 1000) {
      velY += (0.22 - velY) * 0.015;
    }
    velX *= 0.94;
    velY *= 0.97;
    rotX += velX;
    rotY += velY;
    applyRot();
  }
  applyRot();
  animate();

})();
