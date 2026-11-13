"""Fonts the user can choose for the sheets (all bundled, free licences – see fonts/FONTS.md).

The themes are written with three font families: 'Noto Kufi Arabic' (titles, numbers), 'Amiri'
(decorative text: month names, du'a) and 'Noto Sans Arabic' (body text).  A user choice simply
re-maps one of these family names to another font file, so every theme follows the choice.
The Quran words of the hizb sheet use their own family «QuranText»."""

# id: (Arabic label, style, [(file, weight)], family name used in CSS)
FONTS = {
    'kfgqpc_warsh': ('العثماني – مصحف ورش (مجمع الملك فهد)', 'مصحفي', [('KFGQPC-Warsh.ttf', '100 900')]),
    'kfgqpc_hafs':  ('العثماني – مصحف حفص (مجمع الملك فهد)', 'مصحفي', [('KFGQPC-Hafs.ttf', '100 900')]),
    'amiri_quran':  ('أميري قرآن', 'مصحفي', [('AmiriQuran-Regular.ttf', '100 900')]),
    'scheherazade': ('شهرزاد (نسخ مصحفي)', 'مصحفي', [('ScheherazadeNew-Regular.ttf', '100 500'), ('ScheherazadeNew-Bold.ttf', '600 900')]),
    'bouazzi':      ('المغربي – بوعزي', 'مغربي', [('BouazziMaghribi-Regular.ttf', '100 900')]),
    'amiri':        ('أميري (نسخ)', 'نسخ', [('Amiri-Regular.ttf', '100 500'), ('Amiri-Bold.ttf', '600 900')]),
    'naskh':        ('النسخ (نوتو نسخ)', 'نسخ', [('NotoNaskhArabic-VF.ttf', '100 900')]),
    'lateef':       ('لطيف (نسخ)', 'نسخ', [('Lateef-Regular.ttf', '100 500'), ('Lateef-Bold.ttf', '600 900')]),
    'noto_kufi':    ('الكوفي (نوتو كوفي)', 'كوفي', [('NotoKufiArabic-Regular.ttf', '100 500'), ('NotoKufiArabic-Bold.ttf', '600 900')]),
    'reem_kufi':    ('الكوفي (ريم كوفي)', 'كوفي', [('ReemKufi-VF.ttf', '100 900')]),
    'katibeh':      ('كاتبة (ثلث)', 'ثلث', [('Katibeh-Regular.ttf', '100 900')]),
    'ruqaa':        ('الرقعة (عارف رقعة)', 'رقعة', [('ArefRuqaa-Regular.ttf', '100 500'), ('ArefRuqaa-Bold.ttf', '600 900')]),
    'messiri':      ('المسيري (حديث)', 'حديث', [('ElMessiri-VF.ttf', '100 900')]),
    'cairo':        ('القاهرة (حديث)', 'حديث', [('Cairo-VF.ttf', '100 900')]),
    'noto_sans':    ('نوتو سانس (حديث)', 'حديث', [('NotoSansArabic-Regular.ttf', '100 500'), ('NotoSansArabic-Bold.ttf', '600 900')]),
}
ORDER = list(FONTS)

# role -> (config key, family name used by the themes, default font)
ROLES = {
    'title': ('font_title', 'Noto Kufi Arabic', 'noto_kufi'),
    'deco':  ('font_deco', 'Amiri', 'amiri'),
    'text':  ('font_text', 'Noto Sans Arabic', 'noto_sans'),
}
SIZES = ('size_title', 'size_table', 'size_cards', 'size_quran')     # percentages (60–160)

KFGQPC_UNFIX = str.maketrans({'\u08F2': '\u0656', '\u08F0': '\u0657', '\u08F1': '\u065E'})


def quran_font(cfg, riwaya='warsh'):
    f = cfg.get('font_quran') or 'auto'
    if f == 'auto' or f not in FONTS:
        return 'kfgqpc_warsh' if riwaya == 'warsh' else 'kfgqpc_hafs'
    return f


def quran_text(s, font_id):
    """The KFGQPC Uthmanic fonts expect the original KFGQPC code points for open tanween."""
    return s.translate(KFGQPC_UNFIX) if font_id.startswith('kfgqpc') else s


def face(family, font_id, base):
    """One @font-face per weight, with the same descriptors as the default faces, so the later
    (user-chosen) rule always wins over the theme's default font."""
    out = []
    for w in (300, 400, 500, 600, 700, 800, 900):
        f = next((f for f, rng in FONTS[font_id][2] if int(rng.split()[0]) <= w <= int(rng.split()[-1])), FONTS[font_id][2][-1][0])
        out.append("@font-face{font-family:'%s';src:url('%s%s');font-weight:%d}" % (family, base, f, w))
    return ''.join(out)


def pct(cfg, key):
    try:
        return max(60, min(160, int(cfg.get(key) or 100))) / 100
    except (TypeError, ValueError):
        return 1.0


def css(cfg, base, riwaya=None):
    """@font-face re-mapping + size scaling, appended after the theme CSS."""
    out = []
    for role, (key, family, default) in ROLES.items():
        fid = cfg.get(key) or default
        if fid in FONTS and fid != default:
            out.append(face(family, fid, base))
    out.append(face('QuranText', quran_font(cfg, riwaya or 'warsh'), base))
    st, sb, sc, sq = (pct(cfg, k) for k in SIZES)
    if st != 1: out.append('.head .h-right,.head .h-mid,.head .h-left{zoom:%.2f}' % st)
    if sb != 1: out.append('.tbl th,.tbl td{zoom:%.2f}' % sb)
    if sc != 1: out.append('.bottom .card,.meta,.foot,.hz .when,.hz .rng .lb{zoom:%.2f}' % sc)
    if sq != 1: out.append('.hz .words{zoom:%.2f}' % sq)
    out.append(".hz .words{font-family:'QuranText','Amiri',serif;font-weight:400}")
    return ''.join(out)


def choices():
    return [[k, v[0], v[1]] for k, v in FONTS.items()]
