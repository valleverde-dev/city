import { playSound } from '../audio/sfx.js';
import { CFG, on } from '../core/config.js';
import { money } from '../core/format.js';
import { HALL, ORDS, ensureHalls, hallAsk, hallCake, hallCall, hallComplain, hallLunch, hallOf, hallRel, hallRepeal, reveal, stuckPermits } from '../core/halls.js';
import { save } from '../core/persist.js';
import { S, has, pname } from '../core/state.js';
import { mountEventArt } from '../render/evart.js';
import { t } from '../i18n/index.js';
import { btn, hideModal, letter, notice } from './cards.js';
import { P } from './dom.js';
import { refresh } from './guide.js';
import { ic } from './icons.js';

// =====================================================================
//  THE TOWN HALL SCREEN (v0.12) — tap a district's town hall on the map. The clerk at the counter,
//  the hall's lore, how it gets on with you, its ordinances (??? until you run into them or ask),
//  your permits waiting there, and what you can do about it.
// =====================================================================
const MOTION = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
export function openHall(k, msg){
  ensureHalls(); const H = hallOf(k), B = S.region.blocks[k]; if(!H) return;
  // the user's own story: you come for your permits and the clerk is on holiday — now you know
  if(H.away > 0 && H.ords.includes('holiday') && on('local')) reveal(k, 'holiday');
  const rel = hallRel(k), mood = rel >= 60 ? 'good' : rel >= 40 ? 'mid' : 'bad', stuck = stuckPermits(k);
  const quote = H.away > 0 && H.ords.includes('holiday') && on('local') ? t('hall.q.away', {c:H.clerk, n:H.away})
    : t('hall.q.'+mood, {c:H.clerk, town:B.town});
  const relRow = on('local') ? `<div class="hrel ${mood}"><span>${k === 0 ? t('hall.relMayor') : t('hall.rel')}</span><i><b style="width:${rel}%"></b></i><em>${rel}</em></div>` : `<p class="hint">${t('hall.relLater')}</p>`;
  const ords = H.ords.map(o=>{ const kn = H.known.includes(o), rp = H.repeal && H.repeal.ord === o;
    if(!kn) return `<li class="ord unknown">${ic('help')}<span><b>???</b><small>${t('hall.ordUnknown')}</small></span></li>`;
    const can = ORDS[o].bad && on('local') && !H.repeal;
    return `<li class="ord ${ORDS[o].bad ? 'bad' : 'good'}">${ic(ORDS[o].icon)}<span><b>${t('ord.'+o)}</b><small>${t('ordd.'+o)}</small>${rp ? `<em class="vote">${t('hall.voting', {m:H.repeal.m})}</em>` : ''}</span>${can ? `<button type="button" class="repeal" data-o="${o}">${ic('gavel')}${t('hall.repeal')}<small>${t('hall.repealSub', {n:HALL.repealSlots, need:HALL.repealNeed})}</small></button>` : ''}</li>`; }).join('');
  const stuckRow = stuck.length ? `<p class="stuck">${ic('hourglass_top')}${t('hall.stuck', {n:stuck.length, list:stuck.slice(0,3).map(i=>t('b.'+S.grid[i].ty)+' · '+pname(i)).join(', ')})}</p>` : '';
  const acts = [
    {k:'ask',      icon:'help',        fn:()=>hallAsk(k),      off: H.asked === S.stage, why: t('hall.askedPhase'), chips:[t('chip.slot1')]},
    {k:'cake',     icon:'restaurant',  fn:()=>hallCake(k),     off: H.cake === S.month || S.funds < HALL.cake, why: H.cake === S.month ? t('hall.cakeDone') : t('err.funds'), chips:[t('chip.slot1'), money(HALL.cake), on('local') ? `+${HALL.cakeRel}` : null]},
    {k:'lunch',    icon:'restaurant',  fn:()=>hallLunch(k),    off: !on('local') || S.funds < CFG.lobbyCost, why: !on('local') ? t('hall.later') : t('err.funds'), chips:[t('chip.slot1'), money(CFG.lobbyCost), `+${has('lobbyist') ? 20 : (H.lunch === S.month ? HALL.lunchRel2 : HALL.lunchRel)}`]},
    {k:'call',     icon:'phone',       fn:()=>hallCall(k),     off: !on('local') || !(H.away > 0 || stuck.length), why: t('hall.nothingStuck'), chips:[t('chip.slot1'), `${HALL.callRel}`]},
    {k:'complain', icon:'description', fn:()=>hallComplain(k), off: !(H.away > 1), why: t('hall.nothingStuck'), chips:[t('chip.slot1'), `${HALL.complainRel}`, on('comp') ? `${t('meter.comp')} +${HALL.complainComp}` : null]},
  ].filter(a=>a.k !== 'complain' || (H.ords.includes('holiday') && H.known.includes('holiday')));
  const noSlots = S.slots < 1 || S.over || S.pending;
  const actHtml = acts.map(a=>{ const dis = a.off || noSlots;
    return `<button type="button" class="dchoice hact" data-k="${a.k}"${dis ? ' disabled' : ''}><b>${ic(a.icon)}${t('hall.act.'+a.k, {c:H.clerk})}</b><small>${t('hall.actd.'+a.k, {c:H.clerk})}</small><span class="chips">${a.chips.filter(Boolean).map(c=>`<span class="chip">${c}</span>`).join('')}${dis ? `<span class="chip bad">${noSlots && !a.off ? t('err.slots') : a.why}</span>` : ''}</span></button>`; }).join('');
  letter({icon:'account_balance', title:t('hall.t', {town:B.town}), speaker:'mayor', who:H.clerk, role:t('hall.clerk'), voice:false, wide:true,
    body:`<div class="quote">${quote}</div><p class="lore">${t('hall.lore', {y:H.year})} · <i>${t('motto.'+H.motto)}</i></p>
      ${msg ? `<p class="hall-msg ${msg.cls||''}">${msg.text}</p>` : ''}
      ${relRow}<h4>${t('hall.ords')}</h4><ul class="ords">${ords}</ul>${stuckRow}
      <h4>${t('hall.counter')} <small>${t('hall.slots', {n:S.slots})}</small></h4><div class="dchoices hacts n${acts.length}">${actHtml}</div>`,
    buttons:[btn(t('ui.close'), 'close', ()=>{ playSound('click'); hideModal(); refresh(); }, true)]});
  notice.classList.add('hall-screen');
  const colA = notice.querySelector('.col-a'), art = document.createElement('div'); art.className = 'evart-wrap';
  if(colA){ colA.prepend(art); mountEventArt(art, 'hall', 'mayor', MOTION); }
  const run = res => { playSound(res.sfx || (res.ok ? 'ok' : 'fail')); save(); refresh();
    openHall(k, {text: t(res.msg.k, P(res.msg.p)), cls: res.ok ? (res.cls || 'good') : 'bad'}); };
  notice.querySelectorAll('.hact').forEach(b=>b.onclick = ()=>{ const a = acts.find(x=>x.k===b.dataset.k); if(a) run(a.fn()); });
  notice.querySelectorAll('.repeal').forEach(b=>b.onclick = ()=>run(hallRepeal(k, b.dataset.o)));
}
