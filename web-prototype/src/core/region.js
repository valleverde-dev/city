import { N, NB8, S, inside } from './state.js';

// =====================================================================
//  EUROREGION — one run is one region that grows on ONE world map (S.world: a W×W grid of terrain
//  codes, generated at the start of the run, like the map of a Cities: Skylines game). Every settlement
//  is an n×n plot of that map (x = column, y = row). The plot in play is expanded into S.grid (local
//  coordinates); when it meets its target it is CONSOLIDATED: what was built is written back into the
//  world, it keeps paying its share of taxes, and the player acquires the next, bigger plot next to the
//  region, choosing it on the map. Sizes: 2, 4, 8, 16, 16, 16…
//
//  Where you put it matters twice:
//   · the TYPES of the settlements that touch make region combos (commuter town + industrial
//     estate = commuter belt; industrial town + spa = smokestack view…)
//   · the ring of world cells around the plot are real neighbours (the "frontier"): roads, villages
//     and the consolidated region give access, and they form ordinary adjacency combos.
// =====================================================================
export const SIZES = [2, 4, 8, 16];
export const STYPES = ['agrarian', 'industrial', 'commuter', 'spa', 'university', 'historic', 'logistics'];
export const STYPE_ICON = { hamlet:'cottage', agrarian:'agriculture', industrial:'factory', commuter:'apartment', spa:'water',
  university:'school', historic:'domain_disabled', logistics:'add_road' };
// What each type brings by itself. Same keys as combo effects, plus:
//   land: land price multiplier delta · permit: extra months for every permit
export const STYPE_FX = {
  hamlet:     {},
  agrarian:   {land:-0.25},
  industrial: {jobs:80, neigh:-1},
  commuter:   {homes:60},
  spa:        {rate:0.05, tax:0.03},
  university: {school:200, tax:0.02},
  historic:   {local:1, permit:1},
  logistics:  {jobs:50, tax:0.04, neigh:-1},
};
// Region combos: between the type of the new settlement and the type of each settlement it touches.
export const REGION_COMBOS = [
  {id:'commuterBelt',  a:'commuter',   b:'industrial', good:true,  fx:{jobs:80}},
  {id:'techTransfer',  a:'university', b:'industrial', good:true,  fx:{tax:0.06, jobs:30}},
  {id:'heritageTrail', a:'spa',        b:'historic',   good:true,  fx:{rate:0.05, local:1}},
  {id:'farmToTable',   a:'agrarian',   b:'spa',        good:true,  fx:{neigh:1, tax:0.02}},
  {id:'campusTown',    a:'university', b:'historic',   good:true,  fx:{school:150, neigh:1}},
  {id:'freightHub',    a:'logistics',  b:'industrial', good:true,  fx:{jobs:60, tax:0.04}},
  {id:'marketTown',    a:'agrarian',   b:'logistics',  good:true,  fx:{tax:0.05}},
  {id:'ruralRoots',    a:'hamlet',     b:'agrarian',   good:true,  fx:{homes:30, neigh:1}},
  {id:'smokestack',    a:'industrial', b:'spa',        good:false, fx:{neigh:-2, rate:-0.04}},
  {id:'lorryRun',      a:'logistics',  b:'historic',   good:false, fx:{neigh:-1, local:-1}},
  {id:'slurry',        a:'agrarian',   b:'commuter',   good:false, fx:{neigh:-2}},
  {id:'rustBelt',      a:'industrial', b:'industrial', good:false, fx:{jobs:-60, tax:-0.03}},
  {id:'sleeperSprawl', a:'commuter',   b:'commuter',   good:false, fx:{local:-2}},
  {id:'freshers',      a:'university', b:'spa',        good:false, fx:{neigh:-2}},
  {id:'hamletFactory', a:'hamlet',     b:'industrial', good:false, fx:{neigh:-1, local:-1}},
];
export const RCOMBO_BY_ID = Object.fromEntries(REGION_COMBOS.map(c=>[c.id, c]));
export const REGION_NAMES = ['Formularia','Stempelland','Annexia','Dossieria','Tramitania','Protokollia','Expedientia','Paragraphia'];
export function matchRegion(ta, tb){ return REGION_COMBOS.filter(c=>(c.a===ta && c.b===tb) || (c.a===tb && c.b===ta)); }

// ---------- geometry ----------
export const DIRS = { n:[-1,0], e:[0,1], s:[1,0], w:[0,-1] };   // [rows, columns]; on screen n ↗ e ↘ s ↙ w ↖
export const DIR_KEYS = ['n','e','s','w'];
export const overlap = (a,b) => a.x < b.x+b.n && b.x < a.x+a.n && a.y < b.y+b.n && b.y < a.y+a.n;
export const touching = (a,b) =>
  ((a.x+a.n === b.x || b.x+b.n === a.x) && a.y < b.y+b.n && b.y < a.y+a.n) ||
  ((a.y+a.n === b.y || b.y+b.n === a.y) && a.x < b.x+b.n && b.x < a.x+a.n);
// ---------- the world map ----------
export const W = () => S.world.n;
export const inWorld = (y,x) => y>=0 && x>=0 && y<S.world.n && x<S.world.n;
export const wcode = (y,x) => inWorld(y,x) ? S.world.cells[y*S.world.n + x] : null;
export const blockAt = (y,x) => S.region.blocks.findIndex(B=>x>=B.x && x<B.x+B.n && y>=B.y && y<B.y+B.n);
// World index of parcel i of the settlement in play (for stable looks across consolidation)
export function worldIndex(i){ const A = S.region && S.region.active; if(!A || !S.world) return i; return (A.y + Math.floor(i/A.n))*S.world.n + A.x + i%A.n; }
// Where a new n×n plot goes if put on side `dir` of block `a`: centred on it, pushed further out past
// anything in the way, kept inside the world. null if it does not fit.
export function slide(a, dir, n, blocks = S.region.blocks){
  const Wn = S.world.n, cx = a.x + a.n/2, cy = a.y + a.n/2;
  const clampX = x => Math.max(0, Math.min(Wn-n, x));
  let b = a;
  for(let g=0; g<60; g++){
    const P = {n,
      x: dir==='e' ? b.x+b.n : dir==='w' ? b.x-n : clampX(Math.round(cx - n/2)),
      y: dir==='s' ? b.y+b.n : dir==='n' ? b.y-n : clampX(Math.round(cy - n/2))};
    if(P.x < 0 || P.y < 0 || P.x+n > Wn || P.y+n > Wn) return null;
    const hit = blocks.find(B=>overlap(B, P));
    if(!hit) return blocks.some(B=>touching(B, P)) ? P : null;
    b = hit;
  }
  return null;
}
// The plots on offer for the next settlement: the four sides of the last one, then (if some do not fit)
// the sides of earlier ones. Up to four, never overlapping the region, always touching it.
export function candidates(n, blocks = S.region.blocks){
  const out = [], seen = new Set();
  for(let k=blocks.length-1; k>=0 && out.length<4; k--)
    for(const dir of DIR_KEYS){ if(out.length>=4) break;
      const P = slide(blocks[k], dir, n, blocks); if(!P) continue;
      const key = P.x+','+P.y; if(seen.has(key) || out.some(Q=>overlap(Q,P))) continue; seen.add(key);   // alternatives never overlap
      out.push({...P, dir, from:k}); }
  // still short: any free spot next to the region (on a grid of n/4), the closest to the last settlement first
  if(out.length < 4 && blocks.length){
    const Wn = S.world.n, st = Math.max(1, n/4), last = blocks[blocks.length-1], more = [];
    for(let y=0; y+n<=Wn; y+=st) for(let x=0; x+n<=Wn; x+=st){
      const P = {x, y, n}; if(seen.has(x+','+y) || blocks.some(B=>overlap(B,P))) continue;
      const k = blocks.findIndex(B=>touching(B,P)); if(k<0) continue;
      const B = blocks[k], dx = (x+n/2)-(B.x+B.n/2), dy = (y+n/2)-(B.y+B.n/2);
      const dir = Math.abs(dx) > Math.abs(dy) ? (dx>0 ? 'e' : 'w') : (dy>0 ? 's' : 'n');
      more.push({...P, dir, from:k, d: Math.abs(x+n/2-last.x-last.n/2) + Math.abs(y+n/2-last.y-last.n/2)}); }
    more.sort((a,b)=>a.d-b.d);
    for(const P of more){ if(out.length >= 4) break; if([...out].some(Q=>overlap(Q,P))) continue; const {d, ...Q} = P; out.push(Q); seen.add(P.x+','+P.y); }
  }
  return out;
}
export function neighboursOf(P, blocks = S.region.blocks){ return blocks.map((b,k)=>[b,k]).filter(([b])=>touching(b,P)).map(([,k])=>k); }
// The region combos a settlement of type `ty` at P would make with the settlements it touches
export function regionCombosAt(P, ty, blocks = S.region.blocks){
  const out = [];
  neighboursOf(P, blocks).forEach(k=>matchRegion(ty, blocks[k].ty).forEach(c=>out.push({id:c.id, good:c.good, b:k})));
  return out;
}
// Everything the attach sheet needs to show for plot k: its neighbours, region combos and what is on the land
export function attachPreview(k){
  const nx = S.region.next, P = S.region.cands[k];
  if(!P) return null;
  const land = {regional:0, flood:0, village:0, habitat:0};
  for(let y=P.y; y<P.y+P.n; y++) for(let x=P.x; x<P.x+P.n; x++){ const c = wcode(y,x); if(c in land) land[c]++; }
  return {k, dir:P.dir, from:P.from, P, nb: neighboursOf(P), combos: regionCombosAt(P, nx.ty), land};
}
export function regionBounds(extra = []){
  const all = [...S.region.blocks, ...(S.region.active ? [S.region.active] : []), ...extra];
  let x0=Infinity, y0=Infinity, x1=-Infinity, y1=-Infinity;
  all.forEach(b=>{ x0=Math.min(x0,b.x); y0=Math.min(y0,b.y); x1=Math.max(x1,b.x+b.n); y1=Math.max(y1,b.y+b.n); });
  return {x0, y0, x1, y1};
}

// ---------- cells of consolidated settlements ----------
// A frozen parcel is one short code: a finished building type, 'road', or the land underneath
const BUILDINGS = ['housing','factory','school','clinic','park'];
export function cellCode(p){
  if(p.k==='regional') return 'regional';
  if(p.st==='built' && p.ty) return p.ty;
  if(['village','flood','habitat','muni'].includes(p.k)) return p.k;
  return 'farm';
}
// Combo tokens of a frozen cell (same vocabulary as combos.js tokens())
export function codeTokens(x){ return BUILDINGS.includes(x) || ['village','regional','flood'].includes(x) ? [x] : []; }
// Built-up land, roads and the village give access to the parcels next to them, across the border too
export function codeAccess(x){ return x==='road' || x==='regional' || x==='village' || BUILDINGS.includes(x); }
// The frontier: the ring of world cells around the plot in play, in LOCAL coordinates
// (b: the consolidated settlement it belongs to, or -1 for open country)
export function buildFrontier(P){
  const out = [];
  for(let wy=P.y-1; wy<=P.y+P.n; wy++) for(let wx=P.x-1; wx<=P.x+P.n; wx++){
    if(wy>=P.y && wy<P.y+P.n && wx>=P.x && wx<P.x+P.n) continue;
    if(!inWorld(wy,wx)) continue;
    out.push({r: wy-P.y, c: wx-P.x, x: wcode(wy,wx), b: blockAt(wy,wx)});
  }
  return out;
}
// Access across the edge: roads and villages, any built land, and the streets of the consolidated region
export function frontAccess(f){ return codeAccess(f.x) || (f.b >= 0 && f.x!=='habitat' && f.x!=='flood'); }
// Fast lookup: frontier cell index at local (r,c), or -1 (cached per frontier array)
const FCACHE = new WeakMap();
export function frontIndex(r, c){
  const F = S && S.frontier; if(!F || !F.length) return -1;
  let m = FCACHE.get(F); if(!m){ m = new Map(); F.forEach((f,k)=>m.set(f.r+','+f.c, k)); FCACHE.set(F, m); }
  const k = m.get(r+','+c); return k===undefined ? -1 : k;
}
export function frontAt(r, c){ const k = frontIndex(r, c); return k<0 ? null : S.frontier[k].x; }
export function frontEntry(r, c){ const k = frontIndex(r, c); return k<0 ? null : S.frontier[k]; }
// Position of a combo end: a parcel of the grid (j >= 0) or a frontier cell (j < 0, stored as -1-k)
export function cellPos(j){ if(j>=0) return [Math.floor(j/N), j%N]; const f = S.frontier[-1-j]; return [f.r, f.c]; }
// The frontier cells next to grid parcel (r,c)
export function frontierAround(r, c){ const out = [];
  if(!S.frontier || !S.frontier.length) return out;
  NB8.forEach(([dr,dc])=>{ if(inside(r+dr,c+dc)) return; const k = frontIndex(r+dr, c+dc); if(k>=0) out.push(k); });
  return out; }

// ---------- totals ----------
export function regionPop(){ return S.region.blocks.reduce((a,b)=>a+b.res, 0); }
export function regionDividend(){ return Math.round(S.region.blocks.reduce((a,b)=>a+(b.tax||0), 0)*100)/100; }
// Effects of the active settlement's type and its region combos (applied with the adjacency combos)
export function regionFx(){ return S.rfx || {}; }
export function sumFx(list){ const f = {}; list.forEach(e=>{ for(const k in e) f[k] = Math.round(((f[k]||0) + e[k])*1000)/1000; }); return f; }
