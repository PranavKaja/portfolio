/* ============================================================
 * CPK Production Planner — client-side demo.
 * Paste the daily Orders Recap; it parses every line and builds
 * the make list, station pivot, routing, bread defrost plan, and
 * raw-ingredient BOM. 100% in-browser: nothing is sent anywhere.
 *
 * Recipes (bread + ingredients) live in the RECIPES table below —
 * those are starter values; edit them to match the real spec.
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

  // Handles both the spaced sample ("01 , Worcester DC   60  EACH") and the
  // raw Orders Recap ("23, Harvest   4   2 eac   <running total>"):
  // date  item#  name(multi-word)  loc#, loc name  DUE-AMOUNT  [pack] UNIT  [total]
  const LINE = /^\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d[\d.]*)\s+(.+?)\s+(\d{1,3})\s*,\s*(.+?)\s{2,}(\d+)\s+(?:(\d+)\s+)?([A-Za-z]+)/;
  const DATE_LEAD = /^\s*\d{1,2}\/\d{1,2}\/\d{2,4}/;

  function parse(text) {
    const rows = [], skipped = [];
    text.split(/\r?\n/).forEach(line => {
      if (!line.trim()) return;
      const m = line.match(LINE);
      // Only flag genuine data lines (they start with a date) that failed to
      // parse — page headers, separators and totals are silently ignored.
      if (!m) { if (DATE_LEAD.test(line)) skipped.push(line.trim()); return; }
      rows.push({
        item: m[2], name: m[3].trim(),
        locCode: m[4], loc: m[5].trim(),
        qty: parseInt(m[6], 10) || 0,
        pack: m[7] ? parseInt(m[7], 10) : 1,
        unit: /^EA/i.test(m[8]) ? 'EACH' : m[8].toUpperCase()
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

  /* ====================  RECIPE BOM — EDIT ME  ====================
   * One entry per item code. `bread` is the loaf/roll/wrap pulled per
   * unit (qty = pieces, e.g. a 2-slice sandwich = 2); set null for
   * salads / fruit / snacks. `build` is the per-unit ingredient list.
   * Quantities are sensible STARTERS — replace with the real spec.
   * Item codes with no entry are flagged in the Bread/Prep tabs.
   * ================================================================ */
  const RECIPES = {
    '0253': { bread: { type: 'White bread', qty: 3 }, build: [{ ing: 'Peanut butter', qty: 1.5, unit: 'oz' }, { ing: 'Jelly', qty: 1, unit: 'oz' }] },
    '0279': { bread: { type: 'White bread', qty: 3 }, build: [{ ing: 'Turkey', qty: 3, unit: 'oz' }, { ing: 'American cheese', qty: 1, unit: 'slice' }, { ing: 'Mayo packet', qty: 1, unit: 'ea' }] },
    '0283': { bread: { type: 'White bread', qty: 3 }, build: [{ ing: 'Ham', qty: 3, unit: 'oz' }, { ing: 'American cheese', qty: 1, unit: 'slice' }, { ing: 'Mustard packet', qty: 1, unit: 'ea' }] },
    '0301': { bread: null, build: [{ ing: 'Little Leaf lettuce', qty: 3, unit: 'oz' }, { ing: 'Driscoll berries', qty: 1.5, unit: 'oz' }, { ing: 'Dressing cup', qty: 1, unit: 'ea' }] },
    '1004': { bread: { type: 'Kaiser roll', qty: 1 }, build: [{ ing: 'Turkey', qty: 3, unit: 'oz' }, { ing: 'Lettuce', qty: 0.5, unit: 'oz' }, { ing: 'Tomato', qty: 1, unit: 'slice' }, { ing: 'Mayo packet', qty: 1, unit: 'ea' }] },
    '2226': { bread: { type: 'Croissant', qty: 1 }, build: [{ ing: 'Turkey', qty: 3, unit: 'oz' }, { ing: 'Swiss cheese', qty: 1, unit: 'slice' }] },
    '2291': { bread: { type: 'Rye bread', qty: 2 }, build: [{ ing: 'Ham', qty: 3, unit: 'oz' }, { ing: 'Swiss cheese', qty: 1, unit: 'slice' }, { ing: 'Mustard packet', qty: 1, unit: 'ea' }] },
    '2299': { bread: { type: 'Wheat bread', qty: 2 }, build: [{ ing: 'Peanut butter', qty: 1.5, unit: 'oz' }, { ing: 'Jelly', qty: 1, unit: 'oz' }] },
    '2366': { bread: { type: 'Kaiser roll', qty: 1 }, build: [{ ing: 'Roast beef', qty: 3, unit: 'oz' }, { ing: 'Cheddar cheese', qty: 1, unit: 'slice' }, { ing: 'Horseradish packet', qty: 1, unit: 'ea' }] },
    '2387': { bread: { type: 'White bread', qty: 2 }, build: [{ ing: 'Tuna salad', qty: 3, unit: 'oz' }, { ing: 'Lettuce', qty: 0.5, unit: 'oz' }] },
    '2404': { bread: null, build: [{ ing: 'Hummus cup', qty: 1, unit: 'ea' }, { ing: 'Pita chips bag', qty: 1, unit: 'ea' }, { ing: 'Baby carrots', qty: 2, unit: 'oz' }] },
    '2421': { bread: { type: 'GF bread', qty: 2 }, build: [{ ing: 'Peanut butter', qty: 1.5, unit: 'oz' }, { ing: 'Jelly', qty: 1, unit: 'oz' }] },
    '4837': { bread: null, build: [{ ing: 'Romaine', qty: 3, unit: 'oz' }, { ing: 'Grilled chicken', qty: 3, unit: 'oz' }, { ing: 'Parmesan', qty: 0.5, unit: 'oz' }, { ing: 'Caesar dressing cup', qty: 1, unit: 'ea' }, { ing: 'Croutons bag', qty: 1, unit: 'ea' }] },
    '6063': { bread: { type: 'Multigrain bread', qty: 2 }, build: [{ ing: 'Hummus', qty: 2, unit: 'oz' }, { ing: 'Cucumber', qty: 3, unit: 'slice' }, { ing: 'Roasted peppers', qty: 1, unit: 'oz' }, { ing: 'Spring mix', qty: 0.5, unit: 'oz' }] },
    '7523': { bread: { type: 'Focaccia', qty: 1 }, build: [{ ing: 'Italian meats', qty: 3, unit: 'oz' }, { ing: 'Provolone', qty: 1, unit: 'slice' }] },
    '8009': { bread: { type: 'GF bread', qty: 2 }, build: [{ ing: 'Turkey', qty: 3, unit: 'oz' }, { ing: 'Cheddar cheese', qty: 1, unit: 'slice' }, { ing: 'Mayo packet', qty: 1, unit: 'ea' }] },
    '8285': { bread: { type: 'Flour tortilla', qty: 1 }, build: [{ ing: 'Hummus', qty: 2, unit: 'oz' }, { ing: 'Spring mix', qty: 1, unit: 'oz' }, { ing: 'Cucumber', qty: 3, unit: 'slice' }, { ing: 'Roasted peppers', qty: 1, unit: 'oz' }] },
    '8371': { bread: null, build: [{ ing: 'Romaine', qty: 4, unit: 'oz' }, { ing: 'Grilled chicken', qty: 3, unit: 'oz' }, { ing: 'Parmesan', qty: 0.5, unit: 'oz' }, { ing: 'Caesar dressing cup', qty: 1, unit: 'ea' }] },
    '8372': { bread: null, build: [{ ing: 'Spring mix', qty: 4, unit: 'oz' }, { ing: 'Cherry tomato', qty: 1, unit: 'oz' }, { ing: 'Cucumber', qty: 3, unit: 'slice' }, { ing: 'Dressing cup', qty: 1, unit: 'ea' }] },
    '8637': { bread: null, build: [{ ing: 'Mixed cut fruit', qty: 8, unit: 'oz' }] },
    '9111': { bread: null, build: [{ ing: 'Little Leaf lettuce', qty: 3, unit: 'oz' }, { ing: 'Berries', qty: 1.5, unit: 'oz' }, { ing: 'Pecans', qty: 0.5, unit: 'oz' }, { ing: 'Dressing cup', qty: 1, unit: 'ea' }] },
    '9113': { bread: { type: 'Sub roll', qty: 1 }, build: [{ ing: 'Italian meats', qty: 4, unit: 'oz' }, { ing: 'Provolone', qty: 1, unit: 'slice' }, { ing: 'Lettuce', qty: 0.5, unit: 'oz' }, { ing: 'Italian dressing packet', qty: 1, unit: 'ea' }] },
    '9212': { bread: null, build: [{ ing: 'Romaine', qty: 3, unit: 'oz' }, { ing: 'Grilled chicken', qty: 2, unit: 'oz' }, { ing: 'Bacon', qty: 0.5, unit: 'oz' }, { ing: 'Egg', qty: 1, unit: 'ea' }, { ing: 'Blue cheese', qty: 0.5, unit: 'oz' }, { ing: 'Dressing cup', qty: 1, unit: 'ea' }] },
    '9221': { bread: { type: 'Ciabatta roll', qty: 1 }, build: [{ ing: 'Grilled chicken', qty: 3, unit: 'oz' }, { ing: 'Fresh mozzarella', qty: 1, unit: 'oz' }, { ing: 'Pesto', qty: 0.5, unit: 'oz' }, { ing: 'Roasted peppers', qty: 1, unit: 'oz' }] },
    '9230': { bread: { type: 'Croissant', qty: 1 }, build: [{ ing: 'Turkey', qty: 3, unit: 'oz' }, { ing: 'Pesto', qty: 0.5, unit: 'oz' }, { ing: 'Provolone', qty: 1, unit: 'slice' }] },
    '9241': { bread: { type: 'Flour tortilla', qty: 1 }, build: [{ ing: 'Buffalo chicken', qty: 3, unit: 'oz' }, { ing: 'Romaine', qty: 1, unit: 'oz' }, { ing: 'Cheddar cheese', qty: 1, unit: 'slice' }, { ing: 'Ranch cup', qty: 1, unit: 'ea' }] },
    '9255': { bread: { type: 'Flour tortilla', qty: 1 }, build: [{ ing: 'Buffalo chicken', qty: 3, unit: 'oz' }, { ing: 'Romaine', qty: 1, unit: 'oz' }, { ing: 'Cheddar cheese', qty: 1, unit: 'slice' }, { ing: 'Ranch cup', qty: 1, unit: 'ea' }] },
    '9266': { bread: null, build: [{ ing: 'Mixed cut fruit', qty: 12, unit: 'oz' }] },
    '9268': { bread: { type: 'Flour tortilla', qty: 1 }, build: [{ ing: 'Grilled chicken', qty: 3, unit: 'oz' }, { ing: 'Romaine', qty: 2, unit: 'oz' }, { ing: 'Parmesan', qty: 0.5, unit: 'oz' }, { ing: 'Caesar dressing cup', qty: 1, unit: 'ea' }] }
  };

  function fmtQty(q) { return Number.isInteger(q) ? String(q) : String(Math.round(q * 100) / 100); }

  function unmappedNote(list) {
    return '<p class="cpk-warn">// ' + list.length + ' item' + (list.length === 1 ? '' : 's') +
      ' with no recipe yet — add to RECIPES in cpk.js: ' +
      list.map(i => esc(i.item) + ' ' + esc(i.name)).join(' &middot; ') + '</p>';
  }

  // Bread to pull/defrost, summed across the whole make list by bread type.
  function breadPlan(rows) {
    const list = makeList(rows);
    const bread = {}, unmapped = [];
    list.forEach(it => {
      const r = RECIPES[it.item];
      if (!r) { unmapped.push(it); return; }
      if (!r.bread) return; // salad / fruit / snack — no bread
      const b = r.bread;
      if (!bread[b.type]) bread[b.type] = { type: b.type, qty: 0, items: 0 };
      bread[b.type].qty += b.qty * it.qty;
      bread[b.type].items += 1;
    });
    return { bread: Object.values(bread).filter(b => b.qty > 0).sort((a, b) => b.qty - a.qty), unmapped };
  }

  function renderBread(rows) {
    const p = breadPlan(rows);
    if (!p.bread.length) {
      return '<p class="cpk-empty">// No bread-based items in this order.</p>' + (p.unmapped.length ? unmappedNote(p.unmapped) : '');
    }
    let total = 0;
    let h = '<table class="cpk-table"><thead><tr><th>Bread / base</th>' +
      '<th class="num">Pieces to pull</th><th class="num">Items</th></tr></thead><tbody>';
    p.bread.forEach(b => {
      total += b.qty;
      h += `<tr><td>${esc(b.type)}</td><td class="num strong">${b.qty}</td><td class="num">${b.items}</td></tr>`;
    });
    h += `</tbody><tfoot><tr><td>TOTAL PIECES</td><td class="num strong">${total}</td><td></td></tr></tfoot></table>`;
    if (p.unmapped.length) h += unmappedNote(p.unmapped);
    h += '<p class="cpk-hint">Pieces = slices / rolls / wraps to defrost (a 2-slice sandwich counts 2). Edit bread per item in cpk.js.</p>';
    return h;
  }

  // Raw-ingredient BOM: explode the make list through each item's recipe,
  // summing by ingredient + unit.
  function ingredientPlan(rows) {
    const list = makeList(rows);
    const agg = {}, unmapped = [];
    list.forEach(it => {
      const r = RECIPES[it.item];
      if (!r) { unmapped.push(it); return; }
      (r.build || []).forEach(c => {
        const k = c.ing + '|' + c.unit;
        if (!agg[k]) agg[k] = { ing: c.ing, unit: c.unit, qty: 0 };
        agg[k].qty += c.qty * it.qty;
      });
    });
    return {
      items: Object.values(agg).filter(x => x.qty > 0).sort((a, b) => a.ing.localeCompare(b.ing) || a.unit.localeCompare(b.unit)),
      unmapped
    };
  }

  function renderIngredients(rows) {
    const p = ingredientPlan(rows);
    if (!p.items.length) {
      return '<p class="cpk-empty">// No recipes matched this order.</p>' + (p.unmapped.length ? unmappedNote(p.unmapped) : '');
    }
    let h = '<table class="cpk-table"><thead><tr><th>Ingredient</th>' +
      '<th class="num">Total</th><th>Unit</th></tr></thead><tbody>';
    p.items.forEach(i => {
      let conv = '';
      if (i.unit === 'oz' && i.qty >= 16) conv = ` <span class="cpk-conv">(${fmtQty(Math.round(i.qty / 16 * 100) / 100)} lb)</span>`;
      h += `<tr><td>${esc(i.ing)}${conv}</td><td class="num strong">${fmtQty(i.qty)}</td><td>${esc(i.unit)}</td></tr>`;
    });
    h += '</tbody></table>';
    if (p.unmapped.length) h += unmappedNote(p.unmapped);
    h += '<p class="cpk-hint">Quantities exploded from per-item recipes (BOM) in cpk.js — starter values, edit to match spec.</p>';
    return h;
  }

  let data = { rows: [], skipped: [] };
  let tab = 'make';

  function render() {
    const out = $('cpk-output');
    if (!data.rows.length) { out.innerHTML = '<p class="cpk-empty">// Paste an order report above and hit GENERATE.</p>'; return; }
    out.innerHTML = tab === 'make' ? renderMakeList(data.rows)
      : tab === 'pivot' ? renderPivot(data.rows)
      : tab === 'routing' ? renderRouting(data.rows)
      : tab === 'bread' ? renderBread(data.rows)
      : renderIngredients(data.rows);
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

  // Read a dropped/picked file into the textarea and parse it. Appends the
  // file name to the meta line so it's clear which file is loaded.
  function loadFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      $('cpk-input').value = String(reader.result || '');
      generate();
      $('cpk-meta').textContent += ' · ' + file.name;
    };
    reader.onerror = () => { $('cpk-meta').textContent = '// could not read ' + file.name; };
    reader.readAsText(file);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('cpk-input')) return;
    const input = $('cpk-input');
    input.value = SAMPLE;
    $('cpk-gen').addEventListener('click', generate);
    $('cpk-sample').addEventListener('click', () => { input.value = SAMPLE; generate(); });
    $('cpk-clear').addEventListener('click', () => { input.value = ''; data = { rows: [], skipped: [] }; $('cpk-meta').textContent = ''; render(); });

    // File picker
    const fileEl = $('cpk-file');
    if (fileEl) fileEl.addEventListener('change', e => {
      loadFile(e.target.files && e.target.files[0]);
      e.target.value = ''; // allow re-picking the same file
    });

    // Drag & drop a file onto the textarea
    input.addEventListener('dragover', e => { e.preventDefault(); input.classList.add('cpk-drag'); });
    input.addEventListener('dragleave', () => input.classList.remove('cpk-drag'));
    input.addEventListener('drop', e => {
      if (!e.dataTransfer || !e.dataTransfer.files.length) return; // let normal text drops through
      e.preventDefault(); input.classList.remove('cpk-drag');
      loadFile(e.dataTransfer.files[0]);
    });

    document.querySelectorAll('.cpk-tab').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
    generate(); // run once on the preloaded sample
  });
})();
