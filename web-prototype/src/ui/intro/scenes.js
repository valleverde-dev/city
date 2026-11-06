// =====================================================================
//  THE INTRO, SHOTS 1–7 — pixel-art scenes of 320×180 painted in code: graduation, the desk, the phone, the station,
//  the corridor, the office, the nameplate. Each is a static background (painted once) and a foreground (every frame).
//  The protagonist is always seen from behind; figures are drawn in the Papers, Please manner (man()).
// =====================================================================
/* ---------- pixel kit (320×180 art pixels) ---------- */
const P={navy:'#0b1f4d',blue:'#163f94',eu:'#003399',gold:'#ffcc00',yel:'#ffd200',yel2:'#e6b400',paper:'#fbf8ee',skin:'#e2ad85',skinD:'#c48a64'};
function r(c,col,x,y,w,h){c.fillStyle=col;c.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)));}
function poly(c,col,pts){c.fillStyle=col;c.beginPath();c.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)c.lineTo(pts[i],pts[i+1]);c.closePath();c.fill();}
const PC=new Map();
function pat(c,col){const k=col;let cv=PC.get(k);if(!cv){cv=document.createElement('canvas');cv.width=cv.height=2;const x=cv.getContext('2d');x.fillStyle=col;x.fillRect(0,0,1,1);x.fillRect(1,1,1,1);PC.set(k,cv);}return c.createPattern(cv,'repeat');}
function dith(c,col,x,y,w,h){c.fillStyle=pat(c,col);c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
function polyd(c,col,pts,a){c.save();if(a!=null)c.globalAlpha=a;c.fillStyle=pat(c,col);c.beginPath();c.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;i+=2)c.lineTo(pts[i],pts[i+1]);c.closePath();c.fill();c.restore();}
function vband(c,x,y,w,h,cols){const n=cols.length,bh=h/n;for(let i=0;i<n;i++)r(c,cols[i],x,y+i*bh,w,bh+1);for(let i=1;i<n;i++)dith(c,cols[i],x,y+i*bh-3,w,3);}
function disc(c,col,cx,cy,rad){for(let dy=-rad;dy<=rad;dy++){const w=Math.floor(Math.sqrt(rad*rad-dy*dy));r(c,col,cx-w,cy+dy,2*w+1,1);}}
function line(c,col,x0,y0,x1,y1){const n=Math.max(Math.abs(x1-x0),Math.abs(y1-y0))|0;c.fillStyle=col;for(let i=0;i<=n;i++)c.fillRect(Math.round(x0+(x1-x0)*i/n),Math.round(y0+(y1-y0)*i/n),1,1);}
function hsh(n){n=Math.sin(n*127.1)*43758.5;return n-Math.floor(n);}
const STAR=["..#..","#####",".###.","##.##"];
function star5(c,x,y,col){for(let j=0;j<4;j++)for(let i=0;i<5;i++)if(STAR[j][i]==='#')r(c,col,x+i,y+j,1,1);}
function euflag(c,x,y,w,h){r(c,P.eu,x,y,w,h);const cx=x+w/2,cy=y+h/2,R=h*0.33;
  for(let k=0;k<12;k++){const a=k*Math.PI/6,sx=Math.round(cx+R*Math.cos(a)),sy=Math.round(cy+R*Math.sin(a));
    if(h>=34)star5(c,sx-2,sy-2,P.gold);else if(h>=14){r(c,P.gold,sx-1,sy,3,1);r(c,P.gold,sx,sy-1,1,3);}else r(c,P.gold,sx,sy,1,1);}}
function spark(c,x,y,s,col){r(c,col,x-s,y,2*s+1,1);r(c,col,x,y-s,1,2*s+1);r(c,'#fff',x,y,1,1);}
const HAIRS=[['#3b2a20','#5a4030'],['#1d1b1a','#3a3634'],['#7a4b28','#9a6a40'],['#a8834c','#c8a86c'],['#5c3a24','#7a5638'],['#2b2420','#4a3e36'],['#8f8a84','#b0aca6']];

/* a person in the Papers, Please manner: a big, slightly square head, sloping shoulders, a long coat, shading from the upper left. u = h/32 */
function man(c,cx,feet,h,o){
  o=o||{};const u=h/32,y0=feet-h,OL=o.ol||'#07080e',gown=!!o.gown,front=!!o.front;
  const suit=o.suit||'#27334f',sh=o.sh||'#19213a',hl=o.hl||'#3a4a72',hr=o.hair||HAIRS[0],skin=o.skin||P.skin,skD=P.skinD,tr=o.tr||'#181e30';
  const headW=v=>{if(v<0||v>=7.6)return 0;const k=Math.abs((v-3.8)/3.8);return (v>3.8?3.0:3.15)*Math.pow(Math.max(0,1-Math.pow(k,2.6)),1/2.6);};
  const bodyW=v=>{if(v<8.3)return 0;if(v<11)return 2.4+4.3*Math.sin(Math.PI/2*(v-8.3)/2.7);if(!gown)return v<21.2?6.7-1.0*(v-11)/10.2:0;return v<31.2?6.7+1.1*(v-11)/20.2:0;};
  const spans=v=>{const s=[],hw=headW(v);if(hw)s.push([-hw,hw,'head']);if(v>=7.2&&v<8.8)s.push([-1.5,1.5,'neck']);const bw=bodyW(v);if(bw)s.push([-bw,bw,'body']);
    if(!gown&&v>=21.2&&v<30.9){const k=(v-21.2)/9.7,lw=2.0-0.35*k;s.push([-2.3-lw,-2.3+lw,'leg'],[2.3-lw,2.3+lw,'leg']);}
    if(v>=30.9&&v<32){s.push([-4.9,-0.5,'shoe'],[0.5,4.9,'shoe']);}return s;};
  const Y0=Math.floor(y0),Y1=Math.ceil(feet);
  const rows=[];for(let py=Y0;py<Y1;py++){const v=(py+.5-y0)/u;rows.push([py,v,spans(v).map(([a,b,p])=>[Math.round(cx+a*u),Math.round(cx+b*u),p])]);}
  rows.forEach(([py,,ss])=>ss.forEach(([X0,X1])=>{if(X1>X0)r(c,OL,X0-1,py-1,X1-X0+2,3);}));
  rows.forEach(([py,v,ss])=>ss.forEach(([X0,X1,p])=>{const w=X1-X0;if(w<=0)return;
    if(p==='head'){if(!front){r(c,hr[0],X0,py,w,1);if(v>0.7&&v<3)r(c,hr[1],X0+Math.round(w*.18),py,Math.max(1,Math.round(w*.25)),1);r(c,'#00000038',X0+Math.round(w*.72),py,w-Math.round(w*.72),1);}
      else for(let x=X0;x<X1;x++){const xv=(x+.5-cx)/u;let col=skin;
        if(v<2.1||(Math.abs(xv)>2.3&&v<4))col=hr[0];
        else if(v>2.8&&v<3.4&&Math.abs(xv)>0.5&&Math.abs(xv)<2.3)col='#2a1a12';
        else if(v>3.7&&v<4.3&&Math.abs(xv)>0.8&&Math.abs(xv)<1.7)col='#141414';
        else if(xv>0.05&&xv<0.75&&v>3.9&&v<5.4)col=skD;
        else if(v>6.0&&v<6.5&&Math.abs(xv)<1.1)col='#8a3a30';
        else if(xv>1.6||v>6.9)col=((x+py)&1)||xv>2.2||v>7.2?skD:skin;
        r(c,col,x,py,1,1);}
      if(o.rim)r(c,o.rim,X0,py,1,1);return;}
    if(p==='neck'){r(c,v>8.1?skD:skin,X0,py,w,1);return;}
    if(p==='leg'){r(c,tr,X0,py,w,1);r(c,'#0c0f1a',X1-Math.max(1,Math.round(w*.35)),py,Math.max(1,Math.round(w*.35)),1);return;}
    if(p==='shoe'){r(c,'#0a0a0e',X0,py,w,1);if(v<31.3)r(c,'#2a2a34',X0+1,py,Math.max(1,w-3),1);return;}
    const xs=X0+Math.round(w*.66)+(py&1);r(c,suit,X0,py,w,1);r(c,sh,xs,py,X1-xs,1);r(c,hl,X0,py,Math.max(1,Math.round(u*.7)),1);if(o.rim)r(c,o.rim,X0,py,1,1);
    if(v>11.6&&v<20.4){const aw=bodyW(v)-1.9;r(c,sh,Math.round(cx-aw*u),py,1,1);r(c,sh,Math.round(cx+aw*u),py,1,1);}
    if(!front&&v>15.5&&v<(gown?30:21)&&!gown)r(c,sh,Math.round(cx),py,1,1);
    if(front&&v>8.3&&v<13.6){const vw=1.7*(13.6-v)/5.3;r(c,'#f2efe6',Math.round(cx-vw*u),py,Math.max(1,Math.round(2*vw*u)),1);r(c,sh,Math.round(cx-vw*u)-1,py,1,1);r(c,sh,Math.round(cx+vw*u),py,1,1);
      if(v>8.9&&!o.noTie)r(c,o.tie||'#8b1d2a',Math.round(cx-.45*u),py,Math.max(1,Math.round(.9*u)),1);}
    if(front&&!o.noTie&&v>=13.6&&v<16.2)r(c,o.tie||'#8b1d2a',Math.round(cx-.5*u+(v>15.4?.1*u:0)),py,Math.max(1,Math.round(1*u)),1);
  }));
  const hand=(sx)=>{for(let py=Math.floor(y0+20.1*u);py<y0+21.9*u;py++){const v=(py+.5-y0)/u,bw=gown?bodyW(20):bodyW(20),x=cx+sx*(bw-1.2)*u;r(c,OL,Math.round(x-.8*u)-1,py,Math.round(1.6*u)+2,1);}
    for(let py=Math.ceil(y0+20.2*u);py<y0+21.7*u;py++){const bw=bodyW(20),x=cx+sx*(bw-1.2)*u;r(c,skin,Math.round(x-.7*u),py,Math.max(1,Math.round(1.4*u)),1);r(c,skD,Math.round(x+.2*u),py,Math.max(1,Math.round(.5*u)),1);}};
  if(!o.noHands){if(o.noHand!=='L')hand(-1);if(o.noHand!=='R')hand(1);}
  if(!front){for(const s of[-1,1]){const ex=Math.round(cx+s*3.25*u);for(let py=Math.round(y0+3.1*u);py<y0+4.9*u;py++){r(c,OL,ex-1,py,Math.max(1,Math.round(.7*u))+2,1);r(c,skin,ex,py,Math.max(1,Math.round(.6*u)),1);}}
    if(!gown||true){for(let px=Math.round(cx-1.7*u);px<cx+1.7*u;px++)r(c,o.collar||'#f2efe6',px,Math.round(y0+8.4*u),1,Math.max(1,Math.round(.6*u)));}}
  const R=(col,x,y,w,hh)=>r(c,col,cx+x*u,y0+y*u,w*u,hh*u);
  return {u,y0,R};
}
function cap(c,x,y,u){r(c,'#060608',x-5.5*u-1,y-1,11*u+2,1.6*u+2);r(c,'#0e0e12',x-5.5*u,y,11*u,1.6*u);r(c,'#2a2a32',x-5.5*u,y,11*u,0.5*u);r(c,'#121216',x-3.4*u,y+1.6*u,6.8*u,2.4*u);r(c,P.gold,x+4*u,y+0.8*u,0.9*u,3.6*u);r(c,'#fff2a0',x+4*u,y+0.8*u,0.9*u,0.6*u);}

/* ---------- 1 · graduation ---------- */
function bg1(c){
  vband(c,0,0,VW,112,['#1c0c14','#28121c','#361a26','#40202c']);
  for(let x=14;x<VW;x+=44){r(c,'#4c2634',x,0,9,96);r(c,'#62344a',x,0,2,96);r(c,'#1a0a10',x+8,0,1,96);r(c,'#5a2e40',x-2,92,13,4);}
  for(const bx of[52,250]){r(c,'#5a1020',bx,6,20,58);dith(c,'#3e0a16',bx+13,8,7,54);r(c,P.gold,bx,6,20,2);r(c,P.gold,bx,62,20,2);disc(c,P.gold,bx+10,28,5);disc(c,'#5a1020',bx+10,28,3);r(c,P.gold,bx+9,27,3,3);for(let i=0;i<20;i+=3)r(c,P.gold,bx+i,64,1,4);}
  r(c,'#a8862e',124,5,72,2);r(c,'#e3c46a',121,4,4,4);r(c,'#e3c46a',195,4,4,4);
  euflag(c,130,8,60,40);dith(c,'#002070',172,8,18,40);r(c,'#00267a',130,8,60,1);
  for(let i=0;i<60;i+=2)r(c,P.gold,130+i,48,1,3);
  r(c,'#2a120c',0,96,VW,16);r(c,'#4a2618',0,96,VW,2);for(let x=0;x<VW;x+=22)r(c,'#1e0c08',x,98,1,14);
  r(c,'#3a2014',262,58,26,40);r(c,'#5a3420',262,58,26,3);r(c,'#24120a',284,58,4,40);r(c,P.gold,268,72,14,8);r(c,'#3a2014',270,74,10,4);
  r(c,'#222',276,46,1,12);r(c,'#555',274,43,5,4);
  r(c,'#2e1c10',0,112,VW,68);for(let y=116;y<VH;y+=6)r(c,'#24140a',0,y,VW,1);dith(c,'#1a0e06',0,150,VW,30);
}
const HOODS=['#7a1d2a','#1d4d7a','#2e6b3a','#6b2a7a','#a0a0a0','#a85a1a'];
function fg1(c,t){
  polyd(c,'#ffe6b0',[146,0,174,0,212,180,108,180],.28);
  const rows=[{f:142,h:44,n:11,dx:0},{f:170,h:58,n:9,dx:8}];
  rows.forEach((R,ri)=>{for(let i=0;i<R.n;i++){const x=(i+.5)*VW/R.n+R.dx,sd=ri*20+i;if(ri===1&&Math.abs(x-160)<26)continue;
    const {u,y0}=man(c,x,R.f,R.h,{gown:true,suit:'#141418',sh:'#08080a',hl:'#2a2a32',hair:HAIRS[Math.floor(hsh(sd)*7)]});
    const hc=HOODS[Math.floor(hsh(sd+3)*6)];poly(c,hc,[x-4.5*u,y0+9.6*u,x+4.5*u,y0+9.6*u,x,y0+17*u]);poly(c,'#141418',[x-2.2*u,y0+9.6*u,x+2.2*u,y0+9.6*u,x,y0+13*u]);
    if((i+ri)%2)cap(c,x,y0-5*u-Math.abs(Math.sin(t*2+sd))*34,u);else cap(c,x,y0-2.2*u,u);}});
  const x=160,{u,y0,R}=man(c,x,198,84,{gown:true,suit:'#141418',sh:'#08080a',hl:'#34343c'});
  poly(c,P.yel2,[x-5*u,y0+9.6*u,x+5*u,y0+9.6*u,x,y0+19*u]);poly(c,P.yel,[x-4*u,y0+9.6*u,x+1*u,y0+9.6*u,x-0.5*u,y0+17*u]);poly(c,'#141418',[x-2.4*u,y0+9.6*u,x+2.4*u,y0+9.6*u,x,y0+13.4*u]);
  R('#141418',6.4,0,3,10.5);R('#08080a',8.6,0,0.8,10.5);R(P.skin,6.5,-1.2,2.8,1.6);
  R('#07080e',6,-9.5,4.2,8.6);R(P.paper,6.3,-9.2,3.6,8);R('#d8d2bc',9.1,-9.2,0.8,8);R('#b3261e',6.3,-6,3.6,1.2);R('#7a1010',6.3,-5,3.6,0.3);
  cap(c,x,60-Math.abs(Math.sin(t*1.2))*54,u);
}

/* ---------- 2 · studying while days pass ---------- */
const BOOK=['#7a2424','#1f4f7a','#2e6b3a','#6b4f1f','#4a2a6b','#6e6e66','#1a3a5a','#8a5a1a'];
function bg2(c){
  vband(c,0,0,VW,124,['#11162a','#161d32','#1b233a','#1f283f']);
  r(c,'#2e1c10',0,6,68,118);r(c,'#3e2616',2,8,64,114);
  for(const sy of[38,68,98,121]){let x=5,i=sy;while(x<62){const w=3+Math.floor(hsh(i)*4),hh=18+Math.floor(hsh(i+7)*8);r(c,BOOK[Math.floor(hsh(i+2)*8)],x,sy-hh,w,hh);r(c,'#ffffff22',x,sy-hh,1,hh);r(c,P.yel2,x,sy-hh+4,w,1);x+=w+ (hsh(i+5)>.85?3:0);i++;}r(c,'#4e3020',2,sy,64,3);r(c,'#6a4430',2,sy,64,1);}
  for(let dy=-14;dy<=14;dy++)for(let dx=-14;dx<=14;dx++){const d=Math.hypot(dx,dy);if(d<=14)r(c,d>12?'#a8862e':'#efe8d6',104+dx,34+dy,1,1);}
  for(let k=0;k<12;k++){const a=k*Math.PI/6;r(c,'#3a3a3a',Math.round(104+10*Math.cos(a)),Math.round(34+10*Math.sin(a)),1,1);}
  r(c,'#6e4a2c',0,122,VW,4);r(c,'#94663e',0,122,VW,1);r(c,'#4a2e1a',0,126,VW,54);dith(c,'#3e2614',0,150,VW,30);
  for(const dx of[20,150])r(c,'#3a2414',dx,138,90,1);
}
function fg2(c,t){
  const p=(t*0.5)%1,day=p<.42,dusk=p>=.42&&p<.54;
  vband(c,176,16,128,78,day?['#4f93d6','#78b2e6','#a6d2f0','#c6e4f6']:dusk?['#2a1e4a','#6a2e6a','#c0587a','#f0a060']:['#04060f','#080d22','#0c1430','#111a3c']);
  if(day){disc(c,'#fff6c8',270,32,6);r(c,'#f2f8fc',190,36,22,4);r(c,'#f2f8fc',196,32,12,4);}
  if(dusk)disc(c,'#ffd27a',240,82,8);
  if(!day&&!dusk){for(let i=0;i<14;i++)r(c,'#d8deff',180+hsh(i)*120,20+hsh(i+9)*30,1,1);disc(c,'#f0eedc',196,30,5);disc(c,'#080d22',198,28,4);}
  const night=!day&&!dusk;r(c,night?'#161b2c':'#5a6078',182,58,118,36);r(c,night?'#1e2436':'#6a7088',182,58,118,2);
  for(let j=0;j<2;j++)for(let i=0;i<8;i++){const lit=night&&((Math.floor(t*5)+i*3+j)%4!==0);const cl=lit?['#ff4fa1','#ffd200','#4fe3ff','#ffa040'][(i+j+Math.floor(t*3))%4]:night?'#2a3046':'#8a90a8';r(c,cl,188+i*14,64+j*14,8,8);
    if(lit&&(i+j)%2)r(c,'#0a0c18',190+i*14,67+j*14-(Math.floor(t*8+i)%2),2,5);}
  r(c,'#cfc8b4',172,12,136,4);r(c,'#cfc8b4',172,12,4,84);r(c,'#cfc8b4',304,12,4,84);r(c,'#cfc8b4',238,12,3,84);r(c,'#cfc8b4',172,52,136,3);r(c,'#e6e0cc',168,94,144,5);r(c,'#a8a08a',168,98,144,1);
  const ha=t*0.9-Math.PI/2,ma=t*11-Math.PI/2;line(c,'#1a1a1a',104,34,104+6*Math.cos(ha),34+6*Math.sin(ha));line(c,'#7a1010',104,34,104+10*Math.cos(ma),34+10*Math.sin(ma));
  polyd(c,'#ffe7a0',[58,60,22,124,138,124,92,60],.5);
  r(c,'#1a1a22',62,116,30,6);r(c,'#2a2a34',62,116,30,1);r(c,'#1a1a22',75,70,3,46);r(c,'#1a1a22',75,66,22,3);r(c,'#2e6b3a',56,54,32,10);r(c,'#3e8a4c',56,54,32,2);r(c,'#1e4a28',84,54,4,10);r(c,'#fff6c8',60,63,24,2);
  const n=3+Math.floor((t*1.8)%17);
  for(let i=0;i<n;i++){const w=36+Math.floor(hsh(i)*10),off=Math.floor(hsh(i+4)*8)-4,y=121-i*5,col=BOOK[i%8];r(c,'#07080e',100+off,y-5,w+2,6);r(c,col,101+off,y-4,w,4);r(c,'#efe8d6',101+off+w-3,y-3,3,2);r(c,'#ffffff30',101+off,y-4,w,1);}
  r(c,'#f2ece0',140,112,18,12);r(c,'#d8cfb8',156,114,4,7);r(c,'#3b2414',142,113,14,2);
  for(let i=0;i<3;i++){const a=(t*.8+i/3)%1;r(c,'#ffffff'+(a<.5?'60':'30'),146+i*3+Math.sin(t*3+i)*2,108-a*16,1,2);}
  r(c,'#24120a',190,142,84,40);r(c,'#3a2014',192,144,80,36);for(let i=0;i<4;i++)r(c,'#1a0c06',202+i*18,152,3,3);
  man(c,232,252,150,{});
}

/* ---------- 3 · phone ignored, flashcards ---------- */
const WORDS=[['Bonjour','FR'],['Guten Tag','DE'],['Buongiorno','IT'],['Dzień dobry','PL'],['Hyvää päivää','FI'],['Goedendag','NL'],['Kaliméra','EL']];
function bg3(c){
  r(c,'#5e3e24',0,0,VW,VH);
  for(let y=0;y<VH;y+=3)for(let x=0;x<VW;x+=8){const h=hsh(x*.13+y*7.1);if(h>.55)r(c,h>.8?'#4e321c':'#6a4630',x,y,6+Math.floor(h*8),1);}
  for(let k=0;k<3;k++){const kx=60+k*110,ky=40+k*50;for(let i=0;i<5;i++)r(c,'#3e2614',kx-6+i,ky+(i%2),12-2*i,1);}
  line(c,'#07080e',214,170,258,150);line(c,'#1f3f8a',214,169,257,149);line(c,'#2f5fba',215,168,256,148);r(c,P.gold,250,150,4,2);
}
function fg3(c,t){
  r(c,'#000',29,15,78,156);r(c,'#14141a',30,16,76,154);r(c,'#24242e',30,16,76,2);r(c,'#0a0a0e',30,16,1,1);r(c,'#0a0a0e',105,16,1,1);r(c,'#3a3a46',60,20,16,2);
  const off=t>3.6;
  if(off){r(c,'#0c0f16',34,26,68,138);polyd(c,'#2a3040',[34,60,60,26,76,26,34,90],.8);}
  else{r(c,'#e6ecf4',34,26,68,138);r(c,'#c9d3e2',34,26,68,6);r(c,'#5a6680',37,28,10,2);r(c,'#5a6680',92,28,6,2);
    r(c,P.blue,34,32,68,14);disc(c,P.yel,42,39,4);r(c,'#fff',50,36,30,2);r(c,'#9fb4e0',50,40,18,1);
    const NAMES=['#c0587a','#3e8a4c','#a85a1a','#6b2a7a','#1d4d7a'];
    for(let i=0;i<5;i++){if(t<i*.55)continue;const y=50+i*22,g=t>2.1+i*.32;
      disc(c,NAMES[i],39,y+12,3);r(c,g?'#c3cad6':'#c9d3e2',44,y-1,54,18);r(c,g?'#dde2ea':'#fff',45,y,52,16);
      r(c,g?'#b0b8c6':'#5a6680',48,y+4,36-((i*7)%14),1);r(c,g?'#b0b8c6':'#5a6680',48,y+8,26,1);r(c,'#9aa6b8',86,y+12,8,1);}
    disc(c,'#c62828',100,22,5);r(c,'#fff',99,19,2,6);}
  r(c,'#c9bfa0',150,40,154,92);r(c,'#ddd4b8',144,44,154,92);
  const i=Math.floor(t/.8)%WORDS.length,ph=(t/.8)%1,sq=ph>.84?1-(ph-.84)/.16:1,w=Math.max(2,156*sq),x0=140+78-w/2;
  r(c,'#07080e',x0-1,47,w+2,94);r(c,'#fdfbf4',x0,48,w,92);
  if(sq>.5){r(c,'#cfe0f5',x0,48,w,10);for(let y=68;y<140;y+=10)r(c,'#d8e4f2',x0,y,w,1);r(c,'#e8a0a0',x0+16,58,1,82);
    disc(c,'#5e3e24',x0+30,53,3);disc(c,'#5e3e24',x0+w-30,53,3);
    c.fillStyle=P.navy;c.font='600 22px Pixel';c.textAlign='center';c.textBaseline='middle';c.fillText(WORDS[i][0],x0+w/2+6,96);
    r(c,['#1d4d7a','#2a2a2a','#2e6b3a','#b3261e','#1d4d7a','#c86a1a','#1d6ab0'][i],x0+w-24,124,18,10);c.fillStyle='#fff';c.font='8px Silk';c.fillText(WORDS[i][1],x0+w-15,129);}
  r(c,'#07080e',267,137,32,36);r(c,'#efe8d6',268,138,30,34);r(c,'#d0c6ae',290,138,8,34);r(c,'#07080e',297,146,8,16);r(c,'#efe8d6',298,148,5,12);r(c,'#3b2414',270,140,26,4);
  for(let k=0;k<3;k++){const a=(t*.7+k/3)%1;r(c,'#ffffff'+(a<.5?'70':'30'),278+k*4+Math.sin(t*3+k)*2,132-a*20,1,2);}
}

/* ---------- 4 · rainy stations at night ---------- */
const PLACES=['SZCZEBRZESZYN',"'S-HERTOGENBOSCH",'LLANFAIRPWLLGWYNGYLL','ÆRØSKØBING','KURESSAARE','MIERCUREA CIUC'];
function bg4(c){
  vband(c,0,0,VW,28,['#03050c','#070b18']);
  r(c,'#2a222c',0,24,VW,80);
  for(let y=26;y<104;y+=6){const o=((y/6)|0)%2*8;for(let x=-o;x<VW;x+=16)r(c,'#211a24',x,y,15,5),r(c,'#30273a',x,y,15,1);}
  dith(c,'#120e16',0,84,VW,20);
  for(const px of[36,252]){r(c,'#07080e',px-1,40,34,44);r(c,'#e8e4d8',px,41,32,42);r(c,P.eu,px+2,43,28,20);euflag(c,px+2,43,28,20);r(c,'#1a1a22',px+4,68,24,2);r(c,'#1a1a22',px+4,72,16,1);r(c,'#1a1a22',px+4,76,20,1);}
  r(c,'#081028',0,0,VW,22);for(let x=0;x<VW;x+=20){line(c,'#14224a',x,22,x+10,4);line(c,'#14224a',x+10,4,x+20,22);}r(c,'#1a2a5a',0,20,VW,2);
  for(const x of[18,118,198,298]){r(c,'#0e1838',x,22,6,82);r(c,'#1e2c5a',x,22,1,82);}
  vband(c,0,104,VW,76,['#34363a','#2c2e32','#25272a','#202226']);r(c,'#6a6c70',0,104,VW,3);r(c,'#8a8c90',0,104,VW,1);r(c,P.yel,0,116,VW,2);
  for(let x=2;x<VW;x+=4)r(c,'#8a7420',x,119,2,1);
  for(const lx of[70,252]){r(c,'#0e1018',lx,34,3,72);r(c,'#1e222c',lx-8,30,19,5);r(c,'#2e3240',lx-8,30,19,1);}
  r(c,'#1a120c',272,94,40,4);r(c,'#2a1c12',272,94,40,1);r(c,'#120a06',274,98,2,8);r(c,'#120a06',308,98,2,8);
}
function fg4(c,t){
  for(const lx of[70,252]){r(c,'#fff2c0',lx-5,35,15,2);polyd(c,'#ffe1a0',[lx-5,37,lx+10,37,lx+44,112,lx-38,112],.32);polyd(c,'#ffd27a',[lx-8,112,lx+12,112,lx+6,176,lx-2,176],.22);}
  r(c,'#07080e',66,24,188,38);r(c,'#0c0e12',68,26,184,34);r(c,'#30343c',66,24,188,1);for(const bx of[70,248])r(c,'#5a5e68',bx,28,2,2);
  line(c,'#30343c',100,0,100,24);line(c,'#30343c',220,0,220,24);
  const nm=PLACES[Math.floor(t/1.15)%PLACES.length];let fs=16;c.font=fs+'px Silk';while(c.measureText(nm).width>172&&fs>6){fs-=1;c.font=fs+'px Silk';}
  c.fillStyle='#ffb347';c.textAlign='center';c.textBaseline='middle';c.fillText(nm,160,38);
  c.font='8px Silk';c.fillStyle='#a8742c';c.fillText('VIA 3 · 23:47 · RETRASO',160,53);
  const b=Math.floor(t*4)%2;
  dith(c,'#0a0a0e',122,174,110,6);
  man(c,138,178,92,{noHand:'R'});
  man(c,190,178,92,{front:true,suit:'#4a4e58',sh:'#363a44',hl:'#62666e',hair:HAIRS[Math.floor(t/1.15)%7],noHand:'L'});
  const sleeve=(x0,y0,x1,y1,col,shd)=>{for(const[w,cl]of[[8,'#07080e'],[6,col]]){c.strokeStyle=cl;c.lineWidth=w;c.lineCap='round';c.beginPath();c.moveTo(x0,y0);c.quadraticCurveTo((x0+x1)/2,y1+2,x1,y1);c.stroke();}
    c.strokeStyle=shd;c.lineWidth=2;c.beginPath();c.moveTo(x0+1,y0+3);c.quadraticCurveTo((x0+x1)/2+1,y1+4,x1,y1+2);c.stroke();};
  sleeve(152,118,161,131+b,'#27334f','#19213a');sleeve(176,118,168,131+b,'#4a4e58','#363a44');
  r(c,'#07080e',159,127+b,11,8);r(c,P.skin,160,128+b,9,6);r(c,P.skinD,160,132+b,9,2);r(c,P.skinD,164,128+b,1,4);
  poly(c,'#07080e',[160,74,220,74,190,56]);poly(c,'#1a1a24',[163,73,217,73,190,58]);poly(c,'#2a2a36',[170,72,190,58,185,72]);for(let i=0;i<5;i++)r(c,'#07080e',165+i*12,73,2,3);r(c,'#07080e',189,52,2,5);line(c,'#07080e',214,74,214,118);
  for(let i=0;i<150;i++){const x=(i*37.3+t*20)%340-10,y=(i*53.7+t*150)%190-6;r(c,'rgba(170,195,230,0.45)',x,y,1,4);}
  for(let i=0;i<12;i++){if(hsh(i+Math.floor(t*6))>.5)continue;const x=hsh(i*3+Math.floor(t*6))*320,y=120+hsh(i*7+Math.floor(t*6))*58;r(c,'#a8c0e0',x-1,y,3,1);r(c,'#a8c0e0',x,y-1,1,1);}
}

/* ---------- 5 · corridor, silence ---------- */
const VX=160;
function wl(k,f){const x=132*k,yt=56*k,yb=180-84*k;return [x,yt+(yb-yt)*f];}
function wr(k,f){const [x,y]=wl(k,f);return [VW-x,y];}
function bg5(c){
  poly(c,'#bcb8aa',[0,0,VW,0,188,56,132,56]);poly(c,'#d6d2c4',[0,0,132,56,132,96,0,180]);poly(c,'#ccc8ba',[VW,0,188,56,188,96,VW,180]);
  const N=14;for(let i=0;i<N;i++){const k0=Math.pow(i/N,1.7),k1=Math.pow((i+1)/N,1.7);const y0=96+84*k0,y1=96+84*k1;
    for(let j=0;j<8;j++){const xa0=132-132*k0+(56+264*k0)*j/8,xb0=132-132*k0+(56+264*k0)*(j+1)/8,xa1=132-132*k1+(56+264*k1)*j/8,xb1=132-132*k1+(56+264*k1)*(j+1)/8;
      poly(c,(i+j)%2?'#6e7a76':'#86928d',[xa0,y0,xb0,y0,xb1,y1,xa1,y1]);}}
  for(const side of[wl,wr]){const a=side(0,.62),b=side(1,.62),a2=side(0,1),b2=side(1,1);poly(c,'#bdb8a8',[a[0],a[1],b[0],b[1],b2[0],b2[1],a2[0],a2[1]]);line(c,'#e6e2d6',a[0],a[1],b[0],b[1]);
    for(const[k0,k1]of[[.18,.3],[.5,.58],[.74,.79]]){const p=[side(k0,.28),side(k1,.28),side(k1,1),side(k0,1)];poly(c,'#3a2618',[].concat(...p));const q=[side(k0+.01,.31),side(k1-.01,.31),side(k1-.01,.99),side(k0+.01,.99)];poly(c,'#6b4a2e',[].concat(...q));
      const pl=side((k0+k1)/2,.42);r(c,P.gold,pl[0]-2,pl[1],4,2);}}
  for(const k of[.08,.3,.52,.7,.84]){const w=(VW-264*k)*.18,y=56*k;r(c,'#f8f6ec',VX-w/2,y,w,Math.max(1,4*(1-k)));dith(c,'#ffffff',VX-w/2-3,y+Math.max(1,4*(1-k)),w+6,2);}
  r(c,'#b4ae9e',132,56,56,40);r(c,'#2a1a10',150,62,20,34);r(c,'#5a3a22',152,64,16,32);r(c,'#6b4a2e',154,66,12,12);r(c,'#6b4a2e',154,80,12,14);r(c,P.gold,165,80,1,2);r(c,'#ffe7a0',152,95,16,1);
  r(c,'#3a5a3a',138,82,6,10);r(c,'#5a3a22',139,90,4,6);r(c,'#4a7a4a',137,80,3,4);r(c,'#4a7a4a',142,78,3,5);
}
function fg5(c,t){
  const s=Math.min(t/3.6,1),feet=196-96*s,h=96-68*s,b=Math.floor(t*3.2)%2;
  dith(c,'#3a4440',VX-h*.2,feet-2,h*.4,3);
  man(c,VX,feet-b*(h/60),h,{});
}

/* ---------- 6 · the austere office ---------- */
function bg6(c){
  vband(c,0,0,VW,98,['#e2dccb','#ded8c6','#d8d2be']);r(c,'#c8c0aa',0,96,VW,3);r(c,'#e8e2d2',0,96,VW,1);r(c,'#cfc7b0',0,99,VW,22);
  vband(c,0,120,VW,60,['#7a888c','#6e7c80','#64727a']);dith(c,'#5e6c72',0,150,VW,30);r(c,'#b8b09a',0,118,VW,3);
  r(c,'#5a3a22',112,28,40,30);r(c,'#fbf8ee',115,31,34,24);r(c,'#c9a646',116,32,32,1);for(let i=0;i<4;i++)r(c,'#8a8a8a',120,37+i*4,24-((i*5)%10),1);disc(c,'#b3261e',142,50,3);
  r(c,'#f4f2ea',190,16,74,74);vband(c,194,20,66,66,['#bcdcf2','#d2e8f6','#e6f2fa']);for(let y=22;y<84;y+=5)r(c,'#f6f4ec',194,y,66,2);r(c,'#d8d4c8',226,20,1,66);
  r(c,'#3a2416',268,22,40,98);for(let s=0;s<3;s++){r(c,'#5a3a22',268,48+s*26,40,2);for(let i=0;i<6;i++){const col=['#1d4d7a','#7a7a72','#2e4a6a','#8a2a2a'][(i+s)%4];r(c,col,271+i*6,28+s*26,5,20);r(c,'#fff',272+i*6,32+s*26,3,4);}}
  r(c,'#2a3450',136,64,48,46);r(c,'#3a4670',136,64,48,2);for(let j=0;j<3;j++)for(let i=0;i<4;i++)r(c,'#1e2640',142+i*11,72+j*11,2,2);
  r(c,'#07080e',85,103,152,4);r(c,'#5a3420',86,104,150,6);r(c,'#2e5a3e',100,104,122,4);r(c,'#7a4e2c',86,104,150,1);
  r(c,'#4a2a18',90,110,142,22);r(c,'#3e2214',96,114,62,14);r(c,'#3e2214',164,114,62,14);r(c,P.gold,126,120,4,1);r(c,P.gold,192,120,4,1);r(c,'#2e1a0e',90,130,6,10);r(c,'#2e1a0e',226,130,6,10);
  r(c,'#a8862e',102,98,14,6);r(c,'#c9a646',108,74,2,24);r(c,'#1e4a28',94,68,30,8);r(c,'#3e8a4c',94,68,30,2);r(c,'#fff6c8',98,75,22,2);
  dith(c,'#fff2b0',96,104,40,2);
  r(c,'#2a2a2a',146,98,12,5);r(c,'#1a3a6a',147,99,10,3);
  r(c,'#5a3420',164,96,8,7);r(c,'#7a4e2c',165,93,6,3);disc(c,'#b3261e',168,88,3);r(c,'#e04040',167,86,2,1);
  for(let i=0;i<3;i++){r(c,'#07080e',180,97-i*2,26,3);r(c,['#e9e2c8','#cfe0f5','#f2d8c8'][i],181,97-i*2,24,2);r(c,['#c9a646','#1d4d7a','#b3261e'][i],200-i*4,96-i*2,4,1);}
  r(c,'#a8862e',214,100,8,4);r(c,'#c9a646',217,62,1,38);r(c,P.gold,216,60,3,3);euflag(c,218,63,22,15);dith(c,'#002070',232,63,8,15);
}
function fg6(c,t){
  polyd(c,'#fff6d8',[194,86,260,86,236,180,140,180],.38);
  for(let i=0;i<8;i++)r(c,'rgba(255,255,255,0.85)',180+((i*23+t*6)%70),96+((i*31+t*4)%70),1,1);
  r(c,'#2e1c10',0,0,46,VH);r(c,'#2e1c10',274,0,46,VH);r(c,'#2e1c10',0,0,VW,16);r(c,'#4a2e1c',40,16,6,164);r(c,'#4a2e1c',274,16,6,164);r(c,'#4a2e1c',40,12,240,4);r(c,'#5e3c24',46,16,1,164);r(c,'#1e1208',273,16,1,164);
  const o=Math.min(t/1,1),dw=Math.max(6,228*(1-o*o*(3-2*o)));
  r(c,'#07080e',46,16,dw+1,164);r(c,'#6b4528',46,16,dw,164);
  if(dw>40){r(c,'#5a3a22',46+dw*.12,30,dw*.76,60);r(c,'#7a5232',46+dw*.12,30,dw*.76,2);r(c,'#5a3a22',46+dw*.12,100,dw*.76,66);r(c,'#7a5232',46+dw*.12,100,dw*.76,2);r(c,P.gold,46+dw-14,98,6,3);}
  if(t>.7){const p=Math.min((t-.7)/1.1,1),e=1-Math.pow(1-p,2);man(c,160,214+(1-e)*40,124,{suit:'#141a2c',sh:'#0c101e',hl:'#141a2c',rim:'#e6d6a8',hair:['#1a140e','#3a2c1c']});}
}

/* ---------- 7 · nameplate ---------- */
function bg7(c){
  vband(c,0,0,VW,104,['#07090f','#0b0e18','#0f1322','#12172a']);
  r(c,'#2e1a0e',0,104,VW,6);r(c,'#4a2e1a',0,104,VW,1);r(c,'#1e3a2a',30,110,260,40);r(c,'#264a36',30,110,260,1);r(c,'#1e110a',0,110,30,70);r(c,'#1e110a',290,110,30,70);r(c,'#1e110a',0,150,VW,30);
  r(c,'#e8e4d8',248,96,30,10);r(c,'#c8c4b8',248,104,30,2);line(c,'#07080e',256,96,250,70);line(c,'#1a1a1a',257,96,251,70);line(c,'#07080e',268,96,276,72);line(c,'#7a1010',269,96,277,72);r(c,P.gold,250,70,2,2);
  r(c,'#fbf8ee',40,112,46,30);r(c,'#c8c2b0',40,140,46,2);for(let i=0;i<5;i++)r(c,'#9a9a9a',44,116+i*5,36-((i*7)%14),1);
}
function fg7(c,t){
  polyd(c,'#ffe6b0',[120,0,200,0,250,112,70,112],.12);
  const e=Math.min(t/2.4,1),ang=Math.pow(1-e,3)*5*Math.PI,k=Math.cos(ang),w=Math.max(2,136*Math.abs(k)),x0=160-w/2;
  r(c,'#3a2810',100,104,120,6);r(c,'#5a4418',100,104,120,1);
  dith(c,'#000000',x0+6,78,w,34);
  r(c,'#07080e',x0-1,69,w+2,38);
  if(k>0){vband(c,x0,70,w,36,['#f0d27a','#d8b450','#c09a38','#a8862e']);r(c,'#fff2b0',x0,70,w,2);r(c,'#7a5a18',x0,104,w,2);r(c,'#e8c868',x0,70,2,36);
    if(w>90){r(c,'#8a6a20',x0+14,84,w-28,2);r(c,'#f8e098',x0+14,86,w-28,1);r(c,'#8a6a20',x0+30,94,w-60,1);}
    if(e>=1){const g=((t-2.4)*90)%260-40;for(let i=0;i<6;i++)line(c,'#fff8d8',x0+g+i,70,x0+g+i-14,105);}}
  else{vband(c,x0,70,w,36,['#8a6a20','#7a5a18','#6a4e14']);}
}

export const VW=320,VH=180;
export const SCENES=[[bg1,fg1],[bg2,fg2],[bg3,fg3],[bg4,fg4],[bg5,fg5],[bg6,fg6],[bg7,fg7],[null,null]];
