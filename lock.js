/* =========================================================
   مساحتي — قفل المساحة برمز رقمي (PIN من أرقام فقط)
   ملاحظة: هذا قفل بسيط من جهة المتصفح لإبعاد النظر العابر فقط،
   وليس تشفيراً حقيقياً للبيانات — أي شخص يصل لأدوات المطوّر
   أو لتخزين المتصفح يمكنه تجاوزه. الرمز نفسه لا يُخزَّن كنص
   أبداً، بل يُخزَّن فقط ناتج تجزئته (SHA-256).
   ========================================================= */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);

  const HASH_KEY = "workspace_pin_hash";
  const LOCKED_KEY = "workspace_locked";

  const overlay = $("lockOverlay");
  const lockBtn = $("lockToggle");
  if (!overlay || !lockBtn) return;

  const unlockInput = $("unlockInput");
  const unlockErr = $("unlockErr");
  const unlockBtn = $("unlockBtn");

  const setPinDialog = $("setPinDialog");
  const setPinForm = $("setPinForm");
  const newPin1 = $("newPin1");
  const newPin2 = $("newPin2");
  const setPinErr = $("setPinErr");
  const setPinCancel = $("setPinCancel");

  const managePinDialog = $("managePinDialog");
  const managePinLink = $("managePinLink");
  const pinStep1 = $("pinStep1");
  const pinStep2 = $("pinStep2");
  const currentPinInput = $("currentPinInput");
  const managePinErr = $("managePinErr");
  const managePinCancel = $("managePinCancel");
  const managePinVerify = $("managePinVerify");
  const changePin1 = $("changePin1");
  const changePin2 = $("changePin2");
  const pinStep2Err = $("pinStep2Err");
  const removePinBtn = $("removePinBtn");
  const saveNewPinBtn = $("saveNewPinBtn");

  async function sha256(text) {
    const enc = new TextEncoder().encode(text);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  function hasPin() { return !!localStorage.getItem(HASH_KEY); }
  function isLocked() { return localStorage.getItem(LOCKED_KEY) === "1"; }

  function showOverlay(show) {
    overlay.classList.toggle("show", show);
    if (show) {
      unlockInput.value = "";
      unlockErr.textContent = "";
      setTimeout(() => unlockInput.focus(), 50);
    }
  }

  function lockNow() {
    localStorage.setItem(LOCKED_KEY, "1");
    showOverlay(true);
  }

  // قصر كل حقول إدخال الرمز على الأرقام فقط
  [unlockInput, newPin1, newPin2, currentPinInput, changePin1, changePin2].forEach((el) => {
    if (el) el.addEventListener("input", () => { el.value = el.value.replace(/\D/g, ""); });
  });

  // حالة القفل عند فتح الصفحة
  if (hasPin() && isLocked()) showOverlay(true);

  lockBtn.addEventListener("click", () => {
    if (!hasPin()) {
      newPin1.value = ""; newPin2.value = ""; setPinErr.textContent = "";
      setPinDialog.showModal();
      newPin1.focus();
    } else {
      lockNow();
    }
  });

  setPinCancel.addEventListener("click", () => setPinDialog.close());
  setPinForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const p1 = newPin1.value, p2 = newPin2.value;
    if (!/^\d{4,8}$/.test(p1)) { setPinErr.textContent = "أدخل رمزاً من أرقام فقط، من 4 إلى 8 خانات"; return; }
    if (p1 !== p2) { setPinErr.textContent = "الرمزان غير متطابقين"; return; }
    localStorage.setItem(HASH_KEY, await sha256(p1));
    setPinDialog.close();
    lockNow();
  });

  async function attemptUnlock() {
    const val = unlockInput.value;
    if (!val) return;
    const hash = await sha256(val);
    if (hash === localStorage.getItem(HASH_KEY)) {
      localStorage.setItem(LOCKED_KEY, "0");
      showOverlay(false);
    } else {
      unlockErr.textContent = "رمز غير صحيح";
      unlockInput.value = "";
      unlockInput.focus();
    }
  }
  unlockBtn.addEventListener("click", attemptUnlock);
  unlockInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); attemptUnlock(); } });

  /* ---------------- إدارة القفل: تغيير أو إزالة الرمز ---------------- */
  managePinLink.addEventListener("click", () => {
    if (!hasPin()) { alert("لا يوجد قفل مُفعّل بعد — اضغط زر 🔒 بالأعلى لتعيين رمز."); return; }
    pinStep1.classList.remove("hidden");
    pinStep2.classList.add("hidden");
    currentPinInput.value = "";
    managePinErr.textContent = "";
    managePinDialog.showModal();
    currentPinInput.focus();
  });
  managePinCancel.addEventListener("click", () => managePinDialog.close());

  managePinVerify.addEventListener("click", async () => {
    const hash = await sha256(currentPinInput.value || "");
    if (hash !== localStorage.getItem(HASH_KEY)) {
      managePinErr.textContent = "رمز غير صحيح";
      return;
    }
    pinStep1.classList.add("hidden");
    pinStep2.classList.remove("hidden");
    changePin1.value = ""; changePin2.value = ""; pinStep2Err.textContent = "";
    changePin1.focus();
  });

  removePinBtn.addEventListener("click", () => {
    localStorage.removeItem(HASH_KEY);
    localStorage.removeItem(LOCKED_KEY);
    managePinDialog.close();
  });

  saveNewPinBtn.addEventListener("click", async () => {
    const p1 = changePin1.value, p2 = changePin2.value;
    if (!/^\d{4,8}$/.test(p1)) { pinStep2Err.textContent = "أدخل رمزاً من أرقام فقط، من 4 إلى 8 خانات"; return; }
    if (p1 !== p2) { pinStep2Err.textContent = "الرمزان غير متطابقين"; return; }
    localStorage.setItem(HASH_KEY, await sha256(p1));
    managePinDialog.close();
  });
})();
