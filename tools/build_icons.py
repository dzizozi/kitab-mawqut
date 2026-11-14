"""Vector launcher icon + Android TV banner (VectorDrawable XML: sharp on 1080p and 4K screens).
Arabic text is shaped with HarfBuzz and converted to outlines, so the banner needs no font at run time.
Usage: python tools/build_icons.py   (needs: pip install uharfbuzz fonttools)"""
import math, os
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
FONTS = os.path.join(ROOT, 'mawaqit', 'fonts')
RES = os.path.join(ROOT, 'android-app', 'android', 'app', 'src', 'main', 'res')
GREEN, GREEN2, GOLD, IVORY, BLUE, BROWN = '#FF0F6B4A', '#FF0A3D2E', '#FFE2B04A', '#FFF3ECDC', '#FF1F4F8F', '#FF2B1D14'


def text_path(text, font, size, x_center, baseline, rtl=True):
    """SVG path data of `text` centred on x_center (viewport units)."""
    path = os.path.join(FONTS, font)
    blob = hb.Blob.from_file_path(path)
    face = hb.Face(blob); f = hb.Font(face)
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(f, buf, {})
    tt = TTFont(path); gs = tt.getGlyphSet(); order = tt.getGlyphOrder()
    upem = tt['head'].unitsPerEm; s = size / upem
    width = sum(p.x_advance for p in buf.glyph_positions) * s
    x = x_center - width / 2
    pen = SVGPathPen(gs, ntos=lambda v: ('%.2f' % v).rstrip('0').rstrip('.'))
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        tp = TransformPen(pen, (s, 0, 0, -s, x + pos.x_offset * s, baseline - pos.y_offset * s))
        gs[order[info.codepoint]].draw(tp)
        x += pos.x_advance * s
    return pen.getCommands(), width


def star(cx, cy, ro, n=8):
    ri = ro * math.cos(math.pi / n * 2) / math.cos(math.pi / n) if n == 8 else ro * 0.5
    ri = ro * math.sqrt(0.5) / math.cos(math.pi / 8)
    pts = [(cx + (ro if k % 2 == 0 else ri) * math.cos(k * math.pi / 8), cy + (ro if k % 2 == 0 else ri) * math.sin(k * math.pi / 8)) for k in range(16)]
    return 'M' + ' L'.join('%.2f,%.2f' % p for p in pts) + ' Z'


def crescent(cx, cy, r):
    """Crescent opening to the upper right: the big circle minus an offset circle, as one polygon."""
    r2 = r * 0.82; ox, oy = cx + r * 0.38, cy - r * 0.30
    pts = []
    for k in range(720):                                   # outer edge: big circle outside the small one
        a = k * math.pi / 360; x, y = cx + r * math.cos(a), cy + r * math.sin(a)
        if math.hypot(x - ox, y - oy) >= r2: pts.append((a, x, y))
    # rotate the list so that it starts right after the gap
    gap = max(range(len(pts)), key=lambda i: (pts[i][0] - pts[i - 1][0]) % (2 * math.pi))
    outer = [(x, y) for _, x, y in pts[gap:] + pts[:gap]]
    a0 = math.atan2(outer[-1][1] - oy, outer[-1][0] - ox); a1 = math.atan2(outer[0][1] - oy, outer[0][0] - ox)
    inner = []
    span = (a1 - a0) % (2 * math.pi)
    for k in range(1, 240):                                # inner edge: small circle inside the big one
        a = a0 + span * k / 240; x, y = ox + r2 * math.cos(a), oy + r2 * math.sin(a)
        inner.append((x, y))
    if inner and math.hypot(inner[len(inner) // 2][0] - cx, inner[len(inner) // 2][1] - cy) > r:   # wrong way round
        span = span - 2 * math.pi
        inner = [(ox + r2 * math.cos(a0 + span * k / 240), oy + r2 * math.sin(a0 + span * k / 240)) for k in range(1, 240)]
    return 'M' + ' L'.join('%.2f,%.2f' % q for q in outer[::4] + [outer[-1]] + inner[::4]) + ' Z'


def path(d, fill, extra=''):
    return f'    <path android:pathData="{d}" android:fillColor="{fill}"{extra}/>\n'


def zellige_band(x0, x1, y_mid, cell):
    """Row of khatam stars + crosses (same geometry as the TV theme)."""
    R = cell * math.sqrt(0.5); out = ''
    n = int((x1 - x0) / cell) + 2
    out += path(f'M{x0},{y_mid - cell * 0.75} H{x1} V{y_mid + cell * 0.75} H{x0} Z', IVORY)
    for i in range(-1, n):
        cx = x0 + i * cell
        if i % 2: continue
        col = GREEN if (i // 2) % 2 == 0 else BLUE
        out += path(star(cx, y_mid, R), col, f' android:strokeColor="{BROWN}" android:strokeWidth="{cell * 0.05:.2f}"')
        out += path(star(cx, y_mid, R * 0.32), GOLD)
    return out


def vector(w, h, vw, vh, body):
    return ('<?xml version="1.0" encoding="utf-8"?>\n'
            '<vector xmlns:android="http://schemas.android.com/apk/res/android" xmlns:aapt="http://schemas.android.com/aapt"\n'
            f'    android:width="{w}dp" android:height="{h}dp" android:viewportWidth="{vw}" android:viewportHeight="{vh}">\n'
            + body + '</vector>\n')


def main():
    # ---- adaptive launcher icon foreground (108×108, safe zone = central 66)
    fg = path(crescent(50, 52, 19), GOLD) + path(star(66, 40, 6.5), GOLD) + path('M36,78 H72 V81.5 H36 Z', GOLD)
    open(os.path.join(RES, 'drawable', 'ic_launcher_foreground_v.xml'), 'w', encoding='utf-8').write(vector(108, 108, 108, 108, fg))
    for name in ('ic_launcher.xml', 'ic_launcher_round.xml'):
        open(os.path.join(RES, 'mipmap-anydpi-v26', name), 'w', encoding='utf-8').write(
            '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
            '    <background android:drawable="@color/ic_launcher_background"/>\n'
            '    <foreground android:drawable="@drawable/ic_launcher_foreground_v"/>\n'
            '    <monochrome android:drawable="@drawable/ic_launcher_foreground_v"/>\n</adaptive-icon>\n')
    # ---- Android TV banner (320×180 dp)
    bg = ('    <path android:pathData="M0,0 H320 V180 H0 Z">\n      <aapt:attr name="android:fillColor">\n'
          '        <gradient android:type="linear" android:startX="0" android:startY="0" android:endX="320" android:endY="180">\n'
          f'          <item android:offset="0" android:color="{GREEN}"/><item android:offset="1" android:color="{GREEN2}"/>\n'
          '        </gradient>\n      </aapt:attr>\n    </path>\n')
    body = bg + zellige_band(0, 320, 166, 14)
    body += path('M0,154.6 H320 V156 H0 Z', GOLD)
    body += path(crescent(266, 76, 30), GOLD) + path(star(291, 54, 9), GOLD)
    title, w1 = text_path('كتابا موقوتا', 'Amiri-Bold.ttf', 50, 120, 86)
    sub, w2 = text_path('مواقيت الصلاة · شاشة المسجد', 'Cairo-VF.ttf', 17, 120, 122)
    body += path(title, '#FFFFFFFF') + path(sub, GOLD)
    open(os.path.join(RES, 'drawable', 'tv_banner.xml'), 'w', encoding='utf-8').write(vector(320, 180, 320, 180, body))
    # ---- start-up (splash) screen: vector logo centred on a solid colour, sharp at any resolution
    logo = path(crescent(150, 70, 44), GOLD) + path(star(186, 38, 12), GOLD)
    t1, _ = text_path('كتابا موقوتا', 'Amiri-Bold.ttf', 46, 150, 172)
    t2, _ = text_path('مواقيت الصلاة', 'Cairo-VF.ttf', 18, 150, 204)
    logo += path(t1, '#FFFFFFFF') + path(t2, GOLD)
    open(os.path.join(RES, 'drawable', 'splash_logo.xml'), 'w', encoding='utf-8').write(vector(300, 220, 300, 220, logo))
    open(os.path.join(RES, 'drawable', 'splash.xml'), 'w', encoding='utf-8').write(
        '<?xml version="1.0" encoding="utf-8"?>\n<layer-list xmlns:android="http://schemas.android.com/apk/res/android">\n'
        '    <item><color android:color="#FF0B3D2E"/></item>\n'
        '    <item android:gravity="center" android:width="300dp" android:height="220dp" android:drawable="@drawable/splash_logo"/>\n</layer-list>\n')
    for d in os.listdir(RES):
        f = os.path.join(RES, d, 'splash.png')
        if d.startswith('drawable') and os.path.exists(f): os.remove(f)
    png = os.path.join(RES, 'drawable', 'tv_banner.png')
    if os.path.exists(png): os.remove(png)
    print('icons written; title width %.0f, subtitle width %.0f' % (w1, w2))


if __name__ == '__main__':
    main()
