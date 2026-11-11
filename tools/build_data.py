"""Build the bundled offline data (run once by the maintainer, output is committed):
  mawaqit/data/places.json.gz   countries + cities (GeoNames cities15000, CC-BY 4.0)
  mawaqit/data/habous_cities.json   Moroccan Ministry (Habous) city list with coordinates

Usage: python tools/build_data.py <dir with cities15000.txt + countryInfo.txt> <habous horaires-YYYY-MM.js>
"""
import sys, os, re, json, gzip, time, unicodedata
import requests
from babel import Locale

SRC, HAB = sys.argv[1], sys.argv[2]
OUT = os.path.join(os.path.dirname(__file__), '..', 'mawaqit', 'data')
os.makedirs(OUT, exist_ok=True)
AR = re.compile(r'^[\u0600-\u06FF\s\-]+$')
TASHKEEL = re.compile(r'[\u064B-\u0652\u0640]')


def norm_ar(s):
    s = TASHKEEL.sub('', s).replace('أ', 'ا').replace('إ', 'ا').replace('آ', 'ا').replace('ة', 'ه').replace('ى', 'ي')
    return re.sub(r'\s+', ' ', s).strip()


ar_loc, fr_loc, en_loc = Locale('ar'), Locale('fr'), Locale('en')
countries = {}
for line in open(os.path.join(SRC, 'countryInfo.txt'), encoding='utf-8'):
    if line.startswith('#'): continue
    f = line.rstrip('\n').split('\t')
    cc = f[0]
    countries[cc] = dict(ar=ar_loc.territories.get(cc, f[4]), fr=fr_loc.territories.get(cc, f[4]),
                         en=en_loc.territories.get(cc, f[4]))

cities = {}
for line in open(os.path.join(SRC, 'cities15000.txt'), encoding='utf-8'):
    f = line.rstrip('\n').split('\t')
    name, alts, lat, lon, cc, pop, tz = f[1], f[3], float(f[4]), float(f[5]), f[8], int(f[14] or 0), f[17]
    ar = ''
    for a in alts.split(','):
        if AR.match(a) and len(a) > 1:
            ar = a; break
    cities.setdefault(cc, []).append([name, ar, round(lat, 4), round(lon, 4), tz, pop])
for cc in cities:
    cities[cc].sort(key=lambda c: -c[5])
countries = {cc: v for cc, v in countries.items() if cc in cities}
with gzip.open(os.path.join(OUT, 'places.json.gz'), 'wt', encoding='utf-8') as fh:
    json.dump(dict(countries=countries, cities=cities), fh, ensure_ascii=False, separators=(',', ':'))
print('countries', len(countries), 'cities', sum(len(v) for v in cities.values()))

# ---- Habous cities: match with GeoNames Arabic names, else geocode with Nominatim
t = open(HAB, encoding='utf-8').read()
hab = json.loads(t[t.index('push(') + 5:t.rindex(')')])['villes']
ma = {}
for line in open(os.path.join(SRC, 'cities15000.txt'), encoding='utf-8'):
    f = line.rstrip('\n').split('\t')
    if f[8] != 'MA': continue
    for a in f[3].split(',') + [f[1]]:
        if AR.match(a): ma.setdefault(norm_ar(a), (float(f[4]), float(f[5]), f[1]))
out = []
for v in hab:
    n = v['n']; key = norm_ar(n)
    hit = ma.get(key)
    if not hit:
        time.sleep(1.1)
        try:
            r = requests.get('https://nominatim.openstreetmap.org/search', timeout=30,
                             params=dict(q=n, countrycodes='ma', format='json', limit=1, namedetails=1),
                             headers={'User-Agent': 'AlKitabAlMawqut-build/1.0', 'Accept-Language': 'fr'}).json()
            if r:
                nd = r[0].get('namedetails', {})
                hit = (float(r[0]['lat']), float(r[0]['lon']), nd.get('name:fr') or nd.get('name:en') or nd.get('name', n))
        except Exception as e:
            print('geocode fail', n, e)
    if not hit:
        print('NO COORDS', n); hit = (None, None, '')
    out.append(dict(id=v['c'], ar=n, fr=hit[2], lat=hit[0] and round(hit[0], 4), lon=hit[1] and round(hit[1], 4)))
json.dump(out, open(os.path.join(OUT, 'habous_cities.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
print('habous cities', len(out), 'missing', sum(1 for o in out if o['lat'] is None))
