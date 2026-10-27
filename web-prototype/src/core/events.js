import { CFG, on } from './config.js';
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
  archaeology: {char:'heritage', sfx:'clink', icon:'account_balance', w:3,
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
export function urbanIdle(){ return S.grid.map((p,i)=>i).filter(i=>{ const p=S.grid[i]; return p.st==='owned' && p.urban && hasAccess(...rc(i)); }); }
export function toHabitat(i, owned){
  const p = S.grid[i];
  if(owned){ const back = r1(p.price*0.5); S.funds += back; }
  Object.assign(p,{k:'habitat', st:'land', ty:null, urban:false, flag:{k:'toad', until:S.month+2}});
}
export function rollEvent(){
  if(!on('events')) return;
  if(S.month < 2 || rnd() > 0.6) return;
  const pool = Object.keys(EVENTS).filter(id=>EVENTS[id].ok()); if(!pool.length) return;
  let tot = pool.reduce((a,id)=>a+EVENTS[id].w,0), x = rnd()*tot, id = pool[0];
  for(const e of pool){ x -= EVENTS[e].w; if(x<=0){ id = e; break; } }
  const v = EVENTS[id].setup();
  if(v.i>=0 && v.i!==undefined) S.grid[v.i].flag = S.grid[v.i].flag || {k:'event', until:S.month+1};
  S.cards.push({type:'event', id, v});
  log('log.event', {e:id}, 'bad');
}
export function choicesFor(card){ const E=EVENTS[card.id]; return E.choices.filter(ch=>!ch.when || ch.when(card.v)); }
// Resolve an event card with the chosen option. Returns the result key (or null).
export function resolveEvent(card, k){
  const ch = choicesFor(card).find(c=>c.k===k); if(!ch) return null;
  if(ch.can && !ch.can(card.v)) return null;
  const res = ch.run(card.v) || null;
  log('log.choice', {e:card.id, c:k, res}, res && /caught|lost|stays|refused|unimpressed|ruin|annulled|long/.test(res) ? 'bad' : '');
  return res;
}
