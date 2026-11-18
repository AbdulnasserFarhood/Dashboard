/* =========================================================
   مساحتي — لوحة رسم حر (مسودات وأفكار سريعة)
   ========================================================= */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const dialog = $("drawDialog");
  const qaDraw = $("qaDraw");
  if (!dialog || !qaDraw) return;

  const canvas = $("drawCanvas");
  const ctx = canvas.getContext("2d");
  const STORE_KEY = "workspace_draw_v1";

  const COLORS = ["#1b1f2a", "#6c5ce7", "#ff6b6b", "#00bfa6", "#2ecc71", "#f5a623"];
  let currentColor = COLORS[0];
  let currentSize = 5;
  let erasing = false;
  let drawing = false;
  let last = null;

  const colorsBox = $("drawColors");
  const customColor = $("drawCustomColor");
  const sizeInput = $("drawSize");
  const eraserBtn = $("drawEraser");
  const clearBtn = $("drawClear");
  const saveBtn = $("drawSave");
  const closeBtn = $("drawClose");

  function buildColors() {
    colorsBox.innerHTML = "";
    COLORS.forEach((c, i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.style.background = c;
      b.title = c;
      if (i === 0) b.classList.add("on");
      b.addEventListener("click", () => {
        currentColor = c;
        erasing = false;
        eraserBtn.classList.remove("active");
        colorsBox.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
        b.classList.add("on");
      });
      colorsBox.appendChild(b);
    });
  }

  customColor.addEventListener("input", () => {
    currentColor = customColor.value;
    erasing = false;
    eraserBtn.classList.remove("active");
    colorsBox.querySelectorAll("button").forEach((x) => x.classList.remove("on"));
  });

  sizeInput.addEventListener("input", () => { currentSize = +sizeInput.value; });

  eraserBtn.addEventListener("click", () => {
    erasing = !erasing;
    eraserBtn.classList.toggle("active", erasing);
  });

  function fitCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const cssW = canvas.clientWidth;
    const cssH = canvas.clientHeight;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cssW, cssH);
  }

  function loadDrawing() {
    let saved = null;
    try { saved = localStorage.getItem(STORE_KEY); } catch (e) {}
    if (!saved) return;
    const img = new Image();
    img.onload = () => { ctx.drawImage(img, 0, 0, canvas.clientWidth, canvas.clientHeight); };
    img.src = saved;
  }

  function saveDrawing() {
    try { localStorage.setItem(STORE_KEY, canvas.toDataURL("image/png")); }
    catch (e) { console.warn("تعذّر حفظ الرسم محلياً (قد تكون المساحة ممتلئة)", e); }
  }

  function pos(e) {
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  canvas.addEventListener("pointerdown", (e) => {
    drawing = true;
    last = pos(e);
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drawing) return;
    const p = pos(e);
    ctx.globalCompositeOperation = erasing ? "destination-out" : "source-over";
    ctx.strokeStyle = currentColor;
    ctx.lineWidth = erasing ? currentSize * 3 : currentSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last = p;
  });
  function endStroke() {
    if (!drawing) return;
    drawing = false;
    saveDrawing();
  }
  canvas.addEventListener("pointerup", endStroke);
  canvas.addEventListener("pointercancel", endStroke);
  canvas.addEventListener("pointerleave", endStroke);

  clearBtn.addEventListener("click", () => {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    saveDrawing();
  });

  saveBtn.addEventListener("click", () => {
    const link = document.createElement("a");
    link.download = "رسمي-" + new Date().toISOString().slice(0, 10) + ".png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  });

  closeBtn.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (e) => { if (e.target === dialog) dialog.close(); });

  qaDraw.addEventListener("click", () => {
    dialog.showModal();
    requestAnimationFrame(() => { fitCanvas(); loadDrawing(); });
  });

  buildColors();
})();
