"""Desktop window (pywebview / Edge WebView2 – Chromium) + local API. No external browser, no console."""
import json, os, threading, socket, urllib.parse, base64, io, time, datetime as dt
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from . import paths, config, core, render, themes, calc, ahzab, fonts_cfg

_lock = threading.Lock()
STATE = dict(cfg=None, draft=None, model=None, model_sig=None)
JOB = dict(running=False, done=0, total=0, msg='', ok=None)
MODEL_KEYS = ('country', 'lat', 'lon', 'tz', 'habous_id', 'method', 'asr', 'hijri_mode', 'hijri_adjust', 'morocco_plus1', 'tune')


def draft():
    if STATE['draft'] is None:
        STATE['cfg'] = config.load(); STATE['draft'] = json.loads(json.dumps(STATE['cfg']))
    return STATE['draft']


def model(cfg):
    sig = json.dumps({k: cfg.get(k) for k in MODEL_KEYS}, sort_keys=True) + str(dt.date.today())
    with _lock:
        if STATE['model_sig'] != sig:
            STATE['model'] = core.build_model(cfg); STATE['model_sig'] = sig
        return STATE['model']


def month_info(cfg):
    from .events import HIJRI
    M = model(cfg); n = M['nxt'][0]
    return dict(name='%s %d' % (HIJRI['ar'][M['mois'] - 1], M['annee']), start=M['start'].strftime('%d/%m/%Y'),
                next='%s %s' % (HIJRI['ar'][n['mois'] - 1], n['debut'].strftime('%d/%m/%Y')), key=M['key'])


def apply(changes):
    d = draft()
    if 'country' in changes and changes['country'] != d['country']:
        cc = changes['country']; d['country'] = cc
        d.update(config.country_defaults(cc))
        first = config.cities(cc)[0]
        d.update(config.city_info(cc, first[0])); d['city_key'] = first[0]
    if changes.get('city_key'):
        d.update(config.city_info(d['country'], changes['city_key'])); d['city_key'] = changes['city_key']
    for k in ('method', 'hijri_mode', 'lang2', 'mosque_name', 'dua', 'theme', 'printer', 'paper', 'city_name', 'city_ar',
              'a4_printer', 'a3_printer'):
        if k in changes: d[k] = changes[k]
    for k in ('asr', 'hijri_adjust', 'copies', 'a4_copies', 'a3_copies'):
        if k in changes: d[k] = int(changes[k] or 0)
    for k in ('auto_print', 'morocco_plus1'):
        if k in changes: d[k] = bool(changes[k])
    for k in ('hizb_fajr', 'hizb_isha'):
        if k in changes: d[k] = max(1, min(60, int(changes[k] or 1)))
    if changes.get('riwaya') in ('warsh', 'hafs'): d['riwaya'] = changes['riwaya']
    if changes.get('hizb_layout') in ('portrait', 'landscape'): d['hizb_layout'] = changes['hizb_layout']
    if changes.get('hizb_part') in ('both', 'fajr', 'isha'): d['hizb_part'] = changes['hizb_part']
    if changes.get('digits') in ('auto', 'western', 'eastern'): d['digits'] = changes['digits']
    for k in ('font_title', 'font_deco', 'font_text', 'font_quran'):
        if k in changes and (changes[k] in fonts_cfg.FONTS or (k == 'font_quran' and changes[k] == 'auto')): d[k] = changes[k]
    for k in fonts_cfg.SIZES:
        if k in changes: d[k] = max(60, min(500, int(changes[k] or 100)))
    if 'hizb_date' in changes: d['hizb_date'] = changes['hizb_date'] or ''
    if 'tune' in changes: d['tune'] = {k: int(v or 0) for k, v in changes['tune'].items()}
    if 'mosque_image' in changes: d['mosque_image'] = changes['mosque_image']
    if d['country'] != 'MA' and d['hijri_mode'] == 'morocco': d['hijri_mode'] = 'ummalqura'
    if d['country'] != 'MA' and d['method'] == 'MOROCCO': d['method'] = calc.COUNTRY_METHOD.get(d['country'], 'MWL')
    d['copies'] = max(1, d.get('copies') or 1)
    for k in ('a4_copies', 'a3_copies'): d[k] = max(0, min(50, int(d.get(k) or 0)))
    return d


def hizb_model(d):
    return ahzab.day_model(d, None, d.get('hizb_fajr') or 1, d.get('hizb_isha') or ahzab.nxt(d.get('hizb_fajr') or 1))


def save_image(data_url):
    from PIL import Image
    raw = base64.b64decode(data_url.split(',', 1)[1])
    im = Image.open(io.BytesIO(raw)).convert('RGB')
    w, h = im.size; s = min(w, h)
    im = im.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s)).resize((360, 360), Image.LANCZOS)
    os.makedirs(os.path.join(paths.USER, 'mosques'), exist_ok=True)
    p = os.path.join(paths.USER, 'mosques', 'mosque-%d.jpg' % int(time.time() * 1000)); im.save(p, quality=88)
    return p


def remember_mosque(d):
    """Keep the current mosque (name + image) in the saved list, so it can be picked again later."""
    name = (d.get('mosque_name') or '').strip()
    if not name: return
    lst = [m for m in (d.get('mosques') or []) if m.get('name') != name]
    lst.insert(0, dict(name=name, image=d.get('mosque_image') or ''))
    d['mosques'] = lst[:50]


def html_page():
    return open(os.path.join(paths.RES, 'ui.html'), encoding='utf-8').read()


class H(BaseHTTPRequestHandler):
    def log_message(self, fmt, *a):
        if os.environ.get('MAWQUT_HTTP_LOG'): core.log.info('http ' + fmt, *a)

    def send(self, code, body, ctype='application/json; charset=utf-8'):
        if isinstance(body, (dict, list)): body = json.dumps(body, ensure_ascii=False, default=str)
        if isinstance(body, str): body = body.encode('utf-8')
        self.send_response(code); self.send_header('Content-Type', ctype)
        self.send_header('Cache-Control', 'no-store'); self.end_headers(); self.wfile.write(body)

    def do_GET(self):
        u = urllib.parse.urlparse(self.path); q = dict(urllib.parse.parse_qsl(u.query))
        try:
            if u.path == '/':
                return self.send(200, html_page(), 'text/html; charset=utf-8')
            if u.path.startswith('/fonts/'):
                f = os.path.join(paths.FONTS, os.path.basename(u.path))
                return self.send(200, open(f, 'rb').read(), 'font/ttf')
            if u.path == '/sheet-img':
                p = draft().get('mosque_image')
                if p and os.path.exists(p):
                    return self.send(200, open(p, 'rb').read(), 'image/jpeg')
            if u.path == '/sheet':
                d = draft()
                return self.send(200, render.render_html(model(d), d, q.get('theme')), 'text/html; charset=utf-8')
            if u.path == '/hizb-sheet':
                d = draft()
                H = hizb_model(d)
                P = ahzab.day_pages(d, H['fajr']['n'], H['isha']['n'])[0]
                return self.send(200, render.render_hizb_html(P, d, q.get('theme')), 'text/html; charset=utf-8')
            if u.path == '/api/job':
                return self.send(200, JOB)
            if u.path == '/api/ahzab':
                return self.send(200, ahzab.choices(q.get('r') or ahzab.riwaya(draft())))
            if u.path == '/api/state':
                d = draft()
                return self.send(200, dict(
                    cfg=d, riwaya=ahzab.riwaya(d), fonts=fonts_cfg.choices(),
                    font_files={k: v[2][-1][0] for k, v in fonts_cfg.FONTS.items()}, task=core.task_on(), month_start=model(d)['start'].isoformat(), month=month_info(d), version=paths.VERSION, os=('win' if os.name == 'nt' else 'unix'),
                    countries=config.countries(), cities=config.cities(d['country']),
                    methods=[[k, calc.METHODS[k]['ar'], calc.METHODS[k]['en']] for k in calc.METHOD_ORDER],
                    themes=[[k, themes.THEMES[k]['name_ar'], themes.THEMES[k]['name_en']] for k in themes.ORDER]))
            if u.path == '/api/printers':
                return self.send(200, core.printers())
            if u.path == '/api/cities':
                return self.send(200, config.cities(q.get('cc', 'MA')))
            self.send(404, {'error': 'not found'})
        except Exception as e:
            core.log.exception('GET %s', self.path); self.send(500, {'ok': False, 'msg': str(e)})

    def do_POST(self):
        n = int(self.headers.get('Content-Length') or 0)
        data = json.loads(self.rfile.read(n) or b'{}')
        try:
            if self.path == '/api/draft':
                d = apply(data)
                return self.send(200, dict(ok=True, cfg=d, month=month_info(d),
                                           cities=config.cities(d['country']) if 'country' in data else None))
            if self.path == '/api/mosque':
                d = draft(); lst = d.setdefault('mosques', [])
                if 'pick' in data and 0 <= int(data['pick']) < len(lst):
                    m = lst[int(data['pick'])]
                    img = m.get('image') or ''
                    d.update(mosque_name=m['name'], mosque_image=img if (img and os.path.exists(img)) else '')
                elif 'remove' in data and 0 <= int(data['remove']) < len(lst):
                    lst.pop(int(data['remove']))
                    saved = config.load(); saved['mosques'] = lst; config.save(saved)
                return self.send(200, dict(ok=True, cfg=d))
            if self.path == '/api/image':
                d = apply({'mosque_image': save_image(data['data']) if data.get('data') else ''})
                return self.send(200, dict(ok=True, cfg=d))
            if self.path == '/api/save':
                d = apply(data)
                if d.get('auto_print') and not config.print_jobs(d):
                    return self.send(200, dict(ok=False, msg='حدّد عدد الأوراق والطابعة (A4 أو A3) لتفعيل الطباعة التلقائية'))
                remember_mosque(d)
                config.save(d); STATE['cfg'] = json.loads(json.dumps(d))
                want = bool(d.get('auto_print'))
                if want != core.task_on():
                    ok, msg = core.set_task(want, model(d)['key'] if want else None)
                    if not ok: return self.send(200, dict(ok=False, msg=msg))
                return self.send(200, dict(ok=True, msg='تم الحفظ ✓', task=core.task_on(), cfg=d))
            if self.path in ('/api/print', '/api/pdf'):
                d = draft()
                if self.path == '/api/pdf':
                    paper = 'A3' if (int(d.get('a3_copies') or 0) and not int(d.get('a4_copies') or 0)) else 'A4'
                    png, pdf = core.render_files(model(d), d, d.get('theme'), paper=paper)
                    core.open_path(pdf); return self.send(200, dict(ok=True, msg='تم فتح ملف PDF (%s) ✓' % paper))
                summary = core.print_all(model(d), d)
                return self.send(200, dict(ok=True, msg='أُرسلت إلى الطابعة: ' + summary + ' ✓'))
            if self.path in ('/api/hizb-print', '/api/hizb-pdf'):
                d = apply(data)
                H = hizb_model(d)
                saved = config.load(); saved.update(hizb_fajr=d['hizb_fajr'], hizb_isha=d['hizb_isha'], riwaya=ahzab.riwaya(d),
                             hizb_layout=d.get('hizb_layout', 'portrait'), hizb_part=d.get('hizb_part', 'both')); config.save(saved)
                if self.path == '/api/hizb-pdf':
                    paper = 'A3' if (int(d.get('a3_copies') or 0) and not int(d.get('a4_copies') or 0)) else 'A4'
                    pngs, pdf = core.hizb_pages(H, d, paper)
                    core.open_path(pdf); return self.send(200, dict(ok=True, msg='تم فتح ملف PDF (%s) ✓' % paper))
                summary = core.print_all(H, d, sheet='hizb')
                return self.send(200, dict(ok=True, msg='أُرسلت ورقة الحزب إلى الطابعة: ' + summary + ' ✓'))
            if self.path in ('/api/hizb-month', '/api/hizb-month-pdf'):
                if JOB['running']:
                    return self.send(200, dict(ok=False, msg='العمل جارٍ، انتظر قليلاً'))
                d = apply({'riwaya': data.get('riwaya')}) if data.get('riwaya') else draft()
                saved = config.load(); saved['riwaya'] = ahzab.riwaya(d); config.save(saved)
                start = None
                first = max(1, min(60, int(data.get('first') or 1)))
                copies = max(1, min(20, int(data.get('copies') or 1)))
                duplex = bool(data.get('duplex', True))
                is_pdf = self.path.endswith('pdf')
                JOB.update(running=True, done=0, total=30, msg='', ok=None)

                def work():
                    prog = lambda k, n: JOB.update(done=k, total=n)
                    try:
                        if is_pdf:
                            _, pdf = core.hizb_month_files(d, start, first, progress=prog)
                            core.open_path(pdf); JOB.update(ok=True, msg='تم فتح ملف PDF (30 صفحة A4) ✓')
                        else:
                            JOB.update(ok=True, msg='أُرسلت إلى الطابعة: ' + core.print_hizb_month(d, start, first, copies, duplex=duplex, progress=prog) + ' ✓')
                    except Exception as e:
                        core.log.exception('hizb month'); JOB.update(ok=False, msg=str(e))
                    finally:
                        JOB['running'] = False
                threading.Thread(target=work, daemon=True).start()
                return self.send(200, dict(ok=True, started=True))
            if self.path == '/api/folder':
                core.open_path(paths.OUT); return self.send(200, dict(ok=True))
            self.send(404, {'error': 'not found'})
        except Exception as e:
            core.log.exception('POST %s', self.path); self.send(500, dict(ok=False, msg=str(e)))


def serve():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); port = s.getsockname()[1]; s.close()
    srv = ThreadingHTTPServer(('127.0.0.1', port), H)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, 'http://127.0.0.1:%d/' % port


def main(debug=False):
    import webview
    srv, url = serve()
    win = webview.create_window(paths.APP_NAME_AR + ' – ' + paths.APP_NAME_LAT, url, width=1400, height=920,
                                min_size=(1100, 720), background_color='#eef3f1', text_select=True)
    import sys
    gui = 'edgechromium' if sys.platform == 'win32' else ('cocoa' if sys.platform == 'darwin' else 'qt')
    webview.start(gui=gui, debug=debug, private_mode=False, storage_path=os.path.join(paths.CACHE, 'webview'))
    srv.shutdown()
