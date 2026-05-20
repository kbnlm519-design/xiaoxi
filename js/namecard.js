/* ============================================================
   namecard.js — section 02 "Xiaoxi" card micro-interactions
   Mouse parallax on the stacked frames (desktop only)
   ============================================================ */
(function () {
  'use strict';

  var section = document.getElementById('sec-2');
  if (!section) return;

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
})();
