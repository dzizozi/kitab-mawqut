"""Core: sources -> monthly model -> files -> print / notify. Everything runs hidden (no console windows)."""
import json, os, subprocess, datetime as dt, logging, tempfile, shutil, base64, winreg
import requests
from . import paths, calc, hijri, config, render
from .events import HIJRI_EVENTS, HIJRI_EVENTS_MA, NATIONAL, HIJRI

NOWIN = 0x08000000   # CREATE_NO_WINDOW
SYS32 = os.path.join(os.environ.get('SystemRoot', r'C:\Windows'), 'System32')
POWERSHELL = os.path.join(SYS32, 'WindowsPowerShell', 'v1.0', 'powershell.exe')
SCHTASKS = os.path.join(SYS32, 'schtasks.exe')
HABOUS = 'https://www.habous.gov.ma/data/'
UA = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AlKitabAlMawqut/' + paths.VERSION}
logging.basicConfig(filename=paths.LOG_F, level=logging.INFO, encoding='utf-8',
                    format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger('mawqut')
D = dt.timedelta


def run_hidden(args, **kw):
    kw.setdefault('capture_output', True); kw.setdefault('text', True)
    kw.setdefault('encoding', 'oem'); kw.setdefault('errors', 'replace')
    return subprocess.run(args, creationflags=NOWIN, **kw)


# ---------------------------------------------------------------- Habous (Morocco official source)
def fetch(name, max_age_h=3):
    path = os.path.join(paths.CACHE, name)
    fresh = os.path.exists(path) and (dt.datetime.now().timestamp() - os.path.getmtime(path)) < max_age_h * 3600
    if not fresh:
        try:
            r = requests.get(HABOUS + name, headers=UA, timeout=30)
            if r.status_code == 200 and len(r.text) > 200 and '<html' not in r.text[:200].lower():
                open(path, 'w', encoding='utf-8').write(r.text)
        except Exception as e:
            log.info('habous %s: %s', name, e)
    return open(path, encoding='utf-8').read() if os.path.exists(path) else None


_hab = {}
def habous_day(day, city_id):
    key = (day.year, day.month)
    if key not in _hab:
        past = day < dt.date.today().replace(day=1)
        t = fetch('horaires-%d-%02d.js' % key, max_age_h=24 * 365 if past else 12)
        _hab[key] = None
        if t and 'push(' in t:
            _hab[key] = {v['c']: v['h'] for v in json.loads(t[t.index('push(') + 5:t.rindex(')')])['villes']}
    h = (_hab[key] or {}).get(city_id)
    return h[day.day - 1] if h and day.day <= len(h) else None


def habous_offsets(city_id, ref=58):
    """Mean minute difference city - Casablanca over the latest published month (for towns without coordinates)."""
    import glob
    for f in sorted(glob.glob(os.path.join(paths.CACHE, 'horaires-*.js')), reverse=True):
        t = open(f, encoding='utf-8').read()
        if 'push(' not in t: continue
        v = {x['c']: x['h'] for x in json.loads(t[t.index('push(') + 5:t.rindex(')')])['villes']}
        if city_id in v and ref in v:
            mins = lambda s: int(s[:2]) * 60 + int(s[3:])
            return [round(sum(mins(a[j]) - mins(b[j]) for a, b in zip(v[city_id], v[ref])) / len(v[ref])) for j in range(6)]
    return [0] * 6


def official_months():
    return hijri.parse_habous_hijri(fetch('hijri.js', max_age_h=1))


# ---------------------------------------------------------------- model
def build_model(cfg, ref_day=None):
    today = ref_day or dt.date.today()
    morocco = cfg['country'] == 'MA' and cfg.get('hijri_mode') == 'morocco'
    official = official_months() if morocco else None
    # Morocco: the month is announced the evening before -> look one day ahead
    cur = hijri.month_at(today + (D(days=1) if morocco else D(0)), cfg, official)
    start, hm, hy = cur['debut'], cur['mois'], cur['annee']
    length = cur.get('duree') or (cur['est_next'] - start).days
    known = bool(cur.get('known'))
    use_habous = cfg['country'] == 'MA' and cfg['method'] == 'MOROCCO' and cfg.get('habous_id')
    plus = 60 if (cfg['country'] == 'MA' and cfg.get('morocco_plus1')) else 0

    rows, calc_used = [], False
    for i in range(30):
        day = start + D(days=i)
        hd = i + 1
        ramadan = hm == 9 and hd <= length
        t = habous_day(day, cfg['habous_id']) if use_habous else None
        if t is not None:
            if plus or any(cfg.get('tune', {}).values()):
                t = [_shift(x, plus + cfg['tune'].get(k, 0)) for x, k in zip(t, calc.KEYS)]
        elif use_habous and cfg.get('approx_coords'):
            base = calc.times(33.5883, -7.6114, day, 'MOROCCO', 1, cfg['tz'], None, ramadan, plus)
            offs = habous_offsets(cfg['habous_id'])
            t = [_shift(x, offs[j] + cfg.get('tune', {}).get(k, 0)) for j, (x, k) in enumerate(zip(base, calc.KEYS))]
            calc_used = True
        else:
            t = calc.times(cfg['lat'], cfg['lon'], day, cfg['method'], int(cfg.get('asr', 1)), cfg['tz'],
                           cfg.get('tune'), ramadan, plus)
            if use_habous: calc_used = True
        is_next = known and length == 29 and i == 29
        ev = []
        if not is_next:
            for table in (HIJRI_EVENTS, HIJRI_EVENTS_MA if cfg['country'] == 'MA' else {}):
                if (hm, hd) in table: ev.append(table[(hm, hd)])
        if (day.month, day.day) in NATIONAL.get(cfg['country'], {}):
            ev.append(NATIONAL[cfg['country']][(day.month, day.day)] + ('fete',))
        rows.append(dict(date=day, hday=hd, times=t, events=ev, is_next=is_next, uncertain=(i == 29 and not known)))

    nxt = hijri.following(cur, cfg, official)
    return dict(start=start, mois=hm, annee=hy, length=length, length_known=known, rows=rows, nxt=nxt,
                calc_used=calc_used, key='%d-%02d' % (hy, hm), announced=bool(official))


def _shift(hhmm, minutes):
    if not minutes: return hhmm
    h, m = map(int, hhmm.split(':')); t = (h * 60 + m + minutes) % 1440
    return '%02d:%02d' % divmod(t, 60)


# ---------------------------------------------------------------- rendering with the system Chromium (Edge)
def browser_exe():
    cands = []
    for root in (winreg.HKEY_LOCAL_MACHINE, winreg.HKEY_CURRENT_USER):
        for sub in (r'SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\msedge.exe',
                    r'SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe'):
            try: cands.append(winreg.QueryValue(root, sub))
            except OSError: pass
    cands += [r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
              r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
              r'C:\Program Files\Google\Chrome\Application\chrome.exe']
    for c in cands:
        if c and os.path.exists(c): return c
    raise RuntimeError('Microsoft Edge / Chrome not found')


def render_files(M, cfg, theme=None, pdf=True):
    theme = theme or cfg.get('theme', 'glass')
    a3 = cfg.get('paper') == 'A3'
    base = os.path.join(paths.OUT, 'mawaqit-%s-%s' % (M['key'], theme))
    html = render.render_html(M, cfg, theme, font_base=render.file_url(paths.FONTS) + '/')
    open(base + '.html', 'w', encoding='utf-8').write(html)
    prof = tempfile.mkdtemp(prefix='edge-', dir=paths.CACHE)
    common = [browser_exe(), '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
              '--disable-extensions', '--user-data-dir=' + prof, '--run-all-compositor-stages-before-draw',
              '--virtual-time-budget=4000']
    try:
        run_hidden(common + ['--window-size=794,1123', '--force-device-scale-factor=%s' % (4.2 if a3 else 3),
                             '--screenshot=' + base + '.png', render.file_url(base + '.html')], timeout=120)
        if pdf:
            wrap = base + '-print.html'
            size = ('A3', '297mm', '420mm') if a3 else ('A4', '210mm', '297mm')
            open(wrap, 'w', encoding='utf-8').write(
                '<html><head><style>@page{size:%s;margin:0}html,body{margin:0}img{width:%s;height:%s;display:block}</style>'
                '</head><body><img src="%s"></body></html>' % (size + (os.path.basename(base) + '.png',)))
            run_hidden(common + ['--print-to-pdf=' + base + '.pdf', '--no-pdf-header-footer', render.file_url(wrap)], timeout=120)
            os.remove(wrap)
    finally:
        shutil.rmtree(prof, ignore_errors=True)
    return base + '.png', (base + '.pdf' if pdf else None)


# ---------------------------------------------------------------- print & notify (hidden PowerShell)
def _ps(script, timeout=180):
    # script goes through stdin (no -EncodedCommand / -WindowStyle Hidden: antivirus products flag that pattern)
    return run_hidden([POWERSHELL, '-NoProfile', '-NoLogo', '-Command', '-'], input=script + '\n', timeout=timeout)


def printers():
    r = _ps("Get-Printer | ForEach-Object { 'P>' + $_.Name }", 60)
    return [l[2:].strip() for l in (r.stdout or '').splitlines() if l.startswith('P>')]


def print_png(png, cfg, to_file=None):
    q = lambda s: str(s).replace("'", "''")
    script = r'''
$ErrorActionPreference = 'Stop'
try {
Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('%s')
$pd = New-Object System.Drawing.Printing.PrintDocument
if ('%s' -ne '') { $pd.PrinterSettings.PrinterName = '%s' }
$pd.PrinterSettings.Copies = %d
$pd.DocumentName = 'Al-Kitab Al-Mawqut'
$pd.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0,0,0,0)
foreach ($s in $pd.PrinterSettings.PaperSizes) { if ($s.Kind -eq '%s') { $pd.DefaultPageSettings.PaperSize = $s } }
$pd.add_PrintPage({ param($s,$e)
  $b = $e.PageBounds; $r = [Math]::Min($b.Width / $img.Width, $b.Height / $img.Height)
  $w = $img.Width * $r; $h = $img.Height * $r
  $e.Graphics.InterpolationMode = 'HighQualityBicubic'
  $e.Graphics.DrawImage($img, [single](($b.Width - $w) / 2), [single](($b.Height - $h) / 2), [single]$w, [single]$h) })
%s
$pd.Print(); $img.Dispose(); 'PRINT-OK'
} catch { 'PRINT-ERR ' + $_.Exception.Message }
''' % (q(png), q(cfg.get('printer', '')), q(cfg.get('printer', '')), int(cfg.get('copies', 1)),
       'A3' if cfg.get('paper') == 'A3' else 'A4',
       ("$pd.PrinterSettings.PrintToFile = $true; $pd.PrinterSettings.PrintFileName = '%s'" % q(to_file)) if to_file else '')
    r = _ps(script)
    out = r.stdout or ''
    if 'PRINT-OK' not in out:
        err = [l for l in out.splitlines() if l.startswith('PRINT-ERR')]
        raise RuntimeError(err[0][10:] if err else (r.stderr or out)[-300:])


def notify(title, msg):
    q = lambda s: s.replace("'", "''")
    script = ('Add-Type -AssemblyName System.Windows.Forms; $n = New-Object System.Windows.Forms.NotifyIcon; '
              '$n.Icon = [System.Drawing.SystemIcons]::Information; $n.Visible = $true; '
              "$n.ShowBalloonTip(10000, '%s', '%s', 'Info'); Start-Sleep 10; $n.Dispose()" % (q(title), q(msg)))
    p = subprocess.Popen([POWERSHELL, '-NoProfile', '-NoLogo', '-Command', '-'], stdin=subprocess.PIPE,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=NOWIN,
                         text=True, encoding='utf-8')
    p.stdin.write(script + '\n'); p.stdin.close()


# ---------------------------------------------------------------- scheduled task
TASK = paths.APP_ID


def task_on():
    return run_hidden([SCHTASKS, '/Query', '/TN', TASK]).returncode == 0


def set_task(on, current_key=None):
    if on:
        cmd = ' '.join('"%s"' % a for a in paths.launcher()) + ' --auto'
        r = run_hidden([SCHTASKS, '/Create', '/TN', TASK, '/SC', 'HOURLY', '/TR', cmd, '/F'])
        if current_key:   # automation starts with the NEXT month
            json.dump({'printed': current_key}, open(paths.STATE_F, 'w'))
    else:
        r = run_hidden([SCHTASKS, '/Delete', '/TN', TASK, '/F'])
    return r.returncode == 0, ((r.stdout or '') + (r.stderr or '')).strip()


def auto_run():
    """Called hourly by Windows Task Scheduler."""
    cfg = config.load()
    if not (cfg.get('auto_print') and cfg.get('printer')):
        return
    state = json.load(open(paths.STATE_F)) if os.path.exists(paths.STATE_F) else {}
    M = build_model(cfg)
    if M['start'] > dt.date.today() + D(days=1) or state.get('printed') == M['key']:
        return
    png, pdf = render_files(M, cfg)
    title = '%s %d' % (HIJRI['ar'][M['mois'] - 1], M['annee'])
    try:
        print_png(png, cfg)
        state['printed'] = M['key']; json.dump(state, open(paths.STATE_F, 'w'))
        log.info('auto-printed %s', M['key'])
        notify(paths.APP_NAME_AR, 'طُبعت ورقة شهر ' + title)
    except Exception as e:
        log.error('auto print failed: %s', e)
        notify(paths.APP_NAME_AR, 'تعذّرت الطباعة: ' + str(e)[:120])
