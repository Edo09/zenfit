#!/usr/bin/env python3
"""ZYRON brand asset generator.

Single source of truth for the ZYRON mark + wordmark geometry. Emits the
vector sources under assets/brand/ and every raster icon the app config
references (assets/images/app-icon/*, public/icons/*).

Run after any geometry or color change:

    python scripts/brand/generate-brand-assets.py

Requires Pillow (`python -m pip install Pillow`).
"""
from __future__ import annotations

import os

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# ---------------------------------------------------------------- palette ---
BLUE = "#1A56F0"          # ZYRON blue - the mark, the accent, the tagline
BLUE_DEEP = "#0B3FD4"     # pressed / gradient end
WHITE = "#FFFFFF"
BLACK = "#000000"

# ------------------------------------------------------------------- mark ---
# Two nested chevrons reading as an "A". Coordinates live in a tight
# 120 x 92 box so the shape can be dropped into any viewBox unscaled.
MARK_W, MARK_H = 120, 92
MARK_OUTER = [(60, 0), (120, 92), (60, 36), (0, 92)]
MARK_INNER = [(60, 50), (98, 92), (60, 71), (22, 92)]


def mark_paths():
    def d(pts):
        head = "M{0} {1}".format(pts[0][0], pts[0][1])
        rest = "".join("L{0} {1}".format(x, y) for x, y in pts[1:])
        return head + rest + "Z"

    return [d(MARK_OUTER), d(MARK_INNER)]


# --------------------------------------------------------------- wordmark ---
# ZYRON drawn as outlines on a 100-unit cap height: extended geometric forms
# with flat terminals. The widths plus 58-unit tracking give the wide poster
# proportion of the reference lockup.
GLYPHS = [
    ("Z", 108, "M0 0H108V14L21 86H108V100H0V86L87 14H0Z"),
    ("Y", 110, "M0 0L48 58V100H62V58L110 0H92L55 45L18 0Z"),
    (
        "R",
        104,
        "M0 0H84A20 20 0 0 1 104 20V32A20 20 0 0 1 84 52H60L104 100H82L38 52H14V100H0Z"
        "M14 14H84A6 6 0 0 1 90 20V32A6 6 0 0 1 84 38H14Z",
    ),
    (
        "O",
        112,
        "M34 0H78A34 30 0 0 1 112 30V70A34 30 0 0 1 78 100H34A34 30 0 0 1 0 70V30A34 30 0 0 1 34 0Z"
        "M36 14H76A22 20 0 0 1 98 34V66A22 20 0 0 1 76 86H36A22 20 0 0 1 14 66V34A22 20 0 0 1 36 14Z",
    ),
    ("N", 108, "M0 0H14L94 81V0H108V100H94L14 19V100H0Z"),
]
TRACKING = 58
CAP = 100
WORD_W = sum(w for _, w, _ in GLYPHS) + TRACKING * (len(GLYPHS) - 1)


def wordmark_group(fill, indent="  "):
    out = []
    x = 0.0
    for _name, w, d in GLYPHS:
        out.append(
            '{0}<path d="{1}" transform="translate({2:g} 0)" fill="{3}" fill-rule="evenodd" />'.format(
                indent, d, x, fill
            )
        )
        x += w + TRACKING
    return "\n".join(out)


def mark_group(fill, indent="  "):
    return "\n".join(
        '{0}<path d="{1}" fill="{2}" />'.format(indent, d, fill) for d in mark_paths()
    )


# ------------------------------------------------------------ svg writers ---
FONT_STACK = (
    "Schibsted Grotesk, Hanken Grotesk, -apple-system, BlinkMacSystemFont, "
    "Segoe UI, Roboto, sans-serif"
)
TAGLINE = "TRAIN &#8226; EVOLVE &#8226; CONQUER"


def write(path, body):
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(body)
    print("  " + path)


def svg_mark(fill):
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
        'width="{w}" height="{h}" role="img" aria-label="ZYRON">\n'
        "{body}\n</svg>\n"
    ).format(w=MARK_W, h=MARK_H, body=mark_group(fill))


def svg_wordmark(fill):
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" '
        'width="{w}" height="{h}" role="img" aria-label="ZYRON">\n'
        "{body}\n</svg>\n"
    ).format(w=WORD_W, h=CAP, body=wordmark_group(fill))


def svg_lockup_vertical(mark_fill, word_fill, tag_fill):
    W, H = 720, 468
    m_w = 300.0
    m_h = m_w * MARK_H / MARK_W
    m_x, m_y = (W - m_w) / 2, 40.0
    w_w = 440.0
    w_s = w_w / WORD_W
    w_x, w_y = (W - w_w) / 2, m_y + m_h + 44
    tag_y = w_y + CAP * w_s + 46
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" '
        'role="img" aria-label="ZYRON - Train, Evolve, Conquer">\n'
        '  <g transform="translate({mx:g} {my:g}) scale({ms:g})">\n{mark}\n  </g>\n'
        '  <g transform="translate({wx:g} {wy:g}) scale({ws:g})">\n{word}\n  </g>\n'
        '  <text x="{cx:g}" y="{ty:g}" fill="{tag}" font-family="{font}" font-size="23" '
        'font-weight="600" letter-spacing="7.5" text-anchor="middle">{tagline}</text>\n'
        "</svg>\n"
    ).format(
        W=W,
        H=H,
        mx=m_x,
        my=m_y,
        ms=m_w / MARK_W,
        mark=mark_group(mark_fill, "    "),
        wx=w_x,
        wy=w_y,
        ws=w_s,
        word=wordmark_group(word_fill, "    "),
        cx=W / 2.0,
        ty=tag_y,
        tag=tag_fill,
        font=FONT_STACK,
        tagline=TAGLINE,
    )


def svg_lockup_horizontal(mark_fill, word_fill, tag_fill):
    pad = 34.0
    m_h = 128.0
    m_w = m_h * MARK_W / MARK_H
    w_w = 620.0
    w_s = w_w / WORD_W
    gap = 44.0
    W = pad * 2 + m_w + gap + w_w
    w_x = pad + m_w + gap
    w_y = pad + 6
    tag_y = w_y + CAP * w_s + 36
    H = tag_y + 14 + pad
    return (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W:g} {H:g}" width="{W:g}" height="{H:g}" '
        'role="img" aria-label="ZYRON - Train, Evolve, Conquer">\n'
        '  <g transform="translate({mx:g} {my:g}) scale({ms:g})">\n{mark}\n  </g>\n'
        '  <g transform="translate({wx:g} {wy:g}) scale({ws:g})">\n{word}\n  </g>\n'
        '  <text x="{wx:g}" y="{ty:g}" fill="{tag}" font-family="{font}" font-size="21" '
        'font-weight="600" letter-spacing="6.6">{tagline}</text>\n'
        "</svg>\n"
    ).format(
        W=W,
        H=H,
        mx=pad,
        my=pad + 8,
        ms=m_h / MARK_H,
        mark=mark_group(mark_fill, "    "),
        wx=w_x,
        wy=w_y,
        ws=w_s,
        word=wordmark_group(word_fill, "    "),
        ty=tag_y,
        tag=tag_fill,
        font=FONT_STACK,
        tagline=TAGLINE,
    )


# --------------------------------------------------------------- png icons ---
SS = 4  # supersample factor, downsampled with LANCZOS for clean edges


def render_mark_png(path, size, fill, bg, coverage):
    """Draw the mark centered in a `size` square, spanning `coverage` of the width."""
    canvas = size * SS
    img = Image.new("RGBA", (canvas, canvas), bg if bg else (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    scale = (canvas * coverage) / MARK_W
    off_x = (canvas - MARK_W * scale) / 2.0
    off_y = (canvas - MARK_H * scale) / 2.0
    for pts in (MARK_OUTER, MARK_INNER):
        draw.polygon([(off_x + x * scale, off_y + y * scale) for x, y in pts], fill=fill)

    img = img.resize((size, size), Image.LANCZOS)
    full = os.path.join(ROOT, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    img.save(full, "PNG", optimize=True)
    print("  {0}  ({1}x{1})".format(path, size))


def main():
    print("vector sources")
    write("assets/brand/zyron-mark.svg", svg_mark(BLUE))
    write("assets/brand/zyron-mark-white.svg", svg_mark(WHITE))
    write("assets/brand/zyron-mark-black.svg", svg_mark(BLACK))
    write("assets/brand/zyron-wordmark.svg", svg_wordmark(WHITE))
    write("assets/brand/zyron-logo-vertical.svg", svg_lockup_vertical(BLUE, WHITE, BLUE))
    write("assets/brand/zyron-logo-horizontal.svg", svg_lockup_horizontal(BLUE, WHITE, BLUE))
    write(
        "assets/brand/zyron-logo-vertical-light.svg",
        svg_lockup_vertical(BLUE, BLACK, BLUE_DEEP),
    )

    print("app icons")
    # iOS/Expo icon: square, no rounding - the OS applies its own mask.
    render_mark_png("assets/images/app-icon/icon.png", 1024, BLUE, BLACK, 0.66)
    # Android adaptive foreground: transparent, content inside the ~60% safe zone.
    render_mark_png("assets/images/app-icon/android-icon-foreground.png", 1024, BLUE, None, 0.52)
    render_mark_png("assets/images/app-icon/splash-icon.png", 1024, BLUE, None, 0.82)
    render_mark_png("assets/images/app-icon/favicon.png", 64, BLUE, None, 0.90)

    print("pwa icons")
    render_mark_png("public/icons/icon-192.png", 192, BLUE, BLACK, 0.66)
    render_mark_png("public/icons/icon-512.png", 512, BLUE, BLACK, 0.66)
    render_mark_png("public/icons/icon-512-maskable.png", 512, BLUE, BLACK, 0.52)
    render_mark_png("public/icons/icon-1024.png", 1024, BLUE, BLACK, 0.66)

    print("\nwordmark box: {0} x {1}   mark box: {2} x {3}".format(WORD_W, CAP, MARK_W, MARK_H))


if __name__ == "__main__":
    main()
