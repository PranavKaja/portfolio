/* ============================================================
 * Visitor Intel, lightweight, privacy-preserving tracker.
 * No cookies, no PII. A random session id in localStorage, a
 * normalized referrer, and on page views the browser string, time
 * zone and screen size (to tell link scanners from people). Honors
 * Do Not Track.
 * Other scripts can call window.intel.track(type, meta).
 *
 * Link codes: resumes and cover letters link to /brief?r=<code>, one
 * code per application. The code is saved with every event of that
 * visit, then taken off the address bar. Any page accepts one.
 *
 * Own visits: open any page once with ?me=1 and this browser is never
 * counted again. ?me=0 turns counting back on.
 * ============================================================ */
(function () {
  // respect Do Not Track
  var dnt = navigator.doNotTrack || window.doNotTrack || navigator.msDoNotTrack;
  if (dnt === '1' || dnt === 'yes') return;

  // own-visit switch, so checking my own resume links does not look like a recruiter
  try {
    var me = new URLSearchParams(location.search).get('me');
    if (me === '1') localStorage.setItem('intel_off', '1');
    if (me === '0') localStorage.removeItem('intel_off');
    if (localStorage.getItem('intel_off') === '1') { window.intel = { track: function () {} }; return; }
  } catch (e) { /* storage blocked: carry on and count the visit */ }

  var db = window.getSupabase && window.getSupabase();
  if (!db) { window.intel = { track: function () {} }; return; } // offline: no-op

  // Read the link code (and any utm_ tags) once, keep it for this tab's visit, clean the URL.
  var TAG_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_id'];
  function linkTag() {
    var tag = {};
    try {
      var q = new URLSearchParams(location.search), found = false;
      var r = (q.get('r') || '').trim().toLowerCase().replace(/[^a-z0-9]+$/, '');
      if (/^[a-z0-9-]{6,40}$/.test(r)) { tag.r = r; found = true; }
      TAG_KEYS.forEach(function (k) {
        var v = q.get(k);
        if (v) { tag[k] = String(v).slice(0, 80); found = true; }
      });
      if (found) {
        try { sessionStorage.setItem('intel_tag', JSON.stringify(tag)); } catch (e) { /* no-op */ }
        ['r', 'me'].concat(TAG_KEYS).forEach(function (k) { q.delete(k); });
        var rest = q.toString();
        history.replaceState(null, '', location.pathname + (rest ? '?' + rest : '') + location.hash);
      } else {
        var saved = sessionStorage.getItem('intel_tag');
        if (saved) tag = JSON.parse(saved) || {};
      }
    } catch (e) { /* analytics must never break the page */ }
    if (navigator.webdriver) tag.bot = '1';   // a browser driven by a script, not a person
    return tag;
  }
  var TAG = linkTag();

  function withTag(meta) {
    var out = {}, k;
    for (k in TAG) if (Object.prototype.hasOwnProperty.call(TAG, k)) out[k] = TAG[k];
    for (k in (meta || {})) if (Object.prototype.hasOwnProperty.call(meta, k)) out[k] = meta[k];
    return out;
  }

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
        meta: withTag(meta)
      }).then(function () {}, function () {}); // swallow errors, analytics must never break the page
    } catch (e) { /* no-op */ }
  }

  window.intel = { track: track };

  // page view, with what it takes to tell a link scanner from a person
  function device() {
    var d = {};
    try { d.tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* no-op */ }
    try {
      d.ua = String(navigator.userAgent || '').slice(0, 200);
      d.screen = screen.width + 'x' + screen.height;
      d.view = window.innerWidth + 'x' + window.innerHeight;
    } catch (e) { /* no-op */ }
    return d;
  }
  track('pageview', device());

  // first sign of a person on this page: a click, a key, or a real scroll. Sent once.
  var engaged = false;
  function onEngage(how) {
    if (engaged) return;
    engaged = true;
    track('engaged', { how: how });
    ['pointerdown', 'keydown', 'scroll'].forEach(function (t) { window.removeEventListener(t, handlers[t], true); });
  }
  var handlers = {
    pointerdown: function () { onEngage('click'); },
    keydown: function () { onEngage('key'); },
    scroll: function () { if (window.scrollY > 200) onEngage('scroll'); }
  };
  ['pointerdown', 'keydown', 'scroll'].forEach(function (t) {
    window.addEventListener(t, handlers[t], { capture: true, passive: true });
  });

  // resume downloads + project-card opens (delegated, survives dynamic cards)
  document.addEventListener('click', function (e) {
    var resume = e.target.closest && e.target.closest('a[href*="Resume"]');
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

  // ---- time on site ----
  // Accumulate only *visible* time (paused when the tab is hidden), and flush
  // the delta on every hide / unload. Uses a keepalive fetch because sendBeacon
  // can't set the apikey header Supabase requires. Summed per session in SQL.
  var cfg = window.PORTFOLIO_CONFIG || {};
  var segStart = (document.visibilityState === 'visible') ? Date.now() : null;
  var visibleMs = 0;

  function flushTime() {
    if (segStart) { visibleMs += Date.now() - segStart; segStart = (document.visibilityState === 'visible') ? Date.now() : null; }
    var seconds = Math.round(visibleMs / 1000);
    visibleMs = 0;
    if (seconds < 2 || seconds > 7200) return;                 // ignore instant bounces / absurd values
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return;
    try {
      fetch(cfg.SUPABASE_URL + '/rest/v1/events', {
        method: 'POST',
        keepalive: true,
        headers: {
          'apikey': cfg.SUPABASE_ANON_KEY,
          'Authorization': 'Bearer ' + cfg.SUPABASE_ANON_KEY,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ type: 'page_time', path: location.pathname, source: SOURCE, session_id: SESSION, meta: withTag({ seconds: seconds }) })
      }).catch(function () {});
    } catch (e) { /* no-op */ }
  }

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'hidden') flushTime();
    else segStart = Date.now();
  });
  window.addEventListener('pagehide', flushTime);
})();
