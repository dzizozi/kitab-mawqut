// «كتابا موقوتا» – mosque display mode (TV / TV Box, landscape, remote control).
// Shows: clock and dates, prayer times with iqama, countdown to the next adhan and to the iqama,
// «prayer in progress» screen, adhkar after the prayer, the daily hizb (Hijri date), announcements,
// and the Friday hadith before the Jumu'a prayer.  Settings open with OK / Menu on the remote.
// Everything is drawn with CSS / SVG vectors (sharp on 1080p and 4K screens).
import { S } from './engine/shared.js';
import * as model from './engine/model.js';
import * as U from './update.js';
import * as PK from './picker.js';

const $ = id => document.getElementById(id);
const CAP = globalThis.Capacitor, P = (CAP && CAP.Plugins) || {};
const NAMES = { fajr: 'الصبح', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء', jumua: 'الجمعة' };
const KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export const TV_DEFAULTS = {
  tv_theme: 'zellige', riwaya: 'warsh', digits: 'auto', tv_font: 'cairo', tv_scale: 100, tv_res: 'auto', method_auto: true, clock_mode: 'auto', clock_adj: 0, tv_fast: true, tv_fast_week: false,
  iqama: { fajr: 20, dhuhr: 15, asr: 15, maghrib: 7, isha: 10 }, jumua_iqama: 30,
  prayer_min: 10, adhkar_min: 7, friday_before: 45,
  tv_news: 'يُرجى إغلاق الهاتف أو جعله على الصامت قبل الدخول في الصلاة\nسَوُّوا صُفُوفَكُمْ، فَإِنَّ تَسْوِيَةَ الصُّفُوفِ مِنْ إِقَامَةِ الصَّلَاةِ\nحافظوا على نظافة المسجد',
  tv_hadith: 'قال رسول الله ﷺ: «إِذَا قُلْتَ لِصَاحِبِكَ يَوْمَ الْجُمُعَةِ: أَنْصِتْ، وَالْإِمَامُ يَخْطُبُ، فَقَدْ لَغَوْتَ» متفق عليه\nوقال ﷺ: «وَمَنْ مَسَّ الْحَصَى فَقَدْ لَغَا» رواه مسلم',
};

// ---------------------------------------------------------------- Moroccan zellige (vector SVG, khatam star-and-cross)
// 8-pointed stars on a checkerboard; the cross-shaped pieces between them are what is left.
function zellige({ star = ['#0f6b4a', '#1f4f8f'], cross = '#f3ecdc', core = '#d9a441', grout = '#2b1d14', dot = '#1b1b1b', bg = null } = {}) {
  const R = Math.SQRT1_2, r = R * Math.SQRT1_2 / Math.cos(Math.PI / 8), c = 0.2;
  const pt = (x, y, rad, a) => `${(x + rad * Math.cos(a)).toFixed(4)},${(y + rad * Math.sin(a)).toFixed(4)}`;
  const starPath = (x, y, ro, ri) => Array.from({ length: 16 }, (_, k) => pt(x, y, k % 2 ? ri : ro, k * Math.PI / 8)).join(' ');
  let s = `<rect x="0" y="0" width="4" height="4" fill="${bg || cross}"/>`;
  for (let i = -1; i <= 5; i++) for (let j = -1; j <= 5; j++) {
    if ((i + j) % 2) {     // cross centre: small black square «dot» typical of Fez zellige
      s += `<rect x="${i - 0.07}" y="${j - 0.07}" width="0.14" height="0.14" transform="rotate(45 ${i} ${j})" fill="${dot}"/>`;
      continue;
    }
    const col = star[((i - j) / 2 % 2 + 2) % 2];
    s += `<polygon points="${starPath(i, j, R, r)}" fill="${col}" stroke="${grout}" stroke-width="0.045" stroke-linejoin="round"/>`;
    s += `<polygon points="${starPath(i, j, c * 1.3, c * 1.3 * r / R)}" fill="${core}" stroke="${grout}" stroke-width="0.03"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 4" shape-rendering="geometricPrecision">${s}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
const ZBAND = zellige();
const ZFAINT = zellige({ star: ['rgba(255,255,255,.06)', 'rgba(255,255,255,.035)'], cross: 'transparent', core: 'rgba(217,164,65,.10)', grout: 'rgba(255,255,255,.07)', dot: 'rgba(0,0,0,0)' });
const ZBLUE = zellige({ star: ['#1f4f8f', '#f3ecdc'], cross: '#ffffff', core: '#1f4f8f', grout: '#14315c', dot: '#1f4f8f' });

// name, CSS variables
const THEMES = {
  zellige: ['زليج مغربي (فاس)', `--bg:${ZFAINT} 0 0/18vh 18vh,radial-gradient(ellipse at 50% 0%,#145a43,#0b3d2e 60%,#072a20);--fg:#fbf4e4;--muted:#c9dccf;
    --card:#f4ecd8;--cardfg:#2b1d14;--cardmuted:#6b5641;--line:#c9a35a;--accent:#e2b04a;--accent2:#7fd6c4;--hl:#e2b04a;--hlfg:#2b1d14;--nm:#0f6b4a;
    --band:${ZBAND} 0 2.5vh/14vh 14vh`],
  night: ['ليلي ذهبي', `--bg:radial-gradient(ellipse at 30% 0%,#173658,#0a1a2e 55%,#050d18);--fg:#f4efe2;--muted:#9fb2c8;--card:rgba(255,255,255,.07);
    --cardfg:#f4efe2;--cardmuted:#9fb2c8;--line:rgba(232,194,106,.35);--accent:#e8c26a;--accent2:#7fd1c1;--hl:#e8c26a;--hlfg:#0a1a2e;--nm:#e8c26a;--band:none`],
  chaouen: ['أزرق شفشاون', `--bg:${ZFAINT} 0 0/18vh 18vh,linear-gradient(170deg,#1d4f91,#123566 60%,#0b2246);--fg:#ffffff;--muted:#bcd0ee;
    --card:#ffffff;--cardfg:#123566;--cardmuted:#4f6e9c;--line:#bcd0ee;--accent:#ffd27a;--accent2:#a8e0ff;--hl:#ffd27a;--hlfg:#123566;--nm:#1d4f91;
    --band:${ZBLUE} 0 2.5vh/14vh 14vh`],
  emerald: ['زمردي', `--bg:linear-gradient(160deg,#075e48,#03382b 60%,#021f18);--fg:#f6f1df;--muted:#a9cdbf;--card:rgba(255,255,255,.09);
    --cardfg:#f6f1df;--cardmuted:#a9cdbf;--line:rgba(245,213,138,.35);--accent:#f5d58a;--accent2:#ffffff;--hl:#f5d58a;--hlfg:#03382b;--nm:#f5d58a;--band:none`],
  light: ['فاتح', `--bg:linear-gradient(180deg,#fbfaf6,#efece3);--fg:#1d2b36;--muted:#5f7380;--card:#ffffff;--cardfg:#1d2b36;--cardmuted:#5f7380;
    --line:rgba(15,94,79,.18);--accent:#0f5e4f;--accent2:#b8862f;--hl:#0f5e4f;--hlfg:#ffffff;--nm:#0f5e4f;--band:none`],
};

// adhkar after the prayer: editable text, one slide per paragraph (see the settings hint)
const DEF_ADHKAR = `# أذكار بعد الصلاة
أَسْتَغْفِرُ اللهَ ، أَسْتَغْفِرُ اللهَ ، أَسْتَغْفِرُ اللهَ
اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ
— رواه مسلم

# أذكار بعد الصلاة
لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ
اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ ، وَلَا مُعْطِيَ لِمَا مَنَعْتَ ، وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ
— متفق عليه

# التسبيح
سُبْحَانَ اللهِ (33) ، الْحَمْدُ لِلَّهِ (33) ، اللهُ أَكْبَرُ (33)
وَتَمَامُ الْمِائَةِ : لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ
— رواه مسلم

[آية الكرسي]

[المعوذات]`;
const ADHKAR_EXTRA = `# بعد صلاة الصبح والمغرب
لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ ، يُحْيِي وَيُمِيتُ ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ (10)
— رواه الترمذي`;      // added after Fajr and Maghrib when their own list is empty
const ADK_KEYS = [['all', 'كل الصلوات'], ['fajr', 'الصبح'], ['dhuhr', 'الظهر'], ['asr', 'العصر'], ['maghrib', 'المغرب'], ['isha', 'العشاء'], ['jumua', 'الجمعة']];

let cfg, Q = null, AHZAB = null, MOSQ = null, DAYS = {}, slideI = -1, lastSlide = 0, adhkarI = 0, lastAdhkar = 0, lastBuild = '';

// ---------------------------------------------------------------- helpers
// test hook: index.html?at=2026-11-13T12:10 shows the screen as at that moment (clock keeps running)
const AT = new URLSearchParams(location.search).get('at');
const OFF = AT ? new Date(AT) - Date.now() : 0;
// clock source: 'auto' = exact time from the internet + the official time of the mosque's country,
// 'device' = the TV box's own clock, 'manual' = the TV box's clock corrected by N minutes
let SKEW = null;                        // internet UTC − device UTC (ms)
function zoneOffsetMin(tz, ms) {        // UTC offset of a time zone at a moment (minutes)
  try {
    const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
      .formatToParts(new Date(ms)).map(x => [x.type, x.value]));
    return Math.round((Date.UTC(+p.year, p.month - 1, +p.day, +p.hour % 24, +p.minute) - Math.floor(ms / 60000) * 60000) / 60000);
  } catch (e) { return null; }
}
function officialOffset(ms) {
  if (cfg.country === 'MA') { const h = model.habousUtcOffset(); return (h ?? 0) + (cfg.morocco_plus1 ? 60 : 0); }  // Habous times are published in GMT
  return zoneOffsetMin(cfg.tz || 'UTC', ms);
}
const NOW = () => {
  const base = Date.now() + OFF;
  if (!cfg || AT) return new Date(base);
  if (cfg.clock_mode === 'manual') return new Date(base + (+cfg.clock_adj || 0) * 60000);
  if (cfg.clock_mode === 'device') return new Date(base);
  const off = officialOffset(base);
  if (off == null) return new Date(base);
  const wall = base + (SKEW || 0) + off * 60000;            // wall-clock time of the mosque, as if it were UTC
  const d = new Date(wall); return new Date(wall + d.getTimezoneOffset() * 60000);   // … shown with the device's local getters
};
async function syncClock() {            // exact UTC from the «Date» header of a web server (no extra service)
  const http = globalThis.Capacitor?.isNativePlatform?.() && globalThis.Capacitor.Plugins?.CapacitorHttp;
  for (const url of ['https://www.google.com/generate_204', 'https://www.habous.gov.ma/']) {
    try {
      const t0 = Date.now();
      let date = null;
      if (http) { const r = await http.request({ url, method: 'HEAD', connectTimeout: 8000, readTimeout: 8000 });
        const h = r.headers || {}; date = h.Date || h.date; }
      else { const r = await fetch(url, { method: 'HEAD', cache: 'no-store' }); date = r.headers.get('date'); }
      if (date) { const t = Date.parse(date); if (!isNaN(t)) { SKEW = t + 500 - (t0 + Date.now()) / 2; return true; } }
    } catch (e) { }
  }
  return false;
}
const pad = n => String(n).padStart(2, '0');
const isoLocal = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const EAST = new Set(['SA', 'AE', 'KW', 'QA', 'BH', 'OM', 'YE', 'IQ', 'SY', 'JO', 'LB', 'PS', 'EG', 'SD']);
function dg(s) {
  const east = cfg.digits === 'eastern' || (cfg.digits !== 'western' && EAST.has(cfg.country));
  return east ? String(s).replace(/\d/g, c => '٠١٢٣٤٥٦٧٨٩'[c]) : String(s);
}
const hm = d => dg(pad(d.getHours()) + ':' + pad(d.getMinutes()));
function dur(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
  return dg(h ? h + ':' + pad(m) + ':' + pad(x) : pad(m) + ':' + pad(x));
}
const at = (day, hhmm) => { const [h, m] = hhmm.split(':').map(Number); return new Date(day.getFullYear(), day.getMonth(), day.getDate(), h, m, 0); };
const addMin = (d, n) => new Date(d.getTime() + n * 60000);
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
// only touch the DOM when something really changed: keeps the ticker animation smooth on weak TV boxes
function setHTML(el, html) { if (el && el._h !== html) { el._h = html; el.innerHTML = html; return true; } return false; }
function setText(el, t) { if (el && el._t !== t) { el._t = t; el.textContent = t; } }
function load() {
  let c = {};
  try { c = JSON.parse(localStorage.getItem('cfg') || '{}'); } catch (e) { }
  const out = { ...model.DEFAULTS, ...TV_DEFAULTS, ...c };
  out.iqama = { ...TV_DEFAULTS.iqama, ...(c.iqama || {}) };
  out.tv_adhkar = { all: DEF_ADHKAR, ...(c.tv_adhkar || {}) };
  out.tune = { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0, ...(c.tune || {}) };
  if (!THEMES[out.tv_theme]) out.tv_theme = 'zellige';
  return out;
}
const save = () => localStorage.setItem('cfg', JSON.stringify(cfg));
const fontInfo = id => S.FONTS.find(f => f[0] === id) || S.FONTS.find(f => f[0] === 'cairo');
const KFG = s => s.replace(/\u08F2/g, '\u0656').replace(/\u08F0/g, '\u0657').replace(/\u08F1/g, '\u065E');
const qt = s => cfg.riwaya === 'hafs' ? s : KFG(s);   // KFGQPC Uthmanic fonts expect their own open-tanween code points

// ---------------------------------------------------------------- data
const buildKey = () => isoLocal(NOW()) + cfg.city_key + cfg.method + cfg.hijri_mode + cfg.hijri_adjust + cfg.morocco_plus1 + JSON.stringify(cfg.tune);
async function build() {
  const now = NOW();
  if (lastBuild === buildKey()) return;
  DAYS = {};
  for (const off of [-1, 0, 1]) {          // yesterday / today / tomorrow models: covers month changes
    const ref = new Date(now.getFullYear(), now.getMonth(), now.getDate() + off, 12);
    const M = await model.buildModel(cfg, ref);
    for (const r of M.rows) {
      const k = r.date.toISOString().slice(0, 10);
      if (DAYS[k] && !r.is_next) continue;
      const nm = r.is_next ? (M.mois % 12) + 1 : M.mois, ny = r.is_next && M.mois === 12 ? M.annee + 1 : M.annee;
      if (!DAYS[k] || DAYS[k].is_next) DAYS[k] = { times: r.times, hday: r.is_next ? 1 : r.hday, mois: nm, annee: ny, events: r.events, is_next: r.is_next };
    }
  }
  lastBuild = buildKey();
}
function schedule(now) {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const out = [];
  for (const off of [0, 1]) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + off);
    const row = DAYS[isoLocal(d)]; if (!row) continue;
    const fri = d.getDay() === 5;
    KEYS.forEach((k, j) => {
      const adhan = at(d, row.times[j]);
      const key = fri && k === 'dhuhr' ? 'jumua' : k;
      const iq = k === 'sunrise' ? null : addMin(adhan, key === 'jumua' ? +cfg.jumua_iqama : +(cfg.iqama[k] ?? 10));
      out.push({ k: key, base: k, day: off, adhan, iqama: iq });
    });
  }
  return out;
}

// ---------------------------------------------------------------- side panel (rotating) and adhkar
function hizbHtml(row) {
  if (!AHZAB || !row) return '';
  const A = AHZAB[cfg.riwaya === 'hafs' ? 'hafs' : 'warsh'];
  const d = Math.min(30, row.hday), f = A[2 * d - 2], m = A[2 * d - 1];
  const one = (h, lab) => `<div class="hz"><div class="hzt"><span>${lab}</span><b>الحزب ${dg(h.n)}</b></div>
    <div class="q">${qt(h.words)} …</div><div class="hzr">من سورة ${h.sura_name} ${dg(h.aya)} إلى سورة ${h.end_sura_name} ${dg(h.end_aya)}</div></div>`;
  return `<h3>الحزب الراتب لليوم</h3><div class="fit hz2">${one(f, 'بعد صلاة الصبح')}${one(m, 'بعد صلاة المغرب')}</div>`;
}
// ---------------------------------------------------------------- voluntary fasting: 2 days before, 1 day before, and on the day
const FAST_V = {
  bid: 'قال رسول الله ﷺ: «صيامُ ثلاثةِ أيامٍ من كلِّ شهرٍ صيامُ الدهرِ كلِّه» — متفق عليه',
  tasua: 'قال رسول الله ﷺ: «لئن بقيتُ إلى قابلٍ لأصومنَّ التاسعَ» — رواه مسلم',
  ashura: 'قال رسول الله ﷺ: «صيامُ يومِ عاشوراءَ أحتسبُ على اللهِ أن يُكفِّرَ السنةَ التي قبلَه» — رواه مسلم',
  muharram: 'قال رسول الله ﷺ: «أفضلُ الصيامِ بعد رمضانَ شهرُ اللهِ المحرَّمُ» — رواه مسلم',
  dhul: 'قال رسول الله ﷺ: «ما من أيامٍ العملُ الصالحُ فيهنَّ أحبُّ إلى اللهِ من هذه الأيام» يعني العشر — رواه البخاري',
  arafa: 'قال رسول الله ﷺ: «صيامُ يومِ عرفةَ أحتسبُ على اللهِ أن يُكفِّرَ السنةَ التي قبلَه والسنةَ التي بعدَه» — رواه مسلم',
  shawwal: 'قال رسول الله ﷺ: «من صام رمضانَ ثم أتبعه ستًّا من شوالٍ كان كصيامِ الدهرِ» — رواه مسلم',
  week: 'قال رسول الله ﷺ: «تُعرَضُ الأعمالُ يومَ الإثنينِ والخميسِ، فأُحبُّ أن يُعرَضَ عملي وأنا صائم» — رواه الترمذي',
};
const ORD = ['الأول', 'الثاني', 'الثالث'];
// occasions of one day: {k, title: «صيام …», today: the day itself, pre: announce it in advance}
const ORD2 = ['أول', 'ثاني', 'ثالث'];
function fastDays(row, date) {
  const out = []; if (!row) return out;
  const d = row.hday, m = row.mois, wd = date.getDay();
  if (m !== 9 && d >= 13 && d <= 15 && !(m === 12 && d === 13))       // 13 Dhu al-Hijja is a day of Tashriq: no fasting
    out.push({ k: 'bid', title: 'الأيام البيض', today: m === 12 ? 'من الأيام البيض' : `${ORD2[d - 13]} الأيام البيض`, pre: d === (m === 12 ? 14 : 13) });
  if (m === 1 && d === 1) out.push({ k: 'muharram', title: 'شهر الله المحرّم', today: 'أول شهر الله المحرّم', pre: true });
  if (m === 1 && d === 9) out.push({ k: 'tasua', title: 'يوم تاسوعاء', today: 'يوم تاسوعاء (التاسع من محرّم)', pre: true });
  if (m === 1 && d === 10) out.push({ k: 'ashura', title: 'يوم عاشوراء', today: 'يوم عاشوراء (العاشر من محرّم)', pre: true });
  if (m === 12 && d <= 8) out.push({ k: 'dhul', title: 'العشر من ذي الحجة', today: d === 1 ? 'أول العشر من ذي الحجة' : `اليوم ${dg(d)} من العشر من ذي الحجة`, pre: d === 1 });
  if (m === 12 && d === 9) out.push({ k: 'arafa', title: 'يوم عرفة', today: 'يوم عرفة', pre: true });
  if (m === 10 && d === 2) out.push({ k: 'shawwal', title: 'الست من شوال', today: 'بداية صيام الست من شوال', pre: true });
  if (cfg.tv_fast_week && m !== 9 && (wd === 1 || wd === 4) && !out.length) {
    const n = 'يوم ' + (wd === 1 ? 'الإثنين' : 'الخميس'); out.push({ k: 'week', title: n, today: n, pre: 'one' });
  }
  return out;
}
let FASTC = { key: '', list: [] };
function fastNews(now) {                   // [{text, date, virtue}] — shown in the panel AND kept in the ticker while due
  if (cfg.tv_fast === false) return [];
  const key = isoLocal(now) + cfg.tv_fast_week + Object.keys(DAYS).length;
  if (FASTC.key === key) return FASTC.list;
  const list = [];
  for (const off of [0, 1, 2]) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + off), row = DAYS[isoLocal(d)];
    for (const o of fastDays(row, d)) {
      if (off && !o.pre) continue;
      if (off === 2 && o.pre === 'one') continue;
      const date = `${S.DAYS.ar[(d.getDay() + 6) % 7]} ${dg(row.hday)} ${S.HIJRI.ar[row.mois - 1]}`;
      const text = off === 0 ? `اليوم ${o.today}، يُستحبّ صيامه` : off === 1 ? `بقي يوم واحد على صيام ${o.title}` : `بقي يومان على صيام ${o.title}`;
      list.push({ text, date, virtue: FAST_V[o.k], k: o.k, off });
    }
  }
  FASTC = { key, list };
  return list;
}
// Quran-style ornaments (۞ ﴿ ﴾) drawn with the Uthmanic font: the screen fonts do not all have these glyphs
const ORN = s => s.replace(/([۞﴾﴿])/g, '<span class="orn">$1</span>');
function newsAll(now) {                    // mosque announcements + automatic fasting reminders (HTML)
  const own = (cfg.tv_news || '').split('\n').map(s => s.trim()).filter(Boolean).map(esc);
  const fast = fastNews(now).map(f => ORN(esc(`۞ ${f.text} (${f.date}) ﴿\u00a0${f.virtue}\u00a0﴾ ۞`)));
  return [...fast, ...own];
}
function slides(row) {
  const list = [];
  if (row) list.push(hizbHtml(row));
  for (const f of fastNews(NOW()))
    list.push(`<h3>صيام التطوع</h3><div class="fit"><div class="fh">${ORN('۞ ' + esc(f.date) + ' ۞')}</div><div class="big fn">${esc(f.text)}</div><div class="fv">${ORN('﴿\u00a0' + esc(f.virtue) + '\u00a0﴾')}</div></div>`);
  for (const ev of (row && row.events) || []) list.push(`<h3>مناسبة اليوم</h3><div class="fit"><div class="big">${esc(ev[0])}</div></div>`);
  for (const line of (cfg.tv_news || '').split('\n').map(s => s.trim()).filter(Boolean))
    list.push(`<h3>إعلان للمصلين</h3><div class="fit"><div class="big">${esc(line)}</div></div>`);
  return list.length ? list : [`<div class="fit"><div class="big">${esc(cfg.mosque_name || 'كتابا موقوتا')}</div></div>`];
}
function parseAdhkar(text) {
  return String(text || '').replace(/\r/g, '').split(/\n\s*\n/).map(p => p.trim()).filter(Boolean).map(p => {
    const lines = p.split('\n').map(s => s.trim()).filter(Boolean);
    if (lines.length === 1 && /^\[.*\]$/.test(lines[0])) return { special: lines[0] };
    let title = '', src = '';
    if (lines[0].startsWith('#')) title = lines.shift().replace(/^#+\s*/, '');
    if (lines.length && /^[—–-]/.test(lines[lines.length - 1])) src = lines.pop().replace(/^[—–-]+\s*/, '');
    return { title, lines, src };
  });
}
function adhkarList(key) {
  const own = ((cfg.tv_adhkar || {})[key] || '').trim();
  const list = parseAdhkar(own || cfg.tv_adhkar.all || DEF_ADHKAR);
  if (!own && (key === 'fajr' || key === 'maghrib')) list.splice(Math.min(3, list.length), 0, ...parseAdhkar(ADHKAR_EXTRA));
  return list.length ? list : parseAdhkar(DEF_ADHKAR);
}
function adhkarSlide(i, key) {
  const r = cfg.riwaya === 'hafs' ? 'hafs' : 'warsh';
  const list = adhkarList(key), A = list[i % list.length];
  if (A.special && /كرسي/.test(A.special) && Q) return `<h2>آية الكرسي</h2><div class="fit"><div class="q big2">${qt(Q[r].kursi.join(' ۝ '))}</div></div><div class="src">${Q[r].kursi_ref}</div>`;
  if (A.special && /معوذ|إخلاص|الإخلاص/.test(A.special) && Q) {
    const s = (name, v) => `<div class="sura"><b>سورة ${name}</b><div class="q">${qt(v.join(' ۝ '))}</div></div>`;
    return `<h2>المعوذات</h2><div class="fit">${s('الإخلاص', Q[r].ikhlas)}${s('الفلق', Q[r].falaq)}${s('الناس', Q[r].nas)}</div>`;
  }
  if (A.special) return `<div class="fit"><p>${esc(A.special.slice(1, -1))}</p></div>`;
  const line = s => esc(s).replace(/\((\d+)\)/g, (m, n) => `<i>${dg(n)}</i>`);
  return `${A.title ? `<h2>${esc(A.title)}</h2>` : ''}<div class="fit">${A.lines.map(l => `<p>${line(l)}</p>`).join('')}</div>${A.src ? `<div class="src">${esc(A.src)}</div>` : ''}`;
}
// biggest size that fits: lower the font size of the «.fit» block (CSS variable --fz used by every text rule) until it fits,
// so the lines re-wrap at the real size (a plain scale() of over-wrapped text gave a thin column of tiny words)
function fitBox(root) {
  for (const f of root.querySelectorAll('.fit')) {
    const box = f.parentElement;
    f.style.transform = ''; f.style.setProperty('--fz', '1');
    const cs = getComputedStyle(box);
    const centred = f.dataset.o !== 'top' && cs.justifyContent === 'center';
    const fits = () => {
      const br = box.getBoundingClientRect(), fr = f.getBoundingClientRect();
      const k = box.offsetWidth ? br.width / box.offsetWidth : 1;          // the mini preview in the settings is scaled down
      const top = br.top + parseFloat(cs.paddingTop) * k, bot = br.bottom - parseFloat(cs.paddingBottom) * k;
      const w = br.width / k - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const availH = (centred ? bot - top : bot - Math.max(top, fr.top)) / k;
      return { ok: f.scrollHeight <= availH + 1 && f.scrollWidth <= w + 1, availH, w };
    };
    if (fits().ok) { f.dataset.fz = '1'; continue; }
    let lo = 0.2, hi = 1;
    for (let i = 0; i < 8; i++) { const mid = (lo + hi) / 2; f.style.setProperty('--fz', mid.toFixed(4)); if (fits().ok) lo = mid; else hi = mid; }
    f.style.setProperty('--fz', lo.toFixed(4)); f.dataset.fz = lo.toFixed(3);
    const r = fits();
    if (!r.ok) {                                   // still too big at 20 %: last resort, scale it
      const s = Math.min(1, r.availH / f.scrollHeight, r.w / f.scrollWidth);
      f.style.transformOrigin = centred ? '50% 50%' : '50% 0'; f.style.transform = `scale(${s.toFixed(4)})`;
    }
  }
}

// ---------------------------------------------------------------- ticker: constant speed, GPU transform only
function ticker(news) {
  const box = $('tv-ticker');
  if (box._t === news) return;
  box._t = news;
  box.innerHTML = `<span class="tk">${news || '&nbsp;'}</span>`;     // already escaped HTML
  const span = box.firstChild;
  requestAnimationFrame(() => {
    const w = span.offsetWidth, W = box.clientWidth, speed = Math.max(60, W / 14);     // px per second
    span.style.setProperty('--from', -w + 'px'); span.style.setProperty('--to', W + 'px');
    span.style.animationDuration = ((w + W) / speed).toFixed(1) + 's';
  });
}

// ---------------------------------------------------------------- render (once a second)
function render() {
  const now = NOW(), sch = schedule(now), row = DAYS[isoLocal(now)];
  setText($('tv-clock'), dg(pad(now.getHours()) + ':' + pad(now.getMinutes())));
  setText($('tv-sec'), dg(pad(now.getSeconds())));
  const gm = (S.GREG.ar_ma && cfg.country === 'MA' ? S.GREG.ar_ma : S.GREG.ar)[now.getMonth()];
  setHTML($('tv-date'), `<b>${S.DAYS.ar[(now.getDay() + 6) % 7]}</b> ${row ? dg(row.hday) + ' ' + S.HIJRI.ar[row.mois - 1] + ' ' + dg(row.annee) + ' هـ' : ''}<br>${dg(now.getDate())} ${gm} ${dg(now.getFullYear())}`);

  let today = sch.filter(p => p.day === 0);
  let phase = 'normal', cur = null;
  for (const p of today) {
    if (!p.iqama) continue;
    const endPrayer = addMin(p.iqama, p.k === 'jumua' ? 45 : +cfg.prayer_min);
    if (p.k === 'jumua' && now >= addMin(p.adhan, -cfg.friday_before) && now < p.iqama) { phase = 'jumua'; cur = p; break; }
    if (now >= p.adhan && now < p.iqama) { phase = 'iqama'; cur = p; break; }
    if (now >= p.iqama && now < endPrayer) { phase = 'prayer'; cur = p; break; }
    if (now >= endPrayer && now < addMin(endPrayer, +cfg.adhkar_min)) { phase = 'adhkar'; cur = p; break; }
  }
  if (PV) {                               // settings preview: show the chosen stage with sample times
    const k = PV.k || 'dhuhr';
    phase = PV.phase;
    cur = phase === 'jumua' ? { k: 'jumua', adhan: addMin(now, +cfg.friday_before || 0), iqama: addMin(now, (+cfg.friday_before || 0) + (+cfg.jumua_iqama || 0)) }
      : phase === 'iqama' ? { k, adhan: addMin(now, -1), iqama: addMin(now, (+(cfg.iqama[k] ?? 10) || 1) - 1) } : { k };
  }
  const next = sch.find(p => p.adhan > now);
  if (document.body.dataset.phase !== phase) document.body.dataset.phase = phase;
  if (phase === 'normal' && next && next.day === 1) today = sch.filter(p => p.day === 1);     // after Isha: tomorrow's times

  setHTML($('tv-prayers'), today.map(p => {
    const on = next && p === next, done = p.adhan <= now && !(cur && cur === p);
    return `<div class="pc${on ? ' next' : ''}${done ? ' done' : ''}"><div class="pn">${NAMES[p.k]}</div>
      <div class="pt">${hm(p.adhan)}</div><div class="pi">${p.iqama ? 'الإقامة <b>' + hm(p.iqama) + '</b>' : '&nbsp;'}</div></div>`;
  }).join(''));

  if (next) {
    if (setHTML($('tv-nexthead'), `<div class="lab">${next.k === 'sunrise' ? 'الشروق' : 'الصلاة القادمة'}</div><div class="nm">${NAMES[next.k]}</div>
      <div class="tm">${hm(next.adhan)}</div>${next.iqama ? `<div class="iq">الإقامة ${hm(next.iqama)}</div>` : ''}`)) {
      setText($('tv-cd'), dur(next.adhan - now)); fitBox($('tv-next'));
    }
    setText($('tv-cd'), dur(next.adhan - now));
  }
  if (now - lastSlide > 15000) { lastSlide = +now; slideI++; }
  const sl = slides(row);
  if (setHTML($('tv-panel'), sl[slideI % sl.length])) fitBox($('tv-panel'));

  const ov = $('tv-over'); let html = '';
  if (phase === 'iqama') {
    html = `<div class="ovl">أُذّن لصلاة ${NAMES[cur.k]}</div><div class="ovt">الإقامة بعد</div><div class="ovc">${dur(cur.iqama - now)}</div>
      <div class="ovn">${esc((cfg.tv_news || '').split('\n')[0] || '')}</div>`;
  } else if (phase === 'prayer') {
    html = `<div class="ovt">الصلاة قائمة</div><div class="ovl">صلاة ${NAMES[cur.k]}</div><div class="ovn">يُرجى إغلاق الهاتف</div>`;
  } else if (phase === 'adhkar') {
    if (!lastAdhkar) lastAdhkar = +now;
    if (now - lastAdhkar > 25000) { lastAdhkar = +now; adhkarI++; }
    html = `<div class="adk">${adhkarSlide(adhkarI, cur.k)}</div>`;
  } else if (phase === 'jumua') {
    const toAdhan = cur.adhan > now;
    html = `<div class="ovt">صلاة الجمعة</div><div class="hadith"><div class="fit">${(cfg.tv_hadith || '').split('\n').map(l => `<p>${esc(l)}</p>`).join('')}</div></div>
      <div class="ovn">${toAdhan ? 'الأذان بعد ' + dur(cur.adhan - now) : 'الإقامة بعد ' + dur(cur.iqama - now)} · يُرجى إغلاق الهاتف والإنصات للخطبة</div>`;
  }
  if (setHTML(ov, html) && html) fitBox(ov);
  if (phase !== 'adhkar') { adhkarI = 0; lastAdhkar = +now; }

  ticker(newsAll(now).join('     ✦     '));
}

// ---------------------------------------------------------------- mosque search (Morocco, OpenStreetMap, offline ~125 KB)
const AR_NORM = s => String(s || '').toLowerCase().normalize('NFKD').replace(/[\u064B-\u065F\u0670\u0300-\u036f]/g, '')
  .replace(/[أإآٱ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/ـ/g, '');
async function mosques() {
  if (!MOSQ) {
    const d = await fetch('data/mosques_ma.json').then(r => r.json());
    const city = Object.fromEntries(model.cities('MA').map(([k, ar]) => [k, ar]));
    MOSQ = d.m.map(([n, alt, dist, hid]) => {
      const c = city['h' + hid] || '';
      return { n, alt, dist, hid, c, key: AR_NORM([n, alt, dist, c].join(' ')) };
    });
  }
  return MOSQ;
}

// ---------------------------------------------------------------- settings (remote-control friendly, saved automatically)
let RES = null, PV = null;      // PV: stage shown in the settings preview {phase, k}
const NUMS = v => String(v ?? '').replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).trim();
const NUM = (v, d = 0) => { const s = String(v ?? '').replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(/[−–]/g, '-').trim();
  const n = parseInt(s, 10); return isNaN(n) ? d : n; };
// number fields as text: the TV's Arabic locale would otherwise show them in Eastern digits
const numIn = (id, v, extra = '') => `<input type="text" inputmode="numeric" dir="ltr" class="num" id="${id}" value="${v}"${extra}>`;
function srcInfo() {
  if (cfg.country === 'MA' && cfg.method === 'MOROCCO' && cfg.habous_id) {
    const H = model.cities('MA').find(c => c[0] === 'h' + cfg.habous_id);
    return `المصدر: وزارة الأوقاف والشؤون الإسلامية – مواقيت ${esc(H ? H[1] : cfg.city_ar)}`;
  }
  const m = S.METHODS[cfg.method]; return `المصدر: حساب فلكي – ${m ? m.ar : cfg.method} – ${esc(cfg.city_ar || cfg.city_name)}`;
}
// parts of the screen whose font and text size can be changed one by one: id, label, base size (rem), sample, CSS selector
const ZONES = [['mos', 'اسم المسجد', 5.4, () => cfg.mosque_name || 'مواقيت الصلاة', '.tv-mos'], ['clock', 'الساعة', 13, () => '12:30', '#tv-clockbox'],
  ['date', 'التاريخ', 3.2, () => 'الجمعة 3 جمادى الثانية', '#tv-date'], ['next', 'الصلاة القادمة والعدّاد', 9, () => 'العصر 08:52', '#tv-next'],
  ['panel', 'الإعلانات والأحزاب', 8, () => (cfg.tv_news || '').split('\n')[0] || 'إعلان', '#tv-panel'], ['cards', 'بطاقات المواقيت', 7, () => 'الظهر 12:20', '#tv-prayers'],
  ['ticker', 'الشريط المتحرك', 3.6, () => (cfg.tv_news || '').split('\n')[0] || 'إعلان', '#tv-ticker'], ['iqama', 'شاشة الإقامة والصلاة', 30, () => '04:43', '.ovc,.ovl,.ovt,.ovn'],
  ['adhkar', 'الأذكار', 6.4, () => 'أَسْتَغْفِرُ اللهَ', '.adk h2,.adk p,.adk .src'], ['hadith', 'حديث الجمعة', 7, () => 'مَنْ لَغَا فَلَا جُمُعَةَ لَهُ', '.hadith p']];
const zOf = k => Math.max(50, Math.min(250, ((cfg.tv_z || {})[k]) || 100)) / 100;
const zFont = k => ((cfg.tv_zf || {})[k]) || '';
// size (rem = 1vh) and line height of every text inside each part: scaled by the part's size % and line spacing %
// size (rem = 1vh) and line height of every text inside each part, scaled by the part's size % and line spacing %
// (line height null = the font's normal spacing; it is only set when the user changes the spacing)
const ZRULES = {
  mos: [['.tv-mos', 5.4, 1.15], ['.tv-mos small', 2.6, 1.15]],
  clock: [['#tv-clock', 13, 1], ['#tv-sec', 4.6, 1]],
  date: [['#tv-date', 3.2, 1.55]],
  next: [['#tv-nexthead .lab', 3, null], ['#tv-nexthead .nm', 9, 1.15], ['#tv-nexthead .tm', 5.2, null], ['#tv-nexthead .iq', 3.2, null],
    ['#tv-cdbox span', 3.2, null], ['#tv-cd', 8, 1]],
  panel: [['#tv-panel h3', 3.4, null], ['#tv-panel .big', 8, 1.45], ['#tv-panel .big.fn', 6.4, 1.3], ['#tv-panel .fh', 3.6, null], ['#tv-panel .fv', 4, 1.6],
    ['#tv-panel .hzt', 3, null], ['#tv-panel .hzt b', 6, null], ['#tv-panel .q', 5, 1.7], ['#tv-panel .hzr', 2.5, null]],
  cards: [['.pc .pn', 3.8, null, 3.3], ['.pc .pt', 7, 1.15, 5.2], ['.pc .pi', 2.6, null, 1.65]],      // 4th: max size in vw (6 cards side by side)
  ticker: [['#tv-ticker .tk', 3.6, null]],
  iqama: [['#tv-over .ovl', 6, null], ['#tv-over .ovt', 11, null], ['#tv-over .ovc', 30, 1], ['#tv-over .ovn', 4, null]],
  adhkar: [['.adk h2', 7, null], ['.adk p', 6.4, 1.8], ['.adk .src', 3, null], ['.adk .q', 5.6, 1.7], ['.adk .big2', 5.4, 1.9],
    ['.adk .sura b', 3.4, null], ['.adk .sura .q', 4.8, 1.7]],
  hadith: [['.hadith p', 7, 1.7]],
};
const lOf = k => Math.max(70, Math.min(220, ((cfg.tv_zl || {})[k]) || 100)) / 100;
function zoneCss() {
  let css = '';
  for (const [k, rules] of Object.entries(ZRULES))
    for (const [sel, rem, lh, maxVw] of rules) {
      const l = lOf(k), lt = lh != null ? (lh * l).toFixed(3) : l !== 1 ? (1.45 * l).toFixed(3) : '';
      const fs = `calc(${(rem * zOf(k)).toFixed(3)}rem * var(--fz, 1))`;
      css += `body.tv ${sel}{font-size:${maxVw ? `min(${fs}, ${maxVw}vw)` : fs}${lt ? ';line-height:' + lt : ''}}`;
    }
  css += `#tv-ticker{height:calc(6.4vh * ${Math.max(zOf('ticker'), lOf('ticker')).toFixed(3)})}`;
  let fonts = '';
  for (const [k, , , , sel] of ZONES) {
    const f = zFont(k); if (!f || !S.FONTS.find(x => x[0] === f)) continue;
    fonts += sel.split(',').map(s => `body.tv ${s},body.tv ${s} *`).join(',') + `{font-family:'Z-${f}','TVF',sans-serif !important}`;
  }
  if (fonts) fonts += `body.tv .q{font-family:'QuranWarsh','Amiri',serif !important}body.tv[data-riwaya=hafs] .q{font-family:'QuranHafs','Amiri',serif !important}`;
  return css + fonts;
}
// @font-face rules live in their own <style>, rewritten only when the chosen fonts change:
// rewriting them on every size step made the browser reload the fonts and show a fallback (Kufi / Amiri) for a moment
function fontFaces() {
  const used = new Set([cfg.tv_font, ...Object.values(cfg.tv_zf || {}).filter(Boolean)]);
  const f = fontInfo(cfg.tv_font);
  let css = `@font-face{font-family:'TVF';src:url('fonts/${f[3]}');font-weight:100 500}@font-face{font-family:'TVF';src:url('fonts/${f[4]}');font-weight:600 900}`;
  for (const id of used) { const fi = S.FONTS.find(x => x[0] === id); if (fi) css += `@font-face{font-family:'Z-${id}';src:url('fonts/${fi[3]}');font-weight:100 500}@font-face{font-family:'Z-${id}';src:url('fonts/${fi[4]}');font-weight:600 900}`; }
  const st = $('tv-faces'); if (st && st.textContent !== css) st.textContent = css;
}
const lines = s => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
function listRows(id, items, ph) {
  return items.map((v, i) => `<div class="li"><input type="text" data-list="${id}" value="${esc(v)}" placeholder="${ph}"><button class="del" data-del="${id}:${i}" title="حذف">✕</button></div>`).join('');
}
function adkRows(text) {
  return parseAdhkar(text).map((s, i) => s.special
    ? `<div class="ak"><input type="text" data-ak="t" value="" placeholder="العنوان" class="w1"><input type="text" data-ak="x" value="${esc(s.special)}" class="w3"><input type="text" data-ak="s" value="" placeholder="المصدر" class="w1"><button class="del" data-akdel="${i}">✕</button></div>`
    : `<div class="ak"><input type="text" data-ak="t" value="${esc(s.title)}" placeholder="العنوان" class="w1"><input type="text" data-ak="x" value="${esc(s.lines.join(' / '))}" placeholder="نص الذكر (السطور يفصل بينها /)" class="w3"><input type="text" data-ak="s" value="${esc(s.src)}" placeholder="المصدر" class="w1"><button class="del" data-akdel="${i}">✕</button></div>`).join('');
}
function adkText(box) {
  return [...box.querySelectorAll('.ak')].map(r => {
    const t = r.querySelector('[data-ak=t]').value.trim(), x = r.querySelector('[data-ak=x]').value.trim(), s = r.querySelector('[data-ak=s]').value.trim();
    if (!x) return '';
    if (/^\[.*\]$/.test(x)) return x;
    return [t ? '# ' + t : '', ...x.split('/').map(l => l.trim()).filter(Boolean), s ? '— ' + s : ''].filter(Boolean).join('\n');
  }).filter(Boolean).join('\n\n');
}
function settingsHtml() {
  const th = Object.entries(THEMES).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('');
  const fo = S.FONTS.filter(f => !f[0].startsWith('kfgqpc')).map(f => `<option value="${f[0]}">${f[1]}</option>`).join('');
  const iq = PRAYERS.map(k => `<label>${NAMES[k]}${numIn('iq-' + k, cfg.iqama[k], ` data-iq="${k}"`)}</label>`).join('');
  const tn = KEYS.map(k => `<label>${NAMES[k]}${numIn('tn-' + k, (cfg.tune || {})[k] || 0, ` data-tn="${k}"`)}</label>`).join('');
  const me = S.METHOD_ORDER.map(k => `<option value="${k}">${S.METHODS[k].ar}</option>`).join('');
  const ak = ADK_KEYS.map(([k, n]) => `<option value="${k}">${n}</option>`).join('');
  const zc = ZONES.map(([k, n]) => `<button class="chip" data-zone="${k}">${n}</button>`).join('');
  const pv = (p, k = '') => ` data-pv="${p}"${k ? ` data-pvk="${k}"` : ''}`;
  return `<div class="set"><h2>إعدادات شاشة المسجد <small>تُحفظ كل خانة تلقائياً · الأسهم الأربعة للتنقل · المعاينة تظهر بجانبك عند خانات المظهر</small></h2>
   <h3>المسجد والمدينة</h3>
   <div class="g2"><label>اسم المسجد (اكتب أوله للبحث)<input type="text" id="s-mosque" value="${esc(cfg.mosque_name)}"></label>
    <label>البلد<select id="s-country"></select></label></div>
   <div id="s-mosques" class="cl"></div>
   <label>المدينة (اكتب أول الاسم ثم اختر من القائمة)<input type="text" id="s-city" value="${esc(cfg.city_ar)}"></label><div id="s-cities" class="cl"></div>
   <small id="s-src">${srcInfo()}</small>
   <h3>طريقة حساب المواقيت</h3>
   <label class="chk"><input type="checkbox" id="s-mauto"${cfg.method_auto !== false ? ' checked' : ''}><span>تلقائي حسب بلد المسجد (في المغرب: مواقيت وزارة الأوقاف)</span></label>
   <div class="g2"><label>الطريقة<select id="s-method">${me}</select></label>
    <label>صلاة العصر<select id="s-asr"><option value="1">الجمهور</option><option value="2">الحنفي</option></select></label></div>
   <label>تعديل يدوي للأذان بالدقائق (مثال: 2 أو -3)</label><div class="g6">${tn}</div>
   <h3>الإقامة ومراحل الشاشة <small>(بالدقائق)</small></h3>
   <div class="g6"${pv('iqama')}>${PRAYERS.map(k => `<label${pv('iqama', k)}>${NAMES[k]}${numIn('iq-' + k, cfg.iqama[k], ` data-iq="${k}"`)}</label>`).join('')}<label${pv('jumua')}>الجمعة${numIn('s-jiq', cfg.jumua_iqama)}</label></div>
   <div class="g3"><label${pv('prayer')}>مدة الصلاة${numIn('s-pmin', cfg.prayer_min)}</label><label${pv('adhkar')}>مدة الأذكار بعدها${numIn('s-amin', cfg.adhkar_min)}</label>
    <label${pv('jumua')}>الحديث قبل أذان الجمعة${numIn('s-fri', cfg.friday_before)}</label></div>
   <h3>المظهر</h3>
   <div class="g2"${pv('normal')}><label>التصميم<select id="s-theme">${th}</select></label>
    <label>الخط العام للشاشة<select id="s-font">${fo}</select></label>
    <label>شكل الأرقام<select id="s-digits"><option value="auto">تلقائي حسب البلد</option><option value="western">0123</option><option value="eastern">٠١٢٣</option></select></label>
    <label>الرواية (الأحزاب والآيات)<select id="s-riwaya"><option value="warsh">ورش عن نافع</option><option value="hafs">حفص عن عاصم</option></select></label></div>
   <h3>الخط وحجمه لكل جزء من الشاشة</h3>
   <div class="chips"${pv('zone')}>${zc}</div>
   <div class="g2"${pv('zone')}><label>نوع خط الجزء المختار<select id="z-font"><option value="">مثل الخط العام</option>${fo}</select></label>
    <div><label>حجمه</label><div class="zrow"><button id="z-minus">−</button><b id="z-val">100%</b><button id="z-plus">+</button><button id="z-reset">100%</button></div></div>
    <div></div><div><label>تباعد الأسطر</label><div class="zrow"><button id="l-minus">−</button><b id="l-val">100%</b><button id="l-plus">+</button><button id="l-reset">100%</button></div></div></div>
   <small id="z-note"></small>
   <h3>الإعلانات للمصلين <small>(اللوحة والشريط المتحرك)</small></h3>
   <div id="s-news"${pv('normal')}>${listRows('news', lines(cfg.tv_news), 'نص الإعلان')}</div><button class="add" id="add-news"${pv('normal')}>+ إضافة إعلان</button>
   <label class="chk"${pv('normal')}><input type="checkbox" id="s-fast"${cfg.tv_fast !== false ? ' checked' : ''}><span>إعلانات صيام التطوع تلقائياً: الأيام البيض، عاشوراء وتاسوعاء، عرفة والعشر، الست من شوال، أول محرم — قبلها بيومين وبيوم وفي يومها، مع ذكر فضلها</span></label>
   <label class="chk"${pv('normal')}><input type="checkbox" id="s-fastw"${cfg.tv_fast_week ? ' checked' : ''}><span>التذكير أيضاً بصيام الإثنين والخميس (في اليوم السابق وفي يومه)</span></label>
   <h3>حديث الجمعة</h3>
   <div id="s-hadith"${pv('jumua')}>${listRows('hadith', lines(cfg.tv_hadith), 'سطر من الحديث')}</div><button class="add" id="add-hadith"${pv('jumua')}>+ إضافة سطر</button>
   <h3>الأذكار بعد الصلاة</h3>
   <div${pv('adhkar')}><label>أذكار صلاة<select id="s-adk-p">${ak}</select></label>
   <div id="s-adk"></div>
   <div class="row"><button class="add" id="add-adk">+ إضافة ذكر</button><button id="s-adk-reset">استعادة الأذكار الأصلية</button></div></div>
   <small>اكتب [آية الكرسي] أو [المعوذات] في خانة النص لعرضها بالرسم العثماني، و(33) يظهر عدداً.</small>
   <h3>الساعة والتاريخ</h3>
   <div class="g2"><label>مصدر الساعة<select id="s-clock"><option value="auto">تلقائي: من الإنترنت</option><option value="device">ساعة جهاز التلفاز</option><option value="manual">يدوي: أُدخل التاريخ والوقت</option></select></label>
    <div><label>&nbsp;</label><button id="ck-sys">إعدادات التاريخ والوقت في الجهاز</button></div></div>
   <div id="clk-man"><div class="g3"><label>التاريخ (سنة-شهر-يوم)<input type="text" inputmode="numeric" dir="ltr" class="num" id="ck-date"></label>
     <label>الوقت (ساعة:دقيقة)<input type="text" inputmode="numeric" dir="ltr" class="num" id="ck-time"></label>
     <div><label>&nbsp;</label><button id="ck-set" class="b1">ضبط الساعة</button></div></div>
    <div class="zrow"><button id="ck-h-">− ساعة</button><button id="ck-m-">− دقيقة</button><b id="ck-now" dir="ltr"></b><button id="ck-m+">+ دقيقة</button><button id="ck-h+">+ ساعة</button></div></div>
   <small id="ck-info"></small>
   <small>دون إنترنت تُعتمد مواقيت الأوقاف المحفوظة داخل التطبيق (آخر مزامنة عند إصداره)، ثم الحساب الفلكي المعايَر على مواقيت الأوقاف.</small>
   <h3>الشاشة</h3>
   <label>دقة الشاشة<select id="s-res"><option value="auto">تلقائي (أعلى دقة يدعمها الجهاز)</option><option value="2160">4K – 3840×2160</option><option value="1080">Full HD – 1920×1080</option></select></label><small id="s-resinfo"></small>
   <div class="row"><button id="s-cancel" class="b1">إغلاق</button><button id="s-phone">التحويل إلى وضع الهاتف</button></div>
   <h3>حول التطبيق</h3>${U.aboutHtml()}
   <p class="hint">الأسهم ▲▼◀▶ للانتقال إلى الخانة في ذلك الاتجاه، وOK للكتابة أو الاختيار. بعد الكتابة: زر الرجوع يغلق لوحة المفاتيح.
    الضغط المطوّل على زر الرجوع يعيدك إلى اختيار الوضع (هاتف / مسجد). قائمة المساجد من OpenStreetMap (© المساهمون، ODbL).</p></div>`;
}
let cityRows = [], pendingCity = null, ZSEL = 'panel', ADK = null, adkKey = 'all';
function suggest(listEl, items) {
  listEl.innerHTML = items.map(([k, lab]) => `<button data-k="${esc(k)}">${lab}</button>`).join('');
}
function zoneUI() {
  document.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c.dataset.zone === ZSEL));
  const z = ZONES.find(x => x[0] === ZSEL), v = Math.round(zOf(ZSEL) * 100);
  $('z-val').textContent = v + '%';
  const px = innerHeight / 100 * z[2] * zOf(ZSEL);       // the real size on the screen
  $('z-font').value = zFont(ZSEL);
  $('l-val').textContent = Math.round(lOf(ZSEL) * 100) + '%';
  if (PV) showPV(zonePV());
  setTimeout(fitNote, 120);
}
// the text of some parts is shrunk to stay inside its frame: say so, otherwise «+» seems to do nothing
function fitNote() {
  const n = $('z-note'); if (!n) return;
  const box = { next: '#tv-next', panel: '#tv-panel', adhkar: '.adk', hadith: '.hadith' }[ZSEL];
  const f = box && document.querySelector(box + ' .fit');
  const capped = (ZRULES[ZSEL] || []).find(x => x[3]);
  if (!box && capped) {                       // parts with a maximum size (the 6 prayer cards must stay side by side)
    const e = document.querySelector(capped[0]), unit = innerHeight / 100 * capped[1];
    const got = e ? parseFloat(getComputedStyle(e).fontSize) : 0;
    n.textContent = e && got < unit * zOf(ZSEL) - 1 ? `⚠️ وصل هذا الجزء إلى أكبر حجم يتّسع له عرض الشاشة (${Math.round(got / unit * 100)}%). التكبير بعد هذا لن يظهر.` : '';
    return;
  }
  const fz = f ? +(f.dataset.fz || 1) : 1;
  n.textContent = fz < 0.98 ? `⚠️ نص هذا الجزء أكبر من إطاره فيُصغَّر تلقائياً ليبقى داخله: الحجم الظاهر الآن ${Math.round(zOf(ZSEL) * fz * 100)}%. التكبير بعد هذا لن يظهر.` : '';
}
// ---- live mini screen beside the settings (the real display, scaled down)
const zonePV = () => ({ iqama: { phase: 'iqama' }, adhkar: { phase: 'adhkar', k: adkK() }, hadith: { phase: 'jumua' } }[ZSEL] || { phase: 'normal' });
const adkK = () => (adkKey === 'all' ? 'dhuhr' : adkKey);
function refreshPV() {
  for (const id of ['tv-ticker', 'tv-panel', 'tv-nexthead', 'tv-over', 'tv-prayers', 'tv-date']) { const e = $(id); if (e) { e._h = null; e._t = null; } }
  render(); fitBox($('tv-next'));
  clearTimeout(refreshPV.t); refreshPV.t = setTimeout(fitNote, 150);
}
function showPV(p) {
  const same = PV && p && PV.phase === p.phase && PV.k === p.k;
  PV = p; document.body.classList.toggle('pv', !!p);
  if (p && !same) { adhkarI = 0; lastAdhkar = 0; }
  if (p) refreshPV(); else document.body.dataset.phase = 'normal';
}
function pvFor(el) {
  const w = el && el.closest && el.closest('[data-pv]'); if (!w) return null;
  const p = w.dataset.pv;
  if (p === 'zone') return zonePV();
  if (p === 'adhkar') return { phase: 'adhkar', k: adkK() };
  return { phase: p, k: w.dataset.pvk || (p === 'iqama' ? 'dhuhr' : '') };
}
let applyT = null;
function commit(full) {             // read every field, save, and refresh the screen behind the settings
  const cc = $('s-country').value, changed = cc !== cfg.country;
  if (changed) Object.assign(cfg, { country: cc }, model.countryDefaults(cc));
  if (pendingCity) { Object.assign(cfg, model.cityInfo(pendingCity.cc, pendingCity.k), { city_key: pendingCity.k }); pendingCity = null; }
  else if (changed) { const f = model.cities(cc)[0]; Object.assign(cfg, model.cityInfo(cc, f[0]), { city_key: f[0] }); }
  cfg.method_auto = $('s-mauto').checked;
  if (cfg.method_auto) Object.assign(cfg, { method: model.countryDefaults(cfg.country).method, asr: model.countryDefaults(cfg.country).asr });
  else Object.assign(cfg, { method: $('s-method').value, asr: +$('s-asr').value || 1 });
  if (cfg.country !== 'MA' && cfg.method === 'MOROCCO') cfg.method = S.COUNTRY_METHOD[cfg.country] || 'MWL';
  if (cfg.country !== 'MA' && cfg.hijri_mode === 'morocco') cfg.hijri_mode = 'ummalqura';
  cfg.tune = Object.fromEntries(KEYS.map(k => [k, Math.max(-60, Math.min(60, NUM($('tn-' + k).value)))]));
  document.querySelectorAll('[data-iq]').forEach(i => cfg.iqama[i.dataset.iq] = Math.max(0, NUM(i.value)));
  ADK[adkKey] = adkText($('s-adk')); cfg.tv_adhkar = { ...ADK };
  const res = $('s-res').value, resChanged = res !== (cfg.tv_res || 'auto');
  Object.assign(cfg, { mosque_name: $('s-mosque').value.trim(), tv_theme: $('s-theme').value, riwaya: $('s-riwaya').value, digits: $('s-digits').value,
    tv_font: $('s-font').value, tv_res: res, clock_mode: $('s-clock').value,
    jumua_iqama: NUM($('s-jiq').value), prayer_min: NUM($('s-pmin').value, 10) || 10, adhkar_min: NUM($('s-amin').value),
    friday_before: NUM($('s-fri').value),
    tv_news: [...document.querySelectorAll('[data-list=news]')].map(i => i.value.trim()).filter(Boolean).join('\n'),
    tv_hadith: [...document.querySelectorAll('[data-list=hadith]')].map(i => i.value.trim()).filter(Boolean).join('\n'),
    tv_fast: $('s-fast').checked, tv_fast_week: $('s-fastw').checked });
  FASTC.key = '';
  save(); applyTheme();
  if (PV) refreshPV();
  $('s-src').innerHTML = srcInfo();
  if (resChanged) applyRes();
  dirty = true;                      // the screen behind is hidden while the settings are open: refresh it on close
}
let dirty = false;
function clockUI() {
  if (!$('ck-now')) { clearInterval(clockUI.t); return; }
  const n = NOW(), m = cfg.clock_mode || 'auto';
  $('ck-now').textContent = isoLocal(n) + '  ' + [n.getHours(), n.getMinutes(), n.getSeconds()].map(pad).join(':');
  $('clk-man').style.opacity = m === 'manual' ? 1 : .55;
  $('ck-info').textContent = m === 'auto' ? (SKEW != null ? 'الوقت مأخوذ من الإنترنت ✓' : 'لا إنترنت الآن: تُستعمل ساعة الجهاز مع التوقيت الرسمي للبلد')
    : m === 'manual' ? 'وقت يدوي: يبقى صحيحاً ما دام الجهاز موصولاً بالكهرباء. بعد انقطاعها يطلب التطبيق التحقق منه.' : 'ساعة جهاز التلفاز كما هي';
}
async function openSettings() {
  const box = $('tv-settings'); box.innerHTML = settingsHtml(); box.classList.add('on');
  document.body.classList.add('setting');          // hide the live screen: much lighter for the TV box while navigating
  $('s-country').innerHTML = model.countries().map(([cc, ar]) => `<option value="${cc}">${ar}</option>`).join('');
  $('s-country').value = cfg.country; $('s-theme').value = cfg.tv_theme; $('s-riwaya').value = cfg.riwaya || 'warsh';
  $('s-digits').value = cfg.digits || 'auto'; $('s-font').value = cfg.tv_font; $('s-res').value = cfg.tv_res || 'auto';
  $('s-method').value = cfg.method; $('s-asr').value = String(cfg.asr || 1);
  const mAuto = () => { const on = $('s-mauto').checked; $('s-method').disabled = $('s-asr').disabled = on;
    if (on) { const d = model.countryDefaults($('s-country').value); $('s-method').value = d.method; $('s-asr').value = String(d.asr); } };
  mAuto();
  $('s-resinfo').textContent = `الآن: ${Math.round(screen.width * devicePixelRatio)}×${Math.round(screen.height * devicePixelRatio)}` + (RES && RES.max ? ` · أقصى ما يدعمه الجهاز: ${RES.max}` : '');
  cityRows = model.cities(cfg.country); pendingCity = null;
  // adhkar editor
  ADK = { ...cfg.tv_adhkar }; adkKey = 'all';
  const adkLoad = () => { $('s-adk').innerHTML = adkRows(ADK[adkKey] || (adkKey === 'all' ? DEF_ADHKAR : '')) || '<small>لا أذكار خاصة بهذه الصلاة: تُعرض أذكار «كل الصلوات». اضغط «+ إضافة ذكر» لإضافة أذكار خاصة.</small>'; lockTexts(); };
  adkLoad();
  // auto save: every field when it is left / changed
  box.addEventListener('change', e => {
    const el = e.target;
    if (el.id === 's-adk-p') { ADK[adkKey] = adkText($('s-adk')); adkKey = el.value; adkLoad(); if (PV) showPV({ phase: 'adhkar', k: adkK() }); return; }
    if (el.id === 's-country') { cityRows = model.cities(el.value); $('s-city').value = ''; mAuto(); }
    if (el.id === 's-mauto') mAuto();
    if (el.id === 's-mosque' || el.id === 's-city') return;            // handled by their suggestion lists / commit below
    commit();
    if (el.id === 's-font') zoneUI();
    if (el.id === 's-clock') clockUI();
  });
  box.addEventListener('focusout', e => {
    if (e.target.id === 's-mosque') commit();
    if (e.target.id === 's-city' && !e.target.value.trim()) setTimeout(() => { if (!pendingCity && document.activeElement !== $('s-city')) $('s-city').value = cfg.city_ar; }, 300);
  });
  // search lists (city / mosque)
  $('s-city').oninput = () => {
    const q = AR_NORM($('s-city').value.trim());
    const hits = q ? cityRows.filter(c => AR_NORM(c[1]).includes(q) || AR_NORM(c[2]).includes(q))
      .sort((a, b) => (AR_NORM(a[1]).startsWith(q) || AR_NORM(a[2]).startsWith(q) ? 0 : 1) - (AR_NORM(b[1]).startsWith(q) || AR_NORM(b[2]).startsWith(q) ? 0 : 1)).slice(0, 8) : [];
    suggest($('s-cities'), hits.map(c => [c[0], `<b>${esc(c[1])}</b>${c[2] && c[2] !== c[1] ? ' — ' + esc(c[2]) : ''}`]));
    if (q && !hits.length) $('s-cities').innerHTML = '<small class="none">لا توجد مدينة بهذا الاسم. جرّب أول حرفين أو ثلاثة فقط، بالعربية أو بالفرنسية.</small>';
  };
  $('s-cities').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return;
    pendingCity = { cc: $('s-country').value, k: b.dataset.k }; const c = cityRows.find(x => x[0] === b.dataset.k);
    $('s-city').value = c ? c[1] : b.textContent; $('s-cities').innerHTML = ''; commit(); lockTexts(); go($('s-mauto')); };
  $('s-mosque').oninput = async () => {
    const q = AR_NORM($('s-mosque').value.trim());
    if ($('s-country').value !== 'MA' || q.length < 2) { $('s-mosques').innerHTML = ''; return; }
    const words = q.split(/\s+/).filter(w => w && w !== 'مسجد' && w !== 'جامع');
    const L = await mosques();
    const hits = (words.length ? L.filter(m => words.every(w => m.key.includes(w))) : L).slice(0, 8);
    suggest($('s-mosques'), hits.map(m => [L.indexOf(m), `<b>${esc(m.n)}</b>${m.alt ? ' — ' + esc(m.alt) : ''}<small>${[m.dist, m.c].filter(Boolean).map(esc).join(' · ')}</small>`]));
  };
  $('s-mosques').onclick = e => { const b = e.target.closest('[data-k]'); if (!b) return;
    const m = MOSQ[+b.dataset.k];
    $('s-mosque').value = m.n; $('s-mosques').innerHTML = '';
    pendingCity = { cc: 'MA', k: 'h' + m.hid }; $('s-country').value = 'MA'; cityRows = model.cities('MA'); $('s-city').value = m.c;
    commit(); lockTexts(); go($('s-country')); };
  // lists: add / delete
  const addRow = (id, ph) => { $('s-' + id).insertAdjacentHTML('beforeend', listRows(id, [''], ph).replace(`data-del="${id}:0"`, `data-del="${id}:x"`));
    lockTexts(); const ins = $('s-' + id).querySelectorAll('input'); go(ins[ins.length - 1]); };
  $('add-news').onclick = () => addRow('news', 'نص الإعلان');
  $('add-hadith').onclick = () => addRow('hadith', 'سطر من الحديث');
  $('add-adk').onclick = () => { if (!$('s-adk').querySelector('.ak')) $('s-adk').innerHTML = '';
    $('s-adk').insertAdjacentHTML('beforeend', adkRows('# \nذكر جديد').replace('value="ذكر جديد"', 'value=""'));
    lockTexts(); const r = $('s-adk').querySelectorAll('.ak'); go(r[r.length - 1].querySelector('[data-ak=x]')); };
  $('s-adk-reset').onclick = () => { ADK[adkKey] = adkKey === 'all' ? DEF_ADHKAR : ''; adkLoad(); commit(); };
  box.addEventListener('click', e => {
    const d = e.target.closest('[data-del],[data-akdel]'); if (!d) return;
    const row = d.closest('.li,.ak'), nxt = row.nextElementSibling || row.previousElementSibling;
    row.remove(); commit(); go(nxt ? nxt.querySelector('input') : $(d.dataset.akdel !== undefined ? 'add-adk' : 'add-' + d.dataset.del.split(':')[0]));
  });
  // text sizes per part
  box.querySelectorAll('.chip').forEach(c => c.onclick = () => { ZSEL = c.dataset.zone; zoneUI(); showPV(zonePV()); });
  const zSet = v => { cfg.tv_z = { ...(cfg.tv_z || {}), [ZSEL]: Math.max(50, Math.min(250, v)) }; save(); applyTheme(); zoneUI(); refreshPV(); dirty = true; };
  $('z-minus').onclick = () => zSet(Math.round(zOf(ZSEL) * 100) - 10);
  $('z-plus').onclick = () => zSet(Math.round(zOf(ZSEL) * 100) + 10);
  $('z-reset').onclick = () => zSet(100);
  const lSet = v => { cfg.tv_zl = { ...(cfg.tv_zl || {}), [ZSEL]: Math.max(70, Math.min(220, v)) }; save(); applyTheme(); zoneUI(); refreshPV(); dirty = true; };
  $('l-minus').onclick = () => lSet(Math.round(lOf(ZSEL) * 100) - 10);
  $('l-plus').onclick = () => lSet(Math.round(lOf(ZSEL) * 100) + 10);
  $('l-reset').onclick = () => lSet(100);
  $('z-font').onchange = e => { e.stopPropagation(); cfg.tv_zf = { ...(cfg.tv_zf || {}), [ZSEL]: $('z-font').value }; save(); applyTheme(); zoneUI(); refreshPV(); dirty = true; };
  zoneUI();
  // clock
  $('s-clock').value = cfg.clock_mode || 'auto';
  const ck = d => { cfg.clock_mode = 'manual'; $('s-clock').value = 'manual'; cfg.clock_adj = (+cfg.clock_adj || 0) + d; save(); clockMark(); clockUI(); ckFill(); dirty = true; };
  $('ck-h-').onclick = () => ck(-60); $('ck-h+').onclick = () => ck(60); $('ck-m-').onclick = () => ck(-1); $('ck-m+').onclick = () => ck(1);
  const ckFill = () => { const n = NOW(); $('ck-date').value = isoLocal(n); $('ck-time').value = pad(n.getHours()) + ':' + pad(n.getMinutes()); };
  ckFill();
  $('ck-set').onclick = () => {
    const d = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(NUMS($('ck-date').value)), h = /^(\d{1,2})[:.](\d{2})$/.exec(NUMS($('ck-time').value));
    if (!d || !h) { $('ck-info').textContent = '⚠️ اكتب التاريخ هكذا 2026-11-14 والوقت هكذا 18:45'; return; }
    const want = new Date(+d[1], d[2] - 1, +d[3], +h[1], +h[2], 0);
    if (isNaN(want)) return;
    cfg.clock_mode = 'manual'; $('s-clock').value = 'manual';
    cfg.clock_adj = (want - (Date.now() + OFF)) / 60000; save(); clockMark(); clockUI(); dirty = true;
    $('ck-info').textContent = '✓ ضُبطت الساعة: ' + isoLocal(want) + ' ' + pad(+h[1]) + ':' + h[2];
  };
  $('ck-sys').onclick = () => U.openSystem('date').catch(() => { $('ck-info').textContent = 'لا تتوفر شاشة إعدادات التاريخ على هذا الجهاز: استعمل الضبط اليدوي هنا.'; });
  U.wireAbout(true);
  // live preview beside the settings: only for the fields that change the screen
  box.addEventListener('focusin', e => { const p = pvFor(e.target); if (JSON.stringify(p) !== JSON.stringify(PV)) showPV(p); });
  clockUI(); clearInterval(clockUI.t); clockUI.t = setInterval(clockUI, 1000);
  $('s-cancel').onclick = () => { commit(); closeSettings(); };
  $('s-phone').onclick = () => { commit(); localStorage.setItem('mode', 'phone'); location.reload(); };
  lockTexts();
  setTimeout(() => go($('s-mosque')), 50);
}
// TV remote: text fields open the on-screen keyboard only after OK (otherwise the arrows get stuck in the keyboard)
function lockTexts() {
  $('tv-settings').querySelectorAll('input:not([type=checkbox]),textarea').forEach(el => {
    if (el._locked) return; el._locked = true; el.readOnly = true;
    el.addEventListener('blur', () => { el.readOnly = true; });
  });
}
function go(el) { if (!el) return; el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'nearest' }); }
function closeSettings() {
  showPV(null);
  $('tv-settings').classList.remove('on'); $('tv-settings').innerHTML = ''; document.body.classList.remove('setting');
  clearInterval(clockUI.t);
  if (dirty) { dirty = false; (async () => { lastBuild = ''; await build(); $('tv-ticker')._t = null; $('tv-panel')._h = null; $('tv-nexthead')._h = null; render(); })(); }
}
function focusables() { return [...$('tv-settings').querySelectorAll('input,select,textarea,button')].filter(e => e.offsetParent && !e.disabled); }
let lastNav = 0;
function onKey(e) {
  if (localStorage.getItem('kmperf')) { const t0 = performance.now(); requestAnimationFrame(() => requestAnimationFrame(() => { const a = document.activeElement; console.log('KMPERF ' + e.key + (e.repeat ? '(rep)' : '') + ' ' + Math.round(performance.now() - t0) + 'ms -> ' + (a.id || a.dataset.zone || a.dataset.list || a.dataset.ak || a.tagName) + ' ro=' + a.readOnly); })); }
  if (PK.pickerKey(e)) return;                                         // the app's own option list is open
  if (U.netVisible()) { U.netKey(e); return; }                         // «connect to the internet» notice
  if (U.barHasFocus()) { U.barKey(e); return; }                       // the «new version» banner has the focus
  const open = $('tv-settings').classList.contains('on');
  if (U.updateVisible() && e.key === 'ArrowUp' && (!open || !spatial(focusables(), document.activeElement, 'ArrowUp'))) {   // ▲ from the top reaches the banner
    e.preventDefault(); U.focusBar(); return;
  }
  if (!open && U.updateVisible()) {                                    // new version banner: OK = install, Back = hide
    if (e.key === 'Enter') { e.preventDefault(); U.install(); return; }
    if (e.key === 'Escape' || e.key === 'GoBack' || e.key === 'BrowserBack') { e.preventDefault(); U.hideUpdate(); return; }
  }
  if (!open && $('tv-clockwarn')) {
    if (e.key === 'Enter') { e.preventDefault(); $('tv-clockwarn').remove(); openSettings().then(() => go($('ck-date'))); return; }
  }
  if (!open) {
    if (['Enter', 'ContextMenu', 'MediaPlayPause', ' '].includes(e.key) || e.keyCode === 82 || e.keyCode === 23) { e.preventDefault(); openSettings(); }
    return;
  }
  const f = focusables(), el = document.activeElement;
  const text = el && el.type !== 'checkbox' && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT');
  const typing = text && !el.readOnly;
  if ((e.key === 'Enter' || e.key === ' ') && el && el.tagName === 'SELECT') { e.preventDefault(); PK.openPicker(el); return; }   // never the native list
  if (e.key === 'Enter' && el && (el.type === 'checkbox' || el.tagName === 'BUTTON')) { e.preventDefault(); el.click(); return; }
  if (e.key === 'Enter' && text && el.readOnly) {                      // OK: start typing (keyboard opens)
    e.preventDefault(); el.blur(); el.readOnly = false; el.focus(); el.click();
    if (el.id === 's-city') { el.placeholder = el.value; el.value = ''; $('s-cities').innerHTML = ''; }   // type a new name
    else if (el.id === 's-mosque' || el.classList.contains('num')) el.select();
    return; }
  if (e.key === 'Enter' && typing) {                                   // OK / «Done» on the keyboard: finish this field
    e.preventDefault(); el.readOnly = true; el.blur(); el.focus({ preventScroll: true });
    el.dispatchEvent(new Event('change', { bubbles: true }));
    const nx = el.id === 's-city' ? $('s-cities').querySelector('button') : el.id === 's-mosque' ? $('s-mosques').querySelector('button') : null;
    if (nx) go(nx);
    return;
  }
  if (e.key === 'Escape' || e.key === 'GoBack' || e.key === 'BrowserBack') { e.preventDefault(); commit(); closeSettings(); return; }
  const dir = { ArrowDown: 1, ArrowUp: -1, ArrowLeft: 1, ArrowRight: -1 }[e.key];
  if (!dir) return;
  // one press = one step: ignore auto-repeat bursts and doubled events from some remotes
  const tNow = performance.now();
  if ((e.repeat && tNow - lastNav < 260) || tNow - lastNav < 110) { e.preventDefault(); return; }
  lastNav = tNow;
  if (typing && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;        // move the cursor inside the text
  e.preventDefault();
  if (typing) { el.readOnly = true; el.dispatchEvent(new Event('change', { bubbles: true })); }
  go(spatial(f, el, e.key) || (f.indexOf(el) < 0 ? f[0] : null));
}
// the field the arrow points to: ▼ = the nearest row below (the field under / closest to this one), ◀ ▶ = next field on the same row
function spatial(f, el, key) {
  if (!el || f.indexOf(el) < 0) return null;
  const r = el.getBoundingClientRect(), cx = (r.left + r.right) / 2;
  const R = f.filter(x => x !== el).map(x => ({ x, b: x.getBoundingClientRect() })).filter(o => o.b.width || o.b.height);
  const vOverlap = b => Math.min(b.bottom, r.bottom) - Math.max(b.top, r.top) > Math.min(b.height, r.height) * 0.4;
  if (key === 'ArrowDown' || key === 'ArrowUp') {
    const down = key === 'ArrowDown';
    const c = R.filter(o => down ? o.b.top >= r.bottom - 3 && !vOverlap(o.b) : o.b.bottom <= r.top + 3 && !vOverlap(o.b));
    if (!c.length) return null;
    const edge = down ? Math.min(...c.map(o => o.b.top)) : Math.max(...c.map(o => o.b.bottom));
    const row = c.filter(o => down ? o.b.top - edge < Math.max(8, o.b.height * 0.5) : edge - o.b.bottom < Math.max(8, o.b.height * 0.5));
    const dist = o => o.b.right < r.left ? r.left - o.b.right : o.b.left > r.right ? o.b.left - r.right : Math.abs((o.b.left + o.b.right) / 2 - cx) / 1000;
    return row.sort((a, b) => dist(a) - dist(b))[0].x;
  }
  const left = key === 'ArrowLeft';
  const c = R.filter(o => vOverlap(o.b) && (left ? o.b.right <= r.left + 3 : o.b.left >= r.right - 3));
  if (!c.length) return null;
  return c.sort((a, b) => (left ? r.left - a.b.right : a.b.left - r.right) - (left ? r.left - b.b.right : b.b.left - r.right))[0].x;
}

// ---------------------------------------------------------------- display resolution (Android TV: 1080p / 4K output mode)
async function applyRes() {
  if (!P.Screen || !P.Screen.modes) return;
  try {
    const m = await P.Screen.modes();
    const modes = m.modes || [];
    if (!modes.length) return;
    const max = modes.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a));
    RES = { max: `${max.w}×${max.h}` };
    const want = cfg.tv_res === '1080' ? 1080 : cfg.tv_res === '2160' ? 2160 : Math.min(max.w, max.h);
    const pick = modes.filter(x => Math.min(x.w, x.h) === want).sort((a, b) => b.fps - a.fps)[0];
    if (pick && pick.id !== m.current) await P.Screen.setMode({ id: pick.id });
  } catch (e) { console.warn('display mode', e); }
}

// ---------------------------------------------------------------- page
const CSS = `
@font-face{font-family:'QuranWarsh';src:url('fonts/KFGQPC-Warsh.ttf')}
@font-face{font-family:'QuranHafs';src:url('fonts/KFGQPC-Hafs.ttf')}
html,body{height:100%;margin:0;overflow:hidden}
html{font-size:calc(var(--sc,1) * 1vh)}
body.tv{background:var(--bg);color:var(--fg);font-family:'TVF','Noto Kufi Arabic',sans-serif;direction:rtl;cursor:none;
  -webkit-font-smoothing:antialiased;text-rendering:geometricPrecision;font-variant-numeric:tabular-nums lining-nums}
.tv *{box-sizing:border-box}
#tv{position:fixed;inset:0;display:grid;grid-template-rows:auto 1fr auto auto;gap:1.6vh;padding:calc(2.2vh + var(--bandh)) 2.4vw calc(1.8vh + var(--bandh))}
#tv::before,#tv::after{content:'';position:absolute;left:0;right:0;height:var(--bandh);background:var(--band);border-color:var(--line);border-style:solid;border-width:0}
#tv::before{top:0;border-bottom-width:.4vh}#tv::after{bottom:0;border-top-width:.4vh}
.tv-head{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;gap:2vw}
.tv-mos{font-weight:800;font-size:5.4rem;color:var(--accent);line-height:1.15}
.tv-mos small{display:block;font-size:2.6rem;color:var(--muted);font-weight:500}
#tv-clockbox{text-align:center;direction:ltr;font-weight:800;line-height:1;white-space:nowrap}
#tv-clock{font-size:13rem;letter-spacing:.02em}#tv-sec{font-size:4.6rem;color:var(--accent);margin-left:.6vw;vertical-align:top;display:inline-block;width:2.4ch}
#tv-date{text-align:left;font-size:3.2rem;line-height:1.55;color:var(--muted)}#tv-date b{color:var(--fg)}
.tv-mid{display:grid;grid-template-columns:1fr 1.45fr;gap:1.6vw;min-height:0}
.box{background:var(--card);color:var(--cardfg);border:.3vh solid var(--line);border-radius:2.2vh;padding:2.2vh 2vw;min-height:0;overflow:hidden;
  box-shadow:0 1vh 3vh rgba(0,0,0,.25)}
#tv-next{display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}
#tv-next .fit{display:flex;flex-direction:column;align-items:center;justify-content:center}
#tv-nexthead .lab{font-size:3rem;color:var(--cardmuted)}#tv-nexthead .nm{font-size:9rem;font-weight:800;color:var(--nm);line-height:1.15}
#tv-nexthead .tm{font-size:5.2rem;font-weight:800}#tv-nexthead .iq{margin-top:.6vh;font-size:3.2rem;color:var(--cardmuted)}
#tv-cdbox{margin-top:1.2vh;display:flex;align-items:baseline;gap:1vw}
#tv-cdbox span{font-size:3.2rem;color:var(--cardmuted)}#tv-cd{font-size:8rem;font-weight:800;direction:ltr;line-height:1}
#tv-panel{display:flex;flex-direction:column;justify-content:flex-start;text-align:center;gap:1.2vh}
#tv-panel h3{margin:0 0 .4vh;font-size:3.4rem;color:var(--cardmuted);font-weight:700;border-bottom:.25vh solid var(--line);padding-bottom:.8vh}
#tv-panel .fit{display:flex;flex-direction:column;justify-content:flex-start}
#tv-panel .big{font-size:8rem;font-weight:800;line-height:1.45;padding-top:1vh}
.hz{padding:.4vh 1vw}#tv-panel .hz2{display:grid;grid-template-columns:1fr 1fr;align-items:start}.hz2 .hz+.hz{border-inline-start:.2vh dashed var(--line)}
.hzt{flex-direction:column;align-items:center}
.hzt{display:flex;justify-content:center;gap:.2vh;font-size:3rem;color:var(--cardmuted)}
.hzt b{font-size:6rem;color:var(--cardfg)}.q{font-family:'QuranWarsh','Amiri',serif;font-size:5rem;line-height:1.7;font-weight:400}
.hzr{font-size:2.5rem;color:var(--cardmuted)}
body[data-riwaya=hafs] .q{font-family:'QuranHafs','Amiri',serif}
#tv-prayers{display:grid;grid-template-columns:repeat(6,1fr);gap:1vw}
.pc{background:var(--card);color:var(--cardfg);border:.3vh solid var(--line);border-radius:2vh;padding:1.4vh .6vw;text-align:center}
.pc .pn{font-size:3.8rem;font-weight:800}.pc .pt{font-size:7rem;font-weight:800;line-height:1.15}
.pc .pi{font-size:2.6rem;color:var(--cardmuted)}.pc .pi b{color:var(--cardfg)}
.pc.next{background:var(--hl);color:var(--hlfg);border-color:var(--hl);box-shadow:0 1vh 2.4vh rgba(0,0,0,.35)}
.pc.next .pi,.pc.next .pi b{color:var(--hlfg)}
.pc.done{opacity:.6}
#tv-ticker{position:relative;overflow:hidden;height:6.4vh;background:var(--card);color:var(--cardfg);border:.3vh solid var(--line);border-radius:1.4vh;contain:strict}
#tv-ticker .tk{position:absolute;left:0;top:0;bottom:0;display:flex;align-items:center;font-size:3.6rem;font-weight:700;white-space:nowrap;direction:rtl;
  will-change:transform;backface-visibility:hidden;animation:tick 30s linear infinite}
@keyframes tick{from{transform:translate3d(var(--from,-100%),0,0)}to{transform:translate3d(var(--to,100vw),0,0)}}
#tv-over{position:fixed;inset:0;display:none;flex-direction:column;justify-content:center;align-items:center;text-align:center;
  background:var(--bg);padding:calc(4vh + var(--bandh)) 6vw;gap:2vh}
#tv-over::before,#tv-over::after{content:'';position:absolute;left:0;right:0;height:var(--bandh);background:var(--band)}
#tv-over::before{top:0}#tv-over::after{bottom:0}
body:not([data-phase=normal]) #tv-over{display:flex}
.ovl{font-size:6rem;color:var(--muted)}.ovt{font-size:11rem;font-weight:800;color:var(--accent)}.ovc{font-size:30rem;font-weight:800;direction:ltr;line-height:1}
.ovn{font-size:4rem;color:var(--accent2)}
body[data-phase=prayer] #tv-over{background:#000;color:#777}body[data-phase=prayer] #tv-over::before,body[data-phase=prayer] #tv-over::after{display:none}
body[data-phase=prayer] .ovt{color:#9a8a5a}
.adk,.hadith{width:100%;max-width:100%;max-height:78vh;display:flex;flex-direction:column;overflow:hidden}
.adk{height:78vh;justify-content:center}.hadith{max-height:56vh}

.adk h2{font-size:7rem;color:var(--accent);margin:0 0 2vh}.adk p{font-family:'Amiri',serif;font-size:6.4rem;line-height:1.8;margin:1.2vh 0}
.adk i{font-style:normal;color:var(--accent);font-size:.7em;margin:0 .4vw}
.adk .src{font-size:3rem;color:var(--muted);margin-top:1.4vh}.adk .q{font-size:5.6rem}.adk .big2{font-size:5.4rem;line-height:1.9}
.adk .sura{margin:1vh 0}.adk .sura b{font-size:3.4rem;color:var(--accent)}.adk .sura .q{font-size:4.8rem}
.hadith p{font-family:'Amiri',serif;font-size:7rem;line-height:1.7;margin:1.6vh 0}
#tv-settings{position:fixed;inset:0;display:none;background:rgba(0,0,0,.6);z-index:5;overflow:auto;padding:3vh 4vw;cursor:default}
#tv-settings.on{display:block}
body.setting:not(.pv) #tv,body.setting:not(.pv) #tv-over{display:none !important}body.setting #tv-settings{background:#dfe7ea}
body.setting.pv #tv{background:var(--bg)}
body.setting.pv #tv,body.setting.pv #tv-over{position:fixed;inset:auto;left:1.6vw;top:24vh;width:100vw;height:100vh;transform:scale(.41);transform-origin:0 0;
  z-index:6;border-radius:3vh;overflow:hidden;box-shadow:0 0 0 .8vh #fff,0 2vh 6vh rgba(0,0,0,.45);pointer-events:none}
body.setting.pv[data-phase=normal] #tv-over{display:none}body.setting.pv:not([data-phase=normal]) #tv-over{z-index:7}
body.setting.pv #tv-settings::after{content:'معاينة مباشرة';position:fixed;left:1.6vw;top:calc(24vh - 34px);width:41vw;text-align:center;font:700 15px 'Noto Kufi Arabic',sans-serif;color:#0f5e4f}
body.setting #tv-settings{padding:2vh 1.5vw}
#tv-settings .set{margin:0;margin-inline-start:0;width:54vw;max-width:none}
.set .g2 label,.set .g3 label,.set .g6 label{margin:3px 0}
.about{font-size:14px;line-height:1.9;color:#345}.about b{color:#0f5e4f}.about button{margin-top:6px;font-size:14px !important;padding:6px 14px !important}
.fh{font-size:3.6rem;color:var(--cardmuted);font-weight:700}#tv-panel .big.fn{font-size:6.4rem;line-height:1.3;padding:.6vh 0}#tv-panel .fv{font-size:4rem;line-height:1.6;font-family:'Amiri',serif;margin-top:1.2vh;color:var(--cardfg)}
body.tv .orn{font-family:'Amiri','QuranWarsh',serif !important;color:var(--accent);font-weight:400;margin:0 .25em}#tv-panel .orn{color:var(--line)}
#tv-clockwarn{position:fixed;top:0;left:0;right:0;z-index:20;background:#b3261e;color:#fff;font:700 2.6vh 'Noto Kufi Arabic',sans-serif;padding:1.4vh 2vw;text-align:center}
.set *{transition:none !important;animation:none !important}
.set{max-width:1200px;margin:auto;background:#fff;color:#1d2b36;border-radius:18px;padding:22px 28px;font-family:'Noto Kufi Arabic',sans-serif;font-size:16px}
.set h2{margin:0 0 10px;color:#0f5e4f}.set h3{margin:14px 0 6px;font-size:15px;color:#0f5e4f}.set label{display:block;font-size:13px;color:#456;margin:6px 0}
.set small{display:block;color:#789;font-size:12px;margin-top:3px}
.set input,.set select,.set textarea{display:block;width:100%;font:inherit;font-size:16px;padding:8px 10px;margin-top:3px;border:2px solid #d5dde3;border-radius:10px;background:#f7f9fa;color:#1d2b36}
.set :focus{outline:none;border-color:#e0a100 !important;box-shadow:0 0 0 3px rgba(224,161,0,.35)}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:4px 18px}.g6{display:grid;grid-template-columns:repeat(6,1fr);gap:4px 10px}
.set input.num{text-align:center;font-family:'UILatin','Noto Sans',sans-serif}
.set label.chk{display:flex;align-items:center;gap:10px;font-size:15px;color:#1d2b36}.set label.chk input{width:24px;height:24px;margin:0;flex:none}
.set select:disabled{opacity:.5}.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:4px 14px}.g5{display:grid;grid-template-columns:repeat(6,1fr);gap:4px 10px}
.set .row{display:flex;gap:10px;margin-top:14px}.set button{font:inherit;font-size:16px;padding:10px 18px;border-radius:10px;border:2px solid #d5dde3;background:#f1f4f6;cursor:pointer}
.set button.b1{background:#0f5e4f;color:#fff;border-color:#0f5e4f}.set .hint{font-size:12px;color:#789;margin:10px 0 0}
.set h2 small{font-size:13px;color:#789;font-weight:400;margin-inline-start:10px}.set h3 small{font-weight:400;color:#789}
.set{max-width:1100px}.set h3{border-top:2px solid #e6ecef;padding-top:12px;margin-top:18px}
.chips{display:flex;flex-wrap:wrap;gap:8px}.chip{font-size:15px !important;padding:8px 14px !important;border-radius:20px !important}
.chip.on{background:#0f5e4f !important;color:#fff !important;border-color:#0f5e4f !important}
.zrow{display:flex;align-items:center;gap:10px;margin-top:10px}.zrow b{min-width:70px;text-align:center;font-size:20px;font-family:'Noto Sans',sans-serif}
.zrow #z-minus,.zrow #z-plus{font-size:24px;width:56px;padding:6px 0}
.zprev{flex:1;height:160px;overflow:hidden;border-radius:12px;background:#0b3d2e;color:#fbf4e4;display:flex;align-items:center;justify-content:flex-start;padding:0 16px;
  font-family:'TVF','Noto Kufi Arabic',sans-serif;font-weight:800;position:relative;white-space:nowrap}
.zprev em{position:absolute;bottom:4px;left:8px;font-size:12px;font-style:normal;font-weight:400;opacity:.7}
.li,.ak{display:flex;gap:8px;align-items:center;margin:6px 0}.li input{flex:1;margin:0}.ak .w1{flex:1;margin:0}.ak .w3{flex:3;margin:0}
.del{flex:none;width:46px;padding:8px 0 !important;color:#b3261e}.add{margin-top:4px;color:#0f5e4f;font-weight:700}
.fprev{font-size:26px;padding:4px 10px;margin-top:4px;border-radius:10px;background:#f1f4f6;color:#0f5e4f;text-align:center}
.cl{display:flex;flex-direction:column;gap:4px;margin-top:4px}.cl button{display:block;width:100%;text-align:right;font-size:15px;padding:8px 12px}
.cl button small{display:inline;margin-inline-start:10px}
`;
function applyTheme() {
  const t = THEMES[cfg.tv_theme] || THEMES.zellige;
  const f = fontInfo(cfg.tv_font);
  fontFaces();
  const band = t[1].includes('--band:none') ? '0px' : '5vh';
  const css = `body.tv{${t[1]};--bandh:${band};--sc:1}` + zoneCss();
  if ($('tv-theme').textContent !== css) $('tv-theme').textContent = css;
  document.body.dataset.riwaya = cfg.riwaya === 'hafs' ? 'hafs' : 'warsh';
  $('tv-mos').innerHTML = `${esc(cfg.mosque_name || 'مواقيت الصلاة')}<small>${esc(cfg.city_ar)}${cfg.city_name && cfg.city_name !== cfg.city_ar ? ' · ' + esc(cfg.city_name) : ''}</small>`;
}

export async function start() {
  cfg = load();
  document.body.className = 'tv'; document.body.dataset.phase = 'normal';
  const pv = S.FONTS.map(f => `@font-face{font-family:'F-${f[0]}';src:url('fonts/${f[4]}')}`).join('');   // previews in the settings
  document.body.innerHTML = `<style>${CSS}${pv}</style><style id="tv-faces"></style><style id="tv-theme"></style>
   <div id="tv"><div class="tv-head"><div class="tv-mos" id="tv-mos"></div><div id="tv-clockbox"><span id="tv-clock"></span><span id="tv-sec"></span></div><div id="tv-date"></div></div>
    <div class="tv-mid"><div class="box" id="tv-next"><div class="fit"><div id="tv-nexthead"></div><div id="tv-cdbox"><span>بعد</span><b id="tv-cd"></b></div></div></div><div class="box" id="tv-panel"></div></div>
    <div id="tv-prayers"></div><div id="tv-ticker"></div></div>
   <div id="tv-over"></div><div id="tv-settings"></div>`;
  applyTheme();
  try { if (P.Screen) await P.Screen.keepOn({ on: true }); } catch (e) { }
  applyRes();
  await model.loadPlaces();
  [AHZAB, Q] = await Promise.all([fetch('data/ahzab.json').then(r => r.json()), fetch('data/adhkar_quran.json').then(r => r.json())]);
  try { await document.fonts.ready; } catch (e) { }
  await build(); render();
  document.addEventListener('keydown', onKey);
  PK.takeOverSelects();
  document.addEventListener('click', e => {                 // touch / mouse on the display opens the settings
    if (!e.target.closest || !e.target.closest('#tv,#tv-over')) return;
    if (!$('tv-settings').classList.contains('on')) openSettings();
  });
  // remote «Back»: closes the settings; on the display itself it does nothing (the screen must stay on)
  try { if (P.App) P.App.addListener('backButton', () => { if (PK.pickerOpen()) { PK.closePicker(); return; } if ($('tv-settings').classList.contains('on')) closeSettings(); }); } catch (e) { }
  // tick on the second boundary
  const tick = () => { try { if (!document.body.classList.contains('setting') || PV) render(); } catch (e) { console.error(e); } setTimeout(tick, 1005 - (Date.now() % 1000)); };
  setTimeout(tick, 1005 - (Date.now() % 1000));
  setInterval(() => build().catch(console.error), 10 * 60000);      // new day / new month
  const sync = () => syncClock().then(ok => { if (ok) { clockMark(); $('tv-clockwarn') && $('tv-clockwarn').remove(); } else clockCheck(); });
  sync(); setInterval(sync, 6 * 3600000);
  setInterval(clockMark, 60000);
  try { if (P.App) P.App.addListener('backButton', () => { if (U.updateVisible()) U.hideUpdate(); }); } catch (e) { }
  U.firstRunNet(true);
  U.startUpdateChecks(true);
}
// ---------------------------------------------------------------- TV boxes without a clock battery lose the time when unplugged
function clockMark() { if (!AT) localStorage.setItem('km_clock', JSON.stringify({ t: +NOW(), dev: Date.now() })); }
function clockCheck() {
  if (AT || cfg.clock_mode === 'device') return clockMark();
  let m = null; try { m = JSON.parse(localStorage.getItem('km_clock') || 'null'); } catch (e) { }
  const now = +NOW();
  const wrong = new Date(now).getFullYear() < 2026 || (m && now < m.t - 5 * 60000);   // time went backwards: the box lost its clock
  if (!wrong) return clockMark();
  const d = document.createElement('div'); d.id = 'tv-clockwarn';
  d.textContent = '⏰ يبدو أن الجهاز فقد التاريخ والوقت بعد انقطاع الكهرباء. اضغط OK لضبطهما (أو صِل الجهاز بالإنترنت ليُضبطا تلقائياً).';
  document.body.appendChild(d);
}
export { THEMES };
