"""Visual themes for the prayer sheet. Each theme = CSS (visual only; layout lives in BASE)."""

THEMES = {}   # key -> dict(name_ar, name_en, css)

BASE = r'''
@page { size: A4; margin: 0 }
* { box-sizing: border-box; margin: 0; padding: 0 }
html, body { width: 794px; height: 1123px; overflow: hidden }
body { direction: rtl; position: relative; -webkit-print-color-adjust: exact; print-color-adjust: exact;
  font-family: 'Noto Kufi Arabic', 'Segoe UI', 'UILatin', sans-serif; color: #1d2b36 }
.bgdeco { position: absolute; inset: 0; overflow: hidden }
.bgdeco > * { position: absolute; display: none }
.page { position: relative; padding: 18px 20px 12px; height: 100%; display: flex; flex-direction: column; gap: 8px }
.page > * { flex-shrink: 0 }
.panel { position: relative }
.head { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 12px 22px 12px;
  min-height: 118px; overflow: hidden }
.head > div { position: relative; z-index: 1 }
.skyline { position: absolute; left: 0; right: 0; bottom: 0; width: 100%; height: 34px; display: none }
.h-title { font-family: 'Amiri', serif; font-weight: 700; font-size: 36px; line-height: 1.1 }
.h-sub { font-family: 'Segoe UI', 'UILatin', sans-serif; font-size: 12px; letter-spacing: 2.5px; text-transform: uppercase; direction: ltr; text-align: right }
.h-left { text-align: left } .h-left .h-title { font-size: 28px } .h-left .h-sub { text-align: left }
.h-mid { text-align: center; padding: 0 14px }
.emblem { width: 58px; height: 58px; margin: 0 auto 2px; display: grid; place-items: center }
.emblem.photo { width: 74px; height: 74px; border-radius: 50% !important; overflow: hidden; padding: 0; border: 3px solid rgba(255,255,255,.9) }
.emblem.photo img { width: 100%; height: 100%; object-fit: cover; display: block }
.h-left.has-mosque .h-title { font-size: 26px; line-height: 1.15 }
.h-sub2 { font-size: 12px; font-weight: 700; margin-top: 3px; opacity: .8 }
.ic { width: 36px; height: 36px }
.month { font-family: 'Amiri', serif; font-weight: 700; font-size: 38px; line-height: 1.05 }
.month-fr { font-family: 'Segoe UI', 'UILatin'; font-size: 11.5px; letter-spacing: 3px; text-transform: uppercase }
.meta { display: flex; justify-content: space-between; align-items: center; padding: 2px 10px; font-size: 12px }
.meta .fr { font-family: 'Segoe UI', 'UILatin' }
.dua { font-family: 'Amiri'; font-size: 15px }
.tbl { padding: 7px 9px; flex: 1 1 0 !important; min-height: 0; display: flex }
table { width: 100%; height: 100%; border-collapse: separate; border-spacing: 0 2px }
thead th { font-weight: 700; font-size: 13px; padding: 4px 2px 3px; line-height: 1.15 }
thead th.side { background: none !important; border: 0 !important; box-shadow: none !important }
thead th small { display: block; font-family: 'Segoe UI', 'UILatin'; font-weight: 600; font-size: 9.5px; letter-spacing: .5px; opacity: .85 }
tbody td { text-align: center; line-height: 1; padding: 0 2px; font-family: 'Segoe UI', 'UILatin', sans-serif;
  font-variant-numeric: tabular-nums; font-weight: 600; font-size: 14px }
td.day { text-align: right; padding-right: 10px; font-family: 'Noto Kufi Arabic'; font-size: 12.5px; font-weight: 700; white-space: nowrap }
td.day small { font-family: 'Segoe UI', 'UILatin'; font-weight: 600; font-size: 9.5px; margin-right: 4px; opacity: .65 }
td.hd { font-weight: 800 }
td.gd i { font-style: normal; font-family: 'Noto Kufi Arabic'; font-size: 9.5px; font-weight: 700; padding: 0 5px; margin-left: 4px }
td.side { width: 26px; padding: 0; background: none !important; border: 0 !important; box-shadow: none !important }
tr.ev td.hd::after { content: '✦'; font-size: 10px; margin-right: 2px }
.vbadge { writing-mode: vertical-rl; transform: rotate(180deg); font-size: 10.5px; font-weight: 700;
  padding: 6px 3px; margin: 0 auto; width: 20px; height: 52px; display: flex; align-items: center; justify-content: center; line-height: 1 }
.moonb { width: 18px; height: 18px; margin: 0 auto; display: grid; place-items: center } .moonb .ic { width: 12px; height: 12px }
.bottom { display: grid; grid-template-columns: 1.05fr 1fr; gap: 8px }
.card { padding: 8px 14px }
.card h3 { font-size: 12.5px; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: baseline }
.card h3 small { font-family: 'Segoe UI', 'UILatin'; font-weight: 600; font-size: 10px; letter-spacing: .5px; opacity: .75 }
.evl { list-style: none; font-size: 11px; line-height: 1.5 }
.evl li { display: flex; gap: 6px; align-items: baseline }
.evl .dt { font-family: 'Segoe UI', 'UILatin'; font-weight: 700; min-width: 132px; font-size: 11px; white-space: nowrap }
.evl .fr { font-family: 'Segoe UI', 'UILatin'; font-size: 10px; margin-right: auto; direction: ltr; opacity: .7 }
.dot { width: 7px; height: 7px; display: inline-block; flex: none; border-radius: 50% }
.chips { display: grid; grid-template-columns: 1fr 1fr; gap: 4px }
.chip { padding: 3px 8px; font-size: 11.5px; font-weight: 700; display: flex; justify-content: space-between; align-items: center }
.chip span { font-family: 'Segoe UI', 'UILatin'; font-weight: 600; font-size: 11px }
.foot { display: flex; justify-content: space-between; gap: 10px; font-size: 9px; line-height: 1.3; padding: 0 10px; opacity: .85; white-space: nowrap }
.foot span:last-child { font-family: 'Segoe UI', 'UILatin'; direction: ltr }
'''

def T(key, ar, en, css):
    THEMES[key] = dict(name_ar=ar, name_en=en, css=css)

STAR = ('<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 90 90">'
        '<g fill="none" stroke="%23ffffff" stroke-opacity=".55" stroke-width="1">'
        '<rect x="27" y="27" width="36" height="36"/><rect x="27" y="27" width="36" height="36" transform="rotate(45 45 45)"/>'
        '<circle cx="45" cy="45" r="8"/></g></svg>')

# ------------------------------------------------------------------ 1. Glassmorphism
T('glass', 'زجاجي', 'Glassmorphism', r'''
body { color: #17324a; background: linear-gradient(140deg, #dff5ee 0%, #e9eefc 45%, #f3ecfb 70%, #fdf1e1 100%) }
.bgdeco .blob { display: block; border-radius: 50%; filter: blur(60px); opacity: .75 }
.b1 { width: 380px; height: 380px; background: #5fd4b0; top: -90px; right: -80px }
.b2 { width: 330px; height: 330px; background: #f7c873; top: 300px; left: -120px; opacity: .6 !important }
.b3 { width: 360px; height: 360px; background: #9fb4ff; bottom: 120px; right: -110px; opacity: .6 !important }
.b4 { width: 300px; height: 300px; background: #d5a6f5; bottom: -120px; left: 120px; opacity: .5 !important }
.bgdeco .pattern { display: block; inset: 0; background-image: url('data:image/svg+xml;utf8,__STAR__'); background-size: 90px; opacity: .55 }
.panel { background: rgba(255,255,255,.42); backdrop-filter: blur(16px) saturate(150%); border: 1px solid rgba(255,255,255,.75);
  border-radius: 22px; box-shadow: 0 8px 30px rgba(30,70,100,.13), inset 0 1px 0 rgba(255,255,255,.9) }
.skyline { display: block; fill: rgba(255,255,255,.6) }
.h-title { color: #0f5e4f } .h-left .h-title { color: #17324a } .h-sub { color: #4b6a80 }
.emblem { border-radius: 50%; background: rgba(255,255,255,.55); border: 1px solid #fff; box-shadow: 0 6px 18px rgba(184,134,47,.25) }
.ic { fill: url(#gold) }
.month { background: linear-gradient(180deg, #d6a645, #8a5a12); -webkit-background-clip: text; color: transparent }
.month-fr { color: #8a6420 } .meta { color: #33536b } .meta b { color: #0f5e4f } .dua { color: #6b5313 }
thead th { color: #fff; background: linear-gradient(180deg, rgba(20,128,106,.88), rgba(13,92,78,.92)) }
thead th.c1 { border-radius: 0 14px 14px 0 } thead th.cl { border-radius: 14px 0 0 14px }
tbody td { background: rgba(255,255,255,.38); color: #1d3447 }
td.day { border-radius: 0 10px 10px 0 } td.isha { border-radius: 10px 0 0 10px }
td.hd { color: #a0701b } td.gd { color: #3d5a72 } td.gd i { color: #fff; background: #5a7bd8; border-radius: 8px }
td.acc { color: #8b1d4a }
tr.fri td { background: rgba(20,150,120,.20) } tr.fri td.day { color: #0b7a62 } tr.sun td.day { color: #c0392b }
tr.ev td { background: rgba(247,200,115,.42) } tr.ev td.hd::after { color: #c98a1a }
tr.next td { background: rgba(159,180,255,.3); color: #3c4f9c }
.vbadge, .moonb { background: rgba(23,50,74,.82); color: #fff; border-radius: 12px } .moonb { border-radius: 50% }
.card h3 { color: #0f5e4f } .evl .dt { color: #a0701b }
.dot { background: #c98a1a } .dot.relig { background: #14806a }
.chip { border-radius: 12px; background: rgba(255,255,255,.5); border: 1px solid rgba(255,255,255,.85) }
.chip.ram { background: linear-gradient(135deg, rgba(20,150,120,.85), rgba(13,92,78,.9)); color: #fff } .chip.ram span { color: #e6fff7 }
.foot { color: #587489 }
''')

# ------------------------------------------------------------------ 2. Neo-brutalism
T('brutal', 'نيو بروتاليزم', 'Neo-brutalism', r'''
body { color: #000; background: #fff4d6 }
.bgdeco .sq { display: block; border: 3px solid #000 }
.s1 { width: 160px; height: 160px; background: #ff90e8; top: -40px; left: -40px; transform: rotate(12deg) }
.s2 { width: 120px; height: 120px; background: #23d2ff; bottom: 60px; right: -50px; border-radius: 50% }
.panel { background: #fff; border: 3px solid #000; border-radius: 10px; box-shadow: 6px 6px 0 #000 }
.head { background: #ffd43b }
.h-title { font-family: 'Noto Kufi Arabic'; font-weight: 800; font-size: 30px; color: #000 } .h-left .h-title { font-size: 24px }
.h-sub { color: #000; font-weight: 800 }
.emblem { background: #fff; border: 3px solid #000; border-radius: 10px; box-shadow: 3px 3px 0 #000 } .ic { fill: #000 }
.month { font-family: 'Noto Kufi Arabic'; font-weight: 800; font-size: 30px; color: #000; background: #fff; border: 3px solid #000;
  padding: 0 12px; box-shadow: 3px 3px 0 #000; margin-top: 4px; display: inline-block }
.month-fr { color: #000; font-weight: 800; margin-top: 4px }
.meta { font-weight: 700 } .meta b { background: #000; color: #ffd43b; padding: 0 6px }
.dua { font-family: 'Noto Kufi Arabic'; font-size: 12px; font-weight: 700; background: #ff90e8; border: 2px solid #000; padding: 0 8px }
thead th { background: #a3e635; color: #000; border-top: 3px solid #000; border-bottom: 3px solid #000 }
thead th.c1 { border-right: 3px solid #000 } thead th.cl { border-left: 3px solid #000 }
tbody td { background: #fff; color: #000; border-bottom: 2px solid #000; font-weight: 700 }
td.day { border-right: 2px solid #000 } td.isha { border-left: 2px solid #000 }
td.gd i { background: #000; color: #fff } td.acc { color: #d0006f }
tr.fri td { background: #23d2ff } tr.sun td.day { color: #e8000b }
tr.ev td { background: #ffd43b } tr.next td { background: #e5e5e5 }
.vbadge { background: #ff90e8; color: #000; border: 2px solid #000; box-shadow: 2px 2px 0 #000 }
.moonb { background: #ffd43b; border: 2px solid #000 } .moonb .ic { fill: #000 }
.card h3 { font-weight: 800; color: #000; border-bottom: 3px solid #000; padding-bottom: 2px }
.bottom .card:first-child { background: #fff } .bottom .card:last-child { background: #c4b5fd }
.dot { background: #e8000b; border: 1.5px solid #000; border-radius: 0 } .dot.relig { background: #a3e635 }
.chip { background: #fff; border: 2px solid #000; box-shadow: 2px 2px 0 #000; border-radius: 6px }
.chip.ram { background: #a3e635 }
.foot { color: #000; font-weight: 700 }
''')

# ------------------------------------------------------------------ 3. Bento grid
T('bento', 'بينتو', 'Bento grid', r'''
body { color: #1c1c1e; background: #eceef2 }
.panel { background: #fff; border-radius: 24px; box-shadow: 0 1px 2px rgba(0,0,0,.05) }
.head { background: none; box-shadow: none; padding: 0; gap: 8px; grid-template-columns: 1.15fr .9fr 1.15fr; min-height: 124px; overflow: visible }
.head > div { background: #fff; border-radius: 24px; height: 100%; padding: 14px 18px; display: flex; flex-direction: column; justify-content: center }
.head .h-mid { background: #0f766e; color: #fff; align-items: center }
.head .h-left { background: #fde68a }
.h-title { font-family: 'Noto Kufi Arabic'; font-weight: 800; font-size: 26px; color: #1c1c1e } .h-left .h-title { font-size: 22px }
.h-sub { color: #8e8e93; font-weight: 600 } .h-left .h-sub { color: #7c5e10 }
.emblem { width: 44px; height: 44px; border-radius: 14px; background: rgba(255,255,255,.18) } .ic { width: 28px; height: 28px; fill: #fde68a }
.month { font-family: 'Noto Kufi Arabic'; font-size: 26px; color: #fff } .month-fr { color: #99f6e4 }
.meta { background: #fff; border-radius: 18px; padding: 6px 14px; color: #3a3a3c } .meta b { color: #0f766e }
.dua { color: #7c5e10 }
thead th { background: #f2f2f7; color: #3a3a3c } thead th small { color: #8e8e93 }
thead th.c1 { border-radius: 0 12px 12px 0 } thead th.cl { border-radius: 12px 0 0 12px }
tbody td { background: #fff; color: #1c1c1e; border-bottom: 1px solid #f0f0f3 }
td.hd { color: #0f766e } td.gd { color: #636366 } td.gd i { background: #e0e7ff; color: #3730a3; border-radius: 6px }
td.acc { color: #0f766e }
tr.fri td { background: #ecfdf5; border-bottom-color: #ecfdf5 } tr.fri td.day { color: #047857 }
td.day { border-radius: 0 10px 10px 0 } td.isha { border-radius: 10px 0 0 10px }
tr.sun td.day { color: #dc2626 }
tr.ev td { background: #fef3c7 } tr.ev td.hd::after { color: #d97706 } tr.next td { background: #f2f2f7; color: #8e8e93 }
.vbadge { background: #1c1c1e; color: #fff; border-radius: 12px } .moonb { background: #0f766e; border-radius: 8px } .moonb .ic { fill: #fde68a }
.bottom .card:first-child { background: #fff } .bottom .card:last-child { background: #1c1c1e; color: #fff }
.bottom .card:last-child h3 { color: #fde68a } .card h3 { color: #0f766e }
.evl .dt { color: #0f766e } .dot { background: #f59e0b } .dot.relig { background: #0f766e }
.chip { background: #2c2c2e; border-radius: 12px; color: #fff } .chip span { color: #aeaeb2 }
.chip.ram { background: #0f766e } .chip.ram span { color: #ccfbf1 }
.foot { color: #8e8e93 }
''')

# ------------------------------------------------------------------ 4. Swiss style
T('swiss', 'سويسري', 'Swiss style', r'''
body { color: #111; background: #fff; font-family: 'Segoe UI', 'UILatin', 'Noto Sans Arabic', sans-serif }
.bgdeco .bar { display: block; background: #e30613; top: 0; right: 0; width: 14px; height: 100% }
.panel { background: transparent }
.head { border-top: 6px solid #111; border-bottom: 1px solid #111; padding: 10px 6px; grid-template-columns: 1.3fr auto 1fr }
.h-title { font-family: 'Noto Sans Arabic', 'Segoe UI', 'UILatin'; font-weight: 700; font-size: 40px; letter-spacing: -1px; color: #111 }
.h-left .h-title { font-size: 22px; font-weight: 400 } .h-sub { color: #e30613; font-weight: 700; letter-spacing: 1px }
.emblem { display: none }
.month { font-family: 'Noto Sans Arabic'; font-weight: 700; font-size: 30px; color: #e30613 } .month-fr { color: #111; font-weight: 700 }
.meta { border-bottom: 1px solid #111; padding: 2px 6px 6px; color: #111 } .meta b { color: #e30613 }
.dua { font-family: 'Noto Sans Arabic'; font-size: 11px; color: #555 }
.tbl { padding: 0 } table { border-spacing: 0 }
thead th { color: #111; text-align: center; border-bottom: 3px solid #111; font-family: 'Noto Sans Arabic' }
thead th small { color: #e30613 }
tbody td { color: #111; border-bottom: 1px solid #d0d0d0; font-weight: 500 }
td.day { font-family: 'Noto Sans Arabic'; font-weight: 600 } td.hd { font-weight: 700 }
td.gd i { color: #e30613; padding: 0 } td.acc { font-weight: 700 }
tr.fri td { background: #111; color: #fff; border-bottom-color: #111 } tr.fri td.day small { color: #fff }
tr.sun td.day { color: #e30613 }
tr.ev td.hd, tr.ev td.day { color: #e30613 } tr.ev td.hd::after { color: #e30613 } tr.fri.ev td.hd { color: #ff5a5a }
tr.next td { color: #999 }
.vbadge { background: #e30613; color: #fff } .moonb { background: #111 } .moonb .ic { fill: #fff }
.bottom { gap: 24px } .card { padding: 6px 0; border-top: 3px solid #111 }
.card h3 { color: #111; font-family: 'Noto Sans Arabic'; font-size: 13px } .card h3 small { color: #e30613 }
.evl .dt { color: #e30613 } .dot { background: #e30613; border-radius: 0 } .dot.relig { background: #111 }
.chip { border-bottom: 1px solid #ccc; padding: 2px 0 } .chip.ram { color: #e30613 }
.foot { color: #555; padding: 0 }
''')

# ------------------------------------------------------------------ 5. Claymorphism
T('clay', 'صلصال', 'Claymorphism', r'''
body { color: #3b2f5c; background: linear-gradient(160deg, #efe6ff, #ffe9f3 60%, #e3f6ff) }
.bgdeco .blob { display: block; border-radius: 50%; box-shadow: inset -12px -12px 24px rgba(0,0,0,.08), inset 12px 12px 24px rgba(255,255,255,.7) }
.b1 { width: 150px; height: 150px; background: #ffcfe4; top: -40px; left: -30px }
.b3 { width: 120px; height: 120px; background: #c8f1dc; bottom: 150px; right: -40px }
.panel { background: #fbf8ff; border-radius: 34px;
  box-shadow: 14px 14px 30px rgba(126,96,191,.22), inset -8px -8px 16px rgba(126,96,191,.12), inset 8px 8px 16px #fff }
.h-title { font-family: 'Noto Kufi Arabic'; font-weight: 800; font-size: 28px; color: #6d4bd1 } .h-left .h-title { color: #e2558f; font-size: 23px }
.h-sub { color: #9b8bc4; font-weight: 700 }
.emblem { border-radius: 50%; background: #ffd98a; box-shadow: 6px 6px 14px rgba(200,140,40,.35), inset -5px -5px 10px rgba(180,110,0,.25), inset 5px 5px 10px #fff3cf }
.ic { fill: #fff }
.month { font-family: 'Noto Kufi Arabic'; font-weight: 800; font-size: 30px; color: #6d4bd1 } .month-fr { color: #e2558f; font-weight: 700 }
.meta { color: #6b5b95 } .meta b { color: #6d4bd1 } .dua { color: #b0567f }
thead th { background: #a78bfa; color: #fff; box-shadow: inset -3px -3px 6px rgba(70,30,160,.3), inset 3px 3px 6px rgba(255,255,255,.4) }
thead th.c1 { border-radius: 0 18px 18px 0 } thead th.cl { border-radius: 18px 0 0 18px }
tbody td { background: #fff; color: #3b2f5c }
td.day { border-radius: 0 14px 14px 0 } td.isha { border-radius: 14px 0 0 14px }
td.hd { color: #e2558f } td.gd { color: #7a6ca8 } td.gd i { background: #7dd3fc; color: #0c4a6e; border-radius: 10px }
td.acc { color: #6d4bd1 }
tr.fri td { background: #d9f99d } tr.sun td.day { color: #ef4444 }
tr.ev td { background: #ffe1ef } tr.ev td.hd::after { color: #e2558f } tr.next td { background: #e0f2fe }
.vbadge { background: #ffb4d2; color: #7a1f4a; border-radius: 14px; box-shadow: inset -3px -3px 6px rgba(160,40,90,.2), inset 3px 3px 6px #fff }
.moonb { background: #ffd98a; border-radius: 50% } .moonb .ic { fill: #fff }
.card h3 { color: #6d4bd1 } .evl .dt { color: #e2558f }
.dot { background: #e2558f } .dot.relig { background: #a78bfa }
.chip { border-radius: 16px; background: #fff; box-shadow: 4px 4px 10px rgba(126,96,191,.18), inset -2px -2px 5px rgba(126,96,191,.12) }
.chip.ram { background: #86efac; color: #14532d } .chip.ram span { color: #166534 }
.foot { color: #8a7bb8 }
''')

# ------------------------------------------------------------------ 6. Skeuomorphism
T('skeuo', 'واقعي (سكيومورفيزم)', 'Skeuomorphism', r'''
body { color: #3b2a14; background: radial-gradient(circle at 30% 20%, #f7ecd2, #e9d6ad 60%, #d8c08f);
  font-family: 'Amiri', serif }
.bgdeco .pattern { display: block; inset: 0; opacity: .5;
  background-image: repeating-linear-gradient(90deg, rgba(120,80,30,.04) 0 2px, transparent 2px 7px), repeating-linear-gradient(0deg, rgba(120,80,30,.035) 0 1px, transparent 1px 5px) }
.panel { background: linear-gradient(#fffaf0, #f6ead0); border-radius: 10px; border: 1px solid #b89a63;
  box-shadow: 0 2px 0 #fff inset, 0 6px 14px rgba(70,40,10,.35), 0 0 0 5px #8b5e2b, 0 0 0 6px #5a3a17 }
.page { padding: 24px 26px 14px; gap: 12px }
.head { background: linear-gradient(180deg, #f5d98b, #d4a84a 45%, #b9862c 55%, #e7c470); border-color: #7a5418 }
.skyline { display: block; fill: rgba(90,58,23,.25) }
.h-title { color: #4a2f0c; text-shadow: 0 1px 0 rgba(255,240,200,.8), 0 -1px 0 rgba(80,50,10,.5) } .h-sub { color: #5a3a17; font-weight: 700 }
.emblem { border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fff6d8, #c9973f 70%, #8a5d1d);
  box-shadow: 0 3px 6px rgba(0,0,0,.4), inset 0 2px 2px rgba(255,255,255,.7) } .ic { fill: #5a3a17 }
.month { color: #4a2f0c; text-shadow: 0 1px 0 rgba(255,240,200,.9), 0 -1px 0 rgba(80,50,10,.5) } .month-fr { color: #5a3a17; font-weight: 700 }
.meta { color: #5a3a17; font-family: 'Amiri'; font-size: 13.5px } .meta b { color: #7a1f1f } .dua { color: #7a1f1f }
.tbl { padding: 8px 10px }
thead th { color: #fff8e6; font-family: 'Amiri'; font-size: 15px; background: linear-gradient(#7b1f24, #5a1418);
  text-shadow: 0 -1px 0 #2a0608; border-top: 1px solid #a8454a }
thead th.c1 { border-radius: 0 6px 6px 0 } thead th.cl { border-radius: 6px 0 0 6px }
tbody td { color: #2f2210; border-bottom: 1px solid rgba(140,100,40,.35); font-family: 'Georgia', serif; font-weight: 700; font-variant-numeric: lining-nums tabular-nums }
td.day { font-family: 'Amiri'; font-size: 14px } td.hd { color: #7a1f1f } td.gd { color: #6b5232 }
td.gd i { background: #7b1f24; color: #fff8e6; border-radius: 3px } td.acc { color: #7a1f1f }
tr.fri td { background: rgba(122,140,60,.18) } tr.fri td.day { color: #3f5a12 } tr.sun td.day { color: #a3171c }
tr.ev td { background: rgba(212,168,74,.35) } tr.ev td.hd::after { color: #a3171c } tr.next td { color: #8a7656 }
.vbadge { background: linear-gradient(90deg, #7b1f24, #5a1418); color: #f5d98b; border-radius: 4px; font-family: 'Amiri'; font-size: 12px }
.moonb { border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fff6d8, #c9973f) } .moonb .ic { fill: #5a3a17 }
.card h3 { color: #7a1f1f; font-family: 'Amiri'; font-size: 16px } .evl { font-family: 'Amiri'; font-size: 13px; line-height: 1.2 }
.evl .dt { color: #7a1f1f } .dot { background: #a3171c } .dot.relig { background: #3f5a12 }
.chip { background: linear-gradient(#fffdf6, #efe0bf); border: 1px solid #c6a96f; border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,.2); font-family: 'Amiri'; font-size: 13.5px }
.chip.ram { background: linear-gradient(#5f8a2c, #3f5a12); color: #fff } .chip.ram span { color: #eef7d8 }
.foot { color: #5a3a17 }
''')

# ------------------------------------------------------------------ 7. Material design
T('material', 'ماتيريال', 'Material design', r'''
body { color: #1d1b20; background: #f4fbf8 }
.bgdeco .bar { display: block; top: 0; left: 0; right: 0; height: 175px; background: #006a60 }
.panel { background: #fff; border-radius: 16px; box-shadow: 0 1px 3px rgba(0,0,0,.18), 0 4px 8px 3px rgba(0,0,0,.06) }
.head { background: transparent; box-shadow: none; color: #fff }
.h-title { font-family: 'Noto Kufi Arabic'; font-weight: 700; font-size: 28px; color: #fff } .h-left .h-title { font-size: 22px }
.h-sub { color: #9ef2e4; font-weight: 600 }
.emblem { border-radius: 16px; background: #9ef2e4; box-shadow: 0 2px 6px rgba(0,0,0,.25) } .ic { fill: #00201c }
.month { font-family: 'Noto Kufi Arabic'; font-size: 28px; color: #fff } .month-fr { color: #9ef2e4 }
.meta { background: #cce8e3; border-radius: 28px; padding: 5px 16px; color: #00201c } .meta b { color: #006a60 }
.dua { color: #4a635f }
thead th { background: #cce8e3; color: #00201c } thead th small { color: #4a635f }
thead th.c1 { border-radius: 0 12px 12px 0 } thead th.cl { border-radius: 12px 0 0 12px }
tbody td { color: #1d1b20; border-bottom: 1px solid #e3ebe9 }
td.hd { color: #006a60 } td.gd { color: #49454f } td.gd i { background: #e8def8; color: #4a4458; border-radius: 8px } td.acc { color: #7d5260 }
tr.fri td { background: #e6f4f1 } tr.fri td.day { color: #006a60 } tr.sun td.day { color: #b3261e }
td.day { border-radius: 0 8px 8px 0 } td.isha { border-radius: 8px 0 0 8px }
tr.ev td { background: #ffd8e4 } tr.ev td.hd::after { color: #7d5260 } tr.next td { color: #79747e }
.vbadge { background: #006a60; color: #fff; border-radius: 12px } .moonb { background: #006a60; border-radius: 50% } .moonb .ic { fill: #fff }
.card h3 { color: #006a60 } .evl .dt { color: #7d5260 }
.dot { background: #7d5260 } .dot.relig { background: #006a60 }
.chip { border-radius: 8px; border: 1px solid #79747e; background: #fff } .chip span { color: #49454f }
.chip.ram { background: #006a60; color: #fff; border-color: #006a60 } .chip.ram span { color: #cce8e3 }
.foot { color: #49454f }
''')

# ------------------------------------------------------------------ 8. Y2K
T('y2k', 'Y2K', 'Y2K', r'''
body { color: #2a0a4a; background: linear-gradient(135deg, #c9f4ff 0%, #f4c6ff 35%, #fff2a8 65%, #b6ffd9 100%) }
.bgdeco .spark { display: block; color: #fff; font-size: 64px; text-shadow: 0 0 12px #ff5fd2, 0 0 2px #7a00ff }
.sp1 { top: 20px; left: 30px } .sp2 { top: 520px; right: 10px; font-size: 40px } .sp3 { bottom: 40px; left: 360px; font-size: 34px }
.panel { background: linear-gradient(180deg, rgba(255,255,255,.85), rgba(235,240,255,.75)); border-radius: 26px;
  border: 3px solid #c0c7d6; box-shadow: 0 0 0 2px #fff inset, 0 0 0 1px #8a92a6, 0 8px 22px rgba(122,0,255,.22) }
.head { background: linear-gradient(180deg, #ffffff 0%, #dfe5f2 48%, #b8c2d8 52%, #eef2fb 100%) }
.h-title { font-family: 'Noto Kufi Arabic'; font-weight: 800; font-size: 28px;
  background: linear-gradient(90deg, #ff2fb8, #7a00ff, #00b7ff); -webkit-background-clip: text; color: transparent }
.h-left .h-title { font-size: 22px } .h-sub { color: #7a00ff; font-weight: 800; letter-spacing: 4px }
.emblem { border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fff, #c6ccdc 55%, #7e8799);
  box-shadow: 0 4px 10px rgba(122,0,255,.35) } .ic { fill: url(#holo) }
.month { font-family: 'Noto Kufi Arabic'; font-weight: 800; font-size: 30px;
  background: linear-gradient(90deg, #00b7ff, #ff2fb8); -webkit-background-clip: text; color: transparent }
.month-fr { color: #ff2fb8; font-weight: 800 }
.meta { color: #4b1a7a; font-weight: 700 } .meta b { color: #ff2fb8 } .dua { color: #7a00ff }
thead th { color: #fff; background: linear-gradient(180deg, #ff8be1 0%, #ff2fb8 50%, #c4008c 100%); text-shadow: 0 1px 0 #8a0063 }
thead th.c1 { border-radius: 0 20px 20px 0 } thead th.cl { border-radius: 20px 0 0 20px }
tbody td { background: rgba(255,255,255,.75); color: #2a0a4a }
td.day { border-radius: 0 20px 20px 0 } td.isha { border-radius: 20px 0 0 20px }
td.hd { color: #7a00ff } td.gd i { background: linear-gradient(90deg, #00b7ff, #7a00ff); color: #fff; border-radius: 10px }
td.acc { color: #d1007e }
tr.fri td { background: linear-gradient(180deg, #e3fbff, #a9ecff) } tr.sun td.day { color: #ff1f5a }
tr.ev td { background: linear-gradient(180deg, #fffbd1, #ffe96b) } tr.ev td.hd::after { color: #ff2fb8 }
tr.next td { background: rgba(230,230,250,.8); color: #8a7aa8 }
.vbadge { background: linear-gradient(90deg, #00b7ff, #7a00ff); color: #fff; border-radius: 14px }
.moonb { border-radius: 50%; background: radial-gradient(circle at 35% 30%, #fff, #b8c2d8) } .moonb .ic { fill: #7a00ff }
.card h3 { color: #7a00ff } .evl .dt { color: #d1007e }
.dot { background: #ff2fb8 } .dot.relig { background: #00b7ff }
.chip { border-radius: 20px; background: linear-gradient(180deg, #fff, #e3e7f2); border: 1.5px solid #b8c2d8 }
.chip.ram { background: linear-gradient(180deg, #a7ffcf, #2fe08a); color: #0a4a2a } .chip.ram span { color: #0a4a2a }
.foot { color: #4b1a7a }
''')

ORDER = ['glass', 'brutal', 'bento', 'swiss', 'clay', 'skeuo', 'material', 'y2k']


def css_for(key):
    t = THEMES.get(key) or THEMES['glass']
    return BASE + t['css'].replace('__STAR__', STAR)
