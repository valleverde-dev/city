import { CFG, stageCfg } from './config.js';
import { COMBOS, discover, discovered } from './combos.js';
import { offerPerks } from './directives.js';
import { bump, log } from './rules.js';
import { S, r1, rnd } from './state.js';

// =====================================================================
//  MILESTONE REWARDS (v0.10) — reaching a target brings three offers, each from a character. Pick one.
//  Some come with a catch (more of the good thing, a meter pays for it). Reaching the milestone early,
//  without debt or with many combos makes offers gold (bigger); all three at once adds a fourth offer.
//  An offer: {id, char, gold, deal}. Applied by chooseReward(k); effects that need the next plot
//  (free land) wait in S.gifts until the next phase begins.
// =====================================================================
export const REWARDS = {
  perk:   {char:'brussels',  icon:'key',                    ok:()=>true},
  money:  {char:'banker',    icon:'payments',               ok:()=>true, deal:true},
  slot:   {char:'mayor',     icon:'event',        ok:()=>(S.extraSlots||0) < 2, deal:true},
  fast:   {char:'developer', icon:'verified',               ok:()=>true},
  land:   {char:'farmer',    icon:'agriculture',            ok:()=>true, deal:true},
  meters: {char:'neighbour', icon:'campaign',     ok:()=>true},
  debt:   {char:'banker',    icon:'account_balance_wallet', ok:()=>S.debt > 0},
  combo:  {char:'heritage',  icon:'workspace_premium',      ok:()=>COMBOS.some(c=>!discovered().includes(c.id))},
};
// What an offer gives, in numbers (the UI shows them; gold = bigger)
export function rewardValue(o){
  const next = stageCfg((S.stage||0)+1).grant;
  switch(o.id){
    case 'money':  return {x: r1(next*(o.gold ? 0.3 : 0.18)*(o.deal ? 1.6 : 1))};
    case 'slot':   return {n: o.deal ? 2 : 1};
    case 'fast':   return {n: o.gold ? 3 : 2};
    case 'land':   return {n: (o.gold ? 4 : 3) + (o.deal ? 2 : 0)};
    case 'meters': return {n: o.gold ? 25 : 15};
    case 'debt':   return {x: r1(o.gold ? S.debt : S.debt/2)};
    case 'combo':  return {n: o.gold ? 2 : 1};
    case 'perk':   return {n: o.gold ? 4 : 3};
  }
  return {};
}
// The catch of a deal: which meter pays, and how much
export const DEAL = {money:['neigh',-15], slot:['comp',-12], land:['local',-12]};
// Why the offers are gold this time: early (a quarter of the months left), no debt, 3+ combos discovered this run
export function goldReasons(left, combos){
  const r = [];
  if(left >= Math.ceil(CFG.months/4)) r.push('early');
  if(S.debt <= 0) r.push('nodebt');
  if(combos >= 3) r.push('combos');
  return r;
}
export function offerRewards(left = 0){
  const combos = (S.comboSeen||[]).length, gold = goldReasons(left, combos);
  const pool = Object.keys(REWARDS).filter(id=>REWARDS[id].ok());
  const n = gold.length >= 3 ? 4 : 3, offers = [];
  // the perk is always on offer (the roguelike spine); the rest are drawn
  if(pool.includes('perk')){ offers.push('perk'); pool.splice(pool.indexOf('perk'), 1); }
  while(offers.length < n && pool.length) offers.push(pool.splice(Math.floor(rnd()*pool.length), 1)[0]);
  // shuffle so the perk is not always first
  for(let i=offers.length-1;i>0;i--){ const j = Math.floor(rnd()*(i+1)); [offers[i], offers[j]] = [offers[j], offers[i]]; }
  let golds = gold.length;
  const list = offers.map(id=>{ const o = {id, char:REWARDS[id].char, gold:false, deal:false};
    if(REWARDS[id].deal && rnd() < 0.4) o.deal = true;
    return o; });
  // each reason makes one offer gold
  // (never the deputy mayor: one slot more is the same in gold — v0.11.1)
  list.filter(o=>o.id!=='slot').sort(()=>rnd()-0.5).forEach(o=>{ if(golds > 0){ o.gold = true; golds--; } });
  S.cards.push({type:'reward', offers:list, gold});
}
export function chooseReward(k){
  const c = S.cards[0]; if(!c || c.type!=='reward') return {ok:false};
  const o = c.offers[k|0]; if(!o) return {ok:false};
  const v = rewardValue(o);
  S.cards.shift();
  S.gifts = S.gifts || {};
  switch(o.id){
    case 'perk':   offerPerks(v.n); break;
    case 'money':  S.carry = r1((S.carry||0) + v.x); S.funds = r1(S.funds + v.x); break;
    case 'slot':   S.extraSlots = (S.extraSlots||0) + v.n; break;
    case 'fast':   S.fast = (S.fast||0) + v.n; break;
    case 'land':   S.gifts.land = (S.gifts.land||0) + v.n; break;
    case 'meters': ['local','neigh','comp'].forEach(m=>bump(m, v.n, 'why.reward')); break;
    case 'debt':   S.debt = r1(Math.max(0, S.debt - v.x)); break;
    case 'combo':  { const hidden = COMBOS.filter(cb=>!discovered().includes(cb.id)); for(let n=0;n<v.n && hidden.length;n++){ const cb = hidden.splice(Math.floor(rnd()*hidden.length),1)[0]; discover(cb.id); (S.revealed = S.revealed || []).push(cb.id); } break; }
  }
  if(o.deal && DEAL[o.id]) bump(DEAL[o.id][0], DEAL[o.id][1], 'why.deal');
  log('log.reward', {r:o.id}, 'good');
  return {ok:true, o, v};
}
