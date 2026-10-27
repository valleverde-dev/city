import { S } from '../core/state.js';
import { cellCode } from '../core/region.js';

// =====================================================================
//  REGION MINIMAP — all the land of the Euroregion in the map's isometric orientation (north ↗), one small
//  diamond per parcel: the settlement in play outlined in yellow (its live grid), the consolidated ones in
//  navy, and the plots on offer (while choosing) pale and numbered.
// =====================================================================
const COL = { farm:'#93b35c', housing:'#e0a86a', factory:'#8d929c', school:'#e8c95a', clinic:'#e58080', park:'#4f9d4f',
  road:'#5a5f6e', regional:'#5a5f6e', village:'#c88f5c', flood:'#4f8fd6', habitat:'#2f6b3a', muni:'#b8cf86' };
const PALE = { farm:'#d3e0bd', regional:'#b4b7bf', flood:'#bcd3ee', habitat:'#a9c3a9', village:'#e3cdb5' };
export function regionCanvas({maxW = 320, maxH = 170} = {}){
  const A = S.region.active, cands = S.pending==='attach' ? (S.region.cands||[]) : [];
  const all = [...S.region.blocks, ...(A ? [A] : []), ...cands];
  const x0 = Math.min(...all.map(b=>b.x)), y0 = Math.min(...all.map(b=>b.y)), x1 = Math.max(...all.map(b=>b.x+b.n)), y1 = Math.max(...all.map(b=>b.y+b.n));
  const minU = x0 - y1, maxU = x1 - y0, minV = x0 + y0, maxV = x1 + y1;
  let cw = Math.floor(Math.min(maxW*2/(maxU-minU), maxH*4/(maxV-minV)) / 2) * 2; cw = Math.max(2, Math.min(24, cw));
  const pad = 6, w = Math.round((maxU-minU)*cw/2) + pad*2, h = Math.round((maxV-minV)*cw/4) + pad*2;
  const dpr = Math.max(1, Math.round((typeof devicePixelRatio === 'number' ? devicePixelRatio : 1)));
  const cv = document.createElement('canvas'); cv.className = 'regionmap';
  cv.width = w*dpr; cv.height = h*dpr; cv.style.width = w+'px'; cv.style.height = h+'px';
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const at = (x, y) => [pad + (x - y - minU)*cw/2, pad + (x + y - minV)*cw/4];   // a parcel corner (map coordinates)
  const diamond = (x, y, n) => { const p = [at(x,y), at(x+n,y), at(x+n,y+n), at(x,y+n)]; g.beginPath(); p.forEach(([a,b],k)=>k ? g.lineTo(a,b) : g.moveTo(a,b)); g.closePath(); };
  // the land that exists, in full colour; the settlement in play from its live grid
  for(const k in S.world.cells){ const [y,x] = k.split(',').map(Number); let code = S.world.cells[k];
    if(A && x>=A.x && x<A.x+A.n && y>=A.y && y<A.y+A.n && S.grid.length===A.n*A.n) code = cellCode(S.grid[(y-A.y)*A.n + (x-A.x)]);
    g.fillStyle = COL[code] || COL.farm; diamond(x, y, 1); g.fill(); }
  // the plots on offer, pale
  cands.forEach(P=>P.cells.forEach((c,i)=>{ g.fillStyle = PALE[c] || PALE.farm; diamond(P.x + i%P.n, P.y + Math.floor(i/P.n), 1); g.fill(); }));
  g.lineWidth = 1;
  S.region.blocks.forEach(B=>{ diamond(B.x, B.y, B.n); g.strokeStyle = 'rgba(11,31,77,.85)'; g.stroke(); });
  if(A){ diamond(A.x, A.y, A.n); g.strokeStyle = '#ffd200'; g.lineWidth = 2; g.stroke(); g.lineWidth = 1; }
  cands.forEach((P,k)=>{ diamond(P.x, P.y, P.n); g.setLineDash([3,2]); g.strokeStyle = '#1d3c78'; g.stroke(); g.setLineDash([]);
    const [cx, cy] = at(P.x + P.n/2, P.y + P.n/2); g.font = '700 12px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#0b1f4d'; g.fillText(String(k+1), cx, cy); });
  return cv;
}
