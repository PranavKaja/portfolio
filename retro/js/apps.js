/* ============================================================================
   apps.js ,  Builds the content for each desktop application/window.
   Each builder returns an options object consumed by WM.open().
   ========================================================================== */
(function () {
  const D = window.PRANAV;
  const TOUCH = matchMedia("(pointer: coarse)").matches;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  /* ---- About / My Computer -------------------------------------------- */
  function about() {
    const vitals = D.about.vitals.map(([k, v]) =>
      `<tr><td class="k">${esc(k)}:</td><td class="v">${esc(v)}</td></tr>`).join("");
    const body = `
      <div class="app" style="padding:16px 18px">
        <div class="row" style="gap:16px; align-items:flex-start">
          <div style="font-size:54px; line-height:1">🧑‍💻</div>
          <div>
            <h2 style="margin:0 0 2px">${esc(D.identity.name)}</h2>
            <div class="muted">${esc(D.identity.title)} · ${esc(D.identity.location)}</div>
            <div style="margin-top:4px; font-style:italic; color:#333">"${esc(D.identity.tagline)}"</div>
          </div>
        </div>
        <hr>
        <div class="group">
          <span class="legend">System Vitals</span>
          <table class="proprows">${vitals}</table>
        </div>
        <div class="group">
          <span class="legend">Origin Story</span>
          <p style="margin:0">${esc(D.about.story)}</p>
        </div>
        <div class="group">
          <span class="legend">How I Work</span>
          <p style="margin:0">${esc(D.about.approach)}</p>
        </div>
        <div class="group" style="margin-bottom:4px">
          <span class="legend">Operations Log</span>
          ${D.experience.map((x) => `
            <div style="margin-bottom:10px">
              <div style="font-weight:700">${esc(x.org)} &mdash; ${esc(x.role)}</div>
              <div class="muted" style="font-size:11px; margin-bottom:3px">${esc(x.dates)}</div>
              <ul style="margin:0; padding-left:18px">${x.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>
            </div>`).join("")}
        </div>
      </div>`;
    return { id: "about", title: "About Pranav", icon: "🧑‍💻", width: 540, height: 480,
      menubar: `<span><u>F</u>ile</span><span><u>E</u>dit</span><span><u>H</u>elp</span>`,
      body, bodyClass: "pad silver",
      status: `<div class="cell grow">Subject file loaded.</div><div class="cell">UMass Amherst</div>` };
  }

  /* ---- Projects folder ------------------------------------------------- */
  const statusGlyph = { deployed: "🟢", in_progress: "🟡", archived: "⚪" };
  function projects() {
    const wrap = document.createElement("div");
    wrap.className = "iconview";
    D.projects.forEach((p) => {
      const f = document.createElement("div");
      f.className = "fileicon";
      f.innerHTML = `<div class="ico">📄</div>
        <div class="label">${esc(p.title)}</div>
        <div class="sub">${statusGlyph[p.status] || ""} ${esc(p.code)}</div>`;
      f.addEventListener("dblclick", () => openProject(p.code));
      f.addEventListener("click", () => {
        wrap.querySelectorAll(".fileicon").forEach((x) => x.classList.remove("selected"));
        f.classList.add("selected");
        if (TOUCH) openProject(p.code); // single tap opens on touch
      });
      wrap.appendChild(f);
    });
    return { id: "projects", title: "My Projects", icon: "🗂️", width: 560, height: 420,
      menubar: `<span><u>F</u>ile</span><span><u>E</u>dit</span><span><u>V</u>iew</span><span><u>H</u>elp</span>`,
      body: wrap,
      status: `<div class="cell">${D.projects.length} object(s)</div><div class="cell grow">Double-click a file to open.</div>` };
  }

  function openProject(code) {
    const p = D.projects.find((x) => x.code === code);
    if (!p) return;
    const gh = p.github ? `<a class="btn95" href="${esc(p.github)}" target="_blank" rel="noopener" style="text-decoration:none; display:inline-block">${p.github.includes("github") ? "View on GitHub ↗" : "View Link ↗"}</a>` : "";
    const body = `
      <div class="app" style="padding:16px 18px">
        <div class="row" style="justify-content:space-between">
          <div class="muted" style="font-family:var(--mono)">${esc(p.code)} · ${esc(p.stack)}</div>
          <span class="pill ${p.status}">${p.status.replace("_", " ")}</span>
        </div>
        <h2 style="margin:6px 0 2px">${esc(p.title)}</h2>
        <p style="font-style:italic; color:#333; margin:0 0 10px">${esc(p.hook)}</p>
        <p>${esc(p.brief)}</p>
        <div class="group"><span class="legend">Highlights</span>
          <div class="chips">${p.chips.map((c) => `<span class="chip">${esc(c)}</span>`).join("")}</div>
        </div>
        <table class="proprows" style="margin-bottom:10px">
          <tr><td class="k">Role:</td><td class="v">${esc(p.role)}</td></tr>
          <tr><td class="k">Method:</td><td class="v">${esc(p.method)}</td></tr>
          <tr><td class="k">Outcome:</td><td class="v">${esc(p.outcome)}</td></tr>
        </table>
        ${p.skills && p.skills.length ? `<div class="chips">${p.skills.map((s) => `<span class="chip">🔧 ${esc(s)}</span>`).join("")}</div>` : ""}
        <div class="mt14">${gh}</div>
      </div>`;
    return WM.open({ id: "proj-" + code, title: p.title, icon: "📄", width: 500, height: 460,
      body, bodyClass: "pad silver",
      status: `<div class="cell grow">${esc(p.code)}</div><div class="cell">Mission file</div>` });
  }

  /* ---- Skills (Control Panel) ----------------------------------------- */
  function skills() {
    const cats = D.skills.map((s) => `
      <div class="group">
        <span class="legend">${esc(s.category)}</span>
        <div class="chips" style="margin:0">${s.items.map((i) => `<span class="chip">${esc(i)}</span>`).join("")}</div>
      </div>`).join("");
    const certs = D.certifications.map((c) => `
      <div style="margin-bottom:9px">
        <div class="row" style="justify-content:space-between; margin-bottom:3px">
          <span><b>${esc(c.name)}</b> <span class="muted">, ${esc(c.issuer)}</span></span>
          <span class="muted" style="font-family:var(--mono)">${c.progress}%${c.progress < 100 ? " ⏳" : " ✓"}</span>
        </div>
        <div class="prog"><span style="width:${c.progress}%"></span></div>
      </div>`).join("");
    const body = `
      <div class="app" style="padding:16px 18px">
        <h2 style="margin:0 0 12px">🛠️ Loadout &amp; Certifications</h2>
        ${cats}
        <div class="group" style="margin-bottom:4px"><span class="legend">Certifications</span>${certs}</div>
      </div>`;
    return { id: "skills", title: "Skills - Control Panel", icon: "🛠️", width: 540, height: 470,
      menubar: `<span><u>F</u>ile</span><span><u>V</u>iew</span><span><u>H</u>elp</span>`,
      body, bodyClass: "pad silver",
      status: `<div class="cell grow">${D.skills.length} categories · ${D.certifications.length} certs</div>` };
  }

  /* ---- Resume viewer --------------------------------------------------- */
  function resume() {
    const resumeUrl = esc(D.identity.resume);
    const body = `
      <div style="height:100%; display:flex; flex-direction:column">
        <div class="row" style="padding:6px 8px; background:var(--silver); gap:8px">
          <a class="btn95" href="${resumeUrl}" target="_blank" rel="noopener" style="text-decoration:none">Open in new tab ↗</a>
          <a class="btn95" href="${resumeUrl}" download style="text-decoration:none">Download</a>
          <span class="muted" style="margin-left:auto">Resume_PranavKaja.pdf</span>
        </div>
        <div id="resume-frame-container" style="flex:1; display:flex; flex-direction:column; background:#fff">
          <div style="flex:1; display:flex; align-items:center; justify-content:center; flex-direction:column; color:var(--text); background:var(--silver)">
            <p>Loading document...</p>
          </div>
        </div>
      </div>`;
    return { id: "resume", title: "Resume - Document Viewer", icon: "📃", width: 620, height: 540,
      body, bodyClass: "",
      status: `<div class="cell grow">Pranav Kaja, Resume</div><div class="cell">PDF</div>`,
      onMount: (el) => {
        const container = el.querySelector("#resume-frame-container");
        fetch(resumeUrl, { method: 'HEAD' })
          .then(r => {
            if (r.ok) {
              container.innerHTML = `<iframe src="${resumeUrl}" style="flex:1; border:0; background:#fff" title="Resume"></iframe>`;
            } else {
              container.innerHTML = `
                <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px; text-align:center; background:var(--silver);">
                  <div style="font-size:32px; margin-bottom:12px">⚠️</div>
                  <h3 style="margin:0 0 8px 0;">Document Not Found</h3>
                  <p style="margin:0; color:#444;">The server returned a ${r.status} error.</p>
                  <p style="margin:4px 0 0 0; color:#444; font-size:12px">If the site is currently deploying, this will resolve shortly.</p>
                </div>`;
            }
          })
          .catch(() => {
            container.innerHTML = `
              <div style="flex:1; display:flex; flex-direction:column; align-items:center; justify-content:center; padding:20px; text-align:center; background:var(--silver);">
                <div style="font-size:32px; margin-bottom:12px">❌</div>
                <h3 style="margin:0 0 8px 0;">Connection Error</h3>
                <p style="margin:0; color:#444;">Could not connect to the server to load the document.</p>
              </div>`;
          });
      }
    };
  }

  /* ---- Interests (My Pictures) ---------------------------------------- */
  function interests() {
    const cards = D.interests.map((i) => `
      <figure>
        <img src="${esc(i.img)}" alt="${esc(i.name)}" loading="lazy">
        <figcaption>${esc(i.name)}</figcaption>
        <p>${esc(i.desc)}</p>
      </figure>`).join("");
    return { id: "interests", title: "My Pictures - Interests", icon: "🖼️", width: 600, height: 460,
      menubar: `<span><u>F</u>ile</span><span><u>V</u>iew</span><span>S<u>l</u>ide Show</span><span><u>H</u>elp</span>`,
      body: `<div class="gallery">${cards}</div>`, bodyClass: "",
      status: `<div class="cell grow">${D.interests.length} image(s)</div><div class="cell">Beyond the screen</div>` };
  }

  /* ---- Contact --------------------------------------------------------- */
  function contact() {
    const id = D.identity;
    const body = `
      <div class="app" style="padding:18px 20px">
        <div class="row" style="gap:14px; margin-bottom:6px">
          <div style="font-size:46px">✉️</div>
          <div><h2 style="margin:0">Get in touch</h2>
          <div class="muted">Open to full-time Data &amp; Analytics roles.</div></div>
        </div>
        <hr>
        <div class="group"><span class="legend">New Message</span>
          <table style="width:100%"><tr><td style="width:70px; padding:4px 0">To:</td>
            <td style="padding:4px 0"><input class="field" value="${esc(id.email)}" readonly></td></tr>
            <tr><td style="padding:4px 0">From:</td><td style="padding:4px 0"><input class="field" id="c-from" placeholder="your@email.com"></td></tr>
            <tr><td style="padding:4px 0; vertical-align:top">Body:</td><td style="padding:4px 0"><textarea class="field" id="c-msg" rows="4" placeholder="Say hello..."></textarea></td></tr>
          </table>
          <div class="row mt8"><button class="btn95" id="c-send">📨 Send</button>
          <span class="muted" id="c-note"></span></div>
        </div>
        <div class="group" style="margin-bottom:2px"><span class="legend">Direct Channels</span>
          <div class="row">
            <a class="btn95" style="text-decoration:none" href="mailto:${esc(id.email)}">Email</a>
            <a class="btn95" style="text-decoration:none" href="${esc(id.linkedin)}" target="_blank" rel="noopener">LinkedIn ↗</a>
            <a class="btn95" style="text-decoration:none" href="${esc(id.github)}" target="_blank" rel="noopener">GitHub ↗</a>
            <a class="btn95" style="text-decoration:none" href="${esc(id.portfolio)}" target="_blank" rel="noopener">Live Site ↗</a>
          </div>
        </div>
      </div>`;
    const opts = { id: "contact", title: "Contact - Outlook Express", icon: "✉️", width: 470, height: 440,
      body, bodyClass: "pad silver",
      status: `<div class="cell grow">Connected</div><div class="cell">📡 56k</div>` };
    opts.onMount = (el) => {
      const send = el.querySelector("#c-send");
      send.addEventListener("click", () => {
        const from = el.querySelector("#c-from").value.trim();
        const msg = el.querySelector("#c-msg").value.trim();
        const subject = encodeURIComponent("Hello from your retro portfolio" + (from ? ", " + from : ""));
        const bodyt = encodeURIComponent(msg + (from ? "\n\n- " + from : ""));
        window.location.href = `mailto:${D.identity.email}?subject=${subject}&body=${bodyt}`;
        el.querySelector("#c-note").textContent = "Opening your mail client…";
      });
    };
    return opts;
  }

  /* ---- Blog ------------------------------------------------------------ */
  function blog() {
    const items = D.blog.map((b) => `
      <div class="fileicon" style="width:auto; flex-direction:row; gap:10px; align-items:center; padding:8px 10px; justify-content:flex-start">
        <span class="ico" style="font-size:22px">📝</span>
        <a href="${esc(b.url)}" target="_blank" rel="noopener" style="font-size:13px">${esc(b.title)} ↗</a>
      </div>`).join("");
    return { id: "blog", title: "Blog - Notepad", icon: "📝", width: 440, height: 320,
      menubar: `<span><u>F</u>ile</span><span><u>E</u>dit</span><span><u>H</u>elp</span>`,
      body: `<div style="padding:8px">${items}</div>`, bodyClass: "",
      status: `<div class="cell grow">${D.blog.length} posts · opens live site</div>` };
  }

  /* ---- Recycle Bin (easter egg) --------------------------------------- */
  function recycle() {
    const body = `
      <div class="app center" style="padding:34px 20px">
        <div style="font-size:46px">🗑️</div>
        <p style="margin-top:12px"><b>The Recycle Bin is empty.</b></p>
        <p class="muted">No abandoned models, no half-finished notebooks.<br>Everything here shipped and got monitored.</p>
      </div>`;
    return { id: "recycle", title: "Recycle Bin", icon: "🗑️", width: 360, height: 240, body, bodyClass: "pad silver" };
  }

  /* ---- README (Welcome / help) ---------------------------------------- */
  // Block-letter font, assembled in code so the banner can't come out garbled.
  const BANNER_FONT = {
    "P": ["█████", "█   █", "█████", "█    ", "█    "],
    "R": ["█████", "█   █", "████ ", "█  █ ", "█   █"],
    "A": [" ███ ", "█   █", "█████", "█   █", "█   █"],
    "N": ["█   █", "██  █", "█ █ █", "█  ██", "█   █"],
    "V": ["█   █", "█   █", "█   █", " █ █ ", "  █  "],
    "O": [" ███ ", "█   █", "█   █", "█   █", " ███ "],
    "S": [" ████", "█    ", " ███ ", "    █", "████ "],
    "9": [" ███ ", "█   █", " ████", "    █", " ███ "],
    "5": ["█████", "█    ", "████ ", "    █", "████ "],
    " ": ["  ", "  ", "  ", "  ", "  "],
  };
  function asciiBanner(text) {
    const rows = ["", "", "", "", ""];
    text.toUpperCase().split("").forEach((ch) => {
      const g = BANNER_FONT[ch] || BANNER_FONT[" "];
      for (let r = 0; r < 5; r++) rows[r] += g[r] + " ";
    });
    return rows.join("\n");
  }

  function readme() {
    const banner = asciiBanner("PranavOS 95");
    const body = `
      <div class="app" style="padding:14px 18px; font-family:var(--mono); background:#fff; color:#000">
        <pre style="margin:0; font-size:11px; line-height:1.02; color:#000080">${banner}</pre>
        <pre style="margin:10px 0 0; font-size:13px; line-height:1.6; white-space:pre-wrap">        Windows 95 Edition
========================================
Welcome. You're inside Pranav Kaja's portfolio,
rebuilt as a retro desktop.

HOW TO GET AROUND
  • Double-click any desktop icon to open it.
  • Drag windows by the title bar. Resize from
    the bottom-right corner.
  • Click Start (bottom-left) for everything.
  • Minimize / maximize / close with the buttons
    up top, just like the real thing.

WHERE TO LOOK FIRST
  • About Pranav .... who I am, fast.
  • My Projects ..... 10 builds, double-click any.
  • Resume .......... the one-pager, downloadable.
  • Minesweeper ..... yes, it actually works.

In a hurry? Start ▸ Standard Site loads the
normal portfolio.

- Built ${new Date().getFullYear()} · type \`help\` anytime</pre>
      </div>`;
    return { id: "readme", title: "readme.txt - Notepad", icon: "📄", width: 600, height: 450,
      menubar: `<span><u>F</u>ile</span><span><u>E</u>dit</span><span><u>S</u>earch</span><span><u>H</u>elp</span>`,
      body, bodyClass: "", status: `<div class="cell grow">Ln 1, Col 1</div>` };
  }

  /* ---- Minesweeper (working) ------------------------------------------ */
  function minesweeper() {
    const ROWS = 9, COLS = 9, MINES = 10;
    const root = document.createElement("div");
    root.style.cssText = "padding:10px; display:flex; flex-direction:column; align-items:center; gap:8px; background:var(--silver)";
    root.innerHTML = `
      <div class="bevel-in" style="padding:6px 10px; display:flex; justify-content:space-between; align-items:center; width:auto; gap:18px; background:var(--silver)">
        <span class="ms-flags" style="font-family:var(--mono); background:#000; color:#f00; padding:2px 6px; min-width:42px; text-align:center">010</span>
        <button class="btn95 ms-face" style="min-width:auto; padding:2px 8px; font-size:16px">🙂</button>
        <span class="ms-time" style="font-family:var(--mono); background:#000; color:#f00; padding:2px 6px; min-width:42px; text-align:center">000</span>
      </div>
      <div class="ms-grid bevel-in" style="display:grid; grid-template-columns:repeat(${COLS},22px); gap:0; background:var(--silver); padding:3px"></div>
      <div class="muted" style="font-size:11px">Left-click reveal · Right-click flag</div>`;
    const grid = root.querySelector(".ms-grid");
    const faceBtn = root.querySelector(".ms-face");
    const flagEl = root.querySelector(".ms-flags");
    const timeEl = root.querySelector(".ms-time");

    let cells, mines, revealed, flags, over, won, started, timer, secs, flagsLeft;
    const pad = (n) => String(Math.max(0, n)).padStart(3, "0");

    function build() {
      cells = []; revealed = []; flags = []; mines = [];
      over = false; won = false; started = false; secs = 0; flagsLeft = MINES;
      clearInterval(timer); timeEl.textContent = "000"; flagEl.textContent = pad(MINES);
      faceBtn.textContent = "🙂";
      grid.innerHTML = "";
      for (let r = 0; r < ROWS; r++) {
        cells[r] = []; revealed[r] = []; flags[r] = []; mines[r] = [];
        for (let c = 0; c < COLS; c++) {
          const b = document.createElement("button");
          b.className = "btn95"; b.style.cssText = "min-width:auto; width:22px; height:22px; padding:0; font-size:12px; font-weight:700; line-height:1";
          b.dataset.r = r; b.dataset.c = c;
          b.addEventListener("click", () => reveal(r, c));
          b.addEventListener("contextmenu", (e) => { e.preventDefault(); flag(r, c); });
          grid.appendChild(b);
          cells[r][c] = b; revealed[r][c] = false; flags[r][c] = false; mines[r][c] = false;
        }
      }
    }
    function plant(sr, sc) {
      let placed = 0;
      while (placed < MINES) {
        const r = (Math.random() * ROWS) | 0, c = (Math.random() * COLS) | 0;
        if (mines[r][c] || (Math.abs(r - sr) <= 1 && Math.abs(c - sc) <= 1)) continue;
        mines[r][c] = true; placed++;
      }
    }
    function neigh(r, c) { let n = 0; for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const rr = r + i, cc = c + j; if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && mines[rr][cc]) n++; } return n; }
    function reveal(r, c) {
      if (over || revealed[r][c] || flags[r][c]) return;
      if (!started) { plant(r, c); started = true; timer = setInterval(() => { secs++; timeEl.textContent = pad(secs); }, 1000); }
      revealed[r][c] = true;
      const b = cells[r][c];
      b.style.borderColor = "var(--gray)"; b.style.boxShadow = "inset 1px 1px 0 #b0b0b0"; b.style.background = "#cfcfcf";
      if (mines[r][c]) { b.textContent = "💣"; b.style.background = "#f00"; return lose(); }
      const n = neigh(r, c);
      if (n) { b.textContent = n; b.style.color = ["", "#0000ff", "#008000", "#ff0000", "#000080", "#800000", "#008080", "#000", "#808080"][n]; }
      else { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const rr = r + i, cc = c + j; if (rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS) reveal(rr, cc); } }
      checkWin();
    }
    function flag(r, c) {
      if (over || revealed[r][c]) return;
      flags[r][c] = !flags[r][c];
      cells[r][c].textContent = flags[r][c] ? "🚩" : "";
      flagsLeft += flags[r][c] ? -1 : 1; flagEl.textContent = pad(flagsLeft);
    }
    function lose() { over = true; clearInterval(timer); faceBtn.textContent = "😵"; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (mines[r][c] && !revealed[r][c]) cells[r][c].textContent = "💣"; }
    function checkWin() {
      let safe = 0; for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (revealed[r][c] && !mines[r][c]) safe++;
      if (safe === ROWS * COLS - MINES) { over = won = true; clearInterval(timer); faceBtn.textContent = "😎"; }
    }
    faceBtn.addEventListener("click", build);
    build();
    return { id: "minesweeper", title: "Minesweeper", icon: "💣", width: 250, height: 330, body: root, bodyClass: "silver" };
  }

  window.APPS = { about, projects, openProject, skills, resume, interests, contact, blog, recycle, readme, minesweeper };
})();
