import { playSound } from '../audio/sfx.js';
import { S } from '../core/state.js';
import { t } from '../i18n/index.js';
import { centreOn, setSelected } from '../render/camera.js';
import { $, P } from './dom.js';
import { pulse, refresh } from './guide.js';
import { ic } from './icons.js';
import { problems } from './problems.js';

// =====================================================================
//  INBOX (v0.9) — what needs attention and the latest news, in one small panel under its button;
//  and the month's news as short lines that fade by themselves (the old Inbox sheet)
// =====================================================================
export let inboxOpen = false;
export function toggleInbox(v = !inboxOpen){ inboxOpen = v; if(v) S.logSeen = S.logN||0; renderInbox(); }
export function renderInbox(){
  const el = $('inbox'); if(!el) return;
  if(!inboxOpen || !S){ el.hidden = true; return; }
  el.hidden = false;
  const pb = problems();
  el.innerHTML = `<h4>${ic('report')}${t('ui.problems')}</h4><ul class="problems">${pb.map((x,k)=>`<li class="${x.sev}" data-k="${k}">${ic(x.icon)}<span>${t(x.k, P(x.p))}</span></li>`).join('')}</ul>
    <h4>${ic('inbox')}${t('inbox.log')}</h4><ul class="log">${S.log.slice(0,12).map(l=>`<li class="${l.c}"><span class="m">M${l.m}</span>${t(l.k, P(l.p))}</li>`).join('')}</ul>`;
  el.querySelectorAll('.problems li').forEach(li=>{ const x = pb[+li.dataset.k]; if(x.i < 0) return; li.classList.add('go');
    li.onclick = ()=>{ playSound('click'); inboxOpen = false; setSelected(x.i); centreOn(x.i); pulse(x.i); refresh(); }; });
  const b = $('inboxBtn').getBoundingClientRect();
  el.style.top = (b.bottom + 8)+'px'; el.style.right = Math.max(8, Math.min(innerWidth - b.right, innerWidth - el.offsetWidth - 8))+'px';
}
// After a month: up to four lines of news on the map, good and bad first; each fades after a few seconds
export function showNews(from){
  const box = $('news'); if(!box || !S) return;
  const fresh = S.log.slice(0, Math.max(0, (S.logN||0) - from)).filter(l=>l.c==='good' || l.c==='bad');
  fresh.slice(0, innerWidth < 700 ? 2 : 4).forEach((l, j)=>{
    const d = document.createElement('div'); d.className = 'news '+l.c;
    d.innerHTML = `${ic(l.c==='bad' ? 'error' : 'check_circle')}<span>${t(l.k, P(l.p))}</span>`;
    box.appendChild(d);
    setTimeout(()=>d.classList.add('out'), 4200 + j*500); setTimeout(()=>d.remove(), 4900 + j*500); });
  while(box.children.length > 5) box.firstChild.remove();
}
