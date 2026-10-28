import { activeCombos, comboFx, discover } from './combos.js';
import { B, CFG, N_REJECTIONS, on } from './config.js';
import { directiveProgress, issueDirective, offerPerks } from './directives.js';
import { residents, taxIncome } from './economy.js';
import { rollEvent } from './events.js';
import { money } from './format.js';
import { consolidate, snapshot } from './newgame.js';
import { recordRun, save } from './persist.js';
import { checkAch, endRun } from './career.js';
import { activeSites, approvalChance, approves, buildCost, builtFx, buildMonths, bump, caps, contractors, count, fx, log, slotsPerMonth, spend } from './rules.js';
import { S, clamp, has, pname, r1, ri, rnd } from './state.js';

export function endMonth(){
  if(S.over || S.perkChoice || S.pending || S.cards.length) return {ok:false};
  S.fx = []; S.prev = snapshot();
  // 1. Permit reviews
  S.grid.forEach((p,i)=>{
    if(p.st!=='review') return;
    if(--p.t > 0) return;
    if(approves()){ p.st='approved'; p.q = ++S.qseq; S.stats.approved = (S.stats.approved||0) + 1; log('log.approved', {b:p.ty, at:pname(i)}, 'good'); fx(i,'fx.approved',{},'good'); }
    else { const r = Math.floor(rnd()*N_REJECTIONS); log('log.rejected', {b:p.ty, r}, 'bad'); fx(i,'fx.rejected',{},'bad');
      p.st='owned'; p.ty=null; p.flag={k:'rejected', until:S.month+1}; }
  });
  // 2. The urban plan (rezoning)
  if(S.plan && --S.plan.t <= 0){
    const ok = approves(5);
    if(ok){ let n=0; S.plan.list.forEach(i=>{ const p=S.grid[i]; if(['owned','review','approved','building','built'].includes(p.st) && p.k!=='habitat'){ p.urban=true; n++; fx(i,'fx.urban',{},'good'); } });
      S.cards.push({type:'notice', char:'mayor', icon:'map', key:'plan.ok', p:{n}, stamp:'stamp.approved', cls:'ok', sfx:'stamp'}); log('log.planApproved',{n},'good'); }
    else { S.cards.push({type:'notice', char:'mayor', icon:'map', key:'plan.no', p:{r:Math.floor(rnd()*N_REJECTIONS)}, stamp:'stamp.rejected', cls:'bad', sfx:'fail'}); log('log.planRejected',{},'bad'); }
    S.plan = null;
  }
  // 3. Start construction where contractors are free
  let free = contractors() - activeSites();
  S.grid.filter(p=>p.st==='approved').sort((a,b)=>a.q-b.q).forEach(p=>{
    if(free<=0) return; free--;
    p.st='building'; p.t=buildMonths(p.ty);
    const total = S.shovel ? 0 : buildCost(p, p.ty); if(S.shovel){ S.shovel=false; log('log.sponsor',{},'good'); }
    p.mcost = total / p.t;
  });
  // 4. Construction progress
  if(S.strike){ log('log.strike',{},'bad'); S.strike--; S.grid.forEach((p,i)=>{ if(p.st==='building') fx(i,'fx.strike',{},'bad'); }); }
  else S.grid.forEach((p,i)=>{
    if(p.st!=='building') return;
    if(p.halt){ p.halt--; if(!p.halt && p.flag && p.flag.k==='halt') p.flag=null; return; }
    spend(p.mcost);
    if(--p.t <= 0){ p.st='built';
      if(p.ty==='park') bump('neigh', 6, 'why.park');
      log('log.completed', {b:p.ty, at:pname(i)}, 'good'); fx(i,'fx.completed',{b:p.ty},'good'); }
  });
  // 5. Private developers build at their own pace (and stop when the market is cold)
  S.grid.forEach((p,i)=>{
    if(p.st!=='private') return;
    const cold = S.market < CFG.devMinMarket && !(p.dev.bailed>0);
    if(p.dev.bailed>0) p.dev.bailed--;
    if(cold){ p.flag = {k:'paused', until:S.month+1}; return; }
    if(--p.dev.t > 0) return;
    if(p.dev.phase==='permit'){ p.dev.phase='build'; p.dev.t=ri(3,5); }
    else { p.st='built'; p.priv=true; p.dev=null; log('log.devDone',{at:pname(i)},'good'); fx(i,'fx.completed',{b:'housing'},'good'); }
  });
  // 5b. Combos: newly formed pairs are announced (and discovered the first time ever)
  const combosNow = activeCombos(); S.comboSeen = S.comboSeen || [];
  combosNow.forEach(x=>{ const key = x.id+':'+x.i+':'+x.j; if(S.comboSeen.includes(key)) return; S.comboSeen.push(key);
    if(discover(x.id)) S.cards.push({type:'combo', id:x.id, i:x.i, j:x.j});
    else fx(x.good || x.j < 0 ? x.i : x.j, x.good ? 'fx.combo' : 'fx.comboBad', {c:x.id}, x.good ? 'good' : 'bad');   // j < 0: across the border
    log(x.good ? 'log.combo' : 'log.comboBad', {c:x.id}, x.good ? 'good' : 'bad'); });
  // 6. Upkeep, interest and the municipality's share of new taxes
  S.grid.forEach(p=>{ if(p.st==='built' && p.ty && p.k!=='regional' && !p.priv) spend(B[p.ty].upkeep); });
  if(S.debt>0) S.funds -= S.debt*S.rate;
  S.lastTax = taxIncome(); S.funds += S.lastTax;
  if(count('factory')>0) bump('local', 1, 'why.taxes');
  // 7. Residents move in (or out) toward the tightest limit
  const cp = caps(); S.bottleneck = cp.bottleneck;
  if(cp.cap > S.newcomers){
    const rate = clamp(0.3 + 0.06*count('park') + comboFx().rate + builtFx().rate, 0.1, 0.6);
    S.newcomers += Math.ceil((cp.cap - S.newcomers)*rate);
  } else if(cp.cap < S.newcomers){
    S.newcomers -= Math.ceil((S.newcomers - cp.cap)*0.15);
  }
  // 8. Meters drift, the market drifts
  bump('comp', -CFG.complianceDecay*(has('translation')?0.5:1), 'why.decay');
  bump('local', -CFG.localDecay, 'why.forget');
  bump('neigh', -activeSites()*CFG.noisePerSite, 'why.noise');
  if(has('comms')) bump('neigh', 2, 'why.comms');
  { const f = comboFx(); if(f.neigh) bump('neigh', f.neigh, 'why.combos'); if(f.local) bump('local', f.local, 'why.combos'); }
  { const b = builtFx(); if(b.neigh) bump('neigh', b.neigh, 'why.buildings'); if(b.local) bump('local', b.local, 'why.buildings'); }
  S.market = r1(clamp(S.market + (1-S.market)*0.15 + (rnd()-0.5)*0.1, 0.6, 1.3)*100)/100;
  // 9. Delayed national co-financing
  S.refunds = S.refunds.filter(f=>{ if(f.m<=S.month){ S.funds += f.x; log('log.cofin',{x:money(f.x)},'good'); return false; } return true; });
  // 10. Use-it-or-lose-it: a warning 3 months before, then half the shortfall is taken back
  const ms = CFG.milestones[S.month];
  if(ms){
    const need = r1(S.grant*ms), gap = r1(need - S.spent);
    if(gap > 0){ const cut = r1(gap*CFG.decommitShare); S.funds -= cut;
      S.cards.push({type:'notice', char:'brussels', icon:'money_off', key:'ms.cut', p:{m:S.month, need:money(need), spent:money(S.spent), cut:money(cut)}, stamp:'stamp.decommitted', cls:'bad', sfx:'fail'});
      log('log.decommitted', {x:money(cut)}, 'bad'); }
    else S.cards.push({type:'notice', char:'brussels', icon:'verified', key:'ms.ok', p:{m:S.month, need:money(need), spent:money(S.spent)}, stamp:'stamp.ontrack', cls:'ok', sfx:'stamp'});
  }
  const warnAt = Object.keys(CFG.milestones).map(Number).find(m=>m-3===S.month);
  if(warnAt){ const need = r1(S.grant*CFG.milestones[warnAt]);
    if(S.spent < need) S.cards.push({type:'notice', char:'brussels', icon:'warning', key:'ms.warn', p:{m:warnAt, need:money(need), gap:money(need-S.spent)}, stamp:'stamp.warning', cls:'bad', sfx:'phone'}); }
  // 11. Directives
  const d = S.directive;
  if(d){
    if(directiveProgress(d)){
      S.directive = null; S.directivesDone++; offerPerks();
      S.cards.push({type:'notice', char:'brussels', icon:'task_alt', key:'dir.met', p:{d:d.kind}, stamp:'stamp.compliant', cls:'ok', sfx:'fanfare'});
      log('log.directiveMet', {d:d.kind}, 'good');
    } else if(S.month >= d.deadline){
      S.directive = null; S.strikes++;
      const claw = S.strikes===1 ? 5 : 0; S.funds -= claw; bump('comp', -15, 'why.directiveFail');
      S.cards.push({type:'notice', char:'brussels', icon:'cancel', key: S.strikes>=2 ? 'dir.failed2' : 'dir.failed1', p:{d:d.kind, x:money(claw)}, stamp:'stamp.noncompliant', cls:'bad', sfx:'fail'});
      log('log.directiveFailed', {d:d.kind}, 'bad');
    }
  }
  if(on('directives') && !S.directive && !S.over && (S.month===2 || (S.month>2 && (S.month-2)%5===0))) issueDirective();
  // 12. Random event (a card with choices)
  if(!S.over) rollEvent();
  // 13. Money trouble: the regional bank lends a bridge loan instead of game over
  if(S.funds < 0 && !S.over && !on('lose')) S.funds = 0;   // learning levels: the Union quietly covers small gaps
  if(S.funds < 0 && !S.over){
    const loan = Math.ceil((-S.funds+1)/CFG.loanStep)*CFG.loanStep;
    S.debt = r1(S.debt + loan); S.funds += loan;
    S.cards.unshift({type:'notice', char:'banker', icon:'account_balance_wallet', key:'loan', p:{x:money(loan), debt:money(S.debt), rate:(S.rate*100).toFixed(1), cap:money(CFG.debtCap)}, stamp:'stamp.loan', cls:'bad', sfx:'cash'});
    log('log.loan', {x:money(loan)}, 'bad');
  }
  // 14. Next month
  S.month++; S.slots = Math.max(1, slotsPerMonth() - S.slotPenalty); S.slotPenalty = 0; S.lobbied = 0;
  S.grid.forEach(p=>{ if(p.flag && p.flag.until < S.month) p.flag = null; });
  // 15. Win / lose
  //     Meeting the target consolidates the settlement and the region grows; any loss ends the run.
  if(!S.over){
    const L = on('lose');
    if(residents() >= CFG.target){ S.perkChoice = null; consolidate(); }
    else if(L && S.debt > CFG.debtCap) S.over = {win:false, why:'bankrupt'};
    else if(L && on('comp') && S.comp <= 0) S.over = {win:false, why:'audit'};
    else if(L && S.strikes >= 2) S.over = {win:false, why:'suspended'};
    else if(S.month > CFG.months) S.over = {win:false, why:'timeout'};
  }
  if(!S.over && !S.pending) checkAch('month');
  if(S.over){ S.perkChoice = null; S.over.beat = recordRun(); S.over.career = endRun(); }
  save();
  return {ok:true};
}
