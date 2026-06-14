/* ============================================================
 * Visitor Intel — lightweight, privacy-preserving tracker.
 * No cookies, no PII. A random session id in localStorage and a
 * normalized referrer are all it sends. Honors Do Not Track.
 * Other scripts can call window.intel.track(type, meta).
 * ============================================================ */
(function () {
  // respect Do Not Track
  var dnt = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
  if (dnt === '1' || dnt === 'yes') return;

  var db = window.getSupabase && window.getSupabase();
  if (!db) { window.intel = { track: function () {} }; return; } // offline: no-op

  function sessionId() {
    try {
      var s = localStorage.getItem('intel_sid');
      if (!s) {
        s = (window.crypto && crypto.randomUUID)
          ? crypto.randomUUID()
          : (Date.now().toString(36) + Math.random().toString(36).slice(2));
        localStorage.setItem('intel_sid', s);
      }
      return s;
    } catch (e) { return ''; }
  }

  function trafficSource() {
    var r = document.referrer || '';
    if (!r) return 'Direct';
    try {
      var h = new URL(r).hostname.replace(/^www\./, '');
      if (h === location.hostname) return 'Internal';
      if (h.indexOf('google') > -1) return 'Google';
      if (h.indexOf('linkedin') > -1 || h.indexOf('lnkd') > -1) return 'LinkedIn';
      if (h.indexOf('github') > -1) return 'GitHub';
      if (h.indexOf('t.co') > -1 || h.indexOf('twitter') > -1 || h === 'x.com') return 'Twitter/X';
      if (h.indexOf('bing') > -1) return 'Bing';
      if (h.indexOf('duckduckgo') > -1) return 'DuckDuckGo';
      if (h.indexOf('facebook') > -1 || h.indexOf('fb.') > -1) return 'Facebook';
      if (h.indexOf('reddit') > -1) return 'Reddit';
      return h.slice(0, 60);
    } catch (e) { return 'Other'; }
  }

  var SESSION = sessionId();
  var SOURCE = trafficSource();

  function track(type, meta) {
    try {
      db.from('events').insert({
        type: type,
        path: location.pathname,
        source: SOURCE,
        session_id: SESSION,
        meta: meta || {}
      }).then(function () {}, function () {}); // swallow errors — analytics must never break the page
    } catch (e) { /* no-op */ }
  }

  window.intel = { track: track };

  // page view
  track('pageview');

  // resume downloads + project-card opens (delegated, survives dynamic cards)
  document.addEventListener('click', function (e) {
    var resume = e.target.closest && e.target.closest('a[href*="Resume_Base.pdf"]');
    if (resume) { track('resume_download'); return; }

    var card = e.target.closest && e.target.closest('.project-panel[data-msn]');
    if (card) {
      var title = card.querySelector('h3');
      track('project_click', {
        code: 'MSN-' + card.dataset.msn,
        title: (title ? title.textContent : '').trim().slice(0, 80)
      });
    }
  });
})();
