"""User settings + offline places database."""
import json, gzip, os, functools
from . import paths, calc

DEFAULTS = dict(
    country='MA', city_key='h58', city_name='Casablanca', city_ar='الدار البيضاء', lat=33.5731, lon=-7.5898, tz='Africa/Casablanca',
    habous_id=58, approx_coords=False, method='MOROCCO', asr=1, hijri_mode='morocco', hijri_adjust=0, morocco_plus1=False,
    tune=dict(fajr=0, sunrise=0, dhuhr=0, asr=0, maghrib=0, isha=0),
    lang2='fr', mosque_name='', mosque_image='', dua='',
    theme='glass', printer='', paper='A4', copies=1, auto_print=False,
    a4_copies=1, a4_printer='', a3_copies=0, a3_printer='', hizb_fajr=1, hizb_isha=2, mosques=[],
    font_title='noto_kufi', font_deco='amiri', font_text='noto_sans', font_quran='auto',
    size_title=100, size_table=100, size_cards=100, size_quran=100,
    hizb_layout='portrait', hizb_part='both', digits='auto',
)


def load():
    cfg = json.loads(json.dumps(DEFAULTS))      # deep copy (lists inside)
    saved = {}
    if os.path.exists(paths.CONFIG_F):
        try:
            saved = json.load(open(paths.CONFIG_F, encoding='utf-8'))
            cfg.update(saved)
        except Exception:
            pass
    if 'a4_copies' not in saved and saved:            # migrate v1.0–1.2 (one paper size)
        n = int(saved.get('copies', 1) or 1)
        big = saved.get('paper') == 'A3'
        cfg.update(a4_copies=0 if big else n, a3_copies=n if big else 0,
                   a4_printer=saved.get('printer', ''), a3_printer=saved.get('printer', ''))
    if not cfg.get('mosques') and (cfg.get('mosque_name') or '').strip():
        cfg['mosques'] = [dict(name=cfg['mosque_name'].strip(), image=cfg.get('mosque_image') or '')]
    return cfg


def print_jobs(cfg):
    """[(paper, copies, printer)] for every size with copies > 0 and a printer."""
    out = []
    for paper in ('A3', 'A4'):
        k = paper.lower()
        n, pr = int(cfg.get(k + '_copies') or 0), cfg.get(k + '_printer') or cfg.get('printer') or ''
        if n > 0 and pr:
            out.append((paper, n, pr))
    return out


def save(cfg):
    tmp = paths.CONFIG_F + '.tmp'
    json.dump(cfg, open(tmp, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    os.replace(tmp, paths.CONFIG_F)


@functools.lru_cache(1)
def places():
    with gzip.open(os.path.join(paths.DATA_RES, 'places.json.gz'), 'rt', encoding='utf-8') as fh:
        return json.load(fh)


@functools.lru_cache(1)
def habous_cities():
    return json.load(open(os.path.join(paths.DATA_RES, 'habous_cities.json'), encoding='utf-8'))


def countries():
    p = places()['countries']
    return sorted(([cc, v['ar'], v['fr'], v['en']] for cc, v in p.items()), key=lambda r: r[1])


def cities(cc):
    """[[key, display_ar, display_lat]] ; Morocco uses the official Ministry list."""
    if cc == 'MA':
        return [['h%d' % c['id'], c['ar'], c['fr'] or ''] for c in habous_cities()]
    return [['g%d' % i, c[1] or c[0], c[0]] for i, c in enumerate(places()['cities'].get(cc, []))]


def city_info(cc, key):
    if key.startswith('h'):
        c = next(x for x in habous_cities() if x['id'] == int(key[1:]))
        approx = c['lat'] is None    # small towns without coordinates: derived from Casablanca + offset
        return dict(city_ar=c['ar'], city_name=c['fr'] or c['ar'], lat=c['lat'] or 33.5883, lon=c['lon'] or -7.6114,
                    tz='Africa/Casablanca', habous_id=c['id'], approx_coords=approx)
    c = places()['cities'][cc][int(key[1:])]
    return dict(city_ar=c[1] or c[0], city_name=c[0], lat=c[2], lon=c[3], tz=c[4], habous_id=None, approx_coords=False)


def country_defaults(cc):
    method = calc.COUNTRY_METHOD.get(cc, 'MWL')
    hm = 'morocco' if cc == 'MA' else ('ummalqura' if cc in ('SA', 'YE', 'QA', 'BH', 'KW', 'AE', 'OM') else 'ummalqura')
    lang2 = 'fr' if cc in ('MA', 'DZ', 'TN', 'MR', 'FR', 'BE', 'SN', 'ML', 'NE', 'TD', 'CH', 'LU', 'CI', 'GN', 'BF', 'CM', 'KM', 'DJ', 'LB') else 'en'
    return dict(method=method, asr=2 if cc in calc.HANAFI_COUNTRIES else 1, hijri_mode=hm, hijri_adjust=0, lang2=lang2)
