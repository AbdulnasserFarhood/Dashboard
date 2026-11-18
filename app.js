/* =========================================================
   مساحتي — المنطق الأساسي: المظهر، الترحيب، الاقتباس، المهام
   ========================================================= */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const STORE = {
    theme: "workspace_theme",
    tasks: "workspace_tasks_v1",
    quoteDay: "workspace_quote_day",
  };

  /* ---------------------------------------------------------
     المظهر (فاتح/داكن)
  --------------------------------------------------------- */
  const root = document.documentElement;
  const themeBtn = $("themeToggle");

  function applyTheme(mode) {
    root.setAttribute("data-theme", mode);
    themeBtn.textContent = mode === "dark" ? "☀️" : "🌙";
  }
  function initTheme() {
    let saved = localStorage.getItem(STORE.theme);
    if (!saved) {
      saved = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    applyTheme(saved);
  }
  themeBtn.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    localStorage.setItem(STORE.theme, next);
    applyTheme(next);
  });
  initTheme();

  /* ---------------------------------------------------------
     التاريخ والترحيب
  --------------------------------------------------------- */
  function renderGreeting() {
    const now = new Date();
    const hour = now.getHours();
    let greet = "مساء الخير";
    if (hour < 12) greet = "صباح الخير";
    else if (hour < 17) greet = "نهارك سعيد";
    else if (hour < 21) greet = "مساء الخير";
    else greet = "ليلة هنيئة";

    $("greeting").textContent = `${greet} 👋`;
    $("dateLine").textContent = new Intl.DateTimeFormat("ar", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    }).format(now);
  }
  renderGreeting();

  /* ---------------------------------------------------------
     الاقتباس اليومي
  --------------------------------------------------------- */
  function dayOfYear(d) {
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = d - start;
    return Math.floor(diff / 86400000);
  }
  function showQuote(index) {
    const txt = $("quoteText");
    txt.classList.add("fade");
    setTimeout(() => {
      txt.textContent = QUOTES[index % QUOTES.length];
      txt.classList.remove("fade");
    }, 150);
  }
  function initQuote() {
    const todayKey = new Date().toDateString();
    const dailyIndex = dayOfYear(new Date()) % QUOTES.length;
    localStorage.setItem(STORE.quoteDay, todayKey);
    showQuote(dailyIndex);
  }
  $("newQuoteBtn").addEventListener("click", () => {
    const random = Math.floor(Math.random() * QUOTES.length);
    showQuote(random);
  });
  initQuote();

  /* ---------------------------------------------------------
     المهام
  --------------------------------------------------------- */
  const PRIO_RANK = { high: 0, medium: 1, low: 2 };
  let tasks = [];

  function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }
  function loadTasks() {
    try {
      tasks = JSON.parse(localStorage.getItem(STORE.tasks) || "[]");
    } catch (e) { tasks = []; }
  }
  function saveTasks() {
    try { localStorage.setItem(STORE.tasks, JSON.stringify(tasks)); }
    catch (e) { console.warn("تعذّر حفظ المهام", e); }
  }

  function renderTasks() {
    const list = $("taskList");
    const empty = $("tasksEmpty");
    const sorted = tasks.slice().sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (PRIO_RANK[a.priority] !== PRIO_RANK[b.priority]) return PRIO_RANK[a.priority] - PRIO_RANK[b.priority];
      return b.createdAt - a.createdAt;
    });

    list.innerHTML = "";
    sorted.forEach((t) => list.appendChild(buildTaskRow(t)));
    empty.classList.toggle("hidden", tasks.length > 0);

    const total = tasks.length;
    const done = tasks.filter((t) => t.done).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    $("progressFill").style.width = pct + "%";
    $("progressLabel").textContent = `${done} من ${total} (${pct}%)`;
  }

  function buildTaskRow(t) {
    const li = document.createElement("li");
    li.className = "task" + (t.done ? " done" : "");
    li.dataset.id = t.id;

    const check = document.createElement("button");
    check.className = "task-check";
    check.type = "button";
    check.title = t.done ? "إلغاء الإتمام" : "تمّت";
    check.textContent = t.done ? "✓" : "";
    check.addEventListener("click", () => toggleTask(t.id));

    const dot = document.createElement("span");
    dot.className = "task-prio " + t.priority;

    const title = document.createElement("span");
    title.className = "task-title";
    title.textContent = t.title;

    const actions = document.createElement("div");
    actions.className = "task-actions";

    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.title = "تعديل";
    editBtn.textContent = "✏️";
    editBtn.addEventListener("click", () => openEditTask(t.id));

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "del";
    delBtn.title = "حذف";
    delBtn.textContent = "🗑️";
    delBtn.addEventListener("click", () => deleteTask(t.id));

    actions.append(editBtn, delBtn);
    li.append(check, dot, title, actions);
    return li;
  }

  function addTask(title, priority) {
    tasks.unshift({ id: uid(), title: title.trim(), priority, done: false, createdAt: Date.now() });
    saveTasks();
    renderTasks();
  }
  function toggleTask(id) {
    const t = tasks.find((x) => x.id === id);
    if (t) { t.done = !t.done; saveTasks(); renderTasks(); }
  }
  function deleteTask(id) {
    tasks = tasks.filter((x) => x.id !== id);
    saveTasks();
    renderTasks();
  }

  let editingId = null;
  function openEditTask(id) {
    const t = tasks.find((x) => x.id === id);
    if (!t) return;
    editingId = id;
    $("editTaskInput").value = t.title;
    $("editTaskPriority").value = t.priority;
    $("taskEditDialog").showModal();
    $("editTaskInput").focus();
  }
  $("taskEditForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const t = tasks.find((x) => x.id === editingId);
    if (t) {
      t.title = $("editTaskInput").value.trim() || t.title;
      t.priority = $("editTaskPriority").value;
      saveTasks();
      renderTasks();
    }
    $("taskEditDialog").close();
  });
  $("editTaskCancel").addEventListener("click", () => $("taskEditDialog").close());

  $("addTaskForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("taskInput");
    const val = input.value.trim();
    if (!val) return;
    addTask(val, $("taskPriority").value);
    input.value = "";
    input.focus();
  });

  $("qaTask").addEventListener("click", () => {
    $("taskInput").scrollIntoView({ behavior: "smooth", block: "center" });
    $("taskInput").focus();
  });
  $("qaNote").addEventListener("click", () => {
    document.dispatchEvent(new CustomEvent("open-note-editor"));
  });

  loadTasks();
  renderTasks();

  // إعادة حساب الاقتباس تلقائياً عند تغيّر اليوم (مثلاً إن تُرك المتصفح مفتوحاً)
  setInterval(() => {
    const todayKey = new Date().toDateString();
    if (localStorage.getItem(STORE.quoteDay) !== todayKey) initQuote();
    renderGreeting();
  }, 60 * 1000);
})();
