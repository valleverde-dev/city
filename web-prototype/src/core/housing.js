import { B, CFG, on } from './config.js';
import { clerkAway, ordAt, revealAt } from './halls.js';
import { NB8, S, idx, inside, pname, r1, rc } from './state.js';
import { approves, bump, canActHall, fx, log, permitMonths, spend } from './rules.js';
import { gainXp } from './career.js';

// =====================================================================
//  HOUSING LEVELS (v0.12) — a housing block is born at level 1 and can be renovated up, one level at a
//  time, from phase II: a renovation permit (its district's town hall decides, like any permit), then
//  months of works (fewer homes meanwhile), then more homes. Each level asks something of the block's
//  surroundings, shown only for the next level:
//    level 2 · 250 homes · a park, school or market beside it          · €5M, 3 months
//    level 3 · 400 homes · a school and a health centre within 2 cells · €8M, 4 months (a tower: neighbours −3)
//  p.lv = level (missing = 1); p.up = {to, st:'review'|'works', t, mcost} while it is being renovated.
// =====================================================================
export const HLV = [null,
  {homes:150},
  {homes:250, cost:5, build:3, upkeep:0.02, need:['near1']},
  {homes:400, cost:8, build:4, upkeep:0.04, need:['school2', 'clinic2']}];
export const MAX_LV = HLV.length - 1, WORKS_LOSS = 60;
export const lvOf = p => (p && p.lv) || 1;
// the homes a finished building gives (housing by level; fewer while it is being renovated)
export function homesOf(p){
  if(p.ty !== 'housing') return (B[p.ty] && B[p.ty].homes) || 0;
  return HLV[lvOf(p)].homes - (p.up && p.up.st === 'works' ? WORKS_LOSS : 0);
}
export function upkeepOf(p){ return (B[p.ty] ? B[p.ty].upkeep : 0) + (p.ty === 'housing' && lvOf(p) > 1 ? HLV[lvOf(p)].upkeep : 0); }
// within d cells (8-way rings) of parcel i: is there a finished building of one of these types?
function near(i, types, d){ const [r,c] = rc(i), n = Math.round(Math.sqrt(S.grid.length));
  for(let dr=-d; dr<=d; dr++) for(let dc=-d; dc<=d; dc++){ if(!dr && !dc) continue; const r2 = r+dr, c2 = c+dc;
    if(r2<0 || c2<0 || r2>=n || c2>=n) continue; const q = S.grid[r2*n+c2]; if(q.st==='built' && types.includes(q.ty)) return true; }
  return false; }
const NEED = {near1: i=>near(i, ['park','school','market'], 1), school2: i=>near(i, ['school'], 2), clinic2: i=>near(i, ['clinic'], 2)};
// What the next level asks that is still missing (empty: ready)
export function upMissing(i){ const p = S.grid[i], to = lvOf(p) + 1; if(to > MAX_LV) return [];
  return HLV[to].need.filter(k=>!NEED[k](i)); }
export function upCost(i){ const to = lvOf(S.grid[i]) + 1; return to > MAX_LV ? 0 : r1(HLV[to].cost * S.inflation); }
const fail = k => ({ok:false, msg:{k}, cls:'bad'});
export function upgradeHousing(i){
  const p = S.grid[i]; if(!p || p.ty !== 'housing' || p.st !== 'built' || p.priv) return fail('err.notHousing');
  if(!on('permits')) return fail('err.notYet');
  if(p.up) return fail('err.upgrading');
  const to = lvOf(p) + 1; if(to > MAX_LV) return fail('err.maxLevel');
  if(!canActHall()) return fail('err.slots');
  if(upMissing(i).length) return fail('err.upNeeds');
  if(to === MAX_LV && ordAt(i, 'oldtown')){ const [r,c] = rc(i);
    if(NB8.some(([dr,dc])=>inside(r+dr,c+dc) && S.grid[idx(r+dr,c+dc)].k==='village')){ revealAt(i, 'oldtown'); return fail('err.noTower'); } }   // no towers by the old town
  if(S.funds < CFG.permitFee) return fail('err.funds');
  S.slots--; spend(CFG.permitFee);
  p.up = {to, st:'review', t:permitMonths('housing', i)};
  log('log.upFiled', {at:pname(i), n:to}); gainXp('permit');
  return {ok:true, msg:{k:'fx.upFiled', p:{n:to}}, sfx:'stamp'};
}
// Each month: renovation permits are decided, works go on
export function tickHousing(){
  S.grid.forEach((p,i)=>{ const u = p.up; if(!u) return;
    if(u.st === 'review'){
      if(clerkAway(i)) return;
      if(--u.t > 0) return;
      if(approves(0, i)){ const L = HLV[u.to]; u.st = 'works'; u.t = L.build; u.mcost = r1(upCost(i) / L.build); log('log.upApproved', {at:pname(i), n:u.to}, 'good'); fx(i, 'fx.approved', {}, 'good'); }
      else { p.up = null; log('log.upRejected', {at:pname(i)}, 'bad'); fx(i, 'fx.rejected', {}, 'bad'); }
      return; }
    spend(u.mcost);
    if(--u.t <= 0){ p.lv = u.to; p.up = null; gainXp('built');
      if(p.lv === MAX_LV) bump('neigh', -3, 'why.tower');
      log('log.upDone', {at:pname(i), n:p.lv}, 'good'); fx(i, 'fx.upDone', {n:p.lv}, 'good'); }
  });
}
