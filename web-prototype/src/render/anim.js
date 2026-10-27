import { activeCombos, discovered } from '../core/combos.js';
import { approves, buildMonths, hasAccess } from '../core/rules.js';
import { N, S, clamp, idx, rc } from '../core/state.js';
import { cellPos, wid } from '../core/region.js';
import { t } from '../i18n/index.js';
import { FRX, FRY, H, MAPCX, MAPCY, OX, OY, TH, TW, W, WN, attachSel, ctx, cvs, dpr, isoOf, isoW, rotateCoord, scale, selected, viewRot, worldEl } from './camera.js';
import { GROUNDS, riverTile, roadTile, skirt, wedgeTile } from './ground.js';
import { AH, AOX, AOY, AW, OWNER, VEIL, art, computeOwner, inW, drawTile, drawWorldTile, gctx, groundCv, gx, planThing, staticKey, setStaticKey, variant, veil, worldThing } from './map.js';
import { C, frac, hsh } from './pixel.js';
import { ARCH, BUILDINGS, CAR_COLS, P3, billboardSprite, carSprite, cones, fenceSprite, flagSprite, noticeSprite, ruinSprite, siteSprite, spr } from './sprites.js';
import { modal } from '../ui/cards.js';
import { guideAt, pulseUntil } from '../ui/guide.js';
import { avenueFrame, coverOpen, dioFrame, drawCycleSite } from '../ui/title.js';

// ---------- animation clock, night and completions ----------
export const MOTION = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
export const NIGHT = ['#ffffff','#c5cce6','#8f99c9','#5d67a6'], GLOWA = [0, 0.4, 0.8, 1], NIGHT_MS = 2600, RISE_MS = 950;
export let nightAt = -1e9;
export function startNight(){ if(MOTION){ nightAt = performance.now(); kick(); } }
export function nightStep(now){ const a = now - nightAt; if(a < 0 || a > NIGHT_MS) return 0;
  const p = a/NIGHT_MS, v = p < 0.22 ? p/0.22 : p < 0.6 ? 1 : 1 - (p-0.6)/0.4; return Math.min(3, Math.floor(v*3.999)); }
// Night versions of a sprite: multiplied by a blue tint in 3 stepped levels (cached)
export function dark(s, step){ if(!step) return s.c; if(s.dk[step]) return s.dk[step];
  const cv = document.createElement('canvas'); cv.width = s.c.width; cv.height = s.c.height; const g = cv.getContext('2d');
  g.drawImage(s.c,0,0); g.globalCompositeOperation='multiply'; g.fillStyle=NIGHT[step]; g.fillRect(0,0,cv.width,cv.height);
  g.globalCompositeOperation='destination-in'; g.drawImage(s.c,0,0); return s.dk[step] = cv; }
export const NC = new Map();
export function nc(hex, step){ if(!step) return hex; const k = hex+step; let v = NC.get(k); if(v) return v;
  const a = C(hex), b = C(NIGHT[step]); v = `rgb(${a[0]*b[0]/255|0},${a[1]*b[1]/255|0},${a[2]*b[2]/255|0})`; NC.set(k, v); return v; }
export let WATER = [], LAMPS = [], PLAN = [], TOPS = new Map();
export let GX = gx, OX0 = 0, OY0 = 0;
// The painters draw into GX at offset (OX0, OY0); the title screen borrows them for its diorama.
export function setPainter(g, ox = OX0, oy = OY0){ GX = g; OX0 = ox; OY0 = oy; }
export function bl(s, ix, iy, step){ const x = OX0 + ix - s.ox, y = OY0 + iy - s.oy;
  GX.drawImage(step ? dark(s, step) : s.c, x, y);
  if(step && s.g){ GX.globalAlpha = GLOWA[step]; GX.drawImage(s.g, x, y); GX.globalAlpha = 1; } }
export const R = (x,y,w,h,col) => { GX.fillStyle = col; GX.fillRect(Math.round(x), Math.round(y), w, h); };
export function disc(x,y,r,col){ GX.fillStyle = col; const rr = Math.ceil(r);
  for(let j=-rr;j<=rr;j++){ const w = Math.round(Math.sqrt(Math.max(0, r*r - j*j))); if(w || Math.abs(j) < r) GX.fillRect(Math.round(x)-w, Math.round(y)+j, w*2+1, 1); } }
// Buildings finished since the last draw rise from the ground (at dawn, if the month-end night is playing)
export const born = new Map(); export let lastSt = null, lastKey = '';
export function trackCompletions(now){
  const key = S.seed+':'+(S.level||0)+':'+N, st = S.grid.map(p=>p.st+(p.ty||'')), dawn = nightAt + NIGHT_MS*0.55;
  if(lastSt && lastKey === key && lastSt.length === st.length)
    st.forEach((s,i)=>{ const p = S.grid[i]; if(MOTION && p.st==='built' && p.ty && p.ty!=='road' && lastSt[i] !== s && !lastSt[i].startsWith('built'))
      born.set(i, dawn > now ? dawn : now); });
  else born.clear();
  lastKey = key; lastSt = st;
}

// ---------- animated overlays (all positions in art pixels) ----------
// The Union's flag (the emblem, waving): 3:2 blue cloth with one white five-point star in the centre, outer radius
// 3/10 of the height (the proportions of Vietnam's flag). The star is rasterised once per flag size.
export const UNION_BLUE = '#003399';
const STAR_MASKS = new Map();
function starMask(w, h){
  const key = w+'x'+h; let m = STAR_MASKS.get(key); if(m) return m; m = new Set();
  if(h < 8){ const x0 = Math.floor(w/2) - 1, y0 = Math.floor(h/2) - 1;   // too small for a polygon: a hand-made 3×3 star
    ['.#.','###','#.#'].forEach((row,j)=>[...row].forEach((c,i)=>{ if(c==='#') m.add((x0+i)+','+(y0+j)); })); }
  else {
    const R = 0.3*h, r = R*0.381966, cx = w/2, cy = h/2, th = h >= 14 ? 0.3 : 0.4, pts = [];
    for(let k=0;k<10;k++){ const a = -Math.PI/2 + k*Math.PI/5, rad = k%2 ? r : R; pts.push([cx + rad*Math.cos(a), cy + rad*Math.sin(a)]); }
    const inside = (x,y) => { let c = false; for(let i=0, j=9; i<10; j=i++){ const [xi,yi] = pts[i], [xj,yj] = pts[j];
      if((yi>y) !== (yj>y) && x < (xj-xi)*(y-yi)/(yj-yi) + xi) c = !c; } return c; };
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){ let n = 0;
      for(let a=0;a<6;a++) for(let b=0;b<6;b++) if(inside(x+(a+0.5)/6, y+(b+0.5)/6)) n++;
      if(n/36 >= th) m.add(x+','+y); } }
  STAR_MASKS.set(key, m); return m;
}
export function unionFlag(X, Y, w, h, T, ph, step, poleH){
  const amp = h >= 9 ? 1.5 : 1, star = starMask(w, h);
  if(poleH){ R(X, Y, 1, poleH, nc('#d9dce2', step)); R(X+1, Y, 1, poleH, nc('#9aa0aa', step)); R(X, Y-1, 2, 1, nc('#f2c230', step)); }
  // the cloth waves column by column; the star rides on it as one piece (a sheared pixel star stops reading as a star)
  const wave = i => { const ph2 = i*0.55 - T*6 + ph; return [Math.round(Math.sin(ph2)*amp*(i/Math.max(1,w-1))), Math.cos(ph2)]; };
  for(let i=0;i<w;i++){ const [yo, sl] = wave(i), blue = sl > 0.55 ? '#1a4bb0' : sl < -0.55 ? '#002a80' : UNION_BLUE;
    R(X+2+i, Y+1+yo, 1, h, nc(blue, step)); }
  const [yc, sc] = wave(Math.floor(w/2)), white = nc(sc < -0.55 ? '#dfe6f5' : '#ffffff', step);
  star.forEach(k=>{ const [i,j] = k.split(',').map(Number); R(X+2+i, Y+1+j+yc, 1, 1, white); }); }
export const FX = {
  union(f, E, T, step){ (f.at || [[0,0]]).forEach(([dx,dy],q)=> unionFlag(Math.round(OX0+E.x+dx), Math.round(OY0+E.y+dy-(f.pole||16)), f.w||9, f.h||6, T, E.i*1.7+q*0.9, step, f.pole||16)); },
  smoke(f, E, T, step){ const steam = f.c==='steam', n = steam ? 4 : 6, X0 = OX0+E.x+f.x, Y0 = OY0+E.y+f.y;
    for(let k=n-1;k>=0;k--){ const a = frac(T/(steam?2.4:3.4) + k/n + E.i*0.13), r = (steam?0.9:1.6) + a*(steam?1.4:3) - (a>0.8 ? (a-0.8)*10 : 0);
      if(r < 0.6) continue; const x = X0 + a*(steam?5:13) + Math.sin(a*7+k)*1.2, y = Y0 - a*(steam?11:24);
      disc(x, y+0.6, r, nc(steam ? '#c9d2da' : '#aab3bc', step)); disc(x-0.4, y, r, nc(a < 0.4 ? '#ffffff' : '#e6eaee', step)); } },
  flag(f, E, T, step){ const X = Math.round(OX0+E.x+f.x), Y = Math.round(OY0+E.y+f.y);
    for(let i=1;i<10;i++){ const half = Math.round(3*(1-i/10)), yo = Math.round(Math.sin(i*0.75 - T*7 + E.i)*(i/9)*1.5);
      for(let j=-half;j<=half;j++) R(X+i, Y+j+yo, 1, 1, nc(Math.abs(j)===half && i<8 ? f.c[1] : f.c[0], step)); } },
  blink(f, E, T, step){ if(frac(T/f.p + f.o) >= 0.5) return; const X = OX0+E.x+f.x, Y = OY0+E.y+f.y;
    if(step){ GX.globalAlpha = 0.35; R(X-2,Y-2,5,5,f.c); GX.globalAlpha = 1; } R(X,Y,2,2,f.c); },
  turbine(f, E, T, step){ const X = OX0+E.x+f.x, Y = OY0+E.y+f.y, th = T*2.1 + E.i;
    for(let k=0;k<3;k++){ const an = th + k*2.0944, ca = Math.cos(an), sa = Math.sin(an);
      for(let s=2;s<=f.L;s++) R(X + ca*s, Y + sa*s*0.92, 1, 1, nc(s < f.L*0.35 ? '#ffffff' : '#e4e8ec', step)); }
    R(X-1,Y-1,3,3,nc('#ffffff',step)); R(X,Y,1,1,nc('#9aa3ad',step)); },
  ducks(f, E, T, step){ for(let k=0;k<f.n;k++){ const th = T*0.35*(k%2?-1:1) + k*2.1, [px,py] = P3(f.a + f.ra*Math.cos(th), f.b + f.rb*Math.sin(th));
      const X = Math.round(OX0+E.x+px), Y = Math.round(OY0+E.y+py), dir = Math.sin(th)*(k%2?-1:1) > 0 ? 1 : -1;
      R(X-1,Y-1,3,1,nc('#f6f4ee',step)); R(X-1,Y,3,1,nc('#d9d4c6',step)); R(X+dir*2,Y-2,1,1,nc(k===0?'#2f7d3a':'#8a6a4a',step)); R(X+dir*3,Y-2,1,1,nc('#f2a33a',step)); } },
  fountain(f, E, T, step){ const X = OX0+E.x+f.x, Y = OY0+E.y+f.y;
    for(let k=0;k<12;k++){ const a = frac(T*1.4 + k/12), side = (k%2 ? 1 : -1)*(1 + (k%3));
      R(X + side*a*2.2, Y - Math.sin(a*Math.PI)*(7 + (k%3)) + a*3, 1, 1, nc(k%3 ? '#bfe6f7' : '#ffffff', step)); }
    R(X,Y-9,1,2,nc('#ffffff',step)); },
  swing(f, E, T, step){ f.pts.forEach(([a,b],k)=>{ const [bx,by] = P3(a,b,12), an = Math.sin(T*2.6 + k*1.7)*0.65;
      const X0 = OX0+E.x+bx, Y0 = OY0+E.y+by, sx = X0 - 0.894*Math.sin(an)*7, sy = Y0 + Math.cos(an)*7 + 0.447*Math.sin(an)*7;
      for(let s=1;s<7;s++){ const t = s/7; R(X0 + (sx-X0)*t, Y0 + (sy-Y0)*t, 1, 1, nc('#6b6b6b',step)); }
      R(sx-1, sy, 3, 1, nc('#8a5a33',step)); }); },
};
// The crane hook goes up and down with a load; a red light blinks at the jib tip; welding sparks on the scaffolding
export function drawCrane(E, T, step){
  const hx = OX0+E.x+5, top = OY0+E.y-69, ph = 0.5 + 0.5*Math.sin(T*0.55 + E.i), hy = OY0+E.y - (E.crane+6) - ph*16;
  for(let y=top; y<hy; y++) R(hx, y, 1, 1, nc('#3a3a3a', step));
  R(hx-2, hy, 5, 1, nc('#3a3a3a', step)); const sw = Math.round(Math.sin(T*1.3 + E.i));
  R(hx-2+sw, hy+1, 5, 3, nc('#b0743c', step)); R(hx-2+sw, hy+1, 5, 1, nc('#c98b4f', step));
  if(frac(T/1.5 + E.i*0.3) < 0.5){ if(step){ GX.globalAlpha = 0.4; R(OX0+E.x-4, OY0+E.y-80, 5, 5, '#ff3b30'); GX.globalAlpha = 1; } R(OX0+E.x-3, OY0+E.y-79, 2, 2, '#ff3b30'); }
  const n = Math.floor(T*9), h = hsh(n, E.i, 5);
  if(h < 0.4){ const sx = OX0+E.x - 10 + Math.floor(hsh(n,E.i,6)*20), sy = OY0+E.y - 3 - Math.floor(hsh(n,E.i,7)*Math.max(4,E.crane));
    if(step){ GX.globalAlpha = 0.45; R(sx-2,sy-2,5,5,'#ffcf5a'); GX.globalAlpha = 1; }
    R(sx,sy,1,1,'#fff6c0'); R(sx+1,sy,1,1,'#ffb03a'); R(sx-1,sy+1,1,1,'#ffb03a'); }
}
// Traffic: continuous along straight lines (car ids are shared by the tiles of a line); right-hand lanes
export function drawCars(E, T, step){ const Q = E.cars;
  for(const d of [1,-1]){ const sp = Q.reg ? 0.5 : 0.34, u = T*sp + (d>0 ? 0.37 : 0.71) + Q.line*0.13;
    const s = d>0 ? frac(u) : 1 - frac(u), id = d>0 ? Q.k - Math.floor(u) : Q.k + Math.floor(u), lineKey = Q.line*4 + (Q.axis==='A'?0:2) + (d>0?0:1);
    if(hsh(id, lineKey, S.seed&0xffff) >= Q.dens) continue;
    const along = s - 0.5, lane = (Q.reg ? 0.14 : 0.12)*d, a = Q.axis==='A' ? along : -lane, b = Q.axis==='A' ? lane : along;
    const kh = hsh(id, lineKey, 9), kind = (Q.reg && kh < 0.12) ? 'bus' : Math.floor(kh*CAR_COLS.length*0.999);
    const [px,py] = P3(a,b); bl(carSprite(Q.axis, kind), E.x+Math.round(px), E.y+Math.round(py), step);
    if(step){ const fa = Q.axis==='A' ? 0.11*d : 0, fb = Q.axis==='A' ? 0 : 0.11*d, [hx,hy] = P3(a+fa, b+fb, 2);
      GX.globalAlpha = 0.5; R(OX0+E.x+hx-1, OY0+E.y+hy-1, 3, 3, '#ffe9a0'); GX.globalAlpha = 1; R(OX0+E.x+hx, OY0+E.y+hy, 1, 1, '#fff7d0'); } }
}
// Street lamps on every other road tile: a post by day, a lit head at night
export function drawLamp(E, step){ const X = Math.round(OX0+E.x+E.lamp[0]), Y = Math.round(OY0+E.y+E.lamp[1]);
  R(X, Y-10, 1, 10, nc('#3b3f45', step)); R(X-1, Y-11, 3, 1, nc('#3b3f45', step));
  R(X-1, Y-10, 3, 1, step ? '#fff0b0' : '#cfd6dd'); }
// People: shirt, skin and hair from the parcel hash; they go home at night
export const SHIRTS = ['#c62f28','#2a63c9','#1d8148','#e6b400','#8a5cc4','#e8762b','#f2f2ee','#3a3d44'], SKINS = ['#f1c9a5','#d9a27a','#a8714a','#7a4e2d','#f6d7bd'], HAIR = ['#2b2017','#5a3b22','#c9a26b','#7a7a7a','#1b1b1b'];
export function drawWalkers(E, T, step){ if(step >= 2) return;
  E.walk.forEach((w,k)=>{ const sp = 0.06 + hsh(E.i,k,3)*0.05, u = frac(T*sp + hsh(E.i,k,4)), tri = u < 0.5 ? u*2 : 2 - u*2;
    const [px,py] = P3(w[0] + (w[2]-w[0])*tri, w[1] + (w[3]-w[1])*tri), X = Math.round(OX0+E.x+px), Y = Math.round(OY0+E.y+py);
    const kid = E.kids && k > 0, h = kid ? 5 : 7, leg = Math.floor(T*6 + k) % 2, pk = (n,arr)=> arr[Math.floor(hsh(E.i,k,n)*arr.length)];
    GX.globalAlpha = 0.25; R(X-1, Y, 3, 1, '#1a2a10'); GX.globalAlpha = 1;
    R(X-1, Y-1, 1, 1, nc('#2b2f3a', step)); R(X + (leg ? 0 : 1) - (leg ? 0 : 1), Y-1-leg, 1, 1, nc('#2b2f3a', step)); R(X, Y-2, 1, 1, nc('#2b2f3a', step));
    R(X-1, Y-h+2, 2, h-4, nc(pk(6, SHIRTS), step)); R(X-1, Y-h, 2, 2, nc(pk(7, SKINS), step)); R(X-1, Y-h, 2, 1, nc(pk(8, HAIR), step)); });
}
// Sheep grazing on green fields (the Commission once asked for their sunlight study)
export function drawSheep(E, T, step){
  for(let k=0;k<E.sheep;k++){ const a = -0.26 + hsh(E.i,k,31)*0.52 + 0.04*Math.sin(T*0.23 + k*1.7), b = -0.26 + hsh(E.i,k,32)*0.52 + 0.04*Math.cos(T*0.19 + k*2.3);
    const [px,py] = P3(a,b), X = Math.round(OX0+E.x+px), Y = Math.round(OY0+E.y+py), f = hsh(E.i,k,33) < 0.5 ? -1 : 1, graze = Math.floor(T*0.6 + k*1.3) % 3 === 0;
    GX.globalAlpha = 0.22; R(X-2, Y, 6, 1, '#1a2a10'); GX.globalAlpha = 1;
    R(X-2, Y-4, 5, 3, nc('#f1eee5', step)); R(X-1, Y-5, 3, 1, nc('#ffffff', step)); R(X-1, Y-1, 1, 1, nc('#3b3b3b', step)); R(X+1, Y-1, 1, 1, nc('#3b3b3b', step));
    const hx = f > 0 ? X+3 : X-4; R(hx, graze ? Y-2 : Y-5, 2, 2, nc('#3b3b3b', step)); }
}
// The protected toad hops between three spots
export function drawToad(E, T, step){ const cyc = T/3.2 + hsh(E.i,1,2)*3, n = Math.floor(cyc), f = frac(cyc), spots = [[-14,8],[-9,10],[-17,11]];
  const [sx,sy] = spots[n%3], hop = f < 0.12 ? -2 : 0, X = OX0+E.x+sx, Y = OY0+E.y+sy+hop;
  [[0,0],[1,0],[2,0],[0,-1],[1,-1],[2,-1],[3,-1],[1,-2]].forEach(([i,j])=>R(X+i, Y+j, 1, 1, nc('#7a8f2e', step))); R(X+2, Y-2, 1, 1, '#f2c230'); }
// A flock of birds crosses the sky now and then
export function drawBirds(T, step, w=AW, hh=AH, seed=S.seed){ const P = 17, n = Math.floor(T/P), f = frac(T/P);
  if(hsh(n, 3, seed&0xffff) > 0.7 || f > 0.6) return; const dir = hsh(n,4,1) < 0.5 ? 1 : -1, x0 = dir > 0 ? -30 + f/0.6*(w+60) : w+30 - f/0.6*(w+60);
  const y0 = 30 + hsh(n,5,1)*hh*0.35 + Math.sin(T*0.8)*4, flap = Math.floor(T*7) % 2;
  [[0,0],[-5,-3],[-5,3],[-10,-6],[-10,6]].forEach(([dx,dy],k)=>{ const X = Math.round(x0 + dx*dir), Y = Math.round(y0 + dy + Math.sin(T*3+k)*0.6);
    const c = nc('#2b3240', step); R(X, Y, 1, 1, c); if(flap){ R(X-1, Y-1, 1, 1, c); R(X+1, Y-1, 1, 1, c); } else { R(X-1, Y, 1, 1, c); R(X+1, Y, 1, 1, c); } }); }
// A finished building rises from the ground, revealed bottom-up, in a puff of dust
export function drawRise(E, age, step){ const s = E.s, f = 1 - Math.pow(1 - clamp(age/700, 0, 1), 3), fr = s.oy - s.top;
  const cut = Math.round(fr + (1-f)*(s.oy + 8 - fr)), X = OX0 + E.x - s.ox, Y = OY0 + E.y - s.oy, src = step ? dark(s, step) : s.c;
  if(cut < s.c.height) GX.drawImage(src, 0, cut, s.c.width, s.c.height-cut, X, Y+cut, s.c.width, s.c.height-cut);
  const d = age/RISE_MS; if(d >= 1) return; GX.globalAlpha = (1-d)*0.8;
  for(let k=0;k<12;k++){ const an = k/12*Math.PI*2, rr = 6 + d*22; disc(OX0+E.x + Math.cos(an)*rr, OY0+E.y + Math.sin(an)*rr*0.5 - d*4, 1.5 + d*2.5, nc('#e3d8c0', step)); }
  GX.globalAlpha = 1; }

export let drawOrder = [], animTimer = 0, groundStamp = 0;
let WORLD_PLAN = [], WORLD_WATER = [], darkCv = null, darkStep = 0, darkStamp = -1;
// The static layer: every world cell outside the plot in play (open country and the consolidated region).
// Rebuilt only when the world, the plot in play or the rotation changes.
function buildStatic(){
  const A = S.region.active, key = S.runSeed+':'+(S.world.v||0)+':'+viewRot+':'+(A ? A.x+','+A.y+','+A.n : '-')+':'+S.region.blocks.length+':'+WN+':'+(S.pending||'')+':'+(S.region.cands||[]).map(P=>P.x+','+P.y).join(';');
  if(key === staticKey) return false;
  computeOwner();
  gctx.setTransform(1,0,0,1,0,0); gctx.clearRect(0,0,AW,AH); gctx.imageSmoothingEnabled = false;
  const order = [];
  for(let R=0;R<WN;R++) for(let C=0;C<WN;C++){
    if(A && R>=OY && R<OY+A.n && C>=OX && C<OX+A.n) continue;   // the plot in play is drawn on top
    if(!inW(R,C)) continue;                                      // no land there
    const [r2,c2] = rotateCoord(R,C,viewRot); order.push([r2+c2, c2, R*WN+C]); }
  order.sort((a,b)=>a[0]-b[0] || a[1]-b[1]);
  WORLD_WATER = [];
  order.forEach(o=>drawWorldTile(o[2], WORLD_WATER));
  WORLD_PLAN = order.map(o=>[o[0], o[1], worldThing(o[2])]);
  setStaticKey(key); return true;
}
// draw() recomposes the layers after a state change; compose() paints a frame; present() puts it on screen
export function draw(){
  if(!S || !W || !S.world) return;
  const now = performance.now(); trackCompletions(now);
  buildStatic();
  gctx.setTransform(1,0,0,1,0,0); gctx.imageSmoothingEnabled = false; groundStamp++;
  const A = S.region.active, order = [];
  if(A && S.grid.length === N*N) for(let r=0;r<N;r++) for(let c=0;c<N;c++){ const [r2,c2]=rotateCoord(r+OY,c+OX,viewRot); order.push([r2+c2, c2, idx(r,c)]); }
  order.sort((a,b)=>a[0]-b[0] || a[1]-b[1]);
  WATER = []; LAMPS = []; TOPS = new Map();
  order.forEach(o=>drawTile(o[2]));   // the plot in play, painted over the static layer
  const act = order.map(o=>[o[0], o[1], planThing(o[2])]);
  act.forEach(([,,E])=>TOPS.set(E.i, E.s ? E.s.top : 14));
  // merge the two depth-sorted lists
  PLAN = []; let i = 0, j = 0;
  while(i < WORLD_PLAN.length || j < act.length){
    const a = WORLD_PLAN[i], b = act[j];
    if(!b || (a && (a[0] < b[0] || (a[0]===b[0] && a[1] <= b[1])))){ PLAN.push(a[2]); i++; } else { PLAN.push(b[2]); j++; } }
  comboHighlights();
  drawOrder = order; compose(now); present(); kick();
}
export function groundFor(step){ if(!step) return groundCv;
  if(darkCv && darkStep === step && darkStamp === groundStamp) return darkCv;
  if(!darkCv){ darkCv = document.createElement('canvas'); }
  if(darkCv.width !== AW || darkCv.height !== AH){ darkCv.width = AW; darkCv.height = AH; }
  const g = darkCv.getContext('2d'); g.globalCompositeOperation='source-over'; g.clearRect(0,0,AW,AH);
  g.drawImage(groundCv,0,0); g.globalCompositeOperation='multiply'; g.fillStyle=NIGHT[step]; g.fillRect(0,0,AW,AH);
  g.globalCompositeOperation='destination-in'; g.drawImage(groundCv,0,0); g.globalCompositeOperation='source-over';
  darkStep = step; darkStamp = groundStamp; return darkCv; }
// One parcel's frame: lamp, traffic, sprite (rising if just finished), crane, effects, people, animals
export function drawEntry(E, T, step, now){
  if(E.cycle){ drawCycleSite(E, T, step); return; }
  if(E.ghost) step = Math.max(step, 1);   // the consolidated neighbours, a shade dimmer
    if(E.lamp) drawLamp(E, step);
    if(E.cars) drawCars(E, T, step);
    let rising = false;
    if(E.s){ const b0 = born.get(E.i);
      if(b0 !== undefined && now - b0 < RISE_MS){ rising = true; if(now < b0){ const cc = variant(E.i+7,3); bl(spr('site31_'+cc, ()=>siteSprite(31,cc)), E.x, E.y, step); }
        else drawRise(E, now - b0, step); }
      else { if(b0 !== undefined) born.delete(E.i);
        const hl = HL.get(E.i); if(hl) drawHalo(E, hl, T);   // Kairosoft-style: the buildings of a combo glow
        bl(E.s, E.x, E.y, step);
        if(hl === 'good') drawSparkles(E, T); } }
    if(E.crane) drawCrane(E, T, step);
    if(!rising) E.fx.forEach(f=>FX[f.k](f, E, T, step));
    if(E.walk && !rising) drawWalkers(E, T, step);
    if(E.sheep) drawSheep(E, T, step);
    if(E.toad) drawToad(E, T, step);
}
// ---------- combos, Kairosoft-style: the buildings that form a (discovered) combo get a pulsing outline,
// gold for good combos (with a few sparkles), red for bad ones ----------
export let HL = new Map();   // entry id (E.i) → 'good' | 'bad'
export function comboHighlights(){
  HL = new Map(); if(!S.region.active) return;
  const known = discovered(), A = S.region.active;
  const mark = (id, good) => { if(HL.get(id) !== 'good') HL.set(id, good ? 'good' : 'bad'); };
  activeCombos().forEach(x=>{ if(!known.includes(x.id)) return;
    mark(x.i, x.good);
    if(x.j >= 0) mark(x.j, x.good);
    else { const f = S.frontier[-1-x.j]; mark(-1 - wid(A.y + f.r, A.x + f.c), x.good); } });   // the neighbour across the edge too
}
const HALO = {good:[[255,226,77],[255,160,0]], bad:[[255,150,140],[214,46,40]]};
// A 2-pixel ring around the sprite's silhouette (inner light, outer strong), cached per sprite and colour
function haloOf(s, kind){
  s.halo = s.halo || {}; if(s.halo[kind]) return s.halo[kind];
  const w = s.c.width, h = s.c.height, src = s.c.getContext('2d').getImageData(0,0,w,h).data;
  const cv = document.createElement('canvas'); cv.width = w+4; cv.height = h+4;
  const g = cv.getContext('2d'), img = g.createImageData(w+4, h+4), d = img.data, [inner, outer] = HALO[kind];
  const solid = (x,y) => x>=0 && y>=0 && x<w && y<h && src[(y*w+x)*4+3] > 60;
  for(let y=-2;y<h+2;y++) for(let x=-2;x<w+2;x++){ if(solid(x,y)) continue;
    let near = 9; for(let dy=-2;dy<=2;dy++) for(let dx=-2;dx<=2;dx++){ const m = Math.abs(dx)+Math.abs(dy); if(m<=2 && m<near && solid(x+dx,y+dy)) near = m; }
    if(near > 2) continue; const c = near===1 ? inner : outer, o = ((y+2)*(w+4)+(x+2))*4; d[o]=c[0]; d[o+1]=c[1]; d[o+2]=c[2]; d[o+3]=255; }
  g.putImageData(img, 0, 0);
  return s.halo[kind] = {c:cv, ox:s.ox+2, oy:s.oy+2};
}
export function drawHalo(E, kind, T){
  const o = haloOf(E.s, kind); GX.globalAlpha = 0.55 + 0.45*Math.abs(Math.sin(T*2.6 + (E.i%7)));
  GX.drawImage(o.c, OX0 + E.x - o.ox, OY0 + E.y - o.oy); GX.globalAlpha = 1; }
// Little 4-point stars that twinkle around the top of a good combo
export function drawSparkles(E, T){
  for(let k=0;k<3;k++){ const ph = frac(T*0.7 + k/3 + hsh(E.i,k,61)); if(ph > 0.45) continue;
    const a = ph/0.45, sz = a < 0.5 ? 1 : 2 - (a > 0.8 ? 1 : 0);
    const X = Math.round(OX0 + E.x + (hsh(E.i,k,62)-0.5)*40), Y = Math.round(OY0 + E.y - (E.s.top||14)*(0.35 + hsh(E.i,k,63)*0.75));
    R(X, Y-sz, 1, 2*sz+1, '#fff7c2'); R(X-sz, Y, 2*sz+1, 1, '#fff7c2'); R(X, Y, 1, 1, '#ffffff'); }
}
// The part of the art canvas on screen (art pixels, relative to the map origin), with a margin
export function viewBox(){ const sc = scale(); return {x0: MAPCX - W/2/sc - 48, x1: MAPCX + W/2/sc + 48, y0: MAPCY - H/2/sc - 40, y1: MAPCY + H/2/sc + 150}; }
export function compose(now){
  if(!S || !W || !S.world || !PLAN.length) return;
  const T = MOTION ? now/1000 : 0, step = MOTION ? nightStep(now) : 0, V = viewBox();
  GX = gx; OX0 = AOX; OY0 = AOY;
  gx.setTransform(1,0,0,1,0,0); gx.imageSmoothingEnabled = false;
  // only the visible part of the world is repainted
  const bx = clamp(Math.floor(AOX+V.x0), 0, AW), by = clamp(Math.floor(AOY+V.y0-120), 0, AH), bw = clamp(Math.ceil(AOX+V.x1), 0, AW) - bx, bh = clamp(Math.ceil(AOY+V.y1), 0, AH) - by;
  if(bw <= 0 || bh <= 0) return;
  gx.clearRect(bx, by, bw, bh); gx.drawImage(groundFor(step), bx, by, bw, bh, bx, by, bw, bh);
  const seen = E => E.x >= V.x0 && E.x <= V.x1 && E.y >= V.y0 && E.y <= V.y1;
  const wf = Math.floor(T*3.5) % 4;
  for(const w of WORLD_WATER.concat(WATER)){ if(!seen(w)) continue; bl(spr('river'+w.m+'_'+wf, ()=>riverTile(w.m, wf)), w.x, w.y, step); w.over.forEach(s=>bl(s, w.x, w.y, step));
    if(w.veil){ gx.globalAlpha = VEIL; bl(veil(), w.x, w.y, step); gx.globalAlpha = 1; } }
  if(step){ gx.fillStyle = '#ffd77a';            // pools of lamp light: flat iso ellipses, a brighter core
    for(const [rx,ry,al] of [[11,5,0.07],[7,3,0.09]]){ gx.globalAlpha = al*step;
      LAMPS.forEach(([x,y])=>{ for(let j=-ry;j<=ry;j++){ const w = Math.round(rx*Math.sqrt(1-(j/(ry+0.5))**2)); gx.fillRect(Math.round(AOX+x)-w, Math.round(AOY+y+2)+j, w*2+1, 1); } }); }
    gx.globalAlpha = 1; }
  for(const E of PLAN) if(seen(E)) drawEntry(E, T, step, now);
  if(MOTION) drawBirds(T, step);
  worldEl.classList.toggle('night', step >= 2);
}
// The animation loop: ~15 frames a second while the page is visible
export function frame(){ animTimer = 0; if(document.hidden || !S) return; const now = performance.now();
  if(coverOpen()){ dioFrame(now); avenueFrame(now); } else { compose(now); presentNow(); }
  if(MOTION) animTimer = setTimeout(()=>{ animTimer = requestAnimationFrame(frame); }, 66); }
export function kick(){ if(!animTimer && MOTION && !document.hidden) animTimer = requestAnimationFrame(frame); }
document.addEventListener('visibilitychange', ()=>{ if(!document.hidden) kick(); });
// Every map sprite on one sheet (for review and for the Godot port). Returns {png, atlas}.
export function spriteSheet(){
  const items = [];
  const addS = (k, s) => items.push([k, s]);
  ['grass','muni','habitat','village','earth','plaza','yard','school','park'].forEach(g=>addS(g, GROUNDS[g](0)));
  for(let v=0; v<4; v++) addS('farm'+v, GROUNDS.farm(v,0));
  for(let m=0; m<16; m++) addS('road'+m, roadTile(m,false));
  addS('road5R', roadTile(5,true)); addS('road10R', roadTile(10,true));
  for(let m=0; m<16; m++) addS('river'+m, riverTile(m));
  addS('skirtL', skirt('L')); addS('skirtR', skirt('R'));
  Object.entries(ARCH).forEach(([ty,L])=>L.forEach(A=>addS(ty+':'+A.id, A.make(0))));
  ['A','B'].forEach(ax=>{ [0,1,2,3,4,5,6,7,'bus'].forEach(k=>addS('car'+ax+k, carSprite(ax,k))); });
  for(let f=0; f<4; f++) addS('river5_'+f, riverTile(5,f));
  for(let cc=1; cc<3; cc++) addS('site21_'+cc, siteSprite(21,cc));
  for(let v=0; v<4; v++) addS('village'+v, BUILDINGS.village(v));
  for(let v=0; v<2; v++) addS('habitat'+v, BUILDINGS.habitat(v));
  for(let hh=6; hh<=31; hh+=5) addS('site'+hh+'_0', siteSprite(hh,0));
  addS('cones', cones()); addS('notice', noticeSprite()); addS('fence', fenceSprite()); addS('flag', flagSprite());
  addS('serviced', GROUNDS.serviced(0)); addS('billboard', billboardSprite()); addS('ruin', ruinSprite());
  [16,32,64,128,17,68,34,136].forEach(m=>addS('road'+m, roadTile(m,false))); [1,2,4,8].forEach(m=>addS('wedge'+m, wedgeTile(m)));
  const cols = 8, cw = 64, ch = 112, rows = Math.ceil(items.length/cols);
  const cv = document.createElement('canvas'); cv.width = cols*cw; cv.height = rows*ch; const g = cv.getContext('2d');
  const atlas = {};
  items.forEach(([k,s],j)=>{ const x=(j%cols)*cw, y=Math.floor(j/cols)*ch + (ch - s.c.height);
    g.drawImage(s.c, x, y); atlas[k] = {x, y, w:s.c.width, h:s.c.height, ox:s.ox, oy:s.oy}; });
  return {png: cv.toDataURL('image/png'), atlas};
}
// A plot number that stays readable at any zoom: drawn in screen pixels at the map point (x,y)
export function bigBadge(x, y, text, on){
  const m = ctx.getTransform(), sx = m.a*x + m.e, sy = m.d*y + m.f, z = dpr;
  ctx.save(); ctx.setTransform(z,0,0,z,0,0); const X = sx/z, Y = sy/z, r = 15;
  ctx.fillStyle = '#0b1f4d'; ctx.fillRect(X-r-2, Y-r-2, 2*r+4, 2*r+4);
  ctx.fillStyle = on ? '#e8762b' : '#ffd200'; ctx.fillRect(X-r, Y-r, 2*r, 2*r);
  ctx.fillStyle = on ? '#ffffff' : '#0b1f4d'; ctx.font = '400 26px Jersey, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, X, Y+1); ctx.restore(); }
export function badge(x,y,text,col){ ctx.font='700 8px Pixel, sans-serif'; const w=Math.ceil(ctx.measureText(text).width)+6, x0=Math.round(x-w/2), y0=Math.round(y)-5;
  ctx.fillStyle='#0b1f4d'; ctx.fillRect(x0-1,y0-1,w+2,11); ctx.fillRect(x0,y0+10,w+1,1);
  ctx.fillStyle=col; ctx.fillRect(x0,y0,w,9); ctx.fillStyle='rgba(255,255,255,.28)'; ctx.fillRect(x0,y0,w,1);
  ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(text,x0+w/2,y0+5); }
// Combo pairs: a dotted link between the two parcels with a small medal (good) or warning (bad) in the middle
export function drawComboLinks(){
  const known = discovered();
  activeCombos().forEach(x=>{ if(!known.includes(x.id)) return;
    const [x1,y1] = isoOf(...rc(x.i)), [x2,y2] = isoOf(...cellPos(x.j)), col = x.good ? '#1d8148' : '#c62f28';
    ctx.save(); ctx.strokeStyle = col; ctx.lineWidth = 1.6; ctx.setLineDash([2.5,2]);
    ctx.beginPath(); ctx.moveTo(x1,y1-4); ctx.lineTo(x2,y2-4); ctx.stroke(); ctx.setLineDash([]);
    const mx=(x1+x2)/2, my=(y1+y2)/2-4; ctx.fillStyle = col; ctx.fillRect(mx-3.5,my-3.5,7,7);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 6px system-ui, sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(x.good?'+':'!', mx, my+0.3);
    ctx.restore(); });
}
// The edge of the settlement in play, when consolidated neighbours surround it
export function drawBorder(){
  if(!S.region.active) return;
  const e = N-0.5, pts = [[-0.5,-0.5],[-0.5,e],[e,e],[e,-0.5]].map(([r,c])=>isoOf(r,c));
  ctx.save(); ctx.strokeStyle = 'rgba(255,210,0,.85)'; ctx.lineWidth = 1.2; ctx.setLineDash([4,3]);
  ctx.beginPath(); pts.forEach(([x,y],k)=>k ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath(); ctx.stroke(); ctx.restore();
}
// A world rectangle as an iso diamond path
function plotPath(P){ const y = P.y-FRY, x = P.x-FRX;   // map → frame coordinates
  const pts = [[y-0.5,x-0.5],[y-0.5,x+P.n-0.5],[y+P.n-0.5,x+P.n-0.5],[y+P.n-0.5,x-0.5]].map(([R,C])=>isoW(R,C));
  ctx.beginPath(); pts.forEach(([x,y],k)=>k ? ctx.lineTo(x,y) : ctx.moveTo(x,y)); ctx.closePath(); }
// The consolidated settlements (thin outlines) and, while choosing, the plots on offer (numbered)
export function drawRegion(){
  ctx.save(); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.setLineDash([]);
  S.region.blocks.forEach(B=>{ plotPath(B); ctx.stroke(); });
  if(S.pending==='attach' && S.region.cands && modal.classList.contains('hidden')){
    const ph = (performance.now()%1400)/1400;
    S.region.cands.forEach((P,k)=>{ const on = k===attachSel;
      plotPath(P); ctx.fillStyle = on ? 'rgba(255,210,0,.38)' : 'rgba(255,210,0,'+(0.10+0.08*Math.sin(ph*Math.PI*2))+')'; ctx.fill();
      ctx.setLineDash(on ? [] : [5,3]); ctx.lineWidth = on ? 2.4 : 1.6; ctx.strokeStyle = on ? '#ffd200' : '#fff3a6'; ctx.stroke();
      const [cx,cy] = isoW(P.y-FRY+(P.n-1)/2, P.x-FRX+(P.n-1)/2); bigBadge(cx, cy, String(k+1), on); });
    if(!pulseTimer) pulseTimer = setTimeout(()=>{ pulseTimer = 0; present(); }, 60);
  }
  ctx.restore();
}
export const MARK = {rejected:['✕','#d64545'], event:['!','#e8442e'], toad:['!','#2e7d32'], holdout:['+80%','#d98a00'], paused:['II','#d98a00'], ruin:['!','#6b6b6b'], halt:null};
export function drawLabels(i){
  const p = S.grid[i], r=Math.floor(i/N), c=i%N, [x,y] = isoOf(r,c);
  if(p.st==='review') badge(x+10,y-24,t('map.m',{n:p.t}), approves() ? '#1d3c78' : '#d64545');
  if(p.st==='land' && p.hold && hasAccess(r,c)) badge(x+12,y-10,'+80%','#d98a00');   // only where you would buy
  if(p.st==='approved') badge(x,y-12,t('map.queue'),'#e8762b');
  if(p.st==='building'){ const hh = p.ty==='road' ? 2 : 6 + Math.round((1-p.t/buildMonths(p.ty))*5)*5;
    badge(x-12,y-hh-14, p.halt ? t('map.halt',{n:p.halt}) : t('map.m',{n:p.t}), p.halt ? '#d64545' : '#d0571b'); }
  if(p.st==='private' && p.dev) badge(x-12,y-30, t('map.m',{n:p.dev.t}), '#8a6d1f');
  if(S.plan && S.plan.list.includes(i) && p.st==='owned') badge(x,y-6,t('map.plan'),'#2d5bb5');
  const mk = p.flag && MARK[p.flag.k]; if(mk) badge(x+14,y-40,mk[0],mk[1]);
  if(p.st==='owned' && !hasAccess(r,c)) badge(x,y-14,'?','#7a8599');
}
export let presentQueued = false;
export function present(){
  if(presentQueued) return; presentQueued = true;
  (window.requestAnimationFrame || (f=>setTimeout(f,16)))(()=>{ presentQueued = false; compose(performance.now()); presentNow(); });
}
export function presentNow(){
  if(!S || !W || !S.world) return;
  const order = drawOrder;
  // Blow the art canvas up with nearest-neighbour scaling, aligned to whole device pixels
  const s = scale(), k = dpr*s;
  ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,cvs.width,cvs.height); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(art, Math.round(dpr*(W/2 + (-AOX-MAPCX)*s)), Math.round(dpr*(H/2 + (-AOY-MAPCY)*s)), Math.round(AW*k), Math.round(AH*k));
  // Crisp overlays on top: month badges and the selection marker
  ctx.setTransform(k,0,0,k, dpr*(W/2 - MAPCX*s), dpr*(H/2 - MAPCY*s)); ctx.imageSmoothingEnabled = true;
  drawRegion();
  drawBorder();
  order.forEach(o=>{ if(o[2]>=0) drawLabels(o[2]); });
  if(selected>=0){ const p=S.grid[selected], [x,y]=isoOf(Math.floor(selected/N), selected%N);
    const top = y - (TOPS.get(selected) || 14) - 4;
    const bob = Math.round(top) - 1 + (MOTION ? Math.round(Math.sin(performance.now()/170)) : 0);   // stepped pixel arrow: navy outline, yellow fill
    [[-5,-8,11],[-4,-7,9],[-3,-6,7],[-2,-5,5],[-1,-4,3],[0,-3,1]].forEach(([dx,dy,w])=>{ ctx.fillStyle='#0b1f4d'; ctx.fillRect(x+dx-1,bob+dy-1,w+2,2); });
    [[-4,-7,9],[-3,-6,7],[-2,-5,5],[-1,-4,3]].forEach(([dx,dy,w])=>{ ctx.fillStyle='#ffd200'; ctx.fillRect(x+dx,bob+dy,w,1); });
    ctx.fillStyle='#fff3a6'; ctx.fillRect(x-4,bob-7,9,1); }
  // Event / problem focus: a pulsing red diamond so the player sees where it happens
  const live = S.focus>=0 && (!modal.classList.contains('hidden') || performance.now() < pulseUntil);
  if(live){ const [x,y]=isoOf(...rc(S.focus)), ph=(performance.now()%1100)/1100;
    for(const k of [ph, (ph+0.5)%1]){ const s2=0.75+k*0.9; ctx.globalAlpha = 1-k; ctx.strokeStyle='#e8442e'; ctx.lineWidth=2.2;
      ctx.beginPath(); ctx.moveTo(x,y-TH/2*s2); ctx.lineTo(x+TW/2*s2,y); ctx.lineTo(x,y+TH/2*s2); ctx.lineTo(x-TW/2*s2,y); ctx.closePath(); ctx.stroke(); }
    ctx.globalAlpha = 1;
    if(!pulseTimer) pulseTimer = setTimeout(()=>{ pulseTimer = 0; present(); }, 40); }
  if(guideAt>=0 && guideAt!==selected && modal.classList.contains('hidden')){
    const [x,y]=isoOf(...rc(guideAt)), ph=(performance.now()%1300)/1300, b = Math.round(Math.sin(ph*Math.PI*2)*3);
    ctx.strokeStyle='#ffd200'; ctx.lineWidth=2.4; ctx.globalAlpha = 0.6+0.4*Math.sin(ph*Math.PI*2);
    ctx.beginPath(); ctx.moveTo(x,y-TH/2); ctx.lineTo(x+TW/2,y); ctx.lineTo(x,y+TH/2); ctx.lineTo(x-TW/2,y); ctx.closePath(); ctx.stroke(); ctx.globalAlpha = 1;
    const top = y - 26 + b;
    [[-5,-8,11],[-4,-7,9],[-3,-6,7],[-2,-5,5],[-1,-4,3],[0,-3,1]].forEach(([dx,dy,w])=>{ ctx.fillStyle='#0b1f4d'; ctx.fillRect(x+dx-1,top+dy-1,w+2,2); });
    [[-4,-7,9],[-3,-6,7],[-2,-5,5],[-1,-4,3]].forEach(([dx,dy,w])=>{ ctx.fillStyle='#ffd200'; ctx.fillRect(x+dx,top+dy,w,1); });
    if(!pulseTimer) pulseTimer = setTimeout(()=>{ pulseTimer = 0; present(); }, 50); }
}
export let pulseTimer = 0;
