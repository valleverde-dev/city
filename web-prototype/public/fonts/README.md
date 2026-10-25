# Fonts

The game embeds three pixel fonts (subset to Latin, WOFF, base64 inside `src/index.html`), so it needs no network:

| Use | Font | Licence |
|---|---|---|
| Titles, figures, buttons | Jersey 10 | SIL OFL 1.1 — `OFL-Jersey10.txt` |
| UI and body text | Pixelify Sans | SIL OFL 1.1 — `OFL-PixelifySans.txt` |
| Stamps, reference numbers | Silkscreen Bold | SIL OFL 1.1 — `OFL-Silkscreen.txt` |

Sources: the `ofl/` folders of https://github.com/google/fonts. Subset with
`pyftsubset <font>.ttf --unicodes="U+0020-007E,U+00A0-00FF,U+0152-0153,U+2013-2014,U+2018-201E,U+2026,U+20AC,U+00B7,U+2022,U+2190-2193,U+25B2,U+25BC,U+2265,U+2248,U+00D7" --flavor=woff`.
