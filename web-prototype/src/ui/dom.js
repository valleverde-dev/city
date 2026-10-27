import { COMBO_BY_ID } from '../core/combos.js';
import { CHARS } from '../core/config.js';
import { S, rc } from '../core/state.js';
import { t } from '../i18n/index.js';
import { isoOf, toScreen, worldEl } from '../render/camera.js';
import { ic } from './icons.js';

// =====================================================================
//  UI
// =====================================================================
export const $ = id => document.getElementById(id);
// Translate the parameters stored in logs/cards (building ids, directive kinds…) at render time,
// so switching language re-renders everything already on screen.
export function P(p){ const o = {...(p||{})};
  if(p && p.b) o.b = t('b.'+p.b);
  if(p && typeof p.r==='number') o.r = t('rej.'+p.r);
  if(p && p.d) o.d = t('dir.'+p.d+'.t');
  if(p && p.k) o.k = t('perk.'+p.k);
  if(p && p.e){ o.e = t('ev.'+p.e+'.t'); if(p.c) o.c = t('ev.'+p.e+'.c.'+p.c); }
  else if(p && p.c && COMBO_BY_ID[p.c]) o.c = t('combo.'+p.c);
  return o; }
export function country(){ return t('country.'+S.country); }

export function portrait(id, size=64){
  const L = CHARS[id].look, hair = L.hair;
  const hairSvg = {
    side:  `<path d="M18 28 Q19 13 33 14 Q46 14 46 27 Q40 19 30 20 Q22 21 18 28Z" fill="${hair}"/>`,
    bun:   `<circle cx="32" cy="12" r="6" fill="${hair}"/><path d="M18 30 Q17 15 32 15 Q47 15 46 30 Q44 20 32 20 Q21 20 18 30Z" fill="${hair}"/>`,
    long:  `<path d="M16 44 Q14 14 32 14 Q50 14 48 44 L44 44 Q46 24 32 21 Q19 24 20 44Z" fill="${hair}"/>`,
    short: `<path d="M18 26 Q18 13 32 13 Q46 13 46 26 Q44 19 32 18 Q21 19 18 26Z" fill="${hair}"/>`,
    slick: `<path d="M17 27 Q17 12 34 13 Q47 15 46 25 Q38 17 17 27Z" fill="${hair}"/>`,
    bald:  `<path d="M18 30 Q17 24 20 22 L20 32Z M46 30 Q47 24 44 22 L44 32Z" fill="${hair}"/>`,
    cap:   `<path d="M17 23 Q18 11 32 11 Q46 11 47 23Z" fill="#3e6b2a"/><path d="M40 22 L54 24 L47 25Z" fill="#2f5420"/>`,
  }[L.style] || '';
  const mouth = {smile:'M27 37 Q32 41 37 37', grin:'M26 36 Q32 42 38 36 Z', frown:'M27 39 Q32 35 37 39', flat:'M28 38 L36 38'}[L.mouth];
  const acc = {
    glasses: `<g stroke="#222" stroke-width="1.3" fill="rgba(255,255,255,.25)"><circle cx="27" cy="29" r="4"/><circle cx="37" cy="29" r="4"/><path d="M31 29h2" fill="none"/></g>`,
    monocle: `<circle cx="37" cy="29" r="4.2" fill="rgba(255,255,255,.25)" stroke="#c9a227" stroke-width="1.4"/><path d="M41 31 Q44 40 40 48" stroke="#c9a227" fill="none"/>`,
    hardhat: `<path d="M17 24 Q18 10 32 10 Q46 10 47 24Z" fill="#f2c230"/><rect x="14" y="22" width="36" height="4" rx="2" fill="#e0a800"/>`,
    tie:     `<path d="M32 50 l-3 4 3 10 3-10z" fill="#c0392b"/>`,
    sash:    `<path d="M16 54 L48 64" stroke="#ffcc33" stroke-width="5"/>`,
    gold:    `<path d="M24 52 Q32 58 40 52" stroke="#e6c34a" stroke-width="2" fill="none"/>`,
    none: '',
  }[L.acc];
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
    <rect width="64" height="64" fill="#dfe7f5"/><path d="M8 64 Q32 40 56 64Z" fill="${L.coat}"/>
    <path d="M27 45 h10 v6 h-10z" fill="${L.skin}"/>
    ${L.acc==='tie'||L.acc==='sash'||L.acc==='gold' ? acc : ''}
    <ellipse cx="32" cy="30" rx="14" ry="15" fill="${L.skin}"/>
    <ellipse cx="18" cy="31" rx="2.5" ry="3.5" fill="${L.skin}"/><ellipse cx="46" cy="31" rx="2.5" ry="3.5" fill="${L.skin}"/>
    ${hairSvg}
    <circle cx="27" cy="29" r="1.7" fill="#222"/><circle cx="37" cy="29" r="1.7" fill="#222"/>
    <path d="M24 24 l5 -1 M35 23 l5 1" stroke="#3a2a1e" stroke-width="1.4"/>
    ${L.mustache ? '<path d="M25 35 Q32 31 39 35 Q32 34 25 35Z" fill="#4a3424"/>' : ''}
    <path d="${mouth}" stroke="#7a3b2e" stroke-width="1.6" fill="${L.mouth==='grin'?'#fff':'none'}" stroke-linecap="round"/>
    ${L.acc==='glasses'||L.acc==='monocle'||L.acc==='hardhat' ? acc : ''}
  </svg>`;
}

export function screenOfParcel(i){ const [ix,iy] = isoOf(...rc(i)), [sx,sy] = toScreen(ix,iy), r = worldEl.getBoundingClientRect(); return [r.left+sx, r.top+sy-10]; }
export function floatAt(i, text, cls, icon, delay=0){
  setTimeout(()=>{
    let x = innerWidth/2, y = 120; if(i>=0) [x,y] = screenOfParcel(i);
    const f = document.createElement('div'); f.className = 'float-txt '+(cls||'');
    f.innerHTML = (icon?`${ic(icon)}`:'')+`<span>${text}</span>`;
    f.style.left = x+'px'; f.style.top = y+'px'; document.body.appendChild(f); setTimeout(()=>f.remove(), 1400);
  }, delay);
}
export function flushFx(){ (S.fx||[]).forEach((f,j)=>floatAt(f.i, t(f.k, P(f.p)), f.cls, f.cls==='bad'?'error':'check_circle', j*140)); S.fx = []; }
