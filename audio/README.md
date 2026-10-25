# Audio

Eurocrat soundtrack, generated procedurally by `compose.py` (no samples, no third-party recordings).

| File | Title | Use | Tempo | Length |
|---|---|---|---|---|
| `eurocrat_menu` | "Ode to Joy (Brussels Eurodance Mix)" | Start / exit / game-over screens | 130 BPM | 32 bars (~59 s) |
| `eurocrat_main` | "Please Hold: Public Consultation" | In-game (ducked on pause) | 70 BPM | 32 bars (~110 s) |
| `eurocrat_win` | "Douze Points for Harmonisation" | Inauguration (win) screen | 122 BPM | 24 bars (~47 s) |

- **Menu:** cheap 90s Eurodance — four-on-the-floor, offbeat bass, plastic stabs, house piano, pumping sidechain — with the Ode to Joy on a supersaw lead.
- **In-game:** waiting-room ambient (electric piano, pads, sub bass, a shaker). The Ode is hidden in the vibraphone at half speed. Mastered quieter so it can play for a whole run.
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
python3 audio/compose.py out
for f in out/*.wav; do ffmpeg -y -i "$f" -c:a libvorbis -q:a 6 "${f%.wav}.ogg"; done
for f in out/*.wav; do ffmpeg -y -i "$f" -c:a aac -b:a 160k -movflags +faststart "${f%.wav}.m4a"; done
cp out/*.ogg out/*.m4a web-prototype/public/audio/
cp out/*.ogg godot/audio/
cp out/*.mid audio/midi/
```

## Notes

- The web prototype plays the tracks with Web Audio (gapless loops). iOS/iPadOS only allows audio after a user gesture, so music starts on the first tap.
- In Godot, enable **Loop** in the import settings of each `.ogg` (already set in the committed `.import` files).
