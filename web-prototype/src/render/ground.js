import { C, CROPS, PX, eachPx, faceA, faceB, frac, hsh, sh, sprite } from './pixel.js';

// ---------- ground tiles (64×32) ----------
export function ground(shader){ return sprite(64,32,32,16, e=>eachPx(e,(x,y,dx,dy)=>{
  const a=(dx/32+dy/16)/2, b=(dy/16-dx/32)/2; if(a<-0.5||a>=0.5||b<-0.5||b>=0.5) return;
  const u=a+0.5, v=b+0.5; let c = shader(u,v,x,y); if(!c) return;
  if(u>0.972||v>0.972) c = sh(c,0.86); else if(u<0.02||v<0.02) c = sh(c,1.07);   // parcel edges
  e.put(x,y,c); })); }
export const speck = (x,y,s,base,dark,light,p=0.12) => { const n=hsh(x,y,s); return n<p ? dark : n>1-p ? light : base; };
export const grassPx = (x,y,s) => { const n=hsh(x,y,s);
  if(n>0.994) return hsh(x,y,s+1)<0.5 ? C('#f4f1d0') : C('#f2d14b');
  return speck(x,y,s,PX.grass,PX.grassD,PX.grassL,0.14); };
export const GROUNDS = {
  grass: v => ground((u,w,x,y)=>grassPx(x,y,v)),
  farm: (v,o) => { const cr=CROPS[v%4]; return ground((u,w,x,y)=>{
    if(u<0.07||w<0.07||u>0.93||w>0.93) return hsh(x,y,v)<0.45 ? PX.hedge : grassPx(x,y,v);
    const n=hsh(x,y,v+9), t = o ? u : w;
    if(frac(t*7) < 0.32) return n<0.15 ? cr.base : cr.row;
    return n<0.1 ? cr.row : n>0.88 ? cr.hi : cr.base; }); },
  muni: v => ground((u,w,x,y)=> speck(x,y,v, frac((u+w)*3)<0.5 ? PX.lawn : PX.lawnD, PX.lawnD, PX.grassL, 0.06)),
  habitat: v => ground((u,w,x,y)=>{ const n=hsh(x,y,v);
    if(n>0.985) return C('#a374d9'); if(n>0.975) return C('#f5f0e6');
    return n<0.2 ? C('#4f8a33') : n>0.85 ? C('#6aa846') : C('#5b9a3c'); }),
  village: v => ground((u,w,x,y)=>{
    if(Math.abs(u-0.5)<0.43 && Math.abs(w-0.5)<0.43) return ((x>>1)+(y&1))%3===0 ? sh(PX.cobble,0.88) : speck(x,y,v,PX.cobble,sh(PX.cobble,0.92),sh(PX.cobble,1.06),0.1);
    return grassPx(x,y,v); }),
  earth: v => ground((u,w,x,y)=>{ if(Math.abs(frac(u*5)-0.5)<0.06 && w>0.15) return PX.earthD;
    return speck(x,y,v,PX.earth,PX.earthD,PX.earthL,0.12); }),
  plaza: v => ground((u,w,x,y)=>{ if(u<0.08||w<0.08||u>0.92||w>0.92) return grassPx(x,y,v);
    return (frac(u*8)<0.1||frac(w*8)<0.1) ? PX.paveD : speck(x,y,v,PX.pave,PX.paveD,sh(PX.pave,1.05),0.05); }),
  yard: v => ground((u,w,x,y)=>{ if(u<0.06||w<0.06||u>0.94||w>0.94) return grassPx(x,y,v);
    if(w>0.62 && frac(u*7)<0.09) return PX.yellow;
    return speck(x,y,v,C('#7a7e84'),C('#6e7278'),C('#878b91'),0.1); }),
  school: v => ground((u,w,x,y)=>{ if(u<0.06||w<0.06||u>0.94||w>0.94) return grassPx(x,y,v);
    if(w>0.55){ const lu=Math.abs(u-0.5), lw=Math.abs(w-0.76);
      if((lu>0.36&&lu<0.4&&lw<0.17)||(lw>0.15&&lw<0.19&&lu<0.4)||(Math.abs(u-0.5)<0.02&&lw<0.17)) return PX.paint;
      return speck(x,y,v,C('#c5643d'),C('#b65a36'),C('#d2724a'),0.06); }
    return speck(x,y,v,PX.pave,PX.paveD,sh(PX.pave,1.05),0.05); }),
  serviced: v => ground((u,w,x,y)=>{ if(u<0.06||w<0.06||u>0.94||w>0.94) return grassPx(x,y,v);
    if(Math.abs(u-0.5)<0.014 || Math.abs(w-0.5)<0.014) return PX.paint;
    return speck(x,y,v,C('#cdb88c'),C('#b9a275'),C('#dbc9a0'),0.1); }),
  park: v => ground((u,w,x,y)=>{
    if(Math.abs(u-w)<0.05 || Math.abs(u+w-1)<0.05) return speck(x,y,v,C('#dccb9f'),C('#c9b78a'),C('#e8dab2'),0.1);
    const n=hsh(x,y,v); if(n>0.99) return C('#f2d14b');
    return n<0.15 ? C('#5fa83c') : n>0.86 ? C('#86cc5a') : C('#6fb848'); }),
};
// Roads: one sprite per 4-way connection mask (1 NE · 2 SE · 4 SW · 8 NW, in screen space)
export function inRoad(du,dv,m,w){ if(Math.abs(du)<w && Math.abs(dv)<w) return true;
  return (m&1 && dv<0 && Math.abs(du)<w) || (m&2 && du>0 && Math.abs(dv)<w) || (m&4 && dv>0 && Math.abs(du)<w) || (m&8 && du<0 && Math.abs(dv)<w)
    // diagonal neighbours sit straight up/right/down/left on screen: the strip runs to the tile corner
    || (m&16 && du+dv<0 && Math.abs(du-dv)<w*0.9) || (m&64 && du+dv>0 && Math.abs(du-dv)<w*0.9)
    || (m&32 && du-dv>0 && Math.abs(du+dv)<w*1.8) || (m&128 && du-dv<0 && Math.abs(du+dv)<w*1.8); }
// The two tiles beside a diagonal road link get a wedge of asphalt at the shared corner (1 N · 2 E · 4 S · 8 W corner)
export function wedgeTile(m){ return ground((u,v,x,y)=>{ const du=u-0.5, dv=v-0.5;
  const band = k => (m&1 && Math.abs(du+dv+1)<k*1.8) || (m&4 && Math.abs(du+dv-1)<k*1.8) || (m&2 && Math.abs(du-dv-1)<k*0.9) || (m&8 && Math.abs(du-dv+1)<k*0.9);
  if(band(0.28)) return speck(x,y,m+9,PX.asphalt,sh(PX.asphalt,0.92),PX.asphaltL,0.1);
  if(band(0.305)) return PX.curb;
  if(band(0.37)) return speck(x,y,m+9,PX.walk,sh(PX.walk,0.93),sh(PX.walk,1.04),0.06);
  return null; }); }
export function roadTile(m, regional){ const w = regional ? 0.34 : 0.28, side = regional ? 0.42 : 0.37;
  return ground((u,v,x,y)=>{ const du=u-0.5, dv=v-0.5;
    if(inRoad(du,dv,m,w)){
      const inCore = Math.abs(du)<w && Math.abs(dv)<w, alongB = (m&5) && !((m&10) && inCore), alongA = (m&10) && !((m&5) && inCore);
      if(alongB && Math.abs(du)<0.022 && frac(v*4+0.25)<0.5 && (m&5)===5 || alongB && !inCore && Math.abs(du)<0.022 && frac(v*4+0.25)<0.5) return PX.paint;
      if(alongA && Math.abs(dv)<0.022 && frac(u*4+0.25)<0.5 && (m&10)===10 || alongA && !inCore && Math.abs(dv)<0.022 && frac(u*4+0.25)<0.5) return PX.paint;
      if(regional && (Math.abs(Math.abs(du)-w+0.04)<0.015 && (m&5) || Math.abs(Math.abs(dv)-w+0.04)<0.015 && (m&10)) && !inCore) return PX.paint;
      return speck(x,y,m,PX.asphalt,sh(PX.asphalt,0.92),PX.asphaltL,0.1); }
    if(inRoad(du,dv,m,side)) return regional ? speck(x,y,m,C('#a39878'),C('#8f8566'),C('#b5aa8a'),0.2)
                                            : (inRoad(du,dv,m,w+0.025) ? PX.curb : speck(x,y,m,PX.walk,sh(PX.walk,0.93),sh(PX.walk,1.04),0.06));
    return grassPx(x,y,m+5); }); }
// River / flood zone: a channel that joins the neighbouring flood parcels
export function riverTile(m, ph=0){ return ground((u,v,x,y)=>{ const du=u-0.5, dv=v-0.5;
  if(inRoad(du,dv,m,0.2)){ if(hsh((x+ph*2)>>2,y,m+ph*13)>0.9) return PX.foam; return ((x+y*2+ph*2)%7<3 && hsh(x,y+ph,3)<0.6) ? PX.waterL : PX.water; }
  if(inRoad(du,dv,m,0.26)) return speck(x,y,m,PX.bank,sh(PX.bank,0.9),sh(PX.bank,1.06),0.15);
  const n=hsh(x,y,m+40); if(n>0.93) return PX.reed; if(n<0.04) return PX.waterL;
  return n<0.25 ? sh(PX.marsh,0.92) : PX.marsh; }); }
// The earth slab under the map's front edges
export const skirt = side => sprite(64,48,32,16, e=>{
  const col = (s,z,x)=>{ const d=-z; return d<3 ? PX.soil1 : d<8 ? speck(x,z|0,2,PX.soil2,sh(PX.soil2,0.9),PX.soil1,0.1) : speck(x,z|0,3,PX.soil3,sh(PX.soil3,0.88),sh(PX.soil3,1.08),0.2); };
  if(side==='L') faceB(e,0.5,-0.5,0.5,-14,0,(s,z,x)=>sh(col(s,z-14,x),0.92));
  else faceA(e,0.5,-0.5,0.5,-14,0,(s,z,x)=>sh(col(s,z-14,x),0.72)); });
// Parcel outlines
export const ring = (col, thick, dotted) => ground((u,v,x,y)=>{
  const t = thick; if(!(u<t||v<t||u>1-t||v>1-t)) return null;
  if(dotted && ((x>>1)+y)%3===0) return null; return col; });
