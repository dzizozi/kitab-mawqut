#!/bin/bash
# Fetch missing shared libs without sudo (apt download + dpkg -x into ~/locallibs) and Chrome headless shell
cd ~
mkdir -p debs locallibs && cd debs
apt-get download libnss3 libnspr4 libxkbfile1 libxcomposite1 libxdamage1 libxrandr2 libxtst6 libasound2t64 libxshmfence1 libxkbcommon-x11-0 libxcb-cursor0 libxcb-icccm4 libxcb-image0 libxcb-keysyms1 libxcb-render-util0 libxcb-xinerama0 libxcb-xkb1 libgbm1 libatk1.0-0t64 libatk-bridge2.0-0t64 libcups2t64 libatspi2.0-0t64 2>&1 | grep -v "^Get" | tail -5
for f in *.deb; do dpkg -x "$f" ~/locallibs; done
ls ~/locallibs/usr/lib/x86_64-linux-gnu | head -50 | tr '\n' ' '
echo
mkdir -p ~/chrome-shell && cd ~/chrome-shell
url=$(curl -s https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json | python3 -c "import json,sys;d=json.load(sys.stdin);print([x['url'] for x in d['channels']['Stable']['downloads']['chrome-headless-shell'] if x['platform']=='linux64'][0])")
echo "$url"
curl -s -L -o shell.zip "$url" && python3 -c "import zipfile;zipfile.ZipFile('shell.zip').extractall('.')" && chmod +x chrome-headless-shell-linux64/chrome-headless-shell
export LD_LIBRARY_PATH=$HOME/locallibs/usr/lib/x86_64-linux-gnu
~/chrome-shell/chrome-headless-shell-linux64/chrome-headless-shell --version
cd ~/mawqut-test && .venv/bin/python -c "import PyQt6.QtWebEngineWidgets; print('qt ok')" 2>&1 | tail -1
