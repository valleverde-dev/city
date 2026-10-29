import { playSound } from '../audio/sfx.js';
import { endMonth } from '../core/month.js';
import { S } from '../core/state.js';
import { draw, present, startNight } from '../render/anim.js';
import { FRX, FRY, centreOn, cvs, keepVisible, panBy, resize, selected, setSelected, setViewRot, tileAt, tileAtW, viewRot, worldEl, zoom, zoomAt } from '../render/camera.js';
import { modal, showNext } from './cards.js';
import { $, flushFx } from './dom.js';
import { armed, clearSelection, deselect, eventOpen, selectPlot, setArmed } from './dock.js';
import { refresh } from './guide.js';
import { hidePop, runTab, showMeterPop } from './hud.js';
import { inboxOpen, showNews, toggleInbox } from './inbox.js';
import { closeRun, openRun } from './run.js';
import { coverKey, coverOpen, frameView, pauseMenu } from './title.js';

// =====================================================================
//  INPUT — tap to select · drag (one finger / mouse) to move · pinch / wheel / +− to zoom
//  Keyboard: WASD or arrows move, + − zoom, R rotates, C centres, Space ends the month, E opens the run file, Esc closes / pauses
// =====================================================================
export const pointers = new Map(); export let pinchD=0, pinchZ=1, pinchMid=null, dragged=false, downAt=null, lastAt=null;
cvs.addEventListener('pointerdown', e=>{
  hidePop(); if(inboxOpen) toggleInbox(false); try{ cvs.setPointerCapture(e.pointerId); }catch(_){}
  pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  if(pointers.size===1){ downAt={x:e.clientX,y:e.clientY}; lastAt={...downAt}; dragged=false; }
  if(pointers.size===2){ const p=[...pointers.values()]; pinchD=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)||1; pinchZ=zoom; dragged=true;
    pinchMid={x:(p[0].x+p[1].x)/2, y:(p[0].y+p[1].y)/2}; }
});
cvs.addEventListener('pointermove', e=>{
  if(!pointers.has(e.pointerId)) return; pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const r = cvs.getBoundingClientRect();
  if(pointers.size===2){ const p=[...pointers.values()], d=Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y)||1, mid={x:(p[0].x+p[1].x)/2, y:(p[0].y+p[1].y)/2};
    panBy(mid.x-pinchMid.x, mid.y-pinchMid.y); pinchMid = mid; zoomAt(pinchZ*d/pinchD, mid.x-r.left, mid.y-r.top); return; }
  if(pointers.size===1 && downAt){
    if(!dragged && Math.hypot(e.clientX-downAt.x, e.clientY-downAt.y) > 9){ dragged = true; $('hint').classList.add('used'); }
    if(dragged){ panBy(e.clientX-lastAt.x, e.clientY-lastAt.y); }
    lastAt = {x:e.clientX, y:e.clientY}; }
});
export function up(e){
  const wasSingle = pointers.size===1; pointers.delete(e.pointerId);
  if(wasSingle && !dragged && downAt && S && S.pending==='attach'){
    // choosing the next plot: tap one of the numbered plots
    const r = cvs.getBoundingClientRect(), w = tileAtW(e.clientX-r.left, e.clientY-r.top);
    const y = w ? w[0]+FRY : 0, x = w ? w[1]+FRX : 0;   // frame → map coordinates
    const k = w ? S.region.cands.findIndex(P=>y>=P.y && y<P.y+P.n && x>=P.x && x<P.x+P.n) : -1;
    if(k >= 0) selectPlot(k);
  }
  else if(wasSingle && !dragged && downAt && !eventOpen()){
    const r = cvs.getBoundingClientRect(); const i = tileAt(e.clientX-r.left, e.clientY-r.top);
    if(i<0 || i===selected) clearSelection();
    else { setSelected(i); setArmed(null); }
    playSound('click'); refresh(); if(selected>=0) keepVisible(selected);
  }
  if(!pointers.size){ downAt=null; }
}
cvs.addEventListener('pointerup', up); cvs.addEventListener('pointercancel', e=>{ pointers.delete(e.pointerId); if(!pointers.size) downAt=null; });
cvs.addEventListener('wheel', e=>{ e.preventDefault(); const r = cvs.getBoundingClientRect();
  if(e.ctrlKey || Math.abs(e.deltaY) >= Math.abs(e.deltaX)*1.5 && !e.shiftKey) zoomAt(zoom*Math.exp(-e.deltaY*0.0015), e.clientX-r.left, e.clientY-r.top);
  else panBy(-e.deltaX, -e.deltaY); }, {passive:false});
// The strip scrolls sideways with the wheel too (a mouse has no horizontal wheel)
$('strip').addEventListener('wheel', e=>{ if(Math.abs(e.deltaY) > Math.abs(e.deltaX)){ e.preventDefault(); $('strip').scrollLeft += e.deltaY; } }, {passive:false});
// Keyboard: smooth movement while keys are held
export const held = new Set(); export let keyLoop = 0;
export const PAN_KEYS = {w:[0,1], arrowup:[0,1], s:[0,-1], arrowdown:[0,-1], a:[1,0], arrowleft:[1,0], d:[-1,0], arrowright:[-1,0]};
export function keyStep(){ let dx=0, dy=0; held.forEach(k=>{ const v = PAN_KEYS[k]; if(v){ dx+=v[0]; dy+=v[1]; } });
  if(dx||dy){ panBy(dx*12, dy*12); keyLoop = requestAnimationFrame(keyStep); } else keyLoop = 0; }
addEventListener('keydown', e=>{
  if(e.target.closest && e.target.closest('input,textarea')) return;
  const k = e.key.toLowerCase(), modalOpen = !modal.classList.contains('hidden');
  if(coverOpen()){ coverKey(e, k); return; }
  if(k==='escape'){ if(runTab) closeRun(); else if(inboxOpen) toggleInbox(false); else if(modalOpen) return; else if(!deselect() && S && !S.over) pauseMenu(); return; }
  if(modalOpen) return;
  if(k==='e' && S){ if(runTab) closeRun(); else openRun(); return; }
  if(runTab) return;
  if(PAN_KEYS[k]){ e.preventDefault(); held.add(k); if(!keyLoop) keyLoop = requestAnimationFrame(keyStep); return; }
  if(k==='+' || k==='=') zoomAt(zoom*1.25); else if(k==='-' || k==='_') zoomAt(zoom/1.25);
  else if(k==='r'){ setViewRot((viewRot+1)%4); playSound('click'); draw(); }
  else if(k==='c') frameView(), present();
  else if(k===' ' && !e.repeat){ e.preventDefault(); $('endTurn').click(); }
  else if(k==='enter' && armed){ e.preventDefault(); const b = document.querySelector('#confirm .ok'); if(b) b.click(); }
});
addEventListener('keyup', e=>{ held.delete(e.key.toLowerCase()); });
addEventListener('blur', ()=>held.clear());
$('rotateBtn').onclick = ()=>{ setViewRot((viewRot+1)%4); playSound('click'); draw(); };
$('zoomInBtn').onclick = ()=>{ playSound('click'); zoomAt(zoom*1.3); };
$('zoomOutBtn').onclick = ()=>{ playSound('click'); zoomAt(zoom/1.3); };
$('centreBtn').onclick = ()=>{ playSound('click'); if(selected>=0) centreOn(selected); else frameView(); present(); };
$('menuBtn').onclick = ()=>{ playSound('click'); pauseMenu(); };
$('inboxBtn').onclick = e=>{ e.stopPropagation(); playSound('click'); toggleInbox(); };
$('runBtn').onclick = ()=>{ runTab ? closeRun() : openRun(); };
$('dirPill').onclick = ()=>{ playSound('click'); clearSelection(); refresh(); };   // the bar shows the agenda and the directive
$('endTurn').onclick = ()=>{
  if(S.over){ showNext(); return; }
  if(S.cards.length || S.perkChoice){ showNext(); return; }
  const n0 = S.logN || 0;
  playSound('turn'); startNight(); endMonth(); clearSelection(); refresh(); flushFx(); showNews(n0); showNext(); };
document.querySelectorAll('.meter').forEach(el=> el.addEventListener('click', ev=>{ ev.stopPropagation(); playSound('click'); showMeterPop(el.dataset.m); }));
document.addEventListener('pointerdown', e=>{ if(!e.target.closest('#pop') && !e.target.closest('.meter') && !e.target.closest('.relic')) hidePop();
  if(inboxOpen && !e.target.closest('#inbox') && !e.target.closest('#inboxBtn')) toggleInbox(false); });
addEventListener('resize', resize);
if(window.ResizeObserver) new ResizeObserver(resize).observe(worldEl);
