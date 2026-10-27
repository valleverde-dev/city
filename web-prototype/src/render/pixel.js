import { clamp } from '../core/state.js';

// ---------- pixel toolkit ----------
export const C = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
export const sh = (c,f) => [clamp(Math.round(c[0]*f),0,255), clamp(Math.round(c[1]*f),0,255), clamp(Math.round(c[2]*f),0,255)];
export const BAYER = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
export const dith = (x,y) => (BAYER[(y&3)*4+(x&3)]+0.5)/16;
export function hsh(x,y,s){ let h = (Math.imul(x|0,374761393) + Math.imul(y|0,668265263) + Math.imul(s|0,1442695041))|0;
  h = Math.imul(h ^ (h>>>13), 1274126177); h ^= h>>>16; return (h>>>0)/4294967296; }
export const frac = x => x - Math.floor(x);
export const PX = {
  grass:C('#7cb342'), grassD:C('#689f38'), grassL:C('#8fc556'), hedge:C('#4a7a2c'),
  lawn:C('#9ccc65'), lawnD:C('#8bbf52'),
  asphalt:C('#5c6066'), asphaltL:C('#666a71'), walk:C('#c4bfb2'), curb:C('#9d978a'), paint:C('#f1efe6'), yellow:C('#f2c230'),
  water:C('#3f93c4'), waterL:C('#5aaedb'), foam:C('#c6ecf7'), bank:C('#cdbb85'), marsh:C('#74ab6e'), reed:C('#4c8236'),
  earth:C('#a87d55'), earthD:C('#8c6544'), earthL:C('#c29a6c'),
  pave:C('#d2cbbb'), paveD:C('#b6ae9c'), cobble:C('#c3b192'),
  soil1:C('#6d4c35'), soil2:C('#8a6446'), soil3:C('#9d9488'),
};
export const CROPS = [
  {base:C('#cfae4c'), row:C('#ab8a30'), hi:C('#e6c866')},   // wheat
  {base:C('#88ba4b'), row:C('#5e8f31'), hi:C('#a3d064')},   // young crop
  {base:C('#9a6b47'), row:C('#7a5135'), hi:C('#b3835c')},   // ploughed
  {base:C('#e0cd3c'), row:C('#b9a42b'), hi:C('#f3e273')},   // rapeseed
];
// Colours that light up at night: window glass (some windows lit, chosen per sprite) and lamps (always lit)
export const GLASS = new Set(), LAMPC = new Set();
export const gl = c => { GLASS.add((c[0]<<16)|(c[1]<<8)|c[2]); return c; };
export const lamp = c => { LAMPC.add((c[0]<<16)|(c[1]<<8)|c[2]); return c; };
export let SPRITE_SEQ = 0;
// One sprite = a small canvas plus the pixel that sits on the tile centre (ox, oy).
// top = how many pixels it rises above (ox, oy); g = its night glow layer (or null); dk = cached night versions.
export function sprite(w,h,ox,oy,paint,outline,late){
  const cv = document.createElement('canvas'); cv.width=w; cv.height=h;
  const g = cv.getContext('2d'), img = g.createImageData(w,h), d = img.data;
  const put = (x,y,c)=>{ if(!c || x<0||y<0||x>=w||y>=h) return; const o=(y*w+x)*4;
    d[o]=c[0]; d[o+1]=c[1]; d[o+2]=c[2]; d[o+3]= c.length>3 ? c[3] : 255; };
  paint({w,h,ox,oy,put});
  if(outline){ // darken the silhouette's border pixels: the classic pixel-art outline
    const solid = i => d[i*4+3] > 200, edge = [];
    for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const i=y*w+x; if(!solid(i)) continue;
      if(x===0||y===0||x===w-1||y===h-1||!solid(i-1)||!solid(i+1)||!solid(i-w)||!solid(i+w)) edge.push(i); }
    edge.forEach(i=>{ const o=i*4; d[o]=d[o]*0.42|0; d[o+1]=d[o+1]*0.42|0; d[o+2]=d[o+2]*0.5|0; });
  }
  // late: thin details painted after the outline, only into empty pixels (they sit behind what is there)
  if(late) late({w,h,ox,oy,put:(x,y,c)=>{ if(x>=0&&y>=0&&x<w&&y<h&&d[(y*w+x)*4+3]===0) put(x,y,c); }});
  g.putImageData(img,0,0);
  let first = oy, glow = null; const seq = ++SPRITE_SEQ, key = o => (d[o]<<16)|(d[o+1]<<8)|d[o+2];
  find: for(let y=0;y<h;y++) for(let x=0;x<w;x++) if(d[(y*w+x)*4+3] > 0){ first = y; break find; }
  for(let y=0;y<h;y++) for(let x=0;x<w;x++){ const o=(y*w+x)*4; if(d[o+3] < 200) continue; const k = key(o);
    const isLamp = LAMPC.has(k), isGlass = !isLamp && GLASS.has(k); if(!isLamp && !isGlass) continue;
    if(isGlass && hsh(Math.floor(x/3), Math.floor(y/4), seq*7+3) > 0.62) continue;
    if(!glow) glow = g.createImageData(w,h);
    const above = isGlass && y>0 && GLASS.has(key(o-w*4)), c = isLamp ? [255,242,176] : above ? [255,204,104] : [255,234,160];
    glow.data[o]=c[0]; glow.data[o+1]=c[1]; glow.data[o+2]=c[2]; glow.data[o+3]=255; }
  let gc = null; if(glow){ gc = document.createElement('canvas'); gc.width=w; gc.height=h; gc.getContext('2d').putImageData(glow,0,0); }
  return {c:cv, ox, oy, top: oy - first, g: gc, dk: []};
}
// Iso geometry inside a sprite. a runs to screen lower-right, b to lower-left; a tile is a,b ∈ [-0.5,0.5).
export function eachPx(e, fn){ for(let y=0;y<e.h;y++) for(let x=0;x<e.w;x++) fn(x, y, x+0.5-e.ox, y+0.5-e.oy); }
// Vertical face at b = const, seen on the left (s = px along the face, z = px up)
export function faceB(e,b,a0,a1,z0,z1,fn){ eachPx(e,(x,y,dx,dy)=>{ const a=dx/32+b; if(a<a0||a>=a1) return;
  const z=(a+b)*16-dy; if(z<z0||z>=z1) return; e.put(x,y,fn((a-a0)*32, z-z0, x, y, a)); }); }
// Vertical face at a = const, seen on the right
export function faceA(e,a,b0,b1,z0,z1,fn){ eachPx(e,(x,y,dx,dy)=>{ const b=a-dx/32; if(b<b0||b>=b1) return;
  const z=(a+b)*16-dy; if(z<z0||z>=z1) return; e.put(x,y,fn((b-b0)*32, z-z0, x, y, b)); }); }
// Plane z = z0 + ka·a + kb·b over a rectangle (flat tops and roof slopes)
export function plane(e,a0,a1,b0,b1,z0,ka,kb,fn){ eachPx(e,(x,y,dx,dy)=>{
  const b=(dy - dx/2 + z0 + ka*dx/32)/(32-ka-kb), a=dx/32+b;
  if(a<a0||a>=a1||b<b0||b>=b1) return; e.put(x,y,fn(a,b,x,y,z0+ka*a+kb*b)); }); }
export function box(e,a0,a1,b0,b1,z0,z1,L,R,T){
  if(L) faceB(e,b1,a0,a1,z0,z1,L); if(R) faceA(e,a1,b0,b1,z0,z1,R);
  if(T) plane(e,a0,a1,b0,b1,z1,0,0,T); }
// Gable roof on a box top (z), ridge along 'a' or 'b', rh px high
export function gable(e,a0,a1,b0,b1,z,rh,axis,roof,endWall){
  const tiles = (zz,f)=> sh(roof, f*(Math.floor(zz)%3===0 ? 0.86 : 1));
  if(axis==='a'){ const m=(b0+b1)/2, hw=(b1-b0)/2, k=rh/hw;
    plane(e,a0,a1,b0,m, z+rh-k*m, 0, k, (a,b,x,y,zz)=>tiles(zz,0.72));
    plane(e,a0,a1,m,b1, z+rh+k*m, 0,-k, (a,b,x,y,zz)=>tiles(zz,1));
    faceA(e,a1,b0,b1,z,z+rh,(s,zz,x,y,b)=> zz < rh*(1-Math.abs(b-m)/hw) ? endWall : null);
  } else { const m=(a0+a1)/2, hw=(a1-a0)/2, k=rh/hw;
    plane(e,a0,m,b0,b1, z+rh-k*m, k, 0, (a,b,x,y,zz)=>tiles(zz,1.05));
    plane(e,m,a1,b0,b1, z+rh+k*m,-k, 0, (a,b,x,y,zz)=>tiles(zz,0.7));
    faceB(e,b1,a0,a1,z,z+rh,(s,zz,x,y,a)=> zz < rh*(1-Math.abs(a-m)/hw) ? endWall : null);
  }
}
// Soft cast shadow to the right of a footprint (light comes from the upper left)
export function shadow(e,a0,a1,b0,b1,len){ plane(e,a0,a1+len,b0-len*0.3,b1,0,0,0,()=>[20,40,10,70]); }
export const wallsLR = (col, fnL, fnR) => [ (s,z,x,y)=>fnL(s,z,x,y,sh(col,0.92)), (s,z,x,y)=>fnR(s,z,x,y,sh(col,0.7)) ];
