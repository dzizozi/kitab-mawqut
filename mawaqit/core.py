"""Core: sources -> monthly model -> files -> print / notify (OS specifics live in osal.py)."""
import json, os, datetime as dt, logging, tempfile, shutil
import requests
from . import paths, calc, hijri, config, render, osal
from .osal import run_hidden, printers, notify, task_on, open_path
from .events import HIJRI_EVENTS, HIJRI_EVENTS_MA, NATIONAL, HIJRI

HABOUS = 'https://www.habous.gov.ma/data/'
UA = {'User-Agent': 'Mozilla/5.0 AlKitabAlMawqut/' + paths.VERSION}
logging.basicConfig(filename=paths.LOG_F, level=logging.INFO, encoding='utf-8',
                    format='%(asctime)s %(levelname)s %(message)s')
log = logging.getLogger('mawqut')
D = dt.timedelta


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


# ---------------------------------------------------------------- rendering
import threading
_render_lock = threading.Lock()


def render_files(M, cfg, theme=None, pdf=True, paper=None, sheet='month'):
    """Sheet -> PNG (+PDF). Serialised and atomic: two clicks on «print» can no longer collide.
    sheet='month' (prayer times, M = month model) or 'hizb' (daily reading, M = ahzab.day_model)."""
    from PIL import Image
    theme = theme or cfg.get('theme', 'glass')
    a3 = (paper or cfg.get('paper')) == 'A3'
    base = os.path.join(paths.OUT, '%s-%s-%s%s' % ('hizb' if sheet == 'hizb' else 'mawaqit', M['key'], theme, '-A3' if a3 else ''))
    with _render_lock:
        fn = render.render_hizb_html if sheet == 'hizb' else render.render_html
        html = fn(M, cfg, theme, font_base=render.file_url(paths.FONTS) + '/')
        open(base + '.html', 'w', encoding='utf-8').write(html)
        tmp = tempfile.mkdtemp(prefix='render-', dir=paths.CACHE)
        tmp_png = os.path.join(tmp, 'sheet.png')
        try:
            for attempt in (1, 2):                       # one retry if the headless browser hiccups
                try:
                    osal.screenshot(base + '.html', tmp_png, 4.2 if a3 else 3, os.path.join(tmp, 'profile%d' % attempt))
                    break
                except Exception:
                    if attempt == 2: raise
                    log.warning('render retry')
            os.replace(tmp_png, base + '.png')
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
        if pdf:   # PDF built from the PNG (keeps blur/glass effects exactly as rendered)
            im = Image.open(base + '.png').convert('RGB')
            im.save(base + '.pdf', 'PDF', resolution=im.width / (11.69 if a3 else 8.27))
    return base + '.png', (base + '.pdf' if pdf else None)


def print_sheet(png, pdf, cfg, to_file=None):
    if os.environ.get('MAWQUT_DRYRUN'):          # diagnostics: everything except the real print job
        log.info('dry-run print %s x%s on %s: %s', cfg.get('paper'), cfg.get('copies'), cfg.get('printer'), png); return
    osal.print_sheet(png, pdf, cfg, to_file)


_print_lock = threading.Lock()


def print_all(M, cfg, sheet='month'):
    """Print every configured size (e.g. 2 x A3 + 3 x A4). Returns a short Arabic summary."""
    if not _print_lock.acquire(blocking=False):
        raise RuntimeError('الطباعة جارية، انتظر قليلاً')
    try:
        return _print_all(M, cfg, sheet)
    finally:
        _print_lock.release()


def _print_all(M, cfg, sheet='month'):
    jobs = config.print_jobs(cfg)
    if not jobs:
        raise RuntimeError('اختر عدد الأوراق والطابعة لحجم A4 أو A3')
    done = []
    for paper, copies, printer in jobs:
        png, pdf = render_files(M, cfg, paper=paper, sheet=sheet)
        print_sheet(png, pdf, dict(cfg, paper=paper, copies=copies, printer=printer))
        done.append('%d × %s' % (copies, paper))
    return ' + '.join(done)


def set_task(on, current_key=None):
    ok, msg = osal.set_task(on)
    if on and ok and current_key:      # automation starts with the NEXT month
        json.dump({'printed': current_key}, open(paths.STATE_F, 'w'))
    return ok, msg


def auto_run():
    """Called hourly by the OS scheduler (Task Scheduler / launchd / systemd)."""
    cfg = config.load()
    if not (cfg.get('auto_print') and config.print_jobs(cfg)):
        return
    state = json.load(open(paths.STATE_F)) if os.path.exists(paths.STATE_F) else {}
    M = build_model(cfg)
    if M['start'] > dt.date.today() + D(days=1) or state.get('printed') == M['key']:
        return
    title = '%s %d' % (HIJRI['ar'][M['mois'] - 1], M['annee'])
    try:
        summary = print_all(M, cfg)
        state['printed'] = M['key']; json.dump(state, open(paths.STATE_F, 'w'))
        log.info('auto-printed %s: %s', M['key'], summary)
        notify(paths.APP_NAME_AR, 'طُبعت ورقة شهر %s (%s)' % (title, summary))
    except Exception as e:
        log.error('auto print failed: %s', e)
        notify(paths.APP_NAME_AR, 'تعذّرت الطباعة: ' + str(e)[:120])


def background_loop(interval_min=20):
    """Hidden resident process started with Windows: waits for the new Hijri month, then prints.
    Uses no window and ~no CPU (sleeps between checks; survives sleep/hibernate)."""
    import time
    if osal.WIN:
        import ctypes
        ctypes.windll.kernel32.CreateMutexW(None, False, 'Local\\' + paths.APP_ID + '-background')
        if ctypes.windll.kernel32.GetLastError() == 183:        # ERROR_ALREADY_EXISTS -> one instance only
            return
    open(osal.PID_F, 'w').write(str(os.getpid()))
    log.info('background started (pid %d)', os.getpid())
    time.sleep(90)                                              # let the network come up after boot
    while True:
        cfg = config.load()
        if not cfg.get('auto_print'):
            log.info('auto print disabled - background exits'); break
        try:
            auto_run()
        except Exception:
            log.exception('background check')
        time.sleep(interval_min * 60)
    try: os.remove(osal.PID_F)
    except OSError: pass


def hizb_month_files(cfg, start_day, first_hizb=1, days=30, theme=None, progress=None):
    """30 hizb pages (2 hizbs/day = one khatma) -> list of PNGs + one multi-page A4 PDF."""
    from PIL import Image
    from . import ahzab
    theme = theme or cfg.get('theme', 'glass')
    pngs = []
    for k in range(days):
        day = start_day + D(days=k)
        f = ahzab.nxt(first_hizb, 2 * k)
        H = ahzab.day_model(cfg, day, f, ahzab.nxt(f))
        png, _ = render_files(H, cfg, theme, pdf=False, paper='A4', sheet='hizb')
        pngs.append(png)
        if progress: progress(k + 1, days)
    pdf = os.path.join(paths.OUT, 'ahzab-%s-%s.pdf' % (start_day.isoformat(), theme))
    ims = [Image.open(p).convert('RGB') for p in pngs]
    ims[0].save(pdf, 'PDF', resolution=ims[0].width / 8.27, save_all=True, append_images=ims[1:])
    return pngs, pdf


def print_hizb_month(cfg, start_day, first_hizb=1, copies=1, printer=None, duplex=True, progress=None):
    if not _print_lock.acquire(blocking=False):
        raise RuntimeError('الطباعة جارية، انتظر قليلاً')
    try:
        printer = printer or cfg.get('a4_printer') or cfg.get('printer') or ''
        if not printer:
            raise RuntimeError('اختر طابعة A4 أولاً')
        pngs, pdf = hizb_month_files(cfg, start_day, first_hizb, progress=progress)
        print_sheet(pngs, pdf, dict(cfg, paper='A4', copies=copies, printer=printer, duplex=duplex))
        sheets = (len(pngs) + 1) // 2 if duplex else len(pngs)
        return '%d صفحة على %d ورقة A4%s' % (len(pngs), sheets * copies, ' (وجهان)' if duplex else '')
    finally:
        _print_lock.release()
