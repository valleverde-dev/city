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

test('meeting the target consolidates the settlement: half the money stays, a perk, then the side to attach', () => {
  const S = g.newGame(13, 0);
  S.funds = 10;
  consolidateNow();
  assert.equal(S.pending, 'attach');
  assert.equal(S.over, null);
  assert.equal(S.region.blocks.length, 1);
  assert.equal(S.region.blocks[0].cells.length, 4);
  assert.ok(S.cards.some(c => c.type === 'consolidated'));
  assert.ok(Array.isArray(S.perkChoice) && S.perkChoice.length === 3);
  const kept = S.funds;
  assert.ok(kept > 0 && kept < 10);
  // nothing can be done until the next settlement is attached
  assert.equal(core.endMonth().ok, false);
  assert.equal(core.lobby().msg.k, 'err.slots');
  assert.equal(core.attach('e').ok, false, 'cards and the perk come first');
  while (S.cards.length) core.resolveCard();
  core.choosePerk(S.perkChoice[0]);
  assert.equal(core.attach('e').ok, true);
  assert.equal(S.stage, 1);
  assert.equal(core.N, 4);
  assert.equal(S.month, 1);
  assert.equal(S.pending, null);
  assert.equal(S.funds, Math.round((core.stageCfg(1).grant + kept) * 10) / 10);
  assert.equal(S.perks.length + (S.shovel ? 1 : 0), 1);
});

test('every side gives a free spot that touches the region', () => {
  for (let k = 1; k < 7; k++) {
    g.newGame(20 + k, k);
    consolidateNow();
    const S = core.S;
    for (const d of core.DIR_KEYS) {
      const v = core.attachPreview(d), P = v.P;
      assert.ok(P, d);
      assert.equal(P.n, S.region.next.n);
      assert.ok(S.region.blocks.every(b => !(b.x < P.x + P.n && P.x < b.x + b.n && b.y < P.y + P.n && P.y < b.y + b.n)), `overlap ${k}${d}`);
      assert.ok(v.nb.length >= 1, `touches nothing ${k}${d}`);
    }
  }
});

test('the border counts: consolidated neighbours give access and form combos', () => {
  const S = g.newGame(8, 3);   // a 16×16 next to made-up settlements
  assert.ok(S.frontier.length > 0);
  const f = S.frontier.find(x => ['housing', 'factory', 'school', 'clinic', 'park'].includes(x.x));
  if (!f) return;
  // the grid parcel just inside the border, next to that building
  const r = Math.min(Math.max(f.r, 0), core.N - 1), c = Math.min(Math.max(f.c, 0), core.N - 1), i = r * core.N + c;
  Object.assign(S.grid[i], { k: 'farm', st: 'land', ty: null });
  assert.equal(core.hasAccess(r, c), true);
  // build something that pairs with the neighbour across the border (housing next to a factory, or a factory next to anything else)
  Object.assign(S.grid[i], { st: 'built', ty: f.x === 'factory' ? 'housing' : 'factory' });
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
  S.region.blocks.push({ x: 99, y: 99, n: 2, ty: 'hamlet', cells: ['farm', 'farm', 'farm', 'farm'], res: 100, tax: 0.5 });
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
  assert.ok(r4 >= 0.15 && r4 <= 0.5, `settlement IV ${r4}`);
  let tot = 0; for (let s = 1; s <= 60; s++) tot += playOneRun(s, { level: 0, run: true }).settled;
  const avg = tot / 60;
  assert.ok(avg >= 2 && avg <= 5, `settlements per run ${avg}`);
});
