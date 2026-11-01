import { actx, ensureAudio } from './music.js';
import { noiseBuffer } from './sfx.js';

// =====================================================================
//  VOICES (v0.10.1) — synthesized "speech" in the Animal Crossing / Banjo-Kazooie tradition: a babble of short
//  syllables through two vowel formants, with a timbre per character, plus gestures (a cough, "hmpf", a laugh,
//  a shout, a sigh). No recordings: tiny, the same in every language. Recorded clips can replace a character later:
//  put a list of URLs in RECORDED[char] and speak() plays one of them instead.
// =====================================================================
const KEY = 'eurocrat_voices';
export const voices = { on: (()=>{ try{ return localStorage.getItem(KEY) !== 'off'; }catch(e){ return true; } })() };
export function toggleVoices(){ voices.on = !voices.on; try{ localStorage.setItem(KEY, voices.on ? 'on' : 'off'); }catch(e){} }
// pitch (Hz), rate (syllables a second), wave, formant shift (×), gruffness (noise in the voice), wobble
export const TIMBRE = {
  mayor:     {f0:150, rate:9,  wave:'sawtooth', fs:1.00, gruff:0.10, vib:5},    // jovial, round
  neighbour: {f0:260, rate:11, wave:'square',   fs:1.18, gruff:0.05, vib:7},    // high, sharp
  heritage:  {f0:210, rate:8,  wave:'triangle', fs:1.10, gruff:0.02, vib:4},    // measured, precise
  brussels:  {f0:175, rate:13, wave:'square',   fs:1.25, gruff:0.02, vib:0},    // nasal, fast, flat
  developer: {f0:135, rate:12, wave:'sawtooth', fs:0.95, gruff:0.08, vib:3},    // smooth talker
  banker:    {f0:120, rate:7,  wave:'triangle', fs:0.90, gruff:0.04, vib:0},    // slow, deep, dry
  union:     {f0:140, rate:10, wave:'sawtooth', fs:1.00, gruff:0.20, vib:6},    // loud, rough
  farmer:    {f0:105, rate:6,  wave:'sawtooth', fs:0.85, gruff:0.25, vib:4},    // the stubborn owner: low, slow, gruff
  owner:     {f0:105, rate:6,  wave:'sawtooth', fs:0.85, gruff:0.25, vib:4},
};
export const RECORDED = {};   // char → [url, …] (future)
const VOWELS = [[730,1090],[530,1840],[270,2290],[570,840],[300,870],[440,1020],[660,1720]];   // a e i o u + two schwas
let busy = 0;
function out(){ const g = actx.createGain(); g.gain.value = 0.55; g.connect(actx.destination); return g; }
function syllable(dst, T, t0, dur, f0, vowel, loud){
  const o = actx.createOscillator(), g = actx.createGain(), f1 = actx.createBiquadFilter(), f2 = actx.createBiquadFilter(), mix = actx.createGain();
  o.type = T.wave; o.frequency.setValueAtTime(f0, t0); o.frequency.linearRampToValueAtTime(f0 * (0.9 + Math.random()*0.25), t0 + dur);
  if(T.vib){ const l = actx.createOscillator(), lg = actx.createGain(); l.frequency.value = T.vib; lg.gain.value = f0*0.03; l.connect(lg); lg.connect(o.frequency); l.start(t0); l.stop(t0+dur); }
  [f1, f2].forEach((f,k)=>{ f.type = 'bandpass'; f.frequency.value = vowel[k]*T.fs; f.Q.value = k ? 9 : 6; });
  o.connect(f1); o.connect(f2); f1.connect(mix); f2.connect(mix); mix.gain.value = 1.6;
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.5*loud, t0 + Math.min(0.02, dur/3)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  mix.connect(g); g.connect(dst); o.start(t0); o.stop(t0 + dur + 0.02);
  if(T.gruff){ const s = actx.createBufferSource(), nf = actx.createBiquadFilter(), ng = actx.createGain();
    s.buffer = noiseBuffer(); nf.type = 'bandpass'; nf.frequency.value = vowel[0]*T.fs; nf.Q.value = 2;
    ng.gain.setValueAtTime(0.0001, t0); ng.gain.exponentialRampToValueAtTime(T.gruff*loud, t0+0.01); ng.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
    s.connect(nf); nf.connect(ng); ng.connect(dst); s.start(t0); s.stop(t0+dur+0.02); }
}
function noiseBurst(dst, t0, dur, freq, q, vol, f2){
  const s = actx.createBufferSource(), f = actx.createBiquadFilter(), g = actx.createGain();
  s.buffer = noiseBuffer(); f.type = 'bandpass'; f.frequency.setValueAtTime(freq, t0); if(f2) f.frequency.exponentialRampToValueAtTime(f2, t0+dur); f.Q.value = q;
  g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0+0.015); g.gain.exponentialRampToValueAtTime(0.0001, t0+dur);
  s.connect(f); f.connect(g); g.connect(dst); s.start(t0); s.stop(t0+dur+0.02);
}
// A gesture: 'cough' · 'hmpf' · 'laugh' · 'shout' · 'sigh' · 'ahem'
function gesture(dst, T, kind, t0){
  const f0 = T.f0 * (0.95 + Math.random()*0.1), v = () => VOWELS[Math.floor(Math.random()*VOWELS.length)];
  if(kind==='cough'){ noiseBurst(dst, t0, 0.12, 900*T.fs, 1.2, 0.9); noiseBurst(dst, t0+0.2, 0.09, 1100*T.fs, 1.2, 0.6); return 0.35; }
  if(kind==='ahem'){ syllable(dst, T, t0, 0.12, f0*1.1, VOWELS[1], 0.8); syllable(dst, {...T, gruff:T.gruff+0.1}, t0+0.15, 0.2, f0*0.85, VOWELS[4], 0.9); return 0.4; }
  if(kind==='hmpf'){ syllable(dst, {...T, gruff:T.gruff+0.15}, t0, 0.22, f0*0.9, VOWELS[4], 1); noiseBurst(dst, t0+0.18, 0.12, 1800, 1, 0.5); return 0.35; }
  if(kind==='laugh'){ for(let k=0;k<4;k++) syllable(dst, T, t0 + k*0.11, 0.08, f0*(1.3 - k*0.05), VOWELS[0], 0.8); return 0.5; }
  if(kind==='shout'){ syllable(dst, {...T, wave:'sawtooth', gruff:T.gruff+0.2}, t0, 0.32, f0*1.7, v(), 1.4); return 0.4; }
  if(kind==='sigh'){ noiseBurst(dst, t0, 0.55, 1200*T.fs, 1.5, 0.45, 500*T.fs); return 0.6; }
  return 0;
}
// speak(char, {mood, syllables}): a gesture for the mood, then a babble of `syllables` (about as long as a line of text)
// mood: 'neutral' · 'happy' · 'angry' · 'sad' · 'formal'
const MOOD_GESTURE = {neutral:null, happy:'laugh', angry:'hmpf', sad:'sigh', formal:'ahem', grumpy:'cough', shout:'shout'};
export function speak(char, opts = {}){
  if(!voices.on) return;
  try{ ensureAudio(); if(!actx || actx.state !== 'running') return; }catch(e){ return; }
  const now = actx.currentTime; if(busy > now) return;   // one voice at a time
  const T = TIMBRE[char] || TIMBRE.mayor, mood = opts.mood || 'neutral', dst = out();
  let t0 = now + 0.05;
  const g = MOOD_GESTURE[mood]; if(g) t0 += gesture(dst, T, g, t0) + 0.08;
  const n = Math.max(3, Math.min(opts.syllables || 10, 26)), base = T.f0 * (mood==='angry' || mood==='shout' ? 1.15 : mood==='sad' ? 0.9 : 1);
  for(let k=0;k<n;k++){
    const dur = (1/T.rate) * (0.7 + Math.random()*0.5);
    const rise = k === n-1 ? (mood==='happy' ? 1.15 : 0.85) : 1;   // the end of a phrase falls (or rises when happy)
    syllable(dst, T, t0, dur*0.85, base * rise * (0.88 + Math.random()*0.28), VOWELS[Math.floor(Math.random()*VOWELS.length)], mood==='angry' ? 1.2 : 1);
    t0 += dur; if(Math.random() < 0.15) t0 += 0.08;   // little pauses between words
  }
  busy = t0;
}
// How many syllables a text is worth (about one every 4 letters, capped)
export const syllablesOf = txt => Math.round(String(txt || '').replace(/<[^>]*>/g, '').length / 4);
