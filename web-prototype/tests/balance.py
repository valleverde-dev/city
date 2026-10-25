"""Difficulty check: lets a greedy bot play many seeded runs and prints the outcomes.

Usage:  python3 web-prototype/tests/balance.py [runs] [path/to/index.html]
Not part of CI — it's a tuning tool. A good target for "hard": the bot wins
some runs but loses most, with a mix of loss causes.
"""
import collections
import pathlib
import sys

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parents[1]
runs = int(sys.argv[1]) if len(sys.argv) > 1 else 60
target = pathlib.Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "src" / "index.html"
bot = (ROOT / "tests" / "balance_bot.js").read_text()

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    page.route("**/fonts.*/**", lambda r: r.abort())
    page.goto(target.resolve().as_uri())
    page.add_script_tag(content=bot)
    results = [page.evaluate(f"__playOneRun({seed})") for seed in range(1, runs + 1)]
    browser.close()

wins = [r for r in results if r["win"]]
causes = collections.Counter(r["why"] for r in results)
print(f"runs: {runs}  wins: {len(wins)} ({100*len(wins)//runs}%)")
print("outcomes:", dict(causes))
print("avg residents:", sum(r["residents"] for r in results) // runs,
      "| avg end month:", sum(r["month"] for r in results) // runs)
if wins:
    print("win months:", sorted(r["month"] for r in wins))
