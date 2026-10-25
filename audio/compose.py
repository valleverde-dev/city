"""CityBuilder soundtrack generator — darksynth / synthwave, Syndicate-style.
Composes note events once, then renders them to WAV (-> OGG) and to Standard MIDI.
"""
import numpy as np, struct, sys
from scipy.signal import butter, lfilter, fftconvolve
from scipy.io import wavfile

SR = 44100
rng = np.random.default_rng(1993)

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)

# ---------- oscillators / helpers ----------
def saw(f, n, detune=0.0, phase=None):
    t = np.arange(n) / SR
    ph = rng.random() if phase is None else phase
    return 2 * ((t * f * (1 + detune) + ph) % 1.0) - 1

def square(f, n, pw=0.5):
    t = np.arange(n) / SR
    return np.where((t * f) % 1.0 < pw, 1.0, -1.0)

def adsr(n, a, d, s, r, sustain_n):
    env = np.zeros(n)
    a, d, r = int(a * SR), int(d * SR), int(r * SR)
    sustain_n = max(sustain_n, 1)
    idx = np.arange(n)
    env = np.where(idx < a, idx / max(a, 1), 0)
    dec = (idx >= a) & (idx < a + d)
    env = np.where(dec, 1 - (1 - s) * (idx - a) / max(d, 1), env)
    env = np.where((idx >= a + d) & (idx < sustain_n), s, env)
    rel = idx >= sustain_n
    lvl = s if sustain_n > a + d else 1.0
    env = np.where(rel, lvl * np.clip(1 - (idx - sustain_n) / max(r, 1), 0, 1), env)
    return env

def lp(x, cut):
    b, a = butter(2, min(cut, SR / 2 - 100) / (SR / 2), 'low')
    return lfilter(b, a, x)

def hp(x, cut):
    b, a = butter(2, cut / (SR / 2), 'high')
    return lfilter(b, a, x)

# ---------- instruments ----------
def inst_bass(m, dur, vel):
    n = int((dur + 0.15) * SR)
    f = hz(m)
    x = saw(f, n) * 0.7 + square(f / 2, n) * 0.3
    # pluck-ish: blend bright + dark by time
    bright, dark = lp(x, 1400), lp(x, 350)
    k = np.exp(-np.arange(n) / (SR * 0.08))
    y = bright * k + dark * (1 - k)
    return y * adsr(n, 0.004, 0.1, 0.8, 0.08, int(dur * SR)) * vel

def inst_pad(m, dur, vel):
    n = int((dur + 1.2) * SR)
    f = hz(m)
    x = sum(saw(f, n, d) for d in (-0.006, -0.002, 0.003, 0.007)) / 4
    y = lp(x, 1800)
    return y * adsr(n, 0.6, 0.5, 0.75, 1.1, int(dur * SR)) * vel

def inst_arp(m, dur, vel):
    n = int((dur + 0.1) * SR)
    f = hz(m)
    x = square(f, n, 0.3) * 0.6 + saw(f, n, 0.004) * 0.4
    y = lp(x, 3200)
    return y * adsr(n, 0.002, 0.12, 0.25, 0.06, int(dur * SR)) * vel

def inst_lead(m, dur, vel):
    n = int((dur + 0.4) * SR)
    t = np.arange(n) / SR
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t / 0.4, 0, 1)
    ph = np.cumsum(hz(m) * vib) / SR
    x = (2 * (ph % 1) - 1) * 0.5 + (2 * ((ph * 1.005) % 1) - 1) * 0.5
    y = lp(x, 2600)
    return y * adsr(n, 0.03, 0.2, 0.7, 0.35, int(dur * SR)) * vel

def drum_kick(vel):
    n = int(0.4 * SR); t = np.arange(n) / SR
    f = 45 + 110 * np.exp(-t * 28)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    y += 0.3 * lp(rng.standard_normal(n), 3000) * np.exp(-t * 200)
    return np.tanh(y * 1.6) * vel

def drum_snare(vel):
    n = int(0.35 * SR); t = np.arange(n) / SR
    noise = hp(lp(rng.standard_normal(n), 7000), 900) * np.exp(-t * 13)
    body = np.sin(2 * np.pi * 185 * t) * np.exp(-t * 25)
    return (noise * 0.8 + body * 0.5) * vel

def drum_hat(vel, open_=False):
    n = int((0.25 if open_ else 0.06) * SR); t = np.arange(n) / SR
    y = hp(rng.standard_normal(n), 7500) * np.exp(-t * (14 if open_ else 70))
    return y * vel

DRUMS = {36: drum_kick, 38: drum_snare, 42: drum_hat, 46: lambda v: drum_hat(v, True)}
INSTR = {'bass': inst_bass, 'pad': inst_pad, 'arp': inst_arp, 'lead': inst_lead}
GM_PROGRAM = {'bass': 38, 'pad': 89, 'arp': 81, 'lead': 81}  # synth bass, warm pad, saw lead
CHANNEL = {'bass': 0, 'pad': 1, 'arp': 2, 'lead': 3, 'drums': 9}

# ---------- effects ----------
def reverb(x, secs=2.2, mix=0.25):
    n = int(secs * SR); t = np.arange(n) / SR
    ir = rng.standard_normal((2, n)) * np.exp(-t * 3.2)
    ir[:, :int(0.01 * SR)] *= np.linspace(0, 1, int(0.01 * SR))
    ir = lp(ir, 6000)
    wet = np.stack([fftconvolve(x, ir[0])[:len(x)], fftconvolve(x, ir[1])[:len(x)]])
    wet /= np.max(np.abs(wet)) + 1e-9
    return wet * mix

def delay(x, secs, fb=0.4, taps=5):
    y = np.zeros_like(x); d = int(secs * SR)
    for i in range(1, taps + 1):
        if d * i < len(x):
            y[d * i:] += x[:-d * i] * fb ** i
    return lp(y, 4000)

# ---------- song rendering ----------
def render(events, bpm, bars, mixes, sidechain=0.0):
    spb = 60 / bpm
    loop_n = int(bars * 4 * spb * SR)
    tail = int(4 * SR)
    total = loop_n + tail
    buses = {k: np.zeros(total) for k in list(INSTR) + ['drums']}
    kick_times = []
    for ins, beat, dur, note, vel in events:
        s = int(beat * spb * SR)
        if ins == 'drums':
            y = DRUMS[note](vel)
            if note == 36: kick_times.append(s)
        else:
            y = INSTR[ins](note, dur * spb, vel)
        e = min(s + len(y), total)
        buses[ins][s:e] += y[:e - s]

    # sidechain pump on pads/arp
    if sidechain and kick_times:
        env = np.ones(total)
        duck_n = int(spb * 0.9 * SR)
        shape = 1 - sidechain * np.exp(-np.arange(duck_n) / (SR * 0.09))
        for s in kick_times:
            e = min(s + duck_n, total)
            env[s:e] = np.minimum(env[s:e], shape[:e - s])
        buses['pad'] *= env; buses['arp'] *= env * 0.5 + 0.5

    pan = {'bass': 0.0, 'pad': 0.0, 'arp': 0.35, 'lead': -0.15, 'drums': 0.0}
    mixL = np.zeros(total); mixR = np.zeros(total); send = np.zeros(total)
    for k, x in buses.items():
        g = mixes.get(k, 0)
        if not g: continue
        x = x * g
        if k == 'arp':
            dl = delay(x, spb * 0.75, 0.45)
            mixL += dl * 0.5; mixR -= 0  # ping: delay left
            mixR += delay(x, spb * 0.5, 0.35) * 0.5
        if k == 'lead':
            d2 = delay(x, spb * 0.75, 0.35); mixL += d2 * 0.35; mixR += d2 * 0.35
        p = pan[k]
        mixL += x * np.sqrt(0.5 * (1 - p)); mixR += x * np.sqrt(0.5 * (1 + p))
        send += x * {'pad': 1.0, 'lead': 0.8, 'arp': 0.6, 'drums': 0.25, 'bass': 0.05}[k]
    rv = reverb(send, 2.6, mix=0.35 * np.max(np.abs(send)))
    st = np.stack([mixL, mixR]) + rv

    # seamless loop: fold the tail back over the start
    out = st[:, :loop_n].copy()
    out[:, :tail] += st[:, loop_n:loop_n + tail]
    out = np.tanh(out / (np.max(np.abs(out)) + 1e-9) * 1.3) / np.tanh(1.3) * 0.89
    return out

def write_wav(path, st):
    wavfile.write(path, SR, (st.T * 32767).astype(np.int16))

# ---------- MIDI writer (no deps) ----------
def vlq(n):
    out = [n & 0x7F]; n >>= 7
    while n: out.insert(0, (n & 0x7F) | 0x80); n >>= 7
    return bytes(out)

def write_midi(path, events, bpm, title):
    tpq = 480
    tracks = []
    meta = vlq(0) + b'\xff\x51\x03' + int(60_000_000 / bpm).to_bytes(3, 'big')
    meta += vlq(0) + b'\xff\x58\x04\x04\x02\x18\x08'
    t = title.encode(); meta += vlq(0) + b'\xff\x03' + vlq(len(t)) + t
    tracks.append(meta + vlq(0) + b'\xff\x2f\x00')
    for ins in ['bass', 'pad', 'arp', 'lead', 'drums']:
        evs = [e for e in events if e[0] == ins]
        if not evs: continue
        ch = CHANNEL[ins]; raw = []
        for _, beat, dur, note, vel in evs:
            v = max(1, min(127, int(vel * 110)))
            on = int(beat * tpq); off = on + max(1, int((dur if ins != 'drums' else 0.1) * tpq))
            raw += [(on, 1, bytes([0x90 | ch, note, v])), (off, 0, bytes([0x80 | ch, note, 0]))]
        raw.sort(key=lambda r: (r[0], r[1]))
        name = ins.capitalize().encode()
        data = vlq(0) + b'\xff\x03' + vlq(len(name)) + name
        if ins != 'drums': data += vlq(0) + bytes([0xC0 | ch, GM_PROGRAM[ins]])
        last = 0
        for tick, _, msg in raw:
            data += vlq(tick - last) + msg; last = tick
        tracks.append(data + vlq(0) + b'\xff\x2f\x00')
    with open(path, 'wb') as f:
        f.write(b'MThd' + struct.pack('>IHHH', 6, 1, len(tracks), tpq))
        for tr in tracks: f.write(b'MTrk' + struct.pack('>I', len(tr)) + tr)

# ---------- compositions ----------
# Chords in A minor: Am, F, Dm, E (harmonic-minor dominant for the corporate-noir tension)
CH = {'Am': [57, 60, 64], 'F': [53, 57, 60], 'Dm': [50, 53, 57], 'E': [52, 56, 59],
      'C': [48, 52, 55], 'G': [55, 59, 62], 'Fmaj7': [53, 57, 60, 64], 'Em': [52, 55, 59]}
ROOT = {'Am': 33, 'F': 29, 'Dm': 26, 'E': 28, 'C': 36, 'G': 31, 'Fmaj7': 29, 'Em': 28}

def theme_main():
    """'Central District' — in-game theme, 104 BPM, 32 bars."""
    ev = []
    prog = ['Am', 'Am', 'F', 'F', 'Dm', 'Dm', 'E', 'E']  # 8 bars
    bars = 32
    for bar in range(bars):
        c = prog[bar % 8]; b0 = bar * 4; sec = bar // 8  # 0..3 sections
        # pad: whole bars
        for n in CH[c]: ev.append(('pad', b0, 4, n + 12, 0.33))
        # bass: driving 8ths with octave jumps
        r = ROOT[c]
        for i in range(8):
            note = r + (12 if i in (3, 7) else 0)
            ev.append(('bass', b0 + i * 0.5, 0.42, note, 0.85 if i % 2 == 0 else 0.65))
        # arp: 16ths up/down from section 1 on (sec 0 = intro feel with half-density)
        tones = CH[c] + [CH[c][0] + 12]
        patt = [0, 1, 2, 3, 2, 1, 0, 1]
        step = 0.25 if sec >= 1 else 0.5
        for i in range(int(4 / step)):
            ev.append(('arp', b0 + i * step, step * 0.8, tones[patt[i % 8]] + 12, 0.5 + 0.2 * (i % 4 == 0)))
        # drums
        for q in range(4):
            ev.append(('drums', b0 + q, 0, 36, 1.0))
            if q in (1, 3) and sec >= 1: ev.append(('drums', b0 + q, 0, 38, 0.85))
            ev.append(('drums', b0 + q + 0.5, 0, 46 if (q == 3 and bar % 2) else 42, 0.5))
            if sec >= 2: ev.append(('drums', b0 + q + 0.25, 0, 42, 0.25)); ev.append(('drums', b0 + q + 0.75, 0, 42, 0.25))
    # lead melody in sections 2-3 (bars 16-31), two 8-bar phrases
    phrase_a = [(0, 2, 76), (2, 1, 74), (3, 1, 72), (4, 3, 72), (7, 1, 69),
                (8, 2, 77), (10, 1, 76), (11, 1, 74), (12, 4, 72),
                (16, 2, 74), (18, 1, 72), (19, 1, 69), (20, 3, 69), (23, 1, 71),
                (24, 2, 71), (26, 1, 68), (27, 1, 71), (28, 4, 76)]
    phrase_b = [(0, 1.5, 81), (1.5, 0.5, 79), (2, 2, 76), (4, 3, 77), (7, 1, 76),
                (8, 2, 74), (10, 1, 72), (11, 1, 74), (12, 4, 77),
                (16, 2, 74), (18, 1, 77), (19, 1, 76), (20, 3, 74), (23, 1, 72),
                (24, 2, 71), (26, 1, 74), (27, 1, 76), (28, 4, 69)]
    for start, ph in ((64, phrase_a), (96, phrase_b)):
        for b, d, n in ph: ev.append(('lead', start + b, d * 0.95, n, 0.55))
    return ev, 104, bars

def theme_menu():
    """'Corporate Terminal' — menu theme, 80 BPM, 16 bars, ambient & tense."""
    ev = []
    prog = ['Am', 'Fmaj7', 'C', 'Em']
    bars = 16
    for bar in range(bars):
        c = prog[(bar // 2) % 4]; b0 = bar * 4; half = bar // 8
        if bar % 2 == 0:
            for n in CH[c]: ev.append(('pad', b0, 8, n, 0.38))
            ev.append(('bass', b0, 7.5, ROOT[c], 0.55))
        tones = CH[c] + [CH[c][0] + 12, CH[c][1] + 12]
        patt = [0, 2, 4, 1, 3, 2, 4, 3]
        for i in range(8):
            ev.append(('arp', b0 + i * 0.5, 0.4, tones[patt[i % len(patt)] % len(tones)] + 12, 0.38))
        ev.append(('drums', b0, 0, 36, 0.6))
        if half == 1:
            ev.append(('drums', b0 + 2, 0, 36, 0.45))
            for q in range(4): ev.append(('drums', b0 + q + 0.5, 0, 42, 0.25))
    return ev, 80, bars

if __name__ == '__main__':
    out = sys.argv[1]
    for name, fn, mix, sc in [
        ('citybuilder_main_theme', theme_main,
         {'bass': 0.55, 'pad': 0.45, 'arp': 0.32, 'lead': 0.42, 'drums': 0.7}, 0.6),
        ('citybuilder_menu_theme', theme_menu,
         {'bass': 0.5, 'pad': 0.55, 'arp': 0.3, 'drums': 0.5}, 0.35)]:
        ev, bpm, bars = fn()
        st = render(ev, bpm, bars, mix, sc)
        write_wav(f'{out}/{name}.wav', st)
        write_midi(f'{out}/{name}.mid', ev, bpm, name)
        print(name, f'{st.shape[1]/SR:.1f}s', bpm, 'BPM')
