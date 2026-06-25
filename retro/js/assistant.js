/* ============================================================================
   assistant.js  —  "Pip", a friendly 90s desktop helper.
   Pops up with tips and nudges toward Resume / Contact. Summon by typing
   "help" anywhere on the desktop. Auto-introduces itself once after a while.
   ========================================================================== */
(function () {
  if (window.__pipInit) return; window.__pipInit = true;

  var TIPS = [
    "Hi, I'm Pip! New here? Double-click <b>About Pranav</b> for the 30-second version of who he is.",
    "There are <b>10 projects</b> in <b>My Projects</b>. Double-click any file to dig in.",
    "Recruiter in a hurry? Grab the <b>Resume</b> right here — one click, downloadable.",
    "Like what you see? Don't be shy. Pranav's <b>open to full-time roles</b>.",
    "Psst… <b>Minesweeper</b> actually works. You're welcome.",
    "Drag windows by the title bar, resize from the bottom-right corner.",
    "Type <b>help</b> any time and I'll come back."
  ];

  var CHAR_SVG =
    '<svg viewBox="0 0 64 64" width="62" height="62" xmlns="http://www.w3.org/2000/svg">' +
    '<rect x="22" y="49" width="20" height="6" rx="1" fill="#a89a78"/>' +
    '<rect x="27" y="44" width="10" height="6" fill="#b8ab88"/>' +
    '<rect x="5" y="7" width="54" height="40" rx="5" fill="#cdbf9a" stroke="#897c5b" stroke-width="1.5"/>' +
    '<rect x="11" y="12" width="42" height="30" rx="2" fill="#0a1a22"/>' +
    '<circle cx="25" cy="25" r="3.4" fill="#6fe39a"/><circle cx="39" cy="25" r="3.4" fill="#6fe39a"/>' +
    '<path d="M24 33 q8 6 16 0" stroke="#6fe39a" stroke-width="2.6" fill="none" stroke-linecap="round"/>' +
    '<circle cx="50" cy="45" r="1.6" fill="#22ff66"/></svg>';

  var el, textEl, idx = 0, shown = false, intro = false;

  function deskReady() {
    var tb = document.getElementById("taskbar");
    return tb && !tb.classList.contains("hidden");
  }

  function build() {
    el = document.createElement("div");
    el.id = "assistant";
    el.innerHTML =
      '<div class="asst-bubble">' +
        '<button class="asst-close" data-act="close" aria-label="Close">✕</button>' +
        '<div class="asst-text"></div>' +
        '<div class="asst-actions">' +
          '<button class="asst-btn" data-act="next">Next tip ▸</button>' +
          '<button class="asst-btn primary" data-act="resume">📄 Resume</button>' +
          '<button class="asst-btn primary" data-act="contact">✉ Contact</button>' +
        '</div>' +
      '</div>' +
      '<div class="asst-char" title="Pip">' + CHAR_SVG + '</div>';
    document.body.appendChild(el);
    textEl = el.querySelector(".asst-text");
    el.addEventListener("click", onClick);
  }

  function render() { if (textEl) textEl.innerHTML = TIPS[idx % TIPS.length]; }

  function show(startIdx) {
    if (!el) build();
    if (typeof startIdx === "number") idx = startIdx;
    render();
    el.classList.add("show");
    shown = true;
    try { window.RETRO_SOUND && window.RETRO_SOUND.beep(880, 0.03, "square", 0.03); } catch (e) {}
  }
  function hide() { if (el) el.classList.remove("show"); }

  function onClick(e) {
    var btn = e.target.closest("[data-act]"); if (!btn) return;
    var act = btn.dataset.act;
    if (act === "close") return hide();
    if (act === "next") { idx++; render(); try { window.RETRO_SOUND && window.RETRO_SOUND.click(); } catch (x) {} return; }
    if (act === "resume" && window.APPS) { WM.open(window.APPS.resume()); return; }
    if (act === "contact" && window.APPS) { WM.open(window.APPS.contact()); return; }
  }

  /* ---- summon by typing "help" (or "pip") ----------------------------- */
  var buf = "";
  document.addEventListener("keydown", function (e) {
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    if (!deskReady()) return;
    if (e.key && e.key.length === 1 && /[a-z]/i.test(e.key)) {
      buf = (buf + e.key.toLowerCase()).slice(-6);
      if (buf.indexOf("help") > -1 || buf.indexOf("pip") > -1) { buf = ""; show(0); }
    }
  });

  /* ---- gentle auto-intro once the desktop has settled ----------------- */
  var poll = setInterval(function () {
    if (!deskReady()) return;
    clearInterval(poll);
    setTimeout(function () { if (!shown && !intro) { intro = true; show(0); } }, 15000);
  }, 600);

  window.PIP = { show: show, hide: hide };
})();
