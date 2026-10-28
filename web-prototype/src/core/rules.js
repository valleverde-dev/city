import { comboFx } from './combos.js';
import { B, CFG, METER_FLAG, on } from './config.js';
import { NB8, S, clamp, has, idx, inside, r1 } from './state.js';
import { frontAccess, frontEntry, regionFx } from './region.js';

// =====================================================================
//  RULES
// =====================================================================
export function log(k, p, cls){ S.log.unshift({m:S.month, k, p:p||{}, c:cls||''}); S.log.length = Math.min(S.log.length, 50); S.logN = (S.logN||0)+1; }
export function spend(x){ S.funds -= x; S.spent += x; }
// Change a meter and remember why (shown when the player taps the meter)
export function bump(m, d, why){
  if(!d || (METER_FLAG[m] && !on(METER_FLAG[m]))) return 0;   // meters that are not in play this level stay still
  const lo = (m==='local' && has('fixer')) ? 30 : 0, before = S[m];
  S[m] = clamp(S[m]+d, lo, 100);
  const real = S[m]-before;
  if(real){ S.trail.unshift({m:S.month, meter:m, d:real, why}); S.trail.length = Math.min(S.trail.length, 60); }
  return real;
}
export function isRoad(p, planned){
  if(p.ty !== 'road') return false;
  if(p.k === 'regional' || p.st === 'built') return true;
  return planned && (p.st==='review' || p.st==='approved' || p.st==='building');
}
// Access counts the 8 neighbours. A road (even a planned one) gives access, and so does a FINISHED
// building or the old village: built-up land comes with its own streets. Works in progress do not.
export function givesAccess(p){ return isRoad(p, true) || (p.st==='built' && p.k!=='habitat') || p.k==='village'; }
export function hasAccess(r,c){
  if(!on('access')) return true;
  return NB8.some(([dr,dc])=>{ const r2 = r+dr, c2 = c+dc;
    if(inside(r2,c2)) return givesAccess(S.grid[idx(r2,c2)]);
    const f = frontEntry(r2,c2); return !!f && frontAccess(f); });   // across the edge: roads, villages, the consolidated region
}
export function nextToVillage(r,c){ return NB8.some(([dr,dc])=> inside(r+dr,c+dc) && S.grid[idx(r+dr,c+dc)].k==='village'); }
export function landPrice(p){ return r1(p.price * (has('notary') ? 0.7 : 1) * (1 + (regionFx().land||0))); }
export function plotValue(p){ return r1(p.price * CFG.urbanUplift * S.market); }
export function buildCost(p, ty){ return r1(B[ty].cost * S.inflation * (p.k==='flood' ? 1.5 : 1)); }
export function permitMonths(ty){
  if(!on('permits')) return 1;
  return Math.max(1, B[ty].permit + (S.neigh<40?1:0) + (S.neigh<25?1:0) - (has('fasttrack')?1:0) + (regionFx().permit||0));
}
export function buildMonths(ty){ return Math.max(1, B[ty].build - (has('prefab')?1:0)); }
export function contractors(){ return CFG.contractors + (has('contractor')?1:0); }
export function slotsPerMonth(){ return CFG.slots + (has('cousin')?1:0); }
// Political support for a permit (0–100). No dice: a permit is APPROVED if support is at least
// CFG.approveAt when it is decided — the player sees it coming and can lobby or consult in time.
export function approvalChance(){
  if(!on('permits')) return 1;
  return clamp(0.58 + (S.local-50)/150 + (S.neigh-50)/200 + (S.comp-50)/300, 0.15, 0.97);
}
export function support(){ return Math.round(approvalChance()*100); }
export function approves(bonus = 0){ return !on('permits') || support() + bonus >= CFG.approveAt; }
export function count(ty, st='built'){ return S.grid.filter(p=>p.ty===ty && p.st===st && p.k!=='regional').length; }
// What the finished buildings bring together (capacities, taxes, meters a month, move-in speed)
export function builtFx(){ const f = {homes:0, jobs:0, school:0, health:0, tax:0, neigh:0, local:0, rate:0};
  S.grid.forEach(p=>{ if(p.st!=='built' || !p.ty || p.k==='regional') return; const d = B[p.ty]; if(!d) return; for(const k in f) if(d[k]) f[k] += d[k]; });
  return f; }
export function activeSites(){ return S.grid.filter(p=>p.st==='building').length; }
export function caps(){
  const f = comboFx();
  const OFF = 1e9;   // a need that is not in play this level never limits growth
  const b = builtFx();
  const homes = Math.max(0, b.homes + f.homes);
  const jobs = on('jobs') ? Math.floor(Math.max(0, b.jobs + f.jobs) / CFG.jobsPerResident) + CFG.baseJobs : OFF;
  const school = on('services') ? Math.max(0, CFG.baseSchool + b.school + f.school) : OFF;
  const health = on('services') ? Math.max(0, CFG.baseHealth + b.health + f.health) : OFF;
  const all = {homes, jobs, school, health};
  let k = 'homes'; for(const key in all) if(all[key] < all[k]) k = key;
  return {...all, cap: all[k], bottleneck: k};
}

// =====================================================================
//  END MONTH: the world resolves
// =====================================================================
export function fx(i, k, p, cls){ S.fx.push({i, k, p:p||{}, cls:cls||''}); }
