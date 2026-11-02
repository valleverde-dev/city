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
  if(p.expro) return fail('err.expro');   // v0.11: being expropriated
  if(p.st!=='land' || !['farm','muni'].includes(p.k)) return fail('err.notForSale');   // v0.11.1: rivers and lakes are not for sale
  if(p.k==='muni' && on('local') && S.local < 40) return fail('err.mayorNo');
  const price = landPrice(p);
  if(avail() < price) return fail(on('debt') ? 'err.funds' : 'err.committed');
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
  if(!on('debt') && avail() < CFG.permitFee + buildCost(p, ty)) return fail('err.fundsBuild');
  S.slots--; spend(CFG.permitFee);
  p.st = 'review'; p.ty = ty; p.t = permitMonths(ty); p.flag = null;
  if(S.fast > 0){ S.fast--; p.st = 'approved'; p.q = ++S.qseq; p.t = 0; log('log.fast', {b:ty, at:pname(i)}, 'good'); }   // a milestone reward: already approved
  if(ty==='factory') bump('neigh', -3, 'why.factory');
  if(nextToVillage(r,c) && ty!=='park'){ bump('neigh', -3, 'why.village'); log('log.village', {}, 'bad'); }
  log('log.permit', {b:ty, at:pname(i), n:p.t}); gainXp('permit');
  return {ok:true, msg:{k:'fx.filed'}, sfx:'stamp'};
}
// v0.10: ask Brussels for more time. Two slots and some goodwill; granted only if compliance is still decent
// afterwards (no dice — the meter is on screen). Once per phase.
export const EXT_MONTHS = 3, EXT_COMP = 10, EXT_NEED = 45;
export function requestExtension(){
  if(!on('directives')) return fail('err.notYet');
  if(S.extAsked) return fail('err.extAsked');
  if(!canAct(2)) return fail('err.slots');
  S.slots -= 2; S.extAsked = true; bump('comp', -EXT_COMP, 'why.extension');
  if(S.comp >= EXT_NEED){ S.ext = (S.ext||0) + EXT_MONTHS; log('log.extOk', {n:EXT_MONTHS}, 'good'); return {ok:true, msg:{k:'fx.extOk', p:{n:EXT_MONTHS}}, sfx:'stamp'}; }
  log('log.extNo', {}, 'bad'); return {ok:true, refused:true, cls:'bad', msg:{k:'fx.extNo'}, sfx:'fail'};
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
// v0.9.2: the player names the town (free: no agenda slot). Up to 24 characters; empty keeps the old name.
export const TOWN_MAX = 24;
export function renameTown(name){
  const v = String(name || '').replace(/\s+/g, ' ').trim().slice(0, TOWN_MAX);
  if(!S || !v) return fail('err.townEmpty');
  if(v === S.town) return {ok:true, msg:{k:'log.townSame'}};
  const old = S.town; S.town = v;
  // the founding district goes with the city's name, unless it has been given one of its own (renameDistrict)
  const d0 = S.region && S.region.blocks[0]; if(d0 && d0.town === old) d0.town = v;
  log('log.renamed', {a:old, b:v}, 'good');
  return {ok:true, msg:{k:'log.renamed', p:{a:old, b:v}}};
}
// =====================================================================
//  v0.11 — NEGOTIATING WITH A STUBBORN OWNER (once you have met them). Besides paying what they ask:
//  · lean on them through the mayor: 1 slot, the Mayor −10; the markup is halved (needs the Mayor at 50+)
//  · expropriate: 2 slots, the base price (no markup) paid now, the neighbours −12; the parcel is yours in 4 months
//  · leave them in peace: free; the neighbours +3, and they stop asking you (you can still pay their price)
// =====================================================================
export const NEG = {leanLocal:-10, leanNeed:50, exproSlots:2, exproMonths:4, exproNeigh:-12, peaceNeigh:3};
const stubborn = p => p && p.st==='land' && p.hold && p.holdKnown && !p.expro;
export function basePrice(p){ return r1(p.price / (1 + (p.holdPct||80)/100)); }
export function leanOnOwner(i){
  const p = S.grid[i];
  if(!stubborn(p) || p.leaned || p.peace) return fail('err.noDeal');
  if(!on('local')) return fail('err.notYet');
  if(!canAct()) return fail('err.slots');
  if(S.local < NEG.leanNeed) return fail('err.mayorNo');
  const base = basePrice(p);
  S.slots--; p.leaned = true; p.holdPct = Math.round((p.holdPct||80)/2); p.price = r1(base*(1 + p.holdPct/100));
  bump('local', NEG.leanLocal, 'why.lean'); log('log.lean', {at:pname(i), x:money(landPrice(p))}); gainXp('agenda');
  return {ok:true, msg:{k:'fx.lean', p:{x:money(landPrice(p))}}, sfx:'stamp'};
}
export function expropriate(i){
  const p = S.grid[i];
  if(!stubborn(p) || p.peace) return fail('err.noDeal');
  if(!canAct(NEG.exproSlots)) return fail('err.slots');
  const x = r1(basePrice(p) * (has('notary') ? 0.7 : 1));
  if(avail() < x) return fail(on('debt') ? 'err.funds' : 'err.committed');
  S.slots -= NEG.exproSlots; spend(x); p.expro = NEG.exproMonths;
  bump('neigh', NEG.exproNeigh, 'why.expro'); log('log.expro', {at:pname(i), x:money(x), n:NEG.exproMonths}, 'bad');
  return {ok:true, msg:{k:'fx.expro', p:{n:NEG.exproMonths}}, sfx:'stamp'};
}
export function leaveInPeace(i){
  const p = S.grid[i];
  if(!stubborn(p) || p.peace) return fail('err.noDeal');
  p.peace = true; bump('neigh', NEG.peaceNeigh, 'why.peace'); log('log.peace', {at:pname(i)}, 'good');
  return {ok:true, msg:{k:'fx.peace'}, sfx:'click'};
}
// Each month: expropriations run their course
export function tickExpro(){
  S.grid.forEach((p,i)=>{ if(!p.expro || p.st!=='land') return;
    if(--p.expro <= 0){ p.expro = 0; Object.assign(p, {st:'owned', hold:false}); log('log.exproDone', {at:pname(i)}, 'good'); } });
}

// =====================================================================
//  v0.11 — GOSSIP AT THE VILLAGE BAR: a slot and a round of drinks. The regulars tell you who owns what:
//  stubborn owners get marked before you meet them. Some gossip is false (a rumour that the parcel is held);
//  the angrier the neighbours, the less they tell. Rumours are cleared when you meet the real owner.
// =====================================================================
export const GOSSIP = {cost:0.3, lie:0.25};
export function gossipCount(){ if(!on('neigh')) return 2; return S.neigh < 20 ? 0 : S.neigh < 40 ? 1 : S.neigh < 65 ? 2 : 3; }
export function gossip(){
  if(!S.grid.some(p=>p.k==='village')) return fail('err.noBar');
  if(S.gossiped) return fail('err.gossiped');
  if(!canAct()) return fail('err.slots');
  if(S.funds < GOSSIP.cost) return fail('err.funds');
  S.slots--; spend(GOSSIP.cost); S.gossiped = true; gainXp('agenda');
  const n = gossipCount();
  if(!n){ log('log.gossip0', {}, 'bad'); return {ok:true, cls:'bad', msg:{k:'fx.gossip0'}, sfx:'crowd'}; }
  const held = S.grid.map((p,i)=>i).filter(i=>{ const p = S.grid[i]; return p.st==='land' && p.hold && !p.holdKnown; });
  const plain = S.grid.map((p,i)=>i).filter(i=>{ const p = S.grid[i]; return p.st==='land' && p.k==='farm' && !p.hold && !p.rumour; });
  let told = 0;
  for(let k=0; k<n; k++){
    if(rnd() < GOSSIP.lie && plain.length){ const i = plain.splice(Math.floor(rnd()*plain.length),1)[0]; S.grid[i].rumour = true; told++; }
    else if(held.length){ const i = held.splice(Math.floor(rnd()*held.length),1)[0]; S.grid[i].holdKnown = true; S.grid[i].heard = true; told++; }
  }
  log('log.gossip', {n:told}, told ? 'good' : '');
  return {ok:true, msg:{k: told ? 'fx.gossip' : 'fx.gossipNone', p:{n:told}}, sfx:'crowd'};
}
// A name suggestion in the house style (k: any integer — the UI passes a random one, so the run's own seed is untouched)
export function suggestTown(k){ const a = TOWN_A[Math.abs(k) % TOWN_A.length], b = TOWN_B[Math.abs(Math.floor(k / 7)) % TOWN_B.length]; return a.endsWith('-') ? a+b : a+' '+b; }
// v0.10.1: each plot is a district with its own name, which can be changed too (free, like the city's)
export function renameDistrict(k, name){
  const B = S && S.region && S.region.blocks[k]; if(!B) return fail('err.townEmpty');
  const v = String(name || '').replace(/\s+/g, ' ').trim().slice(0, TOWN_MAX); if(!v) return fail('err.townEmpty');
  if(v === B.town) return {ok:true, msg:{k:'log.townSame'}};
  const old = B.town; B.town = v; log('log.renamed', {a:old, b:v}, 'good');
  return {ok:true, msg:{k:'log.renamed', p:{a:old, b:v}}};
}
// v0.10.1: a stubborn owner shows up when you go for their land (tapping the parcel): from then on it is known
// and marked on the map. Until then nothing gives it away. Free: meeting someone costs no slot.
export function meetOwner(i){
  const p = S && S.grid[i]; if(p && p.rumour){ p.rumour = false; if(!p.hold){ log('log.rumour', {at:pname(i)}); return {ok:true, rumour:true}; } }   // v0.11: bar gossip was wrong
  if(!p || !p.hold || p.holdKnown) return {ok:false};
  p.holdKnown = true; log('log.owner', {at:pname(i), x:money(landPrice(p))}, 'bad');
  return {ok:true};
}
