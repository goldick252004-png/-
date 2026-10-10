"""Сборка вертикального рилса из двух горизонтальных роликов (IMG_5364 + IMG_5365).

Всё в одном файле: сценарий (ITEMS / события), аудио-микс, покадровый рендер.
Запуск:  python3 reel.py out.mp4 [--preview]
"""
import json, math, os, subprocess, sys, time
import numpy as np
import cv2
from scipy.io import wavfile
from scipy.ndimage import uniform_filter1d, maximum_filter1d
from scipy import signal as sps

import lib
from lib import W, H, blit, text_sprite, pill_sprite, meme_card, emoji_sprite, anim
import synth

UP = "/root/.claude/uploads/d5938971-cb53-596e-823e-98716e8c7ca0"
SRC = {"v1": f"{UP}/9eedf629-IMG_5364.mp4", "v2": f"{UP}/94308fd9-IMG_5365.mp4"}
FPS, SR = 30, 48000
VW, VH, VX, VY = 1020, 574, 30, 600          # видео-окно на холсте 1080x1920
CAP_Y = 1360                                    # центр субтитров
TALK_SPEED = 1.12                               # речь чуть быстрее (без смены тембра)

YELLOW, WHITE, GREEN, RED = (255, 229, 59), (255, 255, 255), (124, 255, 74), (255, 70, 70)
NAME_STEMS = ("шрек", "осл", "осёл", "кот", "фаркуад", "пиноккио", "мерлин", "дракон", "фею", "мыш", "крыс", "чарминг")

# ============================================================ СЦЕНАРИЙ
ITEMS = []


def talk(src, t0, t1, runs, bleeps=(), speed=TALK_SPEED):
    ITEMS.append(dict(kind="talk", src=src, t0=t0, t1=t1, runs=runs, bleeps=list(bleeps), speed=speed))


def ff(src, t0, t1, speed, label="", meme=None):
    ITEMS.append(dict(kind="ff", src=src, t0=t0, t1=t1, speed=speed, label=label, meme=meme))


def hold(dur):
    ITEMS.append(dict(kind="hold", dur=dur, speed=1.0))


# ---------------- ролик 1 (IMG_5364): вступление
talk("v1", 0.80, 6.95, [(0.99, 4.61, "Ну что, начинаются взрослые рилсы, которые"), (5.09, 6.75, "все мы заслужили.")])
talk("v1", 10.55, 12.50, [(10.75, 12.15, "Даня очень хочет сниматься.")])
talk("v1", 13.45, 17.05, [(13.60, 16.80, "И купили вот такие вот штучки.")])
ff("v1", 17.05, 21.30, 3.0, label="{23e9} x3")
talk("v1", 21.30, 23.05, [(21.47, 22.82, "Даня, расскажи, что это?")])
talk("v1", 23.90, 25.49, [(24.03, 25.44, "{1f92c}, нет, ну стыд!")], bleeps=[(23.98, 24.46)])

# ---------------- ролик 2 (IMG_5365): выбор персонажей и распаковка
talk("v2", 5.35, 10.35, [(5.47, 10.11, "Сначала мы хотим выбрать, кого мы хотим. Я 100% хочу Кота в сапогах")])
talk("v2", 10.62, 13.30, [(10.78, 13.09, "Или Осла. А ты?")])
talk("v2", 17.80, 19.60, [(17.95, 19.42, "Я хочу Фаркуада,")])
talk("v2", 20.40, 23.55, [(20.58, 23.36, "Пиноккио с мышью")])
talk("v2", 24.05, 26.70, [(24.19, 26.53, "или Фею-крёстную?")])
talk("v2", 26.90, 29.60, [(27.04, 29.44, "Ну что, кайф! Давай открывать? Давай.")])
talk("v2", 31.15, 33.10, [(31.30, 32.96, "Да не, я сейчас некрасиво открою.")])
ff("v2", 33.10, 38.20, 4.5, label="{23e9} x4", meme="Открываем пакетики {1f92b}")
talk("v2", 38.25, 39.25, [(38.40, 39.04, "Пиноккио.")])
ff("v2", 39.25, 42.20, 3.0, label="{23e9} x3")
talk("v2", 42.20, 46.35, [(42.34, 42.78, "Это кто?"), (43.23, 46.21, "А, Мерлин? Там ещё Мерлин был...")])
talk("v2", 47.10, 52.80, [(47.26, 52.64, "Тут не все показаны. У меня Мерлин. Жесть. Ну ладно, зато у меня мышь хотя бы.")])
talk("v2", 53.00, 56.05, [(53.15, 54.11, "Мышь? Это я."), (55.17, 55.90, "Хорошо, крыса.")])
talk("v2", 56.85, 61.35, [(56.99, 61.22, "А крыса это кто? Тоже ты. Смотри, я нормально, да?")])
ff("v2", 61.35, 65.25, 4.0, label="{23e9} x4", meme="Инструкция? Не, не слышали {1f648}")
talk("v2", 65.30, 66.40, [(65.44, 66.21, "Это что, Даня?")])
ff("v2", 66.40, 69.35, 3.5, label="{23e9} x3.5", meme="Лего-инженеры 3000 {1f527}")
talk("v2", 69.35, 71.60, [(69.50, 71.42, "Это из рук, он стреляет молниями.")])
talk("v2", 72.10, 75.30, [(72.22, 72.54, "Бэ!"), (73.09, 75.14, "Пиноккио улетел.")])
ff("v2", 77.70, 85.40, 6.0, label="{23e9} x6", meme="Я: *ищу ту самую детальку* {1f50d}")
talk("v2", 85.40, 87.15, [(85.57, 87.01, "Я хочу ему голову оторвать.")])
talk("v2", 88.60, 93.00, [(88.77, 92.80, "Посмотри на себя, ты же {1f92c}. А, вот тут они.")], bleeps=[(90.85, 91.55)])
talk("v2", 122.15, 124.30, [(122.30, 124.16, "А-а-а!")])
talk("v2", 125.10, 129.60, [(125.28, 129.38, "Точно! Там же ещё Дракониха была у них. Да.")])
ff("v2", 129.60, 132.50, 3.0, label="{23e9} x3")
talk("v2", 132.55, 136.30, [(132.67, 136.10, "Нет, Дракониха ещё в первой части была. Я в курсе, я имею в виду, что...")])
talk("v2", 137.15, 139.45, [(137.31, 139.26, "Осёл, Кот и Дракониха.")])
talk("v2", 139.90, 144.00, [(140.03, 143.78, "У меня вот такой получился.")])
talk("v2", 145.35, 146.45, [(145.50, 146.27, "Ты его поставь.")])
ff("v2", 146.45, 153.05, 5.0, label="{23e9} x5", meme="Финальная деталька... {1f91e}")
talk("v2", 153.10, 154.80, [(153.22, 153.62, "{1f92c}"), (154.30, 154.59, "О!")], bleeps=[(153.15, 153.65)])
ff("v2", 154.80, 159.55, 4.0, label="{23e9} x4")
talk("v2", 159.55, 162.28, [(159.71, 160.96, "Восхитительно.")])
hold(2.4)

# ---------------- события (время в секундах ИСХОДНИКА)
EV = []
SFX = []   # (src, t, name, gain) либо ("tl", t, ...)


def _ev(**k):
    EV.append(k)


def sticker(src, t, code, pos="tr", size=280, dur=1.2, an="pop", sfx=("pop", 0.6), rot=0.0, dx=0, dy=0):
    _ev(kind="sticker", src=src, t=t, code=code, pos=pos, size=size, dur=dur, an=an, rot=rot, dx=dx, dy=dy)
    if sfx:
        SFX.append((src, t, sfx[0], sfx[1]))


def memecard(src, t, text, dur=2.4, size=50, y=395):
    _ev(kind="meme", src=src, t=t, text=text, dur=dur, size=size, y=y)
    SFX.append((src, t, "whoosh", 0.35))


def punch(src, t, z=1.28, fx=0.5, fy=0.5, dur=0.9):
    _ev(kind="punch", src=src, t=t, z=z, fx=fx, fy=fy, dur=dur)


def shake(src, t, amp=26, dur=0.45):
    _ev(kind="shake", src=src, t=t, amp=amp, dur=dur)


def flash(src, t, dur=0.14, color=(255, 255, 255)):
    _ev(kind="flash", src=src, t=t, dur=dur, color=color)


def insert(src, t, code, dur=0.8, text=None, tcolor=WHITE, dim=0.62, sfx=("boom", 0.9)):
    _ev(kind="insert", src=src, t=t, code=code, dur=dur, text=text, tcolor=tcolor, dim=dim)
    if sfx:
        SFX.append((src, t, sfx[0], sfx[1]))


def censor(src, t, dur):
    _ev(kind="censor", src=src, t=t, dur=dur)


def confetti(src, t, dur=2.2):
    _ev(kind="confetti", src=src, t=t, dur=dur)


def sound(src, t, name, gain=0.8):
    SFX.append((src, t, name, gain))


# ---- V1
punch("v1", 2.9, 1.12, 0.5, 0.45, 1.2)
sticker("v1", 6.1, "1f3c6", "tr", 240, 1.0)                        # «мы заслужили»
sticker("v1", 14.35, "1f6cd", "tl", 280, 1.4)                      # «купили вот такие штучки»
punch("v1", 14.2, 1.45, 0.17, 0.42, 1.9)
sticker("v1", 21.55, "1f3a4", "tl", 270, 1.3)
punch("v1", 21.5, 1.3, 0.82, 0.4, 1.3)
insert("v1", 24.00, "1f92c", 0.75, "ЦЕНЗУРА", RED, sfx=("boom", 0.7))
shake("v1", 24.0, 30, 0.5)
sticker("v1", 24.85, "1f648", "tr", 270, 1.0)

# ---- V2: выбор персонажей
sticker("v2", 9.35, "1f431", "tr", 290, 1.3)                       # Кот в сапогах
punch("v2", 9.3, 1.18, 0.5, 0.5, 1.0)
sticker("v2", 11.5, "1facf", "tl", 290, 1.3)                       # Осёл
sticker("v2", 18.5, "1f934", "tr", 280, 1.0)                       # Фаркуад
sticker("v2", 21.0, "1f925", "tl", 280, 1.0)                       # Пиноккио
sticker("v2", 22.4, "1f42d", "tr", 280, 1.0)                       # мышь
sticker("v2", 25.1, "1f9da", "tl", 280, 1.2)                       # Фея
sticker("v2", 27.1, "1f4e6", "tr", 300, 1.2, an="spin")            # давай открывать
punch("v2", 27.05, 1.25, 0.5, 0.6, 0.9)
sticker("v2", 32.1, "1f62c", "tl", 270, 1.0)                       # некрасиво
insert("v2", 38.45, "1f925", 0.75, "ПИНОККИО!", GREEN, sfx=("ding", 0.8))
flash("v2", 38.40, 0.12)
sound("v2", 33.2, "whirr", 0.6)

# Мерлин
sticker("v2", 42.4, "2753", "tl", 260, 0.9)
sticker("v2", 43.6, "1f9d9", "tr", 300, 1.5, an="drop")
memecard("v2", 48.2, "Ждал Кота в сапогах, а выпал Мерлин {1f9d9}", 3.0)
insert("v2", 50.35, "1f480", 0.7, "ЖЕСТЬ", WHITE, sfx=("boom", 1.0))
shake("v2", 50.35, 28, 0.5)
sound("v2", 52.55, "trombone", 0.55)
sticker("v2", 53.4, "1f42d", "tr", 260, 1.0)
sticker("v2", 55.45, "1f400", "tl", 260, 1.0)
sticker("v2", 58.9, "1faf5", "tr", 320, 1.2, sfx=("ding", 0.6))
punch("v2", 58.8, 1.35, 0.55, 0.45, 1.2)
sticker("v2", 60.55, "1f60e", "tl", 260, 1.1)
sticker("v2", 65.65, "1f928", "tr", 280, 0.9)
sticker("v2", 70.55, "26a1", "tl", 320, 1.2, sfx=("zap", 0.9))     # молнии
flash("v2", 70.55, 0.16)
shake("v2", 70.55, 24, 0.5)
punch("v2", 70.5, 1.3, 0.5, 0.5, 1.0)
sticker("v2", 72.25, "1f4a5", "tr", 300, 0.8, sfx=("boom", 0.7))   # «Бэ!»
sticker("v2", 73.55, "1f925", "tl", 300, 1.5, an="fly", sfx=("whoosh", 0.7))
sticker("v2", 86.1, "1f621", "tr", 280, 1.2)
shake("v2", 86.1, 14, 0.4)

# мат + ответ
insert("v2", 90.85, "1f92c", 0.8, "ЦЕНЗУРА", RED, sfx=("scratch", 0.9))
shake("v2", 90.85, 30, 0.5)
sticker("v2", 92.0, "1f440", "tr", 260, 1.0)

# дракониха
insert("v2", 122.40, "1f4a1", 0.6, "ТОЧНО!", YELLOW, sfx=("ding", 0.9), dim=0.5)
punch("v2", 122.35, 1.3, 0.5, 0.5, 1.0)
sticker("v2", 127.4, "1f409", "tr", 320, 1.4)
sticker("v2", 134.7, "1f913", "tl", 300, 1.4, sfx=("boing", 0.6))   # «Я в курсе»
sticker("v2", 137.6, "1facf", "tl", 250, 1.3)
sticker("v2", 138.15, "1f431", "tr", 250, 1.1)
sticker("v2", 138.7, "1f409", "r", 250, 0.9)
punch("v2", 140.1, 1.3, 0.5, 0.5, 1.6)
sticker("v2", 142.6, "1f929", "tr", 300, 1.2, sfx=("twinkle", 0.7))

# финал
insert("v2", 153.18, "1f92c", 0.65, "ЦЕНЗУРА", RED, sfx=("boom", 0.8))
shake("v2", 153.2, 26, 0.45)
sticker("v2", 154.35, "1f62e", "tl", 280, 1.0)
insert("v2", 159.85, "1f929", 1.1, "ВОСХИТИТЕЛЬНО!", YELLOW, sfx=("tada", 0.9), dim=0.45)
confetti("v2", 159.8, 3.4)
flash("v2", 159.8, 0.16)

# ============================================================ ТАЙМЛАЙН
NAMES_LC = None


def build_timeline():
    f = 0
    for it in ITEMS:
        dur = it["dur"] if it["kind"] == "hold" else (it["t1"] - it["t0"]) / it["speed"]
        it["nf"] = max(1, round(dur * FPS))
        it["f0"] = f
        f += it["nf"]
    return f


def src2tl(src, t):
    for it in ITEMS:
        if it["kind"] != "hold" and it["src"] == src and it["t0"] - 1e-6 <= t <= it["t1"] + 1e-6:
            return (it["f0"] + (t - it["t0"]) / it["speed"] * FPS) / FPS
    return None


# ------------------------------------------------------------ субтитры
def _wlen(w):
    return len(w.replace("{1f92c}", "???")) + (0 if w[-1:].isalnum() else 0)


def build_captions():
    cards = []
    for it in ITEMS:
        if it["kind"] != "talk":
            continue
        for (a, b, text) in it["runs"]:
            words = text.split()
            wts = []
            for w in words:
                base = 6 if w.startswith("{") else max(2, sum(ch.isalnum() for ch in w))
                if w[-1] in ",": base += 1.5
                if w[-1] in ".?!…": base += 3
                wts.append(base)
            cum = np.concatenate([[0], np.cumsum(wts)]) / sum(wts)
            ws = []
            for i, w in enumerate(words):
                s = a + (b - a) * cum[i]
                e = a + (b - a) * cum[i + 1]
                ws.append((w, src2tl(it["src"], s), src2tl(it["src"], e)))
            groups, cur = [], []
            for w in ws:
                chars = sum(_wlen(x[0]) for x in cur) + len(cur)
                if cur and (chars + _wlen(w[0]) > 22 or len(cur) >= 4 or cur[-1][0][-1] in ".?!"):
                    groups.append(cur)
                    cur = []
                cur.append(w)
            if cur:
                groups.append(cur)
            for gi, g in enumerate(groups):
                t_on = g[0][1] - 0.02
                t_off = (groups[gi + 1][0][1] - 0.02) if gi + 1 < len(groups) else g[-1][2] + 0.22
                cards.append(dict(on=t_on, off=min(t_off, g[-1][2] + 0.5), words=g))
    cards.sort(key=lambda c: c["on"])
    return cards


_cap_cache = {}


def caption_sprite(card, ai):
    key = (id(card), ai)
    if key in _cap_cache:
        return _cap_cache[key]
    words = [w[0] for w in card["words"]]
    chars = sum(_wlen(w) for w in words) + len(words) - 1
    if chars > 14 and len(words) > 1:
        best, bi = 1e9, 1
        for k in range(1, len(words)):
            l1 = sum(_wlen(w) for w in words[:k]) + k - 1
            l2 = sum(_wlen(w) for w in words[k:]) + len(words) - k - 1
            if abs(l1 - l2) < best:
                best, bi = abs(l1 - l2), k
        split = [words[:bi], words[bi:]]
    else:
        split = [words]
    lines, idx = [], 0
    for ln in split:
        parts = []
        for j, w in enumerate(ln):
            wl = w.strip(".,!?…:;").lower()
            col = YELLOW if idx == ai else (GREEN if any(wl.startswith(s) for s in NAME_STEMS) else WHITE)
            parts.append(((w if w.startswith("{") else w.upper()) + (" " if j < len(ln) - 1 else ""), col))
            idx += 1
        lines.append(parts)
    spr = text_sprite(lines, size=86, font="mont", sw=11, shadow=5, line_gap=1.08, pad=20)
    _cap_cache[key] = spr
    return spr


# ============================================================ АУДИО
def load_audio(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def stretch(x, speed):
    if abs(speed - 1) < 1e-3:
        return x
    p = subprocess.run(["ffmpeg", "-v", "error", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "-",
                        "-af", f"atempo={speed}", "-f", "f32le", "-"], input=x.tobytes(), capture_output=True, check=True)
    return np.frombuffer(p.stdout, dtype=np.float32).copy()


def build_audio(total_frames, preview=False):
    total = int(total_frames / FPS * SR)
    aud = {k: load_audio(v) for k, v in SRC.items()}
    voice = np.zeros(total, np.float32)
    sfx_t = np.zeros(total, np.float32)
    ffmask = np.zeros(total, np.float32)
    # голос + бипы
    for it in ITEMS:
        s0 = int(it["f0"] / FPS * SR)
        n = int(it["nf"] / FPS * SR)
        if it["kind"] == "ff":
            ffmask[s0:s0 + n] = 1.0
            continue
        if it["kind"] != "talk":
            continue
        a = aud[it["src"]]
        i0, i1 = int(it["t0"] * SR), int(it["t1"] * SR)
        seg = a[i0:i1].copy()
        for (ba, bb) in it["bleeps"]:
            j0, j1 = max(0, int((ba - it["t0"]) * SR)), min(len(seg), int((bb - it["t0"]) * SR))
            seg[j0:j1] = 0
            fo = int(0.006 * SR)
            if j0 - fo >= 0:
                seg[j0 - fo:j0] *= np.linspace(1, 0, fo)
            if j1 + fo <= len(seg):
                seg[j1:j1 + fo] *= np.linspace(0, 1, fo)
            tpos = int((it["f0"] / FPS + (ba - it["t0"]) / it["speed"]) * SR)
            bp = synth.beep((bb - ba) / it["speed"])
            sfx_t[tpos:tpos + len(bp)] += bp[: max(0, total - tpos)] * 0.9
        seg = stretch(seg, it["speed"])
        # фейды на стыках
        fi = int(0.010 * SR)
        seg[:fi] *= np.linspace(0, 1, fi)
        seg[-fi:] *= np.linspace(1, 0, fi)
        seg = seg[:n]
        voice[s0:s0 + len(seg)] += seg
    # чистим голос: высокие пропускаем, компрессия мягкая через tanh после нормализации
    b, a_ = sps.butter(2, 90 / (SR / 2), "high")
    voice = sps.lfilter(b, a_, voice).astype(np.float32)
    rms = np.sqrt(np.mean(voice[voice != 0] ** 2)) if np.any(voice != 0) else 0.05
    voice *= 0.16 / max(rms, 1e-4)
    voice = np.tanh(voice * 1.2) / 1.2
    # SFX
    bank = dict(whoosh=synth.whoosh(0.5), boom=synth.boom(), pop=synth.pop(), ding=synth.ding(), zap=synth.zap(),
                scratch=synth.scratch(), trombone=synth.trombone(), boing=synth.boing(), tada=synth.tada(),
                twinkle=synth.twinkle(), thump=synth.thump(), whirr=synth.whirr(1.2), click=synth.click(),
                slide_up=synth.slide_up(), badumtss=synth.badumtss())
    events = list(SFX)
    # авто-звуки: свуш на входе/выходе таймлапса, тики
    for it in ITEMS:
        if it["kind"] == "ff":
            t0 = it["f0"] / FPS
            events.append(("tl", t0 - 0.02, "whoosh", 0.55))
            events.append(("tl", t0 + it["nf"] / FPS - 0.35, "whoosh", 0.4))
            tt = synth.tick_train(it["nf"] / FPS, rate=8 + it["speed"])
            s0 = int(t0 * SR)
            sfx_t[s0:s0 + len(tt)] += tt[: max(0, total - s0)] * 0.45
    events.append(("tl", 0.10, "boom", 0.8))          # хук
    events.append(("tl", 0.55, "pop", 0.6))
    ctaf = ITEMS[-1]["f0"] / FPS
    events.append(("tl", ctaf + 0.15, "whoosh", 0.6))
    events.append(("tl", ctaf + 0.5, "ding", 0.7))
    v2first = next(it for it in ITEMS if it["kind"] != "hold" and it["src"] == "v2")
    events.append(("tl", v2first["f0"] / FPS - 0.05, "whoosh", 0.8))
    for src, t, name, g in events:
        tl_t = t if src == "tl" else src2tl(src, t)
        if tl_t is None:
            print("WARN sfx вне таймлайна:", src, t, name)
            continue
        snd = bank[name]
        s0 = int(max(0, tl_t) * SR)
        sfx_t[s0:s0 + len(snd)] += snd[: max(0, total - s0)] * g
    # музыка + дакинг
    mus = synth.music(total / SR + 1)[:total]
    env = np.abs(voice)
    env = uniform_filter1d(env, int(0.06 * SR))
    env = maximum_filter1d(env, int(0.25 * SR))
    env = uniform_filter1d(env, int(0.12 * SR))
    duck = 1.0 - 0.80 * np.clip(env / 0.05, 0, 1)
    bb, aa = sps.butter(1, 3.0 / (SR / 2), "low")
    duck = sps.lfilter(bb, aa, duck)
    ffs = uniform_filter1d(ffmask, int(0.2 * SR))
    gain = (0.30 + 0.30 * ffs) * np.clip(duck, 0.15, 1.0)
    # лёгкий fade in/out музыки
    fin, fout = int(0.5 * SR), int(1.8 * SR)
    gain[:fin] *= np.linspace(0, 1, fin)
    gain[-fout:] *= np.linspace(1, 0, fout)
    mix = voice * 1.0 + sfx_t * 0.75 + mus * gain
    mix = np.tanh(mix * 0.95) / 0.95
    return mix.astype(np.float32), voice


# ============================================================ РЕНДЕР
class Renderer:
    def __init__(self, total_frames):
        self.total = total_frames
        self.cards = build_captions()
        self.winframe, self.winpad = lib.window_frame(VW, VH)
        self.mask = lib.rounded_mask(VW, VH, 44)[..., None]
        self.spr = {}
        self.ev = []
        for e in EV:
            t = src2tl(e["src"], e["t"])
            if t is None:
                print("WARN событие вне таймлайна:", e["kind"], e["src"], e["t"])
                continue
            e = dict(e)
            e["tl"] = t
            self.ev.append(e)
        self.ev.sort(key=lambda e: e["tl"])
        first_v2 = next(it for it in ITEMS if it["kind"] != "hold" and it["src"] == "v2")
        self.t_v2 = first_v2["f0"] / FPS
        self.cta_t = ITEMS[-1]["f0"] / FPS
        self.last_fg = None
        # хук
        self.hook = text_sprite(["СОБИРАЕМ", [("ШРЕКА", GREEN)]], size=136, font="russo", sw=12, shadow=6, line_gap=1.05)
        self.hook_pill = pill_sprite("без мата не обошлось {1f92c}", size=46)
        self.ff_pills = {}
        self.item_spr = {}

    def get(self, key, fn):
        if key not in self.spr:
            self.spr[key] = fn()
        return self.spr[key]

    POS = {"tr": (880, VY - 95), "tl": (200, VY - 95), "r": (925, VY + VH / 2), "l": (155, VY + VH / 2),
           "c": (540, VY + VH / 2), "top": (540, 395)}

    def render(self, fi, fg, it, k_local):
        t = fi / FPS
        # ---------- зум окна
        idx = ITEMS.index(it) if "idx" not in it else it["idx"]
        base = 1.0 + 0.045 * (k_local / max(1, it["nf"]))
        fx, fy = 0.5, 0.5
        if it["kind"] == "talk" and idx % 2 == 1:
            base += 0.07
        z = base
        shake_dx = shake_dy = 0.0
        shake_rot = 0.0
        flash_a, flash_c = 0.0, (255, 255, 255)
        for e in self.ev:
            if e["tl"] > t + 0.01:
                break
            u = t - e["tl"]
            if e["kind"] == "punch" and 0 <= u <= e["dur"]:
                k = min(1.0, u / 0.10)
                decay = 1.0 if u < 0.1 else max(0.0, 1 - (u - 0.1) / max(0.01, e["dur"] - 0.1)) ** 0.7
                zz = 1 + (e["z"] - 1) * lib.ease_out_cubic(k) * decay
                if zz > z:
                    z, fx, fy = zz, e["fx"], e["fy"]
            elif e["kind"] == "shake" and 0 <= u <= e["dur"]:
                amp = e["amp"] * (1 - u / e["dur"]) ** 1.5
                shake_dx += amp * math.sin(u * 95)
                shake_dy += amp * 0.7 * math.cos(u * 83)
                shake_rot += 0.5 * amp / 20 * math.sin(u * 70)
            elif e["kind"] == "flash" and 0 <= u <= e["dur"]:
                flash_a = max(flash_a, 0.85 * (1 - u / e["dur"]))
                flash_c = e["color"]
        fgg = lib.grade(fg)
        fgz = lib.zoom_crop(fgg, z, fx, fy)
        # ---------- фон
        pulse = 0.0
        bg = lib.make_bg(fgz, t, pulse) * lib.vignette()
        canvas = np.clip(bg, 0, 255).astype(np.uint8)
        # ---------- окно
        blit(canvas, self.winframe, VX + VW / 2, VY + VH / 2)
        roi = canvas[VY:VY + VH, VX:VX + VW].astype(np.float32)
        canvas[VY:VY + VH, VX:VX + VW] = (fgz.astype(np.float32) * self.mask + roi * (1 - self.mask)).astype(np.uint8)
        if it["kind"] == "ff":
            lib.speed_lines(canvas, t, 0.9)
        # ---------- хук (первые ~3.3 с)
        if t < 3.4:
            u = t
            sc, rot, dx, dy, a = anim("drop", u, 3.3)
            blit(canvas, self.hook, 540 + dx, 390 + dy, sc, rot, 1.0)
            if u > 0.5:
                sc2, rot2, _, _, _ = anim("pop", u - 0.5, 2.8)
                blit(canvas, self.hook_pill, 540, 565, sc2, rot2 * 0.4)
        # ---------- мост V1 -> V2
        if self.t_v2 - 0.05 <= t < self.t_v2 + 1.5:
            u = t - self.t_v2
            sp = self.get("bridge", lambda: pill_sprite("{1f4e6} ОТКРЫВАЕМ БОКСЫ", size=58, bg=(255, 224, 51)))
            sc, rot, dx, dy, a = anim("slide_top", max(0, u), 1.5)
            blit(canvas, sp, 540 + dx, 400 + dy, 1.0, rot, a)
            flash_a = max(flash_a, 0.9 * max(0, 1 - (t - (self.t_v2 - 0.05)) / 0.20))
        # ---------- события (стикеры, мемы, вставки)
        for e in self.ev:
            if e["tl"] > t + 0.01:
                break
            u = t - e["tl"]
            if u < 0 or u > e["dur"]:
                continue
            kd = e["kind"]
            if kd == "sticker":
                spr = self.get(("em", e["code"]), lambda c=e["code"]: emoji_sprite(c, 256))
                sc, rot, dx, dy, a = anim(e["an"], u, e["dur"])
                px, py = self.POS[e["pos"]]
                k = e["size"] / 256.0
                blit(canvas, spr, px + dx + e["dx"], py + dy + e["dy"], sc * k, rot + e["rot"], a)
            elif kd == "meme":
                spr = self.get(("meme", e["text"]), lambda e=e: meme_card(e["text"], size=e["size"]))
                sc, rot, dx, dy, a = anim("slide_top", u, e["dur"])
                blit(canvas, spr, 540 + dx, e["y"] + dy, 1.0, rot, a)
            elif kd == "insert":
                sc, rot, dx, dy, a = anim("zoom", u, e["dur"])
                dimk = e["dim"] * min(1.0, u / 0.08) * (a if u > e["dur"] - 0.12 else 1.0)
                canvas[:] = (canvas.astype(np.float32) * (1 - dimk)).astype(np.uint8)
                spr = self.get(("em", e["code"]), lambda c=e["code"]: emoji_sprite(c, 256))
                blit(canvas, spr, 540, 900, sc * 2.55, 6 * math.sin(u * 14) * (1 - u / e["dur"]), a)
                if e["text"]:
                    ts = self.get(("ins", e["text"], e["tcolor"]),
                                  lambda e=e: text_sprite([[(e["text"], e["tcolor"])]], size=118, font="russo", sw=12, shadow=6))
                    blit(canvas, ts, 540, 1290, sc * min(1.0, 980.0 / ts.shape[1]), 0, a)
            elif kd == "censor":
                bar = self.get("censor", lambda: pill_sprite("{1f6ab} ЦЕНЗУРА", size=50, bg=(230, 40, 40), fg=(255, 255, 255)))
                sc, rot, dx, dy, a = anim("pop", u, e["dur"])
                blit(canvas, bar, 540, VY + VH - 55, sc, rot * 0.5, a)
            elif kd == "confetti":
                rs = np.random.RandomState(5)
                n = 90
                x0 = rs.uniform(0, W, n)
                y0 = rs.uniform(-900, -50, n)
                vy = rs.uniform(500, 900, n)
                vx = rs.uniform(-120, 120, n)
                cols = [(0, 200, 255), (60, 255, 120), (255, 80, 200), (255, 220, 60), (90, 140, 255)]
                for i in range(n):
                    yy = y0[i] + (vy[i] * (u + 0.9)) - 0
                    xx = x0[i] + vx[i] * u + 40 * math.sin(u * 4 + i)
                    if -20 < yy < H + 20:
                        cv2.rectangle(canvas, (int(xx), int(yy)), (int(xx) + 14, int(yy) + 22), cols[i % 5], -1)
        # ---------- ff-плашки
        if it["kind"] == "ff":
            lab = self.get(("ff", it["label"]), lambda: pill_sprite(it["label"], size=54, bg=(255, 224, 51)))
            pulse_s = 1.0 + 0.06 * math.sin(t * 14)
            blit(canvas, lab, 215, VY - 52, pulse_s)
            if it.get("meme"):
                spr = self.get(("meme", it["meme"]), lambda: meme_card(it["meme"], size=48, max_w=960))
                u = (k_local / FPS)
                sc, rot, dx, dy, a = anim("slide_top", u, it["nf"] / FPS)
                blit(canvas, spr, 540 + dx, 395 + dy, 1.0, rot, a)
        # ---------- субтитры
        ins_on = any(e["kind"] == "insert" and e["tl"] <= t < e["tl"] + e["dur"] for e in self.ev)
        if it["kind"] == "talk" and not ins_on:
            for c in self.cards:
                if c["on"] <= t < c["off"]:
                    ai = 0
                    for j, w in enumerate(c["words"]):
                        if w[1] <= t:
                            ai = j
                    spr = caption_sprite(c, ai)
                    u = t - c["on"]
                    sc = 0.86 + 0.14 * lib.ease_out_back(u / 0.14, 2.2) if u < 0.14 else 1.0
                    k = min(1.0, 1000.0 / spr.shape[1])
                    blit(canvas, spr, 540, CAP_Y, sc * k)
                    break
        # ---------- CTA в конце
        if t >= self.cta_t:
            u = t - self.cta_t
            q = self.get("cta_q", lambda: meme_card("Кого бы выбрал ты? {1f431} или {1facf}", size=52, max_w=980))
            sc, rot, dx, dy, a = anim("slide_top", u, 99)
            blit(canvas, q, 540 + dx, 395 + dy, 1.0, rot, a)
            if u > 0.5:
                p1 = self.get("cta_p1", lambda: pill_sprite("Пиши в комментах {1f447}", size=54, bg=(124, 255, 74)))
                s1, r1, _, _, _ = anim("pop", u - 0.5, 99)
                blit(canvas, p1, 540, CAP_Y - 30, s1, r1)
            if u > 1.0:
                p2 = self.get("cta_p2", lambda: pill_sprite("Подпишись — дальше будет жарче {1f525}", size=44, bg=(255, 224, 51)))
                s2, r2, _, _, _ = anim("pop", u - 1.0, 99)
                blit(canvas, p2, 540, CAP_Y + 140, s2, r2)
        # ---------- эффекты кадра
        if flash_a > 0.01:
            c = np.array(flash_c[::-1], np.float32)
            canvas[:] = np.clip(canvas * (1 - flash_a) + c * flash_a, 0, 255).astype(np.uint8)
        canvas = lib.shake_canvas(canvas, shake_dx, shake_dy, shake_rot)
        return canvas


def decoder(it):
    vf = f"setpts=PTS/{it['speed']},fps={FPS},scale={VW}:{VH}:flags=lanczos"
    cmd = ["ffmpeg", "-v", "error", "-ss", f"{it['t0']:.3f}", "-t", f"{it['t1'] - it['t0']:.3f}", "-i", SRC[it["src"]],
           "-vf", vf, "-pix_fmt", "bgr24", "-f", "rawvideo", "-"]
    return subprocess.Popen(cmd, stdout=subprocess.PIPE, bufsize=VW * VH * 3 * 4)


def main():
    out = sys.argv[1]
    preview = "--preview" in sys.argv
    total = build_timeline()
    print(f"кадров: {total}, длительность: {total / FPS:.1f} c")
    mix, voice = build_audio(total)
    if "--dry" in sys.argv:
        r = Renderer(total)
        print("карточек субтитров:", len(r.cards), "событий:", len(r.ev))
        for it in ITEMS:
            print(f"{it['kind']:5s} {it.get('src','')} {it.get('t0',0):7.2f}-{it.get('t1',0):7.2f} x{it['speed']:<4} -> {it['f0']/FPS:6.2f}s +{it['nf']/FPS:.2f}")
        return
    wav = out + ".wav"
    wavfile.write(wav, SR, np.stack([mix, mix], 1))
    # SRT
    r = Renderer(total)
    with open(os.path.splitext(out)[0] + ".srt", "w", encoding="utf-8") as fsrt:
        def ts(x):
            h, rem = divmod(x, 3600)
            m, s = divmod(rem, 60)
            return f"{int(h):02d}:{int(m):02d}:{int(s):02d},{int((s % 1) * 1000):03d}"
        for i, c in enumerate(r.cards, 1):
            txt = " ".join(w[0] for w in c["words"]).replace("{1f92c}", "[цензура]")
            fsrt.write(f"{i}\n{ts(max(0, c['on']))} --> {ts(c['off'])}\n{txt}\n\n")
    enc = subprocess.Popen(
        ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "-",
         "-i", wav, "-map", "0:v", "-map", "1:a",
         "-c:v", "libx264", "-preset", "veryfast" if preview else "medium", "-crf", "26" if preview else "21",
         "-maxrate", "8M", "-bufsize", "16M", "-pix_fmt", "yuv420p", "-movflags", "+faststart",
         "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", out],
        stdin=subprocess.PIPE)
    t0 = time.time()
    fi = 0
    only = None
    if "--only" in sys.argv:
        j = sys.argv.index("--only")
        only = (int(sys.argv[j + 1]), int(sys.argv[j + 2]))
    for idx, it in enumerate(ITEMS):
        it["idx"] = idx
        dec = None
        if only is not None and (it["f0"] + it["nf"] <= only[0] or it["f0"] >= only[1]):
            fi += it["nf"]
            continue
        if it["kind"] != "hold":
            dec = decoder(it)
        for k in range(it["nf"]):
            if dec is not None:
                buf = dec.stdout.read(VW * VH * 3)
                if len(buf) == VW * VH * 3:
                    fg = np.frombuffer(buf, np.uint8).reshape(VH, VW, 3)
                    r.last_fg = fg
                else:
                    fg = r.last_fg
            else:
                fg = r.last_fg
            if only is None or only[0] <= fi < only[1]:
                frame = r.render(fi, fg, it, k)
                enc.stdin.write(frame.tobytes())
            fi += 1
            if fi % 150 == 0:
                print(f"  {fi}/{total}  {time.time() - t0:.0f}s", flush=True)
        if dec is not None:
            dec.stdout.close()
            dec.wait()
    enc.stdin.close()
    enc.wait()
    os.remove(wav)
    print("готово:", out, f"{time.time() - t0:.0f}s")


if __name__ == "__main__":
    main()
