// Rules tests in Node (no browser): node --test tests/core
// They exercise the core the way the Godot port will have to: through state + actions + endMonth.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { g, core, playOneRun } from './harness.mjs';

const { LEVELS, CFG } = core;
const cell = (pred) => core.S.grid.findIndex(pred);

test('every level builds an N×N site with its own grant, months and target', () => {
  LEVELS.forEach((lv, l) => {
    const S = g.newGame(42, l);
    assert.equal(S.level, l);
    assert.equal(core.N, lv.n);
    assert.equal(S.grid.length, lv.n * lv.n);
    assert.equal(S.month, 1);
    assert.equal(S.funds, lv.grant);
    assert.equal(CFG.months, lv.months);
    assert.equal(CFG.target, lv.target);
  });
});

test('rules switch on level by level', () => {
  g.newGame(1, 0);
  for (const f of ['access', 'permits', 'jobs', 'lose', 'events']) assert.equal(core.on(f), false, f);
  g.newGame(1, 1);
  for (const f of ['access', 'permits', 'jobs', 'combos']) assert.equal(core.on(f), true, f);
  assert.equal(core.on('lose'), false);
  g.newGame(1, 3);
  for (const f of ['lose', 'events', 'directives', 'milestones', 'market']) assert.equal(core.on(f), true, f);
});

test('the same seed plays the same game', () => {
  const a = JSON.stringify(playOneRun(7, { level: 3 }));
  const b = JSON.stringify(playOneRun(7, { level: 3 }));
  assert.equal(a, b);
  g.newGame(9, 2); const s1 = JSON.stringify(core.S);
  g.newGame(9, 2); const s2 = JSON.stringify(core.S);
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

test('from level II a permit needs access (road, built neighbour or the village)', () => {
  const S = g.newGame(5, 1);
  // own a parcel with no access at all
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

test('difficulty curve stays in its band (bot, 60 seeded runs per level)', () => {
  // Intentional balance changes will move these numbers: update the bands and docs/GDD.md together.
  const rate = l => { let w = 0; for (let s = 1; s <= 60; s++) if (playOneRun(s, { level: l }).win) w++; return w / 60; };
  assert.equal(rate(0), 1, 'level I always winnable');
  const r2 = rate(1), r4 = rate(3);
  assert.ok(r2 >= 0.6 && r2 <= 1, `level II ${r2}`);
  assert.ok(r4 >= 0.2 && r4 <= 0.55, `level IV ${r4}`);
});
