import { N, NB, NB8, S, inside, pick, ri, rnd } from './state.js';

// =====================================================================
//  EUROREGION — one run is one region that grows, and its map grows with it. The map is only the land
//  that exists (S.world.cells, a sparse "y,x" → code map): it starts as a 2×2 hamlet, and every new
//  settlement adds a plot of land next to the region. The terrain of a new plot is generated when it is
//  offered, CONTINUING what is next to it (a regional road or the river that reaches the edge goes on),
//  plus its own road, river, woods and village. The plot in play is expanded into S.grid (local
//  coordinates); when it meets its target it is CONSOLIDATED: what was built is written into the map,
//  it keeps paying its share of taxes, and the player picks one of the plots on offer, on the map.
//  Sizes: 2, 4, 8, 16, 16, 16…
//
//  Where you put it matters twice:
//   · the TYPES of the settlements that touch make region combos (commuter town + industrial
//     estate = commuter belt; industrial town + spa = smokestack view…)
//   · the ring of land around the plot are real neighbours (the "frontier"): roads, villages
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
// ---------- the map: only the land that exists ----------
const key = (y,x) => y+','+x;
export const inWorld = (y,x) => S.world.cells[key(y,x)] !== undefined;
export const wcode = (y,x) => { const c = S.world.cells[key(y,x)]; return c === undefined ? null : c; };
export const setW = (y,x,code) => { S.world.cells[key(y,x)] = code; };
export const blockAt = (y,x) => S.region.blocks.findIndex(B=>x>=B.x && x<B.x+B.n && y>=B.y && y<B.y+B.n);
// A stable number per map cell (for looks: crops, building styles, names), the same before and after consolidation
export const wid = (y,x) => ((y + 4096) * 8192 + (x + 4096)) % 2147483647;
export function worldIndex(i){ const A = S.region && S.region.active; if(!A) return i; return wid(A.y + Math.floor(i/A.n), A.x + i%A.n); }
// Where a new n×n plot goes if put on side `dir` of block `a`: in a pinwheel (north plot flush with a's west
// edge, east with its north edge, south with its east edge, west with its south edge), so the four sides never
// overlap each other; pushed further out past anything in the way.
export function slide(a, dir, n, blocks = S.region.blocks){
  const px = dir==='n' ? a.x : a.x + a.n - n, py = dir==='e' ? a.y : a.y + a.n - n;
  let b = a;
  for(let g=0; g<60; g++){
    const P = {n,
      x: dir==='e' ? b.x+b.n : dir==='w' ? b.x-n : px,
      y: dir==='s' ? b.y+b.n : dir==='n' ? b.y-n : py};
    const hit = blocks.find(B=>overlap(B, P));
    if(!hit) return blocks.some(B=>touching(B, P)) ? P : null;
    b = hit;
  }
  return null;
}
// The plots on offer for the next settlement: the four sides of the last one (then of earlier ones, if two
// of those would overlap). Up to four, never overlapping the region or each other, always touching it.
// Each comes with its terrain (cells), generated now so the player sees the land before choosing.
export function candidates(n, stage, blocks = S.region.blocks){
  const out = [], seen = new Set();
  for(let k=blocks.length-1; k>=0 && out.length<4; k--)
    for(const dir of DIR_KEYS){ if(out.length>=4) break;
      const P = slide(blocks[k], dir, n, blocks); if(!P) continue;
      const kk = P.x+','+P.y; if(seen.has(kk) || out.some(Q=>overlap(Q,P))) continue; seen.add(kk);
      out.push({...P, dir, from:k}); }
  out.forEach(P=>{ P.cells = genPlot(P, stage); });
  return out;
}
// ---------- new land ----------
// The terrain of a new plot: it continues the regional roads and the river that reach its edge, and gets
// a road of its own if none arrives (from 4×4: there is always a way in), plus river, woods and a village.
export function genPlot(P, stage){
  const n = P.n, cells = new Array(n*n).fill('farm'), at = (r,c) => r*n + c, ok = (r,c) => r>=0 && c>=0 && r<n && c<n;
  const put = (r,c,code,over) => { if(!ok(r,c)) return false; const cur = cells[at(r,c)]; if(cur!=='farm' && !(over && over.includes(cur))) return false; cells[at(r,c)] = code; return true; };
  const road = (axis, k) => { for(let t=0;t<n;t++) axis==='v' ? (cells[at(t,k)] = 'regional') : (cells[at(k,t)] = 'regional'); };
  const river = (axis, k) => { let q = k;   // one parcel wide, always connected, meandering; bridges keep the road
    for(let t=0;t<n;t++){ axis==='v' ? put(t,q,'flood') : put(q,t,'flood');
      if(rnd() < 0.35){ const q2 = Math.max(0, Math.min(n-1, q + (rnd()<0.5 ? -1 : 1))); axis==='v' ? put(t,q2,'flood') : put(q2,t,'flood'); q = q2; } } };
  // what reaches the edge from the land next door goes on
  const arriving = [];
  for(let k=0;k<n;k++){
    [[P.y-1, P.x+k, 'v', k], [P.y+n, P.x+k, 'v', k], [P.y+k, P.x-1, 'h', k], [P.y+k, P.x+n, 'h', k]].forEach(([y,x,axis,kk])=>{
      const c = wcode(y,x); if(c==='regional' || c==='flood') arriving.push([c, axis, kk]); }); }
  arriving.filter(a=>a[0]==='regional').forEach(([,axis,k])=>road(axis,k));
  arriving.filter(a=>a[0]==='flood').slice(0,1).forEach(([,axis,k])=>river(axis,k));
  if(n >= 4 && !cells.includes('regional')) road(rnd()<0.5 ? 'v' : 'h', ri(1, n-2));
  if(n >= 8 && !cells.includes('flood') && rnd() < 0.55) river(rnd()<0.5 ? 'v' : 'h', ri(1, n-2));
  if(n >= 8){ for(let h=0; h<Math.round(n*n/48); h++){ let r = ri(0,n-1), c = ri(0,n-1);
    for(let s=0;s<ri(3,4);s++){ put(r,c,'habitat'); const d = pick(NB); r = Math.max(0,Math.min(n-1,r+d[0])); c = Math.max(0,Math.min(n-1,c+d[1])); } } }
  if(n >= 4){   // the old village, by a road
    const roads = cells.map((x,i)=>x==='regional' ? i : -1).filter(i=>i>=0);
    if(roads.length){ const i = pick(roads); let r = Math.floor(i/n), c = i%n; const len = n===4 ? 1 : n===8 ? 3 : 5;
      for(let s=0, g=0; s<len && g<30; g++){ const d = pick(NB); const r2 = r+d[0], c2 = c+d[1]; if(!ok(r2,c2) || cells[at(r2,c2)]==='regional') continue;
        if(put(r2,c2,'village')) s++; if(cells[at(r2,c2)]==='village'){ r = r2; c = c2; } } } }
  return cells;
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
  (P.cells||[]).forEach(c=>{ if(c in land) land[c]++; });
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
const BUILDINGS = ['housing','factory','school','clinic','park','market','social','library','police','solar','station','data','townhall'];
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
    if(!inWorld(wy,wx)) continue;   // nothing there (yet)
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
