"""Bundle the latest official Moroccan prayer times (Ministry of Habous) inside the app, for mosques without internet.

Downloads hijri.js and every monthly file that is published (the current month, sometimes the next / previous)
into mawaqit/data/habous/. Months already saved are kept, so the bundle grows with every build.
Run before tools/export_web.py:  python tools/fetch_habous.py
"""
import datetime as dt, os, urllib.request

BASE = 'https://www.habous.gov.ma/data/'
OUT = os.path.join(os.path.dirname(__file__), '..', 'mawaqit', 'data', 'habous')


def get(name):
    req = urllib.request.Request(BASE + name, headers={'User-Agent': 'KitabMawqut-build'})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            b = r.read()
    except Exception:
        return None
    t = b.decode('utf-8', 'replace')
    return b if len(b) > 200 and '<html' not in t[:200].lower() else None


def main():
    os.makedirs(OUT, exist_ok=True)
    first = dt.date.today().replace(day=1)
    months = sorted({(first + dt.timedelta(days=31 * k)).strftime('%Y-%m') for k in (-1, 0, 1, 2)})
    got = []
    for name in ['hijri.js'] + [f'horaires-{m}.js' for m in months]:
        b = get(name)
        if b and (name == 'hijri.js' or b'push(' in b):
            open(os.path.join(OUT, name), 'wb').write(b); got.append(name)
    print('habous bundle:', ', '.join(got) or 'nothing new', '| in app:', sorted(os.listdir(OUT)))


if __name__ == '__main__':
    main()
