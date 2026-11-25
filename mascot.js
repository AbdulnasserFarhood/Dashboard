/* =========================================================
   مشهد الافتتاح — يحسب مسار المشي حسب مكان الأزرار والبطاقات:
   في تبويب الفريق (شاشة عريضة) اللافتة تدفع زرّي القمر والقفل يساراً
   حتى يصطفّا مع حافة البطاقات، ويأخذ الدفتر واللافتة مكانهما.
   (حركة الرجلين والغرس والتلويح في mascot.css ومبنية على نفس التوقيت)
   ========================================================= */
(function () {
  "use strict";
  const stage = document.querySelector('.mascot-stage');
  if (!stage) return;
  const walker = stage.querySelector('.walker');
  const topbar = document.querySelector('.topbar');
  const actions = document.querySelector('.topbar-actions');
  const stats = document.getElementById('teamStats');

  const DELAY = 500, WALK = 3400;   // يجب أن تطابق توقيتات mascot.css
  const SIGN_CARRY = 104;           // اللافتة أمام الدفتر بهذه المسافة أثناء الحمل
  const SIGN_SHIFT = 36;            // إزاحة الغرس (translate في @keyframes plant)
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let introRunning = false;

  function setShift(px, animate) {
    actions.style.transition = animate ? 'transform .75s cubic-bezier(.2,.8,.3,1)' : 'none';
    actions.style.transform = px ? `translateX(${px}px)` : '';
  }

  // كل القياسات بدون أثر الإزاحة الحالية للأزرار
  function layout() {
    const st = stage.getBoundingClientRect();
    if (!st.width) return null; // المشهد مخفي (شاشة صغيرة)
    const tb = topbar.getBoundingClientRect();
    const aLeft = tb.left + parseFloat(getComputedStyle(topbar).paddingLeft || 0);
    const aRight = aLeft + actions.offsetWidth;
    const push = !!stats && document.body.classList.contains('team-view')
      && getComputedStyle(stats).position === 'absolute';
    const signLeft = push ? aLeft - st.left : 10; // مكان اللافتة النهائي داخل المساحة
    return {
      start: st.width + 120,
      end: signLeft + SIGN_CARRY + SIGN_SHIFT,
      shift: push ? stats.getBoundingClientRect().left - aLeft : 0,
      contact: aRight - st.left, // حافة الأزرار اليمنى
    };
  }

  function place(animate) {
    const L = layout();
    if (!L) { setShift(0, animate); return; }
    walker.style.transition = animate ? 'left .75s cubic-bezier(.2,.8,.3,1)' : 'none';
    walker.style.left = L.end + 'px';
    setShift(L.shift, animate);
  }

  function intro() {
    const L = layout();
    stage.classList.add('ready');
    if (!L || reduce) { place(false); return; }
    introRunning = true;
    walker.style.left = L.end + 'px';
    const anim = walker.animate(
      [{ left: L.start + 'px' }, { left: L.end + 'px' }],
      { duration: WALK, delay: DELAY, easing: 'linear', fill: 'backwards' }
    );
    if (L.shift) {
      // اللحظة التي تلامس فيها مقدّمة اللافتة زرّي القمر والقفل
      const frac = (L.start - SIGN_CARRY - L.contact) / (L.start - L.end);
      setTimeout(() => setShift(L.shift, true), DELAY + Math.max(0, Math.min(1, frac)) * WALK);
    }
    anim.finished.then(() => { introRunning = false; place(false); });
  }

  let t;
  const relayout = () => { if (!introRunning) place(true); };
  document.addEventListener('tab-change', () => setTimeout(relayout, 30));
  window.addEventListener('resize', () => { clearTimeout(t); t = setTimeout(relayout, 120); });

  // يبدأ فوراً حتى يتزامن مع حركات CSS (الرجلين/الغرس/التلويح) — المواضع النهائية لا تعتمد على حجم الشعار
  intro();
  // وبعد تحميل الصور والخطوط نصحّح المواضع النهائية إن تغيّرت
  window.addEventListener('load', () => setTimeout(relayout, 50));
})();
