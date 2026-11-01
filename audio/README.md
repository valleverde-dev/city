# Audio

Eurocrat soundtrack, generated procedurally by `compose.py` (no samples, no third-party recordings).

| File | Title | Use | Tempo | Length |
|---|---|---|---|---|
| `eurocrat_menu` | "Ode to Joy (Brussels Eurodance Mix)" | Title / exit / game-over screens | 130 BPM | 32 bars (~59 s) |
| `eurocrat_level1` | "Pilot Project (Village Fete Waltz)" | Phase I playlist (first) | 160 BPM, 3/4 | 32 bars (~36 s) |
| `eurocrat_level2` | "Expansion Phase (Let's Build Together)" | Phase II playlist (first) | 112 BPM | 32 bars (~69 s) |
| `eurocrat_level4` | "Model Town (Harmonised Trance Anthem)" | Phase IV+ playlist (first) | 138 BPM | 32 bars (~56 s) |
| `eurocrat_lobby` | "Lobby Bossa (Floor 7, Please)" | Playlists I, III | 128 BPM | 32 bars (~60 s) |
| `eurocrat_hold` | "Your Call Is Important to Us" | Playlists II, III | 96 BPM | 32 bars (~80 s) |
| `eurocrat_sunny` | "Sunny Subsidy (Ambient House)" | Playlists I, III, IV | 110 BPM | 32 bars (~70 s) |
| `eurocrat_handsup` | "Plenary Session (Hands Up!)" | Playlist IV | 140 BPM | 32 bars (~55 s) |
| `eurocrat_italo` | "Italo Directive" | Playlists II, III, IV | 118 BPM | 32 bars (~65 s) |
| `eurocrat_win` | "Douze Points for Harmonisation" | Milestone / win screen | 122 BPM | 24 bars (~47 s) |

- **Menu:** cheap 90s Eurodance — four-on-the-floor, offbeat bass, plastic stabs, house piano, pumping sidechain — with the Ode to Joy on a supersaw lead.
- **In game, every phase has a playlist** (`PLAYLISTS` in `web-prototype/src/audio/music.js`). Each track plays for whole loops, about two minutes, then crossfades into the next; pause ducks it and resume carries on where it was.

  | Phase | Playlist |
  |---|---|
  | I · Pilot Project | Village Fete Waltz → Sunny Subsidy → Lobby Bossa |
  | II · Expansion Phase | Let's Build Together → Italo Directive → Your Call Is Important to Us |
  | III · Partial Plan | Lobby Bossa → Italo Directive → Your Call Is Important to Us → Sunny Subsidy |
  | IV and later · Model Town | Harmonised Trance Anthem → Plenary Session (Hands Up!) → Sunny Subsidy → Italo Directive |

- **The tracks:**
  - **Village Fete Waltz:** a musette waltz — accordion, glockenspiel, oom-pah tuba — with the Ode rewritten in 3/4.
  - **Let's Build Together:** 80s Eurovision synth-pop — FM bell lead, plucky arpeggio, handclaps, tambourine — with an original verse, pre-chorus and chorus.
  - **Harmonised Trance Anthem:** Euro-trance — rolling bass, supersaws, choir — with the Ode, a bells-and-choir breakdown, a snare build and the drop.
  - **Lobby Bossa (Floor 7, Please):** elevator bossa nova — nylon guitar (Karplus-Strong), root-fifth bass, rim clave, brushes, a breathy flute tune, and the lift's chime.
  - **Your Call Is Important to Us:** smooth hold music — electric piano, organ, fingered bass, swung hats, bell and flute — with the Ode slipped into the bridge.
  - **Sunny Subsidy:** bright ambient house — marimba arpeggios, warm pads, a soft four-on-the-floor, vibes on top.
  - **Plenary Session (Hands Up!):** the cheapest hands-up Eurodance — vi-IV-I-V, offbeat bass, supersaw hook, piano riff, laser zaps.
  - **Italo Directive:** 80s Italo disco — octave-bouncing bass, arpeggio, claps, tom fills, cowbell, bell and saw lead.
- **Win:** a Eurovision-style schlager with the obligatory truck-driver key change into the last chorus.
- Phase III's own theme ("Regulatory Framework", tense office ambient in D minor) was retired: too sad, it killed the mood.

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
python3 audio/compose.py out            # or just some: python3 audio/compose.py out eurocrat_lobby eurocrat_italo
for f in out/*.wav; do ffmpeg -y -i "$f" -c:a libvorbis -q:a 6 "${f%.wav}.ogg"; done
for f in out/*.wav; do ffmpeg -y -i "$f" -c:a aac -b:a 160k -movflags +faststart "${f%.wav}.m4a"; done
cp out/*.ogg out/*.m4a web-prototype/public/audio/
cp out/eurocrat_menu.ogg out/eurocrat_level1.ogg out/eurocrat_win.ogg godot/audio/   # the Godot skeleton has no levels yet
cp out/*.mid audio/midi/
```

## Notes

- The web prototype plays the tracks with Web Audio (gapless loops). iOS/iPadOS only allows audio after a user gesture, so music starts on the first tap.
- In Godot, enable **Loop** in the import settings of each `.ogg` (already set in the committed `.import` files).
