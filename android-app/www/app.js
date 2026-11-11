// Mobile UI logic (Capacitor / Android). Works in a normal browser too (preview), without native plugins.
import { S } from './engine/shared.js';
import * as model from './engine/model.js';
import { renderHtml } from './engine/render.js';

const $ = id => document.getElementById(id);
const CAP = globalThis.Capacitor;
const P = (CAP && CAP.Plugins) || {};
const native = !!(CAP && CAP.isNativePlatform && CAP.isNativePlatform());
const PR = [['fajr', 'الصبح'], ['sunrise', 'الشروق'], ['dhuhr', 'الظهر'], ['asr', 'العصر'], ['maghrib', 'المغرب'], ['isha', 'العشاء']];
let cfg, M, cityRows = [], thumbsDirty = true;
function fillThumbs() {
  if (!thumbsDirty || !M) return;
  thumbsDirty = false;
  document.querySelectorAll('.th iframe').forEach(f => {
    const z = (f.parentElement.clientWidth || 160) / 794;     // zoom inside the document (WebView-safe)
    f.srcdoc = renderHtml(M, cfg, f.dataset.k).replace('</style>', `html{zoom:${z}}</style>`);
  });
}

function toast(t, ms = 2800) { const e = $('toast'); e.textContent = t; e.classList.add('on'); clearTimeout(e._t); e._t = setTimeout(() => e.classList.remove('on'), ms); }
function load() { try { return { ...model.DEFAULTS, ...JSON.parse(localStorage.getItem('cfg') || '{}') }; } catch (e) { return { ...model.DEFAULTS }; } }
function save() { localStorage.setItem('cfg', JSON.stringify(cfg)); }

function scaleFrames() {
  const box = $('sheetbox'), w = box.clientWidth; box.style.height = (w * 1123 / 794) + 'px';
  $('sheet').style.transform = `scale(${w / 794})`;

}
async function refresh(all = true) {
  M = await model.buildModel(cfg);
  const html = renderHtml(M, cfg, cfg.theme);
  $('sheet').srcdoc = html;
  thumbsDirty = true;
  if (all && $('t-design').classList.contains('on')) fillThumbs();
  const n = M.nxt[0], f = d => d.toISOString().slice(0, 10).split('-').reverse().join('/');
  $('month').innerHTML = `<b>${S.HIJRI.ar[M.mois - 1]} ${M.annee}</b><br>القادم: ${S.HIJRI.ar[n.mois - 1]} ${f(n.debut)}`;
  if (cfg.reminder) scheduleReminders();
}
function setTheme(k) {
  cfg.theme = k; document.body.dataset.theme = k; save();
  document.querySelectorAll('.th').forEach(e => e.classList.toggle('on', e.dataset.k === k));
  $('sheet').srcdoc = renderHtml(M, cfg, k);
}

// ---------------------------------------------------------------- settings form
function fillForm() {
  $('country').value = cfg.country;
  $('method').value = cfg.method; $('asr').value = String(cfg.asr);
  $('hijri_mode').innerHTML = (cfg.country === 'MA' ? '<option value="morocco">إعلان وزارة الأوقاف المغربية</option>' : '') +
    '<option value="ummalqura">تقويم أم القرى (السعودية)</option><option value="visibility">رؤية الهلال محلياً (حساب فلكي)</option>';
  $('hijri_mode').value = cfg.hijri_mode; $('hijri_adjust').value = String(cfg.hijri_adjust || 0);
  $('plus1row').classList.toggle('hide', cfg.country !== 'MA'); $('morocco_plus1').checked = !!cfg.morocco_plus1;
  $('citycur').textContent = 'المدينة الحالية: ' + (cfg.city_ar || '') + (cfg.city_name && cfg.city_name !== cfg.city_ar ? ' — ' + cfg.city_name : '');
  $('mosque_name').value = cfg.mosque_name || ''; $('dua').value = cfg.dua || ''; $('lang2').value = cfg.lang2 || 'fr';
  $('reminder').checked = !!cfg.reminder;
  PR.forEach(([k]) => $('t_' + k).value = (cfg.tune || {})[k] || 0);
  $('ph').innerHTML = cfg.mosque_image ? `<img src="${cfg.mosque_image}">` : '🕌';
  $('b-imgdel').classList.toggle('hide', !cfg.mosque_image);
}
async function change(obj) {
  if ('country' in obj && obj.country !== cfg.country) {
    Object.assign(cfg, { country: obj.country }, model.countryDefaults(obj.country));
    const first = model.cities(obj.country)[0];
    Object.assign(cfg, model.cityInfo(obj.country, first[0]), { city_key: first[0] });
    cityRows = model.cities(cfg.country);
  } else Object.assign(cfg, obj);
  if (cfg.country !== 'MA' && cfg.hijri_mode === 'morocco') cfg.hijri_mode = 'ummalqura';
  if (cfg.country !== 'MA' && cfg.method === 'MOROCCO') cfg.method = S.COUNTRY_METHOD[cfg.country] || 'MWL';
  save(); fillForm(); await refresh();
}
function showCities(q) {
  const box = $('citylist'); q = (q || '').trim().toLowerCase();
  if (!q) { box.classList.add('hide'); return; }
  const hits = cityRows.filter(c => c[1].toLowerCase().includes(q) || (c[2] || '').toLowerCase().includes(q)).slice(0, 60);
  box.innerHTML = hits.map(c => `<div data-k="${c[0]}">${c[1]}<small>${c[2] && c[2] !== c[1] ? c[2] : ''}</small></div>`).join('') || '<div>لا نتائج</div>';
  box.classList.remove('hide');
}
function resizeImage(file) {
  return new Promise((ok, ko) => {
    const img = new Image(); img.onerror = ko;
    img.onload = () => {
      const s = Math.min(img.width, img.height), c = document.createElement('canvas'); c.width = c.height = 360;
      c.getContext('2d').drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, 360, 360);
      ok(c.toDataURL('image/jpeg', .86));
    };
    img.src = URL.createObjectURL(file);
  });
}

// ---------------------------------------------------------------- print / share / reminders
async function doPrint() {
  const html = renderHtml(M, cfg, cfg.theme);
  const name = `${S.HIJRI.fr[M.mois - 1]} ${M.annee}`.replace(/[^\w\- ]/g, '');
  if (native && P.SheetPrinter) {
    try { await P.SheetPrinter.print({ html, name }); } catch (e) { toast('تعذّرت الطباعة: ' + e.message); }
    return;
  }
  const w = window.open('', '_blank'); w.document.write(html.replace('</style>', '@media print{@page{size:A4;margin:0}}</style>'));
  w.document.close(); setTimeout(() => w.print(), 800);
}
async function scheduleReminders() {
  const LN = P.LocalNotifications;
  if (!native || !LN) return;
  let perm = await LN.checkPermissions();
  if (perm.display !== 'granted') perm = await LN.requestPermissions();
  if (perm.display !== 'granted') { toast('اسمح للتطبيق بالإشعارات من إعدادات الهاتف'); return; }
  const pend = await LN.getPending();
  if (pend.notifications.length) await LN.cancel({ notifications: pend.notifications.map(n => ({ id: n.id })) });
  const list = [], now = Date.now();
  M.nxt.forEach((n, i) => {
    const name = S.HIJRI.ar[n.mois - 1].replace(/^ذو /, 'ذي ');
    const d = n.debut, y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate();
    const eve = new Date(y, m, day - 1, 20, 0), morn = new Date(y, m, day, 9, 0);
    if (eve > now) list.push({ id: 1000 + i * 2, title: 'غداً بإذن الله فاتح ' + name, body: 'جهّز ورقة مواقيت الصلاة للشهر الجديد', schedule: { at: eve }, isExactNotification: false });
    if (morn > now) list.push({ id: 1001 + i * 2, title: 'دخل شهر ' + name, body: 'افتح «الكتاب الموقوت» لطباعة ورقة الشهر', schedule: { at: morn }, isExactNotification: false });
  });
  if (list.length) await LN.schedule({ notifications: list });
}
async function cancelReminders() {
  const LN = P.LocalNotifications; if (!native || !LN) return;
  const pend = await LN.getPending();
  if (pend.notifications.length) await LN.cancel({ notifications: pend.notifications.map(n => ({ id: n.id })) });
}

// ---------------------------------------------------------------- init
async function init() {
  cfg = load(); document.body.dataset.theme = cfg.theme;
  $('ver').textContent = 'الكتاب الموقوت – الإصدار ' + S.version;
  await model.loadPlaces();
  cityRows = model.cities(cfg.country);
  $('country').innerHTML = model.countries().map(([cc, ar, fr, en]) => `<option value="${cc}">${ar}</option>`).join('');
  $('method').innerHTML = S.METHOD_ORDER.map(k => `<option value="${k}">${S.METHODS[k].ar}</option>`).join('');
  $('tune').innerHTML = PR.map(([k, n]) => `<div><label>${n}</label><input type="number" id="t_${k}" min="-30" max="30"></div>`).join('');
  $('gallery').innerHTML = S.themeOrder.map(k => `<div class="th" data-k="${k}"><div class="mini"><iframe data-k="${k}" tabindex="-1"></iframe></div>
     <span>${S.themes[k].ar}</span><small>${S.themes[k].en}</small></div>`).join('');
  document.querySelectorAll('.th').forEach(e => e.onclick = () => setTheme(e.dataset.k));
  document.querySelectorAll('nav button').forEach(b => b.onclick = () => {
    document.querySelectorAll('nav button').forEach(x => x.classList.toggle('on', x === b));
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('on', t.id === 't-' + b.dataset.t));
    $('citylist').classList.add('hide');
    setTimeout(() => { scaleFrames(); if (b.dataset.t === 'design') fillThumbs(); }, 30);
  });
  fillForm();
  $('country').onchange = () => change({ country: $('country').value });
  $('citysearch').oninput = () => showCities($('citysearch').value);
  $('citylist').onclick = e => { const k = e.target.closest('[data-k]')?.dataset.k; if (!k) return;
    $('citysearch').value = ''; $('citylist').classList.add('hide'); change({ ...model.cityInfo(cfg.country, k), city_key: k }); };
  for (const k of ['method', 'hijri_mode', 'lang2']) $(k).onchange = () => change({ [k]: $(k).value });
  for (const k of ['asr', 'hijri_adjust']) $(k).onchange = () => change({ [k]: parseInt($(k).value) });
  $('morocco_plus1').onchange = () => change({ morocco_plus1: $('morocco_plus1').checked });
  let tmr; const deb = fn => { clearTimeout(tmr); tmr = setTimeout(fn, 500); };
  for (const k of ['mosque_name', 'dua']) $(k).oninput = () => deb(() => change({ [k]: $(k).value }));
  $('tune').oninput = () => deb(() => change({ tune: Object.fromEntries(PR.map(([k]) => [k, +$('t_' + k).value || 0])) }));
  $('b-img').onclick = () => $('file').click();
  $('file').onchange = async () => { const f = $('file').files[0]; if (f) change({ mosque_image: await resizeImage(f) }); $('file').value = ''; };
  $('b-imgdel').onclick = () => change({ mosque_image: '' });
  $('reminder').onchange = async () => { cfg.reminder = $('reminder').checked; save();
    if (cfg.reminder) { await scheduleReminders(); toast('سيصلك إشعار عند دخول كل شهر هجري ✓'); } else { await cancelReminders(); toast('أُلغي التذكير'); } };
  $('b-print').onclick = doPrint;
  window.addEventListener('resize', scaleFrames);
  await refresh(); setTheme(cfg.theme); scaleFrames();
}
init().catch(e => { console.error(e); toast('خطأ: ' + e.message, 8000); });
