import { CFG, PERKS } from './config.js';
import { residents } from './economy.js';
import { save } from './persist.js';
import { count, log } from './rules.js';
import { S, pick, ri, rnd } from './state.js';

// --- Directives (random missions from Brussels) ---
export function directiveProgress(d){
  switch(d.kind){
    case 'spend': return S.spent >= d.base + d.param;
    case 'park': return count('park') >= d.base+1;
    case 'school': return count('school') >= d.base+1;
    case 'consult': return S.consults >= d.base+1;
    case 'reports': return S.reports >= d.base + d.param;
    case 'residents': return residents() >= d.param;
    case 'roads': return count('road') >= d.base+3;
  }
  return false;
}
export const DIRECTIVE_ICON = {spend:'payments', park:'park', school:'school', consult:'forum', reports:'description', residents:'groups', roads:'add_road'};
export function issueDirective(){
  const m = S.month;
  const pool = ['spend','park','consult','reports','roads','school'];
  if(m >= 8) pool.push('residents','residents');
  const kind = pick(pool);
  const dur = {spend:5, park:5, school:7, consult:3, reports:4, residents:6, roads:5}[kind];
  const d = {kind, deadline: m+dur, param:0, base:0, ref:`HUF/${m}/${kind.toUpperCase()}`};
  if(kind==='spend'){ d.param = ri(8,12); d.base = S.spent; }
  if(kind==='park') d.base = count('park');
  if(kind==='school') d.base = count('school');
  if(kind==='consult') d.base = S.consults;
  if(kind==='reports'){ d.param = 2; d.base = S.reports; }
  if(kind==='roads') d.base = count('road');
  if(kind==='residents') d.param = Math.round((40 + (m+dur)*12)/10)*10;
  if(d.deadline > CFG.months) return;
  S.directive = d;
  S.cards.push({type:'directive', d});
  log('log.directiveNew', {d:d.kind, m:d.deadline});
}
export function offerPerks(){
  const free = Object.keys(PERKS).filter(k=>!S.perks.includes(k) || k==='shovel');
  const choice = [];
  while(choice.length < 3 && free.length){ choice.push(free.splice(Math.floor(rnd()*free.length),1)[0]); }
  S.perkChoice = choice;
}
export function choosePerk(k){
  if(!S.perkChoice || !S.perkChoice.includes(k)) return {ok:false};
  if(k==='shovel') S.shovel = true; else S.perks.push(k);
  if(k==='cousin') S.slots++;
  S.perkChoice = null;
  log('log.perk', {k}, 'good');
  save();
  return {ok:true};
}
