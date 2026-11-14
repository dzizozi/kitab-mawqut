// In-app update check, «connect to the internet» notice and the «About» text — shared by the phone and mosque-display modes.
import { S } from './engine/shared.js';

export const VERSION = S.version;
export const DEVELOPER = 'عز الدين الخالدي';
export const DEVELOPER_LAT = 'Azzeddine El Khaldi';
export const SITE = 'abcdecoart.com';
export const FEEDBACK = 'kitab.mawqut@gmail.com';     // users' remarks and suggestions

const native = () => !!globalThis.Capacitor?.isNativePlatform?.();
const plug = n => globalThis.Capacitor?.Plugins?.[n];
const cmp = (a, b) => { const x = a.split('.').map(Number), y = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) - (y[i] || 0); return 0; };

async function getText(url, timeout = 10000) {
  const http = native() && plug('CapacitorHttp');
  if (http) {
    const r = await http.get({ url, responseType: 'text', connectTimeout: timeout, readTimeout: timeout, headers: { 'User-Agent': 'KitabMawqut/' + VERSION } });
    if (r.status !== 200) throw new Error('HTTP ' + r.status);
    return typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
  }
  const c = new AbortController(); const t = setTimeout(() => c.abort(), timeout);
  try { const r = await fetch(url, { cache: 'no-store', signal: c.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.text(); }
  finally { clearTimeout(t); }
}

// ---------------------------------------------------------------- internet
export async function online() {
  for (const u of ['https://www.habous.gov.ma/data/hijri.js', 'https://www.google.com/generate_204']) {
    try { await getText(u, 7000); localStorage.setItem('km_online', String(Date.now())); return true; }
    catch (e) { if (!native() && String(e).includes('TypeError')) { /* browser preview: CORS */ return true; } }
  }
  return false;
}

// ---------------------------------------------------------------- new version
// Sources: the APKs published on abcdecoart.com (WordPress media, public) and the GitHub releases.
export async function latest() {
  const found = [];
  try {
    const j = JSON.parse(await getText(`https://${SITE}/wp-json/wp/v2/media?search=kitab-mawqut-tv&per_page=50&_fields=source_url`));
    for (const m of j) { const v = /kitab-mawqut-tv-(\d+\.\d+\.\d+)\.apk$/.exec(m.source_url || ''); if (v) found.push({ version: v[1], url: m.source_url }); }
  } catch (e) { }
  try {
    const j = JSON.parse(await getText('https://api.github.com/repos/dzizozi/kitab-mawqut/releases/latest'));
    for (const a of j.assets || []) { const v = /-(\d+\.\d+\.\d+)-android\.apk$/.exec(a.name || ''); if (v) found.push({ version: v[1], url: a.browser_download_url }); }
  } catch (e) { }
  found.sort((a, b) => cmp(b.version, a.version));
  localStorage.setItem('km_upd_checked', String(Date.now()));
  return found[0] || null;
}

let bar = null, busy = false, current = null, downloaded = '', waitPerm = false, permL = null;
const CSS = `#km-upd{position:fixed;top:0;left:0;right:0;z-index:9999;display:flex;align-items:center;gap:14px;padding:12px 18px;
  background:#0f5e4f;color:#fff;font:600 17px 'Noto Kufi Arabic',sans-serif;box-shadow:0 4px 18px #0006;direction:rtl}
#km-upd .tx{flex:1;line-height:1.5}#km-upd small{display:block;font-weight:400;opacity:.85;font-size:13px}
#km-upd button{font:700 16px 'Noto Kufi Arabic',sans-serif;padding:8px 18px;border-radius:10px;border:0;background:#f6d38b;color:#0b3d2e}
#km-upd button.no{background:transparent;color:#fff;border:1px solid #fff8}
#km-upd button:focus{outline:4px solid #ffcc33;outline-offset:2px}
#km-upd .pg{height:6px;background:#fff3;border-radius:3px;margin-top:6px;overflow:hidden}#km-upd .pg i{display:block;height:100%;background:#f6d38b;width:0}
#km-net{position:fixed;inset:0;z-index:9998;display:flex;align-items:center;justify-content:center;background:#0b3d2ef2;direction:rtl}
#km-net .bx{max-width:900px;margin:20px;background:#fbf7ee;color:#173;border-radius:22px;padding:30px 36px;font:500 19px/1.8 'Noto Kufi Arabic',sans-serif;color:#1d3b33}
#km-net h2{margin:0 0 10px;font-size:28px;color:#0f5e4f}#km-net ul{margin:8px 0 14px;padding-inline-start:24px}
#km-net .row{display:flex;gap:12px;flex-wrap:wrap;margin-top:12px}
#km-net button{font:700 18px 'Noto Kufi Arabic',sans-serif;padding:10px 20px;border-radius:12px;border:2px solid #0f5e4f;background:#fff;color:#0f5e4f}
#km-net button.b1{background:#0f5e4f;color:#fff}#km-net button:focus{outline:4px solid #e0a100;outline-offset:2px}
#km-net .st{font-size:15px;color:#6a7a74;margin-top:10px}`;
function style() { if (!document.getElementById('km-upd-css')) { const s = document.createElement('style'); s.id = 'km-upd-css'; s.textContent = CSS; document.head.appendChild(s); } }

export function updateVisible() { return !!(bar && bar.isConnected); }
let before = null;                       // the element that had the focus before the banner took it
export function hideUpdate() {
  const had = barHasFocus();
  if (bar) { bar.remove(); bar = null; }
  if (had && before && before.isConnected) before.focus({ preventScroll: true });
}
export function barHasFocus() { return !!(bar && bar.contains(document.activeElement)); }
export function focusBar() {
  if (!updateVisible()) return false;
  if (!barHasFocus()) before = document.activeElement;
  const b = bar.querySelector('#km-upd-go:not([disabled])') || bar.querySelector('#km-upd-no'); b.focus({ preventScroll: true }); return true;
}
// TV remote inside the banner: ◀ ▶ between «install» and «later», OK presses, ▼ / Back leave it
export function barKey(e) {
  const bs = [...bar.querySelectorAll('button')].filter(b => !b.disabled), i = bs.indexOf(document.activeElement);
  if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); const d = e.key === 'ArrowLeft' ? 1 : -1; bs[(i + d + bs.length) % bs.length].focus(); return; }
  if (e.key === 'Enter') { e.preventDefault(); document.activeElement.click(); return; }
  if (e.key === 'ArrowDown') { e.preventDefault(); if (before && before.isConnected) before.focus({ preventScroll: true }); else document.activeElement.blur(); return; }
  if (e.key === 'Escape' || e.key === 'GoBack' || e.key === 'BrowserBack') { e.preventDefault(); hideUpdate(); }
}

function showBar(u, tv) {
  style(); hideUpdate();
  bar = document.createElement('div'); bar.id = 'km-upd';
  bar.innerHTML = `<div class="tx">🔔 نسخة جديدة من «كتابا موقوتا» متوفرة: ${u.version} <small>نسختك الحالية ${VERSION}. ${tv ? 'اضغط OK للتنزيل والتثبيت، أو زر الرجوع للإخفاء.' : 'التنزيل والتثبيت يتمان من داخل التطبيق.'}</small><div class="pg" hidden><i></i></div></div>
    <button id="km-upd-go">تنزيل وتثبيت</button><button class="no" id="km-upd-no">لاحقاً</button>`;
  document.body.appendChild(bar);
  bar.querySelector('#km-upd-go').onclick = () => install(u);
  bar.querySelector('#km-upd-no').onclick = () => { localStorage.setItem('km_upd_later', u.version + '|' + Date.now()); hideUpdate(); };
  if (tv) { clearTimeout(showBar.t); showBar.t = setTimeout(() => { if (!busy && !barHasFocus()) hideUpdate(); }, 300000); }   // do not cover the mosque screen all day
}
function say(html) { if (bar) bar.querySelector('.tx').innerHTML = html; }

export async function install(u = current) {
  if (!u || busy) return;
  if (!native() || !plug('Updater')) { window.open(u.url, '_blank'); return; }
  busy = true; clearTimeout(showBar.t);
  const U = plug('Updater');
  bar.querySelector('#km-upd-go').disabled = true;
  say(`⏬ جارٍ تنزيل النسخة ${u.version}… <div class="pg"><i></i></div>`);
  const h = await U.addListener('progress', p => { const i = bar && bar.querySelector('.pg i'); if (i && p.pct >= 0) i.style.width = p.pct + '%'; });
  try {
    if (downloaded !== u.version) { await U.download({ url: u.url }); downloaded = u.version; }
    say(`📦 جارٍ فتح شاشة التثبيت…`);
    const r = await U.install();
    if (r.needPermission) {
      say(`✋ فعّل السماح لـ«كتابا موقوتا» في الشاشة التي فُتحت (تثبيت التطبيقات غير المعروفة)، ثم ارجع واضغط OK للتثبيت.`);
      bar.querySelector('#km-upd-go').textContent = 'تثبيت'; bar.querySelector('#km-upd-go').disabled = false;
      waitPerm = true; localStorage.setItem('km_upd_pending', u.version);     // Android may close the app when the permission is given
      if (!permL && plug('App')) permL = plug('App').addListener('appStateChange', async s => {     // back from the permission screen
        if (!s.isActive || !waitPerm) return;
        const c = await U.canInstall(); if (c.ok) { waitPerm = false; install(); }
      });
    } else say('📦 اتبع شاشة التثبيت (Install). إعداداتك تبقى محفوظة.');
  } catch (e) {
    say(`⚠️ تعذّر التنزيل (${String(e.message || e)}). تأكد من الإنترنت وأعد المحاولة.`);
    bar.querySelector('#km-upd-go').disabled = false; bar.querySelector('#km-upd-go').textContent = 'إعادة المحاولة';
  } finally { busy = false; h.remove && h.remove(); }
}

export async function checkUpdate({ tv = false, force = false } = {}) {
  const u = await latest();
  if (!u || cmp(u.version, VERSION) <= 0) return null;
  current = u;
  const later = (localStorage.getItem('km_upd_later') || '').split('|');
  if (!force && later[0] === u.version && Date.now() - +later[1] < 24 * 3600000) return u;     // «later»: ask again tomorrow
  showBar(u, tv);
  setTimeout(() => {                     // the remote can press it right away (unless the user is typing)
    const a = document.activeElement;
    if (a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA') && !a.readOnly) return;
    focusBar();
  }, 60);
  return u;
}
export function startUpdateChecks(tv) {
  const run = async () => {
    if (!(await online())) return;
    const u = await checkUpdate({ tv, force: !!localStorage.getItem('km_upd_pending') });
    const pend = localStorage.getItem('km_upd_pending');
    if (pend && (!u || u.version !== pend)) localStorage.removeItem('km_upd_pending');
    else if (pend && u && plug('Updater') && (await plug('Updater').canInstall()).ok) { localStorage.removeItem('km_upd_pending'); install(u); }   // continue after the permission
  };
  setTimeout(run, 8000); setInterval(run, 12 * 3600000);
}

// ---------------------------------------------------------------- first start without internet
export function netVisible() { return !!document.getElementById('km-net'); }
export async function firstRunNet(tv) {
  if (localStorage.getItem('km_online')) { online(); return; }            // was already connected once
  if (await online()) return;
  style();
  const d = document.createElement('div'); d.id = 'km-net';
  d.innerHTML = `<div class="bx"><h2>📶 صِل الجهاز بالإنترنت</h2>
    عبر شبكة Wi-Fi، أو عبر «مشاركة نقطة الاتصال» (Hotspot) من الهاتف، ولو لدقائق. يستعمل التطبيق الإنترنت من أجل:
    <ul><li>جلب مواقيت الصلاة الرسمية المحدَّثة (وزارة الأوقاف في المغرب)</li><li>ضبط الساعة والتاريخ تلقائياً</li>
    <li>البحث عن نسخة جديدة، وأدعية ومزايا جديدة</li></ul>
    دون إنترنت يعمل التطبيق بالمواقيت المحفوظة فيه وبساعة الجهاز، ويمكنك ضبط التاريخ والوقت يدوياً من الإعدادات.
    <div class="row"><button class="b1" id="km-net-wifi">إعدادات Wi-Fi</button><button id="km-net-retry">أعد المحاولة</button><button id="km-net-skip">متابعة دون إنترنت</button></div>
    <div class="st" id="km-net-st"></div></div>`;
  document.body.appendChild(d);
  const close = () => { d.remove(); clearInterval(poll); };
  const retry = async () => { $st('… جارٍ الفحص'); if (await online()) { $st('✓ متصل'); setTimeout(close, 600); location.reload(); } else $st('لا يوجد اتصال بعد.'); };
  const $st = t => { const s = d.querySelector('#km-net-st'); if (s) s.textContent = t; };
  d.querySelector('#km-net-wifi').onclick = () => plug('Updater') ? plug('Updater').openSettings({ which: 'wifi' }) : null;
  d.querySelector('#km-net-retry').onclick = retry;
  d.querySelector('#km-net-skip').onclick = () => { localStorage.setItem('km_offline_ok', '1'); close(); };
  const poll = setInterval(async () => { if (await online()) { close(); location.reload(); } }, 15000);
  setTimeout(() => d.querySelector('#km-net-wifi').focus(), 50);
  if (localStorage.getItem('km_offline_ok')) d.querySelector('#km-net-skip').focus();
}
// keyboard (TV remote) inside the notice: ▲▼◀▶ between the buttons, OK presses
export function netKey(e) {
  const d = document.getElementById('km-net'); if (!d) return false;
  const bs = [...d.querySelectorAll('button')], i = bs.indexOf(document.activeElement);
  const dir = { ArrowLeft: 1, ArrowDown: 1, ArrowRight: -1, ArrowUp: -1 }[e.key];
  if (dir) { e.preventDefault(); bs[(Math.max(i, 0) + dir + bs.length) % bs.length].focus(); return true; }
  if (e.key === 'Enter') { e.preventDefault(); (i >= 0 ? bs[i] : bs[0]).click(); return true; }
  return true;
}
export function openSystem(which) { return plug('Updater') ? plug('Updater').openSettings({ which }) : Promise.reject('web'); }

// ---------------------------------------------------------------- about
export function aboutHtml() {
  const f = k => { const t = +localStorage.getItem(k); return t ? new Date(t).toLocaleString('ar-MA-u-nu-latn', { dateStyle: 'medium', timeStyle: 'short' }) : '—'; };
  return `<div class="about"><b>كتابا موقوتا</b> — الإصدار <span dir="ltr">${VERSION}</span><br>
    تصميم وتطوير: ${DEVELOPER} <span dir="ltr">(${DEVELOPER_LAT})</span><br>
    ملاحظاتكم واقتراحاتكم: <a href="mailto:${FEEDBACK}?subject=${encodeURIComponent('كتابا موقوتا ' + VERSION)}" dir="ltr">${FEEDBACK}</a><br>
    <small>آخر اتصال بالإنترنت: ${f('km_online')} · آخر بحث عن تحديث: ${f('km_upd_checked')}<br>
    برنامج حر مفتوح المصدر (MIT). مواقيت المغرب: وزارة الأوقاف والشؤون الإسلامية. المساجد: © OpenStreetMap.</small><br>
    <button id="km-chk">البحث عن نسخة جديدة الآن</button> <span id="km-chk-st"></span></div>`;
}
export function wireAbout(tv) {
  const b = document.getElementById('km-chk'); if (!b) return;
  b.onclick = async () => {
    const st = document.getElementById('km-chk-st'); st.textContent = '… جارٍ البحث';
    if (!(await online())) { st.textContent = 'لا يوجد اتصال بالإنترنت.'; return; }
    const u = await checkUpdate({ tv, force: true });
    st.textContent = u ? `نسخة جديدة ${u.version} — انظر الشريط أعلى الشاشة.` : `لديك أحدث نسخة (${VERSION}).`;
  };
}
