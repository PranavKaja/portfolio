/* ============================================================
 * Mission History — now data-driven.
 * Loads projects from Supabase (or data/projects.json offline),
 * renders the cards, and wires the detail overlay via delegation
 * so dynamically injected cards behave exactly like the old static ones.
 * ============================================================ */
(function () {
  const STATUS_LABELS = {
    deployed: 'DEPLOYED',
    in_progress: 'IN PROGRESS',
    archived: 'ARCHIVED',
    classified: 'CLASSIFIED',
    none: 'NONE'
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // 'MSN-01' -> '01' (overlay + data-msn key the original markup used)
  function codeNum(code) {
    const m = String(code || '').match(/(\d+)/);
    return m ? m[1] : String(code || '');
  }

  async function loadProjects() {
    const db = window.getSupabase && window.getSupabase();
    if (db) {
      try {
        const { data, error } = await db
          .from('projects')
          .select('*')
          .eq('published', true)
          .order('sort_order', { ascending: true });
        if (error) throw error;
        if (data && data.length) return data;
      } catch (e) {
        console.warn('[projects] Supabase load failed, using local fallback:', e.message || e);
      }
    }
    // offline / not-yet-configured: read the bundled snapshot
    const res = await fetch('data/projects.json', { cache: 'no-store' });
    const json = await res.json();
    return json
      .filter(p => p.published !== false)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
  }

  function cardHTML(p) {
    const num = codeNum(p.code);
    const status = p.status || 'deployed';
    const showStatus = p.show_status !== false;
    const chips = (p.chips || []).map(c => `<span>${esc(c)}</span>`).join('');
    // hover card shows skills used/learnt; falls back to the metric chips until skills are set
    const hoverList = (p.skills && p.skills.length) ? p.skills : (p.chips || []);
    const hoverTags = hoverList.map(c => `<span>${esc(c)}</span>`).join('');
    const statusHtml = (status === 'none' || !showStatus) ? '' : `<span class="proj-status proj-status--${esc(status)}">${esc(STATUS_LABELS[status] || status)}</span>`;
    return `
    <div class="project-panel interactive-element" tabindex="0" role="button" data-msn="${esc(num)}"
        aria-label="Open mission ${esc(p.code)}: ${esc(p.title)}">
        ${statusHtml}
        <div class="proj-id">${esc(p.code)}</div>
        <h3>${esc(p.title)}</h3>
        <p class="tech">${esc(p.tech)}</p>
        <p class="desc">${esc(p.summary)}</p>
        <div class="pp-expand" aria-hidden="true">
            <span class="project-arrow" aria-hidden="true">&nearr;</span>
            <div class="pp-head"><span class="proj-id">${esc(p.code)}</span><span class="pp-stack">${esc(p.stack)}</span></div>
            <h3>${esc(p.title)}</h3>
            <p class="pp-hook">${esc(p.hook)}</p>
            <p class="pp-brief">${esc(p.brief)}</p>
            <div class="pp-chips">${hoverTags}</div>
        </div>
    </div>`;
  }

  function wireOverlay(byCode, grid) {
    const overlay = document.getElementById('msn-overlay');
    if (!overlay) return;
    const sheet = overlay.querySelector('.msn-sheet');
    const el = id => document.getElementById(id);
    const backBtn = el('msn-back');
    let lastFocus = null;
    let openedViaKeyboard = false;

    function open(num, isKeyboard) {
      const m = byCode[num];
      if (!m) return;
      lastFocus = document.activeElement;
      openedViaKeyboard = !!isKeyboard;
      el('msn-d-id').textContent = m.code;
      el('msn-d-stack').textContent = m.stack;
      el('msn-d-title').textContent = m.title;
      el('msn-d-hook').textContent = m.hook;
      el('msn-d-brief').textContent = m.brief;
      el('msn-d-role').textContent = m.role;
      el('msn-d-method').textContent = m.method;
      el('msn-d-outcome').textContent = m.outcome;
      const chipBox = el('msn-d-chips');
      chipBox.innerHTML = '';
      (m.chips || []).forEach(c => {
        const s = document.createElement('span');
        s.textContent = c;
        chipBox.appendChild(s);
      });

      // Skills used / learnt row (hidden when a project has no skills)
      const skillBox = el('msn-d-skills');
      const skillRow = el('msn-d-skills-row');
      if (skillBox) {
        skillBox.innerHTML = '';
        const sk = m.skills || [];
        sk.forEach(c => {
          const s = document.createElement('span');
          s.textContent = c;
          skillBox.appendChild(s);
        });
        if (skillRow) skillRow.style.display = sk.length ? '' : 'none';
      }

      const ghBox = el('msn-d-github');
      if (ghBox) {
        if (m.github_url && m.show_github !== false) {
          // link_type 'site' shows my portfolio crosshair mark; anything else shows the GitHub logo
          const isSite = m.link_type === 'site';
          const icon = isSite
            ? `<svg viewBox="0 0 24 24" width="17" height="17" aria-hidden="true"><g fill="currentColor"><rect x="11" y="2" width="2" height="5"/><rect x="11" y="17" width="2" height="5"/><rect x="2" y="11" width="5" height="2"/><rect x="17" y="11" width="5" height="2"/></g><circle cx="12" cy="12" r="2.6" fill="#ff4500"/></svg>`
            : `<svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>`;
          const tDef = isSite ? 'Live page' : 'Case file';
          const tHov = isSite ? 'Open' : 'GitHub';
          ghBox.innerHTML = `<a href="${esc(m.github_url)}" target="_blank" rel="noopener noreferrer" class="github-btn">
            ${icon}
            <span class="gh-text-default">${esc(tDef)}</span>
            <span class="gh-text-hover">${esc(tHov)}</span>
            </a>`;
        } else {
          ghBox.innerHTML = '';
        }
      }
      overlay.classList.add('active');
      document.body.classList.add('msn-open');
      sheet.scrollTop = 0;
      backBtn.focus();
    }

    function close() {
      overlay.classList.remove('active');
      document.body.classList.remove('msn-open');
      if (lastFocus) {
        lastFocus.focus({ preventScroll: true });
        if (!openedViaKeyboard) lastFocus.blur();
      }
      grid.classList.remove('previewing');
    }

    // delegation: survives dynamic card injection
    grid.addEventListener('click', e => {
      const card = e.target.closest('.project-panel[data-msn]');
      if (card) open(card.dataset.msn, false);
    });
    grid.addEventListener('keydown', e => {
      const card = e.target.closest('.project-panel[data-msn]');
      if (card && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        open(card.dataset.msn, true);
      }
    });
    backBtn.addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', e => {
      // keep Tab focus inside the open mission sheet (modal focus trap)
      if (e.key === 'Tab' && overlay.classList.contains('active')) {
        const items = Array.from(sheet.querySelectorAll('a[href], button:not([disabled]), [tabindex="0"]'))
          .filter(el => el.offsetParent !== null);
        if (items.length) {
          const first = items[0], last = items[items.length - 1];
          if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
        return;
      }
      if (e.key === 'Escape' && overlay.classList.contains('active')) close();
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('projects-grid') || document.querySelector('#projects .grid-3');
    if (!grid) return;

    let projects = [];
    try {
      projects = await loadProjects();
    } catch (e) {
      console.error('[projects] failed to load', e);
      grid.innerHTML = '<p class="proj-load-error">// PROJECT FEED UNAVAILABLE</p>';
      grid.setAttribute('aria-busy', 'false');
      return;
    }

    const byCode = {};
    projects.forEach(p => { byCode[codeNum(p.code)] = p; });

    grid.innerHTML = projects.map(cardHTML).join('');
    grid.setAttribute('aria-busy', 'false');
    wireOverlay(byCode, grid);

    // the carousel scrollbar (main.js) measured an empty grid at load;
    // nudge it to re-measure now that the cards exist
    window.dispatchEvent(new Event('resize'));
  });
})();
