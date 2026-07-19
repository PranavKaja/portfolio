/* ============================================================================
   wm.js ,  Tiny window manager: open/focus/drag/resize/min/max/close windows
   and keep the taskbar in sync. No dependencies.
   ========================================================================== */
(function () {
  const desktop = () => document.getElementById("desktop");
  const taskRow = () => document.getElementById("task-buttons");

  let zTop = 100;
  const wins = new Map(); // id -> { el, taskBtn, state }
  let openCount = 0;
  const SMALL = () => window.innerWidth < 760;

  function focus(id) {
    const w = wins.get(id);
    if (!w) return;
    for (const [, other] of wins) other.el.classList.add("inactive");
    w.el.classList.remove("inactive", "minimized");
    w.el.style.zIndex = ++zTop;
    for (const [, other] of wins) other.taskBtn.classList.remove("active");
    w.taskBtn.classList.add("active");
  }

  function cascade() {
    const n = openCount % 9;
    return { left: 60 + n * 26, top: 40 + n * 24 };
  }

  // Public: open (or focus if already open) a window.
  // opts: { id, title, icon, width, height, body(HTMLElement|string), menubar, status, onClose }
  function open(opts) {
    if (wins.has(opts.id)) { focus(opts.id); return wins.get(opts.id).el; }
    openCount++;

    const el = document.createElement("div");
    el.className = "win";
    const pos = cascade();
    const w = Math.min(opts.width || 460, window.innerWidth - 20);
    const h = Math.min(opts.height || 360, window.innerHeight - 60);
    el.style.width = w + "px";
    el.style.height = h + "px";
    el.style.left = Math.max(4, Math.min(pos.left, window.innerWidth - w - 10)) + "px";
    el.style.top = Math.max(4, pos.top) + "px";

    const icon = opts.icon || "📁";
    el.innerHTML = `
      <div class="win-titlebar">
        <span class="t-ico">${icon}</span>
        <span class="win-title">${opts.title}</span>
        <span class="win-btns">
          <button class="win-btn min" title="Minimize" aria-label="Minimize">_</button>
          <button class="win-btn max" title="Maximize" aria-label="Maximize">▢</button>
          <button class="win-btn close" title="Close" aria-label="Close">✕</button>
        </span>
      </div>
      ${opts.menubar ? `<div class="win-menubar">${opts.menubar}</div>` : ""}
      <div class="win-body ${opts.bodyClass || ""}"></div>
      ${opts.status ? `<div class="win-statusbar">${opts.status}</div>` : ""}
      <div class="win-resize"></div>`;

    const body = el.querySelector(".win-body");
    if (typeof opts.body === "string") body.innerHTML = opts.body;
    else if (opts.body) body.appendChild(opts.body);

    desktop().appendChild(el);

    // taskbar button
    const taskBtn = document.createElement("button");
    taskBtn.className = "task-btn active";
    taskBtn.innerHTML = `<span class="t-ico">${icon}</span><span class="t">${opts.title}</span>`;
    taskRow().appendChild(taskBtn);

    const rec = { el, taskBtn, state: "normal", restore: null, onClose: opts.onClose };
    wins.set(opts.id, rec);

    // interactions
    el.addEventListener("mousedown", () => focus(opts.id));
    taskBtn.addEventListener("click", () => {
      const isActive = taskBtn.classList.contains("active");
      const isMin = el.classList.contains("minimized");
      if (isMin) { focus(opts.id); }
      else if (isActive) { el.classList.add("minimized"); taskBtn.classList.remove("active"); }
      else { focus(opts.id); }
    });

    el.querySelector(".win-btn.close").addEventListener("click", (e) => { e.stopPropagation(); close(opts.id); });
    el.querySelector(".win-btn.min").addEventListener("click", (e) => {
      e.stopPropagation(); el.classList.add("minimized"); taskBtn.classList.remove("active");
    });
    el.querySelector(".win-btn.max").addEventListener("click", (e) => { e.stopPropagation(); toggleMax(opts.id); });
    el.querySelector(".win-titlebar").addEventListener("dblclick", () => toggleMax(opts.id));

    makeDraggable(el);
    makeResizable(el);
    if (opts.onMount) try { opts.onMount(el); } catch (e) { console.error(e); }
    // On phones, windows open maximized so they're usable without dragging.
    if (SMALL()) el.classList.add("maximized");
    focus(opts.id);
    return el;
  }

  function toggleMax(id) {
    const w = wins.get(id); if (!w) return;
    w.el.classList.toggle("maximized");
  }

  function close(id) {
    const w = wins.get(id); if (!w) return;
    if (w.onClose) try { w.onClose(); } catch (e) {}
    w.el.remove(); w.taskBtn.remove(); wins.delete(id);
    // focus the topmost remaining window
    let top = null, topZ = -1;
    for (const [, o] of wins) {
      const z = parseInt(o.el.style.zIndex || 0, 10);
      if (z > topZ) { topZ = z; top = o; }
    }
    if (top) { for (const [oid, o] of wins) if (o === top) focus(oid); }
  }

  function makeDraggable(el) {
    const bar = el.querySelector(".win-titlebar");
    let sx, sy, ox, oy, dragging = false, pid = null;
    bar.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".win-btn")) return;
      if (el.classList.contains("maximized")) return;
      dragging = true; pid = e.pointerId;
      sx = e.clientX; sy = e.clientY;
      ox = el.offsetLeft; oy = el.offsetTop;
      bar.style.cursor = "grabbing";
      bar.setPointerCapture(pid);
      e.preventDefault();
    });
    bar.addEventListener("pointermove", (e) => {
      if (!dragging || e.pointerId !== pid) return;
      let nl = ox + (e.clientX - sx);
      let nt = oy + (e.clientY - sy);
      nl = Math.max(-el.offsetWidth + 80, Math.min(nl, window.innerWidth - 80));
      nt = Math.max(0, Math.min(nt, window.innerHeight - 60));
      el.style.left = nl + "px"; el.style.top = nt + "px";
    });
    const end = (e) => { if (e.pointerId === pid) { dragging = false; bar.style.cursor = "grab"; } };
    bar.addEventListener("pointerup", end);
    bar.addEventListener("pointercancel", end);
  }

  function makeResizable(el) {
    const h = el.querySelector(".win-resize");
    let sx, sy, ow, oh, rz = false, pid = null;
    h.addEventListener("pointerdown", (e) => {
      rz = true; pid = e.pointerId; sx = e.clientX; sy = e.clientY;
      ow = el.offsetWidth; oh = el.offsetHeight;
      h.setPointerCapture(pid);
      e.preventDefault(); e.stopPropagation();
    });
    h.addEventListener("pointermove", (e) => {
      if (!rz || e.pointerId !== pid) return;
      el.style.width = Math.max(240, ow + (e.clientX - sx)) + "px";
      el.style.height = Math.max(140, oh + (e.clientY - sy)) + "px";
    });
    const end = (e) => { if (e.pointerId === pid) rz = false; };
    h.addEventListener("pointerup", end);
    h.addEventListener("pointercancel", end);
  }

  window.WM = { open, close, focus, isOpen: (id) => wins.has(id) };
})();
