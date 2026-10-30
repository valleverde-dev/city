import { setMusic } from '../audio/music.js';
import { playSound } from '../audio/sfx.js';
import { ACH_BY_ID, PERK_RANK, RANKS, RANK_BONUS, UNLOCK_LEVEL, XP_FOR, career, levelOf, rankOf } from '../core/career.js';
import { B, CFG, NEW_TYPES } from '../core/config.js';
import { residents } from '../core/economy.js';
import { money } from '../core/format.js';
import { records } from '../core/persist.js';
import { regionPop } from '../core/region.js';
import { S } from '../core/state.js';
import { t } from '../i18n/index.js';
import { ic } from './icons.js';
import { regionCanvas } from './regionmap.js';

// =====================================================================
//  DRAMA (v0.8) — the big moments get the whole screen:
//   · a settlement is consolidated: ribbon cut, confetti and fireworks, the Union Gazette's front page
//   · the run is over: the dossier is stamped, shredded, and the Gazette reports it; then the career summary
//   · achievements, unlocks and promotions: banners that slide in from the top during play
//  Tapping skips the animation to its final state. Respects reduced motion.
// =====================================================================
const MOTION = !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
let el = null, timers = [], raf = 0;
function root(){
  if(!el){ el = document.createElement('div'); el.id = 'drama'; el.hidden = true; document.body.appendChild(el); }
  return el;
}
function clear(){ timers.forEach(clearTimeout); timers = []; if(raf) cancelAnimationFrame(raf); raf = 0; }
const later = (ms, fn) => { timers.push(setTimeout(fn, MOTION ? ms : 0)); };
export function dramaOpen(){ return !!el && !el.hidden; }
export function closeDrama(){ clear(); if(el){ el.hidden = true; el.innerHTML = ''; el.className = ''; } document.getElementById('app').classList.remove('shake'); }

// ---------- pixel particles: confetti and fireworks (drawn at 1/3 resolution, scaled up crisp) ----------
function particles(cv, kind){
  const g = cv.getContext('2d'), P = [], cols = ['#ffd200','#ffffff','#e8442e','#2a63c9','#1d8148','#ff9ad5','#5ec8f2'];
  const fit = () => { cv.width = Math.ceil(innerWidth/3); cv.height = Math.ceil(innerHeight/3); };
  fit();
  const burst = (x, y) => { const c = cols[Math.floor(Math.random()*cols.length)];
    for(let k=0;k<36;k++){ const a = k/36*Math.PI*2, v = 0.6 + Math.random()*1.2; P.push({x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v, life:60+Math.random()*30, c, spark:true}); } };
  const confetti = n => { for(let k=0;k<n;k++) P.push({x:Math.random()*cv.width, y:-Math.random()*cv.height*0.5, vx:(Math.random()-0.5)*0.6, vy:0.4+Math.random()*0.8, life:400, c:cols[k%cols.length], w:1+Math.floor(Math.random()*2)}); };
  if(kind==='win'){ confetti(140); }
  let f = 0;
  const step = () => {
    f++; g.clearRect(0,0,cv.width,cv.height);
    if(kind==='win' && f%28===1 && f < 400) burst(cv.width*(0.15 + Math.random()*0.7), cv.height*(0.12 + Math.random()*0.35));
    if(kind==='win' && f%90===0 && f < 300) confetti(40);
    for(let i=P.length-1;i>=0;i--){ const p = P[i];
      p.x += p.vx; p.y += p.vy; p.life--;
      if(p.spark){ p.vy += 0.02; p.vx *= 0.985; } else { p.vx += Math.sin((f+i)*0.07)*0.02; }
      if(p.life <= 0 || p.y > cv.height+4){ P.splice(i,1); continue; }
      g.globalAlpha = p.spark ? Math.min(1, p.life/30) : 1; g.fillStyle = p.c;
      g.fillRect(Math.round(p.x), Math.round(p.y), p.spark ? 1 : p.w, p.spark ? 1 : (f+i)%8<4 ? 2 : 1); }
    g.globalAlpha = 1;
    if(P.length || f < 400) raf = requestAnimationFrame(step); else raf = 0;
  };
  if(MOTION) raf = requestAnimationFrame(step);
}
// The Union Gazette's front page
function gazette(headline, sub, extra){
  return `<div class="gazette"><div class="mast">${t('news.paper')}</div><div class="dateline">${t('news.date', {n: 50 + (S.stage||0)*10})}</div>
    <h2>${headline}</h2><p class="deck">${sub}</p>${extra||''}</div>`;
}

// ---------- a settlement is consolidated ----------
export function dramaWin(c, done){
  clear(); const d = root(); d.hidden = false; d.className = 'win';
  const B0 = S.region.blocks[S.region.blocks.length-1], nx = S.region.next;
  d.innerHTML = `<canvas class="fx"></canvas>
    <div class="ribbon"><i class="l"></i><i class="r"></i><span class="bow"></span></div>
    <h1 class="big">${t('drama.win')}</h1>
    <div class="page" hidden>${gazette(t('news.win.h', {town:c.town, n:c.res}), t('news.win.s'),
      `<div class="rmap-slot"></div><p>${t('cons.money', {back:money(c.back), kept:money(c.kept)})}</p>
       <dl class="kv"><dt>${t('ui.settlements')}</dt><dd>${S.region.blocks.length}</dd><dt>${t('ui.regionPop')}</dt><dd>${regionPop()}</dd><dt>${t('ui.dividend')}</dt><dd>${money(B0 ? B0.tax : 0)}/${t('ui.mo')}</dd></dl>
       ${nx ? `<p class="hint">${t('cons.next', {type:t('st.'+nx.ty), s:nx.n})}</p>` : ''}`)}
      <button class="btn primary go">${ic('play_arrow')}${t('drama.continue')}</button></div>
    <p class="tap">${t('drama.tap')}</p>`;
  const page = d.querySelector('.page');
  const showPage = () => { if(!page.hidden) return; page.hidden = false; d.classList.add('paged');
    const slot = page.querySelector('.rmap-slot'); if(slot) slot.appendChild(regionCanvas({maxW: 260, maxH: 120})); };
  particles(d.querySelector('canvas.fx'), 'win');
  if(!c.played){ c.played = true; playSound('win'); setMusic('win', 1); }
  later(80, ()=>d.classList.add('cut'));
  later(2300, showPage);
  d.onclick = e => { if(e.target.closest('.go')) return; d.classList.add('cut'); showPage(); };
  d.querySelector('.go').onclick = () => { closeDrama(); done(); };
}

// ---------- the run is over ----------
export function dramaLose(buttons){
  clear(); const d = root(); d.hidden = false; d.className = 'lose';
  const w = S.over.why, res = S.over.career || {xp:0, before:career().xp, after:career().xp, rank0:rankOf(career().xp), rank1:rankOf(career().xp), ach:[]}, rec = records();
  const pop = regionPop() + (S.region.active ? residents() : 0), beat = S.over.beat || {};
  const next = RANKS[res.rank1+1], prevT = RANKS[res.rank1];
  const pct = x => next ? Math.max(0, Math.min(100, (x - prevT)/(next - prevT)*100)) : 100;
  const lv0 = levelOf(res.before), lv1 = levelOf(res.after);
  const unlockedNow = Object.keys(UNLOCK_LEVEL).filter(ty=>UNLOCK_LEVEL[ty] > lv0 && UNLOCK_LEVEL[ty] <= lv1);
  const achList = res.ach.length ? `<ul class="medals">${res.ach.map(id=>`<li>${ic('workspace_premium')}<b>${t('ach.'+id+'.t')}</b><small>+${ACH_BY_ID[id].xp} XP</small></li>`).join('')}</ul>` : `<p class="hint">${t('sum.none')}</p>`;
  d.innerHTML = `<div class="dossier"><div class="tab">${t('ui.dg')}</div><b>${S.town}</b><small>HUF/${(S.runSeed||0)%10000}/${S.stage+1}</small><div class="stamp-big">${t('over.'+w+'.s')}</div></div>
    <div class="shredder"><i></i></div><div class="strips"></div>
    <div class="page" hidden>${gazette(t('news.'+w+'.h', {town:S.town}), t('news.'+w+'.s'),
      `<div class="rmap-slot"></div>
       <dl class="kv"><dt>${t('ui.settlements')}</dt><dd>${S.region.blocks.length}</dd><dt>${t('ui.regionPop')}</dt><dd>${pop}</dd></dl>
       ${(beat.settlements || beat.pop) ? `<p class="record">${ic('workspace_premium')}${t('run.record')}</p>` : ''}`)}
      <div class="summary">
        <div class="xprow"><span>${t('rank.'+res.rank1)}</span><b>${t('sum.gained', {x: res.after - res.before})}</b></div>
        <div class="xpbar"><i style="width:${pct(res.before)}%"></i></div>
        ${res.rank1 > res.rank0 ? `<p class="promo">${ic('military_tech')}${t('toast.rank', {r:t('rank.'+res.rank1)})}</p>` : ''}
        <h4>${t('sum.newAch')}</h4>${achList}
        ${unlockedNow.length ? `<h4>${t('sum.unlocked')}</h4><ul class="medals new">${unlockedNow.map(ty=>`<li>${ic(B[ty].icon)}<b>${t('b.'+ty)}</b></li>`).join('')}</ul>` : ''}
        <p class="hint">${t('run.best', {s:rec.best.settlements, p:rec.best.pop})}</p>
        <div class="btns"></div></div></div>
    <p class="tap">${t('drama.tap')}</p>`;
  buttons.forEach(b=>d.querySelector('.btns').appendChild(b));
  const page = d.querySelector('.page');
  const showPage = () => { if(!page.hidden) return; page.hidden = false; d.classList.add('paged');
    const slot = page.querySelector('.rmap-slot'); if(slot) slot.appendChild(regionCanvas({maxW: 260, maxH: 110}));
    const bar = page.querySelector('.xpbar i'); requestAnimationFrame(()=>requestAnimationFrame(()=>{ bar.style.width = pct(res.after)+'%'; })); };
  const first = !S.over.dramaPlayed; S.over.dramaPlayed = true;
  if(!first || !MOTION){ d.classList.add('stamped', 'shred'); showPage(); return; }
  playSound('fail'); setMusic('menu', 0.6);
  later(650, ()=>{ d.classList.add('stamped'); playSound('stamp'); const app = document.getElementById('app'); app.classList.add('shake'); setTimeout(()=>app.classList.remove('shake'), 500); });
  later(1700, ()=>{ d.classList.add('shred'); const st = d.querySelector('.strips');
    for(let k=0;k<14;k++){ const s = document.createElement('i'); s.style.left = (k*7)+'%'; s.style.animationDelay = (k*40)+'ms'; st.appendChild(s); } });
  later(3200, showPage);
  d.onclick = e => { if(e.target.closest('button')) return; d.classList.add('stamped', 'shred'); showPage(); };
}

// ---------- banners during play: achievements, new buildings, promotions ----------
let queue = [], showing = false;
// Any banner (combos, levels…): queued after the ones already showing
export function toast(q){ queue.push(q); if(!showing) nextToast(); }
export const pendingToasts = () => queue.map(q=>q.k);   // for the tests
export function flushToasts(){
  if(!S) return;
  if(S.over){ (S.newAch||[]).splice(0); (S.rankUps||[]).splice(0); (S.levelUps||[]).splice(0); (S.unlocks||[]).splice(0); return; }   // the end-of-run summary lists them
  (S.newAch || []).splice(0).forEach(id=>queue.push({k:'ach', id}));
  // v0.9.2: a level or a promotion says in the same banner what it brings (buildings, perks, grant)
  const ul = (S.unlocks || []).splice(0), lvOf = ty => UNLOCK_LEVEL[ty];
  const ranks = (S.rankUps || []).splice(0), levels = (S.levelUps || []).splice(0);
  ranks.forEach(r=>queue.push({k:'rank', r}));
  levels.forEach(n=>queue.push({k:'level', n}));
  ul.forEach(ty=>{ const host = queue.find(q=>q.k==='level' && q.n===lvOf(ty)) || queue.find(q=>q.k==='rank');
    if(host) (host.ul = host.ul || []).push(ty); else queue.push({k:'unlock', ty}); });
  if(!showing) nextToast();
}
function nextToast(){
  const q = queue.shift(); if(!q){ showing = false; return; } showing = true;
  let bar = document.getElementById('toast'); if(!bar){ bar = document.createElement('div'); bar.id = 'toast'; document.body.appendChild(bar); }
  bar.className = 'toast '+q.k;
  if(q.k==='ach') bar.innerHTML = `${ic('workspace_premium')}<span><small>${t('toast.ach')} · +${ACH_BY_ID[q.id].xp} XP</small><b>${t('ach.'+q.id+'.t')}</b></span>`;
  if(q.k==='unlock') bar.innerHTML = `${ic(B[q.ty].icon)}<span><small>${t('sum.unlocked')}</small><b>${t('toast.unlock', {b:t('b.'+q.ty)})}</b></span>`;
  const gives = (q.ul||[]).length ? t('toast.unlocks', {b:q.ul.map(ty=>t('b.'+ty)).join(', ')}) : '';
  if(q.k==='rank'){ const perks = Object.keys(PERK_RANK).filter(k=>PERK_RANK[k]===q.r).map(k=>t('perk.'+k));
    const line = [t('toast.grant', {p:Math.round(q.r*RANK_BONUS*100)}), perks.length ? t('toast.perks', {p:perks.join(', ')}) : '', gives].filter(Boolean).join(' · ');
    bar.innerHTML = `${ic('military_tech')}<span><small>${t('title.career')}</small><b>${t('toast.rank', {r:t('rank.'+q.r)})}</b><i>${line}</i></span>`; }
  if(q.k==='level') bar.innerHTML = `${ic('trending_up')}<span><small>${t('file.t')}</small><b>${t('toast.level', {n:q.n})}</b>${gives ? `<i>${gives}</i>` : ''}</span>`;
  if(q.k==='combo'){ bar.className = 'toast combo '+(q.good ? 'good' : 'bad');
    bar.innerHTML = `${ic(q.good ? 'workspace_premium' : 'warning')}<span><small>${t(q.good ? 'toast.combo' : 'toast.comboBad')}${q.good ? ' · +'+XP_FOR.discover+' XP' : ''}</small><b>${t((q.region ? 'rcombo.' : 'combo.')+q.id)}</b><i>${t((q.region ? 'rcombod.' : 'combod.')+q.id).split('. ')[0]}</i></span>`; }
  playSound(q.k==='rank' ? 'win' : q.k==='combo' ? (q.good ? 'fanfare' : 'crowd') : q.k==='level' ? 'ok' : 'fanfare');
  // v0.9.2: below the HUD, never over it; it fades out on its own (or when tapped) and the next one follows
  const hud = document.getElementById('hud'); if(hud) bar.style.setProperty('--toastTop', Math.round(hud.getBoundingClientRect().bottom + 12)+'px');
  bar.classList.remove('in'); void bar.offsetWidth; bar.classList.add('in');
  let done = false; const leave = () => { if(done) return; done = true; clearTimeout(timer); bar.classList.remove('in'); bar.onclick = null; setTimeout(nextToast, 380); };
  const timer = setTimeout(leave, q.k==='level' ? 2200 : q.k==='combo' ? 3200 : (q.ul || q.k==='rank') ? 3600 : 2600);
  bar.onclick = leave;
}
