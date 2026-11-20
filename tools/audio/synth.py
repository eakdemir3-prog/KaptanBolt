"""Kaptan Bolt — özgün müzik ve ses efektleri üretici.

Tamamen kodla bestelenir ve sentezlenir (hazır örnek/telifli parça yok).
Çalıştır:  python3 tools/audio/synth.py   ->  public/audio/*.ogg
"""
import os, subprocess, numpy as np
from scipy.signal import fftconvolve, butter, sosfilt

SR = 44100
OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'public', 'audio')
TMP = '/tmp/kb_audio'
os.makedirs(OUT, exist_ok=True); os.makedirs(TMP, exist_ok=True)
rng = np.random.default_rng(7)

# ---------------- temel araçlar ----------------
def t_(d): return np.arange(int(d * SR)) / SR
def midi(n): return 440.0 * 2 ** ((n - 69) / 12)
NOTE = {'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11}
def nm(s):  # 'D5' -> midi
    name, octv = s[:-1], int(s[-1]); return 12 * (octv + 1) + NOTE[name]

def env(n, a=0.005, d=0.1, s=0.6, r=0.2, dur=None):
    """ADSR zarfı (saniye)"""
    total = n / SR
    dur = total - r if dur is None else dur
    e = np.zeros(n)
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-6), e)
    m = (t >= a) & (t < a + d); e[m] = 1 - (1 - s) * (t[m] - a) / max(d, 1e-6)
    m = (t >= a + d) & (t < dur); e[m] = s
    m = t >= dur; e[m] = s * np.exp(-(t[m] - dur) / max(r / 4, 1e-4))
    return e

def lp(x, f, order=2):
    sos = butter(order, min(f, SR / 2 - 100) / (SR / 2), 'low', output='sos'); return sosfilt(sos, x)
def hp(x, f, order=2):
    sos = butter(order, f / (SR / 2), 'high', output='sos'); return sosfilt(sos, x)
def bp(x, lo, hi, order=2):
    sos = butter(order, [lo / (SR / 2), min(hi, SR / 2 - 100) / (SR / 2)], 'band', output='sos'); return sosfilt(sos, x)

def saw(f, t, detune=0.0):
    ph = (f * (1 + detune)) * t; return 2 * (ph - np.floor(ph + 0.5))
def tri(f, t): return 2 * np.abs(saw(f, t)) - 1
def sq(f, t, duty=0.5): ph = (f * t) % 1; return np.where(ph < duty, 1.0, -1.0)

def reverb_ir(seconds=1.8, damp=3000, stereo=True):
    n = int(seconds * SR); t = np.arange(n) / SR
    chans = []
    for k in range(2 if stereo else 1):
        noise = rng.standard_normal(n) * np.exp(-t * 6.9 / seconds)
        noise = lp(noise, damp); noise[:int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
        chans.append(noise / np.sqrt(np.sum(noise ** 2)))
    return chans

IR_HALL = reverb_ir(2.2, 4500)
IR_ROOM = reverb_ir(0.8, 5000)
def reverb(st, ir=IR_HALL, wet=0.25):
    L, R = st
    wl = fftconvolve(L, ir[0])[:len(L)]; wr = fftconvolve(R, ir[1])[:len(R)]
    return [L * (1 - wet) + wl * wet * 3, R * (1 - wet) + wr * wet * 3]

def pan(x, p=0.0):  # -1 sol .. 1 sağ
    return [x * np.sqrt((1 - p) / 2), x * np.sqrt((1 + p) / 2)]
def mix_into(buf, st, at):
    i = int(at * SR); n = min(len(st[0]), len(buf[0]) - i)
    if n <= 0: return
    buf[0][i:i + n] += st[0][:n]; buf[1][i:i + n] += st[1][:n]

def normalize(st, peak=0.89):
    m = max(np.max(np.abs(st[0])), np.max(np.abs(st[1])), 1e-9); return [st[0] * peak / m, st[1] * peak / m]
def soft_clip(st): return [np.tanh(st[0] * 1.2) / np.tanh(1.2), np.tanh(st[1] * 1.2) / np.tanh(1.2)]

def write(name, st, mono=False, q=4, peak=0.85):
    st = normalize(st, peak)
    wav = os.path.join(TMP, name + '.wav')
    import wave
    data = np.stack(st, axis=1) if not mono else ((st[0] + st[1]) / 2)[:, None]
    pcm = (np.clip(data, -1, 1) * 32767).astype('<i2')
    with wave.open(wav, 'wb') as w:
        w.setnchannels(1 if mono else 2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    out = os.path.join(OUT, name + '.ogg')
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-c:a', 'libvorbis', '-q:a', str(q), out], check=True)
    print(f'{name}.ogg  {os.path.getsize(out) // 1024} KB')

# ---------------- enstrümanlar ----------------
_pl_cache = {}
def pluck(f, dur, bright=0.5):
    """Karplus-Strong telli/marimba benzeri tını (IIR filtre ile hızlı)"""
    from scipy.signal import lfilter
    key = (round(f, 2), round(dur, 3), bright)
    if key in _pl_cache: return _pl_cache[key]
    n = int(dur * SR); N = max(2, int(SR / f))
    dec = 0.996 - 0.004 * (1 - bright)
    x = np.zeros(n); burst = lp(rng.uniform(-1, 1, N), 2000 + 6000 * bright, 1); x[:N] = burst[:n]
    a = np.zeros(N + 2); a[0] = 1; a[N] = -0.5 * dec; a[N + 1] = -0.5 * dec
    out = lfilter([1.0], a, x) * env(n, 0.002, 0.05, 0.8, 0.05)
    _pl_cache[key] = out
    return out

def bell(f, dur, ratio=3.5, index=2.5):
    t = t_(dur); e = np.exp(-t * 3.2)
    mod = np.sin(2 * np.pi * f * ratio * t) * index * np.exp(-t * 5)
    return np.sin(2 * np.pi * f * t + mod) * e

def mallet(f, dur):  # marimba
    t = t_(dur); e = np.exp(-t * 9)
    return (np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 30)) * e

def pad(f, dur, bright=1800):
    t = t_(dur)
    x = sum(saw(f, t, d) for d in (-0.006, 0.0, 0.007)) / 3 + 0.4 * saw(f / 2, t, 0.003)
    return lp(x, bright) * env(len(t), 0.6, 0.4, 0.8, 0.8)

def lead(f, dur, kind='soft'):
    t = t_(dur)
    vib = 1 + 0.004 * np.sin(2 * np.pi * 5.5 * t) * np.clip((t - 0.15) * 4, 0, 1)
    if kind == 'square': x = lp(sq(f * vib, t, 0.3), 3500) * 0.7
    elif kind == 'brass': raw = saw(f * vib, t); k = np.exp(-t * 6); x = lp(raw, 3700) * k + lp(raw, 1200) * (1 - k)
    else: x = 0.6 * np.sin(2 * np.pi * f * vib * t) + 0.3 * tri(f * vib, t) + 0.12 * np.sin(4 * np.pi * f * vib * t)
    return x * env(len(t), 0.02, 0.1, 0.75, min(0.25, dur * 0.4))

def bass(f, dur, kind='round'):
    t = t_(dur)
    if kind == 'pluck': raw = saw(f, t); k = np.exp(-t * 12); x = lp(raw, 1800) * k + lp(raw, 300) * (1 - k)
    else: x = np.sin(2 * np.pi * f * t) + 0.3 * tri(f, t)
    return x * env(len(t), 0.005, 0.15, 0.7, 0.08)

def kick(dur=0.35, punch=1.0):
    t = t_(dur); f = 45 + 110 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 9) * punch + 0.2 * lp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 80)
def snare(dur=0.25):
    t = t_(dur)
    return bp(rng.standard_normal(len(t)), 1200, 8000) * np.exp(-t * 18) * 0.7 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 25) * 0.5
def hat(dur=0.06, open_=False):
    t = t_(0.25 if open_ else dur)
    return hp(rng.standard_normal(len(t)), 7000) * np.exp(-t * (14 if open_ else 70)) * 0.35
def shaker(dur=0.09):
    t = t_(dur); return bp(rng.standard_normal(len(t)), 4000, 12000) * np.sin(np.pi * t / dur) ** 2 * 0.25

# ---------------- beste ----------------
# Kaptan Bolt teması: D minör, macera duygusu. Akorlar (kök, tip) ölçü başına.
PROG_A = [('D', 'm'), ('Bb', 'M'), ('F', 'M'), ('C', 'M')]
PROG_B = [('G', 'm'), ('Bb', 'M'), ('C', 'M'), ('A', 'M')]
def chord(root, kind, octave=3):
    r = nm(root + str(octave)); third = 3 if kind == 'm' else 4
    return [r, r + third, r + 7]

# Ana motif (nota, vuruş başlangıcı, süre) — 4 ölçülük cümleler
THEME_1 = [('D5', 0, 1), ('F5', 1, 0.5), ('A5', 1.5, 1.5), ('G5', 3, 0.5), ('F5', 3.5, 0.5),
           ('F5', 4, 1), ('E5', 5, 0.5), ('D5', 5.5, 1), ('C5', 6.5, 1.5),
           ('A4', 8, 1), ('C5', 9, 0.5), ('F5', 9.5, 1), ('E5', 10.5, 0.5), ('F5', 11, 1),
           ('G5', 12, 1.5), ('E5', 13.5, 0.5), ('C5', 14, 2)]
THEME_2 = [('Bb4', 0, 1), ('D5', 1, 0.5), ('G5', 1.5, 1.5), ('F5', 3, 1),
           ('F5', 4, 1), ('D5', 5, 0.5), ('Bb5', 5.5, 1.5), ('A5', 7, 1),
           ('G5', 8, 1), ('E5', 9, 0.5), ('C5', 9.5, 1), ('E5', 10.5, 0.5), ('G5', 11, 1),
           ('A5', 12, 1), ('C#5', 13, 1), ('E5', 14, 1), ('A5', 15, 1)]

def render_track(name, bpm, style, transpose=0, bars_loops=1):
    """style: 'menu' | 'game' (lead/arp enstrümanı seçilebilir) | 'boss'"""
    beat = 60 / bpm
    prog = PROG_A + PROG_A + PROG_B + PROG_A if style != 'boss' else [('D', 'm'), ('D', 'm'), ('Bb', 'M'), ('A', 'M')] * 4
    bars = len(prog); length = bars * 4 * beat
    tail = 2.5
    L = np.zeros(int((length + tail) * SR)); R = np.zeros_like(L); buf = [L, R]
    tr = lambda n: n + transpose
    lead_kind = style_opts.get('lead', 'soft'); arp_inst = style_opts.get('arp', 'pluck')
    for b, (root, kind) in enumerate(prog):
        t0 = b * 4 * beat
        ch = [tr(n) for n in chord(root, kind)]
        # pad
        if style != 'boss' or b % 2 == 0:
            for k, n in enumerate(ch):
                mix_into(buf, pan(pad(midi(n), 4 * beat + 0.6, 1400 if style == 'game' else 2000) * (0.11 if style == 'game' else 0.13), (k - 1) * 0.5), t0)
        # bas
        if style == 'boss':
            for i in range(8):
                f = midi(ch[0] - 12 + (7 if i in (3, 7) else 0))
                mix_into(buf, pan(bass(f, beat * 0.45, 'pluck') * 0.5), t0 + i * beat / 2)
        else:
            pattern = [(0, 1.5), (1.5, 0.5), (2, 1.5), (3.5, 0.5)] if style == 'menu' else [(0, 2), (2, 2)]
            for (bt, d) in pattern:
                n = ch[0] - 12 + (7 if bt == 3.5 else 0)
                mix_into(buf, pan(bass(midi(n), d * beat, 'round') * (0.38 if style == 'menu' else 0.3)), t0 + bt * beat)
        # arpej
        arp = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 24] if style != 'boss' else [ch[0] + 12, ch[0] + 24]
        step = 0.5 if style != 'game' else 0.5
        for i in range(int(4 / step)):
            if style == 'game' and i % 2 == 1 and b % 2 == 0: continue
            n = arp[i % len(arp)]
            d = beat * step * 1.6
            if arp_inst == 'bell': x = bell(midi(n), d * 2, 3.5, 1.2) * 0.12
            elif arp_inst == 'mallet': x = mallet(midi(n), d * 2) * 0.22
            else: x = pluck(midi(n), d * 2, 0.55) * 0.2
            mix_into(buf, pan(x, 0.45 if i % 2 else -0.45), t0 + i * step * beat)
        # davul
        if style == 'menu':
            for i in range(4):
                if i in (0, 2): mix_into(buf, pan(kick(0.3, 0.6)), t0 + i * beat)
                if i in (1, 3): mix_into(buf, pan(snare() * 0.35, 0.1), t0 + i * beat)
            for i in range(8): mix_into(buf, pan(hat() * (0.5 if i % 2 else 0.8), 0.3), t0 + i * beat / 2)
        elif style == 'game':
            for i in range(8): mix_into(buf, pan(shaker() * (0.6 if i % 2 else 0.35), -0.3), t0 + i * beat / 2)
            if b % 4 == 0: mix_into(buf, pan(kick(0.4, 0.35)), t0)
        else:
            for i in range(8):
                if i % 2 == 0: mix_into(buf, pan(kick(0.3, 0.9)), t0 + i * beat / 2)
                if i in (2, 6): mix_into(buf, pan(snare() * 0.6), t0 + i * beat / 2)
                mix_into(buf, pan(hat() * 0.6, 0.3), t0 + i * beat / 2 + beat / 4)
    # melodi
    if style in ('menu', 'game'):
        phrases = [(THEME_1, 0), (THEME_1, 16), (THEME_2, 32), (THEME_1, 48)]
        for theme, off in phrases:
            if style == 'game' and off in (0, 32): continue  # oyunda melodi seyrek: dikkat dağıtmasın
            for (s, bt, d) in theme:
                n = tr(nm(s)) - (12 if style == 'game' and lead_kind == 'bell' else 0)
                if lead_kind == 'bell': x = bell(midi(n), d * beat + 1.0, 2.0, 1.4) * 0.28
                elif lead_kind == 'mallet': x = mallet(midi(n), d * beat + 0.6) * 0.45
                else: x = lead(midi(n), d * beat * 0.95, lead_kind) * (0.28 if style == 'menu' else 0.2)
                mix_into(buf, pan(x, 0.1), (off + bt) * beat)
    else:
        riff = [('D5', 0, 0.5), ('D5', 0.75, 0.25), ('F5', 1, 0.5), ('E5', 1.5, 0.5), ('A4', 2, 1), ('C#5', 3, 1)]
        for rep in range(0, bars, 2):
            if rep % 4 == 2: continue
            for (s, bt, d) in riff:
                mix_into(buf, pan(lead(midi(nm(s)), d * beat * 0.9, 'brass') * 0.25, -0.1), rep * 4 * beat + bt * beat)
    # önce yankı, sonra kuyruğu başa katla: döngü dikişsiz olur
    st = reverb([L, R], IR_HALL, 0.22 if style != 'boss' else 0.12)
    n0 = int(length * SR)
    out = []
    for ch_ in st:
        c = ch_[:n0].copy(); tail_part = ch_[n0:]
        c[:len(tail_part)] += tail_part
        out.append(c)
    write(name, soft_clip(normalize(out, 0.8)), q=3, peak=0.72)

style_opts = {}
def track(name, bpm, style, transpose=0, **opts):
    global style_opts; style_opts = opts; render_track(name, bpm, style, transpose)

# ---------------- ses efektleri ----------------
def sfx_write(name, x, room=True, wet=0.18):
    st = pan(x, 0)
    if room: st = reverb(st, IR_ROOM, wet)
    write(name, st, mono=True, q=5)

def noise(n): return rng.standard_normal(n)

def s_step():
    t = t_(0.16); n = len(t)
    thump = np.sin(2 * np.pi * (140 * np.exp(-t * 20) + 70) * t) * np.exp(-t * 35)
    scuff = bp(noise(n), 900, 3500) * np.exp(-t * 60) * 0.5
    click = np.sin(2 * np.pi * 2600 * t) * np.exp(-t * 180) * 0.25  # robot ayağının metal tıkı
    return thump + scuff + click
def s_slide():
    t = t_(0.32); n = len(t)
    sw = bp(noise(n), 1500, 7000) * np.sin(np.pi * t / 0.32) ** 1.5
    return sw * 0.6 + bell(2400, 0.32, 1.5, 0.3) * 0.05
def s_collapse():
    t = t_(0.9); n = len(t); x = np.zeros(n)
    boom = np.sin(2 * np.pi * (55 + 40 * np.exp(-t * 10)) * t) * np.exp(-t * 7) * 0.9
    for k in range(70):  # ufalanan taş parçaları
        at = rng.uniform(0.02, 0.55) ** 1.4; i = int(at * SR); L_ = int(rng.uniform(0.004, 0.02) * SR)
        g = bp(noise(L_), rng.uniform(800, 2500), rng.uniform(3000, 7000)) * np.exp(-np.arange(L_) / (L_ / 4)) * rng.uniform(0.15, 0.5) * (1 - at)
        add(x, g, i)
    rumble = lp(noise(n), 300) * np.exp(-t * 5) * 0.6
    return boom + x + rumble
def s_crack():
    t = t_(0.35); n = len(t)
    snap = hp(noise(n), 1500) * np.exp(-t * 90)
    x = np.zeros(n)
    for k in range(18):
        i = int(rng.uniform(0.01, 0.2) * SR); L_ = int(0.006 * SR)
        add(x, hp(noise(L_), 2500) * 0.4 * np.exp(-np.arange(L_) / 60), i)
    return snap + x + np.sin(2 * np.pi * 120 * t) * np.exp(-t * 30) * 0.4
def s_key():
    x = np.zeros(int(1.2 * SR))
    for k, n in enumerate(['A5', 'C#6', 'E6', 'A6']):
        b = bell(midi(nm(n)), 1.0, 3.01, 1.8) * (0.6 - k * 0.08); i = int(k * 0.06 * SR); add(x, b, i)
    return x
def s_door():
    t = t_(1.4); n = len(t)
    grind = lp(noise(n), 500) * (0.5 + 0.5 * np.sin(2 * np.pi * 9 * t)) * np.exp(-t * 2.2) * 0.8
    x = grind.copy()
    for k, nn in enumerate(['D5', 'F5', 'A5', 'D6', 'F6']):
        b = bell(midi(nm(nn)), 1.0, 2.0, 1.2) * 0.35; i = int((0.25 + k * 0.08) * SR); add(x, b, i)
    sweep = np.sin(2 * np.pi * np.cumsum(300 + 900 * t / 1.4) / SR) * np.sin(np.pi * t / 1.4) * 0.15
    return x + sweep
def add(x, b, i):
    m = min(len(b), len(x) - i)
    if m > 0: x[i:i + m] += b[:m]

def jingle(notes, inst='pluck', gap=0.11, last=0.9):
    total = gap * len(notes) + last + 0.3; x = np.zeros(int(total * SR))
    for k, n in enumerate(notes):
        names = n if isinstance(n, (list, tuple)) else [n]
        for nn in names:
            d = last if k == len(notes) - 1 else 0.45
            b = (pluck(midi(nm(nn)), d, 0.7) * 0.5 + bell(midi(nm(nn)), d, 2.0, 1.0) * 0.35) if inst == 'pluck' else lead(midi(nm(nn)), d)
            i = int(k * gap * SR); add(x, b, i)
    return x
def s_win(): return jingle(['D5', 'F5', 'A5', 'D6', ('D5', 'F5', 'A5', 'D6')], gap=0.12, last=1.2)
def s_lose():
    t = t_(1.2); x = np.zeros(len(t))
    for k, f in enumerate([392, 349, 311, 262]):
        tt = t_(0.45); b = (np.sin(2 * np.pi * f * tt * (1 - 0.06 * tt)) + 0.3 * tri(f, tt)) * env(len(tt), 0.01, 0.1, 0.6, 0.15) * 0.35
        i = int(k * 0.18 * SR); add(x, b, i)
    k_ = kick(0.6, 0.6); i0 = int(0.7 * SR); m = min(len(k_), len(x) - i0); x[i0:i0 + m] += k_[:m]
    return x
def s_click():
    t = t_(0.08); return np.sin(2 * np.pi * 1400 * t) * np.exp(-t * 90) * 0.6 + bp(noise(len(t)), 2000, 6000) * np.exp(-t * 200) * 0.3
def s_star(i):
    f = midi(nm(['A5', 'C#6', 'E6'][i])); x = bell(f, 0.9, 3.0, 2.0) * 0.6; add(x, bell(f * 2, 0.6, 3.0, 1.0) * 0.2, 0); return x
def s_bump():
    t = t_(0.18); return np.sin(2 * np.pi * (90 + 40 * np.exp(-t * 30)) * t) * np.exp(-t * 28) + bp(noise(len(t)), 300, 1200) * np.exp(-t * 50) * 0.3
def s_teleport():
    t = t_(0.7); n = len(t)
    f = 300 * 2 ** (t / 0.7 * 3)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.7) * 0.35
    x += bp(noise(n), 2000, 9000) * np.sin(np.pi * t / 0.7) ** 2 * 0.3 * (1 + np.sin(2 * np.pi * 18 * t)) / 2
    add(x, bell(midi(nm('E6')), 0.7, 2.0, 1.5) * 0.25, 0); return x
def s_ship():
    # gemi düşüşü: yükselen uğultulu ıslık + çarpma gümbürtüsü
    T = 2.0; n = int(T * SR); x = np.zeros(n)
    tw = t_(1.35)
    f = 900 - 650 * (tw / 1.35) ** 1.5
    wh = bp(noise(len(tw)), 400, 3000) * (tw / 1.35) ** 1.6 * 0.35
    wh += np.sin(2 * np.pi * np.cumsum(f) / SR) * (tw / 1.35) ** 2 * 0.12
    add(x, wh, 0)
    tb = t_(0.65)
    boom = np.sin(2 * np.pi * np.cumsum(70 - 35 * tb / 0.65) / SR) * np.exp(-tb * 6) * 0.8
    boom += bp(noise(len(tb)), 60, 900) * np.exp(-tb * 9) * 0.6
    add(x, boom, int(1.35 * SR))
    return x
def s_lift():
    # asansör: kapı 'ding', motor uğultusu yükselir, varışta ikinci 'ding'
    T = 1.7; t = t_(T); n = len(t)
    x = np.zeros(n)
    add(x, bell(midi(nm('E6')), 0.6, 2.0, 1.2) * 0.3, 0)
    m0, m1 = int(0.25 * SR), int(1.45 * SR); tm = t_(1.2)
    f = 90 + 70 * (tm / 1.2)
    hum = (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.4 * np.sin(4 * np.pi * np.cumsum(f) / SR)) * np.sin(np.pi * tm / 1.2) * 0.28
    hum += bp(noise(len(tm)), 300, 1800) * np.sin(np.pi * tm / 1.2) ** 2 * 0.18
    add(x, hum, m0)
    add(x, bell(midi(nm('C6')), 0.6, 2.0, 1.2) * 0.25, int(1.4 * SR))
    add(x, bell(midi(nm('G6')), 0.6, 2.0, 1.2) * 0.22, int(1.48 * SR))
    return x
def s_bridge():
    x = np.zeros(int(1.0 * SR))
    for k in range(5):  # tahta takırtıları
        tt = t_(0.12); w = (np.sin(2 * np.pi * (500 + k * 60) * tt) * np.exp(-tt * 40) + bp(noise(len(tt)), 400, 2500) * np.exp(-tt * 60) * 0.5) * 0.6
        i = int((0.1 + k * 0.09) * SR); add(x, w, i)
    tt = t_(0.12); add(x, np.sin(2 * np.pi * 300 * tt) * np.exp(-tt * 40) * 0.5, 0)  # düğme
    return x
def s_stomp():
    t = t_(0.8); x = lp(noise(len(t)), 200) * np.exp(-t * 5) * 0.7; add(x, kick(0.8, 1.2), 0); return x
def s_bossFall():
    t = t_(2.2); n = len(t)
    f = 900 * 2 ** (-t / 1.2 * 3)
    whistle = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.clip(1.2 - t, 0, 1) * 0.3
    x = whistle
    i = int(1.15 * SR); c = s_collapse() * 1.2; add(x, c, i)
    b = kick(1.0, 1.5); add(x, b, i)
    return x
def s_enemyFall():
    t = t_(1.0); f = 1200 * 2 ** (-t * 2.5)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.clip(0.7 - t, 0, 1) * 0.3
    i = int(0.65 * SR); tt = t_(0.3); clank = (np.sin(2 * np.pi * 820 * tt) + np.sin(2 * np.pi * 1310 * tt)) * np.exp(-tt * 15) * 0.3
    add(x, clank, i)
    return x
def s_caught():
    t = t_(0.8); clang = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, d in ((520, 5), (1370, 8), (2210, 12))) * 0.3
    buzz = lp(sq(110, t), 1500) * np.exp(-t * 4) * 0.25
    return clang + buzz
def s_undo():
    t = t_(0.35); f = 1600 * 2 ** (-t / 0.35 * 1.5)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.35) * 0.4 + bp(noise(len(t)), 1500, 6000)[::-1] * np.exp(-(0.35 - t) * 10) * 0.2
def s_hint():
    x = np.zeros(int(0.9 * SR))
    for k, n in enumerate(['E6', 'G#6', 'B6', 'E7']):
        b = bell(midi(nm(n)), 0.6, 4.0, 0.8) * 0.3; i = int(k * 0.05 * SR); add(x, b, i)
    return x
def s_wake():
    t = t_(0.6); f = 80 + 300 * (t / 0.6) ** 2
    return lp(saw(1, np.cumsum(f) / SR), 1200) * np.sin(np.pi * t / 0.6) * 0.4 + np.sin(2 * np.pi * np.cumsum(f * 4) / SR) * 0.08
def s_coin():
    x = np.zeros(int(0.6 * SR))
    for k, n in enumerate(['B6', 'E7']):
        b = bell(midi(nm(n)), 0.5, 1.41, 1.0) * 0.4; i = int(k * 0.07 * SR); add(x, b, i)
    return x

if __name__ == '__main__':
    sfx_write('step', s_step(), wet=0.08)
    sfx_write('slide', s_slide())
    sfx_write('collapse', s_collapse())
    sfx_write('crack', s_crack())
    sfx_write('key', s_key(), wet=0.3)
    sfx_write('door', s_door(), wet=0.3)
    sfx_write('win', s_win(), wet=0.3)
    sfx_write('lose', s_lose())
    sfx_write('click', s_click(), room=False)
    for i in range(3): sfx_write(f'star{i}', s_star(i), wet=0.3)
    sfx_write('bump', s_bump(), room=False)
    sfx_write('teleport', s_teleport())
    sfx_write('bridge', s_bridge())
    sfx_write('lift', s_lift())
    sfx_write('ship', s_ship())
    sfx_write('stomp', s_stomp())
    sfx_write('bossFall', s_bossFall())
    sfx_write('enemyFall', s_enemyFall())
    sfx_write('caught', s_caught())
    sfx_write('undo', s_undo())
    sfx_write('hint', s_hint(), wet=0.3)
    sfx_write('wake', s_wake())
    sfx_write('coin', s_coin(), wet=0.2)
    # müzik: menü, boss ve her dünya için oyun teması varyasyonu
    track('music_menu', 104, 'menu', 0, lead='soft', arp='pluck')
    track('music_boss', 132, 'boss', 0)
    WORLD = {1: (0, 'soft', 'pluck'), 2: (-2, 'mallet', 'mallet'), 3: (2, 'bell', 'bell'), 4: (-3, 'square', 'pluck'),
             5: (-5, 'mallet', 'pluck'), 6: (1, 'square', 'bell'), 7: (-4, 'soft', 'mallet'), 8: (-2, 'mallet', 'mallet'),
             9: (3, 'bell', 'pluck'), 10: (0, 'soft', 'bell')}
    for w, (tp, ld, ar) in WORLD.items():
        track(f'music_w{w}', 92, 'game', tp, lead=ld, arp=ar)
