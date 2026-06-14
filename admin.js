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
    const { data: { session } } = await db.auth.getSession();
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
    renderRows();
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
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const which = tab.getAttribute('data-tab');
      $('panel-projects').classList.toggle('hidden', which !== 'projects');
      $('panel-transmissions').classList.toggle('hidden', which !== 'transmissions');
      if (which === 'transmissions') renderTx();
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

  $('tx-refresh-btn').addEventListener('click', loadTransmissions);
  $('tx-unread-btn').addEventListener('click', () => {
    txUnreadOnly = !txUnreadOnly;
    $('tx-unread-btn').textContent = txUnreadOnly ? 'Show all' : 'Unread only';
    renderTx();
  });

  // boot
  refreshAuth();
})();
