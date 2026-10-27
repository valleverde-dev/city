import { comboFx } from './combos.js';
import { B, CFG, on } from './config.js';
import { buildCost, count } from './rules.js';
import { S, r1 } from './state.js';
import { regionDividend } from './region.js';

export function residents(){ return S.newcomers + (S.base||0); }
export function taxIncome(){ return Math.round((CFG.taxShare*(count('factory')*CFG.taxPerFactory + S.newcomers*CFG.taxPerResident) + comboFx().tax + regionDividend())*100)/100; }
export function monthlyCosts(){
  let c = S.debt*S.rate;
  S.grid.forEach(p=>{ if(p.st==='building' && !p.halt) c += p.mcost;
    if(p.st==='built' && p.ty && p.k!=='regional' && !p.priv) c += B[p.ty].upkeep; });
  return c;
}
// Money already promised to works in progress (permits under review, queued and running sites)
export function committed(){ let c = 0; S.grid.forEach(p=>{ if(p.st==='review' || p.st==='approved') c += buildCost(p, p.ty); else if(p.st==='building') c += p.mcost*p.t; }); return c; }
// In the learning levels you can only spend what is not already promised; later the bank covers you (at a price)
export function avail(){ return on('lose') ? S.funds : S.funds - committed(); }
export function nextMilestone(){ const m = Object.keys(CFG.milestones).map(Number).find(m=>m>=S.month); return m ? {m, need:r1(S.grant*CFG.milestones[m])} : null; }
