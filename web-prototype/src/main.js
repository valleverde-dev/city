import { acquire, consult, fileReport, lobby, repay, requestPermit, sellPlot, submitPlan } from './core/actions.js';
import { COMBOS, activeCombos, comboFx, comboPreview, discovered } from './core/combos.js';
import { B, CFG, CHARS, LEVELS, on } from './core/config.js';
import { choosePerk } from './core/directives.js';
import { residents } from './core/economy.js';
import { EVENTS, choicesFor, resolveEvent } from './core/events.js';
import { resolveCard } from './core/index.js';
import { endMonth } from './core/month.js';
import { records } from './core/persist.js';
import { attach } from './core/newgame.js';
import { DIR_KEYS, RCOMBO_BY_ID, attachPreview, cellPos, regionPop } from './core/region.js';
import { caps, hasAccess } from './core/rules.js';
import { S, rc } from './core/state.js';
import { LANG, t } from './i18n/index.js';
import { born, compose, draw, presentNow, spriteSheet, startNight } from './render/anim.js';
import { FRX, FRY, MAPCX, MAPCY, attachSel, centreOn, isoOf, isoW, panBy, resize, selected, tileAt, tileAtW, toScreen, zoom, zoomAt } from './render/camera.js';
import { art, startSite } from './render/map.js';
import { ARCH, archOf } from './render/sprites.js';
import { hideModal, makePixelPortrait, showNext } from './ui/cards.js';
import { portrait } from './ui/dom.js';
import { guideStep, refresh, styleName } from './ui/guide.js';
import { sheet } from './ui/hud.js';
import { problems } from './ui/problems.js';
import { catalogueCard, closeSheet, openSheet } from './ui/sheets.js';
import { enterSettlement, setLang, startMenu, startNew, startRun } from './ui/title.js';
import './ui/input.js';   // pointer, wheel and keyboard listeners

// =====================================================================
//  BOOT + test hook (used by tests/smoke_test.py and tests/balance.py)
// =====================================================================
window.__eurocrat = {
  get S(){ return S; }, CFG, B, EVENTS, LEVELS, newGame:(seed, stage=3)=>{ startNew(seed, stage); S.cards=[]; hideModal(); return S; },
  startRun, records, regionPop, attachPreview, DIR_KEYS, RCOMBO_BY_ID, cellPos, attach:(d)=>{ const r = attach(d); if(r.ok) enterSettlement(); return r; },
  openSheet, closeSheet, get sheet(){ return sheet; }, guideStep, get zoom(){ return zoom; }, get cam(){ return [MAPCX, MAPCY]; },
  panBy, zoomAt, centreOn, on,
  acquire, requestPermit, sellPlot, submitPlan, lobby, consult, fileReport, repay, endMonth, choosePerk, caps, residents, hasAccess,
  choicesFor, resolveEvent, problems, activeCombos, comboPreview, comboFx, discovered, COMBOS, catalogueCard, t, setLang, get lang(){ return LANG; },
  resolveCard,
  tileAt:(x,y)=>tileAt(x,y), tileAtW:(x,y)=>tileAtW(x,y), screenOf:(i)=>{ const [ix,iy]=isoOf(...rc(i)); return toScreen(ix,iy); },
  screenOfW:(R,C)=>{ const [ix,iy]=isoW(R-FRY,C-FRX); return toScreen(ix,iy); },   // a MAP cell (y, x) on screen
  get attachSel(){ return attachSel; },
  refresh, showNext, hideModal, get selected(){ return selected; }, spriteSheet, portrait,
  startNight, ARCH, archOf, styleName, get born(){ return born.size; }, get artSize(){ return [art.width, art.height]; },
  frameMs:(n=30)=>{ const t0=performance.now(); for(let k=0;k<n;k++){ compose(t0+k*66); presentNow(); } return (performance.now()-t0)/n; },
};
startSite(1, 0); resize(); refresh(); startMenu();
Object.keys(CHARS).forEach(makePixelPortrait);
if(document.fonts && document.fonts.ready) document.fonts.ready.then(()=>draw());
