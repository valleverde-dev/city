import { CFG, on } from './config.js';
import { checkAch } from './career.js';
import { money } from './format.js';
import { activeSites, bump, count, hasAccess, landPrice, log, plotValue, spend } from './rules.js';
import { S, pick, pname, r1, rc, ri, rnd } from './state.js';

// =====================================================================
//  EVENT CARDS — every event is a dilemma: 2–3 choices with visible trade-offs.
//  chips: ['money',±x] ['local'|'neigh'|'comp',±n] ['delay',n] ['risk',pct] ['slot',-n] ['lose'] ['debt',x] ['market',±]
//  run() applies the choice and may return a result key (shown as a follow-up notice).
// =====================================================================
export const sitesFree = () => S.grid.map((p,i)=>i).filter(i=>S.grid[i].st==='building' && !S.grid[i].halt);
export const halt = (i,n) => { const p=S.grid[i]; p.halt = Math.max(p.halt, n); p.flag = {k:'halt', until:S.month+n}; };
export const EVENTS = {
  archaeology: {char:'heritage', sfx:'clink', icon:'domain_disabled', w:3,
    ok:()=>sitesFree().length>0, setup:()=>({i:pick(sitesFree())}),
    choices:[
      {k:'call',     fx:()=>[['delay',3]], run:v=>{ halt(v.i,3); }},
      {k:'concrete', fx:()=>[['risk',35],['comp',-30],['neigh',-15]], run:v=>{ if(rnd()<0.35){ bump('comp',-30,'ev:archaeology'); bump('neigh',-15,'ev:archaeology'); return 'caught'; } return 'quiet'; }},
      {k:'museum',   fx:()=>[['delay',2],['money',-1.5],['neigh',+10],['local',+5]], can:()=>S.funds>=1.5,
        run:v=>{ halt(v.i,2); spend(1.5); bump('neigh',10,'ev:archaeology'); bump('local',5,'ev:archaeology'); }},
    ]},
  toad: {char:'heritage', sfx:'frog', icon:'cruelty_free', w:2,
    ok:()=>S.grid.some(p=>p.st==='owned' || (p.st==='land'&&p.k==='farm')),
    setup:()=>{ const c = S.grid.map((p,i)=>i).filter(i=>S.grid[i].st==='owned' || (S.grid[i].st==='land'&&S.grid[i].k==='farm')); const i = pick(c); return {i, owned:S.grid[i].st==='owned'}; },
    choices:[
      {k:'accept', fx:v=>v.owned?[['lose'],['money',+r1(S.grid[v.i].price*0.5)]]:[['lose']], run:v=>{ toHabitat(v.i, v.owned); }},
      {k:'study',  fx:()=>[['money',-0.8],['risk',50],['lose']], can:()=>S.funds>=0.8,
        run:v=>{ spend(0.8); if(rnd()<0.5) return 'moved'; toHabitat(v.i, v.owned); return 'stays'; }},
      {k:'mascot', fx:()=>[['lose'],['neigh',+8]], run:v=>{ toHabitat(v.i, v.owned); bump('neigh',8,'ev:toad'); }},
    ]},
  election: {char:'mayor', sfx:'crowd', icon:'how_to_vote', w:3,
    ok:()=>!S.electionDone && S.month>=15 && S.month<=21, setup:()=>{ S.electionDone = true; return {}; },
    choices:[
      {k:'fund',    fx:()=>[['money',-1],['risk',40],['comp',-10]], can:()=>S.funds>=1,
        run:()=>{ spend(1); if(rnd()<0.6){ bump('local', Math.max(0,65-S.local), 'ev:election'); return 'won'; } bump('local', 25-S.local, 'ev:election'); bump('comp',-10,'ev:election'); return 'lost'; }},
      {k:'neutral', fx:()=>[['local','?']], run:()=>{ bump('local', ri(30,65)-S.local, 'ev:election'); return 'neutral'; }},
      {k:'meet',    fx:()=>[['slot',-1],['local','≈50']], run:()=>{ S.slotPenalty++; bump('local', ri(45,62)-S.local, 'ev:election'); return 'neutral'; }},
    ]},
  lawsuit: {char:'neighbour', sfx:'crowd', icon:'gavel', w:3,
    ok:()=>S.neigh<35, setup:()=>{ const rev = S.grid.map((p,i)=>i).filter(i=>S.grid[i].st==='review'); return {i: rev.length ? pick(rev) : -1}; },
    choices:[
      {k:'court',     fx:()=>[['money',-1],['risk',30],['delay',4]], can:()=>S.funds>=1,
        run:v=>{ spend(1); if(rnd()<0.3){ if(v.i>=0) S.grid[v.i].t += 4; bump('neigh',-5,'ev:lawsuit'); return 'lostCase'; } return 'wonCase'; }},
      {k:'negotiate', fx:()=>[['money',-0.5],['neigh',+15]], can:()=>S.funds>=0.5, run:()=>{ spend(0.5); bump('neigh',15,'ev:lawsuit'); }},
      {k:'ignore',    fx:()=>[['delay',3],['neigh',-5],['risk',S.neigh<20?50:0]],
        run:v=>{ if(v.i>=0) S.grid[v.i].t += 3; bump('neigh',-5,'ev:lawsuit');
          if(S.neigh < 15 && rnd()<0.5){ S.over = {win:false, why:'court'}; return 'annulled'; } }},
    ]},
  inflation: {char:'banker', sfx:'crash', icon:'trending_up', w:2,
    ok:()=>S.inflation<1.2, setup:()=>({}),
    choices:[
      {k:'accept',      fx:()=>[['cost','+12%']], run:()=>{ S.inflation = Math.round(S.inflation*1.12*100)/100; }},
      {k:'renegotiate', fx:()=>[['delay',1]], run:()=>{ S.grid.forEach((p,i)=>{ if(p.st==='building') halt(i,1); }); }},
      {k:'prefab',      fx:()=>[['money',-2],['cost','+4%']], can:()=>S.funds>=2, run:()=>{ spend(2); S.inflation = Math.round(S.inflation*1.04*100)/100; }},
    ]},
  strike: {char:'union', sfx:'siren', icon:'front_hand', w:2,
    ok:()=>activeSites()>0, setup:()=>({}),
    choices:[
      {k:'wait',      fx:()=>[['delay',1]], run:()=>{ S.strike = 1; }},
      {k:'bonus',     fx:()=>[['money',-1.5],['local',+3]], can:()=>S.funds>=1.5, run:()=>{ spend(1.5); bump('local',3,'ev:strike'); }},
      {k:'mediation', fx:()=>[['comp',-5],['risk',50],['delay',2]], run:()=>{ bump('comp',-5,'ev:strike'); if(rnd()<0.5){ S.strike = 2; return 'long'; } return 'deal'; }},
    ]},
  delegation: {char:'brussels', sfx:'phone', icon:'flight_land', w:2,
    ok:()=>true, setup:()=>({good:S.comp>=60}),
    choices:[
      {k:'photo',   when:v=>v.good,  fx:()=>[['local',+8]], run:()=>{ bump('local',8,'ev:delegation'); }},
      {k:'askmore', when:v=>v.good,  fx:()=>[['risk',60],['money',+8],['comp',-10]],
        run:()=>{ if(rnd()<0.4){ S.funds += 8; S.grant += 8; return 'granted'; } bump('comp',-10,'ev:delegation'); return 'refused'; }},
      {k:'renders', when:v=>!v.good, fx:()=>[['risk',50],['comp',+10],['comp',-15]],
        run:()=>{ if(rnd()<0.5){ bump('comp',10,'ev:delegation'); return 'impressed'; } bump('comp',-15,'ev:delegation'); return 'unimpressed'; }},
      {k:'lunch',   when:v=>!v.good, fx:()=>[['money',-0.5],['comp',+6]], can:()=>S.funds>=0.5, run:()=>{ spend(0.5); bump('comp',6,'ev:delegation'); }},
    ]},
  cofinance: {char:'banker', sfx:'phone', icon:'hourglass_top', w:2,
    ok:()=>S.month<30, setup:()=>({}),
    choices:[
      {k:'wait',     fx:()=>[['money',-3],['later','+3 · 4m']], run:()=>{ S.funds -= 3; S.refunds.push({m:S.month+4, x:3}); }},
      {k:'complain', fx:()=>[['money',-3],['comp',-5],['later','+3 · 2m']], run:()=>{ S.funds -= 3; bump('comp',-5,'ev:cofinance'); S.refunds.push({m:S.month+2, x:3}); }},
      {k:'bridge',   fx:()=>[['debt',+3]], run:()=>{ S.debt = r1(S.debt+3); S.refunds.push({m:S.month+4, x:3}); }},
    ]},
  ribbon: {char:'mayor', sfx:'fanfare', icon:'content_cut', w:2,
    ok:()=>activeSites()>0, setup:()=>({i:pick(S.grid.map((p,i)=>i).filter(i=>S.grid[i].st==='building'))}),
    choices:[
      {k:'smile',  fx:()=>[['local',+10],['neigh',-6]], run:()=>{ bump('local',10,'ev:ribbon'); bump('neigh',-6,'ev:ribbon'); }},
      {k:'refuse', fx:()=>[['local',-10],['neigh',+4]], run:()=>{ bump('local',-10,'ev:ribbon'); bump('neigh',4,'ev:ribbon'); }},
    ]},
  influencer: {char:'neighbour', sfx:'fanfare', icon:'smartphone', w:1,
    ok:()=>count('park')>0, setup:()=>({i:S.grid.findIndex(p=>p.ty==='park'&&p.st==='built')}),
    choices:[
      {k:'share', fx:()=>[['neigh',+8]], run:()=>{ bump('neigh',8,'ev:influencer'); }},
      {k:'hire',  fx:()=>[['money',-0.3],['neigh',+15]], can:()=>S.funds>=0.3, run:()=>{ spend(0.3); bump('neigh',15,'ev:influencer'); }},
    ]},
  discount: {char:'farmer', sfx:'farmer', icon:'sell', w:2,
    ok:()=>S.grid.some(p=>p.st==='land'&&p.k==='farm'),
    setup:()=>{ const i = pick(S.grid.map((p,i)=>i).filter(i=>S.grid[i].st==='land'&&S.grid[i].k==='farm')); const p=S.grid[i]; p.price=r1(p.price*0.6); p.hold=true; return {i, x:money(landPrice(p))}; },
    choices:[
      {k:'buy',   fx:v=>[['money',-landPrice(S.grid[v.i])],['land']], can:v=>S.funds>=landPrice(S.grid[v.i]),
        run:v=>{ const p=S.grid[v.i], x=landPrice(p); spend(x); p.st='owned'; log('log.acquired',{at:pname(v.i), x:money(x)}); }},
      {k:'later', fx:()=>[], run:()=>{}},
    ]},
  template: {char:'brussels', sfx:'phone', icon:'description', w:2,
    ok:()=>true, setup:()=>({}),
    choices:[
      {k:'fill',        fx:()=>[['slot',-1]], run:()=>{ S.slotPenalty++; }},
      {k:'ignore',      fx:()=>[['comp',-10]], run:()=>{ bump('comp',-10,'ev:template'); }},
      {k:'consultants', fx:()=>[['money',-0.6],['comp',+5]], can:()=>S.funds>=0.6, run:()=>{ spend(0.6); bump('comp',5,'ev:template'); }},
    ]},
  devOffer: {char:'developer', sfx:'cash', icon:'handshake', w:3,
    ok:()=>on('market') && S.market>=CFG.devMinMarket && urbanIdle().length>0,
    setup:()=>{ const i = pick(urbanIdle()); return {i, x:money(r1(plotValue(S.grid[i])*1.3))}; },
    choices:[
      {k:'sell',    fx:v=>[['money',+r1(plotValue(S.grid[v.i])*1.3)],['lose']], run:v=>{ const p=S.grid[v.i], x=r1(plotValue(p)*1.3);
        S.funds += x; Object.assign(p,{st:'private', ty:'housing', dev:{phase:'permit', t:ri(2,3)}}); log('log.sold',{at:pname(v.i), x:money(x)},'good'); }},
      {k:'decline', fx:()=>[], run:()=>{}},
    ]},
  crash: {char:'banker', sfx:'crash', icon:'trending_down', w:1,
    ok:()=>on('market') && S.month>=10 && !S.crashDone, setup:()=>{ S.crashDone = true; S.market = Math.max(0.6, r1(S.market-0.35)); return {priv:S.grid.some(p=>p.st==='private')}; },
    choices:[
      {k:'bailout', when:v=>v.priv, fx:()=>[['money',-3]], can:()=>S.funds>=3, run:()=>{ spend(3); S.grid.forEach(p=>{ if(p.st==='private') p.dev.bailed = 6; }); }},
      {k:'letfall', when:v=>v.priv, fx:()=>[['risk',100],['lose']], run:()=>{ const pv = S.grid.map((p,i)=>i).filter(i=>S.grid[i].st==='private');
        const i = pick(pv); Object.assign(S.grid[i], {st:'ruin', ty:null, dev:null, flag:{k:'ruin', until:S.month+99}}); return 'ruin'; }},
      {k:'hold',    when:v=>!v.priv, fx:()=>[['market','−']], run:()=>{}},
    ]},
  loanCall: {char:'banker', sfx:'phone', icon:'account_balance_wallet', w:2,
    ok:()=>S.debt>0, setup:()=>({}),
    choices:[
      {k:'repay',       fx:()=>[['money',-Math.min(5,S.debt)],['debt',-Math.min(5,S.debt)]], can:()=>S.funds>=Math.min(5,S.debt),
        run:()=>{ const x=Math.min(5,S.debt); S.funds-=x; S.debt=r1(S.debt-x); }},
      {k:'renegotiate', fx:()=>[['rate','+0.5%']], run:()=>{ S.rate = Math.round((S.rate+0.005)*1000)/1000; }},
    ]},
  fiesta: {char:'mayor', sfx:'fanfare', icon:'celebration', w:1,
    ok:()=>true, setup:()=>({}),
    choices:[
      {k:'sponsor', fx:()=>[['money',-0.4],['local',+6],['neigh',+6]], can:()=>S.funds>=0.4, run:()=>{ spend(0.4); bump('local',6,'ev:fiesta'); bump('neigh',6,'ev:fiesta'); }},
      {k:'skip',    fx:()=>[['neigh',-3]], run:()=>{ bump('neigh',-3,'ev:fiesta'); }},
    ]},
};
// ---------------------------------------------------------------------
// v0.10 — more events: between the plots of the region, chained ones (a decision now, a second card later),
// and contracts from the characters (missions that extend the deadline or pay).
// ---------------------------------------------------------------------
const two = () => S.region.blocks.length >= 2;
const otherTown = () => { const B = S.region.blocks; return B.length >= 2 ? B[Math.floor(rnd()*(B.length-1))].town : S.town; };
// a follow-up card `id` in `m` months (chained events)
export function chain(id, m, v = {}){ (S.chain = S.chain || []).push({id, m:S.month + m - 1, v}); }   // shown at the start of month (now + m)
Object.assign(EVENTS, {
  // --- between the plots of the region ---
  oldTown: {char:'neighbour', sfx:'crowd', icon:'campaign', w:2, ok:two, setup:()=>({town:otherTown()}),
    choices:[
      {k:'invest',   fx:()=>[['money',-1.5],['neigh',+8]], can:()=>S.funds>=1.5, run:()=>{ spend(1.5); bump('neigh',8,'ev:oldTown'); }},
      {k:'festival', fx:()=>[['money',-0.5],['risk',50],['neigh',+10]], can:()=>S.funds>=0.5, run:()=>{ spend(0.5); if(rnd()<0.5){ bump('neigh',10,'ev:oldTown'); return 'cheered'; } bump('neigh',-4,'ev:oldTown'); return 'rained'; }},
      {k:'ignore',   fx:()=>[['neigh',-10],['local',-5]], run:()=>{ bump('neigh',-10,'ev:oldTown'); bump('local',-5,'ev:oldTown'); }},
    ]},
  busStrike: {char:'union', sfx:'siren', icon:'train', w:2, ok:()=>two() && activeSites()>0, setup:()=>({town:otherTown()}),
    choices:[
      {k:'shuttle', fx:()=>[['money',-1]], can:()=>S.funds>=1, run:()=>{ spend(1); }},
      {k:'wait',    fx:()=>[['delay',1]], run:()=>{ S.strike = 1; }},
    ]},
  sharedClinic: {char:'mayor', sfx:'phone', icon:'local_hospital', w:2, ok:()=>two() && on('services') && count('clinic')>0, setup:()=>({town:otherTown()}),
    choices:[
      {k:'share',  fx:()=>[['money',+1.5],['neigh',-6]], run:()=>{ S.funds += 1.5; bump('neigh',-6,'ev:sharedClinic'); }},
      {k:'refuse', fx:()=>[['local',-6],['neigh',+4]], run:()=>{ bump('local',-6,'ev:sharedClinic'); bump('neigh',4,'ev:sharedClinic'); }},
    ]},
  derby: {char:'mayor', sfx:'crowd', icon:'celebration', w:2, ok:two, setup:()=>({town:otherTown()}),
    choices:[
      {k:'sponsor', fx:()=>[['money',-0.5],['local',+6],['neigh',+6]], can:()=>S.funds>=0.5, run:()=>{ spend(0.5); bump('local',6,'ev:derby'); bump('neigh',6,'ev:derby'); }},
      {k:'neutral', fx:()=>[['neigh',-4]], run:()=>{ bump('neigh',-4,'ev:derby'); }},
    ]},
  boundary: {char:'heritage', sfx:'clink', icon:'map', w:1, ok:two, setup:()=>({town:otherTown()}),
    choices:[
      {k:'surveyor', fx:()=>[['money',-0.8],['comp',+4]], can:()=>S.funds>=0.8, run:()=>{ spend(0.8); bump('comp',4,'ev:boundary'); }},
      {k:'mayor',    fx:()=>[['local',+6],['neigh',-8]], run:()=>{ bump('local',6,'ev:boundary'); bump('neigh',-8,'ev:boundary'); }},
    ]},
  twinning: {char:'brussels', sfx:'fanfare', icon:'flight_land', w:1, ok:two, setup:()=>({}),
    choices:[
      {k:'accept',  fx:()=>[['money',-0.4],['comp',+8]], can:()=>S.funds>=0.4, run:()=>{ spend(0.4); bump('comp',8,'ev:twinning'); }},
      {k:'decline', fx:()=>[], run:()=>{}},
    ]},
  // --- chained: the first card ---
  consultants: {char:'developer', sfx:'cash', icon:'insights', w:2, ok:()=>!S.chainBusy, setup:()=>({}),
    choices:[
      {k:'hire',    fx:()=>[['money',-2],['later','?']], can:()=>S.funds>=2, run:()=>{ spend(2); chain('consultantsReport', 3); }},
      {k:'decline', fx:()=>[], run:()=>{}},
    ]},
  cousin: {char:'mayor', sfx:'phone', icon:'engineering', w:2, ok:()=>!S.chainBusy && activeSites()>0, setup:()=>({}),
    choices:[
      {k:'hire',   fx:()=>[['local',+10],['later','?']], run:()=>{ bump('local',10,'ev:cousin'); chain('cousinScandal', 4); }},
      {k:'refuse', fx:()=>[['local',-8]], run:()=>{ bump('local',-8,'ev:cousin'); }},
    ]},
  journalist: {char:'neighbour', sfx:'phone', icon:'smartphone', w:2, ok:()=>!S.chainBusy, setup:()=>({}),
    choices:[
      {k:'talk',      fx:()=>[['neigh',+5],['later','?']], run:()=>{ bump('neigh',5,'ev:journalist'); chain('frontPage', 2, {talked:true}); }},
      {k:'noComment', fx:()=>[['later','?']], run:()=>{ chain('frontPage', 2, {talked:false}); }},
    ]},
  scooters: {char:'brussels', sfx:'phone', icon:'bolt', w:2, ok:()=>!S.chainBusy, setup:()=>({}),
    choices:[
      {k:'join',    fx:()=>[['money',+2],['later','?']], run:()=>{ S.funds += 2; chain('scooterChaos', 3); }},
      {k:'decline', fx:()=>[], run:()=>{}},
    ]},
  survey: {char:'heritage', sfx:'clink', icon:'history_edu', w:1, ok:()=>!S.chainBusy, setup:()=>({}),
    choices:[
      {k:'commission', fx:()=>[['money',-0.6],['later','?']], can:()=>S.funds>=0.6, run:()=>{ spend(0.6); chain('surveyResult', 2); }},
      {k:'skip',       fx:()=>[['comp',-4]], run:()=>{ bump('comp',-4,'ev:survey'); }},
    ]},
  // --- chained: the second card (only ever sent by chain()) ---
  consultantsReport: {char:'developer', sfx:'fanfare', icon:'description', w:0, chained:true, ok:()=>false, setup:()=>({}),
    choices:[
      {k:'present', fx:()=>[['comp',+15]], run:()=>{ bump('comp',15,'ev:consultantsReport'); }},
      {k:'shelve',  fx:()=>[['local',+4]], run:()=>{ bump('local',4,'ev:consultantsReport'); }},
    ]},
  cousinScandal: {char:'neighbour', sfx:'crowd', icon:'gavel', w:0, chained:true, ok:()=>false, setup:()=>({}),
    choices:[
      {k:'fire',   fx:()=>[['local',-15]], run:()=>{ bump('local',-15,'ev:cousinScandal'); }},
      {k:'defend', fx:()=>[['comp',-10],['neigh',-10]], run:()=>{ bump('comp',-10,'ev:cousinScandal'); bump('neigh',-10,'ev:cousinScandal'); }},
    ]},
  frontPage: {char:'neighbour', sfx:'crowd', icon:'description', w:0, chained:true, ok:()=>false, setup:()=>({}),
    choices:[
      {k:'frame', fx:v=>v.talked ? [['local',+8],['neigh',+4]] : [['neigh',-8]], run:v=>{ if(v.talked){ bump('local',8,'ev:frontPage'); bump('neigh',4,'ev:frontPage'); return 'praised'; } bump('neigh',-8,'ev:frontPage'); return 'slammed'; }},
      {k:'reply', fx:()=>[['slot',-1],['neigh',+6]], run:()=>{ S.slotPenalty++; bump('neigh',6,'ev:frontPage'); }},
    ]},
  scooterChaos: {char:'neighbour', sfx:'siren', icon:'bolt', w:0, chained:true, ok:()=>false, setup:()=>({}),
    choices:[
      {k:'ban',      fx:()=>[['comp',-10],['neigh',+6]], run:()=>{ bump('comp',-10,'ev:scooterChaos'); bump('neigh',6,'ev:scooterChaos'); }},
      {k:'regulate', fx:()=>[['money',-1],['slot',-1]], can:()=>S.funds>=1, run:()=>{ spend(1); S.slotPenalty++; }},
    ]},
  surveyResult: {char:'heritage', sfx:'fanfare', icon:'history_edu', w:0, chained:true, ok:()=>false, setup:()=>({}),
    choices:[
      {k:'publish', fx:()=>[['comp',+10],['neigh',+5]], run:()=>{ bump('comp',10,'ev:surveyResult'); bump('neigh',5,'ev:surveyResult'); }},
      {k:'archive', fx:()=>[['money',+0.6]], run:()=>{ S.funds += 0.6; }},
    ]},
  // --- standalone ---
  potholes: {char:'neighbour', sfx:'crowd', icon:'add_road', w:2, ok:()=>count('road')>0, setup:()=>({}),
    choices:[
      {k:'fix',   fx:()=>[['money',-0.5],['neigh',+4]], can:()=>S.funds>=0.5, run:()=>{ spend(0.5); bump('neigh',4,'ev:potholes'); }},
      {k:'blame', fx:()=>[['local',-5],['neigh',-3]], run:()=>{ bump('local',-5,'ev:potholes'); bump('neigh',-3,'ev:potholes'); }},
    ]},
  heatwave: {char:'mayor', sfx:'crowd', icon:'solar_power', w:1, ok:()=>true, setup:()=>({}),
    choices:[
      {k:'fountains', fx:()=>[['money',-0.6],['neigh',+6]], can:()=>S.funds>=0.6, run:()=>{ spend(0.6); bump('neigh',6,'ev:heatwave'); }},
      {k:'nothing',   fx:()=>[['neigh',-6]], run:()=>{ bump('neigh',-6,'ev:heatwave'); }},
    ]},
  filmCrew: {char:'developer', sfx:'cash', icon:'celebration', w:1, ok:()=>true, setup:()=>({}),
    choices:[
      {k:'allow',  fx:()=>[['money',+1],['neigh',-5]], run:()=>{ S.funds += 1; bump('neigh',-5,'ev:filmCrew'); }},
      {k:'refuse', fx:()=>[], run:()=>{}},
    ]},
  audit: {char:'brussels', sfx:'phone', icon:'fact_check', w:2, ok:()=>on('comp'), setup:()=>({good:S.comp>=50}),
    choices:[
      {k:'open',  fx:v=>v.good ? [['comp',+10]] : [['comp',-12]], run:v=>{ if(v.good){ bump('comp',10,'ev:audit'); return 'clean'; } bump('comp',-12,'ev:audit'); return 'failed'; }},
      {k:'delay', fx:()=>[['slot',-1],['comp',-4]], run:()=>{ S.slotPenalty++; bump('comp',-4,'ev:audit'); }},
    ]},
});
// --- contracts: a character proposes a job; accept it and it is tracked until done or due ---
// kind: what counts · n: how many more · dur: months · reward: {ext: months | money: €M | <meter>: n} · fail: the meter that pays
export const CONTRACTS = {
  ct_mayor:     {char:'mayor',     icon:'apartment',   kind:'housing', n:2, dur:6, reward:{ext:2},   fail:['local',-10]},
  ct_brussels:  {char:'brussels',  icon:'description', kind:'reports', n:2, dur:4, reward:{ext:2},   fail:['comp',-10], need:'comp'},
  ct_neighbour: {char:'neighbour', icon:'park',        kind:'park',    n:1, dur:4, reward:{money:2, neigh:8}, fail:['neigh',-10]},
  ct_union:     {char:'union',     icon:'engineering', kind:'sites',   n:3, dur:3, reward:{ext:1},   fail:['local',-6]},
  ct_developer: {char:'developer', icon:'sell',        kind:'sold',    n:1, dur:5, reward:{money:4}, fail:['local',-5], need:'market'},
  ct_banker:    {char:'banker',    icon:'savings',     kind:'nodebt',  n:0, dur:6, reward:{money:3}, fail:['comp',-5], ok:()=>S.debt<=0},
};
export function contractCount(kind){
  switch(kind){
    case 'housing': return count('housing'); case 'park': return count('park'); case 'reports': return S.reports||0;
    case 'sites': return activeSites(); case 'sold': return S.rs.sold||0; case 'nodebt': return S.debt > 0 ? -1 : 0;
  }
  return 0;
}
export function contractDone(c){
  if(c.kind==='sites') return activeSites() >= c.n;
  if(c.kind==='nodebt') return false;   // judged at the deadline
  return contractCount(c.kind) >= c.base + c.n;
}
export const rewardChips = r => Object.entries(r).map(([k,x])=>k==='ext' ? ['ext', x] : k==='money' ? ['money', x] : [k, x]);
Object.entries(CONTRACTS).forEach(([id, C])=>{
  EVENTS[id] = {char:C.char, sfx:'phone', icon:C.icon, w:2, contract:true,
    ok:()=>!S.contract && (!C.need || on(C.need)) && (!C.ok || C.ok()) && S.month + C.dur <= CFG.months,
    setup:()=>({n:C.n, m:S.month + C.dur}),
    choices:[
      {k:'accept',  fx:v=>[['deadline', v.m], ...rewardChips(C.reward)], run:v=>{ S.contract = {id, kind:C.kind, n:C.n, base:contractCount(C.kind), deadline:v.m}; log('log.contract', {c:id, m:v.m}); }},
      {k:'decline', fx:()=>[], run:()=>{}},
    ]};
});
// Each month: a contract met pays now; one past its deadline costs the character's goodwill
export function checkContract(){
  const c = S.contract; if(!c) return;
  const C = CONTRACTS[c.id], done = contractDone(c) || (c.kind==='nodebt' && S.month >= c.deadline && S.debt <= 0);
  if(done){
    S.contract = null;
    for(const [k,x] of Object.entries(C.reward)){ if(k==='ext') S.ext = (S.ext||0) + x; else if(k==='money') S.funds += x; else bump(k, x, 'why.contract'); }
    S.cards.push({type:'notice', char:C.char, icon:'task_alt', key: C.reward.ext ? 'ct.metExt' : 'ct.metMoney', p:{c:c.id, n:C.reward.ext||0, x:C.reward.money ? money(C.reward.money) : ''}, stamp:'stamp.compliant', cls:'ok', sfx:'fanfare'});
    log('log.contractMet', {c:c.id}, 'good');
  } else if(S.month >= c.deadline){
    S.contract = null; bump(C.fail[0], C.fail[1], 'why.contractFail');
    S.cards.push({type:'notice', char:C.char, icon:'cancel', key:'ct.failed', p:{c:c.id}, stamp:'stamp.noncompliant', cls:'bad', sfx:'fail'});
    log('log.contractFailed', {c:c.id}, 'bad');
  }
}
// Chained cards whose month has come
export function dueChains(){
  if(!S.chain || !S.chain.length) return;
  const now = S.chain.filter(x=>x.m <= S.month); S.chain = S.chain.filter(x=>x.m > S.month);
  now.forEach(x=>{ S.cards.push({type:'event', id:x.id, v:x.v}); log('log.event', {e:x.id}, 'bad'); });
}
export function urbanIdle(){ return S.grid.map((p,i)=>i).filter(i=>{ const p=S.grid[i]; return p.st==='owned' && p.urban && hasAccess(...rc(i)); }); }
export function toHabitat(i, owned){
  const p = S.grid[i];
  if(owned){ const back = r1(p.price*0.5); S.funds += back; }
  Object.assign(p,{k:'habitat', st:'land', ty:null, urban:false, flag:{k:'toad', until:S.month+2}});
}
export function rollEvent(){
  if(!on('events')) return;
  if(S.month < 2 || rnd() > 0.6) return;
  S.chainBusy = !!(S.chain && S.chain.length);
  const pool = Object.keys(EVENTS).filter(id=>EVENTS[id].w > 0 && EVENTS[id].ok()); if(!pool.length) return;
  let tot = pool.reduce((a,id)=>a+EVENTS[id].w,0), x = rnd()*tot, id = pool[0];
  for(const e of pool){ x -= EVENTS[e].w; if(x<=0){ id = e; break; } }
  const v = EVENTS[id].setup();
  if(v.i>=0 && v.i!==undefined) S.grid[v.i].flag = S.grid[v.i].flag || {k:'event', until:S.month+1};
  S.cards.push({type:'event', id, v});
  log('log.event', {e:id}, 'bad');
}
export const isBadResult = res => !!res && /caught|lost|stays|refused|unimpressed|ruin|annulled|long|rained|slammed|failed/.test(res);
export function choicesFor(card){ const E=EVENTS[card.id]; return E.choices.filter(ch=>!ch.when || ch.when(card.v)); }
// Resolve an event card with the chosen option. Returns the result key (or null).
export function resolveEvent(card, k){
  const ch = choicesFor(card).find(c=>c.k===k); if(!ch) return null;
  if(ch.can && !ch.can(card.v)) return null;
  const res = ch.run(card.v) || null;
  if(card.id==='toad' && k==='mascot') checkAch('mascot');
  log('log.choice', {e:card.id, c:k, res}, isBadResult(res) ? 'bad' : '');
  return res;
}
