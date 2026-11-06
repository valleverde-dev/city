// =====================================================================
//  EVENT ILLUSTRATIONS (v0.11.1) — one little pixel-art scene per event, 160×90 art pixels, painted in code
//  with the game's palette and a simple loop (smoke, blinks, flags, flashes). Shown above the story.
//  drawEvent(id, ctx, T) paints a frame; mountEventArt(el, id) puts an animated canvas in el.
//  Scenes are built from a small kit: skies and grounds, rooms, buildings, props and 15-px people.
// =====================================================================
import { t } from '../i18n/index.js';

export const EW = 160, EH = 90;
let g;   // the context being painted
const R = (x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), w, h); };
const P = (x, y, c) => R(x, y, 1, 1, c);
const BAYER = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
const dith = (x, y) => (BAYER[(y&3)*4 + (x&3)] + 0.5) / 16;
const hsh = (a, b, s) => { let h = (Math.imul(a|0, 374761393) + Math.imul(b|0, 668265263) + Math.imul(s|0, 1442695041))|0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
const blink = (T, f = 2, on = 1, of = 2) => Math.floor(T*f) % of < on;
const NAVY = '#0b1f4d', INK = '#14203d', UNION = '#003399', YEL = '#f2c230', RED = '#c62f28', GREEN = '#1d8148', WHITE = '#ffffff';

// ---------- a 3×5 pixel font (capitals, digits and a few signs) for banners and signs ----------
const FONT = {A:'010101111101101',B:'110101110101110',C:'011100100100011',D:'110101101101110',E:'111100110100111',F:'111100110100100',G:'011100101101011',
  H:'101101111101101',I:'111010010010111',J:'001001001101010',K:'101101110101101',L:'100100100100111',M:'101111111101101',N:'110101101101101',
  O:'010101101101010',P:'110101110100100',Q:'010101101110011',R:'110101110101101',S:'011100010001110',T:'111010010010010',U:'101101101101111',
  V:'101101101101010',W:'101101111111101',X:'101101010101101',Y:'101101010010010',Z:'111001010100111',
  0:'111101101101111',1:'010110010010111',2:'110001010100111',3:'110001010001110',4:'101101111001001',5:'111100110001110',
  6:'011100111101111',7:'111001010010010',8:'111101111101111',9:'111101111001110','%':'101001010100101','°':'010101010000000',
  '€':'011100110100011','+':'000010111010000','-':'000000111000000','!':'010010010000010','?':'110001010000010','.':'000000000000010',' ':'000000000000000'};
const fold = s => s.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
export function textW(s, sc = 1){ return fold(s).length * 4 * sc - sc; }
function text(x, y, s, col, sc = 1){ [...fold(s)].forEach((ch, k) => { const f = FONT[ch] || FONT[' '];
  for(let j = 0; j < 5; j++) for(let i = 0; i < 3; i++) if(f[j*3+i] === '1') R(x + (k*4 + i)*sc, y + j*sc, sc, sc, col); }); }
const label = k => { const s = t('evart.'+k); return s && s !== 'evart.'+k ? s : k; };

// ---------- skies, grounds, nature ----------
function sky(cols, y0 = 0, y1 = 60){ const n = cols.length - 1;
  for(let y = y0; y < y1; y++){ const f = (y - y0) / (y1 - y0) * n, k = Math.min(n - 1, Math.floor(f)), tt = f - k;
    for(let x = 0; x < EW; x++) P(x, y, tt > dith(x, y) ? cols[k+1] : cols[k]); } }
const DAY = ['#8fc3ea','#b9dcf4','#e3f1fb'], GREY = ['#8aa7c9','#b6c7dc','#dfe6ee'], DUSK = ['#14203d','#2b2f6e','#6a4a8a','#d9805f'], RAIN = ['#6d7f96','#8d9cb0','#b3bfcd'];
function cloud(x, y, w, T, sp = 1.5, col = WHITE){ x = ((x + T*sp) % (EW + 40)) - 20;
  R(x+3, y, w-6, 1, col); R(x+1, y+1, w-2, 2, col); R(x, y+3, w, 2, col === WHITE ? '#f2f5fb' : col); R(x+2, y+5, w-4, 1, col === WHITE ? '#dfe6f2' : col); }
function hills(y, col, colD, seed, amp = 4){ for(let x = 0; x < EW; x++){ const h = Math.round(Math.sin(x*0.045 + seed)*amp + Math.sin(x*0.13 + seed*2)*amp*0.4); R(x, y - h, 1, EH, (x + h) % 7 === 0 ? colD : col); } }
function ground(y, a, b){ for(let yy = y; yy < EH; yy++) for(let x = 0; x < EW; x++) P(x, yy, dith(x, yy) < 0.25 + (yy-y)*0.01 ? b : a); }
const grass = y => ground(y, '#9ccc65', '#8bbf52'), paving = y => { ground(y, '#d2cbbb', '#c3b192'); for(let x = 3; x < EW; x += 8) R(x, y, 1, EH-y, '#c4bcaa'); };
const earth = y => ground(y, '#a87d55', '#9a6b47');
function field(T, seed = 1){ sky(DAY, 0, 46); cloud(20 + seed*30, 8, 22, T); cloud(100, 14, 16, T, 1); hills(46, '#8bbf52', '#7cb342', seed, 3); hills(52, '#7cb342', '#689f38', seed*2.3, 2); grass(56); }
function tree(x, y, T){ const s = Math.round(Math.sin(T*1.5 + x)*0.5); R(x, y-3, 2, 4, '#6b4a2e'); R(x-3+s, y-9, 8, 6, '#4a7a2c'); R(x-2+s, y-11, 6, 2, '#5f9436'); R(x-1+s, y-8, 3, 2, '#79b046'); }
function sun(x, y, T, big = 6){ R(x-big, y-big+2, big*2, big*2-4, '#ffd200'); R(x-big+2, y-big, big*2-4, big*2, '#ffd200'); R(x-big+2, y-big+2, big*2-4, big*2-4, '#ffe866');
  const r = big + 3 + Math.round(Math.sin(T*3)); [[1,0],[-1,0],[0,1],[0,-1],[0.7,0.7],[-0.7,0.7],[0.7,-0.7],[-0.7,-0.7]].forEach(([a,b]) => R(x + a*r - 1, y + b*r - 1, 2, 2, '#ffd200')); }
function rain(T, n = 40, col = '#c6dcf2'){ for(let k = 0; k < n; k++){ const x = Math.floor(hsh(k,1,4)*EW), y = Math.floor((hsh(k,2,4)*EH + T*70) % EH); R(x, y, 1, 3, col); } }
function water(x0, y0, w, h, T){ for(let y = y0; y < y0+h; y++) for(let x = x0; x < x0+w; x++) P(x, y, Math.sin(x*0.4 + y*0.9 - T*3) > 0.85 ? '#c6ecf7' : (y < y0+3 ? '#5aaedb' : '#3f93c4')); }
function duck(x, y, T, k = 0){ const b = Math.round(Math.sin(T*3 + k)); y += b; R(x, y, 5, 3, '#ffffff'); R(x+4, y-2, 2, 2, '#ffffff'); P(x+6, y-1, '#e8762b'); P(x+4, y-2, INK); R(x+1, y+3, 3, 1, 'rgba(0,0,0,.15)'); }

// ---------- rooms ----------
function room(wall = '#dfe5ef', wallD = '#c7d2e3', floor = '#b88b5e', floorD = '#a57a50', y = 62){
  R(0, 0, EW, y, wall); for(let x = 0; x < EW; x += 2) for(let yy = 0; yy < y; yy += 12) P(x + (yy/12)%2, yy, wallD);
  R(0, y-8, EW, 8, wallD); R(0, y-9, EW, 1, '#a9b6cc');
  for(let yy = y; yy < EH; yy++) R(0, yy, EW, 1, (yy - y) % 5 === 0 ? floorD : floor);
  for(let x = 0; x < EW; x += 22) for(let yy = y; yy < EH; yy += 5) R(x + ((yy - y)/5 % 2)*11, yy, 1, 5, floorD); }
function windowCity(x, y, w, h, T, night = false){ R(x-2, y-2, w+4, h+4, '#8a9bb5'); R(x, y, w, h, night ? '#2b2f6e' : '#a6cdea');
  for(let k = 0; k < w; k += 6){ const bh = 6 + Math.floor(hsh(k, x, 3)*(h-6)); R(x+k, y+h-bh, 5, bh, night ? '#14203d' : '#7f93b3'); if(night) for(let j = y+h-bh+2; j < y+h; j += 3) if(hsh(k, j, 9) > 0.5) P(x+k+2, j, '#ffd77a'); }
  R(x + w/2 - 1, y, 2, h, '#8a9bb5'); R(x, y + h/2, w, 1, '#8a9bb5'); }
function desk(x, y, w = 40, col = '#8c6544'){ R(x, y, w, 3, '#a87d55'); R(x, y+3, w, 10, col); R(x+2, y+5, w/2-4, 1, '#6d4c35'); R(x+w/2+2, y+5, w/2-4, 1, '#6d4c35'); R(x+w/4-1, y+8, 3, 1, YEL); R(x+3*w/4-1, y+8, 3, 1, YEL); }
function papers(x, y, n = 4, lean = 0){ for(let k = 0; k < n; k++){ const xx = x + Math.round(Math.sin(k*1.7)*1.5) + Math.round(k*lean); R(xx, y - k*2 - 2, 10, 2, k%2 ? '#ffffff' : '#f2ecd9'); R(xx, y - k*2, 10, 1, '#c4bcaa'); } }
function poster(x, y, T){ R(x-1, y-1, 18, 13, '#8a9bb5'); R(x, y, 16, 11, UNION); const cx = x+7, cy = y+4; P(cx+1, cy, WHITE); R(cx, cy+1, 3, 1, WHITE); P(cx, cy+2, WHITE); P(cx+2, cy+2, WHITE); }
function clock(x, y, T){ R(x-4, y-4, 9, 9, WHITE); R(x-4, y-4, 9, 1, NAVY); R(x-4, y+4, 9, 1, NAVY); R(x-4, y-4, 1, 9, NAVY); R(x+4, y-4, 1, 9, NAVY);
  const a = T*1.5; P(x, y, NAVY); P(x + Math.round(Math.cos(a)*3), y + Math.round(Math.sin(a)*3), RED); P(x, y-2, NAVY); }
function calendar(x, y, mark = 4){ R(x, y, 18, 15, WHITE); R(x, y, 18, 3, RED); for(let k = 0; k < 12; k++){ const cx = x + 1 + (k%4)*4, cy = y + 4 + Math.floor(k/4)*4; R(cx, cy, 3, 3, k === mark ? '#ffd200' : '#c7d2e3'); if(k === mark){ R(cx-1, cy-1, 5, 1, RED); R(cx-1, cy+3, 5, 1, RED); } } }
function chart(x, y, w, h, dir, T){ R(x-1, y-1, w+2, h+2, '#8a9bb5'); R(x, y, w, h, WHITE); for(let k = 1; k < 4; k++) R(x, y + k*h/4, w, 1, '#e3e8f0');
  const n = Math.min(w-2, Math.floor((T*20) % (w + 20))), col = dir > 0 ? GREEN : RED;
  for(let i = 0; i < n; i++){ const f = i/(w-2), v = dir > 0 ? f*f : (f < 0.6 ? 0.2 + f*0.6 : 0.56 - (f-0.6)*2.2), yy = y + h - 2 - Math.round(Math.max(0, Math.min(1, v))*(h-4)) + Math.round(Math.sin(i*1.3)*1); R(x+1+i, yy, 1, 2, col); } }
function phone(x, y, T, ring = true){ const s = ring && blink(T, 8) ? 1 : 0; R(x+s, y, 12, 6, INK); R(x+1+s, y+1, 10, 3, '#3a3d44'); R(x-1+s, y-3, 14, 3, INK); R(x-1+s, y-3, 3, 4, INK); R(x+10+s, y-3, 3, 4, INK);
  if(ring && blink(T, 4)){ P(x-3, y-5, NAVY); P(x-4, y-3, NAVY); P(x+15, y-5, NAVY); P(x+16, y-3, NAVY); } }
function laptop(x, y, T, slide = 0){ R(x, y, 22, 14, '#3a3d44'); R(x+1, y+1, 20, 12, WHITE); R(x-3, y+14, 28, 2, '#8a8f99');
  const s = (Math.floor(T*0.8) + slide) % 3; if(s === 0){ R(x+3, y+3, 12, 1, NAVY); R(x+3, y+6, 16, 1, '#9aa0aa'); R(x+3, y+8, 14, 1, '#9aa0aa'); }
  else if(s === 1){ R(x+5, y+3, 8, 8, YEL); R(x+9, y+3, 4, 4, RED); R(x+9, y+7, 4, 4, '#2a63c9'); } else { for(let k = 0; k < 4; k++) R(x+4 + k*4, y+11 - (k+1)*2, 3, (k+1)*2, GREEN); } }
function moneyBag(x, y, col = '#c9a26b'){ R(x+2, y, 6, 2, col); R(x+3, y-1, 4, 1, '#8a6446'); R(x, y+2, 10, 8, col); R(x+1, y+10, 8, 1, col); R(x+3, y+4, 4, 1, GREEN); R(x+4, y+3, 1, 5, GREEN); R(x+3, y+7, 4, 1, GREEN); }
function coins(x, y, n = 4){ for(let k = 0; k < n; k++){ R(x + k*3, y - (k%2)*2, 4, 2, YEL); P(x + k*3 + 1, y - (k%2)*2, '#fff3a0'); } }
function newspaper(x, y, w = 30, h = 22, head = '', T = 0){ R(x+2, y+2, w, h, 'rgba(0,0,0,.2)'); R(x, y, w, h, '#f4f1e6'); R(x+2, y+2, w-4, 3, INK);
  if(head) text(x + 3, y + 7, head.slice(0, Math.floor((w-6)/4)), RED); else R(x+2, y+7, w-4, 4, RED);
  R(x+2, y+13, w/2-3, h-15, '#9aa0aa'); for(let k = 0; k < (h-15)/2; k++) R(x+w/2+1, y+13+k*2, w/2-3, 1, '#c4bcaa'); }
function camera(x, y, T, k = 0){ R(x, y, 7, 5, INK); R(x+2, y-1, 3, 1, INK); R(x+2, y+1, 3, 3, '#5d7fa8'); const f = Math.floor(T*5 + k*3) % 9; if(f === 0){ R(x-2, y-2, 11, 9, 'rgba(255,255,255,.75)'); R(x-5, y+2, 17, 1, WHITE); R(x+3, y-5, 1, 15, WHITE); } }
function scooter(x, y, col = GREEN, tilt = 0){ R(x, y-1, 10, 1, '#3a3d44'); R(x+8, y-10 + tilt, 1, 9, '#3a3d44'); R(x+6, y-10 + tilt, 5, 1, '#3a3d44'); R(x+1, y-2, 7, 1, col);
  R(x, y, 2, 2, INK); R(x+8, y, 2, 2, INK); P(x+10, y-9 + tilt, '#ffd77a'); }
function bus(x, y, col = '#2a63c9', T = 0, moving = false){ const b = moving ? Math.round(Math.sin(T*8)) : 0; y += b;
  R(x, y-16, 44, 13, col); R(x, y-16, 44, 2, '#ffffff'); for(let k = 0; k < 6; k++) R(x+3 + k*7, y-13, 5, 5, '#a6cdea'); R(x+40, y-13, 4, 9, '#a6cdea');
  R(x, y-6, 44, 2, '#14203d'); R(x+5, y-4, 6, 4, INK); R(x+32, y-4, 6, 4, INK); P(x+7, y-3, '#9aa0aa'); P(x+34, y-3, '#9aa0aa'); }
function lorry(x, y, T){ R(x, y-14, 28, 10, '#e8762b'); R(x+28, y-12, 10, 8, '#c95f1d'); R(x+30, y-11, 6, 4, '#a6cdea'); R(x, y-4, 38, 1, INK);
  R(x+3, y-4, 6, 4, INK); R(x+20, y-4, 6, 4, INK); R(x+30, y-4, 6, 4, INK); }
function house(x, y, w, h, wall = '#f1e3c8', roof = '#c2703f', win = '#5d7fa8'){ R(x, y-h, w, h, wall); R(x-2, y-h-3, w+4, 4, roof); R(x+1, y-h-5, w-2, 2, roof);
  for(let k = 3; k < w-5; k += 8) R(x+k, y-h+4, 4, 4, win); R(x + Math.floor(w/2) - 2, y-7, 5, 7, '#6e5c44'); }
function balcony(x, y, w, col, T, k){ R(x, y, w, 1, '#3a3d44'); for(let i = 0; i < w; i += 2) R(x+i, y+1, 1, 3, '#3a3d44');
  if(col){ const sw = Math.round(Math.sin(T*2 + k)); R(x+1, y+1, w-2, 7 + sw, col); R(x+2, y+3 + sw, w-4, 1, WHITE); } }
function church(x, y, T){ R(x, y-20, 30, 20, '#e8dcc0'); R(x-2, y-22, 34, 3, '#a85d32'); R(x+10, y-10, 8, 10, '#6e5c44');
  R(x+20, y-42, 12, 42, '#e8dcc0'); R(x+19, y-44, 14, 3, '#a85d32'); R(x+23, y-50, 6, 6, '#a85d32'); R(x+25, y-53, 2, 3, '#a85d32'); P(x+25, y-54, YEL);
  R(x+23, y-38, 6, 6, '#3a3d44'); R(x+24 + Math.round(Math.sin(T*6)), y-37, 4, 4, '#e6b400'); }
function townhall(x, y, T){ R(x, y-36, 100, 36, '#e3d6b8'); R(x, y-36, 100, 2, '#c9b893'); R(x-4, y-38, 108, 3, '#b8a37a');
  R(x+38, y-46, 24, 10, '#e3d6b8'); R(x+36, y-47, 28, 2, '#b8a37a'); R(x+46, y-44, 8, 7, WHITE); R(x+46, y-44, 8, 1, '#3a3d44');
  const a = T*0.5; P(x+50, y-41, NAVY); P(x+50 + Math.round(Math.cos(a)*2), y-41 + Math.round(Math.sin(a)*2), NAVY);
  for(let k = 0; k < 6; k++){ R(x+6 + k*16, y-30, 8, 10, '#5d7fa8'); R(x+6 + k*16, y-30, 8, 2, '#c9b893'); R(x+9 + k*16, y-30, 1, 10, '#e3d6b8'); }
  for(let k = 0; k < 6; k++){ R(x+2 + k*17, y-12, 12, 12, '#6e5c44'); R(x+3 + k*17, y-13, 10, 1, '#c9b893'); } }
function clinic(x, y){ R(x, y-30, 46, 30, '#f4f6fa'); R(x-2, y-32, 50, 3, '#9aa0aa'); for(let k = 0; k < 4; k++) R(x+4 + k*10, y-25, 7, 6, '#a6cdea');
  R(x+17, y-12, 12, 12, '#a6cdea'); R(x+22, y-44, 4, 12, RED); R(x+18, y-40, 12, 4, RED); R(x+20, y-31, 8, 1, '#9aa0aa'); }
function block(x, y, w, h, col = '#b6ae9c', floors = 4){ R(x, y-h, w, h, col); for(let f = 0; f < floors; f++){ R(x, y-h + f*(h/floors), w, 2, '#9d978a'); for(let c = 2; c < w-5; c += 8) R(x+c, y-h + f*(h/floors) + 3, 5, Math.max(2, h/floors - 5), '#6e6a62'); } }
function flag(x, y, w, h, T, ph = 0, pole = 14, cols = null){ R(x, y, 1, pole, '#d9dce2'); R(x+1, y, 1, pole, '#9aa0aa'); R(x, y-1, 2, 1, YEL);
  for(let i = 0; i < w; i++){ const p = i*0.55 - T*6 + ph, yo = Math.round(Math.sin(p)*(i/w)*1.2), s = Math.cos(p);
    if(cols){ for(let j = 0; j < h; j++) R(x+2+i, y+1+yo+j, 1, 1, cols[Math.floor(j/h*cols.length)]); continue; }
    R(x+2+i, y+1+yo, 1, h, s > 0.55 ? '#1a4bb0' : s < -0.55 ? '#002a80' : UNION); }
  if(cols) return;
  const cx = x + 2 + Math.floor(w/2) - 1, cy = y + Math.floor(h/2), yo = Math.round(Math.sin(Math.floor(w/2)*0.55 - T*6 + ph)*0.6);
  P(cx+1, cy+yo, WHITE); R(cx, cy+1+yo, 3, 1, WHITE); P(cx, cy+2+yo, WHITE); P(cx+2, cy+2+yo, WHITE); }
function bubble(x, y, txt, T){ if(Math.floor(T*2) % 3 === 2) return;
  R(x, y, 7, 7, WHITE); R(x+1, y+7, 2, 1, WHITE); R(x-1, y, 1, 7, NAVY); R(x+7, y, 1, 7, NAVY); R(x, y-1, 7, 1, NAVY); R(x, y+7, 1, 1, NAVY); R(x+3, y+7, 4, 1, NAVY);
  const c = {'!':RED, '?':'#163f94', '€':GREEN, '%':RED, '♥':RED}[txt] || NAVY;
  if(txt === '♥'){ R(x+1, y+2, 2, 2, c); R(x+4, y+2, 2, 2, c); R(x+1, y+3, 5, 1, c); R(x+2, y+4, 3, 1, c); P(x+3, y+5, c); return; }
  text(x+2, y+1, txt === '€' ? '€' : txt, c); }
function excavator(x, y, T, stop = true){ const b = stop ? 0 : Math.round(Math.sin(T*3));
  R(x, y-4, 26, 4, '#2f3542'); for(let k = 0; k < 6; k++) R(x+2+k*4, y-3, 2, 2, '#5c6066');
  R(x+4, y-12, 20, 8, YEL); R(x+4, y-12, 20, 1, '#ffe27a'); R(x+4, y-5, 20, 1, '#c99a12');
  R(x+14, y-20, 9, 8, YEL); R(x+15, y-19, 6, 5, '#9fd3f0'); R(x+15, y-19, 6, 1, '#d6eefa'); R(x+22, y-10, 3, 5, '#2f3542');
  for(let k = 0; k < 12; k++) R(x+12-k, y-13-Math.round(k*0.75)+b, 3, 2, '#e3b31d');
  for(let k = 0; k < 8; k++) R(x-1, y-22+k+b, 2, 1, '#e3b31d');
  R(x-5, y-14+b, 6, 3, '#5c6066'); R(x-6, y-12+b, 2, 1, '#5c6066'); R(x+25, y-15, 1, 3, RED); if(!stop || blink(T, 3)) P(x+25, y-16, '#ff7a6b'); }
function crane(x, y, h, T, busy = false){ for(let k = 0; k < h; k += 2){ R(x, y-k, 1, 1, '#e6b400'); R(x+3, y-k, 1, 1, '#e6b400'); P(x+1 + (k/2)%2, y-k-1, '#c99a12'); }
  R(x-26, y-h-2, 40, 1, '#e6b400'); for(let k = -26; k < 14; k += 3) P(x+k+1, y-h-3, '#c99a12');
  R(x+10, y-h, 4, 3, '#5c6066'); R(x+1, y-h-5, 2, 3, '#e6b400'); R(x+4, y-h-1, 3, 2, '#9fd3f0');
  const hx = x - 16 + Math.round(Math.sin(T*(busy ? 1.6 : 0.6))*(busy ? 8 : 3)), hl = busy ? 10 + Math.round(Math.sin(T*1.1)*5) : 12;
  R(hx, y-h-1, 1, hl, '#3a3d44'); R(hx-1, y-h+hl-1, 3, 1, '#3a3d44'); if(busy) R(hx-3, y-h+hl, 7, 3, '#b6ae9c'); }
function site(T, busy = false){ sky(GREY, 0, 52); cloud(10, 6, 30, T, 0.8); crane(118, 52, 34, T, busy); crane(40, 52, 26, T*0.7, busy);
  block(70, 56, 40, 34); for(let k = 0; k < 5; k++) R(73 + k*9, 18, 1, 4, '#5c6066'); earth(56); R(0, 56, EW, 2, '#8c6544'); }
function bunting(x0, x1, y, sag, T, cols){ for(let x = x0; x <= x1; x++){ const tt = (x - x0) / (x1 - x0), yy = y + Math.round(Math.sin(tt*Math.PI)*sag); P(x, yy, '#3a3d44');
  if((x - x0) % 5 === 1){ const c = cols[((x - x0)/5|0) % cols.length], sw = Math.round(Math.sin(T*4 + x)*0.6); R(x, yy+1, 3, 1, c); R(x+sw, yy+2, 2, 1, c); P(x+1+sw, yy+3, c); } } }
function banner(x, y, w, h, col, word, T, tcol = WHITE){ const sag = Math.round(Math.sin(T*1.6)); R(x, y+sag, w, h, col); R(x, y+sag, w, 1, 'rgba(255,255,255,.3)'); R(x, y+h-1+sag, w, 1, 'rgba(0,0,0,.25)');
  if(word){ const sc = textW(word, 2) <= w - 4 ? 2 : 1; text(x + Math.round((w - textW(word, sc))/2), y + sag + Math.round((h - 5*sc)/2), word, tcol, sc); } }
function sign(x, y, w, word, col = WHITE, tcol = NAVY){ R(x + w/2 - 1, y, 2, 14, '#6b4a2e'); R(x, y-9, w, 10, col); R(x, y-9, w, 1, 'rgba(0,0,0,.15)'); R(x, y, w, 1, 'rgba(0,0,0,.25)'); text(x + Math.round((w - textW(word))/2), y-7, word, tcol); }
function sparkle(x, y, T, k = 0, col = '#fff7c2'){ if(!blink(T + k*0.3, 3)) return; P(x, y, WHITE); P(x-1, y, col); P(x+1, y, col); P(x, y-1, col); P(x, y+1, col); }
function steam(x, y, T, n = 4, col = '#8a8f99', rise = 30){ for(let k = 0; k < n; k++){ const a = (T*0.6 + k/n) % 1, sx = x + Math.round(Math.sin(a*6 + k)*3 + a*6), sy = y - Math.round(a*rise), sz = 1 + Math.round(a*3);
  g.globalAlpha = 0.55*(1 - a); R(sx, sy, sz, sz, col); g.globalAlpha = 1; } }

// ---------- people: 15 px tall ----------
const SK = ['#f1c9a5','#d9a27a','#a8714a','#f6d7bd'];
export function person(x, y, o = {}, T = 0){
  const skin = o.skin || SK[0], shirt = o.shirt || '#2a63c9', pants = o.pants || '#2f3542', hair = o.hair || '#2b2017';
  const step = o.walk ? Math.floor(T*6 + x) % 2 : 0, bob = o.bob ? Math.round(Math.abs(Math.sin(T*(o.bob === true ? 5 : o.bob) + x))*1.5) : 0;
  y -= bob + (o.hop || 0);
  if(o.skirt){ R(x-1, y-5, 7, 4, o.skirt); R(x-2, y-2, 9, 1, o.skirt); R(x+1, y-1, 1, 1, '#1b1b1b'); R(x+3, y-1, 1, 1, '#1b1b1b'); }
  else if(o.kick){ const k = o.kick; R(x, y-4, 2, 4 - (k<0?1:0), pants); R(x+3, y-4, 2, 4 - (k>0?1:0), pants); R(x + (k<0?-1:0), y-1 - (k<0?1:0), 2, 1, '#1b1b1b'); R(x+3 + (k>0?1:0), y-1 - (k>0?1:0), 2, 1, '#1b1b1b'); }
  else { R(x, y-4, 2, 4 - step, pants); R(x+3, y-4, 2, 4 - (o.walk && !step ? 1 : 0), pants); R(x, y-1 + (step?-1:0), 2, 1, '#1b1b1b'); R(x+3, y-1 - (o.walk && !step ? 1 : 0), 2, 1, '#1b1b1b'); }
  R(x-1, y-10, 7, 6, shirt); if(!o.skirt) R(x-1, y-5, 7, 1, o.belt || pants);
  if(o.tie){ R(x+2, y-10, 1, 4, o.tie); if(o.flap) R(x+3, y-9, 2, 1, o.tie); }
  if(o.vest){ R(x-1, y-10, 2, 6, o.vest); R(x+4, y-10, 2, 6, o.vest); R(x-1, y-8, 7, 1, '#e8e8e8'); }
  if(o.sash) for(let k = 0; k < 6; k++) P(x-1 + k, y-10 + k, k % 2 ? YEL : RED);
  if(o.chain){ P(x+1, y-9, YEL); P(x+2, y-8, YEL); P(x+3, y-9, YEL); }
  const arm = o.arm, wav = Math.round(Math.sin(T*8 + x)*1.5);
  if(arm === 'up'){ R(x-2, y-14 + (wav>0?1:0), 1, 5, shirt); P(x-2, y-15 + (wav>0?1:0), skin); R(x+6, y-9, 1, 4, shirt); P(x+6, y-5, skin); }
  else if(arm === 'wave'){ R(x+6, y-13, 1, 4, shirt); P(x+6 + (wav>0?1:0), y-14, skin); R(x-2, y-9, 1, 4, shirt); P(x-2, y-5, skin); }
  else if(arm === 'point'){ R(x+6, y-9, 4, 1, shirt); P(x+10, y-9, skin); R(x-2, y-9, 1, 4, shirt); P(x-2, y-5, skin); }
  else if(arm === 'pointL'){ R(x-5, y-9, 4, 1, shirt); P(x-6, y-9, skin); R(x+6, y-9, 1, 4, shirt); P(x+6, y-5, skin); }
  else if(arm === 'sign' || arm === 'both'){ R(x-2, y-13, 1, 4, shirt); R(x+6, y-13, 1, 4, shirt); P(x-2, y-14, skin); P(x+6, y-14, skin); }
  else if(arm === 'hold'){ R(x+6, y-9, 3, 1, shirt); P(x+9, y-9, skin); R(x-2, y-9, 1, 4, shirt); P(x-2, y-5, skin); }
  else if(arm === 'disco'){ R(x+6, y-13, 1, 1, shirt); R(x+7, y-14, 1, 1, shirt); R(x+8, y-15, 1, 1, shirt); P(x+9, y-16, skin); R(x-2, y-9, 1, 4, shirt); P(x-2, y-5, skin); }
  else if(arm === 'discoL'){ R(x-2, y-13, 1, 1, shirt); R(x-3, y-14, 1, 1, shirt); R(x-4, y-15, 1, 1, shirt); P(x-5, y-16, skin); R(x+6, y-9, 1, 4, shirt); P(x+6, y-5, skin); }
  else if(arm === 'side'){ R(x-5, y-9, 4, 1, shirt); P(x-6, y-9, skin); R(x+6, y-9, 4, 1, shirt); P(x+10, y-9, skin); }
  else if(arm === 'shrug'){ R(x-3, y-11, 2, 1, shirt); P(x-4, y-12, skin); R(x+6, y-11, 2, 1, shirt); P(x+8, y-12, skin); }
  else { R(x-2, y-9, 1, 4, shirt); P(x-2, y-5, skin); R(x+6, y-9, 1, 4, shirt); P(x+6, y-5, skin); }
  if(o.case){ const cx = arm === 'hold' ? x+8 : x+5, cy = arm === 'hold' ? y-10 : y-5; R(cx, cy, 5, 4, '#5a3420'); R(cx, cy, 5, 1, '#7a4e2c'); P(cx+2, cy-1, '#3a2414'); }
  R(x, y-15, 5, 5, skin); P(x+1, y-13, '#1b1b1b'); P(x+3, y-13, '#1b1b1b');
  if(o.shades) R(x, y-13, 5, 1, INK);
  if(o.glasses){ R(x, y-13, 5, 1, o.glasses); P(x+1, y-13, WHITE); P(x+3, y-13, WHITE); }
  if(o.tash) R(x+1, y-12, 3, 1, o.tash);
  if(o.mouth) P(x+2, y-11, o.mouth);
  if(o.helmet){ R(x-1, y-17, 7, 2, o.helmet); R(x, y-18, 5, 1, o.helmet); }
  else if(o.cap){ R(x, y-17, 5, 2, o.cap); R(x+4, y-16, 3, 1, o.cap); }
  else if(o.tophat){ R(x-1, y-16, 7, 1, INK); R(x, y-20, 5, 4, INK); }
  else if(o.hat){ R(x-1, y-16, 7, 1, o.hat); R(x, y-18, 5, 2, o.hat); }
  else if(o.bald){ R(x, y-15, 1, 2, hair); R(x+4, y-15, 1, 2, hair); }
  else if(o.bun){ R(x, y-16, 5, 2, hair); R(x+1, y-18, 3, 2, hair); R(x-1, y-15, 1, 2, hair); R(x+5, y-15, 1, 2, hair); }
  else { R(x, y-16, 5, 2, hair); R(x, y-14, 1, 2, hair); if(o.long){ R(x-1, y-15, 1, 5, hair); R(x+5, y-15, 1, 5, hair); } }
  return {hx: x-2, hy: y-15 + (wav>0?1:0)};
}
// the cast, as on their portraits
export const CAST = {
  mayor:     {shirt:'#2a63c9', pants:'#2f3542', bald:true, hair:'#5a3b22', skin:SK[1], sash:true, mouth:'#7a3b2e'},
  heritage:  {hair:'#c0582e', long:true, glasses:'#3a3d44', shirt:'#4f7a3a', pants:'#5a4632'},
  brussels:  {shirt:'#2f3542', pants:'#2f3542', tie:RED, hair:'#e3c36b', skin:SK[3]},
  banker:    {shirt:'#4a5160', pants:'#3a3f4a', tie:'#7a1f2b', bald:true, hair:'#9aa0aa', skin:SK[3], glasses:'#3a3d44'},
  developer: {shirt:'#1b1f2a', pants:'#1b1f2a', hair:'#14141a', chain:true, skin:SK[0]},
  union:     {helmet:YEL, shirt:'#163f94', pants:'#3a4b6b', skin:SK[1], vest:'#e8762b'},
  neighbour: {bun:true, hair:'#b8b8b8', shirt:'#8a5cc4', skirt:'#5a4a7a', skin:SK[3]},
  farmer:    {cap:'#4f7a3a', shirt:'#6b8f3a', pants:'#5a4632', hair:'#5a3b22', tash:'#5a3b22', skin:SK[1]},
  suit:      {shirt:'#4a5160', pants:'#3a3f4a', tie:UNION, hair:'#2b2017', skin:SK[0]},
  worker:    {helmet:YEL, shirt:'#e8762b', vest:YEL, pants:'#3a4b6b', skin:SK[1]},
  local1:    {shirt:'#c62f28', pants:'#2f3542', hair:'#2b2017', long:true},
  local2:    {shirt:'#1d8148', pants:'#3a3d44', hair:'#c9a26b'},
  local3:    {shirt:'#e8762b', pants:'#2f3542', hair:'#5a3b22', skin:SK[2]},
};
const who = (k, x, y, extra = {}, T = 0) => person(x, y, {...CAST[k], ...extra}, T);
// The same little people, painted on another canvas (the crowd of the title screen)
export function paintPerson(ctx, x, y, o, T){ const keep = g; g = ctx; try{ return person(x, y, o, T); } finally { g = keep; } }

// =====================================================================
//  The scenes
// =====================================================================
const SCENES = {
  archaeology(T){ field(T, 1.3); tree(12, 52, T); tree(150, 50, T); tree(141, 53, T);
    R(40, 60, 70, 18, '#8c6544'); R(40, 60, 70, 2, '#a87d55'); R(42, 66, 66, 1, '#7a5135'); R(42, 71, 66, 1, '#6d4c35');
    for(let i = 0; i < 40; i++) P(42 + Math.floor(hsh(i,1,9)*64), 63 + Math.floor(hsh(i,2,9)*13), hsh(i,3,9) < 0.5 ? '#c29a6c' : '#6d4c35');
    R(38, 58, 4, 3, '#a87d55'); R(108, 58, 5, 3, '#a87d55');
    R(70, 67, 6, 6, '#c2703f'); R(71, 66, 4, 1, '#c2703f'); R(72, 64, 2, 2, '#a85d32'); R(69, 68, 1, 3, '#a85d32'); R(76, 68, 1, 3, '#a85d32'); R(71, 69, 4, 1, '#e0a070');
    R(82, 70, 2, 1, YEL); R(85, 71, 2, 1, '#e6b400'); R(88, 69, 2, 1, YEL); R(92, 70, 3, 1, RED); P(93, 69, '#d9dce2');
    sparkle(83, 68, T); sparkle(89, 67, T, 2);
    for(let x = 34; x < 118; x++) P(x, 55 + Math.round(Math.sin((x-34)/84*Math.PI)), Math.floor((x - T*4)/3) % 2 ? RED : WHITE);
    [34, 76, 117].forEach(x => R(x, 54, 1, 6, '#6b4a2e'));
    excavator(122, 66, T, true); who('worker', 28, 76, {}, T); R(34, 62, 1, 14, '#8a6446'); R(33, 75, 3, 2, '#9aa0aa');
    who('heritage', 60, 80, {arm:'point'}, T); const mx = 70 + Math.round(Math.sin(T*1.5));
    R(mx, 66, 4, 1, '#3a3d44'); R(mx, 69, 4, 1, '#3a3d44'); R(mx-1, 67, 1, 2, '#3a3d44'); R(mx+4, 67, 1, 2, '#3a3d44'); R(mx, 67, 4, 2, 'rgba(200,236,247,0.55)'); R(mx-2, 70, 2, 1, '#6b4a2e');
    bubble(57, 54, '!', T); },
  toad(T){ sky(['#a6cdea','#cfe3f3','#eef6fb'], 0, 44); cloud(60, 10, 26, T, 1); hills(44, '#8bbf52', '#7cb342', 4.2, 3); ground(50, '#7cb342', '#689f38');
    for(let y = 62; y < 82; y++){ const half = Math.round(Math.sqrt(Math.max(0, 1 - ((y-72)/10)**2))*34); for(let x = 80 - half; x < 80 + half; x++) P(x, y, Math.sin(x*0.4 + y*0.9 - T*3) > 0.85 ? '#c6ecf7' : (y < 66 ? '#5aaedb' : '#3f93c4')); }
    for(let k = 0; k < 12; k++){ const rx = 44 + Math.floor(hsh(k,5,3)*72), ry = 66 + Math.floor(hsh(k,6,3)*12); if(Math.abs(rx-80) < 18 && ry > 66) continue; const sw = Math.round(Math.sin(T*2 + k)*0.6); R(rx+sw, ry-6, 1, 6, '#4c8236'); P(rx+sw, ry-7, '#6b4a2e'); }
    g.save(); g.translate(80, 72); g.scale(2, 2); g.translate(-80, -72);
    const pulse = Math.floor(T*2) % 2, bl = Math.floor(T*1.3) % 6 === 0;
    R(72, 68, 16, 5, '#9d9488'); R(74, 66, 12, 2, '#b3aca1'); R(72, 72, 16, 1, '#7d766b');
    R(75, 60, 10, 6, '#8a7a3a'); R(76, 59, 8, 1, '#8a7a3a'); R(74, 64, 12, 2, '#7a6a30'); R(77, 60, 1, 4, '#d9c96a'); P(79, 61, '#5e5223'); P(82, 62, '#5e5223'); P(80, 64, '#5e5223');
    R(76, 58, 2, 2, '#8a7a3a'); R(82, 58, 2, 2, '#8a7a3a'); if(!bl){ P(76, 58, YEL); P(83, 58, YEL); P(77, 58, '#1b1b1b'); P(82, 58, '#1b1b1b'); }
    R(77, 65 - pulse, 6, 1 + pulse, '#e8dfa0'); g.restore();
    for(let x = 0; x < 40; x += 4) R(x, 50, 1, 10, '#c4bfb2'); R(0, 52, 40, 1, '#c4bfb2'); R(0, 56, 40, 1, '#c4bfb2');
    excavator(8, 66, T, true); who('suit', 36, 82, {helmet:WHITE, tie:RED}, T); R(43, 72, 4, 5, '#f2ecd9'); bubble(33, 58, '?', T);
    who('heritage', 130, 84, {arm:'sign'}, T); R(124, 58, 18, 10, WHITE); R(124, 58, 18, 1, GREEN); R(124, 67, 18, 1, GREEN); R(124, 58, 1, 10, GREEN); R(141, 58, 1, 10, GREEN);
    R(130, 61, 6, 3, '#8a7a3a'); P(130, 60, '#8a7a3a'); P(135, 60, '#8a7a3a'); R(127, 65, 12, 1, GREEN);
    const fx = 80 + Math.round(Math.cos(T*4)*14), fy = 42 + Math.round(Math.sin(T*8)*3); P(fx, fy, '#1b1b1b'); if(blink(T, 16)) P(fx-1, fy-1, WHITE); },
  // v0.12: the town hall screen — the hall, the square, the clerk's window with the blind half down
  hall(T){ sky(DAY, 0, 40); cloud(30, 6, 20, T); cloud(110, 12, 14, T, 0.7); townhall(30, 48, T); paving(48);
    R(70, 58, 20, 12, '#5a3c22'); R(72, 60, 16, 8, '#f4e6c2'); R(72, 60, 16, Math.round(3 + Math.sin(T)*1), '#9a8a6a');   // the counter window
    person(60, 74, {shirt:'#2a4f8c', bob:true}, T); person(104, 74, {shirt:'#7a5a3a', hair:'#c8c8c8'}, T*0.7); },
  election(T){ sky(DAY, 0, 40); cloud(30, 6, 20, T); townhall(30, 48, T); paving(48);
    // campaign posters on the arcade: your mayor and the rival with a scribbled moustache
    [[34, 24, '#2a63c9'], [118, 24, '#c62f28']].forEach(([x, y, c], k) => { R(x, y, 12, 16, WHITE); R(x, y, 12, 3, c); R(x+3, y+5, 6, 6, SK[k ? 0 : 1]); R(x+2, y+11, 8, 4, c); P(x+4, y+7, INK); P(x+7, y+7, INK); if(k) R(x+4, y+9, 4, 1, INK); });
    R(68, 64, 24, 3, '#a87d55'); R(70, 67, 2, 10, '#8c6544'); R(88, 67, 2, 10, '#8c6544');   // the table
    R(74, 54, 12, 10, '#e9eef7'); R(74, 54, 12, 1, '#9aa0aa'); R(77, 54, 6, 1, INK); text(76, 57, 'X', UNION);   // the ballot box
    const drop = (T*0.8) % 1; if(drop < 0.5) R(79, 46 + Math.round(drop*14), 3, 4, WHITE);
    who('mayor', 50, 82, {arm:'wave'}, T); R(55, 69, 3, 3, RED); P(56, 70, YEL);   // a rosette
    who('local1', 100, 84, {}, T); who('local2', 110, 85, {}, T); who('local3', 120, 86, {}, T); who('neighbour', 130, 86, {}, T);
    bubble(46, 58, '?', T); },
  lawsuit(T){ room('#e7dcc8', '#d8c9ad', '#8c6544', '#7a5135', 64); R(40, 6, 80, 4, '#6e5c44');
    R(54, 14, 52, 26, '#6e4a2e'); R(54, 14, 52, 2, '#8a5d3a'); R(60, 20, 40, 1, '#5a3b22');   // the bench
    person(76, 30, {shirt:'#14141a', pants:'#14141a', hair:'#e8e8e8', glasses:'#3a3d44', skin:SK[3]}, T);   // the judge
    const hit = Math.floor(T*2.5) % 4 === 0; R(88, hit ? 15 : 11, 6, 3, '#5a3b22'); R(90, hit ? 18 : 14, 2, 4, '#5a3b22'); if(hit){ P(86, 18, YEL); P(96, 18, YEL); P(91, 13, YEL); }
    R(6, 54, 30, 10, '#8c6544'); papers(10, 54, 7, 0.4); papers(22, 54, 5, -0.3);   // the files
    who('neighbour', 40, 84, {arm:'point'}, T); who('local2', 28, 86, {}, T); who('local3', 18, 87, {}, T);
    who('suit', 118, 84, {shirt:'#14203d', tie:YEL}, T); R(126, 74, 6, 5, '#5a3b22'); who('suit', 132, 85, {}, T); bubble(36, 60, '!', T); },
  inflation(T){ room('#e3e8ef', '#cfd7e3', '#9d978a', '#8a8478'); chart(14, 10, 52, 34, 1, T); text(18, 13, '+12%', RED);
    desk(78, 58, 60, '#5a3b22'); who('banker', 100, 62, {arm:'hold'}, T); moneyBag(118, 48); coins(84, 56, 3);
    // the cement sacks and a cup of coffee, all with price tags going up
    R(20, 70, 16, 12, '#c9c3b5'); R(20, 70, 16, 2, '#b3ac9b'); R(38, 72, 14, 10, '#c9c3b5'); R(62, 74, 6, 6, WHITE); R(68, 76, 2, 2, WHITE); R(63, 74, 4, 1, '#6b4a2e'); steam(64, 72, T, 3, '#c4cad6', 12);
    [[30, 64], [48, 66], [66, 68]].forEach(([x, y], k) => { const b = Math.round(Math.sin(T*3 + k)); R(x, y+b, 9, 5, YEL); text(x+1, y+b, '+', RED); P(x+6, y+2+b, RED); P(x+7, y+1+b, RED); }); },
  strike(T){ site(T); R(18, 66, 9, 11, '#5c6066'); R(18, 69, 9, 1, '#3a3d44'); R(18, 73, 9, 1, '#3a3d44'); R(18, 66, 9, 1, '#7d818a');
    for(let k = 0; k < 5; k++){ const fh = 3 + Math.round(Math.abs(Math.sin(T*9 + k*1.7))*4); R(19 + k*1.6, 66 - fh, 2, fh, k%2 ? YEL : '#e8762b'); }
    steam(22, 58, T, 6, '#8a8f99', 40);
    banner(52, 56, 56, 11, RED, label('strike'), T); R(48, 56, 1, 13, '#6b4a2e'); R(107, 56, 1, 13, '#6b4a2e');
    who('union', 46, 82, {arm:'up'}, T); who('union', 110, 82, {helmet:WHITE, arm:'up', skin:SK[0]}, T);
    who('union', 62, 86, {helmet:'#e8762b', skin:SK[2], arm:'wave', bob:true}, T); who('worker', 76, 86, {bob:true}, T); who('union', 90, 86, {skin:SK[3], arm:'up', bob:true}, T);
    who('union', 124, 84, {shirt:RED, bob:true}, T); who('union', 32, 84, {helmet:WHITE, skin:SK[0]}, T);
    R(130, 69, 4, 3, WHITE); R(134, 68, 2, 5, RED); if(blink(T, 3)){ P(137, 68, NAVY); P(138, 66, NAVY); P(137, 72, NAVY); P(138, 74, NAVY); } },
  delegation(T){ sky(['#7fb4e6','#a9cdf0','#d8e9f8'], 0, 40); cloud(30, 6, 20, T, 1.2); townhall(30, 48, T); flag(48, 2, 10, 6, T, 0, 12); flag(104, 2, 10, 6, T, 2, 12);
    R(56, 18, 48, 2, '#9d978a'); paving(48);
    for(let y = 50; y < 90; y++){ const w = 10 + Math.round((y - 50)*0.6); R(80 - w/2, y, w, 1, y % 3 ? '#b8282a' : RED); }
    [[4, 70], [128, 72]].forEach(([cx, cy], k) => { R(cx, cy-8, 28, 6, '#1b1f2a'); R(cx+5, cy-12, 16, 4, '#1b1f2a'); R(cx+7, cy-11, 5, 3, '#5d7fa8'); R(cx+14, cy-11, 5, 3, '#5d7fa8');
      R(cx+3, cy-3, 5, 3, '#0e0f12'); R(cx+20, cy-3, 5, 3, '#0e0f12'); flag(cx + (k ? 1 : 25), cy-17, 4, 3, T, k, 6); });
    who('banker', 60, 76, {tie:UNION, glasses:null}, T); R(53, 70, 5, 4, '#5a3b22');
    who('brussels', 70, 78, {arm:'point'}, T); who('suit', 92, 78, {skin:SK[1]}, T); R(98, 66, 3, 4, '#f2ecd9');
    who('mayor', 104, 84, {}, T);
    who('local3', 18, 88, {arm:'point'}, T); camera(27, 74, T); who('local2', 140, 88, {}, T); camera(134, 75, T, 1); },
  cofinance(T){ room('#dfe5ef', '#c7d2e3', '#9d978a', '#8a8478'); poster(14, 8, T); calendar(130, 10, 3); text(132, 28, '+4', RED);
    // the national vault, padlocked, with the money visible inside
    R(46, 16, 56, 46, '#7d818a'); R(48, 18, 52, 42, '#9aa0aa'); R(52, 22, 44, 34, '#5c6066'); coins(58, 50, 9); moneyBag(66, 38); moneyBag(80, 40, '#b38d55');
    for(let k = 0; k < 6; k++) R(52 + k*8, 22, 2, 34, '#c4c9d1');
    R(70, 52, 10, 8, YEL); R(72, 48, 6, 1, '#9aa0aa'); R(72, 48, 1, 4, '#9aa0aa'); R(77, 48, 1, 4, '#9aa0aa'); P(75, 55, INK);
    who('suit', 112, 82, {arm:'shrug', shirt:'#6e7584'}, T); who('banker', 26, 82, {}, T); bubble(110, 60, '?', T); },
  ribbon(T){ field(T, 2.1); for(let y = 64; y < 80; y++){ const w = 40 - Math.abs(y-72)*2; R(80 - w/2, y, w, 1, y < 68 ? '#6d4c35' : '#5a3b22'); }   // the hole
    R(56, 62, 1, 12, '#c4bfb2'); R(104, 62, 1, 12, '#c4bfb2'); for(let x = 57; x < 104; x++) P(x, 64 + Math.round(Math.sin((x-57)/47*Math.PI)*2), RED);
    R(78, 63, 5, 4, RED); P(77, 66, RED); P(83, 66, RED);   // the bow
    who('suit', 46, 82, {sash:true, tie:null, hair:'#7a7a7a', arm:'point'}, T); const sc = blink(T, 3) ? 1 : 0; R(56, 73 - sc, 6, 1, '#9aa0aa'); R(56, 75 + sc, 6, 1, '#9aa0aa'); R(54, 73, 2, 3, RED);
    who('mayor', 34, 83, {arm:'wave'}, T);
    who('local3', 116, 84, {}, T); camera(124, 72, T); who('local2', 132, 86, {}, T); camera(126, 78, T, 2); who('local1', 144, 85, {}, T); },
  influencer(T){ sky(['#f2b36b','#f6cf8f','#fbe8bf'], 0, 54); sun(118, 38, T, 7); hills(54, '#7cb342', '#689f38', 2.2, 2); grass(58);
    tree(20, 60, T); tree(34, 62, T); tree(140, 62, T); R(60, 68, 20, 2, '#8c6544'); R(62, 70, 2, 4, '#5a3b22'); R(76, 70, 2, 4, '#5a3b22');   // a bench
    who('neighbour', 84, 82, {arm:'hold'}, T); R(93, 64, 6, 10, INK); R(94, 65, 4, 7, '#f6cf8f'); P(95, 67, '#ffd200');
    // likes floating up
    for(let k = 0; k < 6; k++){ const a = (T*0.5 + k/6) % 1, x = 96 + Math.round(Math.sin(a*8 + k)*6) + k*3, y = 60 - Math.round(a*50);
      g.globalAlpha = 1 - a; const c = k % 2 ? RED : '#ff7a9a'; R(x, y, 2, 2, c); R(x+3, y, 2, 2, c); R(x, y+1, 5, 1, c); R(x+1, y+2, 3, 1, c); P(x+2, y+3, c); g.globalAlpha = 1; }
    who('local1', 40, 84, {walk:true}, T); },
  discount(T){ field(T, 0.7); for(let k = 0; k < 9; k++) R(10 + k*16, 56, 1, 8, '#8c6544'); R(10, 58, 130, 1, '#8c6544');
    for(let y = 60; y < 78; y += 3) R(20, y, 90, 1, '#7a5135');   // ploughed rows
    sign(112, 66, 30, label('sale'), WHITE, RED);
    who('farmer', 44, 84, {arm:'point'}, T); who('farmer', 56, 85, {cap:'#8a5cc4', shirt:'#c9a26b', tash:null}, T); who('farmer', 68, 84, {cap:RED, shirt:'#5d7fa8'}, T);
    R(80, 66, 14, 8, YEL); text(81, 67, '-40', RED); bubble(88, 54, '€', T); },
  template(T){ room(); poster(10, 8, T); windowCity(120, 8, 30, 22, T);
    // the printer printing the template of the template
    R(66, 40, 30, 14, '#c4c9d1'); R(66, 40, 30, 2, '#9aa0aa'); R(70, 44, 22, 2, INK);
    const p = (T*0.7) % 1; R(71, 46 + Math.round(p*10), 20, 12, WHITE); R(73, 48 + Math.round(p*10), 16, 8, '#c7d2e3'); R(75, 50 + Math.round(p*10), 12, 4, WHITE); R(77, 51 + Math.round(p*10), 8, 2, '#c7d2e3');
    desk(14, 62, 44); papers(18, 62, 9, 0.5); papers(32, 62, 12, -0.4); papers(44, 62, 7, 0.2);
    who('brussels', 104, 84, {arm:'sign'}, T); R(101, 63, 12, 9, WHITE); R(103, 65, 8, 5, '#c7d2e3'); R(105, 66, 4, 3, WHITE); },
  devOffer(T){ field(T, 3.3); R(30, 8, 46, 40, NAVY); R(32, 10, 42, 36, '#a6cdea');   // the render billboard: a luxury tower
    R(44, 16, 16, 30, '#e9eef7'); for(let f = 0; f < 6; f++) R(46, 18 + f*4, 12, 2, '#5d7fa8'); R(42, 14, 20, 2, YEL); R(36, 40, 34, 6, '#7cb342'); sparkle(62, 18, T); sparkle(38, 24, T, 2);
    R(40, 48, 2, 10, '#6b4a2e'); R(64, 48, 2, 10, '#6b4a2e');
    who('developer', 96, 84, {arm:'hold'}, T); R(106, 70, 14, 9, '#5a3b22'); R(106, 70, 14, 1, '#3a2716'); for(let k = 0; k < 4; k++) R(107 + k*3, 72, 2, 5, GREEN);   // the briefcase of cash
    sparkle(112, 68, T, 1); bubble(98, 58, '€', T); who('mayor', 130, 84, {}, T); },
  crash(T){ site(T); R(70, 22, 40, 34, '#9d978a'); chart(8, 8, 50, 30, -1, T);
    sign(116, 68, 32, label('sale'), WHITE, RED); sign(18, 72, 32, label('sale'), WHITE, RED);
    who('banker', 82, 84, {arm:'shrug'}, T); who('developer', 64, 86, {}, T);
    const a = (T*0.7) % 1; R(98, 30 + Math.round(a*30), 3, 6, RED); R(97, 35 + Math.round(a*30), 5, 1, RED); R(98, 36 + Math.round(a*30), 3, 1, RED); P(99, 37 + Math.round(a*30), RED); },
  loanCall(T){ room('#e3e8ef', '#cfd7e3', '#9d978a', '#8a8478'); windowCity(16, 8, 40, 26, T); clock(132, 14, T);
    desk(60, 58, 70, '#5a3b22'); phone(80, 52, T); R(100, 52, 10, 6, WHITE); papers(114, 58, 3);
    who('banker', 92, 56, {arm:'hold'}, T); bubble(100, 32, '€', T); who('suit', 20, 86, {}, T); bubble(18, 64, '!', T); },
  fiesta(T){ sky(DUSK, 0, 54);
    for(let k = 0; k < 30; k++){ const x = Math.floor(hsh(k,1,7)*EW), y = Math.floor(hsh(k,2,7)*30); if(hsh(k,3,7) + Math.sin(T*2 + k)*0.2 > 0.6) P(x, y, WHITE); }
    [[40, 16, 0], [112, 10, 0.33], [78, 22, 0.66]].forEach(([fx, fy, off], k) => { const a = (T*0.45 + off) % 1, cols = [[YEL,'#fff7c2'], ['#e8442e','#ffb3a8'], ['#5aaedb','#c6ecf7']][k];
      if(a < 0.25){ const yy = 60 - Math.round(a/0.25*(60 - fy)); P(fx, yy, '#fff7c2'); P(fx, yy+1, '#e6b400'); }
      else { const r = (a - 0.25)/0.75, rad = Math.round(Math.sqrt(r)*17); g.globalAlpha = Math.max(0, 1 - r*r);
        for(let s = 0; s < 16; s++){ const an = s/16*Math.PI*2; P(fx + Math.round(Math.cos(an)*rad), fy + Math.round(Math.sin(an)*rad) + Math.round(r*3), cols[s%2]); if(rad > 3) P(fx + Math.round(Math.cos(an)*(rad-2)), fy + Math.round(Math.sin(an)*(rad-2)) + Math.round(r*3), cols[0]); }
        g.globalAlpha = 1; } });
    church(10, 56, T); house(46, 56, 22, 16); house(120, 56, 34, 26);
    ground(56, '#c3b192', '#b6ae9c'); const BC = [RED, YEL, '#2a63c9', GREEN, WHITE]; bunting(36, 120, 30, 8, T, BC); bunting(64, 158, 38, 6, T, BC);
    R(124, 58, 30, 14, WHITE); for(let x = 124; x < 154; x += 6) R(x, 58, 3, 3, RED); R(127, 66, 24, 7, '#a87d55'); R(130, 64, 6, 2, '#e6b400'); R(138, 64, 4, 2, '#e6b400');
    const sw = Math.floor(T*4) % 2;
    who('local1', 54 + sw, 82, {arm:'up', bob:true}, T); who('local2', 64 - sw, 82, {shirt:WHITE, arm:'up', bob:true, belt:RED}, T);
    who('local2', 84 + sw, 84, {long:true, arm:'wave', bob:true}, T); who('mayor', 94 - sw, 84, {bob:true}, T);
    person(20, 84, {shirt:'#f2ecd9', pants:'#3a3d44', skin:SK[1], arm:'point', hat:INK}, T); R(26, 72, 5, 1, '#c9a26b'); R(30, 71, 2, 3, '#e6b400');
    if(blink(T, 4)){ P(34, 69, '#fff7c2'); P(36, 67, '#fff7c2'); } else { P(35, 70, '#fff7c2'); P(37, 68, '#fff7c2'); }
    who('local3', 112, 86, {}, T); who('neighbour', 6, 88, {arm:'wave'}, T); },
  oldTown(T){ sky(DAY, 0, 30); cloud(50, 4, 24, T);
    for(let k = 0; k < 4; k++){ const x = k*40, w = 40, h = 46 + (k%2)*6; R(x, 58 - h, w, h, ['#e8c9a0','#f1e3c8','#e3b48c','#efd9b5'][k]); R(x, 58 - h - 3, w, 3, '#a85d32');
      for(let f = 0; f < 3; f++){ R(x+6, 58 - h + 6 + f*14, 8, 9, '#5d7fa8'); R(x+24, 58 - h + 6 + f*14, 8, 9, '#5d7fa8'); balcony(x+4, 58 - h + 14 + f*14, 12, f < 2 && (k + f) % 2 === 0 ? WHITE : null, T, k*3+f); balcony(x+22, 58 - h + 14 + f*14, 12, f < 2 && (k + f) % 2 ? '#ffe9a8' : null, T, k*3+f+1); } }
    paving(58); for(let k = 0; k < 5; k++){ const x = 6 + k*32; R(x, 32, 14, 1, INK); for(let i = 0; i < 4; i++) R(x + 2 + i*3, 34 + ((k+i)%2), 2, 2, RED); }
    who('neighbour', 30, 84, {arm:'up'}, T); who('local3', 46, 85, {arm:'up', bob:true}, T); who('local1', 62, 84, {bob:true}, T); who('local2', 78, 86, {arm:'up'}, T); who('farmer', 96, 85, {arm:'up', bob:true}, T); who('local3', 114, 86, {shirt:'#8a5cc4'}, T);
    bubble(24, 60, '!', T); },
  busStrike(T){ sky(GREY, 0, 50); hills(50, '#8bbf52', '#7cb342', 1.1, 2); ground(56, '#7cb342', '#689f38'); R(0, 70, EW, 12, '#5c6066'); for(let x = 0; x < EW; x += 12) R(x, 75, 6, 1, '#f1efe6');
    bus(60, 80, '#2a63c9', T); R(66, 60, 30, 4, RED); text(68, 60, 'X', WHITE); R(100, 62, 6, 3, RED);
    R(18, 44, 2, 26, '#9aa0aa'); R(12, 40, 14, 6, '#2a63c9'); text(14, 41, 'BUS', WHITE);   // the stop
    who('worker', 22, 68, {}, T); who('union', 32, 68, {arm:'shrug'}, T); who('worker', 42, 68, {helmet:WHITE}, T);
    clock(140, 20, T); bubble(30, 46, '?', T); },
  sharedClinic(T){ sky(DAY, 0, 44); cloud(80, 6, 24, T); hills(44, '#8bbf52', '#7cb342', 2.7, 2); paving(60); clinic(57, 60);
    who('mayor', 40, 82, {arm:'point'}, T); who('mayor', 108, 82, {shirt:GREEN, hair:'#2b2017', arm:'pointL', sash:true}, T);
    for(let k = 0; k < 4; k++) who(['local1','local2','local3','neighbour'][k], 4 + k*8, 88, {}, T);
    for(let k = 0; k < 3; k++) who(['local2','farmer','local3'][k], 128 + k*10, 88, {}, T);
    bubble(110, 60, '€', T); },
  derby(T){ sky(DAY, 0, 30); for(let x = 0; x < EW; x++) R(x, 18, 1, 14, (x % 4 < 2) ? '#8a9bb5' : '#7d8ea8');   // the stands
    for(let k = 0; k < 40; k++){ const x = (k*4) % EW, y = 20 + (k % 3)*4, j = Math.round(Math.abs(Math.sin(T*6 + k))*1); R(x, y - j, 2, 2, k < 20 ? RED : '#2a63c9'); }
    ground(32, '#5fa83a', '#57a033'); for(let x = 0; x < EW; x += 16) R(x, 32, 8, EH-32, 'rgba(255,255,255,.05)');
    R(0, 58, EW, 1, WHITE); R(79, 32, 1, EH-32, WHITE); for(let a = 0; a < 40; a++) P(80 + Math.round(Math.cos(a/40*Math.PI*2)*12), 58 + Math.round(Math.sin(a/40*Math.PI*2)*6), WHITE);
    const bx = 80 + Math.round(Math.sin(T*1.3)*30), by = 60 - Math.round(Math.abs(Math.sin(T*3))*14); R(bx, by, 3, 3, WHITE); P(bx+1, by+1, INK);
    who('local1', 50, 84, {shirt:RED, arm:'up', bob:true}, T); who('local3', 62, 86, {shirt:RED, bob:true}, T); who('local2', 96, 84, {shirt:'#2a63c9', arm:'up', bob:true}, T); who('farmer', 108, 86, {shirt:'#2a63c9', bob:true}, T);
    who('mayor', 76, 88, {arm:'shrug'}, T); },
  boundary(T){ field(T, 4.4); for(let k = 0; k < 10; k++) R(78, 56 + k*3, 2, 2, '#8c6544'); R(76, 52, 6, 4, WHITE); text(77, 53, '?', RED);
    // the map drawn in crayon, pulled from both sides
    const tug = Math.round(Math.sin(T*2)*2); R(56 + tug, 62, 46, 16, '#fbf8ee'); R(56 + tug, 62, 46, 1, '#c4bcaa');
    for(let k = 0; k < 40; k++) P(60 + tug + k, 66 + Math.round(Math.sin(k*0.4)*2), GREEN); for(let k = 0; k < 10; k++) P(78 + tug + Math.round(Math.sin(k)*1), 64 + k, RED); R(66 + tug, 72, 4, 3, '#e6b400'); R(88 + tug, 70, 4, 3, '#2a63c9');
    who('mayor', 40 + tug, 84, {arm:'point'}, T); who('mayor', 112 + tug, 84, {shirt:GREEN, hair:'#2b2017', arm:'pointL'}, T); bubble(118, 58, '!', T); },
  twinning(T){ sky(DAY, 0, 50); cloud(20, 6, 24, T); paving(50); flag(40, 12, 14, 9, T, 0, 40, ['#8a5cc4', '#ffd200']); flag(104, 12, 14, 9, T, 1.5, 40, ['#e8762b', '#5aaedb']);   // two made-up towns, two made-up flags
    R(62, 22, 36, 14, WHITE); R(62, 22, 36, 2, UNION); text(66, 26, '+', RED); R(72, 27, 4, 4, '#8a5cc4'); R(82, 27, 4, 4, '#e8762b'); text(90, 26, '+', GREEN);
    who('mayor', 70, 84, {arm:'point'}, T); who('mayor', 82, 84, {shirt:GREEN, hair:'#c9a26b', bald:false, arm:'pointL'}, T);
    who('brussels', 100, 86, {}, T); who('local3', 24, 86, {}, T); camera(32, 73, T); },
  consultants(T){ room('#e9edf3', '#d6dde8', '#7d818a', '#6e7280'); R(30, 6, 70, 40, WHITE); R(28, 4, 74, 2, '#5c6066');
    const s = Math.floor(T*0.7) % 4; text(34, 10, ['SMART','SYNERGY','2040','HUB'][s], NAVY);
    if(s === 0){ for(let k = 0; k < 5; k++) R(36 + k*12, 40 - (k+1)*4, 8, (k+1)*4, GREEN); } else if(s === 1){ R(40, 20, 16, 16, '#5aaedb'); R(54, 20, 16, 16, YEL); R(54, 20, 2, 16, GREEN); }
    else if(s === 2){ for(let k = 0; k < 4; k++) R(36, 20 + k*5, 50 - k*8, 3, k%2 ? '#9aa0aa' : UNION); } else { R(48, 18, 22, 22, YEL); R(59, 18, 11, 11, RED); R(48, 29, 11, 11, '#2a63c9'); }
    text(88, 38, String(1 + Math.floor(T*0.7) % 40), '#9aa0aa'); R(70, 46, 2, 14, '#5c6066');
    desk(10, 66, 140, '#6e5c44'); laptop(20, 50, T); laptop(118, 50, T, 1);
    who('developer', 52, 66, {shirt:'#4a5160', chain:false, tie:'#e8762b', hair:'#c9a26b'}, T); who('suit', 98, 66, {arm:'point', tie:'#e8762b'}, T); who('mayor', 76, 66, {}, T); bubble(78, 40, '?', T); },
  cousin(T){ site(T); R(96, 66, 22, 12, '#9aa0aa'); R(98, 60, 16, 8, '#c4c9d1'); R(100, 58, 12, 2, '#9aa0aa'); R(98, 78, 4, 4, INK); R(112, 78, 4, 4, INK);   // a concrete mixer
    const sp = Math.floor(T*4) % 4; R(103 + sp, 62, 2, 4, '#7d818a');
    person(104, 58, {helmet:WHITE, shirt:'#f2ecd9', pants:'#c9a26b', shades:true, chain:true, skin:SK[1], arm:'wave'}, T);
    who('mayor', 64, 84, {arm:'point'}, T); who('union', 30, 84, {arm:'shrug'}, T); bubble(58, 62, '!', T); },
  journalist(T){ room('#e7e4dc', '#d6d1c4', '#7d818a', '#6e7280'); windowCity(110, 6, 40, 30, T, false);
    desk(10, 58, 80, '#5a3b22'); R(20, 46, 18, 12, '#3a3d44'); R(22, 48, 14, 8, '#a6cdea'); for(let k = 0; k < 3; k++) R(24, 50 + k*2, 10 - k*2, 1, NAVY); R(26, 58, 6, 2, '#3a3d44');
    phone(56, 52, T); papers(70, 58, 6, 0.3); newspaper(110, 46, 34, 24, '', T);
    who('local1', 46, 84, {arm:'hold', glasses:'#3a3d44'}, T); R(55, 72, 4, 6, WHITE); R(55, 72, 4, 1, RED); bubble(42, 60, '?', T); },
  scooters(T){ sky(DAY, 0, 58); cloud(40, 6, 30, T); house(4, 58, 36, 22); house(112, 58, 44, 26, '#e8c9a0'); paving(58);
    for(let k = 0; k < 8; k++) scooter(40 + k*9, 78, k % 3 ? GREEN : '#2a63c9');
    R(46, 62, 66, 2, GREEN); who('brussels', 120, 86, {arm:'pointL'}, T); moneyBag(134, 70); who('mayor', 22, 86, {}, T); bubble(18, 64, '?', T); },
  survey(T){ field(T, 5.1); tree(140, 52, T); tree(12, 54, T);
    R(50, 54, 1, 22, '#5a3b22'); R(56, 54, 1, 22, '#5a3b22'); R(53, 54, 1, 22, '#5a3b22'); R(49, 50, 9, 4, YEL); R(57, 51, 3, 2, '#3a3d44');   // the theodolite
    for(let k = 0; k < 7; k++) R(118, 50 + k*4, 2, 4, k % 2 ? RED : WHITE);   // the ranging pole
    R(60, 52, 58, 1, 'rgba(198,40,40,.35)'); if(blink(T, 2)) P(118, 52, RED);
    who('heritage', 36, 82, {arm:'point'}, T); R(30, 68, 5, 6, '#f2ecd9'); who('worker', 122, 82, {arm:'hold'}, T); who('mayor', 80, 84, {arm:'shrug'}, T); },
  consultantsReport(T){ room('#e9edf3', '#d6dde8', '#7d818a', '#6e7280'); poster(10, 8, T);
    desk(30, 62, 100, '#6e5c44'); R(62, 46, 36, 16, NAVY); R(62, 46, 36, 2, '#2a63c9'); R(64, 48, 32, 12, '#163f94'); text(68, 51, '2040', YEL); R(94, 46, 2, 16, RED);   // the roadmap, bound
    sparkle(60, 44, T); sparkle(100, 46, T, 2); sparkle(80, 40, T, 4);
    const m = Math.abs(Math.sin(T*1.2))*10; R(110 - m, 14, 12, 12, 'rgba(90,174,219,.85)'); R(120 + m, 14, 12, 12, 'rgba(242,194,48,.85)');   // synergies
    who('developer', 20, 84, {shirt:'#4a5160', chain:false, tie:'#e8762b', hair:'#c9a26b', arm:'point'}, T); who('brussels', 138, 84, {arm:'wave'}, T); },
  cousinScandal(T){ site(T); R(56, 66, 40, 12, '#e8eef6'); R(56, 66, 40, 2, WHITE); R(58, 68, 36, 6, '#5aaedb');   // the jacuzzi
    for(let k = 0; k < 7; k++){ const a = (T*1.5 + k/7) % 1; g.globalAlpha = 1 - a; R(60 + k*5, 67 - Math.round(a*8), 2, 2, WHITE); g.globalAlpha = 1; }
    R(72, 60, 5, 5, SK[1]); R(72, 62, 5, 1, INK); R(71, 58, 7, 2, WHITE); R(78, 64, 4, 2, SK[1]); R(80, 60, 2, 4, '#c9e8f5');   // the cousin, sunglasses on, a drink
    who('neighbour', 20, 84, {arm:'point'}, T); who('local2', 32, 86, {}, T); newspaper(112, 58, 30, 22, '', T); bubble(18, 60, '!', T); },
  frontPage(T){ R(0, 0, EW, EH, '#3a3d44'); for(let k = 0; k < 8; k++) R(k*20, 0, 1, EH, '#34373d');
    newspaper(30, 6, 100, 78, '', T); R(34, 15, 92, 10, RED); { const w = label('scandal'), sc = textW(w, 2) <= 88 ? 2 : 1; text(80 - Math.round(textW(w, sc)/2), 20 - Math.round(5*sc/2), w, WHITE, sc); }
    // the photo, from a bad angle (from below, mid-sneeze)
    R(34, 30, 40, 36, '#c7d2e3'); R(44, 44, 20, 22, SK[1]); R(46, 46, 16, 3, INK); R(48, 56, 12, 4, '#7a3b2e'); R(50, 40, 8, 5, SK[1]); R(42, 62, 24, 4, '#2a63c9');
    for(let k = 0; k < 8; k++) R(78, 32 + k*4, 46 - (k%3)*6, 2, '#9aa0aa');
    if(blink(T, 1.5)){ g.globalAlpha = .2; R(30, 6, 100, 78, WHITE); g.globalAlpha = 1; } },
  scooterChaos(T){ sky(DAY, 0, 60); church(6, 60, T); R(100, 30, 50, 30, '#e3b48c'); R(98, 27, 54, 4, '#a85d32'); for(let k = 0; k < 4; k++) R(104 + k*12, 38, 6, 8, '#5d7fa8');   // the school
    scooter(122, 27, GREEN, 1); paving(60);
    R(54, 66, 34, 10, '#9aa0aa'); R(56, 66, 30, 6, '#5aaedb'); R(68, 56, 6, 10, '#9aa0aa'); for(let k = 0; k < 4; k++){ const a = (T + k/4) % 1; P(70 + k - 2, 54 - Math.round(Math.sin(a*Math.PI)*6), '#c6ecf7'); }
    g.save(); g.translate(64, 70); g.rotate(-0.5); g.translate(-64, -70); scooter(58, 70, '#2a63c9'); g.restore();
    scooter(18, 64, GREEN, 2); scooter(30, 84, GREEN); scooter(132, 84, '#2a63c9');
    const fx = ((T*30) % 200) - 20; scooter(fx, 20 + Math.round(Math.sin(T*3)*3), GREEN);   // and one flying past
    who('neighbour', 96, 86, {arm:'up'}, T); bubble(92, 62, '!', T); },
  surveyResult(T){ field(T, 6.2); R(10, 70, 140, 3, '#a87d55'); R(12, 73, 2, 8, '#8c6544'); R(146, 73, 2, 8, '#8c6544');   // the display table
    R(18, 56, 22, 14, '#c2703f'); R(20, 52, 18, 4, '#c2703f'); R(23, 50, 12, 2, '#c2703f'); R(24, 60, 10, 10, '#3a2716'); steam(29, 48, T, 3, '#c4cad6', 14);   // the bread oven
    R(52, 52, 8, 18, '#b3aca1'); R(51, 50, 10, 2, '#9d9488'); R(66, 56, 7, 14, '#b3aca1'); R(65, 54, 9, 2, '#9d9488'); text(53, 58, 'I', '#7d766b'); text(67, 60, 'V', '#7d766b');   // the milestones
    R(110, 36, 16, 34, RED); R(112, 38, 12, 4, '#a3241e'); for(let k = 0; k < 3; k++) R(112, 44 + k*8, 12, 6, '#a6cdea'); R(114, 39, 8, 2, WHITE);   // the phone box
    if(blink(T, 1, 1, 3)){ P(118, 30, YEL); P(116, 32, YEL); P(120, 32, YEL); }
    who('heritage', 88, 86, {arm:'up', bob:true}, T); who('mayor', 136, 88, {arm:'shrug'}, T); },
  potholes(T){ sky(DAY, 0, 44); hills(44, '#8bbf52', '#7cb342', 3.7, 2); grass(50); R(0, 58, EW, 26, '#5c6066'); for(let x = 0; x < EW; x += 14) R(x, 70, 7, 1, '#f1efe6');
    [[20, 62, 14], [60, 74, 10], [108, 64, 24]].forEach(([x, y, w], k) => { R(x, y, w, 6, '#3a3d44'); R(x+1, y+1, w-2, 4, k === 2 ? '#3f93c4' : '#2b2f36'); });
    duck(112, 65, T); duck(122, 66, T, 2);
    lorry(((T*25) % 220) - 50, 84, T); who('neighbour', 140, 56, {arm:'point'}, T); bubble(136, 34, '!', T); },
  riverRise(T){ sky(RAIN, 0, 46); cloud(10, 4, 40, T, 0.5, '#9aa6b6'); cloud(90, 8, 50, T, 0.3, '#8d9ab0'); hills(46, '#7cb342', '#689f38', 2.6, 2); grass(52);
    const lv = Math.round(Math.sin(T*0.5)*2); water(0, 62 - lv, EW, EH - 62 + lv, T); for(let x = 30; x < 130; x++) if(hsh(x, 1, 5) > 0.7) P(x, 61 - lv, '#c6ecf7');
    for(let k = 0; k < 10; k++) R(16 + k*7, 58, 6, 4, '#c9b48a'); for(let k = 0; k < 9; k++) R(19 + k*7, 55, 6, 4, '#d9c49a');   // sandbags
    R(122, 44, 2, 22, '#8c6544'); R(118, 40, 10, 6, WHITE); text(119, 41, '?', RED); duck(86, 66 - lv, T); duck(98, 68 - lv, T, 3);
    who('mayor', 40, 54, {arm:'hold'}, T); R(38, 31, 13, 3, RED); R(40, 29, 9, 2, RED); R(44, 34, 1, 8, INK);   // under an umbrella
    who('worker', 60, 54, {arm:'both'}, T); rain(T, 50); },
  heatwave(T){ sky(['#f7b26b','#f9cf8a','#fbe7b5'], 0, 56); sun(30, 18, T, 8); paving(58);
    crane(120, 60, 42, T); for(let x = 82; x < 136; x++) for(let y = 76; y < 86; y++) if(dith(x, y) < 0.6) P(x, y, 'rgba(60,40,20,.25)');   // the crane's shadow
    for(let y = 40; y < 58; y += 3) for(let x = 0; x < EW; x += 2) if(Math.sin(x*0.3 + y + T*6) > 0.9) P(x, y, 'rgba(255,255,255,.4)');   // heat haze
    who('neighbour', 96, 84, {}, T); who('farmer', 106, 85, {cap:WHITE}, T); who('neighbour', 116, 84, {hair:'#e8e8e8', shirt:'#5aaedb'}, T); who('local2', 126, 86, {hair:'#e8e8e8'}, T);
    R(14, 50, 6, 26, WHITE); R(15, 70, 4, 5, RED); R(16, 54, 2, 18, RED); text(22, 52, '41°', RED); who('mayor', 52, 84, {arm:'shrug'}, T); },
  filmCrew(T){ sky(DAY, 0, 58); church(8, 58, T); house(44, 58, 24, 18); paving(58);
    R(104, 52, 4, 30, '#3a3d44'); R(100, 60, 1, 22, '#3a3d44'); R(110, 60, 1, 22, '#3a3d44'); R(96, 44, 18, 10, INK); R(98, 40, 6, 4, INK); R(108, 40, 6, 4, INK); R(92, 46, 4, 5, '#5c6066');   // the film camera
    const snap = Math.floor(T*1.5) % 3 === 0; R(124, 62, 14, 8, INK); for(let k = 0; k < 4; k++) R(125 + k*4, 62, 2, 8, WHITE); R(124, snap ? 60 : 56, 14, 3, INK); if(snap){ P(122, 58, YEL); P(140, 58, YEL); }
    person(56, 86, {shirt:'#8a5cc4', skirt:'#8a5cc4', bun:true, hair:'#c0582e'}, T); R(53, 78, 12, 7, '#8a5cc4');   // a crinoline
    person(68, 86, {shirt:INK, pants:INK, tophat:true, tash:'#2b2017'}, T);
    who('developer', 136, 86, {chain:false, cap:RED, arm:'point'}, T); R(80, 76, 4, 4, '#5c6066'); bubble(132, 62, '!', T); },
  audit(T){ room('#e3e8ef', '#cfd7e3', '#c4bcaa', '#b3ab98'); poster(70, 8, T); clock(130, 14, T);
    for(let k = 0; k < 3; k++){ const x = 30 + k*16; person(x, 82, {shirt:'#14203d', pants:'#14203d', tie:'#5c6066', hair:['#2b2017','#9aa0aa','#c9a26b'][k], glasses: k === 1 ? '#3a3d44' : null, skin:SK[k === 2 ? 1 : 3]}, T); R(x+7, 70, 6, 5, '#1b1b1b'); R(x+1, 69, 1, 3, YEL); }
    who('mayor', 108, 84, {arm:'shrug'}, T); papers(122, 84, 6, 0.2); bubble(104, 62, '!', T); },
  ct_mayor(T){ room(); windowCity(16, 6, 34, 26, T); calendar(130, 8, 8);
    desk(56, 60, 80, '#6e5c44'); for(let k = 0; k < 4; k++) block(64 + k*16, 60, 10, 10 + (k%2)*4, k < 2 ? '#e9eef7' : '#c7d2e3', 2);   // the model of the blocks
    who('mayor', 34, 84, {arm:'point'}, T); bubble(30, 62, '!', T); },
  ct_brussels(T){ room(); poster(14, 8, T); windowCity(120, 8, 30, 22, T);
    desk(40, 60, 80); papers(48, 60, 6); papers(60, 60, 4); R(84, 52, 14, 8, WHITE);
    const w = Math.round(Math.sin(T*6)*2); R(88 + w, 46, 1, 8, '#e6b400'); P(88 + w, 54, INK); for(let k = 0; k < 6 + w; k++) P(86 + k, 57, '#9aa0aa');   // the pencil
    who('brussels', 100, 60, {arm:'hold'}, T); R(30, 40, 10, 6, RED); text(31, 41, 'OK', WHITE); },
  ct_neighbour(T){ field(T, 7.3); tree(30, 58, T); tree(120, 56, T); tree(140, 60, T);
    for(let k = 0; k < 3; k++){ const x = 46 + k*24; R(x, 70, 14, 2, '#8c6544'); R(x+1, 72, 1, 3, '#5a3b22'); R(x+12, 72, 1, 3, '#5a3b22'); }   // the benches, sketched
    for(let x = 40; x < 120; x++) if(dith(x, 66) > 0.5) P(x, 66, 'rgba(255,255,255,.6)');
    who('neighbour', 24, 86, {arm:'hold'}, T); R(32, 70, 7, 9, WHITE); for(let k = 0; k < 4; k++) R(33, 72 + k*2, 5, 1, '#9aa0aa');
    who('local1', 128, 86, {arm:'up'}, T); who('local3', 140, 88, {}, T); who('local2', 108, 88, {}, T); bubble(22, 62, '♥', T); },
  ct_union(T){ site(T, true); clock(18, 14, T);
    who('union', 40, 84, {arm:'up'}, T); who('worker', 54, 84, {walk:true}, T); who('worker', 120, 84, {helmet:WHITE, walk:true}, T); who('union', 134, 84, {}, T); bubble(36, 62, '+', T); },
  ct_developer(T){ room('#e3e8ef', '#cfd7e3', '#6e5c44', '#5a3b22'); windowCity(60, 6, 40, 26, T, true);
    desk(30, 58, 100, '#3a2716'); who('developer', 46, 58, {}, T); who('mayor', 108, 58, {}, T);
    // under the table, an envelope changes hands
    const a = (Math.sin(T*1.5) + 1)/2; R(60 + Math.round(a*30), 76, 10, 6, '#f2ecd9'); R(60 + Math.round(a*30), 76, 10, 1, '#c4bcaa'); P(65 + Math.round(a*30), 78, RED);
    R(56, 76, 6, 2, SK[0]); R(98, 76, 6, 2, SK[1]); sparkle(80, 74, T); },
  ct_banker(T){ room('#e3e8ef', '#cfd7e3', '#9d978a', '#8a8478'); chart(14, 8, 46, 28, 1, T);
    desk(66, 60, 80, '#5a3b22'); who('banker', 104, 60, {arm:'hold'}, T);
    R(78, 48, 14, 12, '#ff9ab0'); R(80, 46, 3, 2, '#ff9ab0'); R(89, 46, 3, 2, '#ff9ab0'); P(81, 52, INK); R(92, 52, 2, 3, '#ff9ab0'); R(82, 48, 4, 1, '#d96a86');   // the piggy bank
    const c = (T*0.8) % 1; if(c < 0.6) R(83, 38 + Math.round(c*14), 4, 2, YEL);
    R(130, 40, 10, 10, YEL); R(132, 50, 6, 4, YEL); R(128, 54, 14, 3, '#c99a12'); sparkle(134, 38, T); },
};
// any event without a scene of its own gets its speaker in an office
const FALLBACK = (char) => (T) => { room(); poster(14, 8, T); windowCity(120, 8, 30, 22, T); desk(50, 60, 60); papers(60, 60, 5); who(CAST[char] ? char : 'suit', 80, 60, {}, T); };

export const hasEventArt = id => !!SCENES[id];
export function drawEvent(id, ctx, T, char = 'mayor'){ g = ctx; g.clearRect(0, 0, EW, EH); (SCENES[id] || FALLBACK(char))(T); }

// Put an animated illustration in el (a few frames a second; it stops when it leaves the page)
export function mountEventArt(el, id, char, motion = true){
  const c = document.createElement('canvas'); c.width = EW; c.height = EH; c.className = 'evart'; c.setAttribute('aria-hidden', 'true');
  el.appendChild(c); const ctx = c.getContext('2d'), t0 = performance.now() - 1300;
  const frame = now => { if(!c.isConnected) return; try{ drawEvent(id, ctx, (now - t0)/1000, char); }catch(e){ return; }
    if(motion) setTimeout(()=>requestAnimationFrame(frame), 110); };
  requestAnimationFrame(frame);
  return c;
}
