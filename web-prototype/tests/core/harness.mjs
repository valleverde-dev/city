// Runs the game rules in Node, with no browser: the same API the page exposes as window.__eurocrat
// (minus the rendering), so tests/balance_bot.js can play here too.
import { readFileSync } from 'node:fs';
import { runInThisContext } from 'node:vm';
import * as core from '../../src/core/index.js';

export { core };
export const g = {
  ...core,
  get S(){ return core.S; },
  // like the page's hook: start a level and drop the opening cards
  newGame(seed, level = 3, opts = {}){ core.newGame(seed, level, opts); core.S.cards = []; return core.S; },
};

let bot = null;
// window.__playOneRun from tests/balance_bot.js, shared with the browser runner
export function playOneRun(seed, opts){
  if(!bot){
    globalThis.window = globalThis.window || {};
    globalThis.window.__eurocrat = g;
    runInThisContext(readFileSync(new URL('../balance_bot.js', import.meta.url), 'utf8'));
    bot = globalThis.window.__playOneRun;
  }
  return bot(seed, opts);
}
