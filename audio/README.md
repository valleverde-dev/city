# Audio

Eurocrat soundtrack, generated procedurally by `compose.py` (no samples, no third-party recordings).

| File | Title | Use | Tempo | Length |
|---|---|---|---|---|
| `eurocrat_menu` | "Ode to Joy (Brussels Eurodance Mix)" | Start / exit / game-over screens | 130 BPM | 32 bars (~59 s) |
| `eurocrat_level1` | "Pilot Project (Village Fete Waltz)" | Level I | 160 BPM, 3/4 | 32 bars (~36 s) |
| `eurocrat_level2` | "Expansion Phase (Let's Build Together)" | Level II | 112 BPM | 32 bars (~69 s) |
| `eurocrat_level3` | "Partial Plan: Regulatory Framework" | Level III | 84 BPM | 32 bars (~91 s) |
| `eurocrat_level4` | "Model Town (Harmonised Trance Anthem)" | Level IV | 138 BPM | 32 bars (~56 s) |
| `eurocrat_win` | "Douze Points for Harmonisation" | Inauguration (win) screen | 122 BPM | 24 bars (~47 s) |

- **Menu:** cheap 90s Eurodance — four-on-the-floor, offbeat bass, plastic stabs, house piano, pumping sidechain — with the Ode to Joy on a supersaw lead.
- **Level themes** grow with the campaign, from a village to a valley (all ducked on pause):
  - **I, Pilot Project:** a musette waltz for the village fête — accordion, glockenspiel, oom-pah tuba — with the Ode rewritten in 3/4.
  - **II, Expansion Phase:** 80s Eurovision synth-pop — FM bell lead, plucky arpeggio, handclaps, tambourine — with an original verse, pre-chorus and chorus.
  - **III, Partial Plan:** tense office ambient for the full regulatory framework — ticking clock, typewriters, rubber stamps, a pulsing pedal — with the Ode in D minor. Mastered quieter.
  - **IV, Model Town:** a Euro-trance anthem — rolling bass, supersaws, choir — with the Ode in the main section, a bells-and-choir breakdown, a snare build and the drop.
- **Win:** a Eurovision-style schlager with the obligatory truck-driver key change into the last chorus.

All tracks loop seamlessly: the reverb tail is folded back into the start of the file.

**Rights.** The Ode to Joy melody is Beethoven's (Symphony No. 9, 1824) and is in the public domain. These arrangements are new; no existing recording or official arrangement is used. The other melodies are original.

## Files

- `../web-prototype/public/audio/*.ogg` / `*.m4a` — tracks used by the web prototype (Ogg Vorbis q6; AAC 160 kbps fallback for browsers without Ogg, e.g. older Safari).
- `../godot/audio/*.ogg` — the same tracks for Godot (Loop enabled in Import).
- `midi/*.mid` — Standard MIDI versions, one track per instrument (drums on channel 10). Open them in GarageBand, Logic or any DAW to re-voice with better instruments.
- `compose.py` — the generator. Edit tempo, harmony, melodies or mix and re-render.

## Regenerating

Requires Python 3 with `numpy` and `scipy`, plus `ffmpeg` with libvorbis.

```sh
mkdir -p out
python3 audio/compose.py out            # or: python3 audio/compose.py out eurocrat_level2
for f in out/*.wav; do ffmpeg -y -i "$f" -c:a libvorbis -q:a 6 "${f%.wav}.ogg"; done
for f in out/*.wav; do ffmpeg -y -i "$f" -c:a aac -b:a 160k -movflags +faststart "${f%.wav}.m4a"; done
cp out/*.ogg out/*.m4a web-prototype/public/audio/
cp out/eurocrat_menu.ogg out/eurocrat_level1.ogg out/eurocrat_win.ogg godot/audio/   # the Godot skeleton has no levels yet
cp out/*.mid audio/midi/
```

## Notes

- The web prototype plays the tracks with Web Audio (gapless loops). iOS/iPadOS only allows audio after a user gesture, so music starts on the first tap.
- In Godot, enable **Loop** in the import settings of each `.ogg` (already set in the committed `.import` files).
