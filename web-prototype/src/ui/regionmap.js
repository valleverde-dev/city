import { S } from '../core/state.js';
import { cellCode } from '../core/region.js';

// =====================================================================
//  REGION MINIMAP — the whole world map in the map's isometric orientation (north ↗), one small diamond per
//  parcel: open country pale, the consolidated region in full colour, the settlement in play outlined in
//  yellow (its live grid), and the plots on offer (while choosing) numbered.
// =====================================================================
const COL = { farm:'#93b35c', housing:'#e0a86a', factory:'#8d929c', school:'#e8c95a', clinic:'#e58080', park:'#4f9d4f',
  road:'#5a5f6e', regional:'#5a5f6e', village:'#c88f5c', flood:'#4f8fd6', habitat:'#2f6b3a', muni:'#b8cf86' };
const PALE = { farm:'#c3d3a6', regional:'#9da1ab', flood:'#9fc0e6', habitat:'#8fb08f', village:'#d9bfa3' };
export function regionCanvas({maxW = 320, maxH = 170} = {}){
  const Wn = S.world.n, A = S.region.active, cands = S.pending==='attach' ? (S.region.cands||[]) : [];
  let cw = Math.floor(Math.min(maxW*2/(2*Wn), maxH*4/(2*Wn)) / 2) * 2; cw = Math.max(2, Math.min(12, cw));
  const pad = 4, w = Wn*cw + pad*2, h = Wn*cw/2 + pad*2;
  const dpr = Math.max(1, Math.round((typeof devicePixelRatio === 'number' ? devicePixelRatio : 1)));
  const cv = document.createElement('canvas'); cv.className = 'regionmap';
  cv.width = w*dpr; cv.height = h*dpr; cv.style.width = w+'px'; cv.style.height = h+'px';
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const at = (x, y) => [pad + (x - y + Wn)*cw/2, pad + (x + y)*cw/4];   // a parcel corner (world coordinates)
  const diamond = (x, y, n) => { const p = [at(x,y), at(x+n,y), at(x+n,y+n), at(x,y+n)]; g.beginPath(); p.forEach(([a,b],k)=>k ? g.lineTo(a,b) : g.moveTo(a,b)); g.closePath(); };
  const owner = new Int16Array(Wn*Wn).fill(-1);
  S.region.blocks.forEach((B,k)=>{ for(let y=B.y;y<B.y+B.n;y++) for(let x=B.x;x<B.x+B.n;x++) owner[y*Wn+x] = k; });
  for(let y=0;y<Wn;y++) for(let x=0;x<Wn;x++){
    let code = S.world.cells[y*Wn+x], mine = owner[y*Wn+x] >= 0;
    if(A && x>=A.x && x<A.x+A.n && y>=A.y && y<A.y+A.n && S.grid.length===A.n*A.n){ code = cellCode(S.grid[(y-A.y)*A.n + (x-A.x)]); mine = true; }
    g.fillStyle = mine ? (COL[code] || COL.farm) : (PALE[code] || PALE.farm); diamond(x, y, 1); g.fill(); }
  g.lineWidth = 1;
  S.region.blocks.forEach(B=>{ diamond(B.x, B.y, B.n); g.strokeStyle = 'rgba(11,31,77,.85)'; g.stroke(); });
  if(A){ diamond(A.x, A.y, A.n); g.strokeStyle = '#ffd200'; g.lineWidth = 2; g.stroke(); g.lineWidth = 1; }
  cands.forEach((P,k)=>{ diamond(P.x, P.y, P.n); g.setLineDash([3,2]); g.strokeStyle = '#1d3c78'; g.stroke(); g.setLineDash([]);
    const [cx, cy] = at(P.x + P.n/2, P.y + P.n/2); g.font = '700 11px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#0b1f4d'; g.fillText(String(k+1), cx, cy); });
  return cv;
}
