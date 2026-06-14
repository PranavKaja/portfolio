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
