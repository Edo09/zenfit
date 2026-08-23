# ZYRON brand assets

Everything here is generated. Edit the geometry in
[`scripts/brand/generate-brand-assets.py`](../../scripts/brand/generate-brand-assets.py)
and rerun it — never hand-edit the SVG or PNG output:

```bash
python scripts/brand/generate-brand-assets.py
```

## Color

| Token | Hex | Use |
| --- | --- | --- |
| ZYRON Blue | `#1A56F0` | The mark, the tagline, the accent |
| ZYRON Blue Deep | `#0B3FD4` | Pressed states, gradient end |
| Ink | `#FFFFFF` on dark / `#000000` on light | The wordmark |
| Canvas | `#000000` | Icon backgrounds |

The wordmark flips with the surface; **the mark stays blue in both schemes.**
In the app, `BrandMark` handles this — the wordmark reads `contentPrimary`,
the mark is pinned to `ZYRON_BLUE`.

## Files

| File | What it is |
| --- | --- |
| `zyron-mark.svg` | Chevron only, blue. The primary standalone mark |
| `zyron-mark-white.svg` | Chevron on dark photography / blue fills |
| `zyron-mark-black.svg` | Chevron on white, one-color print, embroidery |
| `zyron-wordmark.svg` | `ZYRON` letterforms only (white) |
| `zyron-logo-vertical.svg` | Stacked lockup for dark backgrounds |
| `zyron-logo-vertical-light.svg` | Stacked lockup for light backgrounds |
| `zyron-logo-horizontal.svg` | Horizontal lockup — headers, email signatures, web nav |

The wordmark is drawn as outlines, so the lockups need no font. The tagline
is live `<text>` and does fall back to a system sans outside the app — if you
need it pixel-exact in print, outline it in the editor first.

## Geometry

The mark is two nested chevrons in a `120 × 92` box; the wordmark sits on a
100-unit cap height across `774` units. Both are exact integers so they scale
without seams.

**Clear space:** keep a margin equal to the mark's *inner* chevron height
(`21` units, i.e. ~23% of the mark height) on all sides.

**Minimum sizes:** mark 16px, horizontal lockup 120px wide, vertical lockup
88px wide. Below the lockup minimums, use the mark alone.

## Generated icons (outside this folder)

| Path | Size | Notes |
| --- | --- | --- |
| `assets/images/app-icon/icon.png` | 1024 | Blue on black, square — iOS applies its own mask |
| `assets/images/app-icon/android-icon-foreground.png` | 1024 | Transparent, inside the 52% adaptive safe zone |
| `assets/images/app-icon/splash-icon.png` | 1024 | Transparent, mark only |
| `assets/images/app-icon/favicon.png` | 64 | Transparent |
| `public/icons/icon-192.png` | 192 | PWA, blue on black |
| `public/icons/icon-512.png` | 512 | PWA + `apple-touch-icon` |
| `public/icons/icon-512-maskable.png` | 512 | PWA maskable, 52% safe zone |
| `public/icons/icon-1024.png` | 1024 | PWA / store listing |
