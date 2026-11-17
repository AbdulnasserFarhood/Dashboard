/* ===== إعدادات الملاحظات المؤقتة ===== */
const NOTE_TTL_MS = 30 * 60 * 1000;   // الملاحظة تختفي بعد 30 دقيقة (غيّر الرقم كما تريد)
const SHEET_COUNT = 4;                 // عدد الأوراق المكدسة
const STORAGE_KEY = 'media-dashboard-notes';
/* ===================================== */

(function(){
  const $s = id => document.getElementById(id);

  /* ----- التخزين (localStorage) ----- */
  function readNotes(){
    try{
      const all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      /* نشيل الملاحظات المنتهية أثناء فتح الصفحة */
      return all.filter(n => Date.now() - n.created < NOTE_TTL_MS);
    }catch(e){ return []; }
  }
  function writeNotes(list){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
    catch(e){ console.warn('تعذّر حفظ الملاحظات:', e); }
  }
  let notes = readNotes();
  writeNotes(notes);

  /* ----- بناء اللوحة ----- */
  const padWrap = document.createElement('aside');
  padWrap.className = 'pad-wrap';
  padWrap.innerHTML = `
    <div class="pad" id="pad"></div>
    <p class="pad-hint">اضغط الورقة العلوية لتكتب ملاحظة</p>
    <div class="notes" id="notes"></div>`;
  document.querySelector('.wrap').before(padWrap);

  const overlay = document.createElement('div');
  overlay.className = 'overlay';
  overlay.id = 'overlay';
  overlay.innerHTML = `
    <div class="big-paper" role="dialog" aria-modal="true">
      <h3>ملاحظة مؤقتة</h3>
      <textarea id="noteText" placeholder="اكتب ملاحظتك…"></textarea>
      <div class="btns">
        <button id="noteCancel">إلغاء</button>
        <button id="noteSave" class="save">حفظ</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);

  const pad = $s('pad'), notesBox = $s('notes');
  pad.innerHTML = Array.from({length: SHEET_COUNT}, () => '<div class="sheet"></div>').join('');
  const top = () => pad.lastElementChild;

  let busy = false;

  /* ----- عرض ملاحظة واحدة ----- */
  function renderNote(n, animate){
    const el = document.createElement('div');
    el.className = 'note';
    el.dataset.id = n.id;
    if (!animate) el.style.animation = 'none';
    const time = new Date(n.created).toLocaleTimeString('ar', {hour:'2-digit', minute:'2-digit'});
    el.innerHTML = `<button class="x" title="حذف">×</button><div class="txt"></div><small>${time}</small>`;
    el.querySelector('.txt').textContent = n.text;

    el.querySelector('.x').onclick = () => removeNote(n.id);

    /* تختفي تلقائياً عند انتهاء المدة المتبقية */
    const remaining = n.created + NOTE_TTL_MS - Date.now();
    setTimeout(() => removeNote(n.id), Math.max(0, remaining));
    return el;
  }

  /* ----- حذف ملاحظة (من الشاشة ومن التخزين) ----- */
  function removeNote(id){
    const el = notesBox.querySelector(`.note[data-id="${id}"]`);
    notes = notes.filter(n => n.id !== id);
    writeNotes(notes);
    if (el && !el.classList.contains('fade')){
      el.classList.add('fade');
      setTimeout(() => el.remove(), 500);
    }
  }

  /* ----- عرض الملاحظات المحفوظة عند فتح الصفحة ----- */
  notes.slice().sort((a,b) => b.created - a.created)
       .forEach(n => notesBox.appendChild(renderNote(n, false)));

  /* ----- فتح المحرر بعد أنيميشن رفع الورقة ----- */
  pad.addEventListener('click', e => {
    const sheet = e.target.closest('.sheet');
    if (!sheet || sheet !== top() || busy) return;
    busy = true;
    sheet.classList.add('lift');
    setTimeout(() => {
      overlay.classList.add('show');
      $s('noteText').value = '';
      $s('noteText').focus();
    }, 380);
  });

  function closeEditor(){
    overlay.classList.remove('show');
    const sheet = top();
    if (sheet) sheet.classList.remove('lift');
    busy = false;
  }

  /* ----- إضافة ملاحظة جديدة ----- */
  function addNote(text){
    const created = Date.now();
    const n = { id: created.toString(36) + Math.random().toString(36).slice(2,6), text, created };
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
