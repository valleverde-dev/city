import { playSound } from '../audio/sfx.js';
import { CFG, on } from '../core/config.js';
import { DIRECTIVE_ICON } from '../core/directives.js';
import { monthlyCosts, nextMilestone, residents, taxIncome } from '../core/economy.js';
import { money } from '../core/format.js';
import { snapshot } from '../core/newgame.js';
import { save } from '../core/persist.js';
import { slotsPerMonth } from '../core/rules.js';
import { S, clamp } from '../core/state.js';
import { LANG, t } from '../i18n/index.js';
import { $, P, floatAt } from './dom.js';
import { refresh } from './guide.js';
import { ic } from './icons.js';
import { problems } from './problems.js';

// --- Static texts (re-applied when the language changes) ---
export const ROMAN = ['I','II','III','IV','V','VI'];
export function roman(n){ const T = [[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];
  let out = ''; for(const [v,s] of T) while(n >= v){ out += s; n -= v; } return out; }
export let sheet = null;          // which sheet is open: null | 'parcel' | 'agenda' | 'city' | 'inbox' | 'problems' | 'combos'
export function setSheet(name){ sheet = name; }
export function applyStatic(){
  document.documentElement.lang = LANG;
  $('langBtn').textContent = LANG==='es' ? 'EN' : 'ES';
  $('langBtn').setAttribute('aria-label', t('ui.lang'));
  $('bellBtn').setAttribute('aria-label', t('ui.problems'));
  $('hint').textContent = t('ui.hintPan');
  [['m-local','meter.local'],['m-neigh','meter.neigh'],['m-comp','meter.comp']].forEach(([id,k])=>$(id).querySelector('.lbl').textContent = t(k));
  $('st-month').title = t('ui.month'); $('st-funds').title = t('ui.funds'); $('st-res').title = t('ui.residents'); $('st-slots').title = t('ui.slots'); $('st-debt').title = t('ui.debt');
  document.querySelectorAll('.tab[data-tab]').forEach(b=>{ b.querySelector('span').textContent = t('tab.'+b.dataset.tab); });
  $('centreBtn').title = t('ui.centre'); $('rotateBtn').title = t('ui.rotate');
}
export function setMeter(id, v, prev, warnBelow=40, badBelow=25){
  const el = $(id); el.querySelector('b').textContent = Math.round(v);
  const i = el.querySelector('.bar i'); i.style.width = clamp(v,0,100)+'%';
  i.className = v < badBelow ? 'low' : (v < warnBelow ? 'mid' : '');
  const d = Math.round(v - prev), de = el.querySelector('.delta');
  de.textContent = d ? (d>0?'▲':'▼')+Math.abs(d) : ''; de.className = 'delta '+(d>0?'up':'down');
  el.classList.toggle('alarm', d <= -8);
}
export function updateHUD(){
  $('townName').textContent = `${t('ui.settlement')} ${roman((S.stage||0)+1)} · ${S.town}`;
  $('month').textContent = Math.min(S.month, CFG.months); $('months').textContent = CFG.months;
  $('funds').textContent = money(S.funds); $('residents').textContent = residents(); $('target').textContent = CFG.target;
  $('st-debt').hidden = !(S.debt>0); $('debt').textContent = money(-S.debt);
  const sl = $('slots'); sl.innerHTML = '';
  for(let k=0;k<Math.max(slotsPerMonth(), S.slots);k++){ const d=document.createElement('span'); d.className='slot'+(k<S.slots?' on':''); sl.appendChild(d); }
  // Only the meters whose rule is in play this level
  const show = {'m-local':on('local'), 'm-neigh':on('neigh'), 'm-comp':on('comp'), 'm-spent':on('milestones')};
  Object.entries(show).forEach(([id,v])=>{ $(id).hidden = !v; }); $('meters').hidden = !Object.values(show).some(Boolean);
  const pv = S.prev || snapshot();
  setMeter('m-local', S.local, pv.local); setMeter('m-neigh', S.neigh, pv.neigh, 35, 15); setMeter('m-comp', S.comp, pv.comp, 35, 15);
  const nm = nextMilestone(), sp = $('m-spent'), pct = S.spent / S.grant * 100;
  sp.querySelector('.lbl').textContent = nm ? t('meter.spentBy', {p:Math.round(CFG.milestones[nm.m]*100), m:nm.m}) : t('meter.spent');
  sp.querySelector('b').textContent = Math.round(pct)+'%';
  const bar = sp.querySelector('.bar i'); bar.style.width = clamp(pct,0,100)+'%';
  bar.className = nm && S.spent < nm.need && nm.m-S.month<=3 ? 'low' : '';
  // Bell: number of things that need attention
  const pb = problems().filter(x=>x.sev!=='info'), bad = pb.some(x=>x.sev==='bad');
  $('bellN').hidden = !pb.length; $('bellN').textContent = pb.length; $('bellBtn').classList.toggle('alert', bad);
  // Bottom bar
  const end = $('endTurn'); end.querySelector('.lbl').textContent = t(innerWidth < 600 ? 'ui.endMonthTiny' : 'ui.endMonthShort');
  { const net = monthlyCosts()-taxIncome();   // what the month will cost (−) or bring in (+)
    end.querySelector('small').textContent = t('ui.endMonthSub', {m:Math.min(S.month, CFG.months), n:CFG.months, c:(net>0.05 ? '−' : net<-0.05 ? '+' : '')+money(Math.abs(net))}); }
  end.disabled = !!S.over || !!S.pending;
  document.querySelectorAll('.tab[data-tab]').forEach(b=>{ const tab = b.dataset.tab;
    b.hidden = (tab==='agenda' && !agendaAvailable()) || (tab==='combos' && !on('combos'));
    b.classList.toggle('on', sheet===tab); });
  const unread = (S.logN||0) - (S.logSeen||0); $('inboxN').hidden = unread<=0; $('inboxN').textContent = unread>9 ? '9+' : unread;
  // Directive pill on the map
  const dp = $('dirPill');
  if(S.directive){ const d = S.directive, left = d.deadline - S.month + 1;
    dp.hidden = false; dp.classList.toggle('late', left<=1);
    dp.innerHTML = `${ic(DIRECTIVE_ICON[d.kind])}<span>${t('dir.'+d.kind+'.t')}</span><b>${t('ui.monthsLeft',{n:left})}</b>`; }
  else dp.hidden = true;
}
export function agendaAvailable(){ return on('local') || on('rustic') || on('comp') || on('neigh') || S.debt>0; }
// Tap a meter: what it does, and why it moved
export function showMeterPop(m){
  const pop = $('pop'), el = document.querySelector(`.meter[data-m="${m}"]`);
  document.querySelectorAll('.meter').forEach(x=>x.classList.toggle('open', x===el && pop.classList.contains('hidden') || x===el && pop.dataset.m!==m));
  if(!pop.classList.contains('hidden') && pop.dataset.m===m){ hidePop(); return; }
  pop.dataset.m = m;
  let html = `<h4>${t(m==='spent'?'meter.spent':'meter.'+m)}</h4><p>${t('meterd.'+m, {cap:money(CFG.debtCap)})}</p>`;
  if(m==='spent'){ const nm = nextMilestone();
    html += nm ? `<p>${t('meterd.spentNext', {m:nm.m, need:money(nm.need), spent:money(S.spent)})}</p>` : ''; }
  else { const tr = S.trail.filter(x=>x.meter===m).slice(0,7);
    html += tr.length ? `<b>${t('ui.recent')}</b><ul>${tr.map(x=>`<li>m${x.m} · ${whyText(x.why)} <span class="d ${x.d>0?'up':'down'}">${x.d>0?'+':''}${Math.round(x.d)}</span></li>`).join('')}</ul>` : `<p>${t('ui.noChanges')}</p>`; }
  pop.innerHTML = html; pop.classList.remove('hidden');
  const r = el.getBoundingClientRect(); pop.style.top = (r.bottom+6)+'px'; pop.style.left = clamp(r.left, 10, innerWidth-pop.offsetWidth-10)+'px';
}
export function hidePop(){ $('pop').classList.add('hidden'); document.querySelectorAll('.meter').forEach(x=>x.classList.remove('open')); }
export function whyText(w){ return w.startsWith('ev:') ? t('ev.'+w.slice(3)+'.t') : t(w); }

export function actBtn(icon, label, sub, fn, disabled, cls){
  const b = document.createElement('button'); b.className = 'act'+(cls?' '+cls:''); b.disabled = !!disabled;
  b.innerHTML = `${ic(icon)}<span>${label}<small>${sub||''}</small></span>`;
  b.onclick = fn; return b;
}
export function doAction(res, i){
  playSound(res.sfx || (res.ok ? 'ok' : 'fail'));
  floatAt(i, t(res.msg.k, P(res.msg.p)), res.ok ? (res.cls||'') : 'bad', res.ok ? 'check_circle' : 'block');
  save(); refresh();
}
