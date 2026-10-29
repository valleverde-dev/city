import { CFG, LEVELS, N_COUNTRIES, TOWN_A, TOWN_B, stageCfg } from './config.js';
import { offerPerks } from './directives.js';
import { residents } from './economy.js';
import { REGION_NAMES, STYPES, STYPE_FX, buildFrontier, candidates, cellCode, genPlot, regionCombosAt, setW, sumFx, wcode, RCOMBO_BY_ID } from './region.js';
import { discover } from './combos.js';
import { career, checkAch, rankOf, gainXp, seePerk, seeType, tutorialDone } from './career.js';
import { log } from './rules.js';
import { N, NB, S, clamp, idx, inside, pick, r1, ri, rnd, setSide, setState } from './state.js';

// =====================================================================
//  NEW RUN — a Euroregion that starts as a 2×2 hamlet: the map is just that land, and it grows with the
//  region. newGame(seed, stage) can also start a run directly at settlement `stage` (tests, balance bot):
//  the earlier ones are then made up.
// =====================================================================
// opts (the UI's quick start and career): ty — type of the first settlement in play · perk — a starting perk ·
// country · bonus — extra share of every grant (rank) · guide — show the mayor's guide
export function newGame(seed, stage, opts = {}){
  if(seed === undefined) seed = (Math.random()*2147483647)|0;
  stage = Math.max(0, stage|0);
  setState({
    v:10, runSeed:seed, seed, rng:seed|0, debt:0, rate:CFG.interest, inflation:1, market:1, perks:[], shovel:false,
    refunds:[], directivesDone:0, guideOff:false, carry:0, stage:0, level:0,
    world:{cells:{}, v:0}, region:{name:'', blocks:[], active:null, next:null, cands:[]},
    grid:[], log:[], cards:[], trail:[], fx:[], frontier:[], rfx:{}, rcombos:[],
    rs:{lunches:0, sold:0, ach:[], xp:0, xp0:career().xp, rank0:rankOf(career().xp)}, bonus: opts.bonus || 0, newAch:[], rankUps:[], levelUps:[],
  });
  if(opts.guide === false) S.guideOff = true;
  if(opts.perk){ if(opts.perk==='shovel') S.shovel = true; else S.perks.push(opts.perk); seePerk(opts.perk); }
  S.region.name = pick(REGION_NAMES);
  const home = {x:0, y:0, n:2}; home.cells = genPlot(home, 0);
  // Made-up history when starting further in (each earlier settlement consolidated at its target)
  for(let k=0; k<stage; k++){
    const n = stageCfg(k).n, P = k===0 ? home : pick(candidates(n, k)), ty = k===0 ? 'hamlet' : pick(STYPES), res = stageCfg(k).target;
    let f = 0;
    writePlot(P);
    for(let y=P.y; y<P.y+n; y++) for(let x=P.x; x<P.x+n; x++) if(wcode(y,x)==='farm' && rnd()<0.6){
      const b = pick(['housing','housing','housing','housing','factory','park','park','road','road','school','clinic']); setW(y,x,b); if(b==='factory') f++; }
    S.region.blocks.push({x:P.x, y:P.y, n, ty, town:townName(), country:Math.floor(rnd()*N_COUNTRIES), res, tax:dividendOf(res, f), dir: P.dir || null});
  }
  const P = stage===0 ? home : pick(candidates(stageCfg(stage).n, stage));
  writePlot(P);
  const ty = stage===0 ? 'hamlet' : pick(STYPES), country = Math.floor(rnd()*N_COUNTRIES);
  startSettlement(stage, P, {ty: stage>0 && opts.ty ? opts.ty : ty, town:townName(), country: opts.country!==undefined ? opts.country : country});
  return S;
}
// The land of a plot becomes part of the map
export function writePlot(P){ P.cells.forEach((c,i)=>setW(P.y + Math.floor(i/P.n), P.x + i%P.n, c)); S.world.v = (S.world.v||0) + 1; }
export function townName(){ const a=pick(TOWN_A), b=pick(TOWN_B); return a.endsWith('-') ? a+b : a+' '+b; }
// What a consolidated settlement keeps paying into the region every month (half of what it paid in play)
export function dividendOf(res, factories){
  return Math.round(CFG.dividendShare*CFG.taxShare*(res*CFG.taxPerResident + factories*CFG.taxPerFactory)*100)/100;
}

// =====================================================================
//  A SETTLEMENT — the plot P of the world map becomes the grid in play
// =====================================================================
// One parcel of the grid from the world's terrain code
function parcelOf(code, urban0){
  const p = {k:'farm', st:'land', ty:null, t:0, halt:0, price:r1(1.0+rnd()*1.4), hold:false, mcost:0, urban:urban0, flag:null};
  if(code==='regional') Object.assign(p, {k:'regional', st:'built', ty:'road', price:0});
  else if(code==='village') Object.assign(p, {k:'village', st:'built', price:0});
  else if(code==='flood') Object.assign(p, {k:'flood', price:0.6, urban:false});
  else if(code==='habitat') Object.assign(p, {k:'habitat', price:0, urban:false});
  return p;
}
// Start settlement number `stage` on plot P. Run-wide things (perks, debt, market, region) carry over;
// everything local (calendar, grant, meters, agenda, log) starts again.
export function startSettlement(stage, P, info){
  const L = stageCfg(stage);
  S.stage = stage; S.level = Math.min(stage, LEVELS.length-1);
  S.seed = (S.runSeed + stage*7919)|0;
  Object.assign(S, {
    month:1, grant:r1(L.grant*(1+(S.bonus||0)+(S.perks.includes('cohesion')?0.15:0))), funds:r1(L.grant*(1+(S.bonus||0)+(S.perks.includes('cohesion')?0.15:0)) + (S.carry||0)), spent:0, slotPenalty:0, local:55, neigh:55, comp:60, strikes:0,
    grid:[], newcomers:0, qseq:0, directive:null, plan:null, reports:0, consults:0, lobbied:0, strike:0, electionDone:false, crashDone:false,
    log:[], cards:[], perkChoice:null, over:null, pending:null, bottleneck:'homes', trail:[], fx:[], focus:-1, base:0,
    stats:{lobby:0, plan:0, approved:0}, guide:0, comboSeen:[], carried:r1(S.carry||0), carry:0, lastTax:0,
    country:info.country, town:info.town, stype:info.ty,
  });
  S.slots = L.slots + (S.perks.includes('cousin') ? 1 : 0);
  S.region.active = {x:P.x, y:P.y, n:P.n, ty:info.ty, town:info.town, country:info.country, dir:P.dir || null};
  S.region.next = null; S.region.cands = [];
  setSide(P.n);
  const urban0 = !L.f.rustic;   // without the 'rustic' rule all farmland is already building land
  for(let r=0;r<P.n;r++) for(let c=0;c<P.n;c++) S.grid.push(parcelOf(wcode(P.y+r, P.x+c), urban0));
  // Stubborn owners (from settlement II): known from the start, they simply ask more (×1.8)
  if(L.f.holdout) S.grid.forEach(p=>{ if(p.k==='farm' && rnd() < 0.25){ p.hold = true; p.price = r1(p.price*1.8); } });
  if(N >= 8){
    // The town's municipal land reserve (already urban)
    const nm = N===8 ? 1 : 3, set = (r,c)=>{ if(!inside(r,c)) return false; const p = S.grid[idx(r,c)]; if(p.k!=='farm') return false; Object.assign(p, {k:'muni', price:0.6, urban:true}); return true; };
    for(let m=0;m<nm;m++){ let r=ri(0,N-1), c=ri(0,N-1), k=0, guard=0;
      while(k<5 && guard++<50){ if(set(r,c)) k++; const d=pick(NB); r=clamp(r+d[0],0,N-1); c=clamp(c+d[1],0,N-1); } }
  }
  // The edge of the plot, and what this type and its neighbours bring
  S.frontier = buildFrontier(P);
  S.rcombos = regionCombosAt(P, info.ty);
  S.rfx = sumFx([STYPE_FX[info.ty] || {}, ...S.rcombos.map(c=>RCOMBO_BY_ID[c.id].fx)]);
  S.base = S.grid.filter(p=>p.k==='village').length * 10;   // each village parcel: 10 old residents
  S.prev = snapshot();
  seeType(info.ty);
  log('log.opened', {town:S.town}, 'good');
  if(stage===0) S.cards.push({type:'intro'});
  S.cards.push({type:'level'});
  S.rcombos.forEach(c=>{ if(discover(c.id)) S.cards.push({type:'rcombo', id:c.id, b:c.b}); });
  return S;
}
export function snapshot(){ return {local:S.local, neigh:S.neigh, comp:S.comp, funds:S.funds, res:residents()}; }

// =====================================================================
//  CONSOLIDATE + ATTACH — the target is met: freeze the settlement into the region, roll the next one,
//  let the player pick a perk and the side to attach it.
// =====================================================================
export function consolidate(){
  const A = S.region.active, res = residents();
  gainXp('consolidate');
  const kept = Math.max(0, r1(S.funds*CFG.keepShare)), back = Math.max(0, r1(S.funds - kept));
  // what was built stays on the map, where it is
  S.grid.forEach((p,i)=>setW(A.y + Math.floor(i/A.n), A.x + i%A.n, cellCode(p)));
  S.world.v = (S.world.v||0) + 1;
  S.region.blocks.push({x:A.x, y:A.y, n:A.n, ty:A.ty, town:A.town, country:A.country, dir:A.dir,
    res, tax:dividendOf(res, S.grid.filter(p=>p.st==='built' && p.ty==='factory').length), months:S.month-1});
  S.region.active = null;
  S.carry = kept; S.funds = kept;
  // the crises and orders of a finished settlement die with it
  S.cards = S.cards.filter(c=>!['event','directive'].includes(c.type)); S.directive = null; S.plan = null;
  const nx = stageCfg(S.stage+1);
  S.region.next = {ty:pick(STYPES), n:nx.n, town:townName(), country:Math.floor(rnd()*N_COUNTRIES)};
  S.region.cands = candidates(nx.n, S.stage+1);   // new land next to the region, with its terrain
  S.pending = 'attach';
  S.cards.push({type:'consolidated', res, kept, back, town:A.town, stage:S.stage});
  log('log.consolidated', {town:A.town, n:res}, 'good');
  checkAch('consolidate', {left: CFG.months - (S.month-1)}); tutorialDone();
  offerPerks();
}
// Add plot k of the ones on offer to the map, and start the next settlement there
export function attach(k){
  if(S.pending!=='attach' || S.cards.length || S.perkChoice) return {ok:false};
  const P = S.region.cands[k|0];
  if(!P || typeof k !== 'number') return {ok:false};
  writePlot(P);
  startSettlement(S.stage+1, P, S.region.next);
  return {ok:true};
}
