"""Eurocrat soundtrack generator.

Three original arrangements, rendered from note events with a tiny numpy synth,
then written as WAV (convert to OGG/M4A with ffmpeg) and Standard MIDI.

  eurocrat_menu    "Ode to Joy (Brussels Eurodance Mix)"      130 BPM  menu / title
  eurocrat_level1  "Pilot Project (Village Fete Waltz)"       160 BPM  level I, 3/4
  eurocrat_level2  "Expansion Phase (Let's Build Together)"   112 BPM  level II
  eurocrat_level3  "Partial Plan: Regulatory Framework"        84 BPM  level III
  eurocrat_level4  "Model Town (Harmonised Trance Anthem)"    138 BPM  level IV
  eurocrat_win     "Douze Points for Harmonisation"           122 BPM  inauguration

The Ode to Joy melody is Beethoven's (Symphony No. 9, 1824) and is in the public
domain. The arrangements here are new; no existing recording or official
arrangement is used. All other melodies are original.

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


def i_accordion(m, dur, v):           # musette accordion: three reeds, one sharp, one flat
    n = int((dur + 0.15) * SR); f = hz(m)
    x = sum(0.6 * square(f * (1 + d), n, 0.42) + 0.4 * saw(f, n, d) for d in (-0.0045, 0, 0.0045)) / 3
    x = lp(hp(x, 250), 3200)
    return x * env(n, 0.03, 0.08, 0.85, 0.08, int(dur * SR)) * v

def i_glock(m, dur, v):               # glockenspiel / village bells
    n = int(1.6 * SR); t = tvec(n); f = hz(m)
    x = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(2 * np.pi * 2.76 * f * t) * np.exp(-t * 8)
    x += 0.15 * np.sin(2 * np.pi * 5.4 * f * t) * np.exp(-t * 18)
    return x * np.exp(-t * 3.2) * v

def i_tuba(m, dur, v):                # oom-pah bass
    n = int((dur + 0.08) * SR); f = hz(m)
    x = np.sin(2 * np.pi * f * tvec(n)) * 0.7 + lp(saw(f, n), 500) * 0.5
    return x * env(n, 0.015, 0.1, 0.6, 0.06, int(dur * SR)) * v

def i_bell(m, dur, v):                # 80s FM bell lead (the "Eurovision 1986" sound)
    n = int((dur + 1.0) * SR); t = tvec(n); f = hz(m)
    x = np.sin(2 * np.pi * f * t + 2.4 * np.exp(-t * 2.5) * np.sin(2 * np.pi * 3.5 * f * t))
    x += 0.5 * np.sin(2 * np.pi * f * t + 0.6 * np.sin(2 * np.pi * f * t))
    return x * np.exp(-t * 1.4) * env(n, 0.003, 0.01, 1, 0.3, int(dur * SR)) * v

def i_pluck(m, dur, v):               # short arp pluck
    n = int((dur + 0.1) * SR); f = hz(m)
    x = saw(f, n, 0.003) * 0.6 + square(f, n, 0.3) * 0.4
    k = np.exp(-tvec(n) * 12)
    return (lp(x, 4500) * k + lp(x, 900) * (1 - k)) * env(n, 0.002, 0.09, 0.2, 0.05, int(dur * SR)) * v

def i_choir(m, dur, v):               # "aah" pad: detuned saws through vowel formants
    n = int((dur + 1.4) * SR); f = hz(m)
    x = sum(saw(f, n, d) for d in (-0.007, -0.002, 0.003, 0.008)) / 4
    t = tvec(n); x *= 1 + 0.03 * np.sin(2 * np.pi * 5 * t)
    y = bp(x, 600, 900) + 0.7 * bp(x, 1000, 1300) + 0.25 * bp(x, 2400, 2900)
    return y * 2.2 * env(n, 0.7, 0.4, 0.85, 1.2, int(dur * SR)) * v


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

def d_wood(v, pitch):                 # clock tick / tock
    n = int(0.09 * SR); t = tvec(n)
    return (np.sin(2 * np.pi * pitch * t) * np.exp(-t * 60) + 0.3 * bp(rng.standard_normal(n), 2000, 6000) * np.exp(-t * 200)) * v

def d_type(v):                        # typewriter key
    n = int(0.05 * SR); t = tvec(n)
    return (bp(rng.standard_normal(n), 1500, 7000) * np.exp(-t * 160) + 0.4 * np.sin(2 * np.pi * 420 * t) * np.exp(-t * 120)) * v

def d_stamp(v):                       # rubber stamp on a desk
    n = int(0.25 * SR); t = tvec(n)
    body = np.sin(2 * np.pi * (70 + 90 * np.exp(-t * 40)) * t) * np.exp(-t * 22)
    return (body + 0.5 * lp(rng.standard_normal(n), 1800) * np.exp(-t * 45)) * v

def d_tamb(v):
    n = int(0.18 * SR); t = tvec(n)
    jingle = bp(rng.standard_normal(n), 6000, 12000) * (np.exp(-t * 30) + 0.3 * np.exp(-t * 9))
    return jingle * v

DRUMS = {36: d_kick, 39: d_clap, 38: d_snare, 42: d_hat, 46: lambda v: d_hat(v, True),
         49: d_crash, 70: d_shaker, 76: lambda v: d_wood(v, 1700), 77: lambda v: d_wood(v, 1250),
         75: d_type, 41: d_stamp, 54: d_tamb}
INSTR = {'lead': i_supersaw, 'stab': i_stab, 'piano': i_piano, 'bass': i_bass, 'sub': i_sub,
         'pizz': i_pizz, 'ep': i_ep, 'vibes': i_vibes, 'pad': i_pad, 'accordion': i_accordion,
         'glock': i_glock, 'tuba': i_tuba, 'bell': i_bell, 'pluck': i_pluck, 'choir': i_choir}
GM = {'lead': 81, 'stab': 90, 'piano': 0, 'bass': 38, 'sub': 33, 'pizz': 45, 'ep': 4,
      'vibes': 11, 'pad': 49, 'accordion': 21, 'glock': 9, 'tuba': 58, 'bell': 14, 'pluck': 84,
      'choir': 52}


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
    loop_n = int(song['bars'] * song.get('bpb', 4) * spb * SR)   # bpb: beats per bar
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
        for k in ('pad', 'stab', 'piano', 'lead', 'choir', 'pluck'):
            if k in buses: buses[k] *= g if k in ('pad', 'stab', 'choir') else (0.6 + 0.4 * g)

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
    meta += vlq(0) + b'\xff\x58\x04' + bytes([song.get('bpb', 4)]) + b'\x02\x18\x08'
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


# ------------------------------------------------------------ campaign levels
# One theme per level, growing with the campaign: a village pilot, a neighbourhood,
# the full regulatory framework, and finally the Model Town.

def song_level1():
    """Level I, Pilot Project: a village-fete musette waltz (3/4, 160 BPM, D major).
    Accordion, glockenspiel and oom-pah tuba; the Ode rewritten as a waltz."""
    ev = []; bpb = 3
    # Ode to Joy in 3/4, one bar per original bar
    W_A1 = [(Fs,1),(Fs,.5),(G,.5),(A,1), (A,1),(G,.5),(Fs,.5),(E,1), (D,1),(D,.5),(E,.5),(Fs,1), (Fs,1.5),(E,.5),(E,1)]
    W_A2 = W_A1[:12] + [(E,1.5),(D,.5),(D,1)]
    W_B  = [(E,1),(E,.5),(Fs,.5),(D,1), (E,1),(Fs,.5),(G,.5),(Fs,.5),(D,.5),
            (E,1),(Fs,.5),(G,.5),(Fs,.5),(E,.5), (D,1),(E,1),(A3,1)]
    ode_ch = ['D','A','D','A', 'D','A','D',('A','D'), 'A',('A','D'),'A',('D','A'), 'D','A','D',('A','D')]
    intro_ch = ['D','D','A','A']
    outro_ch = ['D','G','A','D']
    # bars: 0-3 intro · 4-19 Ode on accordion · 20-27 A1+A2 on glock, accordion in thirds · 28-31 turnaround
    chords = intro_ch + ode_ch + ode_ch[:8] + outro_ch
    bars = len(chords)
    for bar, c in enumerate(chords):
        b0 = bar * bpb
        first, rest = (c, c) if isinstance(c, str) else c
        ev.append(('tuba', b0, 0.8, ROOTS[first] + (12 if bar % 2 else 0), 0.8))       # oom (alternating root / octave)
        for k in (1, 2):                                                              # pah pah
            for n in TRIAD[rest]: ev.append(('accordion', b0 + k, 0.45, n, 0.18))
        ev.append(('drums', b0, 0, 70, 0.25)); ev.append(('drums', b0 + 1, 0, 70, 0.15)); ev.append(('drums', b0 + 2, 0, 70, 0.15))
    # intro: little bell figure
    for bar in range(4):
        for k, n in enumerate([74, 78, 81] if bar < 2 else [73, 76, 81]):
            ev.append(('glock', bar * bpb + k, 1, n, 0.35))
    for b, d, m in place(W_A1 + W_A2 + W_B + W_A2, 4 * bpb):
        ev.append(('accordion', b, d * 0.92, m + 12, 0.5))
    for b, d, m in place(W_B, 12 * bpb):                         # bells join on the B section
        ev.append(('glock', b, d, m + 24, 0.25))
    for b, d, m in place(W_A1 + W_A2, 20 * bpb):
        ev.append(('glock', b, d, m + 24, 0.4))
        lower = {66: 62, 67: 64, 69: 66, 64: 61, 62: 59, 57: 54}.get(m, m - 3)     # a third below, in key
        ev.append(('accordion', b, d * 0.92, lower + 12, 0.38))
    # turnaround: accordion run back to the top
    run = [(81,.5),(79,.5),(78,.5),(76,.5),(74,1), (71,1),(74,1),(79,1), (76,.5),(78,.5),(79,.5),(76,.5),(73,1), (74,2),(69,1)]
    for b, d, m in place(run, 28 * bpb):
        ev.append(('accordion', b, d * 0.9, m, 0.45))
    return dict(title='Pilot Project (Village Fete Waltz)', bpm=160, bpb=bpb, bars=bars, events=ev,
                reverb=1.4, wet=0.25, level=0.8,
                mix={'accordion': (0.6, -0.1, 0.35), 'tuba': (0.45, 0.0, 0.05), 'glock': (0.35, 0.3, 0.6),
                     'drums': (0.3, 0.2, 0.1)})


def song_level2():
    """Level II, Expansion Phase: 80s Eurovision synth-pop (112 BPM, G major).
    FM bell lead, plucky arpeggio, handclaps and tambourine. Original melody."""
    ev = []
    CH = {'G': [67, 71, 74], 'D': [66, 69, 74], 'Em': [67, 71, 76], 'C': [67, 72, 76], 'Am': [69, 72, 76]}
    RT = {'G': 31, 'D': 38, 'Em': 40, 'C': 36, 'Am': 33}
    verse = [(71,1),(71,.5),(72,.5),(74,1),(71,1), (69,1),(69,.5),(71,.5),(74,2),
             (76,1),(74,.5),(72,.5),(71,1),(67,1), (72,1.5),(71,.5),(69,2),
             (71,1),(71,.5),(72,.5),(74,1),(71,1), (69,1),(69,.5),(71,.5),(74,2),
             (76,1),(78,.5),(79,.5),(76,1),(74,1), (72,1),(74,1),(69,2)]
    pre = [(69,.5),(71,.5),(72,1),(72,.5),(74,.5),(76,1), (74,1),(72,1),(71,1),(69,1),
           (69,.5),(71,.5),(72,1),(74,.5),(76,.5),(78,1), (79,2),(78,1),(74,1)]
    chorus = [(76,1.5),(74,.5),(72,1),(74,1), (74,1),(71,1),(71,.5),(72,.5),(74,1),
              (78,1.5),(76,.5),(74,1),(72,1), (71,1),(69,1),(67,2),
              (76,1.5),(74,.5),(72,1),(74,1), (79,1),(78,.5),(76,.5),(74,2),
              (72,1),(74,1),(76,1),(78,1), (79,4)]
    # sections: (start bar, chords per bar, melody or None, intensity 0..2)
    sections = [(0, ['G','D','Em','C'], None, 0),
                (4, ['G','D','Em','C'] * 2, verse, 1),
                (12, ['Am','D','Am','D'], pre, 1),
                (16, ['C','G','D','Em','C','G','D','D'], chorus, 2),
                (24, ['C','G','D','Em','C','G','D','D'], chorus, 3)]
    bars = 32
    for start, prog, mel, lvl in sections:
        for i, c in enumerate(prog):
            bar = start + i; b0 = bar * 4
            for n in CH[c]: ev.append(('pad', b0, 4, n - 12, 0.16 + 0.04 * lvl))
            arp = CH[c] + [CH[c][1] + 12]
            for k in range(16):                                    # 16th arpeggio
                ev.append(('pluck', b0 + k * 0.25, 0.2, arp[[0, 1, 2, 3, 2, 1, 2, 3][k % 8]], 0.3 if k % 4 else 0.42))
            for q in range(4):                                     # 8th-note bass, octave bounce
                ev.append(('bass', b0 + q, 0.45, RT[c], 0.7)); ev.append(('bass', b0 + q + 0.5, 0.4, RT[c] + 12, 0.55))
                ev.append(('drums', b0 + q, 0, 36, 0.85 if lvl else 0.6))
                if q in (1, 3) and lvl: ev.append(('drums', b0 + q, 0, 39, 0.75)); ev.append(('drums', b0 + q, 0, 38, 0.35))
                ev.append(('drums', b0 + q + 0.5, 0, 42, 0.3))
                if lvl >= 2: ev.append(('drums', b0 + q + 0.5, 0, 54, 0.35))
            if lvl >= 2:                                           # chorus piano stabs on the offbeats
                for off in (0.5, 1.5, 2.5, 3.5):
                    for n in CH[c]: ev.append(('piano', b0 + off, 0.3, n, 0.22))
        if mel:
            for b, d, m in place(mel, start * 4):
                ev.append(('bell', b, d * 0.9, m, 0.5))
                if lvl >= 3: ev.append(('lead', b, d * 0.9, m, 0.28))        # last chorus: supersaw doubling
        if start: ev.append(('drums', start * 4, 0, 49, 0.6))
    for fill in (15, 31):
        for i in range(8): ev.append(('drums', fill * 4 + 2 + i * 0.25, 0, 38, 0.3 + i * 0.07))
    return dict(title="Expansion Phase (Let's Build Together)", bpm=112, bars=bars, events=ev, pump=0.25,
                reverb=1.8, wet=0.3, level=0.8,
                mix={'bell': (0.5, 0.0, 0.45), 'pluck': (0.3, 0.35, 0.3), 'pad': (0.35, 0.0, 0.8),
                     'bass': (0.5, 0.0, 0.0), 'piano': (0.4, -0.3, 0.3), 'lead': (0.4, 0.0, 0.5),
                     'drums': (0.55, 0.0, 0.1)},
                echo={'bell': (0.75, 0.3, 0.5), 'pluck': (0.75, 0.25, -0.6)})


def song_level3():
    """Level III, Partial Plan: the full regulatory framework (84 BPM, D minor).
    Tense office ambient: a ticking clock, typewriters, rubber stamps, a pulsing pedal,
    and the Ode in a minor key, as if Brussels had read the small print."""
    ev = []; bars = 32
    CH = {'Dm': [62, 65, 69], 'Bb': [58, 62, 65], 'Gm': [55, 58, 62], 'A7': [57, 61, 64, 67],
          'F': [57, 60, 65], 'C': [55, 60, 64]}
    RT = {'Dm': 38, 'Bb': 34, 'Gm': 31, 'A7': 33, 'F': 29, 'C': 36}
    prog = ['Dm', 'Dm', 'Bb', 'A7'] * 2 + ['Dm', 'C', 'Bb', 'A7'] * 2 + ['Gm', 'Dm', 'Bb', 'A7'] * 2 + ['Dm', 'F', 'Gm', 'A7'] * 2
    for bar, c in enumerate(prog):
        b0 = bar * 4
        for n in CH[c]: ev.append(('pad', b0, 4, n, 0.18))
        ev.append(('sub', b0, 3.8, RT[c], 0.45))
        for k in range(8):                                        # pulsing pedal on D: the deadline is coming
            ev.append(('pluck', b0 + k * 0.5, 0.3, 50, 0.16 + (0.06 if k % 2 == 0 else 0)))
        for q in range(4):                                        # the clock
            ev.append(('drums', b0 + q, 0, 76 if q % 2 == 0 else 77, 0.32))
        if bar % 2 == 0: ev.append(('drums', b0, 0, 41, 0.55))    # stamp
        if bar % 4 in (1, 2):                                     # someone typing
            r = np.random.default_rng(bar)
            for k in range(16):
                if r.random() < 0.55: ev.append(('drums', b0 + k * 0.25 + r.random() * 0.06, 0, 75, 0.2 + 0.2 * r.random()))
        if bar % 4 == 3: ev.append(('glock', b0 + 3, 1, 93, 0.22))  # carriage-return ding
    # the Ode in D minor (F instead of F#), slow and sparse, on electric piano and vibes
    minor = lambda mel: [(65 if m == Fs else m, d) for m, d in mel]
    for b, d, m in place(minor(ODE_A1), 8 * 4, 0, speed=1):
        ev.append(('ep', b, d * 0.9, m, 0.3))
    for b, d, m in place(minor(ODE_A2), 24 * 4, 12, speed=1):
        ev.append(('vibes', b, d * 0.9, m, 0.32))
    # bars 16-23: a dry, worried counter-line
    worry = [(69,2),(70,1),(69,1), (67,3),(65,1), (64,2),(65,1),(67,1), (61,4),
             (62,2),(64,1),(65,1), (67,2),(65,1),(64,1), (62,2),(61,2), (57,4)]
    for b, d, m in place(worry, 16 * 4):
        ev.append(('ep', b, d * 0.85, m + 12, 0.24))
    return dict(title='Partial Plan: Regulatory Framework', bpm=84, bars=bars, events=ev, reverb=2.6, wet=0.42,
                level=0.62,
                mix={'pad': (0.4, 0.0, 0.8), 'sub': (0.42, 0.0, 0.05), 'pluck': (0.22, 0.2, 0.25),
                     'ep': (0.62, -0.15, 0.6), 'vibes': (0.45, 0.2, 0.7), 'glock': (0.3, 0.4, 0.6),
                     'drums': (0.5, -0.1, 0.15)},
                echo={'vibes': (1.5, 0.3, 0.6), 'ep': (1.0, 0.2, -0.5)})


def song_level4():
    """Level IV, Model Town: a Euro-trance anthem (138 BPM, F major).
    Intro, the Ode on supersaws, a breakdown with choir and bells, then the big drop."""
    ev = []; bars = 32; T = 3                                     # D major -> F major
    CHF = {'D': [65, 69, 72], 'A': [64, 67, 72], 'Dm': [62, 65, 69], 'Bb': [62, 65, 70]}
    RTF = {'D': 41, 'A': 36, 'Dm': 38, 'Bb': 34}                  # F, C, Dm, Bb
    sections = [(0, 'intro'), (8, 'main'), (16, 'break'), (24, 'drop')]
    for start, kind in sections:
        for i in range(8):
            bar = start + i; b0 = bar * 4
            halves = [ODE_CHORDS[(i * 2 + (16 if kind == 'break' else 0)) % 32],
                      ODE_CHORDS[(i * 2 + 1 + (16 if kind == 'break' else 0)) % 32]]
            if kind == 'intro': halves = [['D', 'D', 'Dm', 'Bb'][i % 4]] * 2
            for h, c in enumerate(halves):
                hb = b0 + h * 2
                for n in CHF[c]:
                    if kind in ('main', 'drop'): ev.append(('stab', hb, 1.9, n, 0.28))
                    ev.append(('choir' if kind in ('break', 'drop') else 'pad', hb, 2, n - (0 if kind == 'break' else 12), 0.3))
                if kind != 'break':                               # rolling 16th bass: _ x x x
                    for q in range(2):
                        for s16 in (1, 2, 3):
                            ev.append(('bass', hb + q + s16 * 0.25, 0.2, RTF[c] + 12, 0.7))
                else:
                    ev.append(('sub', hb, 2, RTF[c], 0.45))
                arp = CHF[c] + [CHF[c][0] + 12]
                for k in range(8):
                    ev.append(('pluck', hb + k * 0.25, 0.2, arp[[0, 2, 1, 3][k % 4]] + 12, 0.28 if kind != 'intro' else 0.35))
            if kind != 'break':
                for q in range(4):
                    ev.append(('drums', b0 + q, 0, 36, 1.0))
                    ev.append(('drums', b0 + q + 0.5, 0, 46, 0.4))
                    ev.append(('drums', b0 + q + 0.25, 0, 42, 0.18)); ev.append(('drums', b0 + q + 0.75, 0, 42, 0.18))
                    if q in (1, 3) and kind != 'intro': ev.append(('drums', b0 + q, 0, 39, 0.7))
            elif i >= 4:                                          # build: snare roll accelerating into the drop
                step = 1 if i == 4 else 0.5 if i == 5 else 0.25 if i == 6 else 0.125
                k = 0
                while k * step < 4:
                    ev.append(('drums', b0 + k * step, 0, 38, 0.15 + 0.1 * (i - 4) + 0.1 * (k * step / 4))); k += 1
        ev.append(('drums', start * 4, 0, 49, 0.9 if kind != 'break' else 0.5))
    for b, d, m in place(ODE_A1 + ODE_A2, 8 * 4, T + 12):         # main: the Ode on supersaw
        ev.append(('lead', b, d * 0.92, m, 0.5))
    for b, d, m in place(ODE_B + ODE_A2, 16 * 4, T + 12):         # breakdown: bells and piano, very European
        ev.append(('bell', b, d * 0.9, m, 0.45)); ev.append(('piano', b, d * 0.9, m - 12, 0.3))
    for b, d, m in place(ODE_A1 + ODE_A2, 24 * 4, T + 12):        # drop: doubled an octave up
        ev.append(('lead', b, d * 0.92, m, 0.5)); ev.append(('lead', b, d * 0.92, m + 12, 0.22))
    return dict(title='Model Town (Harmonised Trance Anthem)', bpm=138, bars=bars, events=ev, pump=0.55,
                reverb=2.4, wet=0.35, level=0.82,
                mix={'lead': (0.68, 0.0, 0.45), 'stab': (0.2, 0.2, 0.4), 'pad': (0.3, 0.0, 0.8),
                     'choir': (0.38, 0.0, 0.9), 'bass': (0.55, 0.0, 0.0), 'sub': (0.5, 0.0, 0.05),
                     'pluck': (0.3, -0.35, 0.3), 'bell': (0.45, 0.15, 0.6), 'piano': (0.4, -0.2, 0.5),
                     'drums': (0.62, 0.0, 0.08)},
                echo={'lead': (0.75, 0.3, 0.5), 'pluck': (0.75, 0.3, -0.6), 'bell': (0.75, 0.3, 0.6)})


SONGS = {'eurocrat_menu': song_menu, 'eurocrat_level1': song_level1, 'eurocrat_level2': song_level2,
         'eurocrat_level3': song_level3, 'eurocrat_level4': song_level4, 'eurocrat_win': song_win}

if __name__ == '__main__':
    out = sys.argv[1]
    only = sys.argv[2:]                       # optional: render just these names
    for name, fn in SONGS.items():
        if only and name not in only: continue
        s = fn(); st = render(s)
        wavfile.write(f'{out}/{name}.wav', SR, (st.T * 32767).astype(np.int16))
        write_midi(f'{out}/{name}.mid', s)
        print(f"{name:15s} {st.shape[1] / SR:6.1f}s  {s['bpm']} BPM  {s['title']}")
