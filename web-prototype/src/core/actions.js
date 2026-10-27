import { B, CFG, on } from './config.js';
import { avail } from './economy.js';
import { money } from './format.js';
import { buildCost, bump, hasAccess, landPrice, log, nextToVillage, permitMonths, plotValue, spend } from './rules.js';
import { S, has, pname, r1, rc, ri, rnd } from './state.js';

// --- Player actions. Each returns {ok, msg:{k,p}, bad?} and never grants anything for free. ---
export const fail = (k,p) => ({ok:false, bad:true, msg:{k, p}});
export function canAct(n=1){ return !S.over && !S.perkChoice && S.slots >= n; }
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
  if(on('holdout') && p.k==='farm' && !p.hold && rnd() < 0.28){
    p.hold = true; p.price = r1(p.price*1.8); p.flag = {k:'holdout', until:S.month+1};
    log('log.holdout', {at:pname(i), x:money(landPrice(p))}, 'bad');
    return {ok:false, bad:true, msg:{k:'fx.holdout'}, sfx:'farmer'};
  }
  spend(price); p.st = 'owned';
  log('log.acquired', {at:pname(i), x:money(price)});
  return {ok:true, msg:{k:'fx.money', p:{x:money(-price)}}};
}
export function requestPermit(i, ty){
  const p = S.grid[i], [r,c] = rc(i);
  if(!canAct()) return fail('err.slots');
  if(p.st!=='owned') return fail('err.mustOwn');
  if(!hasAccess(r,c)) return fail('err.noAccess');
  if(B[ty].urban && !p.urban) return fail('err.rustic');
  if(S.funds < CFG.permitFee) return fail('err.funds');
  // In the learning levels (no bank drama yet) you cannot order works you cannot pay for
  if(!on('lose') && avail() < CFG.permitFee + buildCost(p, ty)) return fail('err.fundsBuild');
  S.slots--; spend(CFG.permitFee);
  p.st = 'review'; p.ty = ty; p.t = permitMonths(ty); p.flag = null;
  if(ty==='factory') bump('neigh', -3, 'why.factory');
  if(nextToVillage(r,c) && ty!=='park'){ bump('neigh', -3, 'why.village'); log('log.village', {}, 'bad'); }
  log('log.permit', {b:ty, at:pname(i), n:p.t});
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
  S.slots--; S.funds += price;
  Object.assign(p, {st:'private', ty:'housing', dev:{phase:'permit', t:ri(2,3)}, flag:null});
  log('log.sold', {at:pname(i), x:money(price)}, 'good');
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
  log('log.planSubmitted', {n:list.length, m:S.plan.t});
  return {ok:true, msg:{k:'fx.filed'}, sfx:'stamp'};
}
export function lobby(){
  if(!canAct()) return fail('err.slots');
  if(S.funds < CFG.lobbyCost) return fail('err.funds');
  S.slots--; spend(CFG.lobbyCost);
  const g = has('lobbyist') ? 20 : (S.lobbied ? 6 : 12); S.lobbied++; S.stats.lobby++;
  bump('local', g, 'why.lobby');
  log('log.lobby', {n:g}, 'good');
  return {ok:true, msg:{k:'fx.local', p:{n:g}}, cls:'good'};
}
export function consult(){
  if(!canAct(2)) return fail('err.slots2');
  if(S.funds < CFG.consultCost) return fail('err.funds');
  S.slots -= 2; spend(CFG.consultCost); S.consults++;
  bump('neigh', 15, 'why.consult');
  let delayed = 0; S.grid.forEach(p=>{ if(p.st==='review'){ p.t++; delayed++; } });
  if(S.plan) S.plan.t++;
  log('log.consult', {n:delayed}, 'good');
  return {ok:true, msg:{k:'fx.neigh', p:{n:15}}, cls:'good', sfx:'crowd'};
}
export function fileReport(){
  if(!canAct()) return fail('err.slots');
  S.slots--; S.reports++;
  bump('comp', 22, 'why.report');
  log('log.report', {}, 'good');
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
