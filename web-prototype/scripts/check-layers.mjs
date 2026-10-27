// Guards the architecture (docs/ARCHITECTURE.md): fails if a layer imports from a layer above it,
// or if the core touches the browser. Runs in `npm test` and in CI.
//
//   core/   rules only — imports core/ only; no DOM, canvas, audio or storage APIs (storage.js is the one adapter)
//   i18n/   strings + t() — may import core/
//   render/ audio/   may import core/ and i18n/ (and each other / ui helpers — presentation)
//   ui/  main.js     may import anything
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, dirname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const src = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');
const files = [];
const walk = d => readdirSync(d).forEach(f => { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') && files.push(p); });
walk(src);

const layerOf = p => relative(src, p).split(/[\\/]/)[0].replace(/\.js$/, '');
const ALLOWED = {
  core:  ['core'],
  i18n:  ['core', 'i18n'],
  audio: ['core', 'i18n', 'audio', 'render', 'ui'],
  render:['core', 'i18n', 'audio', 'render', 'ui'],
  ui:    ['core', 'i18n', 'audio', 'render', 'ui'],
  main:  ['core', 'i18n', 'audio', 'render', 'ui'],
};
const BROWSER = /\b(document|window|navigator|localStorage|sessionStorage|performance|requestAnimationFrame|AudioContext|HTMLCanvasElement|getContext|matchMedia|devicePixelRatio)\b/;

const errors = [];
for (const f of files) {
  const from = layerOf(f), text = readFileSync(f, 'utf8');
  for (const m of text.matchAll(/^\s*(?:import|export)\b[^'"]*?from\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/gm)) {
    const spec = m[1] || m[2];
    if (!spec.startsWith('.')) { if (from === 'core') errors.push(`${relative(src, f)}: core imports a package (${spec})`); continue; }
    const to = layerOf(normalize(join(dirname(f), spec)));
    if (!(ALLOWED[from] || []).includes(to)) errors.push(`${relative(src, f)}: ${from}/ must not import ${to}/ (${spec})`);
  }
  if (from === 'core' && !f.endsWith('storage.js')) {
    text.split('\n').forEach((line, k) => {
      const code = line.replace(/\/\/.*$/, '').replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '""');
      if (BROWSER.test(code)) errors.push(`${relative(src, f)}:${k + 1}: core touches the browser: ${line.trim().slice(0, 90)}`);
    });
  }
}
if (errors.length) { console.error('Layer check FAILED\n  ' + errors.join('\n  ')); process.exit(1); }
console.log(`Layer check OK (${files.length} modules; core has no browser APIs)`);
