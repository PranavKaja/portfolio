/* ============================================================
 * Ops Console logic — Supabase Auth + project CRUD.
 * ============================================================ */
(function () {
  const $ = id => document.getElementById(id);
  const db = window.getSupabase && window.getSupabase();

  const views = {
    unconfigured: $('unconfigured'),
    login: $('login-view'),
    console: $('console-view')
  };
  const STATUS = ['deployed', 'in_progress', 'archived', 'classified'];
  const STATUS_LABEL = { deployed: 'DEPLOYED', in_progress: 'IN PROGRESS', archived: 'ARCHIVED', classified: 'CLASSIFIED' };

  function show(view) {
    views.unconfigured.classList.toggle('hidden', view !== 'unconfigured');
    views.login.classList.toggle('hidden', view !== 'login');
    views.console.classList.toggle('hidden', view !== 'console');
  }
  function msg(el, text, kind) {
    el.textContent = text || '';
    el.className = 'msg' + (kind ? ' ' + kind : '');
  }

  // ---- not configured: stop here with guidance ----
  if (!db) {
    show('unconfigured');
    views.login.classList.remove('hidden');     // still show the (inert) login shell
    $('login-btn').disabled = true;
    msg($('login-msg'), 'Backend offline — configure Supabase in config.js.', 'err');
    return;
  }

  // ============================================================
  // Auth
  // ============================================================
  async function refreshAuth() {
    let session = null;
    try {
      const res = await db.auth.getSession();
      session = res && res.data ? res.data.session : null;
    } catch (e) {
      // A corrupt/expired token in localStorage can throw here. Left unhandled
      // it blanks the page (no view is ever shown) and a hard refresh won't fix
      // it because localStorage survives. Clear the stored session and fall back
      // to login so the console always self-heals.
      console.warn('[auth] session read failed; clearing stored session:', e);
      try {
        Object.keys(localStorage).forEach(k => { if (/^sb-.*-auth-token$/.test(k)) localStorage.removeItem(k); });
      } catch (e2) { /* ignore */ }
      try { await db.auth.signOut(); } catch (e3) { /* ignore */ }
      session = null;
    }
    if (session) {
      $('who').textContent = '// ' + (session.user.email || 'OPERATOR');
      show('console');
      loadProjects();
      loadTransmissions();
    } else {
      show('login');
    }
  }

  db.auth.onAuthStateChange(() => refreshAuth());

  $('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = $('login-btn');
    btn.disabled = true;
    msg($('login-msg'), 'Authenticating…');
    const { error } = await db.auth.signInWithPassword({
      email: $('login-email').value.trim(),
      password: $('login-password').value
    });
    btn.disabled = false;
    if (error) msg($('login-msg'), error.message, 'err');
    else msg($('login-msg'), '');
    // success path handled by onAuthStateChange
  });

  $('signout-btn').addEventListener('click', () => db.auth.signOut());

  // ============================================================
  // Projects list
  // ============================================================
  let cache = [];

  async function loadProjects() {
    msg($('console-msg'), 'Loading…');
    const { data, error } = await db.from('projects').select('*').order('sort_order', { ascending: true });
    if (error) { msg($('console-msg'), error.message, 'err'); return; }
    cache = data || [];
    msg($('console-msg'), '');
    renderProjects();
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  function renderRows() {
    const tbody = $('rows');
    $('count').textContent = cache.length + ' RECORD' + (cache.length === 1 ? '' : 'S');
    $('empty').classList.toggle('hidden', cache.length > 0);
    tbody.innerHTML = cache.map(p => `
      <tr>
        <td><span class="code">${esc(p.code)}</span></td>
        <td>${esc(p.title)}</td>
        <td><span class="badge badge--${esc(p.status)}">${esc(STATUS_LABEL[p.status] || p.status)}</span></td>
        <td>${esc(p.sort_order)}</td>
        <td>${p.published ? 'yes' : '<span class="dot-unpub">hidden</span>'}</td>
        <td>
          <button data-edit="${esc(p.id)}" style="padding:5px 12px">Edit</button>
        </td>
      </tr>`).join('');
    tbody.querySelectorAll('[data-edit]').forEach(b =>
      b.addEventListener('click', () => openEditor(b.getAttribute('data-edit'))));
  }

  $('refresh-btn').addEventListener('click', loadProjects);

  // ---- card view + drag-to-reorder ----
  let projView = 'cards';

  function renderProjects() {
    renderRows();
    renderCards();
    applyView();
  }

  function applyView() {
    const cards = projView === 'cards';
    $('projects-table').classList.toggle('hidden', cards);
    $('projects-cards').classList.toggle('hidden', !cards);
    $('view-hint').classList.toggle('hidden', !cards);
    if ($('view-toggle-btn')) {
      $('view-toggle-btn').textContent = cards ? '☰' : '▦';
    }
    $('empty').classList.toggle('hidden', cache.length > 0 || cards);
  }

  function renderCards() {
    const el = $('projects-cards');
    if (!cache.length) { el.innerHTML = '<div class="empty">// NO MISSION RECORDS</div>'; return; }
    el.innerHTML = cache.map(p => `
      <div class="proj-card" draggable="true" data-id="${esc(p.id)}" data-status="${esc(p.status)}">
        <span class="pc-handle" aria-hidden="true" title="Drag to reorder">⠿</span>
        <span class="pc-code">${esc(p.code)}</span>
        <span class="pc-title">${esc(p.title)}</span>
        <span class="pc-tech">${esc(p.tech || '')}</span>
        ${p.published ? '' : '<span class="pc-hidden">hidden</span>'}
        <span class="badge badge--${esc(p.status)}">${esc(STATUS_LABEL[p.status] || p.status)}</span>
        <button class="pc-edit" data-edit="${esc(p.id)}">Edit</button>
      </div>`).join('');
    el.querySelectorAll('[data-edit]').forEach(b =>
      b.addEventListener('click', e => { e.stopPropagation(); openEditor(b.getAttribute('data-edit')); }));
    wireDnd(el);
  }

  function getDragAfterElement(container, y) {
    const els = Array.prototype.slice.call(container.querySelectorAll('.proj-card:not(.dragging)'));
    let best = { offset: -Infinity, el: null };
    els.forEach(child => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      if (offset < 0 && offset > best.offset) best = { offset: offset, el: child };
    });
    return best.el;
  }

  function wireDnd(container) {
    container.querySelectorAll('.proj-card').forEach(card => {
      card.addEventListener('dragstart', () => setTimeout(() => card.classList.add('dragging'), 0));
      card.addEventListener('dragend', () => { card.classList.remove('dragging'); persistOrder(container); });
    });
    container.addEventListener('dragover', e => {
      e.preventDefault();
      const dragged = container.querySelector('.dragging');
      if (!dragged) return;
      const after = getDragAfterElement(container, e.clientY);
      if (after == null) container.appendChild(dragged);
      else container.insertBefore(dragged, after);
    });
  }

  async function persistOrder(container) {
    const ids = Array.prototype.slice.call(container.querySelectorAll('.proj-card')).map(c => c.getAttribute('data-id'));
    const reordered = ids.map(id => cache.find(p => String(p.id) === String(id))).filter(Boolean);
    if (reordered.length !== cache.length) return;
    const updates = [];
    reordered.forEach((p, i) => {
      const want = (i + 1) * 10;
      if (p.sort_order !== want) { p.sort_order = want; updates.push({ id: p.id, sort_order: want }); }
    });
    cache = reordered;
    renderRows(); // reflect new order in the row view immediately
    if (!updates.length) return;
    msg($('console-msg'), 'Saving order…');
    const results = await Promise.all(updates.map(u =>
      db.from('projects').update({ sort_order: u.sort_order }).eq('id', u.id)));
    const failed = results.find(r => r.error);
    if (failed) { msg($('console-msg'), 'Save failed: ' + failed.error.message, 'err'); loadProjects(); }
    else msg($('console-msg'), updates.length + ' position' + (updates.length === 1 ? '' : 's') + ' saved.', 'ok');
  }

  $('view-toggle-btn')?.addEventListener('click', () => {
    projView = projView === 'cards' ? 'rows' : 'cards';
    applyView();
  });

  // ============================================================
  // Editor modal
  // ============================================================
  const F = {
    id: $('f-id'), code: $('f-code'), title: $('f-title'), tech: $('f-tech'),
    stack: $('f-stack'), summary: $('f-summary'), hook: $('f-hook'), brief: $('f-brief'),
    role: $('f-role'), method: $('f-method'), outcome: $('f-outcome'), chips: $('f-chips'),
    status: $('f-status'), sort: $('f-sort'), published: $('f-published')
  };

  function openEditor(id) {
    const p = id ? cache.find(x => String(x.id) === String(id)) : null;
    $('modal-title').textContent = p ? `Edit ${p.code}` : 'New Project';
    F.id.value = p ? p.id : '';
    F.code.value = p ? p.code : '';
    F.title.value = p ? p.title : '';
    F.tech.value = p ? (p.tech || '') : '';
    F.stack.value = p ? (p.stack || '') : '';
    F.summary.value = p ? (p.summary || '') : '';
    F.hook.value = p ? (p.hook || '') : '';
    F.brief.value = p ? (p.brief || '') : '';
    F.role.value = p ? (p.role || '') : '';
    F.method.value = p ? (p.method || '') : '';
    F.outcome.value = p ? (p.outcome || '') : '';
    F.chips.value = p && p.chips ? p.chips.join('\n') : '';
    F.status.value = p ? p.status : 'deployed';
    F.sort.value = p ? p.sort_order : (cache.length ? Math.max(...cache.map(x => x.sort_order || 0)) + 10 : 10);
    F.published.checked = p ? !!p.published : true;
    $('delete-btn').classList.toggle('hidden', !p);
    msg($('form-msg'), '');
    $('modal-bg').classList.remove('hidden');
    F.code.focus();
  }

  function closeEditor() { $('modal-bg').classList.add('hidden'); }

  $('new-btn').addEventListener('click', () => openEditor(null));
  $('cancel-btn').addEventListener('click', closeEditor);
  $('modal-bg').addEventListener('click', e => { if (e.target === $('modal-bg')) closeEditor(); });

  $('project-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
      code: F.code.value.trim(),
      title: F.title.value.trim(),
      tech: F.tech.value.trim(),
      stack: F.stack.value.trim(),
      summary: F.summary.value.trim(),
      hook: F.hook.value.trim(),
      brief: F.brief.value.trim(),
      role: F.role.value.trim(),
      method: F.method.value.trim(),
      outcome: F.outcome.value.trim(),
      chips: F.chips.value.split('\n').map(s => s.trim()).filter(Boolean),
      status: STATUS.includes(F.status.value) ? F.status.value : 'deployed',
      sort_order: parseInt(F.sort.value, 10) || 0,
      published: F.published.checked
    };
    const btn = $('save-btn');
    btn.disabled = true;
    msg($('form-msg'), 'Saving…');
    let error;
    if (F.id.value) {
      ({ error } = await db.from('projects').update(payload).eq('id', F.id.value));
    } else {
      ({ error } = await db.from('projects').insert(payload));
    }
    btn.disabled = false;
    if (error) { msg($('form-msg'), error.message, 'err'); return; }
    closeEditor();
    loadProjects();
  });

  $('delete-btn').addEventListener('click', async () => {
    if (!F.id.value) return;
    if (!confirm('Delete ' + (F.code.value || 'this project') + '? This cannot be undone.')) return;
    const { error } = await db.from('projects').delete().eq('id', F.id.value);
    if (error) { msg($('form-msg'), error.message, 'err'); return; }
    closeEditor();
    loadProjects();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('modal-bg').classList.contains('hidden')) closeEditor();
  });

  // ============================================================
  // Tabs
  // ============================================================
  const PANELS = { projects: 'panel-projects', transmissions: 'panel-transmissions', intel: 'panel-intel' };
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const which = tab.getAttribute('data-tab');
      Object.keys(PANELS).forEach(k => $(PANELS[k]).classList.toggle('hidden', k !== which));
      if (which === 'transmissions') renderTx();
      if (which === 'intel') loadIntel(false);
    });
  });

  // ============================================================
  // Transmissions (contact inbox)
  // ============================================================
  let txCache = [];
  let txUnreadOnly = false;
  const TX_LABEL = { received: 'RECEIVED', decoded: 'DECODED', replied: 'REPLIED' };
  const TX_ORDER = ['received', 'decoded', 'replied'];

  async function loadTransmissions() {
    const { data, error } = await db.from('messages').select('*').order('created_at', { ascending: false });
    if (error) { msg($('tx-console-msg'), error.message, 'err'); return; }
    txCache = data || [];
    updateUnreadBadge();
    renderTx();
  }

  function updateUnreadBadge() {
    const n = txCache.filter(m => m.status === 'received').length;
    const badge = $('tx-unread');
    badge.textContent = n;
    badge.classList.toggle('hidden', n === 0);
  }

  function fmtWhen(iso) {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
  }

  function renderTx() {
    const list = $('tx-list');
    const items = txUnreadOnly ? txCache.filter(m => m.status === 'received') : txCache;
    $('tx-count').textContent = items.length + ' MESSAGE' + (items.length === 1 ? '' : 'S');
    $('tx-empty').classList.toggle('hidden', items.length > 0);
    list.innerHTML = items.map(m => {
      const contact = [
        m.email ? `<a href="mailto:${esc(m.email)}">${esc(m.email)}</a>` : '',
        m.phone ? `<a href="tel:${esc(m.phone)}">${esc(m.phone)}</a>` : ''
      ].filter(Boolean).join(' <span class="muted">·</span> ');
      const statusBtns = TX_ORDER.map(s =>
        `<button data-set="${esc(m.id)}" data-status="${s}" class="${m.status === s ? 'cur' : ''}">${TX_LABEL[s]}</button>`
      ).join('');
      return `
      <div class="tx-card tx-card--${esc(m.status)}">
        <div class="tx-card-head">
          <span class="badge badge--${esc(m.status)}">${TX_LABEL[m.status] || esc(m.status)}</span>
          <button class="star ${m.flagged ? 'on' : ''}" data-flag="${esc(m.id)}" title="Flag priority">${m.flagged ? '★' : '☆'}</button>
          <span class="tx-when">${fmtWhen(m.created_at)}</span>
          <span class="spacer"></span>
          <button class="danger" data-del="${esc(m.id)}" style="padding:4px 10px;font-size:0.7rem">Delete</button>
        </div>
        <div class="tx-card-from"><strong>${esc(m.name || 'Anonymous')}</strong>${contact ? ' <span class="muted">·</span> ' + contact : ''}</div>
        <div class="tx-card-body">${esc(m.body)}</div>
        <div class="tx-card-actions"><span class="console-label">Set:</span>${statusBtns}</div>
      </div>`;
    }).join('');

    list.querySelectorAll('[data-set]').forEach(b =>
      b.addEventListener('click', () => setStatus(b.getAttribute('data-set'), b.getAttribute('data-status'))));
    list.querySelectorAll('[data-flag]').forEach(b =>
      b.addEventListener('click', () => toggleFlag(b.getAttribute('data-flag'))));
    list.querySelectorAll('[data-del]').forEach(b =>
      b.addEventListener('click', () => delTx(b.getAttribute('data-del'))));
  }

  async function setStatus(id, status) {
    if (!TX_ORDER.includes(status)) return;
    const { error } = await db.from('messages').update({ status }).eq('id', id);
    if (error) { msg($('tx-console-msg'), error.message, 'err'); return; }
    const m = txCache.find(x => String(x.id) === String(id));
    if (m) m.status = status;
    updateUnreadBadge();
    renderTx();
  }

  async function toggleFlag(id) {
    const m = txCache.find(x => String(x.id) === String(id));
    if (!m) return;
    const { error } = await db.from('messages').update({ flagged: !m.flagged }).eq('id', id);
    if (error) { msg($('tx-console-msg'), error.message, 'err'); return; }
    m.flagged = !m.flagged;
    renderTx();
  }

  async function delTx(id) {
    if (!confirm('Delete this transmission? This cannot be undone.')) return;
    const { error } = await db.from('messages').delete().eq('id', id);
    if (error) { msg($('tx-console-msg'), error.message, 'err'); return; }
    txCache = txCache.filter(x => String(x.id) !== String(id));
    updateUnreadBadge();
    renderTx();
  }

  // ============================================================
  // Visitor Intel dashboard
  // ============================================================
  let intelLoaded = false;
  let intelData = {};

  function fmtTime(s) {
    s = Math.round(s || 0);
    if (s < 60) return s + 's';
    const m = Math.floor(s / 60), ss = s % 60;
    return m + ':' + String(ss).padStart(2, '0');
  }

  async function loadIntel(force) {
    if (intelLoaded && !force) return;
    msg($('intel-msg'), '', '');
    const { data, error } = await db.rpc('intel_dashboard');
    if (error) { msg($('intel-msg'), error.message, 'err'); return; }
    intelLoaded = true;
    renderIntel(data || {});
    $('intel-updated').textContent = '// updated ' + new Date().toLocaleString();
  }

  function renderIntel(d) {
    intelData = d || {};
    const k = d.kpis || {};
    const kpis = [
      ['Total Views', k.total_views], ['Unique Visitors', k.unique_visitors],
      ['Avg Time on Site', fmtTime(k.avg_time)],
      ['Project Opens', k.project_clicks], ['Resume Downloads', k.resume_downloads],
      ['Contact Submits', k.contact_submits], ['Game Plays', k.game_plays]
    ];
    $('intel-kpis').innerHTML = kpis.map(([label, val]) =>
      `<div class="kpi"><div class="kpi-num">${val == null ? 0 : val}</div><div class="kpi-label">${label}</div></div>`).join('');

    barlist('intel-traffic', (d.traffic || []).map(t => [t.source, t.n]));
    barlist('intel-projects', (d.top_projects || []).map(p => [p.title || p.code, p.n]));
    barlist('intel-pages', (d.top_pages || []).map(p => [p.path === '/' ? '/ (home)' : p.path, p.n]));

    const g = d.game || {};
    $('intel-game').innerHTML =
      `<div class="gs"><span class="gs-num">${g.players || 0}</span><span class="gs-label">players</span></div>` +
      `<div class="gs"><span class="gs-num">${g.plays || 0}</span><span class="gs-label">total plays</span></div>` +
      `<div class="gs"><span class="gs-num">${g.high || 0}</span><span class="gs-label">high score</span></div>` +
      `<div class="gs"><span class="gs-num">${g.avg || 0}</span><span class="gs-label">avg score</span></div>`;

    renderLeaderboard('intel-leaderboard', d.leaderboard || []);
    renderDaily('intel-daily', d.daily || []);
  }

  // best score per distinct (anonymous) player — repeat plays collapse to one row
  function leaderboardTable(rows) {
    return '<table class="lb"><thead><tr><th>#</th><th>Player</th><th>Best</th><th>Plays</th></tr></thead><tbody>' +
      rows.map((r, i) => `<tr>
        <td class="lb-rank">${i + 1}</td>
        <td class="lb-player">#${esc(String(r.player || '').toUpperCase())}</td>
        <td class="lb-best">${r.best}</td>
        <td class="lb-plays">${r.plays}</td>
      </tr>`).join('') +
      '</tbody></table>';
  }

  function renderLeaderboard(id, rows) {
    const el = $(id);
    if (!el) return;
    if (!rows.length) { el.innerHTML = '<div class="bl-empty">// no games played yet</div>'; return; }
    el.innerHTML = leaderboardTable(rows.slice(0, 3)) +
      (rows.length > 3 ? `<div class="bl-more">+ ${rows.length - 3} more player${rows.length - 3 === 1 ? '' : 's'}</div>` : '');
  }

  function barlist(id, rows) {
    const el = $(id);
    if (!rows.length) { el.innerHTML = '<div class="bl-empty">// no data yet</div>'; return; }
    const max = Math.max.apply(null, rows.map(r => r[1])) || 1;
    el.innerHTML = rows.slice(0, 3).map(([label, n]) => `
      <div class="bl-row">
        <span class="bl-label" title="${esc(String(label))}">${esc(String(label))}</span>
        <span class="bl-bar"><span class="bl-fill" style="width:${Math.max(4, Math.round(n / max * 100))}%"></span></span>
        <span class="bl-n">${n}</span>
      </div>`).join('') +
      (rows.length > 3 ? `<div class="bl-more">+ ${rows.length - 3} more</div>` : '');
  }

  function renderDaily(id, rows) {
    const el = $(id);
    const byDay = {};
    rows.forEach(r => { byDay[r.day] = r.n; });
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(); dt.setDate(dt.getDate() - i);
      const key = dt.toISOString().slice(0, 10);
      days.push([key, byDay[key] || 0]);
    }
    const total = days.reduce((s, d) => s + d[1], 0);
    if (!total) { el.innerHTML = '<div class="bl-empty">// no views in the last 7 days</div>'; return; }
    const max = Math.max.apply(null, days.map(d => d[1])) || 1;
    const W = 720, H = 120, pad = 4, bw = (W - pad * 2) / days.length;
    const bars = days.map((d, i) => {
      const x = pad + i * bw;
      const w = Math.max(1, bw - 2).toFixed(1);
      if (d[1] === 0) {
        return `<rect x="${x.toFixed(1)}" y="${(H - 18).toFixed(1)}" width="${w}" height="2" style="fill: var(--text-muted); opacity: 0.3"><title>${d[0]}: 0 views</title></rect>`;
      }
      const h = Math.max(2, Math.round(d[1] / max * (H - 24)));
      return `<rect x="${x.toFixed(1)}" y="${(H - 16 - h).toFixed(1)}" width="${w}" height="${h}"><title>${d[0]}: ${d[1]} views</title></rect>`;
    }).join('');
    const first = days[0][0].slice(5), last = days[days.length - 1][0].slice(5);
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="spark" preserveAspectRatio="none">${bars}` +
      `<text x="${pad}" y="${H - 2}" class="spark-ax">${first}</text>` +
      `<text x="${W - pad}" y="${H - 2}" text-anchor="end" class="spark-ax">${last}</text></svg>`;
  }

  // ---- drill-down: click any Intel card → full breakdown ----
  function detailTable(headers, rows) {
    return '<table class="detail-table"><thead><tr>' +
      headers.map((h, i) => `<th class="${i > 0 ? 'num' : ''}">${esc(h)}</th>`).join('') +
      '</tr></thead><tbody>' +
      rows.map(r => '<tr>' + r.map((c, i) => `<td class="${i > 0 ? 'num' : ''}">${esc(String(c))}</td>`).join('') + '</tr>').join('') +
      '</tbody></table>';
  }

  function openIntelDetail(kind) {
    const d = intelData || {};
    let title = '', body = '';
    if (kind === 'traffic') {
      title = 'Traffic Sources';
      const rows = (d.traffic || []).map(t => [t.source, t.n]);
      body = rows.length ? detailTable(['Source', 'Views'], rows) : '';
    } else if (kind === 'projects') {
      title = 'Top Projects';
      const rows = (d.top_projects || []).map(p => [p.title || p.code, p.n]);
      body = rows.length ? detailTable(['Project', 'Opens'], rows) : '';
    } else if (kind === 'pages') {
      title = 'Pages — views & avg time';
      const rows = (d.top_pages || []).map(p => [p.path === '/' ? '/ (home)' : p.path, p.n, fmtTime(p.avg_sec)]);
      body = rows.length ? detailTable(['Page', 'Views', 'Avg time'], rows) : '';
    } else if (kind === 'leaderboard') {
      title = 'Game Leaderboard — all players';
      body = (d.leaderboard || []).length ? leaderboardTable(d.leaderboard) : '';
    } else if (kind === 'daily') {
      title = 'Page Views — Analytics';
      window._renderDailyTable = (daysCount) => {
        const byDay = {};
        (d.daily || []).forEach(r => { byDay[r.day] = r.n; });
        const rows = [];
        for (let i = 0; i < daysCount; i++) {            // newest day first
          const dt = new Date(); dt.setDate(dt.getDate() - i);
          const key = dt.toISOString().slice(0, 10);
          rows.push([key, byDay[key] || 0]);
        }
        return detailTable(['Day', 'Views'], rows);
      };
      body = `
        <div class="row" style="margin-bottom: 16px;" id="daily-filters">
          <button class="ghost filter-btn" data-days="7">7 Days</button>
          <button class="primary filter-btn" data-days="30">30 Days</button>
          <button class="ghost filter-btn" data-days="90">90 Days</button>
          <button class="ghost filter-btn" data-days="365">1 Year</button>
        </div>
        <div id="daily-table-container">
          ${window._renderDailyTable(30)}
        </div>
      `;
    }
    $('intel-modal-title').textContent = title || 'Detail';
    $('intel-modal-body').innerHTML = body || '<div class="bl-empty">// no data yet</div>';
    
    if (kind === 'daily') {
      const filters = $('daily-filters');
      if (filters) {
        filters.addEventListener('click', e => {
          if (e.target.classList.contains('filter-btn')) {
            const days = parseInt(e.target.dataset.days);
            $('daily-table-container').innerHTML = window._renderDailyTable(days);
            filters.querySelectorAll('.filter-btn').forEach(b => {
              b.classList.toggle('primary', parseInt(b.dataset.days) === days);
              b.classList.toggle('ghost', parseInt(b.dataset.days) !== days);
            });
          }
        });
      }
    }
    $('intel-modal-bg').classList.remove('hidden');
  }

  function closeIntelModal() { $('intel-modal-bg').classList.add('hidden'); }

  $('panel-intel')?.addEventListener('click', e => {
    const card = e.target.closest('[data-detail]');
    if (card) openIntelDetail(card.getAttribute('data-detail'));
  });
  $('intel-modal-close')?.addEventListener('click', closeIntelModal);
  $('intel-modal-bg')?.addEventListener('click', e => { if (e.target === $('intel-modal-bg')) closeIntelModal(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('intel-modal-bg').classList.contains('hidden')) closeIntelModal();
  });

  $('intel-refresh-btn')?.addEventListener('click', () => loadIntel(true));
  $('tx-refresh-btn')?.addEventListener('click', loadTransmissions);
  $('tx-unread-btn')?.addEventListener('click', () => {
    txUnreadOnly = !txUnreadOnly;
    $('tx-unread-btn').textContent = txUnreadOnly ? 'Show all' : 'Unread only';
    renderTx();
  });

  // boot
  refreshAuth();
})();
