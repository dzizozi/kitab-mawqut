#!/bin/bash
# Linux test bootstrap (WSL): venv with uv, deps, Chrome headless shell for rendering
set -e
cd ~/mawqut-test
export PATH="$HOME/.local/bin:$PATH"
command -v uv >/dev/null || (curl -LsSf https://astral.sh/uv/install.sh | sh >/dev/null 2>&1)
rm -rf .venv
uv venv -q -p 3.12 .venv
uv pip install -q -p .venv/bin/python -r requirements.txt "pywebview[qt]" pyinstaller
.venv/bin/python -c "import webview; import PyQt6.QtWebEngineWidgets; print('qt ok')" 2>&1 | tail -2
if [ ! -x ~/chrome-shell/chrome-headless-shell-linux64/chrome-headless-shell ]; then
  mkdir -p ~/chrome-shell && cd ~/chrome-shell
  url=$(curl -s https://googlechromelabs.github.io/chrome-for-testing/last-known-good-versions-with-downloads.json | python3 -c "import json,sys;d=json.load(sys.stdin);print([x['url'] for x in d['channels']['Stable']['downloads']['chrome-headless-shell'] if x['platform']=='linux64'][0])")
  curl -s -L -o shell.zip "$url" && python3 -c "import zipfile;zipfile.ZipFile('shell.zip').extractall('.')" && chmod +x chrome-headless-shell-linux64/chrome-headless-shell
fi
ls ~/chrome-shell/chrome-headless-shell-linux64/chrome-headless-shell && echo shell-ok
