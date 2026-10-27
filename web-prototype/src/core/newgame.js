import { CFG, LEVELS, N_COUNTRIES, TOWN_A, TOWN_B, stageCfg } from './config.js';
import { offerPerks } from './directives.js';
import { residents } from './economy.js';
import { DIR_KEYS, REGION_NAMES, SIZES, STYPES, STYPE_FX, buildFrontier, candidate, cellCode, regionCombosAt, sumFx, RCOMBO_BY_ID } from './region.js';
import { discover } from './combos.js';
import { log } from './rules.js';
import { N, NB, S, clamp, idx, inside, pick, r1, ri, rnd, setSide, setState } from './state.js';

// =====================================================================
//  NEW RUN — a Euroregion that starts as a 2×2 hamlet. newGame(seed, stage) can also start a run
//  directly at settlement `stage` (tests, balance bot): the earlier settlements are then made up.
// =====================================================================
export function newGame(seed, stage){
  if(seed === undefined) seed = (Math.random()*2147483647)|0;
  stage = Math.max(0, stage|0);
  setState({
    v:6, runSeed:seed, seed, rng:seed|0, debt:0, rate:CFG.interest, inflation:1, market:1, perks:[], shovel:false,
    refunds:[], directivesDone:0, guideOff:false, carry:0, stage:0, level:0,
    region:{name:'', blocks:[], active:null, next:null},
    grid:[], log:[], cards:[], trail:[], fx:[], frontier:[], rfx:{}, rcombos:[],
  });
  S.region.name = pick(REGION_NAMES);
  // Made-up history when starting further in (each earlier settlement consolidated at its target)
  for(let k=0; k<stage; k++){
    const n = stageCfg(k).n, dir = pick(DIR_KEYS), P = k===0 ? {x:0, y:0, n} : candidate(dir, n);
    const ty = k===0 ? 'hamlet' : pick(STYPES);
    setSide(n);
    const grid = rotateGrid(genSite(n, k), n, k===0 ? 0 : DIR_Q[dir]);
    grid.forEach(p=>{ if(p.k==='farm' && rnd()<0.6){ p.st='built'; p.ty = pick(['housing','housing','housing','housing','factory','park','park','road','road','school','clinic']); } });
    const res = stageCfg(k).target;
    S.region.blocks.push({x:P.x, y:P.y, n, ty, town:townName(), country:Math.floor(rnd()*N_COUNTRIES), cells:grid.map(cellCode), res, tax:dividendOf(res, grid), dir: k ? dir : null});
  }
  const ty = stage===0 ? 'hamlet' : pick(STYPES), dir = pick(DIR_KEYS);
  const n = stageCfg(stage).n, P = stage===0 ? {x:0, y:0, n} : candidate(dir, n);
  startSettlement(stage, P, {ty, town:townName(), country:Math.floor(rnd()*N_COUNTRIES)}, stage===0 ? null : dir);
  return S;
}
export function townName(){ const a=pick(TOWN_A), b=pick(TOWN_B); return a.endsWith('-') ? a+b : a+' '+b; }
// What a consolidated settlement keeps paying into the region every month
export function dividendOf(res, grid){
  const f = grid.filter(p=>p.st==='built' && p.ty==='factory').length;
  return Math.round(CFG.dividendShare*CFG.taxShare*(res*CFG.taxPerResident + f*CFG.taxPerFactory)*100)/100;
}
// Quarter turns that put the regional road (generated on the west edge) on the far side from where we came
export const DIR_Q = { w:0, n:1, e:2, s:3 };
export function rotateGrid(grid, n, q){
  let g = grid;
  for(let t=0; t<(q%4); t++){ const out = new Array(n*n);
    for(let r=0;r<n;r++) for(let c=0;c<n;c++) out[c*n + (n-1-r)] = g[r*n+c];   // (r,c) → (c, n-1-r): west edge → north edge
    g = out; }
  return g;
}

// =====================================================================
//  A SETTLEMENT — random site: farmland, the old village by the regional road, river, habitats, municipal land
// =====================================================================
export function genSite(n, stage){
  setSide(n);
  const urban0 = !stageCfg(stage).f.rustic;   // without the 'rustic' rule all farmland is already building land
  const grid = [];
  for(let i=0;i<N*N;i++) grid.push({k:'farm', st:'land', ty:null, t:0, halt:0, price:r1(1.0+rnd()*1.4), hold:false, mcost:0, urban:urban0, flag:null});
  const set = (r,c,k,extra)=>{ if(!inside(r,c)) return false; const p=grid[idx(r,c)];
    if(p.k!=='farm') return false; Object.assign(p,{k},extra||{}); return true; };
  if(N >= 4){
    // Regional road along the west edge
    for(let r=0;r<N;r++) Object.assign(grid[idx(r,0)], {k:'regional', st:'built', ty:'road', price:0});
    // Old village next to the road (bigger on bigger maps)
    const vlen = N===4 ? 1 : N===8 ? 3 : 4, vr = ri(0, N-vlen-1);
    for(let r=vr;r<vr+vlen;r++) set(r,1,'village',{st:'built', price:0});
    if(N>=8 && rnd()<0.6) set(vr+1,2,'village',{st:'built', price:0});
    if(N>=16){ set(vr+1,3,'village',{st:'built', price:0}); set(vr+2,2,'village',{st:'built', price:0}); }
  }
  if(N >= 8){
    // A small river with a flood zone
    let fr = ri(2, N-3);
    for(let c=ri(Math.floor(N/2)-1, Math.floor(N/2)+2); c<N; c++){ set(fr,c,'flood',{price:0.6, urban:false}); if(rnd()<0.4) fr = clamp(fr+(rnd()<0.5?-1:1),1,N-2); }
    // Protected habitats
    const nh = N===8 ? 1 : 5, hs = N===8 ? 3 : 4;
    for(let h=0;h<nh;h++){ let r=ri(1,N-2), c=ri(4,N-1);
      for(let s=0;s<hs;s++){ set(r,c,'habitat',{price:0, urban:false}); const d=pick(NB); r=clamp(r+d[0],0,N-1); c=clamp(c+d[1],2,N-1); } }
    // Municipal land (already urban: the town's reserve)
    const nm = N===8 ? 1 : 3;
    for(let m=0;m<nm;m++){ let r=ri(0,N-1), c=ri(2,N-1), k=0, guard=0;
      while(k<5 && guard++<50){ if(set(r,c,'muni',{price:0.6, urban:true})) k++; const d=pick(NB); r=clamp(r+d[0],0,N-1); c=clamp(c+d[1],2,N-1); } }
  }
  return grid;
}
// Start settlement number `stage` at region position P. Run-wide things (perks, debt, market, region) carry over;
// everything local (calendar, grant, meters, agenda, log) starts again.
export function startSettlement(stage, P, info, dir){
  const L = stageCfg(stage);
  S.stage = stage; S.level = Math.min(stage, LEVELS.length-1);
  S.seed = (S.runSeed + stage*7919)|0;      // visual variety per settlement
  Object.assign(S, {
    month:1, grant:L.grant, funds:r1(L.grant + (S.carry||0)), spent:0, slotPenalty:0, local:55, neigh:55, comp:60, strikes:0,
    grid:[], newcomers:0, qseq:0, directive:null, plan:null, reports:0, consults:0, lobbied:0, strike:0, electionDone:false, crashDone:false,
    log:[], cards:[], perkChoice:null, over:null, pending:null, bottleneck:'homes', trail:[], fx:[], focus:-1, base:0,
    stats:{lobby:0, plan:0}, guide:0, comboSeen:[], carried:r1(S.carry||0), carry:0, lastTax:0,
    country:info.country, town:info.town, stype:info.ty,
  });
  S.slots = L.slots + (S.perks.includes('cousin') ? 1 : 0);
  S.grid = rotateGrid(genSite(L.n, stage), L.n, dir ? DIR_Q[dir] : 0);
  setSide(L.n);
  S.roadAxis = dir && DIR_Q[dir]%2 ? 'row' : 'col';
  S.region.active = {x:P.x, y:P.y, n:P.n, ty:info.ty, town:info.town, country:info.country, dir};
  S.region.next = null;
  // Border with the consolidated settlements, and what this type and its neighbours bring
  S.frontier = buildFrontier(P);
  S.rcombos = regionCombosAt(P, info.ty);
  S.rfx = sumFx([STYPE_FX[info.ty] || {}, ...S.rcombos.map(c=>RCOMBO_BY_ID[c.id].fx)]);
  S.base = S.grid.filter(p=>p.k==='village').length * 10;   // each village parcel: 10 old residents
  S.prev = snapshot();
  log('log.opened', {town:S.town}, 'good');
  if(stage===0) S.cards.push({type:'intro'});
  S.cards.push({type:'level'});
  // Region combos are discovered when they first happen
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
  const kept = Math.max(0, r1(S.funds*CFG.keepShare)), back = Math.max(0, r1(S.funds - kept));
  S.region.blocks.push({x:A.x, y:A.y, n:A.n, ty:A.ty, town:A.town, country:A.country, dir:A.dir,
    cells:S.grid.map(cellCode), res, tax:dividendOf(res, S.grid), months:S.month-1});
  S.region.active = null;
  S.carry = kept; S.funds = kept;
  const nx = stageCfg(S.stage+1);
  S.region.next = {ty:pick(STYPES), n:nx.n, town:townName(), country:Math.floor(rnd()*N_COUNTRIES)};
  S.pending = 'attach';
  // the crises and orders of a finished settlement die with it
  S.cards = S.cards.filter(c=>!['event','directive'].includes(c.type)); S.directive = null; S.plan = null;
  S.cards.push({type:'consolidated', res, kept, back, town:A.town, stage:S.stage});
  offerPerks();
  log('log.consolidated', {town:A.town, n:res}, 'good');
}
export function attach(dir){
  if(S.pending!=='attach' || !DIR_KEYS.includes(dir) || S.cards.length || S.perkChoice) return {ok:false};
  const nx = S.region.next, P = candidate(dir, nx.n);
  if(!P) return {ok:false};
  startSettlement(S.stage+1, P, nx, dir);
  return {ok:true};
}
