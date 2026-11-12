"""File locations: bundled resources (read-only) and per-user data (%APPDATA%)."""
import os, sys

APP_ID = 'AlKitabAlMawqut'
APP_NAME_AR = 'كتابا موقوتا'
APP_NAME_LAT = 'Al-Kitab Al-Mawqut'
VERSION = '1.6.0'

FROZEN = getattr(sys, 'frozen', False)
RES = os.path.join(sys._MEIPASS, 'mawaqit') if FROZEN else os.path.dirname(os.path.abspath(__file__))
DATA_RES = os.path.join(RES, 'data')
FONTS = os.path.join(RES, 'fonts')
if sys.platform == 'win32':
    USER = os.path.join(os.environ.get('APPDATA') or os.path.expanduser('~'), APP_ID)
elif sys.platform == 'darwin':
    USER = os.path.expanduser('~/Library/Application Support/' + APP_ID)
else:
    USER = os.path.join(os.environ.get('XDG_DATA_HOME') or os.path.expanduser('~/.local/share'), APP_ID)
CACHE = os.path.join(USER, 'cache')
OUT = os.path.join(USER, 'sheets')
for d in (USER, CACHE, OUT):
    os.makedirs(d, exist_ok=True)
CONFIG_F = os.path.join(USER, 'config.json')
STATE_F = os.path.join(USER, 'state.json')
LOG_F = os.path.join(USER, 'log.txt')


def launcher():
    """Command that starts this program (used for the scheduled task)."""
    if FROZEN:
        return [sys.executable]
    pyw = os.path.join(os.path.dirname(sys.executable), 'pythonw.exe')
    exe = pyw if (sys.platform == 'win32' and os.path.exists(pyw)) else sys.executable
    return [exe, os.path.join(os.path.dirname(RES), 'run.py')]
