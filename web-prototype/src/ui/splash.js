// The studio card: "Groenendaal" fades in on black and out again, revealing the title screen, once each time the game opens.
// It never blocks anything: it lets taps through, and any tap or key sends it away at once.
import { MOTION } from '../render/anim.js';
export function showSplash(){
  const el = document.createElement('div'); el.className = 'splash'; el.setAttribute('aria-hidden', 'true');
  el.innerHTML = '<span>Groenendaal</span>'; document.body.appendChild(el);
  let gone = false;
  const leave = fast => { if(gone) return; gone = true; el.classList.add(fast ? 'out-fast' : 'out'); setTimeout(()=>el.remove(), fast ? 260 : 900);
    removeEventListener('pointerdown', skip, true); removeEventListener('keydown', skip, true); };
  const skip = () => leave(true);
  addEventListener('pointerdown', skip, true); addEventListener('keydown', skip, true);
  setTimeout(()=>leave(false), MOTION ? 2600 : 1200);
}
