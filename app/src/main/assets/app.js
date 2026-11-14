/* Glonky Jobo — app logic. Runs inside the Android WebView (window.Android bridge)
   and also in a plain browser for development (falls back to localStorage / Web Share). */
(function () {
  'use strict';

  var BASE_SIZE = 5; // built-in recipes are written for a family of 5
  var DAYS = 14;
  var AISLES = { P: 'Produce', M: 'Meat & Seafood', D: 'Dairy & Deli', B: 'Bakery & Bread', G: 'Pantry & Dry Goods', F: 'Frozen', S: 'Pantry staples (check the cupboard)', O: 'Other' };
  var AISLE_ORDER = ['P', 'M', 'D', 'B', 'G', 'F', 'O', 'S'];
  var PROTEINS = { chicken: 'Chicken', turkey: 'Turkey', beef: 'Beef', pork: 'Pork', fish: 'Fish', seafood: 'Seafood', eggs: 'Eggs', veggie: 'Meatless', other: 'Other' };
  var SPECIAL = { _left: { id: '_left', name: 'Leftovers night', special: true }, _out: { id: '_out', name: 'Eating out / takeout', special: true } };
  var WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // ---------- storage ----------
  var bridge = window.Android || null;
  function loadRaw() {
    try { return bridge ? bridge.load() : localStorage.getItem('emealio'); } catch (e) { return null; }
  }
  function persist() {
    var s = JSON.stringify(state);
    try { if (bridge) bridge.save(s); else localStorage.setItem('emealio', s); } catch (e) { /* storage unavailable */ }
  }
  /** Every local change goes through here: keep it on the phone, then send what changed to the family. */
  function save() { persist(); pushDiff(); }

  function nextMonday() {
    var d = new Date(); d.setHours(12, 0, 0, 0);
    var add = (8 - d.getDay()) % 7; // today if it is Monday
    d.setDate(d.getDate() + add);
    return iso(d);
  }
  function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  var state = {
    v: 1, familySize: 5, startDate: nextMonday(), newPerWeek: 2, maxPts: 0, hideStaples: false,
    fav: {}, hidden: {}, custom: [], plan: [], checked: {}, extras: []
  };
  (function restore() {
    var raw = loadRaw();
    if (raw) {
      try { var o = JSON.parse(raw); for (var k in o) if (k in state) state[k] = o[k]; } catch (e) { /* corrupt: start fresh */ }
    }
    if (!Array.isArray(state.plan)) state.plan = [];
    while (state.plan.length < DAYS) state.plan.push({ id: null, locked: false });
    state.plan.length = DAYS;
  })();

  // ---------- family sharing ----------
  // The native shell owns Google sign-in and the cloud document. This side only decides WHAT changed:
  // the state is flattened into maps (one entry per night, per recipe, per grocery tick) so two people
  // editing different things at the same moment never overwrite each other.
  var sync = { available: false, user: null, household: null, members: [], busy: false };
  var shadow = null; // the shared document as this phone last knew it
  function toShape() {
    var plan = {}, custom = {}, extras = {};
    state.plan.forEach(function (s, i) { plan[i] = { id: s.id || null, locked: !!s.locked }; });
    state.custom.forEach(function (m) { if (m && m.id) custom[m.id] = m; });
    state.extras.forEach(function (x) { if (x && x.id) extras[x.id] = { name: x.name }; });
    return JSON.parse(JSON.stringify({
      v: 1, familySize: state.familySize, startDate: state.startDate, newPerWeek: state.newPerWeek, maxPts: state.maxPts,
      fav: state.fav, hidden: state.hidden, checked: state.checked, plan: plan, custom: custom, extras: extras
    }));
  }
  function isMap(x) { return x && typeof x === 'object' && !Array.isArray(x); }
  function diff(a, b) {
    var ops = [];
    Object.keys(b).forEach(function (k) {
      if (!isMap(b[k])) { if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) ops.push({ p: [k], v: b[k] }); return; }
      var av = isMap(a[k]) ? a[k] : {}, bv = b[k];
      Object.keys(bv).forEach(function (sk) { if (sk && JSON.stringify(av[sk]) !== JSON.stringify(bv[sk])) ops.push({ p: [k, sk], v: bv[sk] }); });
      Object.keys(av).forEach(function (sk) { if (sk && !(sk in bv)) ops.push({ p: [k, sk], d: 1 }); });
    });
    return ops;
  }
  function pushDiff() {
    if (!bridge || !sync.household || !shadow) return;
    var now = toShape(), ops = diff(shadow, now);
    if (!ops.length) return;
    shadow = now;
    try { bridge.push(JSON.stringify(ops)); } catch (e) { /* stays local until the next change */ }
  }
  function num(v, lo, hi, dflt) { v = +v; return isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : dflt; }
  /** The shared document changed (possibly by us): make it the state on this phone. */
  function applyShape(d) {
    if (!isMap(d)) return;
    state.familySize = num(d.familySize, 1, 12, state.familySize);
    state.newPerWeek = num(d.newPerWeek, 0, 7, state.newPerWeek);
    state.maxPts = num(d.maxPts, 0, 12, state.maxPts);
    if (/^\d{4}-\d{2}-\d{2}$/.test(d.startDate)) state.startDate = d.startDate;
    state.fav = isMap(d.fav) ? d.fav : {};
    state.hidden = isMap(d.hidden) ? d.hidden : {};
    state.checked = isMap(d.checked) ? d.checked : {};
    var plan = isMap(d.plan) ? d.plan : {}, custom = isMap(d.custom) ? d.custom : {}, extras = isMap(d.extras) ? d.extras : {};
    state.plan = [];
    for (var i = 0; i < DAYS; i++) { var s = plan[i]; state.plan.push({ id: s && s.id ? String(s.id) : null, locked: !!(s && s.locked && s.id) }); }
    state.custom = Object.keys(custom).sort().map(function (k) { return custom[k]; }).filter(function (m) { return isMap(m) && m.id && m.name; })
      .map(function (m) { if (!Array.isArray(m.ing)) m.ing = []; if (!Array.isArray(m.tags)) m.tags = []; return m; });
    state.extras = Object.keys(extras).sort().map(function (k) { return { id: k, name: String((extras[k] || {}).name || '') }; }).filter(function (x) { return x.name; });
    shadow = toShape();
    persist();
    // keep whatever is being typed in the main view
    var el = document.activeElement, keep = el && el.id && $main.contains(el) ? { id: el.id, v: el.value } : null;
    render();
    if (keep && document.getElementById(keep.id)) { var n = document.getElementById(keep.id); n.value = keep.v; n.focus(); }
  }
  window.onRemote = applyShape;
  window.onSync = function (s) {
    sync = s;
    if (!s.household) shadow = null;
    if (ui.sheet === 'sync') syncSheet();
    render();
    if (s.message) toast(s.message);
  };

  var ui = { tab: 'plan', week: 0, filter: 'all', search: '', gweek: 0, sheet: null, undo: null };

  // ---------- meals ----------
  function allMeals() { return window.BUILTIN_MEALS.concat(state.custom); }
  function meal(id) {
    if (!id) return null;
    if (SPECIAL[id]) return SPECIAL[id];
    var list = allMeals();
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }
  function isFav(m) { return m.id in state.fav ? state.fav[m.id] : !!m.fav; }
  function isCustom(m) { return m.id.charAt(0) === 'c'; }
  function parseIng(s) {
    var p = s.split('|'), q = p[0].trim().split(' ');
    return { qty: parseFloat(q[0]) || 0, unit: q[1] || 'x', name: p[1], aisle: p[2] || 'O' };
  }
  function ptsClass(p) { return p <= 5 ? 'pt-lo' : p <= 8 ? 'pt-mid' : 'pt-hi'; }

  // ---------- planning ----------
  function shuffle(a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  function eligible() {
    return allMeals().filter(function (m) {
      if (state.hidden[m.id]) return false;
      if (state.maxPts && m.pts != null && m.pts > state.maxPts) return false;
      return true;
    });
  }
  function proteinAt(plan, i) {
    if (i < 0 || i >= DAYS) return null;
    var m = meal(plan[i].id);
    return m && !m.special ? m.protein : null;
  }

  /** Fill every unlocked day. Favourites form the backbone; `newPerWeek` slots per week go to
      meals that are not favourites yet. No meal repeats in the fortnight while the library allows it,
      and the same protein is kept off back-to-back nights where possible. */
  function buildPlan() {
    var pool = eligible();
    if (!pool.length) { toast('No meals match your settings'); return; }
    var prev = JSON.stringify(state.plan);
    var plan = state.plan.map(function (s) { return s.locked && s.id ? { id: s.id, locked: true } : { id: null, locked: false }; });
    var used = {};
    plan.forEach(function (s) { if (s.id) used[s.id] = true; });
    var favs = shuffle(pool.filter(isFav)), news = shuffle(pool.filter(function (m) { return !isFav(m); }));
    function take(list) {
      for (var i = 0; i < list.length; i++) if (!used[list[i].id]) { used[list[i].id] = true; return list[i]; }
      return null;
    }
    for (var w = 0; w < 2; w++) {
      var open = [];
      for (var d = w * 7; d < w * 7 + 7; d++) if (!plan[d].id) open.push(d);
      var picks = [], wantNew = Math.min(state.newPerWeek, open.length);
      for (var n = 0; n < open.length; n++) {
        var m = n < wantNew ? (take(news) || take(favs)) : (take(favs) || take(news));
        if (!m) m = pool[Math.floor(Math.random() * pool.length)]; // library smaller than the fortnight
        picks.push(m);
      }
      picks = shuffle(picks);
      open.forEach(function (d) {
        var before = proteinAt(plan, d - 1), after = proteinAt(plan, d + 1), at = -1;
        for (var i = 0; i < picks.length && at < 0; i++) if (picks[i].protein !== before && picks[i].protein !== after) at = i;
        for (i = 0; i < picks.length && at < 0; i++) if (picks[i].protein !== before) at = i;
        if (at < 0) at = 0;
        plan[d].id = picks.splice(at, 1)[0].id;
      });
    }
    state.plan = plan; state.checked = {};
    save(); render();
    toast('New 2-week plan ready', function () { state.plan = JSON.parse(prev); save(); render(); });
  }

  function swapDay(d) {
    var inPlan = {};
    state.plan.forEach(function (s) { if (s.id) inPlan[s.id] = true; });
    var pool = eligible().filter(function (m) { return !inPlan[m.id]; });
    if (!pool.length) pool = eligible().filter(function (m) { return m.id !== state.plan[d].id; });
    if (!pool.length) { toast('Nothing else to swap in'); return; }
    var before = proteinAt(state.plan, d - 1), after = proteinAt(state.plan, d + 1);
    var nice = pool.filter(function (m) { return m.protein !== before && m.protein !== after; });
    var list = nice.length ? nice : pool;
    setDay(d, list[Math.floor(Math.random() * list.length)].id);
  }
  function setDay(d, id) {
    var prev = JSON.stringify(state.plan);
    state.plan[d].id = id;
    if (!id) state.plan[d].locked = false;
    save(); render();
    toast(id ? 'Supper changed' : 'Day cleared', function () { state.plan = JSON.parse(prev); save(); render(); });
  }

  function dayDate(d) {
    var p = state.startDate.split('-');
    return new Date(+p[0], +p[1] - 1, +p[2] + d, 12);
  }
  function dayLabel(d) { var x = dayDate(d); return WEEKDAYS[x.getDay()] + ' ' + MONTHS[x.getMonth()] + ' ' + x.getDate(); }

  // ---------- groceries ----------
  var WHOLE = { x: 1, can: 1, jar: 1, pkg: 1, bag: 1, box: 1, carton: 1, head: 1, bunch: 1, loaf: 1, bottle: 1, pint: 1, dozen: 1 };
  var NO_PLURAL = { lb: 1, oz: 1, tbsp: 1, tsp: 1, g: 1, kg: 1, ml: 1, l: 1 };
  function fmtQty(n, unit) {
    if (!n) return '';
    n = WHOLE[unit] ? Math.ceil(n - 1e-6) : Math.ceil(n * 4 - 1e-6) / 4;
    var whole = Math.floor(n), frac = n - whole;
    var f = frac === 0.25 ? '¼' : frac === 0.5 ? '½' : frac === 0.75 ? '¾' : '';
    var num = (whole || !f ? whole : '') + f;
    if (unit === 'x') return num;
    var u = unit;
    if (n > 1 && !NO_PLURAL[unit]) u += /(x|ch|s)$/.test(unit) ? 'es' : unit === 'loaf' ? '' : 's';
    if (u === 'loafs' || (unit === 'loaf' && n > 1)) u = 'loaves';
    return num + ' ' + u;
  }
  /** week: 0 = both, 1 or 2. Returns [{aisle, items:[{key,name,qty,meals}]}] */
  function groceries(week) {
    var scale = state.familySize / BASE_SIZE, map = {}, order = [];
    state.plan.forEach(function (slot, d) {
      if (week && Math.floor(d / 7) + 1 !== week) return;
      var m = meal(slot.id);
      if (!m || m.special) return;
      (m.ing || []).forEach(function (s) {
        var g = parseIng(s), key = g.name.toLowerCase().trim();
        if (!key) return;
        var e = map[key];
        if (!e) { e = map[key] = { key: key, name: g.name, aisle: g.aisle, units: {}, meals: [] }; order.push(e); }
        // custom meals are entered for the family as-is; only built-ins are rescaled
        e.units[g.unit] = (e.units[g.unit] || 0) + g.qty * (isCustom(m) ? 1 : scale);
        if (e.meals.indexOf(m.name) < 0) e.meals.push(m.name);
      });
    });
    state.extras.forEach(function (x) {
      var key = 'extra:' + x.id;
      order.push({ key: key, name: x.name, aisle: 'O', units: {}, meals: [], extra: x.id });
    });
    var groups = [];
    AISLE_ORDER.forEach(function (a) {
      if (a === 'S' && state.hideStaples) return;
      var items = order.filter(function (e) { return (AISLES[e.aisle] ? e.aisle : 'O') === a; });
      if (!items.length) return;
      items.sort(function (x, y) { return x.name.localeCompare(y.name); });
      items.forEach(function (e) {
        e.qty = Object.keys(e.units).map(function (u) { return fmtQty(e.units[u], u); }).filter(Boolean).join(' + ');
      });
      groups.push({ aisle: a, items: items });
    });
    return groups;
  }
  function countLeft() {
    var n = 0;
    groceries(0).forEach(function (g) { g.items.forEach(function (i) { if (!state.checked[i.key]) n++; }); });
    return n;
  }

  // ---------- share text ----------
  function planText() {
    var out = ['Glonky Jobo: Supper Plan', 'Family of ' + state.familySize];
    for (var w = 0; w < 2; w++) {
      out.push('', 'WEEK ' + (w + 1));
      for (var d = w * 7; d < w * 7 + 7; d++) {
        var m = meal(state.plan[d].id);
        var line = dayLabel(d) + ': ' + (m ? m.name : '(not planned)');
        if (m && m.pts != null) line += ' (' + m.pts + ' pts)';
        out.push(line);
      }
    }
    return out.join('\n');
  }
  function groceryText(week) {
    var title = 'Grocery List: ' + (week ? 'Week ' + week + ' (' + dayLabel((week - 1) * 7) + ' to ' + dayLabel(week * 7 - 1) + ')' : 'Both weeks');
    var out = [title], any = false;
    groceries(week).forEach(function (g) {
      var items = g.items.filter(function (i) { return !state.checked[i.key]; });
      if (!items.length) return;
      any = true;
      out.push('', AISLES[g.aisle].toUpperCase());
      items.forEach(function (i) { out.push(i.name + (i.qty ? ' - ' + i.qty : '')); });
    });
    if (!any) out.push('', 'Nothing left to buy.');
    return out.join('\n');
  }
  function share(title, text) {
    if (bridge) { bridge.share(title, text); return; }
    if (navigator.share) { navigator.share({ title: title, text: text }).catch(function () {}); return; }
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(function () { toast('Copied to clipboard'); });
    window.__lastShare = { title: title, text: text };
  }

  // ---------- rendering ----------
  var $main = document.getElementById('main'), $sheet = document.getElementById('sheet'), $scrim = document.getElementById('scrim');
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function icon(name) {
    var p = {
      swap: '<path d="M4 7h13l-3-3M20 17H7l3 3"/>',
      lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
      unlock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 7.5-2"/>',
      edit: '<path d="M4 20h4L19 9l-4-4L4 16zM13 7l4 4"/>',
      close: '<path d="M6 6l12 12M18 6L6 18"/>',
      check: '<path d="M5 12l5 5 9-10"/>',
      plus: '<path d="M12 5v14M5 12h14"/>',
      spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2.3L22 19l-2.3.7L19 22l-.7-2.3L16 19l2.3-.7z"/>',
      trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'
    }[name];
    return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + p + '</svg>';
  }
  function heartSvg(on) {
    return '<svg viewBox="0 0 24 24" width="22" height="22" fill="' + (on ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>';
  }
  function chips(m, inPlan) {
    var h = '';
    if (m.pts != null) h += '<span class="chip ' + ptsClass(m.pts) + '">' + m.pts + ' pts</span>';
    if (m.protein && PROTEINS[m.protein] && m.protein !== 'other') h += '<span class="chip">' + PROTEINS[m.protein] + '</span>';
    if (m.mins) h += '<span class="chip">' + m.mins + ' min</span>';
    if (inPlan && !isFav(m)) h += '<span class="chip new">New to try</span>';
    if (!inPlan && isCustom(m)) h += '<span class="chip new">Our recipe</span>';
    if (inPlan && isFav(m)) h += '<span class="chip fav">♥ Favourite</span>';
    return h;
  }

  function renderPlan() {
    var w = ui.week, h = '', planned = 0, pts = 0, ptsN = 0, nNew = 0;
    for (var d = w * 7; d < w * 7 + 7; d++) {
      var m = meal(state.plan[d].id);
      if (m) { planned++; if (m.pts != null) { pts += m.pts; ptsN++; } if (!m.special && !isFav(m)) nNew++; }
    }
    h += '<div class="seg"><button data-act="week" data-v="0" class="' + (w === 0 ? 'on' : '') + '">Week 1</button>' +
         '<button data-act="week" data-v="1" class="' + (w === 1 ? 'on' : '') + '">Week 2</button></div>';
    h += '<div class="row" style="margin-top:10px"><button class="btn grow" data-act="build">' + icon('spark') + (state.plan.some(function (s) { return s.id; }) ? 'Re-plan unlocked days' : 'Plan my 2 weeks') + '</button></div>';
    h += '<p class="summary">' + dayLabel(w * 7) + ' to ' + dayLabel(w * 7 + 6) + ' · ' + planned + '/7 planned' +
         (ptsN ? ' · avg ' + (Math.round(pts / ptsN * 10) / 10) + ' pts' : '') + (nNew ? ' · ' + nNew + ' new' : '') + '</p><div class="days">';
    for (d = w * 7; d < w * 7 + 7; d++) {
      var s = state.plan[d]; m = meal(s.id);
      h += '<div class="day"><div class="day-head"><span class="day-date"><b>' + esc(dayLabel(d).slice(0, 3)) + '</b>' + esc(dayLabel(d).slice(3)) + '</span><div class="day-tools">';
      if (m) h += '<button class="mini' + (s.locked ? ' on' : '') + '" data-act="lock" data-d="' + d + '" aria-label="' + (s.locked ? 'Unlock' : 'Lock') + ' this supper">' + icon(s.locked ? 'lock' : 'unlock') + '</button>' +
                  '<button class="mini" data-act="swap" data-d="' + d + '" aria-label="Suggest a different supper">' + icon('swap') + '</button>';
      h += '<button class="mini" data-act="pick" data-d="' + d + '" aria-label="Choose a supper">' + icon('edit') + '</button></div></div>';
      if (m) {
        h += '<button class="day-body" data-act="' + (m.special ? 'pick' : 'detail') + '" data-id="' + esc(m.id) + '" data-d="' + d + '"><p class="day-name">' + esc(m.name) + '</p>' +
             (m.special ? '' : '<div class="chips">' + chips(m, true) + '</div>') + '</button>';
      } else {
        h += '<button class="day-body" data-act="pick" data-d="' + d + '"><p class="day-name day-empty">Tap to choose a supper</p></button>';
      }
      h += '</div>';
    }
    h += '</div>';
    $main.innerHTML = h;
  }

  var FILTERS = [['all', 'All'], ['fav', '♥ Favourites'], ['new', 'New to try'], ['mine', 'Our recipes'], ['low', 'Low point'], ['quick', '30 min or less'], ['hidden', 'Hidden']];
  function filterMeals() {
    var q = ui.search.trim().toLowerCase();
    return allMeals().filter(function (m) {
      var hid = !!state.hidden[m.id];
      if (ui.filter === 'hidden') { if (!hid) return false; } else if (hid) return false;
      if (ui.filter === 'fav' && !isFav(m)) return false;
      if (ui.filter === 'new' && (isFav(m) || isCustom(m))) return false;
      if (ui.filter === 'mine' && !isCustom(m)) return false;
      if (ui.filter === 'low' && !(m.pts != null && m.pts <= 5)) return false;
      if (ui.filter === 'quick' && !(m.mins && m.mins <= 30)) return false;
      if (q && (m.name + ' ' + (PROTEINS[m.protein] || '') + ' ' + (m.tags || []).join(' ')).toLowerCase().indexOf(q) < 0) return false;
      return true;
    }).sort(function (a, b) { return (isFav(b) - isFav(a)) || a.name.localeCompare(b.name); });
  }
  function mealListHtml() {
    var list = filterMeals();
    if (!list.length) {
      return '<div class="empty"><b>No meals here yet</b>' + (ui.filter === 'mine' ? 'Add your family’s own suppers with the button above.' : 'Try a different filter or search.') + '</div>';
    }
    return list.map(function (m) {
      return '<div class="meal"><button class="meal-main" data-act="detail" data-id="' + esc(m.id) + '"><p class="meal-name">' + esc(m.name) + '</p><div class="chips">' + chips(m, false) + '</div></button>' +
             '<button class="heart' + (isFav(m) ? ' on' : '') + '" data-act="fav" data-id="' + esc(m.id) + '" aria-label="' + (isFav(m) ? 'Remove from' : 'Add to') + ' favourites">' + heartSvg(isFav(m)) + '</button></div>';
    }).join('');
  }
  function renderMeals() {
    var h = '<div class="row"><input class="grow" id="search" type="search" placeholder="Search meals" value="' + esc(ui.search) + '">' +
            '<button class="btn" data-act="add">' + icon('plus') + 'Add</button></div>';
    h += '<div class="filters" style="margin-top:10px">' + FILTERS.map(function (f) {
      return '<button data-act="filter" data-v="' + f[0] + '" class="' + (ui.filter === f[0] ? 'on' : '') + '">' + f[1] + '</button>';
    }).join('') + '</div><div id="meal-list">' + mealListHtml() + '</div>';
    $main.innerHTML = h;
  }

  function renderGrocery() {
    var groups = groceries(ui.gweek), total = 0, done = 0;
    groups.forEach(function (g) { g.items.forEach(function (i) { total++; if (state.checked[i.key]) done++; }); });
    var h = '<div class="seg">' + [['0', 'Both weeks'], ['1', 'Week 1'], ['2', 'Week 2']].map(function (o) {
      return '<button data-act="gweek" data-v="' + o[0] + '" class="' + (ui.gweek === +o[0] ? 'on' : '') + '">' + o[1] + '</button>';
    }).join('') + '</div>';
    h += '<div class="row" style="margin-top:10px"><input class="grow" id="extra" type="text" placeholder="Add an item (milk, lunch snacks…)" enterkeyhint="done">' +
         '<button class="btn" data-act="extra" aria-label="Add item">' + icon('plus') + '</button></div>';
    if (!total) {
      h += '<div class="empty"><b>Your list is empty</b>Plan some suppers and the ingredients will show up here, scaled for ' + state.familySize + '.</div>';
    } else {
      h += '<div class="progress"><i style="width:' + Math.round(done / total * 100) + '%"></i></div>' +
           '<p class="summary">' + done + ' of ' + total + ' in the cart · scaled for ' + state.familySize + '</p>';
      groups.forEach(function (g) {
        h += '<div class="aisle"><span>' + esc(AISLES[g.aisle]) + '</span><span>' + g.items.length + '</span></div><div class="glist">';
        g.items.forEach(function (i) {
          var on = !!state.checked[i.key];
          h += '<button class="gitem' + (on ? ' done' : '') + '" data-act="check" data-k="' + esc(i.key) + '" role="checkbox" aria-checked="' + on + '"><span class="box">' + icon('check') + '</span>' +
               '<span class="grow"><div class="g-name">' + esc(i.name) + '</div>' + (i.meals.length ? '<div class="g-for">' + esc(i.meals.join(' · ')) + '</div>' : '') + '</span>' +
               '<span class="g-qty">' + esc(i.qty) + '</span></button>';
        });
        h += '</div>';
      });
      h += '<div class="row" style="margin-top:16px"><button class="btn ghost grow" data-act="staples">' + (state.hideStaples ? 'Show' : 'Hide') + ' pantry staples</button>' +
           (done ? '<button class="btn ghost grow" data-act="uncheck">Uncheck all</button>' : '') + '</div>';
      if (state.extras.length) h += '<div class="row" style="margin-top:8px"><button class="btn ghost grow" data-act="clear-extras">Remove my added items</button></div>';
    }
    $main.innerHTML = h;
  }

  function render() {
    var keep = $main.scrollTop;
    if (ui.tab === 'plan') renderPlan(); else if (ui.tab === 'meals') renderMeals(); else renderGrocery();
    $main.scrollTop = keep;
    var tabs = document.querySelectorAll('#tabs button');
    for (var i = 0; i < tabs.length; i++) tabs[i].classList.toggle('on', tabs[i].getAttribute('data-tab') === ui.tab);
    var n = countLeft();
    document.getElementById('g-badge').textContent = n ? n : '';
    document.getElementById('subtitle').textContent = (sync.household ? 'Shared plan' : '2 weeks of suppers') + ' \u00B7 family of ' + state.familySize;
    document.getElementById('btn-family').classList.toggle('live', !!sync.household);
  }

  // ---------- sheets ----------
  function openSheet(title, body, foot) {
    $sheet.innerHTML = '<div class="sheet-head"><h2>' + esc(title) + '</h2><button class="icon-btn" data-act="close" aria-label="Close">' + icon('close') + '</button></div>' +
      '<div class="sheet-body">' + body + '</div>' + (foot ? '<div class="sheet-foot">' + foot + '</div>' : '');
    $sheet.classList.add('on'); $scrim.classList.add('on'); ui.sheet = true;
    $toast.classList.remove('on'); ui.undo = null;
    $sheet.querySelector('.sheet-body').scrollTop = 0;
  }
  function closeSheet() {
    $sheet.classList.remove('on'); $scrim.classList.remove('on'); ui.sheet = null;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }

  function detailSheet(id, day) {
    var m = meal(id); if (!m) return;
    var scale = isCustom(m) ? 1 : state.familySize / BASE_SIZE;
    var b = '<div class="chips">' + chips(m, false) + (m.tags || []).map(function (t) { return '<span class="chip">' + esc(t) + '</span>'; }).join('') + '</div>';
    if (m.note) b += '<p class="note">' + esc(m.note) + '</p>';
    if (m.pts != null) b += '<p class="hint">Points are an estimate per adult serving. Check the WW app for exact values.</p>';
    if (m.ing && m.ing.length) {
      b += '<h3 class="sec">Ingredients for ' + (isCustom(m) ? 'the family' : state.familySize) + '</h3><ul class="ing">' + m.ing.map(function (s) {
        var g = parseIng(s); return '<li><span>' + esc(g.name) + '</span><span>' + esc(fmtQty(g.qty * scale, g.unit)) + '</span></li>';
      }).join('') + '</ul>';
    }
    b += '<div style="margin-top:18px">';
    if (day == null) b += '<button class="btn block" data-act="add-to-plan" data-id="' + esc(m.id) + '">Add to the plan…</button>';
    if (isCustom(m)) b += '<div class="row" style="margin-top:8px"><button class="btn ghost grow" data-act="edit" data-id="' + esc(m.id) + '">' + icon('edit') + 'Edit</button><button class="btn danger grow" data-act="delete" data-id="' + esc(m.id) + '">' + icon('trash') + 'Delete</button></div>';
    else b += '<button class="btn ghost block" style="margin-top:8px" data-act="hide" data-id="' + esc(m.id) + '">' + (state.hidden[m.id] ? 'Bring back into suggestions' : 'Not for us: stop suggesting') + '</button>';
    b += '</div>';
    openSheet(m.name, b,
      '<button class="btn ghost" data-act="fav" data-id="' + esc(m.id) + '" data-reopen="' + (day == null ? '' : day) + '">' + heartSvg(isFav(m)) + (isFav(m) ? 'Favourite' : 'Add to favourites') + '</button>' +
      (day != null ? '<button class="btn" data-act="swap" data-d="' + day + '" data-close="1">' + icon('swap') + 'Swap</button>' : ''));
  }

  function pickSheet(day) {
    ui.pickDay = day; ui.pickQ = '';
    openSheet('Supper for ' + dayLabel(day),
      '<input id="pick-q" type="search" placeholder="Search meals"><div id="pick-list" style="margin-top:10px">' + pickListHtml() + '</div>');
  }
  function pickListHtml() {
    var q = (ui.pickQ || '').toLowerCase(), day = ui.pickDay;
    var list = allMeals().filter(function (m) { return !state.hidden[m.id] && (!q || m.name.toLowerCase().indexOf(q) >= 0); })
      .sort(function (a, b) { return (isFav(b) - isFav(a)) || a.name.localeCompare(b.name); });
    var h = '';
    if (!q) {
      h += '<button class="opt" data-act="set" data-d="' + day + '" data-id="_left"><span class="ico">↻</span><span><b>Leftovers night</b><small>Nothing to buy</small></span></button>' +
           '<button class="opt" data-act="set" data-d="' + day + '" data-id="_out"><span class="ico">↗</span><span><b>Eating out / takeout</b><small>Nothing to buy</small></span></button>';
      if (state.plan[day].id) h += '<button class="opt" data-act="set" data-d="' + day + '" data-id=""><span class="ico">×</span><span><b>Clear this day</b></span></button>';
      h += '<h3 class="sec">Meal library</h3>';
    }
    h += list.map(function (m) {
      return '<div class="meal"><button class="meal-main" data-act="set" data-d="' + day + '" data-id="' + esc(m.id) + '"><p class="meal-name">' + esc(m.name) + '</p><div class="chips">' + chips(m, false) + (isFav(m) ? '<span class="chip fav">♥</span>' : '') + '</div></button></div>';
    }).join('');
    return h || '<div class="empty">No matches</div>';
  }

  function addToPlanSheet(id) {
    var m = meal(id), h = '<p class="hint" style="margin:0 0 10px">Pick a night for ' + esc(m.name) + '.</p>';
    for (var d = 0; d < DAYS; d++) {
      var cur = meal(state.plan[d].id);
      if (d % 7 === 0) h += '<h3 class="sec">Week ' + (d / 7 + 1) + '</h3>';
      h += '<button class="opt" data-act="set" data-d="' + d + '" data-id="' + esc(id) + '"><span><b>' + esc(dayLabel(d)) + '</b><small>' + (cur ? 'Replaces ' + esc(cur.name) : 'Open') + '</small></span></button>';
    }
    openSheet('Add to the plan', h);
  }

  // custom meal form ------------------------------------------------------------------
  var UNIT_ALIASES = { lb: 'lb', lbs: 'lb', pound: 'lb', pounds: 'lb', oz: 'oz', ounce: 'oz', ounces: 'oz', g: 'g', kg: 'kg', ml: 'ml', l: 'l',
    cup: 'cup', cups: 'cup', tbsp: 'tbsp', tablespoon: 'tbsp', tablespoons: 'tbsp', tsp: 'tsp', teaspoon: 'tsp', teaspoons: 'tsp',
    can: 'can', cans: 'can', jar: 'jar', jars: 'jar', pkg: 'pkg', pack: 'pkg', packs: 'pkg', package: 'pkg', packages: 'pkg',
    bag: 'bag', bags: 'bag', box: 'box', boxes: 'box', carton: 'carton', cartons: 'carton', head: 'head', heads: 'head',
    bunch: 'bunch', bunches: 'bunch', loaf: 'loaf', loaves: 'loaf', bottle: 'bottle', bottles: 'bottle', pint: 'pint', pints: 'pint', dozen: 'dozen' };
  var AISLE_WORDS = [
    ['M', /chicken|beef|pork|turkey|steak|bacon|sausage|ham\b|salmon|cod\b|fish|shrimp|tilapia|meatball|roast|pepperoni|lamb/],
    ['F', /frozen|ice cream/],
    ['D', /milk|cheese|cheddar|mozzarella|parmesan|yogurt|yoghurt|butter|egg|cream|tortellini|feta/],
    ['B', /bread|bun|tortilla|naan|pita|bagel|muffin|roll|wrap|loaf/],
    ['S', /\boil\b|salt|pepper\b|spice|seasoning|flour|sugar|vinegar|soy sauce|honey|ketchup|mustard|cornstarch|oregano|cumin|paprika|powder|syrup/],
    ['G', /rice|pasta|spaghetti|penne|macaroni|noodle|bean|sauce|salsa|broth|stock|soup|canned|\bcan\b|cereal|oats|cracker|panko|breadcrumb|lentil|couscous|quinoa|tuna|mix\b/],
    ['P', /potato|carrot|onion|garlic|pepper|broccoli|lettuce|tomato|cucumber|apple|banana|berry|berries|lemon|lime|spinach|corn|celery|squash|zucchini|mushroom|avocado|cabbage|cauliflower|bean sprout|green bean|pea\b|peas\b|herb|cilantro|parsley|ginger|fruit|grape|orange|kale|salad/]
  ];
  function guessAisle(name) {
    var n = name.toLowerCase();
    if (/green bean|sweet potato|bell pepper/.test(n)) return 'P';
    for (var i = 0; i < AISLE_WORDS.length; i++) if (AISLE_WORDS[i][1].test(n)) return AISLE_WORDS[i][0];
    return 'O';
  }
  /** "2.5 lb chicken breast" / "1 1/2 cups rice" / "3 bell peppers" / "salsa" -> "qty unit|name|aisle" */
  function parseLine(line) {
    line = line.replace(/\|/g, ' ').replace(/^[\s\-*•]+/, '').trim();
    if (!line) return null;
    var qty = 1, rest = line, mm;
    if ((mm = rest.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)\s*/))) { qty = +mm[1] + mm[2] / mm[3]; rest = rest.slice(mm[0].length); }
    else if ((mm = rest.match(/^(\d+)\s*\/\s*(\d+)\s*/))) { qty = mm[1] / mm[2]; rest = rest.slice(mm[0].length); }
    else if ((mm = rest.match(/^(\d+(?:[.,]\d+)?)\s*/))) { qty = parseFloat(mm[1].replace(',', '.')); rest = rest.slice(mm[0].length); }
    var unit = 'x';
    if ((mm = rest.match(/^([a-zA-Z]+)\.?\s+(?:of\s+)?(.+)$/)) && UNIT_ALIASES[mm[1].toLowerCase()]) { unit = UNIT_ALIASES[mm[1].toLowerCase()]; rest = mm[2]; }
    rest = rest.trim();
    if (!rest) return null;
    rest = rest.charAt(0).toUpperCase() + rest.slice(1);
    return (Math.round(qty * 100) / 100) + ' ' + unit + '|' + rest + '|' + guessAisle(rest);
  }
  function ingToLine(s) { var g = parseIng(s); return (g.unit === 'x' ? g.qty : g.qty + ' ' + g.unit) + ' ' + g.name; }

  function formSheet(id) {
    var m = id ? meal(id) : null;
    ui.editing = id || null;
    var b = '<label class="f" for="f-name">Meal name</label><input id="f-name" type="text" maxlength="80" placeholder="e.g. Grandma’s chicken pot pie" value="' + esc(m ? m.name : '') + '">' +
      '<div class="two"><div><label class="f" for="f-protein">Main protein</label><select id="f-protein">' + Object.keys(PROTEINS).map(function (k) {
        return '<option value="' + k + '"' + ((m ? m.protein : 'chicken') === k ? ' selected' : '') + '>' + PROTEINS[k] + '</option>';
      }).join('') + '</select></div>' +
      '<div><label class="f" for="f-pts">WW points <small>optional</small></label><input id="f-pts" type="number" inputmode="numeric" min="0" max="60" placeholder="per serving" value="' + (m && m.pts != null ? m.pts : '') + '"></div></div>' +
      '<label class="f" for="f-mins">Minutes to make <small>optional</small></label><input id="f-mins" type="number" inputmode="numeric" min="0" max="600" value="' + (m && m.mins ? m.mins : '') + '">' +
      '<label class="f" for="f-ing">Ingredients <small>one per line, with the amount your family needs</small></label>' +
      '<textarea id="f-ing" rows="6" placeholder="2.5 lb chicken breast&#10;2 cups rice&#10;3 bell peppers&#10;1 jar salsa">' + esc(m ? (m.ing || []).map(ingToLine).join('\n') : '') + '</textarea>' +
      '<p class="hint">These go straight onto the grocery list and are sorted into aisles automatically.</p>' +
      '<label class="f" for="f-note">Note <small>optional</small></label><input id="f-note" type="text" maxlength="200" placeholder="Kid tips, sides, where the recipe lives" value="' + esc(m ? m.note : '') + '">' +
      (m ? '' : '<label class="check-row"><input id="f-fav" type="checkbox" checked> Mark as a family favourite</label>');
    openSheet(m ? 'Edit meal' : 'Add our own meal', b, '<button class="btn ghost" data-act="close">Cancel</button><button class="btn" data-act="save-meal">Save meal</button>');
  }
  function saveMeal() {
    var name = val('f-name').trim();
    if (!name) { toast('Give the meal a name'); document.getElementById('f-name').focus(); return; }
    var pts = val('f-pts'), mins = val('f-mins');
    var data = {
      name: name, protein: val('f-protein'), pts: pts === '' ? null : Math.max(0, Math.round(+pts)), mins: mins === '' ? null : Math.max(0, Math.round(+mins)),
      note: val('f-note').trim(), tags: [], ing: val('f-ing').split('\n').map(parseLine).filter(Boolean)
    };
    if (ui.editing) {
      var m = meal(ui.editing); for (var k in data) m[k] = data[k];
    } else {
      data.id = 'c' + Date.now().toString(36);
      state.custom.push(data);
      state.fav[data.id] = document.getElementById('f-fav').checked;
      ui.filter = 'mine'; ui.search = '';
    }
    save(); closeSheet(); render(); toast(ui.editing ? 'Meal updated' : 'Added to your meals');
  }
  function val(id) { return document.getElementById(id).value; }

  function settingsSheet() {
    function stepper(key, label, hint) {
      return '<label class="f">' + label + '</label><div class="stepper"><button data-act="step" data-k="' + key + '" data-v="-1" aria-label="Less">−</button><output id="o-' + key + '">' + stepText(key) + '</output><button data-act="step" data-k="' + key + '" data-v="1" aria-label="More">+</button></div>' + (hint ? '<p class="hint">' + hint + '</p>' : '');
    }
    openSheet('Plan settings',
      stepper('familySize', 'Family size', 'Grocery amounts are scaled to this many people.') +
      '<label class="f" for="s-date">Plan starts on</label><input id="s-date" type="date" value="' + esc(state.startDate) + '">' +
      stepper('newPerWeek', 'New meals to try each week', 'The rest of each week comes from your favourites.') +
      stepper('maxPts', 'Weight Watchers limit', 'Only suggest suppers at or under this many points per serving.') +
      '<div style="margin-top:22px"><button class="btn danger block" data-act="reset">Clear the whole plan</button></div>',
      '<button class="btn" data-act="close">Done</button>');
  }
  var STEP = { familySize: [1, 12], newPerWeek: [0, 7], maxPts: [0, 12] };
  function stepText(k) {
    var v = state[k];
    if (k === 'maxPts') return v ? v + ' pts or less' : 'No limit';
    if (k === 'familySize') return v + (v === 1 ? ' person' : ' people');
    return v + ' of 7 nights';
  }

  function shareSheet() {
    function opt(act, ico, title, sub) { return '<button class="opt" data-act="do-share" data-v="' + act + '"><span class="ico">' + ico + '</span><span><b>' + title + '</b><small>' + sub + '</small></span></button>'; }
    openSheet('Share',
      '<p class="hint" style="margin:0 0 12px">Sends plain text to Messages, Google Keep, email or any other app.</p>' +
      opt('plan', '📅', 'Meal plan', 'All 14 suppers with dates') +
      opt('g0', '🛒', 'Grocery list: both weeks', 'One big shop, sorted by aisle') +
      opt('g1', '1', 'Grocery list: week 1', dayLabel(0) + ' to ' + dayLabel(6)) +
      opt('g2', '2', 'Grocery list: week 2', dayLabel(7) + ' to ' + dayLabel(13)) +
      opt('all', '★', 'Everything', 'Meal plan plus a grocery list for each week') +
      '<p class="hint">Items you have already ticked off are left out of shared lists.</p>');
  }
  function doShare(v) {
    closeSheet();
    if (v === 'plan') share('Supper plan', planText());
    else if (v === 'all') share('Supper plan and groceries', planText() + '\n\n' + groceryText(1) + '\n\n' + groceryText(2));
    else share('Grocery list', groceryText(+v.slice(1)));
  }

  function syncSheet() {
    var b;
    if (!sync.available) {
      b = '<p class="note" style="margin-top:0">Family sharing lets two phones work on the same supper plan and grocery list, saved under your Google account.</p>' +
          '<p class="note">It is not switched on in this copy of the app yet. It needs a free Firebase project created with your Google account; the steps are in SHARING-SETUP.md.</p>';
    } else if (!sync.user) {
      b = '<p class="note" style="margin-top:0">Sign in to keep the plan in your Google account and work on it together from two phones.</p>' +
          '<button class="btn block" style="margin-top:14px" data-act="g-signin">Sign in with Google</button>';
    } else if (!sync.household) {
      b = '<p class="note" style="margin-top:0">Signed in as ' + esc(sync.user.email || sync.user.name) + '</p>' +
          '<h3 class="sec">Start sharing</h3><button class="opt" data-act="g-create"><span class="ico">+</span><span><b>Share this phone\u2019s plan</b><small>Creates a family code to send to someone</small></span></button>' +
          '<h3 class="sec">Or join a family</h3><div class="row"><input class="grow" id="join-code" type="text" maxlength="12" autocapitalize="characters" autocomplete="off" placeholder="Family code">' +
          '<button class="btn" data-act="g-join">Join</button></div><p class="hint">Joining replaces the plan on this phone with the shared one.</p>' +
          '<div style="margin-top:22px"><button class="btn ghost block" data-act="g-signout">Sign out</button></div>';
    } else {
      b = '<p class="note" style="margin-top:0">Everyone with this code sees the same plan, meals and grocery list. Changes show up on the other phone within seconds.</p>' +
          '<div class="code">' + esc(sync.household) + '</div>' +
          '<button class="btn block" data-act="g-invite">Send the family code</button>' +
          '<h3 class="sec">Sharing with</h3><ul class="ing">' + (sync.members.length ? sync.members : ['Just you so far']).map(function (n) { return '<li><span>' + esc(n) + '</span></li>'; }).join('') + '</ul>' +
          '<p class="hint">Signed in as ' + esc(sync.user.email || sync.user.name) + '</p>' +
          '<div class="row" style="margin-top:18px"><button class="btn ghost grow" data-act="g-leave">Stop sharing</button><button class="btn ghost grow" data-act="g-signout">Sign out</button></div>';
    }
    if (sync.busy) b += '<p class="hint" style="text-align:center;margin-top:14px">Working\u2026 this needs an internet connection.</p>';
    var val = (document.getElementById('join-code') || {}).value;
    openSheet('Family sharing', b);
    ui.sheet = 'sync';
    if (val && document.getElementById('join-code')) document.getElementById('join-code').value = val;
  }

  // ---------- toast ----------
  var toastTimer, $toast = document.getElementById('toast');
  function toast(msg, undo) {
    ui.undo = undo || null;
    $toast.innerHTML = '<span>' + esc(msg) + '</span>' + (undo ? '<button data-act="undo">Undo</button>' : '');
    $toast.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { $toast.classList.remove('on'); ui.undo = null; }, undo ? 5000 : 2200);
  }

  // ---------- events ----------
  function addExtra() {
    var el = document.getElementById('extra'), name = el.value.trim();
    if (!name) { el.focus(); return; }
    state.extras.push({ id: Date.now().toString(36), name: name.charAt(0).toUpperCase() + name.slice(1) });
    save(); render();
    document.getElementById('extra').focus();
  }
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest('[data-act], [data-tab]');
    if (!t) return;
    if (t.hasAttribute('data-tab')) { ui.tab = t.getAttribute('data-tab'); $main.scrollTop = 0; render(); return; }
    var act = t.getAttribute('data-act'), id = t.getAttribute('data-id'), d = t.hasAttribute('data-d') ? +t.getAttribute('data-d') : null, v = t.getAttribute('data-v');
    switch (act) {
      case 'week': ui.week = +v; $main.scrollTop = 0; render(); break;
      case 'gweek': ui.gweek = +v; render(); break;
      case 'build': buildPlan(); break;
      case 'swap': if (t.getAttribute('data-close')) closeSheet(); swapDay(d); break;
      case 'lock': state.plan[d].locked = !state.plan[d].locked; save(); render(); toast(state.plan[d].locked ? 'Locked: re-planning will keep this supper' : 'Unlocked'); break;
      case 'pick': pickSheet(d); break;
      case 'set': closeSheet(); setDay(d, id || null); if (ui.tab !== 'plan') { ui.tab = 'plan'; ui.week = d < 7 ? 0 : 1; render(); } break;
      case 'detail': detailSheet(id, d); break;
      case 'add-to-plan': addToPlanSheet(id); break;
      case 'fav': {
        var m = meal(id); state.fav[id] = !isFav(m); save(); render();
        if (ui.sheet) { var r = t.getAttribute('data-reopen'); detailSheet(id, r === '' || r == null ? null : +r); }
        break;
      }
      case 'hide':
        if (state.hidden[id]) delete state.hidden[id]; else state.hidden[id] = true;
        save(); closeSheet(); render(); toast(state.hidden[id] ? 'Hidden from suggestions' : 'Back in suggestions'); break;
      case 'filter': ui.filter = v; render(); break;
      case 'add': formSheet(null); break;
      case 'edit': formSheet(id); break;
      case 'save-meal': saveMeal(); break;
      case 'delete': {
        var keep = JSON.stringify({ c: state.custom, p: state.plan });
        state.custom = state.custom.filter(function (x) { return x.id !== id; });
        state.plan.forEach(function (s) { if (s.id === id) { s.id = null; s.locked = false; } });
        save(); closeSheet(); render();
        toast('Meal deleted', function () { var o = JSON.parse(keep); state.custom = o.c; state.plan = o.p; save(); render(); });
        break;
      }
      case 'check': if (state.checked[t.getAttribute('data-k')]) delete state.checked[t.getAttribute('data-k')]; else state.checked[t.getAttribute('data-k')] = true; save(); render(); break;
      case 'uncheck': state.checked = {}; save(); render(); break;
      case 'staples': state.hideStaples = !state.hideStaples; save(); render(); break;
      case 'extra': addExtra(); break;
      case 'clear-extras': state.extras = []; save(); render(); break;
      case 'step': {
        var k = t.getAttribute('data-k'), lim = STEP[k];
        state[k] = Math.min(lim[1], Math.max(lim[0], state[k] + (+v)));
        document.getElementById('o-' + k).textContent = stepText(k); save(); render(); break;
      }
      case 'reset': {
        var old = JSON.stringify(state.plan);
        state.plan = state.plan.map(function () { return { id: null, locked: false }; });
        save(); closeSheet(); render();
        toast('Plan cleared', function () { state.plan = JSON.parse(old); save(); render(); });
        break;
      }
      case 'do-share': doShare(v); break;
      case 'g-signin': if (bridge) bridge.signIn(); break;
      case 'g-signout': if (bridge) bridge.signOut(); break;
      case 'g-create': if (bridge) bridge.createFamily(JSON.stringify(toShape())); break;
      case 'g-join': {
        var code = document.getElementById('join-code').value.replace(/[^a-z0-9]/gi, '').toUpperCase();
        if (code.length < 6) { toast('Enter the family code'); break; }
        if (bridge) bridge.joinFamily(code);
        break;
      }
      case 'g-leave': if (bridge) bridge.leaveFamily(); break;
      case 'g-invite':
        share('Join our supper plan', 'Join our supper plan in Glonky Jobo.\nOpen Family sharing (the people button), sign in with Google and enter this family code:\n\n' + sync.household);
        break;
      case 'undo': if (ui.undo) { var f = ui.undo; ui.undo = null; $toast.classList.remove('on'); f(); } break;
      case 'close': closeSheet(); break;
    }
  });
  document.addEventListener('input', function (ev) {
    var t = ev.target;
    if (t.id === 'search') { ui.search = t.value; document.getElementById('meal-list').innerHTML = mealListHtml(); }
    else if (t.id === 'pick-q') { ui.pickQ = t.value; document.getElementById('pick-list').innerHTML = pickListHtml(); }
    else if (t.id === 's-date' && /^\d{4}-\d{2}-\d{2}$/.test(t.value)) { state.startDate = t.value; save(); render(); }
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && ev.target.id === 'extra') { ev.preventDefault(); addExtra(); }
    if (ev.key === 'Escape' && ui.sheet) closeSheet();
  });
  $scrim.addEventListener('click', closeSheet);
  document.getElementById('btn-share').addEventListener('click', shareSheet);
  document.getElementById('btn-settings').addEventListener('click', settingsSheet);
  document.getElementById('btn-family').addEventListener('click', syncSheet);

  /** Called by the Android back button. Returns true when the app handled it. */
  window.onBack = function () {
    if (ui.sheet) { closeSheet(); return true; }
    if (ui.tab !== 'plan') { ui.tab = 'plan'; render(); return true; }
    return false;
  };
  window.__app = { state: state, toShape: toShape, diff: diff, planText: planText, groceryText: groceryText, parseLine: parseLine, fmtQty: fmtQty, groceries: groceries };

  render();
})();
