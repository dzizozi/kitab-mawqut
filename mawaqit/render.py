"""HTML of the monthly sheet (theme-aware, bilingual: Arabic + French/English)."""
import html, datetime as dt, pathlib
from . import themes, fonts_cfg
from .events import HIJRI, DAYS, GREG, UI, greg_ar

DEFS = '''<svg width="0" height="0" style="position:absolute"><defs>
<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6d58a"/><stop offset="1" stop-color="#b8862f"/></linearGradient>
<linearGradient id="holo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#00b7ff"/><stop offset=".5" stop-color="#ff2fb8"/><stop offset="1" stop-color="#7a00ff"/></linearGradient>
</defs></svg>'''
CRESCENT = ('<svg viewBox="0 0 64 64" class="ic"><path d="M40 6a26 26 0 1 0 18 44A22 22 0 1 1 40 6z"/>'
            '<path d="M48 18l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z"/></svg>')
MOSQUE = ('<svg viewBox="0 0 400 60" preserveAspectRatio="none" class="skyline"><path d="'
          'M0 60V44h30v-8h6v8h20V30c0-10 14-18 14-18s14 8 14 18v14h18V18l4-10 4 10v26h22V36c0-14 22-24 22-24s22 10 22 24v8h20V18l4-10 4 10v26h18V30'
          'c0-10 14-18 14-18s14 8 14 18v14h22v-8h6v8h30v16z"/></svg>')
BGDECO = ('<div class="bgdeco"><div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div>'
          '<div class="blob b4"></div><div class="pattern"></div><div class="sq s1"></div><div class="sq s2"></div>'
          '<div class="bar"></div><div class="spark sp1">✦</div><div class="spark sp2">✧</div><div class="spark sp3">✦</div></div>')
FONTS = [('Amiri', 'Amiri-Regular.ttf', 400), ('Amiri', 'Amiri-Bold.ttf', 700),
         ('Noto Kufi Arabic', 'NotoKufiArabic-Regular.ttf', 400), ('Noto Kufi Arabic', 'NotoKufiArabic-Bold.ttf', 700),
         ('Noto Kufi Arabic', 'NotoKufiArabic-Bold.ttf', 800),
         ('Noto Sans Arabic', 'NotoSansArabic-Regular.ttf', 400), ('Noto Sans Arabic', 'NotoSansArabic-Bold.ttf', 700),
         ('UILatin', 'NotoSans-Regular.ttf', 400), ('UILatin', 'NotoSans-Bold.ttf', 600), ('UILatin', 'NotoSans-Bold.ttf', 700)]


def file_url(p):
    return pathlib.Path(p).resolve().as_uri()


def font_css(base):
    return ''.join("@font-face{font-family:'%s';src:url('%s%s');font-weight:%d}" % (f, base, n, w) for f, n, w in FONTS)


def image_data(path):
    import base64, os
    if not path or not os.path.exists(path): return ''
    ext = os.path.splitext(path)[1].lower().strip('.')
    return 'data:image/%s;base64,%s' % ('jpeg' if ext in ('jpg', 'jpeg') else ext, base64.b64encode(open(path, 'rb').read()).decode())


EASTERN = {'SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'YE', 'IQ', 'SY', 'JO', 'LB', 'PS', 'EG', 'SD'}
_TXT = __import__('re').compile(r'(<style.*?</style>|<script.*?</script>|<[^>]*>)', __import__('re').S)
_EAST = str.maketrans('0123456789', '٠١٢٣٤٥٦٧٨٩')


def digit_style(cfg):
    d = cfg.get('digits') or 'auto'
    if d == 'auto':
        return 'eastern' if cfg.get('country') in EASTERN else 'western'
    return d


def digits(html_doc, cfg):
    """Arabic-Indic digits (٠١٢…, Mashriq) or Western digits (012…, Maghreb/Europe) in the sheet text only."""
    if digit_style(cfg) != 'eastern':
        return html_doc
    parts = _TXT.split(html_doc)
    return ''.join(p if (p.startswith('<')) else p.translate(_EAST) for p in parts)


def fmt_date(d):
    return '%02d/%02d/%d' % (d.day, d.month, d.year)


def render_html(M, cfg, theme=None, font_base='/fonts/'):
    theme = theme or cfg.get('theme', 'glass')
    L = 1 if cfg.get('lang2', 'fr') == 'fr' else 2       # index of the 2nd language in tuples
    l2 = 'fr' if L == 1 else 'en'
    e = html.escape
    G_AR = greg_ar(cfg['country'])
    rows = M['rows']
    g0, g1 = rows[0]['date'], rows[-1]['date']
    gar = G_AR[g0.month - 1] + (' – ' + G_AR[g1.month - 1] if g1.month != g0.month else '')
    g2 = GREG[l2][g0.month - 1] + (' – ' + GREG[l2][g1.month - 1] if g1.month != g0.month else '')
    gyear = str(g0.year) if g0.year == g1.year else '%d – %d' % (g0.year, g1.year)
    nm = 1 if M['mois'] == 12 else M['mois'] + 1
    today = dt.date.today()
    tr = []
    for i, r in enumerate(rows):
        d = r['date']; wd = d.weekday()
        cls = [c for c, ok in (('fri', wd == 4), ('sun', wd == 6), ('ev', bool(r['events'])), ('today', d == today),
                               ('next', r['is_next']), ('unc', r['uncertain'])) if ok]
        if i == 12:
            side = '<td class="side" rowspan="3"><div class="vbadge">%s</div></td>' % UI['white_badge'][0]
        elif i in (13, 14):
            side = ''
        elif i == 28:
            side = '<td class="side"><div class="moonb">%s</div></td>' % CRESCENT
        else:
            side = '<td class="side"></td>'
        hd = '01' if r['is_next'] else ('30*' if r['uncertain'] else '%02d' % r['hday'])
        gd = '%02d' % d.day
        if i == 0 or d.day == 1:
            gd += '<i>%s</i>' % G_AR[d.month - 1]
        tr.append('<tr class="%s">%s<td class="day">%s<small>%s</small></td><td class="hd">%s</td><td class="gd">%s</td>'
                  '<td class="t acc">%s</td><td class="t">%s</td><td class="t acc">%s</td><td class="t">%s</td>'
                  '<td class="t acc">%s</td><td class="t isha">%s</td></tr>'
                  % (' '.join(cls), side, DAYS['ar'][wd], DAYS[l2][wd], hd, gd, *r['times']))

    evs = []
    for r in rows:
        for ev in r['events']:
            evs.append('<li><i class="dot %s"></i><span class="dt">%s · %s</span><span>%s</span><span class="fr">%s</span></li>'
                       % (ev[3], DAYS['ar'][r['date'].weekday()], fmt_date(r['date']), e(ev[0]), e(ev[L])))
    evs.append('<li><i class="dot relig"></i><span class="dt"><bdi dir="ltr">%s – %s</bdi></span><span>%s</span>'
               '<span class="fr">%s</span></li>' % (fmt_date(rows[12]['date'])[:5], fmt_date(rows[14]['date']),
                                                     UI['white'][0], UI['white'][L]))
    d29 = rows[28]['date']
    evs.append('<li><i class="dot relig"></i><span class="dt">%s · %s</span><span>%s</span><span class="fr">%s</span></li>'
               % (DAYS['ar'][d29.weekday()], fmt_date(d29), UI['crescent'][0] % HIJRI['ar'][nm - 1], UI['crescent'][L]))
    chips = ''.join('<div class="%s">%s<span>%s %s</span></div>'
                    % ('chip ram' if n['mois'] == 9 else 'chip', HIJRI['ar'][n['mois'] - 1], DAYS[l2][n['debut'].weekday()],
                       fmt_date(n['debut'])) for n in M['nxt'])
    note = []
    if not M['length_known']: note.append(UI['unc'][0])
    if M['calc_used']: note.append(UI['calc'][0])
    foot_note = (' · ' + ' · '.join(note)) if note else ''
    month_ar = HIJRI['ar'][M['mois'] - 1]

    if cfg['country'] == 'MA' and cfg.get('method') == 'MOROCCO':
        source = 'المصدر: وزارة الأوقاف والشؤون الإسلامية' + (' · التوقيت +1 ساعة' if cfg.get('morocco_plus1') else ' · التوقيت الرسمي (GMT)')
        source_r = 'habous.gov.ma'
    else:
        from .calc import METHODS
        source = 'طريقة الحساب: ' + METHODS[cfg['method']]['ar'] + (' · العصر: حنفي' if int(cfg.get('asr', 1)) == 2 else '')
        source_r = cfg.get('tz', '')

    mosque = (cfg.get('mosque_name') or '').strip()
    img = image_data(cfg.get('mosque_image'))
    emblem = ('<div class="emblem photo"><img src="%s"></div>' % img) if img else '<div class="emblem">%s</div>' % CRESCENT
    city_ar = cfg.get('city_ar') or cfg.get('city_name', '')
    if mosque:
        left = ('<div class="h-left has-mosque"><div class="h-title">%s</div><div class="h-sub2">%s %s · %s</div></div>'
                % (e(mosque), UI['in_city'][0], e(city_ar), e(cfg.get('city_name', ''))))
    else:
        left = ('<div class="h-left"><div class="h-title">%s %s</div><div class="h-sub">%s</div></div>'
                % (UI['in_city'][0], e(city_ar), e(cfg.get('city_name', ''))))

    return digits(f'''<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>{e(month_ar)} {M['annee']}</title>
<style>{font_css(font_base)}{themes.css_for(theme)}{fonts_cfg.css(cfg, font_base)}</style></head><body class="t-{theme}">{DEFS}{BGDECO}
<div class="page">
 <div class="panel head">
  <div class="h-right"><div class="h-title">{UI['title'][0]}</div><div class="h-sub">{UI['title'][L]}</div></div>
  <div class="h-mid">{emblem}<div class="month">{e(month_ar)}</div>
   <div class="month-fr">{HIJRI[l2][M['mois'] - 1]} {M['annee']}</div></div>
  {left}
  {MOSQUE}
 </div>
 <div class="meta"><span><b>{M['annee']} هـ</b> · {gar} {gyear} · <span class="fr">{g2} {gyear}</span></span>
  <span class="dua">{e(cfg.get('dua', ''))}</span></div>
 <div class="panel tbl"><table>
  <thead><tr><th class="side"></th><th class="c1">{UI['day'][0]}<small>{UI['day'][L]}</small></th><th>{e(month_ar)}<small>{UI['hijri'][L]}</small></th>
  <th>{gar}<small>{g2}</small></th>
  <th>{UI['fajr'][0]}<small>{UI['fajr'][L]}</small></th><th>{UI['sunrise'][0]}<small>{UI['sunrise'][L]}</small></th>
  <th>{UI['dhuhr'][0]}<small>{UI['dhuhr'][L]}</small></th><th>{UI['asr'][0]}<small>{UI['asr'][L]}</small></th>
  <th>{UI['maghrib'][0]}<small>{UI['maghrib'][L]}</small></th><th class="cl">{UI['isha'][0]}<small>{UI['isha'][L]}</small></th></tr></thead>
  <tbody>{''.join(tr)}</tbody></table></div>
 <div class="bottom">
  <div class="panel card"><h3>{UI['events'][0]} <small>{UI['events'][L]}</small></h3><ul class="evl">{''.join(evs)}</ul></div>
  <div class="panel card"><h3>{UI['next'][0]} <small>{UI['next'][L]}</small></h3><div class="chips">{chips}</div></div>
 </div>
 <div class="foot"><span>{e(source)}{foot_note}</span><span>{e(source_r)} · {dt.date.today().strftime('%d/%m/%Y')}</span></div>
</div></body></html>''', cfg)


HIZB_CSS = """
.hz-meta { justify-content: center; gap: 18px; font-size: 15px; padding: 6px 10px }
.hz { flex: 1 1 auto !important; display: grid; grid-template-rows: minmax(0, 1fr) minmax(0, 1fr); gap: 14px; min-height: 0 }
.hz .card { min-height: 0; overflow: hidden }
.hz .card { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 16px 30px; gap: 6px }
.hz .when { display: flex; align-items: center; gap: 12px; font-size: 22px; font-weight: 700 }
.hz .when small { font-family: 'Segoe UI', 'UILatin'; font-size: 13px; font-weight: 600; opacity: .7; letter-spacing: .5px }
.hz .num { font-family: 'Noto Kufi Arabic'; font-weight: 800; font-size: 52px; line-height: 1.15 }
.hz .num small { display: block; margin-top: 6px; font-family: 'Segoe UI', 'UILatin'; font-size: 15px; font-weight: 600; letter-spacing: 1px; opacity: .7 }
.hz .rng { display: flex; flex-direction: column; align-items: center; gap: 2px; width: 100% }
.hz .rng .lb { display: inline-flex; gap: 8px; align-items: center; font-size: 14px; font-weight: 700; padding: 2px 16px; border-radius: 999px; border: 1px solid currentColor; margin-top: 6px }
.hz .rng .lb i { font-style: normal; opacity: .65 } .hz .rng .lb b { font-family: 'Noto Kufi Arabic' }
.hz .words { font-family: 'Amiri'; font-weight: 700; font-size: 31px; line-height: 1.55; text-align: center; width: 100%; padding: 0 4% }
.hz .words.end { font-size: 27px; opacity: .85 }
.hz .words::before { content: '\\FD3F\\00A0'; opacity: .55 } .hz .words::after { content: '\\00A0\\FD3E'; opacity: .55 }
.hz-dua { text-align: center; font-family: 'Amiri'; font-size: 17px; padding: 4px 10px }
"""

HIZB_LAND_CSS = """
html, body { width: 1123px !important; height: 794px !important }
.page { padding: 14px 20px 10px }
.head { min-height: 96px; padding: 8px 22px }
.hz { grid-template-rows: minmax(0, 1fr) }
.hz .card { padding: 14px 40px }
.hz .when { font-size: 30px }
.hz .num { font-size: 60px }
.hz .words { font-size: 44px }
.hz .words.end { font-size: 38px }
"""

# Large font sizes never overflow: shrink the hizb card content until it fits its card.
AUTOFIT = '''<script>(function () {
 function fit() {
  document.querySelectorAll('.hz .card').forEach(function (c) {
    var els = c.querySelectorAll('.words, .num, .when, .lb');
    c.style.justifyContent = 'flex-start';                 // measure from the top, then centre again
    var over = function () { return c.scrollHeight > c.clientHeight + 1 || c.scrollWidth > c.clientWidth + 1; };
    for (var k = 0; k < 80 && over(); k++)
      els.forEach(function (e) { var z = parseFloat(e.style.zoom || getComputedStyle(e).zoom) || 1; e.style.zoom = (z * 0.95).toFixed(3); });
    c.style.justifyContent = '';
  });
 }
 fit();                                                     // fallback fonts
 if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);   // again with the real fonts
 window.addEventListener('load', fit);
})();</script>'''

ORD_AR = ['الأول', 'الثاني', 'الثالث', 'الرابع', 'الخامس', 'السادس', 'السابع', 'الثامن', 'التاسع', 'العاشر',
          'الحادي عشر', 'الثاني عشر', 'الثالث عشر', 'الرابع عشر', 'الخامس عشر', 'السادس عشر', 'السابع عشر',
          'الثامن عشر', 'التاسع عشر', 'العشرون', 'الحادي والعشرون', 'الثاني والعشرون', 'الثالث والعشرون',
          'الرابع والعشرون', 'الخامس والعشرون', 'السادس والعشرون', 'السابع والعشرون', 'الثامن والعشرون',
          'التاسع والعشرون', 'الثلاثون']


def render_hizb_html(H, cfg, theme=None, font_base='/fonts/'):
    """Reusable daily-reading sheet (no dates): the hizb after Sobh and the one after Isha, with the sura,
    verse number and words where each hizb starts and ends."""
    theme = theme or cfg.get('theme', 'glass')
    L = 1 if cfg.get('lang2', 'fr') == 'fr' else 2
    e = html.escape
    day = (H['fajr']['n'] + 1) // 2                      # day of the monthly khatma (2 hizbs a day)
    mosque = (cfg.get('mosque_name') or '').strip()
    img = image_data(cfg.get('mosque_image'))
    emblem = ('<div class="emblem photo"><img src="%s"></div>' % img) if img else '<div class="emblem">%s</div>' % CRESCENT
    city_ar = cfg.get('city_ar') or cfg.get('city_name', '')
    if mosque:
        left = ('<div class="h-left has-mosque"><div class="h-title">%s</div><div class="h-sub2">%s %s · %s</div></div>'
                % (e(mosque), UI['in_city'][0], e(city_ar), e(cfg.get('city_name', ''))))
    else:
        left = ('<div class="h-left"><div class="h-title">%s %s</div><div class="h-sub">%s</div></div>'
                % (UI['in_city'][0], e(city_ar), e(cfg.get('city_name', ''))))

    qf = fonts_cfg.quran_font(cfg, H.get('riwaya') or 'warsh')
    qt = lambda s: e(fonts_cfg.quran_text(s, qf))

    def card(h, label, label2):
        return ('<div class="panel card"><div class="when">%s <small>%s</small></div>'
                '<div class="num month">الحزب %d<small dir="ltr">Hizb \u2066%d\u2069 / \u206660\u2069</small></div>'
                '<div class="rng"><span class="lb"><i>بدايته</i> سورة %s · الآية <b>%d</b></span><div class="words">%s</div>'
                '<span class="lb"><i>نهايته</i> سورة %s · الآية <b>%d</b></span><div class="words end">%s</div></div></div>'
                % (label, label2, h['n'], h['n'], e(h['sura_name']), h['aya'], qt(h['words']),
                   e(h['end_sura_name']), h['end_aya'], qt(h['end_words'])))

    warsh = H.get('riwaya') == 'warsh'
    src = ('رواية ورش عن نافع · تقسيم الأحزاب وترقيم الآيات حسب المصحف المغربي · النص: مجمع الملك فهد' if warsh
           else 'رواية حفص عن عاصم · ترقيم الآيات الكوفي · النص: مشروع تنزيل tanzil.net')
    day_ar = ORD_AR[day - 1] if 1 <= day <= 30 else str(day)
    part = H.get('part')
    cards = {'fajr': card(H['fajr'], 'بعد صلاة الصبح', 'Après Fajr' if L == 1 else 'After Fajr'),
             'isha': card(H['isha'], 'بعد صلاة العشاء', "Après Ichaa" if L == 1 else 'After Isha')}
    body_cards = cards[part] if part else cards['fajr'] + cards['isha']
    land_css = HIZB_LAND_CSS if part else ''
    return digits(f'''<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>حزب اليوم {day}</title>
<style>{font_css(font_base)}{themes.css_for(theme)}{HIZB_CSS}{land_css}{fonts_cfg.css(cfg, font_base, H.get('riwaya'))}</style></head><body class="t-{theme}">{DEFS}{BGDECO}
<div class="page">
 <div class="panel head">
  <div class="h-right"><div class="h-title">الحزب الراتب</div><div class="h-sub">{'Lecture quotidienne du Coran' if L == 1 else 'Daily Quran reading'}</div></div>
  <div class="h-mid">{emblem}<div class="month">اليوم {day_ar}</div>
   <div class="month-fr" dir="ltr">{'Jour' if L == 1 else 'Day'} \u2066{day}\u2069 / \u206630\u2069</div></div>
  {left}
  {MOSQUE}
 </div>
 <div class="meta hz-meta"><span><b>ختمة كل شهر</b> · حزبان في اليوم</span><span>{'رواية ورش عن نافع' if warsh else 'رواية حفص عن عاصم'}</span></div>
 <div class="hz">
  {body_cards}
 </div>
 <div class="hz-dua dua">{e(cfg.get('dua', '') or 'خيركم من تعلّم القرآن وعلّمه')}</div>
 <div class="foot"><span>{src}</span><span dir="ltr">\u2066{day}\u2069 / \u206630\u2069</span></div>
</div>{AUTOFIT}</body></html>''', cfg)
