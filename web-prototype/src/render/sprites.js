import { S } from '../core/state.js';
import { worldIndex } from '../core/region.js';
import { grassPx, speck } from './ground.js';
import { C, PX, box, dith, eachPx, faceA, faceB, frac, gable, gl, hsh, lamp, plane, sh, shadow, sprite } from './pixel.js';

// ---------- props & buildings (64×112, tile centre at 32,96) ----------
export const thing = (paint, outline=true, late) => sprite(64,112,32,96,paint,outline,late);
export function treeAt(e, a, b, kind, size){ // a small tree painted directly into a sprite
  const cx = Math.round(e.ox + (a-b)*32), cy = Math.round(e.oy + (a+b)*16);
  for(let dx=-5*size;dx<=5*size;dx++) for(let dy=-2;dy<=2;dy++) if((dx*dx)/(25*size*size)+(dy*dy)/4<=1) e.put(cx+dx+2,cy+dy,[20,40,10,70]);
  e.put(cx,cy-1,C('#5d4030')); e.put(cx,cy-2,C('#6d4c35')); e.put(cx,cy-3,C('#6d4c35')); e.put(cx-1,cy-1,C('#5d4030'));
  if(kind==='pine'){ const hgt = Math.round(14*size);
    for(let j=0;j<hgt;j++){ const half = Math.round((hgt-j)*0.42)+ (j%4===0?1:0);
      for(let i=-half;i<=half;i++){ const lit = i<0 ? 1.1 : 0.85; e.put(cx+i, cy-3-j, sh(C('#2f7a3e'), lit*(dith(cx+i,cy-j)<0.2?0.9:1))); } }
    return; }
  const r = 5.2*size, ccy = cy - 4 - r;
  for(let dy=-Math.ceil(r);dy<=Math.ceil(r);dy++) for(let dx=-Math.ceil(r);dx<=Math.ceil(r);dx++){
    const d = (dx*dx+dy*dy)/(r*r); if(d>1) continue;
    const l = (-dx*0.6 - dy*0.75)/r + 0.25 + (dith(cx+dx,cy+dy)-0.5)*0.5;
    e.put(cx+dx, Math.round(ccy+dy), l>0.55 ? C('#8fcc4f') : l>0.05 ? C('#5ea83a') : l>-0.45 ? C('#3f8a2f') : C('#2f6b25')); }
}
export function windows(s,z,len,hgt,base,{floor=8,step=6,glass=C('#38536f'),frame=null}={}){
  if(s<2||s>len-2||z<3||z>hgt-3) return base;
  const fz = z%floor, fs = s%step;
  if(fz>=3 && fz<6 && fs>=2 && fs<5) return fz===5 ? gl(sh(glass,1.7)) : gl(glass);
  if(frame && fz>=2 && fz<7 && fs>=1 && fs<6) return frame;
  if(fz===1) return sh(base,0.86);    // floor band
  return base; }
export const SPR = new Map();
export const spr = (key, make) => { let s = SPR.get(key); if(!s){ s = make(); SPR.set(key, s); } return s; };
export const P3 = (a,b,z=0) => [(a-b)*32, (a+b)*16 - z];          // tile-relative screen offset of a ground point at height z
export const pick2 = (v, arr, k=0) => arr[Math.floor(hsh(v, k, 5)*arr.length)];
// A vertical cylinder standing on (ca,cb): side(u,z) with u ∈ (-1,1) across its width, top(u,w) for the lid
export function cyl(e, ca, cb, r, z0, z1, side, top){
  const cx=(ca-cb)*32, cy=(ca+cb)*16, rx=r*45.25, ry=r*22.63;
  eachPx(e,(x,y,dx,dy)=>{ const X=dx-cx; if(Math.abs(X)>=rx) return; const ey=ry*Math.sqrt(1-(X/rx)**2), Y=dy-cy;
    if(top && Math.abs(Y+z1) <= ey){ e.put(x,y,top(X/rx,(Y+z1)/ry)); return; }
    if(Y >= -z1 && Y <= -z0+ey) e.put(x,y,side(X/rx, -Y)); }); }
export const dot = (e,a,b,z,c) => { const [x,y]=P3(a,b,z); e.put(Math.round(e.ox+x), Math.round(e.oy+y), c); };
export const WALLS = ['#efdfc0','#dba582','#cdd6db','#e7c7a0','#d6e0cc','#f1d6cf','#c9d3e6'].map(C);
export const PASTEL = ['#e9b8a4','#f2d48f','#b9d3c4','#a9c4e0','#efe6d8','#d9a7a7','#c7b9df','#f0c9a0'].map(C);
export const ROOFS = ['#b5523b','#8d4a3a','#5f6670','#c0442b','#6e5a4c'].map(C);
export const BANDS = ['#e8762b','#2a63c9','#1d8148','#c62f28','#8a5cc4'].map(C);
export const pv = (a,b) => (frac(b*9)<0.14 || frac(a*11)<0.12) ? C('#a9bcd8') : C('#2b4f86');   // photovoltaic panels

// Building archetypes. Each parcel picks one from the run seed, plus a colourway (v = 0..5).
// fx: animated overlays drawn on top every frame (positions relative to the tile centre, in art pixels).
// walk: little people pacing [a0,b0 → a1,b1] in front of the building.
export const ARCH = {
  housing: [
    { id:'slab', make: v => thing(e=>{ const wall = pick2(v,WALLS), A=0.38, Hh=36;
        shadow(e,-A,A,-A,A,0.35);
        box(e,-A,A,-A,A,0,Hh,
          (s,z)=>{ const c=sh(wall,0.95); if(z<6 && Math.abs(s-12)<2) return C('#5a3b2a'); return windows(s,z,24,Hh,c); },
          (s,z)=>windows(s,z,24,Hh,sh(wall,0.72)),
          (a,b)=> (Math.abs(a)>A-0.04||Math.abs(b)>A-0.04) ? sh(wall,1.05) : speck(Math.round(a*64),Math.round(b*64),v,C('#9b9c9e'),C('#8c8d8f'),C('#a9aaac'),0.15));
        box(e,-0.18,0.02,-0.22,0.02,Hh,Hh+5,()=>sh(wall,0.85),()=>sh(wall,0.66),()=>C('#8a8b8d'));
        box(e,0.1,0.22,0.08,0.2,Hh,Hh+4,()=>C('#7f8a94'),()=>C('#66707a'),()=>C('#9aa5af')); }),
      walk:[[-0.38,0.45,0.38,0.45]] },
    { id:'tower', make: v => { const Hh=60; return thing(e=>{ const wall = pick2(v,WALLS,1), A=0.25, glass=C('#3b6a86'), base=C('#7d858c');
        shadow(e,-A,A,-A,A,0.55);
        treeAt(e,-0.38,0.32,'round',0.7);
        box(e,-A,A,-A,A,0,Hh,
          (s,z)=>{ if(z<7) return (s>3&&s<13&&z<6) ? gl(C('#2f4f66')) : sh(base,0.95); if(z%7<1) return sh(wall,0.8);
                   return windows(s,z,16,Hh,sh(wall,0.95),{floor:7,step:5,glass}); },
          (s,z)=>{ if(z<7) return sh(base,0.72); if(z%7<1) return sh(wall,0.6);
                   if(s>10 && z%7>=2 && z%7<6) return (z%7===2) ? sh(C('#d9dde0'),0.8) : gl(glass);      // corner balconies
                   return windows(s,z,16,Hh,sh(wall,0.72),{floor:7,step:5,glass}); },
          ()=>C('#9b9c9e'));
        box(e,-0.12,0.08,-0.1,0.1,Hh,Hh+6,()=>sh(wall,0.85),()=>sh(wall,0.66),()=>C('#8a8b8d'));
      }, true, e=>{ for(let j=0;j<9;j++) dot(e,-0.02,0,Hh+6+j,C('#5d6570')); }); },
      fx:[{k:'blink', x:-1, y:-75, c:'#e8442e', p:1.6, o:0}], walk:[[-0.3,0.42,0.3,0.42]] },
    { id:'terrace', ground:'grass', make: v => thing(e=>{
        plane(e,-0.45,0.45,0.15,0.45,0,0,0,(a,b,x,y)=> b>0.41 ? (hsh(x,y,3)<0.5?PX.hedge:sh(PX.hedge,1.2))
          : Math.abs(frac((a+0.45)/0.3)-0.5)<0.07 ? PX.pave : (hsh(x,y,v)<0.06 ? C('#f2d14b') : grassPx(x,y,v)));
        shadow(e,-0.45,0.45,-0.3,0.15,0.2);
        for(let k=0;k<3;k++){ const a0=-0.45+k*0.3, a1=a0+0.3, wall=pick2(v*3+k,PASTEL,k), roof=pick2(v+k*7,ROOFS,k+4), Hh = hsh(v,k,9)<0.5 ? 13 : 16;
          box(e,a0,a1,-0.3,0.15,0,Hh,
            (s,z)=>{ if(z<6 && Math.abs(s-3)<1.3) return C('#5a3b2a'); if(z>1 && z<5 && s>5.5 && s<8) return gl(C('#4f6278'));
                     if(z>8 && z<12 && (Math.abs(s-3)<1.2 || Math.abs(s-6.8)<1.2)) return gl(C('#4f6278')); return sh(wall,0.95); },
            (s,z)=> (z>8&&z<12&&Math.abs(s-7)<1.5) ? gl(C('#41546a')) : sh(wall,0.72), null);
          gable(e,a0,a1,-0.3,0.15,Hh,8,'b',roof,sh(wall,0.95));
          box(e,a0+0.04,a0+0.08,-0.24,-0.2,Hh+2,Hh+8,()=>C('#8d4a3a'),()=>C('#6e3a2d'),()=>C('#5a2f25')); } }),
      fx: v=>[{k:'smoke', x:-5, y: hsh(v,0,9)<0.5 ? -31 : -34, c:'steam'}], walk:[[-0.4,0.3,0.4,0.3]] },
    { id:'perimeter', make: v => thing(e=>{ const wall=pick2(v,WALLS,2), Hh=26, aw=pick2(v,BANDS,3);
        const L=(s,z,len)=>{ if(z<7){ if(z>=5) return Math.floor(s/2)%2 ? aw : sh(aw,0.8);
                               if(s%6>1 && s%6<5) return gl(C('#5f7f93')); return sh(wall,0.8); }
                             return windows(s,z,len,Hh,sh(wall,0.95),{floor:6,step:5}); };
        const R=(s,z,len)=> z<7 ? sh(wall,0.6) : windows(s,z,len,Hh,sh(wall,0.72),{floor:6,step:5});
        const roof=(a,b,x,y)=> hsh(x>>1,y,v)<0.5 ? C('#7f9a52') : C('#6d8a45');
        shadow(e,-0.42,0.42,-0.42,-0.12,0.3);
        box(e,-0.42,0.42,-0.42,-0.12,0,Hh,(s,z)=>L(s,z,27),(s,z)=>R(s,z,9.6),roof);
        treeAt(e,-0.18,0.2,'round',0.95);
        shadow(e,0.12,0.42,-0.12,0.42,0.3);
        box(e,0.12,0.42,-0.12,0.42,0,Hh,(s,z)=>L(s,z,9.6),(s,z)=>R(s,z,17),roof);
        plane(e,0.17,0.37,0.0,0.36,Hh,0,0,(a,b)=>pv(a,b)); }),
      walk:[[-0.42,0.46,0.08,0.46],[0.46,-0.1,0.46,0.4]] },
    { id:'eco', make: v => thing(e=>{ const A=0.36, Hh=40, wood=pick2(v,[C('#b98552'),C('#a8744a'),C('#c79a68')]);
        shadow(e,-A,A,-A,A,0.35);
        const face = f => (s,z)=>{ const fz=z%8;
          if(fz<1.2) return sh(C('#d9d6cc'),f);
          if(fz<2.6 && z>6) return hsh(Math.floor(s),Math.floor(z),v)<0.6 ? sh(C('#4f9a3a'),f*1.1) : sh(C('#3f7f2e'),f);
          return windows(s,z,23,Hh, Math.floor(s)%3===0 ? sh(wood,0.85*f) : sh(wood,f), {floor:8,step:6,glass:C('#2f5468')}); };
        box(e,-A,A,-A,A,0,Hh,face(0.98),face(0.74),()=>C('#cfd2cf'));
        plane(e,-0.3,0.3,-0.3,0.3,Hh+1,0,6,(a,b)=>pv(a,b)); }),
      walk:[[-0.36,0.44,0.36,0.44]] },
    { id:'brutalist', make: v => thing(e=>{ const A=0.4, Hh=44, conc=pick2(v,[C('#b9b4a8'),C('#c4beb1'),C('#aeaba3')]);
        shadow(e,-A,A,-A,A,0.4);
        box(e,-A+0.05,A-0.05,-A+0.05,A-0.05,0,8,(s,z)=> s%7<2 ? sh(conc,0.9) : C('#3a3c41'),(s,z)=> s%7<2 ? sh(conc,0.66) : C('#2f3135'),null);
        const deep=(f)=>(s,z)=>{ const fz=z%7, fs=s%6;
          if(fz>=2&&fz<5&&fs>=2&&fs<5) return fz===2 ? sh(conc,0.7*f) : (fs===2 ? sh(conc,0.76*f) : gl(C('#3a4b5a')));
          return hsh(Math.floor(s),Math.floor(z),3)<0.12 ? sh(conc,0.88*f) : sh(conc,0.97*f); };
        box(e,-A,A,-A,A,8,Hh,deep(1),deep(0.74),(a,b,x,y)=> speck(x,y,v,sh(conc,1.05),sh(conc,0.95),sh(conc,1.1),0.15));
        box(e,-0.3,-0.1,-0.3,-0.1,Hh,Hh+7,()=>sh(conc,0.92),()=>sh(conc,0.7),()=>sh(conc,1.02)); }),
      walk:[[-0.4,0.46,0.4,0.46]] },
  ],
  factory: [
    { id:'sawtooth', ground:'yard', make: v => thing(e=>{ const wall=C('#a9b3bc'), A=0.44, B0=-0.4, B1=0.4, Hh=15;
        shadow(e,-A,A,B0,B1,0.3);
        box(e,0.18,0.3,-0.38,-0.26,0,50,(s,z)=> z>44||Math.abs(z-38)<1.5 ? C('#ececec') : sh(C('#a8553f'),0.95), (s,z)=> z>44||Math.abs(z-38)<1.5 ? C('#c9c9c9') : sh(C('#a8553f'),0.72), ()=>C('#3a2a24'));
        box(e,-A,A,B0,B1,0,Hh,
          (s,z)=>{ if(s>8&&s<22&&z<11) return z%2 ? C('#6b7580') : C('#7b8590'); if(z>=11&&z<13&&s%4) return gl(C('#5d7e99')); return s%3===0 ? sh(wall,0.84) : sh(wall,0.95); },
          (s,z)=>{ if(z>=11&&z<13&&s%4) return gl(C('#4d6b84')); return s%3===0 ? sh(wall,0.6) : sh(wall,0.7); }, null);
        for(let i=0;i<3;i++){ const a0=-A+i*(2*A/3), a1=a0+2*A/3; gable(e,a0,a1,B0,B1,Hh,7,'b',C('#7c8691'),sh(wall,0.95)); } }),
      fx:[{k:'smoke', x:18, y:-52}] },
    { id:'logistics', ground:'yard', make: v => thing(e=>{ const band=pick2(v,BANDS), wall=C('#c9ced4'), A0=-0.46, A1=0.46, B0=-0.42, B1=0.2, Hh=15;
        shadow(e,A0,A1,B0,B1,0.25);
        box(e,A0,A1,B0,B1,0,Hh,
          (s,z)=>{ if(z>=Hh-4 && z<Hh-1) return band; const d=s%9.8;
                   if(z<9 && d>=2 && d<7.5) return z>=8 ? C('#2f343a') : (Math.floor(z)%2 ? C('#4a5058') : C('#555c64'));
                   return Math.floor(s)%2 ? sh(wall,0.95) : sh(wall,0.88); },
          (s,z)=> (z>=Hh-4 && z<Hh-1) ? sh(band,0.75) : (Math.floor(s)%2 ? sh(wall,0.72) : sh(wall,0.66)),
          (a,b,x,y)=> (frac((a+0.46)*5)<0.12 && Math.abs(b+0.11)<0.24) ? gl(C('#9fc3e0')) : speck(x,y,v,C('#d4d7da'),C('#c4c8cc'),C('#e0e2e4'),0.08));
        [-0.3,0.0,0.3].forEach((a,k)=>{ if(hsh(v,k,4) < 0.3) return;
          box(e,a-0.08,a+0.08,B1+0.02,B1+0.23,1,9,()=>C('#f4f4f2'),()=>C('#cfd2d4'),()=>C('#e9eaea'));
          box(e,a-0.07,a+0.07,B1+0.23,B1+0.29,0,8,(s,z)=> z>4&&z<7 ? C('#2e4255') : sh(band,0.95),()=>sh(band,0.75),()=>sh(band,1.1)); }); }),
      fx:[{k:'blink', x:-21, y:-20, c:'#ffb000', p:1.1, o:0.3}, {k:'blink', x:28, y:-16, c:'#ffb000', p:1.1, o:0.8}] },
    { id:'silos', ground:'yard', make: v => thing(e=>{ const metal=pick2(v,[C('#c7ccd1'),C('#d6d0c4'),C('#b9c4c9')]), shed=pick2(v,[C('#a8553f'),C('#3f7a5a'),C('#2a63c9')],2);
        shadow(e,-0.42,0.42,-0.42,0.42,0.3);
        const silo=(a,b)=> cyl(e,a,b,0.12,0,44,(u,z)=>{ const f = u<-0.35 ? 1.08 : u<0.35 ? 0.92 : 0.74; return Math.floor(z)%7===0 ? sh(metal,f*0.84) : sh(metal,f); },
          (u,w)=> u+w < -0.3 ? sh(metal,1.15) : sh(metal,1.02));
        silo(-0.28,-0.28); silo(0,-0.28); silo(0.28,-0.28);
        box(e,-0.3,0.3,-0.3,-0.26,44,47,()=>C('#7d858c'),()=>C('#5f6670'),()=>C('#8f97a2'));
        box(e,-0.42,0.42,-0.06,0.4,0,11,(s,z)=> Math.floor(s)%2 ? sh(shed,0.95) : sh(shed,0.85),(s,z)=> (z>3&&z<7&&s%6>2) ? gl(C('#4d6b84')) : sh(shed,0.7),null);
        gable(e,-0.42,0.42,-0.06,0.4,11,6,'a',C('#7c8691'),sh(shed,0.7)); }),
      fx:[{k:'smoke', x:9, y:-52, c:'steam'}] },
    { id:'cleantech', ground:'yard', make: v => thing(e=>{ const wall=C('#f1f3f4'), stripe=pick2(v,[C('#2a63c9'),C('#1d8148'),C('#0b1f4d')]), A0=-0.46, A1=0.3, B0=-0.4, B1=0.38, Hh=18;
        shadow(e,A0,A1,B0,B1,0.25);
        box(e,A0,A1,B0,B1,0,Hh,
          (s,z)=> (z>=6&&z<9) ? stripe : (z<5 && s%10>2 && s%10<8 ? gl(C('#5a7f99')) : sh(wall,0.95)),
          (s,z)=> (z>=6&&z<9) ? sh(stripe,0.75) : sh(wall,0.74),
          (a,b,x,y)=> (frac((b-B0)*6)<0.62 && a>A0+0.04 && a<A1-0.2) ? (frac((a-A0)*16)<0.12 || frac((b-B0)*6)<0.08 ? C('#a9bcd8') : C('#2b4f86')) : C('#dfe3e6'));
        box(e,-0.4,-0.3,-0.36,-0.26,Hh,Hh+4,()=>C('#bfc5ca'),()=>C('#9aa1a7'),()=>C('#d4d8db'));
        box(e,-0.4,-0.3,-0.2,-0.1,Hh,Hh+4,()=>C('#bfc5ca'),()=>C('#9aa1a7'),()=>C('#d4d8db'));
        cyl(e,0.4,-0.38,0.02,0,62,(u)=> u<0 ? C('#f4f6f7') : C('#c9cfd4'),()=>C('#ffffff'));
        box(e,0.36,0.44,-0.42,-0.36,62,66,()=>C('#e9ecee'),()=>C('#c3c9ce'),()=>C('#f6f7f8')); }),
      fx:[{k:'turbine', x:25, y:-64, L:15}] },
  ],
  school: [
    { id:'brick', ground:'school', make: v => thing(e=>{ const wall=pick2(v,[C('#b65a3c'),C('#a4523a'),C('#c06a45')]), A=0.42, B0=-0.42, B1=0.02, Hh=17;
        shadow(e,-A,A,B0,B1,0.25);
        box(e,-A,A,B0,B1,0,Hh,
          (s,z)=>{ if(z<7 && Math.abs(s-27)<3) return C('#3d3a5a'); if(Math.abs(s-27)<2.5 && z>12 && z<16) return (Math.abs(s-27)<1.2&&z>13&&z<15)?C('#333'):C('#f4f1e6');
            return windows(s,z,54,Hh,sh(wall,0.95),{floor:8,step:6,frame:C('#f1ece0')}); },
          (s,z)=>windows(s,z,28,Hh,sh(wall,0.72),{floor:8,step:6,frame:C('#cfcabd')}), null);
        gable(e,-A,A,B0,B1,Hh,8,'a',C('#6b7178'),sh(wall,0.72));
        const fx = Math.round(e.ox + (0.36-0.4)*32), fy = Math.round(e.oy + (0.36+0.4)*16);
        for(let j=0;j<30;j++) e.put(fx,fy-j,C('#d9d9d9')); }),
      fx:[{k:'flag', x:-1, y:-14, c:['#2e7d32','#f2c230']}], walk:[[-0.3,0.28,0.3,0.28],[-0.2,0.4,0.25,0.4]], kids:true },
    { id:'modern', ground:'school', make: v => thing(e=>{ const wall=C('#f4f2ec'), cols=[C('#ffd200'),C('#e8762b'),C('#2a63c9'),C('#1d8148')], Hh=16;
        const face=(f,len)=>(s,z)=>{ if(z<1.5) return sh(C('#9aa3ad'),f); const k=Math.floor(s/6);
          if(z>3 && z<14 && s%6<2.2) return sh(cols[(k+v)%4],f);
          if(z>4 && z<12 && s%6>=2.6) return gl(sh(C('#5d8aa6'),f));
          return sh(wall,f); };
        shadow(e,-0.44,0.44,-0.44,-0.16,0.25);
        box(e,-0.44,0.44,-0.44,-0.16,0,Hh,face(0.97,28),face(0.74,9),(a,b,x,y)=> speck(x,y,v,C('#d9dcdf'),C('#cdd1d5'),C('#e6e8ea'),0.08));
        shadow(e,0.16,0.44,-0.16,0.06,0.25);
        box(e,0.16,0.44,-0.16,0.06,0,Hh,face(0.97,9),face(0.74,7),(a,b)=>pv(a,b)); }),
      walk:[[-0.35,0.3,0.1,0.3],[-0.3,0.42,0.3,0.42]], kids:true },
    { id:'clocktower', ground:'school', make: v => thing(e=>{ const stone=pick2(v,[C('#e3d3b0'),C('#d9c7a2'),C('#eadcc0')]), slate=pick2(v,[C('#a5492f'),C('#8d4a3a'),C('#b5523b')],2);
        const arch=(f)=>(s,z)=>{ const fs=s%6; if(z>3&&z<12&&fs>=2&&fs<5){ if(z>=10.5) return fs>=3&&fs<4 ? gl(C('#3f5268')) : sh(stone,0.8*f); return gl(C('#3f5268')); }
          return Math.floor(z)%4===0 ? sh(stone,0.88*f) : sh(stone,0.97*f); };
        shadow(e,-0.44,0.44,-0.4,0.02,0.25);
        box(e,-0.44,0.44,-0.4,0.02,0,16,arch(1),arch(0.76),null);
        gable(e,-0.44,0.44,-0.4,0.02,16,8,'a',slate,sh(stone,0.74));
        box(e,-0.08,0.08,-0.06,0.1,0,36,
          (s,z)=>{ if(z<7 && Math.abs(s-2.6)<1.4) return C('#4a3428'); const dz=z-30, ds=s-2.6;
                   if(ds*ds+dz*dz*1.2 < 5.8) return (ds*ds+dz*dz*1.2 < 3.6) ? ((Math.abs(ds)<0.5&&dz>0)||(Math.abs(dz)<0.5&&ds>0) ? C('#2b2b2b') : C('#fbf7ea')) : C('#c9a227');
                   return Math.floor(z)%4===0 ? sh(stone,0.86) : sh(stone,0.96); },
          (s,z)=> (z>26&&z<33&&Math.abs(s-2.6)<1.3) ? gl(C('#3f5268')) : sh(stone,0.72), null);
        gable(e,-0.08,0.08,-0.06,0.1,36,9,'a',slate,sh(stone,0.72));
        gable(e,-0.08,0.08,-0.06,0.1,36,9,'b',sh(slate,1.1),sh(stone,0.9)); }),
      walk:[[-0.36,0.3,0.36,0.3]], kids:true },
  ],
  clinic: [
    { id:'helipad', make: v => thing(e=>{ const wall=C('#f3f5f4'), A=0.38, Hh=24, teal=C('#26a69a');
        shadow(e,-A,A,-A,A,0.3);
        box(e,-A,A,-A,A,0,Hh,
          (s,z)=>{ if(z%10<1.5) return sh(teal,0.95); if(z>3&&z%10>=3&&z%10<7&&s>3&&s<21&&s%8) return gl(C('#5d8ea8')); return sh(wall,0.95); },
          (s,z)=>{ if(z%10<1.5) return sh(teal,0.7); if(z>3&&z%10>=3&&z%10<7&&s>3&&s<21&&s%8) return gl(C('#45708a')); return sh(wall,0.72); },
          (a,b)=>{ const r=Math.hypot(a,b); if(Math.abs(a)>A-0.04||Math.abs(b)>A-0.04) return C('#e6e9e8'); if(r>0.2&&r<0.25) return C('#f2c230'); return C('#a3a9ad'); });
        [[-3,-2],[-3,-1],[-3,0],[-3,1],[-3,2],[3,-2],[3,-1],[3,0],[3,1],[3,2],[-2,0],[-1,0],[0,0],[1,0],[2,0]].forEach(([i,j])=>e.put(e.ox+i,e.oy-Hh+j,C('#ffffff')));
        faceB(e,A+0.001,-0.12,0.12,Hh-12,Hh-2,(s,z)=> (Math.abs(s-7.7)<2.2 || Math.abs(z-5)<2.2) ? C('#21a05a') : null);
        box(e,-0.12,0.12,A,A+0.1,6,8,()=>teal,()=>sh(teal,0.75),()=>sh(teal,1.1)); }),
      fx:[{k:'blink', x:0, y:-37, c:'#e8442e', p:1.4, o:0}, {k:'blink', x:-23, y:-25, c:'#ffd200', p:0.9, o:0.5}, {k:'blink', x:23, y:-25, c:'#ffd200', p:0.9, o:0.5}],
      walk:[[-0.36,0.45,0.36,0.45]] },
    { id:'pavilion', make: v => thing(e=>{ const wall=C('#eef1f0'), green=C('#21a05a');
        shadow(e,-0.44,0.44,-0.36,0.06,0.25);
        box(e,-0.44,0.44,-0.36,0.06,0,11,
          (s,z)=> (z<9 && z>1) ? (Math.floor(s)%5===0 ? C('#d0d6d8') : gl(C('#7fb3c9'))) : sh(wall,0.95),
          (s,z)=> (z>3&&z<8&&s%6>1) ? gl(C('#5f8fa6')) : sh(wall,0.72),
          (a,b,x,y)=> (Math.abs(a-0.1)<0.12 && Math.abs(b+0.15)<0.08) ? C('#b7bec2') : speck(x,y,4,C('#dfe3e4'),C('#cfd4d6'),C('#eceff0'),0.06));
        box(e,-0.14,0.1,0.06,0.2,8,10,()=>green,()=>sh(green,0.75),()=>sh(green,1.15));
        box(e,0.16,0.38,0.2,0.33,1,8,(s,z)=> (z>2.5&&z<4) ? C('#e8762b') : (z>4.5&&s<2 ? C('#2e4255') : C('#f6f6f4')),
          (s,z)=> (z>2.5&&z<4) ? sh(C('#e8762b'),0.8) : C('#d5d7d8'),()=>C('#ececea'));
        for(let j=0;j<14;j++) dot(e,-0.38,0.32,j,C('#5d6570'));
        const [sx,sy] = P3(-0.38,0.32,15), X=Math.round(e.ox+sx), Y=Math.round(e.oy+sy);
        for(let i=-3;i<=3;i++) for(let j=-3;j<=3;j++){ const c = (Math.abs(i)<=1 || Math.abs(j)<=1) ? C('#21c45f') : null; if(c && Math.abs(i)+Math.abs(j)<6) e.put(X+i,Y+j,lamp(c)); } }),
      fx:[{k:'blink', x:-1, y:-1, c:'#3d8bff', p:0.5, o:0}, {k:'blink', x:2, y:-2, c:'#ff4040', p:0.5, o:0.5}],
      walk:[[-0.3,0.3,0.05,0.3]] },
    { id:'hospital', make: v => thing(e=>{ const stone=pick2(v,[C('#e6dcc6'),C('#ddd5c8'),C('#efe4cf')]), roof=C('#56606b');
        shadow(e,-0.42,0.42,-0.4,0.12,0.3);
        box(e,-0.42,0.42,-0.4,0.12,0,22,
          (s,z)=>windows(s,z,27,22,Math.floor(z)%7===0 ? sh(stone,0.86) : sh(stone,0.96),{floor:7,step:5,frame:C('#f7f1e3')}),
          (s,z)=>windows(s,z,17,22,sh(stone,0.74),{floor:7,step:5}), null);
        gable(e,-0.42,0.42,-0.4,0.12,22,7,'a',roof,sh(stone,0.74));
        box(e,-0.12,0.12,0.12,0.22,0,14,(s,z)=> (s%2.6<1 || z>11) ? sh(stone,1.02) : C('#5a5246'),()=>sh(stone,0.72),()=>sh(stone,1.05));
        gable(e,-0.12,0.12,0.12,0.22,14,5,'b',sh(roof,1.1),sh(stone,0.95));
        faceB(e,0.121,-0.42,0.42,15,21,(s,z)=> (Math.abs(s-5)<1.2 && z>1 && z<6) || (Math.abs(z-3.5)<1 && Math.abs(s-5)<3) ? C('#21a05a') : null); }),
      walk:[[-0.4,0.34,0.4,0.34]] },
  ],
  park: [
    { id:'trees', outline:false, make: v => thing(e=>{
        treeAt(e,-0.3,-0.25,'round',1.05); treeAt(e,0.28,-0.28,'pine',1); treeAt(e,-0.28,0.3,'round',0.85);
        const bx = Math.round(e.ox + (0.25-0.15)*32), by = Math.round(e.oy + (0.25+0.15)*16);
        for(let i=0;i<5;i++){ e.put(bx+i,by-2,C('#8a5a33')); e.put(bx+i,by-3,C('#a26d40')); } e.put(bx,by-1,C('#4a3020')); e.put(bx+4,by-1,C('#4a3020'));
        const lx = e.ox+4, ly = e.oy+2; for(let j=0;j<10;j++) e.put(lx,ly-j,C('#3b3f45')); e.put(lx,ly-10,lamp(C('#ffe28a'))); e.put(lx-1,ly-10,lamp(C('#ffe28a'))); }, false),
      walk:[[0.02,0.02,0.4,0.4],[-0.05,-0.05,-0.4,-0.4]] },
    { id:'pond', outline:false, make: v => thing(e=>{
        plane(e,-0.45,0.45,-0.45,0.45,0,0,0,(a,b,x,y)=>{ const d=((a+0.04)/0.3)**2+((b+0.04)/0.24)**2;
          if(d<1) return d>0.78 ? PX.bank : ((x+y*2)%7<2 && hsh(x,y,2)<0.5) ? PX.waterL : PX.water;
          if(d<1.3 && hsh(x,y,v)<0.45) return PX.reed; return null; });
        treeAt(e,-0.36,-0.3,'round',1.15); treeAt(e,0.34,-0.34,'round',0.8);
        const [bx,by] = P3(0.3,0.36), X=Math.round(e.ox+bx), Y=Math.round(e.oy+by);
        for(let i=0;i<5;i++){ e.put(X+i,Y-2,C('#8a5a33')); e.put(X+i,Y-3,C('#a26d40')); } e.put(X,Y-1,C('#4a3020')); e.put(X+4,Y-1,C('#4a3020')); }, false),
      fx:[{k:'ducks', a:-0.04, b:-0.04, ra:0.18, rb:0.13, n:3}], walk:[[-0.42,0.44,0.42,0.44]] },
    { id:'playground', outline:false, make: v => thing(e=>{
        plane(e,-0.42,0.06,-0.42,0.06,0,0,0,(a,b,x,y)=> speck(x,y,7,C('#e0784a'),C('#c9663c'),C('#ea8a5e'),0.1));
        plane(e,0.12,0.42,-0.42,-0.12,0,0,0,(a,b,x,y)=> (a<0.15||a>0.39||b<-0.39||b>-0.15) ? C('#8a5a33') : speck(x,y,8,C('#ead7a0'),C('#d9c48a'),C('#f4e6b8'),0.15));
        box(e,-0.34,-0.22,-0.34,-0.22,0,11,()=>C('#2a63c9'),()=>C('#1f4c9a'),()=>C('#ffd200'));
        plane(e,-0.33,-0.23,-0.22,0.06,11+33.3*-0.22,0,-33.3,(a,b,x,y)=> Math.abs(a+0.28)<0.035 ? C('#ffe066') : C('#f2c230'));
        treeAt(e,0.3,0.3,'round',0.95);
        // swing frame: two posts and a bar along a
        for(const a of [0.08,0.36]) for(let j=0;j<12;j++) dot(e,a,0.18,j,C('#c62f28'));
        for(let s=0;s<=28;s++) dot(e,0.08+s/100,0.18,12,C('#c62f28')); }, false),
      fx:[{k:'swing', pts:[[0.16,0.18],[0.28,0.18]]}], walk:[[-0.35,0.25,0.0,0.25],[-0.15,-0.38,-0.15,0.0]], kids:true },
    { id:'fountain', ground:'plaza', outline:false, make: v => thing(e=>{
        for(const [a,b] of [[-0.36,-0.36],[0.36,-0.36],[-0.36,0.36],[0.36,0.36]])
          plane(e,a-0.08,a+0.08,b-0.08,b+0.08,0,0,0,(aa,bb,x,y)=> hsh(x,y,v)<0.35 ? pick2(x*7+y,[C('#e8442e'),C('#ffd200'),C('#f4f4f4'),C('#c75ab8')]) : C('#4f8a33'));
        cyl(e,0,0,0.23,0,4,(u)=> u<-0.3 ? C('#e3ddcf') : u<0.4 ? C('#cfc8b9') : C('#b3ac9d'),(u,w)=> (u*u+w*w>0.7) ? C('#ece6d8') : ((Math.floor((u-w)*6+3))%3===0 ? PX.waterL : PX.water));
        cyl(e,0,0,0.035,0,10,(u)=> u<0 ? C('#e3ddcf') : C('#bdb6a7'),()=>C('#f0ebe0'));
        treeAt(e,-0.36,0.0,'round',0.75); treeAt(e,0.0,-0.38,'round',0.75); }, false),
      fx:[{k:'fountain', x:0, y:-11}], walk:[[-0.42,0.3,0.42,0.3],[0.3,-0.42,0.3,0.42]] },
  ],
  // ---- v0.8: buildings unlocked through the career ----
  market: [
    { id:'hall', ground:'plaza', make: v => thing(e=>{ const wall=C('#e9dcc0'), A0=-0.4, A1=0.4, B0=-0.36, B1=0.1, Hh=12, stripe=pick2(v,[C('#c62f28'),C('#1d8148'),C('#2a63c9')]);
        shadow(e,A0,A1,B0,B1,0.25);
        box(e,A0,A1,B0,B1,0,Hh,(s,z)=> (z<9 && z>1 && Math.floor(s)%6<4) ? (z<4 ? C('#6b4430') : gl(C('#5d7e99'))) : sh(wall,0.95),
          (s,z)=> (z>2 && z<8 && Math.floor(s)%5>1) ? gl(C('#4d6b84')) : sh(wall,0.72), null);
        gable(e,A0,A1,B0,B1,Hh,9,'a',C('#9a6b4a'),sh(wall,0.72));
        [-0.27,0,0.27].forEach((a,k)=>{   // stalls with striped awnings
          box(e,a-0.1,a+0.1,B1+0.07,B1+0.25,0,5,()=>C('#8a5a33'),()=>C('#6d4528'),()=>pick2(v+k,[C('#f2c230'),C('#e8762b'),C('#5ea83a')],k));
          box(e,a-0.12,a+0.12,B1+0.05,B1+0.28,8,9,s2=> Math.floor(s2)%2 ? stripe : C('#ffffff'), s2=> Math.floor(s2)%2 ? sh(stripe,0.8) : C('#dddddd'),
            (a2,b2,x)=> Math.floor(x/2)%2 ? stripe : C('#ffffff')); }); }),
      walk:[[-0.4,0.46,0.4,0.46],[-0.3,0.44,0.2,0.44]] } ],
  social: [
    { id:'block', ground:'plaza', make: v => thing(e=>{ const wall=pick2(v,[C('#d9c7a6'),C('#c9d3e6'),C('#e6c9b6')]), bal=pick2(v,BANDS,3), A0=-0.44, A1=0.44, B0=-0.2, B1=0.2, Hh=44;
        shadow(e,A0,A1,B0,B1,0.5);
        box(e,A0,A1,B0,B1,0,Hh,(s,z)=>{ if(z>4 && z%8<2 && Math.floor(s)%6<4) return bal; return windows(s,z,28,Hh,sh(wall,0.95)); },
          (s,z)=>windows(s,z,13,Hh,sh(wall,0.72)), ()=>C('#8f9396'));
        box(e,-0.1,0.1,-0.1,0.1,Hh,Hh+5,()=>C('#9aa0a6'),()=>C('#7d838a'),()=>C('#b4b9be'));
        treeAt(e,0.38,0.36,'round',0.6); }),
      walk:[[-0.44,0.4,0.44,0.4]], kids:true } ],
  library: [
    { id:'classic', ground:'plaza', make: v => thing(e=>{ const stone=C('#efe7d6'), A0=-0.36, A1=0.36, B0=-0.3, B1=0.2, Hh=16;
        shadow(e,A0,A1,B0,B1,0.3);
        box(e,A0-0.05,A1+0.05,B0-0.05,B1+0.1,0,2,()=>sh(stone,0.9),()=>sh(stone,0.7),()=>C('#d9d0bd'));   // steps
        box(e,A0,A1,B0,B1,2,Hh,(s,z)=> (Math.floor(s)%4===0 && z<Hh-3) ? C('#fbf7ee') : (z<Hh-3 && z>4 ? gl(C('#4a5d73')) : sh(stone,0.92)),
          (s,z)=> (Math.floor(s)%4===0 && z<Hh-3) ? sh(stone,0.85) : sh(stone,0.72), null);
        gable(e,A0,A1,B0,B1,Hh,7,'b',C('#8a8f96'),sh(stone,0.95));
        treeAt(e,-0.42,0.38,'round',0.6); treeAt(e,0.42,0.38,'round',0.6); }),
      walk:[[-0.3,0.42,0.3,0.42]] } ],
  police: [
    { id:'station', ground:'plaza', make: v => thing(e=>{ const wall=C('#f1f3f5'), blue=C('#1d4cab'), A=0.34, Hh=20;
        shadow(e,-A,A,-A,A,0.3);
        box(e,-A,A,-A,A,0,Hh,(s,z)=>{ if(z>12 && z<16) return blue; if(z<7 && Math.abs(s-11)<2) return C('#2e4255'); return windows(s,z,22,Hh,sh(wall,0.95),{floor:9,step:6}); },
          (s,z)=> (z>12 && z<16) ? sh(blue,0.75) : windows(s,z,22,Hh,sh(wall,0.72),{floor:9,step:6}), ()=>C('#a3a9ad'));
        box(e,-0.06,0.06,-0.06,0.06,Hh,Hh+3,()=>C('#2a63c9'),()=>C('#1d4cab'),()=>C('#5d8fdf'));
        box(e,0.12,0.3,A+0.06,A+0.2,0,6,()=>C('#f6f6f4'),()=>C('#d5d7d8'),(a,b)=> Math.abs(b-(A+0.13))<0.03 ? blue : C('#ececea')); }),   // a patrol car
      fx:[{k:'blink', x:0, y:-25, c:'#2a63c9', p:0.6, o:0}, {k:'blink', x:0, y:-25, c:'#e8442e', p:0.6, o:0.5}] } ],
  solar: [
    { id:'farm', ground:'grass', make: v => thing(e=>{
        [-0.36,-0.1,0.16].forEach(b=>{ box(e,-0.42,0.42,b,b+0.17,2,5,()=>C('#5a5f6e'),()=>C('#474b57'),(a,bb)=>pv(a,bb)); });
        box(e,0.3,0.42,0.34,0.44,0,7,()=>C('#cfd4d9'),()=>C('#aab0b6'),()=>C('#e0e3e6')); }) } ],
  station: [
    { id:'halt', ground:'plaza', make: v => thing(e=>{ const wall=pick2(v,[C('#d9b48f'),C('#e7c7a0'),C('#cfa98a')]), A0=-0.44, A1=0.44;
        plane(e,A0,A1,0.18,0.44,0,0,0,(a,b)=> (Math.abs(b-0.25)<0.02 || Math.abs(b-0.37)<0.02) ? C('#7d838a') : (Math.floor((a+1)*30)%3===0 ? C('#6d4c35') : C('#a39878')));   // the tracks
        shadow(e,-0.3,0.3,-0.4,-0.05,0.25);
        box(e,-0.3,0.3,-0.4,-0.05,0,14,(s,z)=> (z<9 && z>2 && Math.floor(s)%5<3) ? gl(C('#5d7e99')) : sh(wall,0.95),(s,z)=>sh(wall,0.72),null);
        gable(e,-0.3,0.3,-0.4,-0.05,14,7,'a',C('#5f6670'),sh(wall,0.72));
        box(e,A0,A1,-0.05,0.13,10,11,()=>C('#7f8a94'),()=>C('#66707a'),()=>C('#9aa5af'));   // platform canopy
        [A0+0.04,0,A1-0.06].forEach(a=>box(e,a-0.015,a+0.015,0.09,0.11,0,10,()=>C('#5d6570'),()=>C('#4a5058'),null));
        box(e,-0.05,0.05,-0.27,-0.18,14,24,(s,z)=> (z>18 && z<22) ? C('#ffffff') : sh(wall,0.9),()=>sh(wall,0.7),()=>C('#5f6670')); }),   // clock
      walk:[[-0.4,0.05,0.4,0.05]] } ],
  data: [
    { id:'servers', ground:'yard', make: v => thing(e=>{ const wall=C('#c7ccd1'), A0=-0.42, A1=0.42, B0=-0.36, B1=0.3, Hh=18;
        shadow(e,A0,A1,B0,B1,0.3);
        box(e,A0,A1,B0,B1,0,Hh,(s)=> Math.floor(s)%3===0 ? sh(wall,0.86) : sh(wall,0.95),(s)=> Math.floor(s)%3===0 ? sh(wall,0.62) : sh(wall,0.7),()=>C('#9aa0a6'));
        [[-0.25,-0.2],[0,-0.2],[0.25,-0.2],[-0.25,0.1],[0,0.1],[0.25,0.1]].forEach(([a,b])=>
          cyl(e,a,b,0.07,Hh,Hh+3,()=>C('#8a9096'),(u,w)=> Math.hypot(u,w)<0.5 ? C('#3a3f45') : C('#b4b9be'))); }),
      fx:[{k:'blink', x:-14, y:-10, c:'#21a05a', p:0.5, o:0}, {k:'blink', x:6, y:-6, c:'#21a05a', p:0.7, o:0.3}, {k:'blink', x:18, y:-12, c:'#ffb000', p:0.9, o:0.6}] } ],
  townhall: [
    { id:'hall', ground:'plaza', make: v => thing(e=>{ const stone=C('#efe2c4'), A0=-0.42, A1=0.42, B0=-0.3, B1=0.3, Hh=18;
        shadow(e,A0,A1,B0,B1,0.4);
        const win = (s,z,c,g) => (z>3 && z<15 && Math.floor(s)%5>1 && Math.floor(s)%5<4) ? gl(g) : c;
        box(e,A0,A1,B0,B1,0,Hh,(s,z)=> (z<5 && Math.abs(s-13.5)<2) ? C('#6b4430') : win(s,z,sh(stone,0.95),C('#4a5d73')),(s,z)=>win(s,z,sh(stone,0.72),C('#3d4f63')),null);
        gable(e,A0,A1,B0,B1,Hh,7,'a',C('#b5523b'),sh(stone,0.72));
        box(e,-0.1,0.1,-0.1,0.1,Hh,Hh+20,(s,z)=> (z>Hh+12 && z<Hh+17 && Math.abs(s-3.2)<2) ? C('#ffffff') : sh(stone,0.92),()=>sh(stone,0.7),null);
        gable(e,-0.1,0.1,-0.1,0.1,Hh+20,8,'b',C('#5f6670'),sh(stone,0.92)); }),
      fx:[{k:'union', at:[[14,-30]], w:9, h:6, pole:14}], walk:[[-0.4,0.44,0.4,0.44]] } ],
};
// Unchanged natural/old features
export const BUILDINGS = {
  habitat: v => thing(e=>{ const spots=[[-0.3,-0.3],[0.15,-0.32],[-0.32,0.12],[0.05,-0.02],[0.3,0.05],[-0.05,0.3],[0.3,0.32]];
    spots.forEach(([a,b],j)=>{ if(hsh(j,v,11)<0.25) return; treeAt(e,a,b, hsh(j,v,12)<0.4?'pine':'round', 0.8+hsh(j,v,13)*0.35); }); }, false),
  village: v => thing(e=>{
    if(v===0){ // the old church
      box(e,-0.38,0.18,-0.2,0.18,0,12,(s,z)=>(z>4&&z<9&&s%9>3&&s%9<6)?gl(C('#5b6a7a')):sh(C('#eadfca'),0.95),(s,z)=>sh(C('#eadfca'),0.72),null);
      gable(e,-0.38,0.18,-0.2,0.18,12,9,'a',C('#7d746b'),sh(C('#eadfca'),0.72));
      box(e,0.16,0.38,-0.11,0.11,0,30,(s,z)=>(z>21&&z<26&&Math.abs(s-3.5)<2)?C('#3a3a3a'):sh(C('#e3d6bd'),0.95),(s,z)=>(Math.abs(z-23)<3&&Math.abs(s-3.5)<2.5)?C('#f4efe0'):sh(C('#e3d6bd'),0.72),null);
      gable(e,0.16,0.38,-0.11,0.11,30,10,'b',C('#6e665e'),sh(C('#e3d6bd'),0.95));
      treeAt(e,-0.3,0.36,'round',0.8); return; }
    const walls=[C('#efe2c4'),C('#e8cfa6'),C('#f0e6d6')], roofs=[C('#c0442b'),C('#b5523b'),C('#cf5a35')];
    const w1=walls[v%3], w2=walls[(v+1)%3], r1=roofs[v%3], r2=roofs[(v+2)%3];
    const door=(s,z,len,c)=> (z<5 && Math.abs(s-len/2)<1.5) ? C('#6b4430') : (z>5&&z<8&&s%8>2&&s%8<5) ? gl(C('#4f6278')) : c;
    shadow(e,-0.42,-0.02,-0.36,0.04,0.2);
    box(e,-0.42,-0.02,-0.36,0.04,0,10,(s,z)=>door(s,z,13,sh(w1,0.95)),(s,z)=>door(s,z,13,sh(w1,0.72)),null);
    gable(e,-0.42,-0.02,-0.36,0.04,10,8,'a',r1,sh(w1,0.72));
    treeAt(e,0.25,-0.3,'round',0.75);
    shadow(e,0.04,0.4,-0.04,0.38,0.2);
    box(e,0.04,0.4,-0.04,0.38,0,9,(s,z)=>door(s,z,11,sh(w2,0.95)),(s,z)=>door(s,z,13,sh(w2,0.72)),null);
    gable(e,0.04,0.4,-0.04,0.38,9,7,'b',r2,sh(w2,0.95));
  }),
};
// Older callers (the title-screen diorama) ask for BUILDINGS.<type>(v): v picks a style and a colourway
['housing','factory','school','clinic','park'].forEach(ty=>{ BUILDINGS[ty] = v => { const L = ARCH[ty]; return spr(ty+':'+L[(v|0) % L.length].id+':'+((v|0) % 6), ()=>L[(v|0) % L.length].make((v|0) % 6)); }; });
// Style and colourway of a building come from its WORLD cell and the run seed: stable for the whole run
export const archW = (wi, ty) => { const L = ARCH[ty]; return L[Math.floor(hsh(wi, S.runSeed & 0xffff, 913) * L.length)]; };
export const colourW = wi => Math.floor(hsh(wi, S.runSeed & 0xffff, 414) * 6);
export const archOf = (i, ty) => archW(worldIndex(i), ty);
export const colourOf = i => colourW(worldIndex(i));

// Construction site: concrete core + scaffolding, a tower crane behind (cc = crane colour). The hook and load are animated.
export const CRANES = [['#f2b705','#b98a00'],['#d64545','#9c2f2f'],['#f2f2ee','#b9bcbf']];
export const siteSprite = (hh, cc=0) => thing(e=>{
  const A=0.3, Gc=C('#b9b4aa');
  box(e,-A,A,-A,A,0,hh,(s,z)=>z%8<1.5?sh(Gc,0.8):sh(Gc,0.95),(s,z)=>z%8<1.5?sh(Gc,0.6):sh(Gc,0.72),()=>sh(Gc,1.05));
  const P=C('#d99a3a'), pl=C('#9b7446');
  box(e,-0.38,0.38,-0.38,0.38,0,hh+3,(s,z)=> s%8<1 ? P : (Math.floor(z)%6===0 ? pl : (Math.floor(z)%6===3 && s%2===0 ? sh(P,0.9) : null)),
      (s,z)=> s%8<1 ? sh(P,0.75) : (Math.floor(z)%6===0 ? sh(pl,0.75) : null), null);
}, true, e=>{ // tower crane behind the works
  const Y=C(CRANES[cc][0]), Yd=C(CRANES[cc][1]);
  box(e,0.36,0.44,-0.46,-0.38,0,62,(s,z)=>(Math.floor(z+s)%4<2)?Y:Yd,(s,z)=>(Math.floor(z-s)%4<2)?sh(Y,0.8):null,null);
  box(e,-0.5,0.47,-0.45,-0.4,58,61,(s,z)=>(Math.floor(s)%3===0||z<1)?Y:(z>=2?Y:null),(s,z)=>sh(Y,0.75),(a,b)=>Y);
  box(e,0.47,0.62,-0.46,-0.39,55,61,()=>C('#7d8590'),()=>C('#5f6670'),()=>C('#8f97a2'));
  box(e,0.3,0.36,-0.47,-0.39,52,58,()=>C('#f6f1e2'),()=>C('#cfc8b5'),()=>gl(C('#e6dfcc')));
});
export const cones = () => thing(e=>{ [[-0.3,0.25],[0,0.3],[0.28,0.2],[-0.1,-0.25]].forEach(([a,b])=>{
  const x=Math.round(e.ox+(a-b)*32), y=Math.round(e.oy+(a+b)*16);
  e.put(x,y-4,C('#ff7a1a')); e.put(x,y-3,C('#f4f4f4')); e.put(x-1,y-2,C('#ff7a1a')); e.put(x,y-2,C('#ff7a1a')); e.put(x+1,y-2,C('#e0600c'));
  e.put(x-1,y-1,C('#e0600c')); e.put(x,y-1,C('#ff7a1a')); e.put(x+1,y-1,C('#e0600c')); });
  for(let j=0;j<4;j++) for(let i=-6+j;i<=6-j;i++) e.put(e.ox+8+i, e.oy-6-j, speck(i,j,4,C('#9a9a94'),C('#7d7d78'),C('#b3b3ad'),0.25)); }, false);
// Planning notice on two posts (permit under review)
export const noticeSprite = () => thing(e=>{ const x0=e.ox-8, y0=e.oy-22;
  for(let j=0;j<14;j++){ e.put(x0+2,y0+8+j,C('#6d4c35')); e.put(x0+13,y0+8+j,C('#6d4c35')); }
  for(let j=0;j<11;j++) for(let i=0;i<16;i++){ let c = j<3 ? C('#1d3c78') : C('#fbfaf5');
    if(j===1 && i>2 && i<13 && i%2) c=C('#f2c230'); if(j>=5 && j%2===1 && i>1 && i<14-((j*3)%5)) c=C('#9aa5bd'); e.put(x0+i,y0+j,c); }
  for(let j=0;j<7;j++) for(let i=0;i<5;i++) e.put(e.ox+10+i,e.oy-3-j+ (i>>1), j===0 ? C('#fbfaf5') : (j%2 ? C('#e9e4d4') : C('#d7d0bc')));
});
// Approved, waiting for a contractor: barrier tape around the plot
export const fenceSprite = () => thing(e=>{ const T=(s)=> Math.floor(s/3)%2 ? C('#f4f4f4') : C('#e8442e');
  faceB(e,-0.44,-0.44,0.44,2,4,(s)=>sh(T(s),0.8)); faceA(e,-0.44,-0.44,0.44,2,4,(s)=>sh(T(s),0.7));
  faceB(e,0.44,-0.44,0.44,2,4,(s)=>T(s)); faceA(e,0.44,-0.44,0.44,2,4,(s)=>sh(T(s),0.85));
  for(const [a,b] of [[-0.44,-0.44],[0.44,-0.44],[-0.44,0.44],[0.44,0.44]]){ const x=Math.round(e.ox+(a-b)*32), y=Math.round(e.oy+(a+b)*16);
    for(let j=0;j<6;j++) e.put(x,y-j,C('#4a3b2d')); }
}, false);
// A developer's billboard (private project getting its permit): black and gold, very luxurious
export const billboardSprite = () => thing(e=>{ const x0=e.ox-12, y0=e.oy-30;
  for(let j=0;j<18;j++){ e.put(x0+3,y0+10+j,C('#3a3a3a')); e.put(x0+20,y0+10+j,C('#3a3a3a')); }
  for(let j=0;j<13;j++) for(let i=0;i<24;i++){ let c = C('#1c1c24');
    if(j===0||j===12||i===0||i===23) c = C('#d4af37'); else if(j>=3&&j<=5&&i>3&&i<20&&(i%3)) c = lamp(C('#e6c34a')); else if(j>=8&&j<=9&&i>5&&i<18&&i%2) c = C('#9a9aa8'); e.put(x0+i,y0+j,c); }
});
// Abandoned development: bare concrete frame, rusty rebar, weeds
export const ruinSprite = () => thing(e=>{ const G=C('#a3a09a');
  for(const [a,b] of [[-0.3,-0.3],[0.3,-0.3],[-0.3,0.3],[0.3,0.3]]) box(e,a-0.04,a+0.04,b-0.04,b+0.04,0,26,()=>sh(G,0.95),()=>sh(G,0.72),()=>G);
  box(e,-0.34,0.34,-0.34,0.34,12,14,()=>sh(G,0.9),()=>sh(G,0.68),()=>sh(G,1.05));
  box(e,-0.34,0.34,-0.34,0.34,24,26,()=>sh(G,0.9),()=>sh(G,0.68),()=>sh(G,1.05));
}, true, e=>{ for(const [a,b] of [[-0.3,-0.3],[0.3,-0.3],[-0.3,0.3],[0.3,0.3]]){ const x=Math.round(e.ox+(a-b)*32), y=Math.round(e.oy+(a+b)*16);
  for(let j=0;j<5;j++) e.put(x+(j%2),y-27-j,C('#8b4a2b')); e.put(x-2,y,C('#5e8f31')); e.put(x+2,y-1,C('#6aa846')); } });
// Municipal land: a bare pole; the pennant waves (animated overlay)
export const flagSprite = () => thing(e=>{ const x=e.ox, y=e.oy;
  for(let j=0;j<16;j++) e.put(x,y-j,C('#5d4030'));
  e.put(x-1,y,C('#5d4030')); e.put(x+1,y,C('#5d4030')); }, false);
// Cars: a small iso box; axis 'A' drives along screen ↘↖, 'B' along ↙↗
export const CAR_COLS = ['#c62f28','#2a63c9','#f2f2ee','#1d8148','#e6b400','#3a3d44','#8a5cc4','#e8762b'];
export const carSprite = (axis, kind) => spr('car'+axis+kind, ()=> sprite(30,24,15,17, e=>{
  const bus = kind==='bus', col = bus ? C('#f2c230') : C(CAR_COLS[kind]);
  const L = bus ? 0.19 : 0.1, Wd = bus ? 0.065 : 0.055;
  const [a0,a1,b0,b1] = axis==='A' ? [-L,L,-Wd,Wd] : [-Wd,Wd,-L,L];
  plane(e,a0+0.02,a1+0.03,b0-0.01,b1+0.02,0,0,0,()=>[20,25,30,90]);
  box(e,a0,a1,b0,b1,0,3,(s,z)=> z<1 ? C('#24262b') : sh(col,0.92),(s,z)=> z<1 ? C('#1b1d21') : sh(col,0.7),()=>sh(col,1.08));
  if(bus) box(e,a0,a1,b0,b1,3,7,(s,z)=> (z>0.5&&z<2.5&&s%3>0.7) ? C('#2e4255') : sh(col,0.95),(s,z)=> (z>0.5&&z<2.5) ? C('#2e4255') : sh(col,0.75),()=>C('#e9e6dc'));
  else { const [c0,c1,d0,d1] = axis==='A' ? [-0.06,0.04,-Wd+0.008,Wd-0.008] : [-Wd+0.008,Wd-0.008,-0.06,0.04];
    box(e,c0,c1,d0,d1,3,5,()=>C('#3b5670'),()=>C('#2b4256'),()=>sh(col,1.18)); }
}, false));
