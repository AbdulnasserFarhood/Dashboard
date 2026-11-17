/* ===== الإعدادات ===== */
const NOTE_TTL_MS = 30 * 60 * 1000;   // الملاحظة تختفي بعد 30 دقيقة
const SHEET_COUNT = 4;                 // عدد الأوراق
const STORAGE_KEY = 'media-dashboard-notes';
const BANNER_TEXT = 'هون دائماً بدها تطلع حكمة يومية من اختيارك';

/* الحكم اللي بتطلع لما تضغط الشريط - عدّلها كما تريد */
const WISDOMS = [
  'من جدّ وجد، ومن زرع حصد.',
  'الوقت كالسيف، إن لم تقطعه قطعك.',
  'اتقن عملك تصل إلى ما تريد.',
  'خير الكلام ما قل ودل.',
  'الصبر مفتاح الفرج.'
];

/* ألوان الملاحظات */
const NOTE_COLORS = [
  {name:'أصفر',   bg:'#fff176', paper:'#fff8c5'},
  {name:'وردي',   bg:'#f8bbd0', paper:'#fde4ec'},
  {name:'أخضر',   bg:'#c5e1a5', paper:'#e6f4d7'},
  {name:'أزرق',   bg:'#b3e5fc', paper:'#e0f5fd'},
  {name:'برتقالي',bg:'#ffcc80', paper:'#fff0d9'}
];
const DEFAULT_COLOR = NOTE_COLORS[0];

/* مواقع الأوراق على الحبل ولفّتها */
const SLOTS = ['8%', '34%', '60%', '86%'];
const ROTS  = [-4, 3, -2, 5];
/* ==================== */

(function(){
  const $s = id => document.getElementById(id);
  const wrap = document.querySelector('.wrap');
  const colorByBg = bg => NOTE_COLORS.find(c => c.bg === bg) || DEFAULT_COLOR;

  /* ----- الشريط العلوي ----- */
  const banner = document.createElement('div');
  banner.className = 'banner';
  banner.textContent = BANNER_TEXT;
  banner.title = 'اضغط لحكمة جديدة';
  banner.addEventListener('click', () => {
    banner.textContent = WISDOMS[Math.floor(Math.random() * WISDOMS.length)];
    banner.classList.remove('swap');
    void banner.offsetWidth;
    banner.classList.add('swap');
  });
  wrap.prepend(banner);

  /* ----- التخزين ----- */
  function readNotes(){
    try{
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return all.filter(n => Date.now() - n.created < NOTE_TTL_MS);
    }catch(e){ return []; }
  }
  function writeNotes(list){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
    catch(e){ console.warn('تعذّر حفظ الملاحظات:', e); }
  }
  let notes = readNotes();
  writeNotes(notes);

  /* ----- منطقة الحبل ----- */
  const clothes = document.createElement('section');
  clothes.className = 'clothes';
  clothes.innerHTML = `
    <div class="line-area" id="lineArea">
      <svg class="line-svg" viewBox="0 0 1000 60" preserveAspectRatio="none" aria-hidden="true">
        <path pathLength="100" d="M0 24 Q500 44 1000 24"/>
      </svg>
      <div class="pad" id="pad"></div>
    </div>
    <p class="pad-hint">اضغط أي ورقة لتكتب ملاحظة</p>
    <div class="notes" id="notes"></div>`;
  banner.after(clothes);

  const pad = $s('pad'), notesBox = $s('notes'), area = $s('lineArea');
  pad.innerHTML = Array.from({length: SHEET_COUNT}, (_, i) => {
    const k = i % SLOTS.length;
    return `<div class="sheet" style="--i:${i};--r:${ROTS[k]}deg;--slot:${SLOTS[k]};--d:${(i*0.15).toFixed(2)}s"></div>`;
  }).join('');

  /* ----- التسلسل: الكومة تظهر، بعدين تنشر على الحبل ----- */
  setTimeout(() => area.classList.add('in'), 900);
  setTimeout(() => area.classList.add('spread'), 2200);

  /* ----- المحرر ----- */
  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'overlay';
  overlay.innerHTML = `
    <div class="big-paper" id="bigPaper" role="dialog" aria-modal="true">
      <h3>ملاحظة مؤقتة</h3>
      <textarea id="noteText" placeholder="اكتب ملاحظتك…"></textarea>
      <div class="swatches" id="swatches">
        ${NOTE_COLORS.map((c,i)=>`<button type="button" class="swatch" data-i="${i}" title="${c.name}" style="background:${c.bg}"></button>`).join('')}
      </div>
      <div class="btns">
        <button id="noteCancel">إلغاء</button>
        <button id="noteSave" class="save">حفظ</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  let busy = false, activeSheet = null, selected = DEFAULT_COLOR;

  function selectColor(c){
    selected = c;
    $s('bigPaper').style.background = c.paper;
    overlay.querySelectorAll('.swatch').forEach(b => {
      b.classList.toggle('on', NOTE_COLORS[+b.dataset.i] === c);
    });
  }
  $s('swatches').addEventListener('click', e => {
    const b = e.target.closest('.swatch');
    if (b) selectColor(NOTE_COLORS[+b.dataset.i]);
  });

  /* ----- عرض ملاحظة ----- */
  function renderNote(n, animate){
    const el = document.createElement('div');
    el.className = 'note';
    el.dataset.id = n.id;
    el.style.setProperty('--note', colorByBg(n.color).bg);
    if (!animate) el.style.animation = 'none';
    const time = new Date(n.created).toLocaleTimeString('ar', {hour:'2-digit', minute:'2-digit'});
    el.innerHTML = `<button class="x" title="حذف">×</button><div class="txt"></div><small>${time}</small>`;
    el.querySelector('.txt').textContent = n.text;
    el.querySelector('.x').onclick = () => removeNote(n.id);
    el.addEventListener('pointerdown', startDrag);
    setTimeout(() => removeNote(n.id), Math.max(0, n.created + NOTE_TTL_MS - Date.now()));
    return el;
  }

  function removeNote(id){
    const el = notesBox.querySelector(`.note[data-id="${id}"]`);
    notes = notes.filter(n => n.id !== id);
    writeNotes(notes);
    if (el && !el.classList.contains('fade')){
      el.classList.add('fade');
      setTimeout(() => el.remove(), 500);
    }
  }

  /* ----- ترتيب الملاحظات بالماوس (أو باللمس) ----- */
  function saveOrder(){
    const ids = [...notesBox.querySelectorAll('.note')].map(n => n.dataset.id);
    notes = ids.map(id => notes.find(n => n.id === id)).filter(Boolean);
    writeNotes(notes);
  }

  function startDrag(e){
    if (e.button !== 0 || e.target.closest('.x')) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const offX = sx - rect.left, offY = sy - rect.top;
    let dragging = false, ph = null;

    const begin = () => {
      dragging = true;
      ph = document.createElement('div');
      ph.className = 'note-ph';
      ph.style.width = rect.width + 'px';
      ph.style.height = rect.height + 'px';
      el.before(ph);
      el.classList.add('dragging');
      el.style.position = 'fixed';
      el.style.width = rect.width + 'px';
      el.style.left = rect.left + 'px';
      el.style.top = rect.top + 'px';
    };

    const move = ev => {
      if (!dragging) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
        begin();
      }
      el.style.left = (ev.clientX - offX) + 'px';
      el.style.top  = (ev.clientY - offY) + 'px';

      /* لما الماوس يدخل على ملاحظة ثانية، المكان الفاضي ينتقل قبلها أو بعدها */
      const others = [...notesBox.querySelectorAll('.note:not(.dragging)')];
      for (const o of others){
        const r = o.getBoundingClientRect();
        if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom){
          const before = ev.clientX < r.left + r.width / 2 || ev.clientY < r.top + r.height / 2;
          const target = before ? o : o.nextElementSibling;
          if (target !== ph) notesBox.insertBefore(ph, target);
          break;
        }
      }
    };

    const end = () => {
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', end);
      el.removeEventListener('pointercancel', end);
      if (!dragging) return;
      ph.replaceWith(el);
      el.classList.remove('dragging');
      el.style.position = '';
      el.style.width = '';
      el.style.left = '';
      el.style.top = '';
      saveOrder();
    };

    el.setPointerCapture(e.pointerId);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  notes.slice().sort((a,b) => b.created - a.created)
       .forEach(n => notesBox.appendChild(renderNote(n, false)));

  /* ----- اختيار ورقة: ترتفع ثم يفتح المحرر ----- */
  pad.addEventListener('click', e => {
    const sheet = e.target.closest('.sheet');
    if (!sheet || busy || !area.classList.contains('spread')) return;
    busy = true;
    activeSheet = sheet;
    sheet.classList.add('picked');
    setTimeout(() => {
      selectColor(DEFAULT_COLOR);
      overlay.classList.add('show');
      $s('noteText').value = '';
      $s('noteText').focus();
    }, 350);
  });

  function closeEditor(){
    overlay.classList.remove('show');
    if (activeSheet) activeSheet.classList.remove('picked');
    activeSheet = null;
    busy = false;
  }

  function addNote(text){
    const created = Date.now();
    const n = {
      id: created.toString(36) + Math.random().toString(36).slice(2,6),
      text, created, color: selected.bg
    };
    notes.unshift(n);
    writeNotes(notes);
    notesBox.prepend(renderNote(n, true));
  }

  $s('noteSave').onclick = () => {
    const text = $s('noteText').value.trim();
    if (text) addNote(text);
    closeEditor();
  };
  $s('noteCancel').onclick = closeEditor;
  overlay.addEventListener('click', e => { if (e.target === overlay) closeEditor(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlay.classList.contains('show')) closeEditor();
  });
})();
