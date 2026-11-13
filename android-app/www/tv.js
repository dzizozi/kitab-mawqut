// «كتابا موقوتا» – mosque display mode (TV / TV Box, landscape, remote control).
// Shows: clock and dates, prayer times with iqama, countdown to the next adhan and to the iqama,
// «prayer in progress» screen, adhkar after the prayer, the daily hizb (Hijri date), announcements,
// and the Friday hadith before the Jumu'a prayer.  Settings open with OK / Menu on the remote.
// Everything is drawn with CSS / SVG vectors (sharp on 1080p and 4K screens).
import { S } from './engine/shared.js';
import * as model from './engine/model.js';

const $ = id => document.getElementById(id);
const CAP = globalThis.Capacitor, P = (CAP && CAP.Plugins) || {};
const NAMES = { fajr: 'الصبح', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء', jumua: 'الجمعة' };
const KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export const TV_DEFAULTS = {
  tv_theme: 'zellige', riwaya: 'warsh', digits: 'auto', tv_font: 'cairo', tv_scale: 100, tv_res: 'auto', method_auto: true,
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
const NOW = () => new Date(Date.now() + OFF);
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
function slides(row) {
  const list = [];
  if (row) list.push(hizbHtml(row));
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
// biggest size that fits: one measurement, then scale the «.fit» block (transform keeps the text sharp)
function fitBox(root) {
  for (const f of root.querySelectorAll('.fit')) {
    const box = f.parentElement;
    f.style.transform = '';
    const cs = getComputedStyle(box), br = box.getBoundingClientRect(), fr = f.getBoundingClientRect();
    const top = br.top + parseFloat(cs.paddingTop), bot = br.bottom - parseFloat(cs.paddingBottom);
    const w = br.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const centred = getComputedStyle(f).transformOrigin && f.dataset.o !== 'top' && cs.justifyContent === 'center';
    const availH = centred ? bot - top : bot - Math.max(top, fr.top);
    const s = Math.min(1, availH / f.scrollHeight, w / f.scrollWidth);
    if (s < 0.999) { f.style.transformOrigin = centred ? '50% 50%' : '50% 0'; f.style.transform = `scale(${s.toFixed(4)})`; }
  }
}

// ---------------------------------------------------------------- ticker: constant speed, GPU transform only
function ticker(news) {
  const box = $('tv-ticker');
  if (box._t === news) return;
  box._t = news;
  box.innerHTML = `<span class="tk">${esc(news) || '&nbsp;'}</span>`;
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

  ticker((cfg.tv_news || '').split('\n').map(s => s.trim()).filter(Boolean).join('     ✦     '));
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
let RES = null;
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
// parts of the screen whose text size can be changed one by one: id, label, base size (rem), sample text
const ZONES = [['mos', 'اسم المسجد', 5.4, () => cfg.mosque_name || 'مواقيت الصلاة'], ['clock', 'الساعة', 13, () => '12:30'],
  ['date', 'التاريخ', 3.2, () => 'الجمعة 3 جمادى الثانية'], ['next', 'الصلاة القادمة والعدّاد', 9, () => 'العصر 08:52'],
  ['panel', 'الإعلانات والأحزاب', 8, () => (cfg.tv_news || '').split('\n')[0] || 'إعلان'], ['cards', 'بطاقات المواقيت', 7, () => 'الظهر 12:20'],
  ['ticker', 'الشريط المتحرك', 3.6, () => (cfg.tv_news || '').split('\n')[0] || 'إعلان'], ['iqama', 'عدّاد الإقامة', 30, () => '04:43'],
  ['adhkar', 'الأذكار', 6.4, () => 'أَسْتَغْفِرُ اللهَ'], ['hadith', 'حديث الجمعة', 7, () => 'مَنْ لَغَا فَلَا جُمُعَةَ لَهُ']];
const zOf = k => Math.max(50, Math.min(250, ((cfg.tv_z || {})[k]) || 100)) / 100;
function zoneCss() {
  const z = k => zOf(k).toFixed(3), r = (k, rem) => `calc(${rem}rem * ${z(k)})`;
  return `.tv-mos{font-size:${r('mos', 5.4)}}.tv-mos small{font-size:${r('mos', 2.6)}}
    #tv-clock{font-size:${r('clock', 13)}}#tv-sec{font-size:${r('clock', 4.6)}}#tv-date{font-size:${r('date', 3.2)}}
    #tv-next .fit>*{zoom:${z('next')}}#tv-panel .fit>*,#tv-panel h3{zoom:${z('panel')}}
    .pc .pn{font-size:${r('cards', 3.8)}}.pc .pt{font-size:${r('cards', 7)}}.pc .pi{font-size:${r('cards', 2.6)}}
    #tv-ticker{height:calc(6.4vh * ${z('ticker')})}#tv-ticker .tk{font-size:${r('ticker', 3.6)}}.ovc{font-size:${r('iqama', 30)}}
    .adk .fit>*,.adk h2{zoom:${z('adhkar')}}.hadith .fit>*{zoom:${z('hadith')}}`;
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
  return `<div class="set"><h2>إعدادات شاشة المسجد <small>تُحفظ كل خانة تلقائياً عند الخروج منها</small></h2>
   <h3>المسجد والمدينة</h3>
   <label>اسم المسجد (اكتب أوله للبحث في قائمة المساجد)<input type="text" id="s-mosque" value="${esc(cfg.mosque_name)}"></label><div id="s-mosques" class="cl"></div>
   <label>البلد<select id="s-country"></select></label>
   <label>المدينة (اكتب أول الاسم ثم اختر من القائمة)<input type="text" id="s-city" value="${esc(cfg.city_ar)}"></label><div id="s-cities" class="cl"></div>
   <small id="s-src">${srcInfo()}</small>
   <h3>طريقة حساب المواقيت</h3>
   <label class="chk"><input type="checkbox" id="s-mauto"${cfg.method_auto !== false ? ' checked' : ''}><span>تلقائي حسب بلد المسجد (في المغرب: مواقيت وزارة الأوقاف)</span></label>
   <label>الطريقة (عند إلغاء التلقائي)<select id="s-method">${me}</select></label>
   <label>صلاة العصر<select id="s-asr"><option value="1">الجمهور (مالكي، شافعي، حنبلي)</option><option value="2">الحنفي</option></select></label>
   <label>تعديل يدوي بالدقائق لمطابقة مسجدكم (مثال: 2 أو -3)</label><div class="g6">${tn}</div>
   <h3>الإقامة (بالدقائق بعد الأذان)</h3><div class="g6">${iq}<label>الجمعة${numIn('s-jiq', cfg.jumua_iqama)}</label></div>
   <div class="g3"><label>مدة الصلاة${numIn('s-pmin', cfg.prayer_min)}</label><label>مدة عرض الأذكار${numIn('s-amin', cfg.adhkar_min)}</label>
    <label>حديث الجمعة قبل الأذان بـ${numIn('s-fri', cfg.friday_before)}</label></div>
   <h3>المظهر</h3>
   <label>التصميم<select id="s-theme">${th}</select></label>
   <label>نوع الخط<select id="s-font">${fo}</select></label>
   <label>الحجم العام لكل الخطوط (%)${numIn('s-scale', cfg.tv_scale)}</label>
   <label>شكل الأرقام على الشاشة<select id="s-digits"><option value="auto">تلقائي حسب البلد</option><option value="western">0123</option><option value="eastern">٠١٢٣</option></select></label>
   <label>الرواية (الأحزاب والآيات)<select id="s-riwaya"><option value="warsh">ورش عن نافع</option><option value="hafs">حفص عن عاصم</option></select></label>
   <label>دقة الشاشة<select id="s-res"><option value="auto">تلقائي (أعلى دقة يدعمها الجهاز)</option><option value="2160">4K – 3840×2160</option><option value="1080">Full HD – 1920×1080</option></select></label><small id="s-resinfo"></small>
   <h3>حجم الخط لكل جزء من الشاشة</h3>
   <div class="chips">${zc}</div>
   <div class="zrow"><button id="z-minus">−</button><b id="z-val">100%</b><button id="z-plus">+</button><button id="z-reset">100%</button>
    <div class="zprev" id="z-prev"></div></div>
   <small>اختر الجزء ثم غيّر حجمه بـ − و +. النصوص الطويلة تُصغَّر تلقائياً لتبقى داخل إطارها.</small>
   <h3>الإعلانات للمصلين <small>(تظهر في اللوحة وفي الشريط المتحرك)</small></h3>
   <div id="s-news">${listRows('news', lines(cfg.tv_news), 'نص الإعلان')}</div><button class="add" id="add-news">+ إضافة إعلان</button>
   <h3>حديث الجمعة</h3>
   <div id="s-hadith">${listRows('hadith', lines(cfg.tv_hadith), 'سطر من الحديث')}</div><button class="add" id="add-hadith">+ إضافة سطر</button>
   <h3>الأذكار بعد الصلاة</h3>
   <label>أذكار صلاة<select id="s-adk-p">${ak}</select></label>
   <div id="s-adk"></div>
   <div class="row"><button class="add" id="add-adk">+ إضافة ذكر</button><button id="s-adk-reset">استعادة الأذكار الأصلية</button></div>
   <small>اكتب [آية الكرسي] أو [المعوذات] في خانة النص لعرضها بالرسم العثماني، و(33) يظهر عدداً. إذا كانت صلاة بلا أذكار تُعرض أذكار «كل الصلوات».</small>
   <div class="row"><button id="s-cancel" class="b1">إغلاق</button><button id="s-phone">التحويل إلى وضع الهاتف</button></div>
   <p class="hint">الأسهم ▲▼ للتنقل بين الخانات بالترتيب، وOK للكتابة أو الاختيار. بعد الكتابة اضغط ▼ أو OK للانتقال (يُحفظ تلقائياً).
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
  const px = innerHeight / 100 * (cfg.tv_scale || 100) / 100 * z[2] * zOf(ZSEL);       // the real size on the screen
  $('z-prev').innerHTML = `<span style="font-size:${Math.min(px, 150).toFixed(0)}px">${esc(z[3]())}</span>${px > 150 ? `<em>حجمه الحقيقي ${Math.round(px)}px</em>` : ''}`;
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
    tv_font: $('s-font').value, tv_scale: Math.max(60, Math.min(200, NUM($('s-scale').value, 100))), tv_res: res,
    jumua_iqama: NUM($('s-jiq').value), prayer_min: NUM($('s-pmin').value, 10) || 10, adhkar_min: NUM($('s-amin').value),
    friday_before: NUM($('s-fri').value),
    tv_news: [...document.querySelectorAll('[data-list=news]')].map(i => i.value.trim()).filter(Boolean).join('\n'),
    tv_hadith: [...document.querySelectorAll('[data-list=hadith]')].map(i => i.value.trim()).filter(Boolean).join('\n') });
  save(); applyTheme();
  $('s-src').innerHTML = srcInfo();
  if (resChanged) applyRes();
  clearTimeout(applyT);
  applyT = setTimeout(async () => { lastBuild = ''; await build(); $('tv-ticker')._t = null; $('tv-panel')._h = null; $('tv-next').querySelector('#tv-nexthead')._h = null; render(); }, 150);
}
async function openSettings() {
  const box = $('tv-settings'); box.innerHTML = settingsHtml(); box.classList.add('on');
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
    if (el.id === 's-adk-p') { ADK[adkKey] = adkText($('s-adk')); adkKey = el.value; adkLoad(); return; }
    if (el.id === 's-country') { cityRows = model.cities(el.value); $('s-city').value = ''; mAuto(); }
    if (el.id === 's-mauto') mAuto();
    if (el.id === 's-mosque' || el.id === 's-city') return;            // handled by their suggestion lists / commit below
    commit();
    if (el.id === 's-scale') zoneUI();
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
  box.querySelectorAll('.chip').forEach(c => c.onclick = () => { ZSEL = c.dataset.zone; zoneUI(); });
  const zSet = v => { cfg.tv_z = { ...(cfg.tv_z || {}), [ZSEL]: Math.max(50, Math.min(250, v)) }; save(); applyTheme(); zoneUI();
    $('tv-ticker')._t = null; $('tv-panel')._h = null; $('tv-nexthead')._h = null; render(); };
  $('z-minus').onclick = () => zSet(Math.round(zOf(ZSEL) * 100) - 10);
  $('z-plus').onclick = () => zSet(Math.round(zOf(ZSEL) * 100) + 10);
  $('z-reset').onclick = () => zSet(100);
  zoneUI();
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
function go(el) { if (!el) return; el.focus({ preventScroll: true }); el.scrollIntoView({ block: 'center' }); }
function closeSettings() { $('tv-settings').classList.remove('on'); $('tv-settings').innerHTML = ''; }
function focusables() { return [...$('tv-settings').querySelectorAll('input,select,textarea,button')].filter(e => e.offsetParent && !e.disabled); }
function onKey(e) {
  const open = $('tv-settings').classList.contains('on');
  if (!open) {
    if (['Enter', 'ContextMenu', 'MediaPlayPause', ' '].includes(e.key) || e.keyCode === 82 || e.keyCode === 23) { e.preventDefault(); openSettings(); }
    return;
  }
  const f = focusables(), el = document.activeElement;
  const text = el && el.type !== 'checkbox' && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT');
  const typing = text && !el.readOnly;
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
  const dir = { ArrowDown: 1, ArrowUp: -1, ArrowLeft: 1, ArrowRight: -1 }[e.key];      // RTL: ◀ = next
  if (!dir) return;
  if (typing && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return;        // move the cursor inside the text
  e.preventDefault();
  if (typing) { el.readOnly = true; el.dispatchEvent(new Event('change', { bubbles: true })); }
  // simple and predictable: the next / previous field in reading order
  const i = f.indexOf(el);
  const nx = f[i < 0 ? 0 : Math.max(0, Math.min(f.length - 1, i + dir))];
  go(nx);
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
  const faces = `@font-face{font-family:'TVF';src:url('fonts/${f[3]}');font-weight:100 500}@font-face{font-family:'TVF';src:url('fonts/${f[4]}');font-weight:600 900}`;
  const band = t[1].includes('--band:none') ? '0px' : '5vh';
  $('tv-theme').textContent = faces + `body.tv{${t[1]};--bandh:${band};--sc:${(cfg.tv_scale || 100) / 100}}` + zoneCss();
  document.body.dataset.riwaya = cfg.riwaya === 'hafs' ? 'hafs' : 'warsh';
  $('tv-mos').innerHTML = `${esc(cfg.mosque_name || 'مواقيت الصلاة')}<small>${esc(cfg.city_ar)}${cfg.city_name && cfg.city_name !== cfg.city_ar ? ' · ' + esc(cfg.city_name) : ''}</small>`;
}

export async function start() {
  cfg = load();
  document.body.className = 'tv'; document.body.dataset.phase = 'normal';
  const pv = S.FONTS.map(f => `@font-face{font-family:'F-${f[0]}';src:url('fonts/${f[4]}')}`).join('');   // previews in the settings
  document.body.innerHTML = `<style>${CSS}${pv}</style><style id="tv-theme"></style>
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
  document.addEventListener('click', e => {                 // touch / mouse on the display opens the settings
    if (!e.target.closest || !e.target.closest('#tv,#tv-over')) return;
    if (!$('tv-settings').classList.contains('on')) openSettings();
  });
  // remote «Back»: closes the settings; on the display itself it does nothing (the screen must stay on)
  try { if (P.App) P.App.addListener('backButton', () => { if ($('tv-settings').classList.contains('on')) closeSettings(); }); } catch (e) { }
  // tick on the second boundary
  const tick = () => { try { render(); } catch (e) { console.error(e); } setTimeout(tick, 1005 - (Date.now() % 1000)); };
  setTimeout(tick, 1005 - (Date.now() % 1000));
  setInterval(() => build().catch(console.error), 10 * 60000);      // new day / new month
}
export { THEMES };
