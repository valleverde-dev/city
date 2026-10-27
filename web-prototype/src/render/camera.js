import { N, clamp, idx, inside, rc } from '../core/state.js';
import { draw, present } from './anim.js';
import { $ } from '../ui/dom.js';

// =====================================================================
//  RENDERING — isometric pixel art. Every sprite is painted pixel by pixel
//  at native resolution (64×32 tiles) into small canvases, cached, composed
//  into one low-res "art" canvas and blown up with nearest-neighbour scaling.
// =====================================================================
export const TW = 64, TH = 32;   // tile size in art pixels (isometric 2:1)
export const worldEl = document.getElementById('world');
export const cvs = document.getElementById('map'), ctx = cvs.getContext('2d');
export let viewRot = 0, zoom = 1, fit = 1, dpr = 1, W = 0, H = 0, selected = -1;
// The map is the whole world (WN×WN parcels); the settlement in play is the plot at (OX, OY).
// Rendering works in WORLD coordinates (R, C); the rules and the UI use LOCAL parcel indexes of the plot.
export let WN = 48, OX = 0, OY = 0;
export function setWorld(n, ox, oy){ WN = n; OX = ox; OY = oy; }
// While choosing the next plot: which of the plots on offer is selected (-1: none)
export let attachSel = -1;
export function setAttachSel(k){ attachSel = k; }
// Point the camera at a world rectangle and zoom so it fits the free part of the screen
// left / bottom: screen pixels covered by an open sheet (the box is fitted into the rest)
export function frameBox(x0, y0, x1, y1, left = 0, bottom = 0){
  const pts = [[y0,x0],[y0,x1],[y1,x1],[y1,x0]].map(([R,C])=>isoW(R,C)), xs = pts.map(p=>p[0]), ys = pts.map(p=>p[1]);
  const w = Math.max(...xs)-Math.min(...xs)+TW, h = Math.max(...ys)-Math.min(...ys)+TH*3;
  zoom = clamp(Math.min((W-left-40)/w, (H-bottom-40)/h)/Math.max(fit,0.01), ...zoomLimits());
  const s = scale();
  MAPCX = (Math.max(...xs)+Math.min(...xs))/2 - left/2/s; MAPCY = (Math.max(...ys)+Math.min(...ys))/2 + bottom/2/s; clampCam(); }
// Setters for the view state, for the UI modules
export function setSelected(i){ selected = i; }
export function setViewRot(r){ viewRot = r; }
export function setZoom(z){ zoom = z; }
export function setCam(x, y){ MAPCX = x; MAPCY = y; }
// Turn WORLD coordinates by quarter turns (the view rotation)
export function rotateCoord(R,C,steps){ let rr=R, cc=C; for(let i=0;i<((steps%4+4)%4);i++){ const nr=cc, nc=WN-1-rr; rr=nr; cc=nc; } return [rr,cc]; }
export function isoW(R,C){ const [r2,c2] = rotateCoord(R,C,viewRot); return [(c2-r2)*TW/2, (c2+r2)*TH/2]; }
// Snap the zoom so one art pixel covers a whole number of device pixels: crisp, even pixels.
export function scale(){ const k = dpr*fit*zoom; const q = k>=1.5 ? Math.floor(k+0.4) : k; return q/dpr; }
export function isoOf(r,c){ return isoW(r+OY, c+OX); }   // a parcel of the settlement in play (local coordinates)
// Camera: the iso point shown at the centre of the screen. Dragging / WASD move it; it is clamped to the map.
export let MAPCX = 0, MAPCY = 0;
export function clampCam(){
  const mw = WN*TW/2, top = -TH/2 - 40, bot = (WN-1)*TH + TH/2 + 10;
  MAPCX = clamp(MAPCX, -mw, mw); MAPCY = clamp(MAPCY, top, bot);
}
export function centreOn(i){ const [x,y] = isoOf(...rc(i)); MAPCX = x; MAPCY = y; clampCam(); }
// You can zoom out until the whole world fits, and in until tiles are big
export function zoomLimits(){ const all = Math.min((W-24)/(WN*TW), (H-40)/(WN*TH)) / Math.max(fit, 0.01);
  return [Math.max(0.05, Math.min(0.8, all)), Math.max(1.2, 4.5/Math.max(fit, 0.01))]; }
export function defaultZoom(){ return clamp(Math.max(1, 46/(TW*fit)), ...zoomLimits()); }     // tiles at least ~46px wide
// Zoom keeping the point under (sx,sy) in place (wheel, pinch, keys)
export function zoomAt(z, sx=W/2, sy=H/2){
  const s0 = scale(), ix = (sx-W/2)/s0 + MAPCX, iy = (sy-H/2)/s0 + MAPCY;
  zoom = clamp(z, ...zoomLimits());
  const s1 = scale(); MAPCX = ix - (sx-W/2)/s1; MAPCY = iy - (sy-H/2)/s1; clampCam(); present();
}
// Move the camera so parcel i is not hidden behind the open sheet
export function keepVisible(i){
  const sh = $('sheet'); if(sh.hidden) return;
  const wr = worldEl.getBoundingClientRect(), sr = sh.getBoundingClientRect(), [sx, sy] = toScreen(...isoOf(...rc(i)));
  const px = wr.left + sx, py = wr.top + sy, wide = sr.width < wr.width*0.8;
  if(!wide && py > sr.top - 40){ const freeMid = wr.top + (sr.top - wr.top)/2; panBy(0, freeMid - py); }
  if(wide && px < sr.right + 40){ const freeMid = sr.right + (wr.right - sr.right)/2; panBy(freeMid - px, 0); }
}
export function panBy(dx, dy){ const s = scale(); MAPCX -= dx/s; MAPCY -= dy/s; clampCam(); present(); }
export function toScreen(ix,iy){ const s=scale(); return [W/2 + (ix-MAPCX)*s, H/2 + (iy-MAPCY)*s]; }
// The world cell under a screen point: [R, C], or null off the world
export function tileAtW(sx,sy){
  const s=scale(), ix=(sx-W/2)/s+MAPCX, iy=(sy-H/2)/s+MAPCY;
  const u = ix/(TW/2), v = iy/(TH/2);
  const c2 = Math.round((u+v)/2), r2 = Math.round((v-u)/2);
  if(r2<0 || c2<0 || r2>=WN || c2>=WN) return null;
  return rotateCoord(r2,c2,4-viewRot);
}
// The parcel of the settlement in play under a screen point, or -1
export function tileAt(sx,sy){
  const w = tileAtW(sx,sy); if(!w) return -1;
  const r = w[0]-OY, c = w[1]-OX;
  return inside(r,c) ? idx(r,c) : -1;
}
export function resize(){
  const rc = worldEl.getBoundingClientRect(); dpr = window.devicePixelRatio||1;
  W = rc.width; H = rc.height;
  cvs.width = Math.max(1,Math.round(W*dpr)); cvs.height = Math.max(1,Math.round(H*dpr));
  cvs.style.width = W+'px'; cvs.style.height = H+'px';
  fit = Math.min((W-24)/(N*TW), (H-60)/(N*TH+60), 3.5);
  clampCam(); draw();
}
