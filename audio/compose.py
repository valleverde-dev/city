"""Eurocrat soundtrack generator.

Three original arrangements, rendered from note events with a tiny numpy synth,
then written as WAV (convert to OGG/M4A with ffmpeg) and Standard MIDI.

  eurocrat_menu  "Ode to Joy (Brussels Eurodance Mix)"   130 BPM  menu / title
  eurocrat_main  "Please Hold: Public Consultation"       70 BPM   in-game ambient
  eurocrat_win   "Douze Points for Harmonisation"        122 BPM   inauguration

The Ode to Joy melody is Beethoven's (Symphony No. 9, 1824) and is in the public
domain. The arrangements here are new; no existing recording or official
arrangement is used. The Eurovision-style and ambient tracks are fully original.

Usage: python3 compose.py OUT_DIR
"""
import numpy as np, struct, sys
from scipy.signal import butter, lfilter, fftconvolve
from scipy.io import wavfile

SR = 44100
rng = np.random.default_rng(1957)  # Treaty of Rome


def hz(m): return 440.0 * 2 ** ((m - 69) / 12)


# ---------------------------------------------------------------- building blocks
def tvec(n): return np.arange(n) / SR

def saw(f, n, detune=0.0):
    return 2 * ((tvec(n) * f * (1 + detune) + rng.random()) % 1.0) - 1

def square(f, n, pw=0.5):
    return np.where((tvec(n) * f) % 1.0 < pw, 1.0, -1.0)

def env(n, a, d, s, r, hold_n):
    i = np.arange(n); a, d, r = max(int(a * SR), 1), max(int(d * SR), 1), max(int(r * SR), 1)
    e = np.minimum(i / a, 1.0)
    e = np.where(i >= a, np.maximum(1 - (1 - s) * (i - a) / d, s), e)
    lvl = e[min(hold_n, n - 1)]
    return np.where(i >= hold_n, lvl * np.clip(1 - (i - hold_n) / r, 0, 1), e)

def lp(x, cut, order=2):
    b, a = butter(order, min(cut, SR / 2 - 200) / (SR / 2), 'low'); return lfilter(b, a, x)

def hp(x, cut):
    b, a = butter(2, cut / (SR / 2), 'high'); return lfilter(b, a, x)

def bp(x, lo, hi):
    b, a = butter(2, [lo / (SR / 2), hi / (SR / 2)], 'band'); return lfilter(b, a, x)


# ---------------------------------------------------------------- instruments
# Each takes (midi_note, duration_seconds, velocity) and returns a mono array.
def i_supersaw(m, dur, v):            # the cheesiest lead in Europe
    n = int((dur + 0.3) * SR); f = hz(m)
    x = sum(saw(f, n, d) for d in (-0.012, -0.007, -0.003, 0, 0.003, 0.007, 0.012)) / 5
    x += 0.4 * square(f / 2, n)
    return lp(x, 5200) * env(n, 0.005, 0.15, 0.75, 0.22, int(dur * SR)) * v

def i_stab(m, dur, v):                # offbeat chord stabs, short and plasticky
    n = int((dur + 0.12) * SR); f = hz(m)
    x = sum(saw(f, n, d) for d in (-0.009, 0, 0.009)) / 3
    return lp(x, 3800) * env(n, 0.002, 0.12, 0.35, 0.08, int(dur * SR)) * v

def i_piano(m, dur, v):               # 90s "house piano" via FM
    n = int((dur + 0.6) * SR); t = tvec(n); f = hz(m)
    idx = 2.2 * np.exp(-t * 6) + 0.3
    x = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
    x += 0.35 * np.sin(2 * np.pi * 2 * f * t + 0.8 * np.exp(-t * 9) * np.sin(2 * np.pi * 3 * f * t))
    return x * np.exp(-t * 2.2) * env(n, 0.002, 0.01, 1, 0.25, int(dur * SR)) * v

def i_bass(m, dur, v):                # offbeat eurodance bass
    n = int((dur + 0.06) * SR); f = hz(m)
    x = saw(f, n) * 0.6 + square(f, n, 0.5) * 0.4
    k = np.exp(-tvec(n) * 18)
    y = lp(x, 2200) * k + lp(x, 420) * (1 - k)
    return y * env(n, 0.003, 0.08, 0.7, 0.05, int(dur * SR)) * v

def i_sub(m, dur, v):                 # soft round bass for ambient / ballad
    n = int((dur + 0.5) * SR); t = tvec(n); f = hz(m)
    x = np.sin(2 * np.pi * f * t) + 0.15 * np.sin(2 * np.pi * 2 * f * t)
    return x * env(n, 0.06, 0.4, 0.8, 0.45, int(dur * SR)) * v

def i_pizz(m, dur, v):                # pizzicato-ish pluck
    n = int(0.35 * SR); t = tvec(n); f = hz(m)
    x = square(f, n, 0.25) * 0.5 + np.sin(2 * np.pi * f * t)
    return lp(x, 2500) * np.exp(-t * 14) * v

def i_ep(m, dur, v):                  # electric piano (hold-music Rhodes)
    n = int((dur + 1.4) * SR); t = tvec(n); f = hz(m)
    x = np.sin(2 * np.pi * f * t + (1.1 * np.exp(-t * 3) + 0.15) * np.sin(2 * np.pi * f * t))
    x += 0.12 * np.sin(2 * np.pi * 14 * f * t) * np.exp(-t * 30)   # tine
    trem = 1 + 0.12 * np.sin(2 * np.pi * 4.2 * t)
    return x * trem * np.exp(-t * 0.9) * env(n, 0.004, 0.02, 1, 1.0, int(dur * SR)) * v

def i_vibes(m, dur, v):               # vibraphone with motor tremolo
    n = int((dur + 2.0) * SR); t = tvec(n); f = hz(m)
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 6)
    trem = 1 + 0.25 * np.sin(2 * np.pi * 5.0 * t)
    return x * trem * np.exp(-t * 1.1) * env(n, 0.003, 0.01, 1, 1.4, int(dur * SR)) * v

def i_pad(m, dur, v):                 # warm string pad
    n = int((dur + 1.6) * SR); f = hz(m)
    x = sum(saw(f, n, d) for d in (-0.005, -0.0015, 0.002, 0.006)) / 4
    return lp(x, 1600) * env(n, 0.9, 0.6, 0.8, 1.5, int(dur * SR)) * v


def d_kick(v):
    n = int(0.42 * SR); t = tvec(n)
    f = 48 + 140 * np.exp(-t * 32)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6.5)
    y += 0.25 * lp(rng.standard_normal(n), 4000) * np.exp(-t * 250)
    return np.tanh(y * 1.8) * v

def d_clap(v):
    n = int(0.3 * SR); t = tvec(n); y = np.zeros(n)
    noise = bp(rng.standard_normal(n), 900, 5200)
    for off in (0, 0.011, 0.022):
        s = int(off * SR); y[s:] += noise[:n - s] * np.exp(-tvec(n - s) * (60 if off < 0.02 else 14))
    return y * 0.6 * v

def d_snare(v):
    n = int(0.25 * SR); t = tvec(n)
    return (hp(rng.standard_normal(n), 1200) * np.exp(-t * 18) * 0.7
            + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30) * 0.4) * v

def d_hat(v, open_=False):
    n = int((0.22 if open_ else 0.05) * SR); t = tvec(n)
    return hp(rng.standard_normal(n), 8000) * np.exp(-t * (16 if open_ else 80)) * v

def d_crash(v):
    n = int(2.0 * SR); t = tvec(n)
    return hp(rng.standard_normal(n), 5000) * np.exp(-t * 2.2) * 0.5 * v

def d_shaker(v):
    n = int(0.08 * SR); t = tvec(n)
    return bp(rng.standard_normal(n), 4000, 10000) * np.sin(np.pi * t / t[-1]) * v

DRUMS = {36: d_kick, 39: d_clap, 38: d_snare, 42: d_hat, 46: lambda v: d_hat(v, True),
         49: d_crash, 70: d_shaker}
INSTR = {'lead': i_supersaw, 'stab': i_stab, 'piano': i_piano, 'bass': i_bass, 'sub': i_sub,
         'pizz': i_pizz, 'ep': i_ep, 'vibes': i_vibes, 'pad': i_pad}
GM = {'lead': 81, 'stab': 90, 'piano': 0, 'bass': 38, 'sub': 33, 'pizz': 45, 'ep': 4,
      'vibes': 11, 'pad': 49}


# ---------------------------------------------------------------- effects / render
def reverb(x, secs, damp=6000):
    n = int(secs * SR); t = tvec(n)
    ir = rng.standard_normal((2, n)) * np.exp(-t * (6.9 / secs))
    ir[:, :int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
    ir = lp(ir, damp)
    wet = np.stack([fftconvolve(x, ir[0])[:len(x)], fftconvolve(x, ir[1])[:len(x)]])
    return wet / (np.max(np.abs(wet)) + 1e-9)

def echo(x, secs, fb, taps=6):
    y = np.zeros_like(x); d = int(secs * SR)
    for i in range(1, taps + 1):
        if d * i < len(x): y[d * i:] += x[:-d * i] * fb ** i
    return lp(y, 3500)

def render(song):
    spb = 60 / song['bpm']
    loop_n = int(song['bars'] * 4 * spb * SR)
    tail = int(5 * SR); total = loop_n + tail
    buses = {}; kicks = []
    for ins, beat, dur, note, vel in song['events']:
        s = int(beat * spb * SR)
        if ins == 'drums':
            y = DRUMS[note](vel)
            if note == 36: kicks.append(s)
        else:
            y = INSTR[ins](note, dur * spb, vel)
        e = min(s + len(y), total)
        buses.setdefault(ins, np.zeros(total))[s:e] += y[:e - s]

    if song.get('pump') and kicks:           # sidechain "pumping", essential eurodance cheese
        g = np.ones(total); dn = int(spb * 0.95 * SR)
        shape = 1 - song['pump'] * np.exp(-np.arange(dn) / (SR * 0.07))
        for s in kicks:
            e = min(s + dn, total); g[s:e] = np.minimum(g[s:e], shape[:e - s])
        for k in ('pad', 'stab', 'piano', 'lead'):
            if k in buses: buses[k] *= g if k in ('pad', 'stab') else (0.6 + 0.4 * g)

    L = np.zeros(total); R = np.zeros(total); send = np.zeros(total)
    for k, x in buses.items():
        gain, pan, rev = song['mix'].get(k, (0.5, 0.0, 0.2))
        x = x * gain
        if k in song.get('echo', {}):
            secs, fb, width = song['echo'][k]
            dl = echo(x, secs * spb, fb)
            L += dl * (0.5 + width / 2); R += dl * (0.5 - width / 2)
        L += x * np.sqrt(0.5 * (1 - pan)); R += x * np.sqrt(0.5 * (1 + pan))
        send += x * rev
    st = np.stack([L, R])
    st += reverb(send, song.get('reverb', 2.0)) * np.max(np.abs(send)) * song.get('wet', 0.35)

    out = st[:, :loop_n].copy()               # seamless loop: fold tail onto start
    out[:, :tail] += st[:, loop_n:loop_n + tail]
    out = hp(out, 28)
    # 'level' keeps background tracks quieter than the attention-grabbing ones
    return np.tanh(out / (np.max(np.abs(out)) + 1e-9) * 1.25) / np.tanh(1.25) * 0.89 * song.get('level', 1.0)


# ---------------------------------------------------------------- MIDI (no deps)
def vlq(n):
    out = [n & 0x7F]; n >>= 7
    while n: out.insert(0, (n & 0x7F) | 0x80); n >>= 7
    return bytes(out)

def write_midi(path, song):
    tpq = 480; tracks = []
    meta = vlq(0) + b'\xff\x51\x03' + int(60_000_000 / song['bpm']).to_bytes(3, 'big')
    meta += vlq(0) + b'\xff\x58\x04\x04\x02\x18\x08'
    t = song['title'].encode(); meta += vlq(0) + b'\xff\x03' + vlq(len(t)) + t
    tracks.append(meta + vlq(0) + b'\xff\x2f\x00')
    names = sorted({e[0] for e in song['events'] if e[0] != 'drums'}) + ['drums']
    ch_free = [c for c in range(16) if c != 9]
    for idx, ins in enumerate(names):
        evs = [e for e in song['events'] if e[0] == ins]
        if not evs: continue
        ch = 9 if ins == 'drums' else ch_free[idx]; raw = []
        for _, beat, dur, note, vel in evs:
            on = int(beat * tpq); off = on + max(1, int((dur if ins != 'drums' else 0.1) * tpq))
            v = max(1, min(127, int(vel * 112)))
            raw += [(on, 1, bytes([0x90 | ch, note, v])), (off, 0, bytes([0x80 | ch, note, 0]))]
        raw.sort(key=lambda r: (r[0], r[1]))
        nm = ins.capitalize().encode(); data = vlq(0) + b'\xff\x03' + vlq(len(nm)) + nm
        if ins != 'drums': data += vlq(0) + bytes([0xC0 | ch, GM[ins]])
        last = 0
        for tick, _, msg in raw: data += vlq(tick - last) + msg; last = tick
        tracks.append(data + vlq(0) + b'\xff\x2f\x00')
    with open(path, 'wb') as f:
        f.write(b'MThd' + struct.pack('>IHHH', 6, 1, len(tracks), tpq))
        for tr in tracks: f.write(b'MTrk' + struct.pack('>I', len(tr)) + tr)


# ---------------------------------------------------------------- the music
# Ode to Joy (Beethoven) in D major: 16 bars of (midi, beats); D4 = 62.
D, E, Fs, G, A, A3 = 62, 64, 66, 67, 69, 57
ODE_A1 = [(Fs,1),(Fs,1),(G,1),(A,1), (A,1),(G,1),(Fs,1),(E,1), (D,1),(D,1),(E,1),(Fs,1), (Fs,1.5),(E,.5),(E,2)]
ODE_A2 = ODE_A1[:12] + [(E,1.5),(D,.5),(D,2)]
ODE_B  = [(E,1),(E,1),(Fs,1),(D,1), (E,1),(Fs,.5),(G,.5),(Fs,1),(D,1),
          (E,1),(Fs,.5),(G,.5),(Fs,1),(E,1), (D,1),(E,1),(A3,2)]
ODE = ODE_A1 + ODE_A2 + ODE_B + ODE_A2
# Harmony, one chord per half bar (2 beats), as root names
ODE_CHORDS = ('D D D A D D A A ' 'D D D A D D A D ' 'A D A D A A D A ' 'D D D A D D A D').split()
TRIAD = {'D': [62, 66, 69], 'A': [61, 64, 69], 'G': [62, 67, 71], 'Bm': [62, 66, 71], 'Em': [64, 67, 71]}
ROOTS = {'D': 38, 'A': 33, 'G': 31, 'Bm': 35, 'Em': 28}

def place(melody, start_beat, transpose=0, speed=1.0):
    out = []; b = start_beat
    for m, d in melody:
        out.append((b, d * speed, m + transpose)); b += d * speed
    return out


def song_menu():
    """Ode to Joy (Brussels Eurodance Mix): 32 bars, 130 BPM, D major."""
    ev = []; bars = 32
    # Bars 0-7: intro groove with a piano riff on the A phrase; 8-23: the full Ode on
    # supersaw; 24-31: "drop", B section + final A an octave up, pizz doubling.
    for bar in range(bars):
        b0 = bar * 4
        chords = [ODE_CHORDS[(bar * 2) % 32], ODE_CHORDS[(bar * 2 + 1) % 32]]
        for half, c in enumerate(chords):
            hb = b0 + half * 2
            for off in (0.5, 1.5):                       # offbeat stabs + offbeat bass
                for n in TRIAD[c]: ev.append(('stab', hb + off, 0.35, n + 12, 0.45))
                ev.append(('bass', hb + off, 0.45, ROOTS[c] + 12, 0.9))
            ev.append(('bass', hb, 0.4, ROOTS[c], 0.7))
            for n in TRIAD[c]: ev.append(('pad', hb, 2, n, 0.22))
        for q in range(4):                               # four on the floor, open hats on offbeats
            ev.append(('drums', b0 + q, 0, 36, 1.0))
            ev.append(('drums', b0 + q + 0.5, 0, 46, 0.45))
            ev.append(('drums', b0 + q + 0.25, 0, 42, 0.2)); ev.append(('drums', b0 + q + 0.75, 0, 42, 0.2))
            if q in (1, 3): ev.append(('drums', b0 + q, 0, 39, 0.8))
        if bar % 8 == 0: ev.append(('drums', b0, 0, 49, 0.8))
        if bar % 8 == 7:                                 # snare roll fill
            for i in range(8): ev.append(('drums', b0 + 2 + i * 0.25, 0, 38, 0.3 + i * 0.08))
    # intro: house piano plays the first phrase twice as chords+melody
    for b, d, m in place(ODE_A1 + ODE_A2, 0):
        ev.append(('piano', b, d * 0.9, m + 12, 0.55)); ev.append(('piano', b, d * 0.9, m, 0.35))
    # main statement: full Ode on supersaw
    for b, d, m in place(ODE, 32):
        ev.append(('lead', b, d * 0.92, m + 12, 0.6))
    # drop: B + A2 an octave up, with pizzicato doubling and piano
    for b, d, m in place(ODE_B + ODE_A2, 96):
        ev.append(('lead', b, d * 0.92, m + 24, 0.5)); ev.append(('pizz', b, d, m + 12, 0.5))
        ev.append(('piano', b, d * 0.9, m + 12, 0.35))
    return dict(title='Ode to Joy (Brussels Eurodance Mix)', bpm=130, bars=bars, events=ev, pump=0.65,
                reverb=1.6, wet=0.3,
                mix={'lead': (0.6, 0.0, 0.45), 'stab': (0.26, 0.25, 0.3), 'piano': (0.5, -0.2, 0.4),
                     'bass': (0.55, 0.0, 0.0), 'pad': (0.3, 0.0, 0.8), 'pizz': (0.35, 0.4, 0.3),
                     'drums': (0.62, 0.0, 0.08)},
                echo={'lead': (0.75, 0.3, 0.5), 'piano': (0.5, 0.25, -0.6)})


def song_main():
    """Please Hold: Public Consultation — 32 bars, 70 BPM, ambient muzak in D.
    The Ode hides in the vibraphone at half speed, as if played by a waiting room."""
    ev = []; bars = 32
    V = {'Dmaj9': [62, 66, 69, 73, 76], 'Asus': [57, 62, 64, 69, 71], 'Gmaj9': [55, 59, 62, 66, 69],
         'Bm9': [59, 62, 66, 69, 73], 'A6': [57, 61, 64, 66, 69], 'Em9': [55, 59, 62, 64, 66]}
    R = {'Dmaj9': 38, 'Asus': 33, 'Gmaj9': 31, 'Bm9': 35, 'A6': 33, 'Em9': 40}
    # bar-by-bar harmony; under the hidden Ode (bars 8-15 and 24-31) it follows the tune
    prog = (['Dmaj9', 'Bm9', 'Gmaj9', 'Asus'] * 2
            + ['Dmaj9', 'Dmaj9', 'Dmaj9', 'Asus', 'Gmaj9', 'Dmaj9', 'A6', 'Asus']
            + ['Bm9', 'Gmaj9', 'Em9', 'Asus'] * 2
            + ['A6', 'Dmaj9', 'A6', 'Bm9', 'Em9', 'A6', 'Dmaj9', 'Asus'])
    for bar, c in enumerate(prog):
        b0 = bar * 4
        # electric piano: gentle rolled chord, then a softer re-strike
        for i, n in enumerate(V[c]): ev.append(('ep', b0 + i * 0.08, 3.6, n, 0.32))
        for n in V[c][1:4]: ev.append(('ep', b0 + 2.5, 1.4, n + 12, 0.14))
        ev.append(('sub', b0, 3.8, R[c], 0.5))
        for n in V[c][:3]: ev.append(('pad', b0, 4, n, 0.16))
        for i in range(8):                               # barely-there shaker
            ev.append(('drums', b0 + i * 0.5, 0, 70, 0.12 if i % 2 else 0.2))
    # hidden Ode: A phrase (bars 8-15) and B phrase (bars 24-31) at half speed
    for b, d, m in place(ODE_A1, 32, 12, speed=2) + place(ODE_B, 96, 12, speed=2):
        ev.append(('vibes', b, d * 0.9, m, 0.42))
    # bars 16-23: a little EP noodle so it does not feel like a strict loop
    noodle = [(74, 1.5), (73, .5), (71, 2), (69, 1), (71, 1), (66, 2),
              (67, 1.5), (69, .5), (71, 2), (73, 4)]
    for b, d, m in place(noodle * 2, 64):
        ev.append(('ep', b, d * 0.9, m, 0.26))
    return dict(title='Please Hold: Public Consultation', bpm=70, bars=bars, events=ev, reverb=3.2, wet=0.5, level=0.6,
                mix={'ep': (0.5, -0.1, 0.6), 'sub': (0.5, 0.0, 0.05), 'pad': (0.35, 0.0, 0.9),
                     'vibes': (0.45, 0.2, 0.8), 'drums': (0.4, 0.3, 0.2)},
                echo={'vibes': (1.5, 0.35, 0.6)})


def song_win():
    """Douze Points for Harmonisation — 24 bars, 122 BPM. Eurovision schlager:
    verse in A minor, chorus in C, last chorus with the obligatory truck-driver key change."""
    ev = []; bars = 24
    CH = {'C': [60, 64, 67], 'G': [59, 62, 67], 'Am': [57, 60, 64], 'F': [57, 60, 65]}
    RT = {'C': 36, 'G': 31, 'Am': 33, 'F': 29}
    verse_prog = ['Am', 'F', 'C', 'G'] * 2
    chorus_prog = ['C', 'G', 'Am', 'F'] * 2
    verse = [(69,1),(69,1),(72,1),(69,1), (65,2),(69,1),(72,1), (67,1),(67,1),(64,1),(67,1), (71,4),
             (69,1),(69,1),(72,1),(74,1), (72,2),(69,2), (67,1),(64,1),(67,1),(72,1), (71,2),(74,2)]
    chorus = [(67,1),(76,1),(76,.5),(74,.5),(72,1), (74,2),(71,1),(67,1),
              (69,1),(72,1),(72,.5),(71,.5),(69,1), (72,3),(67,1),
              (67,1),(76,1),(76,.5),(74,.5),(72,1), (74,1),(76,1),(77,1),(74,1),
              (76,1.5),(74,.5),(72,1),(69,1), (72,2),(74,2)]
    sections = [(0, verse_prog, verse, 0), (8, chorus_prog, chorus, 0), (16, chorus_prog, chorus, 1)]
    for start, prog, mel, tr in sections:
        for i, c in enumerate(prog):
            bar = start + i; b0 = bar * 4; chorus_part = start >= 8
            for n in CH[c]: ev.append(('pad', b0, 4, n + tr, 0.25 if chorus_part else 0.18))
            for q in range(4):
                ev.append(('bass', b0 + q, 0.45, RT[c] + tr, 0.75))
                ev.append(('bass', b0 + q + 0.5, 0.4, RT[c] + 12 + tr, 0.6))
                ev.append(('drums', b0 + q, 0, 36, 0.95))
                ev.append(('drums', b0 + q + 0.5, 0, 42 if not chorus_part else 46, 0.35))
                if q in (1, 3): ev.append(('drums', b0 + q, 0, 39, 0.75))
                if chorus_part:                        # piano stabs on every beat in the chorus
                    for n in CH[c]: ev.append(('piano', b0 + q + 0.5, 0.4, n + 12 + tr, 0.28))
            if not chorus_part:
                for k, n in enumerate(CH[c] + [CH[c][0] + 12]):   # pizz arpeggio in the verse
                    ev.append(('pizz', b0 + k, 1, n + 12 + tr, 0.4))
        for b, d, m in place(mel, start * 4, tr):
            ev.append(('lead', b, d * 0.92, m, 0.55))
            if start >= 8: ev.append(('lead', b, d * 0.92, m - 12, 0.3))   # octave double
        ev.append(('drums', start * 4, 0, 49, 0.9))
    # big drum fill into the key change (bar 15) and into the loop restart (bar 23)
    for fill_bar in (15, 23):
        for i in range(8): ev.append(('drums', fill_bar * 4 + 2 + i * 0.25, 0, 38, 0.35 + i * 0.08))
    return dict(title='Douze Points for Harmonisation', bpm=122, bars=bars, events=ev, pump=0.35,
                reverb=2.2, wet=0.35,
                mix={'lead': (0.45, 0.0, 0.5), 'pad': (0.35, 0.0, 0.8), 'bass': (0.5, 0.0, 0.0),
                     'piano': (0.4, -0.25, 0.3), 'pizz': (0.4, 0.3, 0.3), 'drums': (0.6, 0.0, 0.1)},
                echo={'lead': (0.75, 0.25, 0.4)})


SONGS = {'eurocrat_menu': song_menu, 'eurocrat_main': song_main, 'eurocrat_win': song_win}

if __name__ == '__main__':
    out = sys.argv[1]
    for name, fn in SONGS.items():
        s = fn(); st = render(s)
        wavfile.write(f'{out}/{name}.wav', SR, (st.T * 32767).astype(np.int16))
        write_midi(f'{out}/{name}.mid', s)
        print(f"{name:15s} {st.shape[1] / SR:6.1f}s  {s['bpm']} BPM  {s['title']}")
