/* ============================================================
 * Skills + Certifications, data-driven from Supabase.
 * Falls back to data/skills.json and data/certifications.json.
 * Renders into the existing #core-skills-grid and #certs-grid so
 * the collapse behavior in main.js keeps working; re-wires the
 * "show locked" toggle since main.js runs before these cards exist.
 * ============================================================ */
(function () {
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  async function loadTable(table, fallbackFile) {
    const db = window.getSupabase && window.getSupabase();
    if (db) {
      try {
        const { data, error } = await db.from(table).select('*')
          .eq('published', true).order('sort_order', { ascending: true });
        if (error) throw error;
        if (data) return data;
      } catch (e) {
        console.warn('[' + table + '] Supabase load failed, using fallback:', e.message || e);
      }
    }
    try {
      const res = await fetch(fallbackFile, { cache: 'no-store' });
      const json = await res.json();
      return json.filter(x => x.published !== false)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    } catch (e) { return null; }
  }

  function renderSkills(rows) {
    const grid = document.getElementById('core-skills-grid');
    if (!grid || !rows) return;
    grid.innerHTML = rows.map(s => `
      <div class="skill-panel">
        <h3>${esc(s.category)}</h3>
        <p>${(s.items || []).map(esc).join(', ')}</p>
      </div>`).join('');
    const hint = grid.previousElementSibling;
    if (hint && hint.classList.contains('collapsed-hint')) {
      hint.textContent = `[ ${rows.length} CATEGORIES HIDDEN ]`;
    }
  }

  function renderCerts(rows) {
    const grid = document.getElementById('certs-grid');
    if (!grid || !rows) return;
    grid.innerHTML = rows.map(c => {
      const inner = `<h3>${esc(c.name)}</h3><p>${esc(c.issuer)}</p>`;
      if (c.in_progress) {
        const p = Math.max(0, Math.min(100, c.progress || 0));
        return `<div class="skill-panel locked locked-cert" style="display:none; background:linear-gradient(to right, var(--border) ${p}%, transparent ${p}%);">${inner}</div>`;
      }
      return c.link
        ? `<a class="skill-panel no-underline text-inherit" href="${esc(c.link)}" target="_blank" rel="noopener noreferrer" title="View credential" style="display:block;">${inner}</a>`
        : `<div class="skill-panel">${inner}</div>`;
    }).join('');
    wireLockedToggle();
  }

  // main.js wires this at load, but the locked cards don't exist yet, so do it here
  function wireLockedToggle() {
    const btn = document.getElementById('toggle-locked-btn');
    const grid = document.getElementById('certs-grid');
    const hint = document.getElementById('certs-hint');
    if (!grid) return;
    const locked = [].slice.call(grid.querySelectorAll('.locked-cert'));
    function updateHint() {
      if (!hint) return;
      const hidden = locked.filter(c => c.style.display === 'none').length;
      hint.textContent = `[ ${hidden} ITEMS HIDDEN ]`;
    }
    updateHint();
    if (!btn) return;
    if (!locked.length) { btn.style.display = 'none'; return; }
    btn.style.display = '';
    if (btn._wired) return;
    btn._wired = true;
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      const show = locked[0].style.display === 'none';
      locked.forEach(c => { c.style.display = show ? 'block' : 'none'; });
      btn.textContent = show ? '[ HIDE LOCKED ]' : '[ SHOW LOCKED ]';
      updateHint();
    });
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const [skills, certs] = await Promise.all([
      loadTable('skills', 'data/skills.json'),
      loadTable('certifications', 'data/certifications.json')
    ]);
    if (skills) renderSkills(skills);
    if (certs) renderCerts(certs);
  });
})();
