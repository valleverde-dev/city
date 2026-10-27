import { playSound } from '../audio/sfx.js';
import { acquire, consult, fileReport, lobby, repay, requestPermit, sellPlot, submitPlan } from '../core/actions.js';
import { COMBOS, COMBO_BY_ID, activeCombos, comboPreview, discovered } from '../core/combos.js';
import { B, BUILD_TYPES, CFG, KIND, on } from '../core/config.js';
import { DIRECTIVE_ICON } from '../core/directives.js';
import { residents, taxIncome } from '../core/economy.js';
import { money } from '../core/format.js';
import { activeSites, approvalChance, buildCost, buildMonths, caps, contractors, hasAccess, landPrice, permitMonths, plotValue } from '../core/rules.js';
import { S, has, pname, r1, rc } from '../core/state.js';
import { t } from '../i18n/index.js';
import { centreOn, selected, setSelected } from '../render/camera.js';
import { $, P } from './dom.js';
import { pulse, refresh, styleName } from './guide.js';
import { actBtn, agendaAvailable, doAction, hidePop, setSheet, sheet } from './hud.js';
import { ic } from './icons.js';
import { problems } from './problems.js';
import { REGION_COMBOS, regionDividend, regionPop } from '../core/region.js';
import { rcomboChips, regionName, stypeBlock } from './cards.js';
import { regionCanvas } from './regionmap.js';

// --- Sheets: one thing at a time, on demand ---
export function openSheet(name){ hidePop(); setSheet(name); if(name==='inbox') S.logSeen = S.logN||0; refresh(); }
export function closeSheet(){ setSheet(null); setSelected(-1); refresh(); }
export function renderSheet(){
  const el = $('sheet'), body = $('sheetBody'), title = $('sheetTitle');
  if(sheet==='parcel' && selected<0) setSheet(null);
  if(sheet==='agenda' && !agendaAvailable()) setSheet(null);
  document.body.classList.toggle('sheet-open', !!sheet);
  if(!sheet){ el.hidden = true; return; }
  el.hidden = false; body.innerHTML = '';
  if(sheet==='parcel'){ const [pi, pt] = parcelTitle(selected); title.innerHTML = `${ic(pi)}${pt}`; body.appendChild(parcelCard(selected)); }
  if(sheet==='agenda'){ title.innerHTML = `${ic('work')}${t('ui.agenda')}`;
    if(S.directive){ const d=S.directive, left = d.deadline - S.month + 1, c = document.createElement('div'); c.className='card directive';
      c.innerHTML = `<div class="ref">${t('ui.directiveRef', {ref:d.ref})}</div><h3>${ic(DIRECTIVE_ICON[d.kind])}${t('dir.'+d.kind+'.t')}</h3><p>${t('dir.'+d.kind+'.x', {n:d.param})}</p>
        <div class="due" style="color:${left<=1?'var(--bad)':'var(--ink)'}">${t('ui.due', {m:d.deadline, n:left})}</div>`;
      body.appendChild(c); }
    body.appendChild(agendaCard()); }
  if(sheet==='city'){ title.innerHTML = `${ic('insights')}${t('ui.town')}`; body.appendChild(cityCard()); body.appendChild(regionCard()); }
  if(sheet==='inbox'){ title.innerHTML = `${ic('inbox')}${t('ui.inbox')}`;
    const lg = document.createElement('div'); lg.className='card';
    lg.innerHTML = `<ul class="log">${S.log.slice(0,30).map(l=>`<li class="${l.c}"><span class="m">M${l.m}</span>${t(l.k, P(l.p))}</li>`).join('')}</ul>`;
    body.appendChild(lg); }
  if(sheet==='problems'){ title.innerHTML = `${ic('report')}${t('ui.problems')}`;
    const pb = problems(), card = document.createElement('div'); card.className = 'card'+(pb.some(x=>x.sev==='bad')?' alert':'');
    const ul = document.createElement('ul'); ul.className='problems';
    pb.forEach(x=>{ const li=document.createElement('li'); li.className=x.sev;
      li.innerHTML = `${ic(x.icon)}<span>${t(x.k, P(x.p))}<small>${t(x.k+'.h', P(x.p))}</small></span>`;
      if(x.i>=0) li.onclick = ()=>{ setSelected(x.i); setSheet('parcel'); centreOn(x.i); pulse(x.i); playSound('click'); refresh(); };
      ul.appendChild(li); });
    card.appendChild(ul); body.appendChild(card); }
  if(sheet==='combos'){ title.innerHTML = `${ic('workspace_premium')}${t('combo.cat')}`; body.appendChild(catalogueEl()); }
}
export function cityCard(){
  const cp = caps(), tax = taxIncome(), st = document.createElement('div'); st.className='card';
  const row = (k, v) => `<dt>${t(k)}</dt><dd>${v}</dd>`;
  st.innerHTML = `<div class="goal">${t('lvl.goalShort',{n:CFG.target, m:CFG.months})}</div><dl class="kv">
    ${row('ui.residents', residents()+' / '+CFG.target)}${row('ui.homes', cp.homes)}
    ${on('jobs') ? row('ui.jobs', t('ui.jobsN',{n:cp.jobs})) : ''}
    ${on('services') ? row('ui.schoolPl', cp.school) + row('ui.health', cp.health) : ''}
    ${row('ui.construction', t('ui.sites',{a:activeSites(), c:contractors()}))}
    ${on('permits') ? row('ui.odds', Math.round(approvalChance()*100)+'%') : ''}
    ${on('market') ? row('ui.market', Math.round(S.market*100)+'%') : ''}
    ${row('ui.taxes', money(tax)+'/'+t('ui.mo'))}
    ${S.perks.length||S.shovel ? row('ui.perks', S.perks.map(k=>t('perk.'+k)).concat(S.shovel?[t('perk.shovel')]:[]).join(', ')) : ''}</dl>
    <div class="bottleneck">${t('ui.limitedBy')} <b>${t('bn.'+cp.bottleneck)}</b></div>`;
  return st;
}
// The Euroregion: the map of all settlements, what the region pays, this settlement's type and region combos
export function regionCard(){
  const c = document.createElement('div'); c.className = 'card region';
  const row = (k, v) => `<dt>${t(k)}</dt><dd>${v}</dd>`;
  c.innerHTML = `<h4>${ic('map')}${regionName()}</h4><div class="rmap-slot"></div>
    <dl class="kv">${row('ui.settlements', S.region.blocks.length)}${row('ui.regionPop', regionPop() + residents())}${S.region.blocks.length ? row('ui.dividend', money(regionDividend())+'/'+t('ui.mo')) : ''}</dl>
    <p class="hint">${t('ui.thisSettlement')}</p>${stypeBlock(S.stype)}${S.rcombos.length ? rcomboChips(S.rcombos, true) : ''}
    ${S.region.blocks.length ? `<p class="hint">${t('ui.regionHint')}</p>` : ''}`;
  c.querySelector('.rmap-slot').appendChild(regionCanvas({maxW: 300, maxH: 170}));
  return c;
}
export function agendaCard(){
  const c = document.createElement('div'); c.className='card';
  c.innerHTML = `<p>${t('ui.agendaHint2')}</p>`;
  const a = document.createElement('div'); a.className='actions'; const off = !!S.over;
  if(on('rustic')) a.appendChild(actBtn('map', t('act.plan'), S.plan ? t('act.planBusy',{n:S.plan.t}) : t('act.planSub',{x:money(CFG.planCost)}), ()=>doAction(submitPlan(),-1), off||!!S.plan||S.slots<2));
  if(on('local')) a.appendChild(actBtn('restaurant', t('act.lobby'), t('act.lobbySub',{x:money(CFG.lobbyCost), n:has('lobbyist')?20:(S.lobbied?6:12)}), ()=>doAction(lobby(),-1), off||S.slots<1));
  if(on('neigh')) a.appendChild(actBtn('forum', t('act.consult'), t('act.consultSub'), ()=>doAction(consult(),-1), off||S.slots<2));
  if(on('comp')) a.appendChild(actBtn('description', t('act.report'), t('act.reportSub'), ()=>doAction(fileReport(),-1), off||S.slots<1));
  if(S.debt>0) a.appendChild(actBtn('account_balance_wallet', t('act.repay',{x:money(Math.min(CFG.loanStep,S.debt))}), t('act.repaySub'), ()=>doAction(repay(),-1), off||S.funds<Math.min(CFG.loanStep,S.debt), 'money'));
  c.appendChild(a); return c;
}
export function parcelTitle(i){
  const p = S.grid[i], isB = p.ty && p.k!=='regional';
  const title = isB ? t('b.'+p.ty) : (p.k==='farm' && !on('rustic')) ? t('k.farmU') : (p.urban && p.st==='owned' && p.k!=='muni') ? t('k.serviced') : t('k.'+p.k);
  return [isB ? B[p.ty].icon : KIND[p.k], title];
}
export function parcelCard(i){
  const p = S.grid[i], [r,c] = rc(i);
  const card = document.createElement('div'); card.className='card';
  const isB = p.ty && p.k!=='regional';
  let html = `<div class="ref">${t('ui.parcel',{at:pname(i)})}${p.urban && !isB && on('rustic') ? ' · '+t('ui.urban') : ''}</div>`;
  const a = document.createElement('div'); a.className='actions'; const off = !!S.over || S.slots<1;
  if(p.k==='habitat') html += `<p>${t('pc.habitat')}</p>`;
  else if(p.k==='village') html += `<p>${t('pc.village')}</p>`;
  else if(p.k==='regional') html += `<p>${t('pc.regional')}</p>`;
  else if(p.st==='land'){
    html += `<p>${t(p.k==='muni'?'pc.muni':p.k==='flood'?'pc.flood':!on('rustic')?'pc.farmUrban':(p.hold?'pc.farmHeld':'pc.farm'))}</p>`;
    a.appendChild(actBtn('real_estate_agent', t('act.acquire',{x:money(landPrice(p))}), t('act.slot1'), ()=>doAction(acquire(i),i), off));
  } else if(p.st==='owned'){
    const acc = hasAccess(r,c);
    html += `<p>${!acc ? t('pc.noAccess') : !on('rustic') ? t('pc.ownedSimple') : p.urban ? t('pc.ownedUrban') : t('pc.ownedRustic')}</p>`;
    const types = BUILD_TYPES.filter(ty => (ty!=='road' || on('access')) && (ty!=='factory' || on('jobs')) && ((ty!=='school' && ty!=='clinic') || on('services')));
    types.forEach(ty=>{ const bt=B[ty], blocked = !acc || (bt.urban && !p.urban);
      const why = !acc ? t('err.noAccess') : (bt.urban && !p.urban) ? t('pc.needsUrban') : '';
      a.appendChild(actBtn(bt.icon, t('b.'+ty), `<span class="meta">${on('permits') ? t('pc.timing',{p:permitMonths(ty), b:buildMonths(ty), x:money(buildCost(p,ty))}) : t('pc.timingSimple',{b:buildMonths(ty)+1, x:money(buildCost(p,ty))})}</span>`
        + `<span class="desc">${t('bd.'+ty)}</span>` + (why ? `<span class="why">${why}</span>` : '') + comboChips(comboPreview(i, ty)),
        ()=>doAction(requestPermit(i,ty),i), blocked || off, 'build')); });
    if(p.urban && on('market')) a.appendChild(actBtn('sell', t('act.sell',{x:money(plotValue(p))}), S.market<CFG.devMinMarket ? t('act.sellCold') : t('act.sellSub'), ()=>doAction(sellPlot(i),i), !acc || off || S.market<CFG.devMinMarket, 'money'));
  }
  else if(p.st==='review' && !on('permits')) html += `<p>${t('pc.reviewSimple',{b:t('b.'+p.ty), n:p.t})}</p>`;
  else if(p.st==='review') html += `<p>${t('pc.review',{b:t('b.'+p.ty), n:p.t, o:Math.round(approvalChance()*100)})}</p>`;
  else if(p.st==='approved') html += `<p>${t('pc.approved',{b:t('b.'+p.ty)})}</p>`;
  else if(p.st==='building') html += `<p>${t('pc.building',{b:t('b.'+p.ty), n:p.t, x:money(p.mcost)})}${p.halt?' <b style="color:var(--bad)">'+t('pc.halted',{n:p.halt})+'</b>':''}</p>`;
  else if(p.st==='private') html += `<p>${t(p.dev.phase==='permit'?'pc.privPermit':'pc.privBuild',{n:p.dev.t})}${S.market<CFG.devMinMarket?' <b style="color:var(--warn)">'+t('pc.privPaused')+'</b>':''}</p>`;
  else if(p.st==='ruin'){ html += `<p>${t('pc.ruin')}</p>`; a.appendChild(actBtn('real_estate_agent', t('act.buyBack',{x:money(r1(p.price*1.5))}), t('act.slot1'), ()=>doAction(acquire(i),i), off)); }
  else if(p.st==='built' && isB && p.ty!=='road'){ html += `<p class="style">${styleName(i)}</p><p>${t('bd.'+p.ty)}. ${p.priv ? t('pc.private') : t('pc.upkeep',{x:money(B[p.ty].upkeep)})}</p>`;
    if(on('combos')){ const mine = activeCombos().filter(x=>x.i===i || x.j===i);
      html += `<div class="combos-here"><b>${t('ui.combosHere')}</b>${mine.length ? comboChips(mine.map(x=>COMBO_BY_ID[x.id]), true) : `<p>${t('combo.none')}</p>`}</div>`; } }
  else if(p.st==='built') html += `<p>${t('pc.road')}</p>`;
  card.innerHTML = html; if(a.children.length) card.appendChild(a);
  return card;
}
// Combo chips: named once discovered; before that only a mysterious "combo?" (good and bad look the same)
export function comboChips(list, showAll){
  if(!list.length) return '';
  const known = discovered();
  return `<span class="chips">${list.map(cb=> known.includes(cb.id) || showAll
    ? `<span class="chip ${cb.good?'good':'bad'}">${ic(cb.good?'workspace_premium':'warning')}${t('combo.'+cb.id)}</span>`
    : `<span class="chip mystery">${ic('workspace_premium')}${t('combo.possible')}</span>`).join('')}</span>`;
}
export function catalogueEl(){
  const known = discovered(), wrap = document.createElement('div'); wrap.className = 'card';
  const items = COMBOS.map(cb=>{ const k = known.includes(cb.id);
    return `<li class="${k?(cb.good?'good':'bad'):'unknown'}">${ic(k?(cb.good?'workspace_premium':'warning'):'info')}<span><b>${k?t('combo.'+cb.id):t('combo.unknown')}</b>
      <small>${k ? t('combod.'+cb.id) + ' · ' + t('combo.pieces',{a:t('piece.'+cb.a), b:t('piece.'+cb.b)}) : t('combo.unknownHint')}</small></span></li>`; }).join('');
  const rk = REGION_COMBOS.filter(c=>known.includes(c.id)).length;
  const ritems = REGION_COMBOS.map(cb=>{ const k = known.includes(cb.id);
    return `<li class="${k?(cb.good?'good':'bad'):'unknown'}">${ic(k?(cb.good?'workspace_premium':'warning'):'info')}<span><b>${k?t('rcombo.'+cb.id):t('combo.unknown')}</b>
      <small>${k ? t('rcombod.'+cb.id) + ' · ' + t('combo.pieces',{a:t('st.'+cb.a), b:t('st.'+cb.b)}) : t('combo.unknownHint')}</small></span></li>`; }).join('');
  wrap.innerHTML = `<p>${t('combo.catx',{n:known.filter(id=>COMBOS.some(c=>c.id===id)).length, t:COMBOS.length})}</p><ul class="catalogue">${items}</ul>
    <h4>${ic('map')}${t('combo.region')}</h4><p>${t('combo.regionx',{n:rk, t:REGION_COMBOS.length})}</p><ul class="catalogue">${ritems}</ul>`;
  return wrap;
}
export function catalogueCard(){ openSheet('combos'); }
