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

test('v0.10: a run is one region that grows by 8×8 plots; each phase has its tranche, months and target', () => {
  for (let k = 0; k < 6; k++) {
    const S = g.newGame(42, k), lv = core.stageCfg(k);
    assert.equal(S.stage, k);
    assert.equal(S.level, Math.min(k, LEVELS.length - 1));
    assert.equal(S.region.blocks.length, k + 1);
    assert.ok(S.region.blocks.every(B => B.n === 8));
    assert.equal(S.grid.length, core.N * core.N);
    // the grid is the region's bounding square: the plots, and void around them
    assert.equal(S.grid.filter(p => p.k !== 'void').length, 64 * (k + 1));
    assert.ok(S.grid.filter(p => p.k === 'void').every(p => p.st === 'void'));
    assert.equal(S.month, 1);
    assert.equal(S.funds, lv.grant);
    assert.equal(CFG.months, lv.months);
    assert.equal(CFG.target, lv.target);
    assert.equal(S.done, k);
    if (k > 0) assert.equal(core.residents(), core.stageCfg(k - 1).target, 'started further in: the previous target is already met');
  }
  // the target is the land times its density: every phase more land and a bit denser
  assert.deepEqual([0, 1, 2, 3, 4].map(k => core.stageCfg(k).target), [256, 640, 1152, 1792, 2560]);
  assert.deepEqual([0, 1, 2, 3].map(k => core.stageCfg(k).inc), [256, 384, 512, 640]);
});

test('rules switch on settlement by settlement', () => {
  g.newGame(1, 0);
  assert.equal(core.on('access'), true, 'v0.10.1: access (and roads) from the first phase');
  for (const f of ['permits', 'jobs', 'lose', 'events']) assert.equal(core.on(f), false, f);
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
  const i = cell((p, k) => p.st === 'land' && p.k === 'farm' && core.hasAccess(...core.rc(k)));
  core.acquire(i);
  assert.equal(core.requestPermit(i, 'housing').ok, true);
  assert.equal(S.grid[i].st, 'review');
  for (let m = 0; m < 6 && S.grid[i].st !== 'built'; m++) { core.endMonth(); while (S.cards.length) core.resolveCard(); }
  assert.ok(S.month > 1);
  assert.equal(S.grid[i].st, 'built');
  assert.equal(S.slots, CFG.slots);
});

test('v0.10: a milestone keeps 40% of the money and the region; the next plot joins it and everything stays in play', () => {
  const S = g.newGame(13, 0);
  const i = cell(p => p.k === 'farm' && p.st === 'land');
  Object.assign(S.grid[i], { st: 'built', ty: 'school' });
  S.funds = 10;
  consolidateNow();
  assert.equal(S.pending, 'attach');
  assert.equal(S.over, null);
  assert.equal(S.done, 1);
  assert.equal(S.region.blocks.length, 1);
  // the map remembers what is built
  const A0 = { ...S.region.active };
  S.grid.forEach((p, k) => assert.equal(core.wcode(A0.y + Math.floor(k / A0.n), A0.x + k % A0.n), core.cellCode(p)));
  assert.ok(S.region.cands.length >= 1 && S.region.cands.every(P => P.n === 8));
  assert.ok(S.cards.some(c => c.type === 'consolidated'));
  const rw = S.cards.find(c => c.type === 'reward');
  assert.ok(rw && rw.offers.length >= 3 && rw.offers.some(o => o.id === 'perk'), 'three offers, one of them a perk');
  const kept = S.funds;
  assert.ok(kept > 0 && kept < 10);
  // nothing can be done until the next plot is attached
  assert.equal(core.endMonth().ok, false);
  assert.equal(core.lobby().msg.k, 'err.slots');
  assert.equal(core.attach(0).ok, false, 'cards and the perk come first');
  while (S.cards.length && S.cards[0].type !== 'reward') core.resolveCard();
  core.chooseReward(rw.offers.findIndex(o => o.id === 'perk'));
  assert.equal(core.attach(0).ok, false, 'the perk first');
  core.choosePerk(S.perkChoice[0]);
  const P = S.region.cands[0], parcel = S.grid[i], nc = S.newcomers;
  assert.equal(core.attach(9).ok, false, 'only a plot on offer');
  assert.equal(core.attach(0).ok, true);
  assert.equal(S.region.blocks.length, 2);
  // the bounding square now holds both plots (16×8 laid out in a 16×16 square)
  const A = S.region.active;
  assert.equal(A.n, 16);
  assert.ok(P.x >= A.x && P.y >= A.y && P.x + 8 <= A.x + A.n && P.y + 8 <= A.y + A.n);
  assert.equal(S.grid.filter(p => p.k === 'void').length, 256 - 128);
  // the first plot is still in play: the same parcel, same building; the people stay
  assert.ok(S.grid.includes(parcel) && parcel.ty === 'school');
  assert.equal(S.newcomers, nc);
  assert.equal(S.stage, 1);
  assert.equal(S.month, 1);
  assert.equal(S.pending, null);
  assert.equal(S.funds, Math.round((core.stageCfg(1).grant + kept) * 10) / 10);
  assert.equal(S.perks.length + (S.shovel ? 1 : 0), 1);
  // the new plot is the one with stubborn owners and municipal land; void is never land
  const v = S.grid.findIndex(p => p.k === 'void');
  S.slots = 3; assert.equal(core.acquire(v).ok, false);
});

test('v0.10: milestone rewards — offers from the characters, deals with a catch, gold for a good milestone', () => {
  const offer = (seed, setup) => { const S = g.newGame(seed, 1); setup && setup(S); S.cards = []; core.offerRewards(S.leftForTest || 0); return S.cards[0]; };
  // plain: three offers, a perk among them, none gold (late, in debt, no combos)
  let c = offer(5, S => { S.debt = 5; S.comboSeen = []; });
  assert.equal(c.offers.length, 3); assert.ok(c.offers.some(o => o.id === 'perk')); assert.ok(c.offers.every(o => !o.gold));
  // every reason makes one offer gold; all three add a fourth offer
  c = offer(5, S => { S.debt = 0; S.comboSeen = ['a:1:2', 'b:3:4', 'c:5:6']; S.leftForTest = 99; });
  assert.deepEqual(c.gold.sort(), ['combos', 'early', 'nodebt']); assert.equal(c.offers.length, 4); assert.equal(c.offers.filter(o => o.gold).length, 3);
  // each reward does what it says
  const take = (id, extra = {}) => { const S = core.S; S.cards = [{ type: 'reward', offers: [{ id, char: 'x', gold: false, deal: false, ...extra }] }]; return core.chooseReward(0); };
  let S = g.newGame(6, 2);
  const carry0 = S.carry || 0, r = take('money'); assert.ok(r.ok && S.carry > carry0);
  take('slot'); assert.equal(core.slotsPerMonth(), CFG.slots + 1);
  S.debt = 10; take('debt'); assert.equal(S.debt, 5);
  S.neigh = 50; take('money', { deal: true }); assert.equal(S.neigh, 35, 'a deal: more money, the neighbours pay');
  take('fast'); const lot = S.grid.findIndex((p, k) => p.k === 'farm' && p.st === 'land' && core.hasAccess(...core.rc(k)));
  Object.assign(S.grid[lot], { st: 'owned', urban: true }); S.slots = 3; S.funds = 50;
  assert.ok(core.requestPermit(lot, 'housing').ok); assert.equal(S.grid[lot].st, 'approved', 'a permit already approved'); assert.equal(S.fast, 1);
  take('perk'); assert.ok(Array.isArray(S.perkChoice) && S.perkChoice.length >= 1);
  S.perkChoice = null;
  // free land waits for the next plot
  S = g.newGame(7, 0); S.cards = []; S.gifts = { land: 3 };
  consolidateNow(); S.cards = []; S.perkChoice = null; core.attach(0);
  const L = S.region.blocks[1], mine = core.plotParcels(L);
  assert.ok(mine.filter(i => S.grid[i].st === 'owned' && S.grid[i].urban).length >= 3, 'three parcels of the new plot are already yours');
});

test('v0.10: deals with the characters move the deadline or pay; Brussels may grant an extension; chained events come back', () => {
  let S = g.newGame(12, 2);
  const months0 = CFG.months;
  // a contract: accept it, meet it, the deadline moves
  S.cards = [{ type: 'event', id: 'ct_mayor', v: { n: 2, m: S.month + 6 } }];
  core.resolveCard('accept');
  assert.equal(S.contract.id, 'ct_mayor');
  let k = 0; S.grid.forEach(p => { if (k < 2 && p.k === 'farm' && p.st === 'land') { Object.assign(p, { st: 'built', ty: 'housing' }); k++; } });
  S.cards = []; core.endMonth();
  assert.equal(S.contract, null); assert.equal(CFG.months, months0 + 2, 'two more months');
  assert.ok(S.cards.some(c => c.key === 'ct.metExt'));
  // a broken one costs the character's goodwill
  S = g.newGame(12, 2); S.cards = [{ type: 'event', id: 'ct_neighbour', v: { n: 1, m: 1 } }]; core.resolveCard('accept');
  const n0 = S.neigh; S.cards = []; core.endMonth();
  assert.equal(S.contract, null); assert.ok(S.neigh < n0 - 5); assert.ok(S.cards.some(c => c.key === 'ct.failed'));
  // the extension: two slots and compliance; granted only if compliance stays decent; once per phase
  S = g.newGame(12, 2); S.slots = 3; S.comp = 70;
  const m0 = CFG.months, r = core.requestExtension();
  assert.ok(r.ok && !r.refused); assert.equal(CFG.months, m0 + core.EXT_MONTHS); assert.equal(S.slots, 1); assert.equal(S.comp, 60);
  S.slots = 3; assert.equal(core.requestExtension().msg.k, 'err.extAsked');
  S = g.newGame(12, 2); S.slots = 3; S.comp = 50;
  assert.ok(core.requestExtension().refused, 'compliance too low afterwards: refused'); assert.equal(CFG.months, core.stageCfg(2).months);
  g.newGame(12, 1); assert.equal(core.requestExtension().msg.k, 'err.notYet', 'not before phase III');
  // a chained event: the decision now brings a second card later
  S = g.newGame(12, 2); S.funds = 50; S.cards = [{ type: 'event', id: 'consultants', v: {} }]; core.resolveCard('hire');
  assert.equal(S.chain.length, 1);
  const back = () => S.cards.some(c => c.type === 'event' && c.id === 'consultantsReport');
  for (let m = 0; m < 4 && !back(); m++) { S.cards = []; core.endMonth(); }
  assert.ok(back() && S.chain.length === 0 && S.month === 4, 'the report comes back three months later');
  // events between plots need two plots; chained second cards are never drawn at random
  g.newGame(12, 0); assert.equal(core.EVENTS.oldTown.ok(), false); g.newGame(12, 1); assert.equal(core.EVENTS.oldTown.ok(), true);
  assert.ok(Object.keys(core.EVENTS).length >= 35);
});

test('the plots on offer are new land next to the region, never overlapping', () => {
  for (let k = 1; k < 7; k++) {
    g.newGame(20 + k, k);
    consolidateNow();
    const S = core.S, cs = S.region.cands;
    assert.ok(cs.length >= 1, `plots ${k}`);
    // v0.10.1: every free spot touching the region is offered (one plot: its 4 sides; two side by side: 6)
    const blocks = S.region.blocks, free = new Set();
    blocks.forEach(B => [[0,-1],[1,0],[0,1],[-1,0]].forEach(([dx,dy]) => { const x = B.x + dx*B.n, y = B.y + dy*B.n;
      if (!blocks.some(C => C.x === x && C.y === y)) free.add(x+','+y); }));
    assert.equal(cs.length, free.size, `all ${free.size} free spots offered (phase ${k})`);
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

test('v0.10: the plots of the region work together — access and combos cross from one plot to the next', () => {
  const S = g.newGame(8, 1);
  const [B0, B1] = S.region.blocks, A = S.region.active;
  // a cell of the new plot right next to the first one
  const loc = (y, x) => (y - A.y) * A.n + (x - A.x);
  let pair = null;
  for (let y = B1.y; y < B1.y + 8 && !pair; y++) for (let x = B1.x; x < B1.x + 8 && !pair; x++)
    for (const [dy, dx] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) { const y2 = y + dy, x2 = x + dx;
      if (y2 >= B0.y && y2 < B0.y + 8 && x2 >= B0.x && x2 < B0.x + 8) { pair = [loc(y, x), loc(y2, x2)]; break; } }
  assert.ok(pair, 'the plots touch');
  const [i, j] = pair;
  Object.assign(S.grid[j], { k: 'farm', st: 'built', ty: 'factory' });
  Object.assign(S.grid[i], { k: 'farm', st: 'land', ty: null });
  assert.equal(core.hasAccess(...core.rc(i)), true, 'a building on the old plot gives access to the new one');
  Object.assign(S.grid[i], { st: 'built', ty: 'housing' });
  assert.ok(core.activeCombos().some(x => (x.i === i && x.j === j) || (x.i === j && x.j === i)), 'and they form a combo');
  assert.equal(S.frontier.length, 0, 'no land outside the region');
});

test('every plot type and the region combos between touching plots change the numbers', () => {
  const S = g.newGame(4, 2);
  S.stype = 'commuter'; S.rfx = { homes: 60 };
  const homes = core.caps().homes;
  S.rfx = {};
  assert.equal(homes - core.caps().homes, 60);
  S.rfx = { land: -0.25 };
  const p = S.grid.find(q => q.k === 'farm');
  assert.equal(core.landPrice(p), Math.round(p.price * 0.75 * 10) / 10);
  // v0.10: all the plots count (not only the newest), and nothing is paid as a dividend any more
  S.region.blocks.forEach(B => { B.ty = 'industrial'; });
  core.regionEffects();
  assert.ok(S.rcombos.every(c => S.region.blocks[c.a] && S.region.blocks[c.b]));
  const fx1 = JSON.stringify(S.rfx);
  S.region.blocks.forEach(B => { B.ty = 'commuter'; }); core.regionEffects();
  assert.notEqual(JSON.stringify(S.rfx), fx1);
  assert.equal(core.regionDividend(), 0);
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
  assert.ok(r2 >= 0.95, `phase II: (almost) no luck needed ${r2}`);
  assert.ok(r4 >= 0.3 && r4 <= 0.7, `settlement IV ${r4}`);
  let tot = 0; for (let s = 1; s <= 60; s++) tot += playOneRun(s, { level: 0, run: true }).settled;
  const avg = tot / 60;
  assert.ok(avg >= 2.5 && avg <= 6, `settlements per run ${avg}`);
});

test('the career: buildings unlock by level (v0.9.2), achievements give experience, the career carries over', () => {
  core.storage.set('eurocrat_career', JSON.stringify({ xp: 0, ach: [], types: [], runs: 0, tutorial: false, guide: false }));
  core.storage.set('eurocrat_records', '');
  const S = g.newGame(12, 1);
  assert.equal(core.unlocked('housing'), true);
  assert.equal(core.unlocked('market'), false);
  const i = S.grid.findIndex((p, k) => p.k === 'farm' && core.hasAccess(...core.rc(k)));
  Object.assign(S.grid[i], { st: 'owned', urban: true }); S.slots = 3;
  assert.equal(core.requestPermit(i, 'market').msg.k, 'err.locked');
  // an achievement gives experience but no longer unlocks anything by itself
  const j = S.grid.findIndex((p, k) => k !== i && p.k === 'farm');
  Object.assign(S.grid[j], { st: 'built', ty: 'housing' }); S.cards = [];
  core.endMonth();
  assert.ok(core.career().ach.includes('firstStone'));
  assert.ok(S.newAch.includes('firstStone'));
  assert.ok(!core.ACH.some(a => a.unlock), 'no achievement unlocks a building');
  // reaching the market's level unlocks it, and the level-up says so (S.unlocks)
  S.unlocks = [];
  core.saveCareer({ ...core.career(), xp: core.levelXp(core.UNLOCK_LEVEL.market) - 1 }); core.gainXp('month');
  assert.equal(core.unlocked('market'), true);
  assert.deepEqual(S.unlocks, ['market']);
  assert.equal(core.unlocked('data'), false, 'the last ones need many more levels');
  // every new building has its own level, spread along the curve
  assert.deepEqual(Object.keys(core.UNLOCK_LEVEL).sort(), core.NEW_TYPES.slice().sort());
  assert.equal(new Set(Object.values(core.UNLOCK_LEVEL)).size, core.NEW_TYPES.length);
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
  // v0.9.3: the career's run count never falls behind the records' (they counted runs before the career existed)
  core.storage.set('eurocrat_records', JSON.stringify({ best: { settlements: 3, pop: 900 }, runs: 7 }));
  const B2 = g.newGame(8, 1); B2.cards = []; B2.debt = 999; B2.month = CFG.months + 1; core.endMonth();
  assert.equal(core.career().runs, 8);
  // ranks: more experience, a bigger grant (only when the UI passes the bonus)
  assert.equal(core.rankOf(0), 0); assert.equal(core.rankOf(core.RANKS[2]), 2);
  const A = g.newGame(5, 0), plain = A.grant; core.newGame(5, 0, { bonus: 0.08 }); core.S.cards = [];
  assert.equal(core.S.grant, Math.round(plain * 1.08 * 10) / 10);
});

test('v0.9.2: no dossier to choose — every run after the tutorial starts from a random draw', () => {
  core.resetCareer();
  const d = core.randomStart(77);
  assert.deepEqual(core.randomStart(77), d, 'the same draw for the same seed');
  assert.ok(core.STYPES.includes(d.ty));
  assert.ok((core.PERK_RANK[d.perk] || 0) <= core.rankNow(), 'the starting perk comes from the pool of your rank');
  const seen = new Set(); for (let s = 1; s <= 40; s++) seen.add(core.randomStart(s).ty);
  assert.ok(seen.size >= 4, 'different runs, different settlement types');
  core.newGame(d.seed, 0, { ty: d.ty, perk: d.perk, country: d.country, guide: false });
  const S = core.S;
  assert.equal(S.stage, 0, 'v0.10: every run starts at phase I'); assert.equal(S.region.blocks.length, 1);
  assert.equal(S.stype, d.ty);
  assert.ok(S.perks.includes(d.perk));
  assert.equal(S.guideOff, true);
  // v0.10: the tutorial is a normal first plot — always a farming town, no perk, the mayor's hints on
  const T = core.newGame(5, 0, { tutorial: true, guide: true });
  assert.equal(T.region.blocks[0].ty, 'agrarian'); assert.equal(T.region.blocks[0].n, 8);
  assert.equal(T.perks.length, 0); assert.equal(T.guideOff, false);
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
  // levels: K·n·(n+1) (v0.9.2: K = 350 → 700, 2100, 4200…); ranks come at certain levels
  const L = core.levelXp;
  assert.equal(core.levelOf(0), 0); assert.equal(core.levelOf(L(1)), 1); assert.equal(core.levelOf(L(2)-1), 1); assert.equal(core.levelOf(L(2)), 2);
  assert.deepEqual(core.RANKS.slice(0, 3), [0, L(2), L(4)]);
  S.levelUps = []; S.rankUps = [];
  core.saveCareer({ ...core.career(), xp: L(1) - 5 }); core.gainXp('discover');   // → level 1, still rank 0
  assert.deepEqual(S.levelUps, [1]); assert.deepEqual(S.rankUps, []);
  core.saveCareer({ ...core.career(), xp: L(2) - 5 }); core.gainXp('discover');  // → level 2 = rank 1 (said once, as a promotion)
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

test('v0.10.1: the founding district has the city\'s name and follows it when the city is renamed', () => {
  const S = g.newGame(31, 0);
  assert.equal(S.region.blocks[0].town, S.town);
  assert.ok(core.renameTown('Villa Burocracia').ok);
  assert.equal(S.region.blocks[0].town, 'Villa Burocracia');
  assert.ok(core.renameDistrict(0, 'Casco Viejo').ok);
  assert.ok(core.renameTown('Nueva Burocracia').ok);
  assert.equal(S.region.blocks[0].town, 'Casco Viejo', 'a district with a name of its own keeps it');
});

test('v0.10.2: combos and bankruptcy from phase I; stubborn owners ask +50…150%, rolled once', () => {
  g.newGame(5, 0);
  assert.equal(core.on('combos'), true); assert.equal(core.on('debt'), true); assert.equal(core.on('permits'), false);
  const S = core.S; S.cards = []; S.debt = core.CFG.debtCap + 1; core.endMonth();
  assert.equal(S.over && S.over.why, 'bankrupt', 'phase I can be lost by debt');
  const pcts = [];
  for (let s = 1; s <= 30; s++) { g.newGame(s, 1); core.S.grid.forEach(p => { if (p.hold && p.holdPct) pcts.push(p.holdPct); }); }
  assert.ok(pcts.length > 10 && pcts.every(p => p >= 50 && p <= 150 && p % 5 === 0), 'between +50% and +150%');
  assert.ok(new Set(pcts).size >= 5, 'and they vary');
});

test('v0.11: negotiating with a stubborn owner — lean on them, expropriate, or leave them in peace', () => {
  const held = S => S.grid.findIndex(p => p.st === 'land' && p.hold);
  let S = g.newGame(21, 2), i = held(S);
  assert.ok(i >= 0, 'phase III has stubborn owners');
  S.slots = 3; S.funds = 100; S.local = 60;
  assert.equal(core.leanOnOwner(i).msg.k, 'err.noDeal', 'you have to meet them first');
  core.meetOwner(i);
  const p = S.grid[i], pct = p.holdPct, base = core.basePrice(p);
  assert.ok(core.leanOnOwner(i).ok);
  assert.equal(p.holdPct, Math.round(pct / 2)); assert.equal(S.local, 50); assert.equal(S.slots, 2);
  assert.ok(Math.abs(core.basePrice(p) - base) <= 0.1, 'the base price stays');
  assert.equal(core.leanOnOwner(i).msg.k, 'err.noDeal', 'only once');
  // expropriation: two slots, the base price now, the neighbours pay, the land is yours in four months
  S = g.newGame(21, 2); i = held(S); core.meetOwner(i); S.slots = 3; S.funds = 100;
  const q = S.grid[i], f0 = S.funds, n0 = S.neigh, b = core.basePrice(q);
  assert.ok(core.expropriate(i).ok);
  assert.equal(S.slots, 1); assert.ok(Math.abs((f0 - S.funds) - b) < 0.11); assert.equal(S.neigh, n0 + core.NEG.exproNeigh);
  assert.equal(core.acquire(i).ok, false, 'not for sale while it is being expropriated');
  for (let m = 0; m < core.NEG.exproMonths; m++) { S.cards = []; core.endMonth(); }
  assert.equal(q.st, 'owned'); assert.equal(q.hold, false);
  // peace: the neighbours like it, and the owner stops negotiating
  S = g.newGame(21, 2); i = held(S); core.meetOwner(i); const n1 = S.neigh;
  assert.ok(core.leaveInPeace(i).ok); assert.equal(S.neigh, n1 + core.NEG.peaceNeigh);
  S.slots = 3; assert.equal(core.expropriate(i).msg.k, 'err.noDeal');
});

test('v0.11: gossip at the village bar marks stubborn owners — some of it false, less when the neighbours are angry', () => {
  let S = g.newGame(30, 2); S.slots = 3; S.funds = 10; S.neigh = 70;
  const hidden0 = S.grid.filter(p => p.st === 'land' && p.hold && !p.holdKnown).length;
  assert.equal(core.gossipCount(), 3);
  assert.ok(core.gossip().ok);
  const known = S.grid.filter(p => p.heard).length, rumours = S.grid.filter(p => p.rumour).length;
  assert.equal(known + rumours, Math.min(3, known + rumours)); assert.ok(known + rumours >= 1);
  assert.ok(S.grid.filter(p => p.st === 'land' && p.hold && !p.holdKnown).length === hidden0 - known);
  assert.ok(S.grid.every(p => !p.rumour || !p.hold), 'a rumour is always about a parcel that is not held');
  assert.equal(core.gossip().msg.k, 'err.gossiped', 'once a month');
  // meeting the owner of a rumoured parcel clears it
  const r = S.grid.findIndex(p => p.rumour); if (r >= 0) { assert.ok(core.meetOwner(r).rumour); assert.equal(S.grid[r].rumour, false); }
  // angry neighbours tell nothing
  S = g.newGame(30, 2); S.slots = 3; S.neigh = 10;
  assert.equal(core.gossipCount(), 0); assert.equal(core.gossip().msg.k, 'fx.gossip0');
  // over many seeds, some gossip is false
  let lies = 0; for (let s = 1; s <= 30; s++) { const T = g.newGame(s, 2); T.slots = 3; T.funds = 10; T.neigh = 70; core.gossip(); lies += T.grid.filter(p => p.rumour).length; }
  assert.ok(lies > 0);
});

test('v0.11.1: rivers are not for sale nor buildable; the river can grow over empty banks', () => {
  let S = null, w = -1;
  for (let s = 1; s <= 40 && w < 0; s++) { S = g.newGame(s, 2); w = cell(p => p.k === 'flood'); }
  assert.ok(w >= 0, 'some seed has a river');
  S.slots = 3; S.funds = 50;
  assert.equal(core.acquire(w).ok, false); assert.equal(core.acquire(w).msg.k, 'err.notForSale');
  // the event: only empty parcels on a bank; "let it" turns them into river
  const E = core.EVENTS.riverRise, banks = core.bankParcels();
  if (banks.length) {
    assert.ok(E.ok());
    const v = E.setup(); assert.ok(banks.includes(v.i));
    E.choices.find(c => c.k === 'let').run(v);
    assert.equal(S.grid[v.i].k, 'flood'); assert.equal(S.grid[v.i].st, 'land');
    const f0 = S.funds; E.choices.find(c => c.k === 'sandbags').run(v); assert.ok(Math.abs(f0 - 0.4 - S.funds) < 1e-9);
  }
});

test('v0.11.1: stubborn owners only on private farmland (never municipal or gifted land); the cousins\' offer is an ordinary parcel', () => {
  for (let s = 1; s <= 40; s++) for (let st = 1; st <= 3; st++) {
    const S = g.newGame(s, st);
    S.grid.forEach(p => { if (p.hold) assert.equal(p.k, 'farm', `seed ${s} stage ${st}`); });
  }
  const S = g.newGame(7, 2); const v = core.EVENTS.discount.setup();
  assert.equal(S.grid[v.i].hold, false);
});

test('v0.11.1: events are dealt like a deck — one-offs once a run, repeatable ones at least 8 months apart', () => {
  const S = g.newGame(21, 4); S.month = 5; S.cards = [];
  const when = {};
  for (let m = 0; m < 120; m++) {
    const n = S.cards.length; core.rollEvent();
    if (S.cards.length > n) { const id = S.cards[S.cards.length - 1].id; (when[id] = when[id] || []).push(S.evClock); }
    S.cards = [];
  }
  const ids = Object.keys(when);
  assert.ok(ids.length >= 15, `variety: ${ids.length} different events`);
  for (const id of ids) {
    const t = when[id];
    if (!core.REPEATS.includes(id) && !id.startsWith('ct_')) assert.equal(t.length, 1, `${id} is a one-off`);
    for (let k = 1; k < t.length; k++) assert.ok(t[k] - t[k-1] >= core.COOLDOWN, `${id} waits`);
  }
});

test('v0.12: every district has a town hall — its village, its lore, its ordinances (??? at first), its own relation', () => {
  const S = g.newGame(17, 2);
  assert.equal(S.region.blocks.length, 3);
  S.region.blocks.forEach((B, k) => {
    const H = B.hall;
    assert.ok(H && H.k === k && H.ords.length >= 1 && H.ords.length <= 2 && H.known.length === 0, 'ordinances unknown at first');
    assert.ok(H.year >= 1150 && H.year < 1970 && core.CLERKS.includes(H.clerk));
    const c = core.hallCell(k); assert.ok(c >= 0 && S.grid[c].k === 'village', 'the hall stands in the district\'s village');
    if (k === 0) assert.equal(core.hallRel(0), S.local, 'the founding town hall is the Mayor meter');
    else assert.ok(H.rel >= 30 && H.rel <= 70);
  });
  // the same plot gets the same hall (not the run's dice)
  const ords = S.region.blocks.map(B => B.hall.ords.join());
  g.newGame(17, 2); assert.deepEqual(core.S.region.blocks.map(B => B.hall.ords.join()), ords);
  // a new plot brings its own hall
  const T = g.newGame(17, 0); consolidateNow(); T.cards = []; T.perkChoice = null; core.attach(0);
  assert.ok(T.region.blocks[1].hall && core.hallCell(1) >= 0);
  // the buildable town hall is gone
  assert.ok(!core.NEW_TYPES.includes('townhall'));
});

test('v0.12: permits are decided by their district\'s town hall', () => {
  const S = g.newGame(17, 2); const k = 1, H = S.region.blocks[k].hall;
  H.ords = []; S.region.blocks[0].hall.ords = [];
  const lot = S.grid.findIndex((p, i) => core.districtOf(i) === k && p.k === 'farm' && p.st === 'land' && core.hasAccess(...core.rc(i)));
  Object.assign(S.grid[lot], { st: 'owned', urban: true, hold: false });
  S.slots = 3; S.funds = 50; S.local = 90; S.neigh = 50; S.comp = 50; H.rel = 5;
  assert.ok(core.requestPermit(lot, 'housing').ok);
  assert.equal(core.approves(0, lot), false, 'a cold town hall rejects, whatever the founding mayor thinks');
  H.rel = 90; assert.equal(core.approves(0, lot), true);
  S.local = 5; assert.equal(core.approves(0, lot), true, 'and the founding mayor does not matter here');
});

test('v0.12: ordinances do what they say, and you find out when you run into them', () => {
  const S = g.newGame(17, 2), k = 1, H = S.region.blocks[k].hall;
  const lots = S.grid.map((p, i) => i).filter(i => core.districtOf(i) === k && S.grid[i].k === 'farm' && S.grid[i].st === 'land' && core.hasAccess(...core.rc(i)));
  const own = i => Object.assign(S.grid[i], { st: 'owned', urban: true, hold: false });
  S.funds = 100; S.local = 90; H.rel = 90;
  // no factories
  H.ords = ['noIndustry']; H.known = []; own(lots[0]); S.slots = 3;
  assert.equal(core.requestPermit(lots[0], 'factory').msg.k, 'err.ordinance'); assert.deepEqual(H.known, ['noIndustry']);
  // triple fee
  H.ords = ['triplicate']; H.known = []; const f0 = S.funds; S.slots = 3;
  assert.ok(core.requestPermit(lots[0], 'housing').ok); assert.ok(Math.abs((f0 - S.funds) - core.CFG.permitFee * 3) < 0.01); assert.ok(H.known.includes('triplicate'));
  // the clerk on holiday: the permit waits until they are back — pastries push one ahead
  own(lots[1]); H.ords = ['holiday']; H.known = []; H.away = 3; S.slots = 3;
  assert.ok(core.requestPermit(lots[1], 'housing').ok);
  S.grid[lots[0]].st = 'built';
  const t0 = S.grid[lots[1]].t; S.cards = []; core.endMonth();
  assert.equal(S.grid[lots[1]].st, 'review'); assert.equal(S.grid[lots[1]].t, t0, 'nothing moves while the clerk is away'); assert.ok(H.known.includes('holiday'));
  S.slots = 3; S.funds = 50; const r0 = H.rel; assert.ok(core.hallCake(k).ok); assert.equal(H.rel, Math.min(100, r0 + core.HALL.cakeRel)); assert.ok(S.grid[lots[1]].push);
  assert.equal(core.hallCake(k).msg.k, 'err.cake', 'once a month');
  // calling the mayor brings the clerk back today, at a price
  H.away = 3; S.slots = 3; const r1 = H.rel; assert.ok(core.hallCall(k).ok); assert.equal(H.away, 0); assert.equal(H.rel, r1 + core.HALL.callRel);
  // one-stop shop: a month faster; industry: factories approved on the spot
  H.ords = ['oneStop']; own(lots[2]); S.slots = 3; assert.equal(core.permitMonths('housing', lots[2]), core.permitMonths('housing') - 1 || 1);
  H.ords = ['proIndustry']; S.slots = 3; assert.ok(core.requestPermit(lots[2], 'factory').ok); assert.equal(S.grid[lots[2]].st, 'approved');
});

test('v0.12: at the counter — ask, lunch with this town\'s mayor, complain, repeal an ordinance in plenary', () => {
  const S = g.newGame(17, 2), k = 1, H = S.region.blocks[k].hall;
  H.ords = ['siesta', 'oldtown']; H.known = []; S.slots = 3; S.funds = 50;
  assert.ok(core.hallAsk(k).ok); assert.deepEqual(H.known.sort(), ['oldtown', 'siesta']); assert.equal(S.slots, 2);
  assert.equal(core.hallAsk(k).msg.k, 'err.asked', 'once a phase');
  const r0 = H.rel, l0 = S.local; assert.ok(core.hallLunch(k).ok); assert.equal(H.rel, r0 + core.HALL.lunchRel); assert.equal(S.local, l0, 'lunch here does not move the founding mayor');
  // repeal: passes when the neighbours and this hall are at 50+ when the plenary votes
  S.slots = 3; assert.ok(core.hallRepeal(k, 'siesta').ok); assert.equal(S.slots, 1);
  assert.equal(core.hallRepeal(k, 'oldtown').msg.k, 'err.repealing', 'one at a time');
  S.neigh = 90; H.rel = 70;
  for (let m = 0; m < core.HALL.repealMonths; m++) { S.cards = []; core.endMonth(); }
  assert.ok(!H.ords.includes('siesta')); assert.ok(S.cards.some(c => c.key === 'hall.repealOk'));
  S.slots = 3; S.neigh = 30; assert.ok(core.hallRepeal(k, 'oldtown').ok);
  for (let m = 0; m < core.HALL.repealMonths; m++) { S.cards = []; core.endMonth(); }
  assert.ok(H.ords.includes('oldtown'), 'angry neighbours: the plenary says no');
  // a complaint: the clerk back within a month, compliance up, this hall a bit colder
  H.ords.push('holiday'); H.away = 4; S.slots = 3; const c0 = S.comp, r1 = H.rel;
  assert.ok(core.hallComplain(k).ok); assert.equal(H.away, 1); assert.equal(S.comp, Math.min(100, c0 + core.HALL.complainComp)); assert.equal(H.rel, r1 + core.HALL.complainRel);
  // good ordinances cannot be repealed
  H.ords.push('oneStop'); H.known.push('oneStop'); S.slots = 3; assert.equal(core.hallRepeal(k, 'oneStop').msg.k, 'err.noRepeal');
});

test('v0.12: housing levels — renovate a block up when its surroundings allow, through its town hall', () => {
  const S = g.newGame(23, 1), N = core.N;
  S.region.blocks.forEach(B => { B.hall.ords = []; if (B.hall.rel !== null) B.hall.rel = 80; }); S.local = 80;
  // a clean 5×5 patch of plain land in the first district
  const at = (r, c) => r * N + c;
  const B0 = S.region.blocks[0], A = S.region.active, r0 = B0.y - A.y + 1, c0 = B0.x - A.x + 1;
  for (let a = 0; a < 5; a++) for (let b = 0; b < 5; b++) Object.assign(S.grid[at(r0 + a, c0 + b)], { k: 'farm', st: 'land', ty: null, hold: false, urban: true, hall: undefined });
  const h = at(r0 + 2, c0 + 2); Object.assign(S.grid[h], { st: 'built', ty: 'housing' });
  const homes0 = core.caps().homes;
  assert.equal(core.lvOf(S.grid[h]), 1); assert.equal(core.homesOf(S.grid[h]), 150);
  S.slots = 3; S.funds = 50;
  assert.equal(core.upgradeHousing(h).msg.k, 'err.upNeeds', 'level 2 needs a park, school or market beside it');
  assert.deepEqual(core.upMissing(h), ['near1']);
  Object.assign(S.grid[at(r0 + 2, c0 + 3)], { st: 'built', ty: 'park' });
  assert.ok(core.upgradeHousing(h).ok); assert.equal(S.grid[h].up.st, 'review');
  assert.equal(core.upgradeHousing(h).msg.k, 'err.upgrading');
  // the permit, then the works (fewer homes meanwhile), then level 2
  let guard = 0; while (S.grid[h].up && S.grid[h].up.st === 'review' && guard++ < 6) { S.cards = []; core.endMonth(); }
  assert.equal(S.grid[h].up.st, 'works');
  assert.equal(core.homesOf(S.grid[h]), 150 - core.WORKS_LOSS);
  guard = 0; while (S.grid[h].up && guard++ < 6) { S.cards = []; S.funds = 50; core.endMonth(); }
  assert.equal(core.lvOf(S.grid[h]), 2); assert.equal(core.homesOf(S.grid[h]), 250);
  assert.ok(core.caps().homes >= homes0 + 100 - 1);
  // level 3 asks for a school and a health centre within two cells
  assert.deepEqual(core.upMissing(h).sort(), ['clinic2', 'school2']);
  Object.assign(S.grid[at(r0, c0)], { st: 'built', ty: 'school' }); Object.assign(S.grid[at(r0 + 4, c0 + 4)], { st: 'built', ty: 'clinic' });
  assert.deepEqual(core.upMissing(h), []);
  // a cold town hall rejects the renovation
  S.local = 5; S.slots = 3; S.funds = 50; assert.ok(core.upgradeHousing(h).ok);
  guard = 0; while (S.grid[h].up && guard++ < 6) { S.cards = []; core.endMonth(); S.local = 5; }
  assert.equal(core.lvOf(S.grid[h]), 2, 'rejected: still level 2');
  // not in phase I
  const T = g.newGame(23, 0); const q = T.grid.findIndex(p => p.k === 'farm'); Object.assign(T.grid[q], { st: 'built', ty: 'housing' }); T.slots = 2;
  assert.equal(core.upgradeHousing(q).msg.k, 'err.notYet');
});
