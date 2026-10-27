import { cellCode, regionBounds } from '../core/region.js';
import { S } from '../core/state.js';

// =====================================================================
//  REGION MINIMAP — the whole Euroregion in the map's isometric orientation (north ↗), one small
//  diamond per parcel. Consolidated settlements are drawn from their frozen cells, the one in play
//  from its live grid. Optional candidate positions (attach card) are outlined with their side.
// =====================================================================
const COL = { farm:'#93b35c', housing:'#e0a86a', factory:'#8d929c', school:'#e8c95a', clinic:'#e58080', park:'#4f9d4f',
  road:'#5a5f6e', regional:'#474b57', village:'#c88f5c', flood:'#4f8fd6', habitat:'#2f6b3a', muni:'#b8cf86' };
export const SIDE_MARK = { n:'N', e:'E', s:'S', w:'W' };
export function regionCanvas({cands = null, hi = null, maxW = 320, maxH = 190} = {}){
  const list = cands ? Object.entries(cands).filter(([,P])=>P) : [];
  const B = regionBounds(list.map(([,P])=>P));
  const minU = B.x0 - B.y1, maxU = B.x1 - B.y0, minV = B.x0 + B.y0, maxV = B.x1 + B.y1;
  let cw = Math.floor(Math.min(maxW*2/(maxU-minU), maxH*4/(maxV-minV)) / 2) * 2;
  cw = Math.max(2, Math.min(28, cw));
  const pad = 6, w = Math.round((maxU-minU)*cw/2) + pad*2, h = Math.round((maxV-minV)*cw/4) + pad*2;
  const dpr = Math.max(1, Math.round((typeof devicePixelRatio === 'number' ? devicePixelRatio : 1)));
  const cv = document.createElement('canvas'); cv.className = 'regionmap';
  cv.width = w*dpr; cv.height = h*dpr; cv.style.width = w+'px'; cv.style.height = h+'px';
  const g = cv.getContext('2d'); g.scale(dpr, dpr);
  const at = (x, y) => [pad + (x - y - minU)*cw/2, pad + (x + y - minV)*cw/4];   // a parcel corner (region coordinates)
  const diamond = (x, y, n) => { const p = [at(x,y), at(x+n,y), at(x+n,y+n), at(x,y+n)]; g.beginPath(); p.forEach(([a,b],k)=>k ? g.lineTo(a,b) : g.moveTo(a,b)); g.closePath(); };
  const cells = (b, codes) => { for(let r=0;r<b.n;r++) for(let c=0;c<b.n;c++){ g.fillStyle = COL[codes[r*b.n+c]] || COL.farm; diamond(b.x+c, b.y+r, 1); g.fill(); } };
  S.region.blocks.forEach(b=>{ cells(b, b.cells); });
  const A = S.region.active;
  if(A && S.grid.length === A.n*A.n) cells(A, S.grid.map(cellCode));
  g.lineWidth = 1;
  S.region.blocks.forEach(b=>{ diamond(b.x, b.y, b.n); g.strokeStyle = 'rgba(11,31,77,.8)'; g.stroke(); });
  if(A){ diamond(A.x, A.y, A.n); g.strokeStyle = '#ffd200'; g.lineWidth = 2; g.stroke(); g.lineWidth = 1; }
  // Candidates: dashed outlines with their side letter; the highlighted one filled
  list.forEach(([dir, P])=>{
    diamond(P.x, P.y, P.n);
    if(dir === hi){ g.fillStyle = 'rgba(255,210,0,.35)'; g.fill(); }
    g.setLineDash([3,2]); g.strokeStyle = dir === hi ? '#ffd200' : 'rgba(29,60,120,.9)'; g.lineWidth = dir === hi ? 2 : 1; g.stroke(); g.setLineDash([]); g.lineWidth = 1;
    const [cx, cy] = at(P.x + P.n/2, P.y + P.n/2), fs = Math.max(9, Math.min(14, cw*P.n/5));
    g.font = `700 ${fs}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = dir === hi ? '#0b1f4d' : '#1d3c78'; g.fillText(SIDE_MARK[dir], cx, cy);
  });
  return cv;
}
