/* ============================================================
 * CPK Production Planner: client-side, in-browser.
 * Paste / upload the daily Orders Recap; the tool reproduces the
 * Worcester central-kitchen workbook's production sheets:
 *   DC G&G · Retail G&G · Fruit · PREP · Packout · Stickers
 * plus two sheets the workbook does not have:
 *   AUDIT (traces every ordered unit to the sheet that counts it)
 *   MENU  (add or drop items in the browser, saved locally)
 * Logic mirrors the manager's Excel:
 *   - DC needed      = qty ordered at location 01 (Worcester DC)
 *   - Retail needed  = total ordered minus ALL dining commons (01-04)
 *   - Triple stacks  = ordered x2 packages, x1.5 sandwiches/package
 * Quantities (bread ratios, prep factors, fruit weights, tray sizes)
 * are transcribed from the workbook; edit the CONFIG block to tune.
 * 100% in-browser: nothing is uploaded anywhere.
 * ============================================================ */
(function () {
  const $ = id => document.getElementById(id);

  // ---- Sample (real Orders Recap format) so all sheets populate on load ----
  const SAMPLE = [
    // [date, item, name, locCode, locName, qty, unit]
    ['10/15/25', '1004', 'CPK TURKEY ON KAISER', '01', 'Worcester DC', 60, 'EACH'],
    ['10/15/25', '2291', 'CPK HAM ON RYE', '01', 'Worcester DC', 50, 'EACH'],
    ['10/15/25', '2299', 'CPK PEANUT BUTTER & JELLY', '01', 'Worcester DC', 40, 'EACH'],
    ['10/15/25', '2366', 'CPK ROAST BEEF ON KAISER', '01', 'Worcester DC', 30, 'EACH'],
    ['10/15/25', '2387', 'CPK TUNA SALAD ON WHITE', '01', 'Worcester DC', 30, 'EACH'],
    ['10/15/25', '2387', 'CPK TUNA SALAD ON WHITE', '23', 'Harvest', 8, 'EACH'],
    ['10/15/25', '2387', 'CPK TUNA SALAD ON WHITE', '42', 'LIBRARY CAFE', 4, 'EACH'],
    ['10/15/25', '2404', 'CPK HUMMUS PITA CHIPS CARROTS', '01', 'Worcester DC', 50, 'EACH'],
    ['10/15/25', '2421', 'CPK PEANUT BUTTER AND JELLY GF', '01', 'Worcester DC', 30, 'EACH'],
    ['10/15/25', '2421', 'CPK PEANUT BUTTER AND JELLY GF', '23', 'Harvest', 2, 'EACH'],
    ['10/15/25', '6063', 'CPK SAND HUMMUS VEG VEGAN', '01', 'Worcester DC', 30, 'EACH'],
    ['10/15/25', '6063', 'CPK SAND HUMMUS VEG VEGAN', '23', 'Harvest', 4, 'EACH'],
    ['10/15/25', '8285', 'CPK WRAP HUMMUS VEGGIE VEGAN', '01', 'Worcester DC', 40, 'EACH'],
    ['10/15/25', '8371', 'CPK SALAD CHICKEN CAESAR DC', '01', 'Worcester DC', 120, 'EACH'],
    ['10/15/25', '8372', 'CPK SALAD GREEN TOSSED DC', '01', 'Worcester DC', 100, 'EACH'],
    ['10/15/25', '8637', 'FRUIT CUP MIXED CPK', '01', 'Worcester DC', 160, 'EACH'],
    ['10/15/25', '9241', 'CPK WRAP CHICKEN BUFFALO  DC', '01', 'Worcester DC', 140, 'EACH'],
    ['10/15/25', '9268', 'CPK CHICKEN WRAP CAESAR GRAB', '01', 'Worcester DC', 120, 'EACH'],
    ['10/15/25', '9268', 'CPK CHICKEN WRAP CAESAR GRAB', '23', 'Harvest', 15, 'EACH'],
    ['10/15/25', '8009', 'CPK SANDWICH GF TURKEY & CHEDD', '23', 'Harvest', 6, 'EACH'],
    ['10/15/25', '8009', 'CPK SANDWICH GF TURKEY & CHEDD', '42', 'LIBRARY CAFE', 2, 'EACH'],
    ['10/15/25', '9230', 'CPK PEOPLES TURKEY PESTO CROIS', '42', 'LIBRARY CAFE', 3, 'EACH'],
    ['10/15/25', '2226', 'CPK CROISSANT TURKEY', '13', 'Worcester Cafe', 2, 'EACH'],
    ['10/15/25', '9221', 'CPK SANDWICH CHICKEN & MOZZARE', '23', 'Harvest', 15, 'EACH'],
    ['10/15/25', '9255', 'CPK WRAP CHICKEN BUFFALO', '23', 'Harvest', 15, 'EACH'],
    ['10/15/25', '9255', 'CPK WRAP CHICKEN BUFFALO', '42', 'LIBRARY CAFE', 5, 'EACH'],
    ['10/15/25', '4837', 'CPK PEOPLES CHICKEN CAESAR', '23', 'Harvest', 18, 'EACH'],
    ['10/15/25', '4837', 'CPK PEOPLES CHICKEN CAESAR', '42', 'LIBRARY CAFE', 5, 'EACH'],
    ['10/15/25', '9111', 'SALAD LITTLE LEAF & BERRY PECA', '13', 'Worcester Cafe', 2, 'EACH'],
    ['10/15/25', '9113', 'ITALIAN SANDWICH NEW ORLEANS C', '08', 'Whitmore Snack Bar (41400-3)', 4, 'EACH'],
    ['10/15/25', '0301', 'SALAD LITTLE LEAF & DRISCOLL B', '23', 'Harvest', 2, 'EACH'],
    ['10/15/25', '9266', 'CPK FRUIT CUP MIXED CUT 12oz', '23', 'Harvest', 24, 'EACH'],
    ['10/15/25', '9266', 'CPK FRUIT CUP MIXED CUT 12oz', '42', 'LIBRARY CAFE', 16, 'EACH'],
    ['10/15/25', '0253', 'CPK TRIPLE STACK PB&J', '23', 'Harvest', 4, '2 eac'],
    ['10/15/25', '0253', 'CPK TRIPLE STACK PB&J', '42', 'LIBRARY CAFE', 1, '2 eac'],
    ['10/15/25', '0279', 'CPK TRIPLE STACK TURKEY DC', '23', 'Harvest', 8, '2 eac'],
    ['10/15/25', '0279', 'CPK TRIPLE STACK TURKEY DC', '42', 'LIBRARY CAFE', 2, '2 eac'],
    ['10/15/25', '0283', 'CPK TRIPLE STACK HAM', '23', 'Harvest', 4, '2 eac'],
    ['10/15/25', '0283', 'CPK TRIPLE STACK HAM', '42', 'LIBRARY CAFE', 2, '2 eac']
  ].map(r => `${r[0]}     ${r[1]}     ${r[2]}     ${r[3]}, ${r[4]}        ${r[5]}      ${r[6]}`).join('\n') + '\nEND OF LIST';

  // ============================================================
  //  PARSER: reads the Orders Recap into {item, locCode, qty}
  // ============================================================
  // date  item#  name(multi-word)  loc#, loc name  DUE-AMOUNT  [pack] UNIT  [total]
  const LINE = /^\s*(\d{1,2}\/\d{1,2}\/\d{2,4})\s+(\d[\d.]*)\s+(.+?)\s+(\d{1,3})\s*,\s*(.+?)\s{2,}(\d+)\s+(?:(\d+)\s+)?([A-Za-z]+)/;
  const DATE_LEAD = /^\s*\d{1,2}\/\d{1,2}\/\d{2,4}/;

  function parse(text) {
    const rows = [], skipped = [];
    // A file may stack a history of recaps; use only the FIRST (topmost).
    // Each recap ends with an "END OF LIST" line.
    let multi = false;
    const end = text.search(/^[ \t]*END OF LIST/im);
    if (end !== -1) {
      multi = /\d{1,2}\/\d{1,2}\/\d{2,4}/.test(text.slice(end + 11));
      text = text.slice(0, end);
    }
    text.split(/\r?\n/).forEach(line => {
      if (!line.trim()) return;
      const m = line.match(LINE);
      if (!m) { if (DATE_LEAD.test(line)) skipped.push(line.trim()); return; }
      rows.push({
        item: normItem(m[2]),
        name: m[3].trim(),
        locCode: m[4].replace(/^0+(?=\d)/, '').padStart(2, '0'), // "01".."97"
        loc: m[5].trim(),
        qty: parseInt(m[6], 10) || 0,
        pack: m[7] ? parseInt(m[7], 10) : 1,
        unit: /^EA/i.test(m[8]) ? 'EACH' : m[8].toUpperCase()
      });
    });
    return { rows, skipped, multi };
  }

  // Item codes are matched as canonical (no leading zeros): "0253" -> "253".
  function normItem(s) { return String(s).replace(/^0+(?=\d)/, ''); }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, c =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }
  const roundup = (x, d) => { const p = Math.pow(10, d || 0); return Math.ceil((Number(x) || 0) * p) / p; };
  const r1 = x => Math.round((Number(x) || 0) * 10) / 10;
  const r2 = x => Math.round((Number(x) || 0) * 100) / 100;
  const fmt = x => { const n = Number(x) || 0; return Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100); };

  // ---- order index: item -> { name, total, byLoc{code:qty} } ----
  function indexOrders(rows) {
    const idx = {};
    rows.forEach(r => {
      const it = r.item;
      if (!idx[it]) idx[it] = { name: r.name, total: 0, byLoc: {} };
      idx[it].byLoc[r.locCode] = (idx[it].byLoc[r.locCode] || 0) + r.qty;
      idx[it].total += r.qty;
    });
    return idx;
  }
  const qTot = (idx, it) => (idx[normItem(it)] ? idx[normItem(it)].total : 0);
  const qLoc = (idx, it, loc) => { const e = idx[normItem(it)]; return e ? (e.byLoc[loc] || 0) : 0; };

  // The four dining commons ("DC"): Worcester 01, Franklin 02, Hampshire 03,
  // Berkshire 04. This Worcester workbook produces DC G&G for Worcester (01)
  // only and Retail G&G for the cafes, so retail excludes ALL dining commons.
  const DC_LOCS = ['01', '02', '03', '04'];

  // Build the calc context referenced by every formula below.
  function makeCtx(idx) {
    return {
      dc: it => qLoc(idx, it, '01'),                 // DC G&G = Worcester (loc 01)
      rt: it => qTot(idx, it) - DC_LOCS.reduce((s, l) => s + qLoc(idx, it, l), 0), // Retail = cafes only
      tot: it => qTot(idx, it),
      tsPkg: it => qTot(idx, it) * 2,                // triple-stack packages
      tsSand: it => qTot(idx, it) * 3,               // packages x1.5 sandwiches
      f12: qTot(idx, '9266'),
      f8: qTot(idx, '8637'),
      idx: idx
    };
  }

  // ============================================================
  //  CONFIG: mirrors "Worcester CPK Production 2026.xlsx"
  //  Validated cell-by-cell against that workbook (2026-07-11/12).
  //
  //  TO ADD OR DROP A MENU ITEM: use the MENU tab in the tool itself
  //  (saved in the browser, no code edit). The lists below are the
  //  built-in defaults. Code edits are only needed when an item also
  //  needs a bread ratio, a chicken factor, or a PREP ingredient line
  //  (those are formulas, not rows): add it to the matching *_BREAD /
  //  *_CHICKEN / PREP list.
  //  Item numbers are canonical (no leading zeros): "0253" -> "253".
  //
  //  Known gaps vs the Excel are documented in
  //  04-Project-Sources/cpk/VALIDATION-2026.md (read before "fixing" a
  //  mismatch). Deliberate coverage EXTENSIONS beyond the Excel, per
  //  the "count every order" decision (the Excel drops orders its
  //  Consolidated/Menu tables don't pre-list):
  //   - 8285 Hummus Veggie Wrap: ordered at Worcester DC, absent from
  //     the entire workbook. Added as a DC row + sticker.
  //   - 9268 Chicken Caesar Wrap ordered BY CAFES: the Excel only has
  //     9268 at loc 01 and tracks retail caesar wraps as 9257 only.
  //     Added a retail row for 9268 and included it in the retail
  //     caesar chicken / 10" wrap / grilled-chicken formulas at the
  //     same factors as 9257 (same physical wrap).
  // ============================================================
  const LOC_NAMES = {
    '01': 'Worcester DC', '02': 'Franklin DC', '03': 'Hampshire', '04': 'Berkshire DC',
    '07': 'Chicken & Co', '08': 'Whitmore', '13': 'Worcester Cafe', '14': 'CC Grill',
    '15': 'Furcolo', '18': 'U Club', '20': 'CC Deli', '21': 'Rec Center', '23': 'Harvest',
    '30': 'ISB', '31': 'Herter', '34': 'Catering', '40': "CC People's", '41': 'CC Star Ginger',
    '42': 'Library', '44': 'Morrill', '45': 'Roots', '46': 'Hamp Market', '51': 'CC Peets',
    '52': 'Marcus', '53': 'CC Greenfield', '54': 'OIT', '66': 'Argo', '70': 'Snacks OF',
    '72': 'Newman', '78': 'Terrace', '89': 'Mullins', '92': 'Post & Bean', '96': 'Special Events',
    '97': 'ISOM'
  };

  // ---- DC Grab & Go ----  needed = ctx.dc(item)
  const DC_ROWS = [
    { sec: 'GLUTEN FREE' },
    { label: 'Gluten Free Turkey Sandwich', recipe: 76250, item: '2420' },
    { label: 'Gluten Free PB & J', recipe: 146249, item: '2421' },
    { sec: 'SANDWICHES' },
    { label: 'Turkey Kaiser', recipe: 155008, item: '1004' },
    { label: 'Ham on Rye', recipe: 86250, item: '2291' },
    { label: 'PB & J on WW', recipe: 146250, item: '2299' },
    { label: 'Italian Cold Cut Grinder', recipe: 86251, item: '2352' },
    { label: 'Roast Beef on Kaiser', recipe: 66250, item: '2366' },
    { label: 'Tuna Salad on White', recipe: 156250, item: '2387' },
    { label: 'Hummus & Vegetable Sandwich', recipe: 151652, item: '6063' },
    { sec: 'SALADS' },
    { label: 'Hummus & Pita Chips', recipe: 155600, item: '2404' },
    { label: 'Grab & Go Salad Chicken Caesar', recipe: 76566, item: '8371' },
    { label: 'Grab & Go Salad Tossed', recipe: 186565, item: '8372' },
    { sec: 'WRAPS' },
    { label: 'Chicken Caesar Wrap', recipe: 76214, item: '9268' },
    { label: 'Buffalo Chicken Wrap', recipe: 76213, item: '9241' },
    // Not in the Excel at all; cafeteria orders it, so the tool counts it.
    { label: 'Hummus Veggie Wrap (vegan)', recipe: '', item: '8285' }
  ];
  const DC_BREAD = [
    { label: '10" Tomato Wraps (PACKS)', f: c => roundup(c.dc('9241') / 12) },
    { label: '10" White Wraps (PACKS)', f: c => roundup(c.dc('9268') / 12) },
    { label: 'GF Rolls (PACKS)', f: c => roundup(c.dc('2420') / 4) },
    { label: 'GF WW Bread', f: c => roundup(c.dc('2421') / 6) },
    { label: 'Kaiser Roll (PACKS)', f: c => roundup((c.dc('1004') + c.dc('2366')) / 6) },
    { label: 'White Bread (LOAF)', f: c => roundup(c.dc('2387') / 8) },
    { label: 'Rye Bread (LOAF)', f: c => roundup(c.dc('2291') / 15) },
    { label: 'Whole Wheat (LOAF)', f: c => roundup(c.dc('2299') / 8) },
    { label: 'Grinder Rolls (PACKS)', f: c => roundup(c.dc('2352') / 6) }
  ];
  const DC_CHICKEN = [
    { label: 'Buffalo Chicken (DC Total)', unit: 'LBS', f: c => roundup(2 * c.dc('9241') / 8) },
    { label: 'Chicken Caesar (DC Total)', unit: 'LBS', f: c => roundup(2 * c.dc('9268') / 16) }
  ];

  // ---- Retail Grab & Go ----  needed = ctx.rt(item)
  const RT_ROWS = [
    { sec: 'SANDWICHES' },
    { label: 'Turkey and Cheddar GF', recipe: 71418, item: '8009' },
    { label: 'Peoples Croissant Turkey Pesto', recipe: 71504, item: '9230' },
    { label: 'Turkey Croissant', recipe: 71419, item: '2226' },
    { label: 'Gluten Free PB & J', recipe: 146249, item: '2421' },
    { label: 'Tuna Salad on White', recipe: 156250, item: '2387' },
    { label: 'Italian Focaccia', recipe: 76207, item: '7523' },
    { label: 'Chicken Mozzarella Multigrain', recipe: 71629, item: '9221' },
    { label: 'Hummus & Vegetable Sandwich', recipe: 151652, item: '6063' },
    { sec: 'WRAPS' },
    { label: 'Buffalo Chicken Wrap', recipe: 76211, item: '9255' },
    { label: 'Chicken Caesar Wrap', recipe: 76212, item: '9257' },
    // Cafes also order the DC pack 9268; the Excel drops those orders.
    { label: 'Chicken Caesar Wrap (Grab 9268)', recipe: 76214, item: '9268' },
    { sec: 'SALADS' },
    { label: 'Peoples Salad Chicken Caesar', recipe: 71571, item: '4837' },
    { label: 'Salad Little Leaf & Berry Pecan', recipe: 187600, item: '9111' },
    { label: 'Italian Sandwich New Orleans', recipe: 86002, item: '9113' },
    { label: 'Driscol Berry Salad', recipe: 181106, item: '301' },
    { label: 'Cobb Salad', recipe: 186203, item: '9212' }
  ];
  const RT_TRIPLE = [
    { label: 'Triple Stack PB & J', recipe: 141300, item: '253' },
    { label: 'Triple Stack Turkey & Swiss', recipe: 71376, item: '279' },
    { label: 'Triple Stack Ham & Swiss', recipe: 81181, item: '283' }
  ];
  const RT_BREAD = [
    { label: 'Gluten Free Rolls (PACKS)', f: c => roundup(c.rt('8009') / 4) },
    { label: 'GF WW Bread', f: c => roundup(c.rt('2421') / 6) },
    { label: 'Multigrain Loaves (LOAF)', f: c => roundup(c.rt('9221') / 8) },
    { label: '10" Wraps (PACKS)', f: c => roundup((c.rt('9257') + c.rt('9268')) / 12) },
    { label: 'Tomato Wraps (PACKS)', f: c => roundup(c.rt('9255') / 10) }
  ];
  const RT_TRIPLE_BREAD = [
    { label: 'Wheat Bread (LOAF)', f: c => roundup((c.tsSand('253') + c.tsSand('279')) / 7) },
    { label: 'Rye Bread (LOAF)', f: c => roundup(c.tsSand('283') / 14) }
  ];
  const RT_CHICKEN = [
    { label: 'Buffalo Chicken (Retail Total)', unit: 'LBS', f: c => roundup(3 * c.rt('9255') / 12) },
    { label: 'Chicken Caesar (Retail Total)', unit: 'LBS', f: c => roundup(3 * (c.rt('9257') + c.rt('9268')) / 12) }
  ];

  // ---- Fruit ----
  const FRUIT_CUPS = [
    { label: 'Mixed Fruit Cup (12oz)', recipe: 243004, item: '9266' },
    { label: 'Grab & Go 8 oz Fruit Cup (DC)', recipe: 243008, item: '8637' }
  ];
  const FRUIT_BULK = [
    { label: 'Pineapple', note: '1 CS ≈ 9 lbs', f: c => r1(0.19 * c.f12 + 0.12666 * c.f8) },
    { label: 'Honeydew', note: '1 CS ≈ 11 lbs', f: c => r1(0.19 * c.f12 + 0.12666 * c.f8) },
    { label: 'Cantaloupe', note: '1 CS ≈ 17 lbs', f: c => r1(0.19 * c.f12 + 0.12666 * c.f8) },
    { label: 'Grapes', note: '', f: c => roundup(0.0625 * c.f12 + 0.04166 * c.f8) },
    { label: 'Strawberries', note: '1 CS ≈ 6 lbs', f: c => roundup(0.125 * c.f12 + 0.0833 * c.f8) }
  ];

  // ---- PREP ----
  // Items PREP counts straight off the recap via c.tot() (raw slicing goods).
  const PREP_TOT_ITEMS = ['4735', '4926', '4738', '4740', '7173'];
  const PREP = [
    { sec: 'SLICING' },
    { name: 'Sliced Ham', unit: 'lbs', f: c => roundup(c.tot('4735') + c.dc('2291') * 0.2 + c.dc('2352') * 0.1 + c.rt('7523') * 0.1 + c.tsSand('283') * 0.2) },
    { name: 'Sliced Turkey', unit: 'lbs', f: c => roundup(c.tot('4926') + c.dc('2420') * 0.2 + c.dc('1004') * 0.2 + c.rt('8009') * 0.2 + c.rt('2226') * 0.2 + c.tsSand('279') * 0.2) },
    { name: 'Sliced Roast Beef', unit: 'lbs', f: c => roundup(c.dc('2366') * 0.2) },
    { name: 'Sliced Provolone', unit: 'lbs', f: c => roundup(c.tot('4738') + c.rt('7523') * 0.1 + c.dc('1004') * 0.1 + c.dc('2352') * 0.1) },
    { name: 'Sliced Cheddar', unit: 'lbs', f: c => roundup(c.tot('4740') + c.dc('2420') * 0.1 + c.rt('8009') * 0.1 + c.rt('2226') * 0.1) },
    { name: 'Sliced Swiss', unit: 'lbs', f: c => roundup(c.tot('7173') + c.tsSand('279') * 0.1 + c.tsSand('283') * 0.1 + c.dc('2291') * 0.1) },
    { sec: 'COOKING' },
    { name: 'Boiled Eggs', unit: 'each', f: c => c.rt('9212') },
    { name: 'Grilled Chicken', unit: 'lbs', f: c => r2(c.dc('8371') * 0.2 + c.dc('9268') * 0.2 + c.dc('9241') * 0.2 + c.rt('9255') * 0.25 + (c.rt('9257') + c.rt('9268')) * 0.25 + c.rt('9212') * 0.15 + c.rt('9221') * 0.25) },
    { name: 'Spiced Walnuts', unit: 'lbs', f: c => roundup(c.rt('301') * 0.1) },
    { sec: 'VEGETABLES' },
    { name: 'Carrot Sticks', unit: 'lbs', f: c => r2(c.dc('2404') * 0.3) },
    { name: 'Cucumbers', unit: 'lbs', f: c => r2(c.dc('8372') * 0.1) },
    { name: 'Red Onions', unit: 'lbs', f: c => r2(c.dc('2352') * 0.1 + c.dc('8372') * 0.1 + c.rt('301') * 0.1) },
    { name: 'Peppers', unit: 'lbs', f: c => r2(c.dc('2352') * 0.1) },
    { name: 'Sliced Tomatoes', unit: 'lbs', f: c => r2((c.rt('8009') + c.rt('7523') + c.rt('9221') + c.rt('2226') + c.rt('9255')) * 0.15) },
    { sec: 'SALADS' },
    { name: 'Tuna Salad', unit: 'lbs', f: c => roundup((c.dc('2387') + c.rt('2387')) * 0.3) },
    { sec: 'AIOLIS & DRESSINGS' },
    { name: 'Cranberry Aioli', unit: 'gal', f: c => roundup(c.tsSand('279') / 128, 1) },
    { name: 'Sundried Tomato Aioli', unit: 'gal', f: c => roundup(c.rt('8009') / 128, 1) },
    { name: 'Berry Vinaigrette', unit: 'gal', f: c => roundup(c.rt('301') / 64, 1) }
  ];

  // ---- Packout (location x item grid) ----
  // g: tray group; salad 1/16, sand 1/20, wrap 1/24, fruit 1/30
  const PK_COLS = [
    { item: '253', label: '3 PBJ', g: 'sand', tri: true },
    { item: '279', label: '3 Turk', g: 'sand', tri: true },
    { item: '283', label: '3 Ham', g: 'sand', tri: true },
    { item: '301', label: 'Berry Sld', g: 'salad' },
    { item: '2226', label: 'Croissant', g: 'sand' },
    { item: '2373', label: 'Arugula', g: 'salad' },
    { item: '2421', label: 'GF PBJ', g: 'sand' },
    { item: '2387', label: 'Tuna', g: 'sand' },
    { item: '4837', label: 'Caesar Sld', g: 'salad' },
    { item: '7523', label: 'Italian', g: 'sand' },
    { item: '8009', label: 'GF Turk', g: 'sand' },
    { item: '6063', label: 'Veggie', g: 'salad' },
    { item: '9221', label: 'Chk Mozz', g: 'sand' },
    { item: '9230', label: 'Turk Pesto', g: 'sand' },
    { item: '9111', label: 'Little Leaf', g: 'salad' },
    { item: '9113', label: 'Italian NewO', g: 'sand' },
    { item: '9255', label: 'Buff W', g: 'wrap' },
    { item: '9257', label: 'Caesar W', g: 'wrap' },
    { item: '9268', label: 'Caesar GRB', g: 'wrap' },
    { item: '9266', label: 'Fruit', g: 'fruit' }
  ];
  const PK_LOCS = ['89', '34', '97', '15', '46', '30', '42', '44', '72', '40', '23', '31',
    '51', '92', '54', '52', '45', '70', '08', '13', '21', '78', '96'];
  const TRAY_DIV = { salad: 16, sand: 20, wrap: 24, fruit: 30 };

  // ---- Stickers ----
  // src: which count the label prints for.
  //   dc = Worcester DC qty · rt = cafes qty · pkg = triple packages · tot = all locations
  const STK_DC = [
    { label: 'Gluten Free Turkey Sandwich', src: 'dc', item: '2420' },
    { label: 'Gluten Free PB & J', src: 'dc', item: '2421' },
    { label: 'Turkey Kaiser', src: 'dc', item: '1004' },
    { label: 'Ham on Rye', src: 'dc', item: '2291' },
    { label: 'PB & J on WW', src: 'dc', item: '2299' },
    { label: 'Roast Beef on Kaiser', src: 'dc', item: '2366' },
    { label: 'Tuna on White', src: 'dc', item: '2387' },
    { label: 'Hummus & Vegetable Sandwich', src: 'dc', item: '6063' },
    { label: 'Hummus & Pita Chips', src: 'dc', item: '2404' },
    { label: 'Grab & Go Salad Chicken Caesar', src: 'dc', item: '8371' },
    { label: 'Grab & Go Salad Tossed', src: 'dc', item: '8372' },
    { label: 'Chicken Caesar Wrap', src: 'dc', item: '9268' },
    { label: 'Buffalo Chicken Wrap', src: 'dc', item: '9241' },
    { label: 'Hummus Veggie Wrap (vegan)', src: 'dc', item: '8285' },
    { label: 'Fruit Cup (8oz)', src: 'tot', item: '8637' }
  ];
  const STK_RETAIL = [
    { label: 'Buffalo Chicken Wrap', src: 'rt', item: '9255' },
    { label: 'Chicken Caesar Salad', src: 'rt', item: '4837' },
    { label: 'Chicken Caesar Wrap (Grab 9268)', src: 'rt', item: '9268' },
    { label: 'Chicken, Pesto & Mozzarella Sandwich', src: 'rt', item: '9221' },
    { label: 'Driscol Berry Salad w/ Walnuts + Feta', src: 'rt', item: '301' },
    { label: 'Gluten Free PB & J Sandwich', src: 'rt', item: '2421' },
    { label: 'Ham + Swiss Triple Stack', src: 'pkg', item: '283' },
    { label: 'Hummus Vegetable on Whole Wheat', src: 'rt', item: '6063' },
    { label: 'Italian Pesto Grinder on Semolina Focaccia', src: 'rt', item: '7523' },
    { label: 'Mixed Fruit Cup', src: 'tot', item: '9266' },
    { label: 'Triple Stack PB + J', src: 'pkg', item: '253' },
    { label: 'Tuna on White', src: 'rt', item: '2387' },
    { label: 'Turkey & Cheddar on GF Roll', src: 'rt', item: '8009' },
    { label: 'Turkey on Multigrain Croissant', src: 'rt', item: '2226' },
    { label: 'Turkey Pesto Croissant', src: 'rt', item: '9230' },
    { label: 'Turkey, Swiss + Cranberry Aioli Triple', src: 'pkg', item: '279' },
    { label: 'Salad Little Leaf & Berry Pecan', src: 'rt', item: '9111' },
    { label: 'Italian Sandwich New Orleans', src: 'rt', item: '9113' }
  ];
  const stkVal = (c, s) =>
    s.src === 'dc' ? c.dc(s.item) :
    s.src === 'rt' ? c.rt(s.item) :
    s.src === 'pkg' ? c.tsPkg(s.item) : c.tot(s.item);

  // ============================================================
  //  MENU OVERRIDES: browser-local add/drop, no code edit needed.
  //  localStorage cpk_menu_v1 =
  //    { added: [{sheet:'dc'|'retail', label, recipe, item, pk, pkLabel, sticker}],
  //      hidden: ['2352', ...] }   (hidden is by item number, hides the
  //      item everywhere: sheet row, packout column, sticker)
  // ============================================================
  const MENU_KEY = 'cpk_menu_v1';
  function loadMenu() {
    try {
      const m = JSON.parse(localStorage.getItem(MENU_KEY)) || {};
      return { added: Array.isArray(m.added) ? m.added : [], hidden: Array.isArray(m.hidden) ? m.hidden : [] };
    } catch (e) { return { added: [], hidden: [] }; }
  }
  function saveMenu(m) {
    try { localStorage.setItem(MENU_KEY, JSON.stringify(m)); } catch (e) { }
  }

  // Effective config = defaults minus hidden items plus custom items.
  function effective() {
    const m = loadMenu();
    const hid = new Set(m.hidden);
    const alive = r => r.sec || !hid.has(r.item);
    const customRows = sheet => m.added.filter(a => a.sheet === sheet && !hid.has(a.item))
      .map(a => ({ label: a.label, recipe: a.recipe || '', item: a.item, custom: true }));
    const withCustom = (rows, sheet) => {
      const extra = customRows(sheet);
      return extra.length ? rows.concat([{ sec: 'ADDED ITEMS' }], extra) : rows;
    };
    const pk = PK_COLS.filter(c => !hid.has(c.item)).concat(
      m.added.filter(a => a.pk && !hid.has(a.item) && !PK_COLS.some(c => c.item === a.item))
        .map(a => ({ item: a.item, label: a.pkLabel || a.label.slice(0, 10), g: a.pk })));
    const stk = (list, sheet, src) => list.filter(s => !hid.has(s.item)).concat(
      m.added.filter(a => a.sheet === sheet && a.sticker && !hid.has(a.item))
        .map(a => ({ label: a.sticker, src: src, item: a.item })));
    return {
      dcRows: withCustom(DC_ROWS.filter(alive), 'dc'),
      rtRows: withCustom(RT_ROWS.filter(alive), 'retail'),
      triple: RT_TRIPLE.filter(alive),
      pkCols: pk,
      stkDC: stk(STK_DC, 'dc', 'dc'),
      stkRetail: stk(STK_RETAIL, 'retail', 'rt'),
      menu: m
    };
  }

  // ============================================================
  //  RENDERERS
  // ============================================================
  function prodDate() {
    const d = new Date(); d.setDate(d.getDate() + 1);
    return (d.getMonth() + 1) + '/' + d.getDate() + '/' + d.getFullYear();
  }
  function head(title) {
    return `<div class="cpk-sheet-head"><h3 class="cpk-sheet-title">${esc(title)}</h3>` +
      `<span class="cpk-date">Production: ${prodDate()}</span></div>`;
  }
  function breadTable(rows, ctx, title) {
    let h = `<table class="cpk-table cpk-bread"><thead><tr><th>${esc(title)}</th><th class="num">Pull</th></tr></thead><tbody>`;
    rows.forEach(b => { h += `<tr><td>${esc(b.label)}</td><td class="num strong">${fmt(b.f(ctx))}</td></tr>`; });
    return h + '</tbody></table>';
  }
  function chickenTable(rows, ctx) {
    let h = '<table class="cpk-table"><thead><tr><th>Cook / Weigh before cutting</th><th class="num">Qty</th><th>Unit</th></tr></thead><tbody>';
    let tot = 0;
    rows.forEach(r => { const v = r.f(ctx); tot += v; h += `<tr><td>${esc(r.label)}</td><td class="num strong">${fmt(v)}</td><td>${esc(r.unit)}</td></tr>`; });
    return h + `<tr class="totals"><td>Total</td><td class="num strong">${fmt(tot)}</td><td>LBS</td></tr></tbody></table>`;
  }

  // Make sheet (DC / Retail): sectioned item list with NEEDED.
  function makeSheet(title, rows, needFn, ctx, opts) {
    opts = opts || {};
    let h = head(title);
    let body = '<table class="cpk-table"><thead><tr><th>Item</th><th class="num">Recipe</th>' +
      '<th class="num">Item&nbsp;#</th><th class="num">Needed</th><th>Unit</th></tr></thead><tbody>';
    let total = 0;
    rows.forEach(r => {
      if (r.sec) { body += `<tr class="cpk-secrow"><td colspan="5">${esc(r.sec)}</td></tr>`; return; }
      const need = needFn(ctx, r.item);
      total += need;
      body += `<tr><td>${esc(r.label)}</td><td class="num mono">${esc(r.recipe)}</td>` +
        `<td class="num mono">${esc(r.item)}</td><td class="num strong">${fmt(need)}</td><td>EACH</td></tr>`;
    });
    body += `<tr class="totals"><td colspan="3">TOTAL</td><td class="num strong">${fmt(total)}</td><td>EACH</td></tr></tbody></table>`;
    return h + `<div class="cpk-grid2"><div>${body}</div><div>${opts.side || ''}</div></div>`;
  }

  function renderDC(ctx, eff) {
    const side = '<div class="cpk-block-label">Bread to defrost</div>' + breadTable(DC_BREAD, ctx, 'Bread / base') +
      '<div class="cpk-block-label" style="margin-top:16px;">Chicken</div>' + chickenTable(DC_CHICKEN, ctx);
    return makeSheet('DC Grab & Go', eff.dcRows, (c, it) => c.dc(it), ctx, { side });
  }

  function renderRetail(ctx, eff) {
    const side = '<div class="cpk-block-label">Bread to defrost</div>' + breadTable(RT_BREAD, ctx, 'Bread / base') +
      '<div class="cpk-block-label" style="margin-top:16px;">Chicken</div>' + chickenTable(RT_CHICKEN, ctx);
    let h = makeSheet('Retail Grab & Go', eff.rtRows, (c, it) => c.rt(it), ctx, { side });
    // Triple stacks
    let t = '<div class="cpk-block-label" style="margin-top:20px;">Triple Stacks</div>' +
      '<table class="cpk-table"><thead><tr><th>Item</th><th class="num">Item&nbsp;#</th>' +
      '<th class="num">Ordered</th><th class="num">Packages</th><th class="num">Sandwiches</th></tr></thead><tbody>';
    let oT = 0, pT = 0, sT = 0;
    eff.triple.forEach(r => {
      const o = ctx.tot(r.item), p = o * 2, s = p * 1.5;
      oT += o; pT += p; sT += s;
      t += `<tr><td>${esc(r.label)}</td><td class="num mono">${esc(r.item)}</td>` +
        `<td class="num">${fmt(o)}</td><td class="num strong">${fmt(p)}</td><td class="num">${fmt(s)}</td></tr>`;
    });
    t += `<tr class="totals"><td colspan="2">TOTAL</td><td class="num">${fmt(oT)}</td><td class="num strong">${fmt(pT)}</td><td class="num">${fmt(sT)}</td></tr></tbody></table>` +
      '<p class="cpk-hint">1 ordered unit = 2 packages; 1 package = 1.5 sandwiches (3 halves).</p>' +
      '<div class="cpk-grid2" style="margin-top:12px;"><div>' + breadTable(RT_TRIPLE_BREAD, ctx, 'Triple-stack bread') + '</div><div></div></div>';
    return h + t;
  }

  function renderFruit(ctx) {
    let h = head('Fruit Cups');
    let cups = '<table class="cpk-table"><thead><tr><th>Item</th><th class="num">Recipe</th>' +
      '<th class="num">Item&nbsp;#</th><th class="num">Needed</th></tr></thead><tbody>';
    FRUIT_CUPS.forEach(r => {
      cups += `<tr><td>${esc(r.label)}</td><td class="num mono">${esc(r.recipe)}</td>` +
        `<td class="num mono">${esc(r.item)}</td><td class="num strong">${fmt(ctx.tot(r.item))}</td></tr>`;
    });
    cups += '</tbody></table>';
    let bulk = '<table class="cpk-table"><thead><tr><th>Bulk fruit (cut weight)</th><th class="num">lbs</th><th></th></tr></thead><tbody>';
    FRUIT_BULK.forEach(b => {
      bulk += `<tr><td>${esc(b.label)}</td><td class="num strong">${fmt(b.f(ctx))}</td><td class="cpk-note">${esc(b.note || '')}</td></tr>`;
    });
    bulk += '</tbody></table>';
    return h + `<div class="cpk-grid2"><div><div class="cpk-block-label">Mixed fruit cups</div>${cups}</div>` +
      `<div><div class="cpk-block-label">Bulk required</div>${bulk}</div></div>` +
      '<p class="cpk-hint">12oz cup: 3oz cantaloupe · 3oz honeydew · 3oz pineapple · 2oz strawberries · 3-4 red grapes.</p>';
  }

  function renderPrep(ctx) {
    let h = head('Prep');
    let t = '<table class="cpk-table"><thead><tr><th>Item</th><th class="num">Needed</th><th>Unit</th></tr></thead><tbody>';
    PREP.forEach(r => {
      if (r.sec) { t += `<tr class="cpk-secrow"><td colspan="3">${esc(r.sec)}</td></tr>`; return; }
      t += `<tr><td>${esc(r.name)}</td><td class="num strong">${fmt(r.f(ctx))}</td><td>${esc(r.unit)}</td></tr>`;
    });
    return h + t + '</tbody></table><p class="cpk-hint">Quantities use the workbook\'s per-item conversion factors. Edit them in cpk.js.</p>';
  }

  // Packout locations: the standard route list plus any cafe present in
  // today's input that isn't on it (so a new cafe can never be dropped).
  function packoutLocs(ctx, eff) {
    const seen = new Set();
    eff.pkCols.forEach(col => {
      const e = ctx.idx[col.item];
      if (e) Object.keys(e.byLoc).forEach(l => { if (e.byLoc[l] > 0 && !DC_LOCS.includes(l)) seen.add(l); });
    });
    const extra = [...seen].filter(l => !PK_LOCS.includes(l)).sort((a, b) => +a - +b);
    return PK_LOCS.concat(extra);
  }

  function renderPackout(ctx, eff) {
    let h = head('Packout');
    let t = '<div class="cpk-scroll"><table class="cpk-table cpk-pivot"><thead><tr><th>Location</th>';
    eff.pkCols.forEach(col => t += `<th class="num" title="${esc(col.item)}">${esc(col.label)}</th>`);
    t += '<th class="num">Trays</th></tr></thead><tbody>';
    const colTot = {};
    let grandTrays = 0;
    packoutLocs(ctx, eff).forEach(loc => {
      const name = LOC_NAMES[loc] || loc;
      let trayAcc = 0;
      let cells = '';
      eff.pkCols.forEach(col => {
        let q = qLoc(ctx.idx, col.item, loc);
        if (col.tri) q *= 2; // triple stacks ship as packages (ordered x2)
        if (q) { colTot[col.item] = (colTot[col.item] || 0) + q; trayAcc += q / TRAY_DIV[col.g]; }
        cells += `<td class="num${q ? '' : ' zero'}">${q || ''}</td>`;
      });
      const trays = roundup(trayAcc);
      grandTrays += trays;
      t += `<tr><td class="loc">${esc(loc)}-${esc(name)}</td>${cells}<td class="num strong">${trays || ''}</td></tr>`;
    });
    // totals
    t += '<tr class="totals"><td>TOTAL</td>';
    eff.pkCols.forEach(col => t += `<td class="num strong">${colTot[col.item] || ''}</td>`);
    t += `<td class="num strong">${grandTrays}</td></tr></tbody></table></div>`;
    return h + t + '<p class="cpk-hint">Each cell = units to send that cafe (triple stacks shown as packages = ordered x2). Trays ≈ salads/16 + sandwiches/20 + wraps/24 + fruit/30 (rounded up).</p>';
  }

  function renderStickers(ctx, eff) {
    let h = head('Stickers');
    const dcRows = eff.stkDC.map(s => ({ label: s.label, n: stkVal(ctx, s) }));
    const rtRows = eff.stkRetail.map(s => ({ label: s.label, n: stkVal(ctx, s) }));
    const dcTot = dcRows.reduce((a, r) => a + r.n, 0);
    const rtTot = rtRows.reduce((a, r) => a + r.n, 0);
    const colTable = (caption, rows, tot) => {
      let t = `<table class="cpk-table"><thead><tr><th>${esc(caption)}</th><th class="num">Labels</th></tr></thead><tbody>`;
      rows.forEach(r => t += `<tr><td>${esc(r.label)}</td><td class="num strong">${fmt(r.n)}</td></tr>`);
      return t + `<tr class="totals"><td>TOTAL</td><td class="num strong">${fmt(tot)}</td></tr></tbody></table>`;
    };
    return h + '<div class="cpk-grid2"><div>' + colTable('DC Grab & Go: FoodPro stickers', dcRows, dcTot) +
      '</div><div>' + colTable('Retail Grab & Go: Harvest Fresh stickers', rtRows, rtTot) + '</div></div>';
  }

  // ============================================================
  //  AUDIT: reconcile every ordered unit against the sheets.
  //  This is the built-in version of the input-vs-output cross-check.
  // ============================================================
  function auditData(ctx, eff) {
    const idx = ctx.idx;
    const dcItems = new Set(eff.dcRows.filter(r => r.item).map(r => r.item));
    const rtItems = new Set(eff.rtRows.filter(r => r.item).map(r => r.item));
    const triItems = new Set(eff.triple.map(r => r.item));
    const fruitItems = new Set(FRUIT_CUPS.map(r => r.item));
    const prepTot = new Set(PREP_TOT_ITEMS);
    const pkItems = new Set(eff.pkCols.map(c => c.item));
    const rows = [], problems = [];
    Object.keys(idx).sort((a, b) => +a - +b).forEach(it => {
      const e = idx[it];
      if (!e.total) return;
      const dcQty = e.byLoc['01'] || 0;
      const otherDC = DC_LOCS.slice(1).reduce((s, l) => s + (e.byLoc[l] || 0), 0);
      const rtQty = e.total - dcQty - otherDC;
      const wholeTot = triItems.has(it) || fruitItems.has(it) || prepTot.has(it);
      const notes = [];
      let uncovered = 0;
      if (!dcItems.has(it) && !rtItems.has(it) && !wholeTot) {
        notes.push('on NO sheet: ' + e.total + ' units not produced');
        uncovered += e.total;
      } else if (!wholeTot) {
        if (dcQty > 0 && !dcItems.has(it)) { notes.push('DC qty not counted (no DC row)'); uncovered += dcQty; }
        if (rtQty > 0 && !rtItems.has(it)) { notes.push('cafe qty not counted (no Retail row)'); uncovered += rtQty; }
        if (otherDC > 0) notes.push(otherDC + ' at Franklin/Hampshire/Berkshire excluded (made by that DC, not Worcester)');
      }
      if (rtQty > 0 && !pkItems.has(it) && (rtItems.has(it) || wholeTot)) notes.push('no Packout column: cafe units will not ship');
      if (uncovered > 0 || notes.some(n => n.indexOf('Packout') !== -1)) problems.push({ item: it, name: e.name, notes: notes, uncovered: uncovered });
      rows.push({
        item: it, name: e.name, total: e.total,
        dc: dcItems.has(it) ? dcQty : null,
        rt: rtItems.has(it) ? rtQty : null,
        whole: wholeTot ? e.total : null,
        otherDC: otherDC, pk: pkItems.has(it), notes: notes
      });
    });
    return { rows, problems };
  }

  function renderAudit(ctx, eff) {
    const a = auditData(ctx, eff);
    let h = head('Audit: orders in vs production out');
    let t = '<div class="cpk-scroll"><table class="cpk-table"><thead><tr><th class="num">Item #</th><th>Name (from recap)</th>' +
      '<th class="num">Ordered</th><th class="num">DC sheet</th><th class="num">Retail sheet</th>' +
      '<th class="num">Counted whole*</th><th class="num">Other-DC</th><th>Packout</th><th>Notes</th></tr></thead><tbody>';
    a.rows.forEach(r => {
      const warn = r.notes.length ? ' style="background:rgba(255,150,0,.12)"' : '';
      t += `<tr${warn}><td class="num mono">${esc(r.item)}</td><td>${esc(r.name)}</td>` +
        `<td class="num strong">${fmt(r.total)}</td>` +
        `<td class="num">${r.dc == null ? '·' : fmt(r.dc)}</td>` +
        `<td class="num">${r.rt == null ? '·' : fmt(r.rt)}</td>` +
        `<td class="num">${r.whole == null ? '·' : fmt(r.whole)}</td>` +
        `<td class="num">${r.otherDC || '·'}</td>` +
        `<td>${r.pk ? 'yes' : '·'}</td><td class="cpk-note">${esc(r.notes.join('; '))}</td></tr>`;
    });
    t += '</tbody></table></div>';
    const totalUncovered = a.problems.reduce((s, p) => s + p.uncovered, 0);
    const summary = a.problems.length
      ? `<p class="cpk-hint" style="color:#c65a00;font-weight:600;">⚠ ${a.problems.length} item(s) need attention, ${totalUncovered} unit(s) not counted on any sheet. Fix via the MENU tab or check the order.</p>`
      : '<p class="cpk-hint" style="font-weight:600;">✓ Every ordered unit is counted on a sheet (other-DC quantities are made by that dining common, not Worcester).</p>';
    return h + summary + t +
      '<p class="cpk-hint">*Counted whole = triple stacks, fruit cups and raw slicing goods; their formulas use the total across all locations. ' +
      'Other-DC = ordered at Franklin / Hampshire / Berkshire, which produce their own; Worcester makes loc 01 + cafes only.</p>';
  }

  // ============================================================
  //  SETTINGS LOCK: usage is open, the MENU (settings) tab asks for
  //  a basic login first. This is a soft gate against accidental
  //  edits, not real security: the page is fully client-side, so
  //  anyone with dev tools can get past it. Only the SHA-256 hash
  //  of "ID:PASSWORD" (uppercased) is stored here.
  // ============================================================
  const SETTINGS_HASH = '6bf7dc74a82fc265df172560b69bbdaa1d3259dcc421b86f97138f6cac625a52';
  const UNLOCK_KEY = 'cpk_settings_unlocked';
  function isUnlocked() {
    try { return sessionStorage.getItem(UNLOCK_KEY) === '1'; } catch (e) { return false; }
  }
  function setUnlocked(on) {
    try { on ? sessionStorage.setItem(UNLOCK_KEY, '1') : sessionStorage.removeItem(UNLOCK_KEY); } catch (e) { }
  }
  async function checkLogin(id, pass) {
    const msg = (String(id).trim() + ':' + String(pass).trim()).toUpperCase();
    if (!(window.crypto && crypto.subtle)) return false; // non-secure context
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
    const hex = [...new Uint8Array(buf)].map(x => x.toString(16).padStart(2, '0')).join('');
    return hex === SETTINGS_HASH;
  }

  function renderLogin() {
    return head('Settings: sign in') +
      '<p class="cpk-hint">Running the planner is open to everyone. Changing the menu (adding or dropping items) needs the settings login. Ask the kitchen manager.</p>' +
      '<div class="cpk-menu-form">' +
      '<input id="cpkl-id" placeholder="ID" size="12" autocomplete="off">' +
      '<input id="cpkl-pass" placeholder="Password" size="14" type="password" autocomplete="off">' +
      '<button class="cpk-mini" id="cpkl-go" style="font-weight:700;">UNLOCK</button>' +
      '</div><p class="cpk-hint" id="cpkl-msg"></p>';
  }
  function bindLoginEvents() {
    const go = $('cpkl-go');
    if (!go) return;
    const attempt = async () => {
      const ok = await checkLogin($('cpkl-id').value, $('cpkl-pass').value);
      if (ok) { setUnlocked(true); render(); }
      else { $('cpkl-msg').textContent = (window.crypto && crypto.subtle) ? 'Wrong ID or password.' : 'This browser cannot unlock settings (needs a secure https connection).'; }
    };
    go.addEventListener('click', attempt);
    ['cpkl-id', 'cpkl-pass'].forEach(id => $(id).addEventListener('keydown', e => { if (e.key === 'Enter') attempt(); }));
  }

  // ============================================================
  //  MENU TAB: add / drop items without touching code.
  // ============================================================
  function menuSection(title, sheet, rows, m) {
    const hid = new Set(m.hidden);
    let t = `<div class="cpk-block-label" style="margin-top:14px;">${esc(title)}</div>` +
      '<table class="cpk-table"><thead><tr><th>Make</th><th>Item</th><th class="num">Item #</th><th class="num">Recipe</th><th></th></tr></thead><tbody>';
    rows.filter(r => r.item).forEach(r => {
      const off = hid.has(r.item);
      t += `<tr${off ? ' style="opacity:.45"' : ''}><td><input type="checkbox" data-cpkmenu="toggle" data-item="${esc(r.item)}"${off ? '' : ' checked'}></td>` +
        `<td>${esc(r.label)}${r.custom ? ' <span class="cpk-badge">ADDED</span>' : ''}</td>` +
        `<td class="num mono">${esc(r.item)}</td><td class="num mono">${esc(r.recipe)}</td>` +
        `<td>${r.custom ? `<button class="cpk-mini" data-cpkmenu="del" data-item="${esc(r.item)}" data-sheet="${esc(sheet)}">remove</button>` : ''}</td></tr>`;
    });
    return t + '</tbody></table>';
  }

  function renderMenu() {
    const m = loadMenu();
    const custom = sheet => m.added.filter(a => a.sheet === sheet)
      .map(a => ({ label: a.label, recipe: a.recipe || '', item: a.item, custom: true }));
    let h = head('Menu: add or drop items');
    h += '<p class="cpk-hint">Settings are unlocked for this browser session. <button class="cpk-mini" id="cpkm-lock">Lock settings</button></p>';
    h += '<p class="cpk-hint">Changes save in THIS browser only (nothing uploads). Un-check "Make" to drop an item from every sheet ' +
      '(its row, packout column and sticker); re-check to bring it back. Items added here get a sheet row, a packout column and a sticker. ' +
      'Bread ratios, chicken factors and PREP ingredients are formulas in cpk.js; a new item that needs those still needs a code edit.</p>';
    h += menuSection('DC Grab & Go', 'dc', DC_ROWS.concat(custom('dc')), m);
    h += menuSection('Retail Grab & Go', 'retail', RT_ROWS.concat(custom('retail')), m);
    h += menuSection('Triple Stacks', 'triple', RT_TRIPLE, m);
    // add form
    h += '<div class="cpk-block-label" style="margin-top:20px;">Add an item</div>' +
      '<div class="cpk-menu-form">' +
      '<select id="cpkm-sheet"><option value="dc">DC Grab &amp; Go</option><option value="retail" selected>Retail Grab &amp; Go</option></select>' +
      '<input id="cpkm-item" placeholder="Item # (e.g. 9299)" size="12" inputmode="numeric">' +
      '<input id="cpkm-label" placeholder="Item name as it should print" size="28">' +
      '<input id="cpkm-recipe" placeholder="Recipe # (optional)" size="14" inputmode="numeric">' +
      '<select id="cpkm-pk"><option value="">No packout column</option><option value="sand" selected>Packout: sandwich (tray /20)</option>' +
      '<option value="salad">Packout: salad (tray /16)</option><option value="wrap">Packout: wrap (tray /24)</option>' +
      '<option value="fruit">Packout: fruit (tray /30)</option></select>' +
      '<input id="cpkm-sticker" placeholder="Sticker label (blank = item name)" size="24">' +
      '<button class="cpk-mini" id="cpkm-add" style="font-weight:700;">ADD ITEM</button>' +
      '</div><p class="cpk-hint" id="cpkm-msg"></p>' +
      '<p class="cpk-hint"><button class="cpk-mini" id="cpkm-reset">Reset menu to defaults</button> (clears every change made on this page)</p>';
    return h;
  }

  function bindMenuEvents() {
    const out = $('cpk-output');
    out.querySelectorAll('[data-cpkmenu="toggle"]').forEach(cb => cb.addEventListener('change', () => {
      const m = loadMenu();
      const it = cb.dataset.item;
      m.hidden = cb.checked ? m.hidden.filter(x => x !== it) : m.hidden.concat([it]);
      saveMenu(m); render();
    }));
    out.querySelectorAll('[data-cpkmenu="del"]').forEach(b => b.addEventListener('click', () => {
      const m = loadMenu();
      m.added = m.added.filter(a => !(a.item === b.dataset.item && a.sheet === b.dataset.sheet));
      saveMenu(m); render();
    }));
    const add = $('cpkm-add');
    if (add) add.addEventListener('click', () => {
      const item = normItem(($('cpkm-item').value || '').trim());
      const label = ($('cpkm-label').value || '').trim();
      const msg = $('cpkm-msg');
      if (!/^\d{2,6}$/.test(item)) { msg.textContent = 'Item # must be 2-6 digits.'; return; }
      if (!label) { msg.textContent = 'Give the item a name.'; return; }
      const m = loadMenu();
      const sheet = $('cpkm-sheet').value;
      const dupBuiltin = (sheet === 'dc' ? DC_ROWS : RT_ROWS).some(r => r.item === item);
      const dupCustom = m.added.some(a => a.sheet === sheet && a.item === item);
      if (dupBuiltin || dupCustom) { msg.textContent = 'Item ' + item + ' is already on that sheet.'; return; }
      m.added.push({
        sheet: sheet, item: item, label: label,
        recipe: ($('cpkm-recipe').value || '').trim(),
        pk: $('cpkm-pk').value,
        pkLabel: label.slice(0, 12),
        sticker: (($('cpkm-sticker').value || '').trim()) || label
      });
      m.hidden = m.hidden.filter(x => x !== item);
      saveMenu(m); render();
    });
    const lock = $('cpkm-lock');
    if (lock) lock.addEventListener('click', () => { setUnlocked(false); render(); });
    const reset = $('cpkm-reset');
    if (reset) reset.addEventListener('click', () => {
      if (confirm('Reset the menu to the built-in defaults? All added and dropped items on this browser are cleared.')) {
        try { localStorage.removeItem(MENU_KEY); } catch (e) { }
        render();
      }
    });
  }

  // ============================================================
  //  PRINT: clean paper sheets, packout in landscape.
  // ============================================================
  const PRINT_TABS = ['dc', 'retail', 'fruit', 'prep', 'packout', 'stickers'];
  function doPrint(tabs) {
    if (!data.rows.length) { $('cpk-meta').textContent = '// nothing to print, GENERATE first'; return; }
    const eff = effective();
    const ctx = makeCtx(indexOrders(data.rows));
    let box = $('cpk-print');
    if (box) box.remove();
    box = document.createElement('div');
    box.id = 'cpk-print';
    box.innerHTML = tabs.map(t =>
      `<section class="cpk-psheet cpk-p-${t}">${(RENDER[t])(ctx, eff)}</section>`).join('');
    document.body.appendChild(box);
    const clean = () => { const b = $('cpk-print'); if (b) b.remove(); window.removeEventListener('afterprint', clean); };
    window.addEventListener('afterprint', clean);
    window.print();
  }

  const EXTRA_CSS = `
  #cpk-print{display:none;}
  .cpk-badge{font-size:.65rem;letter-spacing:1px;padding:1px 6px;border:1px solid currentColor;border-radius:3px;opacity:.75;}
  .cpk-mini{font:inherit;font-size:.75rem;letter-spacing:1px;padding:4px 10px;cursor:pointer;background:transparent;border:1px solid var(--border,#888);color:inherit;}
  .cpk-mini:hover{border-color:currentColor;}
  .cpk-menu-form{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin:10px 0;}
  .cpk-menu-form input,.cpk-menu-form select{font:inherit;font-size:.85rem;padding:7px 9px;background:var(--panel-bg,transparent);color:inherit;border:1px solid var(--border,#888);}
  @page { margin: 10mm; }
  @page cpkland { size: letter landscape; margin: 8mm; }
  @media print {
    body > *:not(#cpk-print){ display:none !important; }
    #cpk-print{ display:block; color:#000; background:#fff; font-size:12px; }
    #cpk-print .cpk-psheet{ page-break-after:always; }
    #cpk-print .cpk-psheet:last-child{ page-break-after:auto; }
    #cpk-print .cpk-p-packout{ page: cpkland; }
    #cpk-print .cpk-scroll{ overflow:visible !important; }
    #cpk-print table{ width:100%; border-collapse:collapse; font-size:11px; }
    #cpk-print .cpk-p-packout table{ font-size:8.5px; }
    #cpk-print th,#cpk-print td{ border:1px solid #999; padding:3px 5px; color:#000; text-align:left; }
    #cpk-print th.num,#cpk-print td.num{ text-align:right; }
    #cpk-print .cpk-secrow td{ background:#eee; font-weight:700; letter-spacing:1px; }
    #cpk-print .totals td{ font-weight:700; border-top:2px solid #000; }
    #cpk-print .strong{ font-weight:700; }
    #cpk-print .zero{ color:#bbb; }
    #cpk-print .cpk-sheet-head{ display:flex; justify-content:space-between; align-items:baseline; margin:0 0 6px; }
    #cpk-print .cpk-sheet-title{ font-size:16px; margin:0; text-transform:uppercase; letter-spacing:2px; }
    #cpk-print .cpk-grid2{ display:grid; grid-template-columns:3fr 2fr; gap:14px; align-items:start; }
    #cpk-print .cpk-block-label{ font-weight:700; letter-spacing:1px; margin:8px 0 4px; font-size:11px; text-transform:uppercase; }
    #cpk-print .cpk-hint,#cpk-print .cpk-note{ color:#444; font-size:9px; }
  }`;

  // ============================================================
  //  APP
  // ============================================================
  let data = { rows: [], skipped: [] };
  let tab = 'dc';
  const RENDER = { dc: renderDC, retail: renderRetail, fruit: renderFruit, prep: renderPrep, packout: renderPackout, stickers: renderStickers, audit: renderAudit, menu: renderMenu };

  function render() {
    const out = $('cpk-output');
    if (tab === 'menu') {
      if (!isUnlocked()) { out.innerHTML = renderLogin(); bindLoginEvents(); return; }
      out.innerHTML = renderMenu(); bindMenuEvents(); return;
    }
    if (!data.rows.length) { out.innerHTML = '<p class="cpk-empty">// Paste or upload an Orders Recap above, then hit GENERATE.</p>'; return; }
    const eff = effective();
    const ctx = makeCtx(indexOrders(data.rows));
    out.innerHTML = (RENDER[tab] || renderDC)(ctx, eff);
  }

  function setTab(t) {
    tab = t;
    document.querySelectorAll('.cpk-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
    render();
  }

  function generate() {
    data = parse($('cpk-input').value);
    let m = `${data.rows.length} order line${data.rows.length === 1 ? '' : 's'} parsed` +
      (data.skipped.length ? ` · ${data.skipped.length} skipped` : '') +
      (data.multi ? ' · first order only' : '');
    if (data.rows.length) {
      const a = auditData(makeCtx(indexOrders(data.rows)), effective());
      if (a.problems.length) m += ` · ⚠ ${a.problems.length} coverage note${a.problems.length === 1 ? '' : 's'} (AUDIT tab)`;
    }
    $('cpk-meta').textContent = '// ' + m;
    render();
    if (window.intel) try { window.intel.track('cpk_generate', { lines: data.rows.length }); } catch (e) { }
  }

  function loadFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { $('cpk-input').value = String(reader.result || ''); generate(); $('cpk-meta').textContent += ' · ' + file.name; };
    reader.onerror = () => { $('cpk-meta').textContent = '// could not read ' + file.name; };
    reader.readAsText(file);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('cpk-input')) return;
    const input = $('cpk-input');
    input.value = SAMPLE;

    // Inject styles (menu form, print sheets).
    const style = document.createElement('style');
    style.id = 'cpk-extra-css';
    style.textContent = EXTRA_CSS;
    document.head.appendChild(style);

    // Inject the AUDIT and MENU tabs so the host page needs no edits.
    const tabbar = document.querySelector('.cpk-tabs');
    if (tabbar && !tabbar.querySelector('[data-tab="audit"]')) {
      [['audit', 'AUDIT'], ['menu', 'MENU']].forEach(([id, txt]) => {
        const b = document.createElement('button');
        b.className = 'cpk-tab'; b.dataset.tab = id; b.textContent = txt;
        b.setAttribute('role', 'tab');
        tabbar.appendChild(b);
      });
    }

    // Inject print buttons into the controls row.
    const controls = document.querySelector('.cpk-controls');
    if (controls && !$('cpk-print-one')) {
      const meta = $('cpk-meta');
      [['cpk-print-one', 'PRINT'], ['cpk-print-all', 'PRINT ALL']].forEach(([id, txt]) => {
        const b = document.createElement('button');
        b.className = 'btn btn-secondary'; b.id = id; b.textContent = txt; b.type = 'button';
        controls.insertBefore(b, meta);
      });
      $('cpk-print-one').addEventListener('click', () => doPrint([PRINT_TABS.includes(tab) ? tab : 'dc']));
      $('cpk-print-all').addEventListener('click', () => doPrint(PRINT_TABS));
    }

    $('cpk-gen').addEventListener('click', generate);
    $('cpk-sample').addEventListener('click', () => { input.value = SAMPLE; generate(); });
    $('cpk-clear').addEventListener('click', () => { input.value = ''; data = { rows: [], skipped: [] }; $('cpk-meta').textContent = ''; render(); });

    const fileEl = $('cpk-file');
    if (fileEl) fileEl.addEventListener('change', e => { loadFile(e.target.files && e.target.files[0]); e.target.value = ''; });

    input.addEventListener('dragover', e => { e.preventDefault(); input.classList.add('cpk-drag'); });
    input.addEventListener('dragleave', () => input.classList.remove('cpk-drag'));
    input.addEventListener('drop', e => {
      if (!e.dataTransfer || !e.dataTransfer.files.length) return;
      e.preventDefault(); input.classList.remove('cpk-drag');
      loadFile(e.dataTransfer.files[0]);
    });

    document.querySelectorAll('.cpk-tab').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
    generate();
  });
})();
