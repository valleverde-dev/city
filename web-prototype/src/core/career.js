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
// Levels. Level n needs LEVEL_K·n·(n+1) experience in total; every few levels comes a new rank.
// v0.9.2: LEVEL_K 50 → 350. With 50 a first run reached level 7 and unlocked almost everything; now a first run
// gives about one level, then roughly one level per run (bot, career kept: level ~6 after 5 runs, ~15 after 20).
export const LEVEL_K = 350;
export const levelXp = n => LEVEL_K*n*(n+1);
export function levelOf(xp){ let n = 0; while(levelXp(n+1) <= xp) n++; return n; }
export const RANK_LEVEL = [0, 2, 4, 6, 8, 11, 14, 18];             // the level at which each rank is reached
export const RANKS = RANK_LEVEL.map(levelXp);                      // experience needed for each rank
export const RANK_BONUS = 0.04;                                      // +4% of every grant per rank above the first
// Achievements. when: the moment they are checked ('month' every month end, 'consolidate', 'over', 'mascot');
// test(ctx) the condition; xp: experience. (Until v0.9 eight of them unlocked buildings; since v0.9.2 levels do.)
const cnt = ty => S.grid.filter(p=>p.st==='built' && p.ty===ty).length;
export const ACH = [
  {id:'firstStone',  when:'month',       xp:50,   test:()=>cnt('housing')>=1},
  {id:'expansion',   when:'consolidate', xp:100,  test:()=>S.region.blocks.length>=2},
  {id:'comboHunter', when:'month',       xp:100,  test:()=>discovered().length>=5},
  {id:'firstLoss',   when:'over',        xp:50,   test:()=>S.over && !S.over.win},
  {id:'greenFingers',when:'month',       xp:100,  test:()=>cnt('park')>=3},
  {id:'region3',     when:'consolidate', xp:150,  test:()=>S.region.blocks.length>=3},
  {id:'survivor',    when:'consolidate', xp:150,  test:()=>S.debt>0},
  {id:'kafka',       when:'month',       xp:100,  test:()=>(S.stats.approved||0)>=5},
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
// v0.9 — experience is earned as you play, not only at the end: every useful step gives a little
export const XP_FOR = {acquire:2, permit:3, approved:3, built:6, road:1, combo:8, discover:25, month:1, consolidate:100, sold:4, agenda:1, plan:4};
// Perks join the pool of rewards as you rise through the ranks (rank needed for each)
export const PERK_RANK = {notary:0, fasttrack:0, prefab:0, contractor:0, cousin:0, translation:0, comms:1, lobbyist:1, fixer:2, shovel:2, cohesion:3, taxadvisor:4, ombudsman:5, revolving:6};
export const ACH_BY_ID = Object.fromEntries(ACH.map(a=>[a.id, a]));
// v0.9.2: the new buildings are unlocked by career level, spread along the curve so they arrive over many runs
export const UNLOCK_LEVEL = {market:2, library:3, police:5, social:7, townhall:9, solar:11, station:14, data:18};
// The buildings a level unlocks (for the level-up banner)
export const unlocksAt = lv => Object.keys(UNLOCK_LEVEL).filter(ty=>UNLOCK_LEVEL[ty]===lv);

const KEY = 'eurocrat_career';
export function career(){ try{ const c = JSON.parse(storage.get(KEY)||'null'); if(c && Array.isArray(c.ach)) return {types:[], perks:[], guide:false, tutorial:false, runs:0, xp:0, ...c}; }catch(e){}
  return {xp:0, ach:[], types:[], perks:[], runs:0, tutorial:false, guide:false}; }
// A clean career file (tests and the balance bot: every run starts from the same pool of perks)
export function resetCareer(){ try{ storage.set(KEY, ''); }catch(e){} }
export function saveCareer(c){ try{ storage.set(KEY, JSON.stringify(c)); }catch(e){} }
export function rankOf(xp){ let r = 0; RANKS.forEach((t,k)=>{ if(xp >= t) r = k; }); return r; }
export function rankBonus(){ return rankOf(career().xp) * RANK_BONUS; }
// A building can be ordered if it is one of the originals or your career level has reached its level
export function unlocked(ty){ return BASE_TYPES.includes(ty) || levelOf(career().xp) >= (UNLOCK_LEVEL[ty] ?? Infinity); }
export function addXp(n){ const c = career(), before = rankOf(c.xp), lv0 = levelOf(c.xp); c.xp += n; saveCareer(c);
  const after = rankOf(c.xp), lv1 = levelOf(c.xp);
  if(S && lv1 > lv0 && after === before) (S.levelUps = S.levelUps || []).push(lv1);   // a promotion says it louder
  if(S) for(let lv = lv0+1; lv <= lv1; lv++) unlocksAt(lv).forEach(ty=>(S.unlocks = S.unlocks || []).push(ty));
  if(after > before && S) (S.rankUps = S.rankUps || []).push(after); return after > before; }
// Live experience: kind is a key of XP_FOR (n: how many). Counted for the run (S.rs.xp) and the career at once.
export function gainXp(kind, n = 1){
  if(!S || !S.rs || S.over) return 0;
  const x = (XP_FOR[kind] || 0) * n; if(!x) return 0;
  S.rs.xp = (S.rs.xp || 0) + x; addXp(x); return x;
}
export function rankNow(){ return rankOf(career().xp); }
// Perks you can be offered: the rank you had when the run began decides (a promotion widens the pool from the next run)
export function perkAvailable(k){ const r = S && S.rs && S.rs.rank0 !== undefined ? S.rs.rank0 : rankNow(); return r >= (PERK_RANK[k] || 0); }
export function seePerk(k){ const c = career(); if(!c.perks.includes(k)){ c.perks.push(k); saveCareer(c); } }
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
// At the end of a run, a bonus for the people the region houses (the rest was earned along the way)
export function runXp(){ const pop = regionPop() + (S.region.active ? S.newcomers + (S.base||0) : 0);
  return Math.floor(pop/20); }
export function endRun(){
  const c0 = career(), bonus = runXp(), live = S.rs.xp || 0, before = S.rs.xp0 !== undefined ? S.rs.xp0 : c0.xp - live;
  c0.runs++; saveCareer(c0); addXp(bonus);
  checkAch('over'); tutorialDone();
  const c = career();
  return {xp: c.xp - before, bonus, before, after:c.xp, rank0: rankOf(before), rank1: rankOf(c.xp), ach: S.rs.ach.slice()};
}
// v0.9.2: no more choosing. After the tutorial every run starts from one random draw — a settlement type,
// a starting perk and a member state — revealed on the settlement screen. A small separate random generator,
// so the draw does not touch the run's own seed.
export function randomStart(seed){
  let x = seed|0; const r = () => { x = (x + 0x6D2B79F5)|0; let t = Math.imul(x ^ (x>>>15), x|1); t ^= t + Math.imul(t ^ (t>>>7), t|61); return ((t ^ (t>>>14))>>>0)/4294967296; };
  const pick = a => a[Math.floor(r()*a.length)], perks = Object.keys(PERKS).filter(k=>k!=='shovel' && (PERK_RANK[k]||0) <= rankNow());
  return {ty: pick(STYPES), perk: pick(perks), country: Math.floor(r()*N_COUNTRIES), seed: (r()*2147483647)|0};
}
