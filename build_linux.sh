#!/bin/bash
# Linux: self-contained folder (Qt WebEngine window) + tar.gz with installer script
set -e
cd "$(dirname "$0")"
VERSION=${APP_VERSION:-$(python3 -c "import re;print(re.search(r\"VERSION = '(.+?)'\", open('mawaqit/paths.py').read())[1])")}
if [ ! -x .venv/bin/python ]; then
  python3 -m venv .venv && .venv/bin/pip install -q -r requirements.txt "pywebview[qt]" pyinstaller
fi
rm -rf build dist
.venv/bin/pyinstaller --noconfirm --clean --windowed --name AlKitabAlMawqut \
  --add-data "mawaqit/data:mawaqit/data" --add-data "mawaqit/fonts:mawaqit/fonts" \
  --add-data "mawaqit/ui.html:mawaqit" --add-data "mawaqit/icon.ico:mawaqit" \
  --collect-data tzdata --collect-submodules webview --exclude-module gi run.py
.venv/bin/python tools/prune_qt.py dist/AlKitabAlMawqut/_internal
.venv/bin/python -c "from PIL import Image; Image.open('mawaqit/icon.ico').save('dist/AlKitabAlMawqut/icon.png')"
cp installer/linux-install.sh dist/AlKitabAlMawqut/install.sh && chmod +x dist/AlKitabAlMawqut/install.sh
tar -C dist -czf "dist/AlKitabAlMawqut-$VERSION-linux-x86_64.tar.gz" AlKitabAlMawqut
ls -la dist
