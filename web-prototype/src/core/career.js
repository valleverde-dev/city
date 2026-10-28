import { B, BASE_TYPES, CFG, NEW_TYPES, PERKS, N_COUNTRIES, on } from './config.js';
import { activeCombos, discovered } from './combos.js';
import { REGION_COMBOS, STYPES, regionPop } from './region.js';
import { S } from './state.js';
import { storage } from './storage.js';

// =====================================================================
//  THE CAREER — what carries over between runs (v0.8). Every run gives experience, even a lost one;
//  experience raises your rank (and with it the grant of every settlement); achievements unlock new
//  buildings for good. Stored apart from the run ('eurocrat_career').
// =====================================================================
export const RANKS = [0, 250, 700, 1400, 2500, 4000, 6000, 9000];   // experience needed for each rank
export const RANK_BONUS = 0.04;                                      // +4% of every grant per rank above the first
// Achievements. when: the moment they are checked ('month' every month end, 'consolidate', 'over', 'mascot');
// test(ctx) the condition; unlock: the building it unlocks (if any); xp: experience.
const cnt = ty => S.grid.filter(p=>p.st==='built' && p.ty===ty).length;
export const ACH = [
  {id:'firstStone',  when:'month',       xp:50,  unlock:'market',   test:()=>cnt('housing')>=1},
  {id:'expansion',   when:'consolidate', xp:100, unlock:'social',   test:()=>S.region.blocks.length>=2},
  {id:'comboHunter', when:'month',       xp:100, unlock:'library',  test:()=>discovered().length>=5},
  {id:'firstLoss',   when:'over',        xp:50,  unlock:'police',   test:()=>S.over && !S.over.win},
  {id:'greenFingers',when:'month',       xp:100, unlock:'solar',    test:()=>cnt('park')>=3},
  {id:'region3',     when:'consolidate', xp:150, unlock:'station',  test:()=>S.region.blocks.length>=3},
  {id:'survivor',    when:'consolidate', xp:150, unlock:'data',     test:()=>S.debt>0},
  {id:'kafka',       when:'month',       xp:100, unlock:'townhall', test:()=>(S.stats.approved||0)>=5},
  {id:'noRefund',    when:'consolidate', xp:100, test:()=>S.carry < 0.5},
  {id:'early',       when:'consolidate', xp:100, test:c=>c.left>=3},
  {id:'lunches',     when:'month',       xp:50,  test:()=>(S.rs.lunches||0)>=10},
  {id:'nimby',       when:'month',       xp:50,  test:()=>on('neigh') && S.neigh<=10},
  {id:'pelotazo',    when:'month',       xp:100, test:()=>(S.rs.sold||0)>=3},
  {id:'mascot',      when:'mascot',      xp:50,  test:()=>true},
  {id:'region5',     when:'consolidate', xp:200, test:()=>S.region.blocks.length>=5},
  {id:'region8',     when:'consolidate', xp:400, test:()=>S.region.blocks.length>=8},
  {id:'metro',       when:'month',       xp:150, test:()=>regionPop() + S.newcomers + (S.base||0) >= 2000},
  {id:'mega',        when:'month',       xp:400, test:()=>regionPop() + S.newcomers + (S.base||0) >= 10000},
  {id:'creative',    when:'month',       xp:50,  test:()=>activeCombos().filter(x=>!x.good).length>=3},
  {id:'fifteen',     when:'month',       xp:100, test:()=>['housing','factory','school','clinic','park'].every(t=>cnt(t)>=1)},
  {id:'premiere',    when:'month',       xp:50,  test:()=>NEW_TYPES.some(t=>cnt(t)>=1)},
  {id:'audited',     when:'over',        xp:50,  test:()=>S.over && S.over.why==='audit'},
  {id:'rescue',      when:'over',        xp:50,  test:()=>S.over && S.over.why==='bankrupt'},
  {id:'review',      when:'over',        xp:50,  test:()=>S.over && S.over.why==='suspended'},
  {id:'tourist',     when:'month',       xp:100, test:()=>career().types.length>=5},
  {id:'diplomat',    when:'month',       xp:100, test:()=>discovered().filter(id=>REGION_COMBOS.some(c=>c.id===id)).length>=3},
];
export const ACH_BY_ID = Object.fromEntries(ACH.map(a=>[a.id, a]));
export const UNLOCKED_BY = Object.fromEntries(ACH.filter(a=>a.unlock).map(a=>[a.unlock, a.id]));

const KEY = 'eurocrat_career';
export function career(){ try{ const c = JSON.parse(storage.get(KEY)||'null'); if(c && Array.isArray(c.ach)) return {types:[], guide:false, tutorial:false, runs:0, xp:0, ...c}; }catch(e){}
  return {xp:0, ach:[], types:[], runs:0, tutorial:false, guide:false}; }
export function saveCareer(c){ try{ storage.set(KEY, JSON.stringify(c)); }catch(e){} }
export function rankOf(xp){ let r = 0; RANKS.forEach((t,k)=>{ if(xp >= t) r = k; }); return r; }
export function rankBonus(){ return rankOf(career().xp) * RANK_BONUS; }
// A building can be ordered if it is one of the originals or its achievement has been earned
export function unlocked(ty){ return BASE_TYPES.includes(ty) || career().ach.includes(UNLOCKED_BY[ty]); }
export function addXp(n){ const c = career(), before = rankOf(c.xp); c.xp += n; saveCareer(c);
  const after = rankOf(c.xp); if(after > before && S) (S.rankUps = S.rankUps || []).push(after); return after > before; }
// Check the achievements of one moment. New ones are stored, give experience and are queued in S.newAch for the UI.
export function checkAch(when, ctx = {}){
  if(!S || !S.rs) return [];
  const c = career(), got = [];
  ACH.forEach(a=>{ if(a.when!==when || c.ach.includes(a.id)) return; let ok = false; try{ ok = a.test(ctx); }catch(e){} if(!ok) return;
    c.ach.push(a.id); got.push(a.id); });
  if(!got.length) return got;
  saveCareer(c);
  got.forEach(id=>{ S.rs.ach.push(id); (S.newAch = S.newAch || []).push(id); addXp(ACH_BY_ID[id].xp); });
  return got;
}
// A settlement type has been seen (for 'tourist'), and the tutorial is behind us once a run gets anywhere
export function seeType(ty){ const c = career(); if(!c.types.includes(ty)){ c.types.push(ty); saveCareer(c); } }
export function tutorialDone(){ const c = career(); if(!c.tutorial){ c.tutorial = true; saveCareer(c); } }
// The end of a run: experience for what the region reached (achievements were paid when earned)
export function runXp(){ const settled = S.region.blocks.length, pop = regionPop() + (S.region.active ? S.newcomers + (S.base||0) : 0);
  return settled*100 + Math.floor(pop/20); }
export function endRun(){
  const c0 = career(), before = c0.xp, xp = runXp();
  c0.runs++; saveCareer(c0); addXp(xp);
  checkAch('over'); tutorialDone();
  const c = career();
  return {xp, before, after:c.xp, rank0: rankOf(before), rank1: rankOf(c.xp), ach: S.rs.ach.slice()};
}
// Quick start (after the tutorial): three dossiers to choose from — a settlement type, a perk, and money.
// A small separate random generator, so the offer does not touch the run's own seed.
export function drafts(seed){
  let x = seed|0; const r = () => { x = (x + 0x6D2B79F5)|0; let t = Math.imul(x ^ (x>>>15), x|1); t ^= t + Math.imul(t ^ (t>>>7), t|61); return ((t ^ (t>>>14))>>>0)/4294967296; };
  const pick = a => a[Math.floor(r()*a.length)], perks = Object.keys(PERKS).filter(k=>k!=='shovel'), out = [], used = new Set();
  while(out.length < 3){ const ty = pick(STYPES); if(used.has(ty)) continue; used.add(ty);
    out.push({ty, perk: pick(perks), country: Math.floor(r()*N_COUNTRIES), seed: (r()*2147483647)|0}); }
  return out;
}
