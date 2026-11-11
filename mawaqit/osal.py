"""OS abstraction: rendering browser, printing, notifications, scheduled background run, opening files.
Windows / macOS / Linux. Every subprocess runs without a visible console."""
import os, sys, shutil, subprocess, json, plistlib, glob
from . import paths

WIN, MAC = sys.platform == 'win32', sys.platform == 'darwin'
LINUX = not (WIN or MAC)
NOWIN = 0x08000000 if WIN else 0          # CREATE_NO_WINDOW
TASK = paths.APP_ID
if WIN:
    SYS32 = os.path.join(os.environ.get('SystemRoot', r'C:\Windows'), 'System32')
    POWERSHELL = os.path.join(SYS32, 'WindowsPowerShell', 'v1.0', 'powershell.exe')
    SCHTASKS = os.path.join(SYS32, 'schtasks.exe')


def run_hidden(args, **kw):
    kw.setdefault('capture_output', True); kw.setdefault('text', True)
    kw.setdefault('encoding', 'oem' if WIN else 'utf-8'); kw.setdefault('errors', 'replace')
    if WIN: kw['creationflags'] = NOWIN
    return subprocess.run(args, **kw)


# ---------------------------------------------------------------- headless renderer
def browser():
    """Return (kind, exe): kind = 'chromium' | 'firefox'."""
    cands = []
    if WIN:
        import winreg
        for root in (winreg.HKEY_LOCAL_MACHINE, winreg.HKEY_CURRENT_USER):
            for sub in ('msedge.exe', 'chrome.exe'):
                try: cands.append(winreg.QueryValue(root, r'SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\\' + sub))
                except OSError: pass
        cands += [r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
                  r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
                  r'C:\Program Files\Google\Chrome\Application\chrome.exe']
    elif MAC:
        for app, exe in (('Google Chrome', 'Google Chrome'), ('Microsoft Edge', 'Microsoft Edge'),
                         ('Brave Browser', 'Brave Browser'), ('Chromium', 'Chromium'), ('Vivaldi', 'Vivaldi'),
                         ('Opera', 'Opera')):
            for root in ('/Applications', os.path.expanduser('~/Applications')):
                cands.append(os.path.join(root, app + '.app', 'Contents', 'MacOS', exe))
    else:
        for n in ('google-chrome', 'google-chrome-stable', 'chromium', 'chromium-browser', 'microsoft-edge',
                  'microsoft-edge-stable', 'brave-browser', 'vivaldi'):
            cands.append(shutil.which(n))
        cands += ['/snap/bin/chromium', '/var/lib/flatpak/exports/bin/org.chromium.Chromium']
    for c in cands:
        if c and os.path.exists(c): return 'chromium', c
    ff = None
    if MAC:
        ff = '/Applications/Firefox.app/Contents/MacOS/firefox'
    elif LINUX:
        ff = shutil.which('firefox') or shutil.which('firefox-esr')
    if ff and os.path.exists(ff): return 'firefox', ff
    if MAC: return 'webkit', None          # built-in WKWebView fallback (see mac_render.py)
    raise RuntimeError('لم يُعثر على متصفح Chrome أو Chromium أو Edge أو Firefox لتصميم الورقة')


def screenshot(html_path, png_path, scale, tmpdir):
    kind, exe = browser()
    url = 'file://' + ('/' if WIN else '') + os.path.abspath(html_path).replace('\\', '/')
    if kind == 'chromium':
        args = [exe, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
                '--disable-extensions', '--user-data-dir=' + tmpdir, '--run-all-compositor-stages-before-draw',
                '--virtual-time-budget=4000', '--window-size=794,1123', '--force-device-scale-factor=%s' % scale,
                '--screenshot=' + png_path, url]
        if LINUX: args.insert(1, '--no-sandbox')
        run_hidden(args, timeout=120)
    elif kind == 'firefox':
        open(os.path.join(tmpdir, 'user.js'), 'w').write('user_pref("layout.css.devPixelsPerPx", "%s");\n' % scale)
        run_hidden([exe, '--headless', '--no-remote', '--profile', tmpdir, '--window-size=794,1123',
                    '--screenshot', png_path, url], timeout=120)
    else:
        from . import mac_render
        mac_render.snapshot(html_path, png_path, scale)
    if not os.path.exists(png_path):
        raise RuntimeError('تعذّر تصميم الورقة (%s)' % kind)


# ---------------------------------------------------------------- printers & printing
def _ps(script, timeout=180):
    # script on stdin: -EncodedCommand / -WindowStyle Hidden is blocked by some antivirus products
    return run_hidden([POWERSHELL, '-NoProfile', '-NoLogo', '-Command', '-'], input=script + '\n', timeout=timeout)


def printers():
    if WIN:
        r = _ps("Get-Printer | ForEach-Object { 'P>' + $_.Name }", 60)
        return [l[2:].strip() for l in (r.stdout or '').splitlines() if l.startswith('P>')]
    if not shutil.which('lpstat'): return []
    r = run_hidden(['lpstat', '-e'], timeout=30)
    return [l.strip() for l in (r.stdout or '').splitlines() if l.strip()]


def print_sheet(png, pdf, cfg, to_file=None):
    paper = 'A3' if cfg.get('paper') == 'A3' else 'A4'
    copies = int(cfg.get('copies', 1))
    printer = cfg.get('printer', '')
    if not WIN:
        args = ['lp', '-n', str(copies), '-o', 'media=' + paper, '-o', 'fit-to-page', '-t', 'Al-Kitab Al-Mawqut']
        if printer: args += ['-d', printer]
        r = run_hidden(args + [pdf], timeout=120)
        if r.returncode: raise RuntimeError((r.stderr or r.stdout or 'lp error').strip()[-300:])
        return
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
''' % (q(png), q(printer), q(printer), copies, paper,
       ("$pd.PrinterSettings.PrintToFile = $true; $pd.PrinterSettings.PrintFileName = '%s'" % q(to_file)) if to_file else '')
    r = _ps(script)
    out = r.stdout or ''
    if 'PRINT-OK' not in out:
        err = [l for l in out.splitlines() if l.startswith('PRINT-ERR')]
        raise RuntimeError(err[0][10:] if err else (r.stderr or out)[-300:])


# ---------------------------------------------------------------- notifications & files
def notify(title, msg):
    try:
        if WIN:
            q = lambda s: s.replace("'", "''")
            script = ('Add-Type -AssemblyName System.Windows.Forms; $n = New-Object System.Windows.Forms.NotifyIcon; '
                      '$n.Icon = [System.Drawing.SystemIcons]::Information; $n.Visible = $true; '
                      "$n.ShowBalloonTip(10000, '%s', '%s', 'Info'); Start-Sleep 10; $n.Dispose()" % (q(title), q(msg)))
            p = subprocess.Popen([POWERSHELL, '-NoProfile', '-NoLogo', '-Command', '-'], stdin=subprocess.PIPE,
                                 stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=NOWIN,
                                 text=True, encoding='utf-8')
            p.stdin.write(script + '\n'); p.stdin.close()
        elif MAC:
            esc = lambda s: s.replace('\\', '\\\\').replace('"', '\\"')
            subprocess.Popen(['osascript', '-e', 'display notification "%s" with title "%s"' % (esc(msg), esc(title))])
        elif shutil.which('notify-send'):
            subprocess.Popen(['notify-send', '-a', paths.APP_NAME_LAT, title, msg])
    except Exception:
        pass


def open_path(p):
    if WIN: os.startfile(p)
    elif MAC: subprocess.Popen(['open', p])
    else: subprocess.Popen(['xdg-open', p])


# ---------------------------------------------------------------- hourly background run
MAC_PLIST = os.path.expanduser('~/Library/LaunchAgents/org.alkitab.mawqut.plist')
SYSTEMD = os.path.expanduser('~/.config/systemd/user')
UNIT = 'alkitab-mawqut'


def task_on():
    if WIN:
        return run_hidden([SCHTASKS, '/Query', '/TN', TASK]).returncode == 0
    if MAC:
        return os.path.exists(MAC_PLIST)
    if os.path.exists(os.path.join(SYSTEMD, UNIT + '.timer')):
        return True
    r = run_hidden(['crontab', '-l']) if shutil.which('crontab') else None
    return bool(r and UNIT in (r.stdout or ''))


def set_task(on):
    cmd = paths.launcher() + ['--auto']
    if WIN:
        if on:
            r = run_hidden([SCHTASKS, '/Create', '/TN', TASK, '/SC', 'HOURLY', '/TR',
                            ' '.join('"%s"' % a for a in cmd), '/F'])
        else:
            r = run_hidden([SCHTASKS, '/Delete', '/TN', TASK, '/F'])
        return r.returncode == 0, ((r.stdout or '') + (r.stderr or '')).strip()
    if MAC:
        uid = str(os.getuid())
        if on:
            os.makedirs(os.path.dirname(MAC_PLIST), exist_ok=True)
            plistlib.dump(dict(Label='org.alkitab.mawqut', ProgramArguments=cmd, StartInterval=3600, RunAtLoad=True,
                               StandardOutPath='/dev/null', StandardErrorPath='/dev/null'), open(MAC_PLIST, 'wb'))
            run_hidden(['launchctl', 'bootout', 'gui/' + uid, MAC_PLIST])
            r = run_hidden(['launchctl', 'bootstrap', 'gui/' + uid, MAC_PLIST])
            return r.returncode == 0, (r.stderr or '').strip()
        run_hidden(['launchctl', 'bootout', 'gui/' + uid, MAC_PLIST])
        if os.path.exists(MAC_PLIST): os.remove(MAC_PLIST)
        return True, ''
    # Linux: systemd user timer, else crontab
    quoted = ' '.join("'%s'" % a.replace("'", "'\\''") for a in cmd)
    if shutil.which('systemctl') and run_hidden(['systemctl', '--user', 'show-environment']).returncode == 0:
        svc, tmr = os.path.join(SYSTEMD, UNIT + '.service'), os.path.join(SYSTEMD, UNIT + '.timer')
        if on:
            os.makedirs(SYSTEMD, exist_ok=True)
            open(svc, 'w').write('[Unit]\nDescription=Al-Kitab Al-Mawqut monthly sheet\n\n[Service]\nType=oneshot\n'
                                 'ExecStart=%s\n' % quoted)
            open(tmr, 'w').write('[Unit]\nDescription=Al-Kitab Al-Mawqut hourly check\n\n[Timer]\nOnCalendar=hourly\n'
                                 'OnStartupSec=5min\nPersistent=true\n\n[Install]\nWantedBy=timers.target\n')
            run_hidden(['systemctl', '--user', 'daemon-reload'])
            r = run_hidden(['systemctl', '--user', 'enable', '--now', UNIT + '.timer'])
            return r.returncode == 0, (r.stderr or '').strip()
        run_hidden(['systemctl', '--user', 'disable', '--now', UNIT + '.timer'])
        for f in (svc, tmr):
            if os.path.exists(f): os.remove(f)
        run_hidden(['systemctl', '--user', 'daemon-reload'])
        return True, ''
    cur = run_hidden(['crontab', '-l']).stdout or ''
    lines = [l for l in cur.splitlines() if UNIT not in l]
    if on: lines.append('7 * * * * %s  # %s' % (quoted, UNIT))
    r = run_hidden(['crontab', '-'], input='\n'.join(lines) + '\n')
    return r.returncode == 0, (r.stderr or '').strip()
