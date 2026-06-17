/* ============================================================
 * CPK Production Planner — client-side, in-browser.
 * Paste / upload the daily Orders Recap; the tool reproduces the
 * Worcester central-kitchen workbook's production sheets:
 *   DC G&G · Retail G&G · Fruit · PREP · Packout · Stickers
 * Logic mirrors the manager's Excel:
 *   - DC needed      = qty ordered at location 01 (Worcester DC)
 *   - Retail needed  = total ordered (all locations) − DC
 *   - Triple stacks  = ordered ×2 packages, ×1.5 sandwiches/package
 * Quantities (bread ratios, prep factors, fruit weights, tray sizes)
 * are transcribed from the workbook — edit the CONFIG block to tune.
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
    ['10/15/25', '8371', 'CPK SALAD CHICKEN CAESAR DC', '01', 'Worcester DC', 120, 'EACH'],
    ['10/15/25', '8372', 'CPK SALAD GREEN TOSSED DC', '01', 'Worcester DC', 100, 'EACH'],
    ['10/15/25', '8637', 'FRUIT CUP MIXED CPK', '01', 'Worcester DC', 160, 'EACH'],
    ['10/15/25', '9241', 'CPK WRAP CHICKEN BUFFALO  DC', '01', 'Worcester DC', 140, 'EACH'],
    ['10/15/25', '9268', 'CPK CHICKEN WRAP CAESAR GRAB', '01', 'Worcester DC', 120, 'EACH'],
    ['10/15/25', '8009', 'CPK SANDWICH GF TURKEY & CHEDD', '23', 'Harvest', 6, 'EACH'],
    ['10/15/25', '8009', 'CPK SANDWICH GF TURKEY & CHEDD', '42', 'LIBRARY CAFE', 2, 'EACH'],
    ['10/15/25', '9230', 'CPK PEOPLES TURKEY PESTO CROIS', '42', 'LIBRARY CAFE', 3, 'EACH'],
    ['10/15/25', '2226', 'CPK CROISSANT TURKEY', '13', 'Worcester Cafe', 2, 'EACH'],
    ['10/15/25', '9221', 'CPK SANDWICH CHICKEN & MOZZARE', '23', 'Harvest', 15, 'EACH'],
    ['10/15/25', '9255', 'CPK WRAP CHICKEN BUFFALO', '23', 'Harvest', 15, 'EACH'],
    ['10/15/25', '9255', 'CPK WRAP CHICKEN BUFFALO', '42', 'LIBRARY CAFE', 5, 'EACH'],
    ['10/15/25', '4837', 'CPK PEOPLES CHICKEN CAESAR', '23', 'Harvest', 18, 'EACH'],
    ['10/15/25', '4837', 'CPK PEOPLES CHICKEN CAESAR', '42', 'LIBRARY CAFE', 5, 'EACH'],
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
  //  PARSER — reads the Orders Recap into {item, locCode, qty}
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

  // ---- order index: item -> { total, byLoc{code:qty} } ----
  function indexOrders(rows) {
    const idx = {};
    rows.forEach(r => {
      const it = r.item;
      if (!idx[it]) idx[it] = { total: 0, byLoc: {} };
      idx[it].byLoc[r.locCode] = (idx[it].byLoc[r.locCode] || 0) + r.qty;
      idx[it].total += r.qty;
    });
    return idx;
  }
  const qTot = (idx, it) => (idx[normItem(it)] ? idx[normItem(it)].total : 0);
  const qLoc = (idx, it, loc) => { const e = idx[normItem(it)]; return e ? (e.byLoc[loc] || 0) : 0; };

  // The four dining commons ("DC"): Worcester 01, Franklin 02, Hampshire 03,
  // Berkshire 04. This Worcester workbook produces DC G&G for Worcester (01)
  // only and Retail G&G for the cafés — so retail excludes ALL dining commons.
  const DC_LOCS = ['01', '02', '03', '04'];

  // Build the calc context referenced by every formula below.
  function makeCtx(idx) {
    return {
      dc: it => qLoc(idx, it, '01'),                 // DC G&G = Worcester (loc 01)
      rt: it => qTot(idx, it) - DC_LOCS.reduce((s, l) => s + qLoc(idx, it, l), 0), // Retail = cafés only
      tot: it => qTot(idx, it),
      tsPkg: it => qTot(idx, it) * 2,                // triple-stack packages
      tsSand: it => qTot(idx, it) * 3,               // packages ×1.5 sandwiches
      f12: qTot(idx, '9266'),
      f8: qTot(idx, '8637'),
      idx: idx
    };
  }

  // ============================================================
  //  CONFIG — transcribed from "Worcester CPK test.xlsx"
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
    { label: 'Buffalo Chicken Wrap', recipe: 76213, item: '9241' }
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
    { label: '10" Wraps (PACKS)', f: c => roundup(c.rt('9257') / 12) },
    { label: 'Tomato Wraps (PACKS)', f: c => roundup(c.rt('9255') / 10) }
  ];
  const RT_TRIPLE_BREAD = [
    { label: 'Wheat Bread (LOAF)', f: c => roundup((c.tsSand('253') + c.tsSand('279')) / 7) },
    { label: 'Rye Bread (LOAF)', f: c => roundup(c.tsSand('283') / 14) }
  ];
  const RT_CHICKEN = [
    { label: 'Buffalo Chicken (Retail Total)', unit: 'LBS', f: c => roundup(3 * c.rt('9255') / 12) },
    { label: 'Chicken Caesar (Retail Total)', unit: 'LBS', f: c => roundup(3 * c.rt('9257') / 12) }
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
  const PREP = [
    { sec: 'SLICING' },
    { name: 'Sliced Ham', unit: 'lbs', f: c => roundup(c.tot('4735') + c.dc('2291') * 0.2 + c.dc('2352') * 0.1 + c.rt('7523') * 0.1 + c.tsSand('283') * 0.2) },
    { name: 'Sliced Turkey', unit: 'lbs', f: c => roundup(c.tot('4926') + c.dc('2420') * 0.2 + c.dc('1004') * 0.2 + c.rt('8009') * 0.2 + c.rt('2226') * 0.2 + c.tsSand('279') * 0.2) },
    { name: 'Sliced Roast Beef', unit: 'lbs', f: c => roundup(c.dc('2366') * 0.2) },
    { name: 'Sliced Provolone', unit: 'lbs', f: c => roundup(c.tot('4738') + c.rt('7523') * 0.1 + c.dc('1004') * 0.1 + c.dc('2352') * 0.1) },
    { name: 'Sliced Cheddar', unit: 'lbs', f: c => roundup(c.tot('4740') + c.dc('2420') * 0.1 + c.rt('8009') * 0.1 + c.rt('2226') * 0.1) },
    { name: 'Sliced Swiss', unit: 'lbs', f: c => roundup(c.tsSand('279') * 0.1 + c.tsSand('283') * 0.1 + c.dc('2291') * 0.1) },
    { sec: 'COOKING' },
    { name: 'Boiled Eggs', unit: 'each', f: c => c.rt('9212') },
    { name: 'Grilled Chicken', unit: 'lbs', f: c => r2(c.dc('8371') * 0.2 + c.dc('9268') * 0.2 + c.dc('9241') * 0.2 + c.rt('9255') * 0.25 + c.rt('9257') * 0.25 + c.rt('9212') * 0.15 + c.rt('9221') * 0.25) },
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
    { name: 'Cranberry Aioli', unit: 'gal', f: c => r1(c.tsSand('279') / 128) },
    { name: 'Sundried Tomato Aioli', unit: 'gal', f: c => r1(c.rt('8009') / 128) },
    { name: 'Berry Vinaigrette', unit: 'gal', f: c => r1(c.rt('301') / 64) }
  ];

  // ---- Packout (location × item grid) ----
  // g: tray group — salad 1/16, sand 1/20, wrap 1/24, fruit 1/30
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
    { item: '9255', label: 'Buff W', g: 'wrap' },
    { item: '9257', label: 'Caesar W', g: 'wrap' },
    { item: '9266', label: 'Fruit', g: 'fruit' }
  ];
  const PK_LOCS = ['89', '34', '97', '15', '46', '30', '42', '44', '72', '40', '23', '31',
    '51', '92', '54', '52', '45', '70', '08', '13', '21', '78', '96'];
  const TRAY_DIV = { salad: 16, sand: 20, wrap: 24, fruit: 30 };

  // ---- Stickers ----
  const STK_DC = [
    { label: 'Gluten Free Turkey Sandwich', f: c => c.dc('2420') },
    { label: 'Gluten Free PB & J', f: c => c.dc('2421') },
    { label: 'Turkey Kaiser', f: c => c.dc('1004') },
    { label: 'Ham on Rye', f: c => c.dc('2291') },
    { label: 'PB & J on WW', f: c => c.dc('2299') },
    { label: 'Roast Beef on Kaiser', f: c => c.dc('2366') },
    { label: 'Tuna on White', f: c => c.dc('2387') },
    { label: 'Hummus & Vegetable Sandwich', f: c => c.dc('6063') },
    { label: 'Hummus & Pita Chips', f: c => c.dc('2404') },
    { label: 'Grab & Go Salad Chicken Caesar', f: c => c.dc('8371') },
    { label: 'Grab & Go Salad Tossed', f: c => c.dc('8372') },
    { label: 'Chicken Caesar Wrap', f: c => c.dc('9268') },
    { label: 'Buffalo Chicken Wrap', f: c => c.dc('9241') },
    { label: 'Fruit Cup (8oz)', f: c => c.tot('8637') }
  ];
  const STK_RETAIL = [
    { label: 'Buffalo Chicken Wrap', f: c => c.rt('9255') },
    { label: 'Chicken Caesar Salad', f: c => c.rt('4837') },
    { label: 'Chicken, Pesto & Mozzarella Sandwich', f: c => c.rt('9221') },
    { label: 'Driscol Berry Salad w/ Walnuts + Feta', f: c => c.rt('301') },
    { label: 'Gluten Free PB & J Sandwich', f: c => c.rt('2421') },
    { label: 'Ham + Swiss Triple Stack', f: c => c.tsPkg('283') },
    { label: 'Hummus Vegetable on Whole Wheat', f: c => c.rt('6063') },
    { label: 'Mixed Fruit Cup', f: c => c.f12 },
    { label: 'Triple Stack PB + J', f: c => c.tsPkg('253') },
    { label: 'Tuna on White', f: c => c.rt('2387') },
    { label: 'Turkey & Cheddar on GF Roll', f: c => c.rt('8009') },
    { label: 'Turkey on Multigrain Croissant', f: c => c.rt('2226') },
    { label: 'Turkey Pesto Croissant', f: c => c.rt('9230') },
    { label: 'Turkey, Swiss + Cranberry Aioli Triple', f: c => c.tsPkg('279') },
    { label: 'Salad Little Leaf & Berry Pecan', f: c => c.rt('9111') },
    { label: 'Italian Sandwich New Orleans', f: c => c.rt('9113') }
  ];

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

  function renderDC(ctx) {
    const side = '<div class="cpk-block-label">Bread to defrost</div>' + breadTable(DC_BREAD, ctx, 'Bread / base') +
      '<div class="cpk-block-label" style="margin-top:16px;">Chicken</div>' + chickenTable(DC_CHICKEN, ctx);
    return makeSheet('DC Grab & Go', DC_ROWS, (c, it) => c.dc(it), ctx, { side });
  }

  function renderRetail(ctx) {
    const side = '<div class="cpk-block-label">Bread to defrost</div>' + breadTable(RT_BREAD, ctx, 'Bread / base') +
      '<div class="cpk-block-label" style="margin-top:16px;">Chicken</div>' + chickenTable(RT_CHICKEN, ctx);
    let h = makeSheet('Retail Grab & Go', RT_ROWS, (c, it) => c.rt(it), ctx, { side });
    // Triple stacks
    let t = '<div class="cpk-block-label" style="margin-top:20px;">Triple Stacks</div>' +
      '<table class="cpk-table"><thead><tr><th>Item</th><th class="num">Item&nbsp;#</th>' +
      '<th class="num">Ordered</th><th class="num">Packages</th><th class="num">Sandwiches</th></tr></thead><tbody>';
    let oT = 0, pT = 0, sT = 0;
    RT_TRIPLE.forEach(r => {
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
      '<p class="cpk-hint">12oz cup: 3oz cantaloupe · 3oz honeydew · 3oz pineapple · 2oz strawberries · 3–4 red grapes.</p>';
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

  function renderPackout(ctx) {
    let h = head('Packout');
    let t = '<div class="cpk-scroll"><table class="cpk-table cpk-pivot"><thead><tr><th>Location</th>';
    PK_COLS.forEach(col => t += `<th class="num" title="${esc(col.item)}">${esc(col.label)}</th>`);
    t += '<th class="num">Trays</th></tr></thead><tbody>';
    const colTot = {};
    let grandTrays = 0;
    PK_LOCS.forEach(loc => {
      const name = LOC_NAMES[loc] || loc;
      let trayAcc = 0, any = false;
      let cells = '';
      PK_COLS.forEach(col => {
        const q = qLoc(ctx.idx, col.item, loc);
        if (q) { any = true; colTot[col.item] = (colTot[col.item] || 0) + q; trayAcc += q / TRAY_DIV[col.g]; }
        cells += `<td class="num${q ? '' : ' zero'}">${q || ''}</td>`;
      });
      const trays = roundup(trayAcc);
      grandTrays += trays;
      t += `<tr><td class="loc">${esc(loc)}-${esc(name)}</td>${cells}<td class="num strong">${trays || ''}</td></tr>`;
    });
    // totals
    t += '<tr class="totals"><td>TOTAL</td>';
    PK_COLS.forEach(col => t += `<td class="num strong">${colTot[col.item] || ''}</td>`);
    t += `<td class="num strong">${grandTrays}</td></tr></tbody></table></div>`;
    return h + t + '<p class="cpk-hint">Each cell = units ordered for that item at that café. Trays ≈ salads/16 + sandwiches/20 + wraps/24 + fruit/30 (rounded up). Triple-stack packaging is handled on the Retail sheet.</p>';
  }

  function renderStickers(ctx) {
    let h = head('Stickers');
    const dcRows = STK_DC.map(s => ({ label: s.label, n: s.f(ctx) }));
    const rtRows = STK_RETAIL.map(s => ({ label: s.label, n: s.f(ctx) }));
    const dcTot = dcRows.reduce((a, r) => a + r.n, 0);
    const rtTot = rtRows.reduce((a, r) => a + r.n, 0);
    const colTable = (caption, rows, tot) => {
      let t = `<table class="cpk-table"><thead><tr><th>${esc(caption)}</th><th class="num">Labels</th></tr></thead><tbody>`;
      rows.forEach(r => t += `<tr><td>${esc(r.label)}</td><td class="num strong">${fmt(r.n)}</td></tr>`);
      return t + `<tr class="totals"><td>TOTAL</td><td class="num strong">${fmt(tot)}</td></tr></tbody></table>`;
    };
    return h + '<div class="cpk-grid2"><div>' + colTable('DC Grab & Go — FoodPro stickers', dcRows, dcTot) +
      '</div><div>' + colTable('Retail Grab & Go — Harvest Fresh stickers', rtRows, rtTot) + '</div></div>';
  }

  // ============================================================
  //  APP
  // ============================================================
  let data = { rows: [], skipped: [] };
  let tab = 'dc';
  const RENDER = { dc: renderDC, retail: renderRetail, fruit: renderFruit, prep: renderPrep, packout: renderPackout, stickers: renderStickers };

  function render() {
    const out = $('cpk-output');
    if (!data.rows.length) { out.innerHTML = '<p class="cpk-empty">// Paste or upload an Orders Recap above, then hit GENERATE.</p>'; return; }
    const ctx = makeCtx(indexOrders(data.rows));
    out.innerHTML = (RENDER[tab] || renderDC)(ctx);
  }

  function setTab(t) {
    tab = t;
    document.querySelectorAll('.cpk-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === t));
    render();
  }

  function generate() {
    data = parse($('cpk-input').value);
    const m = `${data.rows.length} order line${data.rows.length === 1 ? '' : 's'} parsed` +
      (data.skipped.length ? ` · ${data.skipped.length} skipped` : '') +
      (data.multi ? ' · first order only' : '');
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
