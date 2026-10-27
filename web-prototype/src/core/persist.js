import { LEVELS, PERKS } from './config.js';
import { S, rnd } from './state.js';
import { storage } from './storage.js';

// Campaign progress: highest level unlocked + the perk carried out of each completed level
export function campaign(){ try{ const c = JSON.parse(storage.get('eurocrat_campaign')||'null'); if(c && Array.isArray(c.perks)) return c; }catch(e){} return {max:0, perks:[]}; }
export function saveCampaign(c){ try{ storage.set('eurocrat_campaign', JSON.stringify(c)); }catch(e){} }

// =====================================================================
//  PERSISTENCE
// =====================================================================
export const SAVE_KEY = 'eurocrat_v5';
export function save(){ try{ storage.set(SAVE_KEY, JSON.stringify(S)); }catch(e){} }
export function loadSave(){ try{ const raw=storage.get(SAVE_KEY); if(raw){ const s=JSON.parse(raw); if(s && s.v===5) return s; } }catch(e){} return null; }
// Winning a level unlocks the next one; the perk you carry is chosen on the level-complete card
export function levelWon(){ const c = campaign(); c.max = Math.max(c.max, Math.min(S.level+1, LEVELS.length-1)); if(S.level+1 >= LEVELS.length) c.done = true; saveCampaign(c);
  if(S.level+1 < LEVELS.length){ const taken = c.perks.slice(0, S.level+1);
    const pool = Object.keys(PERKS).filter(k=>!taken.includes(k) && !S.perks.includes(k));
    S.carryChoice = []; while(S.carryChoice.length<3 && pool.length) S.carryChoice.push(pool.splice(Math.floor(rnd()*pool.length),1)[0]); } }
export function carryPerk(k){ const c = campaign(); c.perks[S.level] = k; c.perks.length = S.level+1; saveCampaign(c); }
