"""HTML of the monthly sheet (theme-aware, bilingual: Arabic + French/English)."""
import html, datetime as dt, pathlib
from . import themes
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

    return f'''<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>{e(month_ar)} {M['annee']}</title>
<style>{font_css(font_base)}{themes.css_for(theme)}</style></head><body class="t-{theme}">{DEFS}{BGDECO}
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
</div></body></html>'''


HIZB_CSS = """
.hz-meta { justify-content: center; gap: 18px; font-size: 15px; padding: 6px 10px }
.hz { flex: 1 1 auto !important; display: grid; grid-template-rows: 1fr 1fr; gap: 14px; min-height: 0 }
.hz .card { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; padding: 18px 30px; gap: 10px }
.hz .when { display: flex; align-items: center; gap: 12px; font-size: 22px; font-weight: 700 }
.hz .when small { font-family: 'Segoe UI', 'UILatin'; font-size: 13px; font-weight: 600; opacity: .7; letter-spacing: .5px }
.hz .when .tm { font-family: 'Segoe UI', 'UILatin'; font-size: 15px; padding: 2px 10px; border-radius: 999px; border: 1px solid currentColor; opacity: .85 }
.hz .num { font-family: 'Noto Kufi Arabic'; font-weight: 800; font-size: 66px; line-height: 1.15 }
.hz .num small { display: block; margin-top: 6px; font-family: 'Segoe UI', 'UILatin'; font-size: 15px; font-weight: 600; letter-spacing: 1px; opacity: .7 }
.hz .card { gap: 6px !important }
.hz .num { font-size: 52px !important }
.hz .rng { display: flex; flex-direction: column; align-items: center; gap: 2px; width: 100% }
.hz .rng .lb { font-size: 12px; font-weight: 700; padding: 1px 12px; border-radius: 999px; border: 1px solid currentColor; opacity: .65; margin-top: 4px }
.hz .words { font-family: 'Amiri'; font-weight: 700; font-size: 31px; line-height: 1.55; text-align: center; width: 100%; padding: 0 4% }
.hz .words.end { font-size: 27px; opacity: .85 }
.hz .words::before { content: '\\FD3F  '; opacity: .55 } .hz .words::after { content: '  \\FD3E'; opacity: .55 }
.hz .where { font-size: 15px; opacity: .8 }
.hz-dua { text-align: center; font-family: 'Amiri'; font-size: 17px; padding: 4px 10px }
"""


def render_hizb_html(H, cfg, theme=None, font_base='/fonts/'):
    """One-page sheet: today's hizb after Sobh and after Isha, with the date and the opening words."""
    theme = theme or cfg.get('theme', 'glass')
    L = 1 if cfg.get('lang2', 'fr') == 'fr' else 2
    l2 = 'fr' if L == 1 else 'en'
    e = html.escape
    d = H['date']
    G_AR = greg_ar(cfg['country'])
    hijri = ('%d %s %d هـ' % (H['hday'], HIJRI['ar'][H['mois'] - 1], H['annee'])) if H['hday'] else ''
    hijri2 = ('%d %s %d' % (H['hday'], HIJRI[l2][H['mois'] - 1], H['annee'])) if H['hday'] else ''
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

    def card(h, label, label2, t):
        s1, s2 = h['sura_name'], h['end_sura_name']
        where = ('من أول ' if h['start_of_sura'] else 'من ') + 'سورة ' + s1
        if h['end_of_sura']:
            where += ' إلى آخر ' + ('السورة' if s2 == s1 else 'سورة ' + s2)
        elif s2 != s1:
            where += ' إلى سورة ' + s2
        tm = '<span class="tm">%s</span>' % t if t else ''
        return ('<div class="panel card"><div class="when">%s <small>%s</small>%s</div>'
                '<div class="num month">الحزب %d<small>Hizb %d / 60</small></div>'
                '<div class="rng"><span class="lb">بدايته</span><div class="words">%s</div>'
                '<span class="lb">نهايته</span><div class="words end">%s</div></div>'
                '<div class="where">%s</div></div>'
                % (label, label2, tm, h['n'], h['n'], e(h['words']), e(h['end_words']), e(where)))

    t = H['times'] or [None] * 6
    return f'''<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>حزب اليوم {d.isoformat()}</title>
<style>{font_css(font_base)}{themes.css_for(theme)}{HIZB_CSS}</style></head><body class="t-{theme}">{DEFS}{BGDECO}
<div class="page">
 <div class="panel head">
  <div class="h-right"><div class="h-title">حزب اليوم</div><div class="h-sub">{'Hizb du jour' if L == 1 else "Today's hizb"}</div></div>
  <div class="h-mid">{emblem}<div class="month">{DAYS['ar'][d.weekday()]}</div>
   <div class="month-fr">{DAYS[l2][d.weekday()]} {fmt_date(d)}</div></div>
  {left}
  {MOSQUE}
 </div>
 <div class="meta hz-meta"><span><b>{e(hijri)}</b></span><span>{d.day} {G_AR[d.month - 1]} {d.year}</span>
  <span class="fr"><bdi dir="ltr">{e(hijri2)}</bdi></span></div>
 <div class="hz">
  {card(H['fajr'], 'بعد صلاة الصبح', 'Après Fajr' if L == 1 else 'After Fajr', t[0])}
  {card(H['isha'], 'بعد صلاة العشاء', "Après Ichaa" if L == 1 else 'After Isha', t[5])}
 </div>
 <div class="hz-dua dua">{e(cfg.get('dua', '') or 'خيركم من تعلّم القرآن وعلّمه')}</div>
 <div class="foot"><span>تقسيم القرآن الكريم إلى ستين حزباً · النص القرآني: مشروع تنزيل tanzil.net</span><span>{fmt_date(d)}</span></div>
</div></body></html>'''
