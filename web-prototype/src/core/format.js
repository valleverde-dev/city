// Number formatting used by the rules when they write logs and cards.
// The language is pushed in by the i18n layer (setNumberLang) so the core never touches the UI.
let numLang = 'en';
export function setNumberLang(l){ numLang = l; }
export function money(x){
  const v = Math.round(x*10)/10;
  if(numLang==='es') return v.toLocaleString('es-ES',{minimumFractionDigits:1, maximumFractionDigits:1})+' M€';
  return (v<0?'-':'')+'€'+Math.abs(v).toFixed(1)+'M';
}
