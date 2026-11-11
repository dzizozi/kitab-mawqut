"""Build mawaqit/data/ahzab.json: the 60 hizbs with their sura and opening words.
Sources: Tanzil Project (tanzil.net) – Quran text "simple" with diacritics + hizb-quarter metadata (CC BY 3.0, verbatim).
Usage: python tools/build_ahzab.py <quran-data.js> <quran-simple.txt>"""
import json, os, re, sys

meta, text = sys.argv[1], sys.argv[2]
js = open(meta, encoding='utf-8').read()
quarters = [tuple(map(int, m)) for m in re.findall(r'\[(\d+), (\d+)\]', js[js.index('QuranData.HizbQaurter'):js.index('];', js.index('QuranData.HizbQaurter'))])]
suras = re.findall(r"\[\d+, \d+, \d+, \d+, '([^']+)'", js[js.index('QuranData.Sura'):js.index('];', js.index('QuranData.Sura'))])
assert len(quarters) >= 240 and len(suras) == 114, (len(quarters), len(suras))
verses = {}
for line in open(text, encoding='utf-8'):
    p = line.rstrip('\n').split('|')
    if len(p) == 3 and p[0].isdigit():
        verses[(int(p[0]), int(p[1]))] = p[2]
BASMALA = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ '

out = []
for n in range(60):
    s, a = quarters[n * 4]
    words, ss, aa = [], s, a
    while len(words) < (8 if (s, a) == (1, 1) else 4):           # Fatiha: basmala + «الحمد لله رب العالمين»
        v = verses[(ss, aa)].split()
        if aa == 1 and ss not in (1, 9) and v[0].startswith('بِسْمِ'):
            v = v[4:]                                              # basmala is not part of the opening words
        words += [w for w in v if not re.fullmatch(r'[\u06D6-\u06ED\u06DE\u06E9]+', w)]   # drop rub'/sajda/waqf-only tokens
        if len(words) >= 4 and (s, a) != (1, 1):
            break
        aa += 1
        if (ss, aa) not in verses:
            ss, aa = ss + 1, 1
    k = 8 if (s, a) == (1, 1) else min(len(words), 5 if len(words) >= 5 else len(words))
    out.append(dict(n=n + 1, sura=s, sura_name=suras[s - 1], aya=a, start_of_sura=(a == 1), words=' '.join(words[:k])))

dst = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'mawaqit', 'data', 'ahzab.json')
json.dump(dict(source='Tanzil Project – tanzil.net (Quran text: simple, CC BY 3.0)', ahzab=out),
          open(dst, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for h in out:
    print(h['n'], h['sura_name'], h['aya'], '|', h['words'])
