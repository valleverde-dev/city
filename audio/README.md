# Audio

Original darksynth soundtrack for CityBuilder, generated procedurally by `compose.py` (no samples, no third-party material).

| Track | Use | Tempo | Length | Key |
|---|---|---|---|---|
| `citybuilder_main_theme` — "Central District" | In-game | 104 BPM | 32 bars (~74 s) | A minor (Am–F–Dm–E) |
| `citybuilder_menu_theme` — "Corporate Terminal" | Start screen / menu | 80 BPM | 16 bars (48 s) | A minor (Am–Fmaj7–C–Em) |

Both tracks loop seamlessly: the reverb tail is folded back into the start of the file.

## Files

- `../web-prototype/public/audio/*.ogg` / `*.m4a` — rendered tracks used by the game (Ogg Vorbis q6; AAC 160 kbps fallback for browsers without Ogg, e.g. older Safari).
- `midi/*.mid` — the same notes as Standard MIDI, one track per instrument (bass, pad, arp, lead; drums on channel 10). Open them in GarageBand, Logic, a DAW or Godot plugins to re-voice with better synths.
- `compose.py` — the generator. Edit tempo, chords, melody or mix and re-render.

## Regenerating

Requires Python 3 with `numpy` and `scipy`, plus `ffmpeg` with libvorbis.

```sh
mkdir -p out
python3 audio/compose.py out
for f in out/*.wav; do ffmpeg -y -i "$f" -c:a libvorbis -q:a 6 "${f%.wav}.ogg"; done
for f in out/*.wav; do ffmpeg -y -i "$f" -c:a aac -b:a 160k -movflags +faststart "${f%.wav}.m4a"; done
cp out/*.ogg out/*.m4a web-prototype/public/audio/
cp out/*.mid audio/midi/
```

## Notes

- The web prototype plays the tracks with Web Audio (gapless loops). iOS/iPadOS only allows audio after a user gesture, so music starts on the first tap.
- In Godot, enable **Loop** in the import settings of each `.ogg`.
