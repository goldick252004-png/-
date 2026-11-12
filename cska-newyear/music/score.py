"""ЦСКА · С Новым годом! — original score, 120 BPM (bar 2 s), D major.
Music box (modal synthesis) · glockenspiel · harp · pizzicato strings · sleigh bells · tubular bell (samples: VCSL, VSCO 2 CE, CC0).
Run: $LIB/.venv/bin/python music/score.py → music/score.wav"""
import sys, os, json
LIB = os.environ.get('LIB') or os.path.expanduser('~/lemo-opuscar'); sys.path.insert(0, LIB)
import numpy as np, soundfile as sf
from core.audio import sampler as S, pluck as P
from core.audio.sfx import SR, add
HERE = os.path.dirname(os.path.abspath(__file__))
DUR = 41.0; N = int(DUR * SR); S.seed(27)
stems = {k: np.zeros((N, 2), np.float32) for k in ['box', 'glock', 'harp', 'pizz', 'bells', 'other']}
B = .5
def put(k, x, t, g=1.0, pan=0.0):
    if x is not None and t < DUR: add(stems[k], np.asarray(x, np.float32), t, g, pan)
def box(p, v=.7, d=1.2): return P.pluck('music_box', p, d, v)
def glock(p, v=.6, d=1.5):
    try: return S.note('glockenspiel', p, d, v, release=1.2)
    except Exception: return box(p, v)
def harp(p, v=.6, d=1.5): return S.note('harp', p, d, v, release=1.5)
def pizz(p, v=.7): return S.note('cellos_pizz', p, .5, v)
def bells(v=.6): return S.hit('sleighbells', None, v)
def tub(p, v=.8): return S.note('tubular_bells', p, 3.0, v, release=3.0)
# theme: 8 bars (beat, pitch, beats)
TH = [(0, 'A4', 1), (1, 'D5', 1), (2, 'F#5', 1), (3, 'E5', 1), (4, 'D5', 2), (6, 'B4', 1), (7, 'A4', 1),
      (8, 'G4', 1), (9, 'B4', 1), (10, 'D5', 1), (11, 'G5', 1), (12, 'F#5', 2), (14, 'E5', 2),
      (16, 'E5', 1), (17, 'F#5', 1), (18, 'G5', 1), (19, 'E5', 1), (20, 'F#5', 1), (21, 'D5', 1), (22, 'A4', 2),
      (24, 'B4', 1), (25, 'C#5', 1), (26, 'D5', 1), (27, 'E5', 1), (28, 'D5', 4)]
BASS = ['D3', 'B2', 'G2', 'A2', 'E3', 'D3', 'G2', 'D3']; BASS2 = ['A2', 'F#2', 'D3', 'C#3', 'A2', 'A2', 'A2', 'A2']
def theme(t0, bars=8, oct=0, glk=False, bass=True, sb=False, v=.65):
    for b, p, d in TH:
        if b >= bars * 4: continue
        m = S.midi(p) + 12 * oct; t = t0 + b * B
        put('box', box(m, v, d * B + .6), t, 1.0, .1)
        if glk: put('glock', glock(m + 12 if m + 12 <= S.midi('C8') else m, v * .55, d * B), t, .7, -.2)
    for i in range(bars):
        if bass: put('pizz', pizz(BASS[i], .75), t0 + i * 2, .9, -.15); put('pizz', pizz(BASS2[i], .6), t0 + i * 2 + 1, .8, -.15)
        if sb: [put('bells', bells(.45), t0 + i * 2 + k, .5, .3) for k in (.5, 1.5)]
# 0.5 the lamp: a rising box arpeggio
for i, p in enumerate(['D5', 'F#5', 'A5', 'D6']): put('box', box(p, .5), .55 + i * .14, .8, .2)
# 2.4 the book opens: harp glissando
for i, p in enumerate(['D4', 'E4', 'F#4', 'A4', 'B4', 'D5', 'E5', 'F#5', 'A5', 'D6']): put('harp', harp(p, .45 + i * .03, .8), 2.4 + i * .1, .8, -.3 + i * .06)
# 4.0–14.0 theme (5 bars), sleigh bells join at 8.0 when the game starts
theme(4.0, bars=5, v=.55)
for i in range(2, 5): [put('bells', bells(.35), 4.0 + i * 2 + k, .45, .3) for k in (.5, 1.5)]
put('box', box('D5', .4, 2.0), 14.0, .7, .1); put('harp', harp('D3', .45, 2), 14.0, .7, -.2)
# 15–17.3 near silence (the wish). 17.7 jump: pizz slide up; 18.0–19.9 the ball flies: accelerating glock run
put('pizz', pizz('A2', .8), 17.7, 1.0, 0)
run = ['D5', 'E5', 'F#5', 'G5', 'A5', 'B5', 'C#6', 'D6', 'E6', 'F#6', 'A6']
for i, p in enumerate(run): put('glock', glock(p, .35 + i * .04, .4), 18.0 + 1.9 * (1 - (1 - i / len(run)) ** 1.6), .7, -.3 + i * .06)
# 20.0 the star: tutti chord and the theme in full
for p in ['D3', 'A3', 'D4', 'F#4', 'A4', 'D5']: put('harp', harp(p, .7, 2.5), 20.0, .7, 0)
put('glock', glock('D6', .8, 2), 20.0, .9, .2); put('other', tub('D5', .6), 20.0, .4, 0)
theme(20.0, bars=1, glk=True, sb=True, v=.7)
theme(22.0, bars=1, glk=False, v=.5)          # turn: last bar softly
# 25.5–29.5 the tab: a pizz countdown on every beat, rising
for i in range(8): put('pizz', pizz(['D3', 'E3', 'F#3', 'G3', 'A3', 'B3', 'C#4', 'D4'][i], .5 + i * .05), 25.6 + i * .5, .9, 0)
# 30.0 the year turns: bell + jubilant theme up an octave with glock and sleigh bells
put('other', tub('D5', .9), 30.0, .8, 0); put('other', tub('A4', .6), 30.0, .5, .2)
theme(30.0, bars=2, oct=1, glk=True, sb=True, v=.7); theme(34.0, bars=1, oct=1, glk=True, sb=True, v=.55)
# 35–37.4 everything folds: a descending box line
for i, p in enumerate(['D6', 'B5', 'A5', 'F#5', 'E5', 'D5', 'B4', 'A4']): put('box', box(p, .5 - i * .03), 35.2 + i * .25, .8, .1)
# 38.0 the card: final cadence (harp roll + glock + box + bell)
for i, p in enumerate(['D3', 'A3', 'D4', 'F#4', 'A4', 'D5', 'F#5']): put('harp', harp(p, .6, 3), 38.0 + i * .05, .8, -.3 + i * .1)
put('glock', glock('A6', .6, 3), 38.0, .7, .2); put('box', box('D6', .6, 3), 38.05, .8, -.1); put('other', tub('D5', .5), 38.0, .4, 0)
put('bells', bells(.5), 38.0, .5, .3)
# room, silence, sum
wet = {'box': (.45, .22), 'glock': (.5, .25), 'harp': (.5, .2), 'pizz': (.35, .15), 'bells': (.4, .2), 'other': (.6, .25)}
for k, (sz, mx) in wet.items():
    if np.abs(stems[k]).max() > 0: stems[k] = S.room(stems[k], size=sz, mix=mx).astype(np.float32)
G = {'box': 1.0, 'glock': .8, 'harp': .8, 'pizz': .85, 'bells': .6, 'other': .7}
mix = sum(stems[k] * G[k] for k in stems)
a, b, f = int(15.0 * SR), int(17.3 * SR), int(.4 * SR); mix[a:a + f] *= np.linspace(1, 0, f)[:, None]; mix[a + f:b] = 0
tail = N - int(1.2 * SR); mix[tail:] *= np.linspace(1, 0, N - tail)[:, None]
mix = mix / np.abs(mix).max() * .89
sf.write(os.path.join(HERE, 'score.wav'), mix.astype(np.float32), SR, subtype='FLOAT')
print('score ok', round(float(np.abs(mix).max()), 3))
