import { CFG, LEVELS, N_COUNTRIES, TOWN_A, TOWN_B, stageCfg } from './config.js';
import { offerPerks } from './directives.js';
import { residents } from './economy.js';
import { REGION_NAMES, STYPES, STYPE_FX, buildFrontier, candidates, cellCode, regionCombosAt, sumFx, wcode, RCOMBO_BY_ID } from './region.js';
import { discover } from './combos.js';
import { log } from './rules.js';
import { N, NB, S, clamp, idx, inside, pick, r1, ri, rnd, setSide, setState } from './state.js';

// =====================================================================
//  NEW RUN — one world map, and a Euroregion that starts as a 2×2 hamlet on it. newGame(seed, stage) can
//  also start a run directly at settlement `stage` (tests, balance bot): the earlier ones are then made up.
// =====================================================================
export function newGame(seed, stage){
  if(seed === undefined) seed = (Math.random()*2147483647)|0;
  stage = Math.max(0, stage|0);
  setState({
    v:7, runSeed:seed, seed, rng:seed|0, debt:0, rate:CFG.interest, inflation:1, market:1, perks:[], shovel:false,
    refunds:[], directivesDone:0, guideOff:false, carry:0, stage:0, level:0,
    world:null, region:{name:'', blocks:[], active:null, next:null, cands:[]},
    grid:[], log:[], cards:[], trail:[], fx:[], frontier:[], rfx:{}, rcombos:[],
  });
  S.region.name = pick(REGION_NAMES);
  S.world = genWorld();
  const home = startPlot();
  // Made-up history when starting further in (each earlier settlement consolidated at its target)
  for(let k=0; k<stage; k++){
    const n = stageCfg(k).n, cs = k===0 ? [home] : candidates(n);
    if(!cs.length) break;
    const P = pick(cs), ty = k===0 ? 'hamlet' : pick(STYPES), res = stageCfg(k).target;
    let f = 0;
    for(let y=P.y; y<P.y+n; y++) for(let x=P.x; x<P.x+n; x++){ const i = y*S.world.n + x;
      if(S.world.cells[i]==='farm' && rnd()<0.6){ const ty2 = pick(['housing','housing','housing','housing','factory','park','park','road','road','school','clinic']); S.world.cells[i] = ty2; if(ty2==='factory') f++; } }
    S.region.blocks.push({x:P.x, y:P.y, n, ty, town:townName(), country:Math.floor(rnd()*N_COUNTRIES), res, tax:dividendOf(res, f), dir: P.dir || null});
  }
  // (a made-up history can fill the world: drop settlements until the next one has somewhere to go)
  let cs = S.region.blocks.length ? candidates(stageCfg(S.region.blocks.length).n) : [home];
  while(!cs.length && S.region.blocks.length > 1){ S.region.blocks.pop(); cs = candidates(stageCfg(S.region.blocks.length).n); }
  stage = S.region.blocks.length;
  const P = pick(cs);
  startSettlement(stage, P, {ty: stage===0 ? 'hamlet' : pick(STYPES), town:townName(), country:Math.floor(rnd()*N_COUNTRIES)});
  return S;
}
export function townName(){ const a=pick(TOWN_A), b=pick(TOWN_B); return a.endsWith('-') ? a+b : a+' '+b; }
// What a consolidated settlement keeps paying into the region every month (half of what it paid in play)
export function dividendOf(res, factories){
  return Math.round(CFG.dividendShare*CFG.taxShare*(res*CFG.taxPerResident + factories*CFG.taxPerFactory)*100)/100;
}

// =====================================================================
//  THE WORLD — W×W cells of open country: farmland, regional roads crossing the whole map, a river
//  from edge to edge (the roads cross it on bridges), protected habitats and old villages by the roads.
//  Generated once per run; settlements are plots of it.
// =====================================================================
export function genWorld(){
  const Wn = CFG.worldN, cells = new Array(Wn*Wn).fill('farm');
  const at = (y,x) => y*Wn + x, inW = (y,x) => y>=0 && x>=0 && y<Wn && x<Wn;
  const set = (y,x,k) => { if(!inW(y,x) || cells[at(y,x)]!=='farm') return false; cells[at(y,x)] = k; return true; };
  const mid = Wn>>1;
  // Regional roads: one east–west through the middle, one north–south off-centre, one more east–west
  const rA = ri(mid-3, mid+2), cB = pick([ri(5, mid-12), ri(mid+11, Wn-6)]), rC = pick([ri(4, mid-14), ri(mid+13, Wn-5)]);
  for(let x=0;x<Wn;x++){ cells[at(rA,x)] = 'regional'; cells[at(rC,x)] = 'regional'; }
  for(let y=0;y<Wn;y++) cells[at(y,cB)] = 'regional';
  // The river: north edge to south edge, meandering, one parcel wide and always connected
  let rc = ri(mid-12, mid+12); if(Math.abs(rc-cB) < 3) rc = cB + 4;
  for(let y=0;y<Wn;y++){ set(y,rc,'flood');
    if(rnd() < 0.45){ const nc = Math.max(2, Math.min(Wn-3, rc + (rnd()<0.5 ? -1 : 1))); if(Math.abs(nc-cB) >= 2){ set(y,nc,'flood'); rc = nc; } } }
  // Protected habitats (small woods and wetlands)
  for(let h=0;h<Math.round(Wn*Wn/150);h++){ let y=ri(1,Wn-2), x=ri(1,Wn-2);
    for(let s=0;s<ri(3,6);s++){ set(y,x,'habitat'); const d = pick(NB); y = Math.max(0,Math.min(Wn-1,y+d[0])); x = Math.max(0,Math.min(Wn-1,x+d[1])); } }
  // Old villages along the roads
  const roads = cells.map((c,i)=>c==='regional' ? i : -1).filter(i=>i>=0);
  for(let v=0; v<Math.round(Wn/7); v++){ const i = pick(roads); let y = Math.floor(i/Wn), x = i%Wn;
    const d = pick(NB); y += d[0]; x += d[1];
    for(let s=0;s<ri(3,5);s++){ set(y,x,'village'); const e = pick(NB); const y2 = y+e[0], x2 = x+e[1];
      if(inW(y2,x2) && cells[at(y2,x2)]!=='regional'){ y = y2; x = x2; } } }
  return {n:Wn, cells, v:0};
}
// Where the hamlet starts: four farm parcels next to a regional road, as close to the middle as possible
export function startPlot(){
  const Wn = S.world.n, mid = Wn/2, opts = [];
  for(let y=1;y<Wn-2;y++) for(let x=1;x<Wn-2;x++){
    const four = [[0,0],[0,1],[1,0],[1,1]].every(([a,b])=>wcode(y+a,x+b)==='farm'); if(!four) continue;
    let road = false; for(let a=-1;a<=2;a++) for(let b=-1;b<=2;b++) if(wcode(y+a,x+b)==='regional') road = true;
    if(!road) continue;
    opts.push({x, y, n:2, d: Math.abs(y+1-mid) + Math.abs(x+1-mid)});
  }
  opts.sort((a,b)=>a.d-b.d);
  const best = opts.filter(o=>o.d <= opts[0].d + 3);
  const P = pick(best.length ? best : [{x:Math.floor(mid)-1, y:Math.floor(mid)-1}]);
  return {x:P.x, y:P.y, n:2};
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
    month:1, grant:L.grant, funds:r1(L.grant + (S.carry||0)), spent:0, slotPenalty:0, local:55, neigh:55, comp:60, strikes:0,
    grid:[], newcomers:0, qseq:0, directive:null, plan:null, reports:0, consults:0, lobbied:0, strike:0, electionDone:false, crashDone:false,
    log:[], cards:[], perkChoice:null, over:null, pending:null, bottleneck:'homes', trail:[], fx:[], focus:-1, base:0,
    stats:{lobby:0, plan:0}, guide:0, comboSeen:[], carried:r1(S.carry||0), carry:0, lastTax:0,
    country:info.country, town:info.town, stype:info.ty,
  });
  S.slots = L.slots + (S.perks.includes('cousin') ? 1 : 0);
  S.region.active = {x:P.x, y:P.y, n:P.n, ty:info.ty, town:info.town, country:info.country, dir:P.dir || null};
  S.region.next = null; S.region.cands = [];
  setSide(P.n);
  const urban0 = !L.f.rustic;   // without the 'rustic' rule all farmland is already building land
  for(let r=0;r<P.n;r++) for(let c=0;c<P.n;c++) S.grid.push(parcelOf(wcode(P.y+r, P.x+c), urban0));
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
  const A = S.region.active, res = residents(), Wn = S.world.n;
  const kept = Math.max(0, r1(S.funds*CFG.keepShare)), back = Math.max(0, r1(S.funds - kept));
  // what was built goes back into the world map
  S.grid.forEach((p,i)=>{ S.world.cells[(A.y + Math.floor(i/A.n))*Wn + A.x + i%A.n] = cellCode(p); });
  S.world.v = (S.world.v||0) + 1;
  S.region.blocks.push({x:A.x, y:A.y, n:A.n, ty:A.ty, town:A.town, country:A.country, dir:A.dir,
    res, tax:dividendOf(res, S.grid.filter(p=>p.st==='built' && p.ty==='factory').length), months:S.month-1});
  S.region.active = null;
  S.carry = kept; S.funds = kept;
  // the crises and orders of a finished settlement die with it
  S.cards = S.cards.filter(c=>!['event','directive'].includes(c.type)); S.directive = null; S.plan = null;
  const nx = stageCfg(S.stage+1);
  S.region.cands = candidates(nx.n);
  log('log.consolidated', {town:A.town, n:res}, 'good');
  if(!S.region.cands.length){   // no free land left next to the region: the Euroregion is complete
    S.cards.push({type:'consolidated', res, kept, back, town:A.town, stage:S.stage});
    S.over = {win:true, why:'complete'}; return;
  }
  S.region.next = {ty:pick(STYPES), n:nx.n, town:townName(), country:Math.floor(rnd()*N_COUNTRIES)};
  S.pending = 'attach';
  S.cards.push({type:'consolidated', res, kept, back, town:A.town, stage:S.stage});
  offerPerks();
}
// Acquire plot k of the ones on offer for the next settlement
export function attach(k){
  if(S.pending!=='attach' || S.cards.length || S.perkChoice) return {ok:false};
  const P = S.region.cands[k|0];
  if(!P || typeof k !== 'number') return {ok:false};
  startSettlement(S.stage+1, P, S.region.next);
  return {ok:true};
}
