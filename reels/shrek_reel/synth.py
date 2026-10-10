"""Синтез мем-звуков и фоновой музыки (всё генерируется кодом, без внешних файлов). 48 кГц, моно, float32."""
import numpy as np
from scipy import signal

SR = 48000
rng = np.random.default_rng(7)


def t_(d):
    return np.arange(int(d * SR)) / SR


def fade(x, a=0.004, b=0.01):
    n = len(x)
    ia, ib = int(a * SR), int(b * SR)
    if ia:
        x[:ia] *= np.linspace(0, 1, ia)
    if ib:
        x[-ib:] *= np.linspace(1, 0, ib)
    return x


def lp(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), "low")
    return signal.lfilter(b, a, x)


def hp(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), "high")
    return signal.lfilter(b, a, x)


def bp(x, f0, f1, order=2):
    b, a = signal.butter(order, [f0 / (SR / 2), f1 / (SR / 2)], "band")
    return signal.lfilter(b, a, x)


def norm(x, peak=0.9):
    m = np.max(np.abs(x)) + 1e-9
    return (x / m * peak).astype(np.float32)


def whoosh(d=0.5, up=True):
    t = t_(d)
    n = rng.standard_normal(len(t))
    out = np.zeros(len(t))
    blocks = 10
    for i in range(blocks):
        a, b = int(i * len(t) / blocks), int((i + 1) * len(t) / blocks)
        k = i / (blocks - 1)
        k = k if up else 1 - k
        fc = 400 * (8 ** k)
        seg = bp(n, fc * 0.6, min(fc * 1.6, 20000), 2)[a:b]
        out[a:b] = seg
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 1.5
    return norm(fade(out * env, 0.01, 0.05), 0.6)


def boom(d=1.2):
    t = t_(d)
    f = 45 + 110 * np.exp(-t * 9)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) * np.exp(-t * 3.2)
    x += 0.5 * np.tanh(3 * np.sin(ph * 2)) * np.exp(-t * 6)
    th = lp(rng.standard_normal(len(t)), 900) * np.exp(-t * 25) * 1.2
    x = np.tanh(1.8 * (x + th))
    return norm(fade(x, 0.001, 0.08), 0.95)


def pop(d=0.14, f0=950, f1=260):
    t = t_(d)
    f = f1 + (f0 - f1) * np.exp(-t * 40)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 30)
    return norm(fade(x, 0.001, 0.02), 0.7)


def ding(f=1318.5, d=0.9):
    t = t_(d)
    x = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t * dcy)
            for m, a, dcy in [(1, 1, 4.5), (2.76, 0.4, 7), (5.4, 0.2, 11)])
    return norm(fade(x, 0.001, 0.05), 0.6)


def beep(d, f=1000):
    t = t_(d)
    x = np.sin(2 * np.pi * f * t) + 0.15 * np.sin(2 * np.pi * 2 * f * t)
    return norm(fade(x, 0.004, 0.006), 0.42)


def zap(d=0.45):
    t = t_(d)
    f = 1800 * np.exp(-t * 5) + 120 + 400 * rng.standard_normal(len(t)) * 0.0
    jit = np.cumsum(rng.standard_normal(len(t))) * 0.8
    ph = 2 * np.pi * np.cumsum(f + jit * 8) / SR
    x = signal.sawtooth(ph) * 0.7 + hp(rng.standard_normal(len(t)), 2500) * 0.5
    env = np.exp(-t * 6) * (0.6 + 0.4 * (np.sin(2 * np.pi * 38 * t) > 0))
    return norm(fade(x * env, 0.001, 0.03), 0.7)


def scratch(d=0.55):
    t = t_(d)
    f = 2200 * np.exp(-t * 4.5) + 150
    x = signal.sawtooth(2 * np.pi * np.cumsum(f) / SR) * 0.5
    x += bp(rng.standard_normal(len(t)), 1500, 6000) * 0.8
    env = np.clip(1 - t / d, 0, 1) ** 0.6
    return norm(fade(x * env, 0.002, 0.04), 0.7)


def trombone(d=2.4):
    notes = [(233.1, 0.45), (220.0, 0.45), (207.7, 0.45), (196.0, 1.05)]
    out = np.zeros(int(d * SR))
    pos = 0
    for i, (f, ln) in enumerate(notes):
        n = int(ln * SR)
        t = np.arange(n) / SR
        vib = 1 + (0.025 * np.sin(2 * np.pi * 6 * t) if i == 3 else 0)
        fr = f * vib * (1 - 0.06 * (t / ln) ** 3 * (1 if i == 3 else 0))
        ph = 2 * np.pi * np.cumsum(fr) / SR
        x = sum(np.sin(ph * k) / k for k in range(1, 9))
        x = lp(x, 1600)
        env = np.minimum(1, t / 0.03) * np.minimum(1, (ln - t) / 0.06 + 0.0)
        env = np.clip(env, 0, 1) * (0.85 if i < 3 else 1.0)
        out[pos:pos + n] += x * env
        pos += n
    return norm(out, 0.6)


def boing(d=0.5):
    t = t_(d)
    f = 300 + 250 * np.sin(2 * np.pi * 5 * t) * np.exp(-t * 6) + 380 * np.exp(-t * 12)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    return norm(fade(x * np.exp(-t * 5), 0.002, 0.04), 0.6)


def slide_up(d=0.35):
    t = t_(d)
    f = 400 + 1500 * (t / d) ** 1.5
    x = np.sin(2 * np.pi * np.cumsum(f) / SR)
    return norm(fade(x * np.sin(np.pi * t / d) ** 0.7, 0.01, 0.05), 0.45)


def slide_down(d=0.45):
    t = t_(d)
    f = 1700 - 1300 * (t / d) ** 0.8
    x = np.sin(2 * np.pi * np.cumsum(f) / SR)
    return norm(fade(x * np.exp(-t * 2.5), 0.005, 0.05), 0.45)


def tada(d=1.6):
    out = np.zeros(int(d * SR))
    for i, f in enumerate([523.25, 659.25, 783.99, 1046.5]):
        st = int(i * 0.09 * SR)
        n = len(out) - st
        t = np.arange(n) / SR
        x = sum(np.sin(2 * np.pi * f * k * t) / k for k in (1, 2, 3, 4)) * np.exp(-t * 2.2)
        out[st:] += x * (0.6 if i < 3 else 1.0)
    out = lp(out, 5000)
    return norm(fade(out, 0.002, 0.2), 0.6)


def twinkle(d=0.5):
    out = np.zeros(int(d * SR))
    for i, f in enumerate([1568, 2093, 2637, 3136]):
        st = int(i * 0.05 * SR)
        n = len(out) - st
        t = np.arange(n) / SR
        out[st:] += np.sin(2 * np.pi * f * t) * np.exp(-t * 9) * 0.5
    return norm(fade(out, 0.001, 0.05), 0.4)


def thump(d=0.3):
    t = t_(d)
    f = 60 + 90 * np.exp(-t * 30)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14)
    x += lp(rng.standard_normal(len(t)), 400) * np.exp(-t * 40) * 0.6
    return norm(fade(x, 0.001, 0.03), 0.85)


def click(d=0.08):
    t = t_(d)
    x = hp(rng.standard_normal(len(t)), 1500) * np.exp(-t * 90)
    return norm(x, 0.5)


def tick_train(d, rate=9.0):
    out = np.zeros(int(d * SR))
    c = click(0.04)
    step = 1.0 / rate
    p = 0.0
    while p < d - 0.05:
        i = int(p * SR)
        out[i:i + len(c)] += c[: len(out) - i]
        p += step
    return out * 0.7


def whirr(d, f0=250, f1=900):
    t = t_(d)
    f = f0 + (f1 - f0) * (t / d) ** 1.2
    x = signal.sawtooth(2 * np.pi * np.cumsum(f) / SR) * 0.4
    x = lp(x, 2400) * (0.7 + 0.3 * np.sin(2 * np.pi * 14 * t))
    return fade(x * 0.5, 0.02, 0.05).astype(np.float32)


def badumtss():
    out = np.zeros(int(1.8 * SR))
    k = thump(0.25)
    out[: len(k)] += k * 0.9
    s = bp(rng.standard_normal(int(0.25 * SR)), 1800, 6000) * np.exp(-t_(0.25) * 22)
    i = int(0.28 * SR)
    out[i:i + len(s)] += s * 0.9
    c = hp(rng.standard_normal(int(1.1 * SR)), 5000) * np.exp(-t_(1.1) * 3.2)
    i = int(0.5 * SR)
    out[i:i + len(c)] += c * 0.7
    return norm(out, 0.8)


# ---------------------------------------------------------------- музыка
def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def marimba(f, d):
    t = t_(d)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 7) + 0.35 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 18) \
        + 0.15 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t * 30)
    return fade(x, 0.001, 0.01)


def bass(f, d):
    t = t_(d)
    x = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)
    return fade(x * np.exp(-t * 3.0), 0.003, 0.03)


def music(total, bpm=112, seed=3):
    """Игривый «мультяшный» луп: маримба + бас + лёгкие барабаны, C-Am-F-G."""
    r = np.random.default_rng(seed)
    beat = 60.0 / bpm
    bars = int(np.ceil(total / (beat * 4))) + 1
    out = np.zeros(int((bars * beat * 4 + 2) * SR))
    prog = [(48, [60, 64, 67]), (45, [57, 60, 64]), (53, [60, 65, 69]), (55, [59, 62, 67])]
    pent = [72, 74, 76, 79, 81, 84]
    def add(sig, at, g=1.0):
        i = int(at * SR)
        out[i:i + len(sig)] += sig[: len(out) - i] * g
    for b in range(bars):
        root, chord = prog[b % 4]
        t0 = b * beat * 4
        # бас: 1 и "и" 3
        for bt, ln in [(0, 0.9), (1.5, 0.4), (2, 0.9), (3.5, 0.4)]:
            add(bass(midi(root - 12 if bt != 1.5 else root - 12), ln * beat), t0 + bt * beat, 0.55)
        # аккорд "чик" на слабые
        for bt in (1, 3):
            for n in chord:
                add(marimba(midi(n), 0.35) * 0.35, t0 + bt * beat, 0.5)
        # мелодия: случайные ноты пентатоники по 8-м
        for e in range(8):
            if r.random() < (0.72 if b % 2 else 0.5):
                n = pent[r.integers(0, len(pent))]
                add(marimba(midi(n), 0.4), t0 + e * beat / 2, 0.42)
        # ударные
        for bt in (0, 2):
            add(thump(0.18), t0 + bt * beat, 0.5)
        for bt in (1, 3):
            sn = bp(r.standard_normal(int(0.16 * SR)), 1500, 7000) * np.exp(-t_(0.16) * 25)
            add(sn, t0 + bt * beat, 0.35)
        for e in range(8):
            h = hp(r.standard_normal(int(0.05 * SR)), 7000) * np.exp(-t_(0.05) * 70)
            add(h, t0 + e * beat / 2, 0.16 if e % 2 else 0.1)
    out = out[: int(total * SR)]
    return norm(out, 0.9)

