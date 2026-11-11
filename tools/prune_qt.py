"""Shrink a PyInstaller Linux build: keep only the Qt libraries actually linked (readelf NEEDED closure)."""
import os, sys, subprocess, re, shutil, glob

root = sys.argv[1]                               # dist/AlKitabAlMawqut/_internal
qt = os.path.join(root, 'PyQt6', 'Qt6')
libdir = os.path.join(qt, 'lib')
needed_re = re.compile(r'\(NEEDED\).*\[(.+?)\]')


def needed(path):
    out = subprocess.run(['readelf', '-d', path], capture_output=True, text=True).stdout
    return needed_re.findall(out)


libs = {f: os.path.join(libdir, f) for f in os.listdir(libdir)}
seeds = [p for p in glob.glob(os.path.join(root, 'PyQt6', '*.so'))]
seeds += glob.glob(os.path.join(qt, 'plugins', '**', '*.so'), recursive=True)
seeds += [os.path.join(qt, 'libexec', f) for f in os.listdir(os.path.join(qt, 'libexec'))] if os.path.isdir(os.path.join(qt, 'libexec')) else []
keep, todo = set(), list(seeds)
while todo:
    p = todo.pop()
    for n in needed(p):
        if n in libs and n not in keep:
            keep.add(n); todo.append(libs[n])
removed = 0
for f, p in libs.items():
    base = re.sub(r'\.so\..*', '.so', f)
    if f not in keep and not any(k.startswith(base) for k in keep) and 'WebEngine' not in f and 'icu' not in f:
        removed += os.path.getsize(p); os.remove(p)
shutil.rmtree(os.path.join(qt, 'qml'), ignore_errors=True)
tr = os.path.join(qt, 'translations')
for f in glob.glob(os.path.join(tr, '*.qm')):
    removed += os.path.getsize(f); os.remove(f)
loc = os.path.join(tr, 'qtwebengine_locales')
for f in glob.glob(os.path.join(loc, '*.pak')):
    if os.path.basename(f) not in ('en-US.pak', 'ar.pak', 'fr.pak'):
        removed += os.path.getsize(f); os.remove(f)
print('kept %d Qt libs, removed %.0f MB' % (len(keep), removed / 1e6))
