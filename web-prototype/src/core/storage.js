// Key-value storage for saves and campaign progress.
// In the browser it is localStorage; anywhere else (Node tests, the balance bot) it is kept in memory.
// A Godot port replaces this file with ConfigFile / FileAccess under user://.
const mem = new Map();
const ls = (()=>{ try{ return globalThis.localStorage || null; }catch(e){ return null; } })();
export const storage = {
  get(k){ try{ return ls ? ls.getItem(k) : (mem.has(k) ? mem.get(k) : null); }catch(e){ return null; } },
  set(k, v){ try{ if(ls) ls.setItem(k, v); else mem.set(k, String(v)); }catch(e){} },
  clear(){ mem.clear(); },
};
