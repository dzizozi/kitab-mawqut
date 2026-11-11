@echo off
rem Build AlKitabAlMawqut.exe (PyInstaller) and the installer (Inno Setup 6)
setlocal
if not exist .venv\Scripts\python.exe (py -3.11 -m venv .venv && .venv\Scripts\pip install -r requirements.txt pyinstaller)
.venv\Scripts\pyinstaller --noconfirm --clean --windowed --name AlKitabAlMawqut --icon mawaqit\icon.ico ^
  --add-data "mawaqit\data;mawaqit\data" --add-data "mawaqit\fonts;mawaqit\fonts" ^
  --add-data "mawaqit\ui.html;mawaqit" --add-data "mawaqit\icon.ico;mawaqit" ^
  --collect-data tzdata --collect-all webview run.py || exit /b 1
set ISCC="%LOCALAPPDATA%\Programs\Inno Setup 6\ISCC.exe"
if not exist %ISCC% set ISCC="C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
%ISCC% installer\setup.iss || exit /b 1
echo Done: dist\
