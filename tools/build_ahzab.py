"""Build mawaqit/data/ahzab.json: the 60 hizbs (start + end words) for two riwayas.
- Hafs  : Tanzil Project (tanzil.net) text "simple" with diacritics + hizb metadata (CC BY 3.0).
- Warsh : King Fahd Complex (qurancomplex.gov.sa) Warsh data «warshData_v2-1.json» with the ORIGINAL Warsh
          (Madani) verse numbering (6214 verses) – the numbers printed in Moroccan mushafs.
          Hizb divisions of the Moroccan Warsh mushaf (fihris al-ahzab); they differ from Hafs for
          hizbs 1, 2, 7, 10, 12 and 16.
Usage: python tools/build_ahzab.py <quran-data.js> <quran-simple.txt> <warshData_v2-1.json>"""
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
FIX = str.maketrans({'\u0656': '\u08F2', '\u0657': '\u08F0', '\u065E': '\u08F1', '\u00A0': ' '})
PUA = re.compile('[\uE000-\uF8FF\uFB50-\uFDFF\uFE70-\uFEFF]')    # verse-number glyphs of the KFGQPC font
warsh = {(v['sura_no'], v['aya_no']): PUA.sub('', v['aya_text'].translate(FIX)).strip()
         for v in json.load(open(warsh_f, encoding='utf-8'))}
assert len(hafs) == 6236 and len(warsh) == 6214

HAFS_START = [quarters[n * 4] for n in range(60)]
# Moroccan Warsh hizb starts, in Warsh verse numbering (checked against the mushaf's fihris al-ahzab)
WARSH_START = [(1, 1), (2, 75), (2, 141), (2, 201), (2, 251), (3, 15), (3, 91), (3, 171), (4, 24), (4, 86),
               (4, 147), (5, 25), (5, 84), (6, 37), (6, 112), (7, 4), (7, 87), (7, 171), (8, 41), (9, 34),
               (9, 94), (10, 26), (11, 6), (11, 83), (12, 53), (13, 21), (15, 1), (16, 51), (17, 1), (17, 99),
               (18, 74), (20, 1), (21, 1), (22, 1), (23, 1), (24, 21), (25, 21), (26, 111), (27, 58), (28, 51),
               (29, 46), (31, 21), (33, 31), (34, 24), (36, 27), (37, 145), (39, 31), (40, 41), (41, 46), (43, 23),
               (46, 1), (48, 18), (51, 31), (55, 1), (58, 1), (62, 1), (67, 1), (72, 1), (78, 1), (87, 1)]

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
        out.append(dict(n=n + 1, sura=s, sura_name=suras[s - 1], aya=a, start_of_sura=(a == 1 or (s, a) == (1, 2) and not hafs_fatiha),
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
