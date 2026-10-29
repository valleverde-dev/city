import { playSound } from '../audio/sfx.js';
import { COMBOS, discovered } from '../core/combos.js';
import { B, CFG, NEW_TYPES, PERKS, on } from '../core/config.js';
import { ACH, PERK_RANK, RANK_BONUS, RANK_LEVEL, UNLOCKED_BY, career, levelOf, levelXp, rankOf, unlocked } from '../core/career.js';
import { residents, taxIncome } from '../core/economy.js';
import { money } from '../core/format.js';
import { REGION_COMBOS, STYPE_ICON, regionDividend, regionPop } from '../core/region.js';
import { activeSites, caps, contractors, count } from '../core/rules.js';
import { S, clamp } from '../core/state.js';
import { t } from '../i18n/index.js';
import { regionName } from './cards.js';
import { $ } from './dom.js';
import { buildingArt } from './dock.js';
import { refresh } from './guide.js';
import { hidePop, roman, runTab, setRunTab } from './hud.js';
import { ic } from './icons.js';
import { regionCanvas } from './regionmap.js';

// =====================================================================
//  THE RUN FILE ("Expediente", v0.9) — the roguelike screen: the combos you know, the perks of this run
//  and the ones you can still meet, your career (level, rank, achievements, buildings to unlock), the region.
//  Full screen, tabs on top, everything scrolls sideways.
// =====================================================================
export const TABS = ['combos', 'perks', 'career', 'region'];
const TAB_ICON = {combos:'workspace_premium', perks:'key', career:'military_tech', region:'map'};
let filter = 'all';
export function openRun(tab = 'combos'){ hidePop(); setRunTab(tab); playSound('click'); refresh(); }
export function closeRun(){ if(!runTab) return; setRunTab(null); playSound('click'); refresh(); }
export function renderRun(){
  const el = $('run'); if(!el) return;
  if(!runTab || !S){ el.hidden = true; el.dataset.k = ''; return; }
  const scroller = el.querySelector('.run-body'), keep = scroller && el.dataset.k === runTab+filter ? scroller.scrollLeft : 0;
  el.hidden = false; el.dataset.k = runTab+filter;
  const c = career(), known = discovered(), nCombos = COMBOS.length + REGION_COMBOS.length, nKnown = known.length;
  const badge = {combos:`${nKnown}/${nCombos}`, perks:String(S.perks.length + (S.shovel?1:0)), career:t('xp.lvShort', {n:levelOf(c.xp)}), region:String(S.region.blocks.length + (S.region.active?1:0))};
  el.innerHTML = `<div class="run-head">${ic('work')}<div class="ttl"><h2>${t('file.t')}</h2><small>${regionName()} · ${t('ui.settlement')} ${roman((S.stage||0)+1)} · ${t('ui.month')} ${Math.min(S.month, CFG.months)}</small></div>
      <nav class="run-tabs">${TABS.map(k=>`<button class="rtab${k===runTab?' on':''}" data-t="${k}">${ic(TAB_ICON[k])}<span>${t('file.'+k)}</span><em>${badge[k]}</em></button>`).join('')}</nav>
      <button class="run-x" aria-label="${t('ui.close')}">${ic('close')}</button></div>
    <div class="run-body ${runTab}"></div>`;
  el.querySelector('.run-x').onclick = closeRun;
  el.querySelectorAll('.rtab').forEach(b=>b.onclick = ()=>{ playSound('click'); setRunTab(b.dataset.t); refresh(); });
  const body = el.querySelector('.run-body');
  ({combos:combosTab, perks:perksTab, career:careerTab, region:regionTab})[runTab](body, c, known);
  body.scrollLeft = keep;
}
// ---------- Combos: a collection; unknown ones show their pieces as silhouettes ----------
const LAND_ICON = {regional:'add_road', flood:'water', village:'cottage', habitat:'forest', road:'add_road', farm:'agriculture'};
function pieceArt(p, dark){
  const a = B[p] && buildingArt(p);
  return a ? `<img src="${a}" alt=""${dark ? ' class="dark"' : ''}>` : `<span class="pic">${ic(STYPE_ICON[p] || LAND_ICON[p] || 'info')}</span>`;
}
function combosTab(body, c, known){
  const all = COMBOS.map(cb=>({...cb, region:false})).concat(REGION_COMBOS.map(cb=>({...cb, region:true})));
  const show = all.filter(cb=>{ const k = known.includes(cb.id);
    return filter==='all' || (filter==='good' && k && cb.good) || (filter==='bad' && k && !cb.good) || (filter==='region' && cb.region) || (filter==='unknown' && !k); });
  const lockOf = cb => !cb.region && [cb.a, cb.b].find(p=>NEW_TYPES.includes(p) && !unlocked(p));
  body.innerHTML = `<div class="filters">${['all','good','bad','region','unknown'].map(f=>`<button class="flt${f===filter?' on':''}" data-f="${f}">${t('file.f.'+f)}</button>`).join('')}
      <span class="count"><b>${known.length}</b> / ${all.length}<span class="bar"><i style="width:${known.length/all.length*100}%"></i></span></span></div>
    <div class="grid2">${show.map(cb=>{ const k = known.includes(cb.id), lock = lockOf(cb), name = (cb.region ? 'rcombo.' : 'combo.')+cb.id, pa = cb.region ? 'st.' : 'piece.';
      const cls = lock ? 'locked' : !k ? 'unknown' : cb.good ? 'good' : 'bad';
      return `<div class="ccard ${cls}${cb.region ? ' region' : ''}"><div class="band">${pieceArt(cb.a, !k)}${pieceArt(cb.b, !k)}<span class="op">${!k ? '?' : cb.good ? '+' : '−'}</span></div>
        <b>${lock ? t('file.locked') : k ? t(name) : '???'}</b><small>${t(pa+cb.a)} + ${t(pa+cb.b)}</small>
        <span class="fx">${lock ? t('lock.'+lock) : k ? t((cb.region ? 'rcombod.' : 'combod.')+cb.id).split('. ')[0] : t('file.tryIt')}</span></div>`; }).join('')}</div>
    <p class="foot">${ic('military_tech')}${t('file.comboXp', {n:25})}</p>`;
  body.querySelectorAll('.flt').forEach(b=>b.onclick = ()=>{ playSound('click'); filter = b.dataset.f; renderRun(); });
}
// ---------- Perks: this run's hand, and the pool (grows with your rank) ----------
function perksTab(body, c){
  const mine = S.perks.concat(S.shovel ? ['shovel'] : []), rank = rankOf(c.xp);
  body.innerHTML = `<h3>${t('file.hand')}<small>${t('file.handSub')}</small></h3>
    <div class="row hand">${mine.map(k=>`<div class="pcard">${ic(PERKS[k])}<b>${t('perk.'+k)}</b><small>${t('perkd.'+k)}</small></div>`).join('')}
      <div class="pcard empty">${ic('add_circle')}<b>${t('file.nextPerk')}</b></div></div>
    <h3>${t('file.pool')}<small>${t('file.poolSub')}</small><em>${Object.keys(PERKS).filter(k=>rank >= PERK_RANK[k]).length} / ${Object.keys(PERKS).length}</em></h3>
    <div class="row pool">${Object.keys(PERKS).map(k=>{ const need = PERK_RANK[k] || 0, open = rank >= need, seen = c.perks.includes(k);
      return `<div class="qcard ${!open ? 'locked' : seen ? 'seen' : 'new'}" title="${open ? t('perkd.'+k) : ''}">${ic(open ? PERKS[k] : 'lock')}<b>${open ? t('perk.'+k) : t('file.rankN', {r:t('rank.'+need)})}</b>${open && !seen ? `<em>${t('file.notYet')}</em>` : ''}</div>`; }).join('')}</div>`;
}
// ---------- Career: level and rank, achievements, the buildings still to unlock (and how close you are) ----------
const PROGRESS = {
  firstStone: ()=>[count('housing'), 1], expansion: ()=>[S.region.blocks.length + 1, 2], comboHunter: ()=>[discovered().length, 5],
  greenFingers: ()=>[count('park'), 3], region3: ()=>[S.region.blocks.length + 1, 3], kafka: ()=>[S.stats ? S.stats.approved||0 : 0, 5],
};
function careerTab(body, c){
  const lv = levelOf(c.xp), a = levelXp(lv), b = levelXp(lv+1), r = rankOf(c.xp), nextR = RANK_LEVEL[r+1];
  const got = c.ach.length;
  body.innerHTML = `<div class="row top"><div class="rank"><div class="medal">${ic('military_tech')}<b>${t('xp.lvShort', {n:lv})}</b></div>
        <div class="rk"><b>${t('rank.'+r)}</b><span class="bar"><i style="width:${clamp((c.xp-a)/(b-a)*100,0,100)}%"></i></span>
        <small>${t('file.xpNext', {x:c.xp, y:b, n:lv+1})}</small><span class="tagl">${t('file.bonus', {p:Math.round(r*RANK_BONUS*100)})}</span>
        ${nextR !== undefined ? `<small>${t('file.nextRank', {r:t('rank.'+(r+1)), n:nextR})}</small>` : ''}</div></div>
      <div class="achs"><h3>${t('file.ach')}<em>${got} / ${ACH.length}</em></h3><div class="medals">${ACH.map(x=>`<span class="md ${c.ach.includes(x.id)?'on':''}" title="${t('ach.'+x.id+'.t')}: ${t('ach.'+x.id+'.x')}">${ic('workspace_premium')}</span>`).join('')}</div>
        <p class="runxp">${t('file.runXp', {n:S.rs ? S.rs.xp||0 : 0})}</p></div></div>
    <h3>${t('file.unlocks')}<small>${t('file.unlocksSub')}</small><em>${NEW_TYPES.filter(unlocked).length} / ${NEW_TYPES.length}</em></h3>
    <div class="row track">${NEW_TYPES.map(ty=>{ const id = UNLOCKED_BY[ty], ok = unlocked(ty), pr = PROGRESS[id] ? PROGRESS[id]() : null, pct = ok ? 100 : pr ? clamp(pr[0]/pr[1]*100, 0, 99) : 0;
      return `<div class="ucard ${ok ? 'on' : ''}"><div class="band"><img src="${buildingArt(ty)}" alt=""${ok ? '' : ' class="dark"'}>${ic(ok ? 'check' : 'lock')}</div>
        <b>${t('b.'+ty)}</b><small>${t('ach.'+id+'.x')}</small><span class="bar"><i style="width:${pct}%"></i></span><em>${ok ? t('file.done') : pr ? Math.min(pr[0], pr[1])+' / '+pr[1] : '?'}</em></div>`; }).join('')}</div>`;
}
// ---------- Region: the map of the Euroregion and this settlement in numbers ----------
function regionTab(body){
  const cp = caps(), row = (k, v) => `<dt>${t(k)}</dt><dd>${v}</dd>`;
  body.innerHTML = `<div class="row reg"><div class="rbox map"><h3>${ic('map')}${regionName()}</h3><div class="rmap-slot"></div>
        <dl class="kv">${row('ui.settlements', S.region.blocks.length)}${row('ui.regionPop', regionPop() + residents())}${S.region.blocks.length ? row('ui.dividend', money(regionDividend())+'/'+t('ui.mo')) : ''}</dl></div>
      <div class="rbox town"><h3>${ic(STYPE_ICON[S.stype] || 'cottage')}${S.town}<small>${t('st.'+S.stype)}</small></h3><p>${t('std.'+S.stype)}</p>
        <dl class="kv">${row('ui.residents', residents()+' / '+CFG.target)}${row('ui.homes', cp.homes)}${on('jobs') ? row('ui.jobs', t('ui.jobsN',{n:cp.jobs})) : ''}
          ${on('services') ? row('ui.schoolPl', cp.school) + row('ui.health', cp.health) : ''}${row('ui.construction', t('ui.sites',{a:activeSites(), c:contractors()}))}
          ${on('market') ? row('ui.market', Math.round(S.market*100)+'%') : ''}${row('ui.taxes', money(taxIncome())+'/'+t('ui.mo'))}</dl>
        <p class="bottleneck">${t('ui.limitedBy')} <b>${t('bn.'+cp.bottleneck)}</b></p></div></div>`;
  body.querySelector('.rmap-slot').appendChild(regionCanvas({maxW: 420, maxH: 300}));
}
