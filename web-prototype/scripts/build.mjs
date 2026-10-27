// Web prototype build: src/ (ES modules + CSS + template) + public/ -> dist/
// The output is ONE self-contained dist/index.html (script, styles and fonts inlined), so it works
// offline, from file:// and as a PWA, exactly like the old single-file prototype.
//
// Usage:  node scripts/build.mjs                 build once (web: GitHub Pages + PWA) -> dist/
//         node scripts/build.mjs --watch         rebuild on every change in src/ (pair it with `npm run serve`)
//         node scripts/build.mjs --target=itch   itch.io HTML5 build -> dist-itch/ + release/eurocrat-<version>-web.zip
//
// itch.io runs the game in an iframe on its own CDN: no service worker, no PWA manifest, no home-screen tags.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync, statSync, watch } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const pub = join(root, 'public');
const TARGET = (process.argv.find(a => a.startsWith('--target=')) || '--target=web').split('=')[1];
if (!['web', 'itch'].includes(TARGET)) throw new Error(`unknown target ${TARGET} (web | itch)`);
const ITCH = TARGET === 'itch';
const dist = join(root, ITCH ? 'dist-itch' : 'dist');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const WATCH = process.argv.includes('--watch');

let commit = 'local';
try { commit = execSync('git rev-parse --short HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch {}

async function bundle() {
  const common = { bundle: true, write: false, logLevel: 'silent', legalComments: 'none' };
  const js = await esbuild.build({ ...common, entryPoints: [join(src, 'main.js')], format: 'iife', banner: { js: '"use strict";' } });
  const css = await esbuild.build({ ...common, entryPoints: [join(src, 'styles', 'index.css')], loader: { '.woff': 'dataurl', '.woff2': 'dataurl', '.png': 'dataurl' } });
  return { js: js.outputFiles[0].text, css: css.outputFiles[0].text };
}

async function build() {
  const t0 = Date.now();
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13); // YYYYMMDDTHHMM
  const buildId = `${pkg.version}-${stamp}-${commit}`;
  const { js, css } = await bundle();
  if (/<\/script/i.test(js)) throw new Error('bundled script contains "</script": it would break the inline <script> tag');

  rmSync(dist, { recursive: true, force: true });
  mkdirSync(dist, { recursive: true });
  cpSync(pub, dist, { recursive: true });
  if (ITCH) for (const f of ['sw.js', 'manifest.webmanifest', 'icons']) rmSync(join(dist, f), { recursive: true, force: true });

  // PWA tags for iPad/iPhone
  const head = ITCH ? [`<meta name="build" content="${buildId}">`].join('\n') : [
    '<link rel="manifest" href="manifest.webmanifest">',
    '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">',
    '<meta name="apple-mobile-web-app-capable" content="yes">',
    '<meta name="mobile-web-app-capable" content="yes">',
    '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">',
    '<meta name="apple-mobile-web-app-title" content="Eurocrat">',
    '<meta name="theme-color" content="#1d3c78">',
    `<meta name="build" content="${buildId}">`,
  ].join('\n');
  const swReg = `<script>if('serviceWorker' in navigator && location.protocol!=='file:'){addEventListener('load',()=>navigator.serviceWorker.register('sw.js'));}</script>`;

  let html = readFileSync(join(src, 'index.html'), 'utf8');
  for (const mark of ['<!-- @styles -->', '<!-- @script -->', '</head>', '</body>'])
    if (!html.includes(mark)) throw new Error(`src/index.html is missing ${mark}`);
  // function replacers: the bundle contains "$&"-like sequences that a string replacement would expand
  html = html.replace('<!-- @styles -->', () => `<style>\n${css}</style>`)
             .replace('<!-- @script -->', () => `<script>\n${js}</script>`)
             .replace('</head>', () => `${head}\n</head>`)
             .replace('</body>', () => ITCH ? '</body>' : `${swReg}\n</body>`);
  writeFileSync(join(dist, 'index.html'), html);

  if (!ITCH) {
    const sw = readFileSync(join(dist, 'sw.js'), 'utf8').replaceAll('__BUILD_ID__', buildId);
    writeFileSync(join(dist, 'sw.js'), sw);
  }
  writeFileSync(join(dist, 'build.json'), JSON.stringify({ name: pkg.name, version: pkg.version, target: TARGET, build: buildId, date: new Date().toISOString() }, null, 2));
  if (ITCH) zipForItch();

  const list = d => readdirSync(d).flatMap(f => statSync(join(d, f)).isDirectory() ? list(join(d, f)).map(x => `${f}/${x}`) : [f]);
  console.log(`Build ${buildId} -> dist/ (${Date.now() - t0} ms)`);
  if (!WATCH) for (const f of list(dist)) console.log(`  ${f.padEnd(28)} ${statSync(join(dist, f)).size} B`);
}

// itch.io wants a .zip with index.html at its root (limits: 1,000 files, 500 MB unpacked)
function zipForItch() {
  const out = join(root, 'release'); mkdirSync(out, { recursive: true });
  const zip = join(out, `eurocrat-${pkg.version}-web.zip`); rmSync(zip, { force: true });
  try { execSync(`zip -r -q -X "${zip}" .`, { cwd: dist, stdio: 'inherit' }); }
  catch { throw new Error('could not run `zip`: install it, or upload the dist-itch/ folder contents zipped by hand'); }
  console.log(`  -> release/eurocrat-${pkg.version}-web.zip (${Math.round(statSync(zip).size / 1024)} KB)`);
}

try { await build(); } catch (e) { console.error(e.errors ? esbuild.formatMessagesSync(e.errors, { kind: 'error' }).join('\n') : e); if (!WATCH) process.exit(1); }

if (WATCH) {
  console.log('Watching src/ and public/ … (Ctrl+C to stop)');
  let timer = null;
  const again = () => { clearTimeout(timer); timer = setTimeout(() => build().catch(e => console.error(e.errors ? esbuild.formatMessagesSync(e.errors, { kind: 'error' }).join('\n') : e)), 80); };
  watch(src, { recursive: true }, again);
  watch(pub, { recursive: true }, again);
}
