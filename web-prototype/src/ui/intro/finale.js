// =====================================================================
//  THE INTRO, LAST SHOT — the title screen itself, on a 1280×720 plate (sky pixels of 4, the logo at 7 per art pixel,
//  the town 1:1): sky, rays, clouds, the town rising into place, a cheering crowd with a few flags of Europe, six
//  bureaucrats dancing at the menu theme's 130 BPM, and the logo dropping in, then bobbing letter by letter with sparkles.
// =====================================================================
import LOGO_URL from '../../assets/logo.svg';
import FACES_URL from '../../assets/logo-faces.svg';
import { CAST, paintPerson } from '../../render/evart.js';
import { handFlag } from '../../render/crowd.js';
const HW=1280,HH=720,PS=4,SW=HW/PS,SH=HH/PS;
const img=src=>{const i=new Image();const p=new Promise(res=>{i.onload=i.onerror=()=>res();});i.src=src;return [i,p];};
const [logo,p1]=img(LOGO_URL),[faces,p2]=img(FACES_URL);
let dio=null;   // the title screen's own diorama canvas, animated by its frame loop
const BAYER=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
const dith=(x,y)=>(BAYER[(y&3)*4+(x&3)]+.5)/16;
const C=h=>[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];
const sh=(c,k)=>c.map(v=>Math.min(255,Math.round(v*k)));
const hsh=(a,b,c)=>{let n=Math.sin(a*127.1+b*311.7+c*74.7)*43758.5453;return n-Math.floor(n);};
const LOGO={w:74*7,h:17*7,x:(HW-74*7)/2,y:58};
const RX=SW/2,RY=(LOGO.y+LOGO.h/2)/PS;
const DIO={x:Math.round((HW-452)/2),y:300};
const hy=Math.round((330+262*.42)/PS);
const far=x=>hy-7-4*Math.sin(x*0.045+1.3)-3*Math.sin(x*0.13)-(hsh(x>>2,3,5)<0.3?1:0);
const near=x=>hy+5+4*Math.sin(x*0.03+2.1)+2*Math.sin(x*0.09+0.4);
const cv=(w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;return c;};

/* sky, hills, trees and two cranes — painted once */
const sky=cv(SW,SH);(function(){
  const g=sky.getContext('2d'),im=g.createImageData(SW,SH),d=im.data;
  const pal=['#0b1f4d','#0f2c70','#163f94','#1d4cab','#2a63c9','#3f77d4','#5d8fdf','#86ade9'].map(C);
  const farC=C('#4d78c9'),farD=C('#4570c0'),nearC=C('#24489a'),nearD=C('#1f4190'),low=C('#173576'),low2=C('#122b62');
  for(let y=0;y<SH;y++)for(let x=0;x<SW;x++){let c;const nY=near(x),fY=far(x);
    if(y>=nY){const k=(y-nY)/Math.max(1,SH-nY);c=k>0.25+dith(x,y)*0.5?low2:(y-nY<2?nearC:(dith(x,y)<0.5?nearD:low));}
    else if(y>=fY){c=(y-fY<1)?sh(farC,1.08):(dith(x,y)<0.3?farD:farC);}
    else{const tt=Math.min(Math.max(y/Math.max(1,fY),0),.999)*(pal.length-1),i=Math.floor(tt),f=tt-i;c=f>dith(x,y)?pal[Math.min(i+1,pal.length-1)]:pal[i];}
    const o=(y*SW+x)*4;d[o]=c[0];d[o+1]=c[1];d[o+2]=c[2];d[o+3]=255;}
  const put=(x,y,c)=>{if(x<0||y<0||x>=SW||y>=SH)return;const o=(y*SW+x)*4;d[o]=c[0];d[o+1]=c[1];d[o+2]=c[2];};
  for(let x=2;x<SW;x+=5+Math.floor(hsh(x,9,9)*6)){const y0=Math.floor(near(x)),th=2+Math.floor(hsh(x,4,4)*3);for(let j=1;j<=th;j++)for(let i=-1;i<=1;i++)if(!(j===th&&i))put(x+i,y0-j,nearD);}
  [[0.18,0.9],[0.83,1.1]].forEach(([fx,sz])=>{const x0=Math.round(SW*fx),y0=Math.floor(far(x0)),H2=Math.round(16*sz);
    for(let j=0;j<H2;j++)put(x0,y0-j,farD);for(let i=-Math.round(9*sz);i<=Math.round(5*sz);i++)put(x0+i,y0-H2,farD);for(let j=0;j<5;j++)put(x0+Math.round(4*sz),y0-H2+j,farD);});
  g.putImageData(im,0,0);})();

/* clouds — white on top, pale blue underneath */
function cloud(seed){const w=34+Math.floor(hsh(seed,1,2)*20),h=12,c=cv(w,h),g=c.getContext('2d'),im=g.createImageData(w,h),d=im.data;
  const blobs=[[0.25,0.7,0.24],[0.5,0.45,0.32],[0.75,0.68,0.24],[0.4,0.75,0.26],[0.62,0.78,0.22]];
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const inside=blobs.some(([bx,by,r])=>{const dx=(x+.5)/w-bx,dy=((y+.5)/h-by)*h/w;return dx*dx+dy*dy<r*r*0.62;})&&y<h-1;if(!inside)continue;
    const col=y>h*0.62?C('#c9daf4'):(y>h*0.5&&dith(x,y)<0.5)?C('#dfe9f9'):C('#ffffff');const o=(y*w+x)*4;d[o]=col[0];d[o+1]=col[1];d[o+2]=col[2];d[o+3]=255;}
  g.putImageData(im,0,0);return c;}
const CLOUDS=[[1,6,2.6,40],[2,26,1.9,210],[3,4,2.2,300],[4,40,1.6,120],[5,16,2.9,-40]].map(([s,y,v,x0])=>({c:cloud(s),y,v,x0}));

/* rays behind the logo */
const RAYS=14,RL=[0,0.09,0.17,0.27],rays=cv(SW,SH),rg=rays.getContext('2d'),N=SW*SH,ang=new Float32Array(N),rad=new Float32Array(N),on=new Uint8Array(N),th=new Float32Array(N);
(function(){const R=Math.hypot(Math.max(RX,SW-RX),Math.max(RY,SH-RY));for(let y=0;y<SH;y++)for(let x=0;x<SW;x++){const i=y*SW+x,fy=far(x);
  on[i]=y<fy-1?1:0;ang[i]=Math.atan2(y-RY,x-RX);rad[i]=Math.hypot(x-RX,(y-RY)*1.15)/R;th[i]=dith(x,y);if(y>=fy-6&&y<fy-1)th[i]=1-(1-th[i])*((fy-1-y)/5);}})();
function paintRays(T,gain){const im=rg.createImageData(SW,SH),d=im.data;
  const rot=0.16*Math.sin(T*0.31)+0.05*Math.sin(T*0.83+1.2)+T*0.025,wid=[],amp=[];
  for(let r=0;r<RAYS;r++){wid.push(0.30+0.12*Math.sin(T*0.9+r*1.7));amp.push(0.55+0.45*Math.sin(T*(0.7+(r%3)*0.17)+r*2.3));}
  const halo=0.82+0.18*Math.sin(T*1.3),k=RAYS/(2*Math.PI);
  for(let i=0;i<N;i++){if(!on[i])continue;const u=(ang[i]+Math.PI+rot)*k,r=Math.floor(u),f=u-r-0.5,ri=((r%RAYS)+RAYS)%RAYS;
    const ray=Math.max(0,1-Math.abs(f)/wid[ri])*amp[ri],q=rad[i],fall=Math.max(0,1-q*1.35);
    let s=(ray*fall*1.15+Math.max(0,1-q*4.2)*halo*0.9)*gain;s=s*3+th[i]-0.5;const lv=s<=0?0:Math.min(3,Math.floor(s));if(!lv)continue;
    const o=i*4;d[o]=196;d[o+1]=218;d[o+2]=255;d[o+3]=RL[lv]*255;}
  rg.putImageData(im,0,0);}

/* the crowd: the little people of the event illustrations (15 px, the game's own person() and cast), cheering on the hills and in front */
const SHIRTS=['#c62f28','#2a63c9','#1d8148','#e6b400','#8a5cc4','#e8762b','#f2f2ee','#3a3d44'],SKINS=['#f1c9a5','#d9a27a','#a8714a','#7a4e2d','#f6d7bd'],HAIR=['#2b2017','#5a3b22','#c9a26b','#7a7a7a','#1b1b1b'];
const ERED='#c62f28',person=paintPerson;
const pick=(a,s)=>a[Math.floor(hsh(s,7,3)*a.length)];
const CHEER=['up','both','wave',null,'both','up'];
function local(s){return {shirt:pick(SHIRTS,s),skin:pick(SKINS,s+1),hair:pick(HAIR,s+2),pants:hsh(s,1,1)<.5?'#2f3542':'#3a4b6b',long:hsh(s,2,2)<.3,skirt:hsh(s,3,3)<.12?pick(SHIRTS,s+4):null,cap:hsh(s,4,4)<.08?pick(SHIRTS,s+5):null,glasses:hsh(s,5,5)<.12?'#3a3d44':null};}
const CASTK=['mayor','neighbour','farmer','heritage','union','banker','developer','worker','brussels'];
const HILL=[],FRONT=[];
for(let row=0;row<2;row++)for(let x=1+row*3;x<SW-2;x+=6){const s=row*400+x;HILL.push({flag:hsh(s,13,13)<.07,x:x+Math.round(hsh(s,9,1)*2),y:Math.floor((row?near:far)(x))+(row?3:5),o:{...local(s),bob:5+hsh(s,1,8)*3},arm:CHEER[Math.floor(hsh(s,6,6)*6)],sp:hsh(s,8,8)});}
[[150,7],[158,7],[167,7],[177,6],[188,6]].forEach(([fy,st],row)=>{for(let x=-2+row*3;x<SW;x+=st){const s=1000+row*500+x;let o=local(s);const ck=hsh(s,11,11);
  if(row>=2&&ck<.16)o={...CAST[CASTK[Math.floor(hsh(s,12,12)*CASTK.length)]]};
  FRONT.push({flag:row>=1&&row<=3&&hsh(s,13,14)<.03,row,x:x+Math.round(hsh(s,9,2)*2),y:fy+Math.round(hsh(s,9,3)*2),o:{...o,bob:5+hsh(s,1,9)*3},arm:CHEER[Math.floor(hsh(s,6,7)*6)],sp:hsh(s,8,9)});}});
const crowd=cv(SW,SH),cg=crowd.getContext('2d');
function armAt(p,t){if(!p.arm)return Math.floor(t*2+p.sp*4)%3===0?'up':null;return Math.floor(t*(1.5+p.sp)+p.sp*5)%4===3?(p.arm==='both'?'up':'both'):p.arm;}
function paintHill(t){cg.clearRect(0,0,SW,SH);HILL.forEach(p=>{const hd=person(cg,p.x,p.y,{...p.o,arm:p.flag?'up':armAt(p,t)},t);if(p.flag)handFlag(cg,hd.hx,hd.hy,t,p.x*.3,9,6);});}
function paintFront(t){cg.clearRect(0,0,SW,SH);let last=-1;FRONT.forEach(p=>{if(p.row!==last&&p.row===3){cg.fillStyle='rgba(6,18,50,.22)';cg.fillRect(0,0,SW,SH);}last=p.row;const hd=person(cg,p.x,p.y,{...p.o,arm:p.flag?'up':armAt(p,t)},t);if(p.flag)handFlag(cg,hd.hx,hd.hy,t,p.x*.3,11,7);});}

/* the bureaucrats, dancing like nobody is auditing: twice the size, in front */
const BPM=130,dance=cv(160,90),dg=dance.getContext('2d');
const DANCERS=[{x:5,k:'suit',hair:'#2b2017',case:true},{x:24,k:'brussels'},{x:46,k:'banker'},{x:106,k:'suit',hair:'#c9a26b',skin:'#a8714a',tie:ERED},{x:128,k:'brussels',hair:'#5a3b22',glasses:'#3a3d44'},{x:148,k:'suit',hair:'#7a7a7a',bald:true,case:true}];
const MOVES=[['disco','discoL','disco','discoL'],['both','side','both','side'],['shrug','up','shrug','wave'],['side','up','side','both'],['discoL','disco','both','shrug'],['wave','up','wave','both']];
const PAPERS=Array.from({length:22},(_,i)=>({d:i%6,ph:hsh(i,3,1),vx:(hsh(i,4,1)-.5)*16,vy:22+hsh(i,5,1)*14}));
function paintDance(t){dg.clearRect(0,0,160,90);const b=t*BPM/60,bi=Math.floor(b),bf=b-bi;
  DANCERS.forEach((d,i)=>{const mv=MOVES[i%MOVES.length],arm=mv[(bi+i)%4],hop=bf<.25?1:0,sway=((bi+i)%2?1:-1),kick=(bi+i)%3===0?(sway>0?1:-1):0;
    const o={...CAST[d.k],...(d.hair?{hair:d.hair}:{}),...(d.skin?{skin:d.skin}:{}),...(d.tie?{tie:d.tie}:{}),...(d.glasses?{glasses:d.glasses}:{}),...(d.bald?{bald:true}:{}),arm:d.case&&arm==='side'?'hold':arm,hop,kick,flap:hop,case:d.case};
    dg.fillStyle='rgba(0,0,0,.3)';dg.fillRect(d.x-2,83,10,1);person(dg,d.x+sway,84,o,t);});
  PAPERS.forEach(p=>{const T=(t*.55+p.ph)%1,dd=DANCERS[p.d],x=dd.x+2+p.vx*T,y=70-p.vy*T+30*T*T;if(y>84)return;dg.fillStyle=Math.floor(t*6+p.ph*9)%2?'#fbf8ee':'#d8d2bc';dg.fillRect(Math.round(x),Math.round(y),2,Math.floor(t*6+p.ph*9)%2?1:2);});}

/* the shine that sweeps across the letters now and then */
const shine=cv(LOGO.w,LOGO.h),sg=shine.getContext('2d');
function paintShine(p){sg.globalCompositeOperation='source-over';sg.clearRect(0,0,LOGO.w,LOGO.h);sg.imageSmoothingEnabled=false;sg.drawImage(faces,0,0,LOGO.w,LOGO.h);
  sg.globalCompositeOperation='source-in';const x=-LOGO.w*.35+p*LOGO.w*1.7,sk=LOGO.h*0.27;
  sg.fillStyle='rgba(255,240,170,.85)';sg.beginPath();sg.moveTo(x+sk,0);sg.lineTo(x+sk+24,0);sg.lineTo(x+24-sk,LOGO.h);sg.lineTo(x-sk,LOGO.h);sg.fill();
  sg.fillStyle='rgba(255,240,170,.55)';sg.beginPath();sg.moveTo(x+sk+36,0);sg.lineTo(x+sk+48,0);sg.lineTo(x+48-sk,LOGO.h);sg.lineTo(x+36-sk,LOGO.h);sg.fill();}

const plate=cv(HW,HH),pg=plate.getContext('2d');
const easeOut=x=>1-Math.pow(1-x,3);
function draw(t){
  const g=pg;g.imageSmoothingEnabled=false;
  g.drawImage(sky,0,0,HW,HH);
  paintRays(t,Math.min(1,Math.max(0,(t-0.25)/0.9)));g.drawImage(rays,0,0,HW,HH);
  CLOUDS.forEach(c=>{const x=((c.x0+t*c.v*4)%(SW+80))-60;g.drawImage(c.c,Math.round(x)*PS,c.y*PS,c.c.width*PS,c.c.height*PS);});
  paintHill(t);g.drawImage(crowd,0,0,HW,HH);
  /* the town rises into place, then bobs like on the title screen */
  if(t>0.8&&dio&&dio.width){const p=Math.min(1,(t-0.8)/1.3),y=DIO.y+Math.round((1-easeOut(p))*420)-(p>=1&&Math.floor((t-2.1)/1.6)%2?4:0);g.drawImage(dio,DIO.x,y);}
  paintFront(t);g.drawImage(crowd,0,0,HW,HH);
  g.fillStyle='rgba(6,18,50,.38)';g.fillRect(0,560,HW,160);
  DANCERS.forEach((d,i)=>{const x=(d.x+2.5)*8,sw=Math.sin(t*1.7+i*1.3)*60,on=Math.floor(t*BPM/60+i)%2;
    g.fillStyle=on?'rgba(255,246,190,.16)':'rgba(255,246,190,.10)';g.beginPath();g.moveTo(x+sw-14,0);g.lineTo(x+sw+14,0);g.lineTo(x+70,720);g.lineTo(x-70,720);g.closePath();g.fill();
    g.fillStyle='rgba(255,246,190,.22)';g.fillRect(x-56,664,112,14);});
  paintDance(t);g.drawImage(dance,0,0,HW,HH);
  /* the logo drops in and lands with a bounce; then every letter bobs on its own wave, and sparkles light up on the letters */
  let ly;if(t<0.42){const p=t/0.42;ly=-LOGO.h-20+(LOGO.y+LOGO.h+20)*p*p;}
  else if(t<0.9){const p=(t-0.42)/0.48;ly=LOGO.y-Math.round(Math.abs(Math.sin(p*Math.PI*2))*(1-p)*22);}
  else ly=LOGO.y;
  if(t>0.42&&t<0.62){g.fillStyle='rgba(6,18,50,'+(0.35*(1-(t-0.42)/0.2))+')';g.fillRect(0,0,HW,HH);}
  const amp=Math.min(1,Math.max(0,(t-0.9)/0.7)),shineOn=t>1.4&&((t-1.4)/5.5)%1<0.3;
  if(shineOn)paintShine(Math.floor((((t-1.4)/5.5)%1)/0.3*30)/30);
  SLICES.forEach(([a,w],i)=>{const dy=Math.round(Math.sin(t*5+i*.8)*5*amp)*PS;
    g.drawImage(logoC,a*7,0,w*7,LOGO.h,LOGO.x+a*7,ly+dy,w*7,LOGO.h);
    if(shineOn)g.drawImage(shine,a*7,0,w*7,LOGO.h,LOGO.x+a*7,ly+dy,w*7,LOGO.h);});
  if(t>0.6)for(let i=0;i<5;i++){const n=Math.floor(t*1.6+i*.37),ph=(t*1.6+i*.37)%1;if(ph>=.4)continue;
    const sx=Math.round((LOGO.x+20+hsh(n,i,1)*(LOGO.w-40))/PS),sy=Math.round((ly+16+hsh(n,i,2)*(LOGO.h-40))/PS),sz=Math.round(4*(1-Math.abs(ph-.2)/.2));if(sz<1)continue;
    g.fillStyle='#fffbe0';g.fillRect((sx-sz)*PS,sy*PS,(2*sz+1)*PS,PS);g.fillRect(sx*PS,(sy-sz)*PS,PS,(2*sz+1)*PS);g.fillStyle='#ffffff';g.fillRect(sx*PS,sy*PS,PS,PS);}
  return plate;
}
const logoC=cv(LOGO.w,LOGO.h);let SLICES=[[0,74]];
const ready=Promise.all([p1,p2]).then(()=>{const lg=logoC.getContext('2d');lg.imageSmoothingEnabled=false;lg.drawImage(logo,0,0,LOGO.w,LOGO.h);
  const f=cv(74,17),fgc=f.getContext('2d');fgc.drawImage(faces,0,0,74,17);const d=fgc.getImageData(0,0,74,17).data,col=[];
  for(let x=0;x<74;x++){let on=0;for(let y=0;y<17;y++)if(d[(y*74+x)*4+3]>40)on=1;col.push(on);}
  const runs=[];for(let x=0;x<74;x++){if(col[x]&&(x===0||!col[x-1]))runs.push([x,x]);if(col[x])runs[runs.length-1][1]=x;}
  if(runs.length>=2){const cut=[0];for(let i=1;i<runs.length;i++)cut.push(Math.round((runs[i-1][1]+1+runs[i][0])/2));cut.push(74);SLICES=runs.map((_,i)=>[cut[i],cut[i+1]-cut[i]]);}});
export {draw, ready};
export function useDiorama(cv){ dio = cv; }
