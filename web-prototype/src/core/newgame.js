import { CFG, LEVELS, N_COUNTRIES, TOWN_A, TOWN_B, on } from './config.js';
import { residents } from './economy.js';
import { campaign } from './persist.js';
import { log } from './rules.js';
import { N, NB, S, clamp, has, idx, inside, pick, r1, ri, rnd, setSide, setState } from './state.js';

// =====================================================================
//  NEW GAME — random site, country and town
// =====================================================================
export function newGame(seed, level){
  if(seed === undefined) seed = (Math.random()*2147483647)|0;
  level = clamp(level|0, 0, LEVELS.length-1);
  setSide(LEVELS[level].n);
  setState({
    v:5, level, seed, rng:seed|0, month:1, funds:CFG.grant, grant:CFG.grant, spent:0, debt:0, rate:CFG.interest,
    slots:CFG.slots, slotPenalty:0, local:55, neigh:55, comp:60, inflation:1, market:1, strikes:0, perks:[],
    grid:[], newcomers:0, qseq:0, directive:null, directivesDone:0, plan:null,
    reports:0, consults:0, lobbied:0, strike:0, electionDone:false, crashDone:false, refunds:[],
    shovel:false, log:[], cards:[], perkChoice:null, over:null, bottleneck:'homes',
    country:0, town:'', trail:[], prev:null, lastTax:0, fx:[], focus:-1, base:0, stats:{lobby:0, plan:0}, guide:0, guideOff:false,
  });
  S.funds = S.grant = CFG.grant; S.slots = CFG.slots;
  // Perks carried over from the levels already completed
  campaign().perks.slice(0, level).forEach(k=>{ if(k==='shovel') S.shovel = true; else if(k && !S.perks.includes(k)) S.perks.push(k); });
  if(has('cousin')) S.slots++;
  S.country = Math.floor(rnd()*N_COUNTRIES);
  S.town = (()=>{ const a=pick(TOWN_A), b=pick(TOWN_B); return a.endsWith('-') ? a+b : a+' '+b; })();
  // Without the 'rustic' rule all farmland is already building land
  const urban0 = !on('rustic');
  for(let i=0;i<N*N;i++) S.grid.push({k:'farm', st:'land', ty:null, t:0, halt:0, price:r1(1.0+rnd()*1.4), hold:false, mcost:0, urban:urban0, flag:null});
  const set = (r,c,k,extra)=>{ if(!inside(r,c)) return false; const p=S.grid[idx(r,c)];
    if(p.k!=='farm') return false; Object.assign(p,{k},extra||{}); return true; };
  if(N >= 4){
    // Regional road along the west edge
    for(let r=0;r<N;r++) Object.assign(S.grid[idx(r,0)], {k:'regional', st:'built', ty:'road', price:0});
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
    for(let m=0;m<nm;m++){ let r=ri(0,N-1), c=ri(2,N-1), n=0, guard=0;
      while(n<5 && guard++<50){ if(set(r,c,'muni',{price:0.6, urban:true})) n++; const d=pick(NB); r=clamp(r+d[0],0,N-1); c=clamp(c+d[1],2,N-1); } }
  }
  S.base = S.grid.filter(p=>p.k==='village').length * 10;   // each village parcel: 10 old residents
  S.prev = snapshot();
  log('log.opened', {town:S.town}, 'good');
  if(level===0) S.cards.push({type:'intro'});
  S.cards.push({type:'level'});
  return S;
}
export function snapshot(){ return {local:S.local, neigh:S.neigh, comp:S.comp, funds:S.funds, res:residents()}; }
