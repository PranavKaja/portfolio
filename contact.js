/* ============================================================
 * Transmission Log — public contact form.
 * Submits to Supabase `messages`. If the backend isn't configured
 * (or insert fails), falls back to a prefilled mailto: so the form
 * is never a dead end.
 * ============================================================ */
(function () {
  const form = document.getElementById('transmit-form');
  if (!form) return;

  const $ = id => document.getElementById(id);
  const msg = $('tx-msg');
  const submit = $('tx-submit');

  function setMsg(text, kind) {
    msg.textContent = text || '';
    msg.className = 'tx-msg' + (kind ? ' ' + kind : '');
  }

  function mailtoFallback(name, email, phone, body) {
    // reuse the runtime-assembled address so we don't hardcode it for scrapers
    const addr = ($('email-desc') && $('email-desc').textContent.trim()) || '';
    if (!addr) { setMsg('Channel offline — email me directly.', 'err'); return; }
    const subject = 'Transmission from ' + (name || 'a visitor');
    const lines = [body, '', '— ' + (name || ''), email || '', phone || ''].join('\n');
    window.location.href = 'mailto:' + addr +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(lines);
    setMsg('// Opening your email client…', 'ok');
  }

  // --- Client-side email sanity checks -----------------------------------
  // These don't prove someone OWNS an address (only a confirmation email can),
  // but they catch the two things that actually lose you a reply: obvious
  // typos and throwaway inboxes.

  // Disposable / throwaway inboxes — a message here can never get a reply.
  // Covers the popular providers; not meant to be exhaustive.
  const DISPOSABLE = new Set([
    'mailinator.com', '10minutemail.com', 'guerrillamail.com', 'guerrillamail.info',
    'sharklasers.com', 'grr.la', 'guerrillamailblock.com', 'temp-mail.org', 'tempmail.com',
    'tempmailo.com', 'throwawaymail.com', 'yopmail.com', 'getnada.com', 'nada.email',
    'dispostable.com', 'trashmail.com', 'maildrop.cc', 'mailnesia.com', 'fakeinbox.com',
    'mintemail.com', 'mohmal.com', 'emailondeck.com', 'tempinbox.com', 'spambog.com',
    'mailcatch.com', '33mail.com', 'burnermail.io', 'moakt.com', 'mailto.plus', 'fakemail.net',
    'harakirimail.com', 'spam4.me', 'tmpmail.org', 'discard.email', 'tempr.email',
    'wegwerfmail.de', 'inboxkitten.com', 'mailsac.com'
  ]);

  // Reference domains/TLDs used to detect near-miss typos.
  const POPULAR_DOMAINS = [
    'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'hotmail.com', 'outlook.com',
    'live.com', 'msn.com', 'icloud.com', 'me.com', 'mac.com', 'aol.com', 'proton.me',
    'protonmail.com', 'pm.me', 'zoho.com', 'gmx.com', 'mail.com', 'yandex.com', 'comcast.net',
    'verizon.net', 'att.net', 'sbcglobal.net', 'qq.com', 'naver.com', 'umass.edu'
  ];
  const POPULAR_TLDS = ['com', 'net', 'org', 'edu', 'gov', 'co', 'io', 'dev', 'me', 'us',
    'ca', 'uk', 'au', 'in', 'de', 'fr', 'es', 'it', 'nl'];

  // Levenshtein edit distance (small inputs, so the simple DP is plenty)
  function lev(a, b) {
    const m = a.length, n = b.length;
    const d = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) d[i][0] = i;
    for (let j = 0; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++)
      for (let j = 1; j <= n; j++)
        d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1,
          d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[m][n];
  }

  // Returns a corrected address when the domain looks like a typo, else null.
  function suggestEmail(addr) {
    const at = addr.lastIndexOf('@');
    if (at < 0) return null;
    const local = addr.slice(0, at);
    const host = addr.slice(at + 1).toLowerCase();
    if (!host || POPULAR_DOMAINS.includes(host)) return null;

    // 1) whole-domain near miss: "gmial.com" / "gmail.con" -> "gmail.com"
    let best = null, bestD = 3;
    for (const dom of POPULAR_DOMAINS) {
      const dist = lev(host, dom);
      if (dist > 0 && dist < bestD) { bestD = dist; best = dom; }
    }
    if (best && bestD <= 2) return local + '@' + best;

    // 2) otherwise just a TLD slip: "company.con" -> "company.com"
    const dot = host.lastIndexOf('.');
    if (dot > 0) {
      const namePart = host.slice(0, dot), tld = host.slice(dot + 1);
      if (!POPULAR_TLDS.includes(tld)) {
        let bt = null, btD = 2;
        for (const t of POPULAR_TLDS) {
          const dist = lev(tld, t);
          if (dist > 0 && dist < btD) { btD = dist; bt = t; }
        }
        if (bt) return local + '@' + namePart + '.' + bt;
      }
    }
    return null;
  }

  // Non-blocking "Did you mean …?" nudge with a one-click fix. Built with the
  // DOM (not innerHTML) so a hostile local-part can never inject markup.
  let lastSuggestedFor = null;
  function showSuggestion(fixed) {
    msg.className = 'tx-msg err';
    msg.textContent = 'Did you mean ';
    const link = document.createElement('a');
    link.href = '#';
    link.textContent = fixed;
    link.style.color = 'var(--accent)';
    link.style.textDecoration = 'underline';
    link.addEventListener('click', (ev) => {
      ev.preventDefault();
      $('tx-email').value = fixed;
      lastSuggestedFor = null;
      setMsg('');
      $('tx-email').focus();
    });
    msg.appendChild(link);
    msg.appendChild(document.createTextNode('?  (or press Transmit again to keep what you typed)'));
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // honeypot: a bot filled the hidden field — pretend success, do nothing
    if ($('tx-website').value) { setMsg('// Transmission received.', 'ok'); form.classList.add('sent'); return; }

    const name = $('tx-name').value.trim();
    const email = $('tx-email').value.trim();
    const phone = $('tx-phone').value.trim();
    const body = $('tx-body').value.trim();

    if (!name || !email || !body) { setMsg('Name, email, and a message are required.', 'err'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setMsg('That email looks off — check it?', 'err'); return; }

    const host = email.split('@')[1].toLowerCase();
    // hard block: temporary/disposable inboxes — you'd never get a reply through
    if (DISPOSABLE.has(host)) {
      setMsg('That looks like a temporary inbox — please use an email you actually check so I can reply.', 'err');
      $('tx-email').focus();
      return;
    }
    // soft nudge: likely typo. Warn once; a second Transmit keeps what they typed
    const fixed = suggestEmail(email);
    if (fixed && email !== lastSuggestedFor) {
      lastSuggestedFor = email;
      showSuggestion(fixed);
      $('tx-email').focus();
      return;
    }

    submit.disabled = true;
    setMsg('// Transmitting…');

    const db = window.getSupabase && window.getSupabase();
    if (!db) { submit.disabled = false; mailtoFallback(name, email, phone, body); return; }

    const { error } = await db.from('messages').insert({ name, email, phone, body });
    submit.disabled = false;

    if (error) {
      console.warn('[transmit] insert failed, falling back to email:', error.message);
      mailtoFallback(name, email, phone, body);
      return;
    }

    form.reset();
    form.classList.add('sent');
    setMsg('// Transmission received. I’ll be in touch.', 'ok');
    if (window.intel) window.intel.track('contact_submit');
  });
})();
