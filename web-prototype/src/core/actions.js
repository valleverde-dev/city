import { B, CFG, TOWN_A, TOWN_B, on } from './config.js';
import { gainXp, unlocked } from './career.js';
import { avail } from './economy.js';
import { money } from './format.js';
import { buildCost, bump, hasAccess, landPrice, log, nextToVillage, permitMonths, plotValue, spend } from './rules.js';
import { S, has, pname, r1, rc, ri, rnd } from './state.js';

// --- Player actions. Each returns {ok, msg:{k,p}, bad?} and never grants anything for free. ---
export const fail = (k,p) => ({ok:false, bad:true, msg:{k, p}});
export function canAct(n=1){ return !S.over && !S.perkChoice && !S.pending && S.slots >= n; }
export function acquire(i){
  const p = S.grid[i];
  if(!canAct()) return fail('err.slots');
  if(p.st==='ruin'){ const price=r1(p.price*1.5); if(S.funds<price) return fail('err.funds');
    S.slots--; spend(price); Object.assign(p,{st:'owned', ty:null, dev:null}); log('log.buyback',{at:pname(i), x:money(price)}); return {ok:true, msg:{k:'fx.money', p:{x:money(-price)}}}; }
  if(p.st!=='land' || !['farm','muni','flood'].includes(p.k)) return fail('err.notForSale');
  if(p.k==='muni' && on('local') && S.local < 40) return fail('err.mayorNo');
  const price = landPrice(p);
  if(avail() < price) return fail(on('lose') ? 'err.funds' : 'err.committed');
  S.slots--;
  spend(price); p.st = 'owned';
  log('log.acquired', {at:pname(i), x:money(price)}); gainXp('acquire');
  return {ok:true, msg:{k:'fx.money', p:{x:money(-price)}}};
}
export function requestPermit(i, ty){
  const p = S.grid[i], [r,c] = rc(i);
  if(!canAct()) return fail('err.slots');
  if(p.st!=='owned') return fail('err.mustOwn');
  if(!hasAccess(r,c)) return fail('err.noAccess');
  if(!unlocked(ty)) return fail('err.locked');
  if(B[ty].flag && !on(B[ty].flag)) return fail('err.notYet');
  if(B[ty].unique && S.grid.some(q=>q.ty===ty && q.st!=='land' && q.st!=='owned')) return fail('err.unique');
  if(B[ty].urban && !p.urban) return fail('err.rustic');
  if(S.funds < CFG.permitFee) return fail('err.funds');
  // In the learning levels (no bank drama yet) you cannot order works you cannot pay for
  if(!on('lose') && avail() < CFG.permitFee + buildCost(p, ty)) return fail('err.fundsBuild');
  S.slots--; spend(CFG.permitFee);
  p.st = 'review'; p.ty = ty; p.t = permitMonths(ty); p.flag = null;
  if(ty==='factory') bump('neigh', -3, 'why.factory');
  if(nextToVillage(r,c) && ty!=='park'){ bump('neigh', -3, 'why.village'); log('log.village', {}, 'bad'); }
  log('log.permit', {b:ty, at:pname(i), n:p.t}); gainXp('permit');
  return {ok:true, msg:{k:'fx.filed'}, sfx:'stamp'};
}
export function sellPlot(i){
  const p = S.grid[i], [r,c] = rc(i);
  if(!on('market')) return fail('err.notYet');
  if(!canAct()) return fail('err.slots');
  if(p.st!=='owned' || !p.urban) return fail('err.sellUrban');
  if(!hasAccess(r,c)) return fail('err.noAccess');
  if(S.market < CFG.devMinMarket) return fail('err.noBuyers');
  const price = plotValue(p);
  S.slots--; S.funds += price; if(S.rs) S.rs.sold++;
  Object.assign(p, {st:'private', ty:'housing', dev:{phase:'permit', t:ri(2,3)}, flag:null});
  log('log.sold', {at:pname(i), x:money(price)}, 'good'); gainXp('sold');
  return {ok:true, msg:{k:'fx.money', p:{x:money(price)}}, cls:'good', sfx:'cash'};
}
export function submitPlan(){
  if(!canAct(2)) return fail('err.slots2');
  if(S.plan) return fail('err.planBusy');
  const list = S.grid.map((p,i)=>i).filter(i=>{ const p=S.grid[i]; return p.st==='owned' && !p.urban; });
  if(!list.length) return fail('err.planNothing');
  if(S.funds < CFG.planCost) return fail('err.funds');
  S.slots -= 2; spend(CFG.planCost);
  S.plan = {t: CFG.planMonths + (S.neigh<30?1:0), list}; S.stats.plan++;
  log('log.planSubmitted', {n:list.length, m:S.plan.t}); gainXp('plan');
  return {ok:true, msg:{k:'fx.filed'}, sfx:'stamp'};
}
export function lobby(){
  if(!canAct()) return fail('err.slots');
  if(S.funds < CFG.lobbyCost) return fail('err.funds');
  S.slots--; spend(CFG.lobbyCost); if(S.rs) S.rs.lunches++;
  const g = has('lobbyist') ? 20 : (S.lobbied ? 6 : 12); S.lobbied++; S.stats.lobby++;
  bump('local', g, 'why.lobby');
  log('log.lobby', {n:g}, 'good'); gainXp('agenda');
  return {ok:true, msg:{k:'fx.local', p:{n:g}}, cls:'good'};
}
export function consult(){
  if(!canAct(2)) return fail('err.slots2');
  if(S.funds < CFG.consultCost) return fail('err.funds');
  S.slots -= 2; spend(CFG.consultCost); S.consults++;
  bump('neigh', 15, 'why.consult');
  let delayed = 0; S.grid.forEach(p=>{ if(p.st==='review'){ p.t++; delayed++; } });
  if(S.plan) S.plan.t++;
  log('log.consult', {n:delayed}, 'good'); gainXp('agenda');
  return {ok:true, msg:{k:'fx.neigh', p:{n:15}}, cls:'good', sfx:'crowd'};
}
export function fileReport(){
  if(!canAct()) return fail('err.slots');
  S.slots--; S.reports++;
  bump('comp', 22, 'why.report');
  log('log.report', {}, 'good'); gainXp('agenda');
  return {ok:true, msg:{k:'fx.comp', p:{n:22}}, cls:'good', sfx:'stamp'};
}
export function repay(){
  if(S.over || S.debt<=0) return fail('err.noDebt');
  const x = Math.min(CFG.loanStep, S.debt);
  if(S.funds < x) return fail('err.funds');
  S.funds -= x; S.debt = r1(S.debt - x);
  log('log.repaid', {x:money(x)}, 'good');
  return {ok:true, msg:{k:'fx.money', p:{x:money(-x)}}, sfx:'cash'};
}
// v0.10: the player names the town (free: no agenda slot). Up to 24 characters; empty keeps the old name.
export const TOWN_MAX = 24;
export function renameTown(name){
  const v = String(name || '').replace(/\s+/g, ' ').trim().slice(0, TOWN_MAX);
  if(!S || !v) return fail('err.townEmpty');
  if(v === S.town) return {ok:true, msg:{k:'log.townSame'}};
  const old = S.town; S.town = v; if(S.region && S.region.active) S.region.active.town = v;
  log('log.renamed', {a:old, b:v}, 'good');
  return {ok:true, msg:{k:'log.renamed', p:{a:old, b:v}}};
}
// A name suggestion in the house style (k: any integer — the UI passes a random one, so the run's own seed is untouched)
export function suggestTown(k){ const a = TOWN_A[Math.abs(k) % TOWN_A.length], b = TOWN_B[Math.abs(Math.floor(k / 7)) % TOWN_B.length]; return a.endsWith('-') ? a+b : a+' '+b; }
