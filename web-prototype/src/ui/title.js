import { gameTrack, music, setMusic, toggleMusic, updateMusicBtn } from '../audio/music.js';
import { playSound } from '../audio/sfx.js';
import { CFG, VERSION } from '../core/config.js';
import { loadSave, records, save } from '../core/persist.js';
import { ACH, RANKS, RANK_BONUS, UNLOCKED_BY, career, drafts, rankBonus, rankOf, saveCareer, unlocked } from '../core/career.js';
import { B, NEW_TYPES } from '../core/config.js';
import { STYPE_ICON } from '../core/region.js';
import { closeDrama } from './drama.js';
import { N, S, clamp, setState } from '../core/state.js';
import { LANG, setLanguage, t } from '../i18n/index.js';
import { FX, GX, MOTION, OX0, OY0, RISE_MS, bl, disc, drawBirds, drawCrane, drawEntry, drawRise, drawWalkers, unionFlag, kick, setPainter } from '../render/anim.js';
import { TH, TW, centreOn, clampCam, defaultZoom, frameBox, FRX, FRY, isoOf, resize, scale, setAttachSel, worldEl, setCam, setSelected, setViewRot, setZoom } from '../render/camera.js';
import { GROUNDS, riverTile, roadTile, skirt } from '../render/ground.js';
import { gx, setMapSize, startSite } from '../render/map.js';
import { C, dith, frac, hsh, sh } from '../render/pixel.js';
import { ARCH, BUILDINGS, P3, billboardSprite, fenceSprite, flagSprite, noticeSprite, ruinSprite, siteSprite, spr } from '../render/sprites.js';
import { btn, hideModal, letter, modal, notice, rerender, setRerender, showNext } from './cards.js';
import { $, country } from './dom.js';
import { refresh } from './guide.js';
import { roman, setRunTab } from './hud.js';
import { clearSelection } from './dock.js';
import { ic } from './icons.js';

// --- Start / pause menu (with language switch) ---
export function langButtons(){ return ['en','es'].map(l=>{ const b = btn(t('lang.'+l), 'translate', ()=>{ setLang(l); }, false); if(l===LANG) b.classList.add('on'); return b; }); }
export function musicButton(){ const m = btn('', 'music_note', toggleMusic); m.id='btnMusic'; m.innerHTML=ic(music.on?'music_note':'music_off')+'<span class="label"></span>'; return m; }
// --- Title screen: a full-screen scene. Sky and diorama use the game's own pixel painters. ---
export const cover = $('cover');
export const coverOpen = () => !cover.hidden;
export function hideCover(){ cover.hidden = true; }
// The sky: dithered institutional blue, faint rays behind the logo, blue hills with distant cranes. One art pixel = PS css px.
export let SKY = null;   // the sky's pixel grid and hill line, shared with the flag avenue
export function paintSky(cv, Wc, Hc, cx, cy, hz){
  const PS = 4, w = Math.ceil(Wc/PS), h = Math.ceil(Hc/PS); cv.width = w; cv.height = h;
  cv.style.width = w*PS+'px'; cv.style.height = h*PS+'px';
  const g = cv.getContext('2d'), img = g.createImageData(w,h), d = img.data;
  const pal = ['#0b1f4d','#0f2c70','#163f94','#1d4cab','#2a63c9','#3f77d4','#5d8fdf','#86ade9'].map(C);
  const hy = Math.round(h*hz), rx = cx/PS, ry = cy/PS;
  const far = x => hy - 7 - 4*Math.sin(x*0.045+1.3) - 3*Math.sin(x*0.13) - (hsh(x>>2,3,5)<0.3 ? 1 : 0);
  const near = x => hy + 5 + 4*Math.sin(x*0.03+2.1) + 2*Math.sin(x*0.09+0.4);
  SKY = {PS, w, h, near};
  const farC = C('#4d78c9'), farD = C('#4570c0'), nearC = C('#24489a'), nearD = C('#1f4190'), low = C('#173576'), low2 = C('#122b62');
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    let c;
    const nY = near(x), fY = far(x);
    if(y >= nY){ const k = (y-nY)/Math.max(1,h-nY); c = k > 0.25 + dith(x,y)*0.5 ? low2 : (y-nY < 2 ? nearC : (dith(x,y) < 0.5 ? nearD : low)); }
    else if(y >= fY){ c = (y-fY < 1) ? sh(farC,1.08) : (dith(x,y) < 0.3 ? farD : farC); }
    else {
      const tt = clamp(y/Math.max(1,fY), 0, 0.999)*(pal.length-1), i = Math.floor(tt), f = tt-i;
      c = f > dith(x,y) ? pal[Math.min(i+1,pal.length-1)] : pal[i];
      const ang = Math.atan2(y-ry, x-rx), ray = Math.floor((ang+Math.PI)/(2*Math.PI)*28) % 2;
      if(ray && y < fY-2) c = sh(c, 1.07);
    }
    const o = (y*w+x)*4; d[o]=c[0]; d[o+1]=c[1]; d[o+2]=c[2]; d[o+3]=255;
  }
  // trees on the near hills, and two tower cranes on the far ones (somebody else's model town)
  const put = (x,y,c)=>{ if(x<0||y<0||x>=w||y>=h) return; const o=(y*w+x)*4; d[o]=c[0]; d[o+1]=c[1]; d[o+2]=c[2]; };
  for(let x=2;x<w;x+=5+Math.floor(hsh(x,9,9)*6)){ const y0 = Math.floor(near(x)); const th = 2+Math.floor(hsh(x,4,4)*3);
    for(let j=1;j<=th;j++) for(let i=-1;i<=1;i++) if(!(j===th && i)) put(x+i,y0-j,nearD); }
  [[0.18,0.9],[0.83,1.1]].forEach(([fx,sz])=>{ const x0 = Math.round(w*fx), y0 = Math.floor(far(x0)), H2 = Math.round(16*sz);
    for(let j=0;j<H2;j++) put(x0,y0-j,farD);
    for(let i=-Math.round(9*sz);i<=Math.round(5*sz);i++) put(x0+i,y0-H2,farD);
    for(let j=0;j<5;j++) put(x0+Math.round(4*sz),y0-H2+j,farD); });
  g.putImageData(img,0,0);
}
// A small cloud sprite (white on top, pale blue underneath)
export function cloudCanvas(seed){
  const w = 34+Math.floor(hsh(seed,1,2)*20), h = 12, cv = document.createElement('canvas'); cv.width=w; cv.height=h;
  const g = cv.getContext('2d'), img = g.createImageData(w,h), d = img.data;
  const blobs = [[0.25,0.7,0.24],[0.5,0.45,0.32],[0.75,0.68,0.24],[0.4,0.75,0.26],[0.62,0.78,0.22]];
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){
    const inside = blobs.some(([bx,by,r])=>{ const dx=(x+0.5)/w-bx, dy=((y+0.5)/h-by)*h/w; return dx*dx+dy*dy < r*r*0.62; }) && y < h-1;
    if(!inside) continue;
    const c = y > h*0.62 ? C('#c9daf4') : (y > h*0.5 && dith(x,y) < 0.5) ? C('#dfe9f9') : C('#ffffff');
    const o=(y*w+x)*4; d[o]=c[0]; d[o+1]=c[1]; d[o+2]=c[2]; d[o+3]=255; }
  g.putImageData(img,0,0); return cv;
}
// The diorama: a hand-placed model town, half finished, half a building site. Its buildings get random styles on
// every visit; it is alive like the map (traffic, people, sheep, smoke…) and its building sites keep finishing
// themselves — until the Commission requests changes and they go back to being building sites.
export let dioCanvas = null, DIO = null;
export function coverDiorama(){
  if(dioCanvas) return dioCanvas;
  const seed = (Math.random()*1e9)|0;
  const M = ['TvcRhCT', 'vpvRhCb', 'wvERskF', 'RRRRRRR', 'wwnRhhf', 'wwERpxf', '~~~~~~~'], n = M.length;
  const at = (r,c) => (r>=0 && c>=0 && r<n && c<n) ? M[r][c] : null;
  const OX = n*TW/2 + 16, OY = 112, Wd = n*TW + 32, Hd = OY + (n-1)*TH + TH/2 + 40;
  const ground = document.createElement('canvas'); ground.width = Wd; ground.height = Hd;
  const gg = ground.getContext('2d'); gg.imageSmoothingEnabled = false;
  const full = document.createElement('canvas'); full.width = Wd; full.height = Hd;
  const fg = full.getContext('2d'); fg.imageSmoothingEnabled = false;
  const pos = (r,c) => [(c-r)*TW/2, (c+r)*TH/2];
  const put = (g, s, r, c) => { const [x,y] = pos(r,c); g.drawImage(s.c, OX + x - s.ox, OY + y - s.oy); };
  const mask = (r,c,ch) => { let m = 0; [[-1,0,1],[0,1,2],[1,0,4],[0,-1,8]].forEach(([dr,dc,bit])=>{ const q = at(r+dr,c+dc);
    if(q===ch || (q===null && (ch==='~' || (ch==='R' && (r===3 || c===3))))) m |= bit; }); return m; };
  const order = []; for(let r=0;r<n;r++) for(let c=0;c<n;c++) order.push([r+c, c, r]);
  order.sort((a,b)=>a[0]-b[0] || a[1]-b[1]);
  const groundOf = (ch, r, c) => { const v = (r*7+c*3)%3;
    switch(ch){
      case 'R': return roadTile(mask(r,c,'R'), false);
      case '~': return riverTile(mask(r,c,'~'));
      case 'w': return GROUNDS.farm((r+c*2)%4, (r+c)%2);
      case 'v': case 'c': return GROUNDS.village(v);
      case 'T': return GROUNDS.habitat(v);
      case 'p': return GROUNDS.park(v);
      case 'h': case 'k': return GROUNDS.plaza(v);
      case 's': return GROUNDS.school(v);
      case 'f': return GROUNDS.yard(v);
      case 'n': return GROUNDS.serviced(v);
      case 'm': return GROUNDS.muni(v);
      case 'E': return GROUNDS.plaza(v);
      default: return GROUNDS.earth(v); } };
  const water = [];
  order.forEach(([,c,r])=>{ const ch = M[r][c], gs = groundOf(ch,r,c); put(gg, gs, r, c);
    if(ch==='~') water.push({r, c, m: mask(r,c,'~')});
    if(r===n-1) put(gg, skirt('L'), r, c); if(c===n-1) put(gg, skirt('R'), r, c); });
  fg.drawImage(ground, 0, 0);
  const TYPE = {h:'housing', p:'park', s:'school', k:'clinic', f:'factory'};
  const plan = []; let k = 0;
  order.forEach(([,c,r])=>{ const ch = M[r][c], [x,y] = pos(r,c), i = r*n + c;
    const E = {i: i + 1000, x, y, s:null, fx:[], walk:null, kids:false, cars:null, lamp:null, sheep:0, toad:false, crane:null};
    if(TYPE[ch]){ const L = ARCH[TYPE[ch]], A = L[Math.floor(hsh(i, seed&0xffff, 31)*L.length)], v = Math.floor(hsh(i, seed&0xffff, 32)*6);
      E.s = spr(TYPE[ch]+':'+A.id+':'+v, ()=>A.make(v)); E.fx = typeof A.fx==='function' ? A.fx(v) : (A.fx || []); E.walk = A.walk || null; E.kids = !!A.kids; }
    else switch(ch){
      case 'v': E.s = BUILDINGS.village(1 + (k++ % 3)); E.walk = [[-0.4,0.44,0.1,0.44]]; break;
      case 'c': E.s = BUILDINGS.village(0); break;
      case 'T': E.s = BUILDINGS.habitat(r+c); E.toad = r===0 && c===0; break;
      case 'C': { const hh = r ? 11 : 26; E.site = spr('site'+hh+'_0', ()=>siteSprite(hh,0)); E.s = E.site; E.hh = hh; E.cycle = true; break; }
      case 'b': E.s = billboardSprite(); break;
      case 'F': E.s = fenceSprite(); break;
      case 'n': E.s = noticeSprite(); break;
      case 'm': E.s = flagSprite(); E.fx = [{k:'flag', x:0, y:-13, c:['#1d3c78','#ffffff']}]; break;
      case 'E': E.fx = [{k:'union', at:[[-18,6],[-7,1],[4,-4],[15,-9]], w:9, h:6, pole:17}]; break;
      case 'x': E.s = ruinSprite(); break;
      case 'w': if((r+c*2)%4===1) E.sheep = 3; break;
      case 'R': { const m = mask(r,c,'R'), A = (m&2) && (m&8), B = (m&1) && (m&4);
        if(A !== B){ E.cars = {axis: A ? 'A' : 'B', k: A ? c : r, line: A ? r : c, reg:false, dens:0.45}; if((r+c)%2===0) E.lamp = A ? P3(0,-0.33) : P3(-0.33,0); }
        break; } }
    if(E.s) put(fg, E.s, r, c);
    plan.push(E); });
  // crop to the painted pixels (plus a margin; more on top for smoke and cranes) so the scene can be shown as large as possible
  const px = fg.getImageData(0,0,Wd,Hd).data; let x0=Wd, y0=Hd, x1=0, y1=0;
  for(let y=0;y<Hd;y++) for(let x=0;x<Wd;x++) if(px[(y*Wd+x)*4+3]){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
  x0 = Math.max(0, x0-2); y0 = Math.max(0, y0-14);
  const out = document.createElement('canvas'); out.width = x1-x0+3; out.height = y1-y0+3;
  DIO = {out, ground, plan, water, ox: OX, oy: OY, x0, y0, seed, pos};
  dioFrame(performance.now());
  return dioCanvas = out;
}
export function dioFrame(now){
  const D = DIO; if(!D) return; const g = D.out.getContext('2d'), T = MOTION ? now/1000 : 0;
  g.setTransform(1,0,0,1,0,0); g.clearRect(0,0,D.out.width,D.out.height); g.imageSmoothingEnabled = false;
  g.drawImage(D.ground, -D.x0, -D.y0);
  setPainter(g, D.ox - D.x0, D.oy - D.y0);
  const wf = Math.floor(T*3.5) % 4;
  D.water.forEach(w=>{ const [x,y] = D.pos(w.r, w.c); bl(spr('river'+w.m+'_'+wf, ()=>riverTile(w.m, wf)), x, y, 0); });
  for(const E of D.plan) drawEntry(E, T, 0, now);
  if(MOTION) drawBirds(T + 9, 0, D.out.width, D.out.height, D.seed);
  setPainter(gx);
}
// A building site that finishes itself, shows off its building, then goes back to being a site ("changes requested")
export function drawCycleSite(E, T, step){
  const P = 17, u = (T + E.i*3.7)/P, n = Math.floor(u), f = frac(u)*P;
  if(f < 9 || !MOTION){ bl(E.site, E.x, E.y, step); E.crane = E.hh; drawCrane(E, T, step); E.crane = null; return; }
  const ty = ['housing','housing','school','clinic','factory','park'][Math.floor(hsh(n, E.i, 8)*6)], L = ARCH[ty];
  const A = L[Math.floor(hsh(n, E.i, 9)*L.length)], v = Math.floor(hsh(n, E.i, 10)*6), s = spr(ty+':'+A.id+':'+v, ()=>A.make(v)), age = (f-9)*1000;
  const B = {...E, s};
  if(age < RISE_MS) drawRise(B, age, step);
  else { bl(s, E.x, E.y, step); (typeof A.fx==='function' ? A.fx(v) : (A.fx || [])).forEach(fx=>FX[fx.k](fx, B, T, step)); if(A.walk) drawWalkers({...B, walk:A.walk, kids:!!A.kids}, T, step); }
  if(f > P - 0.8){ const d = (f - (P-0.8))/0.8; GX.globalAlpha = 0.85*(1-d*0.6);   // demolition dust
    for(let q=0;q<14;q++){ const an = q/14*Math.PI*2, rr = 4 + d*18; disc(OX0+E.x + Math.cos(an)*rr, OY0+E.y - 10 + Math.sin(an)*rr*0.6 - d*6, 3 + d*3, '#e3d8c0'); }
    GX.globalAlpha = 1; }
}
// Fit the scene to the screen: sky, rays behind the logo, the diorama at a whole-pixel scale
// An avenue of flagpoles along the hills behind the town, every flag of the Union waving out of step with the next
export function avenueFrame(now){
  const cv = $('coverFlags'); if(!cv || !SKY) return;
  if(cv.width !== SKY.w || cv.height !== SKY.h){ cv.width = SKY.w; cv.height = SKY.h; cv.style.width = SKY.w*SKY.PS+'px'; cv.style.height = SKY.h*SKY.PS+'px'; }
  const g = cv.getContext('2d'), T = MOTION ? now/1000 : 0; g.setTransform(1,0,0,1,0,0); g.clearRect(0,0,cv.width,cv.height);
  const keep = [GX, OX0, OY0]; setPainter(g, 0, 0);
  for(let x = 5, q = 0; x < SKY.w - 4; x += 23, q++){ const base = Math.floor(SKY.near(x)) + 2, poleH = 27 + (q%3)*2;
    unionFlag(x, base - poleH, 15, 10, T, q*1.3, 0, poleH); }
  // a nearer row of bigger flags in the free band under the town (only when there is room for it)
  if(SKY.fg){ const {top, base} = SKY.fg, poleH = base - top;
    if(poleH >= 30) for(let x = 9, q = 0; x < SKY.w - 8; x += 44, q++){ const ph = poleH - (q%2)*4; unionFlag(x, base - ph, 27, 18, T, q*2.1 + 0.6, 0, ph); } }
  setPainter(...keep);
}
export function layoutCover(){
  if(!coverOpen()) return;
  const sky = $('coverSky'), dio = cover.querySelector('.cv-dio canvas'), box = cover.querySelector('.cv-dio');
  if(!sky || !dio) return;
  const cr = cover.getBoundingClientRect(), lr = cover.querySelector('.cv-logo').getBoundingClientRect();
  const dprC = window.devicePixelRatio || 1;
  dio.style.width = '1px'; dio.style.height = '1px';
  const br = box.getBoundingClientRect(), availW = Math.max(120, br.width), availH = Math.max(80, br.height);
  // whole device pixels when the art is big; half steps below 3× (invisible on dense screens) so phones get a decent size
  const fitK = Math.min(availW*dprC/dio.width, availH*dprC/dio.height), k = fitK >= 3 ? Math.floor(fitK) : Math.max(1, Math.floor(fitK*2)/2);
  dio.style.width = dio.width*k/dprC + 'px'; dio.style.height = dio.height*k/dprC + 'px';
  const dr = dio.getBoundingClientRect();
  const hz = clamp((dr.top + dr.height*0.42 - cr.top)/cr.height, 0.45, 0.85);
  paintSky(sky, cr.width, cr.height, lr.left + lr.width/2 - cr.left, lr.top + lr.height/2 - cr.top, hz);
  const fr = cover.querySelector('.cv-foot').getBoundingClientRect();   // the front row stands above the version and copyright
  SKY.fg = {top: Math.ceil((dr.bottom - cr.top)/SKY.PS) + 3, base: Math.floor((fr.top - cr.top)/SKY.PS) + 1};
  avenueFrame(performance.now());
}
// --- The title screen: logo, a vertical menu (new game · continue · settings · credits), version and copyright in the corners.
// The scene (sky, clouds, flags, diorama) is built once per visit; the menu re-renders on its own (views, language).
let view = 'main';
function item(label, fn, opt={}){
  const b = document.createElement('button'); b.type = 'button'; b.className = 'cv-item' + (opt.cls ? ' '+opt.cls : '');
  b.innerHTML = `<i class="cv-ptr" aria-hidden="true"></i><span><b>${label}</b>${opt.sub ? `<small>${opt.sub}</small>` : ''}</span>`;
  if(opt.disabled) b.disabled = true;
  b.onclick = ()=>{ if(!opt.silent) playSound('click'); fn(); };
  b.addEventListener('pointerenter', ()=>{ if(!b.disabled && document.activeElement !== b) b.focus({preventScroll:true}); });
  return b;
}
function go(v){ view = v; renderMenu(true); requestAnimationFrame(layoutCover); }
function renderMenu(fresh){
  const menu = cover.querySelector('.cv-menu'); if(!menu) return;
  const items = [...menu.querySelectorAll('.cv-item')], at = items.indexOf(document.activeElement);
  const saved = loadSave(), rec = records(), cont = saved && !saved.over;
  menu.innerHTML = ''; menu.dataset.view = view;
  const head = txt => { const h = document.createElement('div'); h.className = 'cv-head'; h.textContent = txt; menu.appendChild(h); };
  const add = b => menu.appendChild(b);
  let first = null;
  if(view === 'main'){
    const car = career();
    add(item(t('title.new'), ()=> car.tutorial ? go('draft') : startRun(), {sub: car.tutorial ? t('title.newSubQuick', {rank:t('rank.'+rankOf(car.xp))}) : t('title.newSubTut'), cls:'new'}));
    const c = add(item(t('title.continue'), ()=>{ setState(saved); afterLoad(); },
      {sub: cont ? t('title.contSub',{l:roman((saved.stage||0)+1), town:saved.town, m:saved.month}) : t('title.noSave'), disabled:!cont, cls:'cont'}));
    add(item(t('title.career'), ()=>go('career'), {sub: t('title.careerSub', {rank:t('rank.'+rankOf(car.xp)), n:car.ach.length, t:ACH.length}), cls:'career'}));
    add(item(t('title.settings'), ()=>go('settings')));
    add(item(t('title.credits'), ()=>go('credits')));
    first = cont ? c : menu.querySelector('.cv-item');
  } else if(view === 'draft'){
    // Quick start: three dossiers (a settlement type, a starting perk, a country), or the tutorial
    head(t('draft.t'));
    if(!draftOffer) draftOffer = drafts((Math.random()*2147483647)|0);
    draftOffer.forEach((d,k)=>{ const b = add(item(`${ic(STYPE_ICON[d.ty])} ${t('st.'+d.ty)}`, ()=>startQuick(d),
      {sub: `${t('std.'+d.ty)} · ${t('draft.perk', {p:t('perk.'+d.perk)})} · ${t('country.'+d.country)}`, cls:'draft'})); if(!k) first = b; });
    add(item(t('draft.tutorial'), ()=>startRun(), {cls:'tut'}));
    add(item(t('title.back'), ()=>go('main'), {cls:'back'}));
  } else if(view === 'career'){
    const c = career(), r = rankOf(c.xp), next = RANKS[r+1], prev = RANKS[r], rec = records();
    const box = document.createElement('div'); box.className = 'cv-career';
    const pct = next ? Math.round((c.xp-prev)/(next-prev)*100) : 100;
    const achs = ACH.map(a=>{ const on = c.ach.includes(a.id);
      return `<li class="${on?'on':'off'}">${ic(on?'workspace_premium':'lock')}<span><b>${t('ach.'+a.id+'.t')}</b>${t('ach.'+a.id+'.x')} <small>+${a.xp} XP${a.unlock ? ' · '+t('car.unlocks', {b:t('b.'+a.unlock)}) : ''}</small></span></li>`; }).join('');
    const blds = NEW_TYPES.map(ty=>{ const on = unlocked(ty);
      return `<li class="${on?'on':'off'}">${ic(B[ty].icon)}<span><b>${t('b.'+ty)}</b>${t('bd.'+ty)} <small>${on ? '' : t('car.lockedBy', {a:t('ach.'+UNLOCKED_BY[ty]+'.t')})}</small></span></li>`; }).join('');
    box.innerHTML = `<div class="rank">${t('rank.'+r)}</div><div class="xpbar"><i style="width:${pct}%"></i></div>
      <small>${next ? t('car.xp', {x:c.xp, n:next}) : t('car.xpMax', {x:c.xp})} · ${t('car.bonus', {p:Math.round(r*RANK_BONUS*100)})}</small><br>
      <small>${t('car.runs', {n:c.runs, s:rec.best.settlements, p:rec.best.pop})}</small>
      <h4>${t('car.build', {n:NEW_TYPES.filter(unlocked).length, t:NEW_TYPES.length})}</h4><ul>${blds}</ul>
      <h4>${t('car.ach', {n:c.ach.length, t:ACH.length})}</h4><ul>${achs}</ul>`;
    menu.appendChild(box);
    first = add(item(t('title.back'), ()=>go('main'), {cls:'back'}));
  } else if(view === 'settings'){
    const other = LANG === 'es' ? 'en' : 'es';
    first = add(item(t('title.lang', {l: t('lang.'+LANG)}), ()=>setLang(other), {silent:true, cls:'lang'}));
    add(item(t('title.guide', {s: t(career().guide ? 'on' : 'off')}), ()=>{ const c = career(); c.guide = !c.guide; saveCareer(c); renderMenu(); }, {cls:'guide'}));
    add(item(t('title.music', {s: t(music.on ? 'on' : 'off')}), ()=>{ toggleMusic(); renderMenu(); }, {cls:'music'}));
    add(item(t('title.back'), ()=>go('main'), {cls:'back'}));
  } else if(view === 'credits'){
    const c = document.createElement('div'); c.className = 'cv-credits';
    c.innerHTML = `<p class="by">${t('title.by')}</p>
      <dl><dt>${t('title.c.music')}</dt><dd>${t('title.c.musicX')}</dd><dt>${t('title.c.fonts')}</dt><dd>${t('title.c.fontsX')}</dd></dl>
      <p class="note">${t('title.c.note')}</p>`;
    menu.appendChild(c);
    first = add(item(t('title.back'), ()=>go('main'), {cls:'back'}));
  }
  const now = [...menu.querySelectorAll('.cv-item')];
  const target = (!fresh && at >= 0 && now[at] && !now[at].disabled) ? now[at] : first;
  if(target) target.focus({preventScroll:true});
}
// Arrow keys / W-S move through the menu, Enter or Space picks (native button behaviour), Esc or Backspace goes back
export function coverKey(e, k){
  const menu = cover.querySelector('.cv-menu'); if(!menu) return;
  const items = [...menu.querySelectorAll('.cv-item:not(:disabled)')]; if(!items.length) return;
  const i = items.indexOf(document.activeElement);
  if(k==='arrowdown' || k==='s' || k==='arrowup' || k==='w'){ e.preventDefault();
    const d = (k==='arrowdown' || k==='s') ? 1 : -1, n = i < 0 ? 0 : (i + d + items.length) % items.length;
    items[n].focus({preventScroll:true}); playSound('click'); return; }
  if((k==='escape' || k==='backspace') && view !== 'main'){ e.preventDefault(); playSound('click'); go('main'); return; }
  if((k==='enter' || k===' ') && i < 0){ e.preventDefault(); items[0].click(); }
}
function buildScene(){
  cover.innerHTML = `<canvas id="coverSky" aria-hidden="true"></canvas><div class="cv-clouds" aria-hidden="true"></div><canvas id="coverFlags" aria-hidden="true"></canvas>
    <div class="cv-body">
      <h1 class="cv-logo logo-art"><span class="sr">Eurocrat</span></h1>
      <nav class="cv-menu" aria-label="Menu"></nav>
      <div class="cv-dio"></div>
    </div>
    <div class="cv-foot"><span class="ver">v${VERSION}</span><span class="copy">© Copyright 2026 · Groenendaal</span></div>`;
  // clouds: made once per visit, spread across the sky with negative delays
  const clouds = cover.querySelector('.cv-clouds');
  // they stay in the band of the logo, so they never pass behind the menu
  [[0.01,140,0],[0.07,190,1],[0.03,110,2],[0.1,230,3],[0,170,4]].forEach(([top,dur,sd],j)=>{ const c = cloudCanvas(sd);
    c.className = 'cv-cloud'; c.style.top = `calc(${top} * min(100%, 1000px))`; c.style.width = c.width*4+'px'; c.style.height = c.height*4+'px';
    c.style.animationDuration = dur+'s'; c.style.animationDelay = (-dur*((j*0.37)%1))+'s'; clouds.appendChild(c); });
  cover.querySelector('.cv-dio').appendChild(coverDiorama());
}
export function startMenu(){
  closeDrama(); setMusic('menu');
  modal.classList.add('hidden'); modal.classList.remove('title'); notice.className = 'notice';
  if(!coverOpen() || !cover.querySelector('.cv-menu')) buildScene();
  view = 'main'; cover.hidden = false; kick();
  renderMenu(true);
  requestAnimationFrame(layoutCover); if(document.fonts && document.fonts.ready) document.fonts.ready.then(layoutCover);
  updateMusicBtn(); setRerender(()=>{ renderMenu(); requestAnimationFrame(layoutCover); });
}
addEventListener('resize', ()=>{ if(coverOpen()) layoutCover(); });
export function pauseMenu(){
  setMusic(gameTrack(), 0.4);
  letter({icon:'pause', title:t('pause.t'), body:`<p>${t('pause.x',{town:S.town, country:country(), m:Math.min(S.month,CFG.months), n:CFG.months})}</p><p class="keys">${t('lvl.keys')}</p>`,
    buttons:[btn(t('pause.back'),'play_arrow', ()=>{ setMusic(gameTrack()); hideModal(); }, true), musicButton(), ...langButtons(),
      btn(t('pause.abandon'),'replay', ()=>startRun()), btn(t('menu.main'),'logout', ()=>{ startMenu(); })]});
  updateMusicBtn(); setRerender(pauseMenu);
}
export function setLang(l){
  setLanguage(l);
  playSound('click'); refresh(); if(rerender && (!modal.classList.contains('hidden') || coverOpen())) rerender();
}
export function frameView(){ resize();
  // choosing the next plot: show the whole region and the plots on offer
  if(S.pending==='attach' && S.region.cands && S.region.cands.length){ const all = [...S.region.blocks, ...S.region.cands];
    frameBox(Math.min(...all.map(b=>b.x))-FRX, Math.min(...all.map(b=>b.y))-FRY, Math.max(...all.map(b=>b.x+b.n))-FRX, Math.max(...all.map(b=>b.y+b.n))-FRY, 0, 0, hudTop()); return; }
  setZoom(defaultZoom()); const [x,y] = isoOf((N-1)/2, (N-1)/2); setCam(x, y - hudTop()/2/scale()); clampCam(); }
// The floating HUD covers the top of the map: views are fitted below it
export function hudTop(){ const h = $('hud'); return h ? Math.min(h.offsetHeight + 12, worldEl.clientHeight*0.35) : 0; }
// A new Euroregion (or, for tests and the balance bot, a run that starts at settlement `stage`)
export function startNew(seed, stage = 0, opts = {}){ closeDrama(); hideCover(); startSite(seed, stage, opts); enterSettlement(); }
// The tutorial run: the 2×2 hamlet with the mayor's guide
export function startRun(){ draftOffer = null; startNew(undefined, 0, {bonus: rankBonus(), guide: true}); }
// Quick start from a dossier: straight into a 4×4 town of that type, with its perk
let draftOffer = null;
export function startQuick(d){ draftOffer = null; startNew(d.seed, 1, {ty:d.ty, perk:d.perk, country:d.country, bonus: rankBonus(), guide: career().guide}); }
// Show the settlement in play: fit the map to it and open its cards
export function enterSettlement(){ setAttachSel(-1); clearSelection(); setRunTab(null); setViewRot(0); setMapSize(); frameView(); save(); setMusic(gameTrack()); refresh(); showNext(); }
export function afterLoad(){ hideCover(); enterSettlement(); }
