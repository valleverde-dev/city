import { N, NB8, S, inside } from './state.js';

// =====================================================================
//  EUROREGION — one run is one region that grows. Every settlement is an n×n block placed in
//  region coordinates (x = column, y = row, in parcels). When a settlement meets its target it is
//  CONSOLIDATED: frozen into a block of cells, still paying its share of taxes, and the next,
//  bigger settlement is attached on one of its four sides. Sizes: 2, 4, 8, 16, 16, 16…
//
//  Where you attach matters twice:
//   · the TYPES of the settlements that touch make region combos (commuter town + industrial
//     estate = commuter belt; industrial town + spa = smokestack view…)
//   · the parcels along the shared border are real neighbours: their buildings give access and
//     form ordinary adjacency combos with what you build on your side (the "frontier").
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
// Where a new n×n settlement goes if attached on side `dir` of the last one: centred on it, and pushed
// further out past any settlement already in the way, so it always lands on free ground touching the region.
export function candidate(dir, n, blocks = S.region.blocks){
  const last = blocks[blocks.length-1];
  if(!last) return {x:0, y:0, n};
  const cx = last.x + last.n/2, cy = last.y + last.n/2;
  let a = last;
  for(let g=0; g<200; g++){
    const P = {n,
      x: dir==='e' ? a.x+a.n : dir==='w' ? a.x-n : Math.round(cx - n/2),
      y: dir==='s' ? a.y+a.n : dir==='n' ? a.y-n : Math.round(cy - n/2)};
    const hit = blocks.find(b=>overlap(b, P));
    if(!hit) return P;
    a = hit;
  }
  return null;
}
export function neighboursOf(P, blocks = S.region.blocks){ return blocks.map((b,k)=>[b,k]).filter(([b])=>touching(b,P)).map(([,k])=>k); }
// The region combos a settlement of type `ty` at P would make with the settlements it touches
export function regionCombosAt(P, ty, blocks = S.region.blocks){
  const out = [];
  neighboursOf(P, blocks).forEach(k=>matchRegion(ty, blocks[k].ty).forEach(c=>out.push({id:c.id, good:c.good, b:k})));
  return out;
}
// Everything the attach card needs to show for one side
export function attachPreview(dir){
  const nx = S.region.next, P = candidate(dir, nx.n);
  return {dir, P, nb: neighboursOf(P), combos: regionCombosAt(P, nx.ty)};
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
// The frontier: cells of consolidated neighbours in the ring around the active settlement, in LOCAL coordinates
export function buildFrontier(P, blocks = S.region.blocks){
  const out = [];
  for(let wy=P.y-1; wy<=P.y+P.n; wy++) for(let wx=P.x-1; wx<=P.x+P.n; wx++){
    if(wy>=P.y && wy<P.y+P.n && wx>=P.x && wx<P.x+P.n) continue;
    const b = blocks.findIndex(B=>wx>=B.x && wx<B.x+B.n && wy>=B.y && wy<B.y+B.n);
    if(b<0) continue;
    const B = blocks[b];
    out.push({r: wy-P.y, c: wx-P.x, x: B.cells[(wy-B.y)*B.n + (wx-B.x)], b});
  }
  return out;
}
// Fast lookup: frontier cell index at local (r,c), or -1 (cached per frontier array)
const FCACHE = new WeakMap();
export function frontIndex(r, c){
  const F = S && S.frontier; if(!F || !F.length) return -1;
  let m = FCACHE.get(F); if(!m){ m = new Map(); F.forEach((f,k)=>m.set(f.r+','+f.c, k)); FCACHE.set(F, m); }
  const k = m.get(r+','+c); return k===undefined ? -1 : k;
}
export function frontAt(r, c){ const k = frontIndex(r, c); return k<0 ? null : S.frontier[k].x; }
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
