"""Prayer-time calculation (astronomical, offline) with the internationally used methods."""
import math, datetime as dt
from zoneinfo import ZoneInfo
import ephem

KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha']

# fajr/isha: sun depression angle (deg); isha_min: fixed minutes after maghrib;
# maghrib: angle (Shia methods) ; adj: method minute adjustments
METHODS = {
    'MOROCCO':   dict(ar='المغرب – وزارة الأوقاف', en='Morocco – Ministry of Habous', fajr=19, isha=17),
    'MWL':       dict(ar='رابطة العالم الإسلامي', en='Muslim World League', fajr=18, isha=17, adj=dict(dhuhr=1)),
    'MAKKAH':    dict(ar='أم القرى – مكة المكرمة', en='Umm al-Qura, Makkah', fajr=18.5, isha_min=90, isha_min_ramadan=120),
    'EGYPT':     dict(ar='الهيئة المصرية العامة للمساحة', en='Egyptian General Authority of Survey', fajr=19.5, isha=17.5),
    'KARACHI':   dict(ar='جامعة العلوم الإسلامية – كراتشي', en='University of Islamic Sciences, Karachi', fajr=18, isha=18, adj=dict(dhuhr=1)),
    'ISNA':      dict(ar='الجمعية الإسلامية لأمريكا الشمالية', en='ISNA – North America', fajr=15, isha=15, adj=dict(dhuhr=1)),
    'FRANCE':    dict(ar='اتحاد المنظمات الإسلامية بفرنسا (12°)', en='UOIF – France (12°)', fajr=12, isha=12),
    'TURKEY':    dict(ar='رئاسة الشؤون الدينية التركية', en='Diyanet – Türkiye', fajr=18, isha=17,
                      adj=dict(sunrise=-7, dhuhr=5, asr=4, maghrib=7)),
    'GULF':      dict(ar='منطقة الخليج', en='Gulf Region', fajr=19.5, isha_min=90),
    'KUWAIT':    dict(ar='الكويت', en='Kuwait', fajr=18, isha=17.5),
    'QATAR':     dict(ar='قطر', en='Qatar', fajr=18, isha_min=90),
    'DUBAI':     dict(ar='دبي – الإمارات', en='Dubai (UAE)', fajr=18.2, isha=18.2, adj=dict(sunrise=-3, dhuhr=3, asr=3, maghrib=3)),
    'ALGERIA':   dict(ar='الجزائر – وزارة الشؤون الدينية', en='Algeria', fajr=18, isha=17, adj=dict(maghrib=3)),
    'TUNISIA':   dict(ar='تونس', en='Tunisia', fajr=18, isha=18),
    'JORDAN':    dict(ar='الأردن', en='Jordan', fajr=18, isha=18, adj=dict(maghrib=5)),
    'SINGAPORE': dict(ar='سنغافورة', en='Singapore (MUIS)', fajr=20, isha=18, adj=dict(dhuhr=1)),
    'JAKIM':     dict(ar='ماليزيا – جاكيم', en='Malaysia (JAKIM)', fajr=20, isha=18, adj=dict(dhuhr=1)),
    'KEMENAG':   dict(ar='إندونيسيا – وزارة الشؤون الدينية', en='Indonesia (Kemenag)', fajr=20, isha=18, adj=dict(dhuhr=2)),
    'RUSSIA':    dict(ar='روسيا', en='Russia (Spiritual Administration)', fajr=16, isha=15),
    'PORTUGAL':  dict(ar='البرتغال', en='Portugal (Islamic Community of Lisbon)', fajr=18, isha_min=77),
    'TEHRAN':    dict(ar='معهد الجيوفيزياء – طهران', en='Institute of Geophysics, Tehran', fajr=17.7, isha=14, maghrib=4.5),
    'JAFARI':    dict(ar='الجعفري – قم', en='Shia Ithna-Ashari (Jafari)', fajr=16, isha=14, maghrib=4),
}
METHOD_ORDER = list(METHODS)

COUNTRY_METHOD = {
    'MA': 'MOROCCO', 'DZ': 'ALGERIA', 'TN': 'TUNISIA', 'LY': 'EGYPT', 'EG': 'EGYPT', 'SD': 'EGYPT', 'SY': 'EGYPT',
    'LB': 'EGYPT', 'IQ': 'MWL', 'PS': 'JORDAN', 'JO': 'JORDAN', 'SA': 'MAKKAH', 'YE': 'MAKKAH', 'OM': 'GULF',
    'AE': 'DUBAI', 'BH': 'GULF', 'QA': 'QATAR', 'KW': 'KUWAIT', 'TR': 'TURKEY', 'IR': 'TEHRAN', 'PK': 'KARACHI',
    'IN': 'KARACHI', 'BD': 'KARACHI', 'AF': 'KARACHI', 'MY': 'JAKIM', 'SG': 'SINGAPORE', 'ID': 'KEMENAG',
    'BN': 'SINGAPORE', 'RU': 'RUSSIA', 'US': 'ISNA', 'CA': 'ISNA', 'FR': 'FRANCE', 'PT': 'PORTUGAL', 'MR': 'MWL',
}
HANAFI_COUNTRIES = {'PK', 'IN', 'BD', 'AF'}

# Morocco: calibrated against the Ministry tables (Casablanca, Oct-Nov 2026): 95-100 % exact, max 1 min.
MOROCCO_CALIB = dict(fajr=(-0.7, 'ceil'), sunrise=(-2.4, 'ceil'), dhuhr=(4.8, 'ceil'),
                     asr=(1.0, 'floor'), maghrib=(2.9, 'ceil'), isha=(0.3, 'round'))
_ROUND = {'round': round, 'ceil': math.ceil, 'floor': math.floor}


def _observer(lat, lon, horizon='-0:50'):
    o = ephem.Observer(); o.lat, o.lon = str(lat), str(lon); o.elevation = 0; o.pressure = 0; o.horizon = horizon
    return o


def _event(o, body, start, rising, use_center=True):
    o.date = start
    try:
        return o.previous_rising(body, use_center=use_center) if rising else o.next_setting(body, use_center=use_center)
    except (ephem.AlwaysUpError, ephem.NeverUpError):
        return None


def raw_events(lat, lon, day, method):
    """UTC datetimes for one local civil day (approximate local noon from longitude)."""
    m = METHODS[method]
    sun = ephem.Sun()
    o = _observer(lat, lon)
    o.date = ephem.Date(dt.datetime(day.year, day.month, day.day, 12) - dt.timedelta(hours=lon / 15)) - 0.5
    transit = o.next_transit(sun)
    uc = method != 'MOROCCO'     # Morocco calibration was made with the upper-limb convention
    sunrise = _event(o, sun, transit, True, use_center=uc)
    sunset = _event(o, sun, transit, False, use_center=uc)
    # asr
    o.date = transit; sun.compute(o)
    decl, phi = float(sun.dec), math.radians(lat)
    noon_alt = math.pi / 2 - abs(phi - decl)
    out = dict(dhuhr=transit, sunrise=sunrise, maghrib=sunset)
    for factor in (1, 2):
        alt = math.atan(1 / (factor + 1 / math.tan(noon_alt)))
        oa = _observer(lat, lon, str(math.degrees(alt)))
        out['asr%d' % factor] = _event(oa, sun, transit, False)
    of = _observer(lat, lon, str(-m['fajr']))
    out['fajr'] = _event(of, sun, transit, True)
    if 'maghrib' in m:
        out['maghrib'] = _event(_observer(lat, lon, str(-m['maghrib'])), sun, transit, False)
    if 'isha' in m:
        out['isha'] = _event(_observer(lat, lon, str(-m['isha'])), sun, transit, False)
    # high latitudes: angle-based rule when twilight never ends
    if sunrise and sunset:
        night = 1 - (sunset - sunrise)
        limit_f = night * m['fajr'] / 60
        if out['fajr'] is None or (abs(lat) > 48 and sunrise - out['fajr'] > limit_f):
            out['fajr'] = ephem.Date(sunrise - limit_f)
        if 'isha' in m:
            limit_i = night * m['isha'] / 60
            if out['isha'] is None or (abs(lat) > 48 and out['isha'] - sunset > limit_i):
                out['isha'] = ephem.Date(sunset + limit_i)
    return out


def times(lat, lon, day, method='MWL', asr=1, tz='UTC', tune=None, ramadan=False, plus_minutes=0):
    """Returns ['HH:MM' x6] in local time of tz."""
    m = METHODS[method]; tune = tune or {}
    ev = raw_events(lat, lon, day, method)
    zone = ZoneInfo(tz)
    res = {}
    for k in KEYS:
        v = ev['asr%d' % asr] if k == 'asr' else ev.get(k)
        if k == 'isha' and 'isha_min' in m:
            v = ev['maghrib'] and ephem.Date(ev['maghrib'] + (m['isha_min_ramadan'] if ramadan and 'isha_min_ramadan' in m
                                                             else m['isha_min']) / 1440)
        if v is None:
            res[k] = '--:--'; continue
        utc = ephem.Date(v).datetime().replace(tzinfo=dt.timezone.utc)
        if method == 'MOROCCO':
            loc = utc.replace(tzinfo=None) + dt.timedelta(minutes=plus_minutes)    # Ministry tables are in GMT
            off, mode = MOROCCO_CALIB[k]
        else:
            loc = utc.astimezone(zone).replace(tzinfo=None) + dt.timedelta(minutes=plus_minutes)
            off, mode = m.get('adj', {}).get(k, 0), 'round'
        mins = loc.hour * 60 + loc.minute + loc.second / 60 + off + tune.get(k, 0)
        mins = _ROUND[mode](mins) % 1440
        res[k] = '%02d:%02d' % divmod(int(mins), 60)
    return [res[k] for k in KEYS]
