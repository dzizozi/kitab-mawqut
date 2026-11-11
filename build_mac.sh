#!/bin/bash
# macOS: AlKitabAlMawqut.app + .dmg   (run on a Mac)
set -e
cd "$(dirname "$0")"
VERSION=${APP_VERSION:-$(python3 -c "import re;print(re.search(r\"VERSION = '(.+?)'\", open('mawaqit/paths.py').read())[1])")}
if [ ! -x .venv/bin/python ]; then
  python3 -m venv .venv && .venv/bin/pip install -q -r requirements.txt pyinstaller
fi
rm -rf build dist
.venv/bin/pyinstaller --noconfirm --clean --windowed --name AlKitabAlMawqut --icon mawaqit/icon.ico \
  --osx-bundle-identifier org.alkitab.mawqut \
  --add-data "mawaqit/data:mawaqit/data" --add-data "mawaqit/fonts:mawaqit/fonts" \
  --add-data "mawaqit/ui.html:mawaqit" --add-data "mawaqit/icon.ico:mawaqit" \
  --collect-data tzdata --collect-all webview run.py
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString $VERSION" -c "Add :CFBundleDisplayName string الكتاب الموقوت" \
  -c "Add :NSHighResolutionCapable bool true" dist/AlKitabAlMawqut.app/Contents/Info.plist 2>/dev/null || true
codesign --force --deep -s - dist/AlKitabAlMawqut.app        # ad-hoc signature (no Apple account)
mkdir -p dist/dmg && cp -R dist/AlKitabAlMawqut.app dist/dmg/ && ln -s /Applications dist/dmg/Applications
hdiutil create -volname "Al-Kitab Al-Mawqut" -srcfolder dist/dmg -ov -format UDZO "dist/AlKitabAlMawqut-$VERSION-macOS-$(uname -m).dmg"
rm -rf dist/dmg
ls -la dist
