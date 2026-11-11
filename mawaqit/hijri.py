"""Hijri calendar: Moroccan announcements, Umm al-Qura, or local crescent-visibility estimate."""
import datetime as dt, re
import ephem
from hijridate import Gregorian, Hijri

D = dt.timedelta


# ---------------------------------------------------------------- crescent visibility
def evening_params(day, lat, lon):
    o = ephem.Observer(); o.lat, o.lon = str(lat), str(lon); o.pressure = 0; o.horizon = '-0:50'
    o.date = ephem.Date(dt.datetime(day.year, day.month, day.day, 12) - D(hours=lon / 15))
    try:
        sunset = o.next_setting(ephem.Sun())
        o.date = sunset
        moonset = o.next_setting(ephem.Moon())
    except (ephem.AlwaysUpError, ephem.NeverUpError):
        return None
    m, s = ephem.Moon(o), ephem.Sun(o)
    nm = ephem.previous_new_moon(sunset)
    return dict(lag=(moonset - sunset) * 1440, age=(sunset - nm) * 24,
                alt=float(m.alt) * 57.2958, elong=float(ephem.separation(m, s)) * 57.2958)


def visible(day, lat, lon):
    """Naked-eye criterion calibrated on Moroccan announcements (lag >= 29 min, age >= 15 h, elongation >= 10.5 deg)."""
    p = evening_params(day, lat, lon)
    return bool(p) and p['lag'] >= 29 and p['age'] >= 15 and p['elong'] >= 10.5


def next_start_visibility(prev_start, lat, lon):
    d29 = prev_start + D(days=28)
    return d29 + D(days=1) if visible(d29, lat, lon) else d29 + D(days=2)


def hijri_label(day):
    h = Gregorian(day.year, day.month, day.day).to_hijri()
    return h.month, h.year


# ---------------------------------------------------------------- month lists
def month_at(day, cfg, official=None):
    """Return dict(debut, mois, annee, duree, known) for the Hijri month containing `day`, plus a generator for next months."""
    mode = cfg.get('hijri_mode', 'ummalqura')
    adj = int(cfg.get('hijri_adjust', 0))
    lat, lon = cfg['lat'], cfg['lon']

    if mode == 'morocco' and official:
        cand = [m for m in official if m['debut'] <= day and
                (m['duree'] is None or day < m['debut'] + D(days=m['duree']))]
        if cand:
            cur = dict(cand[-1]); cur['known'] = cur['duree'] is not None
            if cur['duree'] is None:
                cur['est_next'] = next_start_visibility(cur['debut'], 33.5731, -7.5898)
            return cur
        mode = 'visibility'

    if mode in ('visibility', 'morocco'):
        nm = ephem.Date(ephem.previous_new_moon(ephem.Date(dt.datetime(day.year, day.month, day.day, 23))))
        for back in (0, 1):
            conj = (nm.datetime() if back == 0 else ephem.Date(ephem.previous_new_moon(nm - 1)).datetime()).date()
            start = None
            for k in range(0, 4):
                if visible(conj + D(days=k), lat, lon):
                    start = conj + D(days=k + 1); break
            start = start or conj + D(days=2)
            start += D(days=adj)
            if start <= day:
                nxt = next_start_visibility(start - D(days=adj), lat, lon) + D(days=adj)
                if nxt <= day:
                    start, nxt = nxt, next_start_visibility(nxt - D(days=adj), lat, lon) + D(days=adj)
                m, y = hijri_label(start + D(days=10))
                return dict(debut=start, mois=m, annee=y, duree=(nxt - start).days, known=False, est_next=nxt)
            nm = ephem.Date(ephem.previous_new_moon(nm - 1))
        raise RuntimeError('month not found')

    # Umm al-Qura (tabular official calendar of Saudi Arabia) with optional shift
    base = day - D(days=adj)
    h = Gregorian(base.year, base.month, base.day).to_hijri()
    first = Hijri(h.year, h.month, 1).to_gregorian()
    start = dt.date(first.year, first.month, first.day) + D(days=adj)
    return dict(debut=start, mois=h.month, annee=h.year, duree=Hijri(h.year, h.month, 1).month_length(), known=True)


def following(cur, cfg, official=None, n=6):
    """Upcoming month starts after `cur`."""
    mode = cfg.get('hijri_mode', 'ummalqura')
    lat, lon = (33.5731, -7.5898) if mode == 'morocco' else (cfg['lat'], cfg['lon'])
    out = []
    m, y = cur['mois'], cur['annee']
    start = cur['debut'] + D(days=cur['duree']) if cur.get('duree') else cur['est_next']
    for _ in range(n):
        m, y = (1, y + 1) if m == 12 else (m + 1, y)
        off = [o for o in (official or []) if o['mois'] == m and o['annee'] == y]
        if off:
            start = off[0]['debut']
        out.append(dict(mois=m, annee=y, debut=start, official=bool(off)))
        if mode == 'ummalqura':
            nx = month_at(start, cfg)
            start = nx['debut'] + D(days=nx['duree'])
        else:
            adj = int(cfg.get('hijri_adjust', 0)) if mode == 'visibility' else 0
            start = next_start_visibility(start - D(days=adj), lat, lon) + D(days=adj)
    return out


def parse_habous_hijri(text):
    out = []
    for m in re.finditer(r"debut:\s*'(\d{4}-\d\d-\d\d)',\s*mois:\s*(\d+),\s*annee:\s*(\d+),\s*duree:\s*(null|\d+)", text or ''):
        out.append(dict(debut=dt.date.fromisoformat(m[1]), mois=int(m[2]), annee=int(m[3]),
                        duree=None if m[4] == 'null' else int(m[4])))
    return out
