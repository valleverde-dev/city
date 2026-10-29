// Rules tests in Node (no browser): node --test tests/core
// They exercise the core the way the Godot port will have to: through state + actions + endMonth.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { g, core, playOneRun } from './harness.mjs';

const { LEVELS, CFG } = core;
const cell = (pred) => core.S.grid.findIndex(pred);
// Fill the settlement in play to its target and end the month: it gets consolidated
function consolidateNow(){
  const S = core.S;
  S.cards = []; S.perkChoice = null; S.newcomers = CFG.target * 3;   // plenty: the month-end can still push some out
  S.grid.forEach(p => { if (p.k === 'farm' && p.st === 'land') { p.st = 'built'; p.ty = 'housing'; } });
  core.endMonth();
  return S;
}

test('every settlement of a run is an N×N site with its own grant, months and target', () => {
  for (let k = 0; k < 6; k++) {
    const S = g.newGame(42, k), lv = core.stageCfg(k);
    assert.equal(S.stage, k);
    assert.equal(S.level, Math.min(k, LEVELS.length - 1));
    assert.equal(core.N, lv.n);
    assert.equal(S.grid.length, lv.n * lv.n);
    assert.equal(S.month, 1);
    assert.equal(S.funds, lv.grant);
    assert.equal(CFG.months, lv.months);
    assert.equal(CFG.target, lv.target);
    assert.equal(S.region.blocks.length, k);
  }
  // sizes double up to 16×16, then the target keeps rising
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(k => core.stageCfg(k).n), [2, 4, 8, 16, 16, 16]);
  assert.ok(core.stageCfg(5).target > core.stageCfg(4).target && core.stageCfg(4).target > core.stageCfg(3).target);
});

test('rules switch on settlement by settlement', () => {
  g.newGame(1, 0);
  for (const f of ['access', 'permits', 'jobs', 'lose', 'events']) assert.equal(core.on(f), false, f);
  g.newGame(1, 1);
  for (const f of ['access', 'permits', 'jobs', 'combos']) assert.equal(core.on(f), true, f);
  assert.equal(core.on('lose'), false);
  g.newGame(1, 3);
  for (const f of ['lose', 'events', 'directives', 'milestones', 'market']) assert.equal(core.on(f), true, f);
  g.newGame(1, 6);
  for (const f of ['lose', 'milestones', 'market']) assert.equal(core.on(f), true, f);
});

test('the same seed plays the same game', () => {
  const a = JSON.stringify(playOneRun(7, { level: 3 }));
  const b = JSON.stringify(playOneRun(7, { level: 3 }));
  assert.equal(a, b);
  playOneRun(5, { level: 0, run: true });   // warm-up: the combo catalogue (kept between runs) is what the bot knows
  assert.equal(JSON.stringify(playOneRun(5, { level: 0, run: true })), JSON.stringify(playOneRun(5, { level: 0, run: true })));
  g.newGame(9, 4); const s1 = JSON.stringify(core.S);
  g.newGame(9, 4); const s2 = JSON.stringify(core.S);
  assert.equal(s1, s2);
});

test('buying land costs an agenda slot and money; no slots, no action', () => {
  const S = g.newGame(3, 0);
  const i = cell(p => p.st === 'land' && p.k === 'farm');
  const slots = S.slots, funds = S.funds, price = core.landPrice(S.grid[i]);
  const r = core.acquire(i);
  assert.equal(r.ok, true);
  assert.equal(S.slots, slots - 1);
  assert.equal(Math.round((funds - S.funds) * 10) / 10, price);
  assert.equal(S.grid[i].st, 'owned');
  S.slots = 0;
  const j = cell(p => p.st === 'land' && p.k === 'farm');
  if (j >= 0) assert.deepEqual(core.acquire(j).msg.k, 'err.slots');
});

test('actions answer with i18n keys, never with text', () => {
  g.newGame(3, 0);
  const r = core.acquire(cell(p => p.st === 'land' && p.k === 'farm'));
  assert.ok(r.msg && typeof r.msg.k === 'string' && /^[a-z]+\.[\w.]+$/.test(r.msg.k), JSON.stringify(r));
});

test('from settlement II a permit needs access (road, built neighbour, the village or the border)', () => {
  const S = g.newGame(5, 1);
  const i = S.grid.findIndex((p, k) => p.st === 'land' && p.k === 'farm' && !core.hasAccess(...core.rc(k)));
  if (i < 0) return; // this site has access everywhere
  Object.assign(S.grid[i], { st: 'owned', urban: true });
  S.slots = 3;
  assert.equal(core.requestPermit(i, 'housing').msg.k, 'err.noAccess');
});

test('a month passes: works advance, slots refill, the calendar moves', () => {
  const S = g.newGame(11, 0);
  const i = cell(p => p.st === 'land' && p.k === 'farm');
  core.acquire(i);
  assert.equal(core.requestPermit(i, 'housing').ok, true);
  assert.equal(S.grid[i].st, 'review');
  for (let m = 0; m < 6 && S.grid[i].st !== 'built'; m++) { core.endMonth(); while (S.cards.length) core.resolveCard(); }
  assert.ok(S.month > 1);
  assert.equal(S.grid[i].st, 'built');
  assert.equal(S.slots, CFG.slots);
});

test('meeting the target consolidates the settlement into the world: half the money stays, a perk, then the next plot', () => {
  const S = g.newGame(13, 0);
  S.funds = 10;
  consolidateNow();
  assert.equal(S.pending, 'attach');
  assert.equal(S.over, null);
  assert.equal(S.region.blocks.length, 1);
  const B = S.region.blocks[0], built = S.grid.map(p => p.st === 'built' ? p.ty : null);
  // what was built is now part of the map, at the same place
  for (let i = 0; i < 4; i++) if (built[i]) assert.equal(core.wcode(B.y + Math.floor(i / 2), B.x + i % 2), built[i]);
  assert.ok(S.region.cands.length >= 1 && S.region.cands.length <= 4);
  assert.ok(S.cards.some(c => c.type === 'consolidated'));
  assert.ok(Array.isArray(S.perkChoice) && S.perkChoice.length === 3);
  const kept = S.funds;
  assert.ok(kept > 0 && kept < 10);
  // nothing can be done until the next settlement is attached
  assert.equal(core.endMonth().ok, false);
  assert.equal(core.lobby().msg.k, 'err.slots');
  assert.equal(core.attach(0).ok, false, 'cards and the perk come first');
  while (S.cards.length) core.resolveCard();
  core.choosePerk(S.perkChoice[0]);
  const P = S.region.cands[0];
  assert.equal(core.attach(9).ok, false, 'only a plot on offer');
  assert.equal(core.attach(0).ok, true);
  assert.deepEqual([S.region.active.x, S.region.active.y, S.region.active.n], [P.x, P.y, P.n]);
  assert.equal(S.stage, 1);
  assert.equal(core.N, 4);
  assert.equal(S.month, 1);
  assert.equal(S.pending, null);
  assert.equal(S.funds, Math.round((core.stageCfg(1).grant + kept) * 10) / 10);
  assert.equal(S.perks.length + (S.shovel ? 1 : 0), 1);
});

test('the plots on offer are new land next to the region, never overlapping', () => {
  for (let k = 1; k < 7; k++) {
    g.newGame(20 + k, k);
    consolidateNow();
    const S = core.S, cs = S.region.cands;
    assert.ok(cs.length >= 1 && cs.length <= 4, `plots ${k}`);
    cs.forEach((P, j) => {
      const v = core.attachPreview(j);
      assert.equal(P.n, S.region.next.n);
      assert.equal(P.cells.length, P.n * P.n);
      for (let y = P.y; y < P.y + P.n; y++) for (let x = P.x; x < P.x + P.n; x++) assert.equal(core.wcode(y, x), null, `land already there ${k}/${j}`);
      assert.ok(cs.every((Q, q) => q === j || !(Q.x < P.x + P.n && P.x < Q.x + Q.n && Q.y < P.y + P.n && P.y < Q.y + Q.n)), `plots overlap ${k}/${j}`);
      assert.ok(v.nb.length >= 1, `touches nothing ${k}/${j}`);
      if (P.n >= 4) assert.ok(P.cells.includes('regional'), `no road on a ${P.n}×${P.n} plot`);
    });
  }
});

test('the map grows: a new plot continues the roads that reach it, and is the land you then play', () => {
  let checked = 0;
  for (let seed = 1; seed <= 20; seed++) {
    g.newGame(seed, 3); consolidateNow();
    const S = core.S;
    S.region.cands.forEach(P => {
      const n = P.n, at = (r, c) => P.cells[r * n + c];
      for (let k = 0; k < n; k++) {
        [[P.y - 1, P.x + k, 0, k], [P.y + n, P.x + k, n - 1, k], [P.y + k, P.x - 1, k, 0], [P.y + k, P.x + n, k, n - 1]].forEach(([y, x, r, c]) => {
          if (core.wcode(y, x) === 'regional') { checked++; assert.equal(at(r, c), 'regional', `road cut at ${y},${x}`); } });
      }
    });
    S.cards = []; S.perkChoice = null; assert.equal(core.attach(0).ok, true);
    const A = S.region.active;
    S.grid.forEach((p, i) => { const code = core.wcode(A.y + Math.floor(i / A.n), A.x + i % A.n);
      if (['regional', 'flood', 'habitat', 'village'].includes(code)) assert.equal(p.k, code); });
  }
  assert.ok(checked > 0, 'some roads reached a new plot');
});

test('permits are decided by political support, not dice; stubborn owners are known in advance', () => {
  const S = g.newGame(7, 1);
  const i = S.grid.findIndex((p, k) => p.k === 'farm' && core.hasAccess(...core.rc(k)) && !p.hold);
  Object.assign(S.grid[i], { st: 'owned', urban: true }); S.slots = 3;
  S.local = 20; S.neigh = 55; S.comp = 60;
  assert.ok(core.support() < CFG.approveAt);
  assert.equal(core.requestPermit(i, 'road').ok, true); S.cards = [];
  core.endMonth();
  assert.equal(S.grid[i].st, 'owned', 'low support: rejected');
  S.slots = 3; S.local = 75; core.requestPermit(i, 'road'); S.cards = [];
  core.endMonth();
  assert.ok(['approved', 'building', 'built'].includes(S.grid[i].st), 'enough support: approved');
  let held = 0; for (let seed = 1; seed <= 10; seed++) { g.newGame(seed, 2); held += core.S.grid.filter(p => p.hold).length; }
  assert.ok(held > 0);
  const T = g.newGame(3, 2), h = T.grid.findIndex(p => p.hold && p.st === 'land');
  if (h >= 0) { T.slots = 3; T.local = 60; const before = T.funds, price = core.landPrice(T.grid[h]); assert.equal(core.acquire(h).ok, true); assert.equal(Math.round((before - T.funds)*10)/10, price); }
});

test('the edge counts: the consolidated region gives access and forms combos', () => {
  const S = g.newGame(8, 3);   // a 16×16 next to made-up settlements
  assert.ok(S.frontier.length > 0);
  const f = S.frontier.find(x => x.b >= 0 && ['housing', 'factory', 'school', 'clinic', 'park'].includes(x.x));
  if (!f) return;
  // the grid parcel just inside the border, next to that building
  const r = Math.min(Math.max(f.r, 0), core.N - 1), c = Math.min(Math.max(f.c, 0), core.N - 1), i = r * core.N + c;
  Object.assign(S.grid[i], { k: 'farm', st: 'land', ty: null });
  assert.equal(core.hasAccess(r, c), true);
  // build something that pairs with the neighbour across the edge (housing next to a factory or a park, a factory next to the rest)
  Object.assign(S.grid[i], { st: 'built', ty: ['factory', 'park'].includes(f.x) ? 'housing' : 'factory' });
  const across = core.activeCombos().filter(x => x.j < 0 && x.i === i);
  assert.ok(across.length >= 1, JSON.stringify({ f, across }));
  assert.deepEqual(core.cellPos(across[0].j), [f.r, f.c]);
});

test('a settlement type and its region combos change the numbers', () => {
  const S = g.newGame(4, 2);
  S.stype = 'commuter'; S.rfx = { homes: 60 };
  const homes = core.caps().homes;
  S.rfx = {};
  assert.equal(homes - core.caps().homes, 60);
  S.rfx = { land: -0.25 };
  const p = S.grid.find(q => q.k === 'farm');
  assert.equal(core.landPrice(p), Math.round(p.price * 0.75 * 10) / 10);
  // the region pays its dividend every month
  S.rfx = {};
  const tax0 = core.taxIncome();
  S.region.blocks.push({ x: 99, y: 99, n: 2, ty: 'hamlet', res: 100, tax: 0.5 });
  assert.equal(Math.round((core.taxIncome() - tax0) * 100) / 100, 0.5);
});

test('losing ends the run and keeps the record', () => {
  const S = g.newGame(31, 3);
  const before = core.records().runs;
  S.debt = CFG.debtCap + 1; S.cards = [];
  core.endMonth();
  assert.equal(S.over && S.over.why, 'bankrupt');
  assert.equal(core.records().runs, before + 1);
  assert.ok(core.records().best.settlements >= 3);
});

test('a save restores the exact state', () => {
  g.newGame(13, 2);
  core.endMonth();
  core.save();
  const before = JSON.stringify(core.S);
  const loaded = core.loadSave();
  assert.ok(loaded);
  core.setState(loaded);
  assert.equal(JSON.stringify(core.S), before);
});

test('difficulty curve stays in its band (bot, 60 seeded runs per settlement, 60 whole runs)', () => {
  // Intentional balance changes will move these numbers: update the bands and docs/GDD.md together.
  const rate = l => { let w = 0; for (let s = 1; s <= 60; s++) if (playOneRun(s, { level: l }).win) w++; return w / 60; };
  assert.equal(rate(0), 1, 'the hamlet is always winnable');
  const r2 = rate(1), r4 = rate(3);
  assert.ok(r2 >= 0.6 && r2 <= 1, `settlement II ${r2}`);
  assert.equal(r2, 1, 'settlement II: no luck needed');
  assert.ok(r4 >= 0.3 && r4 <= 0.7, `settlement IV ${r4}`);
  let tot = 0; for (let s = 1; s <= 60; s++) tot += playOneRun(s, { level: 0, run: true }).settled;
  const avg = tot / 60;
  assert.ok(avg >= 2.5 && avg <= 6, `settlements per run ${avg}`);
});

test('the career: locked buildings, achievements unlock them, experience and ranks carry over', () => {
  core.storage.set('eurocrat_career', JSON.stringify({ xp: 0, ach: [], types: [], runs: 0, tutorial: false, guide: false }));
  const S = g.newGame(12, 1);
  assert.equal(core.unlocked('housing'), true);
  assert.equal(core.unlocked('market'), false);
  const i = S.grid.findIndex((p, k) => p.k === 'farm' && core.hasAccess(...core.rc(k)));
  Object.assign(S.grid[i], { st: 'owned', urban: true }); S.slots = 3;
  assert.equal(core.requestPermit(i, 'market').msg.k, 'err.locked');
  // finishing the first housing block earns 'firstStone', which unlocks the market
  const j = S.grid.findIndex((p, k) => k !== i && p.k === 'farm');
  Object.assign(S.grid[j], { st: 'built', ty: 'housing' }); S.cards = [];
  core.endMonth();
  assert.ok(core.career().ach.includes('firstStone'));
  assert.ok(S.newAch.includes('firstStone'));
  assert.equal(core.unlocked('market'), true);
  assert.ok(core.career().xp >= 50);
  S.slots = 3; S.local = 70; S.cards = [];
  assert.equal(core.requestPermit(i, 'market').ok, true);
  // the new buildings count in the numbers
  Object.assign(S.grid[i], { st: 'built', ty: 'market' });
  assert.ok(core.builtFx().jobs >= 60 && core.builtFx().tax >= 0.04);
  // losing a run still gives experience, and 'firstLoss'
  const xp0 = core.career().xp;
  S.debt = 999; S.cards = []; S.month = CFG.months + 1; core.endMonth();
  assert.ok(S.over && S.over.career && S.over.career.after > xp0);
  assert.ok(core.career().ach.includes('firstLoss'));
  assert.equal(core.career().runs, 1);
  // ranks: more experience, a bigger grant (only when the UI passes the bonus)
  assert.equal(core.rankOf(0), 0); assert.equal(core.rankOf(core.RANKS[2]), 2);
  const A = g.newGame(5, 0), plain = A.grant; core.newGame(5, 0, { bonus: 0.08 }); core.S.cards = [];
  assert.equal(core.S.grant, Math.round(plain * 1.08 * 10) / 10);
});

test('quick start: three different dossiers, and the run starts at 4×4 with that type and perk', () => {
  const d = core.drafts(77);
  assert.equal(d.length, 3);
  assert.equal(new Set(d.map(x => x.ty)).size, 3);
  assert.deepEqual(core.drafts(77), d, 'the same offer for the same seed');
  core.newGame(d[0].seed, 1, { ty: d[0].ty, perk: d[0].perk, country: d[0].country, guide: false });
  const S = core.S;
  assert.equal(S.stage, 1); assert.equal(core.N, 4);
  assert.equal(S.stype, d[0].ty);
  assert.ok(S.perks.includes(d[0].perk) || (d[0].perk === 'shovel' && S.shovel));
  assert.equal(S.guideOff, true);
});

test('v0.9: experience is earned while playing, with levels and ranks', () => {
  core.resetCareer();
  const S = g.newGame(21, 1);
  assert.equal(S.rs.xp, 0);
  const i = S.grid.findIndex((p, k) => p.k === 'farm' && p.st === 'land' && core.hasAccess(...core.rc(k)));
  S.slots = 3; S.funds = 100;
  assert.ok(core.acquire(i).ok);
  assert.equal(S.rs.xp, core.XP_FOR.acquire, 'buying land gives experience at once');
  assert.equal(core.career().xp, core.XP_FOR.acquire, '…and it is in the career straight away');
  S.cards = []; core.endMonth();
  assert.ok(S.rs.xp >= core.XP_FOR.acquire + core.XP_FOR.month, 'ending a month too');
  // levels: 100, 300, 600… ; ranks come at certain levels
  assert.equal(core.levelOf(0), 0); assert.equal(core.levelOf(100), 1); assert.equal(core.levelOf(299), 1); assert.equal(core.levelOf(300), 2);
  assert.deepEqual(core.RANKS.slice(0, 3), [0, 300, 1000]);
  S.levelUps = []; S.rankUps = [];
  core.saveCareer({ ...core.career(), xp: 95 }); core.gainXp('discover');   // 95 → 120: level 1, still rank 0
  assert.deepEqual(S.levelUps, [1]); assert.deepEqual(S.rankUps, []);
  core.saveCareer({ ...core.career(), xp: 290 }); core.gainXp('discover');  // 290 → 315: level 2 = rank 1 (said once, as a promotion)
  assert.deepEqual(S.rankUps, [1]); assert.deepEqual(S.levelUps, [1]);
  core.resetCareer();
});

test('v0.9: perks join the pool by rank, and the four new ones work', () => {
  core.resetCareer();
  let S = g.newGame(3, 1);
  for (let k = 0; k < 30; k++) { core.offerPerks(); assert.ok(S.perkChoice.every(p => core.PERK_RANK[p] === 0), 'rank 0: only the basic perks'); }
  S.perkChoice = null;
  core.saveCareer({ ...core.career(), xp: core.RANKS[6] });
  S = g.newGame(3, 3);
  const seen = new Set(); for (let k = 0; k < 60; k++) { core.offerPerks(); S.perkChoice.forEach(p => seen.add(p)); }
  assert.ok(seen.has('revolving') && seen.has('taxadvisor'), 'rank 6: the new perks can be offered');
  // the effects
  S.perkChoice = null; S.newcomers = 400;
  const tax0 = core.taxIncome(); S.perks.push('taxadvisor'); assert.ok(core.taxIncome() > tax0, 'Tax Adviser: more taxes');
  const p = S.grid.find(q => q.k === 'farm'); const v0 = core.plotValue(p); S.perks.push('revolving'); assert.ok(core.plotValue(p) > v0, 'Revolving Doors: plots sell for more');
  S.perks.push('ombudsman'); S.neigh = 26; core.bump('neigh', -20, 'x'); assert.equal(S.neigh, 25, 'Ombudsman: neighbours never below 25');
  S.perkChoice = ['cohesion']; const f0 = S.funds; core.choosePerk('cohesion');
  assert.ok(S.funds > f0, 'Cohesion Funds: money for this settlement too');
  assert.ok(core.career().perks.includes('cohesion'), 'the career remembers the perks you have taken');
  core.resetCareer();
});
