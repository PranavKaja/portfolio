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
  const STATUS = ['deployed', 'in_progress', 'archived', 'classified', 'none'];
  const STATUS_LABEL = { deployed: 'DEPLOYED', in_progress: 'IN PROGRESS', archived: 'ARCHIVED', classified: 'CLASSIFIED', none: 'NONE' };

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
    
    // Fast path: synchronous localStorage read to prevent UI hanging
    try {
      const key = Object.keys(localStorage).find(k => /^sb-.*-auth-token$/.test(k));
      if (key) {
        session = JSON.parse(localStorage.getItem(key));
      }
    } catch (e) {
      console.warn('[auth] fast read failed:', e);
    }

    if (session && session.user) {
      const operator = session.user.email || 'operator';
      $('who').textContent = '// ' + operator;
      show('console');
      loadProjects();
      loadTransmissions();
    } else {
      // Clear anything corrupt
      try {
        Object.keys(localStorage).forEach(k => { if (/^sb-.*-auth-token$/.test(k)) localStorage.removeItem(k); });
      } catch (e) { /* ignore */ }
      show('login');
    }
  }

  db.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_DELETED') {
      refreshAuth();
    }
  });

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

  $('universal-refresh-btn')?.addEventListener('click', () => {
    loadProjects();
    loadTransmissions();
    loadIntel(true);
  });

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
    el.innerHTML = cache.map(p => {
      const activeCls = (String(p.id) === String(lastActiveCardId)) ? ' last-active' : '';
      return `
      <div class="proj-card${activeCls}" draggable="true" data-id="${esc(p.id)}" data-status="${esc(p.status)}">
        <span class="pc-handle" aria-hidden="true" title="Drag to reorder">⠿</span>
        <span class="pc-code">${esc(p.code)}</span>
        <span class="pc-title">${esc(p.title)}</span>
        <span class="pc-tech">${esc(p.tech || '')}</span>
        ${p.published ? '' : '<span class="pc-hidden">hidden</span>'}
        <span class="badge badge--${esc(p.status)}">${esc(STATUS_LABEL[p.status] || p.status)}</span>
      </div>`;
    }).join('');
    el.querySelectorAll('.proj-card').forEach(card => {
      card.addEventListener('click', e => { 
        if (!e.target.classList.contains('pc-handle')) {
          openEditor(card.getAttribute('data-id')); 
        }
      });
    });
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
    show_status: $('f-show-status'), sort: $('f-sort'), published: $('f-published'), 
    github: $('f-github'), show_github: $('f-show-github'), link_type: $('f-link-type'),
    skills: $('f-skills')
  };

  // dim the inactive link icon so the chosen logo (GitHub vs my page) is obvious
  function syncLinkTypeIcons() {
    const site = F.link_type && F.link_type.checked;
    const gh = $('lt-ic-gh'), st = $('lt-ic-site');
    if (gh) gh.style.opacity = site ? '0.35' : '1';
    if (st) st.style.opacity = site ? '1' : '0.35';
  }
  if (F.link_type) F.link_type.addEventListener('change', syncLinkTypeIcons);

  function getStatus() {
    const checked = document.querySelector('input[name="f-status"]:checked');
    return checked ? checked.value : 'deployed';
  }
  function setStatus(val) {
    const radio = document.querySelector(`input[name="f-status"][value="${val}"]`);
    if (radio) radio.checked = true;
  }

  let isDirty = false;
  let lastActiveCardId = null;

  function openEditor(id) {
    lastActiveCardId = id;
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
    F.github.value = p ? (p.github_url || '') : '';
    F.show_github.checked = p ? (p.show_github !== false) : true;
    F.link_type.checked = p ? (p.link_type === 'site') : false;
    syncLinkTypeIcons();

    F.chips.value = p && p.chips ? p.chips.join('\n') : '';
    F.skills.value = p && p.skills ? p.skills.join('\n') : '';
    renderChipsEditor();
    setStatus(p ? p.status : 'deployed');
    F.show_status.checked = p ? (p.show_status !== false) : true;
    F.sort.value = p ? p.sort_order : (cache.length ? Math.max(...cache.map(x => x.sort_order || 0)) + 10 : 10);
    F.published.checked = p ? !!p.published : true;
    
    // Reset advanced section
    $('hover-fields').classList.remove('visible');
    if ($('hover-toggle-btn')) {
        $('hover-toggle-btn').textContent = '[+] HOVER CARD';
        $('hover-toggle-btn').classList.remove('active');
    }
    $('pop-fields').classList.remove('visible');
    if ($('pop-toggle-btn')) {
        $('pop-toggle-btn').textContent = '[+] POPUP DOSSIER';
        $('pop-toggle-btn').classList.remove('active');
    }

    // Reset preview toggle if open
    $('project-form').style.display = 'block';
    $('project-preview').classList.add('hidden');
    $('toggle-preview-btn').textContent = 'Show Card Previews';
    updatePreviews();
    $('delete-btn').classList.toggle('hidden', !p);
    msg($('form-msg'), '');
    $('modal-bg').classList.remove('hidden');
    F.code.focus();
    isDirty = false;
  }

  function closeEditor() {
    if (isDirty) {
      if (!confirm("You have unsaved changes. Are you sure you want to discard them?")) return;
    }
    $('modal-bg').classList.add('hidden');
    isDirty = false;

    document.querySelectorAll('.proj-card.last-active').forEach(c => c.classList.remove('last-active'));
    if (lastActiveCardId) {
      const card = document.querySelector(`.proj-card[data-id="${lastActiveCardId}"]`);
      if (card) card.classList.add('last-active');
    }
  }

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
      github_url: F.github.value.trim() || null,
      show_github: F.show_github.checked,
      link_type: F.link_type.checked ? 'site' : 'github',
      chips: F.chips.value.split('\n').map(s => s.trim()).filter(Boolean),
      skills: F.skills.value.split('\n').map(s => s.trim()).filter(Boolean),
      status: STATUS.includes(getStatus()) ? getStatus() : 'deployed',
      show_status: F.show_status.checked,
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
    
    // Auto-create missing skills in the node pool
    if (payload.skills && payload.skills.length > 0) {
        const { data: existingNodes } = await db.from('skill_nodes').select('name');
        const existingNames = new Set((existingNodes || []).map(n => n.name.toLowerCase()));
        
        const missingSkills = payload.skills.filter(s => !existingNames.has(s.toLowerCase()));
        if (missingSkills.length > 0) {
            const inserts = missingSkills.map(name => ({
                name: name,
                is_active: false,
                category_id: null
            }));
            await db.from('skill_nodes').insert(inserts);
            // Reload skills canvas if it's currently initialized
            if (window.SkillsCanvas) window.SkillsCanvas.load();
        }
    }

    isDirty = false;
    closeEditor();
    loadProjects();
  });

  // Sync Buttons
  const syncBaseBtn = $('sync-base');
  if (syncBaseBtn) {
      syncBaseBtn.addEventListener('click', (e) => { 
          e.preventDefault(); 
          F.stack.value = F.tech.value; 
          F.hook.value = F.summary.value; 
          updatePreviews(); 
          isDirty = true;
      });
  }

  // Preview Toggle
  $('toggle-preview-btn').addEventListener('click', () => {
    const previewContainer = $('project-preview');
    const form = $('project-form');
    if (previewContainer.classList.contains('hidden')) {
      previewContainer.classList.remove('hidden');
      form.style.display = 'none'; // hide form to focus on previews
      $('toggle-preview-btn').textContent = 'Show Form';
      updatePreviews();
    } else {
      previewContainer.classList.add('hidden');
      form.style.display = 'block';
      $('toggle-preview-btn').textContent = 'Show Card Previews';
    }
  });

  // Expand button logic
  function setupToggle(btnId, sectionId, label) {
    const btn = $(btnId);
    if (!btn) return;
    btn.addEventListener('click', () => {
      const section = $(sectionId);
      const isHidden = !section.classList.contains('visible');
      if (isHidden) {
        section.classList.add('visible');
        btn.textContent = '[-] ' + label;
        btn.classList.add('active');
      } else {
        section.classList.remove('visible');
        btn.textContent = '[+] ' + label;
        btn.classList.remove('active');
      }
    });
  }
  setupToggle('hover-toggle-btn', 'hover-fields', 'HOVER CARD');
  setupToggle('pop-toggle-btn', 'pop-fields', 'POPUP DOSSIER');

  // Chip Editor Logic
  const chipInput = $('chip-input');
  const chipContainer = $('chip-editor-ui');
  
  function renderChipsEditor() {
    if (!chipContainer || !chipInput) return;
    // Remove existing chip-tags
    chipContainer.querySelectorAll('.chip-tag').forEach(el => el.remove());
    
    const val = F.chips.value.trim();
    const chips = val ? val.split('\n') : [];
    
    chips.forEach((c, i) => {
      const tag = document.createElement('div');
      tag.className = 'chip-tag';
      tag.innerHTML = `<span>${esc(c)}</span><button type="button" data-idx="${i}">×</button>`;
      chipContainer.insertBefore(tag, chipInput);
    });
    
    chipContainer.querySelectorAll('.chip-tag button').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const idx = parseInt(btn.getAttribute('data-idx'));
        chips.splice(idx, 1);
        F.chips.value = chips.join('\n');
        renderChipsEditor();
        updatePreviews();
        isDirty = true;
      });
    });
  }

  if (chipInput) {
    chipInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const text = chipInput.value.trim();
        if (text) {
          const chips = F.chips.value ? F.chips.value.split('\n') : [];
          chips.push(text);
          F.chips.value = chips.join('\n');
          chipInput.value = '';
          renderChipsEditor();
          updatePreviews();
          isDirty = true;
        }
      }
    });
    
    chipContainer.addEventListener('click', () => chipInput.focus());
    chipInput.addEventListener('focus', () => chipContainer.classList.add('focus'));
    chipInput.addEventListener('blur', () => chipContainer.classList.remove('focus'));
  }

  // Live Previews
  Object.values(F).forEach(el => {
    if (el && el.type !== 'hidden' && el.tagName !== 'BUTTON') {
      el.addEventListener('input', () => { updatePreviews(); isDirty = true; });
      el.addEventListener('change', () => { updatePreviews(); isDirty = true; });
    }
  });

  document.querySelectorAll('input[name="f-status"]').forEach(r => {
    r.addEventListener('change', () => { updatePreviews(); isDirty = true; });
  });

  function updatePreviews() {
    if ($('project-preview').classList.contains('hidden')) return; // Save cycles if not viewing previews
    
    const p = {
      code: F.code.value, title: F.title.value, tech: F.tech.value, stack: F.stack.value,
      summary: F.summary.value, hook: F.hook.value, brief: F.brief.value,
      role: F.role.value.trim(), method: F.method.value.trim(), outcome: F.outcome.value.trim(),
      chips: F.chips.value.split('\n').filter(Boolean),
      skills: F.skills.value.split('\n').filter(Boolean),
      status: getStatus(), show_status: F.show_status.checked,
      github_url: F.github.value, show_github: F.show_github.checked,
      link_type: F.link_type.checked ? 'site' : 'github'
    };

    const num = String(p.code || '').match(/(\d+)/)?.[1] || '';
    const statusHtml = (p.status === 'none' || !p.show_status) ? '' : `<span class="proj-status proj-status--${esc(p.status)}">${esc(STATUS_LABEL[p.status] || p.status)}</span>`;
    const chipsHtml = (p.chips || []).map(c => `<span>${esc(c)}</span>`).join('');
    const skillsHtml = (p.skills || []).map(c => `<span>${esc(c)}</span>`).join('');
    const hasSkills = p.skills && p.skills.length > 0;
    const hoverList = hasSkills ? p.skills : (p.chips || []);
    const hoverTagsHtml = hoverList.map(c => `<span>${esc(c)}</span>`).join('');
    const chipClass = hasSkills ? 'skill-chips' : 'pp-chips';

    // Default Card
    $('prev-default-card').innerHTML = `
      <div class="project-panel">
        ${statusHtml}
        <div class="proj-id">${esc(p.code)}</div>
        <h3>${esc(p.title)}</h3>
        <p class="tech">${esc(p.tech)}</p>
        <p class="desc">${esc(p.summary)}</p>
      </div>
    `;

    // Hover Card
    $('prev-hover-card').innerHTML = `
        <div class="pp-expand" style="display:block; margin:0; opacity:1; visibility:visible;">
            <div class="pp-head"><span class="proj-id">${esc(p.code)}</span><span class="pp-stack">${esc(p.stack)}</span></div>
            <h3>${esc(p.title)}</h3>
            <p class="pp-hook">${esc(p.hook)}</p>
            <p class="pp-brief">${esc(p.brief)}</p>
            <div class="${chipClass}">${hoverTagsHtml}</div>
        </div>
    `;

    // Popup Overlay Card
    let rmoHtml = '';
    if (p.role || p.method || p.outcome) {
      rmoHtml = `<div class="msn-rmo">
        <div class="rmo-cell"><div class="k">Role</div><div class="v">${esc(p.role)}</div></div>
        <div class="rmo-cell"><div class="k">Method</div><div class="v">${esc(p.method)}</div></div>
        <div class="rmo-cell"><div class="k">Outcome</div><div class="v">${esc(p.outcome)}</div></div>
      </div>`;
    }
    
    const _isSite = p.link_type === 'site';
    const _linkIcon = _isSite
      ? `<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><g fill="currentColor"><rect x="11" y="2" width="2" height="5"/><rect x="11" y="17" width="2" height="5"/><rect x="2" y="11" width="5" height="2"/><rect x="17" y="11" width="5" height="2"/></g><circle cx="12" cy="12" r="2.6" fill="#ff4500"/></svg>`
      : `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>`;
    const githubBtn = (p.github_url && p.show_github) ? `<a href="${esc(p.github_url)}" target="_blank" rel="noopener noreferrer" class="github-btn">
          ${_linkIcon}
          <span class="gh-text-default">${_isSite ? 'Live page' : 'Case file'}</span>
          <span class="gh-text-hover">${_isSite ? 'Open' : 'GitHub'}</span>
          </a>` : '';

    $('prev-popup-card').innerHTML = `
      <div class="msn-sheet-wrap" style="opacity: 1; transform: none;">
          <div class="msn-sheet">
              <button class="msn-back">BACK TO DOSSIER</button>
              <div class="msn-d-head">
                  <div class="proj-id">${esc(p.code)}</div>
                  <div class="msn-d-stack">${esc(p.stack)}</div>
              </div>
              <h2 class="msn-d-title">${esc(p.title)}</h2>
              <div class="msn-d-hook">${esc(p.hook)}</div>
              <div class="msn-d-brief">${esc(p.brief)}</div>
              ${rmoHtml}
              <div style="margin-top:16px; ${chipsHtml ? '' : 'display:none;'}">
                  <div style="font-family:'Share Tech Mono',monospace; font-size:0.7rem; letter-spacing:1.5px; text-transform:uppercase; color:var(--text-muted); margin-bottom:8px;">Project Highlights</div>
                  <div class="pp-chips" style="display:inline-flex;">${chipsHtml}</div>
              </div>
              <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top: ${chipsHtml ? '22px' : '16px'}; ${chipsHtml ? 'padding-top: 18px; border-top: 1px dashed var(--border);' : ''}">
                  <div>
                      ${skillsHtml ? `<div style="font-family:'Share Tech Mono',monospace; font-size:0.7rem; letter-spacing:1.5px; text-transform:uppercase; color:var(--text-muted); margin-bottom:8px;">Skills used / learnt</div><div class="skill-chips">${skillsHtml}</div>` : ''}
                  </div>
                  <div>${githubBtn}</div>
              </div>
          </div>
      </div>
    `;
  }

  $('delete-btn').addEventListener('click', async () => {
    if (!F.id.value) return;
    if (!confirm('Delete ' + (F.code.value || 'this project') + '? This cannot be undone.')) return;
    const { error } = await db.from('projects').delete().eq('id', F.id.value);
    if (error) { msg($('form-msg'), error.message, 'err'); return; }
    isDirty = false;
    closeEditor();
    loadProjects();
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && !$('modal-bg').classList.contains('hidden')) closeEditor();
  });

  document.addEventListener('click', e => {
    if (e.target.closest('.proj-card') || e.target.closest('.modal') || e.target.classList.contains('modal-bg')) return;
    document.querySelectorAll('.proj-card.last-active').forEach(c => c.classList.remove('last-active'));
    lastActiveCardId = null;
  });

  // ============================================================
  // Tabs
  // ============================================================
  const PANELS = { projects: 'panel-projects', transmissions: 'panel-transmissions', intel: 'panel-intel', skills: 'panel-skills', certifications: 'panel-certifications' };
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const which = tab.getAttribute('data-tab');
      Object.keys(PANELS).forEach(k => $(PANELS[k]).classList.toggle('hidden', k !== which));
      if (which === 'transmissions') loadTransmissions();
      if (which === 'intel') loadIntel(true);
      if (which === 'skills') Sections.skills.load();
      if (which === 'certifications') Sections.certs.load();
    });
  });

  // ============================================================
  // Skills + Certifications: inline editable cards (mini-CRUD)
  // ============================================================
  function makeSection(cfg) {
    let cache = [];
    const setMsg = (t, k) => msg($(cfg.msg), t, k);

    function collect(card) {
      const p = {};
      card.querySelectorAll('[data-f]').forEach(el => {
        const f = el.getAttribute('data-f');
        if (el.type === 'checkbox') p[f] = el.checked;
        else if (el.type === 'number') p[f] = parseInt(el.value, 10) || 0;
        else if (el.hasAttribute('data-arr')) p[f] = el.value.split(/[,\n]/).map(s => s.trim()).filter(Boolean);
        else { const v = el.value.trim(); p[f] = v || (el.hasAttribute('data-null') ? null : ''); }
      });
      return p;
    }

    function wire(scope) {
      scope.querySelectorAll('.sc-card').forEach(card => {
        const saveBtn = card.querySelector('.sc-save');
        const delBtn = card.querySelector('.sc-del');
        if (saveBtn) saveBtn.onclick = async () => {
          const payload = collect(card);
          if (!cfg.valid(payload)) { setMsg(cfg.validMsg, 'err'); return; }
          saveBtn.disabled = true; setMsg('Saving…');
          const id = card.getAttribute('data-id');
          const { error } = id
            ? await db.from(cfg.table).update(payload).eq('id', id)
            : await db.from(cfg.table).insert(payload);
          saveBtn.disabled = false;
          if (error) { setMsg(error.message, 'err'); return; }
          setMsg('Saved.', 'ok');
          load();
        };
        if (delBtn) delBtn.onclick = async () => {
          const id = card.getAttribute('data-id');
          if (!id) { card.remove(); return; }
          if (!confirm('Delete this ' + cfg.noun + '?')) return;
          const { error } = await db.from(cfg.table).delete().eq('id', id);
          if (error) { setMsg(error.message, 'err'); return; }
          setMsg('Deleted.', 'ok');
          load();
        };
      });
    }

    function render() {
      const el = $(cfg.list);
      $(cfg.count).textContent = cache.length + ' ' + cfg.unit(cache.length);
      if ($(cfg.empty)) $(cfg.empty).classList.toggle('hidden', cache.length > 0);
      el.innerHTML = cache.map(cfg.card).join('');
      wire(el);
      if (cfg.onRender) cfg.onRender(cache);
    }

    async function load() {
      const { data, error } = await db.from(cfg.table).select('*').order('sort_order', { ascending: true });
      if (error) { setMsg(error.message, 'err'); return; }
      cache = data || [];
      render();
    }

    function addNew() {
      const nextOrder = cache.length ? Math.max(...cache.map(x => x.sort_order || 0)) + 10 : 10;
      const el = $(cfg.list);
      const wrap = document.createElement('div');
      wrap.innerHTML = cfg.card(Object.assign({ sort_order: nextOrder, published: true }, cfg.blank));
      el.insertBefore(wrap.firstElementChild, el.firstChild);
      if ($(cfg.empty)) $(cfg.empty).classList.add('hidden');
      wire(el);
      const f = el.querySelector('.sc-card [data-f]'); if (f) f.focus();
    }

    if ($(cfg.newBtn)) $(cfg.newBtn).addEventListener('click', addNew);
    return { load };
  }

  const Sections = {};
  const SkillsCanvas = {
    categories: [],
    nodes: [],
    
    async load() {
        // Reset floating active nodes to archive on load (per requirements)
        await db.from('skill_nodes').update({ is_active: false }).eq('is_active', true).is('category_id', null);

        const [catsRes, nodesRes] = await Promise.all([
            db.from('skill_categories').select('*').order('sort_order', { ascending: true }),
            db.from('skill_nodes').select('*').order('sort_order', { ascending: true }).order('name', { ascending: true })
        ]);
        if (catsRes.error) return msg($('skills-msg'), catsRes.error.message, 'err');
        if (nodesRes.error) return msg($('skills-msg'), nodesRes.error.message, 'err');
        
        this.categories = catsRes.data || [];
        this.nodes = nodesRes.data || [];
        this.render();
    },

    getColor(categoryId) {
        if (!categoryId) return 'var(--text-muted)';
        const cat = this.categories.find(c => c.id === categoryId);
        if (cat && cat.color) return cat.color;
        const colors = ['#2b8a3e', '#e67700', '#1864ab', '#c92a2a', '#5f3dc4', '#087f5b', '#c0eb75', '#ff922b'];
        let hash = 0;
        for (let i = 0; i < categoryId.length; i++) {
            hash = categoryId.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    },

    render() {
        // 1. Render Categories in Center
        const canvas = $('category-canvas');
        canvas.innerHTML = this.categories.map(c => {
            const color = this.getColor(c.id);
            return `
            <div class="category-card" data-cat-id="${c.id}">
                <div class="category-header" style="border-top: 3px solid ${color};" oncontextmenu="SkillsCanvas.showColorPicker(event, '${c.id}')">
                    <input type="text" value="${esc(c.name)}" onchange="SkillsCanvas.renameCategory('${c.id}', this.value)">
                    <button class="ghost" style="padding: 2px 6px; font-size: 0.8rem; height: auto;" onclick="SkillsCanvas.deleteCategory('${c.id}')">×</button>
                </div>
                <div class="category-body" ondragover="SkillsCanvas.onDragOver(event)" ondrop="SkillsCanvas.onDrop(event, '${c.id}')">
                    ${this.nodes.filter(n => n.category_id === c.id && n.is_active).sort((a,b)=> (a.sort_order||0)-(b.sort_order||0)).map(n => this.renderNode(n)).join('')}
                </div>
            </div>
        `}).join('');

        // 2. Update Active Skills Count (Header)
        let activeNodes = this.nodes.filter(n => n.is_active);
        const countBadge = $('active-skills-count');
        if (countBadge) countBadge.textContent = activeNodes.length;

        // 3. Render Archive Skills (Right)
        const archiveZone = $('archive-skills-zone');
        let archiveNodes = this.nodes.filter(n => !n.is_active);
        archiveNodes.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
        $('archived-skills-count').textContent = archiveNodes.length;
        archiveZone.innerHTML = archiveNodes.map(n => this.renderNode(n)).join('');
        archiveZone.ondragover = this.onDragOver;
        archiveZone.ondrop = (e) => this.onDrop(e, 'archive');
    },

    showColorPicker(e, catId) {
        e.preventDefault();
        const menu = $('color-picker-menu');
        const colors = ['#2b8a3e', '#e67700', '#1864ab', '#c92a2a', '#5f3dc4', '#087f5b', '#c0eb75', '#ff922b'];
        menu.innerHTML = colors.map(c => `
            <div style="width: 24px; height: 24px; border-radius: 50%; background: ${c}; cursor: pointer; border: 2px solid transparent;" 
                 onmouseover="this.style.borderColor='var(--text-main)'" 
                 onmouseout="this.style.borderColor='transparent'"
                 onclick="SkillsCanvas.setCategoryColor('${catId}', '${c}')"></div>
        `).join('');
        
        menu.style.left = e.pageX + 'px';
        menu.style.top = e.pageY + 'px';
        menu.classList.remove('hidden');

        const closeMenu = () => {
            menu.classList.add('hidden');
            document.removeEventListener('click', closeMenu);
        };
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    },

    async setCategoryColor(catId, color) {
        const cat = this.categories.find(c => c.id === catId);
        if (cat) {
            cat.color = color;
            this.render();
            await db.from('skill_categories').update({ color }).eq('id', catId);
        }
    },

    renderNode(n) {
        const color = this.getColor(n.category_id);
        return `<div class="skill-node" style="border-left-color: ${color}" draggable="true" ondragstart="SkillsCanvas.onDragStart(event, '${n.id}')">
            <input type="text" value="${esc(n.name)}" onchange="SkillsCanvas.renameNode('${n.id}', this.value)" onfocus="this.parentElement.classList.add('highlighted')" onblur="this.parentElement.classList.remove('highlighted')">
            <button class="ghost" style="padding: 0 4px; border: none; font-size: 0.8rem; height: auto; min-height: 0;" onclick="SkillsCanvas.deleteNode('${n.id}')">×</button>
        </div>`;
    },

    draggedNodeId: null,
    onDragStart(e, id) {
        this.draggedNodeId = id;
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => e.target.classList.add('dragging'), 0);
    },
    onDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    },
    async onDrop(e, target) {
        e.preventDefault();
        if (!this.draggedNodeId) return;
        const id = this.draggedNodeId;
        const node = this.nodes.find(n => n.id === id);
        this.draggedNodeId = null;
        
        let updates = {};
        if (target === 'archive') {
            updates = { is_active: false, category_id: null };
        } else if (target === 'active') {
            updates = { is_active: true };
            if (!node.category_id && this.categories.length > 0) {
                updates.category_id = this.categories[0].id;
            }
        } else {
            updates = { is_active: true, category_id: target };
        }

        const dropzone = e.target.closest('.skills-dropzone, .category-body');
        let insertIdx = -1;
        if (dropzone) {
            const nodesDOM = [...dropzone.querySelectorAll('.skill-node:not(.dragging)')];
            const afterElement = nodesDOM.find(n => {
                const rect = n.getBoundingClientRect();
                return e.clientY < rect.top + rect.height / 2;
            });
            if (afterElement) {
                const afterIdStr = afterElement.getAttribute('ondragstart');
                const match = afterIdStr && afterIdStr.match(/'([^']+)'/);
                if (match) {
                    const afterId = match[1];
                    const subset = this.nodes.filter(n => 
                        (target === 'archive' ? !n.is_active : 
                        target === 'active' ? n.is_active && n.category_id === updates.category_id : 
                        n.category_id === target && n.is_active)
                    ).filter(n => n.id !== id);
                    subset.sort((a,b) => (a.sort_order||0) - (b.sort_order||0));
                    insertIdx = subset.findIndex(n => n.id === afterId);
                }
            }
        }

        Object.assign(node, updates);
        
        const subset = this.nodes.filter(n => 
            (target === 'archive' ? !n.is_active : 
            target === 'active' ? n.is_active && n.category_id === node.category_id : 
            n.category_id === target && n.is_active)
        ).filter(n => n.id !== id);
        
        subset.sort((a,b) => (a.sort_order||0) - (b.sort_order||0));
        
        if (insertIdx === -1) insertIdx = subset.length;
        subset.splice(insertIdx, 0, node);
        
        subset.forEach((n, idx) => {
            n.sort_order = idx * 10;
        });

        this.render();

        const { error } = await db.from('skill_nodes').update(updates).eq('id', id);
        if (error) {
            msg($('skills-msg'), error.message, 'err');
            this.load();
            return;
        }

        for (let n of subset) {
            await db.from('skill_nodes').update({ sort_order: n.sort_order }).eq('id', n.id);
        }
    },

    async renameNode(id, newName) {
        if (!newName.trim()) return;
        const node = this.nodes.find(n => n.id === id);
        node.name = newName.trim();
        await db.from('skill_nodes').update({ name: node.name }).eq('id', id);
        this.render();
    },
    async deleteNode(id) {
        if (!confirm('Delete this skill? It will also disappear from the public site if active.')) return;
        this.nodes = this.nodes.filter(n => n.id !== id);
        this.render();
        await db.from('skill_nodes').delete().eq('id', id);
    },
    async renameCategory(id, newName) {
        if (!newName.trim()) return;
        const cat = this.categories.find(c => c.id === id);
        cat.name = newName.trim();
        await db.from('skill_categories').update({ name: cat.name }).eq('id', id);
    },
    async deleteCategory(id) {
        if (!confirm('Delete this category? Skills inside will be moved to the archive.')) return;
        this.categories = this.categories.filter(c => c.id !== id);
        this.nodes.forEach(n => { if (n.category_id === id) { n.category_id = null; n.is_active = false; } });
        this.render();
        await db.from('skill_categories').delete().eq('id', id);
        await db.from('skill_nodes').update({ is_active: false, category_id: null }).eq('category_id', id);
    },
    async addCategory() {
        const nextOrder = this.categories.length ? Math.max(...this.categories.map(c => c.sort_order || 0)) + 10 : 10;
        const payload = { name: 'NEW CATEGORY', sort_order: nextOrder };
        const { data, error } = await db.from('skill_categories').insert(payload).select().single();
        if (error) return msg($('skills-msg'), error.message, 'err');
        this.categories.push(data);
        this.render();
    },
    async addNode(name) {
        if (!name.trim()) return;
        let node = this.nodes.find(n => n.name.toLowerCase() === name.trim().toLowerCase());
        if (node) {
            msg($('skills-msg'), 'Skill already exists.', 'err');
            return;
        }
        const payload = { name: name.trim(), is_active: false, category_id: null };
        const { data, error } = await db.from('skill_nodes').insert(payload).select().single();
        if (error) return msg($('skills-msg'), error.message, 'err');
        this.nodes.push(data);
        this.render();
    }
  };

  $('new-category-btn').addEventListener('click', () => SkillsCanvas.addCategory());
  $('new-skill-form').addEventListener('submit', (e) => {
      e.preventDefault();
      SkillsCanvas.addNode($('new-skill-input').value);
      $('new-skill-input').value = '';
  });

  window.SkillsCanvas = SkillsCanvas;
  Sections.skills = SkillsCanvas;
  Sections.certs = makeSection({
    table: 'certifications', list: 'certs-list', count: 'certs-admin-count', empty: 'certs-empty',
    msg: 'certs-admin-msg', newBtn: 'new-cert-btn', noun: 'certification',
    unit: n => 'CERT' + (n === 1 ? '' : 'S'),
    valid: p => !!p.name, validMsg: 'Certification name is required.',
    blank: { name: '', issuer: '', link: null, in_progress: false, progress: 100 },
    onRender: (items) => {
        const outline = $('certs-outline-list');
        if (!outline) return;
        if (!items.length) {
            outline.innerHTML = '<div style="color:var(--text-muted); font-size:0.8rem; font-family:\'Share Tech Mono\', monospace;">// NO CERTIFICATIONS</div>';
            return;
        }
        outline.innerHTML = items.map((c, i) => {
            const name = esc(c.name || '(Untitled)');
            const statusColor = c.in_progress ? 'var(--accent)' : '#2b8a3e';
            return `<div style="display:flex; align-items:center; gap:8px; padding:6px 8px; border-radius:6px; cursor:pointer;" 
                         onmouseover="this.style.background='var(--panel-bg)'" 
                         onmouseout="this.style.background='transparent'" 
                         onclick="const card = document.querySelector('.sc-card[data-id=\\'${c.id || ''}\\']'); if(card) { card.scrollIntoView({behavior:'smooth', block:'center'}); card.style.boxShadow='0 0 0 2px var(--accent)'; setTimeout(()=>card.style.boxShadow='', 1500); }">
                <div style="width:6px; height:6px; border-radius:50%; background:${statusColor}; flex-shrink:0;"></div>
                <div style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:600;" title="${name}">${name}</div>
            </div>`;
        }).join('');
    },
    card: c => `<div class="sc-card" data-id="${esc(c.id || '')}">
      <div class="sc-grid">
        <label class="sc-f sc-grow">Name<input class="hl" data-f="name" value="${esc(c.name || '')}"></label>
        <label class="sc-f sc-grow">Issuer<input class="hl" data-f="issuer" value="${esc(c.issuer || '')}"></label>
      </div>
      <label class="sc-f">Proof link (optional)<input class="hl" type="url" data-f="link" data-null value="${esc(c.link || '')}" placeholder="https://… credential URL"></label>
      <div class="sc-grid">
        <label class="sc-f sc-pub">In progress<input type="checkbox" data-f="in_progress" ${c.in_progress ? 'checked' : ''}></label>
        <label class="sc-f sc-num">Progress %<input class="hl" type="number" min="0" max="100" data-f="progress" value="${c.progress != null ? c.progress : 100}"></label>
        <label class="sc-f sc-num">Order<input class="hl" type="number" data-f="sort_order" value="${c.sort_order != null ? c.sort_order : 0}"></label>
        <label class="sc-f sc-pub">Public<input type="checkbox" data-f="published" ${c.published !== false ? 'checked' : ''}></label>
      </div>
      <div class="sc-actions"><button type="button" class="primary sc-save">Save</button><button type="button" class="danger sc-del">Delete</button></div>
    </div>`
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

  let currentGameTab = 'wasd';

  let intelRange = 0; // 0 = all time; otherwise day window (1 = today, 7, 30, 365)
  function intelSince() {
    if (!intelRange) return null;                       // Total
    if (intelRange === 1) { const d = new Date(); d.setHours(0, 0, 0, 0); return d.toISOString(); } // local today
    return new Date(Date.now() - intelRange * 86400000).toISOString();
  }
  async function loadIntel(force) {
    if (intelLoaded && !force) return;
    msg($('intel-msg'), '', '');
    const { data, error } = await db.rpc('intel_dashboard', { p_since: intelSince() });
    if (error) { msg($('intel-msg'), error.message, 'err'); return; }
    intelLoaded = true;
    renderIntel(data || {});
    $('intel-updated').textContent = '// updated ' + new Date().toLocaleString();
  }
  $('intel-range')?.addEventListener('click', e => {
    const btn = e.target.closest('.intel-range-btn');
    if (!btn) return;
    intelRange = parseInt(btn.dataset.range, 10) || 0;
    document.querySelectorAll('#intel-range .intel-range-btn').forEach(b => {
      const on = parseInt(b.dataset.range, 10) === intelRange;
      if (on) {
          b.classList.add('active');
          b.classList.remove('ghost');
      } else {
          b.classList.remove('active');
          b.classList.add('ghost');
      }
    });
    loadIntel(true);
  });

  function renderIntel(d) {
    intelData = d || {};
    const k = d.kpis || {};
    const kpis = [
      ['Total Views', k.total_views], ['Unique Visitors', k.unique_visitors],
      ['Avg Time on Site', fmtTime(k.avg_time)],
      ['Project Opens', k.project_clicks], ['Resume Downloads', k.resume_downloads],
      ['Contact Clicks', k.contact_clicks], ['Messages', k.contact_submits], ['Game Plays', k.game_plays]
    ];
    $('intel-kpis').innerHTML = kpis.map(([label, val]) =>
      `<div class="kpi"><div class="kpi-num">${val == null ? 0 : val}</div><div class="kpi-label">${label}</div></div>`).join('');

    barlist('intel-traffic', (d.traffic || []).map(t => [t.source, t.n]));
    barlist('intel-projects', (d.top_projects || []).map(p => [p.title || p.code, p.n]));
    barlist('intel-pages', (d.top_pages || []).map(p => [p.path === '/' ? '/ (home)' : p.path, p.n]));

    renderGameStats();

    renderLeaderboard('intel-leaderboard', d.leaderboard || []);
    renderDaily('intel-daily', d.daily || []);
  }

  function renderGameStats() {
    const isWASD = (currentGameTab === 'wasd');
    const g = isWASD ? (intelData.game || {}) : (intelData.tictactoe || {});
    
    if (isWASD) {
      $('intel-game').innerHTML =
        `<div class="gs"><span class="gs-num">${g.players || 0}</span><span class="gs-label">players</span></div>` +
        `<div class="gs"><span class="gs-num">${g.plays || 0}</span><span class="gs-label">total plays</span></div>` +
        `<div class="gs"><span class="gs-num">${g.high || 0}</span><span class="gs-label">high score</span></div>` +
        `<div class="gs"><span class="gs-num">${g.avg || 0}</span><span class="gs-label">avg score</span></div>`;
    } else {
      $('intel-game').innerHTML =
        `<div class="gs"><span class="gs-num">${g.players || 0}</span><span class="gs-label">players</span></div>` +
        `<div class="gs"><span class="gs-num">${g.plays || 0}</span><span class="gs-label">total plays</span></div>` +
        `<div class="gs"><span class="gs-num">${g.user_wins || 0}</span><span class="gs-label">user wins</span></div>` +
        `<div class="gs"><span class="gs-num">${g.system_wins || 0}</span><span class="gs-label">pranav wins</span></div>` +
        `<div class="gs"><span class="gs-num">${g.draws || 0}</span><span class="gs-label">draws</span></div>`;
    }
  }

  // Hook up game toggles
  if ($('tg-wasd') && $('tg-ttt')) {
    $('tg-wasd').addEventListener('click', (e) => {
      $('tg-wasd').classList.add('active');
      $('tg-ttt').classList.remove('active');
      currentGameTab = 'wasd';
      renderGameStats();
    });
    $('tg-ttt').addEventListener('click', (e) => {
      $('tg-ttt').classList.add('active');
      $('tg-wasd').classList.remove('active');
      currentGameTab = 'ttt';
      renderGameStats();
    });
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
    rows.forEach(r => { byDay[r.day] = r.views; });
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const dt = new Date(); dt.setDate(dt.getDate() - i);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
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
        return `<rect x="${x.toFixed(1)}" y="${(H - 18).toFixed(1)}" width="${w}" height="2" style="fill: var(--text-muted); opacity: 0.3"><title>${d[0]}: 0 views</title></rect>` +
               `<text x="${(x + w/2).toFixed(1)}" y="${(H - 22).toFixed(1)}" fill="currentColor" text-anchor="middle" font-size="10" font-family="'Share Tech Mono', monospace" opacity="0.6">0</text>`;
      }
      const h = Math.max(2, Math.round(d[1] / max * (H - 24)));
      const barColor = '#ff4500'; // Assuming var(--accent) is orangeish, using pure orange here or currentColor if needed.
      const textNode = h > 14 
          ? `<text x="${(x + w/2).toFixed(1)}" y="${(H - 16 - h + 11).toFixed(1)}" fill="#fff" text-anchor="middle" font-size="10" font-family="'Share Tech Mono', monospace" font-weight="bold">${d[1]}</text>`
          : `<text x="${(x + w/2).toFixed(1)}" y="${(H - 16 - h - 4).toFixed(1)}" fill="currentColor" text-anchor="middle" font-size="10" font-family="'Share Tech Mono', monospace" font-weight="bold">${d[1]}</text>`;
      return `<rect x="${x.toFixed(1)}" y="${(H - 16 - h).toFixed(1)}" width="${w}" height="${h}"><title>${d[0]}: ${d[1]} views</title></rect>${textNode}`;
    }).join('');
    const first = days[0][0].slice(5), last = days[days.length - 1][0].slice(5);
    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" class="spark" preserveAspectRatio="none" style="overflow: visible;">${bars}` +
      `<text x="${pad}" y="${H - 2}" class="spark-ax">${first}</text>` +
      `<text x="${W - pad}" y="${H - 2}" text-anchor="end" class="spark-ax">${last}</text></svg>`;
  }

  // ---- drill-down: click any Intel card → full breakdown ----
  function fmtTimeHM(s) {
    s = Math.round(s || 0);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${ss}s`;
    return `${ss}s`;
  }

  function detailTable(headers, rows, totals) {
    let tfoot = '';
    if (totals) {
      tfoot = '<tfoot style="border-bottom: none !important;"><tr style="border-bottom: none !important;">' + totals.map((c, i) => `<td class="${i > 0 ? 'num' : ''}" style="${i > 0 && c !== '' ? 'font-weight: bold;' : 'font-weight: normal;'} border-top: 2px solid var(--text-main) !important; border-bottom: none !important; padding-top: 8px;">${esc(String(c))}</td>`).join('') + '</tr></tfoot>';
    }
    return '<table class="detail-table"><thead><tr>' +
      headers.map((h, i) => `<th class="${i > 0 ? 'num' : ''}">${esc(h)}</th>`).join('') +
      '</tr></thead><tbody>' +
      rows.map(r => '<tr>' + r.map((c, i) => `<td class="${i > 0 ? 'num' : ''}">${esc(String(c))}</td>`).join('') + '</tr>').join('') +
      '</tbody>' + tfoot + '</table>';
  }

  // ---- Today view: hourly pageview breakdown (queries the events table directly) ----
  async function loadTodayHourly() {
    const start = new Date(); start.setHours(0, 0, 0, 0); // local midnight, in the viewer's timezone
    const buckets = new Array(24).fill(0).map(() => ({ views: 0, time: 0 }));
    try {
      const { data, error } = await db.from('events')
        .select('type, created_at, meta').in('type', ['pageview', 'page_time']).gte('created_at', start.toISOString()).limit(5000);
      if (!error && data) {
        data.forEach(ev => {
          const h = new Date(ev.created_at).getHours();
          if (ev.type === 'pageview') {
            buckets[h].views++;
          } else if (ev.type === 'page_time' && ev.meta && ev.meta.seconds) {
            buckets[h].time += ev.meta.seconds;
          }
        });
      }
    } catch (e) { /* leave zeros */ }
    return buckets;
  }
  const pad2 = n => String(n).padStart(2, '0');
  function renderHourlyTable(buckets) {
    const rows = buckets.map((b, h) => [pad2(h) + ':00', b.views, fmtTime(b.time)]);
    const totalViews = buckets.reduce((s, b) => s + b.views, 0);
    const totalTime = buckets.reduce((s, b) => s + b.time, 0);
    return detailTable(['Hour', 'Views', 'Time'], rows, ['Total', totalViews, fmtTimeHM(totalTime)]);
  }
  function renderHourlyChart(buckets) {
    const max = Math.max.apply(null, buckets.map(b => b.views)) || 1;
    const W = 800, H = 250, pad = 20, bw = (W - pad * 2) / 24;
    const bars = buckets.map((b, h) => {
      const v = b.views;
      const x = pad + h * bw, w = Math.max(1, bw - 2), cx = x + w / 2;
      if (v === 0) {
        return `<rect x="${x.toFixed(1)}" y="${(H - 20).toFixed(1)}" width="${w.toFixed(1)}" height="2" style="fill:var(--text-muted);opacity:0.3"><title>0 views at ${pad2(h)}:00</title></rect>`;
      }
      const ht = Math.max(2, Math.round(v / max * (H - 40)));
      const label = ht > 14
        ? `<text x="${cx.toFixed(1)}" y="${(H - 20 - ht + 11).toFixed(1)}" fill="#fff" text-anchor="middle" font-size="10" font-family="'Share Tech Mono',monospace" font-weight="bold">${v}</text>`
        : `<text x="${cx.toFixed(1)}" y="${(H - 20 - ht - 4).toFixed(1)}" fill="currentColor" text-anchor="middle" font-size="10" font-family="'Share Tech Mono',monospace" font-weight="bold">${v}</text>`;
      const timeStr = b.time ? ` (${fmtTime(b.time)} spent)` : '';
      return `<rect x="${x.toFixed(1)}" y="${(H - 20 - ht).toFixed(1)}" width="${w.toFixed(1)}" height="${ht}" fill="var(--accent,#ff4500)"><title>${v} views${timeStr} at ${pad2(h)}:00</title></rect>${label}`;
    }).join('');
    const ticks = [0, 6, 12, 18, 23].map(h =>
      `<text x="${(pad + h * bw + bw / 2).toFixed(1)}" y="${H - 2}" text-anchor="middle" font-size="11" fill="currentColor" font-family="'Share Tech Mono',monospace">${pad2(h)}:00</text>`).join('');
    return `<svg viewBox="0 0 ${W} ${H}" class="spark" preserveAspectRatio="none" style="width:100%;height:auto;max-height:300px;overflow:visible;margin-top:10px;">${bars}${ticks}</svg>`;
  }

  async function loadVisitorsLog(intelRange = 7) {
    let startIso = null;
    if (intelRange === 1) {
        const d = new Date(); d.setHours(0, 0, 0, 0);
        startIso = d.toISOString();
    } else if (intelRange > 0) {
        startIso = new Date(Date.now() - intelRange * 86400000).toISOString();
    } else {
        startIso = new Date('2000-01-01').toISOString();
    }
    
    const { data, error } = await db.from('events')
      .select('type, created_at, session_id, meta')
      .in('type', ['pageview', 'page_time'])
      .gte('created_at', startIso)
      .limit(10000);
      
    if (error || !data) return [];
    
    const sessions = {};
    const todayStr = new Date().toISOString().slice(0, 10);
    
    data.forEach(ev => {
      const sid = ev.session_id || 'unknown';
      if (!sessions[sid]) {
        sessions[sid] = {
          sid: sid,
          code: sid.length > 8 ? sid.substring(0, 6).toUpperCase() : sid.toUpperCase(),
          views: 0,
          time: 0,
          first_seen: ev.created_at,
          last_seen: ev.created_at,
          timestamps: []
        };
      }
      const s = sessions[sid];
      if (ev.created_at < s.first_seen) s.first_seen = ev.created_at;
      if (ev.created_at > s.last_seen) s.last_seen = ev.created_at;
      
      if (ev.type === 'pageview') {
        s.views++;
        const tDate = new Date(ev.created_at);
        s.timestamps.push(tDate.toLocaleDateString([], {month:'short', day:'numeric'}) + ' ' + tDate.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
      } else if (ev.type === 'page_time' && ev.meta && ev.meta.seconds) {
        s.time += ev.meta.seconds;
      }
    });

    const sessionIds = Object.keys(sessions);
    if (sessionIds.length > 0) {
        const { data: firstVisits } = await db.from('events')
            .select('session_id, created_at')
            .eq('type', 'pageview')
            .in('session_id', sessionIds)
            .order('created_at', { ascending: true });
            
        if (firstVisits) {
            const absoluteFirsts = {};
            firstVisits.forEach(fv => {
                if (!absoluteFirsts[fv.session_id]) absoluteFirsts[fv.session_id] = fv.created_at;
            });
            Object.values(sessions).forEach(s => {
                if (absoluteFirsts[s.sid]) s.absolute_first_seen = absoluteFirsts[s.sid];
            });
        }
    }
    
    return Object.values(sessions).map(s => {
      const firstDate = new Date(s.absolute_first_seen || s.first_seen);
      const lastDate = new Date(s.last_seen);
      const todayDate = new Date();
      
      const sameDay = (
          firstDate.getFullYear() === lastDate.getFullYear() &&
          firstDate.getMonth() === lastDate.getMonth() &&
          firstDate.getDate() === lastDate.getDate()
      );
      
      s.is_returning = !sameDay;
      
      s.is_today = (
          firstDate.getFullYear() === todayDate.getFullYear() &&
          firstDate.getMonth() === todayDate.getMonth() &&
          firstDate.getDate() === todayDate.getDate()
      );
      
      s.timestamps = [...new Set(s.timestamps)].sort();
      return s;
    }).sort((a, b) => new Date(b.last_seen) - new Date(a.last_seen));
  }

  function openIntelDetail(kind) {
    const d = intelData || {};
    let title = '', body = '';
    if (kind === 'traffic') {
      title = 'Traffic Sources';
      const rows = (d.traffic || []).map(t => [t.source, t.n]);
      const total = rows.reduce((s, r) => s + r[1], 0);
      body = rows.length ? detailTable(['Source', 'Views'], rows, ['Total', total]) : '';
    } else if (kind === 'projects') {
      title = 'Top Projects';
      const rows = (d.top_projects || []).map(p => [p.title || p.code, p.n]);
      const total = rows.reduce((s, r) => s + r[1], 0);
      body = rows.length ? detailTable(['Project', 'Opens'], rows, ['Total', total]) : '';
    } else if (kind === 'pages') {
      title = 'Pages — views & avg time';
      const rows = (d.top_pages || []).map(p => [p.path === '/' ? '/ (home)' : p.path, p.n, fmtTime(p.avg_sec)]);
      const totalViews = rows.reduce((s, r) => s + r[1], 0);
      const overallAvgTime = d.kpis ? fmtTimeHM(d.kpis.avg_time) : '';
      body = rows.length ? detailTable(['Page', 'Views', 'Avg time'], rows, ['Total', totalViews, overallAvgTime]) : '';
    } else if (kind === 'leaderboard') {
      title = 'Game Leaderboard — all players';
      body = (d.leaderboard || []).length ? leaderboardTable(d.leaderboard) : '';
    } else if (kind === 'daily') {
      title = 'Page Views — Analytics';
      window._renderDailyTable = (daysCount) => {
        const byDay = {};
        (d.daily || []).forEach(r => { byDay[r.day] = r; });
        const rows = [];
        let tTimeSec = 0;
        for (let i = 0; i < daysCount; i++) {            // newest day first
          const dt = new Date(); dt.setDate(dt.getDate() - i);
          
          const mm = String(dt.getMonth() + 1).padStart(2, '0');
          const dd = String(dt.getDate()).padStart(2, '0');
          const yy = String(dt.getFullYear()).slice(-2);
          const key = `${dt.getFullYear()}-${mm}-${dd}`;
          const formattedDate = `${mm}/${dd}/${yy}`;

          const data = byDay[key] || { views: 0, time_sec: 0, game_plays: 0, downloads: 0, contact_clicks: 0 };
          tTimeSec += (data.time_sec || 0);
          rows.push([
              formattedDate, 
              data.views || 0,
              fmtTime(data.time_sec || 0),
              data.game_plays || 0,
              data.downloads || 0,
              data.contact_clicks || 0
          ]);
        }
        const tViews = rows.reduce((s, r) => s + r[1], 0);
        const tGames = rows.reduce((s, r) => s + r[3], 0);
        const tDowns = rows.reduce((s, r) => s + r[4], 0);
        const tConts = rows.reduce((s, r) => s + r[5], 0);
        return detailTable(['Day', 'Views', 'Time', 'Game Plays', 'Downloads', 'Contact Clicks'], rows, ['Total', tViews, fmtTimeHM(tTimeSec), tGames, tDowns, tConts]);
      };

      window._renderDetailedChart = (daysCount) => {
        const byDay = {};
        (d.daily || []).forEach(r => { byDay[r.day] = r; });
        const days = [];
        for (let i = daysCount - 1; i >= 0; i--) { // chronological
          const dt = new Date(); dt.setDate(dt.getDate() - i);
          const key = dt.toISOString().slice(0, 10);
          days.push([key, byDay[key] ? byDay[key].views : 0]);
        }
        
        if (!days.length) return '<div class="bl-empty">// no data</div>';
        
        const max = Math.max.apply(null, days.map(d => d[1])) || 1;
        const W = 800, H = 250, pad = 20, bw = (W - pad * 2) / days.length;
        
        const bars = days.map((d, i) => {
          const x = pad + i * bw;
          const w = Math.max(1, bw - 2).toFixed(1);
          if (d[1] === 0) {
            return `<rect x="${x.toFixed(1)}" y="${(H - 20).toFixed(1)}" width="${w}" height="2" style="fill: var(--text-muted); opacity: 0.3"><title>${d[0]}: 0 views</title></rect>` +
                   (daysCount <= 30 ? `<text x="${(x + w/2).toFixed(1)}" y="${(H - 24).toFixed(1)}" fill="currentColor" text-anchor="middle" font-size="10" font-family="'Share Tech Mono', monospace" opacity="0.6">0</text>` : '');
          }
          const h = Math.max(2, Math.round(d[1] / max * (H - 40)));
          const barColor = 'var(--accent, #ff4500)';
          
          const textNode = h > 14 && daysCount <= 30
              ? `<text x="${(x + w/2).toFixed(1)}" y="${(H - 20 - h + 11).toFixed(1)}" fill="#fff" text-anchor="middle" font-size="10" font-family="'Share Tech Mono', monospace" font-weight="bold">${d[1]}</text>`
              : (daysCount <= 30 ? `<text x="${(x + w/2).toFixed(1)}" y="${(H - 20 - h - 4).toFixed(1)}" fill="currentColor" text-anchor="middle" font-size="10" font-family="'Share Tech Mono', monospace" font-weight="bold">${d[1]}</text>` : '');
              
          return `<rect x="${x.toFixed(1)}" y="${(H - 20 - h).toFixed(1)}" width="${w}" height="${h}" fill="${barColor}"><title>${d[0]}: ${d[1]} views</title></rect>${textNode}`;
        }).join('');
        
        const first = days[0][0].slice(5), last = days[days.length - 1][0].slice(5);
        
        return `<svg viewBox="0 0 ${W} ${H}" class="spark" preserveAspectRatio="none" style="width: 100%; height: auto; max-height: 300px; overflow: visible; margin-top: 10px;">
            ${bars}
            <text x="${pad}" y="${H - 2}" font-size="12" fill="currentColor" font-family="'Share Tech Mono', monospace">${first}</text>
            <text x="${W - pad}" y="${H - 2}" text-anchor="end" font-size="12" fill="currentColor" font-family="'Share Tech Mono', monospace">${last}</text>
        </svg>`;
      };

      body = `
        <div class="row" style="margin-bottom: 16px; justify-content: space-between; align-items: center;" id="daily-controls">
          <div id="daily-filters">
            <button class="ghost filter-btn" data-days="1">Today</button>
            <button class="ghost filter-btn" data-days="7">7 Days</button>
            <button class="primary filter-btn" data-days="30">30 Days</button>
            <button class="ghost filter-btn" data-days="90">90 Days</button>
            <button class="ghost filter-btn" data-days="365">1 Year</button>
          </div>
          <div id="daily-view-toggle">
            <button class="primary view-btn" data-view="table">Table</button>
            <button class="ghost view-btn" data-view="chart">Chart</button>
          </div>
        </div>
        <div id="daily-content-container">
          <div id="daily-table-container">
            ${window._renderDailyTable(30)}
          </div>
          <div id="daily-chart-container" style="display: none;">
            ${window._renderDetailedChart(30)}
          </div>
        </div>
      `;
    } else if (kind === 'visitors') {
      const rangeLabel = intelRange === 0 ? 'all time' : (intelRange === 1 ? 'today' : `last ${intelRange} days`);
      title = `Recent Visitors — session logs (${rangeLabel})`;
      $('intel-modal-body').innerHTML = '<div class="bl-empty">// loading visitor data…</div>';
      $('intel-modal-title').textContent = title;
      $('intel-modal-bg').classList.remove('hidden');
      
      loadVisitorsLog(intelRange).then(sessions => {
        if (!sessions.length) {
            $('intel-modal-body').innerHTML = '<div class="bl-empty">// no visitors found in timeframe</div>';
            return;
        }
        
        const rows = sessions.map(s => {
            const codeBadge = `<span style="font-family:'Space Mono', monospace; font-size:0.85rem; font-weight:700; color:var(--text-main);">#${esc(s.code)}</span>`;
            
            let typeBadge;
            if (s.is_returning) {
                typeBadge = '<span class="badge badge--archived">Returning</span>';
            } else if (s.is_today) {
                typeBadge = '<span class="badge badge--deployed">New Today</span>';
            } else {
                typeBadge = '<span class="badge badge--deployed" style="background:transparent; color:var(--text-main); border:1px solid var(--border);">New</span>';
            }
            
            const times = s.timestamps.join('<br>') || '-';
            
            const lastVisitDate = new Date(s.last_seen);
            const lastVisitStr = lastVisitDate.toLocaleDateString([], {month:'short', day:'numeric'}) + ' ' + lastVisitDate.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
            
            return `
              <tr onclick="this.nextElementSibling.classList.toggle('hidden')" style="cursor:pointer; transition: background 0.2s;" onmouseover="this.style.background='var(--panel-bg)'" onmouseout="this.style.background='transparent'">
                  <td>${codeBadge}<br>${typeBadge}</td>
                  <td><div style="font-family:'Share Tech Mono', monospace; font-size:0.8rem; color:var(--text-muted);">${lastVisitStr}</div></td>
                  <td class="num">${s.views}</td>
                  <td class="num">${fmtTime(s.time)}</td>
              </tr>
              <tr class="hidden">
                  <td colspan="4" style="padding: 12px; background: var(--panel-bg); border-bottom: 1px solid var(--border);">
                      <div style="font-family:'Share Tech Mono', monospace; font-size:0.75rem; color:var(--text-muted); line-height:1.6;">
                          <strong>Timestamps:</strong><br>
                          ${times}
                      </div>
                  </td>
              </tr>
            `;
        });
        
        const totalViews = sessions.reduce((sum, s) => sum + s.views, 0);
        const totalTime = sessions.reduce((sum, s) => sum + s.time, 0);
        
        let tfoot = `<tfoot style="border-bottom: none !important;"><tr style="border-bottom: none !important;">
            <td style="font-weight: normal; border-top: 2px solid var(--border) !important; border-bottom: none !important; padding-top: 8px;">Total (${sessions.length})</td>
            <td style="border-top: 2px solid var(--border) !important; border-bottom: none !important; padding-top: 8px;"></td>
            <td class="num" style="font-weight: bold; border-top: 2px solid var(--border) !important; border-bottom: none !important; padding-top: 8px;">${totalViews}</td>
            <td class="num" style="font-weight: bold; border-top: 2px solid var(--border) !important; border-bottom: none !important; padding-top: 8px;">${fmtTimeHM(totalTime)}</td>
        </tr></tfoot>`;
        
        const tableHtml = '<table class="detail-table" style="width:100%; border-collapse:collapse;"><thead><tr><th style="text-align:left">Visitor ID</th><th style="text-align:left">Last Visit</th><th class="num">Views</th><th class="num">Time Spent</th></tr></thead><tbody>' +
          rows.join('') +
          '</tbody>' + tfoot + '</table>';
          
        $('intel-modal-body').innerHTML = tableHtml;
      });
      return;
    }
    
    $('intel-modal-title').textContent = title || 'Detail';
    $('intel-modal-body').innerHTML = body || '<div class="bl-empty">// no data yet</div>';
    
    if (kind === 'daily') {
      const filters = $('daily-filters');
      const viewToggle = $('daily-view-toggle');
      let currentDays = 30;
      let currentView = 'table';
      
      if (filters) {
        filters.addEventListener('click', async e => {
          if (!e.target.classList.contains('filter-btn')) return;
          currentDays = parseInt(e.target.dataset.days);
          filters.querySelectorAll('.filter-btn').forEach(b => {
            b.classList.toggle('primary', parseInt(b.dataset.days) === currentDays);
            b.classList.toggle('ghost', parseInt(b.dataset.days) !== currentDays);
          });
          if (currentDays === 1) {
            // Today: hourly breakdown (fetched live from the events table)
            $('daily-table-container').innerHTML = '<div class="bl-empty">// loading hourly…</div>';
            $('daily-chart-container').innerHTML = '<div class="bl-empty">// loading hourly…</div>';
            const buckets = await loadTodayHourly();
            $('daily-table-container').innerHTML = renderHourlyTable(buckets);
            $('daily-chart-container').innerHTML = renderHourlyChart(buckets);
          } else {
            $('daily-table-container').innerHTML = window._renderDailyTable(currentDays);
            $('daily-chart-container').innerHTML = window._renderDetailedChart(currentDays);
          }
        });
      }
      if (viewToggle) {
        viewToggle.addEventListener('click', e => {
          if (e.target.classList.contains('view-btn')) {
            currentView = e.target.dataset.view;
            $('daily-table-container').style.display = currentView === 'table' ? 'block' : 'none';
            $('daily-chart-container').style.display = currentView === 'chart' ? 'block' : 'none';
            viewToggle.querySelectorAll('.view-btn').forEach(b => {
              b.classList.toggle('primary', b.dataset.view === currentView);
              b.classList.toggle('ghost', b.dataset.view !== currentView);
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

  $('tx-unread-btn')?.addEventListener('click', () => {
    txUnreadOnly = !txUnreadOnly;
    $('tx-unread-btn').textContent = txUnreadOnly ? 'Show all' : 'Unread only';
    renderTx();
  });

  // boot
  const loader = document.createElement('div');
  loader.id = 'boot-loader';
  loader.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-family:"Share Tech Mono",monospace;color:var(--text-muted);font-size:0.8rem;letter-spacing:1px;';
  loader.textContent = '// AUTHENTICATING...';
  document.body.appendChild(loader);
  
  refreshAuth().finally(() => {
    if (loader.parentNode) loader.remove();
  });
})();
