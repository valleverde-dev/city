import { CFG, on } from '../core/config.js';
import { directiveProgress } from '../core/directives.js';
import { monthlyCosts, nextMilestone, taxIncome } from '../core/economy.js';
import { money } from '../core/format.js';
import { activeSites, approves, caps, contractors, hasAccess, support } from '../core/rules.js';
import { S, pname, rc } from '../core/state.js';
import { t } from '../i18n/index.js';

// --- What's wrong right now (the bell; tap an item to locate it) ---
export function problems(){
  const L = [], add = (sev, icon, k, p, i=-1) => L.push({sev, icon, k, p, i});
  let rustic = 0;
  S.grid.forEach((p,i)=>{ const [r,c] = rc(i);
    if(p.st==='owned' && !hasAccess(r,c)) add('warn','wrong_location','pb.noAccess',{at:pname(i)},i);
    else if(p.st==='owned' && !p.urban) rustic++;
    if(p.st==='building' && p.halt) add('bad','pan_tool','pb.halted',{at:pname(i), b:p.ty, n:p.halt},i);
    if(p.flag && p.flag.k==='rejected') add('bad','cancel','pb.rejected',{at:pname(i)},i);
    if(p.st==='review' && !approves()) add('bad','gavel','pb.willReject',{at:pname(i), o:support(), need:CFG.approveAt},i);
    if(p.st==='private' && p.flag && p.flag.k==='paused') add('warn','pause_circle','pb.paused',{at:pname(i)},i);
    if(p.st==='ruin') add('bad','domain_disabled','pb.ruin',{at:pname(i)},i);
  });
  if(on('rustic') && rustic && !S.plan) add('info','map','pb.needPlan',{n:rustic});
  const q = S.grid.filter(p=>p.st==='approved').length;
  if(q && activeSites() >= contractors()) add('warn','engineering','pb.queue',{n:q, c:contractors()});
  if(S.funds - monthlyCosts() + taxIncome() < 0) add('bad','money_off','pb.cash',{x:money(monthlyCosts())});
  if(on('comp') && S.comp < 30) add('bad','fact_check','pb.comp',{n:Math.round(S.comp)});
  if(on('neigh') && S.neigh < 15) add('bad','gavel','pb.neighCourt',{});
  else if(on('neigh') && S.neigh < 35) add('warn','diversity_3','pb.neigh',{});
  if(on('local') && S.local < 40) add('warn','how_to_vote','pb.local',{});
  const nm = nextMilestone(); if(nm && nm.m-S.month<=4 && S.spent<nm.need) add('warn','savings','pb.milestone',{m:nm.m, x:money(nm.need-S.spent)});
  if(S.directive && S.directive.deadline - S.month <= 1 && !directiveProgress(S.directive)) add('bad','assignment_late','pb.directive',{d:S.directive.kind});
  if(S.debt>0) add('warn','account_balance_wallet','pb.debt',{x:money(S.debt), r:(S.rate*100).toFixed(1), cap:money(CFG.debtCap)});
  if(on('market') && S.market < CFG.devMinMarket) add('info','trending_down','pb.market',{});
  add('info','insights','pb.growth',{w:t('bn.'+caps().bottleneck)});
  const order = {bad:0, warn:1, info:2}; return L.sort((a,b)=>order[a.sev]-order[b.sev]);
}
