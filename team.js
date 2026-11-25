/* =========================================================
   متابعة الفريق — يقرأ ويكتب إلى نفس Google Sheet القديم
   (يعرض كل المهام، الأحدث أولاً، مع تحديث تلقائي كل دقيقة)
   ========================================================= */
(function () {
  "use strict";

  /* ===== الإعدادات: نفس رابط الـ Web App السابق ===== */
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyqmOqz8l3OikVOOmhFNkRSSEq6vlhmxQX1wNS5uaCD1Fq9Bzn5uPTT4qotRtcw_0uT/exec';
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

  function render() {
    PEOPLE.forEach((p, i) => {
      const mine = rows
        .filter((r) => String(r.name || '').toLowerCase().includes(p.k))
        // الأحدث تاريخاً أولاً؛ وفي نفس اليوم الصف المضاف لاحقاً في الشيت أولاً
        .sort((a, b) => String(b.date).localeCompare(String(a.date)) || b._i - a._i);
      const month = mine.filter((r) => String(r.date).startsWith(thisMonth()));
      const hours = month.reduce((a, r) => a + (parseFloat(r.hours) || 0), 0);
      const statEl = $("team-s-" + i);
      const listEl = $("team-l-" + i);
      if (statEl) statEl.textContent = `هذا الشهر: ${month.length} مهام · ${hours.toFixed(2)} ساعة`;
      if (listEl) {
        const card = (r) => `<div class="team-task">${esc(r.desc)}<div class="m"><span>${esc(r.date)}</span><span class="${r.status === 'تم' ? 'ok' : 'pt'}">${esc(r.status)}</span><span>${esc(r.hours || '—')} س</span>${r.timer ? `<span class="tm" title="المدة الفعلية من المؤقت">⏱ ${esc(r.timer)}</span>` : ''}</div></div>`;
        const rest = mine.slice(SHOW_N);
        const open = expanded.has(i);
        listEl.innerHTML = (mine.slice(0, SHOW_N).map(card).join('') || '<div class="team-msg">لا مهام بعد</div>')
          + (rest.length ? `
            <div class="team-extra${open ? ' open' : ''}" id="team-x-${i}"><div class="team-extra-inner">${rest.map(card).join('')}</div></div>
            <button type="button" class="team-more${open ? ' open' : ''}" data-more="${i}" aria-expanded="${open}">
              <span class="lbl">${moreLabel(open, mine.length)}</span><span class="chev">▾</span>
            </button>` : '');
      }
    });
    renderStats();
  }

  /* =========================================================
     بطاقات مهام الشهر (يسار الصفحة): تظهر بالتتابع، والعدد يتصاعد من 0
     ========================================================= */
  const statsBox = $("teamStats");
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let loaded = false;

  function monthCount(p) {
    return rows.filter((r) => String(r.name || '').toLowerCase().includes(p.k) && String(r.date).startsWith(thisMonth())).length;
  }
  function countUp(el, from, to, dur = 1000) {
    cancelAnimationFrame(el._raf);
    if (reduceMotion) { el.textContent = to; return; }
    const t0 = performance.now();
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      el.textContent = Math.round(from + (to - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) el._raf = requestAnimationFrame(step);
    };
    el._raf = requestAnimationFrame(step);
  }
  function teamTabActive() { return $("panel-team").classList.contains('active'); }

  function renderStats() {
    if (!statsBox) return;
    if (!statsBox.children.length) {
      statsBox.innerHTML = PEOPLE.map((p, i) => `
        <div class="stat-wrap" style="--d:${i}">
          <div class="stat-card">
            <div class="sc-avatar">${esc(p.n.trim().charAt(0).toUpperCase())}</div>
            <div class="sc-body">
              <div class="sc-name">${esc(p.n)}</div>
              <div class="sc-line"><span class="sc-num" data-i="${i}">0</span> مهمة خلال هذا الشهر</div>
            </div>
          </div>
        </div>`).join('') + `
        <div class="stat-wrap total" style="--d:${PEOPLE.length}">
          <div class="stat-card">
            <div class="sc-avatar">∑</div>
            <div class="sc-body">
              <div class="sc-name">مجموع مهام الفريق</div>
              <div class="sc-line"><span class="sc-num" data-i="total">0</span> مهمة خلال هذا الشهر</div>
            </div>
          </div>
        </div>`;
    }
    statsBox.querySelectorAll('.sc-num').forEach((el) => {
      const target = el.dataset.i === 'total'
        ? PEOPLE.reduce((sum, p) => sum + monthCount(p), 0)
        : monthCount(PEOPLE[+el.dataset.i]);
      const old = el.dataset.target;
      el.dataset.target = target;
      // بعد العرض الأول: عند التحديث التلقائي يتحرك الرقم من قيمته الحالية للجديدة فقط
      if (statsBox.classList.contains('play') && old !== undefined && +old !== target && !el._t) countUp(el, +el.textContent || 0, target, 600);
    });
  }

  function playStats() {
    if (!statsBox || !loaded) return;
    statsBox.classList.remove('play');
    void statsBox.offsetWidth; // لإعادة تشغيل حركة الظهور
    statsBox.classList.add('play');
    statsBox.querySelectorAll('.sc-num').forEach((el, i) => {
      cancelAnimationFrame(el._raf);
      clearTimeout(el._t);
      el.textContent = '0';
      // يبدأ العدّ لحظة ظهور البطاقة نفسها
      el._t = setTimeout(() => { el._t = null; countUp(el, 0, +el.dataset.target); }, reduceMotion ? 0 : i * 350 + 250);
    });
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
  let loading = false;
  async function load() {
    if (SCRIPT_URL.startsWith('PASTE')) { status.textContent = 'ضع رابط الـ Web App في SCRIPT_URL'; return; }
    if (loading) return;
    loading = true;
    try {
      const j = await (await fetch(SCRIPT_URL + '?t=' + Date.now(), { cache: 'no-store' })).json();
      if (!j.version) throw new Error('الشيت: السكربت المنشور نسخة قديمة — بـ Apps Script اعمل Deploy ← Manage deployments ← ✏️ ← New version');
      if (j.error) throw new Error('الشيت ردّ بخطأ: ' + j.error);
      rows = (j.rows || []).map((r, idx) => ({ ...r, _i: idx }));
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
    $("teamNt").value = '';
    // حركة "نبضة" على زر + ثم تُفتح النافذة بعدها مباشرة
    b.classList.remove('pop');
    void b.offsetWidth;
    b.classList.add('pop');
    setTimeout(() => { $("teamDlg").showModal(); $("teamDesc").focus(); }, 220);
  });

  $("teamCancel").addEventListener('click', () => $("teamDlg").close());

  /* يرسل صفاً واحداً للشيت. يرجّع null عند النجاح، أو نص الخطأ */
  async function postTask(payload) {
    try {
      const res = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload) });
      const j = await res.json();
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
