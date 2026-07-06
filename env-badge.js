(() => {
  const host = location.hostname;
  const isProd = host === 'pranavkaja.com' || host === 'www.pranavkaja.com';
  if (isProd) return;

  const label = host.startsWith('test.') ? 'TEST'
              : host.endsWith('.vercel.app') ? 'PREVIEW'
              : host === 'localhost' || host === '127.0.0.1' ? 'LOCAL'
              : 'NON-PROD';

  const el = document.createElement('div');
  el.setAttribute('role', 'status');
  el.setAttribute('aria-label', 'Non-production environment: ' + label);
  el.textContent = label;
  el.style.cssText = [
    'position:fixed', 'top:8px', 'right:8px', 'z-index:2147483647',
    'padding:4px 10px', 'background:#ff4500', 'color:#fff',
    'font:600 11px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace',
    'letter-spacing:1px', 'border-radius:3px',
    'box-shadow:0 1px 4px rgba(0,0,0,.2)',
    'pointer-events:none', 'user-select:none'
  ].join(';');

  const attach = () => document.body && document.body.appendChild(el);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach, { once: true });
  } else {
    attach();
  }
})();
