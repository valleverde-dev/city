// =====================================================================
//  THE TITLE SCREEN CROWD — the little people of the event illustrations (15 px, the cast included) cheering on the hills
//  and in the band below the town, a few of them waving flags of Europe, and six bureaucrats dancing like nobody is
//  auditing, twice the size, beside the town. Painted in sky pixels (4 css px each) by the title screen's frame.
// =====================================================================
import { hsh } from './pixel.js';
import { CAST, paintPerson } from './evart.js';

const SHIRTS = ['#c62f28','#2a63c9','#1d8148','#e6b400','#8a5cc4','#e8762b','#f2f2ee','#3a3d44'];
const SKINS = ['#f1c9a5','#d9a27a','#a8714a','#7a4e2d','#f6d7bd'], HAIR = ['#2b2017','#5a3b22','#c9a26b','#7a7a7a','#1b1b1b'];
const CHEER = ['up','both','wave',null,'both','up'];
const CASTK = ['mayor','neighbour','farmer','heritage','union','banker','developer','worker','brussels'];
const pick = (a, s) => a[Math.floor(hsh(s, 7, 3)*a.length)];
const r01 = (s, k) => hsh(s, k, k);
function local(s){ return {shirt:pick(SHIRTS, s), skin:pick(SKINS, s+1), hair:pick(HAIR, s+2), pants: r01(s,1) < 0.5 ? '#2f3542' : '#3a4b6b',
  long: r01(s,2) < 0.3, skirt: r01(s,3) < 0.12 ? pick(SHIRTS, s+4) : null, cap: r01(s,4) < 0.08 ? pick(SHIRTS, s+5) : null, glasses: r01(s,5) < 0.12 ? '#3a3d44' : null}; }

// A little flag of Europe on a stick: the cloth waves and the ring of twelve gold stars rides on it
export function handFlag(g, hx, hy, T, ph, w, h){
  const R = (a, b, ww, hh, col) => { g.fillStyle = col; g.fillRect(Math.round(a), Math.round(b), ww, hh); }, L = h + 3, top = hy - L;
  R(hx, top, 1, L+1, '#d9dce2'); R(hx, top-1, 1, 1, '#f2c230');
  const wave = i => { const p = i*0.6 - T*7 + ph; return [Math.round(Math.sin(p)*(i/Math.max(1, w-1))*1.2), Math.cos(p)]; };
  for(let i=0;i<w;i++){ const [yo, sl] = wave(i); R(hx+1+i, top+yo, 1, h, sl > 0.55 ? '#1a4bb0' : sl < -0.55 ? '#002a80' : '#003399'); }
  const [yc, sc] = wave(Math.floor(w/2)), gold = sc < -0.55 ? '#d9a800' : '#ffcc00', cx = hx + 1 + (w-1)/2, cy = top + (h-1)/2 + yc, seen = new Set();
  for(let k=0;k<12;k++){ const a = k*Math.PI/6, px = Math.round(cx + w*0.26*Math.cos(a)), py = Math.round(cy + h*0.32*Math.sin(a)), key = px+','+py;
    if(!seen.has(key)){ seen.add(key); R(px, py, 1, 1, gold); } }
}

// Who stands where: built once per layout (screen size), from the hills' outline and the band under them
let PLAN = null;
function plan(w, h, near, far, dio, foot){
  const key = [w, h, dio.x0, dio.x1, foot].join(','); if(PLAN && PLAN.key === key) return PLAN;
  const hill = [], band = [];
  for(let row=0; row<2; row++) for(let x = 1 + row*3; x < w-2; x += 6){ const s = row*400 + x;
    hill.push({x: x + Math.round(r01(s,9)*2), y: Math.floor((row ? near : far)(x)) + (row ? 3 : 5), o:{...local(s), bob: 5 + r01(s,8)*3},
      arm: CHEER[Math.floor(r01(s,6)*6)], sp: r01(s,10), flag: r01(s,13) < 0.07}); }
  // the band from the near hills down to the footer: rows every 9 px, the cast now and then, a flag here and there
  let top = 0; for(let x=0;x<w;x++) top = Math.max(top, Math.floor(near(x)));
  for(let y = top + 16, row = 0; y <= foot + 14; y += 9, row++) for(let x = -2 + (row%2)*3; x < w; x += 7){ const s = 1000 + row*500 + x;
    const o = r01(s,11) < 0.12 ? {...CAST[CASTK[Math.floor(r01(s,12)*CASTK.length)]]} : local(s);
    band.push({row, x: x + Math.round(r01(s,14)*2), y: y + Math.round(r01(s,15)*2), o:{...o, bob: 5 + r01(s,8)*3},
      arm: CHEER[Math.floor(r01(s,16)*6)], sp: r01(s,17), flag: row >= 1 && r01(s,18) < 0.03}); }
  // the dancers: three on each side of the town, feet just above the footer
  const dancers = [], left = Math.max(0, dio.x0 - 4), right = Math.min(w, dio.x1 + 4);
  const SUITS = [{k:'suit', case:true}, {k:'brussels'}, {k:'banker'}, {k:'suit', hair:'#c9a26b', skin:'#a8714a', tie:'#c62f28'}, {k:'brussels', hair:'#5a3b22', glasses:'#3a3d44'}, {k:'suit', hair:'#7a7a7a', bald:true, case:true}];
  if(left >= 40 && w - right >= 40) for(let i=0;i<6;i++){ const side = i < 3, span = side ? left : w - right, x0 = side ? 0 : right;
    dancers.push({...SUITS[i], x: Math.round(x0 + span*((i%3) + 0.5)/3) - 8}); }
  PLAN = {key, hill, band, dancers, foot}; return PLAN;
}

const MOVES = [['disco','discoL','disco','discoL'], ['both','side','both','side'], ['shrug','up','shrug','wave'], ['side','up','side','both'], ['discoL','disco','both','shrug'], ['wave','up','wave','both']];
const armAt = (p, T) => !p.arm ? (Math.floor(T*2 + p.sp*4) % 3 === 0 ? 'up' : null) : (Math.floor(T*(1.5 + p.sp) + p.sp*5) % 4 === 3 ? (p.arm === 'both' ? 'up' : 'both') : p.arm);
function cheer(g, p, T, fw, fh){ const hd = paintPerson(g, p.x, p.y, {...p.o, arm: p.flag ? 'up' : armAt(p, T)}, T); if(p.flag) handFlag(g, hd.hx, hd.hy, T, p.x*0.3, fw, fh); }
let DANCE = null;
const BPM = 130;   // the menu theme's tempo
export function paintCrowd(g, w, h, T, {near, far, dio, foot}){
  const P = plan(w, h, near, far, dio, foot);
  P.hill.forEach(p => cheer(g, p, T, 9, 6));
  let last = -1; P.band.forEach(p => { if(p.row !== last && p.row >= 2){ g.fillStyle = 'rgba(6,18,50,.18)'; g.fillRect(0, 0, w, h); } last = p.row; cheer(g, p, T, 11, 7); });
  if(!P.dancers.length) return;
  // spotlights, then the dancers drawn at twice the size from a small canvas each
  const b = T*BPM/60, bi = Math.floor(b), bf = b - bi;
  g.fillStyle = 'rgba(6,18,50,.30)'; g.fillRect(0, P.foot - 40, w, h);
  P.dancers.forEach((d, i) => { const x = d.x + 8, sw = Math.sin(T*1.7 + i*1.3)*14;
    g.fillStyle = (bi + i) % 2 ? 'rgba(255,246,190,.13)' : 'rgba(255,246,190,.08)'; g.beginPath(); g.moveTo(x + sw - 3, 0); g.lineTo(x + sw + 3, 0); g.lineTo(x + 17, P.foot); g.lineTo(x - 17, P.foot); g.closePath(); g.fill(); });
  if(!DANCE){ DANCE = document.createElement('canvas'); DANCE.width = 18; DANCE.height = 22; }
  const dg = DANCE.getContext('2d');
  P.dancers.forEach((d, i) => { const mv = MOVES[i % MOVES.length], arm = mv[(bi + i) % 4], hop = bf < 0.25 ? 1 : 0, sway = (bi + i) % 2 ? 1 : -1, kick = (bi + i) % 3 === 0 ? sway : 0;
    const o = {...CAST[d.k], ...(d.hair ? {hair:d.hair} : {}), ...(d.skin ? {skin:d.skin} : {}), ...(d.tie ? {tie:d.tie} : {}), ...(d.glasses ? {glasses:d.glasses} : {}), ...(d.bald ? {bald:true} : {}),
      arm: d.case && arm === 'side' ? 'hold' : arm, hop, kick, flap: !!hop, case: d.case};
    dg.clearRect(0, 0, 18, 22); paintPerson(dg, 6 + sway, 21, o, T);
    g.fillStyle = 'rgba(0,0,0,.3)'; g.fillRect(d.x + 4, P.foot - 1, 20, 1);
    g.imageSmoothingEnabled = false; g.drawImage(DANCE, d.x, P.foot - 44, 36, 44);
    // papers thrown in the air
    for(let k=0;k<4;k++){ const ph = hsh(i, k, 7), tt = (T*0.55 + ph) % 1, px = d.x + 16 + (hsh(i, k, 8) - 0.5)*30*tt, py = P.foot - 30 - (24 + ph*14)*tt + 30*tt*tt;
      if(py > P.foot - 4) continue; const flip = Math.floor(T*6 + ph*9) % 2; g.fillStyle = flip ? '#fbf8ee' : '#d8d2bc'; g.fillRect(Math.round(px), Math.round(py), 2, flip ? 1 : 2); } });
}
