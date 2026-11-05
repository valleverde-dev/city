import { S } from './state.js';
import { storage } from './storage.js';
import { regionPop } from './region.js';

// =====================================================================
//  PERSISTENCE — the run in progress, and the records between runs
// =====================================================================
export const SAVE_KEY = 'eurocrat_v11';
export function save(){ try{ storage.set(SAVE_KEY, JSON.stringify(S)); }catch(e){} }
export function loadSave(){ try{ const raw=storage.get(SAVE_KEY); if(raw){ const s=JSON.parse(raw); if(s && s.v===11) return repair(s); } }catch(e){} return null; }
// v0.11.1: only private farmland has stubborn owners (a bug let municipal land keep the mark)
function repair(s){ (s.grid||[]).forEach(p=>{ if(p && p.hold && p.k!=='farm'){ p.hold = false; p.holdKnown = false; delete p.holdPct; } }); return s; }

// Records: the best Euroregion so far (settlements consolidated, population) and the number of runs
export function records(){ try{ const r = JSON.parse(storage.get('eurocrat_records')||'null'); if(r && r.best) return r; }catch(e){} return {best:{settlements:0, pop:0}, runs:0}; }
// Called once when a run ends. Returns which records were beaten.
export function recordRun(){
  const r = records(), settlements = S.done||0, pop = S.newcomers + (S.base||0);   // v0.10: milestones reached, people of the whole region
  const beat = {settlements: settlements > r.best.settlements, pop: pop > r.best.pop};
  r.best = {settlements: Math.max(r.best.settlements, settlements), pop: Math.max(r.best.pop, pop)}; r.runs++;
  try{ storage.set('eurocrat_records', JSON.stringify(r)); }catch(e){}
  return beat;
}
