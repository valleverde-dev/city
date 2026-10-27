import { CFG } from '../core/config.js';
import { residents } from '../core/economy.js';
import { newGame } from '../core/newgame.js';
import { buildMonths } from '../core/rules.js';
import { N, NB, NB8, S, clamp, idx, inside, rc, setSide } from '../core/state.js';
import { worldIndex } from '../core/region.js';
import { LAMPS, WATER } from './anim.js';
import { OX, OY, TH, TW, W, WN, isoOf, isoW, resize, rotateCoord, selected, setCam, setWorld, viewRot } from './camera.js';
import { GROUNDS, ground, ring, riverTile, roadTile, skirt, wedgeTile } from './ground.js';
import { C, hsh } from './pixel.js';
import { ARCH, BUILDINGS, P3, archOf, archW, billboardSprite, colourOf, colourW, cones, fenceSprite, flagSprite, noticeSprite, ruinSprite, siteSprite, spr } from './sprites.js';

// ---------- composing the map ----------
// draw() rebuilds the static layers when the game state changes; compose() paints one frame
// (ground layer + water + things + animated overlays) and runs ~15 times a second while the map is visible.
export let AW = 0, AOX = 0, AH = 0, AOY = 112;
export const art = document.createElement('canvas');
export const gx = art.getContext('2d');
export const groundCv = document.createElement('canvas'), gctx = groundCv.getContext('2d');
let canvasWN = 0;
export let staticKey = '';
export function invalidateStatic(){ staticKey = ''; }
export function setStaticKey(k){ staticKey = k; }
// The art canvases hold the whole world; the view is pointed at the plot in play (the core only knows the grid)
export function setMapSize(){
  const Wn = S && S.world ? S.world.n : CFG.worldN, A = S && S.region && S.region.active;
  setWorld(Wn, A ? A.x : OX, A ? A.y : OY);
  if(canvasWN !== Wn){ AW = Wn*TW + 32; AOX = AW/2; AOY = 112; AH = AOY + (Wn-1)*TH + TH/2 + 20;
    art.width = AW; art.height = AH; groundCv.width = AW; groundCv.height = AH; canvasWN = Wn; }
  staticKey = '';
  if(A){ const [x,y] = isoOf((N-1)/2, (N-1)/2); setCam(x, y); }
  if(W) resize();
}
// Start a run and fit the map canvases to its world
export function startSite(seed, stage){ newGame(seed, stage); setMapSize(); }
// ---------- world coordinates: the plot in play is S.grid, everything else is S.world ----------
// local parcel index of world cell (R,C), or -1 (outside the plot in play, or no plot in play)
export const localAt = (R,C) => { if(!S.region || !S.region.active) return -1; const r = R-OY, c = C-OX; return inside(r,c) ? idx(r,c) : -1; };
export const inW = (R,C) => R>=0 && C>=0 && R<WN && C<WN;
export const codeW = (R,C) => inW(R,C) ? S.world.cells[R*WN + C] : null;
export const roadCode = x => x==='road' || x==='regional';
export function roadW(R,C){ const i = localAt(R,C); if(i>=0){ const q = S.grid[i]; return q.ty==='road' && (q.st==='built' || q.k==='regional'); } return roadCode(codeW(R,C)); }
export function floodW(R,C){ const i = localAt(R,C); if(i>=0) return S.grid[i].k==='flood'; return codeW(R,C)==='flood'; }
// Looks come from the WORLD cell and the run seed, so a parcel looks the same before, during and after its settlement
export const variantW = (wi, n) => Math.floor(hsh(wi, S.runSeed & 0xffff, 77) * n);
export const variant = (i, n) => variantW(worldIndex(i), n);
// Which screen directions (NE/SE/SW/NW bits) connect to a matching neighbour, in the current rotation (world coordinates)
export function connMask(R,C,match,offMap,diag){ const [r2,c2]=rotateCoord(R,C,viewRot); let m=0;
  for(const [dr,dc] of (diag ? NB8 : NB)){ const nr=R+dr, nc=C+dc; const ok = inW(nr,nc) ? match(nr,nc) : offMap(dr,dc); if(!ok) continue;
    if(dr && dc && ((inW(R+dr,C) && match(R+dr,C)) || (inW(R,C+dc) && match(R,C+dc)))) continue;   // already joined around the corner
    const [nr2,nc2] = rotateCoord(nr,nc,viewRot), d2r = nr2-r2, d2c = nc2-c2;
    m |= (d2r===-1&&d2c===0) ? 1 : (d2r===0&&d2c===1) ? 2 : (d2r===1&&d2c===0) ? 4 : (d2r===0&&d2c===-1) ? 8
       : (d2r===-1&&d2c===-1) ? 16 : (d2r===-1&&d2c===1) ? 32 : (d2r===1&&d2c===1) ? 64 : 128; }
  return m; }
export function wedgeMask(R,C){ const [r2,c2]=rotateCoord(R,C,viewRot);
  const Q = (a,b)=>{ if(!inW(a,b)) return false; const [o0,o1]=rotateCoord(a,b,4-viewRot); return roadW(o0,o1); };
  if(Q(r2,c2)) return 0; let m=0;
  if(Q(r2-1,c2)&&Q(r2,c2-1)&&!Q(r2-1,c2-1)) m|=1;
  if(Q(r2-1,c2)&&Q(r2,c2+1)&&!Q(r2-1,c2+1)) m|=2;
  if(Q(r2+1,c2)&&Q(r2,c2+1)&&!Q(r2+1,c2+1)) m|=4;
  if(Q(r2,c2-1)&&Q(r2+1,c2)&&!Q(r2+1,c2-1)) m|=8;
  return m; }
const offRoad = (dr,dc) => true;    // roads and the river run on past the edge of the world
export function groundKey(i){
  const p = S.grid[i], R = OY+Math.floor(i/N), Cc = OX+i%N;
  if(p.ty==='road' && (p.st==='built' || p.k==='regional')){
    const m = connMask(R,Cc,roadW, (dr,dc)=> p.k==='regional', true);
    return ['road'+m+(p.k==='regional'?'R':''), ()=>roadTile(m, p.k==='regional')]; }
  if(p.st==='built' && p.ty){ const A = archOf(i, p.ty), g = A.ground || {housing:'plaza', clinic:'plaza', factory:'yard', school:'school', park:'park'}[p.ty], v=variant(i,3);
    return [g+v, ()=>GROUNDS[g](v)]; }
  if(p.st==='building' || p.st==='approved' || p.st==='private' || p.st==='ruin'){ const v=variant(i,3); return ['earth'+v, ()=>GROUNDS.earth(v)]; }
  if((p.st==='owned' || p.st==='review') && p.urban){ const v=variant(i,3); return ['serviced'+v, ()=>GROUNDS.serviced(v)]; }
  if(p.k==='flood'){ const m = connMask(R,Cc,floodW, offRoad);
    return ['river'+m, ()=>riverTile(m)]; }
  if(p.k==='farm'){ const v=variant(i,4), o=(variant(i+500,2)+viewRot)%2; return ['farm'+v+o, ()=>GROUNDS.farm(v+4*o,o)]; }
  const v = variant(i,3); const g = {muni:'muni', habitat:'habitat', village:'village', regional:'grass'}[p.k] || 'grass';
  return [g+v, ()=>GROUNDS[g](v)];
}
export const gblit = (s, ix, iy) => gctx.drawImage(s.c, AOX + ix - s.ox, AOY + iy - s.oy);
export function drawTile(i){
  const p = S.grid[i], r=Math.floor(i/N), c=i%N, [x,y] = isoOf(r,c), [r2,c2] = rotateCoord(r+OY,c+OX,viewRot);
  const [k, make] = groundKey(i); gblit(spr('g:'+k, make), x, y);
  const wm = wedgeMask(r+OY,c+OX); if(wm) gblit(spr('wedge'+wm, ()=>wedgeTile(wm)), x, y);
  if(r2===WN-1) gblit(spr('skirtL', ()=>skirt('L')), x, y);
  if(c2===WN-1) gblit(spr('skirtR', ()=>skirt('R')), x, y);
  const over = [];
  if(p.st==='owned' || p.st==='review' || p.st==='approved') over.push(spr('ringOwned', ()=>ring(C('#1d3c78'),0.05,true)));
  if(i===selected) over.push(spr('ringSel', ()=>ring(C('#ffd23f'),0.06,false)));
  over.forEach(s=>gblit(s, x, y));
  if(k.startsWith('river')) WATER.push({x, y, m:k.slice(5)|0, over});
}
// Everything that stands on parcel i: its sprite, animated effects, traffic, people, animals
export function planThing(i){
  const p = S.grid[i], [r,c] = rc(i), [x,y] = isoOf(r,c), [r2,c2] = rotateCoord(r+OY,c+OX,viewRot);
  const E = {i, x, y, s:null, fx:[], walk:null, kids:false, cars:null, lamp:null, sheep:0, toad:false, crane:null};
  if(p.k==='habitat'){ const v=variant(i,4); E.s = spr('habitat'+v, ()=>BUILDINGS.habitat(v)); E.toad = hsh(i, S.seed&0xffff, 5) < 0.6; return E; }
  if(p.k==='village'){ const v = variant(i,4);
    E.s = spr('village'+v, ()=>BUILDINGS.village(v)); E.walk = [[-0.4,0.44,0.1,0.44]]; return E; }
  if(p.ty==='road' && (p.st==='built' || p.k==='regional')){
    const reg = p.k==='regional', m = connMask(r+OY,c+OX,roadW,(dr,dc)=> reg, true);
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

// ---------- the rest of the world: open country (veiled: not yours yet) and the consolidated region ----------
export const VEIL = 0.42, veil = () => spr('veil', ()=>ground(()=>C('#1d3c78')));
const GROUND_OF = {housing:'plaza', clinic:'plaza', factory:'yard', school:'school', park:'park', village:'village', habitat:'habitat', muni:'muni'};
export let OWNER = null;   // per world cell: index of the consolidated settlement it belongs to, or -1
export function computeOwner(){ OWNER = new Int16Array(WN*WN).fill(-1);
  S.region.blocks.forEach((B,k)=>{ for(let y=B.y;y<B.y+B.n;y++) for(let x=B.x;x<B.x+B.n;x++) if(inW(y,x)) OWNER[y*WN+x] = k; }); }
export function drawWorldTile(wi, water){
  const R = Math.floor(wi/WN), Cc = wi%WN, code = S.world.cells[wi], [x,y] = isoW(R,Cc), [r2,c2] = rotateCoord(R,Cc,viewRot), v = variantW(wi,3);
  let s, k = '';
  if(roadCode(code)){ const m = connMask(R,Cc,roadW,(dr,dc)=>code==='regional',true); k = 'road'+m+(code==='regional'?'R':''); s = spr('g:'+k, ()=>roadTile(m, code==='regional')); }
  else if(code==='flood'){ const m = connMask(R,Cc,floodW,offRoad); k = 'river'+m; s = spr('g:'+k, ()=>riverTile(m)); }
  else if(code==='farm'){ const v4 = variantW(wi,4), o = (variantW(wi+500,2)+viewRot)%2; s = spr('g:farm'+v4+o, ()=>GROUNDS.farm(v4+4*o,o)); }
  else if(ARCH[code]){ const A = archW(wi, code), g = A.ground || GROUND_OF[code]; s = spr('g:'+g+v, ()=>GROUNDS[g](v)); }
  else { const g = GROUND_OF[code] || 'grass'; s = spr('g:'+g+v, ()=>GROUNDS[g](v)); }
  gblit(s, x, y);
  const wm = wedgeMask(R,Cc); if(wm) gblit(spr('wedge'+wm, ()=>wedgeTile(wm)), x, y);
  if(r2===WN-1) gblit(spr('skirtL', ()=>skirt('L')), x, y);
  if(c2===WN-1) gblit(spr('skirtR', ()=>skirt('R')), x, y);
  const wild = OWNER[wi] < 0;
  if(wild){ gctx.globalAlpha = VEIL; gblit(veil(), x, y); gctx.globalAlpha = 1; }   // open country: not yours (yet)
  if(k.startsWith('river')) water.push({x, y, m:k.slice(5)|0, over:[], veil:wild});
}
export function worldThing(wi){
  const R = Math.floor(wi/WN), Cc = wi%WN, code = S.world.cells[wi], [x,y] = isoW(R,Cc), [r2,c2] = rotateCoord(R,Cc,viewRot);
  const E = {i:-1-wi, x, y, s:null, fx:[], walk:null, kids:false, cars:null, lamp:null, sheep:0, toad:false, crane:null, ghost: OWNER[wi] < 0};
  if(ARCH[code]){ const A = archW(wi, code), v = colourW(wi);
    E.s = spr(code+':'+A.id+':'+v, ()=>A.make(v)); E.fx = typeof A.fx==='function' ? A.fx(v) : (A.fx || []); E.walk = A.walk || null; E.kids = !!A.kids; }
  else if(code==='village'){ const v = variantW(wi,4); E.s = spr('village'+v, ()=>BUILDINGS.village(v)); }
  else if(code==='habitat'){ const v = variantW(wi,4); E.s = spr('habitat'+v, ()=>BUILDINGS.habitat(v)); }
  else if(code==='muni'){ E.s = spr('flag', flagSprite); }
  else if(roadCode(code)){ const reg = code==='regional', m = connMask(R,Cc,roadW,(dr,dc)=>reg,true), A = (m&2) && (m&8), Bx = (m&1) && (m&4);
    if(A !== Bx) E.cars = {axis: A ? 'A' : 'B', k: A ? c2 : r2, line: A ? r2 : c2, reg, dens: reg ? 0.42 : 0.25}; }
  else if(code==='farm' && variantW(wi,4)===1 && hsh(wi, S.runSeed&0xffff, 21) < 0.4) E.sheep = 2 + Math.floor(hsh(wi,S.runSeed&0xffff,22)*3);
  return E;
}
