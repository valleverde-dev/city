import { playSound } from '../audio/sfx.js';
import { activeCombos } from '../core/combos.js';
import { CFG } from '../core/config.js';
import { save } from '../core/persist.js';
import { count, hasAccess } from '../core/rules.js';
import { S, rc } from '../core/state.js';
import { worldIndex } from '../core/region.js';
import { t } from '../i18n/index.js';
import { draw } from '../render/anim.js';
import { hsh } from '../render/pixel.js';
import { archOf } from '../render/sprites.js';
import { pxPortrait } from './cards.js';
import { flushToasts } from './drama.js';
import { $ } from './dom.js';
import { applyStatic, updateHUD } from './hud.js';
import { ic } from './icons.js';
import { clearSelection, eventOpen, renderDock } from './dock.js';
import { renderInbox } from './inbox.js';
import { renderRun } from './run.js';

// --- The mayor's guide: a few steps per level, the current one shown on the map ---
export const GUIDES = [
  [ {k:'g1.buy',     done:()=>S.grid.some(p=>p.k==='farm' && p.st!=='land'), at:()=>S.grid.findIndex(p=>p.k==='farm' && p.st==='land')},
    {k:'g1.permit',  done:()=>S.grid.some(p=>p.ty==='housing'), at:()=>S.grid.findIndex(p=>p.st==='owned')},
    {k:'g1.end',     done:()=>S.month>=2, end:true},
    {k:'g1.wait',    done:()=>count('housing')>=1, end:true},
    {k:'g1.grow',    done:()=>false, end:true} ],
  [ {k:'g2.access',  done:()=>S.grid.some(p=>p.k==='farm' && p.st!=='land'), at:()=>S.grid.findIndex((p,i)=>p.k==='farm' && p.st==='land' && hasAccess(...rc(i)))},
    {k:'g2.jobs',    done:()=>S.grid.some(p=>p.ty==='factory'), at:()=>S.grid.findIndex(p=>p.st==='owned')},
    {k:'g2.combo',   done:()=>activeCombos().length>0},
    {k:'g2.mayor',   done:()=>S.stats.lobby>0, tab:'agenda'} ],
  [ {k:'g3.rustic',  done:()=>S.stats.plan>0, tab:'agenda'},
    {k:'g3.report',  done:()=>S.reports>0, tab:'agenda'},
    {k:'g3.services',done:()=>S.grid.some(p=>p.ty==='school' || p.ty==='clinic')},
    {k:'g3.cards',   done:()=>S.month>=6} ],
  [ {k:'g4.sell',    done:()=>S.grid.some(p=>p.st==='private' || p.priv)},
    {k:'g4.spend',   done:()=>S.month>=8} ],
];
export let guideAt = -1;
export function guideStep(){ const g = GUIDES[S.stage||0] || []; const k = g.findIndex(s=>!s.done()); return k<0 ? null : {s:g[k], n:k+1, total:g.length}; }
export function renderGuide(){
  const el = $('guide'), cur = (S.guideOff || S.over || S.pending || eventOpen()) ? null : guideStep();
  guideAt = -1; $('endTurn').classList.remove('nudge');
  if(!cur){ el.hidden = true; el.dataset.k = ''; $('hint').hidden = false; return; }
  $('hint').hidden = true; el.hidden = false;
  if(cur.s.at){ const i = cur.s.at(); if(i>=0) guideAt = i; }
  if(cur.s.end && !S.cards.length) $('endTurn').classList.add('nudge');
  // v0.9: rebuilt only when the step (or the language) changes, so it does not jump in again on every tap
  const who = S.level>=2 ? 'brussels' : 'mayor', key = cur.s.k+':'+cur.n+':'+document.documentElement.lang;
  if(el.dataset.k === key) return;
  el.dataset.k = key; el.classList.remove('in'); void el.offsetWidth; el.classList.add('in');
  el.innerHTML = `${pxPortrait(who)}<div><div class="step">${t('ui.step',{n:cur.n, t:cur.total})}</div><p>${t(cur.s.k, {n:CFG.target, m:CFG.months})}</p></div>
    <button class="x" aria-label="${t('ui.close')}">${ic('close')}</button>`;
  el.querySelector('.x').onclick = e=>{ e.stopPropagation(); S.guideOff = true; save(); playSound('click'); refresh(); };
  el.onclick = cur.s.tab ? e=>{ if(!e.target.closest('.x')){ clearSelection(); refresh(); } } : null;   // 'agenda' steps: the bar shows the agenda
}
// Every building gets a style (its archetype) and a name, both fixed by the run's seed
export function styleName(i){ const ty = S.grid[i].ty, A = archOf(i, ty), names = t('names.'+ty).split('|');
  return `${t('style.'+ty+'.'+A.id)} · «${names[Math.floor(hsh(worldIndex(i), S.runSeed & 0xffff, 404)*names.length)]}»`; }
export function refresh(){ applyStatic(); updateHUD(); renderDock(); renderGuide(); renderInbox(); renderRun(); draw(); flushToasts(); }
export let pulseUntil = 0;
export function pulse(i){ S.focus = i; pulseUntil = performance.now()+2600; draw(); }
