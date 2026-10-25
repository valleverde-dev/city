// Web prototype build: src/ + public/ -> dist/
// No dependencies: Node 18+ only.  Usage: node scripts/build.mjs
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const pub = join(root, 'public');
const dist = join(root, 'dist');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

let commit = 'local';
try { commit = execSync('git rev-parse --short HEAD', { cwd: root, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch {}
const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 13); // YYYYMMDDTHHMM
const buildId = `${pkg.version}-${stamp}-${commit}`;

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
cpSync(pub, dist, { recursive: true });

// index.html + PWA tags for iPad/iPhone
const head = [
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
if (!html.includes('</head>') || !html.includes('</body>')) throw new Error('index.html is missing </head> or </body>');
html = html.replace('</head>', `${head}\n</head>`).replace('</body>', `${swReg}\n</body>`);
writeFileSync(join(dist, 'index.html'), html);

const sw = readFileSync(join(dist, 'sw.js'), 'utf8').replaceAll('__BUILD_ID__', buildId);
writeFileSync(join(dist, 'sw.js'), sw);
writeFileSync(join(dist, 'build.json'), JSON.stringify({ name: pkg.name, version: pkg.version, build: buildId, date: new Date().toISOString() }, null, 2));

const list = d => readdirSync(d).flatMap(f => statSync(join(d, f)).isDirectory() ? list(join(d, f)).map(x => `${f}/${x}`) : [f]);
console.log(`Build ${buildId} -> dist/`);
for (const f of list(dist)) console.log(`  ${f.padEnd(28)} ${statSync(join(dist, f)).size} B`);
