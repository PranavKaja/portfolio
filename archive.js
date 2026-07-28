/* ============================================================
 * Mission archive (/projects), data-driven.
 *
 * Renders the case-file grid from the same Supabase table the ops
 * console writes to, so adding, reordering or deleting a project in
 * the console shows up here without anyone editing this page's HTML.
 *
 * The cards already in projects/index.html are the no-JS and crawler
 * fallback. They are replaced only after a live read succeeds, so a
 * Supabase outage leaves a complete page standing instead of an
 * error strip. That is the opposite of missions.js on the homepage,
 * which has data/projects.json to fall back to.
 * ============================================================ */
(function () {
  const STATUS_LABELS = {
    deployed: 'DEPLOYED',
    in_progress: 'IN PROGRESS',
    archived: 'ARCHIVED',
    classified: 'CLASSIFIED',
    none: 'NONE'
  };

  // the hero counts the archive out loud, so the number has to move with the data
  const COUNT_WORDS = ['Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven',
    'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen',
    'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen', 'Twenty'];

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  // slugs are typed by hand in the console, so only link out on one that a
  // /projects/<page> route can actually serve
  function slugOK(s) {
    return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(s || ''));
  }

  // returns null when the live read did not work, meaning "leave the page alone"
  async function loadProjects() {
    const db = window.getSupabase && window.getSupabase();
    if (!db) return null;
    try {
      const { data, error } = await db
        .from('projects')
        .select('*')
        .eq('published', true)
        .order('sort_order', { ascending: true });
      if (error) throw error;
      return (data && data.length) ? data : null;
    } catch (e) {
      console.warn('[archive] Supabase load failed, keeping the static cards:', e.message || e);
      return null;
    }
  }

  function cardHTML(p) {
    const status = p.status || 'deployed';
    const showStatus = p.show_status !== false && status !== 'none';
    // status_label lets a card say what it is to a visitor ("LIVE TOOL") instead
    // of its lifecycle enum. Falls back to the enum label when unset.
    const statusText = p.status_label || STATUS_LABELS[status] || status;
    const statusHtml = showStatus
      ? `<span class="proj-status proj-status--${esc(status)}">${esc(statusText)}</span>`
      : '';
    // archive_desc is the roomier copy this page has space for. summary is
    // written short for the tighter homepage reel cards.
    const desc = p.archive_desc || p.summary || '';
    const body = `
                    ${statusHtml}
                    <div class="proj-id">${esc(p.code)}</div><h3>${esc(p.title)}</h3>
                    <p class="tech">${esc(p.tech)}</p>
                    <p class="desc">${esc(desc)}</p>`;

    // a project with no case-file page yet is a panel, not a link to a 404
    if (!slugOK(p.case_study_slug)) {
      return `                <div class="project-panel">${body}
                </div>`;
    }
    return `                <a href="/projects/${esc(p.case_study_slug)}" class="project-panel no-underline text-inherit interactive-element" style="display:block;">${body}
                </a>`;
  }

  document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('archive-grid');
    if (!grid) return;

    const projects = await loadProjects();
    if (!projects) return;   // static cards stand

    grid.innerHTML = '\n' + projects.map(cardHTML).join('\n') + '\n            ';

    const count = document.getElementById('archive-count');
    if (count) count.textContent = COUNT_WORDS[projects.length] || String(projects.length);
  });
})();
