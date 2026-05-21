/* ============================================================
   namecard.js — section 02 "Xiaoxi" card micro-interactions
   Mouse parallax on the stacked frames (desktop only)
   ============================================================ */
(function () {
  'use strict';

  var section = document.getElementById('sec-2');
  if (!section) return;

  /* ── 层 A：大字逐字母入场（IntersectionObserver，只触发一次） ── */
  var nameEn = section.querySelector('.xx-name-en');
  var nameCn = section.querySelector('.xx-name-cn');
  if (nameEn) {
    var nameIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          nameEn.classList.add('visible');
          if (nameCn) nameCn.classList.add('visible');
          nameIO.unobserve(e.target);
        }
      });
    }, { threshold: 0.3 });
    nameIO.observe(nameEn);
  }

  /* 触屏设备不启用视差 */
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;

  var wraps = section.querySelectorAll('.xx-frame-wrap');
  if (!wraps.length) return;

  section.addEventListener('mousemove', function (e) {
    var rect = section.getBoundingClientRect();
    var mx = (e.clientX - rect.left) / rect.width - 0.5;
    var my = (e.clientY - rect.top) / rect.height - 0.5;
    wraps.forEach(function (w) {
      var depth = parseFloat(w.dataset.depth);
      w.style.transform = 'translate(' + (-mx * depth * 12) + 'px, ' + (-my * depth * 9) + 'px)';
    });
  });

  section.addEventListener('mouseleave', function () {
    wraps.forEach(function (w) { w.style.transform = 'translate(0, 0)'; });
  });

  /* ── 自动重排：每 4.5s 框的旋转角度优雅微调（±8°，1.8s 缓动过渡） ── */
  var inners = section.querySelectorAll('.xx-frame-inner');
  var baseRotations = [-8, 3, 10];
  setInterval(function () {
    inners.forEach(function (inner, i) {
      var extra = (Math.random() - 0.5) * 16;
      inner.style.transform = 'rotate(' + (baseRotations[i] + extra).toFixed(2) + 'deg)';
    });
  }, 4500);
})();
