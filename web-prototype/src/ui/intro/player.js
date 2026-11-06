// =====================================================================
//  THE INTRO — played after New Game on the title screen: eight full-screen shots with slow fades and slow zooms, a
//  line of text fading in over each, and the last shot turning into the title screen with the logo. A tap shows Skip
//  (to the logo); Esc or Enter skip too; on the logo, they end it. Then the run starts (done()).
//  Automated browsers (the tests) skip it, so New Game starts the run at once there.
// =====================================================================
import { t } from '../../i18n/index.js';
import { MOTION } from '../../render/anim.js';
import { VW, VH, SCENES } from './scenes.js';
import * as finale from './finale.js';
import * as sound from './sound.js';

// duration, scene clock speed, camera from → to (centre x, y, zoom), colour grade (multiply tint, light pool)
const SHOTS = [
  {d:7.5, k:.7,  cam:[[160,90,1],[160,104,1.45]],   tint:'#d8bcc8', spot:[160,116,20,150,.8]},
  {d:8,   k:.8,  cam:[[170,100,1.35],[150,84,1.05]], tint:'#b4c0e0', spot:[110,90,30,190,.72]},
  {d:7.5, k:.75, cam:[[180,90,1.05],[70,92,1.55]],   tint:'#c4c8e0', spot:[90,90,24,180,.75]},
  {d:7.5, k:.75, cam:[[160,100,1.5],[160,92,1.1]],   tint:'#a8b4dc', spot:[160,84,30,170,.7]},
  {d:8.5, k:.42, cam:[[160,100,1],[160,80,1.9]],     tint:'#b8c0d4', spot:[160,80,12,150,.85]},
  {d:7.5, k:.45, cam:[[160,100,1],[176,92,1.3]],     tint:'#fff6e4', spot:[226,80,40,220,.5]},
  {d:5,   k:.55, cam:[[160,88,1.2],[160,88,1.7]],    tint:'#d8c8a0', spot:[160,88,20,100,.92]},
  {d:9,   k:1,   cam:[[160,62,1.3],[160,90,1]], camEnd:.7, flash:true, hi:true}
];
const FADE = 1.3, TXT_IN = 1.6, TXT_F = 1;
const ease = x => x < .5 ? 2*x*x : 1 - Math.pow(-2*x + 2, 2)/2;
let bgc = [];
function bgFor(i){ if(!SCENES[i][0]) return null; if(!bgc[i]){ const cv = document.createElement('canvas'); cv.width = VW; cv.height = VH; SCENES[i][0](cv.getContext('2d')); bgc[i] = cv; } return bgc[i]; }
function grade(c, s){
  if(s.tint){ c.globalCompositeOperation = 'multiply'; c.fillStyle = s.tint; c.fillRect(0, 0, VW, VH); c.globalCompositeOperation = 'source-over'; }
  if(s.spot){ const [x,y,a,b,al] = s.spot, g = c.createRadialGradient(x, y, a, x, y, b); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,'+al+')'); c.fillStyle = g; c.fillRect(0, 0, VW, VH); }
}

export const introPlaying = () => !!document.getElementById('intro');
export function playIntro(done, {diorama = null} = {}){
  if(navigator.webdriver || introPlaying()){ done(); return; }
  finale.useDiorama(diorama);
  const el = document.createElement('div'); el.id = 'intro'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', t('intro.label'));
  el.innerHTML = `<canvas class="in-film" aria-hidden="true"></canvas><div class="in-line" aria-live="polite"></div><button type="button" class="in-skip" hidden>${t('intro.skip')} ›</button>`;
  document.body.appendChild(el);
  const film = el.querySelector('.in-film'), fc = film.getContext('2d'), line = el.querySelector('.in-line'), skipBtn = el.querySelector('.in-skip');
  const off = document.createElement('canvas'); off.width = VW; off.height = VH; const oc = off.getContext('2d');
  let shot = 0, st = 0, last = performance.now(), raf = 0, uiTimer = 0, over = false;
  const size = () => { const d = Math.min(devicePixelRatio || 1, 2); film.width = Math.round(innerWidth*d); film.height = Math.round(innerHeight*d); };
  size(); addEventListener('resize', size);
  const cue = () => sound.cue(shot, SHOTS[shot].d, SHOTS[shot].k);
  const toLogo = () => { shot = SHOTS.length - 1; st = 0; cue(); };
  function end(){ if(over) return; over = true; cancelAnimationFrame(raf); clearTimeout(uiTimer); sound.stop(); removeEventListener('resize', size); removeEventListener('keydown', onKey, true);
    el.classList.add('out'); setTimeout(()=>el.remove(), 400); done(); }
  function onKey(e){ if(e.key === 'Escape' || e.key === 'Enter' || e.key === ' '){ e.preventDefault(); e.stopPropagation(); shot < SHOTS.length - 1 ? toLogo() : end(); } }
  addEventListener('keydown', onKey, true);
  el.addEventListener('pointerdown', e => { if(e.target === skipBtn) return; skipBtn.hidden = false; clearTimeout(uiTimer); uiTimer = setTimeout(()=>{ skipBtn.hidden = true; }, 2600); });
  skipBtn.addEventListener('click', ()=>{ skipBtn.hidden = true; shot < SHOTS.length - 1 ? toLogo() : end(); });
  function render(){
    const W = film.width, H = film.height, s = SHOTS[shot];
    fc.setTransform(1,0,0,1,0,0); fc.fillStyle = '#000'; fc.fillRect(0, 0, W, H);
    let src = off;
    if(s.hi) src = finale.draw(st*s.k);
    else { oc.clearRect(0, 0, VW, VH); const bg = bgFor(shot); if(bg) oc.drawImage(bg, 0, 0); SCENES[shot][1](oc, st*s.k); grade(oc, s); }
    const p = MOTION ? ease(Math.min(st/(s.d*(s.camEnd || 1)), 1)) : 0, [a, b] = s.cam;
    let cx = a[0] + (b[0]-a[0])*p, cy = a[1] + (b[1]-a[1])*p; const z = a[2] + (b[2]-a[2])*p;
    const fit = Math.min(Math.max(W/VW, H/VH), Math.min(W/VW, H/VH)*1.4), tot = fit*z, hw = W/(2*tot), hh = H/(2*tot);
    cx = hw < VW/2 ? Math.min(Math.max(cx, hw), VW - hw) : VW/2; cy = hh < VH/2 ? Math.min(Math.max(cy, hh), VH - hh) : VH/2;
    let al = s.flash ? 1 : Math.min(1, st/FADE); al = Math.min(al, Math.max(0, (s.d - st)/FADE));
    fc.imageSmoothingEnabled = false; fc.globalAlpha = al;
    fc.setTransform(tot, 0, 0, tot, W/2 - cx*tot, H/2 - cy*tot); fc.drawImage(src, 0, 0, VW, VH);
    fc.setTransform(1,0,0,1,0,0); fc.globalAlpha = 1;
    if(s.flash && st < .9){ fc.fillStyle = 'rgba(255,255,255,'+(1 - st/.9)+')'; fc.fillRect(0, 0, W, H); }
    const txt = shot < 7 ? t('intro.'+(shot+1)) : ''; if(line.textContent !== txt) line.textContent = txt;
    line.style.opacity = txt ? Math.max(0, Math.min((st - TXT_IN)/TXT_F, 1, (s.d - FADE - .3 - st)/TXT_F)) : 0;
  }
  function frame(now){
    if(over) return; const dt = Math.min((now - last)/1000, .1); last = now; st += dt;
    if(st >= SHOTS[shot].d){ if(shot < SHOTS.length - 1){ shot++; st = 0; cue(); } else { end(); return; } }
    render(); raf = requestAnimationFrame(frame);
  }
  sound.init(); cue();
  Promise.resolve(document.fonts && document.fonts.load ? Promise.all([document.fonts.load('16px Jersey'), document.fonts.load('16px Silk'), document.fonts.load('16px Pixel')]) : 0)
    .catch(()=>{}).then(()=>finale.ready).then(()=>{ last = performance.now(); raf = requestAnimationFrame(frame); });
}
