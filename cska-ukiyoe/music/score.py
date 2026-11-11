"""ЦСКА · Оттиски — original score, 96 BPM (bar 2.5 s), miyako-bushi on D (D Eb G A Bb).
shamisen (physically modelled, sawari) · shakuhachi (recorder/flute samples reshaped) · taiko / shime / o-tsuzumi · hyoshigi · koto · hand bell.
Instrument recipes (hyoshigi, odaiko, shime, shaku) adapted from the Lemo-Opuscar Ukiyo-e demo score (MIT).
Run: $LIB/.venv/bin/python music/score.py  → music/score.wav, music/stems/, music/score.json"""
import sys, os, json
LIB = os.environ.get('LIB') or os.path.expanduser('~/lemo-opuscar')
sys.path.insert(0, LIB)
import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt
from core.audio import sampler as S, pluck as P
from core.audio.sfx import SR, add
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
DUR = 45.0; N = int(DUR * SR)
rng = np.random.default_rng(2021); S.seed(25)
def bpf(x, lo, hi, o=2): return sosfilt(butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def lpf(x, f, o=2): return sosfilt(butter(o, f, 'low', fs=SR, output='sos'), x)
def hpf(x, f, o=2): return sosfilt(butter(o, f, 'high', fs=SR, output='sos'), x)
def st(): return np.zeros((N, 2), np.float32)
stems = {k: st() for k in ['shamisen', 'shakuhachi', 'taiko', 'hyoshigi', 'koto', 'other']}
EVENTS = []
def mark(t, k, d): EVENTS.append((round(t, 3), k, d))

# ——————————————— hyoshigi (two hardwood sticks struck together) ———————————————
def hyoshigi(v=1.0):
    L = int(.5 * SR); t = np.arange(L) / SR
    y = np.zeros(L)
    for f, a, tau in [(1180, 1., .05), (2460, .7, .035), (3870, .45, .022), (5300, .25, .012), (760, .35, .07)]:
        y += a * np.sin(2 * np.pi * f * t + rng.random() * 6) * np.exp(-t / tau)
    cl = rng.standard_normal(L) * np.exp(-t / .0018); y += 1.6 * bpf(cl, 1500, 9000)
    y /= np.abs(y).max()
    s1 = S.hit('world_perc', 'claves', .9); s2 = S.hit('woodblock', 'a', .9)
    out = np.zeros(L); out[:min(L, len(s1))] += s1[:L] / (np.abs(s1).max() + 1e-9) * .8; out[:min(L, len(s2))] += s2[:L] / (np.abs(s2).max() + 1e-9) * .45
    out += y * .9
    # the two pieces hit almost together: a second transient 3 ms later
    d = int(.003 * SR); out[d:] += .35 * out[:-d]
    return (out / np.abs(out).max() * .85 * v).astype(np.float32)

# ——————————————— taiko ———————————————
def odaiko(v=1.0, big=False):
    L = int(2.4 * SR); t = np.arange(L) / SR
    f = 58 + 62 * np.exp(-t / .045)                       # pitch drops after the head is struck
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t / (.55 if big else .42)) + .35 * np.sin(1.59 * ph + 1) * np.exp(-t / .22) + .18 * np.sin(2.14 * ph) * np.exp(-t / .12)
    don = bpf(rng.standard_normal(L), 90, 900) * np.exp(-t / .02) * .8   # the "don" of the struck head
    stick = bpf(rng.standard_normal(L), 1200, 5000) * np.exp(-t / .004) * .25  # stick
    syn = body + don + stick
    syn /= np.abs(syn).max()
    out = syn * .85
    for inst, var, g in [('gran_cassa', 'hit', .55), ('toms', 'low_mallet', .35), ('frame_drum', 'large', .3)]:
        s = S.hit(inst, var, min(1, .55 + .45 * v)); s = s[:L] / (np.abs(s).max() + 1e-9)
        out[:len(s)] += s * g
    out = lpf(out, 3500)
    return (out / np.abs(out).max() * v).astype(np.float32)
def cut(x, d):
    n = int(d * SR)
    if n >= len(x): return x
    x = x[:n].copy(); k = min(n, int(.08 * SR)); x[-k:] *= np.linspace(1, 0, k); return x
def shime(v=.6):
    L = int(.6 * SR); t = np.arange(L) / SR
    f = 390 + 140 * np.exp(-t / .01); ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) * np.exp(-t / .07) + .5 * bpf(rng.standard_normal(L), 800, 4000) * np.exp(-t / .006)
    s = S.hit('frame_drum', 'small_muted', .7); s = s[:L] / (np.abs(s).max() + 1e-9)
    y = y / np.abs(y).max() * .7; y[:len(s)] += s * .5
    return (y / np.abs(y).max() * v).astype(np.float32)

# ——————————————— shamisen ———————————————
def sam(p, v=.7, dur=None, **kw):
    kw.setdefault('buzz', .7)
    return P.pluck('shamisen', p, dur, v, **kw)

# ——————————————— shakuhachi (recorder+flute samples → vibrato removed, slides, breath noise) ———————————————
def _f0track(y, f):
    hop, Nw = 480, 2048; out = []
    for s in range(0, max(1, len(y) - Nw), hop):
        fr = y[s:s + Nw] * np.hanning(Nw); sp = np.abs(np.fft.rfft(fr, 8 * Nw)); fq = np.fft.rfftfreq(8 * Nw, 1 / SR)
        m = (fq > f * .85) & (fq < f * 1.18); out.append(fq[m][np.argmax(sp[m])] if sp[m].max() > 1e-6 else f)
    return np.array(out), hop
def shaku(p, dur, v=.7, slide=-1.5, fall=0.0, kari=0.0, swell=.5, breath=1.0, rel=.35):
    """p: actual pitch; slide: attack slides in from this many semitones below (0 = no slide); fall: meri drop in semitones at the phrase end (negative); kari: upward lift at the phrase end (positive)
    swell: amount of crescendo in the middle of the note; breath: proportion of breath noise"""
    m = S.midi(p); f = 440 * 2 ** ((m - 69) / 12)
    ext = dur + rel + .8
    a = S.note('recorder', max(m, S.midi('F4') - 3), ext, .7, release=.2)
    b = S.note('flute', max(m, S.midi('C4')), ext, .6, release=.2)
    n = min(len(a), len(b)); y = .62 * a[:n] / (np.abs(a).max() + 1e-9) + .38 * b[:n] / (np.abs(b).max() + 1e-9)
    y = y.astype(np.float64)
    # 1) remove amplitude tremolo: divide by the smoothed envelope
    w = int(.06 * SR); e = np.sqrt(np.convolve(y ** 2, np.ones(w) / w, 'same')) + 1e-4
    e = np.convolve(e, np.ones(w) / w, 'same'); y = y / e
    y[:int(.03 * SR)] *= np.linspace(0, 1, int(.03 * SR))
    # 2) remove pitch vibrato + apply slides: variable-rate resampling
    tr, hop = _f0track(y, f); dev = 12 * np.log2(tr / np.median(tr[3:]))  # semitones
    dev = np.clip(dev, -.6, .6)
    tt = np.arange(n) / SR; devs = np.interp(tt, np.arange(len(dev)) * hop / SR + 1024 / SR, dev)
    L = int((dur + rel) * SR); to = np.arange(L) / SR
    bend = np.zeros(L)
    if slide: sl = .16; bend += np.where(to < sl, slide * (1 - np.sin(np.clip(to / sl, 0, 1) * np.pi / 2)), 0)
    if fall: k = np.clip((to - (dur - .45)) / .5, 0, 1); bend += fall * k * k
    if kari: k = np.clip((to - (dur - .3)) / .3, 0, 1); bend += kari * np.sin(k * np.pi / 2)
    dv = np.interp(to + .05, tt, devs)
    phase = .05 * SR + np.concatenate([[0], np.cumsum(2 ** ((bend[:-1] - dv[:-1]) / 12))])
    phase = np.minimum(phase, n - 2)
    z = np.interp(phase, np.arange(n), y)
    # 3) our own envelope: breath first, tone after; swells in the middle then falls back (shakuhachi-style breathing)
    at = .12; envl = np.clip(to / at, 0, 1) ** 1.6
    mid = 1 + swell * np.sin(np.clip(to / max(dur, .1), 0, 1) * np.pi) ** 1.5 * .8
    relk = np.clip((to - dur) / rel, 0, 1); envl = envl * mid * (1 - relk) ** 2
    z = z * envl
    # a bit darker, a bit hollower
    z = lpf(z, 3200) * .8 + bpf(z, 900, 1600) * .5
    # 4) breath noise: 1–4 kHz band-passed noise, stronger at the attack (muraiki, the forced breathy attack)
    nz = bpf(rng.standard_normal(L), 1000, 4000, 3)
    be = .22 * envl + .9 * np.exp(-np.clip(to, 0, None) / .07) * np.clip(to / .012, 0, 1)
    z = z / (np.abs(z).max() + 1e-9) + breath * .5 * nz / (np.abs(nz).max() + 1e-9) * be
    z[-min(len(z), 480):] *= np.linspace(1, 0, min(len(z), 480))
    return (z / (np.abs(z).max() + 1e-9) * v).astype(np.float32)

def put(k, x, t, g=1.0, pan=0.0, note=None):
    add(stems[k], x, t, g, pan)
    if note: mark(t, k, note)


def put(k, x, t, g=1.0, pan=0.0, note=None):
    add(stems[k], x, t, g, pan)
    if note: mark(t, k, note)
def tsuzumi(v=1.0):   # o-tsuzumi: a dry, high "kan!" crack
    L = int(.5 * SR); t = np.arange(L) / SR
    f = 620 + 380 * np.exp(-t / .012); ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.sin(ph) * np.exp(-t / .06) + .3 * np.sin(2.3 * ph) * np.exp(-t / .03) + 1.2 * bpf(rng.standard_normal(L), 1500, 7000) * np.exp(-t / .004)
    return (y / np.abs(y).max() * v).astype(np.float32)
def koto(p, v=.6, **kw): return P.pluck('koto', p, None, v, **kw)
def bell(p='D6', v=.6):
    try: return S.note('hand_chimes', S.midi(p), 3.0, v, release=2.5)
    except Exception:
        L = int(3 * SR); t = np.arange(L) / SR; f = S.hz(p); y = sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t / tau) for k, a, tau in [(1, 1, 1.4), (2.76, .4, .5), (5.4, .2, .2)]); return (y / np.abs(y).max() * v).astype(np.float32)

BT = 60 / 96; E8 = BT / 2
# —— 0–7.5 hook: one clap, a long breath of shakuhachi, low koto ——
put('hyoshigi', hyoshigi(1.0), 0.0, 1.0, 0, 'first sound: hyoshigi clap')
for i, t in enumerate([.45, .9, 1.35]): put('hyoshigi', hyoshigi(.45 + .08 * i), t, .55, (-.3, .3, -.15)[i])
put('koto', koto('D2', .55), 0.02, .9, -.2)
put('shakuhachi', shaku('A4', 1.8, .7, slide=-2, swell=.6), 0.55, 1, .1, 'shakuhachi motif A4')
put('shakuhachi', shaku('Bb4', .45, .55, slide=0, swell=.1, breath=.7), 2.4, .8, .1)
put('shakuhachi', shaku('A4', 1.6, .45, slide=0, fall=-1.1, swell=.3), 2.85, .7, .1)
put('koto', koto('A2', .45), 2.5, .8, -.2); put('koto', koto('D3', .4), 5.0, .7, .2)
put('shamisen', sam('D5', .6, t60=.8, buzz=.5), 4.0, .7, .15, 'slide lands on 2021')
# —— 7.5–17.5 2021: shamisen ostinato, shime pulse, the throw ——
pat = ['D4', 'A3', 'D4', 'Eb4', 'D4', 'A3', 'G3', 'A3']
t = 7.5; i = 0
while t < 14.95:
    v = (.36 if t < 13.0 else .5) * (1 if i % 2 == 0 else .72)
    put('shamisen', sam(pat[i % 8], v, buzz=.55), t, .7, -.1 + .2 * (i % 2), 'shamisen ostinato 96' if i == 0 else None)
    if t >= 10.0 and i % 2 == 0: put('taiko', shime(.3 + .25 * (t - 10) / 5), t, .8, .3, 'shime pulse (the run)' if abs(t - 10) < .01 else None)
    t += E8; i += 1
put('taiko', odaiko(.6), 13.0, .6, 0, 'jump')
for k, p in enumerate(['D4', 'Eb4', 'G4', 'A4', 'Bb4', 'D5']): put('shamisen', sam(p, .45 + k * .05, buzz=.6), 14.0 + k * .07, .7, -.2 + k * .08, 'throw: rising run' if k == 0 else None)
put('taiko', odaiko(1.0, big=True), 15.0, 1.1, 0, 'GOAL 15.0: odaiko + chord + hyoshigi')
put('shamisen', P.strum('shamisen', ['D3', 'A3', 'D4', 'A4'], None, .9, spread=.01, buzz=1.0, t60=2.0), 15.0, .9, 0)
put('hyoshigi', hyoshigi(.9), 15.0, .8, .2)
put('shamisen', sam('D5', .55, t60=1.6, buzz=.6), 16.25, .6, .2)
# —— 17.5–24.2 2022: near silence, then shakuhachi alone with meri drops ——
put('shakuhachi', shaku('A4', 1.7, .55, slide=-2.5, fall=-1.0, swell=.4), 19.0, .85, .1, 'shakuhachi solo (2022)')
put('shakuhachi', shaku('G4', .6, .45, slide=0, swell=.1), 20.85, .8, .1)
put('shakuhachi', shaku('Eb4', 1.5, .45, slide=-1, fall=-1.3, swell=.4), 21.6, .75, .1)
put('shakuhachi', shaku('D4', 1.4, .4, slide=0, fall=-.8, swell=.3, rel=.25), 22.85, .7, .1)
put('koto', koto('Eb3', .3), 22.4, .6, -.3, 'save: dull koto')
# —— 25–35 three titles: o-tsuzumi, taiko heartbeat to a roll, shamisen 16ths, accelerating hyoshigi ——
put('other', tsuzumi(1.0), 25.0, .9, .1, 'TURN 25.0: o-tsuzumi + odaiko + strum (after absolute silence)')
put('taiko', odaiko(1.0, big=True), 25.0, 1.1, 0)
put('shamisen', P.strum('shamisen', ['D3', 'A3', 'D4', 'A4'], .4, 1.0, spread=.008, buzz=1.0), 25.0, .9, 0)
ts = []; t = 25.625; gap = BT
while t < 35.0:
    ts.append(t); gap = max(.11, gap * (.985 if t < 31 else .93)); t += gap
for j, t in enumerate(ts):
    prog = (t - 25.6) / 9.4
    put('taiko', cut(odaiko(min(1, .45 + .45 * prog)), max(.3, 2.5 * ((ts[j + 1] if j + 1 < len(ts) else t + .2) - t))), t, .55 + .35 * prog, (rng.random() - .5) * .3, 'taiko heartbeat → roll' if j == 0 else None)
t = 25.0 + E8; i = 0
while t < 35.0:
    step = E8 if t < 30.0 else E8 / 2
    v = (.38 if t < 28 else .48) * (1 if i % 2 == 0 else .7)
    put('shamisen', sam(pat[i % 8], v, buzz=.6), t, .65, -.1 + .2 * (i % 2)); t += step; i += 1
for ts_, p in [(27.5, 'D4'), (30.0, 'G4'), (32.5, 'A4')]:
    put('taiko', odaiko(.95, big=True), ts_, .9, 0, f'seal {ts_}')
    put('koto', P.strum('koto', [p, S.name(S.midi(p) + 7), S.name(S.midi(p) + 12)], None, .7, spread=.03), ts_, .8, .2)
put('hyoshigi', hyoshigi(1.0), T_NET := 32.5, .9, .2)
g = .5; t = 31.0
while t < 34.9: put('hyoshigi', hyoshigi(.5 + .4 * (t - 31) / 4), t, .55, (rng.random() - .5) * .5); g = max(.09, g * .82); t += g
mark(31.0, 'hyoshigi', 'hyoshigi accelerate (kabuki curtain call)')
# —— 35–40 triptych held: roll cut, a bell, the opening motif returns ——
put('other', bell('D6', .7), 35.0, .7, .2, 'roll cut 35.0: hand bell')
put('shakuhachi', shaku('A4', 1.6, .55, slide=-2, swell=.5), 35.4, .75, .1, 'opening motif returns')
put('shakuhachi', shaku('Bb4', .45, .45, slide=0, swell=.1, breath=.7), 37.15, .7, .1)
put('shakuhachi', shaku('A4', 1.2, .45, slide=0, fall=-.9, swell=.3), 37.6, .7, .1)
put('koto', koto('D3', .35), 37.2, .6, -.2)
# —— 39.3 koto glissando, 42.0 emblem: odaiko + one sawari note ringing to the end ——
for k, p in enumerate(['D3', 'Eb3', 'G3', 'A3', 'Bb3', 'D4', 'Eb4', 'G4', 'A4', 'Bb4', 'D5']): put('koto', koto(p, .4 + k * .03), 39.3 + k * .05, .7, -.4 + k * .08, 'koto glissando (the club colours)' if k == 0 else None)
put('taiko', odaiko(.95, big=True), 42.0, 1.0, 0, 'EMBLEM 42.0: odaiko + shamisen sawari note')
put('shamisen', sam('D3', .8, t60=4.0, buzz=.95), 42.0, 1.0, -.05)
put('shakuhachi', shaku('D5', 2.4, .45, slide=-2, fall=-.8, swell=.5, breath=1.0, rel=.6), 42.3, .7, .1)

# —— reverb, the two silences, sum ——
wet = {'shamisen': (.45, .2), 'shakuhachi': (.6, .3), 'taiko': (.65, .22), 'hyoshigi': (.35, .12), 'koto': (.5, .22), 'other': (.5, .2)}
for k, (sz, mx) in wet.items():
    if np.abs(stems[k]).max() > 0: stems[k] = S.room(stems[k], size=sz, mix=mx).astype(np.float32)
GAIN = {'shamisen': 1.0, 'shakuhachi': .8, 'taiko': .95, 'hyoshigi': .8, 'koto': .9, 'other': .9}
SIL = [(17.6, 18.95), (24.2, 25.0)]           # near-silence (ma 1) and absolute silence (ma 2)
tail = N - int(.25 * SR)
for k in stems:
    x = stems[k] * GAIN[k]
    for a, b in SIL:
        i0, i1, f = int(a * SR), int(b * SR), int(.08 * SR); x[i0:i0 + f] *= np.linspace(1, 0, f)[:, None]; x[i0 + f:i1] = 0
    x[tail:] *= np.linspace(1, 0, N - tail)[:, None]
    stems[k] = x.astype(np.float32)
mix = sum(stems.values()); sc = .89 / np.abs(mix).max(); mix *= sc
for k in stems: stems[k] *= sc
os.makedirs(os.path.join(HERE, 'stems'), exist_ok=True)
sf.write(os.path.join(HERE, 'score.wav'), mix.astype(np.float32), SR, subtype='FLOAT')
for k, x in stems.items(): sf.write(os.path.join(HERE, 'stems', k + '.wav'), x, SR, subtype='FLOAT')
json.dump(dict(dur=DUR, events=EVENTS, silences=SIL), open(os.path.join(HERE, 'score.json'), 'w'), ensure_ascii=False, indent=1)
print('score ok', round(float(np.abs(mix).max()), 3), 'silent ma2:', bool(np.all(mix[int(24.3 * SR):int(25.0 * SR)] == 0)))
