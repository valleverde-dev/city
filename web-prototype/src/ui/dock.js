import { playSound } from '../audio/sfx.js';
import { EXT_COMP, EXT_MONTHS, EXT_NEED, GOSSIP, NEG, basePrice, expropriate, gossip, leanOnOwner, leaveInPeace, acquire, consult, fileReport, lobby, repay, requestExtension, requestPermit, sellPlot, submitPlan } from '../core/actions.js';
import { COMBOS, COMBO_BY_ID, activeCombos, comboPreviewAt, discovered } from '../core/combos.js';
import { B, BUILD_TYPES, CFG, KIND, NEW_TYPES, stageCfg, on } from '../core/config.js';
import { unlocked } from '../core/career.js';
import { DIRECTIVE_ICON } from '../core/directives.js';
import { openHall } from './hall.js';
import { HLV, MAX_LV, WORKS_LOSS, homesOf, lvOf, upCost, upMissing, upgradeHousing, upkeepOf } from '../core/housing.js';
import { clerkAway, ordPermitFee } from '../core/halls.js';
import { CONTRACTS, EVENTS, choicesFor, contractCount, isBadResult, resolveEvent } from '../core/events.js';
import { money } from '../core/format.js';
import { attach } from '../core/newgame.js';
import { save } from '../core/persist.js';
import { RCOMBO_BY_ID, STYPE_ICON, attachPreview, districtOf } from '../core/region.js';
import { residents } from '../core/economy.js';
import { approves, buildCost, buildMonths, hasAccess, landPrice, permitMonths, plotValue, support } from '../core/rules.js';
import { S, has, pname, r1, rc } from '../core/state.js';
import { t } from '../i18n/index.js';
import { present } from '../render/anim.js';
import { FRX, FRY, H, W, attachSel, isoOf, isoW, keepVisible, panBy, preview, scale, selBlock, selected, setAttachSel, setPreview, setSelBlock, setSelected, toScreen, viewHooks, TW } from '../render/camera.js';
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
  if(S.cards.length && ['event','result'].includes(S.cards[0].type) && !eventWaiting()) return 'event';   // v0.11: a waiting event leaves the map in play
  if(S.over) return 'over';
  if(S.pending==='attach') return 'attach';
  if(selected >= 0) return 'parcel';
  if(selBlock >= 0 && S.region.blocks[selBlock]) return 'block';
  return 'agenda';
}
export const eventOpen = () => dockMode()==='event';
// v0.11: the bar is closed unless something asks for it: a parcel, the next plot, the end of the run open it by
// themselves; the agenda and a pending event open when you tap their icon (dockPin)
export let dockPin = null;
export function setDockPin(v){ dockPin = v; }
export const dockShown = (mode = dockMode()) => ['parcel','attach','block','over'].includes(mode) || (mode==='agenda' && dockPin==='agenda') || (mode==='event' && !!(S.cards[0] && S.cards[0].peek));   // v0.11.1: looking at an event's parcel
export const eventWaiting = () => !!(S && S.cards.length && S.cards[0].type==='event' && !S.cards[0].open);
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
  const plain = x => String(x||'').replace(/<[^>]*>/g, '').trim();   // the whole text on hover (clamped on the card)
  b.title = [plain(o.name), plain(o.sub), plain(o.why)].filter(Boolean).join(' · ');
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
  if(dockPin && dockPin !== mode) dockPin = null;
  document.body.classList.toggle('dock-open', dockShown(mode));
  $('eventBtn').hidden = !eventWaiting(); $('agendaBtn').classList.toggle('on', mode==='agenda' && dockPin==='agenda');
  const ag = $('agendaN'); ag.hidden = !S || !!S.over || !S.slots || mode!=='agenda'; ag.textContent = S ? S.slots : '';
  head.innerHTML = ''; strip.innerHTML = '';
  if(mode !== 'parcel' && armed) setArmed(null);
  if(mode==='event') renderEvent(head, strip);
  else if(mode==='over') renderOver(head, strip);
  else if(mode==='attach') renderAttach(head, strip);
  else if(mode==='parcel') renderParcel(head, strip);
  else if(mode==='block') renderBlock(head, strip);
  else renderAgenda(head, strip);
  strip.scrollLeft = keep;
  document.body.style.setProperty('--dockH', dock.offsetHeight + 'px');   // v0.11: the hints sit above the open bar
  placeOverlays();
}
// ---------- nothing selected: the agenda (and the directive) ----------
function renderAgenda(head, strip){
  const can = agendaAvailable(), off = !!S.over;
  head.innerHTML = can ? `<h3>${ic('work')}${t('tab.agenda')}</h3>${tag(t('d.slotsLeft', {n:S.slots}), S.slots ? '' : 'bad')}` : `<h3>${ic('touch_app')}${t('d.tap')}</h3>`;
  if(S.directive){ const d = S.directive, left = d.deadline - S.month + 1;
    strip.appendChild(tile({icon:DIRECTIVE_ICON[d.kind], name:t('dir.'+d.kind+'.t'), sub:t('dir.'+d.kind+'.x', {n:d.param}), cls:'directive wide', badge:[t('ui.monthsLeft',{n:left}), left<=1?'bad':'warn'], click:()=>{} })); }
  if(S.contract){ const c = S.contract, C = CONTRACTS[c.id], left = c.deadline - S.month + 1, have = c.kind==='sites' ? contractCount('sites') : c.kind==='nodebt' ? '' : contractCount(c.kind) - c.base;
    strip.appendChild(tile({icon:C.icon, name:t('d.contract', {c:t('ev.'+c.id+'.t')}), sub:t('ctk.'+c.kind, {n:c.n}) + (have!=='' ? ` · ${Math.max(0,have)}/${c.n}` : ''), cls:'directive wide contract', badge:[t('ui.monthsLeft',{n:left}), left<=1?'bad':'warn'], click:()=>{} })); }
  if(!can){ if(!S.directive) strip.appendChild(tile({icon:'groups', name:t('d.goal', {n:CFG.target}), sub:t('d.goalSub', {m:CFG.months}), cls:'info wide'})); return; }
  const act = (icon, name, sub, fn, dis, cls, k) => strip.appendChild(tile({icon, name, sub, disabled:dis, cls:'act '+(cls||''), k, click:()=>{ doAction(fn(), -1); }}));
  if(on('rustic')) act('map', t('act.plan'), S.plan ? t('act.planBusy',{n:S.plan.t}) : t('d.planSub',{x:money(CFG.planCost)}), submitPlan, off||!!S.plan||S.slots<2, '', 'plan');
  if(on('neigh')) act('forum', t('act.consult'), t('d.consultSub'), consult, off||S.slots<2, '', 'consult');
  if(S.grid.some(p=>p.k==='village')) act('restaurant', t('act.gossip'), S.gossiped ? t('d.gossiped') : t('d.gossipSub', {x:money(GOSSIP.cost)}), gossip, off||!!S.gossiped||S.slots<1, '', 'gossip');   // v0.11
  if(on('comp')) act('description', t('act.report'), t('d.reportSub'), fileReport, off||S.slots<1, '', 'report');
  if(on('directives')) act('hourglass_top', t('act.extension'), S.extAsked ? t('d.extUsed') : t('d.extSub', {c:EXT_COMP, need:EXT_NEED, n:EXT_MONTHS}), requestExtension, off||S.extAsked||S.slots<2, '', 'extension');
  if(S.debt>0) act('account_balance_wallet', t('act.repay',{x:money(Math.min(CFG.loanStep,S.debt))}), t('d.repaySub'), repay, off||S.funds<Math.min(CFG.loanStep,S.debt), 'money', 'repay');
}
// ---------- land that is not yours: what it is, what it does, the combos it makes (v0.9.2) ----------
function renderLand(p, pt, add){
  const k = p.k, known = discovered();
  const sub = k==='village' ? t('pcs.villageX', {n:10}) : t('pcs.'+k);
  add({art:landArt(k), name:pt, sub, cls:'info wide land'});
  const piece = k==='regional' ? 'regional' : k;
  // v0.10.1: only the combos you have already discovered — nothing about the others, not even that they exist
  COMBOS.filter(cb=>(cb.a===piece || cb.b===piece) && known.includes(cb.id)).forEach(cb=>{ const other = cb.a===piece ? cb.b : cb.a;
    add({art: B[other] ? buildingArt(other) : landArt(other), name: t('combo.'+cb.id), sub: t('combod.'+cb.id).split('. ')[0],
      badge:[cb.good ? '+' : '−', cb.good ? 'good' : 'bad'], cls:'combo-of '+(cb.good ? 'good' : 'bad')}); });
  if(k==='village') add({icon:'warning', name:t('d.villageNear'), sub:t('d.villageNearX'), cls:'info wide'});
}
// ---------- a consolidated settlement tapped on the map (v0.9.2) ----------
function renderBlock(head, strip){
  // v0.11: a district (tap its placard on the map): its type, what is built there, its region combos (??? until discovered)
  const k = selBlock, b = S.region.blocks[k], add = o => strip.appendChild(tile(o)), known = discovered();
  const mine = S.grid.map((p,i)=>i).filter(i=>districtOf(i)===k), built = mine.filter(i=>S.grid[i].st==='built' && S.grid[i].ty && S.grid[i].k!=='regional' && S.grid[i].ty!=='road');
  const homes = built.reduce((a,i)=>a + homesOf(S.grid[i]), 0), yours = mine.filter(i=>['owned','review','approved','building','built'].includes(S.grid[i].st) && S.grid[i].k!=='regional' && S.grid[i].k!=='village').length;
  head.innerHTML = `<h3>${ic(STYPE_ICON[b.ty] || 'cottage')}${b.town}</h3>${tag(t('st.'+b.ty),'blue')}<span class="ref">${t('d.settlementN', {n:roman(k+1)})}</span>`;
  add({icon:STYPE_ICON[b.ty] || 'cottage', name:t('st.'+b.ty), sub:t('std.'+b.ty), cls:'info wide'});
  add({icon:'apartment', name:String(built.length), sub:t('d.blockBuilt'), cls:'stat'});
  add({icon:'groups', name:String(homes), sub:t('d.blockHomes'), cls:'stat'});
  add({icon:'map', name:String(yours), sub:t('d.blockYours'), cls:'stat'});
  const rc = (S.rcombos || []).filter(c=>c.a===k || c.b===k);
  rc.forEach(c=>{ const cb = RCOMBO_BY_ID[c.id], kn = known.includes(c.id), other = S.region.blocks[c.a===k ? c.b : c.a];
    add({icon: kn ? (cb.good ? 'workspace_premium' : 'warning') : 'info', name: kn ? t('rcombo.'+c.id) : '???', sub: t('d.withTown', {town: other ? other.town : ''}),
      badge:[kn ? (cb.good ? '+' : '−') : '?', kn ? (cb.good ? 'good' : 'bad') : 'mystery'], cls:'combo '+(kn ? (cb.good ? 'good' : 'bad') : 'unknown')}); });
  if(!rc.length && S.region.blocks.length > 1) add({icon:'info', name:t('d.noTies'), sub:t('d.noTiesX'), cls:'info wide'});
  add({icon:'account_balance', name:t('d.hall'), sub:t('d.hallSub', {c:b.hall ? b.hall.clerk : ''}), cls:'act wide', k:'hall', click:()=>openHall(k)});   // v0.12
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
  if(p.st==='owned' || p.st==='land'){ if(on('rustic') && ['farm','muni'].includes(p.k)) tags += p.urban ? tag(t('tag.urban'),'ok') : tag(t('tag.rustic'));
    if(p.st==='owned') tags += tag(t('tag.yours'),'blue'); if(p.st==='owned' && !acc) tags += tag(t('tag.noAccess'),'bad'); }
  if(p.st==='land' && p.hold && p.holdKnown) tags += tag(t('tag.hold', {p:p.holdPct||80}),'warn');
  if(p.st==='land' && p.rumour) tags += tag(t('tag.rumour'),'warn');   // v0.11: what they say at the bar
  if(p.expro) tags += tag(t('tag.expro', {n:p.expro}),'bad');   // v0.10.1: only once you have met the owner
  const dk = districtOf(i), dn = dk >= 0 ? S.region.blocks[dk].town : '';   // v0.10.1: the district it belongs to
  head.innerHTML = `<h3>${ic(pi)}${pt}</h3>${tags}<span class="ref">${t('ui.parcel',{at:pname(i)})}${dn ? ' · '+dn : ''}</span>`;
  const add = o => strip.appendChild(tile(o));
  if(p.k==='habitat' || p.k==='village' || p.k==='regional' || (p.k==='flood' && p.st==='land')){ renderLand(p, pt, add); return; }   // v0.11.1: water is scenery
  if(p.st==='land' && p.expro){ add({icon:'gavel', name:t('d.expro'), sub:t('d.exproSub', {n:p.expro}), cls:'status wide'}); return; }
  if(p.st==='land'){
    const price = landPrice(p), mayor = p.k==='muni' && on('local') && S.local < 40;
    add({icon:'payments', name:t('d.buy'), sub:`${money(price)} · ${t('d.slot1')}`, cls:'act primary', k:'buy',
      disabled: !slotsOk || mayor, why: mayor ? t('dw.mayor') : !slotsOk ? t('dw.slots') : '', click:()=>doAction(acquire(i), i)});
    // v0.11: a stubborn owner you have met can be negotiated with
    if(p.hold && p.holdKnown && !p.peace){
      const lean = !on('local') ? null : p.leaned ? t('dw.leaned') : S.local < NEG.leanNeed ? t('dw.mayorLean', {n:NEG.leanNeed}) : !slotsOk ? t('dw.slots') : '';
      if(lean !== null) add({icon:'restaurant', name:t('d.lean'), sub:t('d.leanSub', {n:-NEG.leanLocal}), cls:'act', k:'lean', disabled:!!lean, why:lean, click:()=>doAction(leanOnOwner(i), i)});
      const ex = r1(basePrice(p)), exWhy = S.slots < NEG.exproSlots || S.over ? t('dw.slots2') : '';
      add({icon:'gavel', name:t('d.expropriate'), sub:t('d.exproCost', {x:money(ex), n:NEG.exproMonths, s:NEG.exproSlots}), cls:'act', k:'expro', disabled:!!exWhy, why:exWhy, click:()=>doAction(expropriate(i), i)});
      add({icon:'handshake', name:t('d.peace'), sub:t('d.peaceSub'), cls:'act', k:'peace', click:()=>doAction(leaveInPeace(i), i)});
    }
    add({icon:pi, name:t('d.about'), sub:t(p.k==='muni'?'pcs.muni':p.k==='flood'?'pcs.flood':(p.hold && p.holdKnown)?'pcs.hold':'pcs.farm', {p:p.holdPct||80}), cls:'info wide'});
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
      const months = on('permits') ? permitMonths(ty, i)+buildMonths(ty, i) : buildMonths(ty, i)+1;
      add({art:buildingArt(ty, i), icon:bt.icon, name:t('b.'+ty), sub:`${money(buildCost(p,ty))} · ${t('d.mo',{n:months})}`, why, badge, k:ty, cls:'build', on: armed===ty,
        disabled: !!why, click:()=>{ playSound('click'); setArmed(armed===ty ? null : ty); refresh(); if(armed) keepVisible(i); } });
    });
    if(p.urban && on('market')){ const cold = S.market < CFG.devMinMarket;
      add({icon:'sell', name:t('d.sell'), sub:`+${money(plotValue(p))} · ${t('d.slot1')}`, cls:'act money', k:'sell', disabled: !acc || !slotsOk || cold,
        why: cold ? t('dw.cold') : !acc ? t('dw.noAccess') : !slotsOk ? t('dw.slots') : '', click:()=>{ setArmed(null); doAction(sellPlot(i), i); }}); }
    return; }
  // something is going on here
  const status = (icon, name, sub, badge, cls) => add({icon, name, sub, badge, cls:'status wide '+(cls||'')});
  if(p.st==='review'){ const ok = !on('permits') || approves(0, i);
    status('gavel', t('d.review', {b:t('b.'+p.ty)}), on('permits') ? t('d.reviewSub', {n:p.t, o:support(i), need:CFG.approveAt}) : t('d.monthsN', {n:p.t}), ok ? ['✓','good'] : ['✕','bad'], ok ? '' : 'alert'); }
  else if(p.st==='approved') status('engineering', t('d.queue', {b:t('b.'+p.ty)}), t('d.queueSub'));
  else if(p.st==='building') status('engineering', t('d.building', {b:t('b.'+p.ty)}), p.halt ? t('d.halted', {n:p.halt}) : t('d.buildSub', {n:p.t, x:money(p.mcost)}), p.halt ? ['II','bad'] : null, p.halt ? 'alert' : '');
  else if(p.st==='private') status('apartment', t('d.private'), t(p.dev.phase==='permit' ? 'd.privPermit' : 'd.privBuild', {n:p.dev.t}) + (S.market<CFG.devMinMarket ? ' · '+t('d.paused') : ''));
  else if(p.st==='ruin') add({icon:'payments', name:t('d.buyBack'), sub:`${money(r1(p.price*1.5))} · ${t('d.slot1')}`, cls:'act primary', disabled:!slotsOk, click:()=>doAction(acquire(i), i)});
  else if(p.st==='built' && isB && p.ty!=='road'){
    const lvl = p.ty==='housing' && !p.priv ? ` · ${t('d.level', {n:roman(lvOf(p))})} · ${t('d.homesN', {n:homesOf(p)})}` : '';
    add({art:buildingArt(p.ty, i), name:t('b.'+p.ty), sub:styleName(i) + lvl, cls:'built wide', badge: p.priv ? [t('d.privTag'),''] : [`−${money(upkeepOf(p))}/${t('ui.mo')}`, '']});
    // v0.12: housing levels — the next level, what it asks, and the renovation under way
    if(p.ty==='housing' && !p.priv && on('permits')){ const u = p.up, to = lvOf(p) + 1;
      if(u) status('engineering', t('d.upTo', {n:roman(u.to)}), u.st==='review' ? t('d.reviewSub', {n:u.t, o:support(i), need:CFG.approveAt}) : t('d.upWorks', {n:u.t, x:money(u.mcost), h:WORKS_LOSS}), u.st==='review' ? (approves(0, i) ? ['✓','good'] : ['✕','bad']) : null);
      else if(to <= MAX_LV){ const miss = upMissing(i), L = HLV[to];
        const why = miss.length ? miss.map(k=>t('upNeed.'+k)).join(' · ') : !slotsOk ? t('dw.slots') : '';
        add({icon:'apartment', name:t('d.upgrade', {n:roman(to)}), sub:`+${L.homes - HLV[to-1].homes} ${t('d.homesW')} · ${money(upCost(i))} · ${t('d.mo', {n:permitMonths('housing', i) + L.build})}`, cls:'act wide', k:'upgrade',
          disabled: !!why, why, click:()=>doAction(upgradeHousing(i), i)}); }
      else add({icon:'workspace_premium', name:t('d.maxLevel'), sub:t('d.maxLevelSub'), cls:'info wide'}); }
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
  // v0.9.3: choosing the next plot, the Acquire button sits on the map beside the plot's number (like Request permit)
  if(dockMode()==='attach' && attachSel >= 0 && S.region.cands[attachSel]){ chips.innerHTML = '';
    const k = attachSel;
    if(cf.dataset.k !== 'att:'+k){ cf.dataset.k = 'att:'+k;
      cf.innerHTML = `<button class="ok" type="button">${ic('check')}<span>${t('att.go', {k:k+1})}<small>${t('st.'+S.region.next.ty)}</small></span></button><button class="no" type="button" aria-label="${t('ui.close')}">${ic('close')}</button>`;
      cf.querySelector('.ok').onclick = e=>{ e.stopPropagation(); confirmPlot(); };
      cf.querySelector('.no').onclick = e=>{ e.stopPropagation(); playSound('click'); setAttachSel(-1); refresh(); present(); }; }
    cf.hidden = false; positionOverlays(); return; }
  if(!(armed && selected>=0 && dockMode()==='parcel')){ cf.hidden = true; cf.dataset.k = ''; chips.innerHTML = ''; return; }
  const p = S.grid[selected];
  if(cf.dataset.k !== selected+':'+armed){ cf.dataset.k = selected+':'+armed;
    cf.innerHTML = `<button class="ok" type="button">${ic('check')}<span>${t('d.license')}<small>${money(CFG.permitFee*ordPermitFee(selected) + buildCost(p, armed))} · ${t('d.slot1')}</small></span></button><button class="no" type="button" aria-label="${t('ui.close')}">${ic('close')}</button>`;
    cf.querySelector('.ok').onclick = e=>{ e.stopPropagation(); confirmArmed(); };
    cf.querySelector('.no').onclick = e=>{ e.stopPropagation(); playSound('click'); setArmed(null); refresh(); }; }
  cf.hidden = false;
  const known = discovered(), seen = new Set();
  chips.innerHTML = (preview && preview.combos || []).filter(c=>{ const k = c.r+','+c.c+c.id; if(seen.has(k)) return false; seen.add(k); return true; })
    .map(c=>`<span class="mchip ${!c.known ? 'mystery' : c.good ? 'good' : 'bad'}" data-r="${c.r}" data-c="${c.c}">${ic(!c.known ? 'workspace_premium' : c.good ? 'add_circle' : 'warning')}${c.known ? t('combo.'+c.id) : t('combo.possible')}</span>`).join('');
  positionOverlays();
}
// The screen point of the next plot's number (its centre)
function plotCentre(k){ const P = S.region.cands[k]; return toScreen(...isoW(P.y-FRY+(P.n-1)/2, P.x-FRX+(P.n-1)/2)); }
export function confirmPlot(){ const k = attachSel; if(k < 0) return; if(attach(k).ok){ playSound('stamp'); $('confirm').hidden = true; $('confirm').dataset.k = ''; enterSettlement(); } }
function positionOverlays(){
  const cf = $('confirm'); if(cf.hidden) return;
  if(dockMode()==='attach' && attachSel >= 0){ const [sx, sy] = plotCentre(attachSel), Wd = cf.parentElement.clientWidth;
    let x = sx + 28, y = sy - cf.offsetHeight/2;
    if(x + cf.offsetWidth > Wd - 8) x = sx - 28 - cf.offsetWidth;
    cf.style.left = Math.max(8, x)+'px'; cf.style.top = Math.max(8, y)+'px'; return; }
  if(selected < 0) return;
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
export function selectPlot(k){ setAttachSel(k); playSound('click'); refresh();
  // keep the plot and its button in view (below the HUD, above the bar)
  const [sx, sy] = plotCentre(k), top = Math.min(H*0.4, 140);
  if(sx < 60 || sx > W - 300 || sy < top || sy > H - 60) panBy(W/2 - 120 - sx, (top + H)/2 - sy);
  present(); }
function renderAttach(head, strip){
  const nx = S.region.next; if(!nx) return;
  head.innerHTML = `<h3>${ic('map')}${t('d.attach', {town:nx.town})}</h3>${tag(t('st.'+nx.ty),'blue')}${tag(t('d.target', {n:stageCfg((S.stage||0)+1).target}))}`;
  strip.appendChild(tile({icon:STYPE_ICON[nx.ty], name:t('st.'+nx.ty), sub:t('std.'+nx.ty), cls:'info wide'}));
  const known = discovered();
  S.region.cands.forEach((P,k)=>{ const v = attachPreview(k);
    const land = Object.entries(v.land).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]).slice(0, 2).map(([kk,n])=>`<span class="lnd">${ic(LAND_ICON[kk])}${n}</span>`).join('');
    const good = v.combos.filter(c=>known.includes(c.id) && RCOMBO_BY_ID[c.id].good).length, bad = v.combos.filter(c=>known.includes(c.id) && !RCOMBO_BY_ID[c.id].good).length, unk = 0;   // v0.10.1: unknown region combos stay unknown
    const badge = good||bad||unk ? [[good?'+'+good:'', bad?'−'+bad:'', unk?'?':''].filter(Boolean).join(' '), bad && !good ? 'bad' : good ? 'good' : 'mystery'] : null;
    const names = v.combos.filter(c=>known.includes(c.id)).map(c=>t('rcombo.'+c.id)).join(' · ');
    const all = Object.entries(v.land).filter(([,n])=>n>0).map(([kk,n])=>t('land.'+kk, {n})).join(' · ');
    const tl = tile({icon:'add_location', name:`${k+1} · ${t('side.'+P.dir)}`, sub: names || t('att.none'), why: land, cls:'plot'+(k===attachSel?' on':''), k:String(k), badge, click:()=>selectPlot(k)});
    if(all) tl.title += ' · ' + all; strip.appendChild(tl); });
  // (the Acquire button is on the map, beside the chosen plot — v0.9.3)
}
// ---------- an event (v0.10.1: it plays as a screen — story, decision, outcome; the bar only says it is waiting) ----------
function renderEvent(head, strip){
  const c = S.cards[0], E = EVENTS[c.id];
  const v = c.v || {}, at = v.i>=0 && v.i!==undefined ? `<small class="where">${ic('place')}${t('ui.parcel',{at:pname(v.i)})}</small>` : '';
  head.innerHTML = `${pxPortrait(E.char)}<div class="who"><small>${t('char.'+E.char,{town:S.town})}</small><h3>${t('ev.'+c.id+'.t')}</h3>${c.peek ? at : ''}</div>`;
  // v0.11.1: while you look at the event's parcel, the bar only offers to go back to it
  strip.appendChild(tile({icon:'mail', name:t(c.peek ? 'ev.back' : c.type==='result' ? 'ev.outcome' : 'ev.open'), cls:'act primary', k:'open', click:()=>{ playSound('click'); c.peek = false; showNext(); }}));
}
function renderOver(head, strip){
  head.innerHTML = `<h3>${ic('gavel')}${t('d.over')}</h3>`;
  strip.appendChild(tile({icon:'description', name:t('d.summary'), cls:'act primary', click:()=>showNext()}));
}
// Escape / tapping the map again: let go of whatever is selected
export function deselect(){ if(armed){ setArmed(null); refresh(); return true; }
  if(selected>=0 || selBlock>=0){ clearSelection(); hidePop(); refresh(); return true; }
  if(dockPin){ dockPin = null; refresh(); return true; }   // v0.11: close the bar
  return false; }
