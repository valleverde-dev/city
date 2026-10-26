"""Difficulty check: lets a greedy bot play many seeded runs and prints the outcomes.

Usage:  python3 web-prototype/tests/balance.py [runs] [path/to/index.html] [--level=1..4] [--sell]
Not part of CI — it's a tuning tool. A good target for "hard": the bot wins
some runs but loses most, with a mix of loss causes.
"""
import collections
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
args = [a for a in sys.argv[1:] if not a.startswith("--")]
runs = int(args[0]) if args else 60
target = pathlib.Path(args[1]) if len(args) > 1 else ROOT / "src" / "index.html"
bot = (ROOT / "tests" / "balance_bot.js").read_text()
SELL = "--sell" in sys.argv
LEVEL = next((int(a.split("=")[1]) for a in sys.argv if a.startswith("--level=")), 4) - 1   # 1..4 on the command line

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.route("**/fonts.*/**", lambda r: r.abort())
    page.goto(target.resolve().as_uri())
    page.add_script_tag(content=bot)
    results = [page.evaluate(f"__playOneRun({seed}, {{sell: {str(SELL).lower()}, level: {LEVEL}}})") for seed in range(1, runs + 1)]
    browser.close()

wins = [r for r in results if r["win"]]
causes = collections.Counter(r["why"] for r in results)
print(f"level {LEVEL+1} · runs: {runs}  wins: {len(wins)} ({100*len(wins)//runs}%)")
print("outcomes:", dict(causes))
print("avg residents:", sum(r["residents"] for r in results) // runs,
      "| avg end month:", sum(r["month"] for r in results) // runs)
if wins:
    print("win months:", sorted(r["month"] for r in wins))
print("ended in debt:", sum(1 for r in results if r["debt"] > 0))
