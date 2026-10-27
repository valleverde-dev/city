import { toggleMusic } from '../audio/music.js';
import { playSound } from '../audio/sfx.js';
import { endMonth } from '../core/month.js';
import { S } from '../core/state.js';
import { LANG } from '../i18n/index.js';
import { draw, present, startNight } from '../render/anim.js';
import { centreOn, cvs, keepVisible, panBy, resize, selected, setSelected, setViewRot, tileAt, viewRot, worldEl, zoom, zoomAt } from '../render/camera.js';
import { modal, showNext } from './cards.js';
import { $, flushFx } from './dom.js';
import { refresh } from './guide.js';
import { hidePop, setSheet, sheet, showMeterPop } from './hud.js';
import { closeSheet, openSheet } from './sheets.js';
import { cover, coverOpen, frameView, pauseMenu, setLang } from './title.js';

// =====================================================================
//  INPUT — tap to select · drag (one finger / mouse) to move · pinch / wheel / +− to zoom
//  Keyboard: WASD or arrows move, + − zoom, R rotates, C centres, Space ends the month, Esc closes / pauses
// =====================================================================
export const pointers = new Map(); export let pinchD=0, pinchZ=1, pinchMid=null, dragged=false, downAt=null, lastAt=null;
cvs.addEventListener('pointerdown', e=>{
  hidePop(); try{ cvs.setPointerCapture(e.pointerId); }catch(_){}
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
  if(wasSingle && !dragged && downAt){
    const r = cvs.getBoundingClientRect(); const i = tileAt(e.clientX-r.left, e.clientY-r.top);
    if(i<0 || i===selected){ setSelected(-1); if(sheet==='parcel') setSheet(null); }
    else { setSelected(i); setSheet('parcel'); }
    playSound('click'); refresh(); if(selected>=0) keepVisible(selected);
  }
  if(!pointers.size){ downAt=null; }
}
cvs.addEventListener('pointerup', up); cvs.addEventListener('pointercancel', e=>{ pointers.delete(e.pointerId); if(!pointers.size) downAt=null; });
cvs.addEventListener('wheel', e=>{ e.preventDefault(); const r = cvs.getBoundingClientRect();
  if(e.ctrlKey || Math.abs(e.deltaY) >= Math.abs(e.deltaX)*1.5 && !e.shiftKey) zoomAt(zoom*Math.exp(-e.deltaY*0.0015), e.clientX-r.left, e.clientY-r.top);
  else panBy(-e.deltaX, -e.deltaY); }, {passive:false});
// Keyboard: smooth movement while keys are held
export const held = new Set(); export let keyLoop = 0;
export const PAN_KEYS = {w:[0,1], arrowup:[0,1], s:[0,-1], arrowdown:[0,-1], a:[1,0], arrowleft:[1,0], d:[-1,0], arrowright:[-1,0]};
export function keyStep(){ let dx=0, dy=0; held.forEach(k=>{ const v = PAN_KEYS[k]; if(v){ dx+=v[0]; dy+=v[1]; } });
  if(dx||dy){ panBy(dx*12, dy*12); keyLoop = requestAnimationFrame(keyStep); } else keyLoop = 0; }
addEventListener('keydown', e=>{
  if(e.target.closest && e.target.closest('input,textarea')) return;
  const k = e.key.toLowerCase(), modalOpen = !modal.classList.contains('hidden');
  if(coverOpen()){ if((k==='enter' || k===' ') && !(e.target.closest && e.target.closest('button'))){ e.preventDefault(); cover.querySelector('.cv-play').click(); } return; }
  if(k==='escape'){ if(sheet) closeSheet(); else if(!modalOpen && S && !S.over) pauseMenu(); return; }
  if(modalOpen) return;
  if(PAN_KEYS[k]){ e.preventDefault(); held.add(k); if(!keyLoop) keyLoop = requestAnimationFrame(keyStep); return; }
  if(k==='+' || k==='=') zoomAt(zoom*1.25); else if(k==='-' || k==='_') zoomAt(zoom/1.25);
  else if(k==='r'){ setViewRot((viewRot+1)%4); playSound('click'); draw(); }
  else if(k==='c') frameView(), present();
  else if(k===' ' && !e.repeat){ e.preventDefault(); $('endTurn').click(); }
});
addEventListener('keyup', e=>{ held.delete(e.key.toLowerCase()); });
addEventListener('blur', ()=>held.clear());
$('rotateBtn').onclick = ()=>{ setViewRot((viewRot+1)%4); playSound('click'); draw(); };
$('zoomInBtn').onclick = ()=>{ playSound('click'); zoomAt(zoom*1.3); };
$('zoomOutBtn').onclick = ()=>{ playSound('click'); zoomAt(zoom/1.3); };
$('centreBtn').onclick = ()=>{ playSound('click'); if(selected>=0) centreOn(selected); else frameView(); present(); };
$('menuBtn').onclick = ()=>{ playSound('click'); pauseMenu(); };
$('musicBtn').onclick = toggleMusic;
$('langBtn').onclick = ()=> setLang(LANG==='es' ? 'en' : 'es');
$('bellBtn').onclick = ()=>{ playSound('click'); sheet==='problems' ? closeSheet() : openSheet('problems'); };
$('sheetClose').onclick = ()=>{ playSound('click'); closeSheet(); };
$('dirPill').onclick = ()=>{ playSound('click'); openSheet('agenda'); };
document.querySelectorAll('.tab[data-tab]').forEach(b=> b.onclick = ()=>{ playSound('click'); const tb = b.dataset.tab; if(sheet===tb) closeSheet(); else { setSelected(-1); openSheet(tb); } });
$('endTurn').onclick = ()=>{
  if(S.over){ showNext(); return; }
  if(S.cards.length || S.perkChoice){ showNext(); return; }
  playSound('turn'); startNight(); endMonth(); setSelected(-1); if(sheet==='parcel') setSheet(null); refresh(); flushFx(); showNext(); };
document.querySelectorAll('.meter').forEach(el=> el.addEventListener('click', ev=>{ ev.stopPropagation(); playSound('click'); showMeterPop(el.dataset.m); }));
document.addEventListener('pointerdown', e=>{ if(!e.target.closest('#pop') && !e.target.closest('.meter')) hidePop(); });
addEventListener('resize', resize);
if(window.ResizeObserver) new ResizeObserver(resize).observe(worldEl);
