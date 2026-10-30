import { playSound } from '../audio/sfx.js';
import { acquire, consult, fileReport, lobby, repay, requestPermit, sellPlot, submitPlan } from '../core/actions.js';
import { COMBOS, COMBO_BY_ID, activeCombos, comboPreviewAt, discovered } from '../core/combos.js';
import { B, BUILD_TYPES, CFG, KIND, NEW_TYPES, stageCfg, on } from '../core/config.js';
import { unlocked } from '../core/career.js';
import { DIRECTIVE_ICON } from '../core/directives.js';
import { EVENTS, choicesFor, resolveEvent } from '../core/events.js';
import { money } from '../core/format.js';
import { attach } from '../core/newgame.js';
import { save } from '../core/persist.js';
import { RCOMBO_BY_ID, STYPE_ICON, attachPreview } from '../core/region.js';
import { residents } from '../core/economy.js';
import { approves, buildCost, buildMonths, hasAccess, landPrice, permitMonths, plotValue, support } from '../core/rules.js';
import { S, has, pname, r1, rc } from '../core/state.js';
import { t } from '../i18n/index.js';
import { present } from '../render/anim.js';
import { attachSel, isoOf, keepVisible, preview, scale, selBlock, selected, setAttachSel, setPreview, setSelBlock, setSelected, toScreen, viewHooks, TW } from '../render/camera.js';
import { GROUNDS, riverTile, roadTile } from '../render/ground.js';
import { ARCH, BUILDINGS, archOf, colourOf, spr } from '../render/sprites.js';
import { roadPreviewKey } from '../render/map.js';
import { CARD, chip, hideModal, letter, btn, pxPortrait, showNext } from './cards.js';
import { $, P } from './dom.js';
import { pulse, refresh, styleName } from './guide.js';
import { agendaAvailable, doAction, hidePop, roman } from './hud.js';
import { ic } from './icons.js';
import { enterSettlement } from './title.js';

// =====================================================================
//  THE BOTTOM BAR (v0.9) — one horizontal strip that changes with what you are doing:
//  the agenda (nothing selected) · a parcel (buy, build, sell, its state) · the next plot · an event.
//  It replaces the v0.5–v0.8 sheets: it never opens or closes, only its content changes.
// =====================================================================
export let armed = null;   // the building picked in the strip: a ghost on the map until you confirm
export function setArmed(ty){
  armed = ty;
  if(ty && selected >= 0){ const known = discovered();
    setPreview({i:selected, ty, combos: comboPreviewAt(selected, ty).map(c=>({...c, known: known.includes(c.id)}))}); }
  else setPreview(null);
}
export function clearSelection(){ setSelected(-1); setArmed(null); setSelBlock(-1); }
// Which content the strip shows
export function dockMode(){
  if(!S) return 'none';
  if(S.cards.length && ['event','result'].includes(S.cards[0].type)) return 'event';
  if(S.over) return 'over';
  if(S.pending==='attach') return 'attach';
  if(selected >= 0) return 'parcel';
  if(selBlock >= 0 && S.region.blocks[selBlock]) return 'block';
  return 'agenda';
}
export const eventOpen = () => dockMode()==='event';
// Building art for the cards: the very style this parcel would get (cached as an image)
const ART = new Map();
export function buildingArt(ty, i = -1){
  if(ty==='road'){ const [k, make] = roadPreviewKey(i);   // v0.9.2: the real road tile, joined like it would be on this parcel
    if(!ART.has(k)){ const g = spr('g:'+k, make), cv = document.createElement('canvas'); cv.width = 64; cv.height = 112;
      cv.getContext('2d').drawImage(g.c, 32 - g.ox, 74 - g.oy);   // placed where the card's window shows it (building sprites stand at y 96)
      ART.set(k, cv.toDataURL()); }
    return ART.get(k); }
  if(!ARCH[ty]) return null;
  const A = i>=0 ? archOf(i, ty) : ARCH[ty][0], v = i>=0 ? colourOf(i) : 1, key = ty+':'+A.id+':'+v;
  if(!ART.has(key)) ART.set(key, spr(key, ()=>A.make(v)).c.toDataURL());
  return ART.get(key);
}
// v0.9.2: land that is not a building (the old village, the river, the regional road, protected land) as it looks on the map
const LAND_GROUND = {village:()=>GROUNDS.village(0), flood:()=>riverTile(5), river:()=>riverTile(5), regional:()=>roadTile(5, true), habitat:()=>GROUNDS.habitat(0), farm:()=>GROUNDS.farm(0,0)};
export function landArt(k){
  if(!LAND_GROUND[k]) return null; const key = 'land:'+k;
  if(!ART.has(key)){ const g = spr('g:land'+k, LAND_GROUND[k]), cv = document.createElement('canvas'); cv.width = 64; cv.height = 112; const c2 = cv.getContext('2d');
    const top = k==='village' ? 96 : 74; c2.drawImage(g.c, 32 - g.ox, top - g.oy);
    if(k==='village'){ const b = spr('village0', ()=>BUILDINGS.village(0)); c2.drawImage(b.c, 32 - b.ox, 96 - b.oy); }
    ART.set(key, cv.toDataURL()); }
  return ART.get(key);
}
// One card of the strip
function tile(o){
  const b = document.createElement('button'); b.type = 'button';
  b.className = 'tile' + (o.cls ? ' '+o.cls : '') + (o.on ? ' on' : '') + (o.art ? ' has-art' : '');
  b.disabled = !!o.disabled; if(o.k) b.dataset.k = o.k;
  b.innerHTML = `<span class="art">${o.art ? `<img src="${o.art}" alt="">` : ic(o.icon || 'info')}</span><b>${o.name}</b>`
    + (o.sub ? `<small>${o.sub}</small>` : '') + (o.why ? `<em class="why">${o.why}</em>` : '')
    + (o.badge ? `<span class="tb ${o.badge[1]||''}">${o.badge[0]}</span>` : '');
  if(o.click) b.onclick = e=>{ e.stopPropagation(); o.click(); };
  return b;
}
const tag = (txt, cls) => `<span class="tag ${cls||''}">${txt}</span>`;
let lastKey = '';
export function renderDock(){
  const dock = $('dock'), head = $('ctxHead'), strip = $('strip'), mode = dockMode();
  const key = mode + ':' + (mode==='parcel' ? selected : mode==='block' ? selBlock : '');
  const keep = key === lastKey ? strip.scrollLeft : 0; lastKey = key;
  dock.dataset.mode = mode; document.body.dataset.dock = mode;
  head.innerHTML = ''; strip.innerHTML = '';
  if(mode !== 'parcel' && armed) setArmed(null);
  if(mode==='event') renderEvent(head, strip);
  else if(mode==='over') renderOver(head, strip);
  else if(mode==='attach') renderAttach(head, strip);
  else if(mode==='parcel') renderParcel(head, strip);
  else if(mode==='block') renderBlock(head, strip);
  else renderAgenda(head, strip);
  strip.scrollLeft = keep;
  placeOverlays();
}
// ---------- nothing selected: the agenda (and the directive) ----------
function renderAgenda(head, strip){
  const can = agendaAvailable(), off = !!S.over;
  head.innerHTML = can ? `<h3>${ic('work')}${t('tab.agenda')}</h3>${tag(t('d.slotsLeft', {n:S.slots}), S.slots ? '' : 'bad')}` : `<h3>${ic('touch_app')}${t('d.tap')}</h3>`;
  if(S.directive){ const d = S.directive, left = d.deadline - S.month + 1;
    strip.appendChild(tile({icon:DIRECTIVE_ICON[d.kind], name:t('dir.'+d.kind+'.t'), sub:t('dir.'+d.kind+'.x', {n:d.param}), cls:'directive wide', badge:[t('ui.monthsLeft',{n:left}), left<=1?'bad':'warn'], click:()=>{} })); }
  if(!can){ if(!S.directive) strip.appendChild(tile({icon:'groups', name:t('d.goal', {n:CFG.target}), sub:t('d.goalSub', {m:CFG.months}), cls:'info wide'})); return; }
  const act = (icon, name, sub, fn, dis, cls, k) => strip.appendChild(tile({icon, name, sub, disabled:dis, cls:'act '+(cls||''), k, click:()=>{ doAction(fn(), -1); }}));
  if(on('rustic')) act('map', t('act.plan'), S.plan ? t('act.planBusy',{n:S.plan.t}) : t('d.planSub',{x:money(CFG.planCost)}), submitPlan, off||!!S.plan||S.slots<2, '', 'plan');
  if(on('local')) act('restaurant', t('act.lobby'), t('d.lobbySub',{x:money(CFG.lobbyCost), n:has('lobbyist')?20:(S.lobbied?6:12)}), lobby, off||S.slots<1, '', 'lobby');
  if(on('neigh')) act('forum', t('act.consult'), t('d.consultSub'), consult, off||S.slots<2, '', 'consult');
  if(on('comp')) act('description', t('act.report'), t('d.reportSub'), fileReport, off||S.slots<1, '', 'report');
  if(S.debt>0) act('account_balance_wallet', t('act.repay',{x:money(Math.min(CFG.loanStep,S.debt))}), t('d.repaySub'), repay, off||S.funds<Math.min(CFG.loanStep,S.debt), 'money', 'repay');
}
// ---------- land that is not yours: what it is, what it does, the combos it makes (v0.9.2) ----------
function renderLand(p, pt, add){
  const k = p.k, known = discovered();
  const sub = k==='village' ? t('pcs.villageX', {n:10}) : t('pcs.'+k);
  add({art:landArt(k), name:pt, sub, cls:'info wide land'});
  const piece = k==='regional' ? 'regional' : k;
  COMBOS.filter(cb=>cb.a===piece || cb.b===piece).forEach(cb=>{ const other = cb.a===piece ? cb.b : cb.a, kn = known.includes(cb.id);
    if(B[other] && !unlocked(other)) return;
    add({art: B[other] ? buildingArt(other) : landArt(other), name: kn ? t('combo.'+cb.id) : t('d.withPiece', {p:t('piece.'+other)}),
      sub: kn ? t('combod.'+cb.id).split('. ')[0] : t('d.comboUnknown'), badge:[kn ? (cb.good ? '+' : '−') : '?', kn ? (cb.good ? 'good' : 'bad') : 'mystery'], cls:'combo-of '+(kn ? (cb.good ? 'good' : 'bad') : 'unknown')}); });
  if(k==='village') add({icon:'warning', name:t('d.villageNear'), sub:t('d.villageNearX'), cls:'info wide'});
}
// ---------- a consolidated settlement tapped on the map (v0.9.2) ----------
function renderBlock(head, strip){
  const b = S.region.blocks[selBlock], add = o => strip.appendChild(tile(o)), known = discovered();
  head.innerHTML = `<h3>${ic(STYPE_ICON[b.ty] || 'cottage')}${b.town}</h3>${tag(t('st.'+b.ty),'blue')}${tag(t('d.consolidated'),'ok')}<span class="ref">${t('d.settlementN', {n:roman(selBlock+1)})}</span>`;
  add({icon:STYPE_ICON[b.ty] || 'cottage', name:t('st.'+b.ty), sub:t('std.'+b.ty), cls:'info wide'});
  add({icon:'groups', name:String(b.res || 0), sub:t('d.blockRes'), cls:'stat'});
  add({icon:'euro', name:'+'+money(b.tax || 0), sub:t('d.blockDiv'), cls:'stat money'});
  const rc = (S.rcombos || []).filter(c=>c.b===selBlock);
  rc.forEach(c=>{ const cb = RCOMBO_BY_ID[c.id], kn = known.includes(c.id);
    add({icon: cb.good ? 'workspace_premium' : 'warning', name: kn ? t('rcombo.'+c.id) : t('rcombo.possible'), sub: kn ? t('rcombod.'+c.id).split('. ')[0] : t('d.withTown', {town:S.town}),
      badge:[kn ? (cb.good ? '+' : '−') : '?', kn ? (cb.good ? 'good' : 'bad') : 'mystery'], cls:'combo '+(cb.good ? 'good' : 'bad')}); });
  const edge = activeCombos().filter(x=>x.j < 0 && S.frontier[-1-x.j] && S.frontier[-1-x.j].b === selBlock && known.includes(x.id));
  const seen = new Set(); edge.forEach(x=>{ if(seen.has(x.id)) return; seen.add(x.id); const cb = COMBO_BY_ID[x.id];
    add({icon: cb.good ? 'workspace_premium' : 'warning', name:t('combo.'+x.id), sub:t('d.acrossEdge'), badge:[cb.good ? '+' : '−', cb.good ? 'good' : 'bad'], cls:'combo '+(cb.good ? 'good' : 'bad')}); });
  if(!rc.length && !edge.length) add({icon:'info', name:t('d.noTies'), sub:t('d.noTiesX'), cls:'info wide'});
}
// ---------- a parcel ----------
export function parcelTitle(i){
  const p = S.grid[i], isB = p.ty && p.k!=='regional';
  const title = isB ? t('b.'+p.ty) : (p.k==='farm' && !on('rustic')) ? t('k.farmU') : (p.urban && p.st==='owned' && p.k!=='muni') ? t('k.serviced') : t('k.'+p.k);
  return [isB ? B[p.ty].icon : KIND[p.k], title];
}
function renderParcel(head, strip){
  const i = selected, p = S.grid[i], [r,c] = rc(i), [pi, pt] = parcelTitle(i), isB = p.ty && p.k!=='regional', acc = hasAccess(r,c);
  const slotsOk = !S.over && S.slots >= 1;
  let tags = '';
  if(p.st==='owned' || p.st==='land'){ if(on('rustic') && ['farm','muni','flood'].includes(p.k)) tags += p.urban ? tag(t('tag.urban'),'ok') : tag(t('tag.rustic'));
    if(p.st==='owned') tags += tag(t('tag.yours'),'blue'); if(p.st==='owned' && !acc) tags += tag(t('tag.noAccess'),'bad'); }
  if(p.st==='land' && p.hold) tags += tag(t('tag.hold'),'warn');
  head.innerHTML = `<h3>${ic(pi)}${pt}</h3>${tags}<span class="ref">${t('ui.parcel',{at:pname(i)})}</span>`;
  const add = o => strip.appendChild(tile(o));
  if(p.k==='habitat' || p.k==='village' || p.k==='regional'){ renderLand(p, pt, add); return; }
  if(p.st==='land'){
    const price = landPrice(p), mayor = p.k==='muni' && on('local') && S.local < 40;
    add({icon:'payments', name:t('d.buy'), sub:`${money(price)} · ${t('d.slot1')}`, cls:'act primary', k:'buy',
      disabled: !slotsOk || mayor, why: mayor ? t('dw.mayor') : !slotsOk ? t('dw.slots') : '', click:()=>doAction(acquire(i), i)});
    add({icon:pi, name:t('d.about'), sub:t(p.k==='muni'?'pcs.muni':p.k==='flood'?'pcs.flood':p.hold?'pcs.hold':'pcs.farm'), cls:'info wide'});
    return; }
  if(p.st==='owned'){
    const inPlay = ty => (ty!=='road' || on('access')) && (ty!=='factory' || on('jobs')) && ((ty!=='school' && ty!=='clinic') || on('services')) && (!B[ty].flag || on(B[ty].flag));
    const known = discovered();
    BUILD_TYPES.filter(inPlay).forEach(ty=>{
      if(!unlocked(ty)) return;   // v0.9.2: only what you can build; what is still locked lives in the run file (Career)
      const bt = B[ty], taken = bt.unique && S.grid.some(q=>q.ty===ty && !['land','owned'].includes(q.st));
      const why = !acc ? t('dw.noAccess') : (bt.urban && !p.urban) ? t('dw.urban') : taken ? t('dw.unique') : !slotsOk ? t('dw.slots') : '';
      const cb = comboPreviewAt(i, ty), good = cb.filter(x=>known.includes(x.id) && x.good).length, bad = cb.filter(x=>known.includes(x.id) && !x.good).length, unk = cb.filter(x=>!known.includes(x.id)).length;
      const badge = good||bad||unk ? [[good?'+'+good:'', bad?'−'+bad:'', unk?'?':''].filter(Boolean).join(' '), bad && !good ? 'bad' : good ? 'good' : 'mystery'] : null;
      const months = on('permits') ? permitMonths(ty)+buildMonths(ty) : buildMonths(ty)+1;
      add({art:buildingArt(ty, i), icon:bt.icon, name:t('b.'+ty), sub:`${money(buildCost(p,ty))} · ${t('d.mo',{n:months})}`, why, badge, k:ty, cls:'build', on: armed===ty,
        disabled: !!why, click:()=>{ playSound('click'); setArmed(armed===ty ? null : ty); refresh(); if(armed) keepVisible(i); } });
    });
    if(p.urban && on('market')){ const cold = S.market < CFG.devMinMarket;
      add({icon:'sell', name:t('d.sell'), sub:`+${money(plotValue(p))} · ${t('d.slot1')}`, cls:'act money', k:'sell', disabled: !acc || !slotsOk || cold,
        why: cold ? t('dw.cold') : !acc ? t('dw.noAccess') : !slotsOk ? t('dw.slots') : '', click:()=>{ setArmed(null); doAction(sellPlot(i), i); }}); }
    return; }
  // something is going on here
  const status = (icon, name, sub, badge, cls) => add({icon, name, sub, badge, cls:'status wide '+(cls||'')});
  if(p.st==='review'){ const ok = !on('permits') || approves();
    status('gavel', t('d.review', {b:t('b.'+p.ty)}), on('permits') ? t('d.reviewSub', {n:p.t, o:support(), need:CFG.approveAt}) : t('d.monthsN', {n:p.t}), ok ? ['✓','good'] : ['✕','bad'], ok ? '' : 'alert'); }
  else if(p.st==='approved') status('engineering', t('d.queue', {b:t('b.'+p.ty)}), t('d.queueSub'));
  else if(p.st==='building') status('engineering', t('d.building', {b:t('b.'+p.ty)}), p.halt ? t('d.halted', {n:p.halt}) : t('d.buildSub', {n:p.t, x:money(p.mcost)}), p.halt ? ['II','bad'] : null, p.halt ? 'alert' : '');
  else if(p.st==='private') status('apartment', t('d.private'), t(p.dev.phase==='permit' ? 'd.privPermit' : 'd.privBuild', {n:p.dev.t}) + (S.market<CFG.devMinMarket ? ' · '+t('d.paused') : ''));
  else if(p.st==='ruin') add({icon:'payments', name:t('d.buyBack'), sub:`${money(r1(p.price*1.5))} · ${t('d.slot1')}`, cls:'act primary', disabled:!slotsOk, click:()=>doAction(acquire(i), i)});
  else if(p.st==='built' && isB && p.ty!=='road'){
    add({art:buildingArt(p.ty, i), name:t('b.'+p.ty), sub:styleName(i), cls:'built wide', badge: p.priv ? [t('d.privTag'),''] : [`−${money(B[p.ty].upkeep)}/${t('ui.mo')}`, '']});
    if(on('combos')) activeCombos().filter(x=>x.i===i || x.j===i).forEach(x=>{ const cb = COMBO_BY_ID[x.id];
      add({icon: cb.good ? 'workspace_premium' : 'warning', name:t('combo.'+x.id), sub:t('combod.'+x.id).split('. ')[0], cls:'combo '+(cb.good?'good':'bad')}); });
  }
  else add({icon:'add_road', name:t('b.road'), sub:t('pcs.road'), cls:'info wide'});
}
// The confirm buttons next to the ghost, and the combo labels on the map
export function confirmArmed(){
  const i = selected, ty = armed; if(i<0 || !ty) return;
  const res = requestPermit(i, ty); setArmed(null); doAction(res, i);
}
function placeOverlays(){
  const cf = $('confirm'), chips = $('chips');
  if(!(armed && selected>=0 && dockMode()==='parcel')){ cf.hidden = true; chips.innerHTML = ''; return; }
  const p = S.grid[selected];
  if(cf.dataset.k !== selected+':'+armed){ cf.dataset.k = selected+':'+armed;
    cf.innerHTML = `<button class="ok" type="button">${ic('check')}<span>${t('d.license')}<small>${money(CFG.permitFee + buildCost(p, armed))} · ${t('d.slot1')}</small></span></button><button class="no" type="button" aria-label="${t('ui.close')}">${ic('close')}</button>`;
    cf.querySelector('.ok').onclick = e=>{ e.stopPropagation(); confirmArmed(); };
    cf.querySelector('.no').onclick = e=>{ e.stopPropagation(); playSound('click'); setArmed(null); refresh(); }; }
  cf.hidden = false;
  const known = discovered(), seen = new Set();
  chips.innerHTML = (preview && preview.combos || []).filter(c=>{ const k = c.r+','+c.c+c.id; if(seen.has(k)) return false; seen.add(k); return true; })
    .map(c=>`<span class="mchip ${!c.known ? 'mystery' : c.good ? 'good' : 'bad'}" data-r="${c.r}" data-c="${c.c}">${ic(!c.known ? 'workspace_premium' : c.good ? 'add_circle' : 'warning')}${c.known ? t('combo.'+c.id) : t('combo.possible')}</span>`).join('');
  positionOverlays();
}
function positionOverlays(){
  const cf = $('confirm'); if(cf.hidden || selected < 0) return;
  const s = scale(), [sx, sy] = toScreen(...isoOf(...rc(selected))), W = cf.parentElement.clientWidth;
  let x = sx + TW/2*s + 8, y = sy - 24;
  if(x + cf.offsetWidth > W - 8) x = sx - TW/2*s - 8 - cf.offsetWidth;
  cf.style.left = Math.max(8, x)+'px'; cf.style.top = Math.max(8, y)+'px';
  $('chips').querySelectorAll('.mchip').forEach(el=>{ const [cx, cy] = toScreen(...isoOf(+el.dataset.r, +el.dataset.c));
    el.style.left = (cx - el.offsetWidth/2)+'px'; el.style.top = (cy + 10)+'px'; });
}
viewHooks.push(positionOverlays);
// ---------- choosing the next plot ----------
const LAND_ICON = {regional:'add_road', flood:'water', village:'cottage', habitat:'forest'};
export function selectPlot(k){ setAttachSel(k); playSound('click'); refresh(); present(); }
function renderAttach(head, strip){
  const nx = S.region.next; if(!nx) return;
  head.innerHTML = `<h3>${ic('map')}${t('d.attach', {town:nx.town})}</h3>${tag(t('st.'+nx.ty),'blue')}${tag(t('d.target', {n:stageCfg((S.stage||0)+1).target}))}`;
  strip.appendChild(tile({icon:STYPE_ICON[nx.ty], name:t('st.'+nx.ty), sub:t('std.'+nx.ty), cls:'info wide'}));
  const known = discovered();
  S.region.cands.forEach((P,k)=>{ const v = attachPreview(k);
    const land = Object.entries(v.land).filter(([,n])=>n>0).map(([kk,n])=>`${ic(LAND_ICON[kk])}${n}`).join(' ');
    const good = v.combos.filter(c=>known.includes(c.id) && RCOMBO_BY_ID[c.id].good).length, bad = v.combos.filter(c=>known.includes(c.id) && !RCOMBO_BY_ID[c.id].good).length, unk = v.combos.filter(c=>!known.includes(c.id)).length;
    const badge = good||bad||unk ? [[good?'+'+good:'', bad?'−'+bad:'', unk?'?':''].filter(Boolean).join(' '), bad && !good ? 'bad' : good ? 'good' : 'mystery'] : null;
    const names = v.combos.map(c=>known.includes(c.id) ? t('rcombo.'+c.id) : t('rcombo.possible')).join(' · ');
    strip.appendChild(tile({icon:'add_location', name:`${k+1} · ${t('side.'+P.dir)}`, sub: names || t('att.none'), why: land, cls:'plot'+(k===attachSel?' on':''), k:String(k), badge, click:()=>selectPlot(k)})); });
  const ok = attachSel >= 0 && attachSel < S.region.cands.length;
  strip.appendChild(tile({icon:'real_estate_agent', name: ok ? t('att.go', {k:attachSel+1}) : t('att.pickFirst'), cls:'act primary go', disabled:!ok,
    click:()=>{ const k = attachSel; if(attach(k).ok){ playSound('stamp'); enterSettlement(); } }}));
}
// ---------- an event: portrait, headline, choices with their effects (the letter is one tap away) ----------
function renderEvent(head, strip){
  const c = S.cards[0], E = EVENTS[c.id], v = c.v || {};
  if(c.type==='result'){ const bad = /caught|lost|stays|refused|unimpressed|ruin|annulled|long/.test(c.res);
    head.innerHTML = `${pxPortrait(E.char)}<div class="who"><small>${t('char.'+E.char,{town:S.town})}</small><h3>${t('ev.'+c.id+'.t')}</h3></div>`;
    strip.appendChild(tile({icon: bad ? 'cancel' : 'task_alt', name:t(bad ? 'stamp.bad' : 'stamp.done'), sub:t('ev.'+c.id+'.r.'+c.res), cls:'result wide '+(bad?'bad':'good')}));
    strip.appendChild(tile({icon:'check', name:t('ui.noted'), cls:'act primary', k:'ok', click:()=>{ S.cards.shift(); playSound('click'); save(); refresh(); showNext(); }}));
    return; }
  const at = v.i>=0 && v.i!==undefined ? `<span class="where">${ic('place')}${t('ui.parcel',{at:pname(v.i)})}</span>` : '';
  head.innerHTML = `${pxPortrait(E.char)}<div class="who"><small>${t('char.'+E.char,{town:S.town})}</small><h3>${t('ev.'+c.id+'.t')}</h3></div>${at}<button class="read" type="button">${ic('mail')}<span>${t('d.read')}</span></button>`;
  head.querySelector('.read').onclick = ()=>{ playSound('click'); letter({icon:E.icon, title:t('ev.'+c.id+'.t'), speaker:E.char,
    body:`<div class="quote">${t('ev.'+c.id+'.x', {...P(v), x:v.x, at:v.i>=0?pname(v.i):''})}</div>`, buttons:[btn(t('d.back'),'check', ()=>hideModal(), true)]}); };
  choicesFor(c).forEach(ch=>{ const can = !ch.can || ch.can(v), b = document.createElement('button');
    b.type = 'button'; b.className = 'choice tile wide'; b.disabled = !can; b.dataset.k = ch.k;
    b.innerHTML = `<b>${t('ev.'+c.id+'.c.'+ch.k)}</b><span class="chips">${ch.fx(v).map(chip).join('')}${can ? '' : `<span class="chip bad">${t('err.funds')}</span>`}</span>`;
    b.onclick = ()=>{ const res = resolveEvent(c, ch.k); S.cards.shift();
      if(res) S.cards.unshift({type:'result', id:c.id, res, v});
      playSound(res && /caught|lost|stays|refused|unimpressed|ruin|annulled|long/.test(res) ? 'fail' : 'stamp');
      save(); refresh(); showNext(); };
    strip.appendChild(b); });
}
function renderOver(head, strip){
  head.innerHTML = `<h3>${ic('gavel')}${t('d.over')}</h3>`;
  strip.appendChild(tile({icon:'description', name:t('d.summary'), cls:'act primary', click:()=>showNext()}));
}
// Escape / tapping the map again: let go of whatever is selected
export function deselect(){ if(armed){ setArmed(null); refresh(); return true; } if(selected>=0 || selBlock>=0){ clearSelection(); hidePop(); refresh(); return true; } return false; }
