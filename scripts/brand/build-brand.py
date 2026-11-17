"""
QEVRANT brand assets. Run: python3 scripts/brand/build-brand.py  (needs fontTools + rsvg-convert + ImageMagick)

Symbol: a geometric Q whose tail is drawn as the leg of an R — the ring is open where the
amber stroke passes through it, so Q and R read as one mark. Navy + amber, from the app palette.
"""
import io, math, os, subprocess
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "public", "brand")
NAVY, INK, AMBER, LIGHT, BG_DARK = "#1B3668", "#0E1A33", "#E0A33A", "#EEF2FA", "#0E1A33"

def symbol_paths(ring, tail, cx=32.0, cy=31.0, r=16.0, w=6.4, gap=(26, 64), tail_from=0.18, tail_to=1.58):
    a0, a1 = math.radians(gap[1]), math.radians(gap[0] + 360)
    p = lambda a: (cx + r * math.cos(a), cy + r * math.sin(a))
    (x0, y0), (x1, y1) = p(a0), p(a1)
    t = math.radians(45)
    tx0, ty0 = cx + r * tail_from * math.cos(t), cy + r * tail_from * math.sin(t)
    tx1, ty1 = cx + r * tail_to * math.cos(t), cy + r * tail_to * math.sin(t)
    return (f'<path d="M{x0:.2f} {y0:.2f}A{r} {r} 0 1 1 {x1:.2f} {y1:.2f}" fill="none" stroke="{ring}" stroke-width="{w}" stroke-linecap="round"/>'
            f'<path d="M{tx0:.2f} {ty0:.2f}L{tx1:.2f} {ty1:.2f}" stroke="{tail}" stroke-width="{w}" stroke-linecap="round"/>')

def svg(w, h, body, vb=None):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb or f"0 0 {w} {h}"}" width="{w}" height="{h}">{body}</svg>\n'

def tile(size=64, rx=15, pad=0.0, bg=INK):
    s = 1 - 2 * pad
    inner = symbol_paths(LIGHT, AMBER)
    return f'<rect width="64" height="64" rx="{rx}" fill="{bg}"/><g transform="translate({32 - 32 * s} {32 - 32 * s}) scale({s})">{inner}</g>'

def wordmark(text="QEVRANT", weight=800, size=38, tracking=0.07):
    woff = os.path.join(ROOT, "node_modules/@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2")
    f = TTFont(woff)
    f = instancer.instantiateVariableFont(f, {"wght": weight})
    upm = f["head"].unitsPerEm
    gs, cmap, hmtx = f.getGlyphSet(), f.getBestCmap(), f["hmtx"]
    scale = size / upm
    x, paths = 0.0, []
    for ch in text:
        g = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        gs[g].draw(TransformPen(pen, (scale, 0, 0, -scale, x, size * 0.74)))
        paths.append(pen.getCommands())
        x += hmtx[g][0] * scale + tracking * size
    return " ".join(paths), x - tracking * size, size * 0.74

def main():
    os.makedirs(OUT, exist_ok=True)
    files = {}
    files["qevrant-symbol.svg"] = svg(64, 64, symbol_paths(NAVY, AMBER))
    files["qevrant-symbol-on-dark.svg"] = svg(64, 64, symbol_paths(LIGHT, AMBER))
    files["qevrant-app-icon.svg"] = svg(512, 512, tile(), "0 0 64 64")
    d, width, cap = wordmark()
    gap, sym = 4, 64
    W = sym + gap + width
    for name, ring, ink in (("qevrant-logo.svg", NAVY, INK), ("qevrant-logo-on-dark.svg", LIGHT, LIGHT)):
        body = f'<g>{symbol_paths(ring, AMBER)}</g><path transform="translate({sym + gap} {(64 - cap) / 2:.2f})" d="{d}" fill="{ink}"/>'
        files[name] = svg(round(W * 4), 256, body, f"0 0 {W:.1f} 64")
    for n, c in files.items():
        open(os.path.join(OUT, n), "w").write(c)
    # favicon (tile, slightly smaller corner radius reads better at 16 px)
    open(os.path.join(ROOT, "public", "icon.svg"), "w").write(svg(64, 64, tile(rx=14)))
    def png(svgtext, size, path):
        subprocess.run(["rsvg-convert", "-w", str(size), "-h", str(size), "-o", path], input=svgtext.encode(), check=True)
    icons = os.path.join(ROOT, "public", "icons")
    full = svg(64, 64, tile())
    # iOS ignores transparency and rounds corners itself: full-bleed square with no radius
    square = svg(64, 64, tile(rx=0, pad=0.06))
    maskable = svg(64, 64, tile(rx=0, pad=0.16))  # Android safe zone: symbol inside the central 80 %
    for s in (192, 512): png(full, s, os.path.join(icons, f"icon-{s}.png")); png(maskable, s, os.path.join(icons, f"maskable-{s}.png"))
    png(square, 180, os.path.join(icons, "apple-touch-icon.png")); png(square, 180, os.path.join(ROOT, "public", "apple-touch-icon.png"))
    for s in (16, 32, 48): png(svg(64, 64, tile(rx=14)), s, f"/tmp/fav-{s}.png")
    subprocess.run(["convert", "/tmp/fav-16.png", "/tmp/fav-32.png", "/tmp/fav-48.png", os.path.join(ROOT, "public", "favicon.ico")], check=True)
    for n in ("qevrant-logo.svg", "qevrant-logo-on-dark.svg"):
        subprocess.run(["rsvg-convert", "-w", "1200", "-o", os.path.join(OUT, n.replace(".svg", ".png")), os.path.join(OUT, n)], check=True)
    png(full, 1024, os.path.join(OUT, "qevrant-app-icon-1024.png"))
    print("symbol path:", symbol_paths("RING", "TAIL"))
    print("wordmark width", round(width, 1))

main()
