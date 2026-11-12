"""Build mawaqit/data/ahzab.json: the 60 hizbs (start + end words) for two riwayas.
- Hafs  : Tanzil Project (tanzil.net) text "simple" with diacritics + hizb metadata (CC BY 3.0).
- Warsh : King Fahd Complex (qurancomplex.gov.sa) Warsh text, verse numbers mapped to the Hafs count
          (fawazahmed0/quran-api edition ara-quranwarsh). Hizb divisions of the Moroccan Warsh mushaf
          (fihris al-ahzab); they differ from Hafs for hizbs 1, 2, 7, 10, 12 and 16.
Usage: python tools/build_ahzab.py <quran-data.js> <quran-simple.txt> <ara-quranwarsh.json>"""
import json, os, re, sys

meta, text, warsh_f = sys.argv[1:4]
js = open(meta, encoding='utf-8').read()
blk = lambda name: js[js.index(name):js.index('];', js.index(name))]
quarters = [tuple(map(int, m)) for m in re.findall(r'\[(\d+), (\d+)\]', blk('QuranData.HizbQaurter'))]
suras = re.findall(r"\[\d+, \d+, \d+, \d+, '([^']+)'", blk('QuranData.Sura'))
assert len(quarters) >= 240 and len(suras) == 114

hafs = {}
for line in open(text, encoding='utf-8'):
    p = line.rstrip('\n').split('|')
    if len(p) == 3 and p[0].isdigit():
        hafs[(int(p[0]), int(p[1]))] = p[2]
warsh = {(v['chapter'], v['verse']): v['text'] for v in json.load(open(warsh_f, encoding='utf-8'))['quran']}
assert len(hafs) == len(warsh) == 6236

HAFS_START = [quarters[n * 4] for n in range(60)]
WARSH_START = list(HAFS_START)
WARSH_START[0] = (1, 2)                          # Warsh: the basmala is not a verse of al-Fatiha
for n, pos in {2: (2, 76), 7: (3, 92), 10: (4, 87), 12: (5, 23), 16: (7, 5)}.items():
    WARSH_START[n - 1] = pos

MARKS = re.compile('[\u06D6-\u06DB\u06DE\u06E9]')     # pause / rub' / sajda marks (keep U+06DC small seen)


def words_of(verses, key, drop_basmala):
    w = MARKS.sub('', verses[key]).split()
    if drop_basmala and key[1] == 1 and key[0] not in (1, 9) and w and w[0].startswith('بِسْمِ'):
        w = w[4:]
    return w


def prev(verses, key):
    s, a = key
    if a > 1: return (s, a - 1)
    return (s - 1, max(v for (x, v) in verses if x == s - 1))


def build(verses, starts, hafs_fatiha):
    out = []
    for n in range(60):
        s, a = starts[n]
        if hafs_fatiha and n == 0:
            first = (words_of(verses, (1, 1), False) + words_of(verses, (1, 2), False))[:8]
        else:
            w, key = [], (s, a)
            while len(w) < 4:
                w += words_of(verses, key, True)
                key = (key[0], key[1] + 1) if (key[0], key[1] + 1) in verses else (key[0] + 1, 1)
            first = w[:5]
        es, ea = prev(verses, starts[n + 1]) if n < 59 else (114, 6)
        ev = words_of(verses, (es, ea), True)
        out.append(dict(n=n + 1, sura=s, sura_name=suras[s - 1], aya=a, start_of_sura=(a == 1 or (s, a) == (1, 2)),
                        words=' '.join(first), end_sura=es, end_sura_name=suras[es - 1], end_aya=ea,
                        end_of_sura=((es, ea + 1) not in verses), end_words=' '.join(ev[-5:])))
    return out


data = dict(
    hafs=build(hafs, HAFS_START, True),
    warsh=build(warsh, WARSH_START, False),
    source_hafs='Tanzil Project – tanzil.net (simple text, CC BY 3.0)',
    source_warsh='مجمع الملك فهد لطباعة المصحف الشريف – qurancomplex.gov.sa (رواية ورش عن نافع)')
dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'mawaqit', 'data', 'ahzab.json')
json.dump(data, open(dst, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for h in data['warsh']:
    print(h['n'], h['sura_name'], h['aya'], '|', h['words'], ' ==> ', h['end_sura_name'], h['end_aya'], '|', h['end_words'])
