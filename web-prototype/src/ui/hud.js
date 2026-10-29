import { playSound } from '../audio/sfx.js';
import { CFG, PERKS, on } from '../core/config.js';
import { DIRECTIVE_ICON } from '../core/directives.js';
import { monthlyCosts, nextMilestone, residents, taxIncome } from '../core/economy.js';
import { money } from '../core/format.js';
import { snapshot } from '../core/newgame.js';
import { save } from '../core/persist.js';
import { caps, slotsPerMonth } from '../core/rules.js';
import { S, clamp } from '../core/state.js';
import { career, levelOf, levelXp, rankOf } from '../core/career.js';
import { LANG, t } from '../i18n/index.js';
import { $, P, floatAt } from './dom.js';
import { refresh } from './guide.js';
import { ic } from './icons.js';
import { problems } from './problems.js';

// =====================================================================
//  HUD (v0.9) — it floats over the map: the goal (residents and months) and the money first,
//  then the meters as segments and the perks as relics. No sheets: the rest lives in the bottom bar.
// =====================================================================
export const ROMAN = ['I','II','III','IV','V','VI'];
export function roman(n){ const T = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
  let out = ''; for(const [v,s] of T) while(n >= v){ out += s; n -= v; } return out; }
// The Expediente (run file) is the only full screen during play; which tab it shows (null: closed)
export let runTab = null;
export function setRunTab(name){ runTab = name; }
const BN_ICON = {homes:'apartment', jobs:'factory', school:'school', health:'local_hospital'};
export function applyStatic(){
  document.documentElement.lang = LANG;
  $('hint').textContent = t('ui.hintPan');
  [['m-local','meterS.local'],['m-neigh','meterS.neigh'],['m-comp','meterS.comp'],['m-spent','meterS.spent']].forEach(([id,k])=>$(id).querySelector('.lbl').textContent = t(k));
  $('st-month').title = t('ui.month'); $('st-funds').title = t('ui.funds'); $('st-res').title = t('ui.residents'); $('st-debt').title = t('ui.debt');
  $('inboxBtn').setAttribute('aria-label', t('ui.inbox')); $('menuBtn').setAttribute('aria-label', t('ui.menu'));
  $('runBtn').querySelector('.lbl').textContent = t('file.t');
  $('centreBtn').title = t('ui.centre'); $('rotateBtn').title = t('ui.rotate');
}
// A meter as five segments (and its number), coloured by how worrying it is
export function setMeter(id, v, prev, warnBelow=40, badBelow=25){
  const el = $(id), n = Math.round(clamp(v,0,100)/20 + 0.0001), col = v < badBelow ? 'bad' : v < warnBelow ? 'mid' : 'ok';
  el.querySelector('b').textContent = Math.round(v);
  el.querySelector('.seg').innerHTML = Array.from({length:5}, (_,k)=>`<i class="${k < Math.max(n, v>0?1:0) ? col : ''}"></i>`).join('');
  const d = Math.round(v - prev); el.classList.toggle('alarm', d <= -8);
  el.dataset.d = d ? (d>0 ? '▲'+d : '▼'+(-d)) : ''; el.classList.toggle('up', d>0); el.classList.toggle('down', d<0);
}
let lastXp = null;
export function updateHUD(){
  $('townName').textContent = `${t('ui.settlement')} ${roman((S.stage||0)+1)} · ${S.town}`;
  // the goal: residents toward the target, months left as pips
  const res = residents(), left = Math.max(0, CFG.months - Math.min(S.month, CFG.months) + 1);
  $('residents').textContent = res; $('target').textContent = CFG.target;
  $('resBar').style.width = clamp(res/CFG.target*100, 0, 100)+'%';
  const bn = S.region.active ? caps().bottleneck : null;
  $('bneck').innerHTML = bn && res < CFG.target ? `${ic(BN_ICON[bn]||'info')}<span>${t('bns.'+bn)}</span>` : '';
  $('bneck').title = bn ? t('ui.limitedBy')+' '+t('bn.'+bn) : '';
  $('monthsLeft').textContent = left; $('monthsLbl').textContent = t(left===1 ? 'hud.month1' : 'hud.months');
  $('pips').innerHTML = Array.from({length:CFG.months}, (_,k)=>`<i class="${k < S.month-1 ? 'past' : (CFG.months-k <= 2 ? 'late' : '')}"></i>`).join('');
  $('st-month').classList.toggle('late', left <= 2);
  $('funds').textContent = money(S.funds);
  $('st-debt').hidden = !(S.debt>0); $('debt').textContent = money(-S.debt);
  // the meters whose rule is in play this settlement
  const show = {'m-local':on('local'), 'm-neigh':on('neigh'), 'm-comp':on('comp'), 'm-spent':on('milestones')};
  Object.entries(show).forEach(([id,v])=>{ $(id).hidden = !v; }); $('meters').hidden = !Object.values(show).some(Boolean);
  const pv = S.prev || snapshot();
  setMeter('m-local', S.local, pv.local); setMeter('m-neigh', S.neigh, pv.neigh, 35, 15); setMeter('m-comp', S.comp, pv.comp, 35, 15);
  const nm = nextMilestone(), pct = S.spent / S.grant * 100, late = nm && S.spent < nm.need && nm.m-S.month<=3;
  setMeter('m-spent', pct, pct, late ? 101 : 0, late ? 101 : 0); $('m-spent').querySelector('b').textContent = Math.round(pct)+'%';
  // perks: always on show, like relics (tap one for what it does)
  const rel = $('relics'), list = S.perks.concat(S.shovel ? ['shovel'] : []), key = list.join(',');
  if(rel.dataset.k !== key){ rel.dataset.k = key;
    rel.innerHTML = list.map((k,j)=>`<button class="relic${j===list.length-1 && list.length ? ' fresh' : ''}" data-k="${k}" aria-label="${t('perk.'+k)}">${ic(PERKS[k])}</button>`).join('');
    rel.querySelectorAll('.relic').forEach(b=>b.onclick = e=>{ e.stopPropagation(); playSound('click'); showRelicPop(b); }); }
  // problems: the badge on the inbox
  const pb = problems().filter(x=>x.sev!=='info'), bad = pb.some(x=>x.sev==='bad');
  $('inboxN').hidden = !pb.length; $('inboxN').textContent = pb.length; $('inboxBtn').classList.toggle('alert', bad);
  // the bottom bar's two ends: the run file (experience) and the month
  const c = career(), lv = levelOf(c.xp), a = levelXp(lv), b = levelXp(lv+1);
  $('runBtn').querySelector('.xpbar i').style.width = clamp((c.xp-a)/(b-a)*100, 0, 100)+'%';
  $('xpTxt').innerHTML = `<b>${t('xp.lvShort', {n:lv})}</b><span> · ${t('rank.'+rankOf(c.xp))}</span>`;
  if(lastXp !== null && c.xp > lastXp && S && !S.over){ xpGain(c.xp - lastXp); }
  lastXp = c.xp;
  const end = $('endTurn'); end.querySelector('.lbl').textContent = t('ui.endMonthShort');
  { const net = monthlyCosts()-taxIncome();   // what the month will cost (−) or bring in (+)
    end.querySelector('small').textContent = (net>0.05 ? '−' : net<-0.05 ? '+' : '')+money(Math.abs(net))+'/'+t('ui.mo'); }
  $('slots').innerHTML = Array.from({length:Math.max(slotsPerMonth(), S.slots)}, (_,k)=>`<i class="${k<S.slots?'on':''}"></i>`).join('');
  $('slots').title = t('ui.slots');
  end.disabled = !!S.over || !!S.pending;
  // the directive, as a pill on the map
  const dp = $('dirPill');
  if(S.directive){ const d = S.directive, dl = d.deadline - S.month + 1;
    dp.hidden = false; dp.classList.toggle('late', dl<=1);
    dp.innerHTML = `${ic(DIRECTIVE_ICON[d.kind])}<span>${t('dir.'+d.kind+'.t')}</span><b>${t('ui.monthsLeft',{n:dl})}</b>`; }
  else dp.hidden = true;
}
export function resetXpWatch(){ lastXp = null; }
// "+5 XP" rising from the run file, and the bar flashes
function xpGain(n){
  const b = $('runBtn'), r = b.getBoundingClientRect(), f = document.createElement('div');
  f.className = 'xp-float'; f.textContent = '+'+n+' XP'; f.style.left = (r.left + r.width/2)+'px'; f.style.top = (r.top + 6)+'px';
  document.body.appendChild(f); setTimeout(()=>f.remove(), 1300);
  b.classList.remove('gain'); void b.offsetWidth; b.classList.add('gain');
}
export function agendaAvailable(){ return on('local') || on('rustic') || on('comp') || on('neigh') || S.debt>0; }
// Tap a meter: what it does, and why it moved
export function showMeterPop(m){
  const pop = $('pop'), el = document.querySelector(`.meter[data-m="${m}"]`);
  if(!pop.classList.contains('hidden') && pop.dataset.m===m){ hidePop(); return; }
  pop.dataset.m = m; el.classList.add('open');
  let html = `<h4>${t(m==='spent'?'meter.spent':'meter.'+m)}</h4><p>${t('meterd.'+m, {cap:money(CFG.debtCap)})}</p>`;
  if(m==='spent'){ const nm = nextMilestone();
    html += nm ? `<p>${t('meterd.spentNext', {m:nm.m, need:money(nm.need), spent:money(S.spent)})}</p>` : ''; }
  else { const tr = S.trail.filter(x=>x.meter===m).slice(0,6);
    html += tr.length ? `<ul>${tr.map(x=>`<li>m${x.m} · ${whyText(x.why)} <span class="d ${x.d>0?'up':'down'}">${x.d>0?'+':''}${Math.round(x.d)}</span></li>`).join('')}</ul>` : `<p>${t('ui.noChanges')}</p>`; }
  placePop(html, el);
}
export function showRelicPop(btn){
  const pop = $('pop'), k = btn.dataset.k;
  if(!pop.classList.contains('hidden') && pop.dataset.m==='perk:'+k){ hidePop(); return; }
  pop.dataset.m = 'perk:'+k;
  placePop(`<h4>${ic(PERKS[k])}${t('perk.'+k)}</h4><p>${t('perkd.'+k)}</p>`, btn);
}
function placePop(html, el){
  const pop = $('pop'); pop.innerHTML = html; pop.classList.remove('hidden');
  const r = el.getBoundingClientRect(); pop.style.top = (r.bottom+6)+'px'; pop.style.left = clamp(r.left, 10, innerWidth-pop.offsetWidth-10)+'px';
}
export function hidePop(){ $('pop').classList.add('hidden'); $('pop').dataset.m = ''; document.querySelectorAll('.meter').forEach(x=>x.classList.remove('open')); }
export function whyText(w){ return w.startsWith('ev:') ? t('ev.'+w.slice(3)+'.t') : t(w); }

export function doAction(res, i){
  playSound(res.sfx || (res.ok ? 'ok' : 'fail'));
  floatAt(i, t(res.msg.k, P(res.msg.p)), res.ok ? (res.cls||'') : 'bad', res.ok ? 'check_circle' : 'block');
  save(); refresh();
}
