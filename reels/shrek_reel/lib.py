"""Графические примитивы для вертикального рилса 1080x1920: спрайты, текст с эмодзи, анимации, эффекты."""
import io, math, os, re
import numpy as np
import cv2
from PIL import Image, ImageDraw, ImageFont
import cairosvg
from fontTools.ttLib import TTFont

HERE = os.path.dirname(os.path.abspath(__file__))
EMOJI_DIR = os.path.join(HERE, "..", "assets", "node_modules", "@twemoji", "svg")
FONT_DIR = os.path.join(HERE, "fonts")
W, H = 1080, 1920

# ------------------------------------------------------------------ шрифты
_FONT_FILES = {"mont": "montserrat", "rubik": "rubik", "russo": "russo-one"}
_cmaps, _fcache = {}, {}


def _cmap(path):
    if path not in _cmaps:
        _cmaps[path] = set(TTFont(path).getBestCmap().keys())
    return _cmaps[path]


def _font_for(name, ch, size):
    base = _FONT_FILES[name]
    lat = os.path.join(FONT_DIR, f"{base}-latin.ttf")
    cyr = os.path.join(FONT_DIR, f"{base}-cyrillic.ttf")
    path = lat if (ord(ch) in _cmap(lat)) else cyr
    key = (path, size)
    if key not in _fcache:
        _fcache[key] = ImageFont.truetype(path, size)
    return _fcache[key]


# ------------------------------------------------------------------ эмодзи
_emoji_cache = {}


def emoji_img(code, px=256):
    key = (code, px)
    if key not in _emoji_cache:
        p = os.path.join(EMOJI_DIR, f"{code}.svg")
        if not os.path.exists(p):
            raise FileNotFoundError(p)
        png = cairosvg.svg2png(url=p, output_width=px, output_height=px)
        _emoji_cache[key] = np.array(Image.open(io.BytesIO(png)).convert("RGBA"))
    return _emoji_cache[key]


# ------------------------------------------------------------------ спрайты (premultiplied float32)
def premult(rgba_u8):
    a = rgba_u8[..., 3:4].astype(np.float32) / 255.0
    out = np.empty(rgba_u8.shape, np.float32)
    out[..., :3] = rgba_u8[..., :3].astype(np.float32) * a
    out[..., 3:] = a
    return out


def emoji_sprite(code, px=256):
    return premult(emoji_img(code, px))


_TOK = re.compile(r"\{([0-9a-f\-]+)\}")


def _tokens(text, fill):
    """text -> [(kind, val, fill)]; поддерживает {1f92c} и [[цвет|слово]] не нужен: цвет задаётся списком."""
    out = []
    for i, part in enumerate(_TOK.split(text)):
        if i % 2 == 1:
            out.append(("e", part, fill))
        elif part:
            out.append(("t", part, fill))
    return out


def _tok_width(tok, name, size):
    kind, val, _ = tok
    if kind == "e":
        return int(size * 1.05)
    return sum(_font_for(name, ch, size).getlength(ch) for ch in val)


def text_sprite(lines, size=90, font="mont", fill=(255, 255, 255), stroke=(0, 0, 0), sw=None,
                shadow=4, line_gap=1.12, pad=26, bg=None, radius=0, upper=False, tracking=0.0):
    """lines: list[str | list[(text, fill)]] — каждая строка либо строка, либо список раскрашенных слов.
    Эмодзи вставляются как {1f92c}. Возвращает premult float32 спрайт."""
    if isinstance(lines, str):
        lines = [lines]
    sw = sw if sw is not None else max(2, int(size * 0.10))
    prepared = []
    for ln in lines:
        parts = [(ln, fill)] if isinstance(ln, str) else ln
        toks = []
        for txt, f in parts:
            toks += _tokens(txt.upper() if upper else txt, f)
        widths = [_tok_width(t, font, size) + tracking * size * len(t[1]) for t in toks]
        prepared.append((toks, widths))
    line_h = int(size * line_gap)
    tw = max(sum(w) for _, w in prepared) if prepared else 10
    iw = int(tw + 2 * pad + 2 * sw)
    ih = int(line_h * len(prepared) + 2 * pad + 2 * sw + shadow)
    layer_fill = Image.new("RGBA", (iw, ih), (0, 0, 0, 0))
    layer_stroke = Image.new("RGBA", (iw, ih), (0, 0, 0, 0))
    df, ds = ImageDraw.Draw(layer_fill), ImageDraw.Draw(layer_stroke)
    for li, (toks, widths) in enumerate(prepared):
        x = (iw - sum(widths)) / 2
        y = pad + sw + li * line_h
        for tok, wd in zip(toks, widths):
            kind, val, f = tok
            if kind == "e":
                es = int(size * 1.0)
                ei = Image.fromarray(emoji_img(val, 128)).resize((es, es), Image.LANCZOS)
                layer_fill.alpha_composite(ei, (int(x + size * 0.025), int(y + size * 0.06)))
                x += wd
            else:
                for ch in val:
                    fnt = _font_for(font, ch, size)
                    ds.text((x, y), ch, font=fnt, fill=stroke + (255,), stroke_width=sw, stroke_fill=stroke + (255,))
                    df.text((x, y), ch, font=fnt, fill=f + (255,))
                    x += fnt.getlength(ch) + tracking * size
    out = Image.new("RGBA", (iw, ih), (0, 0, 0, 0))
    if bg is not None:
        d = ImageDraw.Draw(out)
        d.rounded_rectangle((0, 0, iw - 1, ih - shadow - 1), radius=radius, fill=bg)
    if shadow and bg is None:
        sh = Image.new("RGBA", (iw, ih), (0, 0, 0, 0))
        sh.alpha_composite(layer_stroke, (0, shadow))
        a = np.array(sh)
        a[..., :3] = 0
        a[..., 3] = (a[..., 3] * 0.55).astype(np.uint8)
        a = cv2.GaussianBlur(a, (0, 0), 3)
        out.alpha_composite(Image.fromarray(a))
    if bg is None:
        out.alpha_composite(layer_stroke)
    out.alpha_composite(layer_fill)
    return premult(np.array(out))


def pill_sprite(text, size=54, font="mont", fg=(20, 20, 20), bg=(255, 224, 51), padx=34, pady=16, radius=None, border=None):
    """Плашка-таблетка с текстом/эмодзи."""
    toks = _tokens(text, fg)
    widths = [_tok_width(t, font, size) for t in toks]
    iw, ih = int(sum(widths) + 2 * padx), int(size * 1.15 + 2 * pady)
    radius = radius if radius is not None else ih // 2
    sc = 2
    img = Image.new("RGBA", (iw * sc, ih * sc), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((0, 0, iw * sc - 1, ih * sc - 1), radius=radius * sc, fill=bg + (255,),
                        outline=(border + (255,)) if border else None, width=6 if border else 0)
    img = img.resize((iw, ih), Image.LANCZOS)
    d = ImageDraw.Draw(img)
    x = padx
    for tok, wd in zip(toks, widths):
        kind, val, f = tok
        if kind == "e":
            es = int(size * 1.0)
            ei = Image.fromarray(emoji_img(val, 128)).resize((es, es), Image.LANCZOS)
            img.alpha_composite(ei, (int(x), int(pady + size * 0.08)))
            x += wd
        else:
            for ch in val:
                fnt = _font_for(font, ch, size)
                d.text((x, pady + size * 0.04), ch, font=fnt, fill=f + (255,))
                x += fnt.getlength(ch)
    return premult(np.array(img))


def wrap_words(text, size, font, max_w):
    """Перенос по ширине (для мем-карточек)."""
    words, lines, cur = text.split(" "), [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if _tok_width(("t", re.sub(_TOK, "OO", test), None), font, size) <= max_w or not cur:
            cur = test
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    return lines


def meme_card(text, size=50, max_w=880, bg=(255, 255, 255), fg=(18, 18, 18), font="mont"):
    """Мем-плашка «как в твиттере/9gag»: белая карточка с чёрным жирным текстом."""
    lines = wrap_words(text, size, font, max_w)
    inner = text_sprite(lines, size=size, font=font, fill=fg, stroke=bg, sw=1, shadow=0, pad=0, line_gap=1.2)
    ih_, iw_ = inner.shape[:2]
    padx, pady = 44, 30
    w, h = iw_ + 2 * padx, ih_ + 2 * pady
    sc = 2
    card = Image.new("RGBA", (w * sc + 40, h * sc + 40), (0, 0, 0, 0))
    d = ImageDraw.Draw(card)
    # тень
    d.rounded_rectangle((20, 34, w * sc + 20, h * sc + 34), radius=34 * sc // 2, fill=(0, 0, 0, 140))
    card = Image.fromarray(cv2.GaussianBlur(np.array(card), (0, 0), 8))
    d = ImageDraw.Draw(card)
    d.rounded_rectangle((10, 10, w * sc + 10, h * sc + 10), radius=34 * sc // 2, fill=bg + (255,))
    card = card.resize(((w * sc + 40) // sc, (h * sc + 40) // sc), Image.LANCZOS)
    arr = premult(np.array(card))
    # вставляем текст
    ty = (arr.shape[0] - ih_) // 2
    tx = (arr.shape[1] - iw_) // 2
    region = arr[ty:ty + ih_, tx:tx + iw_]
    region[:] = inner + region * (1 - inner[..., 3:4])
    return arr


# ------------------------------------------------------------------ blit
def blit(canvas, spr, cx, cy, scale=1.0, rot=0.0, alpha=1.0):
    """canvas: uint8 BGR (H,W,3). spr: premult float32 RGBA (RGB порядок). Центр спрайта в (cx,cy)."""
    if alpha <= 0.003 or scale <= 0.003:
        return
    h, w = spr.shape[:2]
    if abs(rot) > 0.01:
        r = math.radians(rot)
        ow = int(math.ceil(w * scale * abs(math.cos(r)) + h * scale * abs(math.sin(r)))) + 2
        oh = int(math.ceil(w * scale * abs(math.sin(r)) + h * scale * abs(math.cos(r)))) + 2
        M = cv2.getRotationMatrix2D((w / 2, h / 2), rot, scale)
        M[0, 2] += ow / 2 - w / 2
        M[1, 2] += oh / 2 - h / 2
        s = cv2.warpAffine(spr, M, (ow, oh), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT)
    elif abs(scale - 1.0) > 0.003:
        ow, oh = max(1, int(round(w * scale))), max(1, int(round(h * scale)))
        s = cv2.resize(spr, (ow, oh), interpolation=cv2.INTER_AREA if scale < 1 else cv2.INTER_LINEAR)
    else:
        s = spr
        oh, ow = h, w
    x0, y0 = int(round(cx - ow / 2)), int(round(cy - oh / 2))
    x1, y1 = x0 + ow, y0 + oh
    cx0, cy0, cx1, cy1 = max(0, x0), max(0, y0), min(W, x1), min(H, y1)
    if cx1 <= cx0 or cy1 <= cy0:
        return
    s = s[cy0 - y0:cy1 - y0, cx0 - x0:cx1 - x0]
    a = s[..., 3:4] * alpha
    dst = canvas[cy0:cy1, cx0:cx1].astype(np.float32)
    rgb = s[..., 2::-1] * alpha  # RGB -> BGR
    canvas[cy0:cy1, cx0:cx1] = np.clip(rgb + dst * (1 - a), 0, 255).astype(np.uint8)


# ------------------------------------------------------------------ анимации
def ease_out_back(x, s=1.9):
    x = min(max(x, 0.0), 1.0)
    return 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2


def ease_out_cubic(x):
    x = min(max(x, 0.0), 1.0)
    return 1 - (1 - x) ** 3


def anim(kind, u, dur):
    """Возвращает (scale, rot, dx, dy, alpha) для локального времени u в [0,dur]."""
    tin, tout = 0.20, 0.16
    if kind == "pop":
        sc = ease_out_back(u / tin) if u < tin else 1.0 + 0.025 * math.sin((u - tin) * 9)
        if u > dur - tout:
            sc *= max(0.0, (dur - u) / tout)
        return sc, 3.5 * math.sin(u * 7) * (1 if u > tin else 0.0), 0, 0, 1.0
    if kind == "drop":
        if u < 0.30:
            k = u / 0.30
            y = -700 * (1 - k) ** 2 if k < 1 else 0
            return 1.0, -10 * (1 - k), 0, y, 1.0
        bounce = 28 * math.exp(-(u - 0.30) * 9) * abs(math.sin((u - 0.30) * 18))
        sc = 1.0
        if u > dur - tout:
            sc = max(0.0, (dur - u) / tout)
        return sc, 2 * math.sin(u * 5), 0, -bounce, 1.0
    if kind == "spin":
        sc = ease_out_back(u / 0.30)
        rot = (1 - ease_out_cubic(u / 0.30)) * 360 * 1.0
        if u > dur - tout:
            sc *= max(0.0, (dur - u) / tout)
        return sc, rot, 0, 0, 1.0
    if kind == "slide_top":  # карточка сверху
        k = ease_out_back(u / 0.28, 1.4)
        y = -260 * (1 - k)
        a = 1.0
        if u > dur - 0.18:
            a = max(0.0, (dur - u) / 0.18)
            y = -80 * (1 - a)
        return 1.0, 0.8 * math.sin(u * 3), 0, y, a
    if kind == "slide_left":
        k = ease_out_cubic(u / 0.25)
        x = -900 * (1 - k)
        a = 1.0
        if u > dur - 0.2:
            a = max(0.0, (dur - u) / 0.2)
        return 1.0, 0, x, 0, a
    if kind == "fly":  # улетает вправо-вверх
        k = u / dur
        return 0.8 + 0.6 * k, 25 * k, 1100 * k ** 1.6 - 250, -520 * k ** 1.4, 1.0
    if kind == "zoom":  # гигантская вставка
        k = ease_out_back(u / 0.16, 1.2)
        sc = k * (1 + 0.06 * (u / dur))
        a = 1.0
        if u > dur - 0.12:
            a = max(0.0, (dur - u) / 0.12)
        return sc, 0, 0, 0, a
    return 1.0, 0, 0, 0, 1.0


# ------------------------------------------------------------------ фон и окно
def make_bg(frame_bgr, t, pulse=0.0):
    """Размытый «ambilight» фон из самого видео + тёмный градиент."""
    h, w = frame_bgr.shape[:2]
    cw = int(h * 9 / 16 * 1.9)
    x0 = (w - cw) // 2
    crop = frame_bgr[:, x0:x0 + cw]
    small = cv2.resize(crop, (108, 192), interpolation=cv2.INTER_AREA)
    small = cv2.GaussianBlur(small, (0, 0), 6)
    bg = cv2.resize(small, (W, H), interpolation=cv2.INTER_CUBIC).astype(np.float32)
    bg *= 0.42 + 0.10 * pulse
    gy = np.linspace(0.75, 1.0, H, dtype=np.float32)[:, None, None]
    bg *= gy
    bg += _glow()
    return bg


_vign = None
_glow_arr = None


def _glow():
    global _glow_arr
    if _glow_arr is None:
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        d = np.sqrt(((xx - W / 2) / 760.0) ** 2 + ((yy - 890) / 700.0) ** 2)
        g = np.exp(-d ** 2 * 2.2)[..., None]
        _glow_arr = g * np.array([18, 52, 22], np.float32)  # BGR, зелёный отсвет
    return _glow_arr


def vignette():
    global _vign
    if _vign is None:
        yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
        d = np.sqrt(((xx - W / 2) / (W / 2)) ** 2 + ((yy - H / 2) / (H / 2)) ** 2)
        _vign = (1.0 - 0.35 * np.clip(d - 0.55, 0, 1) ** 1.5)[..., None].astype(np.float32)
    return _vign


def rounded_mask(w, h, r, scale=3):
    m = Image.new("L", (w * scale, h * scale), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, w * scale - 1, h * scale - 1), radius=r * scale, fill=255)
    return np.array(m.resize((w, h), Image.LANCZOS)).astype(np.float32) / 255.0


def window_frame(w, h, r=44, border=8, glow=(92, 220, 90)):
    """Спрайт обводки+тени вокруг видео-окна (внутри — прозрачная дырка не нужна: видео кладётся поверх)."""
    pad = 60
    iw, ih = w + 2 * pad, h + 2 * pad
    img = Image.new("RGBA", (iw, ih), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((pad - 10, pad + 12, pad + w + 10, pad + h + 26), radius=r + 10, fill=(0, 0, 0, 170))
    a = cv2.GaussianBlur(np.array(img), (0, 0), 16)
    img = Image.fromarray(a)
    g = Image.new("RGBA", (iw, ih), (0, 0, 0, 0))
    ImageDraw.Draw(g).rounded_rectangle((pad - border - 6, pad - border - 6, pad + w + border + 6, pad + h + border + 6),
                                        radius=r + border + 6, fill=glow + (90,))
    g = Image.fromarray(cv2.GaussianBlur(np.array(g), (0, 0), 10))
    img.alpha_composite(g)
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((pad - border, pad - border, pad + w + border, pad + h + border), radius=r + border,
                        fill=(250, 250, 245, 255))
    return premult(np.array(img)), pad


def grade(frame):
    """Лёгкий «ютуб»-грейд: насыщенность и контраст."""
    g = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
    g3 = cv2.merge([g, g, g])
    out = cv2.addWeighted(frame, 1.22, g3, -0.22, 0)
    return cv2.convertScaleAbs(out, alpha=1.07, beta=-7)


def zoom_crop(frame, z, fx=0.5, fy=0.5):
    if z <= 1.001:
        return frame
    h, w = frame.shape[:2]
    cw, ch = w / z, h / z
    x0 = min(max(fx * w - cw / 2, 0), w - cw)
    y0 = min(max(fy * h - ch / 2, 0), h - ch)
    M = np.float32([[z, 0, -x0 * z], [0, z, -y0 * z]])
    return cv2.warpAffine(frame, M, (w, h), flags=cv2.INTER_LINEAR)


def shake_canvas(canvas, dx, dy, rot=0.0):
    if abs(dx) < 0.3 and abs(dy) < 0.3 and abs(rot) < 0.01:
        return canvas
    M = cv2.getRotationMatrix2D((W / 2, H / 2), rot, 1.0)
    M[0, 2] += dx
    M[1, 2] += dy
    return cv2.warpAffine(canvas, M, (W, H), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REFLECT)


def rgb_split(img, px):
    px = int(px)
    if px <= 0:
        return img
    out = img.copy()
    out[:, px:, 2] = img[:, :-px, 2]
    out[:, :-px, 0] = img[:, px:, 0]
    return out


def speed_lines(canvas, t, strength=0.5):
    ov = np.zeros((H, W), np.uint8)
    rs = np.random.RandomState(int(t * 30) % 7 + 11)
    for _ in range(22):
        y = rs.randint(0, H)
        x = rs.randint(-200, W)
        ln = rs.randint(250, 700)
        cv2.line(ov, (x, y), (x + ln, y - ln // 6), 255, rs.randint(2, 6), cv2.LINE_AA)
    a = (ov.astype(np.float32) / 255.0 * 0.35 * strength)[..., None]
    canvas[:] = np.clip(canvas * (1 - a) + 255 * a, 0, 255).astype(np.uint8)
