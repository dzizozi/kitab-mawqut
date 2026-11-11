#!/bin/bash
export LD_LIBRARY_PATH=$HOME/locallibs/usr/lib/x86_64-linux-gnu
cd ~/mawqut-test
rm -rf mawaqit installer && cp -r /mnt/c/Users/Admin/Developer/al-kitab-al-mawqut/{mawaqit,run.py,build_linux.sh,installer,tools} .
chmod +x build_linux.sh
./build_linux.sh > build.log 2>&1; echo build-rc=$?; tail -3 build.log
du -sh dist/AlKitabAlMawqut
dist/AlKitabAlMawqut/AlKitabAlMawqut --auto; echo auto-rc=$?
LOG=~/.local/share/AlKitabAlMawqut/log.txt; : > $LOG
MAWQUT_HTTP_LOG=1 QT_QPA_PLATFORM=offscreen timeout 25 dist/AlKitabAlMawqut/AlKitabAlMawqut > /tmp/gui.err 2>&1 &
sleep 22; echo requests-from-window: $(grep -c 'http "GET' $LOG); grep -o 'GET [^ ]*' $LOG | sort | uniq -c | head; grep -i -E 'error while loading|cannot open shared' /tmp/gui.err | head -3
P=$(ss -ltnp 2>/dev/null | grep AlKitab | grep -o "127.0.0.1:[0-9]*" | head -1); echo port=$P
curl -s "http://$P/api/state" | head -c 120; echo
cd dist && tar -xzf AlKitabAlMawqut-*-linux-x86_64.tar.gz -C /tmp && /tmp/AlKitabAlMawqut/install.sh | head -2 && ls ~/.local/share/applications/alkitab-mawqut.desktop && ~/.local/opt/AlKitabAlMawqut/install.sh --uninstall
ls -la ~/mawqut-test/dist/*.tar.gz
