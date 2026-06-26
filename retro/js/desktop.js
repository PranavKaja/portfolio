/* ============================================================================
   desktop.js  —  Boot sequence, desktop icons, Start menu, taskbar, sound.
   ========================================================================== */
(function () {
  const $ = (s) => document.querySelector(s);
  const D = window.PRANAV;
  const TOUCH = matchMedia("(pointer: coarse)").matches;

  /* ---- sound (WebAudio, unlocked by the power-button click) ----------- */
  let ac = null, muted = false;
  function audio() { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} } return ac; }
  function beep(freq, dur, type, vol) {
    if (muted) return; const c = audio(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || "square"; o.frequency.value = freq;
    g.gain.value = vol || 0.05; o.connect(g); g.connect(c.destination);
    const t = c.currentTime; o.start(t); g.gain.setValueAtTime(g.gain.value, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.1)); o.stop(t + (dur || 0.1));
  }
  function startupChime() {
    if (muted) return; const notes = [392, 523.25, 659.25, 783.99];
    notes.forEach((f, i) => setTimeout(() => beep(f, 0.32, "triangle", 0.06), i * 130));
  }
  window.RETRO_SOUND = {
    beep, click: () => beep(660, 0.03, "square", 0.04),
    toggleMute: () => (muted = !muted),
    unlock: () => { const c = audio(); if (c && c.state === "suspended") c.resume(); },
  };

  /* ---- app registry ---------------------------------------------------- */
  const ICONS = [
    { key: "about", icon: "🧑‍💻", label: "About Pranav" },
    { key: "projects", icon: "🗂️", label: "My Projects" },
    { key: "resume", icon: "📃", label: "Resume" },
    { key: "skills", icon: "🛠️", label: "Skills" },
    { key: "interests", icon: "🖼️", label: "Interests" },
    { key: "contact", icon: "✉️", label: "Contact" },
    { key: "blog", icon: "📝", label: "Blog" },
    { key: "minesweeper", icon: "💣", label: "Minesweeper" },
    { key: "readme", icon: "📄", label: "readme.txt" },
    { key: "recycle", icon: "🗑️", label: "Recycle Bin" },
  ];

  function launch(key) {
    if (!window.APPS[key]) return;
    window.RETRO_SOUND.click();
    WM.open(window.APPS[key]());
  }

  /* ---- desktop icons --------------------------------------------------- */
  function renderDesktopIcons() {
    const wrap = document.createElement("div");
    wrap.className = "desk-icons";
    ICONS.forEach((it) => {
      const el = document.createElement("div");
      el.className = "desk-icon";
      el.tabIndex = 0;
      el.innerHTML = `<div class="ico">${it.icon}</div><div class="label">${it.label}</div>`;
      el.addEventListener("click", () => {
        document.querySelectorAll(".desk-icon").forEach((x) => x.classList.remove("selected"));
        el.classList.add("selected");
        if (TOUCH) launch(it.key); // single tap opens on touch
      });
      el.addEventListener("dblclick", () => launch(it.key));
      el.addEventListener("keydown", (e) => { if (e.key === "Enter") launch(it.key); });
      wrap.appendChild(el);
    });
    $("#desktop").appendChild(wrap);
    // clicking empty desktop clears selection + closes start menu
    $("#desktop").addEventListener("mousedown", (e) => {
      if (e.target.id === "desktop") {
        document.querySelectorAll(".desk-icon").forEach((x) => x.classList.remove("selected"));
        closeStart();
      }
    });
  }

  /* ---- start menu ------------------------------------------------------ */
  function buildStartMenu() {
    const menu = $("#start-menu");
    const items = [
      { key: "about", icon: "🧑‍💻", label: "About Pranav" },
      { key: "projects", icon: "🗂️", label: "My Projects" },
      { key: "skills", icon: "🛠️", label: "Skills" },
      { key: "resume", icon: "📃", label: "Resume" },
      { key: "interests", icon: "🖼️", label: "Interests" },
      { key: "blog", icon: "📝", label: "Blog" },
      { key: "contact", icon: "✉️", label: "Contact" },
      { sep: true },
      { key: "minesweeper", icon: "💣", label: "Minesweeper" },
      { key: "readme", icon: "📄", label: "Help / readme" },
      { sep: true },
      { action: "standard", icon: "🌐", label: "Standard Site" },
      { action: "shutdown", icon: "⏻", label: "Shut Down..." },
    ];
    const list = document.createElement("div");
    list.className = "sm-items";
    items.forEach((it) => {
      if (it.sep) { const s = document.createElement("div"); s.className = "sm-sep"; list.appendChild(s); return; }
      const row = document.createElement("div");
      row.className = "sm-item";
      row.innerHTML = `<span class="smico">${it.icon}</span><span>${it.label}</span>`;
      row.addEventListener("click", () => {
        closeStart();
        if (it.action === "standard") window.open(D.identity.portfolio, "_blank", "noopener");
        else if (it.action === "shutdown") shutdown();
        else launch(it.key);
      });
      list.appendChild(row);
    });
    menu.innerHTML = `<div class="sm-rail"><b>Pranav</b><span class="v">95</span></div>`;
    menu.appendChild(list);
  }

  function openStart() { $("#start-menu").classList.add("open"); $("#start-btn").classList.add("open"); window.RETRO_SOUND.click(); }
  function closeStart() { $("#start-menu").classList.remove("open"); $("#start-btn").classList.remove("open"); }
  function toggleStart() { $("#start-menu").classList.contains("open") ? closeStart() : openStart(); }

  /* ---- clock ----------------------------------------------------------- */
  function tickClock() {
    const d = new Date();
    let h = d.getHours(); const m = String(d.getMinutes()).padStart(2, "0");
    const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12;
    $("#clock").textContent = `${h}:${m} ${ap}`;
  }

  /* ---- shutdown -------------------------------------------------------- */
  function shutdown() {
    const s = $("#shutdown");
    s.classList.remove("hidden");
    beep(220, 0.4, "sine", 0.05);
  }

  /* ---- boot sequence --------------------------------------------------- */
  const BIOS = [
    "PranavOS BIOS v4.00  (C) 1995-" + new Date().getFullYear(),
    "",
    "Main Processor : Pentium-class (Data & Analytics Engine)",
    "Memory Test : 65536K OK",
    "",
    "Detecting Drives ...",
    "  Primary Master  : PRANAV-HD  (Projects, Skills, Resume)",
    "  Secondary Master: INTERESTS-CD",
    "",
    "Detecting Skills ...... SQL, Python, ETL, Power BI, ML  [OK]",
    "Loading Mission Files .. 10 found  [OK]",
    "",
    "Starting PranavOS ...",
  ];

  function runBoot() {
    const boot = $("#boot");
    const out = boot.querySelector(".bios");
    out.textContent = "";
    let line = 0;
    beep(880, 0.12, "square", 0.05); // POST beep
    const iv = setInterval(() => {
      if (line >= BIOS.length) {
        clearInterval(iv);
        out.innerHTML += "\n<span class='blink'></span>";
        setTimeout(showSplash, 650);
        return;
      }
      out.textContent += BIOS[line] + "\n";
      if (BIOS[line].length) beep(1200, 0.012, "square", 0.02);
      line++;
    }, 180);
  }

  function showSplash() {
    $("#boot").classList.add("hidden");
    const sp = $("#splash"); sp.classList.add("show");
    const bar = sp.querySelector("i");
    let w = 0;
    const iv = setInterval(() => {
      w += 4 + Math.random() * 9; bar.style.width = Math.min(100, w) + "%";
      if (w >= 100) { clearInterval(iv); setTimeout(enterDesktop, 450); }
    }, 110);
  }

  function enterDesktop() {
    $("#splash").classList.remove("show");
    $("#desktop").classList.remove("hidden");
    $("#taskbar").classList.remove("hidden");
    startupChime();
    // auto-open the welcome note the first time
    setTimeout(() => WM.open(window.APPS.readme()), 400);
  }

  /* ---- power gate (first user gesture, unlocks audio) ------------------ */
  function showPowerGate() {
    const boot = $("#boot");
    boot.classList.remove("hidden");
    boot.querySelector(".bios").textContent = "";
    const gate = $("#power-gate");
    gate.classList.remove("hidden");
    const go = () => {
      gate.classList.add("hidden");
      audio(); // unlock
      runBoot();
    };
    gate.querySelector("#power-btn").addEventListener("click", go);
    document.addEventListener("keydown", function once(e) {
      if (!gate.classList.contains("hidden")) { document.removeEventListener("keydown", once); go(); }
    });
  }

  /* ---- login screen (the entry point) --------------------------------- */
  function showLogin() {
    $("#boot").classList.add("hidden");
    $("#splash").classList.remove("show");
    const login = $("#crt-login");
    if (!login) { enterDesktop(); return; } // safety: no markup, just go in
    login.classList.add("show");
    let done = false;
    const proceed = () => {
      if (done) return; done = true;
      audio(); // unlock audio on the click/keypress gesture
      beep(660, 0.05, "square", 0.04);
      login.classList.remove("show");
      enterDesktop();
    };
    const ok = login.querySelector("#login-btn");
    const cancel = login.querySelector("#login-cancel");
    if (ok) ok.addEventListener("click", proceed);
    if (cancel) cancel.addEventListener("click", proceed);
    document.addEventListener("keydown", function onkey(e) {
      if (login.classList.contains("show") && e.key === "Enter") {
        e.preventDefault(); document.removeEventListener("keydown", onkey); proceed();
      }
    });
    if (ok) setTimeout(() => ok.focus(), 60);
  }

  /* ---- wire global controls ------------------------------------------- */
  function wireChrome() {
    $("#start-btn").addEventListener("click", (e) => { e.stopPropagation(); toggleStart(); });
    document.addEventListener("mousedown", (e) => {
      if (!e.target.closest("#start-menu") && !e.target.closest("#start-btn")) closeStart();
    });
    $("#reboot-btn") && $("#reboot-btn").addEventListener("click", () => location.reload());
    const mute = $("#mute-btn");
    if (mute) mute.addEventListener("click", () => {
      window.RETRO_SOUND.toggleMute();
      mute.textContent = mute.textContent === "🔊" ? "🔇" : "🔊";
    });
  }

  /* ---- init ------------------------------------------------------------ */
  document.addEventListener("DOMContentLoaded", () => {
    renderDesktopIcons();
    buildStartMenu();
    wireChrome();
    tickClock(); setInterval(tickClock, 1000 * 15);
    // dev shortcut: ?desk skips straight to the desktop
    if (/[?&]desk\b/.test(location.search)) {
      $("#boot").classList.add("hidden");
      enterDesktop();
    } else {
      runBoot(); // BIOS POST -> splash -> login -> desktop
    }
  });

  window.RETRO = { launch, enterDesktop, runBoot, showPowerGate };
})();
