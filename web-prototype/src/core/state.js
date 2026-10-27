// =====================================================================
//  RNG (seeded, stored in the save so runs are reproducible) + helpers
// =====================================================================
export let S = null;   // the whole game state
export let N = 12;     // map side: changes with the level (2, 4, 8, 16)
// The only ways to replace them (imported bindings are read-only in other modules)
export function setState(s){ S = s; if(s && s.grid && s.grid.length) N = Math.round(Math.sqrt(s.grid.length)); return S; }
export function setSide(n){ N = n; }
export function rnd(){
  S.rng = (S.rng + 0x6D2B79F5) | 0;
  let t = S.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export const ri = (a,b)=> a + Math.floor(rnd()*(b-a+1));
export const pick = arr => arr[Math.floor(rnd()*arr.length)];
export const r1 = x => Math.round(x*10)/10;
export const clamp = (x,a,b)=> Math.max(a, Math.min(b, x));
export const idx = (r,c)=> r*N+c;
export const rc = i => [Math.floor(i/N), i%N];
export const inside = (r,c)=> r>=0 && r<N && c>=0 && c<N;
export const NB = [[-1,0],[1,0],[0,-1],[0,1]];
export const NB8 = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
export const has = p => S.perks.includes(p);
export const pname = i => { const [r,c]=rc(i); return `${r+1}-${c+1}`; };
