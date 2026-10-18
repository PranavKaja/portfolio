// Run: node tests/linktag.test.js
// Checks linktag.js against the shared cases, which are a copy of the career hub's
// 13-Jobs/tests/short_tag_cases.json (worked out by hand, not generated).
const fs = require('fs');
const path = require('path');
const L = require('../linktag.js');

const { cases } = JSON.parse(fs.readFileSync(path.join(__dirname, 'short_tag_cases.json'), 'utf8'));
let fails = 0, n = 0;
function check(name, ok, detail) { n++; if (!ok) { fails++; console.log('  [FAIL] ' + name + '  ' + (detail || '')); } }

for (const c of cases) {
  const got = L.shortTag(c.company, c.role, c.date, c.doc);
  check(`short tag for ${JSON.stringify(c.company)} / ${JSON.stringify(c.role)}`, got === c.tag, got);
  const p = L.parseTag(got);
  check(`parses back: ${got}`, p && p.tag === got && p.cover === c.tag.endsWith('c'), JSON.stringify(p));
  check(`passes the site's code filter: ${got}`, /^[a-z0-9-]{6,40}$/.test(got));
}
for (const bad of ['jjama1318', 'jjama1000', 'j1018', 'jjamaxxx1018', 'rli61011-k3f9q-da7mx']) {
  check(`refuses ${bad}`, L.parseTag(bad) === null);
}
check('a tracker row matches its tag letters',
  L.rowLetters('Johnson and Johnson', 'Analyst - Modeling & Analytics') === 'jjama');
console.log(`\n  ${n - fails}/${n} passed`);
process.exit(fails ? 1 : 0);
