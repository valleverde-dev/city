// =====================================================================
//  CASCADE (v0.10) — the elements of a screen come in one after another: a fade with a slight rise.
//  v0.10.1: each element takes 1 s, 150 ms after the previous one; long grids speed up after the eighth so a whole
//  screen is ready in about 3 s. No rotation, no bounce. Menus (pause, settings) never cascade.
//  A tap or a key shows everything at once — it never makes you wait. With reduced motion: no animation.
//  cascade(root) picks the elements itself: lists and grids give their children, the rest their blocks.
// =====================================================================
const LISTS = 'ul, ol, .perkgrid, .ladder, .rclist, .cgrid, .pause-row, .btns, .chips, .medals, .rules, .col-a, .col-b, .slide, .ach-body, .band-row, .sheet';
const STEP = 150, FAST = 8, DUR = 1000;
let active = null;
export function reducedMotion(){
  return document.body.classList.contains('reduce-motion') || !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
}
function items(root){
  const out = [];
  const walk = el => { for(const c of el.children){
    if(c.hidden || c.tagName === 'SCRIPT' || c.classList.contains('stamp') || c.classList.contains('dots')) continue;
    if(c.matches(LISTS) && c.children.length) walk(c); else out.push(c); } };
  walk(root);
  return out;
}
// Show everything now (a tap, a key, or the next screen)
export function finishCascade(){
  if(!active) return;
  const {root, list, timer} = active; active = null; clearTimeout(timer);
  list.forEach(e=>e.classList.remove('cs'));   // everything visible at once
  removeEventListener('keydown', finishCascade, true); root.removeEventListener('pointerdown', finishCascade, true);
}
export function cascade(root){
  finishCascade();
  if(!root) return;
  root.querySelectorAll('.cs').forEach(e=>{ e.classList.remove('cs'); e.style.removeProperty('--cs'); });
  if(reducedMotion()) return;
  const list = items(root), n = list.length; if(!n) return;
  const late = n > FAST ? Math.min(60, 900/(n-FAST)) : 0;
  let last = 0;
  list.forEach((e,i)=>{ const d = i < FAST ? i*STEP : FAST*STEP + (i-FAST)*late; last = d; e.style.setProperty('--cs', Math.round(d)+'ms'); e.classList.add('cs'); });
  active = {root, list, timer: setTimeout(finishCascade, last + DUR + 80)};
  addEventListener('keydown', finishCascade, true); root.addEventListener('pointerdown', finishCascade, true);
}
