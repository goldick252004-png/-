"""Mix: paper foley (synthesised from events.json) + room bed + the score → mix.wav.
Foley recipes (tap, crinkle, swish, pop, bell, boing, room, ticks) adapted from the Lemo-Opuscar Paper Pop-up demo (MIT)."""
import json, os, sys, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, resample_poly, fftconvolve
HERE = os.path.dirname(os.path.abspath(__file__))
E = json.load(open(os.path.join(HERE, 'events.json'))); DUR = E['dur']
mu, SR = sf.read(os.path.join(HERE, 'music/score.wav'))
N = int(DUR * SR)
rng = np.random.default_rng(5)
def bp(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lp(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def noise(n): return rng.standard_normal(n)
def pink(n):
    w = np.fft.rfft(noise(n)); f = np.arange(len(w)); f[0] = 1
    return np.fft.irfft(w / np.sqrt(f), n) * 20
def norm(x, p=1.0): return x / (np.abs(x).max() + 1e-9) * p
def st(x, pan=0.0):
    l = np.cos((pan + 1) * np.pi / 4); r = np.sin((pan + 1) * np.pi / 4)
    return np.stack([x * l * 1.414, x * r * 1.414], 1)
def tt(d): return np.arange(int(d * SR)) / SR
def ex(t, a, r): return np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / max(r, 1e-4))
def sweep(f0, f1, t, curve=1.0): d = t[-1] if len(t) else 1; f = f0 + (f1 - f0) * (t / d) ** curve; return np.sin(2 * np.pi * np.cumsum(f) / SR)
def fade(x, fi, fo):
    n = len(x); e = np.ones(n); a = int(fi * SR); b = int(fo * SR)
    if a: e[:a] = np.linspace(0, 1, a) ** 1.5
    if b: e[-b:] = np.minimum(e[-b:], np.linspace(1, 0, b) ** 1.5)
    return x * (e[:, None] if x.ndim == 2 else e)
def dbfs(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
IRn = int(1.4 * SR); IR = np.stack([noise(IRn), noise(IRn)], 1) * np.exp(-np.arange(IRn) / SR * 4.5)[:, None]
IR = np.stack([lp(IR[:, 0], 6000), lp(IR[:, 1], 6000)], 1); IR /= np.sqrt((IR ** 2).sum(0))
def verb(x2, wet=.25):
    y = np.stack([fftconvolve(x2[:, 0], IR[:, 0])[:len(x2)], fftconvolve(x2[:, 1], IR[:, 1])[:len(x2)]], 1)
    return x2 * (1 - wet) + y * wet

def put(buf, t, x):
    i = int(t * SR); j = min(N, i + len(x))
    if j > i and i >= 0: buf[i:j] += x[:j - i]

# ---------- Sound-effect library ----------
def bell(f, d=.6, g=1., bright=1.):
    t = tt(d); x = sum(np.sin(2 * np.pi * f * k * t) * np.exp(-t * (4 + k * 3)) / k ** (1.6 / bright) for k in (1, 2, 3, 4.2))
    return x * ex(t, .002, d) * g
def boing(f0=300, f1=900, d=.26, g=1.):
    t = tt(d); f = f0 + (f1 - f0) * (1 - np.exp(-t * 14)); f *= 1 + .06 * np.sin(2 * np.pi * 28 * t)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) + .3 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    return x * ex(t, .005, d * .45) * g
def tap(g=1., f=900):
    t = tt(.12); x = bp(noise(len(t)), f * .6, f * 2.2) * ex(t, .001, .018) + np.sin(2 * np.pi * f * .35 * t) * ex(t, .001, .03) * .6
    return x * g
def crinkle(d, g=1., dens=180, lo=1800, hi=9000):
    n = int(d * SR); x = np.zeros(n)
    for _ in range(int(dens * d)):
        i = rng.integers(0, n - 400); L = rng.integers(40, 300); x[i:i + L] += noise(L) * np.exp(-np.arange(L) / (L / 4)) * rng.uniform(.3, 1)
    return bp(x, lo, hi) * g
def swish(d, g=1., f0=500, f1=3500):
    t = tt(d); n = len(t); x = noise(n); y = np.zeros(n); B = 8
    for k in range(B):
        a, b = k * n // B, (k + 1) * n // B; fc = f0 + (f1 - f0) * (k + .5) / B
        y[a:b] = bp(x, fc * .6, min(fc * 1.6, 20000))[a:b]
    return y * np.clip(np.sin(np.pi * t / t[-1]), 0, None) ** 1.5 * g
def pop(g=1., f=700):
    t = tt(.16); x = sweep(f, f * .45, t) * ex(t, .001, .04) + bp(noise(len(t)), 1200, 5000) * ex(t, .004, .025) * .5
    return x * g
def blip(f, g=1., d=.055, wave='sq'):
    t = tt(d); ph = 2 * np.pi * f * t
    x = np.sign(np.sin(ph)) * .5 + np.sin(ph) * .5 if wave == 'sq' else 2 / np.pi * np.arcsin(np.sin(ph))
    return lp(x, 4500) * ex(t, .003, d * .5) * g
def arp(fs, gap=.07, g=1.):
    out = np.zeros(int((gap * len(fs) + .8) * SR))
    for i, f in enumerate(fs): b = bell(f, .7, 1, 1.4); i0 = int(i * gap * SR); out[i0:i0 + len(b)] += b
    return out * g


sfx = np.zeros((N, 2)); amb = np.zeros((N, 2))
def M(*xs):
    L = max(len(x) for x in xs); return sum(np.pad(x, (0, L - len(x))) for x in xs)
def bed(t0, t1, fn, fi=1.5, fo=1.5):
    x = fn(t1 - t0); put(amb, t0, fade(x, fi, fo))
def room(d): return np.stack([lp(pink(int(d * SR)), 400), lp(pink(int(d * SR)), 400)], 1) * .004
def ticks(d):
    x = np.zeros((int(d * SR), 2))
    for k in range(int(d)):
        c = st(tap(.05, 2600 if k % 2 else 2300) * 1.0, -.6); i = int(k * SR); x[i:i + len(c)] += c[:len(x) - i]
    return x

def creak(d):
    t = tt(d); f = 140 + 60 * np.sin(2 * np.pi * 1.3 * t); x = np.zeros(len(t)); ph = np.cumsum(f) / SR
    x = (np.mod(ph, 1) < .08) * 1.0; x = bp(x - x.mean(), 300, 2400) * np.sin(np.pi * t / d) ** .8
    return M(x * .5, crinkle(d, .2, 60, 900, 4000))
def thump(g=1.): t = tt(.3); return (np.sin(2 * np.pi * 70 * t) * ex(t, .002, .08) + bp(noise(len(t)), 100, 900) * ex(t, .001, .02) * .6) * g
def switch(g=1.): t = tt(.08); return (bp(noise(len(t)), 1500, 7000) * ex(t, .0005, .006) + np.sin(2 * np.pi * 1800 * t) * ex(t, .0005, .01) * .4) * g
def burst(g=1.):
    t = tt(.9); cr = crinkle(.9, .5, 400, 2500, 9000); t = t[:len(cr)]; x = bp(noise(len(t)), 200, 3000) * ex(t, .002, .05) + cr[:len(t)] * ex(t, .02, .3)
    return x * g
G = dict(pop=1.3, tap=1.6, swish=1.5, creak=1.4, starpop=1.6, sparkle=1.2, tick=1.5, burst=1.3, hop=1.8)
for e in E['ev']:
    t, ty, v = e['t'], e['type'], e.get('v', 1); g = G.get(ty, 1) * v
    if ty == 'room': bed(t, t + e['d'], room, 1.0, 1.5)
    elif ty == 'clock': bed(t, t + e['d'], ticks, .5, 1.0)
    elif ty == 'switch': put(sfx, t, st(switch(.5), -.5))
    elif ty == 'creak': put(sfx, t, st(creak(e['d']) * .25, 0))
    elif ty == 'thump': put(sfx, t, st(thump(.35), 0))
    elif ty == 'pop': put(sfx, t, st(M(pop(.18 * g, 650 + rng.random() * 400), crinkle(.15, .06 * g)), rng.uniform(-.4, .4)))
    elif ty == 'toss': put(sfx, t, st(M(swish(.18, .05 * g, 900, 4000), tap(.06 * g, 700)), 0))
    elif ty == 'catch': put(sfx, t, st(M(tap(.12, 600), crinkle(.08, .05)), .1))
    elif ty == 'crouch': put(sfx, t, st(crinkle(.15, .06), 0))
    elif ty == 'hop': put(sfx, t, st(boing(320, 760, .22, .07 * g), 0))
    elif ty == 'land': put(sfx, t, st(M(tap(.14, 500), crinkle(.12, .06)), 0))
    elif ty == 'whoosh': put(sfx, t, st(swish(e['d'], .07, 600, 5000), .2))
    elif ty == 'starpop': put(sfx, t, st(M(pop(.3, 900), crinkle(.3, .12), bell(1760, .9, .15)), .25))
    elif ty == 'sparkle': [put(sfx, t + k * .09, st(bell(2400 + rng.random() * 1800, .5, .05), rng.uniform(-.5, .5))) for k in range(int(e['d'] / .09))]
    elif ty == 'twinkle': [put(sfx, t + k * .7, st(bell(3000 + rng.random() * 1500, .4, .02), rng.uniform(-.6, .6))) for k in range(int(e['d'] / .7))]
    elif ty == 'swish': put(sfx, t, st(M(swish(e['d'], .22, 400, 3000), crinkle(e['d'], .05)), 0))
    elif ty == 'fold': put(sfx, t, st(M(crinkle(e['d'], .14, 260), swish(e['d'], .06, 300, 1500)), 0))
    elif ty == 'tick': put(sfx, t, st(M(tap(.12, 1500), crinkle(.05, .03)), .3))
    elif ty == 'snap': put(sfx, t, st(tap(.2, 900), .3))
    elif ty == 'flip': put(sfx, t, st(M(swish(.3, .12, 800, 4000), tap(.18, 700)), 0))
    elif ty == 'bell': pass   # the tubular bell is in the score
    elif ty == 'burst': put(sfx, t, st(burst(.22 * g), rng.uniform(-.6, .6)))
    elif ty == 'drop': put(sfx, t, st(M(crinkle(e['d'], .06, 90, 1500, 6000), bell(2200, .4, .04)), 0))
    elif ty == 'card': put(sfx, t, st(thump(.25), 0))
if mu.ndim == 1: mu = np.stack([mu, mu], 1)
mu = np.pad(mu[:N], ((0, max(0, N - len(mu[:N]))), (0, 0)))
MIX = mu * .9 + verb(sfx, .15) + amb * 1.5
k = int((DUR - 1.0) * SR); MIX[k:] *= np.linspace(1, 0, N - k)[:, None]
MIX = MIX / np.abs(MIX).max() * .89
sf.write(os.path.join(HERE, 'mix.wav'), MIX.astype(np.float32), SR)
for name, (a, b) in {'desk': (0, 2.4), 'open': (2.4, 7.5), 'game': (7.5, 15), 'wish': (15, 17.3), 'star': (17.3, 22.5), 'turn': (22.5, 25.5), 'tab': (25.5, 30), 'party': (30, 35), 'fold+card': (35, 41)}.items():
    s = slice(int(a * SR), int(b * SR)); print(f'{name:9s} mix {dbfs(MIX[s]):6.1f}  music {dbfs(mu[s]):6.1f}  sfx {dbfs(sfx[s]):6.1f}  amb {dbfs(amb[s]):6.1f}')
