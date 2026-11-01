import { playSound } from '../audio/sfx.js';
import { meetOwner } from '../core/actions.js';
import { money } from '../core/format.js';
import { save } from '../core/persist.js';
import { landPrice } from '../core/rules.js';
import { S, pname } from '../core/state.js';
import { worldIndex } from '../core/region.js';
import { t } from '../i18n/index.js';
import { hsh } from '../render/pixel.js';
import { btn, hideModal, letter } from './cards.js';
import { refresh } from './guide.js';

// =====================================================================
//  STUBBORN OWNERS (v0.10.1) — they show up, in person, when you go for their land: a scene with their face,
//  their voice and their complaint. Each owner is the same person for the whole run (by parcel and seed).
// =====================================================================
const FIRST = ['Anselmo','Pepito','Martin','Hilde','Giuseppe','Marie-Claire','Jaroslav','Fermín','Ingrid','Ramón','Ottokar','Lucía'];
const LAST  = ['García','Dupont','Van den Berg','Rossi','Novák','Lindqvist','Ferreira','Müller','Papadopoulos','Kowalski','Murphy','Etxeberria'];
const KIND  = ['heir','farmer','retired','abroad','cousin','proud'];   // who they are (texts: owner.kind.*)
const LINES = 6;                                                        // complaints per language (owner.line.0…5)
export function ownerOf(i){
  const w = worldIndex(i), s = (S.runSeed||0) & 0xffff, pick = (arr, k) => arr[Math.floor(hsh(w, s, k)*arr.length)];
  return {name: pick(FIRST, 11) + ' ' + pick(LAST, 12), kind: pick(KIND, 13), line: Math.floor(hsh(w, s, 14)*LINES)};
}
// Show the owner of parcel i (once): the parcel is then marked, and its real price shows in the bar
export function ownerScene(i, after){
  const p = S.grid[i]; if(!p || !p.hold || p.holdKnown) return false;
  meetOwner(i); save();
  const o = ownerOf(i);
  playSound('farmer');
  letter({icon:'front_hand', title:t('owner.t'), speaker:'farmer', who:o.name, role:t('owner.kind.'+o.kind), cls:'bad', mood:'angry', voice:'owner',
    body:`<div class="quote">${t('owner.line.'+o.line, {at:pname(i)})}</div><p class="where-line">${t('owner.price', {x:money(landPrice(p))})}</p>`,
    buttons:[btn(t('owner.ok'), 'check', ()=>{ playSound('click'); hideModal(); refresh(); if(after) after(); }, true)]});
  return true;
}
