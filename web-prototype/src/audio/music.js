import { S } from '../core/state.js';
import { t } from '../i18n/index.js';
import { ic } from '../ui/icons.js';

// =====================================================================
//  AUDIO — music (soundtrack) + synthesized sound effects
// =====================================================================
export let actx;
export function ensureAudio(){
  if(!actx){ actx = new (window.AudioContext||window.webkitAudioContext)(); }
  if(actx.state !== 'running') actx.resume().catch(()=>{});
}
// v0.9.3: on iOS, Web Audio is treated as a system sound and the silent mode mutes it. Declaring the session as
// media playback (Safari 16.4+) makes the game sound like a video does. Harmless elsewhere.
try{ if(navigator.audioSession) navigator.audioSession.type = 'playback'; }catch(e){}
export const audioRunning = () => !!actx && actx.state === 'running';
// --- Music: looping soundtrack via Web Audio (gapless loops, crossfades) ---
// Ogg Vorbis where supported, AAC (.m4a) fallback for older Safari/iOS.
export const music = {
  on: (()=>{ try{ return localStorage.getItem('citybuilder_music') !== 'off'; }catch(e){ return true; } })(),
  want: null,      // what the game asked for: 'menu' | 'win' | 'phase1'…'phase4'
  playing: null,   // the playlist that is sounding
  cur: null,       // the track of that playlist that is sounding
  pos: {},         // per playlist: index of the current track (so pause / resume carries on where it was)
  switchAt: 0,     // AudioContext time at which the next track of the playlist crossfades in
  src: null, gain: null, buffers: {}, loading: {},
  ext: (()=>{ const a=document.createElement('audio');
    return a.canPlayType && a.canPlayType('audio/ogg; codecs="vorbis"') ? 'ogg' : 'm4a'; })(),
  level: 1,
};
export const TRACKS = { menu:'eurocrat_menu', win:'eurocrat_win',
  level1:'eurocrat_level1', level2:'eurocrat_level2', level4:'eurocrat_level4',
  lobby:'eurocrat_lobby', hold:'eurocrat_hold', sunny:'eurocrat_sunny', handsup:'eurocrat_handsup', italo:'eurocrat_italo' };
// In game, each phase has a small playlist that rotates (about two minutes per track, with a crossfade), so a long
// phase never loops one tune. The first track is the phase's own theme. Phase III has no theme of its own any more
// (its tense office ambient was retired): it plays lobby music, hold music and a bit of disco instead.
export const PLAYLISTS = {
  menu:['menu'], win:['win'],
  phase1:['level1', 'sunny', 'lobby'],
  phase2:['level2', 'italo', 'hold'],
  phase3:['lobby', 'italo', 'hold', 'sunny'],
  phase4:['level4', 'handsup', 'sunny', 'italo'],
};
export const TRACK_SECONDS = 110;   // roughly how long one track of a playlist plays before the next one
export const gameTrack = () => 'phase' + (Math.min((S && S.level) | 0, 3) + 1);
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
  music.cur = null; music.switchAt = 0;
  if(!music.src) return;
  const {src, gain} = music, now = actx.currentTime;
  gain.gain.cancelScheduledValues(now);
  gain.gain.setValueAtTime(gain.gain.value, now);
  gain.gain.linearRampToValueAtTime(0, now+t);
  src.stop(now+t+0.05);
  music.src = music.gain = null;
}
const playlist = key => PLAYLISTS[key] || [key];
// Start one track of the playing playlist (looped; it fades in)
function startTrack(track){
  const key = music.playing;
  music.cur = track;
  loadTrack(track).then(buf=>{
    if(music.cur !== track || music.playing !== key || music.src) return;  // changed while loading
    const src = actx.createBufferSource(), gain = actx.createGain();
    src.buffer = buf; src.loop = true;
    src.connect(gain); gain.connect(actx.destination);
    const now = actx.currentTime, list = playlist(key);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(MUSIC_VOL*music.level, now+1.2);
    src.start(now);
    music.src = src; music.gain = gain;
    if(list.length > 1){
      // whole loops only, so a track never cuts mid-phrase: ~TRACK_SECONDS, at least one loop
      const loops = Math.max(1, Math.round(TRACK_SECONDS / buf.duration));
      music.switchAt = now + loops * buf.duration - 1.5;
      const next = list[(list.indexOf(track) + 1) % list.length];
      setTimeout(()=>{ loadTrack(next).catch(()=>{}); }, 4000);   // decode the next one ahead of time
    }
  }).catch(()=>{ if(music.cur === track){ music.cur = null; music.playing = null; } });
}
// Crossfade to the next track of the playlist
export function nextTrack(){
  const key = music.playing; if(!key || !actx) return;
  const list = playlist(key); if(list.length < 2) return;
  music.pos[key] = ((music.pos[key] || 0) + 1) % list.length;
  fadeOutCurrent(1.5);
  startTrack(list[music.pos[key]]);
}
setInterval(()=>{ if(music.src && music.switchAt && actx && actx.state === 'running' && actx.currentTime >= music.switchAt) nextTrack(); }, 500);
export function syncMusic(){
  // No music when opened as a local file (fetch is blocked there) or when muted
  if(location.protocol==='file:' || !actx) return;
  const key = music.on ? music.want : null;
  if(key === music.playing && (music.src || music.cur)){
    if(music.gain){ const now=actx.currentTime;
      music.gain.gain.cancelScheduledValues(now);
      music.gain.gain.setValueAtTime(music.gain.gain.value, now);
      music.gain.gain.linearRampToValueAtTime(MUSIC_VOL*music.level, now+0.4); }
    return;
  }
  fadeOutCurrent();
  music.playing = key;
  if(!key) return;
  const list = playlist(key);
  startTrack(list[(music.pos[key] || 0) % list.length]);
}
// track: 'menu' | 'phase1'…'phase4' | 'win' (a playlist); level: 1 = full, <1 = ducked (pause screen)
export function setMusic(track, level=1){ music.want = track; music.level = level; syncMusic(); }
export function updateMusicBtn(){
  const hb = document.getElementById('musicBtn'); if(hb) hb.innerHTML = ic(music.on ? 'music_note' : 'music_off');
  const m = document.getElementById('btnMusic');
  if(m){ m.innerHTML = ic(music.on ? 'music_note' : 'music_off') + '<span class="label"></span>';
    m.querySelector('.label').textContent = t('menu.music', {s: t(music.on ? 'on' : 'off')}); }
}
export function toggleMusic(){
  music.on = !music.on;
  try{ localStorage.setItem('citybuilder_music', music.on ? 'on' : 'off'); }catch(e){}
  ensureAudio(); updateMusicBtn(); syncMusic();
}
// iOS/Safari only allow audio inside a complete gesture (touchend / click — not pointerdown). v0.9.3: unlock there,
// play a silent buffer (WebKit's own unlock trick) and keep trying on every gesture until the context really runs.
const UNLOCK_EVENTS = ['touchend', 'click', 'keydown'];
export function unlockAudio(){
  try{
    ensureAudio();
    const b = actx.createBuffer(1, 1, 22050), src = actx.createBufferSource(); src.buffer = b; src.connect(actx.destination); src.start(0);
    const done = () => { if(audioRunning()){ UNLOCK_EVENTS.forEach(ev=>removeEventListener(ev, unlockAudio, true)); syncMusic(); document.dispatchEvent(new Event('audiounlocked')); } };
    if(actx.state === 'running') done(); else actx.resume().then(done, ()=>{});
  }catch(e){}
}
UNLOCK_EVENTS.forEach(ev=>addEventListener(ev, unlockAudio, true));
// Silence everything while the app is in the background
document.addEventListener('visibilitychange', ()=>{
  if(!actx) return;
  if(document.hidden) actx.suspend(); else actx.resume().then(()=>syncMusic(), ()=>{});   // back from the background: the music goes on
});
