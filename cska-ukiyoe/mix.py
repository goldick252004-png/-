"""Mix: paper / wood / court foley (synthesised) + Russian narration + original score (ducked under the voice) + hall and rain ambience → mix.wav
Paper foley recipes (baren, slip, seal, scroll, block) adapted from the Lemo-Opuscar Ukiyo-e demo (MIT).
Usage: $LIB/.venv/bin/python mix.py   (after events.mjs, tts_ru.py and music/score.py)"""
import sys, os, json, numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__))
LIB = os.environ.get('LIB') or os.path.expanduser('~/lemo-opuscar')
sys.path.insert(0, os.path.join(LIB, 'core/audio'))
from sfx import SR, t_, env_exp, bp, lp, hp, norm, compress, limit, add
from scipy.signal import resample_poly
from scipy.ndimage import uniform_filter1d

E = json.load(open(os.path.join(HERE, 'events.json'))); DUR = E['dur']; N = int(DUR * SR)
rng = np.random.default_rng(17)
def nz(d): return rng.standard_normal(int(round(d * SR)))
def brown(d):
    w = np.cumsum(nz(d)); w -= np.linspace(w[0], w[-1], len(w)); return norm(hp(w, 20))
def fade(x, a=.005, r=.02):
    n = len(x); x = x.copy(); A, R = min(n, int(a * SR)), min(n, int(r * SR))
    if A: x[:A] *= np.linspace(0, 1, A)
    if R: x[n - R:] *= np.linspace(1, 0, R)
    return x
def sines(fs, d, taus, amps):
    tt = t_(d); return sum(a * np.sin(2 * np.pi * f * tt) * np.exp(-tt / tau) for f, tau, a in zip(fs, taus, amps))
def slow(d, rate, depth, seed=0):   # slowly undulating envelope
    k = max(2, int(d * rate) + 3); r = np.random.default_rng(seed).random(k)
    return 1 - depth + depth * np.interp(np.linspace(0, k - 1, int(round(d * SR))), np.arange(k), r)

# —— Paper ——
def baren(d=.36, v=1):   # baren (馬連, hand rubbing pad) circling on the back of the paper: band-passed noise + roughly 9 Hz circular modulation
    tt = t_(d); m = .55 + .45 * np.abs(np.sin(2 * np.pi * 4.6 * tt)); e = np.sin(np.pi * tt / d) ** .7
    return norm(bp(nz(d), 700, 5200) * m * e + lp(nz(d), 500) * e * .3) * v
def slip(v=1):   # paper slip dropping / peeling off
    d = .28; tt = t_(d); return norm(hp(nz(d), 1800) * np.sin(np.pi * tt / d) ** 2 * (1 - tt / d * .5)) * v
def seal(v=1):   # vermilion seal pressed on paper: dull thud + fine tack of the seal paste pulling away
    d = .35; x = sines([88, 180], d, [.07, .03], [1, .4]); x[:int(.012 * SR)] += bp(nz(.012), 200, 1500) * .9
    y = np.zeros(int(.45 * SR)); y[:len(x)] += x; k = int(.22 * SR); c = hp(nz(.08), 3000) * env_exp(.08, .02) * .15; y[k:k + len(c)] += c
    return norm(lp(y, 2500)) * v
def scroll(d, v=1):   # handscroll pan: long paper slide + small crinkles
    tt = t_(d); e = np.sin(np.pi * np.minimum(tt / d, 1)) ** 1.2
    f = np.interp(tt, [0, d], [1200, 3200]); x = np.zeros_like(tt); blk = 2400
    src = nz(d)
    for i in range(0, len(tt), blk): x[i:i + blk] = bp(src[max(0, i - 4800):i + blk], f[i] * .6, f[i] * 1.6)[-len(x[i:i + blk]):]
    cr = hp(nz(d), 4000) * (rng.random(len(tt)) > .9985) * 3
    return norm(x * e + lp(cr, 9000) * e * .4) * v
def block(v=1):   # woodblock set down on the bench
    d = .2; x = sines([180, 410, 960], d, [.05, .03, .015], [1, .6, .3]); x[:int(.004 * SR)] += nz(.004) * .5; return norm(lp(x, 3000)) * v
# —— Court ——
def step(v=1, wet=0):   # sneaker on a sprung wooden floor: knock + rubber squeak now and then
    d = .16; x = sines([150, 340, 700], d, [.05, .025, .012], [1, .5, .25]); x[:int(.008 * SR)] += bp(nz(.008), 400, 3000) * .5
    if rng.random() < .35: tt = t_(.09); x[:len(tt)] += np.sin(2 * np.pi * np.cumsum(np.interp(tt, [0, .09], [1800, 2600])) / SR) * np.sin(np.pi * tt / .09) * .25
    if wet: x = x + bp(nz(d), 2000, 7000) * env_exp(d, .03) * .4
    return norm(lp(x, 4000)) * v
def jump(v=1):
    d = .3; x = sines([95, 210], d, [.06, .03], [1, .4]); x[:int(.01 * SR)] += bp(nz(.01), 300, 2500) * .6; return norm(x) * v
def throw(v=1):   # the arm and the ball cutting air
    d = .35; tt = t_(d); f = np.interp(tt, [0, d], [600, 2600]); src = nz(d); y = np.zeros_like(tt)
    for i in range(0, len(tt), 1200): y[i:i + 1200] = bp(src[max(0, i - 2400):i + 1200], f[i] * .7, f[i] * 1.4)[-len(y[i:i + 1200]):]
    return norm(y * np.sin(np.pi * tt / d) ** 2) * v
def whoosh(d, v=1):
    tt = t_(d); return norm(bp(nz(d), 500, 3000) * np.sin(np.pi * tt / d) ** 3) * v
def net(v=1):   # ball into the net: rope swish + soft body thud + the frame's dull ring
    d = .9; tt = t_(d); sw = bp(nz(d), 1500, 6000) * np.exp(-tt / .15) * (1 + .6 * np.sin(2 * np.pi * 23 * tt))
    th = sines([110, 230], d, [.08, .05], [1, .5]); ring = sines([620, 1310], d, [.35, .2], [.15, .08])
    return norm(sw * .8 + th + ring) * v
def save(v=1):   # palms on the ball: a flat slap
    d = .25; x = sines([180, 420], d, [.04, .02], [1, .5]); x[:int(.006 * SR)] += hp(nz(.006), 1500) * 1.2; return norm(x) * v
def bounce(v=1):
    d = .25; x = sines([140, 300], d, [.05, .02], [1, .4]); x[:int(.004 * SR)] += nz(.004) * .5; return norm(x) * v
def amb(w, d):
    tt = t_(d)
    if w == 'room': return norm(lp(brown(d), 200) * .5 + bp(nz(d), 200, 900) * .1) * .25
    if w == 'hall':   # crowd murmur: many band-passed voices, slowly breathing
        mur = sum(bp(nz(d), lo, lo * 2.2) * slow(d, 1.5 + k, .7, 20 + k) for k, lo in enumerate([250, 420, 700, 1100]))
        return norm(mur + lp(brown(d), 160) * .6) * .5
    if w == 'rain':
        bed = hp(nz(d), 900) * .5 + bp(nz(d), 300, 2000) * .25
        drops = np.zeros_like(tt); idx = rng.integers(0, len(tt) - 400, int(d * 60))
        for i in idx: drops[i:i + 200] += np.exp(-np.arange(200) / 30) * (rng.random() - .5) * 3
        return norm(bed + hp(drops, 2500) * .4 + lp(brown(d), 300) * .4) * .55
    return np.zeros_like(tt)

fx, ab, vo = np.zeros((N, 2)), np.zeros((N, 2)), np.zeros((N, 2))
VOICE = {}
for e in E['ev']:
    t, ty, v = e['t'], e['type'], e.get('v', 1)
    if ty == 'vo':
        y, sr = sf.read(os.path.join(HERE, 'voices', e['id'] + '.wav'))
        if y.ndim > 1: y = y.mean(1)
        y = resample_poly(y, SR, sr); VOICE[e['id']] = (t, len(y) / SR); add(vo, y, t, 1.35 if e['id'] == 'L5' else 1.0, 0)
    elif ty == 'baren': add(fx, baren(e['d'], v), t, .3, .1)
    elif ty == 'block': add(fx, block(v), t, .26, -.1)
    elif ty == 'slip': add(fx, slip(v), t, .16, .2)
    elif ty == 'seal': add(fx, seal(v), t, .5 if not e.get('grey') else .3, 0)
    elif ty == 'scroll': add(fx, scroll(e['d'], v), t, .22, 0)
    elif ty == 'step': add(fx, step(v, e.get('wet', 0)), t, .14, -.15)
    elif ty == 'jump': add(fx, jump(v), t, .25, -.1)
    elif ty == 'throw': add(fx, throw(v), t, .3, 0)
    elif ty == 'whoosh': add(fx, whoosh(e['d'], v), t, .16, .2)
    elif ty == 'net': add(fx, net(v), t, .5, .25)
    elif ty == 'save': add(fx, save(v), t, .45, .2)
    elif ty == 'bounce': add(fx, bounce(v), t, .3, -.2)
    elif ty == 'brand': add(fx, baren(e['d'], 1.2), t, .45, 0)
    elif ty == 'amb':
        a = fade(amb(e['w'], e['d']), .6, .6); add(ab, a, t, {'room': .2, 'hall': .2, 'rain': .24}[e['w']] * v, 0)

vm = compress(vo[:, 0] * 1.414, .2, 3, .004, .1); vo = np.stack([vm, vm], 1) / 1.414
room = np.zeros_like(vo); dl = int(.023 * SR); room[dl:] = vo[:-dl] * .1; vo = vo + lp(room, 3000)
mu, msr = sf.read(os.path.join(HERE, 'music/score.wav'))
if mu.ndim == 1: mu = np.stack([mu, mu], 1)
mu = np.pad(mu[:N], ((0, max(0, N - len(mu[:N]))), (0, 0)))
duck = np.ones(N)
for id_, (t0, d) in VOICE.items():
    a, b = int((t0 - .25) * SR), int((t0 + d + .3) * SR); duck[a:b] = np.minimum(duck[a:b], .22 if id_ == 'L5' else .4)
duck = uniform_filter1d(duck, int(.25 * SR))
mu *= duck[:, None]; ab *= np.sqrt(duck)[:, None]; fx *= (duck ** .35)[:, None]
MIX = mu + vo * 1.3 + fx + ab
# the two silences: ma 1 keeps only the rain coming in; ma 2 (24.2–25.0) is absolute, tails included
a, b = int(24.2 * SR), int(25.0 * SR); f = int(.06 * SR); MIX[a:a + f] *= np.linspace(1, 0, f)[:, None]; MIX[a + f:b] = 0
k = int(44.6 * SR); MIX[k:] *= np.linspace(1, 0, N - k)[:, None]
MIX = limit(MIX, .92)
sf.write(os.path.join(HERE, 'mix.wav'), MIX.astype(np.float32), SR)
def db(x): return 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-9)
for name, (a, b) in {'hook': (0, 4.6), '2021': (4.6, 17.5), 'ma1': (17.6, 18.9), '2022': (18.9, 24.2), 'ma2': (24.25, 25), 'triptych': (25, 37.2), 'card': (37.2, 45)}.items():
    s = slice(int(a * SR), int(b * SR)); print(f'{name:8s} mix {db(MIX[s]):6.1f}  vo {db(vo[s] * 1.3):6.1f}  mu {db(mu[s]):6.1f}  fx {db(fx[s]):6.1f}  amb {db(ab[s]):6.1f}')
for id_, (t0, d) in VOICE.items():
    s = slice(int(t0 * SR), int((t0 + d) * SR)); print(id_, f'vo {db(vo[s] * 1.3):6.1f}  bed {db((mu + fx + ab)[s]):6.1f}')
