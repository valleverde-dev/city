import { actx, ensureAudio } from './music.js';

// --- Sound effects: tiny synthesized sounds, Constructor-style (one per character/event) ---
export let noiseBuf = null;
export function noiseBuffer(){
  if(noiseBuf) return noiseBuf;
  noiseBuf = actx.createBuffer(1, actx.sampleRate*1.5, actx.sampleRate);
  const d = noiseBuf.getChannelData(0); for(let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
  return noiseBuf;
}
export function tone(f, at, dur, type, vol, f2){
  const t0 = actx.currentTime + at, o = actx.createOscillator(), g = actx.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t0); if(f2) o.frequency.exponentialRampToValueAtTime(f2, t0+dur);
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0+0.012); g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
  o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0+dur+0.02);
}
export function noise(at, dur, vol, freq, q, wobble){
  const t0 = actx.currentTime + at, s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
  s.buffer = noiseBuffer(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0+0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
  if(wobble){ const l = actx.createOscillator(), lg = actx.createGain(); l.frequency.value = wobble; lg.gain.value = vol*0.6;
    l.connect(lg); lg.connect(g.gain); l.start(t0); l.stop(t0+dur); }
  s.connect(f); f.connect(g); g.connect(actx.destination); s.start(t0); s.stop(t0+dur+0.02);
}
export const SFX = {
  click:  ()=> tone(520,0,0.06,'sine',0.1),
  ok:     ()=>{ tone(660,0,0.08,'sine',0.14); tone(880,0.07,0.12,'sine',0.12); },
  fail:   ()=>{ tone(200,0,0.22,'square',0.07,110); },
  turn:   ()=>{ tone(392,0,0.08,'triangle',0.12); tone(523,0.08,0.14,'triangle',0.12); },
  stamp:  ()=>{ noise(0,0.1,0.7,700,0.8); tone(80,0,0.14,'sine',0.6,40); },
  frog:   ()=>{ for(let k=0;k<3;k++) tone(150,k*0.15,0.1,'square',0.1,95); },
  crowd:  ()=>{ noise(0,1.3,0.22,450,0.6,3.5); noise(0.1,1.1,0.12,900,1.2,5); },
  siren:  ()=>{ tone(900,0,0.35,'sine',0.12,1500); tone(1500,0.35,0.35,'sine',0.12,900); tone(900,0.7,0.35,'sine',0.12,1500); },
  cash:   ()=>{ noise(0,0.05,0.25,4000,1); tone(1568,0.03,0.08,'square',0.06); tone(2093,0.1,0.3,'triangle',0.12); },
  fanfare:()=>{ [523,659,784,1047].forEach((f,k)=>tone(f,k*0.09,0.22,'triangle',0.12)); tone(1047,0.36,0.4,'triangle',0.1); },
  clink:  ()=>{ tone(1800,0,0.25,'triangle',0.12); tone(2400,0.06,0.2,'sine',0.08); tone(1250,0.14,0.35,'triangle',0.08); },
  phone:  ()=>{ for(let k=0;k<2;k++) for(let j=0;j<6;j++) tone(j%2?480:440, k*0.5+j*0.05, 0.05, 'square', 0.05); },
  crash:  ()=>{ tone(620,0,0.7,'sawtooth',0.08,70); noise(0.1,0.6,0.15,300,0.7); },
  farmer: ()=>{ tone(170,0,0.25,'sawtooth',0.06,120); tone(130,0.25,0.3,'sawtooth',0.06,95); },
  win:    ()=>{ [523,659,784,1047,1319].forEach((f,k)=>tone(f,k*0.12,0.3,'triangle',0.14)); },
};
export function playSound(name){ try{ ensureAudio(); (SFX[name]||SFX.click)(); }catch(e){} }
