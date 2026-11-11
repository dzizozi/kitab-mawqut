#!/bin/bash
# Installs Al-Kitab Al-Mawqut for the current user (no root): ~/.local/opt + menu entry
set -e
SRC="$(cd "$(dirname "$0")" && pwd)"
DEST="$HOME/.local/opt/AlKitabAlMawqut"
if [ "$1" = "--uninstall" ]; then
  systemctl --user disable --now alkitab-mawqut.timer 2>/dev/null || true
  rm -f ~/.config/systemd/user/alkitab-mawqut.{service,timer}
  crontab -l 2>/dev/null | grep -v alkitab-mawqut | crontab - 2>/dev/null || true
  rm -rf "$DEST" ~/.local/share/applications/alkitab-mawqut.desktop
  echo "Removed."; exit 0
fi
mkdir -p "$HOME/.local/opt" "$HOME/.local/share/applications"
if [ "$SRC" != "$DEST" ]; then rm -rf "$DEST"; cp -r "$SRC" "$DEST"; fi
cat > "$HOME/.local/share/applications/alkitab-mawqut.desktop" <<EOF
[Desktop Entry]
Type=Application
Name=Al-Kitab Al-Mawqut
Name[ar]=الكتاب الموقوت
Comment=Monthly Hijri prayer-time sheet
Exec="$DEST/AlKitabAlMawqut"
Icon=$DEST/icon.png
Categories=Utility;Office;
Terminal=false
EOF
update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
echo "Installed: $DEST  (menu: Al-Kitab Al-Mawqut / الكتاب الموقوت)"
echo "If the window does not open, install the Qt WebEngine runtime libraries, e.g. on Debian/Ubuntu:"
echo "  sudo apt install libnss3 libxkbfile1 libxcomposite1 libxdamage1 libxrandr2 libxtst6 libasound2 libxcb-cursor0"
