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
    os.makedirs(tmpdir, exist_ok=True)
    kind, exe = browser()
    url = 'file://' + ('/' if WIN else '') + os.path.abspath(html_path).replace('\\', '/')
    if kind == 'chromium':
        args = [exe, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--no-default-browser-check',
                '--disable-extensions', '--user-data-dir=' + tmpdir, '--run-all-compositor-stages-before-draw',
                '--virtual-time-budget=4000', '--window-size=794,1123', '--force-device-scale-factor=%s' % scale,
                '--screenshot=' + png_path, url]
        if LINUX: args.insert(1, '--no-sandbox')
        r = run_hidden(args, timeout=120)
        if not os.path.exists(png_path):
            import logging
            logging.getLogger('mawqut').warning('browser rc=%s %s', r.returncode, ((r.stderr or '') + (r.stdout or ''))[-400:])
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
    """png: one image path or a list (one page each). cfg['duplex'] -> recto-verso (long edge)."""
    pngs = png if isinstance(png, (list, tuple)) else [png]
    paper = 'A3' if cfg.get('paper') == 'A3' else 'A4'
    copies = int(cfg.get('copies', 1))
    printer = cfg.get('printer', '')
    duplex = bool(cfg.get('duplex'))
    if not WIN:
        args = ['lp', '-n', str(copies), '-o', 'media=' + paper, '-o', 'fit-to-page', '-t', 'Al-Kitab Al-Mawqut']
        if duplex: args += ['-o', 'sides=two-sided-long-edge', '-o', 'collate=true']
        if printer: args += ['-d', printer]
        r = run_hidden(args + [pdf], timeout=300)
        if r.returncode: raise RuntimeError((r.stderr or r.stdout or 'lp error').strip()[-300:])
        return
    q = lambda s: str(s).replace("'", "''")
    files = ','.join("'%s'" % q(f) for f in pngs)
    import time as _t
    docname = 'Kitab Mawqut %s x%d %s' % (paper, copies, _t.strftime('%H%M%S'))
    script = r"""
$ErrorActionPreference = 'Stop'
try {
Add-Type -AssemblyName System.Drawing
$files = @(%s)
$global:i = 0
$pd = New-Object System.Drawing.Printing.PrintDocument
if ('%s' -ne '') { $pd.PrinterSettings.PrinterName = '%s' }
$pd.PrinterSettings.Copies = %d
$pd.PrinterSettings.Collate = $true
$pd.DocumentName = '%s'
if (%s) {
  if (-not $pd.PrinterSettings.CanDuplex) { throw 'DUPLEX-NO' }
  $pd.PrinterSettings.Duplex = [System.Drawing.Printing.Duplex]::Vertical      # long edge (portrait book)
}
$pd.OriginAtMargins = $false
$pd.DefaultPageSettings.Landscape = $false
$pd.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0,0,0,0)
foreach ($s in $pd.PrinterSettings.PaperSizes) { if ($s.Kind -eq '%s') { $pd.DefaultPageSettings.PaperSize = $s; $pd.PrinterSettings.DefaultPageSettings.PaperSize = $s } }
$pd.add_PrintPage({ param($s,$e)
  # Graphics origin = top-left of the PRINTABLE area: fit the page inside it, centred, aspect ratio kept.
  $img = [System.Drawing.Image]::FromFile($files[$global:i])
  $v = $e.Graphics.VisibleClipBounds
  $r = [Math]::Min($v.Width / $img.Width, $v.Height / $img.Height)
  $w = $img.Width * $r; $h = $img.Height * $r
  $e.Graphics.InterpolationMode = 'HighQualityBicubic'
  $e.Graphics.DrawImage($img, [single]($v.X + ($v.Width - $w) / 2), [single]($v.Y + ($v.Height - $h) / 2), [single]$w, [single]$h)
  $img.Dispose()
  $global:i++
  $e.HasMorePages = ($global:i -lt $files.Count) })
$pd.add_BeginPrint({ $global:i = 0 })
%s
$pd.Print()
# wait until the job has left the Windows queue, so the next job (other paper size) is never mixed with it
if ('%s' -ne '' -and -not $pd.PrinterSettings.PrintToFile) {
  for ($k = 0; $k -lt 120; $k++) {
    Start-Sleep -Milliseconds 1000
    $j = Get-PrintJob -PrinterName '%s' -ErrorAction SilentlyContinue | Where-Object { $_.DocumentName -eq $pd.DocumentName }
    if (-not $j) { break }
    if ($j.JobStatus -match 'Error|Blocked|PaperOut|Offline') { 'PRINT-WARN ' + $j.JobStatus; break }
  } }
'PRINT-OK'
} catch { 'PRINT-ERR ' + $_.Exception.Message }
""" % (files, q(printer), q(printer), copies, q(docname), '$true' if duplex else '$false', paper,
       ("$pd.PrinterSettings.PrintToFile = $true; $pd.PrinterSettings.PrintFileName = '%s'" % q(to_file)) if to_file else '',
       q(printer), q(printer))
    r = _ps(script, timeout=320 + 20 * len(pngs))
    out = r.stdout or ''
    import logging
    logging.getLogger('mawqut').info('print job «%s» on %s: %s', docname, printer,
                                      ' '.join(l for l in out.splitlines() if l.startswith('PRINT-')) or out[-200:])
    if 'PRINT-WARN' in out:
        raise RuntimeError('الطابعة أوقفت الطلب %s: %s' % (paper, out.split('PRINT-WARN', 1)[1].split()[0]))
    if 'PRINT-OK' not in out:
        err = [l for l in out.splitlines() if l.startswith('PRINT-ERR')]
        if err and 'DUPLEX-NO' in err[0]:
            raise RuntimeError('هذه الطابعة لا تدعم الطباعة على الوجهين (recto-verso)')
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


RUN_KEY = r'Software\Microsoft\Windows\CurrentVersion\Run'
PID_F = os.path.join(paths.USER, 'background.pid')


def _win_run_value():
    import winreg
    try:
        with winreg.OpenKey(winreg.HKEY_CURRENT_USER, RUN_KEY) as k:
            return winreg.QueryValueEx(k, TASK)[0]
    except OSError:
        return None


def background_running():
    """PID of the hidden background process, if alive."""
    try:
        pid = int(open(PID_F).read().strip())
    except Exception:
        return None
    if WIN:
        import ctypes
        h = ctypes.windll.kernel32.OpenProcess(0x1000, False, pid)      # QUERY_LIMITED_INFORMATION
        if not h: return None
        code = ctypes.c_ulong(); ctypes.windll.kernel32.GetExitCodeProcess(h, ctypes.byref(code))
        ctypes.windll.kernel32.CloseHandle(h)
        return pid if code.value == 259 else None                         # STILL_ACTIVE
    try:
        os.kill(pid, 0); return pid
    except OSError:
        return None


def start_background():
    cmd = paths.launcher() + ['--background']
    if WIN:
        subprocess.Popen(cmd, creationflags=0x00000008 | 0x00000200 | NOWIN, close_fds=True,   # DETACHED | NEW_GROUP
                         stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    else:
        subprocess.Popen(cmd, start_new_session=True, stdin=subprocess.DEVNULL,
                         stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)


def stop_background():
    pid = background_running()
    if not pid: return
    if WIN:
        run_hidden([os.path.join(SYS32, 'taskkill.exe'), '/PID', str(pid), '/F'])
    else:
        try: os.kill(pid, 15)
        except OSError: pass


def task_on():
    if WIN:
        return _win_run_value() is not None
    if MAC:
        return os.path.exists(MAC_PLIST)
    if os.path.exists(os.path.join(SYSTEMD, UNIT + '.timer')):
        return True
    r = run_hidden(['crontab', '-l']) if shutil.which('crontab') else None
    return bool(r and UNIT in (r.stdout or ''))


def set_task(on):
    cmd = paths.launcher() + ['--auto']
    if WIN:
        # Windows: start with Windows (HKCU Run = «Startup apps» in Settings) and stay hidden in the background
        import winreg
        run_hidden([SCHTASKS, '/Delete', '/TN', TASK, '/F'])          # old hourly task (v1.0–1.2)
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, RUN_KEY) as k:
            if on:
                winreg.SetValueEx(k, TASK, 0, winreg.REG_SZ,
                                  ' '.join('"%s"' % a for a in paths.launcher()) + ' --background')
            else:
                try: winreg.DeleteValue(k, TASK)
                except OSError: pass
        stop_background()
        if on: start_background()                                      # no need to restart Windows
        return True, ''
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
