import { actx, ensureAudio } from './music.js';
import { tone } from './sfx.js';
import { speak } from './voice.js';

// =====================================================================
//  COMBO SOUNDS (v0.10.2) — a sound of their own, so a combo is heard before it is read:
//   good · a bright rising arpeggio          bad · a comic falling "tuu-tuu"
//   first discovery · the long version, and the mayor's voice (happy, or a sigh for a bad one)
//   repeat · short and soft (a combo you already know, formed again)
//   several at once · each one a little higher than the last (k = its place in the streak)
// =====================================================================
const UP = [523.25, 659.25, 783.99, 1046.5, 1318.5];   // C E G C' E'
export function comboSound(kind, good, k = 0){
  try{ ensureAudio(); if(!actx) return; }catch(e){ return; }
  const p = Math.pow(2, Math.min(k, 8) * 2 / 12);       // +2 semitones per combo in the streak
  if(kind === 'repeat'){
    if(good){ tone(UP[2]*p, 0, 0.09, 'sine', 0.07); tone(UP[3]*p, 0.06, 0.16, 'sine', 0.06); }
    else { tone(330*p, 0, 0.12, 'triangle', 0.06, 290*p); tone(262*p, 0.11, 0.18, 'triangle', 0.05, 220*p); }
    return;
  }
  const long = kind === 'discover';
  if(good){
    const notes = long ? UP.concat([1568]) : UP.slice(0, 4), st = long ? 0.075 : 0.06;
    notes.forEach((f, n) => { tone(f*p, n*st, 0.22, 'triangle', 0.11); tone(f*2*p, n*st + 0.01, 0.12, 'sine', 0.035); });
    const end = notes.length * st;
    if(long){ [UP[0], UP[1], UP[2], UP[3]].forEach(f => tone(f*p, end, 0.7, 'triangle', 0.05));   // a held chord
      for(let s = 0; s < 4; s++) tone(2600 + s*420, end + 0.05 + s*0.07, 0.08, 'sine', 0.03); }   // and a twinkle
  } else {
    // "tuu… tuu": two drooping honks, a cartoon let-down (the long one adds a third, lower and slower)
    const honks = long ? [[392, 330, 0.26], [330, 262, 0.26], [262, 196, 0.6]] : [[392, 330, 0.22], [311, 247, 0.34]];
    let at = 0; honks.forEach(([a, b, d]) => { tone(a*p, at, d, 'square', 0.05, b*p); tone(a*p/2, at, d, 'triangle', 0.08, b*p/2); at += d + 0.06; });
  }
  if(long) setTimeout(() => speak('mayor', {mood: good ? 'happy' : 'sad', syllables: 5}), good ? 650 : 900);
}
