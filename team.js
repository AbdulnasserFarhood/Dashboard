/* =========================================================
   متابعة الفريق — يقرأ ويكتب إلى نفس Google Sheet القديم
   (منقول كما هو من النسخة السابقة من الموقع دون تغيير في المنطق)
   ========================================================= */
(function () {
  "use strict";

  /* ===== الإعدادات: نفس رابط الـ Web App السابق ===== */
  const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby_ZKgt4NKJWqdlDRGJjCoJ7hg1myc2aVlgPW30GNjzIsAQgTyNMYpxihnaLB32_ZTA/exec';
  const KEYWORD = 'fusion';            // المهام التي يحتوي وصفها هذه الكلمة تظهر هنا
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
  function render() {
    PEOPLE.forEach((p, i) => {
      const mine = rows.filter((r) => r.name.toLowerCase().includes(p.k)).sort((a, b) => b.date.localeCompare(a.date));
      const hours = mine.reduce((a, r) => a + (parseFloat(r.hours) || 0), 0);
      const statEl = $("team-s-" + i);
      const listEl = $("team-l-" + i);
      if (statEl) statEl.textContent = `${mine.length} مهام · ${hours.toFixed(2)} ساعة`;
      if (listEl) {
        listEl.innerHTML = mine.map((r) => `<div class="team-task">${esc(r.desc)}<div class="m"><span>${esc(r.date)}</span><span class="${r.status === 'تم' ? 'ok' : 'pt'}">${esc(r.status)}</span><span>${esc(r.hours || '—')} س</span></div></div>`).join('') || '<div class="team-msg">لا مهام بعد</div>';
      }
    });
  }

  /* ----- تحميل البيانات من الشيت ----- */
  async function load() {
    if (SCRIPT_URL.startsWith('PASTE')) { status.textContent = 'ضع رابط الـ Web App في SCRIPT_URL'; return; }
    try {
      const j = await (await fetch(SCRIPT_URL)).json();
      rows = j.rows.filter((r) => r.desc.toLowerCase().includes(KEYWORD));
      status.textContent = '';
      render();
    } catch (e) {
      status.textContent = 'تعذّر تحميل البيانات من الشيت';
    }
  }

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
    $("teamDlg").showModal();
  });

  $("teamCancel").addEventListener('click', () => $("teamDlg").close());

  function withKeyword(desc) {
    return desc.toLowerCase().includes(KEYWORD) ? desc : 'Fusion 360 | ' + desc;
  }

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
      name: PEOPLE[cur].n, desc: withKeyword($("teamDesc").value.trim()), date: $("teamDate").value,
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

  function renderTimers() {
    PEOPLE.forEach((p, i) => {
      const box = $("team-t-" + i);
      if (!box) return;
      const t = timers.find((x) => x.person === i);
      if (!t) { box.innerHTML = ''; return; }
      box.innerHTML = `<div class="timer-card${t.pausedAt ? ' paused' : ''}" data-id="${t.id}">
        <div class="timer-desc">${esc(t.desc)}</div>
        <div class="timer-clock" data-clock="${t.id}">${fmtElapsed(workedMs(t))}</div>
        <div class="timer-sub">${t.pausedAt ? '⏸ متوقف مؤقتاً' : '● قيد العمل'} · بدأ ${hhmm(new Date(t.startedAt))}</div>
        <div class="timer-actions">
          <button type="button" data-act="pause">${t.pausedAt ? '▶ متابعة' : '⏸ إيقاف مؤقت'}</button>
          <select data-role="status" title="حالة المهمة عند الإنهاء"><option>تم</option><option>جزئي</option><option>لم يكتمل</option></select>
          <button type="button" class="finish" data-act="finish">⏹ إنهاء وإرسال</button>
          <button type="button" class="cancel" data-act="cancel" title="إلغاء المؤقت دون إرسال">✕</button>
        </div>
        <div class="timer-err"></div>
      </div>`;
    });
  }

  $("teamStartTimer").addEventListener('click', () => {
    const desc = $("teamDesc").value.trim();
    if (!desc) { $("teamErr").textContent = 'اكتب وصف المهمة أولاً'; $("teamDesc").focus(); return; }
    if (timers.some((x) => x.person === cur)) {
      $("teamErr").textContent = 'يوجد مؤقت شغّال لهذا الشخص — أنهِه أولاً قبل بدء مهمة جديدة';
      return;
    }
    timers.push({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      person: cur, desc: withKeyword(desc),
      type: $("teamTy").value, project: $("teamPr").value, notes: $("teamNt").value,
      startedAt: Date.now(), pausedTotal: 0, pausedAt: null,
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

    if (act === 'pause') {
      const now = Date.now();
      if (t.pausedAt) { t.pausedTotal += now - t.pausedAt; t.pausedAt = null; }
      else t.pausedAt = now;
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
