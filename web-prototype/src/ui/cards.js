import { setMusic } from '../audio/music.js';
import { playSound } from '../audio/sfx.js';
import { COMBO_BY_ID, discovered } from '../core/combos.js';
import { CFG, CHARS, LEVELS, LV, PERKS, on, stageCfg } from '../core/config.js';
import { RCOMBO_BY_ID, STYPE_ICON, regionPop } from '../core/region.js';
import { DIRECTIVE_ICON, choosePerk } from '../core/directives.js';
import { residents } from '../core/economy.js';
import { EVENTS, choicesFor, resolveEvent } from '../core/events.js';
import { money } from '../core/format.js';
import { records, save } from '../core/persist.js';
import { S, pname } from '../core/state.js';
import { t } from '../i18n/index.js';
import { C } from '../render/pixel.js';
import { setMapSize } from '../render/map.js';
import { $, P, country, portrait } from './dom.js';
import { pulse, refresh } from './guide.js';
import { hidePop, roman, setSheet, sheet } from './hud.js';
import { ic } from './icons.js';
import { enterSettlement, frameView, startMenu, startRun } from './title.js';
import { regionCanvas } from './regionmap.js';
import { closeDrama, dramaLose, dramaWin } from './drama.js';

// =====================================================================
//  CARDS & NOTICES (modal). One renderer per card type; re-rendered on language change.
// =====================================================================
export const modal = $('modal'), notice = $('notice');
let attachKey = '';
export let rerender = null;
export function setRerender(f){ rerender = f; }
export function letter({icon, title, stamp, cls, body, buttons, dock, speaker}){
  notice.className = 'notice'; modal.classList.remove('title');
  notice.innerHTML = `<div class="letterhead"><i class="emblem" aria-hidden="true"></i><div class="org">${t('ui.union')}<i>${t('ui.dg')}</i></div>
      ${S ? `<div class="date">${t('ui.dateline', {m:Math.min(S.month, CFG.months)})}</div>` : ''}</div>
    <div class="sheet">${stamp?`<div class="stamp ${cls||'info'}">${stamp}</div>`:''}
    ${speaker?`<div class="speaker">${pxPortrait(speaker)}<div><b>${CHARS[speaker].name}</b><small>${t('char.'+speaker,{town:S.town})}</small></div></div>`:''}
    <h2>${ic(icon)}${title}</h2>${body}<div class="btns"></div></div>`;
  notice.classList.toggle('stamped', !!stamp && !speaker);
  const box = notice.querySelector('.btns'); buttons.forEach(b=>box.appendChild(b));
  modal.classList.remove('hidden'); modal.classList.toggle('dock', !!dock); notice.scrollTop = 0;
  notice.style.animation = 'none'; void notice.offsetWidth; notice.style.animation = '';
}
// Character portraits: the vector faces are rasterised to 32×32, snapped to their own palette
// and outlined, so they read as pixel art next to the map. Cached per character.
export const PXP = {};
export function pxPortrait(id){
  if(!PXP[id]) makePixelPortrait(id);
  return `<img class="pxp" alt="" data-char="${id}" src="${PXP[id] || 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(portraitSVG(id))}">`;
}
export function portraitSVG(id){ return portrait(id, 64).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '); }
export function makePixelPortrait(id){
  if(makePixelPortrait.busy[id]) return; makePixelPortrait.busy[id] = true;
  const svg = portraitSVG(id), img = new Image();
  img.onload = ()=>{
    const n = 32, cv = document.createElement('canvas'); cv.width = n; cv.height = n;
    const g = cv.getContext('2d'); g.drawImage(img, 0, 0, n, n);
    const data = g.getImageData(0, 0, n, n), d = data.data;
    const pal = [...new Set((svg.match(/#[0-9a-fA-F]{6}\b/g) || []).map(x=>x.toLowerCase()))].map(C);
    const bg = C('#dfe7f5'), near = (r,gr,b)=>{ let best = pal[0], bd = 1e9;
      for(const p of pal){ const dd = (p[0]-r)**2 + (p[1]-gr)**2 + (p[2]-b)**2; if(dd < bd){ bd = dd; best = p; } } return best; };
    const isBg = new Uint8Array(n*n);
    for(let i=0;i<n*n;i++){ const o=i*4, c = near(d[o], d[o+1], d[o+2]); d[o]=c[0]; d[o+1]=c[1]; d[o+2]=c[2]; d[o+3]=255;
      isBg[i] = (c[0]===bg[0] && c[1]===bg[1] && c[2]===bg[2]) ? 1 : 0; }
    for(let y=0;y<n;y++) for(let x=0;x<n;x++){ const i=y*n+x; if(isBg[i]) continue;   // dark outline against the background
      if((x>0&&isBg[i-1])||(x<n-1&&isBg[i+1])||(y>0&&isBg[i-n])||(y<n-1&&isBg[i+n])){ const o=i*4; d[o]=d[o]*0.45|0; d[o+1]=d[o+1]*0.45|0; d[o+2]=d[o+2]*0.55|0; } }
    for(let y=0;y<n;y++) for(let x=0;x<n;x++){ const i=y*n+x; if(isBg[i] && ((x>>1)+(y>>1))%2===0){ const o=i*4; d[o]-=8; d[o+1]-=6; d[o+2]-=2; } }  // subtle checker
    g.putImageData(data, 0, 0); PXP[id] = cv.toDataURL();
    document.querySelectorAll(`img.pxp[data-char="${id}"]`).forEach(e=>{ e.src = PXP[id]; });
  };
  img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
makePixelPortrait.busy = {};
export function btn(label, icon, fn, primary){ const b=document.createElement('button'); b.className='btn'+(primary?' primary':''); b.innerHTML=`${ic(icon)}${label}`; b.onclick=fn; return b; }
export function hideModal(){ modal.classList.add('hidden'); modal.classList.remove('title'); rerender = null; }
export const CHIP_ICON = {money:'euro', local:'how_to_vote', neigh:'diversity_3', comp:'fact_check', delay:'schedule', risk:'casino', slot:'event_busy', lose:'block', land:'add_location', debt:'account_balance_wallet', cost:'trending_up', later:'schedule', rate:'percent', market:'trending_down'};
export function chip([type, v]){
  let cls = '', txt = '';
  if(type==='money'){ txt = (v>0?'+':'')+money(v); cls = v>0?'good':'bad'; }
  else if(type==='debt'){ txt = (v>0?'+':'')+money(v); cls = v>0?'bad':'good'; }
  else if(['local','neigh','comp'].includes(type)){ txt = t('meter.'+type)+' '+(typeof v==='number' ? (v>0?'+':'')+v : v); cls = typeof v==='number' ? (v>0?'good':'bad') : ''; }
  else if(type==='risk'){ if(!v) return ''; txt = t('chip.risk',{n:v}); cls='risk'; }
  else { txt = t('chip.'+type, {n:v, x:v}); cls = ['delay','slot','lose','cost','rate','market'].includes(type) ? 'bad' : (type==='land'?'good':''); }
  return `<span class="chip ${cls}">${ic(CHIP_ICON[type])}${txt}</span>`;
}
export function showNext(){
  hidePop();
  if(S.cards.length){ const c = S.cards[0]; (CARD[c.type])(c); rerender = ()=>CARD[c.type](c); return; }
  if(S.perkChoice){ perkCard(); rerender = perkCard; return; }
  if(S.pending==='attach' && !S.over){ hideModal();
    const key = S.runSeed+':'+S.stage+':'+S.region.cands.map(P=>P.x+','+P.y).join(';');
    if(attachKey !== key){ attachKey = key; setMapSize(); setSheet('attach'); refresh(); frameView(); }   // once per offer: show the new land
    refresh(); return; }   // choose the next plot on the map
  if(S.over){ gameOver(); rerender = gameOver; return; }
  S.focus = -1; hideModal(); refresh();
}
export function nextCard(sfx){ S.cards.shift(); if(sfx) playSound(sfx); save(); refresh(); showNext(); }
export const CARD = {
  intro: ()=> letter({icon:'mail', title:t('intro.t'), stamp:t('stamp.appointed'), cls:'info',
    body: t('intro.x', {ref:`HUF/MOTHER/${S.seed%10000}-B`, x:money(S.grant), town:S.town, country:country(), m:CFG.months, n:CFG.target}),
    buttons:[btn(t('intro.ok'),'draw', ()=>nextCard('stamp'), true)]}),
  directive: c => { const d=c.d;
    letter({icon:DIRECTIVE_ICON[d.kind], title:t('dir.'+d.kind+'.t'), stamp:t('stamp.urgent'), cls:'info', speaker:'brussels',
      body:`<div class="quote">${t('dir.'+d.kind+'.x',{n:d.param})}</div><p><b>${t('dir.deadline',{m:d.deadline})}</b></p><p>${t('dir.rules')}</p>`,
      buttons:[btn(t('dir.ack'),'task_alt', ()=>nextCard('stamp'), true)]}); playSound('phone'); },
  notice: c => { letter({icon:c.icon, title:t(c.key+'.t', P(c.p)), stamp:t(c.stamp), cls:c.cls, speaker:c.char,
      body:`<div class="quote">${t(c.key+'.x', P(c.p))}</div>`, buttons:[btn(t('ui.noted'),'check', ()=>nextCard('click'), true)]});
    if(!c.played){ c.played = true; playSound(c.sfx||'stamp'); } },
  event: c => { const E = EVENTS[c.id], v = c.v;
    if(v.i>=0 && v.i!==undefined) pulse(v.i);
    const where = v.i>=0 && v.i!==undefined ? `<span class="where">${ic('place')}${t('ui.parcel',{at:pname(v.i)})}</span>` : '';
    const buttons = choicesFor(c).map(ch=>{ const b = document.createElement('button'); b.className='choice'; const can = !ch.can || ch.can(v);
      b.disabled = !can; b.innerHTML = `<b>${t('ev.'+c.id+'.c.'+ch.k)}</b><div class="chips">${ch.fx(v).map(chip).join('')}${can?'':`<span class="chip bad">${t('err.funds')}</span>`}</div>`;
      b.onclick = ()=>{ const res = resolveEvent(c, ch.k); S.cards.shift();
        if(res) S.cards.unshift({type:'result', id:c.id, res, v});
        playSound(res && /caught|lost|stays|refused|unimpressed|ruin|annulled|long/.test(res) ? 'fail' : 'stamp');
        save(); refresh(); showNext(); };
      return b; });
    letter({icon:E.icon, title:t('ev.'+c.id+'.t'), speaker:E.char, dock:true,
      body:`${where}<div class="quote">${t('ev.'+c.id+'.x', {...P(v), x:v.x, at:v.i>=0?pname(v.i):''})}</div><p class="hint">${t('ui.choose')}</p>`, buttons});
    if(!c.played){ c.played = true; playSound(E.sfx); } },
  level: c => { const L = LV(), k = S.stage||0, n = Math.min(k, LEVELS.length-1), more = k >= LEVELS.length;
    const rules = (more ? t('stl.more.rules', {n:L.target}) : t('lvl.'+(n+1)+'.rules')).split('|').map(x=>`<li>${ic('check')}<span>${x}</span></li>`).join('');
    const perks = S.perks.length || S.shovel ? `<p class="hint">${t('stl.perks', {p:S.perks.map(k=>t('perk.'+k)).concat(S.shovel?[t('perk.shovel')]:[]).join(', ')})}</p>` : '';
    const carried = S.carried > 0 ? `<p class="hint">${t('stl.carry', {x:money(S.carried)})}</p>` : '';
    letter({icon:'map', title:`<span class="lvl-tag">${t('ui.settlement')} ${roman(k+1)}</span>${more ? S.town : t('lvl.'+(n+1)+'.name')}`, speaker: n>=2 ? 'brussels' : 'mayor',
      body:`<div class="quote">${more ? t('stl.more.x', {region:regionName()}) : t('lvl.'+(n+1)+'.x', {town:S.town})}</div>
        ${stypeBlock(S.stype)}${S.rcombos.length ? `<p class="hint">${t('stl.rcombos')}</p>${rcomboChips(S.rcombos, true)}` : ''}
        <div class="goal">${t('lvl.goal', {n:L.target, m:L.months, s:L.n})}</div>
        <p class="hint">${t('lvl.newRules')}</p><ul class="rules">${rules}</ul>${carried}${perks}
        ${k===0 ? `<p class="keys">${t('lvl.keys')}</p>` : ''}`,
      buttons:[btn(t('lvl.go'),'play_arrow', ()=>nextCard('stamp'), true)]}); },
  consolidated: c => { hideModal(); dramaWin(c, ()=>nextCard('click')); },
  rcombo: c => { const cb = RCOMBO_BY_ID[c.id], B = S.region.blocks[c.b];
    letter({icon: cb.good?'workspace_premium':'warning', title: t(cb.good?'rcombo.new.t':'rcombo.newBad.t'), stamp: t(cb.good?'stamp.combo':'stamp.comboBad'), cls: cb.good?'ok':'bad',
      speaker: cb.good ? 'mayor' : 'neighbour',
      body:`<div class="combo-name ${cb.good?'good':'bad'}">${t('rcombo.'+cb.id)}</div><div class="quote">${t('rcombod.'+cb.id)}<br><small>${t('rcombo.between', {a:S.town+' ('+t('st.'+S.stype)+')', b:B ? B.town+' ('+t('st.'+B.ty)+')' : ''})}</small></div><p class="hint">${t(cb.good?'combo.new.x':'combo.newBad.x')}</p>`,
      buttons:[btn(t('ui.noted'),'check', ()=>nextCard('click'), true)]});
    if(!c.played){ c.played = true; playSound(cb.good ? 'fanfare' : 'crowd'); } },
  combo: c => { const cb = COMBO_BY_ID[c.id]; pulse(c.i);
    letter({icon: cb.good?'workspace_premium':'warning', title: t(cb.good?'combo.new.t':'combo.newBad.t'), stamp: t(cb.good?'stamp.combo':'stamp.comboBad'), cls: cb.good?'ok':'bad',
      speaker: cb.good ? 'mayor' : 'neighbour',
      body:`<div class="combo-name ${cb.good?'good':'bad'}">${t('combo.'+cb.id)}</div><div class="quote">${t('combod.'+cb.id)}<br><small>${t('combo.pieces',{a:t('piece.'+cb.a), b:t('piece.'+cb.b)})}</small></div><p class="hint">${t(cb.good?'combo.new.x':'combo.newBad.x')}</p>`,
      buttons:[btn(t('ui.noted'),'check', ()=>nextCard('click'), true)]});
    if(!c.played){ c.played = true; playSound(cb.good ? 'fanfare' : 'crowd'); } },
  result: c => { const E = EVENTS[c.id], bad = /caught|lost|stays|refused|unimpressed|ruin|annulled|long/.test(c.res);
    letter({icon:E.icon, title:t('ev.'+c.id+'.t'), stamp:t(bad?'stamp.bad':'stamp.done'), cls:bad?'bad':'ok', speaker:E.char,
      body:`<div class="quote">${t('ev.'+c.id+'.r.'+c.res)}</div>`, buttons:[btn(t('ui.noted'),'check', ()=>nextCard('click'), true)]}); },
};
export function perkCard(){
  const wrap = S.perkChoice.map(k=>{ const b=document.createElement('button'); b.className='perk';
    b.innerHTML=`${ic(PERKS[k])}<span><b>${t('perk.'+k)}</b><small>${t('perkd.'+k)}</small></span>`;
    b.onclick=()=>{ choosePerk(k); playSound('ok'); refresh(); showNext(); }; return b; });
  letter({icon:'workspace_premium', title:t('perk.title'), speaker:'brussels', body:`<div class="quote">${t('perk.x')}</div>`, buttons:wrap});
}
// --- The Euroregion in the cards ---
export const regionName = () => t('region.name', {n:S.region.name});
export function stypeBlock(ty){ return `<div class="stype">${ic(STYPE_ICON[ty])}<span><b>${t('st.'+ty)}</b><small>${t('std.'+ty)}</small></span></div>`; }
// Region combo chips: named once discovered (or when `show`), otherwise a mysterious "region combo?"
export function rcomboChips(list, show){
  const known = discovered();
  return `<div class="chips">${list.map(c=>{ const cb = RCOMBO_BY_ID[c.id];
    return show || known.includes(c.id) ? `<span class="chip ${cb.good?'good':'bad'}">${ic(cb.good?'workspace_premium':'warning')}${t('rcombo.'+c.id)}</span>`
      : `<span class="chip mystery">${ic('workspace_premium')}${t('rcombo.possible')}</span>`; }).join('')}</div>`;
}
// Put the region minimap into the open letter (its '.rmap-slot')
export function mountMap(opts){ const slot = notice.querySelector('.rmap-slot'); if(!slot) return; slot.innerHTML = ''; slot.appendChild(regionCanvas(opts)); }
// The run is over: what the Euroregion reached, and the records
export function gameOver(){
  if(!S.over) return showNext();
  hideModal(); refresh();
  dramaLose([btn(t('run.new'),'replay', ()=>{ closeDrama(); startRun(); }, true), btn(t('menu.main'),'logout', ()=>{ closeDrama(); startMenu(); }),
    btn(t('ui.lookMap'),'map', ()=>{ closeDrama(); hideModal(); refresh(); })]);
}
