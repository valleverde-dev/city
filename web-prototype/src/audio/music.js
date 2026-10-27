import { S } from '../core/state.js';
import { t } from '../i18n/index.js';
import { ic } from '../ui/icons.js';

// =====================================================================
//  AUDIO — music (soundtrack) + synthesized sound effects
// =====================================================================
export let actx;
export function ensureAudio(){
  if(!actx){ actx = new (window.AudioContext||window.webkitAudioContext)(); }
  if(actx.state==='suspended') actx.resume();
}
// --- Music: looping soundtrack via Web Audio (gapless loops, crossfades) ---
// Ogg Vorbis where supported, AAC (.m4a) fallback for older Safari/iOS.
export const music = {
  on: (()=>{ try{ return localStorage.getItem('citybuilder_music') !== 'off'; }catch(e){ return true; } })(),
  want: null, playing: null, src: null, gain: null, buffers: {}, loading: {},
  ext: (()=>{ const a=document.createElement('audio');
    return a.canPlayType && a.canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'm4a'; })(),
  level: 1,
};
export const TRACKS = { menu:'eurocrat_menu', win:'eurocrat_win',
  level1:'eurocrat_level1', level2:'eurocrat_level2', level3:'eurocrat_level3', level4:'eurocrat_level4' };
// Each campaign level has its own theme: village waltz → Eurovision pop → office ambient → Euro-trance
export const gameTrack = () => 'level' + (((S && S.level) | 0) + 1);
export const MUSIC_VOL = 0.45;
export function loadTrack(name){
  if(music.buffers[name]) return Promise.resolve(music.buffers[name]);
  if(!music.loading[name]){
    music.loading[name] = fetch(`audio/${TRACKS[name]}.${music.ext}`)
      .then(r=>{ if(!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
      .then(b=>new Promise((ok,ko)=>actx.decodeAudioData(b, ok, ko)))
      .then(buf=>(music.buffers[name]=buf))
      .catch(e=>{ delete music.loading[name]; throw e; });
  }
  return music.loading[name];
}
export function fadeOutCurrent(t=0.8){
  music.playing = null;
  if(!music.src) return;
  const {src, gain} = music, now = actx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(0, now+t);
  src.stop(now+t+0.05);
  music.src = music.gain = music.playing = null;
}
export function syncMusic(){
  // No music when opened as a local file (fetch is blocked there) or when muted
  if(location.protocol==='file:' || !actx) return;
  const name = music.on ? music.want : null;
  if(name === music.playing){
    if(music.gain){ const now=actx.currentTime;
      music.gain.gain.cancelScheduledValues(now);
      music.gain.gain.setValueAtTime(music.gain.gain.value, now);
      music.gain.gain.linearRampToValueAtTime(MUSIC_VOL*music.level, now+0.4); }
    return;
  }
  fadeOutCurrent();
  if(!name) return;
  music.playing = name;
  loadTrack(name).then(buf=>{
    if(music.playing !== name || music.src) return;  // changed while loading
    const src = actx.createBufferSource(), gain = actx.createGain();
    src.buffer = buf; src.loop = true;
    src.connect(gain); gain.connect(actx.destination);
    const now = actx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(MUSIC_VOL*music.level, now+1.2);
    src.start(now);
    music.src = src; music.gain = gain;
  }).catch(()=>{ if(music.playing===name) music.playing=null; });
}
// track: 'menu' | 'level1'…'level4' | 'win'; level: 1 = full, <1 = ducked (pause screen)
export function setMusic(track, level=1){ music.want = track; music.level = level; syncMusic(); }
export function updateMusicBtn(){
  document.getElementById('musicBtn').innerHTML = ic(music.on ? 'music_note' : 'music_off');
  const m = document.getElementById('btnMusic');
  if(m){ m.innerHTML = ic(music.on ? 'music_note' : 'music_off') + '<span class="label"></span>';
    m.querySelector('.label').textContent = t('menu.music', {s: t(music.on ? 'on' : 'off')}); }
}
export function toggleMusic(){
  music.on = !music.on;
  try{ localStorage.setItem('citybuilder_music', music.on ? 'on' : 'off'); }catch(e){}
  ensureAudio(); updateMusicBtn(); syncMusic();
}
// iOS/Safari only allow audio after a user gesture: unlock on the first touch/click
export function unlockAudio(){
  try{ ensureAudio(); syncMusic(); }catch(e){}
  removeEventListener('pointerdown', unlockAudio, true);
  removeEventListener('keydown', unlockAudio, true);
}
addEventListener('pointerdown', unlockAudio, true);
addEventListener('keydown', unlockAudio, true);
// Silence everything while the app is in the background
document.addEventListener('visibilitychange', ()=>{
  if(!actx) return;
  if(document.hidden) actx.suspend(); else actx.resume();
});
