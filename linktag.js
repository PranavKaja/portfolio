/* ============================================================
 * Short link tags (ruling 2026-10-18).
 *
 * Resumes made by a tool that cannot register a code (a Gemini skill, a chat
 * model, Pranav by hand) link to /brief?r=<tag> instead, for example
 * jjama1018: company letters, role letters, month and day made, then "c" for a
 * cover letter. Nothing is registered, so the Ops Console matches the tag
 * against the tracker.
 *
 * The same rule lives in the career hub at 13-Jobs/engine/brieflink.py
 * (short_tag). tests/short_tag_cases.json holds the shared cases: change both
 * copies together.
 * ============================================================ */
(function (root) {
  const COMPANY_SKIP = new Set(['the', 'inc', 'incorporated', 'llc', 'llp', 'lp', 'ltd', 'limited', 'corp',
    'corporation', 'co', 'company', 'plc', 'pllc', 'and', 'of']);
  const ROLE_SKIP = new Set(['and', 'of', 'the', 'for', 'to', 'in', 'at', 'a', 'an', 'sr', 'jr', 'senior',
    'junior', 'i', 'ii', 'iii', 'iv', 'v']);
  const TAG_RE = /^([a-z]{2,6})(\d{2})(\d{2})(c?)$/;

  function fold(s) {
    return String(s == null ? '' : s).normalize('NFKD').replace(/[̀-ͯ]/g, '')
      .toLowerCase().replace(/ß/g, 'ss');
  }

  function letters(name, skip) {
    // Apostrophes and periods are deleted (Macy's is "macys"); every other mark breaks words.
    const words = fold(name).replace(/[.'’`]/g, '').replace(/&/g, ' ').split(/[^a-z0-9]+/)
      .filter(w => w && /^[a-z]/.test(w) && !skip.has(w));
    if (!words.length) return 'x';
    if (words.length === 1) return words[0].replace(/[^a-z]/g, '').slice(0, 3) || 'x';
    return words.slice(0, 3).map(w => w[0]).join('');
  }

  function pad(n) { return String(n).padStart(2, '0'); }

  // date: a Date, or 'YYYY-MM-DD'. doc: 'resume' or 'cover'.
  function shortTag(company, role, date, doc) {
    let m, d;
    if (typeof date === 'string' && (m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date))) { d = [m[2], m[3]]; }
    else { const x = date instanceof Date ? date : new Date(); d = [pad(x.getMonth() + 1), pad(x.getDate())]; }
    // same document words as brieflink.doc_code: cover, coverletter, letter, c
    const k = String(doc || '').toLowerCase().replace(/[^a-z]/g, '');
    const cover = ['c', 'cover', 'coverletter', 'letter'].includes(k);
    return letters(company, COMPANY_SKIP) + letters(role, ROLE_SKIP) + d[0] + d[1] + (cover ? 'c' : '');
  }

  function parseTag(text) {
    const m = TAG_RE.exec(String(text || '').trim().toLowerCase());
    if (!m) return null;
    const month = +m[2], day = +m[3];
    if (month < 1 || month > 12 || day < 1 || day > 31) return null;
    return { tag: m[0], letters: m[1], month, day, cover: m[4] === 'c' };
  }

  function rowLetters(company, role) {
    return letters(company, COMPANY_SKIP) + letters(role, ROLE_SKIP);
  }

  const api = { shortTag, parseTag, rowLetters, letters, COMPANY_SKIP, ROLE_SKIP };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.linkTag = api;
})(typeof window !== 'undefined' ? window : globalThis);
