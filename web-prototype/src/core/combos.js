import { on } from './config.js';
import { N, NB8, S, idx, inside, rc } from './state.js';
import { codeTokens, frontierAround, regionFx } from './region.js';
import { storage } from './storage.js';

// =====================================================================
//  COMBOS — Kairosoft-style adjacency bonuses (and penalties), between 8-way neighbours,
//  counted once per pair. 'b' may be a building or a land feature (flood, village, regional road).
//  fx per pair: homes / jobs / school / health (capacity), neigh / local (per month), tax (€M/month), rate (move-in speed)
//  Players discover them by building; the catalogue persists between runs.
// =====================================================================
export const COMBOS = [
  {id:'greenViews',     a:'housing', b:'park',     good:true,  fx:{homes:20, rate:0.03}},
  {id:'walkToSchool',   a:'housing', b:'school',   good:true,  fx:{school:60}},
  {id:'healthHub',      a:'housing', b:'clinic',   good:true,  fx:{health:120}},
  {id:'barrio',         a:'housing', b:'housing',  good:true,  fx:{homes:15}},
  {id:'estate',         a:'factory', b:'factory',  good:true,  fx:{jobs:40, tax:0.05}},
  {id:'logistics',      a:'factory', b:'regional', good:true,  fx:{jobs:25}},
  {id:'outdoorClass',   a:'school',  b:'park',     good:true,  fx:{neigh:1}},
  {id:'riverside',      a:'park',    b:'flood',    good:true,  fx:{neigh:1, rate:0.02}},
  {id:'heritage',       a:'park',    b:'village',  good:true,  fx:{neigh:1, local:1}},
  {id:'smoke',          a:'factory', b:'housing',  good:false, fx:{homes:-25, neigh:-1}},
  {id:'villageFactory', a:'factory', b:'village',  good:false, fx:{neigh:-2}},
  {id:'fumes',          a:'factory', b:'school',   good:false, fx:{school:-80, neigh:-1}},
  {id:'clinicNoise',    a:'factory', b:'clinic',   good:false, fx:{health:-100}},
  // v0.8: the buildings unlocked through the career
  {id:'marketStreet',   a:'market',  b:'housing',  good:true,  fx:{homes:20, tax:0.02}},
  {id:'farmersMarket',  a:'market',  b:'village',  good:true,  fx:{local:1, tax:0.02}},
  {id:'commute',        a:'station', b:'housing',  good:true,  fx:{homes:30, rate:0.03}},
  {id:'freightYard',    a:'station', b:'factory',  good:true,  fx:{jobs:50}},
  {id:'readingPark',    a:'library', b:'park',     good:true,  fx:{neigh:1}},
  {id:'studyHall',      a:'library', b:'school',   good:true,  fx:{school:100}},
  {id:'safeStreets',    a:'police',  b:'housing',  good:true,  fx:{homes:15, neigh:1}},
  {id:'selfConsumption',a:'solar',   b:'factory',  good:true,  fx:{tax:0.04, jobs:20}},
  {id:'greenCloud',     a:'data',    b:'solar',    good:true,  fx:{tax:0.05}},
  {id:'plazaMayor',     a:'townhall',b:'village',  good:true,  fx:{local:1, neigh:1}},
  {id:'communityGarden',a:'social',  b:'park',     good:true,  fx:{homes:25, neigh:1}},
  {id:'glare',          a:'solar',   b:'housing',  good:false, fx:{homes:-20, neigh:-1}},
  {id:'serverHum',      a:'data',    b:'housing',  good:false, fx:{homes:-25, neigh:-1}},
  {id:'stationNoise',   a:'station', b:'school',   good:false, fx:{school:-60}},
];
// What a parcel "is" for combos: its finished building and/or its land feature
export function tokens(p){ const t = [];
  if(p.st==='built' && p.ty && p.ty!=='road' && p.k!=='regional') t.push(p.ty);
  if(p.k==='village' || p.k==='regional' || (p.k==='flood' && p.st==='land')) t.push(p.k);
  return t; }
export function matchCombos(ta, tb){ const out = [];
  COMBOS.forEach(c=>{ if((ta.includes(c.a) && tb.includes(c.b)) || (ta.includes(c.b) && tb.includes(c.a))) out.push(c); });
  return out; }
export function activeCombos(){
  const list = []; if(!on('combos')) return list;
  for(let i=0;i<N*N;i++){ const ti = tokens(S.grid[i]); if(!ti.length) continue; const [r,c] = rc(i);
    for(const [dr,dc] of NB8){ const r2=r+dr, c2=c+dc; if(!inside(r2,c2)) continue; const j = idx(r2,c2); if(j<=i) continue;
      const tj = tokens(S.grid[j]); if(!tj.length) continue;
      matchCombos(ti, tj).forEach(cb=>list.push({id:cb.id, i, j, good:cb.good})); }   // every combo needs a building ('a')
    // across the border: the consolidated neighbour's parcels (j = -1-k)
    frontierAround(r,c).forEach(k=>matchCombos(ti, codeTokens(S.frontier[k].x)).forEach(cb=>list.push({id:cb.id, i, j:-1-k, good:cb.good}))); }
  return list;
}
export const COMBO_BY_ID = Object.fromEntries(COMBOS.map(c=>[c.id,c]));
export function comboFx(){ const f = {homes:0, jobs:0, school:0, health:0, neigh:0, local:0, tax:0, rate:0};
  activeCombos().forEach(x=>{ const e = COMBO_BY_ID[x.id].fx; for(const k in e) f[k] += e[k]; });
  const R = regionFx(); for(const k in f) if(R[k]) f[k] += R[k];   // the settlement's type and its region combos
  return f; }
// Which combos would appear if 'ty' were built on parcel i (used for the preview)
export function comboPreview(i, ty){
  if(!on('combos')) return [];
  const [r,c] = rc(i), me = [ty];
  const seen = new Map();
  NB8.forEach(([dr,dc])=>{ if(!inside(r+dr,c+dc)) return; matchCombos(me, tokens(S.grid[idx(r+dr,c+dc)])).forEach(cb=>seen.set(cb.id, cb)); });
  frontierAround(r,c).forEach(k=>matchCombos(me, codeTokens(S.frontier[k].x)).forEach(cb=>seen.set(cb.id, cb)));
  return [...seen.values()];
}
// The catalogue of discovered combos survives between runs (it is knowledge, not power)
export function discovered(){ try{ return JSON.parse(storage.get('eurocrat_combos')||'[]'); }catch(e){ return []; } }
export function discover(id){ const d = discovered(); if(d.includes(id)) return false; d.push(id); try{ storage.set('eurocrat_combos', JSON.stringify(d)); }catch(e){} return true; }
