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
// Setters for the view state, for the UI modules
export function setSelected(i){ selected = i; }
export function setViewRot(r){ viewRot = r; }
export function setZoom(z){ zoom = z; }
export function setCam(x, y){ MAPCX = x; MAPCY = y; }
export function rotateCoord(r,c,steps){ let rr=r, cc=c; for(let i=0;i<((steps%4+4)%4);i++){ const nr=cc, nc=N-1-rr; rr=nr; cc=nc; } return [rr,cc]; }
// Snap the zoom so one art pixel covers a whole number of device pixels: crisp, even pixels.
export function scale(){ const k = dpr*fit*zoom; const q = k>=1.5 ? Math.floor(k+0.4) : k; return q/dpr; }
export function isoOf(r,c){ const [r2,c2] = rotateCoord(r,c,viewRot); return [(c2-r2)*TW/2, (c2+r2)*TH/2]; }
// Camera: the iso point shown at the centre of the screen. Dragging / WASD move it; it is clamped to the map.
export let MAPCX = 0, MAPCY = (N-1)*TH/2 - 12;
export function clampCam(){
  const mw = N*TW/2, top = -TH/2 - 40, bot = (N-1)*TH + TH/2 + 10;
  MAPCX = clamp(MAPCX, -mw, mw); MAPCY = clamp(MAPCY, top, bot);
}
export function centreOn(i){ const [x,y] = isoOf(...rc(i)); MAPCX = x; MAPCY = y; clampCam(); }
export function zoomLimits(){ return [0.8, Math.max(1.2, 4.5/Math.max(fit, 0.01))]; }
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
export function tileAt(sx,sy){
  const s=scale(), ix=(sx-W/2)/s+MAPCX, iy=(sy-H/2)/s+MAPCY;
  const u = ix/(TW/2), v = iy/(TH/2);
  const c2 = Math.round((u+v)/2), r2 = Math.round((v-u)/2);
  if(!inside(r2,c2)) return -1;
  const [r,c] = rotateCoord(r2,c2,4-viewRot);
  return idx(r,c);
}
export function resize(){
  const rc = worldEl.getBoundingClientRect(); dpr = window.devicePixelRatio||1;
  W = rc.width; H = rc.height;
  cvs.width = Math.max(1,Math.round(W*dpr)); cvs.height = Math.max(1,Math.round(H*dpr));
  cvs.style.width = W+'px'; cvs.style.height = H+'px';
  fit = Math.min((W-24)/(N*TW), (H-60)/(N*TH+60), 3.5);
  clampCam(); draw();
}
