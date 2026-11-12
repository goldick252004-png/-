"""Light sound effects for «Ника и новогодний мяч» — all synthesised here (no samples, no licences).
Writes sfx.wav (48 kHz stereo, 82 s). Event times are tied to the animation timeline in scenes.js.
Run with the Lemo-Opuscar venv:  $LIB/.venv/bin/python sfx.py   (needs numpy, scipy, soundfile; LIB on PYTHONPATH via sys.path below)
"""
import json, math, os, sys
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.environ.get('LIB', os.path.expanduser('~/lemo-opuscar')), 'core', 'audio'))
from sfx import SR, t_, env_exp, bp, lp, hp, noise, norm, brown, whoosh, thump, pop, add, limit

DUR = 82.0
buf = np.zeros((int(DUR * SR), 2))
rng = np.random.default_rng(2027)
EV = json.load(open(os.path.join(HERE, 'events.json')))

def bell_hit(f=2600, v=1.0):
    d = .35; tt = t_(d); p = f * (.92 + rng.random() * .16)
    x = sum(a * np.sin(2 * np.pi * p * m * tt + rng.random() * 6) * env_exp(d, tau) for m, a, tau in [(1, 1, .09), (1.53, .6, .07), (2.1, .45, .05), (2.9, .3, .04)])
    return (x + hp(noise(d), 5000) * env_exp(d, .004) * .6) * v * .35
def sleigh(t0, t1, rate=6.5, v=1.0, fade_in=0.0):
    """shaken sleigh bells: clusters of small bell hits on each stride"""
    t = t0
    while t < t1:
        k = min(1, (t - t0) / fade_in) if fade_in else 1
        for j in range(4 + int(rng.random() * 3)):
            add(buf, bell_hit(2300 + rng.random() * 1400, (.5 + rng.random() * .5) * v * k * .45), t + j * .018 + rng.random() * .01, 1, rng.uniform(-.4, .4))
        t += 1 / rate * (.9 + rng.random() * .2)
def pling(f, v=1.0, tau=.35):
    d = tau * 4; tt = t_(d)
    return (np.sin(2 * np.pi * f * tt) + .3 * np.sin(2 * np.pi * 2 * f * tt) * np.exp(-tt / (tau * .4))) * env_exp(d, tau) * v
PENT = [1174.7, 1318.5, 1480.0, 1760.0, 1975.5, 2349.3, 2637.0, 2960.0]
def sparkle(at, v=.35, n=6, step=.045, up=True):
    for i in range(n):
        f = PENT[(i if up else n - 1 - i) % len(PENT)] * (2 if i >= len(PENT) else 1)
        add(buf, pling(f, v * .3 * (1 - i * .05)), at + i * step, 1, (i / n - .5) * .8)
def crunch(at, v=.25):
    d = .12; x = bp(noise(d), 500, 3500) * env_exp(d, .035) * (1 + (rng.random(len(t_(d))) > .97) * 2)
    add(buf, x * v, at, 1, rng.uniform(-.2, .2))
def steps(t0, t1, every, v=.22):
    t = t0
    while t < t1: crunch(t, v); t += every * (.95 + rng.random() * .1)
def flick(at, v=.3):
    d = .08; add(buf, hp(noise(d), 2500) * env_exp(d, .015) * v, at, 1, rng.uniform(-.5, .5))
def rustle(t0, d, v=.25):
    n = bp(noise(d), 1800, 7000); am = np.abs(lp(rng.standard_normal(len(n)), 25)); am /= am.max()
    add(buf, n * am * np.sin(np.pi * t_(d) / d) * v, t0)
def poof(at, v=.5):
    d = .4; th = thump(.4, 90); n = len(t_(d)); th = np.pad(th, (0, max(0, n - len(th))))[:n]
    add(buf, (lp(noise(d), 900) * env_exp(d, .07) + th * .5) * v, at)
def swoosh(at, d=.45, v=.35): add(buf, whoosh(d, v), at)
def beep(at, f=988, v=.3):
    d = .14; tt = t_(d); x = np.sin(2 * np.pi * f * tt) * np.minimum(1, tt / .005) * env_exp(d, .05); add(buf, x * v, at)
def big_bell(at, f=196, v=.6):
    d = 3.5; tt = t_(d)
    x = sum(a * np.sin(2 * np.pi * f * m * tt) * env_exp(d, tau) for m, a, tau in [(1, 1, 1.4), (2.76, .5, .8), (5.4, .3, .4), (8.93, .15, .2), (.5, .3, 1.8)])
    add(buf, x * v * .5, at, 1, .0)
def firework(at, size=1.0, v=.6, whistle=True):
    if whistle:
        d = .7; tt = t_(d); f = 900 + 1800 * (tt / d) ** .7
        w = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / d) ** 2 * .12 + bp(noise(d), 2000, 6000) * .05 * tt / d
        add(buf, w * v, at - d, 1, rng.uniform(-.6, .6))
    d = 2.2; tt = t_(d)
    bang = np.sin(2 * np.pi * 55 * tt * (1 - .2 * tt)) * env_exp(d, .12) + lp(noise(d), 1500) * env_exp(d, .09) * .9
    crack = hp(noise(d), 3000) * (rng.random(len(tt)) > .9985) * 4 * np.clip((tt - .25) / .3, 0, 1) * env_exp(d, .6)
    add(buf, norm(bang * size + crack * .5) * v, at, 1, rng.uniform(-.5, .5))
def static(t0, d, v=.15): add(buf, hp(noise(d), 800) * v * np.minimum(1, t_(d) / .02), t0)
def bloop(at, v=.3):
    d = .3; tt = t_(d); f = 300 + 900 * tt / d; add(buf, np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(d, .1) * v, at)

# —— ambience: soft winter air ——
amb = lp(brown(DUR), 500) * .05
amb *= np.minimum(1, t_(DUR) / 1.0)
buf[:, 0] += amb; buf[:, 1] += np.roll(amb, 2400)

# —— S1 (0–9) arena ——
sparkle(1.35, .3)
add(buf, pop(.25), 5.5)
sparkle(8.3, .28, n=5)
# —— S2 (9–14) ——
add(buf, pop(.3), 9.45); swoosh(10.1, .5, .3)
x = lambda lt: 40 + 2900 * ((k := min(1, max(0, (lt - 1.1) / 3.9))) ** 2 * .45 + k * .55)
ph0 = 0
for i in range(2000):
    lt = 1.1 + i * .005
    if lt > 5: break
    ph = (x(lt) - 40) / 70
    if math.floor(ph / math.pi) > ph0: ph0 = math.floor(ph / math.pi); crunch(9 + lt, .28)
# iris swooshes
for b in (14, 25, 36, 47, 57, 76): swoosh(b - .5, .55, .22)
# —— S3 (14–25) yard ——
swoosh(14.4, .35, .2); poof(15.6, .5)
steps(16.4, 18.6, .33)
sparkle(18.75, .3); sparkle(19.95, .35, n=8)
steps(20.0, 20.6, .17, .18)
swoosh(21.45, .3, .35); add(buf, thump(.5, 110), 22.2); sparkle(22.25, .3, n=7)
for k in range(1, 40):
    lt = k * math.pi / 9
    if 9.0 < lt < 10.9: add(buf, (hp(noise(.06), 900) * env_exp(.06, .012)) * .3, 14 + lt, 1, -.2)
# —— S4 (25–36) park ——
steps(25.0, 27.4, .34, .2)
add(buf, norm(bp(noise(1.3), 300, 2500) * np.sin(np.pi * t_(1.3) / 1.3) ** 1.5) * .35, 27.4)
for i in range(6): flick(28.3 + i * .45, .35)
steps(31.0, 31.5, .17, .16)
sparkle(32.2, .32, n=7); sparkle(32.8, .25, n=4)
sparkle(34.8, .3, n=6)
# —— S5 (36–47) bus stop + ride ——
sleigh(38.0, 39.4, 7, .7, fade_in=1.2)
steps(38.0, 39.4, .16, .2)
steps(39.6, 40.4, .25, .16)
sleigh(40.8, 46.9, 7.5, .8, fade_in=.4)
run = bp(noise(6.1), 1500, 6000) * .06 * np.minimum(1, t_(6.1) / .4); add(buf, run, 40.8)
# —— S6 (47–57) family ——
swoosh(48.35, .4, .25); poof(48.75, .55); add(buf, thump(.35, 160), 48.78)
static(48.8, .5, .12)
sleigh(49.4, 51.2, 7.5, .7)
add(buf, (hp(noise(.05), 1500) * env_exp(.05, .01)) * .35, 52.4)
for i in range(5): add(buf, (bp(noise(.03), 2000, 5000) * env_exp(.03, .006)) * .25, 52.45 + i * .1)
bloop(53.0, .3); sparkle(53.0, .3)
# —— S7 (57–68) all together ——
sleigh(57.0, 59.2, 7.5, .6)
steps(57.3, 60.6, .3, .14)
rustle(62.0, .7, .35); sparkle(62.5, .32, n=7)
swoosh(63.85, .4, .35); swoosh(64.3, .5, .25)
add(buf, pling(1760, .2, .6), 65.05); add(buf, pling(2637, .12, .5), 65.1)
for i in range(16): add(buf, pling(PENT[i % 8] * (1 + (i >= 8)), .09, .5), 65.3 + i * .07, 1, (i % 5 - 2) * .2)
# —— S8 (68–76) countdown + midnight ——
for k in range(10): beep(68.3 + k * .35, 988 if k < 9 else 1318, .28)
for i in range(12): big_bell(71.8 + i * .33, 196 if i % 2 == 0 else 233.1, .55 - i * .015)
for e in EV['fw']: firework(e['t'], e['r'] / 300, .26)
# —— S9 (76–82) finale ——
for e in EV['fw9']: firework(e['t'], .7, .22, whistle=False)
sparkle(76.5, .35, n=8); sparkle(76.9, .3, n=6, up=False)

# master: gentle limiting, short fade at the very end
fade = np.ones(len(buf)); n = int(.8 * SR); fade[-n:] = np.linspace(1, 0, n)
buf *= fade[:, None]
for c in range(2): buf[:, c] = limit(buf[:, c], .89)
sf.write(os.path.join(HERE, 'sfx.wav'), buf.astype(np.float32), SR)
print('sfx.wav', buf.shape, 'peak', float(np.abs(buf).max()))
