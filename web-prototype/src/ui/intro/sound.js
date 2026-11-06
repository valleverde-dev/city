// =====================================================================
//  THE INTRO'S SOUND — a music box playing the Ode (shots 1–4, dying away in the rain at the station), footsteps in the
//  silent corridor, the door and one held note, a drum roll on the nameplate, then a cymbal and the menu theme on the logo.
//  Synthesized on the game's audio context; silent when the music is switched off.
// =====================================================================
import { actx, ensureAudio, music, setMusic } from '../../audio/music.js';
let ctx=null,master=null,active=[],box=null;
function init(){ensureAudio();ctx=actx;if(!ctx)return;if(!master){master=ctx.createGain();master.connect(ctx.destination);}master.gain.value=music.on?0.9:0;}
function track(n){active.push(n);return n;}
function stopAll(keepBox){const now=ctx.currentTime;active.forEach(n=>{if(keepBox&&n._box)return;try{if(n.gain){n.gain.cancelScheduledValues(now);n.gain.setValueAtTime(n.gain.value,now);n.gain.linearRampToValueAtTime(0,now+.25);}else n.stop(now+.3);}catch(e){}});
  active=active.filter(n=>keepBox&&n._box);if(!keepBox)box=null;}
function noiseBuf(sec){const b=ctx.createBuffer(1,ctx.sampleRate*sec,ctx.sampleRate),d=b.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;return b;}

/* the music box: a sine with a bright, fast-dying overtone, a little echo */
const N={C4:261.63,D4:293.66,E4:329.63,F4:349.23,G4:392,A4:440,B4:493.88,C5:523.25,D5:587.33,E5:659.25,F5:698.46,G5:783.99,C3:130.81,G3:196,F3:174.61,A3:220};
const ODE=['E5','E5','F5','G5','G5','F5','E5','D5','C5','C5','D5','E5','E5','D5','D5','-','E5','E5','F5','G5','G5','F5','E5','D5','C5','C5','D5','E5','D5','C5','C5','-',
           'D5','D5','E5','C5','D5','E5','F5','E5','C5','D5','E5','F5','E5','D5','C5','D5','G4','-'];
const BASS=['C3','G3','C3','G3','C3','G3','C3','G3','C3','F3','C3','G3'];
function ding(out,f,t,vel,len){const o=ctx.createOscillator(),o2=ctx.createOscillator(),g=ctx.createGain(),g2=ctx.createGain();
  o.type='sine';o.frequency.value=f;o2.type='sine';o2.frequency.value=f*4.01;
  g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vel,t+.004);g.gain.exponentialRampToValueAtTime(.0005,t+len);
  g2.gain.setValueAtTime(0,t);g2.gain.linearRampToValueAtTime(vel*.35,t+.002);g2.gain.exponentialRampToValueAtTime(.0005,t+.18);
  o.connect(g);o2.connect(g2);g.connect(out);g2.connect(out);o.start(t);o2.start(t);o.stop(t+len+.05);o2.stop(t+.2);}
function musicBox(){const t0=ctx.currentTime+.15,q=.62,out=ctx.createGain();out.gain.value=.33;out._box=true;
  const dl=ctx.createDelay(),fb=ctx.createGain(),wet=ctx.createGain();dl.delayTime.value=.23;fb.gain.value=.32;wet.gain.value=.35;
  out.connect(master);out.connect(dl);dl.connect(fb);fb.connect(dl);dl.connect(wet);wet.connect(master);
  ODE.forEach((n,i)=>{if(n!=='-')ding(out,N[n],t0+i*q+(i%2?.012:0),.5,1.6);});
  for(let b=0;b<ODE.length/4;b++)ding(out,N[BASS[b%BASS.length]],t0+b*4*q,.28,2.4);
  box=out;track(out);}
function fadeBox(sec){if(!box)return;const now=ctx.currentTime;box.gain.cancelScheduledValues(now);box.gain.setValueAtTime(box.gain.value,now);box.gain.linearRampToValueAtTime(.0001,now+sec);}

function rain(dur){const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),g=ctx.createGain(),now=ctx.currentTime;s.buffer=noiseBuf(2);s.loop=true;f.type='bandpass';f.frequency.value=2600;f.Q.value=.5;
  g.gain.setValueAtTime(0,now);g.gain.linearRampToValueAtTime(.16,now+1);g.gain.setValueAtTime(.16,now+dur-1.2);g.gain.linearRampToValueAtTime(0,now+dur);
  s.connect(f);f.connect(g);g.connect(master);s.start();s.stop(now+dur+.1);track(g);
  const t=ctx.currentTime+2.4,o=ctx.createOscillator(),og=ctx.createGain();o.type='triangle';[[0,660],[.45,550]].forEach(([dt,fr])=>o.frequency.setValueAtTime(fr,t+dt));
  og.gain.setValueAtTime(0,t);og.gain.linearRampToValueAtTime(.06,t+.03);og.gain.setValueAtTime(.06,t+.85);og.gain.linearRampToValueAtTime(0,t+.95);o.connect(og);og.connect(master);o.start(t);o.stop(t+1);track(og);}
function buzz(at){const t=ctx.currentTime+at,o=ctx.createOscillator(),g=ctx.createGain();o.type='sawtooth';o.frequency.value=150;
  [0,.22].forEach(d=>{g.gain.setValueAtTime(0,t+d);g.gain.linearRampToValueAtTime(.05,t+d+.01);g.gain.setValueAtTime(.05,t+d+.14);g.gain.linearRampToValueAtTime(0,t+d+.16);});
  const f=ctx.createBiquadFilter();f.type='lowpass';f.frequency.value=400;o.connect(f);f.connect(g);g.connect(master);o.start(t);o.stop(t+.45);track(g);}
function steps(dur,every){const nb=noiseBuf(.2),g=ctx.createGain();g.gain.value=1;g.connect(master);track(g);
  for(let t=.4;t<dur-1.2;t+=every){const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),sg=ctx.createGain(),at=ctx.currentTime+t;s.buffer=nb;f.type='lowpass';f.frequency.value=900;
    const v=.5*(1-t/dur*.6);sg.gain.setValueAtTime(v,at);sg.gain.exponentialRampToValueAtTime(.001,at+.09);s.connect(f);f.connect(sg);sg.connect(g);s.start(at);s.stop(at+.12);}}
function door(){const t=ctx.currentTime+.1,o=ctx.createOscillator(),g=ctx.createGain(),f=ctx.createBiquadFilter();o.type='sawtooth';o.frequency.setValueAtTime(95,t);o.frequency.linearRampToValueAtTime(140,t+.5);o.frequency.linearRampToValueAtTime(85,t+.9);
  f.type='bandpass';f.frequency.value=700;f.Q.value=6;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.05,t+.1);g.gain.linearRampToValueAtTime(0,t+.95);o.connect(f);f.connect(g);g.connect(master);o.start(t);o.stop(t+1);track(g);
  const pg=ctx.createGain(),pf=ctx.createBiquadFilter();pf.type='lowpass';pf.frequency.value=1400;pg.gain.setValueAtTime(0,t+.6);pg.gain.linearRampToValueAtTime(.12,t+2.2);pg.gain.setValueAtTime(.12,t+5.4);pg.gain.linearRampToValueAtTime(0,t+7);
  [N.A3,N.A3*1.004,N.A3*2,N.E4].forEach(fr=>{const p=ctx.createOscillator();p.type='sawtooth';p.frequency.value=fr;p.connect(pf);p.start(t+.6);p.stop(t+7.1);});pf.connect(pg);pg.connect(master);track(pg);}
function roll(dur){const nb=noiseBuf(.1),g=ctx.createGain(),now=ctx.currentTime;g.gain.setValueAtTime(.05,now);g.gain.linearRampToValueAtTime(.42,now+dur-.6);g.gain.setValueAtTime(0,now+dur-.55);g.connect(master);track(g);
  for(let t=.15;t<dur-.6;){const s=ctx.createBufferSource(),f=ctx.createBiquadFilter(),sg=ctx.createGain(),at=now+t;s.buffer=nb;f.type='bandpass';f.frequency.value=1800;f.Q.value=.8;
    sg.gain.setValueAtTime(.6+Math.random()*.4,at);sg.gain.exponentialRampToValueAtTime(.001,at+.06);s.connect(f);f.connect(sg);sg.connect(g);s.start(at);s.stop(at+.08);t+=Math.max(.035,.11-.075*t/dur);}}
function finale(){const now=ctx.currentTime,crash=ctx.createBufferSource(),cf=ctx.createBiquadFilter(),cg=ctx.createGain();
  crash.buffer=noiseBuf(2);cf.type='highpass';cf.frequency.value=5000;cg.gain.setValueAtTime(.35,now);cg.gain.exponentialRampToValueAtTime(.001,now+1.8);crash.connect(cf);cf.connect(cg);cg.connect(master);crash.start(now);crash.stop(now+2);track(cg);
  setMusic('menu');}
/* the cue sheet: called when a shot starts (k = scene clock speed) */
function cue(shot,dur,k){if(!ctx)return;
  if(shot===0){stopAll(false);setMusic(null);musicBox();return;}
  if(shot<=3){stopAll(true);if(shot===2)[0,.55,1.1,1.65,2.2].forEach(a=>buzz(a/k+.05));if(shot===3){fadeBox(dur-.5);rain(dur);}return;}
  stopAll(false);setMusic(null);
  if(shot===4)steps(dur,.62);if(shot===5)door();if(shot===6)roll(dur);if(shot===7)finale();}
function stop(){if(ctx)stopAll(false);}
export {init, cue, stop};
