// =====================================================================
//  EUROCRAT CORE — the rules of the game, with no DOM, canvas or audio.
//
//  Everything here is plain functions over one JSON state (S). It runs in the browser,
//  in Node (tests, balance bot) and is the specification for the Godot port:
//  each file maps to one GDScript autoload / class (see docs/ARCHITECTURE.md).
//
//  The UI may READ anything exported here, but it changes the game only through:
//    newGame · actions (acquire, requestPermit, …) · choosePerk · resolveEvent / resolveCard · endMonth
//  Every action returns {ok, msg:{k,p}, bad?, cls?, sfx?}: i18n keys and sound names, never text or audio.
// =====================================================================
import { S } from './state.js';
import { choicesFor, resolveEvent } from './events.js';

// State, RNG and grid helpers
export { S, N, setState, rnd, ri, pick, r1, clamp, idx, rc, inside, NB, NB8, has, pname } from './state.js';
// Data and tuning: levels, buildings, perks, characters
export { LEVELS, LV, stageCfg, on, CFG, B, BUILD_TYPES, BASE_TYPES, NEW_TYPES, KIND, PERKS, CHARS, METER_FLAG, MILESTONES, N_COUNTRIES, N_REJECTIONS } from './config.js';
// Starting a run; consolidating a settlement and attaching the next one
export { newGame, snapshot, consolidate, attach } from './newgame.js';
// The Euroregion: settlement types, region combos, placement, frontier
export { SIZES, STYPES, STYPE_ICON, STYPE_FX, REGION_COMBOS, RCOMBO_BY_ID, DIRS, DIR_KEYS, candidates, attachPreview, neighboursOf,
         regionCombosAt, regionBounds, regionPop, regionDividend, regionFx, frontAt, cellPos, codeTokens, wcode, blockAt, worldIndex } from './region.js';
export { genPlot, wid, setW } from './region.js';
export { writePlot } from './newgame.js';
// Derived values (read-only questions about the state)
export { count, caps, hasAccess, isRoad, givesAccess, nextToVillage, landPrice, plotValue, buildCost, permitMonths, buildMonths,
         contractors, slotsPerMonth, approvalChance, support, approves, activeSites, builtFx } from './rules.js';
export { residents, taxIncome, monthlyCosts, committed, avail, nextMilestone } from './economy.js';
export { COMBOS, COMBO_BY_ID, activeCombos, comboFx, comboPreview, discovered } from './combos.js';
// Player actions (each costs agenda slots)
export { acquire, requestPermit, sellPlot, submitPlan, lobby, consult, fileReport, repay, canAct } from './actions.js';
// Directives and perks
export { DIRECTIVE_ICON, directiveProgress, choosePerk } from './directives.js';
// Event cards
export { EVENTS, choicesFor, resolveEvent } from './events.js';
// The turn
export { endMonth } from './month.js';
// The career: experience, ranks, achievements, unlocks, quick-start dossiers
export { RANKS, RANK_BONUS, ACH, ACH_BY_ID, UNLOCKED_BY, career, saveCareer, rankOf, rankBonus, unlocked, checkAch, drafts, runXp } from './career.js';
// Saves and records
export { SAVE_KEY, save, loadSave, records, recordRun } from './persist.js';
export { storage } from './storage.js';
export { money, setNumberLang } from './format.js';

// Resolve the first pending card without a UI: event cards with the given (or first) choice,
// other cards are just acknowledged. Used by the tests and the balance bot.
export function resolveCard(k){
  const c = S.cards[0]; if(!c) return null;
  if(c.type==='event'){ const ch = k || choicesFor(c)[0].k; S.cards.shift(); const r = resolveEvent(c, ch); if(r) S.cards.unshift({type:'result', id:c.id, res:r, v:c.v}); return r; }
  S.cards.shift(); return true;
}
