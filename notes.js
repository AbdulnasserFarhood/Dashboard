/* =========================================================
   مساحتي — الملاحظات اللاصقة: إنشاء، تثبيت، سحب، انتهاء تلقائي
   ========================================================= */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const STORE_KEY = "workspace_notes_v1";
  const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 أيام

  // الألوان الجاهزة: الألوان الباردة (الأساسي/الأزرق/الأخضر) أولاً، ثم الدافئة
  const PRESET_COLORS = [
    { hex: "#e3dcff", name: "بنفسجي (أساسي)" },
    { hex: "#d2e9fb", name: "أزرق" },
    { hex: "#cff4d2", name: "أخضر" },
    { hex: "#ffe0c2", name: "خوخي" },
    { hex: "#fff3b0", name: "أصفر" },
    { hex: "#ffd3e0", name: "وردي" },
  ];
  const DEFAULT_COLOR = PRESET_COLORS[0].hex;
  // توافق مع ملاحظات محفوظة من نسخة سابقة كانت تخزّن اسم اللون بدل قيمته
  const LEGACY_COLOR_MAP = { yellow: "#fff3b0", pink: "#ffd3e0", green: "#cff4d2", blue: "#d2e9fb", peach: "#ffe0c2" };

  const grid = $("notesGrid");
  const addTile = $("addNoteTile");
  const dialog = $("noteDialog");
  const form = $("noteForm");
  const textArea = $("noteText");
  const swatchBox = $("noteSwatches");

  let notes = [];
  let selectedColor = DEFAULT_COLOR;
  let editingId = null; // null = creating new

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function load() {
    try { notes = JSON.parse(localStorage.getItem(STORE_KEY) || "[]"); }
    catch (e) { notes = []; }
    notes.forEach((n) => { if (LEGACY_COLOR_MAP[n.color]) n.color = LEGACY_COLOR_MAP[n.color]; });
    const now = Date.now();
    const before = notes.length;
    notes = notes.filter((n) => now - n.createdAt < TTL_MS);
    if (notes.length !== before) save();
  }

  // يحسب أقرب لون نص مقروء (فاتح أو داكن) فوق أي خلفية يختارها المستخدم
  function readableInk(hex) {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
    if (!m) return "dark";
    const [r, g, b] = [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)];
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.55 ? "light" : "dark";
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(notes)); }
    catch (e) { console.warn("تعذّر حفظ الملاحظات", e); }
  }

  function formatRemaining(createdAt) {
    const msLeft = createdAt + TTL_MS - Date.now();
    if (msLeft <= 0) return "تنتهي الآن";
    const days = Math.floor(msLeft / 86400000);
    const hours = Math.floor((msLeft % 86400000) / 3600000);
    if (days >= 1) return `متبقٍ ${days} يوم`;
    if (hours >= 1) return `متبقٍ ${hours} ساعة`;
    return "متبقٍ أقل من ساعة";
  }
  function formatDate(ts) {
    return new Intl.DateTimeFormat("ar", { day: "numeric", month: "short" }).format(new Date(ts));
  }

  function densityClass(count) {
    if (count <= 4) return "density-1";
    if (count <= 8) return "density-2";
    if (count <= 14) return "density-3";
    return "density-4";
  }

  function render() {
    const now = Date.now();
    const before = notes.length;
    notes = notes.filter((n) => now - n.createdAt < TTL_MS);
    if (notes.length !== before) save();

    grid.className = "notes-grid " + densityClass(notes.length);

    // رتّب: المثبّتة أولاً مع الحفاظ على ترتيبها النسبي
    const ordered = notes.slice().sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));

    grid.querySelectorAll(".note:not(.add-note)").forEach((el) => el.remove());
    ordered.forEach((n) => grid.appendChild(buildNoteCard(n)));

    $("notesEmptyHint").classList.toggle("hidden", notes.length > 0);
  }

  function buildNoteCard(n) {
    const el = document.createElement("div");
    el.className = "note" + (n.pinned ? " pinned" : "") + (readableInk(n.color) === "light" ? " ink-light" : "");
    el.dataset.id = n.id;
    el.style.background = n.color;
    el.style.setProperty("--rot", (seedRotation(n.id)).toFixed(1) + "deg");

    const tools = document.createElement("div");
    tools.className = "note-tools";

    const pinBtn = document.createElement("button");
    pinBtn.type = "button";
    pinBtn.className = "pin" + (n.pinned ? " on" : "");
    pinBtn.title = n.pinned ? "إلغاء التثبيت" : "تثبيت";
    pinBtn.textContent = "📌";
    pinBtn.addEventListener("click", (e) => { e.stopPropagation(); togglePin(n.id); });

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.title = "تعديل";
    editBtn.textContent = "✏️";
    editBtn.addEventListener("click", (e) => { e.stopPropagation(); openEditor(n); });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.title = "حذف";
    delBtn.textContent = "🗑️";
    delBtn.addEventListener("click", (e) => { e.stopPropagation(); removeNote(n.id); });

    tools.append(pinBtn, editBtn, delBtn);

    const text = document.createElement("p");
    text.className = "note-text";
    text.textContent = n.text;

    const meta = document.createElement("div");
    meta.className = "note-meta";
    meta.innerHTML = `<span>${formatDate(n.createdAt)}</span><span class="note-time">${formatRemaining(n.createdAt)}</span>`;

    el.append(tools, text, meta);
    el.addEventListener("pointerdown", startDrag);
    return el;
  }

  // تدوير ثابت وخفيف لكل ملاحظة بحسب معرفها (بدل عشوائي يتغير كل رندر)
  function seedRotation(id) {
    let hash = 0;
    for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) % 1000;
    return ((hash % 60) - 30) / 10; // -3deg .. 3deg
  }

  function addNote(text, color) {
    notes.unshift({ id: uid(), text, color, createdAt: Date.now(), pinned: false });
    save();
    render();
  }
  function updateNote(id, text, color) {
    const n = notes.find((x) => x.id === id);
    if (n) { n.text = text; n.color = color; save(); render(); }
  }
  function removeNote(id) {
    notes = notes.filter((n) => n.id !== id);
    save();
    render();
  }
  function togglePin(id) {
    const n = notes.find((x) => x.id === id);
    if (n) { n.pinned = !n.pinned; save(); render(); }
  }
  function saveOrder() {
    const ids = [...grid.querySelectorAll(".note:not(.add-note)")].map((el) => el.dataset.id);
    notes = ids.map((id) => notes.find((n) => n.id === id)).filter(Boolean);
    save();
  }

  /* ---------------- محرر الملاحظة (حوار) ---------------- */
  let customInput = null;

  function buildSwatches() {
    swatchBox.innerHTML = "";
    PRESET_COLORS.forEach((c) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "swatch";
      b.title = c.name;
      b.dataset.hex = c.hex;
      b.style.background = c.hex;
      b.addEventListener("click", () => selectColor(c.hex));
      swatchBox.appendChild(b);
    });

    // سوتش إضافي يفتح منتقي ألوان النظام — يسمح باختيار أي لون تريده بدقة
    const wrap = document.createElement("label");
    wrap.className = "swatch custom-swatch-wrap";
    wrap.title = "اختر أي لون تريده";
    customInput = document.createElement("input");
    customInput.type = "color";
    customInput.className = "custom-swatch-input";
    customInput.value = DEFAULT_COLOR;
    customInput.addEventListener("input", () => selectColor(customInput.value, true));
    wrap.appendChild(customInput);
    swatchBox.appendChild(wrap);
  }

  function selectColor(hex, fromCustom) {
    selectedColor = hex;
    swatchBox.querySelectorAll(".swatch:not(.custom-swatch-wrap)").forEach((b) => {
      b.classList.toggle("on", !fromCustom && b.dataset.hex.toLowerCase() === hex.toLowerCase());
    });
    swatchBox.querySelector(".custom-swatch-wrap").classList.toggle("on", !!fromCustom);
    if (customInput && /^#[0-9a-f]{6}$/i.test(hex)) customInput.value = hex;
  }

  function openEditor(note) {
    editingId = note ? note.id : null;
    $("noteDialogTitle").textContent = note ? "تعديل الملاحظة" : "ملاحظة جديدة";
    textArea.value = note ? note.text : "";
    const color = note ? note.color : DEFAULT_COLOR;
    const isPreset = PRESET_COLORS.some((c) => c.hex.toLowerCase() === (color || "").toLowerCase());
    selectColor(color, !isPreset);
    dialog.showModal();
    textArea.focus();
  }

  addTile.addEventListener("click", () => openEditor(null));
  document.addEventListener("open-note-editor", () => openEditor(null));
  $("noteCancel").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = textArea.value.trim();
    if (!text) return;
    if (editingId) updateNote(editingId, text, selectedColor);
    else addNote(text, selectedColor);
    dialog.close();
  });

  /* ---------------- السحب لإعادة الترتيب ---------------- */
  function startDrag(e) {
    if (e.button !== 0 || e.target.closest(".note-tools")) return;
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const sx = e.clientX, sy = e.clientY;
    const offX = sx - rect.left, offY = sy - rect.top;
    let dragging = false, ph = null;

    function begin() {
      dragging = true;
      ph = document.createElement("div");
      ph.className = "note-ph";
      ph.style.width = rect.width + "px";
      ph.style.height = rect.height + "px";
      el.before(ph);
      el.classList.add("dragging");
      el.style.width = rect.width + "px";
      el.style.left = rect.left + "px";
      el.style.top = rect.top + "px";
    }

    function move(ev) {
      if (!dragging) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 6) return;
        begin();
      }
      el.style.left = ev.clientX - offX + "px";
      el.style.top = ev.clientY - offY + "px";

      const others = [...grid.querySelectorAll(".note:not(.dragging):not(.add-note)")];
      for (const o of others) {
        const r = o.getBoundingClientRect();
        if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
          const before = ev.clientX < r.left + r.width / 2 || ev.clientY < r.top + r.height / 2;
          const target = before ? o : o.nextElementSibling;
          if (target !== ph) grid.insertBefore(ph, target);
          break;
        }
      }
    }

    function end() {
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", end);
      el.removeEventListener("pointercancel", end);
      if (!dragging) return;
      ph.replaceWith(el);
      el.classList.remove("dragging");
      el.style.width = "";
      el.style.left = "";
      el.style.top = "";
      saveOrder();
    }

    el.setPointerCapture(e.pointerId);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  }

  // تحديث نص "الوقت المتبقي" كل دقيقة دون إعادة بناء كل البطاقات
  setInterval(() => {
    let changed = false;
    const now = Date.now();
    notes.forEach((n) => { if (now - n.createdAt >= TTL_MS) changed = true; });
    if (changed) { render(); return; }
    grid.querySelectorAll(".note:not(.add-note)").forEach((el) => {
      const n = notes.find((x) => x.id === el.dataset.id);
      const timeEl = el.querySelector(".note-time");
      if (n && timeEl) timeEl.textContent = formatRemaining(n.createdAt);
    });
  }, 60 * 1000);

  buildSwatches();
  load();
  render();
})();
