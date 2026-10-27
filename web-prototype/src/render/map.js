import { CFG } from '../core/config.js';
import { residents } from '../core/economy.js';
import { newGame } from '../core/newgame.js';
import { buildMonths } from '../core/rules.js';
import { N, NB, NB8, S, clamp, idx, inside, rc, setSide } from '../core/state.js';
import { frontAt } from '../core/region.js';
import { LAMPS, WATER } from './anim.js';
import { TH, TW, W, isoOf, resize, rotateCoord, selected, setCam, viewRot } from './camera.js';
import { GROUNDS, ground, ring, riverTile, roadTile, skirt, wedgeTile } from './ground.js';
import { C, hsh } from './pixel.js';
import { ARCH, BUILDINGS, P3, archOf, billboardSprite, colourOf, cones, fenceSprite, flagSprite, noticeSprite, ruinSprite, siteSprite, spr } from './sprites.js';

// ---------- composing the map ----------
// draw() rebuilds the static layers when the game state changes; compose() paints one frame
// (ground layer + water + things + animated overlays) and runs ~15 times a second while the map is visible.
export let AW = 0, AOX = 0, AH = 0, AOY = 112;
export const art = document.createElement('canvas');
export const gx = art.getContext('2d');
export const groundCv = document.createElement('canvas'), gctx = groundCv.getContext('2d');
// Change the map side (a new settlement): resize the art canvas, reset the camera.
// The canvas keeps a one-parcel ring around the map for the consolidated neighbours (the frontier strip).
export function setMapSize(n){
  setSide(n); AW = (N+2)*TW + 32; AOX = AW/2; AOY = 112 + TH; AH = AOY + N*TH + TH/2 + 20;
  art.width = AW; art.height = AH; groundCv.width = AW; groundCv.height = AH; setCam(0, (N-1)*TH/2 - 12);
  if(W) resize();
}
// Start a level and fit the map canvases to its size (the core only knows the grid, not the canvas)
export function startSite(seed, stage){ newGame(seed, stage); setMapSize(N); }
setMapSize(N);
export const variant = (i, n) => Math.floor(hsh(i, S.seed & 0xffff, 77) * n);
export const isRoadAt = (r,c) => inside(r,c) && (()=>{ const q=S.grid[idx(r,c)]; return q.ty==='road' && (q.st==='built' || q.k==='regional'); })();
// Which screen directions (NE/SE/SW/NW bits) connect to a matching neighbour, in the current rotation
export function connMask(r,c,match,offMap,diag){ const [r2,c2]=rotateCoord(r,c,viewRot); let m=0;
  for(const [dr,dc] of (diag ? NB8 : NB)){ const nr=r+dr, nc=c+dc; const ok = inside(nr,nc) ? match(nr,nc) : offMap(dr,dc); if(!ok) continue;
    if(dr && dc && ((inside(r+dr,c) && match(r+dr,c)) || (inside(r,c+dc) && match(r,c+dc)))) continue;   // already joined around the corner
    const [nr2,nc2] = rotateCoord(nr,nc,viewRot), d2r = nr2-r2, d2c = nc2-c2;
    m |= (d2r===-1&&d2c===0) ? 1 : (d2r===0&&d2c===1) ? 2 : (d2r===1&&d2c===0) ? 4 : (d2r===0&&d2c===-1) ? 8
       : (d2r===-1&&d2c===-1) ? 16 : (d2r===-1&&d2c===1) ? 32 : (d2r===1&&d2c===1) ? 64 : 128; }
  return m; }
export function wedgeMask(r,c){ const [r2,c2]=rotateCoord(r,c,viewRot);
  const R = (a,b)=>{ if(!inside(a,b)) return false; const [o0,o1]=rotateCoord(a,b,4-viewRot); return isRoadAt(o0,o1); };
  if(R(r2,c2)) return 0; let m=0;
  if(R(r2-1,c2)&&R(r2,c2-1)&&!R(r2-1,c2-1)) m|=1;
  if(R(r2-1,c2)&&R(r2,c2+1)&&!R(r2-1,c2+1)) m|=2;
  if(R(r2+1,c2)&&R(r2,c2+1)&&!R(r2+1,c2+1)) m|=4;
  if(R(r2,c2-1)&&R(r2+1,c2)&&!R(r2+1,c2-1)) m|=8;
  return m; }
export function groundKey(i){
  const p = S.grid[i], r=Math.floor(i/N), c=i%N;
  if(p.ty==='road' && (p.st==='built' || p.k==='regional')){
    const m = connMask(r,c,isRoadAt, (dr,dc)=> p.k==='regional' && offAxis(dr,dc), true);
    return ['road'+m+(p.k==='regional'?'R':''), ()=>roadTile(m, p.k==='regional')]; }
  if(p.st==='built' && p.ty){ const A = archOf(i, p.ty), g = A.ground || {housing:'plaza', clinic:'plaza', factory:'yard', school:'school', park:'park'}[p.ty], v=variant(i,3);
    return [g+v, ()=>GROUNDS[g](v)]; }
  if(p.st==='building' || p.st==='approved' || p.st==='private' || p.st==='ruin'){ const v=variant(i,3); return ['earth'+v, ()=>GROUNDS.earth(v)]; }
  if((p.st==='owned' || p.st==='review') && p.urban){ const v=variant(i,3); return ['serviced'+v, ()=>GROUNDS.serviced(v)]; }
  if(p.k==='flood'){ const m = connMask(r,c,(nr,nc)=>S.grid[idx(nr,nc)].k==='flood', (dr,dc)=>true);
    return ['river'+m, ()=>riverTile(m)]; }
  if(p.k==='farm'){ const v=variant(i,4), o=(variant(i+500,2)+viewRot)%2; return ['farm'+v+o, ()=>GROUNDS.farm(v+4*o,o)]; }
  const v = variant(i,3); const g = {muni:'muni', habitat:'habitat', village:'village', regional:'grass'}[p.k] || 'grass';
  return [g+v, ()=>GROUNDS[g](v)];
}
// The regional road leaves the map along its own axis (a column, or a row once the site is turned)
export const offAxis = (dr,dc) => S.roadAxis==='row' ? dr===0 : dc===0;
export const gblit = (s, ix, iy) => gctx.drawImage(s.c, AOX + ix - s.ox, AOY + iy - s.oy);
export function drawTile(i){
  if(i < 0) return drawGhostTile(-1-i);
  const p = S.grid[i], r=Math.floor(i/N), c=i%N, [x,y] = isoOf(r,c), [r2,c2] = rotateCoord(r,c,viewRot);
  const [k, make] = groundKey(i); gblit(spr('g:'+k, make), x, y);
  const wm = wedgeMask(r,c); if(wm) gblit(spr('wedge'+wm, ()=>wedgeTile(wm)), x, y);
  if(r2===N-1) gblit(spr('skirtL', ()=>skirt('L')), x, y);
  if(c2===N-1) gblit(spr('skirtR', ()=>skirt('R')), x, y);
  const over = [];
  if(p.st==='owned' || p.st==='review' || p.st==='approved') over.push(spr('ringOwned', ()=>ring(C('#1d3c78'),0.05,true)));
  if(i===selected) over.push(spr('ringSel', ()=>ring(C('#ffd23f'),0.06,false)));
  over.forEach(s=>gblit(s, x, y));
  if(k.startsWith('river')) WATER.push({x, y, m:k.slice(5)|0, over});
}
// Everything that stands on parcel i: its sprite, animated effects, traffic, people, animals
export function planThing(i){
  if(i < 0) return ghostThing(-1-i);
  const p = S.grid[i], [r,c] = rc(i), [x,y] = isoOf(r,c), [r2,c2] = rotateCoord(r,c,viewRot);
  const E = {i, x, y, s:null, fx:[], walk:null, kids:false, cars:null, lamp:null, sheep:0, toad:false, crane:null};
  if(p.k==='habitat'){ const v=variant(i,4); E.s = spr('habitat'+v, ()=>BUILDINGS.habitat(v)); E.toad = hsh(i, S.seed&0xffff, 5) < 0.6; return E; }
  if(p.k==='village'){ const first = S.grid.findIndex(q=>q.k==='village'); const v = i===first ? 0 : 1+variant(i,3);
    E.s = spr('village'+v, ()=>BUILDINGS.village(v)); E.walk = [[-0.4,0.44,0.1,0.44]]; return E; }
  if(p.ty==='road' && (p.st==='built' || p.k==='regional')){
    const reg = p.k==='regional', m = connMask(r,c,isRoadAt,(dr,dc)=> reg && offAxis(dr,dc), true);
    const A = (m&2) && (m&8), Bx = (m&1) && (m&4);
    if(A !== Bx){ const axis = A ? 'A' : 'B', fill = clamp(residents()/Math.max(1,CFG.target), 0, 1);
      E.cars = {axis, k: A ? c2 : r2, line: A ? r2 : c2, reg, dens: reg ? 0.42 : 0.1 + 0.42*fill};
      if(!reg && (r2+c2)%2===0){ E.lamp = A ? P3(0,-0.33) : P3(-0.33,0); LAMPS.push([x+E.lamp[0], y+E.lamp[1]]); } }
    return E; }
  if(p.st==='built' && p.ty){ const A = archOf(i, p.ty), v = colourOf(i);
    E.s = spr(p.ty+':'+A.id+':'+v, ()=>A.make(v)); E.fx = typeof A.fx==='function' ? A.fx(v) : (A.fx || []); E.walk = A.walk || null; E.kids = !!A.kids; return E; }
  if(p.k==='farm' && p.st==='land' && variant(i,4)===1 && hsh(i, S.seed&0xffff, 21) < 0.7){ E.sheep = 2 + Math.floor(hsh(i,S.seed&0xffff,22)*3); return E; }
  if(p.k==='muni' && p.st==='land'){ E.s = spr('flag', flagSprite); E.fx = [{k:'flag', x:0, y:-13, c:['#1d3c78','#ffffff']}]; }
  if(p.st==='review') E.s = spr('notice', noticeSprite);
  if(p.st==='ruin'){ E.s = spr('ruin', ruinSprite); return E; }
  if(p.st==='private'){
    if(p.dev.phase==='permit'){ E.s = spr('billboard', billboardSprite); return E; }
    const hh = 6 + Math.round(clamp(1 - p.dev.t/5, 0, 1)*5)*5, cc = variant(i+7,3); E.s = spr('site'+hh+'_'+cc, ()=>siteSprite(hh,cc)); E.crane = hh; return E; }
  if(p.st==='approved') E.s = spr('fence', fenceSprite);
  if(p.st==='building'){
    if(p.ty==='road'){ E.s = spr('cones', cones); return E; }
    const prog = 1 - p.t/buildMonths(p.ty), hh = 6 + Math.round(prog*5)*5, cc = variant(i+7,3);
    E.s = spr('site'+hh+'_'+cc, ()=>siteSprite(hh,cc)); E.crane = hh; }
  return E;
}

// ---------- the frontier strip: the consolidated neighbours along the border, drawn a little dimmer ----------
const GHOST_G = {housing:'plaza', clinic:'plaza', factory:'yard', school:'school', park:'park', village:'village', habitat:'habitat', muni:'muni'};
const roadCode = x => x==='road' || x==='regional';
// Is there a road / water at local (r,c), on the map or across the border?
const roadAt = (r,c) => inside(r,c) ? isRoadAt(r,c) : roadCode(frontAt(r,c));
const waterAt = (r,c) => inside(r,c) ? S.grid[idx(r,c)].k==='flood' : frontAt(r,c)==='flood';
const anyAt = (r,c) => inside(r,c) || frontAt(r,c)!==null;
// 4-way connection mask in screen directions (1 NE · 2 SE · 4 SW · 8 NW), like connMask
function mask4(r,c,match){ const [r2,c2]=rotateCoord(r,c,viewRot); let m=0;
  for(const [dr,dc] of NB){ if(!match(r+dr,c+dc)) continue; const [nr2,nc2] = rotateCoord(r+dr,c+dc,viewRot), d2r = nr2-r2, d2c = nc2-c2;
    m |= (d2r===-1) ? 1 : (d2c===1) ? 2 : (d2r===1) ? 4 : 8; }
  return m; }
const ghostSeed = f => (f.r*131 + f.c*17 + f.b*7919) & 0xffff;
export function drawGhostTile(k){
  const f = S.frontier[k], x0 = f.x, [x,y] = isoOf(f.r,f.c), v = Math.floor(hsh(ghostSeed(f), S.runSeed & 0xffff, 77)*3);
  let s;
  if(roadCode(x0)){ const m = mask4(f.r,f.c,roadAt); s = spr('g:road'+m+(x0==='regional'?'R':''), ()=>roadTile(m, x0==='regional')); }
  else if(x0==='flood'){ const m = mask4(f.r,f.c,waterAt); s = spr('g:river'+m, ()=>riverTile(m)); }
  else if(x0==='farm'){ const o = (v+viewRot)%2; s = spr('g:farm'+v+o, ()=>GROUNDS.farm(v+4*o,o)); }
  else { const g = GHOST_G[x0] || 'grass'; s = spr('g:'+g+v, ()=>GROUNDS[g](v)); }
  gblit(s, x, y);
  // the earth slab where the strip itself ends
  const [r2,c2] = rotateCoord(f.r,f.c,viewRot), back = (a,b)=>{ const [o0,o1]=rotateCoord(a,b,4-viewRot); return anyAt(o0,o1); };
  if(!back(r2+1,c2)) gblit(spr('skirtL', ()=>skirt('L')), x, y);
  if(!back(r2,c2+1)) gblit(spr('skirtR', ()=>skirt('R')), x, y);
  gctx.globalAlpha = 0.22; gblit(spr('ghostVeil', ()=>ground(()=>C('#1d3c78'))), x, y); gctx.globalAlpha = 1;   // "not yours": a navy veil
}
export function ghostThing(k){
  const f = S.frontier[k], [x,y] = isoOf(f.r,f.c), sd = ghostSeed(f);
  const E = {i:-1-k, x, y, s:null, fx:[], walk:null, kids:false, cars:null, lamp:null, sheep:0, toad:false, crane:null, ghost:true};
  const L = ARCH[f.x];
  if(L){ const A = L[Math.floor(hsh(sd, S.runSeed & 0xffff, 913)*L.length)], v = Math.floor(hsh(sd, S.runSeed & 0xffff, 414)*6);
    E.s = spr(f.x+':'+A.id+':'+v, ()=>A.make(v)); E.fx = typeof A.fx==='function' ? A.fx(v) : (A.fx || []); }
  else if(f.x==='village'){ const v = 1 + Math.floor(hsh(sd, 3, 9)*3); E.s = spr('village'+v, ()=>BUILDINGS.village(v)); }
  else if(f.x==='habitat'){ const v = Math.floor(hsh(sd, 4, 9)*4); E.s = spr('habitat'+v, ()=>BUILDINGS.habitat(v)); }
  return E;
}
