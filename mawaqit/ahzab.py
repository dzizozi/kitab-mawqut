"""Daily Quran reading (Moroccan custom): one hizb after Fajr (Sobh) and one after Isha.
The 60 hizbs and their opening words come from data/ahzab.json (Tanzil Project, built by tools/build_ahzab.py)."""
import json, os, datetime as dt
from . import paths

_DATA = None


RIWAYAT = (('warsh', 'ورش عن نافع (المغرب)'), ('hafs', 'حفص عن عاصم'))


def data():
    global _DATA
    if _DATA is None:
        _DATA = json.load(open(os.path.join(paths.DATA_RES, 'ahzab.json'), encoding='utf-8'))
    return _DATA


def riwaya(cfg):
    r = (cfg or {}).get('riwaya')
    return r if r in ('warsh', 'hafs') else ('warsh' if (cfg or {}).get('country', 'MA') == 'MA' else 'hafs')


def ahzab(r='warsh'):
    return data()[r if r in ('warsh', 'hafs') else 'warsh']


def nxt(n, k=1):
    """Hizb number after n (60 -> 1)."""
    return (int(n) - 1 + k) % 60 + 1


def choices(r='warsh'):
    return [[h['n'], h['sura_name'], h['words']] for h in ahzab(r)]


def day_model(cfg, day=None, fajr=None, isha=None):
    """Data of one reusable (undated) hizb sheet."""
    fajr = int(fajr or cfg.get('hizb_fajr') or 1)
    isha = int(isha or cfg.get('hizb_isha') or nxt(fajr))
    r = riwaya(cfg)
    A = ahzab(r)
    return dict(riwaya=r, key='%s-%02d-%02d' % (r, fajr, isha), fajr=A[fajr - 1], isha=A[isha - 1], part=None)


def day_pages(cfg, fajr, isha):
    """Pages of one day: portrait = one page with both hizbs; landscape = one page per prayer
    (cfg hizb_part: both / fajr / isha)."""
    H = day_model(cfg, None, fajr, isha)
    if cfg.get('hizb_layout') != 'landscape':
        return [H]
    parts = {'fajr': ['fajr'], 'isha': ['isha']}.get(cfg.get('hizb_part'), ['fajr', 'isha'])
    return [dict(H, part=p, key='%s-%s-L' % (H['key'], p)) for p in parts]
