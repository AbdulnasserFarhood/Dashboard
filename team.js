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
    { n: 'khaled moussa', k: 'khaled' },
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

  $("teamForm").addEventListener('submit', async (e) => {
    e.preventDefault();
    let desc = $("teamDesc").value.trim();
    if (!desc.toLowerCase().includes(KEYWORD)) desc = 'Fusion 360 | ' + desc;
    $("teamGo").disabled = true;
    $("teamErr").textContent = '';
    try {
      const res = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({
          name: PEOPLE[cur].n, desc, date: $("teamDate").value, start: $("teamT1").value, end: $("teamT2").value,
          status: $("teamSt").value, type: $("teamTy").value, project: $("teamPr").value, notes: $("teamNt").value,
        }),
      });
      const j = await res.json();
      if (!j.ok) { $("teamErr").textContent = j.error || 'فشل الإضافة'; }
      else { $("teamDlg").close(); await load(); }
    } catch (x) {
      $("teamErr").textContent = 'تعذّر الاتصال بالشيت، تحقق من الرابط وصلاحيات النشر';
    }
    $("teamGo").disabled = false;
  });

  load();
})();
