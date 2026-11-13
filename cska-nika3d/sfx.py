"""Light sound effects for «Письмо Деду Морозу» — all synthesised here (no samples, no licences).
Writes sfx.wav (48 kHz stereo, 88 s). Event times follow the timeline in film.js.
Run:  LIB=~/lemo-opuscar $LIB/.venv/bin/python sfx.py
"""
import math, os, sys
import numpy as np, soundfile as sf
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(os.environ.get('LIB', os.path.expanduser('~/lemo-opuscar')), 'core', 'audio'))
from sfx import SR, t_, env_exp, bp, lp, hp, noise, norm, brown, whoosh, thump, pop, add, limit

DUR = 88.0
buf = np.zeros((int(DUR * SR), 2))
rng = np.random.default_rng(2028)

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

def padto(x, n): return np.pad(x, (0, max(0, n - len(x))))[:n]
def scribble(t0, t1, v=.12):
    t = t0
    while t < t1:
        d = .08 + rng.random() * .1; x = bp(noise(d), 2500, 7000) * np.sin(np.pi * t_(d) / d) * (.6 + .4 * np.sin(2 * np.pi * 14 * t_(d)))
        add(buf, x * v, t, 1, .1); t += d + rng.random() * .05
def wind(t0, d, v=.4):
    n = lp(noise(d), 900) + bp(noise(d), 300, 1400) * .6; tt = t_(d); e = np.sin(np.pi * tt / d) ** 1.4
    howl = np.sin(2 * np.pi * np.cumsum(420 + 160 * np.sin(2 * np.pi * .7 * tt)) / SR) * .08
    add(buf, norm(n * e + howl * e) * v, t0, 1, 0)
def flutter(t0, d, v=.15):
    tt = t_(d); am = (np.sin(2 * np.pi * 11 * tt) > .2).astype(float); x = bp(noise(d), 1200, 5000) * lp(am, 60) * np.sin(np.pi * tt / d)
    add(buf, x * v, t0, 1, .2)
def creak_door(at, v=.25):
    d = .6; tt = t_(d); f0 = 90 + 40 * tt / d; saw = 2 * ((np.cumsum(f0 * (1 + .25 * np.sin(2 * np.pi * 13 * tt))) / SR) % 1) - 1
    add(buf, norm(bp(saw, 300, 2600) * np.sin(np.pi * tt / d)) * v, at, 1, .3)
def doorbell(at, v=.4):
    for k, (f, dt) in enumerate([(784, 0), (622, .42)]):
        d = 1.4; tt = t_(d); x = sum(a * np.sin(2 * np.pi * f * m * tt) * env_exp(d, tau) for m, a, tau in [(1, 1, .5), (2.01, .3, .25), (3, .12, .12)])
        add(buf, x * v, at + dt, 1, .2)
def slide_whistle(at, f0, f1, d=.45, v=.18):
    tt = t_(d); f = f0 * (f1 / f0) ** (tt / d); x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * tt / d) ** .6; add(buf, x * v, at)
def runners(t0, d, v=.08):
    x = bp(noise(d), 800, 5000) * np.minimum(1, t_(d) / .3) * np.minimum(1, (d - t_(d)) / .3); add(buf, x * v, t0, 1, -.1)
def tick(at, v=.12): d = .03; add(buf, hp(noise(d), 3000) * env_exp(d, .003) * v, at, 1, .4)

# —— ambience ——
amb = lp(brown(DUR), 400) * .035; buf[:, 0] += amb; buf[:, 1] += np.roll(amb, 2400)

# S1 room (0–11)
for k in range(11): tick(.5 + k, .05)
scribble(1.0, 5.2, .1)
add(buf, (bp(noise(.25), 1500, 6000) * env_exp(.25, .06)) * .2, 6.8)
steps(7.6, 8.4, .2, .12)
add(buf, (bp(noise(.1), 1000, 5000) * env_exp(.1, .02)) * .2, 8.6)
creak_door(9.6, .12); wind(9.5, 2.0, .55); flutter(9.8, 1.4, .2)
# S2 city (11–19)
wind(10.9, 8.4, .45); flutter(11, 7.6, .14); sleigh(12.5, 13.6, 6, .25); swoosh(14.55, .5, .25); swoosh(16.95, .5, .25)
# S3 arena (19–28)
for k in range(8):  # the dribble: a bounce every 1/1.6 s, dying away once Ника lets go at 21.6
    lt = (k + .5) / 1.6; dk = 1 if lt < 2.6 else math.exp(-(lt - 2.6) * 1.1)
    add(buf, thump(.45 * dk, 140 + (1 - dk) * 30), 19 + lt, 1, .2)
flutter(21.3, 1.9, .16); add(buf, (bp(noise(.12), 1500, 6000) * env_exp(.12, .03)) * .25, 23.2)
sparkle(25.4, .45, n=8); slide_whistle(25.4, 500, 1400, .35, .12); swoosh(26.1, .35, .3); add(buf, thump(.4, 90), 26.95)
# S4 sled (28–40)
runners(28.0, 2.6, .07); steps(28.0, 30.6, .3, .14); steps(30.6, 31.6, .25, .12)
slide_whistle(33.55, 900, 450, .55, .12); slide_whistle(34.2, 450, 700, .3, .08)
add(buf, (hp(noise(.08), 1500) * env_exp(.08, .02)) * .3, 35.7)
creak_door(36.1, .14); creak_door(36.7, .14)
add(buf, pop(.3), 37.4); swoosh(37.35, .4, .3)
sleigh(37.4, 40, 7.5, .8, fade_in=.3); runners(37.4, 2.6, .09); steps(37.4, 40, .22, .14)
# S5 deliveries (40–56)
for a in (40, 45.33, 50.67):
    steps(a + .1, a + 1.4, .3, .09); add(buf, thump(.18, 160), a + 1.9); sparkle(a + 2.0, .4, n=8)
    steps(a + 2.2, a + 3.0, .25, .08); creak_door(a + 3.2, .16); sparkle(a + 4.3, .25, n=5, up=False)
    sleigh(a + 4.4, a + 5.2, 6, .3)
# S6 (56–64)
wind(56.2, 3.2, .18)
steps(59.5, 61.4, .45, .1); runners(59.5, 1.9, .05)
add(buf, pling(2349.3, .18, .3), 63.4); add(buf, pling(2960, .12, .3), 63.47)
# S7 door (64–74)
doorbell(64.6, .45)
steps(65.25, 66.4, .14, .16)
creak_door(66.45, .2); sleigh(67.0, 69.5, 7, .55, fade_in=.3); sparkle(67.1, .4, n=8)
for k in range(3): add(buf, thump(.2, 180), 67.6 + k * .5)
# S8 midnight (74–82)
for k in range(2): tick(74.2 + k, .14)
for i in range(12): big_bell(76.0 + i * .35, 196 if i % 2 == 0 else 233.1, .5 - i * .012)
for (tf, _, _) in [(76.1,0,0),(76.55,0,0),(77.0,0,0),(77.5,0,0),(77.95,0,0),(78.4,0,0),(78.9,0,0),(79.4,0,0),(79.9,0,0),(80.4,0,0),(80.9,0,0)]: firework(tf, .9, .22)
# S9 finale (82–88)
for tf in (82.2, 82.9, 83.6, 84.3, 85.0, 85.7, 86.4, 87.1): firework(tf, .6, .12, whistle=False)
sparkle(82.6, .4, n=8); sparkle(83.0, .32, n=6, up=False)

fade = np.ones(len(buf)); n = int(.8 * SR); fade[-n:] = np.linspace(1, 0, n); buf *= fade[:, None]
for c in range(2): buf[:, c] = limit(buf[:, c], .89)
sf.write(os.path.join(HERE, 'sfx.wav'), buf.astype(np.float32), SR)
print('sfx.wav', buf.shape)
