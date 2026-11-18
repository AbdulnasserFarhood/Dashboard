/* =========================================================
   مساحتي — التبديل بين تبويب "مساحتي الشخصية" و "متابعة الفريق"
   ========================================================= */
(function () {
  "use strict";
  const nav = document.getElementById("tabsNav");
  if (!nav) return;

  const STORE_KEY = "workspace_active_tab";

  function activate(tab) {
    nav.querySelectorAll(".tab-btn").forEach((b) => b.classList.toggle("active", b.dataset.tab === tab));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.toggle("active", p.id === "panel-" + tab));
    try { localStorage.setItem(STORE_KEY, tab); } catch (e) {}
  }

  nav.addEventListener("click", (e) => {
    const btn = e.target.closest(".tab-btn");
    if (btn) activate(btn.dataset.tab);
  });

  const saved = localStorage.getItem(STORE_KEY);
  if (saved === "team" || saved === "personal") activate(saved);
})();
