#!/bin/bash
# Linux functional test (WSL)
export LD_LIBRARY_PATH=$HOME/locallibs/usr/lib/x86_64-linux-gnu
mkdir -p ~/bin && ln -sf ~/chrome-shell/chrome-headless-shell-linux64/chrome-headless-shell ~/bin/chromium
export PATH=$HOME/bin:$PATH
rm -rf ~/mawqut-test/mawaqit && cp -r /mnt/c/Users/Admin/Developer/al-kitab-al-mawqut/mawaqit /mnt/c/Users/Admin/Developer/al-kitab-al-mawqut/run.py ~/mawqut-test/
cd ~/mawqut-test
.venv/bin/python - <<'EOF'
import os, datetime as dt
from mawaqit import core, config, paths, osal
print('user dir', paths.USER)
cfg = config.load(); M = core.build_model(cfg)
print('browser', osal.browser())
png, pdf = core.render_files(M, cfg); print('render', os.path.getsize(png), os.path.getsize(pdf))
print('printers', core.printers())
print('task on?', core.set_task(True, M['key']), core.task_on())
print(open(os.path.expanduser('~/.config/systemd/user/alkitab-mawqut.service')).read())
print('task off', core.set_task(False), core.task_on())
core.notify('test', 'مرحبا')
EOF
cp ~/.local/share/AlKitabAlMawqut/sheets/mawaqit-1448-06-glass.png /mnt/c/Users/Admin/AppData/Local/hermes/cache/scratch/linux_sheet.png
# GUI smoke test: start window offscreen for 12 s
cd ~/mawqut-test && QT_QPA_PLATFORM=offscreen timeout 12 .venv/bin/python run.py; echo "gui exit=$? (124 = still running = ok)"
tail -3 ~/.local/share/AlKitabAlMawqut/log.txt 2>/dev/null
