/* =========================================================
   متابعة الفريق — يقرأ ويكتب إلى نفس Google Sheet القديم
   (يعرض كل المهام، الأحدث أولاً، مع تحديث تلقائي كل دقيقة)
   ========================================================= */
(function () {
  "use strict";

  /* ===== الإعدادات: نفس رابط الـ Web App السابق ===== */
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwIjbTGmj8OMMDYN6Q_x85Ifh5DWdzfVG4eZMiDxyP1agarqPZFFZlBnyKOQiOPUWGs/exec';
  const DEFAULT_PROJECT = 'RoboGeex';
  /* =================================================== */

  const PEOPLE = [
    { n: 'Abdulnasser', k: 'abdulnasser' },
    { n: 'Khaled Moussa', k: 'khaled' },
    { n: 'Osama Ammar', k: 'osama' },
    { n: 'Ali Khalaf', k: 'ali' },
  ];
  const TYPES = ['مونتاج', 'تصميم جرافيك', 'كتابة محتوى', 'تصوير فيديو', 'تصوير فوتوغرافي', 'توثيق ومتابعة', 'تحرير وترجمة', 'تغطية فعالية', 'تسويق', 'أخرى', 'تنسيق مناهج'];
  const PROJECTS = ['RoboGeex', 'InJoy Toys', 'FGC', 'FGC & RoboGeex', 'curricula'];

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const cols = $("teamCols");
  const status = $("teamStatus");
  if (!cols) return; // لوحة الفريق غير موجودة في هذه الصفحة

  let rows = [], cur = 0;

  /* ----- بناء الأعمدة ----- */
  $("team-n-0").textContent = PEOPLE[0].n;
  cols.innerHTML = PEOPLE.slice(1).map((p, i) => {
    const idx = i + 1;
    return `<div class="box team-col">
      <div class="ch"><strong>${esc(p.n)}</strong><button class="team-plus" type="button" data-i="${idx}" title="إضافة مهمة">+</button></div>
      <div class="stat" id="team-s-${idx}"></div>
      <div id="team-t-${idx}"></div>
      <div id="team-l-${idx}"></div>
    </div>`;
  }).join("");

  $("teamTy").innerHTML = TYPES.map((t) => `<option>${esc(t)}</option>`).join("");
  $("teamPr").innerHTML = PROJECTS.map((t) => `<option ${t === DEFAULT_PROJECT ? 'selected' : ''}>${esc(t)}</option>`).join("");

  /* ----- عرض مهام كل شخص ----- */
  // كل شخص: أحدث المهام أولاً. الإحصائية للشهر الحالي، والقائمة تعرض آخر SHOW_N مهام مع زر "عرض المزيد"
  const SHOW_N = 2;
  const expanded = new Set();
  const thisMonth = () => new Date().toLocaleDateString('en-CA').slice(0, 7); // "2026-11"
  const DAY = 86400000;
  const OPEN_DAYS = 3;      // مهمة غير مكتملة أقدم من هذا = تنبيه
  const LOOKBACK_DAYS = 30; // لا ننبّه على مهام أقدم من شهر
  const BEST_MIN = 5;       // أقل عدد مهام بالشهر لدخول مقارنة «الأفضل أداءً»

  const belongs = (p, r) => String(r.name || '').toLowerCase().includes(p.k);
  const stOf = (r) => String(r.status || '').trim();
  const isAbsence = (r) => stOf(r) === 'غياب';
  const isDone = (r) => stOf(r) === 'تم';
  const inMonth = (r) => String(r.date).startsWith(thisMonth());
  const daysAgo = (r) => Math.floor((Date.now() - new Date(String(r.date) + 'T00:00:00').getTime()) / DAY);
  const noTime = (r) => !isAbsence(r) && !(parseFloat(r.hours) > 0) && !r.timer;
  // نفس المهمة رغم اختلاف الأحرف الكبيرة والمسافات وبادئة Fusion 360
  const normDesc = (s) => String(s || '').toLowerCase().replace(/^fusion 360 \|\s*/, '').replace(/\s+/g, ' ').trim();
  // مفتاح «مرن» يجمع الأخطاء الإملائية الشائعة (certeficate = certificate)
  const looseKey = (s) => normDesc(s).replace(/[aeiouy]/g, '').replace(/[^\p{L}\p{N} ]/gu, '').replace(/\s+/g, ' ').trim();

  function personMonth(p) {
    const list = rows.filter((r) => belongs(p, r) && inMonth(r) && !isAbsence(r));
    const done = list.filter(isDone).length;
    return { list, total: list.length, done, pct: list.length ? Math.round(done / list.length * 100) : 0 };
  }
  // آخر سجل لكل مهمة عند الشخص: إن لم يكن «تم» وعمره أكثر من 3 أيام فهي مفتوحة
  function openTasks(p) {
    const latest = new Map();
    rows.filter((r) => belongs(p, r) && !isAbsence(r) && daysAgo(r) <= LOOKBACK_DAYS).forEach((r) => {
      const k = looseKey(r.desc);
      const c = latest.get(k);
      if (!c || String(r.date) > String(c.date) || (r.date === c.date && r._i > c._i)) latest.set(k, r);
    });
    return [...latest.values()].filter((r) => !isDone(r) && daysAgo(r) > OPEN_DAYS);
  }

  let flags = new Map(); // صف → ['time', 'open']
  const addFlag = (r, f) => flags.set(r, [...(flags.get(r) || []), f]);

  function taskCard(r) {
    const f = flags.get(r) || [];
    return `<div class="team-task${f.length ? ' flagged' : ''}">${esc(r.desc)}<div class="m"><span>${esc(r.date)}</span><span class="${isDone(r) ? 'ok' : 'pt'}">${esc(r.status)}</span><span>${esc(r.hours || '—')} س</span>${r.timer ? `<span class="tm" title="المدة الفعلية من المؤقت">⏱ ${esc(r.timer)}</span>` : ''}</div>`
      + (f.length ? `<div class="flags">${f.includes('time') ? '<span class="flag" title="لا يوجد وقت بداية/نهاية ولا مدة مؤقت لهذه المهمة">⏱ بلا وقت مسجّل</span>' : ''}${f.includes('open') ? `<span class="flag open" title="آخر حالة لهذه المهمة ليست «تم»">⚠️ مفتوحة منذ ${daysAgo(r)} أيام</span>` : ''}</div>` : '')
      // أزرار الإصلاح السريع — تعدّل نفس الصف في الشيت مباشرة
      + (f.length && r.row ? `<div class="fix" data-row="${r.row}">
          ${f.includes('open') ? '<button type="button" class="fix-btn done" data-fix="done">✓ تمّت</button>' : ''}
          ${f.includes('time') ? '<button type="button" class="fix-btn" data-fix="time">+ وقت</button>' : ''}
        </div>
        <div class="fix-time" data-row="${r.row}" hidden>
          <label>من <input type="time" step="900" value="09:00" class="ft-start"></label>
          <label>إلى <input type="time" step="900" value="10:00" class="ft-end"></label>
          <button type="button" class="fix-btn done" data-fix="save-time">حفظ</button>
          <button type="button" class="fix-btn" data-fix="cancel-time">إلغاء</button>
        </div>
        <div class="fix-err"></div>` : '')
      + `</div>`;
  }

  function render() {
    flags = new Map();
    const alerts = [];
    PEOPLE.forEach((p, i) => {
      const mine = rows
        .filter((r) => belongs(p, r))
        // الأحدث تاريخاً أولاً؛ وفي نفس اليوم الصف المضاف لاحقاً في الشيت أولاً
        .sort((a, b) => String(b.date).localeCompare(String(a.date)) || b._i - a._i);
      const ms = personMonth(p);
      const hours = ms.list.reduce((a, r) => a + (parseFloat(r.hours) || 0), 0);
      const missing = ms.list.filter(noTime);
      const open = openTasks(p);
      missing.forEach((r) => addFlag(r, 'time'));
      open.forEach((r) => addFlag(r, 'open'));
      if (missing.length || open.length) alerts.push({ i, missing: missing.length, open: open.length });

      const statEl = $("team-s-" + i);
      const listEl = $("team-l-" + i);
      if (statEl) statEl.textContent = `هذا الشهر: ${ms.total} مهام · ${hours.toFixed(2)} ساعة · إنجاز ${ms.pct}%`;
      if (listEl) {
        const rest = mine.slice(SHOW_N);
        const isOpen = expanded.has(i);
        listEl.innerHTML = (mine.slice(0, SHOW_N).map(taskCard).join('') || '<div class="team-msg">لا مهام بعد</div>')
          + (rest.length ? `
            <div class="team-extra${isOpen ? ' open' : ''}" id="team-x-${i}"><div class="team-extra-inner">${rest.map(taskCard).join('')}</div></div>
            <button type="button" class="team-more${isOpen ? ' open' : ''}" data-more="${i}" aria-expanded="${isOpen}">
              <span class="lbl">${moreLabel(isOpen, mine.length)}</span><span class="chev">▾</span>
            </button>` : '');
      }
    });
    renderAlerts(alerts);
    renderStats();
  }

  /* ----- شريط التنبيهات أعلى تبويب الفريق ----- */
  function renderAlerts(list) {
    const box = $("teamAlerts");
    if (!box) return;
    if (!list.length) {
      box.className = 'team-alerts ok';
      box.innerHTML = '✅ لا تنبيهات — كل مهام الشهر مسجّلة بوقت، ولا مهام مفتوحة أكثر من 3 أيام';
      return;
    }
    const tm = list.reduce((a, x) => a + x.missing, 0), op = list.reduce((a, x) => a + x.open, 0);
    box.className = 'team-alerts';
    box.innerHTML = `<b>⚠️ تنبيهات:</b> ${tm ? `${tm} مهمة بلا وقت مسجّل` : ''}${tm && op ? ' · ' : ''}${op ? `${op} مهمة مفتوحة منذ أكثر من 3 أيام` : ''}
      <div class="alert-chips">${list.map((x) => `<button type="button" class="alert-chip" data-jump="${x.i}">${esc(PEOPLE[x.i].n)}: ${[x.missing ? `⏱ ${x.missing}` : '', x.open ? `⚠️ ${x.open}` : ''].filter(Boolean).join(' · ')}</button>`).join('')}</div>`;
  }
  // الضغط على اسم: تُفتح قائمة مهامه كاملة ونذهب إليها
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-jump]');
    if (!b) return;
    const i = +b.dataset.jump;
    expanded.add(i);
    render();
    const box = $("team-l-" + i).closest('.box');
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    box.classList.remove('flash'); void box.offsetWidth; box.classList.add('flash');
  });

  /* =========================================================
     بطاقات مهام الشهر (يسار الصفحة): تظهر بالتتابع، والعدد ونسبة الإنجاز يتصاعدان من 0
     ========================================================= */
  const statsBox = $("teamStats");
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let loaded = false;
  let bestTimer = null;

  function countUp(el, from, to, dur = 1000, suffix = '') {
    cancelAnimationFrame(el._raf);
    if (reduceMotion) { el.textContent = to + suffix; return; }
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3))) + suffix;
      if (p < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  }
  function teamTabActive() { return $("panel-team").classList.contains('active'); }

  // «الأفضل أداءً»: أعلى نسبة إنجاز مع مراعاة حجم العمل — (المكتمل + 2) ÷ (الكل + 4)
  // حتى لا يتفوّق 5 من 5 على 18 من 19. المشرف خارج المقارنة، وحد أدنى BEST_MIN مهام.
  function bestIndex() {
    let best = -1, score = -1;
    PEOPLE.forEach((p, i) => {
      if (i === 0) return;
      const s = personMonth(p);
      if (s.total < BEST_MIN) return;
      const sc = (s.done + 2) / (s.total + 4);
      if (sc > score + 1e-9 || (Math.abs(sc - score) < 1e-9 && s.done > personMonth(PEOPLE[best]).done)) { best = i; score = sc; }
    });
    return best;
  }

  function statCard(i, avatar, name, cls) {
    return `
        <div class="stat-wrap${cls}" style="--d:${i}" data-card="${i === PEOPLE.length ? 'total' : i}">
          <div class="stat-card">
            <span class="sc-best" title="أعلى نسبة إنجاز هذا الشهر مع مراعاة عدد المهام (${BEST_MIN} مهام على الأقل). المشرف خارج المقارنة.">👑 الأفضل أداءً</span>
            <div class="sc-avatar">${avatar}</div>
            <div class="sc-body">
              <div class="sc-name">${name}</div>
              <div class="sc-line"><span class="sc-num">0</span> مهمة خلال هذا الشهر</div>
              <div class="sc-rate" title="المهام المكتملة (تم) من مهام هذا الشهر"><span class="sc-bar"><i></i></span><span class="sc-pct">0%</span> إنجاز</div>
            </div>
          </div>
        </div>`;
  }

  function cardData(key) {
    if (key === 'total') {
      const all = PEOPLE.map(personMonth);
      const total = all.reduce((a, s) => a + s.total, 0), done = all.reduce((a, s) => a + s.done, 0);
      return { total, pct: total ? Math.round(done / total * 100) : 0 };
    }
    return personMonth(PEOPLE[+key]);
  }

  function renderStats() {
    if (!statsBox) return;
    if (!statsBox.children.length) {
      statsBox.innerHTML = PEOPLE.map((p, i) => statCard(i, esc(p.n.trim().charAt(0).toUpperCase()), esc(p.n), '')).join('')
        + statCard(PEOPLE.length, '∑', 'مجموع مهام الفريق', ' total');
    }
    const best = bestIndex();
    statsBox.querySelectorAll('.stat-wrap').forEach((w) => {
      const d = cardData(w.dataset.card);
      w.classList.toggle('best', String(best) === w.dataset.card);
      const num = w.querySelector('.sc-num'), pct = w.querySelector('.sc-pct'), bar = w.querySelector('.sc-bar i');
      const oldN = num.dataset.target, oldP = pct.dataset.target;
      num.dataset.target = d.total;
      pct.dataset.target = d.pct;
      // بعد العرض الأول: عند التحديث التلقائي تتحرك القيم من الحالية للجديدة فقط
      if (statsBox.classList.contains('play') && !w._pending) {
        if (oldN !== undefined && +oldN !== d.total) countUp(num, parseInt(num.textContent) || 0, d.total, 600);
        if (oldP !== undefined && +oldP !== d.pct) countUp(pct, parseInt(pct.textContent) || 0, d.pct, 600, '%');
        bar.style.width = d.pct + '%';
      }
    });
  }

  function playStats() {
    if (!statsBox || !loaded) return;
    statsBox.classList.remove('play', 'show-best');
    void statsBox.offsetWidth; // لإعادة تشغيل حركة الظهور
    statsBox.classList.add('play');
    clearTimeout(bestTimer);
    const wraps = [...statsBox.querySelectorAll('.stat-wrap')];
    wraps.forEach((w, i) => {
      const num = w.querySelector('.sc-num'), pct = w.querySelector('.sc-pct'), bar = w.querySelector('.sc-bar i');
      cancelAnimationFrame(num._raf); cancelAnimationFrame(pct._raf); clearTimeout(w._pending);
      num.textContent = '0'; pct.textContent = '0%'; bar.style.width = '0%';
      // يبدأ العدّ وامتلاء الشريط لحظة ظهور البطاقة نفسها
      w._pending = setTimeout(() => {
        w._pending = null;
        countUp(num, 0, +num.dataset.target);
        countUp(pct, 0, +pct.dataset.target, 1000, '%');
        bar.style.width = pct.dataset.target + '%';
      }, reduceMotion ? 0 : i * 350 + 250);
    });
    // التاج يظهر بعد انتهاء عدّ كل البطاقات
    bestTimer = setTimeout(() => statsBox.classList.add('show-best'), reduceMotion ? 0 : (wraps.length - 1) * 350 + 1400);
  }

  document.addEventListener('tab-change', (e) => { if (e.detail === 'team') playStats(); });

  function moreLabel(open, total) {
    return open ? 'إخفاء المهام' : `عرض كل المهام (${total})`;
  }

  // فتح/إغلاق القائمة بدون إعادة رسم، حتى تظهر حركة الانزلاق
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-more]');
    if (!b) return;
    const i = +b.dataset.more;
    const open = !expanded.has(i);
    open ? expanded.add(i) : expanded.delete(i);
    $("team-x-" + i).classList.toggle('open', open);
    b.classList.toggle('open', open);
    b.setAttribute('aria-expanded', open);
    b.querySelector('.lbl').textContent = moreLabel(open, $("team-x-" + i).querySelectorAll('.team-task').length + SHOW_N);
  });

  /* ----- تحميل البيانات من الشيت (بدون كاش، وتحديث تلقائي) ----- */
  /* ----- 🔑 مفتاح الفريق: يُحفظ على هذا الجهاز ويُرسل مع كل قراءة وكتابة ----- */
  const KEY_STORE = 'team_key_v1';
  let teamKey = '';
  try { teamKey = localStorage.getItem(KEY_STORE) || ''; } catch (e) {}
  const panel = $("panel-team");

  function showAuth(msg) {
    panel.classList.add('locked');
    $("teamAuth").hidden = false;
    $("teamAuthErr").textContent = msg || '';
    status.textContent = 'بانتظار مفتاح الفريق';
    setTimeout(() => $("teamKeyInput").focus(), 50);
  }
  function hideAuth() {
    panel.classList.remove('locked');
    $("teamAuth").hidden = true;
  }
  $("teamAuthForm").addEventListener('submit', (e) => {
    e.preventDefault();
    teamKey = $("teamKeyInput").value.trim();
    try { localStorage.setItem(KEY_STORE, teamKey); } catch (x) {}
    $("teamKeyInput").value = '';
    $("teamAuthErr").textContent = 'جارٍ التحقق…';
    load(true);
  });
  $("teamKeyReset").addEventListener('click', () => {
    if (!confirm('تغيير مفتاح الفريق على هذا الجهاز؟')) return;
    teamKey = '';
    try { localStorage.removeItem(KEY_STORE); } catch (x) {}
    rows = []; render(); showAuth();
  });

  let loading = false, pendingRender = false;
  async function load(fromAuth) {
    if (SCRIPT_URL.startsWith('PASTE')) { status.textContent = 'ضع رابط الـ Web App في SCRIPT_URL'; return; }
    if (!teamKey) { showAuth(); return; }
    if (loading) return;
    loading = true;
    try {
      const j = await (await fetch(SCRIPT_URL + '?key=' + encodeURIComponent(teamKey) + '&t=' + Date.now(), { cache: 'no-store' })).json();
      if (j.auth === false) { loading = false; showAuth(fromAuth ? j.error : ''); return; }
      if (!j.version || j.version < 4) throw new Error('الشيت: السكربت المنشور نسخة قديمة — بـ Apps Script اعمل Deploy ← Manage deployments ← ✏️ ← New version');
      if (j.error) throw new Error('الشيت ردّ بخطأ: ' + j.error);
      hideAuth();
      rows = (j.rows || []).map((r, idx) => ({ ...r, _i: idx }));
      // لا نعيد الرسم أثناء إدخال وقت لمهمة حتى لا يضيع ما يُكتب
      if (document.querySelector('.fix-time:not([hidden])')) { pendingRender = true; loading = false; return; }
      status.textContent = 'آخر تحديث: ' + new Date().toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }) + ' · ' + rows.length + ' مهمة';
      render();
      if (!loaded) { loaded = true; if (teamTabActive()) playStats(); }
    } catch (e) {
      // رسالة واضحة بدل "تعذّر التحميل" فقط، حتى يُعرف السبب
      status.textContent = e.message.startsWith('الشيت')
        ? e.message
        : 'تعذّر الوصول للشيت — تأكد أن النشر على «Anyone» وأن رابط SCRIPT_URL هو رابط النشر الحالي';
    }
    loading = false;
  }
  setInterval(() => { if (!document.hidden) load(); }, 60 * 1000); // كل دقيقة
  document.addEventListener('visibilitychange', () => { if (!document.hidden) load(); }); // عند الرجوع للصفحة

  /* ----- فتح نافذة إضافة مهمة ----- */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('.team-plus');
    if (!b) return;
    cur = +b.dataset.i;
    $("teamDialogTitle").textContent = 'مهمة جديدة – ' + PEOPLE[cur].n;
    $("teamDate").value = new Date().toLocaleDateString('en-CA');
    $("teamErr").textContent = '';
    $("teamDesc").value = '';
    hideAc();
    $("teamNt").value = '';
    // حركة "نبضة" على زر + ثم تُفتح النافذة بعدها مباشرة
    b.classList.remove('pop');
    void b.offsetWidth;
    b.classList.add('pop');
    setTimeout(() => { $("teamDlg").showModal(); $("teamDesc").focus(); }, 220);
  });

  $("teamCancel").addEventListener('click', () => $("teamDlg").close());

  /* ----- اقتراح تلقائي لوصف المهمة (لتوحيد التسمية) ----- */
  const acBox = $("teamAc"), descEl = $("teamDesc");
  let acItems = [], acSel = -1;

  function taskIndex() {
    const groups = new Map();
    rows.forEach((r) => {
      const text = String(r.desc || '').replace(/^fusion 360 \|\s*/i, '').trim();
      const k = looseKey(text);
      if (!text || !k || isAbsence(r)) return;
      let g = groups.get(k);
      if (!g) { g = { k, variants: new Map(), count: 0, last: '', people: new Set(), type: '', project: '' }; groups.set(k, g); }
      g.count++;
      g.variants.set(text, (g.variants.get(text) || 0) + 1);
      PEOPLE.forEach((p, i) => { if (belongs(p, r)) g.people.add(i); });
      if (String(r.date) >= g.last) { g.last = String(r.date); g.type = r.type; g.project = r.project; }
    });
    // الكتابة الأكثر استخداماً هي المعتمدة لكل مجموعة
    groups.forEach((g) => { g.text = [...g.variants.entries()].sort((a, b) => b[1] - a[1])[0][0]; });
    return [...groups.values()];
  }

  function hideAc() { acBox.hidden = true; acBox.innerHTML = ''; acItems = []; acSel = -1; }
  function showAc() {
    const q = descEl.value.trim(), qn = normDesc(q), ql = looseKey(q);
    if (qn.length < 2) return hideAc();
    acItems = taskIndex()
      .filter((g) => normDesc(g.text) !== qn && (normDesc(g.text).includes(qn) || (ql.length >= 2 && g.k.includes(ql))))
      .sort((a, b) => (b.people.has(cur) - a.people.has(cur)) || b.count - a.count || b.last.localeCompare(a.last))
      .slice(0, 6);
    if (!acItems.length) return hideAc();
    acSel = -1;
    acBox.innerHTML = '<div class="ac-head">مهام مستخدمة سابقاً — اختر واحدة لتوحيد الاسم</div>'
      + acItems.map((g, i) => `<div class="ac-item" role="option" data-ac="${i}"><span>${esc(g.text)}</span><small>${g.count} مرة${g.type ? ' · ' + esc(g.type) : ''}</small></div>`).join('');
    acBox.hidden = false;
  }
  function pickAc(i) {
    const g = acItems[i];
    if (!g) return;
    descEl.value = g.text;
    if (g.type && TYPES.includes(g.type)) $("teamTy").value = g.type;
    if (g.project && PROJECTS.includes(g.project)) $("teamPr").value = g.project;
    hideAc();
    descEl.focus();
  }
  descEl.addEventListener('input', showAc);
  descEl.addEventListener('blur', () => setTimeout(hideAc, 120));
  descEl.addEventListener('keydown', (e) => {
    if (acBox.hidden) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      acSel = (acSel + (e.key === 'ArrowDown' ? 1 : -1) + acItems.length) % acItems.length;
      acBox.querySelectorAll('.ac-item').forEach((el, i) => el.classList.toggle('sel', i === acSel));
    } else if (e.key === 'Enter' && acSel >= 0) {
      e.preventDefault(); pickAc(acSel);
    } else if (e.key === 'Escape') {
      e.preventDefault(); hideAc(); // يغلق الاقتراحات فقط، لا النافذة
    }
  });
  acBox.addEventListener('mousedown', (e) => {
    const it = e.target.closest('[data-ac]');
    if (it) { e.preventDefault(); pickAc(+it.dataset.ac); }
  });

  /* يرسل صفاً واحداً للشيت. يرجّع null عند النجاح، أو نص الخطأ */
  async function postTask(payload) {
    try {
      const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify({ ...payload, key: teamKey }) });
      const j = await res.json();
      if (j.auth === false) { showAuth(j.error); return j.error || 'مفتاح الفريق غير صحيح'; }
      return j.ok ? null : (j.error || 'فشل الإضافة');
    } catch (x) {
      return 'تعذّر الاتصال بالشيت، تحقق من الرابط وصلاحيات النشر';
    }
  }

  $("teamForm").addEventListener('submit', async (e) => {
    e.preventDefault();
    $("teamGo").disabled = true;
    $("teamErr").textContent = '';
    const err = await postTask({
      name: PEOPLE[cur].n, desc: $("teamDesc").value.trim(), date: $("teamDate").value,
      start: $("teamT1").value, end: $("teamT2").value,
      status: $("teamSt").value, type: $("teamTy").value, project: $("teamPr").value, notes: $("teamNt").value,
    });
    if (err) $("teamErr").textContent = err;
    else { $("teamDlg").close(); await load(); }
    $("teamGo").disabled = false;
  });

  /* ----- الإصلاح السريع: «تمّت» و«+ وقت» على المهام التي عليها تنبيه ----- */
  async function updateRow(r, changes, card) {
    const btns = card.querySelectorAll('.fix button, .fix-time button');
    btns.forEach((b) => { b.disabled = true; });
    card.querySelector('.fix-err').textContent = '';
    const err = await postTask({ action: 'update', row: r.row, name: r.name, desc: r.desc, ...changes });
    if (err) {
      card.querySelector('.fix-err').textContent = err;
      btns.forEach((b) => { b.disabled = false; });
      return false;
    }
    return true;
  }
  const toMin = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + m; };

  document.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-fix]');
    if (!b) return;
    const card = b.closest('.team-task');
    const rowNum = +(b.closest('[data-row]').dataset.row);
    const r = rows.find((x) => x.row === rowNum);
    if (!r) return;
    const act = b.dataset.fix;
    const timeBox = card.querySelector('.fix-time');

    if (act === 'time') { timeBox.hidden = false; card.querySelector('.fix').hidden = true; timeBox.querySelector('.ft-start').focus(); return; }
    if (act === 'cancel-time') {
      timeBox.hidden = true; card.querySelector('.fix').hidden = false;
      if (pendingRender) { pendingRender = false; render(); }
      return;
    }
    if (act === 'done') {
      if (await updateRow(r, { status: 'تم' }, card)) { r.status = 'تم'; render(); load(); }
      return;
    }
    if (act === 'save-time') {
      const start = timeBox.querySelector('.ft-start').value, end = timeBox.querySelector('.ft-end').value;
      if (!start || !end || toMin(end) <= toMin(start)) { card.querySelector('.fix-err').textContent = 'وقت النهاية يجب أن يكون بعد وقت البداية'; return; }
      if (await updateRow(r, { start, end }, card)) {
        r.start = start; r.end = end; r.hours = Math.round((toMin(end) - toMin(start)) / 60 * 100) / 100;
        timeBox.hidden = true; pendingRender = false;
        render(); load();
      }
    }
  });

  /* =========================================================
     مؤقت المهمة: يبدأ عند إنشاء المهمة، ويُرسل للشيت عند الإنهاء
     بوقت بداية حقيقي ووقت نهاية = البداية + الوقت الفعلي للعمل
     (أوقات الإيقاف المؤقت لا تُحتسب). يُحفظ في المتصفح، فإغلاق
     الصفحة أو تحديثها لا يوقف المؤقت.
     ========================================================= */
  const TIMER_KEY = 'team_timers_v1';
  let timers = [];
  try { timers = JSON.parse(localStorage.getItem(TIMER_KEY) || '[]'); } catch (e) { timers = []; }
  const saveTimers = () => { try { localStorage.setItem(TIMER_KEY, JSON.stringify(timers)); } catch (e) {} };

  const pad = (n) => String(n).padStart(2, '0');
  const hhmm = (d) => pad(d.getHours()) + ':' + pad(d.getMinutes());
  function workedMs(t, now = Date.now()) {
    return now - t.startedAt - t.pausedTotal - (t.pausedAt ? now - t.pausedAt : 0);
  }
  function fmtElapsed(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60].map(pad).join(':');
  }

  /* إيقاف مؤقت / استئناف — الوقت المتوقف لا يُحتسب من مدة العمل */
  function pauseTimer(t, now = Date.now()) {
    if (!t.pausedAt) t.pausedAt = now;
  }
  function resumeTimer(t, now = Date.now()) {
    // مؤقت واحد فقط يعمل لكل شخص: أي مؤقت آخر شغّال له يتوقف تلقائياً
    timers.forEach((x) => { if (x !== t && x.person === t.person) pauseTimer(x, now); });
    if (t.pausedAt) { t.pausedTotal += now - t.pausedAt; t.pausedAt = null; }
  }

  // تصحيح بيانات قديمة: إن وُجد أكثر من مؤقت شغّال لنفس الشخص يبقى الأحدث فقط
  PEOPLE.forEach((p, i) => {
    const running = timers.filter((x) => x.person === i && !x.pausedAt).sort((a, b) => b.startedAt - a.startedAt);
    running.slice(1).forEach((x) => pauseTimer(x));
  });
  saveTimers();

  function timerCard(t) {
    const running = !t.pausedAt;
    const opt = (v) => `<option${(t.finalStatus || 'تم') === v ? ' selected' : ''}>${v}</option>`;
    return `<div class="timer-card ${running ? 'running' : 'paused'}" data-id="${t.id}">
        <span class="timer-badge">${running ? '● قيد العمل' : '⏸ متوقف مؤقتاً'}</span>
        <div class="timer-desc">${esc(t.desc)}</div>
        <div class="timer-clock" data-clock="${t.id}">${fmtElapsed(workedMs(t))}</div>
        <div class="timer-sub">بدأ ${hhmm(new Date(t.startedAt))}${running ? '' : ' · أوقف ' + hhmm(new Date(t.pausedAt))}</div>
        <div class="timer-actions">
          ${running
            ? '<button type="button" class="pause" data-act="pause">⏸ إيقاف مؤقت</button>'
            : '<button type="button" class="resume" data-act="resume">▶ استئناف</button>'}
          <select data-role="status" title="حالة المهمة عند الإنهاء">${opt('تم')}${opt('جزئي')}${opt('لم يكتمل')}</select>
          <button type="button" class="finish" data-act="finish">⏹ إنهاء وإرسال</button>
          <button type="button" class="cancel" data-act="cancel" title="إلغاء المؤقت دون إرسال">✕</button>
        </div>
        <div class="timer-err"></div>
      </div>`;
  }

  function renderTimers() {
    PEOPLE.forEach((p, i) => {
      const box = $("team-t-" + i);
      if (!box) return;
      const mine = timers.filter((x) => x.person === i)
        // الشغّال أولاً، ثم المتوقفة الأحدث توقفاً
        .sort((a, b) => (!a.pausedAt === !b.pausedAt) ? (b.pausedAt || b.startedAt) - (a.pausedAt || a.startedAt) : (a.pausedAt ? 1 : -1));
      const paused = mine.filter((x) => x.pausedAt).length;
      box.innerHTML = mine.map(timerCard).join('')
        + (paused > 1 ? `<div class="timer-note">${paused} مهام متوقفة — اضغط «استئناف» لمتابعة أي منها من حيث توقفت</div>` : '');
    });
  }

  $("teamStartTimer").addEventListener('click', () => {
    const desc = $("teamDesc").value.trim();
    if (!desc) { $("teamErr").textContent = 'اكتب وصف المهمة أولاً'; $("teamDesc").focus(); return; }
    const now = Date.now();
    timers.forEach((x) => { if (x.person === cur) pauseTimer(x, now); }); // المهمة الحالية تتوقف مؤقتاً تلقائياً
    timers.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      person: cur, desc,
      type: $("teamTy").value, project: $("teamPr").value, notes: $("teamNt").value,
      startedAt: now, pausedTotal: 0, pausedAt: null,
    });
    saveTimers();
    renderTimers();
    $("teamDlg").close();
  });

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('.timer-card [data-act]');
    if (!btn) return;
    const card = btn.closest('.timer-card');
    const t = timers.find((x) => x.id === card.dataset.id);
    if (!t) return;
    const act = btn.dataset.act;

    if (act === 'pause' || act === 'resume') {
      act === 'pause' ? pauseTimer(t) : resumeTimer(t);
      saveTimers();
      renderTimers();
    } else if (act === 'cancel') {
      if (!confirm('إلغاء المؤقت؟ لن يُرسل أي شيء للشيت.')) return;
      timers = timers.filter((x) => x !== t);
      saveTimers();
      renderTimers();
    } else if (act === 'finish') {
      const start = new Date(t.startedAt);
      const worked = Math.max(60 * 1000, workedMs(t)); // دقيقة على الأقل
      let end = new Date(t.startedAt + worked);
      if (end.toDateString() !== start.toDateString()) { end = new Date(start); end.setHours(23, 59, 0, 0); }
      card.querySelectorAll('button, select').forEach((el) => { el.disabled = true; });
      card.querySelector('.timer-err').textContent = '';
      const err = await postTask({
        name: PEOPLE[t.person].n, desc: t.desc, date: start.toLocaleDateString('en-CA'),
        start: hhmm(start), end: hhmm(end),
        timer: fmtElapsed(workedMs(t)), // المدة الفعلية بالثانية (بدون أوقات الإيقاف)، تُكتب في عمود «مدة المؤقت»
        status: card.querySelector('[data-role="status"]').value,
        type: t.type, project: t.project, notes: t.notes,
      });
      if (err) {
        card.querySelector('.timer-err').textContent = err + ' — المؤقت محفوظ، جرّب مرة ثانية';
        card.querySelectorAll('button, select').forEach((el) => { el.disabled = false; });
        return;
      }
      timers = timers.filter((x) => x !== t);
      saveTimers();
      renderTimers();
      await load();
    }
  });

  document.addEventListener('change', (e) => {
    const sel = e.target.closest('.timer-card [data-role="status"]');
    if (!sel) return;
    const t = timers.find((x) => x.id === sel.closest('.timer-card').dataset.id);
    if (t) { t.finalStatus = sel.value; saveTimers(); }
  });

  // تحديث العدّاد كل ثانية دون إعادة بناء البطاقة (حتى لا يضيع اختيار الحالة)
  setInterval(() => {
    document.querySelectorAll('[data-clock]').forEach((el) => {
      const t = timers.find((x) => x.id === el.dataset.clock);
      if (t) el.textContent = fmtElapsed(workedMs(t));
    });
  }, 1000);

  renderTimers();
  load();
})();
