"""Build the Qalam IndoPak Quranic prototype.

The centerlines in this file are the editable source. Outlines are stroked
from those centerlines; nothing is imported from a reference font.
"""

from __future__ import annotations

import math
from pathlib import Path

from fontTools.feaLib.builder import addOpenTypeFeaturesFromString
from fontTools.fontBuilder import FontBuilder
from fontTools.pens.cu2quPen import Cu2QuPen
from fontTools.pens.ttGlyphPen import TTGlyphPen

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "build"
UPM = 1000
STROKE = 30
THIN = 24

GlyphRec = tuple  # glyph, advance, lsb, anchors


def _samples(p0, c1, c2, p3, n=18):
    pts = []
    for i in range(n + 1):
        t = i / n
        u = 1 - t
        x = u**3 * p0[0] + 3 * u**2 * t * c1[0] + 3 * u * t**2 * c2[0] + t**3 * p3[0]
        y = u**3 * p0[1] + 3 * u**2 * t * c1[1] + 3 * u * t**2 * c2[1] + t**3 * p3[1]
        pts.append((x, y))
    return pts


def _offset(pts, dist):
    out = []
    last = len(pts) - 1
    for i, (x, y) in enumerate(pts):
        if i == 0:
            dx, dy = pts[1][0] - x, pts[1][1] - y
        elif i == last:
            dx, dy = x - pts[-2][0], y - pts[-2][1]
        else:
            dx, dy = pts[i + 1][0] - pts[i - 1][0], pts[i + 1][1] - pts[i - 1][1]
        length = math.hypot(dx, dy) or 1
        out.append((x + -dy / length * dist, y + dx / length * dist))
    return out


class Draw:
    def __init__(self, advance: float):
        self.out = TTGlyphPen(None)
        self.pen = Cu2QuPen(self.out, 0.6)
        self.advance = advance
        self.anchors: dict[str, tuple[float, float]] = {}

    def anchor(self, name: str, x: float, y: float) -> None:
        self.anchors[name] = (round(x), round(y))

    def contour(self, pts) -> None:
        self.pen.moveTo(pts[0])
        for pt in pts[1:]:
            self.pen.lineTo(pt)
        self.pen.closePath()

    def stroke(self, pts, width: float) -> None:
        if len(pts) < 2:
            return
        left = _offset(pts, width / 2)
        right = _offset(pts, -width / 2)
        self.contour(left + list(reversed(right)))

    def curve(self, p0, c1, c2, p3, width: float) -> None:
        self.stroke(_samples(p0, c1, c2, p3), width)

    def oval(self, cx, cy, rx, ry) -> None:
        k = 0.5523
        p = self.pen
        p.moveTo((cx + rx, cy))
        p.curveTo((cx + rx, cy + ry * k), (cx + rx * k, cy + ry), (cx, cy + ry))
        p.curveTo((cx - rx * k, cy + ry), (cx - rx, cy + ry * k), (cx - rx, cy))
        p.curveTo((cx - rx, cy - ry * k), (cx - rx * k, cy - ry), (cx, cy - ry))
        p.curveTo((cx + rx * k, cy - ry), (cx + rx, cy - ry * k), (cx + rx, cy))
        p.closePath()

    def ring(self, cx, cy, rx, ry, hole=0.58) -> None:
        self.oval(cx, cy, rx, ry)
        k = 0.5523
        ix, iy = rx * hole, ry * hole
        p = self.pen
        p.moveTo((cx + ix, cy))
        p.curveTo((cx + ix, cy - iy * k), (cx + ix * k, cy - iy), (cx, cy - iy))
        p.curveTo((cx - ix * k, cy - iy), (cx - ix, cy - iy * k), (cx - ix, cy))
        p.curveTo((cx - ix, cy + iy * k), (cx - ix * k, cy + iy), (cx, cy + iy))
        p.curveTo((cx + ix * k, cy + iy), (cx + ix, cy + iy * k), (cx + ix, cy))
        p.closePath()

    def dot(self, cx, cy, rx=16, ry=13) -> None:
        self.oval(cx, cy, rx, ry)

    def finish(self):
        glyph = self.out.glyph()
        xs = [x for x, _y in glyph.coordinates] if glyph.numberOfContours else [0]
        return glyph, int(self.advance), int(min(xs)), dict(self.anchors)


def bar(d: Draw, x0, x1, y=22, width=THIN):
    d.stroke([(x0, y), (x1, y)], width)


def chain(d: Draw, segments, width: float) -> None:
    """Stroke several cubics as one centerline. Each segment is (start, c1, c2, end)."""
    pts = []
    for p0, c1, c2, p3 in segments:
        seg = _samples(p0, c1, c2, p3, 12)
        pts.extend(seg if not pts else seg[1:])
    d.stroke(pts, width)


def entry_bar(d: Draw, length, y=22):
    bar(d, -12, length + 12, y)


def top_at(d: Draw, x, y):
    d.anchor("top", x, y)


def bot_at(d: Draw, x, y):
    d.anchor("bottom", x, y)


# --- skeletons -----------------------------------------------------------

def alef_shape(final=False):
    d = Draw(210 if not final else 250)
    x = 150 if final else 108
    d.stroke([(x, 28), (x - 8, 220), (x - 14, 560)], 26)
    d.stroke([(x - 18, 546), (x + 12, 572)], 14)
    if final:
        bar(d, -12, x, 22)
    top_at(d, x - 8, 400)
    bot_at(d, x, -10)
    return d.finish()


def beh_shape(form):
    length = {"isol": 360, "init": 300, "medi": 240, "fina": 340}[form]
    d = Draw(length)
    bar(d, -20, length + 20, 22)
    if form in ("isol", "fina"):
        d.curve((28, 22), (8, 40), (22, 72), (54, 48), STROKE)
    if form in ("isol", "init"):
        d.curve((length - 16, 22), (length + 6, 48), (length - 16, 78), (length - 52, 36), STROKE)
    d.dot(length * 0.56, -54)
    top_at(d, length * 0.56, 58)
    bot_at(d, length * 0.56, -86)
    return d.finish()


def jeem_shape(form):
    length = {"isol": 460, "init": 340, "medi": 300, "fina": 440}[form]
    d = Draw(length)
    if form in ("medi", "init"):
        entry_bar(d, length) if form == "medi" else d.curve((length - 8, 70), (length - 90, 16), (80, 20), (-8, 22), THIN)
        d.dot(length * 0.5, -58)
        top_at(d, length * 0.5, 70)
        bot_at(d, length * 0.5, -90)
        return d.finish()
    d.curve((length - 16, 86), (length * 0.62, 10), (length * 0.42, -40), (length * 0.28, -150), STROKE)
    d.curve((length * 0.28, -150), (length * 0.16, -230), (70, -120), (108, -28), STROKE)
    d.dot(length * 0.30, -168)
    top_at(d, length * 0.7, 80)
    bot_at(d, length * 0.28, -250)
    return d.finish()


def dal_shape(final=False):
    d = Draw(250 if final else 210)
    x0 = 20
    d.curve((x0, 28), (70, 24), (120, 36), (148, 150), STROKE)
    d.curve((148, 150), (156, 188), (196, 176), (188, 132), 18)
    if final:
        bar(d, 150, 250, 22)
    top_at(d, 120, 168)
    bot_at(d, 80, -12)
    return d.finish()


def reh_shape(final=False):
    d = Draw(200 if final else 170)
    d.curve((150, 36), (120, 10), (78, -40), (96, -168), 26)
    d.curve((96, -168), (104, -198), (132, -176), (124, -140), 16)
    if final:
        bar(d, 140, 210, 22)
    top_at(d, 130, 52)
    bot_at(d, 96, -210)
    return d.finish()


def seen_shape(form):
    """Three teeth as one wave. The bar does not run under the teeth."""
    length = {"isol": 390, "init": 350, "medi": 310, "fina": 380}[form]
    d = Draw(length)
    origin = 78 if form in ("isol", "fina") else 4
    teeth = (
        (72, 86, 0.32, 0.68),
        (76, 138, 0.22, 0.48),
        (70, 104, 0.40, 0.74),
    )
    segments = []
    x = origin
    y = 24
    for w, h, a, b in teeth:
        segments.append(((x, y), (x + w * a, y + h), (x + w * b, y + h * 0.9), (x + w, y)))
        x += w
    wave_end = x
    bar(d, wave_end - 4, length + 18, 22)
    bar(d, -18, origin + 4, 22)
    chain(d, segments, 20)
    if form in ("isol", "fina"):
        chain(d, [((origin, 24), (origin - 22, 16), (origin - 30, -8), (origin - 6, 6))], 16)
    top_at(d, origin + 70, y + 154)
    bot_at(d, origin + 16, -20)
    return d.finish()


def sad_shape(form):
    length = {"isol": 420, "init": 360, "medi": 330, "fina": 410}[form]
    d = Draw(length)
    bar(d, -20, length + 20, 22)
    eye_x = length - 120
    d.ring(eye_x, 96, 70, 74, 0.55)
    if form in ("isol", "fina"):
        d.curve((18, 22), (8, 8), (24, -28), (64, 8), 20)
    top_at(d, eye_x, 186)
    bot_at(d, length * 0.3, -48 if form in ("isol", "fina") else -8)
    return d.finish()


def ain_head(d: Draw, x, y, s=1.0):
    d.curve((x, y), (x + 20 * s, y + 150 * s), (x + 120 * s, y + 160 * s), (x + 150 * s, y + 20), STROKE)
    d.curve((x + 34 * s, y + 18), (x + 48 * s, y + 92 * s), (x + 96 * s, y + 86 * s), (x + 108 * s, y + 16), 16)


def ain_shape(form):
    length = {"isol": 430, "init": 280, "medi": 240, "fina": 420}[form]
    d = Draw(length)
    if form == "init":
        ain_head(d, length - 180, 20, 0.85)
        bar(d, -10, length - 150, 22)
    elif form == "medi":
        ain_head(d, 20, 18, 0.7)
        bar(d, -10, length + 8, 22)
    elif form == "fina":
        ain_head(d, length - 200, 16, 0.8)
        d.curve((length - 170, 24), (160, 10), (70, -50), (86, -160), STROKE)
        d.curve((86, -160), (98, -230), (40, -150), (70, -40), STROKE)
    else:
        d.ring(length - 120, 210, 86, 78, 0.5)
        d.curve((length - 120, 130), (length * 0.4, 20), (90, -40), (100, -170), STROKE)
        d.curve((100, -170), (108, -240), (48, -160), (78, -36), STROKE)
    top_at(d, length * 0.62, 250 if form != "medi" else 160)
    bot_at(d, length * 0.35, -230 if form in ("isol", "fina") else -12)
    return d.finish()


def feh_shape(form):
    length = {"isol": 400, "init": 330, "medi": 280, "fina": 380}[form]
    d = Draw(length)
    eye = length - 90
    d.ring(eye, 126, 52, 48, 0.5)
    d.dot(eye, 210, 20, 17)
    if form == "medi":
        bar(d, -12, eye - 48, 22)
    elif form == "init":
        bar(d, -8, eye - 40, 22)
    elif form == "fina":
        d.curve((eye - 48, 22), (90, 20), (30, 16), (34, 62), THIN)
    else:
        d.curve((eye - 48, 24), (80, 22), (28, 30), (46, 74), THIN)
    top_at(d, eye, 246)
    bot_at(d, length * 0.4, -16)
    return d.finish()


def qaf_shape(form):
    length = {"isol": 430, "init": 340, "medi": 290, "fina": 450}[form]
    d = Draw(length)
    eye = length - 100
    d.ring(eye, 118, 50, 46, 0.5)
    d.dot(eye - 28, 198, 18, 16)
    d.dot(eye + 28, 198, 18, 16)
    if form in ("isol", "fina"):
        d.curve((eye - 46, 24), (length * 0.45, 16), (80, -30), (108, -150), STROKE)
        d.curve((108, -150), (122, -210), (70, -160), (92, -70), STROKE)
        if form == "fina":
            bar(d, eye - 20, length + 8, 22)
    elif form == "medi":
        bar(d, -12, eye - 46, 22)
    else:
        bar(d, -8, eye - 40, 22)
    top_at(d, eye, 236)
    bot_at(d, 108, -220 if form in ("isol", "fina") else -14)
    return d.finish()


def kaf_shape(form):
    """One bowed gesture: the rise bends, then the arm turns left and sags."""
    length = {"isol": 370, "init": 340, "medi": 320, "fina": 380}[form]
    d = Draw(length)
    bar(d, -18, length + 18, 22)
    chain(
        d,
        [
            ((64, 22), (88, 16), (140, 36), (176, 96)),
            ((176, 96), (214, 170), (length - 24, 210), (length - 18, 268)),
            ((length - 18, 268), (length * 0.55, 302), (length * 0.30, 228), (44, 196)),
            ((44, 196), (30, 186), (34, 214), (54, 222)),
        ],
        17,
    )
    top_at(d, length * 0.46, 318)
    bot_at(d, length * 0.4, -8)
    return d.finish()


def lam_shape(form):
    length = {"isol": 250, "init": 220, "medi": 200, "fina": 270}[form]
    d = Draw(length)
    stem = length - 64
    bar(d, -20, length + 20, 22)
    d.stroke([(stem, 22), (stem - 4, 220), (stem - 10, 540)], 24)
    d.stroke([(stem - 16, 526), (stem + 10, 552)], 13)
    top_at(d, stem - 6, 230)
    bot_at(d, length * 0.4, -8)
    return d.finish()


def meem_shape(form):
    length = {"isol": 300, "init": 250, "medi": 220, "fina": 320}[form]
    d = Draw(length)
    bar(d, -20, length + 20, 22)
    cx = length * 0.62
    d.ring(cx, 108, 54, 50, 0.52)
    if form in ("isol", "fina"):
        d.curve((cx - 10, 60), (cx - 30, 8), (60, -16), (78, -120), STROKE)
        d.curve((78, -120), (88, -168), (52, -140), (70, -70), 16)
    top_at(d, cx, 172)
    bot_at(d, 78 if form in ("isol", "fina") else cx, -170 if form in ("isol", "fina") else -8)
    return d.finish()


def noon_shape(form):
    length = {"isol": 380, "init": 300, "medi": 250, "fina": 420}[form]
    d = Draw(length)
    bar(d, -20, length + 20, 22)
    if form in ("isol", "fina"):
        d.curve((length * 0.7, 22), (120, 10), (48, -20), (64, -110), STROKE)
        d.curve((64, -110), (76, -180), (160, -170), (186, -70), STROKE)
        d.dot(length * 0.62, 86)
        bot_at(d, 90, -190)
    else:
        d.dot(length * 0.5, 82)
        bot_at(d, length * 0.5, -8)
    top_at(d, length * 0.6, 116)
    return d.finish()


def heh_shape(form):
    length = {"isol": 260, "init": 210, "medi": 190, "fina": 280}[form]
    d = Draw(length)
    if form in ("medi", "init"):
        bar(d, -20, length + 16, 22)
        cx = length * (0.58 if form == "init" else 0.5)
        chain(
            d,
            [
                ((cx + 28, 28), (cx + 34, 78), (cx + 8, 118), (cx - 8, 112)),
                ((cx - 8, 112), (cx - 36, 100), (cx - 30, 36), (cx + 28, 28)),
            ],
            16,
        )
        top_at(d, cx, 132)
        bot_at(d, cx, -8)
        return d.finish()
    chain(
        d,
        [
            ((length - 24, 30), (length * 0.45, 8), (48, 24), (40, 78)),
            ((40, 78), (34, 150), (length * 0.55, 162), (length - 30, 86)),
        ],
        22,
    )
    if form == "fina":
        bar(d, length - 60, length + 18, 22)
    top_at(d, length * 0.48, 148)
    bot_at(d, length * 0.4, -8)
    return d.finish()


def hehgoal_shape(form):
    length = {"isol": 320, "init": 200, "medi": 180, "fina": 340}[form]
    d = Draw(length)
    if form == "medi":
        bar(d, -20, length + 16, 22)
        cx = length * 0.5
        chain(
            d,
            [
                ((cx + 30, 18), (cx + 36, 48), (cx + 6, 78), (cx - 16, 70)),
                ((cx - 16, 70), (cx - 34, 58), (cx - 18, 16), (cx + 8, 14)),
            ],
            16,
        )
        top_at(d, cx, 96)
        bot_at(d, cx, -8)
        return d.finish()
    if form == "init":
        bar(d, -20, length + 16, 22)
        chain(
            d,
            [
                ((length * 0.72, 22), (length * 0.86, 28), (length * 0.7, 92), (length * 0.42, 78)),
                ((length * 0.42, 78), (length * 0.24, 68), (length * 0.28, 30), (length * 0.48, 22)),
            ],
            18,
        )
        top_at(d, length * 0.55, 108)
        bot_at(d, length * 0.45, -8)
        return d.finish()
    chain(
        d,
        [
            ((length - 14, 26), (length * 0.62, 10), (length * 0.40, -2), (length * 0.20, -16)),
            ((length * 0.20, -16), (52, -6), (24, 34), (28, 102)),
            ((28, 102), (32, 132), (74, 124), (112, 104)),
        ],
        21,
    )
    if form == "fina":
        bar(d, length - 64, length + 16, 22)
    top_at(d, length * 0.42, 140)
    bot_at(d, length * 0.32, -46)
    return d.finish()


def hehdo_shape(form):
    length = {"isol": 300, "init": 270, "medi": 250, "fina": 300}[form]
    d = Draw(length)
    bar(d, -20, length + 20, 22)
    c1, c2 = length * 0.36, length * 0.66
    d.ring(c1, 74, 40, 48, 0.52)
    d.ring(c2, 74, 40, 48, 0.52)
    top_at(d, (c1 + c2) / 2, 136)
    bot_at(d, (c1 + c2) / 2, -8)
    return d.finish()


def yeh_shape(form, dots):
    length = {"isol": 360, "init": 270, "medi": 230, "fina": 390}[form]
    d = Draw(length)
    bar(d, -20, length + 20, 22)
    if form in ("isol", "fina"):
        d.curve((148, 22), (96, 12), (36, -36), (42, -108), 24)
        d.curve((42, -108), (50, -172), (140, -168), (196, -92), 20)
        d.curve((196, -92), (214, -68), (168, -58), (150, -86), 13)
        if dots:
            d.dot(108, -78, 18, 15)
            d.dot(148, -78, 18, 15)
        bot_at(d, 130, -186)
    else:
        if dots:
            d.dot(length * 0.48 - 20, -50, 18, 15)
            d.dot(length * 0.48 + 22, -50, 18, 15)
        bot_at(d, length * 0.5, -78)
    top_at(d, length * 0.55, 52)
    return d.finish()


def bariyeh_shape(final=False):
    d = Draw(420 if final else 380)
    d.curve((360, 40), (260, 10), (120, -20), (50, -110), 28)
    d.curve((50, -110), (8, -190), (120, -250), (240, -150), 26)
    if final:
        bar(d, 300, 430, 22)
    top_at(d, 280, 64)
    bot_at(d, 120, -270)
    return d.finish()


def tehgoal_shape(final=False):
    glyph, adv, lsb, anchors = hehgoal_shape("fina" if final else "isol")
    d = Draw(adv)
    # redraw by borrowing is messy; compose dots onto a fresh hehgoal
    return tehgoal_fresh(final)


def tehgoal_fresh(final=False):
    length = 400 if final else 380
    d = Draw(length)
    d.curve((length - 24, 48), (length * 0.75, -90), (length * 0.28, -120), (46, 20), 34)
    d.curve((46, 20), (28, 150), (120, 250), (210, 150), 28)
    if final:
        bar(d, length - 70, length + 10, 22)
    d.dot(length * 0.42, 230, 18, 16)
    d.dot(length * 0.42 + 46, 230, 18, 16)
    top_at(d, length * 0.5, 268)
    bot_at(d, length * 0.4, -140)
    return d.finish()


def teh_shape(form):
    length = {"isol": 340, "init": 280, "medi": 230, "fina": 320}[form]
    d = Draw(length)
    bar(d, -20, length + 20, 22)
    if form in ("isol", "fina"):
        d.curve((26, 22), (10, 40), (22, 68), (50, 46), 22)
    if form in ("isol", "init"):
        d.curve((length - 18, 22), (length + 4, 44), (length - 18, 72), (length - 48, 34), 22)
    d.dot(length * 0.48, 78, 18, 15)
    d.dot(length * 0.48 + 40, 78, 18, 15)
    top_at(d, length * 0.55, 110)
    bot_at(d, length * 0.5, -8)
    return d.finish()


def hah_shape(form):
    length = {"isol": 400, "init": 300, "medi": 250, "fina": 400}[form]
    d = Draw(length)
    if form in ("medi", "init"):
        bar(d, -20, length + 20, 22)
        top_at(d, length * 0.5, 56)
        bot_at(d, length * 0.5, -8)
        return d.finish()
    d.curve((length - 16, 70), (length * 0.6, 8), (length * 0.36, -36), (length * 0.24, -140), 28)
    d.curve((length * 0.24, -140), (length * 0.12, -210), (64, -100), (96, -16), 26)
    if form == "fina":
        bar(d, length - 70, length + 20, 22)
    top_at(d, length * 0.65, 72)
    bot_at(d, length * 0.28, -220)
    return d.finish()


def thal_shape(final=False):
    glyph = dal_shape(final)
    d_adv = glyph[1]
    d = Draw(d_adv)
    # Dal skeleton is rebuilt so the dot shares the same construction.
    return thal_fresh(final)


def thal_fresh(final=False):
    d = Draw(250 if final else 210)
    d.curve((20, 28), (70, 24), (120, 36), (148, 150), STROKE)
    d.curve((148, 150), (156, 188), (196, 176), (188, 132), 18)
    if final:
        bar(d, 150, 270, 22)
    d.dot(120, 210, 18, 16)
    top_at(d, 120, 240)
    bot_at(d, 80, -12)
    return d.finish()


def dad_shape(form):
    rec = sad_shape(form)
    d = Draw(rec[1])
    # Sad already returns a finished glyph; draw dad directly.
    return dad_fresh(form)


def dad_fresh(form):
    length = {"isol": 420, "init": 360, "medi": 330, "fina": 410}[form]
    d = Draw(length)
    bar(d, -20, length + 20, 22)
    eye_x = length - 120
    d.ring(eye_x, 96, 70, 74, 0.55)
    d.dot(eye_x, 196, 18, 16)
    if form in ("isol", "fina"):
        d.curve((18, 22), (8, 8), (24, -28), (64, 8), 20)
    top_at(d, eye_x, 228)
    bot_at(d, length * 0.3, -48 if form in ("isol", "fina") else -8)
    return d.finish()


def tah_shape(form):
    length = {"isol": 390, "init": 340, "medi": 310, "fina": 390}[form]
    d = Draw(length)
    bar(d, -20, length + 20, 22)
    eye_x = length - 110
    d.ring(eye_x, 86, 62, 58, 0.55)
    d.stroke([(eye_x + 6, 112), (eye_x, 200), (eye_x - 6, 300)], 22)
    d.stroke([(eye_x - 12, 288), (eye_x + 10, 312)], 12)
    top_at(d, eye_x, 300)
    bot_at(d, length * 0.3, -8)
    return d.finish()


def ghain_shape(form):
    length = {"isol": 400, "init": 260, "medi": 230, "fina": 400}[form]
    d = Draw(length)
    bar(d, -20, length + 20, 22)
    if form == "init":
        ain_head(d, length - 170, 18, 0.8)
        d.dot(length - 90, 180, 18, 16)
        top_at(d, length - 90, 210)
    elif form == "medi":
        ain_head(d, 16, 16, 0.65)
        d.dot(90, 150, 16, 14)
        top_at(d, 90, 176)
    elif form == "fina":
        ain_head(d, length - 190, 16, 0.75)
        d.curve((length - 160, 22), (140, 8), (64, -40), (80, -150), 26)
        d.curve((80, -150), (90, -214), (40, -140), (68, -30), 24)
        d.dot(length - 110, 190, 18, 16)
        top_at(d, length * 0.6, 220)
    else:
        d.ring(length - 110, 200, 74, 68, 0.52)
        d.curve((length - 110, 130), (length * 0.4, 18), (80, -36), (92, -160), 26)
        d.curve((92, -160), (100, -220), (46, -150), (74, -28), 24)
        d.dot(length - 110, 290, 18, 16)
        top_at(d, length - 110, 320)
    bot_at(d, length * 0.35, -210 if form in ("isol", "fina") else -8)
    return d.finish()


def waw_shape(final=False):
    d = Draw(230 if final else 200)
    d.ring(124, 74, 38, 36, 0.55)
    d.curve((112, 40), (96, 8), (74, -24), (90, -96), 20)
    if final:
        bar(d, 150, 240, 22)
    top_at(d, 130, 156)
    bot_at(d, 88, -170)
    return d.finish()


def mark_high_yeh():
    d = Draw(0)
    d.curve((-18, 8), (-8, 36), (16, 34), (10, 12), 12)
    d.anchor("top", 0, 46)
    return d.finish(), (0, 0)


def tatweel_shape():
    d = Draw(220)
    entry_bar(d, 220)
    top_at(d, 110, 52)
    bot_at(d, 110, -12)
    return d.finish()


def notdef_shape():
    d = Draw(280)
    d.stroke([(40, 0), (240, 0), (240, 500), (40, 500), (40, 0)], 16)
    return d.finish()


def eoa_shape():
    d = Draw(340)
    d.ring(170, 210, 132, 132, 0.72)
    d.dot(170, 210, 16, 16)
    top_at(d, 170, 360)
    bot_at(d, 170, 60)
    return d.finish()


def digit(kind):
    d = Draw(230)
    if kind == 0:
        d.ring(115, 180, 46, 58, 0.55)
    elif kind == 1:
        d.stroke([(140, 70), (128, 320)], 26)
        d.stroke([(112, 308), (150, 332)], 14)
    elif kind == 2:
        d.curve((150, 300), (40, 310), (30, 180), (120, 150), STROKE)
        d.curve((120, 150), (180, 130), (160, 60), (50, 70), STROKE)
    elif kind == 3:
        d.curve((50, 250), (120, 330), (190, 250), (120, 190), STROKE)
        d.curve((120, 190), (40, 140), (50, 60), (140, 80), STROKE)
    elif kind == 4:
        d.curve((160, 300), (40, 260), (50, 140), (150, 170), STROKE)
        d.stroke([(150, 170), (70, 60)], STROKE)
    elif kind == 5:
        d.ring(100, 150, 48, 48, 0.55)
        d.stroke([(148, 150), (190, 250)], 22)
    elif kind == 6:
        d.stroke([(150, 300), (70, 120)], STROKE)
        d.curve((70, 120), (40, 40), (140, 30), (150, 100), STROKE)
    elif kind == 7:
        d.stroke([(50, 280), (170, 280), (80, 60)], STROKE)
    elif kind == 8:
        d.stroke([(40, 290), (120, 170), (50, 60)], STROKE)
        d.stroke([(120, 170), (180, 80)], 18)
    else:
        d.ring(110, 220, 50, 50, 0.55)
        d.curve((110, 170), (150, 80), (80, 40), (70, 90), STROKE)
    top_at(d, 115, 340)
    bot_at(d, 115, 20)
    return d.finish()


def mark_fatha():
    d = Draw(0)
    d.stroke([(-34, 8), (34, 30)], 13)
    d.anchor("top", 0, 42)
    return d.finish(), (0, 0)


def mark_kasra():
    d = Draw(0)
    d.stroke([(-50, -16), (50, -52)], 18)
    return d.finish(), (0, 0)


def mark_damma():
    d = Draw(0)
    d.curve((-10, 10), (-30, 70), (40, 80), (10, 20), 16)
    d.stroke([(10, 20), (28, 8)], 14)
    d.anchor("top", 8, 88)
    return d.finish(), (0, 0)


def mark_shadda():
    d = Draw(0)
    d.curve((-30, 4), (-18, 46), (-2, 12), (0, 20), 12)
    d.curve((0, 20), (2, 12), (18, 46), (30, 4), 12)
    d.anchor("top", 0, 52)
    return d.finish(), (0, 0)


def mark_sukun():
    d = Draw(0)
    d.ring(0, 36, 28, 22, 0.55)
    d.anchor("top", 0, 66)
    return d.finish(), (0, 0)


def mark_supalif():
    d = Draw(0)
    d.stroke([(-6, 8), (-12, 168)], 16)
    d.stroke([(-16, 158), (8, 176)], 12)
    d.anchor("top", -8, 184)
    return d.finish(), (0, 0)


def mark_madda():
    d = Draw(0)
    d.curve((-60, 24), (-20, 70), (20, 0), (60, 40), 16)
    d.anchor("top", 0, 72)
    return d.finish(), (0, 0)


def mark_hamza():
    d = Draw(0)
    d.curve((-16, 8), (-28, 60), (10, 78), (8, 36), 14)
    d.curve((8, 36), (6, 16), (24, 28), (16, 8), 12)
    d.anchor("top", 0, 84)
    return d.finish(), (0, 0)


def mark_hamzabelow():
    d = Draw(0)
    d.curve((-16, -8), (-28, -60), (10, -78), (8, -36), 14)
    return d.finish(), (0, 0)


def mark_inverted_damma():
    d = Draw(0)
    d.curve((10, -8), (30, -68), (-36, -78), (-8, -18), 16)
    return d.finish(), (0, 0)


def mark_high_tick():
    d = Draw(0)
    d.stroke([(-24, 18), (28, 34)], 14)
    d.anchor("top", 0, 48)
    return d.finish(), (0, 0)


def mark_high_angle():
    d = Draw(0)
    d.stroke([(-20, 14), (0, 48), (22, 16)], 14)
    d.anchor("top", 0, 60)
    return d.finish(), (0, 0)


def mark_high_dot():
    d = Draw(0)
    d.ring(0, 28, 16, 16, 0.4)
    d.anchor("top", 0, 50)
    return d.finish(), (0, 0)


def mark_low_ring():
    d = Draw(0)
    d.ring(0, -28, 16, 16, 0.45)
    return d.finish(), (0, 0)


def mark_low_wave():
    d = Draw(0)
    d.curve((-30, -16), (-8, -46), (12, -8), (32, -30), 12)
    return d.finish(), (0, 0)


def build():
    glyphs = {}
    cmap = {0x20: "space"}
    forms = {}

    def add(name, rec, code=None):
        glyph, adv, lsb, anchors = rec
        glyphs[name] = (glyph, adv, lsb, anchors)
        if code is not None:
            cmap[code] = name

    glyphs[".notdef"] = notdef_shape()
    glyphs["space"] = (TTGlyphPen(None).glyph(), 170, 0, {})

    add("alef", alef_shape(False), 0x0627)
    add("alef_fina", alef_shape(True))
    add("beh", beh_shape("isol"), 0x0628)
    add("jeem", jeem_shape("isol"), 0x062C)
    add("dal", dal_shape(False), 0x062F)
    add("dal_fina", dal_shape(True))
    add("reh", reh_shape(False), 0x0631)
    add("reh_fina", reh_shape(True))
    add("seen", seen_shape("isol"), 0x0633)
    add("sad", sad_shape("isol"), 0x0635)
    add("ain", ain_shape("isol"), 0x0639)
    add("feh", feh_shape("isol"), 0x0641)
    add("qaf", qaf_shape("isol"), 0x0642)
    add("kaf", kaf_shape("isol"), 0x0643)
    add("kaf_keheh", kaf_shape("isol"), 0x06A9)
    add("lam", lam_shape("isol"), 0x0644)
    add("meem", meem_shape("isol"), 0x0645)
    add("noon", noon_shape("isol"), 0x0646)
    add("teh", teh_shape("isol"), 0x062A)
    add("hah", hah_shape("isol"), 0x062D)
    add("thal", thal_fresh(False), 0x0630)
    add("thal_fina", thal_fresh(True))
    add("dad", dad_fresh("isol"), 0x0636)
    add("tah", tah_shape("isol"), 0x0637)
    add("ghain", ghain_shape("isol"), 0x063A)
    add("waw", waw_shape(False), 0x0648)
    add("waw_fina", waw_shape(True))
    add("heh", heh_shape("isol"), 0x0647)
    add("hehgoal", hehgoal_shape("isol"), 0x06C1)
    add("hehdo", hehdo_shape("isol"), 0x06BE)
    add("yeh", yeh_shape("isol", True), 0x064A)
    add("yehdotless", yeh_shape("isol", False), 0x06CC)
    add("bariyeh", bariyeh_shape(False), 0x06D2)
    add("bariyeh_fina", bariyeh_shape(True))
    add("tehgoal", tehgoal_fresh(False), 0x06C3)
    add("tehgoal_fina", tehgoal_fresh(True))
    add("tatweel", tatweel_shape(), 0x0640)
    add("eoa", eoa_shape(), 0x06DD)

    dual = {
        "beh": beh_shape,
        "jeem": jeem_shape,
        "seen": seen_shape,
        "sad": sad_shape,
        "ain": ain_shape,
        "feh": feh_shape,
        "qaf": qaf_shape,
        "kaf": kaf_shape,
        "lam": lam_shape,
        "meem": meem_shape,
        "noon": noon_shape,
        "heh": heh_shape,
        "hehgoal": hehgoal_shape,
        "hehdo": hehdo_shape,
        "teh": teh_shape,
        "hah": hah_shape,
        "dad": dad_fresh,
        "tah": tah_shape,
        "ghain": ghain_shape,
    }
    for name, fn in dual.items():
        for form in ("init", "medi", "fina"):
            add(f"{name}_{form}", fn(form))
    add("yeh_init", yeh_shape("init", True))
    add("yeh_medi", yeh_shape("medi", True))
    add("yeh_fina", yeh_shape("fina", True))
    add("yehdotless_init", yeh_shape("init", False))
    add("yehdotless_medi", yeh_shape("medi", False))
    add("yehdotless_fina", yeh_shape("fina", False))
    for n in range(10):
        add(f"d{n}", digit(n), 0x06F0 + n)

    marks = {
        "fatha": (mark_fatha, 0x064E, "top"),
        "kasra": (mark_kasra, 0x0650, "bottom"),
        "damma": (mark_damma, 0x064F, "top"),
        "shadda": (mark_shadda, 0x0651, "top"),
        "sukun": (mark_sukun, 0x0652, "top"),
        "supalif": (mark_supalif, 0x0670, "top"),
        "madda": (mark_madda, 0x0653, "top"),
        "hamza": (mark_hamza, 0x0654, "top"),
        "hamzabelow": (mark_hamzabelow, 0x0655, "bottom"),
        "idamma": (mark_inverted_damma, 0x0657, "bottom"),
        "pausea": (mark_high_tick, 0x06D6, "top"),
        "pauseb": (mark_high_angle, 0x06D7, "top"),
        "pausec": (mark_high_tick, 0x06D9, "top"),
        "paused": (mark_high_angle, 0x06DA, "top"),
        "highmeem": (mark_high_dot, 0x06E2, "top"),
        "smallwaw": (mark_high_angle, 0x06E5, "top"),
        "smallyeh": (mark_high_yeh, 0x06E7, "top"),
        "lowmeem": (mark_low_ring, 0x06ED, "bottom"),
        "lowseen": (mark_low_wave, 0x06E3, "bottom"),
        "smallseen": (mark_high_dot, 0x06E3, None),
    }
    # 06E3 is low seen; don't also map high dot onto it.
    marks.pop("smallseen")
    mark_attach = {}
    for name, (fn, code, side) in marks.items():
        rec, attach = fn()
        add(name, rec, code)
        mark_attach[name] = (attach, side)

    # kaf keheh shares isol only; give it the same alternates via cmap? one outline set.
    # Point 06A9 at kaf and reuse kaf alternates through a duplicate cmap only for isol.
    # Alternates are selected by GSUB from the isol glyph, so 06A9 must be its own
    # isol with the same init/medi/fina lookups. Duplicate the kaf alternates entry
    # by substituting kaf_keheh in the same groups.
    order = [".notdef", "space"] + [n for n in glyphs if n not in (".notdef", "space")]
    glyf = {name: glyphs[name][0] for name in order}
    metrics = {name: (glyphs[name][1], glyphs[name][2]) for name in order}
    anchors = {name: glyphs[name][3] for name in order}

    def group(bases, suffix=""):
        return [f"{n}{suffix}" for n in bases]

    dual_names = list(dual) + ["yeh", "yehdotless"]
    right = ["alef", "dal", "reh", "bariyeh", "tehgoal", "thal", "waw"]
    fea = ["languagesystem DFLT dflt;", "languagesystem arab dflt;", ""]
    fea.append("feature init {")
    fea.append("  sub [" + " ".join(dual_names) + "] by [" + " ".join(f"{n}_init" for n in dual_names) + "];")
    fea.append("} init;")
    fea.append("feature medi {")
    fea.append("  sub [" + " ".join(dual_names) + "] by [" + " ".join(f"{n}_medi" for n in dual_names) + "];")
    fea.append("} medi;")
    fea.append("feature fina {")
    both = dual_names + right
    fea.append("  sub [" + " ".join(both) + "] by [" + " ".join(f"{n}_fina" for n in both) + "];")
    fea.append("} fina;")
    fea.append("")
    top_marks = [n for n, (_a, side) in mark_attach.items() if side == "top"]
    bot_marks = [n for n, (_a, side) in mark_attach.items() if side == "bottom"]
    for name in top_marks:
        ax, ay = mark_attach[name][0]
        fea.append(f"markClass {name} <anchor {ax} {ay}> @TOP;")
    for name in bot_marks:
        ax, ay = mark_attach[name][0]
        fea.append(f"markClass {name} <anchor {ax} {ay}> @BOT;")
    fea.append("feature mark {")
    fea.append("  lookup topm {")
    for name, anc in anchors.items():
        if "top" in anc and name not in mark_attach:
            x, y = anc["top"]
            fea.append(f"    pos base {name} <anchor {x} {y}> mark @TOP;")
    fea.append("  } topm;")
    fea.append("  lookup botm {")
    for name, anc in anchors.items():
        if "bottom" in anc and name not in mark_attach:
            x, y = anc["bottom"]
            fea.append(f"    pos base {name} <anchor {x} {y}> mark @BOT;")
    fea.append("  } botm;")
    fea.append("} mark;")
    fea.append("feature mkmk {")
    fea.append("  lookup stack {")
    for name in top_marks:
        if "top" in anchors.get(name, {}):
            x, y = anchors[name]["top"]
            fea.append(f"    pos mark {name} <anchor {x} {y}> mark @TOP;")
    fea.append("  } stack;")
    fea.append("} mkmk;")
    fea_text = "\n".join(fea) + "\n"

    BUILD.mkdir(parents=True, exist_ok=True)
    (BUILD / "features.fea").write_text(fea_text, encoding="utf-8")
    fb = FontBuilder(UPM, isTTF=True)
    fb.setupGlyphOrder(order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyf)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=980, descent=-420)
    fb.setupOS2(
        sTypoAscender=980,
        sTypoDescender=-420,
        sTypoLineGap=0,
        usWinAscent=980,
        usWinDescent=420,
        sxHeight=400,
        sCapHeight=700,
        usWeightClass=400,
        fsType=0,
    )
    fb.setupPost()
    fb.setupNameTable(
        {
            "copyright": "Copyright 2026 Qalam Works. Original outlines.",
            "familyName": "Qalam IndoPak Quranic",
            "styleName": "Prototype",
            "uniqueFontIdentifier": "Qalam Works: Qalam IndoPak Quranic Prototype 0.1",
            "fullName": "Qalam IndoPak Quranic Prototype",
            "version": "Version 0.3",
            "psName": "QalamIndoPakQuranic-Prototype",
            "manufacturer": "Qalam Works",
            "designer": "Qalam Works",
            "description": "Original Phase 1A prototype. Not derived from PDMS Saleem, Muhammadi, or any other proprietary Quran font.",
            "licenseDescription": "This prototype is intended for the SIL Open Font License 1.1 once the artwork is confirmed original.",
            "vendorURL": "https://www.qalamworks.com",
        }
    )
    addOpenTypeFeaturesFromString(fb.font, fea_text, filename=str(BUILD / "features.fea"))
    path = BUILD / "QalamIndoPakQuranic-Prototype.ttf"
    fb.save(str(path))
    return path


if __name__ == "__main__":
    print(build())
