import { CFG, on } from './config.js';
import { districtOf, wid } from './region.js';
import { S, clamp, has, idx, inside, pname, r1, rc } from './state.js';
import { bump, canActHall, log, nextToVillageI, spend } from './rules.js';
import { gainXp } from './career.js';

// =====================================================================
//  TOWN HALLS (v0.12) — every district (each 8×8 plot) has its own town hall in its village: a name, a
//  founding year, a motto, a clerk at the counter, one or two ORDINANCES of its own and its own RELATION
//  with you (0–100). The relation decides the permits of that district (the founding district's relation
//  is the Mayor meter). Ordinances are ??? until you ask at the counter or run into one.
//  A hall: {k, year, motto, clerk, ords:[id], known:[id], rel, away, fiesta, repeal:{ord, m}|null, cake, lunch}
//  Lore and ordinances come from a hash of the plot's map position, not from the run's dice, so adding
//  halls does not change what else a seed deals.
// =====================================================================
export const ORDS = {
  holiday:     {bad:true,  icon:'beach_access'},   // the permits clerk is on holiday: permits wait until they return
  oldtown:     {bad:true,  icon:'account_balance'},// protected old town: works next to the village cost +30%
  triplicate:  {bad:true,  icon:'description'},    // everything in triplicate: the permit fee ×3
  fiesta:      {bad:true,  icon:'celebration'},    // patron saint's fiesta: one month per phase without works
  noIndustry:  {bad:true,  icon:'factory'},        // no factories in the district
  siesta:      {bad:true,  icon:'bedtime'},        // a long lunch: works take a month longer
  bilingual:   {bad:true,  icon:'translate'},      // signs in two languages: every building +€0.2M
  oneStop:     {bad:false, icon:'verified'},       // a one-stop shop: permits a month faster
  proIndustry: {bad:false, icon:'engineering'},    // an industrial tradition: factory permits approved on the spot
};
const CLASH = {oneStop:['triplicate','holiday'], triplicate:['oneStop'], holiday:['oneStop'], noIndustry:['proIndustry'], proIndustry:['noIndustry']};
export const N_MOTTOS = 10, CLERKS = ['Jacinto','Mireille','Klaus','Ottavia','Sven','Dorota','Joaquim','Aoife','Henk','Rasa','Piotr','Lucía'];
export const HALL = {cake:0.3, cakeRel:6, lunchRel:12, lunchRel2:6, callRel:-10, complainRel:-5, complainComp:5, repealSlots:2, repealMonths:3, repealNeed:50, exproRel:-8};
// a small deterministic generator from the plot's position (and the run)
function hashRnd(B){ let h = (wid(B.y, B.x) ^ ((S.runSeed||0) * 2654435761)) >>> 0;
  return () => { h = (h + 0x6D2B79F5) >>> 0; let t = h; t = Math.imul(t ^ t>>>15, t | 1); t ^= t + Math.imul(t ^ t>>>7, t | 61); return ((t ^ t>>>14) >>> 0) / 4294967296; }; }
export function makeHall(B, k){
  const R = hashRnd(B), pickR = a => a[Math.floor(R()*a.length)];
  const ords = [], deck = Object.keys(ORDS), n = k === 0 ? 1 : (R() < 0.3 ? 2 : 1);
  // the first district always gets a holiday-taking clerk or a one-stop shop in the tutorial spirit: something you meet early
  const good = deck.filter(o=>!ORDS[o].bad), bad = deck.filter(o=>ORDS[o].bad);
  while(ords.length < n){ const o = R() < 0.4 ? pickR(good) : pickR(bad); if(!ords.includes(o) && !ords.some(x=>(CLASH[x]||[]).includes(o))) ords.push(o); }   // about 40% of the ordinances help
  B.hall = {k, year: 1150 + Math.floor(R()*820), motto: Math.floor(R()*N_MOTTOS), clerk: pickR(CLERKS), ords, known:[],
    rel: k === 0 ? null : clamp(56 + (B.ty==='historic' ? -6 : B.ty==='commuter' ? 4 : 0) + Math.round(R()*10) - 5, 30, 70),
    away:0, fiesta:0, repeal:null, cake:0, lunch:0};
  return B.hall;
}
// Old saves and every new plot: each district has its hall, and its village one parcel marked as the town hall
export function ensureHalls(){
  if(!S.region || !S.region.blocks) return;
  S.region.blocks.forEach((B,k)=>{ if(!B.hall) makeHall(B, k); B.hall.k = k; });
  const A = S.region.active; if(!A || !S.grid) return;
  S.region.blocks.forEach((B,k)=>{
    if(S.grid.some((p,i)=>p.hall===k+1 && districtOf(i)===k)) return;
    const vil = S.grid.map((p,i)=>i).filter(i=>S.grid[i].k==='village' && districtOf(i)===k);
    if(vil.length){ const c = vil.reduce((a,i)=>a + i, 0) / vil.length;   // the village cell nearest its middle
      const i = vil.sort((a,b)=>Math.abs(a-c)-Math.abs(b-c))[0]; S.grid[i].hall = k+1; }   // stored +1 so district 0 is truthy
  });
}
export const hallOf = k => S.region && S.region.blocks[k] ? S.region.blocks[k].hall : null;
export const hallAt = i => { const k = districtOf(i); return k >= 0 ? hallOf(k) : null; };
export function hallCell(k){ return S.grid ? S.grid.findIndex(p=>p.hall===k+1) : -1; }
// The relation of a district's town hall with you (the founding district's is the Mayor meter)
export function hallRel(k){ const H = hallOf(k); if(!H || k === 0 || H.rel === null) return S.local; return H.rel; }
export function bumpHall(k, d, why){
  if(k <= 0 || !hallOf(k) || hallOf(k).rel === null) return bump('local', d, why);
  if(!on('local')) return 0;
  const H = hallOf(k), b = H.rel; H.rel = clamp(H.rel + d, has('fixer') ? 30 : 0, 100); return H.rel - b;
}
// --- ordinances: is one in force here, and does the player know it yet ---
export function ordAt(i, id){ if(!on('local')) return false; const H = hallAt(i); return !!H && H.ords.includes(id); }
export function reveal(k, id){ const H = hallOf(k); if(!H || !H.ords.includes(id) || H.known.includes(id)) return false;
  H.known.push(id); log('log.ordFound', {o:id, town:S.region.blocks[k].town}, 'bad'); S.ordSeen = (S.ordSeen||[]).concat(id); return true; }
export const revealAt = (i, id) => { const k = districtOf(i); return k >= 0 ? reveal(k, id) : false; };
// the effects, asked by the rules
export function ordPermitFee(i){ return ordAt(i,'triplicate') ? 3 : 1; }
export function ordPermitMonths(i){ return ordAt(i,'oneStop') ? -1 : 0; }
export function ordBuildMonths(i){ return ordAt(i,'siesta') ? 1 : 0; }
export function ordBuildCost(i){ return (ordAt(i,'oldtown') && nextToVillageI(i) ? 0.25 : 0); }
export function ordBuildExtra(i){ return ordAt(i,'bilingual') ? 0.2 : 0; }
export function ordForbids(i, ty){ return ty === 'factory' && ordAt(i,'noIndustry'); }
export function ordFastTrack(i, ty){ return ty === 'factory' && ordAt(i,'proIndustry'); }
// a permit in this district is waiting for the clerk / no works this month (the fiesta)
export function clerkAway(i){ const H = hallAt(i); return !!H && on('local') && H.ords.includes('holiday') && H.away > 0; }
export function fiestaNow(i){ const H = hallAt(i); return !!H && on('local') && H.ords.includes('fiesta') && H.fiesta === S.month; }

// --- a new phase: the clerk goes on holiday again, the fiesta gets its month ---
export function hallsNewPhase(){
  ensureHalls();
  S.region.blocks.forEach((B,k)=>{ const H = B.hall, R = hashRnd({x:B.x + S.stage*31, y:B.y + S.stage*17});
    H.away = H.ords.includes('holiday') ? 1 + Math.floor(R()*3) : 0;
    H.fiesta = H.ords.includes('fiesta') ? 2 + Math.floor(R()*Math.max(1, CFG.months - 3)) : 0;
    H.cake = 0; H.lunch = 0; H.repeal = null; });
}
// --- each month ---
export function tickHalls(){
  if(!S.region) return;
  S.region.blocks.forEach((B,k)=>{ const H = B.hall; if(!H) return;
    if(H.away > 0 && --H.away === 0) log('log.clerkBack', {c:H.clerk, town:B.town}, 'good');
    // the plenary is decided at the end of the month before, so its result greets month m
    if(H.repeal && S.month >= H.repeal.m - 1){ const r = H.repeal; H.repeal = null;
      const ok = S.neigh >= HALL.repealNeed && hallRel(k) >= HALL.repealNeed;
      if(ok){ H.ords = H.ords.filter(o=>o!==r.ord); if(r.ord==='holiday') H.away = 0; }
      S.cards.push({type:'notice', char:'mayor', icon:'gavel', key: ok ? 'hall.repealOk' : 'hall.repealNo', p:{o:r.ord, town:B.town}, stamp: ok ? 'stamp.approved' : 'stamp.rejected', cls: ok ? 'ok' : 'bad', sfx: ok ? 'stamp' : 'fail'});
      log(ok ? 'log.repealOk' : 'log.repealNo', {o:r.ord, town:B.town}, ok ? 'good' : 'bad'); }
  });
}

// =====================================================================
//  WHAT YOU CAN DO AT A TOWN HALL (each costs agenda slots; see the hall screen)
// =====================================================================
const fail = k => ({ok:false, msg:{k}, cls:'bad'});
// the permits of a district that are stuck (waiting for the clerk)
export function stuckPermits(k){ return S.grid.map((p,i)=>i).filter(i=>S.grid[i].st==='review' && districtOf(i)===k); }
// Ask at the counter: the ordinances in force, and why your permits are stuck. Once a phase it costs a slot.
export function hallAsk(k){ const H = hallOf(k); if(!H) return fail('err.noHall');
  if(H.asked === S.stage) return fail('err.asked');
  if(!canActHall()) return fail('err.slots');
  S.slots--; H.asked = S.stage; const nw = H.ords.filter(o=>!H.known.includes(o));
  H.known = H.ords.slice(); gainXp('agenda'); log('log.hallAsk', {town:S.region.blocks[k].town, n:nw.length});
  return {ok:true, msg:{k: nw.length ? 'fx.hallAsk' : 'fx.hallAsk0', p:{n:nw.length}}, sfx:'clink'}; }
// Pastries for the clerk: the relation +6, and a permit waiting for the clerk goes ahead anyway. Once a month.
export function hallCake(k){ const H = hallOf(k); if(!H) return fail('err.noHall');
  if(H.cake === S.month) return fail('err.cake');
  if(!canActHall()) return fail('err.slots');
  if(S.funds < HALL.cake) return fail('err.funds');
  S.slots--; spend(HALL.cake); H.cake = S.month; bumpHall(k, HALL.cakeRel, 'why.cake');
  const st = stuckPermits(k).find(i=>!S.grid[i].push); if(st !== undefined && H.away > 0){ S.grid[st].push = true; }
  log('log.cake', {c:H.clerk, town:S.region.blocks[k].town}, 'good'); gainXp('agenda');
  return {ok:true, msg:{k: st !== undefined && H.away > 0 ? 'fx.cakePush' : 'fx.cake', p:{n:HALL.cakeRel}}, sfx:'clink'}; }
// Lunch with this town's mayor (v0.12: the lunch moved from the agenda to each town hall)
export function hallLunch(k){ const H = hallOf(k); if(!H) return fail('err.noHall');
  if(!on('local')) return fail('err.notYet');
  if(!canActHall()) return fail('err.slots');
  if(S.funds < CFG.lobbyCost) return fail('err.funds');
  S.slots--; spend(CFG.lobbyCost); if(S.rs) S.rs.lunches++;
  const g = has('lobbyist') ? 20 : (H.lunch === S.month ? HALL.lunchRel2 : HALL.lunchRel); H.lunch = S.month; S.lobbied = (S.lobbied||0) + 1; S.stats.lobby++;
  const real = bumpHall(k, g, 'why.lobby'); log('log.lobbyHall', {n:g, town:S.region.blocks[k].town}, 'good'); gainXp('agenda');
  return {ok:true, msg:{k:'fx.local', p:{n:real || g}}, cls:'good'}; }
// Call the mayor over the clerk's head: the clerk is back today and every stuck permit here is decided next month
export function hallCall(k){ const H = hallOf(k); if(!H) return fail('err.noHall');
  if(!on('local')) return fail('err.notYet');
  if(!(H.away > 0) && !stuckPermits(k).length) return fail('err.nothingStuck');
  if(!canActHall()) return fail('err.slots');
  S.slots--; H.away = 0; stuckPermits(k).forEach(i=>{ S.grid[i].t = Math.min(S.grid[i].t, 1); });
  bumpHall(k, HALL.callRel, 'why.call'); log('log.call', {town:S.region.blocks[k].town}, 'bad');
  return {ok:true, msg:{k:'fx.call'}, sfx:'phone'}; }
// A formal complaint to the regional delegation: slow but by the book (the clerk back within a month)
export function hallComplain(k){ const H = hallOf(k); if(!H) return fail('err.noHall');
  if(!(H.away > 1)) return fail('err.nothingStuck');
  if(!canActHall()) return fail('err.slots');
  S.slots--; H.away = 1; bumpHall(k, HALL.complainRel, 'why.complain'); bump('comp', HALL.complainComp, 'why.complain');
  log('log.complain', {town:S.region.blocks[k].town});
  return {ok:true, msg:{k:'fx.complain'}, sfx:'stamp'}; }
// Propose repealing a known, bad ordinance: the plenary votes in 3 months — it passes if both the neighbours
// and this town hall are at 50 or more then (no dice: you can see it coming)
export function hallRepeal(k, ord){ const H = hallOf(k); if(!H) return fail('err.noHall');
  if(!H.ords.includes(ord) || !H.known.includes(ord) || !ORDS[ord].bad) return fail('err.noRepeal');
  if(H.repeal) return fail('err.repealing');
  if(!canActHall(HALL.repealSlots)) return fail('err.slots2');
  S.slots -= HALL.repealSlots; H.repeal = {ord, m: S.month + HALL.repealMonths};
  log('log.repeal', {o:ord, town:S.region.blocks[k].town, m:H.repeal.m});
  return {ok:true, msg:{k:'fx.repeal', p:{m:H.repeal.m}}, sfx:'stamp'}; }
export function hallMood(k){ const r = hallRel(k); return r >= 60 ? 'good' : r >= 40 ? 'mid' : 'bad'; }
