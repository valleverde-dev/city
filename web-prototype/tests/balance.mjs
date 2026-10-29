// Difficulty check in Node (no browser): the greedy bot of tests/balance_bot.js plays many seeded runs.
// Same bot and same results as tests/balance.py, without a browser (about 2x faster).
// Usage: node tests/balance.mjs [runs] [--level=1..N] [--sell]   one settlement, started directly (made-up earlier ones)
//        node tests/balance.mjs [runs] --run [--sell]             whole Euroregion runs from the 2×2 hamlet
//        add --career to keep the career between runs (a player who keeps playing)
import { playOneRun } from './core/harness.mjs';

const args = process.argv.slice(2);
const runs = Number(args.find(a => !a.startsWith('--')) || 60);
const run = args.includes('--run');
const level = run ? 0 : Number((args.find(a => a.startsWith('--level=')) || '--level=4').split('=')[1]) - 1;
const sell = args.includes('--sell');
const keepCareer = args.includes('--career');   // runs one after another: experience, ranks and the bigger perk pool carry over
const t0 = performance.now();
const results = [];
for (let seed = 1; seed <= runs; seed++) results.push(playOneRun(seed, { sell, level, run, keepCareer }));
const avg = k => Math.floor(results.reduce((a, r) => a + r[k], 0) / runs);
const causes = {}; results.forEach(r => causes[r.why] = (causes[r.why] || 0) + 1);
if (run) {
  const dist = {}; results.forEach(r => dist[r.settled] = (dist[r.settled] || 0) + 1);
  console.log(`Euroregion runs: ${runs} · settlements consolidated per run: ${JSON.stringify(dist)}`);
  console.log('ended by:', JSON.stringify(causes), '| avg settlements:', (results.reduce((a, r) => a + r.settled, 0) / runs).toFixed(2), '| avg region population:', avg('pop'));
} else {
  const wins = results.filter(r => r.win);
  console.log(`settlement ${level + 1} · runs: ${runs}  wins: ${wins.length} (${Math.floor(100 * wins.length / runs)}%)`);
  console.log('outcomes:', JSON.stringify(causes));
  console.log('avg residents:', avg('residents'), '| avg end month:', avg('month'));
  if (wins.length) console.log('win months:', JSON.stringify(wins.map(r => r.month).sort((a, b) => a - b)));
}
console.log('ended in debt:', results.filter(r => r.debt > 0).length);
console.error(`(${Math.round(performance.now() - t0)} ms)`);
