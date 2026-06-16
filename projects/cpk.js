/* ============================================================
 * CPK Production Planner — client-side demo.
 * Paste the daily Orders Recap; it parses every line and builds
 * the make list + station pivot. 100% in-browser: nothing is sent
 * anywhere. (Phase 2 — bread/ingredient BOM — added separately.)
 * ============================================================ */
(function () {
  const $ = id => document.getElementById(id);

  // Sample order data (anonymized, in the real report's format) so the
  // tool works the instant the page loads.
  const SAMPLE = [
    '10/1/2025  1004  Turkey Kaiser              01 , Worcester DC     60  EACH',
    '10/1/2025  2291  Ham on Rye                 01 , Worcester DC     50  EACH',
    '10/1/2025  2299  PB & J on WW               01 , Worcester DC     40  EACH',
    '10/1/2025  2366  Roast Beef on Kaiser       01 , Worcester DC     30  EACH',
    '10/1/2025  2387  Tuna Salad on White        13 , Worcester Cafe    2  EACH',
    '10/1/2025  2387  Tuna Salad on White        15 , Furcolo Cafe      2  EACH',
    '10/1/2025  2387  Tuna Salad on White        23 , Harvest           8  EACH',
    '10/1/2025  2387  Tuna Salad on White        42 , Library Cafe      5  EACH',
    '10/1/2025  4837  Chicken Caesar Salad       13 , Worcester Cafe    2  EACH',
    '10/1/2025  4837  Chicken Caesar Salad       23 , Harvest          18  EACH',
    '10/1/2025  4837  Chicken Caesar Salad       42 , Library Cafe      5  EACH',
    '10/1/2025  6063  Hummus Veg Sandwich        23 , Harvest           4  EACH',
    '10/1/2025  6063  Hummus Veg Sandwich        42 , Library Cafe      3  EACH',
    '10/1/2025  8009  Turkey & Cheddar GF        23 , Harvest           6  EACH',
    '10/1/2025  8009  Turkey & Cheddar GF        15 , Furcolo Cafe      1  EACH',
    '10/1/2025  9221  Chicken Mozzarella         23 , Harvest          15  EACH',
    '10/1/2025  9255  Buffalo Chicken Wrap       23 , Harvest          15  EACH',
    '10/1/2025  9255  Buffalo Chicken Wrap       42 , Library Cafe      5  EACH',
    '10/1/2025  9266  Mixed Fruit Cup 12oz       23 , Harvest          24  EACH',
    '10/1/2025  9266  Mixed Fruit Cup 12oz       42 , Library Cafe     16  EACH',
    '10/1/2025  9266  Mixed Fruit Cup 12oz       51 , CC Peets         10  EACH'
  ].join('\n');

  // date  item#  item name (multi-word)  loc# , loc name  qty  unit  [running total]
  const LINE = /^\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s+([\d.]+)\s+(.+?)\s+(\d{1,3})\s*,\s*(.+?)\s+(\d+)\s+([A-Za-z]+)\s*\d*\s*$/;

  function parse(text) {
    const rows = [], skipped = [];
    text.split(/\r?\n/).forEach(line => {
      if (!line.trim()) return;
      const m = line.match(LINE);
      if (!m) { if (/\d/.test(line)) skipped.push(line.trim()); return; }
      rows.push({
        item: m[2], name: m[3].trim(),
        locCode: m[4], loc: m[5].trim(),
        qty: parseInt(m[6], 10) || 0, unit: m[7].toUpperCase()
      });
    });
    return { rows, skipped };
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function makeList(rows) {
    const by = {};
    rows.forEach(r => {
      if (!by[r.item]) by[r.item] = { item: r.item, name: r.name, qty: 0, unit: r.unit, locs: 0 };
      by[r.item].qty += r.qty;
      if (r.qty > 0) by[r.item].locs += 1;
    });
    return Object.values(by).sort((a, b) => b.qty - a.qty);
  }

  function renderMakeList(rows) {
    const list = makeList(rows);
    const total = list.reduce((s, i) => s + i.qty, 0);
    let h = '<table class="cpk-table"><thead><tr><th>Item #</th><th>Item</th>' +
      '<th class="num">Make</th><th>Unit</th><th class="num">Locations</th></tr></thead><tbody>';
    list.forEach(i => {
      h += `<tr><td class="mono">${esc(i.item)}</td><td>${esc(i.name)}</td>` +
        `<td class="num strong">${i.qty}</td><td>${esc(i.unit)}</td><td class="num">${i.locs}</td></tr>`;
    });
    h += `</tbody><tfoot><tr><td></td><td>GRAND TOTAL</td><td class="num strong">${total}</td>` +
      '<td>UNITS</td><td></td></tr></tfoot></table>';
    return h;
  }

  function renderPivot(rows) {
    const items = [], seenI = {}, locs = [], seenL = {}, cell = {};
    rows.forEach(r => {
      if (!seenI[r.item]) { seenI[r.item] = 1; items.push({ id: r.item, name: r.name }); }
      if (!seenL[r.loc]) { seenL[r.loc] = 1; locs.push(r.loc); }
      const k = r.loc + '|' + r.item;
      cell[k] = (cell[k] || 0) + r.qty;
    });
    items.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
    locs.sort();
    let h = '<div class="cpk-scroll"><table class="cpk-table cpk-pivot"><thead><tr><th>Location</th>';
    items.forEach(it => h += `<th class="num" title="${esc(it.name)}">${esc(it.id)}</th>`);
    h += '<th class="num">Total</th></tr></thead><tbody>';
    locs.forEach(loc => {
      let rt = 0;
      h += `<tr><td class="loc">${esc(loc)}</td>`;
      items.forEach(it => { const q = cell[loc + '|' + it.id] || 0; rt += q; h += `<td class="num${q ? '' : ' zero'}">${q || ''}</td>`; });
      h += `<td class="num strong">${rt}</td></tr>`;
    });
    let grand = 0;
    h += '<tr class="totals"><td>Make total</td>';
    items.forEach(it => { let c = 0; locs.forEach(loc => c += cell[loc + '|' + it.id] || 0); grand += c; h += `<td class="num strong">${c}</td>`; });
    h += `<td class="num strong">${grand}</td></tr></tbody></table></div>` +
      '<p class="cpk-hint">Columns are item codes — hover a code for its name. Rows are destination locations.</p>';
    return h;
  }

  // DC commissary locations (codes 01/02/04, or "DC" in the name) get FoodPro
  // stickers; every other location is a retail café with Harvest Fresh stickers.
  function channelOf(code, loc) {
    return (/^0[124]$/.test(code) || /\bDC\b/.test(loc)) ? 'DC' : 'Retail';
  }
  function stickerOf(ch) { return ch === 'DC' ? 'FoodPro stickers' : 'Harvest Fresh stickers'; }

  function renderRouting(rows) {
    const byLoc = {};
    rows.forEach(r => {
      if (!byLoc[r.loc]) byLoc[r.loc] = { loc: r.loc, code: r.locCode, channel: channelOf(r.locCode, r.loc), items: [], total: 0 };
      byLoc[r.loc].items.push(r);
      byLoc[r.loc].total += r.qty;
    });
    const locs = Object.values(byLoc).sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true }));
    let h = '<div class="cpk-routing">';
    locs.forEach(L => {
      h += `<div class="cpk-loccard"><div class="cpk-lochead">` +
        `<span class="cpk-locname">${esc(L.code)} &middot; ${esc(L.loc)}</span>` +
        `<span class="cpk-badge cpk-${L.channel.toLowerCase()}">${L.channel} &middot; ${stickerOf(L.channel)}</span>` +
        `<span class="cpk-loctot">${L.total} units</span></div>` +
        '<table class="cpk-table"><tbody>';
      L.items.sort((a, b) => a.item.localeCompare(b.item, undefined, { numeric: true })).forEach(it => {
        h += `<tr><td class="mono">${esc(it.item)}</td><td>${esc(it.name)}</td><td class="num strong">${it.qty}</td></tr>`;
      });
      h += '</tbody></table></div>';
    });
    return h + '</div>';
  }

  let data = { rows: [], skipped: [] };
  let tab = 'make';

  function render() {
    const out = $('cpk-output');
    if (!data.rows.length) { out.innerHTML = '<p class="cpk-empty">// Paste an order report above and hit GENERATE.</p>'; return; }
    out.innerHTML = tab === 'make' ? renderMakeList(data.rows)
      : tab === 'pivot' ? renderPivot(data.rows)
      : renderRouting(data.rows);
  }

  function setTab(t) {
    tab = t;
    document.querySelectorAll('.cpk-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
    render();
  }

  function generate() {
    data = parse($('cpk-input').value);
    const m = `${data.rows.length} order line${data.rows.length === 1 ? '' : 's'} parsed` +
      (data.skipped.length ? ` · ${data.skipped.length} skipped` : '');
    $('cpk-meta').textContent = '// ' + m;
    render();
    if (window.intel) try { window.intel.track('cpk_generate', { lines: data.rows.length }); } catch (e) { }
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('cpk-input')) return;
    $('cpk-input').value = SAMPLE;
    $('cpk-gen').addEventListener('click', generate);
    $('cpk-sample').addEventListener('click', () => { $('cpk-input').value = SAMPLE; generate(); });
    $('cpk-clear').addEventListener('click', () => { $('cpk-input').value = ''; data = { rows: [], skipped: [] }; $('cpk-meta').textContent = ''; render(); });
    document.querySelectorAll('.cpk-tab').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
    generate(); // run once on the preloaded sample
  });
})();
