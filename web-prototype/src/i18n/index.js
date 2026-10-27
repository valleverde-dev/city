import { setNumberLang } from '../core/format.js';
import { I18N } from './strings.js';

// =====================================================================
//  I18N — every player-facing string lives here, in English and Spanish.
//  t('key', {params}) fills {placeholders}. Missing keys fall back to English.
// =====================================================================
export const LANGS = ['en','es'];
export let LANG = (()=>{ try{ const s=localStorage.getItem('eurocrat_lang'); if(LANGS.includes(s)) return s; }catch(e){}
  return (navigator.language||'en').toLowerCase().startsWith('es') ? 'es' : 'en'; })();
export function t(k, p){
  let s = (I18N[LANG] && I18N[LANG][k] !== undefined) ? I18N[LANG][k] : (I18N.en[k] !== undefined ? I18N.en[k] : k);
  if(p) s = s.replace(/\{(\w+)\}/g, (m,n)=> p[n]!==undefined && p[n]!==null ? p[n] : m);
  return s;
}
// Switch language (remembered between sessions); the core formats money in the same language.
export function setLanguage(l){ LANG = l; setNumberLang(l); try{ localStorage.setItem('eurocrat_lang', l); }catch(e){} }
setNumberLang(LANG);
