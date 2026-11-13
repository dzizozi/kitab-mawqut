"""Build mawaqit/data/mosques_ma.json from OpenStreetMap (© OpenStreetMap contributors, ODbL).
Usage: python tools/build_mosques.py   (needs internet; Overpass API)
Each row: [name (Arabic if known), other name, district, Habous city id (nearest), lat, lon]"""
import json, math, os, re, unicodedata, urllib.parse, urllib.request
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
EPS = ('https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter')
AREA = 'area["ISO3166-1"="MA"][admin_level=2]->.a;'
GEN = {'mosque', 'mosquee', 'muslim', 'masjid', 'mesjid', 'mezquita', 'moschee', 'مسجد', 'جامع', 'المسجد', 'الجامع',
       'islam', 'prayer room', 'salle de priere', 'musalla', 'مصلى', 'zaouia', 'زاوية'}


def ov(q):
    for ep in EPS:
        try:
            req = urllib.request.Request(ep, data=urllib.parse.urlencode({'data': q}).encode(),
                                         headers={'User-Agent': 'kitab-mawqut/1.0'})
            return json.loads(urllib.request.urlopen(req, timeout=280).read())['elements']
        except Exception as e:
            print(ep, e)
    raise SystemExit('Overpass unavailable')


def km(a, b, c, d):
    return 6371 * math.hypot(math.radians(d - b) * math.cos(math.radians((a + c) / 2)), math.radians(c - a))


def norm(s):
    s = ''.join(ch for ch in unicodedata.normalize('NFKD', s.lower()) if not unicodedata.combining(ch))
    return re.sub(r'[^\w\u0600-\u06ff]+', ' ', s).strip()


def clean(s):
    return re.sub(r'\s+', ' ', re.sub(r'[\u2d30-\u2d7f]+', '', s or '')).strip(' -–—')


def main():
    el = ov('[out:json][timeout:250];' + AREA + 'nwr["amenity"="place_of_worship"]["religion"="muslim"](area.a);out center tags;')
    pl = ov('[out:json][timeout:250];' + AREA + 'node["place"~"^(suburb|neighbourhood|quarter|village|town)$"]["name"](area.a);out;')
    H = [c for c in json.load(open(os.path.join(ROOT, 'mawaqit', 'data', 'habous_cities.json'), encoding='utf-8')) if c.get('lat') is not None]
    R = {'suburb': 2.5, 'neighbourhood': 1.5, 'quarter': 2.0, 'village': 3.0, 'town': 4.0}
    places = [(e['lat'], e['lon'], clean(e['tags'].get('name:ar') or e['tags']['name']), R[e['tags']['place']]) for e in pl]
    out, seen = [], set()
    for e in el:
        t = e.get('tags', {})
        ar, fr, nm = t.get('name:ar'), t.get('name:fr'), t.get('name') or ''
        main_ = clean(ar or nm)
        if not main_ or norm(main_) in GEN or len(norm(main_)) < 4: continue
        alt = fr if (ar and fr and fr != ar) else (nm if ar and nm and nm != ar and not re.search('[\u0600-\u06ff]', nm) else '')
        alt = clean(alt)
        if alt and alt in main_: alt = ''
        lat = e.get('lat') or e['center']['lat']; lon = e.get('lon') or e['center']['lon']
        best = None
        for a, b, n2, r in places:
            if abs(a - lat) > 0.05 or abs(b - lon) > 0.05: continue
            d = km(lat, lon, a, b)
            if d <= r and (best is None or d < best[0]): best = (d, n2)
        hc = min(H, key=lambda c: km(lat, lon, c['lat'], c['lon']))
        dist = best[1] if best and best[1] != hc['ar'] else ''
        key = (main_, round(lat, 3), round(lon, 3))
        if key in seen: continue
        seen.add(key)
        out.append([main_, alt, dist, hc['id'], round(lat, 4), round(lon, 4)])
    out.sort(key=lambda r: (r[3], r[0]))
    dst = os.path.join(ROOT, 'mawaqit', 'data', 'mosques_ma.json')
    json.dump({'src': '© OpenStreetMap contributors (ODbL)', 'm': out}, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print(len(out), 'mosques ->', dst, os.path.getsize(dst), 'bytes')


if __name__ == '__main__':
    main()
