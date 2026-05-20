/* ============================================================
   tree.js — 生命生长 · 诗意动画模块（重构版）
   修改要点：
   · 泥土高度降至 ~19%（GY=548）
   · 引言移入 SVG 天空区域树木间隙，深绿色 + 玻璃底卡
   · 不影响任何其他板块
   ============================================================ */

(function () {
  'use strict';

  var wrap = document.getElementById('sec-tree');
  if (!wrap) return;

  var NS = 'http://www.w3.org/2000/svg';
  var VW = 1200, VH = 680;
  var GY = 548;   /* ← 地面线。土地占 (680-548)/680 ≈ 19% */

  function mk(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }
  function rng(a, b) { return a + Math.random() * (b - a); }

  /* ══ SVG ══════════════════════════════════════════════════ */
  var svg = mk('svg', {
    viewBox: '0 0 ' + VW + ' ' + VH,
    preserveAspectRatio: 'xMidYMax slice',
    style: 'position:absolute;inset:0;width:100%;height:100%;overflow:hidden'
  });
  wrap.appendChild(svg);

  var defs = mk('defs', {});
  svg.appendChild(defs);

  /* 天空渐变 */
  var skyG = mk('linearGradient', { id: 'tg-sky', x1: '0%', y1: '0%', x2: '0%', y2: '100%' });
  [['0%', '#ede8dc'], ['42%', '#d9ede5'], ['100%', '#bfddd3']].forEach(function (s) {
    skyG.appendChild(mk('stop', { offset: s[0], 'stop-color': s[1] }));
  });
  defs.appendChild(skyG);

  /* 地面渐变 */
  var gndG = mk('linearGradient', { id: 'tg-gnd', x1: '0%', y1: '0%', x2: '0%', y2: '100%' });
  [['0%', '#6D4C41'], ['100%', '#3E2723']].forEach(function (s) {
    gndG.appendChild(mk('stop', { offset: s[0], 'stop-color': s[1] }));
  });
  defs.appendChild(gndG);

  /* 草地渐变 */
  var grG = mk('linearGradient', { id: 'tg-gr', x1: '0%', y1: '100%', x2: '0%', y2: '0%' });
  [['0%', '#2E7D32'], ['55%', '#4CAF50'], ['100%', '#8BC34A']].forEach(function (s) {
    grG.appendChild(mk('stop', { offset: s[0], 'stop-color': s[1] }));
  });
  defs.appendChild(grG);

  /* 草地生长 clip（clipRect 从 0 高度扩展向上） */
  var gcClip = mk('clipPath', { id: 'tg-gc' });
  var gcRect = mk('rect', { x: 0, y: GY, width: VW, height: 0 });
  gcClip.appendChild(gcRect);
  defs.appendChild(gcClip);

  /* 噪点纹理 */
  var nf = mk('filter', { id: 'tg-noise' });
  nf.appendChild(mk('feTurbulence', {
    type: 'fractalNoise', baseFrequency: '0.62',
    numOctaves: '3', stitchTiles: 'stitch', result: 'nz'
  }));
  nf.appendChild(mk('feColorMatrix', { type: 'saturate', values: '0', in: 'nz', result: 'gnz' }));
  nf.appendChild(mk('feBlend', { in: 'SourceGraphic', in2: 'gnz', mode: 'multiply' }));
  defs.appendChild(nf);

  /* 文字投影 filter */
  var tsf = mk('filter', { id: 'tg-tshadow', x: '-30%', y: '-30%', width: '160%', height: '160%' });
  var tsb = mk('feGaussianBlur', { in: 'SourceAlpha', stdDeviation: '4', result: 'blur' });
  var tso = mk('feOffset', { dx: '0', dy: '2', in: 'blur', result: 'offB' });
  var tsc = mk('feComposite', { in: 'offB', in2: 'SourceAlpha', operator: 'out', result: 'shadow' });
  var tsflood = mk('feFlood', { 'flood-color': 'rgba(255,250,238,0.55)', result: 'color' });
  var tscomp = mk('feComposite', { in: 'color', in2: 'shadow', operator: 'in', result: 'colorShadow' });
  var tsm = mk('feMerge', {});
  tsm.appendChild(mk('feMergeNode', { in: 'colorShadow' }));
  tsm.appendChild(mk('feMergeNode', { in: 'SourceGraphic' }));
  tsf.appendChild(tsb); tsf.appendChild(tso); tsf.appendChild(tsc);
  tsf.appendChild(tsflood); tsf.appendChild(tscomp); tsf.appendChild(tsm);
  defs.appendChild(tsf);

  /* ══ 天空 ══ */
  svg.appendChild(mk('rect', { width: VW, height: VH, fill: 'url(#tg-sky)' }));

  /* ══ 草地（clipped，从地面向上生长） ══ */
  var grassGrp = mk('g', { 'clip-path': 'url(#tg-gc)' });
  svg.appendChild(grassGrp);

  var blades = [];
  for (var gi = 0; gi < 118; gi++) {
    var gx  = rng(0, VW);
    var gy  = GY - rng(0, 14);
    var gh  = rng(28, 82);
    var gln = rng(-42, 42);
    var gsw = rng(1.0, 2.4);
    var blade = mk('path', {
      d: 'M ' + gx.toFixed(1) + ' ' + gy.toFixed(1) +
         ' C ' + (gx + gln * 0.25).toFixed(1) + ' ' + (gy - gh * 0.42).toFixed(1) +
         ' '  + (gx + gln * 0.72).toFixed(1) + ' ' + (gy - gh * 0.78).toFixed(1) +
         ' '  + (gx + gln).toFixed(1)          + ' ' + (gy - gh).toFixed(1),
      stroke: 'url(#tg-gr)',
      'stroke-width': gsw.toFixed(1),
      fill: 'none',
      'stroke-linecap': 'round'
    });
    grassGrp.appendChild(blade);
    blades.push({ el: blade, lean: gln });
  }

  /* ══ 地面（GY=548，土地只占底部 19%） ══ */
  svg.appendChild(mk('path', {
    d: 'M 0 ' + GY +
       ' C 180 ' + (GY - 10) + ' 380 ' + (GY + 12) + ' 600 ' + (GY - 4) +
       ' C 820 ' + (GY - 18) + ' 1020 ' + (GY + 10) + ' 1200 ' + (GY - 6) +
       ' L 1200 ' + VH + ' L 0 ' + VH + ' Z',
    fill: 'url(#tg-gnd)'
  }));

  /* 噪点叠层 */
  svg.appendChild(mk('rect', {
    width: VW, height: VH,
    fill: '#888', opacity: '0.04', filter: 'url(#tg-noise)'
  }));

  /* ══ 土包（三棵树根部） ══ */
  var moundSpecs = [
    { cx: 305, cy: GY + 4,  rx: 38, ry: 13 },
    { cx: 596, cy: GY + 0,  rx: 46, ry: 15 },
    { cx: 872, cy: GY + 3,  rx: 36, ry: 12 }
  ];
  var moundEls = moundSpecs.map(function (m) {
    var e = mk('ellipse', { cx: m.cx, cy: m.cy, rx: m.rx, ry: m.ry, fill: '#6D4C41' });
    svg.appendChild(e);
    return e;
  });

  /* ══ 树木定义（所有 Y 坐标基于新 GY=548，较旧版上移） ══
     树干：有机贝塞尔曲线
     枝桠：stroke-dasharray 描线动画
     叶片：30~50 片，分批弹出
  ══════════════════════════════════════════════════════════ */
  var LEAF_COLS = [
    '#3d8b40','#4CAF50','#5cb85c','#66BB6A','#7cb87e',
    '#388E3C','#43A047','#2E7D32','#558B2F','#7CB342',
    '#8BC34A','#a5d46a','#b8dd88','#c5e89a'
  ];

  var TREES = [
    /* 左树：偏矮，略向左倾 */
    {
      trunk: 'M 305 552 C 300 510 308 470 301 428' +
             ' C 294 386 303 346 296 306' +
             ' C 289 270 298 238 291 210' +
             ' C 285 186 293 168 288 156',
      tw: 13,
      branches: [
        { d: 'M 296 390 C 266 364 236 349 208 338', w: 7   },
        { d: 'M 293 328 C 323 302 352 288 379 278', w: 6   },
        { d: 'M 289 266 C 262 244 244 233 224 225', w: 4.5 }
      ],
      lc: { x: 286, y: 190, rx: 90, ry: 74 },
      ln: 40
    },
    /* 中树：最高，枝叶最茂密 */
    {
      trunk: 'M 596 550 C 591 504 599 460 592 416' +
             ' C 586 372 594 328 588 286' +
             ' C 581 245 589 208 583 176' +
             ' C 577 148 585 128 579 112',
      tw: 17,
      branches: [
        { d: 'M 588 400 C 552 372 518 356 486 345', w: 8.5 },
        { d: 'M 587 340 C 626 312 660 297 692 285', w: 8.5 },
        { d: 'M 583 282 C 554 256 532 243 510 233', w: 5.5 },
        { d: 'M 581 236 C 611 210 636 197 660 188', w: 4.5 }
      ],
      lc: { x: 582, y: 142, rx: 112, ry: 96 },
      ln: 52
    },
    /* 右树：中等高度 */
    {
      trunk: 'M 872 552 C 876 510 868 470 874 430' +
             ' C 880 390 871 352 877 314' +
             ' C 883 279 872 248 879 220' +
             ' C 885 196 875 178 881 166',
      tw: 12,
      branches: [
        { d: 'M 877 396 C 848 370 818 355 790 344', w: 6.5 },
        { d: 'M 878 334 C 908 308 936 294 962 284', w: 6   },
        { d: 'M 880 274 C 856 251 840 240 822 232', w: 4.5 }
      ],
      lc: { x: 879, y: 202, rx: 86, ry: 76 },
      ln: 40
    }
  ];

  var treeDom = TREES.map(function (td) {
    var trunk = mk('path', {
      d: td.trunk, stroke: '#5D4037',
      'stroke-width': td.tw, fill: 'none',
      'stroke-linecap': 'round', 'stroke-linejoin': 'round'
    });
    svg.appendChild(trunk);

    var branches = td.branches.map(function (b) {
      var be = mk('path', {
        d: b.d, stroke: '#6D4C41',
        'stroke-width': b.w, fill: 'none', 'stroke-linecap': 'round'
      });
      svg.appendChild(be);
      return be;
    });

    var leaves = [];
    var lc = td.lc;
    for (var li = 0; li < td.ln; li++) {
      var ang  = Math.random() * Math.PI * 2;
      var dist = Math.pow(Math.random(), 0.55);
      var lx   = lc.x + Math.cos(ang) * lc.rx * (0.18 + dist * 0.82);
      var ly   = lc.y + Math.sin(ang) * lc.ry * (0.18 + dist * 0.82) - dist * 12;
      var lrx  = rng(15, 30);
      var lry  = rng(9, 20);
      var lrot = Math.random() * 180;
      var lcol = LEAF_COLS[Math.floor(Math.random() * LEAF_COLS.length)];
      var lop  = rng(0.70, 1.0).toFixed(2);

      var g = mk('g', {
        transform: 'rotate(' + lrot.toFixed(1) + ' ' + lx.toFixed(1) + ' ' + ly.toFixed(1) + ')'
      });
      g.appendChild(mk('ellipse', {
        cx: lx.toFixed(1), cy: ly.toFixed(1),
        rx: lrx.toFixed(1), ry: lry.toFixed(1),
        fill: lcol, opacity: lop
      }));
      svg.appendChild(g);
      leaves.push({ g: g, lx: lx, ly: ly });
    }

    return { trunk: trunk, branches: branches, leaves: leaves };
  });

  /* ══════════════════════════════════════════════════════════
     引言：放在树木之间的天空亮色区（y≈455，远离暗色泥土）
     · 玻璃底卡：半透明暖白，圆角
     · 文字：深森林绿 #2f5d32，逐字浮现
  ══════════════════════════════════════════════════════════ */
  var QUOTE     = '生命是一棵长满可能的大树。';
  var Q_FONT    = 30;           /* SVG 字号 */
  var Q_CW      = 32;           /* 每字宽度估算 */
  var Q_TOTAL   = QUOTE.length * Q_CW;     /* ~416px */
  var Q_CX      = VW / 2;                  /* 水平居中 */
  var Q_X0      = Q_CX - Q_TOTAL / 2;      /* 首字 x */
  var Q_Y       = 462;          /* SVG 基线 Y（天空亮区，GY=548，距地 86px） */
  var GLASS_PAD = { x: 28, y: 22, r: 14 };

  /* 玻璃底卡 */
  var glassRect = mk('rect', {
    x:      (Q_X0 - GLASS_PAD.x).toFixed(1),
    y:      (Q_Y - Q_FONT - GLASS_PAD.y).toFixed(1),
    width:  (Q_TOTAL + GLASS_PAD.x * 2).toFixed(1),
    height: (Q_FONT + GLASS_PAD.y * 2).toFixed(1),
    rx:     GLASS_PAD.r,
    fill:   'rgba(242,237,224,0.58)',
    stroke: 'rgba(180,200,168,0.32)',
    'stroke-width': '1'
  });
  svg.appendChild(glassRect);

  /* 逐字 SVG text 元素 */
  var quoteChars = [];
  QUOTE.split('').forEach(function (ch, ci) {
    var cx = Q_X0 + ci * Q_CW + Q_CW * 0.5;
    var ct = mk('text', {
      x: cx.toFixed(1),
      y: Q_Y.toFixed(1),
      'text-anchor': 'middle',
      'font-family': '"Noto Serif SC","Source Han Serif SC","Songti SC",Georgia,serif',
      'font-size':   Q_FONT,
      'font-weight': '300',
      'letter-spacing': '3',
      fill: '#2f5d32',
      filter: 'url(#tg-tshadow)'
    });
    ct.textContent = ch;
    svg.appendChild(ct);
    quoteChars.push(ct);
  });

  /* ══ 重播按钮（HTML，浮于 SVG 之上） ══ */
  var replayBtn = document.createElement('button');
  replayBtn.className = 'tree-replay-btn';
  replayBtn.title = '重播动画';
  replayBtn.innerHTML =
    '<svg viewBox="0 0 24 24" width="16" height="16">' +
    '<path fill="currentColor" d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 ' +
    '8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0 1 12 18c-3.31 ' +
    '0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>';
  wrap.appendChild(replayBtn);

  /* ══════════════════════════════════════════════════════════
     ANIMATION — GSAP timeline，约 7s，5 阶段
  ══════════════════════════════════════════════════════════ */
  if (typeof gsap === 'undefined') {
    console.warn('tree.js: GSAP 未加载');
    return;
  }

  var mainTL     = null;
  var idleTweens = [];
  var played     = false;

  function resetAll() {
    /* 草地 clip 归零 */
    gcRect.setAttribute('y', GY);
    gcRect.setAttribute('height', 0);

    /* 土包 */
    moundEls.forEach(function (m) {
      gsap.set(m, {
        opacity: 0, scaleY: 0,
        svgOrigin: m.getAttribute('cx') + ' ' +
          (parseFloat(m.getAttribute('cy')) + parseFloat(m.getAttribute('ry')))
      });
    });

    /* 树干 dashoffset = 全长（描线起点） */
    treeDom.forEach(function (td) {
      var tlen = td.trunk.getTotalLength();
      gsap.set(td.trunk, { strokeDasharray: tlen, strokeDashoffset: tlen });
      td.branches.forEach(function (b) {
        var blen = b.getTotalLength();
        gsap.set(b, { strokeDasharray: blen, strokeDashoffset: blen });
      });
      td.leaves.forEach(function (l) {
        gsap.set(l.g, {
          scale: 0, opacity: 0,
          svgOrigin: l.lx.toFixed(1) + ' ' + l.ly.toFixed(1)
        });
      });
    });

    /* 玻璃卡 + 文字 */
    gsap.set(glassRect, { opacity: 0 });
    gsap.set(quoteChars, { opacity: 0, y: 14 });
  }

  function stopIdle() {
    idleTweens.forEach(function (t) { t.kill(); });
    idleTweens = [];
  }

  function startIdle() {
    /* 草叶微风摇曳 */
    blades.forEach(function (b) {
      var s = rng(3, 9) * (b.lean < 0 ? -1 : 1);
      idleTweens.push(gsap.to(b.el, {
        skewX: s, duration: rng(2.4, 4.8),
        ease: 'sine.inOut', repeat: -1, yoyo: true,
        delay: Math.random() * 3
      }));
    });
    /* 叶片呼吸缩放 */
    treeDom.forEach(function (td) {
      td.leaves.forEach(function (l) {
        idleTweens.push(gsap.to(l.g, {
          scale: 1.032, duration: rng(2.5, 5.0),
          ease: 'sine.inOut', repeat: -1, yoyo: true,
          delay: Math.random() * 4
        }));
      });
    });
  }

  function play() {
    stopIdle();
    if (mainTL) mainTL.kill();
    resetAll();

    mainTL = gsap.timeline({ onComplete: startIdle });

    /* Phase 1 · 0–1s · 草地从地面向上生长 */
    mainTL.to(gcRect, {
      attr: { y: GY - 96, height: 96 },
      duration: 1.0, ease: 'power2.out'
    }, 0);

    /* Phase 2 · 1–1.5s · 土包凸起 */
    moundEls.forEach(function (m, mi) {
      mainTL.to(m, {
        opacity: 1, scaleY: 1,
        duration: 0.38, ease: 'back.out(2.5)'
      }, 1.05 + mi * 0.13);
    });

    /* Phase 3 · 1.5–4s · 树干描线生长 + 枝桠 */
    treeDom.forEach(function (td, ti) {
      var t0 = 1.52 + ti * 0.22;
      mainTL.to(td.trunk, {
        strokeDashoffset: 0,
        duration: 1.75, ease: 'power1.inOut'
      }, t0);
      td.branches.forEach(function (b, bi) {
        mainTL.to(b, {
          strokeDashoffset: 0,
          duration: 0.72, ease: 'power2.out'
        }, t0 + 0.95 + bi * 0.18);
      });
    });

    /* Phase 4 · 3.2–5s · 叶片分批弹出（back.out 弹性） */
    treeDom.forEach(function (td, ti) {
      mainTL.to(td.leaves.map(function (l) { return l.g; }), {
        scale: 1, opacity: 1,
        duration: 0.55, ease: 'back.out(1.75)',
        stagger: { each: 0.055, from: 'random' }
      }, 3.25 + ti * 0.20);
    });

    /* Phase 5 · 5.2–7.2s · 玻璃卡淡入 → 逐字浮现
       文字在树木之间的亮色天空区，深绿色，清晰可读 */
    mainTL.to(glassRect, {
      opacity: 1, duration: 0.5, ease: 'power2.out'
    }, 5.0);

    mainTL.to(quoteChars, {
      opacity: 1, y: 0,
      duration: 0.52, ease: 'power2.out',
      stagger: { each: 0.10, from: 'start' }
    }, 5.25);
  }

  /* ══ IntersectionObserver：30% 可见即触发，只播一次 ══ */
  var obs = new IntersectionObserver(function (entries) {
    if (entries[0].intersectionRatio >= 0.3 && !played) {
      played = true;
      obs.disconnect();
      play();
    }
  }, { threshold: [0.3, 0.6] });
  obs.observe(wrap);

  /* ══ 重播按钮 ══ */
  replayBtn.addEventListener('click', function () {
    played = true;
    play();
  });

})();
