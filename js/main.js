/* ============================================================
   main.js — full interactions
   Lenis smooth scroll · GSAP ScrollTrigger · cursor · BGM
   video controls · counter · 3D tilt · magnetic button
   ============================================================ */

(function () {

  // ===== LENIS SMOOTH SCROLL =====
  let lenis;
  if (typeof Lenis !== 'undefined') {
    lenis = new Lenis({
      duration: 1.25,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    function lenisRAF(time) { lenis.raf(time); requestAnimationFrame(lenisRAF); }
    requestAnimationFrame(lenisRAF);
  }

  // ===== GSAP + SCROLLTRIGGER =====
  if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
    gsap.registerPlugin(ScrollTrigger);
    if (lenis) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => lenis.raf(time * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  }

  // ===== UTILS =====
  const $ = (sel, ctx) => (ctx || document).querySelector(sel);
  const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

  // ===== YEAR & CLOCK =====
  const yearEl = $('#yr');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const clockEl = $('#clock');
  if (clockEl) {
    const tick = () => {
      const n = new Date();
      clockEl.textContent = [n.getHours(), n.getMinutes(), n.getSeconds()]
        .map(v => String(v).padStart(2, '0')).join(':');
    };
    tick();
    setInterval(tick, 1000);
  }

  // ===== CUSTOM CURSOR =====
  const cursorEl = $('#cursor');
  const cursorDot = $('.cursor-dot');
  const cursorRing = $('.cursor-ring');
  const cursorLabel = $('.cursor-label');
  let mx = window.innerWidth / 2, my = window.innerHeight / 2;
  let rx = mx, ry = my;

  window.addEventListener('mousemove', (e) => {
    mx = e.clientX; my = e.clientY;
    if (cursorDot) cursorDot.style.transform = `translate(${mx}px,${my}px) translate(-50%,-50%)`;
  });

  (function tickCursor() {
    rx += (mx - rx) * 0.12;
    ry += (my - ry) * 0.12;
    if (cursorRing) cursorRing.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`;
    requestAnimationFrame(tickCursor);
  })();

  // Context-aware cursor: data-cursor attribute
  document.addEventListener('mouseover', (e) => {
    const el = e.target.closest('[data-cursor]');
    if (el && cursorEl) {
      const type = el.dataset.cursor;
      cursorEl.className = `cursor ${type} label`;
      const labels = { drag: 'DRAG', play: 'PLAY', open: 'OPEN' };
      if (cursorLabel) cursorLabel.textContent = labels[type] || '';
      return;
    }
    if (e.target.closest('a, button') && cursorRing) {
      cursorRing.classList.add('hover');
    }
  });

  document.addEventListener('mouseout', (e) => {
    const el = e.target.closest('[data-cursor]');
    if (el && cursorEl) {
      cursorEl.className = 'cursor';
    }
    if (e.target.closest('a, button') && cursorRing) {
      if (!e.relatedTarget || !e.relatedTarget.closest('a, button')) {
        cursorRing.classList.remove('hover');
      }
    }
  });

  window.setCursorHover = (on) => cursorRing && cursorRing.classList.toggle('hover', !!on);

  // ===== BGM =====
  const bgm = $('#bgm');
  const bgmBtn = $('#bgmControl');
  if (bgm && bgmBtn) {
    fetch('assets/audio/bgm.mp3', { method: 'HEAD' }).catch(() => {
      bgmBtn.style.opacity = '0.4';
      bgmBtn.title = '暂无 BGM — 请放置 assets/audio/bgm.mp3';
    });
    bgmBtn.addEventListener('click', async () => {
      if (bgm.paused) {
        try {
          bgm.volume = 0.5;
          await bgm.play();
          bgmBtn.classList.add('playing');
        } catch (e) { console.warn('BGM play failed', e); }
      } else {
        bgm.pause();
        bgmBtn.classList.remove('playing');
      }
    });
  }

  // ===== SCROLL PROGRESS =====
  const progressFill = $('#progressFill');
  const pLabels = $$('.p-label');
  function updateProgress() {
    const pct = window.scrollY / (document.documentElement.scrollHeight - window.innerHeight) * 100 || 0;
    if (progressFill) progressFill.style.height = pct.toFixed(2) + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  updateProgress();

  // ===== SECTION DETECTION =====
  const sections = $$('.section');
  const navDots = $$('.side-nav .dot');
  let currentIdx = 0;

  function setActive(idx) {
    if (idx === currentIdx) return;
    currentIdx = idx;
    sections.forEach((s, i) => s.classList.toggle('in-view', i === idx));
    navDots.forEach((d, i) => d.classList.toggle('active', i === idx));
    pLabels.forEach((l, i) => l.classList.toggle('active', i === idx));
  }

  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) setActive(parseInt(en.target.dataset.idx, 10));
    });
  }, { threshold: 0.5 });
  sections.forEach(s => io.observe(s));

  navDots.forEach(d => {
    d.addEventListener('click', e => {
      e.preventDefault();
      const target = sections[parseInt(d.dataset.idx, 10)];
      if (target) {
        if (lenis) lenis.scrollTo(target, { duration: 1.6 });
        else target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  });
  setActive(0);

  // ===== LIGHTBOX =====
  const lb = $('#lightbox');
  const lbImg = $('#lightboxImg');
  const lbCounter = $('#lightboxCounter');
  let lbPhotos = [], lbIdx = 0;

  function showLB(i) {
    if (!lbPhotos.length) return;
    lbIdx = ((i % lbPhotos.length) + lbPhotos.length) % lbPhotos.length;
    lbImg.src = lbPhotos[lbIdx].full;
    lbCounter.textContent = `${lbIdx + 1} / ${lbPhotos.length}`;
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
    if (lenis) lenis.stop();
  }
  function hideLB() {
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    setTimeout(() => { if (lbImg) lbImg.src = ''; }, 300);
    if (lenis) lenis.start();
  }

  window.openLightbox = (idx, photos) => { lbPhotos = photos; showLB(idx); };
  if (lb) {
    lb.addEventListener('click', e => { if (e.target === lb) hideLB(); });
    $('#lightboxClose')?.addEventListener('click', hideLB);
    $('#lightboxPrev')?.addEventListener('click', e => { e.stopPropagation(); showLB(lbIdx - 1); });
    $('#lightboxNext')?.addEventListener('click', e => { e.stopPropagation(); showLB(lbIdx + 1); });
  }
  document.addEventListener('keydown', e => {
    if (!lb?.classList.contains('open')) return;
    if (e.key === 'Escape') hideLB();
    if (e.key === 'ArrowLeft') showLB(lbIdx - 1);
    if (e.key === 'ArrowRight') showLB(lbIdx + 1);
  });

  // ===== VIDEO CONTROLS =====
  const showreel = $('#showreel');
  const videoFrame = $('#videoFrame');
  const vTime = $('#vTime');
  const vDur = $('#vDur');
  const vBarFill = document.getElementById('vBarFill');
  const vBar = $('#vBar');
  const vMute = $('#vMute');

  function fmt(s) {
    return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  }

  if (showreel && videoFrame) {
    videoFrame.addEventListener('click', async () => {
      if (showreel.paused) {
        showreel.muted = false;
        try { await showreel.play(); } catch (_) {
          showreel.muted = true;
          await showreel.play();
        }
        videoFrame.classList.add('playing');
      } else {
        showreel.pause();
        videoFrame.classList.remove('playing');
      }
    });
    showreel.addEventListener('timeupdate', () => {
      if (vTime) vTime.textContent = fmt(showreel.currentTime);
      if (vBarFill && showreel.duration)
        vBarFill.style.width = (showreel.currentTime / showreel.duration * 100) + '%';
    });
    showreel.addEventListener('loadedmetadata', () => {
      if (vDur) vDur.textContent = fmt(showreel.duration);
    });
    showreel.addEventListener('ended', () => { videoFrame.classList.remove('playing'); });
    if (vBar) {
      vBar.addEventListener('click', e => {
        const r = vBar.getBoundingClientRect();
        if (showreel.duration) showreel.currentTime = ((e.clientX - r.left) / r.width) * showreel.duration;
      });
    }
    if (vMute) {
      vMute.addEventListener('click', e => {
        e.stopPropagation();
        showreel.muted = !showreel.muted;
        vMute.classList.toggle('muted', showreel.muted);
      });
    }
    const vio = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting && !showreel.paused) {
          showreel.pause();
          videoFrame.classList.remove('playing');
        }
      });
    }, { threshold: 0.25 });
    const sec5 = $('#sec-5');
    if (sec5) vio.observe(sec5);
  }

  // ── SECOND VIDEO: manga ──
  const manga       = $('#manga');
  const videoFrame2 = $('#videoFrame2');
  const vTime2      = $('#vTime2');
  const vDur2       = $('#vDur2');
  const vBarFill2   = $('#vBarFill2');
  const vBar2       = $('#vBar2');
  const vMute2      = $('#vMute2');

  if (manga && videoFrame2) {
    videoFrame2.addEventListener('click', async () => {
      if (manga.paused) {
        manga.muted = false;
        try { await manga.play(); } catch (_) {
          manga.muted = true;
          await manga.play();
        }
        videoFrame2.classList.add('playing');
      } else {
        manga.pause();
        videoFrame2.classList.remove('playing');
      }
    });
    manga.addEventListener('timeupdate', () => {
      if (vTime2) vTime2.textContent = fmt(manga.currentTime);
      if (vBarFill2 && manga.duration)
        vBarFill2.style.width = (manga.currentTime / manga.duration * 100) + '%';
    });
    manga.addEventListener('loadedmetadata', () => {
      if (vDur2) vDur2.textContent = fmt(manga.duration);
    });
    manga.addEventListener('ended', () => { videoFrame2.classList.remove('playing'); });
    if (vBar2) {
      vBar2.addEventListener('click', e => {
        const r = vBar2.getBoundingClientRect();
        if (manga.duration) manga.currentTime = ((e.clientX - r.left) / r.width) * manga.duration;
      });
    }
    if (vMute2) {
      vMute2.addEventListener('click', e => {
        e.stopPropagation();
        manga.muted = !manga.muted;
        vMute2.classList.toggle('muted', manga.muted);
      });
    }
    const vio2 = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting && !manga.paused) {
          manga.pause();
          videoFrame2.classList.remove('playing');
        }
      });
    }, { threshold: 0.25 });
    const sec5b = $('#sec-5');
    if (sec5b) vio2.observe(sec5b);
  }

  // ===== TYPEWRITER =====
  const typeText = $('#typeText');
  if (typeText) {
    const phrases = [
      'AI 驱动的内容创作',
      '用故事连接世界',
      '视频是新的语言',
      '让 AI 放大你的创意',
      '下一个爆款 — 由你定义',
    ];
    let pIdx = 0, cIdx = 0, deleting = false, started = false;

    function step() {
      const phrase = phrases[pIdx];
      if (!deleting) {
        cIdx++;
        typeText.textContent = phrase.slice(0, cIdx);
        if (cIdx === phrase.length) { deleting = true; return setTimeout(step, 1800); }
        setTimeout(step, 75);
      } else {
        cIdx--;
        typeText.textContent = phrase.slice(0, cIdx);
        if (cIdx === 0) {
          deleting = false;
          pIdx = (pIdx + 1) % phrases.length;
          return setTimeout(step, 400);
        }
        setTimeout(step, 38);
      }
    }

    const sec3 = $('#sec-3');
    const tio = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !started) {
        started = true;
        step();
        tio.disconnect();
      }
    }, { threshold: 0.3 });
    if (sec3) tio.observe(sec3); else step();
  }

  // ===== GSAP SCROLL ANIMATIONS =====
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  // ── SEC 1 HERO: parallax exit ──
  gsap.to('.hero-overlay', {
    yPercent: -25, opacity: 0, ease: 'none',
    scrollTrigger: { trigger: '#sec-1', start: 'top top', end: 'bottom top', scrub: 1.2 }
  });
  gsap.to('.hero-hint', {
    opacity: 0, y: -16, ease: 'none',
    scrollTrigger: { trigger: '#sec-1', start: 'top top', end: '18% top', scrub: true }
  });

  // ── SEC 2 NAME: reveal + 3D tilt ──
  const nameTitle = $('.name-title');
  const nameEyebrow = $('.name-eyebrow');
  const nameMeta = $('.name-meta');
  const nameOrb1 = $('.name-orb-1');
  const nameOrb2 = $('.name-orb-2');

  if (nameTitle) {
    // trigger SVG draw on scroll
    ScrollTrigger.create({
      trigger: '#sec-2', start: 'top 62%',
      onEnter: () => nameTitle.classList.add('drawn'),
    });

    const nameTl = gsap.timeline({
      scrollTrigger: { trigger: '#sec-2', start: 'top 65%', toggleActions: 'play none none none' }
    });
    nameTl
      .from(nameEyebrow, { y: 28, opacity: 0, duration: 0.8, ease: 'power3.out' })
      .from(nameTitle, { y: 55, opacity: 0, duration: 1.3, ease: 'power3.out' }, '-=0.4')
      .from(nameMeta, { y: 35, opacity: 0, duration: 0.9, ease: 'power3.out' }, '-=0.6');
  }

  // 3D mouse parallax on name section
  const sec2 = $('#sec-2');
  if (sec2 && nameTitle) {
    sec2.addEventListener('mousemove', e => {
      const r = sec2.getBoundingClientRect();
      const cx = (e.clientX - r.left) / r.width - 0.5;
      const cy = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(nameTitle, { rotateX: cy * -14, rotateY: cx * 14, duration: 0.9, ease: 'power2.out', transformPerspective: 1400 });
      if (nameOrb1) gsap.to(nameOrb1, { x: cx * 50, y: cy * 25, duration: 1.4, ease: 'power2.out' });
      if (nameOrb2) gsap.to(nameOrb2, { x: cx * -40, y: cy * -20, duration: 1.4, ease: 'power2.out' });
    });
    sec2.addEventListener('mouseleave', () => {
      gsap.to(nameTitle, { rotateX: 0, rotateY: 0, duration: 1.2, ease: 'power2.out' });
      if (nameOrb1) gsap.to(nameOrb1, { x: 0, y: 0, duration: 1.8, ease: 'power2.out' });
      if (nameOrb2) gsap.to(nameOrb2, { x: 0, y: 0, duration: 1.8, ease: 'power2.out' });
    });
  }

  // ── SEC 3 BRIEF: stagger reveal + counters + 3D card tilt ──
  const briefEyebrow = $('.brief-eyebrow');
  const briefLines = $$('.brief-headline .line');
  const statCards = $$('.stat-card');

  if (briefEyebrow) {
    gsap.from(briefEyebrow, {
      x: -40, opacity: 0, duration: 0.8, ease: 'power3.out',
      scrollTrigger: { trigger: '#sec-3', start: 'top 72%' }
    });
  }
  if (briefLines.length) {
    gsap.from(briefLines, {
      y: 70, opacity: 0, stagger: 0.14, duration: 1,
      ease: 'power3.out',
      scrollTrigger: { trigger: '#sec-3', start: 'top 68%' }
    });
  }
  if (statCards.length) {
    gsap.from(statCards, {
      y: 60, opacity: 0, stagger: 0.12, duration: 0.9,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.stat-cards', start: 'top 82%' }
    });
  }

  // Counter animation
  $$('.counter').forEach(el => {
    const from = parseInt(el.dataset.from) || 0;
    const to = parseInt(el.dataset.to) || 0;
    const obj = { val: from };
    ScrollTrigger.create({
      trigger: el, start: 'top 88%', once: true,
      onEnter: () => {
        gsap.to(obj, {
          val: to, duration: 1.8, ease: 'power2.out',
          onUpdate() { el.textContent = Math.round(obj.val); }
        });
      }
    });
  });

  // 3D card tilt with spotlight glow
  statCards.forEach(card => {
    const glow = card.querySelector('.stat-glow');
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect();
      const cx = (e.clientX - r.left) / r.width - 0.5;
      const cy = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(card, {
        rotateX: cy * -18, rotateY: cx * 18, scale: 1.03,
        duration: 0.35, ease: 'power2.out', transformPerspective: 900
      });
      if (glow) {
        glow.style.left = (e.clientX - r.left) + 'px';
        glow.style.top = (e.clientY - r.top) + 'px';
      }
    });
    card.addEventListener('mouseleave', () => {
      gsap.to(card, {
        rotateX: 0, rotateY: 0, scale: 1,
        duration: 0.9, ease: 'elastic.out(1,0.5)', transformPerspective: 900
      });
    });
  });

  // ── SEC 5 VIDEO: clip-path cinematic reveal + parallax ──
  const videoReveal = $('.video-reveal');
  const videoBgText = $('.video-bg-text');
  const vhLines = $$('.vh-line');
  const videoTagline = $('.video-tagline');

  const videoReveals = $$('.video-reveal');
  if (videoReveals.length) {
    gsap.to(videoReveals, {
      clipPath: 'inset(0% 0% 0% 0% round 22px)',
      duration: 1.1, ease: 'power3.inOut',
      stagger: 0.18,
      scrollTrigger: { trigger: '#sec-5', start: 'top 68%', toggleActions: 'play none none reverse' }
    });
  }
  if (videoReveal) { /* kept for any legacy reference */ }
  if (videoBgText) {
    gsap.fromTo(videoBgText,
      { yPercent: -12 },
      { yPercent: 18, ease: 'none',
        scrollTrigger: { trigger: '#sec-5', start: 'top bottom', end: 'bottom top', scrub: 1.8 }
      }
    );
  }
  if (vhLines.length) {
    gsap.from(vhLines, {
      y: 90, opacity: 0, stagger: 0.18, duration: 1,
      ease: 'power3.out',
      scrollTrigger: { trigger: '#sec-5', start: 'top 62%' }
    });
  }
  if (videoTagline) {
    gsap.from(videoTagline, {
      y: 30, opacity: 0, duration: 0.9, ease: 'power3.out',
      scrollTrigger: { trigger: '#sec-5', start: 'top 58%', delay: 0.4 }
    });
  }

  // ── SEC 6 END: stagger title reveal + magnetic button ──
  const endLines = $$('.end-title .line');
  const endThanks = $('.end-thanks');
  const endCta = $('.end-cta-text');
  const magnetBtn = $('.magnet-btn');

  if (endLines.length) {
    gsap.from(endLines, {
      y: 80, opacity: 0, stagger: 0.16, duration: 1.1,
      ease: 'power3.out',
      scrollTrigger: { trigger: '#sec-6', start: 'top 65%' }
    });
  }
  if (endThanks || endCta || magnetBtn) {
    gsap.from([endThanks, endCta, magnetBtn].filter(Boolean), {
      y: 35, opacity: 0, stagger: 0.14, duration: 0.85,
      ease: 'power3.out',
      scrollTrigger: { trigger: '#sec-6', start: 'top 55%' }
    });
  }

  // Magnetic button
  if (magnetBtn) {
    magnetBtn.addEventListener('mousemove', e => {
      const r = magnetBtn.getBoundingClientRect();
      const cx = e.clientX - r.left - r.width / 2;
      const cy = e.clientY - r.top - r.height / 2;
      gsap.to(magnetBtn, { x: cx * 0.38, y: cy * 0.38, duration: 0.5, ease: 'power2.out' });
    });
    magnetBtn.addEventListener('mouseleave', () => {
      gsap.to(magnetBtn, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1,0.5)' });
    });
  }

})();
