import { CFG, LEVELS, N_COUNTRIES, PLOT, TOWN_A, TOWN_B, stageCfg } from './config.js';
import { offerPerks } from './directives.js';
import { residents } from './economy.js';
import { REGION_NAMES, STYPES, STYPE_FX, buildFrontier, candidates, cellCode, genPlot, matchRegion, setW, sumFx, touching, wcode, RCOMBO_BY_ID } from './region.js';
import { discover } from './combos.js';
import { career, checkAch, rankOf, gainXp, seePerk, seeType, tutorialDone } from './career.js';
import { hasAccess, log } from './rules.js';
import { offerRewards } from './rewards.js';
import { N, NB, S, clamp, idx, inside, pick, r1, rc, ri, rnd, setSide, setState } from './state.js';

// =====================================================================
//  NEW RUN (v0.10) — a Euroregion that starts as ONE 8×8 plot and keeps growing: every milestone adds another
//  8×8 plot next to it, and the whole region stays in play. The map is only the land the region has
//  (S.world.cells); the grid in play (S.grid) covers the region's bounding square, and the cells of that
//  square that are not land are 'void'.
//  newGame(seed, stage) can also start a run directly at phase `stage` (tests, balance bot): the earlier
//  plots are then made up, already built to their target.
// =====================================================================
// opts (the UI's quick start and career): ty — type of the first plot · perk — a starting perk ·
// country · bonus — extra share of every grant (rank) · guide — show the mayor's hints · tutorial — the first run
export function newGame(seed, stage, opts = {}){
  if(seed === undefined) seed = (Math.random()*2147483647)|0;
  stage = Math.max(0, stage|0);
  setState({
    v:11, runSeed:seed, seed, rng:seed|0, debt:0, rate:CFG.interest, inflation:1, market:1, perks:[], shovel:false,
    refunds:[], directivesDone:0, guideOff:false, carry:0, stage:0, level:0, done:0,
    world:{cells:{}, v:0}, region:{name:'', blocks:[], active:null, next:null, cands:[]},
    grid:[], log:[], cards:[], trail:[], fx:[], frontier:[], rfx:{}, rcombos:[],
    newcomers:0, local:55, neigh:55, comp:60, strikes:0, market:1,
    rs:{lunches:0, sold:0, ach:[], xp:0, xp0:career().xp, rank0:rankOf(career().xp)}, bonus: opts.bonus || 0, newAch:[], rankUps:[], levelUps:[],
  });
  if(opts.guide === false) S.guideOff = true;
  if(opts.perk){ if(opts.perk==='shovel') S.shovel = true; else S.perks.push(opts.perk); seePerk(opts.perk); }
  S.region.name = pick(REGION_NAMES);
  const first = {x:0, y:0, n:PLOT}; first.cells = genPlot(first, 0);
  const ty0 = opts.tutorial ? 'agrarian' : (opts.ty || pick(STYPES));
  // Made-up history when starting further in: the earlier plots, built up to the previous target
  for(let k=0; k<=stage; k++){
    const P = k===0 ? first : pick(candidates(PLOT, k));
    writePlot(P);
    const ty = k===0 ? ty0 : (k===stage && opts.ty ? opts.ty : pick(STYPES));
    S.region.blocks.push({x:P.x, y:P.y, n:P.n, ty, town:townName(), country: k===0 && opts.country!==undefined ? opts.country : Math.floor(rnd()*N_COUNTRIES), dir:P.dir || null, phase:k});
  }
  if(stage > 0) madeUpHistory(stageCfg(stage-1).target, stage);
  rebuildGrid(stage);
  S.town = S.region.blocks[0].town; S.country = S.region.blocks[0].country;
  if(stage > 0){ S.done = stage; S.newcomers = Math.max(0, stageCfg(stage-1).target - S.base); }
  beginPhase(stage, true);
  return S;
}
// The earlier plots of a run started further in: just enough built to house, employ and serve the previous
// target (housing, factories, schools, clinics), plus a few parks and roads. The new plot stays empty.
function madeUpHistory(T, stage){
  const free = [];
  S.region.blocks.slice(0, stage).forEach(P=>{ for(let y=P.y; y<P.y+P.n; y++) for(let x=P.x; x<P.x+P.n; x++) if(wcode(y,x)==='farm') free.push([y,x]); });
  const need = {housing: Math.ceil(T/150), factory: Math.ceil(Math.max(0, T-CFG.baseJobs)/CFG.jobsPerResident/150),
    school: Math.ceil(Math.max(0, T-CFG.baseSchool)/300), clinic: Math.ceil(Math.max(0, T-CFG.baseHealth)/600), park: 2*stage, road: 2*stage};
  for(const ty in need) for(let n=0; n<need[ty] && free.length; n++){ const [y,x] = free.splice(Math.floor(rnd()*free.length),1)[0]; setW(y,x,ty); }
}
// The land of a plot becomes part of the map
export function writePlot(P){ P.cells.forEach((c,i)=>setW(P.y + Math.floor(i/P.n), P.x + i%P.n, c)); S.world.v = (S.world.v||0) + 1; }
export function townName(){ const a=pick(TOWN_A), b=pick(TOWN_B); return a.endsWith('-') ? a+b : a+' '+b; }

// =====================================================================
//  THE GRID — the region's bounding square, rebuilt when a plot is added. Parcels already in play keep
//  everything (state, building, works); new land comes from the map; the rest is void.
// =====================================================================
const BUILT = ['housing','factory','school','clinic','park','market','social','library','police','solar','station','data','townhall'];
function parcelOf(code, urban0){
  const p = {k:'farm', st:'land', ty:null, t:0, halt:0, price:r1(1.0+rnd()*1.4), hold:false, mcost:0, urban:urban0, flag:null};
  if(code===null) return {k:'void', st:'void', ty:null, t:0, halt:0, price:0, hold:false, mcost:0, urban:false, flag:null};
  if(code==='regional') Object.assign(p, {k:'regional', st:'built', ty:'road', price:0});
  else if(code==='village') Object.assign(p, {k:'village', st:'built', price:0});
  else if(code==='flood') Object.assign(p, {k:'flood', price:0.6, urban:false});
  else if(code==='habitat') Object.assign(p, {k:'habitat', price:0, urban:false});
  else if(code==='muni') Object.assign(p, {k:'muni', price:0.6, urban:true});
  else if(code==='road') Object.assign(p, {st:'built', ty:'road', urban:true});
  else if(BUILT.includes(code)) Object.assign(p, {st:'built', ty:code, urban:true});
  return p;
}
export function rebuildGrid(stage = S.stage||0){
  const B = S.region.blocks;
  const x0 = Math.min(...B.map(b=>b.x)), y0 = Math.min(...B.map(b=>b.y)), x1 = Math.max(...B.map(b=>b.x+b.n)), y1 = Math.max(...B.map(b=>b.y+b.n));
  const n = Math.max(x1-x0, y1-y0), old = S.region.active, oldGrid = S.grid, oldN = old ? old.n : 0;
  const from = new Map();   // old index → new index (to carry plans and known combo pairs over)
  const grid = [], urban0 = !stageCfg(stage).f.rustic;   // new farmland is building land until the 'rustic' rule
  for(let r=0;r<n;r++) for(let c=0;c<n;c++){
    const y = y0+r, x = x0+c;
    if(old && y>=old.y && y<old.y+oldN && x>=old.x && x<old.x+oldN){ const oi = (y-old.y)*oldN + (x-old.x), q = oldGrid[oi];
      if(q && q.k!=='void'){ grid.push(q); from.set(oi, r*n+c); continue; } }
    grid.push(parcelOf(wcode(y,x), urban0));
  }
  S.grid = grid; setSide(n);
  S.region.active = {x:x0, y:y0, n};
  if(S.plan) S.plan.list = S.plan.list.map(i=>from.get(i)).filter(i=>i!==undefined);
  S.comboSeen = (S.comboSeen||[]).map(k=>{ const [id,i,j] = k.split(':'); const ni = from.get(+i), nj = +j >= 0 ? from.get(+j) : undefined;
    return ni===undefined || nj===undefined ? null : id+':'+ni+':'+nj; }).filter(Boolean);
  S.focus = -1;
  S.frontier = buildFrontier(S.region.active);
  S.base = S.grid.filter(p=>p.k==='village').length * 10;   // each village parcel: 10 old residents
  return from;
}
// The newest plot (the one this phase added): its parcels, in grid indexes
export function plotParcels(P){ const A = S.region.active, out = [];
  for(let y=P.y; y<P.y+P.n; y++) for(let x=P.x; x<P.x+P.n; x++) out.push((y-A.y)*A.n + (x-A.x)); return out; }
// The type of each plot and the region combos between plots that touch (all of them: the whole region is in play)
export function regionEffects(){
  const B = S.region.blocks, rc = [];
  for(let a=0;a<B.length;a++) for(let b=a+1;b<B.length;b++) if(touching(B[a], B[b])) matchRegion(B[a].ty, B[b].ty).forEach(c=>rc.push({id:c.id, good:c.good, a, b}));
  S.rcombos = rc;
  S.rfx = sumFx([...B.map(b=>STYPE_FX[b.ty] || {}), ...rc.map(c=>RCOMBO_BY_ID[c.id].fx)]);
}

// =====================================================================
//  A PHASE — the rules of phase `stage` switch on, a new grant tranche arrives and the clock is set.
//  The region, its people and its meters carry on.
// =====================================================================
export function beginPhase(stage, fresh){
  const L = stageCfg(stage), last = S.region.blocks[S.region.blocks.length-1];
  S.stage = stage; S.level = Math.min(stage, LEVELS.length-1);
  S.seed = (S.runSeed + stage*7919)|0;
  const tranche = r1(L.grant*(1+(S.bonus||0)+(S.perks.includes('cohesion')?0.15:0)));
  Object.assign(S, {
    month:1, grant:tranche, funds:r1(tranche + (S.carry||0)), spent:0, slotPenalty:0, strikes:0,
    directive:null, plan: S.plan || null, lobbied:0, electionDone:false, crashDone:false, qseq: S.qseq||0,
    cards:[], perkChoice:null, over:null, pending:null, bottleneck:'homes', fx:[], focus:-1, ext:0,
    stats:{lobby:0, plan:0, approved:0}, guide:0, extAsked:false, contract:null, chain:[], comboSeen: S.comboSeen||[], carried:r1(S.carry||0), carry:0, lastTax:0,
    stype:last.ty, reports: S.reports||0, consults: S.consults||0, strike: S.strike||0,
  });
  if(fresh){ S.log = []; S.trail = []; }
  S.slots = L.slots + (S.perks.includes('cousin') ? 1 : 0) + (S.extraSlots||0);
  S.region.next = null; S.region.cands = [];
  // the new plot: stubborn owners (from phase II) and the municipal land reserve
  const mine = plotParcels(last);
  if(L.f.holdout) mine.forEach(i=>{ const p = S.grid[i]; if(p.k==='farm' && p.st==='land' && rnd() < 0.25){ p.hold = true; p.price = r1(p.price*1.8); } });
  if(stage >= 1){ const n = last.n, ox = last.x - S.region.active.x, oy = last.y - S.region.active.y;
    const set = (r,c)=>{ if(r<0||c<0||r>=n||c>=n) return false; const p = S.grid[idx(oy+r, ox+c)]; if(p.k!=='farm' || p.st!=='land') return false; Object.assign(p, {k:'muni', price:0.6, urban:true}); return true; };
    let r=ri(0,n-1), c=ri(0,n-1), k=0, guard=0;
    while(k<4 && guard++<50){ if(set(r,c)) k++; const d=pick(NB); r=clamp(r+d[0],0,n-1); c=clamp(c+d[1],0,n-1); } }
  // a milestone reward (v0.10): free building land on the new plot, next to a road where possible
  if(S.gifts && S.gifts.land){ const free = mine.filter(i=>{ const p = S.grid[i]; return p.k==='farm' && p.st==='land'; });
    free.sort((a,b)=>(hasAccess(...rc(b))?1:0) - (hasAccess(...rc(a))?1:0) || a-b);
    free.slice(0, S.gifts.land).forEach(i=>{ Object.assign(S.grid[i], {st:'owned', urban:true, hold:false}); });
    S.gifts.land = 0; }
  regionEffects();
  S.prev = snapshot();
  seeType(last.ty);
  log('log.opened', {town:last.town}, 'good');
  if(fresh) S.cards.push({type:'intro'});
  S.cards.push({type:'level'});
  S.rcombos.forEach(c=>{ if(discover(c.id)) S.cards.push({type:'rcombo', id:c.id, b:c.a}); });
  return S;
}
// Kept for callers of v0.9 (tests, the UI's restart): start phase `stage` on plot P with info
export function startSettlement(stage, P, info){ return beginPhase(stage, false); }
export function snapshot(){ return {local:S.local, neigh:S.neigh, comp:S.comp, funds:S.funds, res:residents()}; }

// =====================================================================
//  MILESTONE + NEW PLOT — the target is met: a reward, then the player picks where the next plot goes.
//  (Called consolidate() for the callers of v0.9.)
// =====================================================================
export function consolidate(){
  const res = residents(), last = S.region.blocks[S.region.blocks.length-1];
  gainXp('consolidate');
  const kept = Math.max(0, r1(S.funds*CFG.keepShare)), back = Math.max(0, r1(S.funds - kept));
  // the map remembers what is built (for the region map and the land around new plots)
  const A = S.region.active;
  S.grid.forEach((p,i)=>{ if(p.k!=='void') setW(A.y + Math.floor(i/A.n), A.x + i%A.n, cellCode(p)); });
  S.world.v = (S.world.v||0) + 1;
  last.res = res; last.months = S.month-1;
  S.done = (S.done||0) + 1;
  S.carry = kept; S.funds = kept;
  // the orders and crises of this phase end with it
  S.cards = S.cards.filter(c=>!['event','directive','result'].includes(c.type)); S.directive = null;
  const nx = stageCfg(S.stage+1);
  S.region.next = {ty:pick(STYPES), n:nx.n, town:townName(), country:Math.floor(rnd()*N_COUNTRIES)};
  S.region.cands = candidates(nx.n, S.stage+1);   // new land next to the region, with its terrain
  S.pending = 'attach';
  S.cards.push({type:'consolidated', res, kept, back, town:S.town, stage:S.stage});
  log('log.consolidated', {town:S.town, n:res}, 'good');
  const left = CFG.months - (S.month-1);
  checkAch('consolidate', {left}); tutorialDone();
  offerRewards(left);   // v0.10: three offers from the characters (one of them a perk)
}
export const milestone = consolidate;
// Add plot k of the ones on offer to the region, and start the next phase
export function attach(k){
  if(S.pending!=='attach' || S.cards.length || S.perkChoice) return {ok:false};
  const P = S.region.cands[k|0];
  if(!P || typeof k !== 'number') return {ok:false};
  const nx = S.region.next;
  writePlot(P);
  S.region.blocks.push({x:P.x, y:P.y, n:P.n, ty:nx.ty, town:nx.town, country:nx.country, dir:P.dir || null, phase:S.stage+1});
  rebuildGrid(S.stage+1);
  beginPhase(S.stage+1, false);
  return {ok:true};
}
