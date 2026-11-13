// «كتابا موقوتا» – mosque display mode (TV / TV Box, landscape, remote control).
// Shows: clock and dates, prayer times with iqama, countdown to the next adhan and to the iqama,
// «prayer in progress» screen, adhkar after the prayer, the daily hizb (Hijri date), announcements,
// and the Friday hadith before the Jumu'a prayer.  Settings open with OK / Menu on the remote.
import { S } from './engine/shared.js';
import * as model from './engine/model.js';

const $ = id => document.getElementById(id);
const CAP = globalThis.Capacitor, P = (CAP && CAP.Plugins) || {};
const NAMES = { fajr: 'الصبح', sunrise: 'الشروق', dhuhr: 'الظهر', asr: 'العصر', maghrib: 'المغرب', isha: 'العشاء', jumua: 'الجمعة' };
const KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
const PRAYERS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];

export const TV_DEFAULTS = {
  tv_theme: 'night', riwaya: 'warsh', digits: 'auto',
  iqama: { fajr: 20, dhuhr: 15, asr: 15, maghrib: 7, isha: 10 }, jumua_iqama: 30,
  prayer_min: 10, adhkar_min: 7, friday_before: 45,
  tv_news: 'يُرجى إغلاق الهاتف أو جعله على الصامت قبل الدخول في الصلاة\nتسوية الصفوف من إقامة الصلاة\nحافظوا على نظافة المسجد',
  tv_hadith: 'قال رسول الله ﷺ: «إِذَا قُلْتَ لِصَاحِبِكَ يَوْمَ الْجُمُعَةِ: أَنْصِتْ، وَالْإِمَامُ يَخْطُبُ، فَقَدْ لَغَوْتَ» متفق عليه\nوقال ﷺ: «وَمَنْ مَسَّ الْحَصَى فَقَدْ لَغَا» رواه مسلم',
};

const THEMES = {
  night:   ['ليلي ذهبي', '--bg:radial-gradient(ellipse at 30% 0%,#173658,#0a1a2e 55%,#050d18);--fg:#f4efe2;--muted:#9fb2c8;--card:rgba(255,255,255,.06);--line:rgba(255,255,255,.12);--accent:#e8c26a;--accent2:#7fd1c1;--hl:rgba(232,194,106,.16);--font:"Noto Kufi Arabic"'],
  emerald: ['زمردي', '--bg:linear-gradient(160deg,#075e48,#03382b 60%,#021f18);--fg:#f6f1df;--muted:#a9cdbf;--card:rgba(255,255,255,.08);--line:rgba(255,255,255,.14);--accent:#f5d58a;--accent2:#ffffff;--hl:rgba(245,213,138,.18);--font:"Noto Kufi Arabic"'],
  zellige: ['زليج مغربي', '--bg:repeating-conic-gradient(from 45deg at 50% 50%,#2a1a12 0 25%,#2f1e15 0 50%) 0 0/60px 60px,#2a1a12;--fg:#fbf1e1;--muted:#d9bfa0;--card:rgba(20,10,5,.55);--line:rgba(212,162,76,.35);--accent:#d9a84e;--accent2:#e07a4f;--hl:rgba(217,168,78,.18);--font:"Amiri"'],
  light:   ['فاتح', '--bg:linear-gradient(180deg,#fbfaf6,#efece3);--fg:#1d2b36;--muted:#5f7380;--card:#ffffff;--line:rgba(0,0,0,.08);--accent:#0f5e4f;--accent2:#b8862f;--hl:rgba(15,94,79,.09);--font:"Noto Kufi Arabic"'],
  glass:   ['زجاجي', '--bg:linear-gradient(140deg,#cdeee3,#dfe5fb 50%,#f8e7cf);--fg:#17324a;--muted:#4f6b80;--card:rgba(255,255,255,.55);--line:rgba(255,255,255,.9);--accent:#0f5e4f;--accent2:#a0701b;--hl:rgba(15,94,79,.1);--font:"Noto Kufi Arabic"'],
};

const ADHKAR = [
  ['أذكار بعد الصلاة', ['أَسْتَغْفِرُ اللهَ ، أَسْتَغْفِرُ اللهَ ، أَسْتَغْفِرُ اللهَ',
    'اللَّهُمَّ أَنْتَ السَّلَامُ وَمِنْكَ السَّلَامُ ، تَبَارَكْتَ يَا ذَا الْجَلَالِ وَالْإِكْرَامِ'], 'رواه مسلم'],
  ['أذكار بعد الصلاة', ['لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ',
    'اللَّهُمَّ لَا مَانِعَ لِمَا أَعْطَيْتَ ، وَلَا مُعْطِيَ لِمَا مَنَعْتَ ، وَلَا يَنْفَعُ ذَا الْجَدِّ مِنْكَ الْجَدُّ'], 'متفق عليه'],
  ['التسبيح', ['سُبْحَانَ اللهِ <i>33</i> ، الْحَمْدُ لِلَّهِ <i>33</i> ، اللهُ أَكْبَرُ <i>33</i>',
    'وَتَمَامُ الْمِائَةِ : لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ'], 'رواه مسلم'],
  ['kursi'], ['quls'],
];

let cfg, Q = null, AHZAB = null, DAYS = {}, slideI = -1, lastSlide = 0, adhkarI = 0, lastAdhkar = 0, lastBuild = '';

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
function load() {
  let c = {};
  try { c = JSON.parse(localStorage.getItem('cfg') || '{}'); } catch (e) { }
  const out = { ...model.DEFAULTS, ...TV_DEFAULTS, ...c };
  out.iqama = { ...TV_DEFAULTS.iqama, ...(c.iqama || {}) };
  return out;
}
const save = () => localStorage.setItem('cfg', JSON.stringify(cfg));

// ---------------------------------------------------------------- data
async function build() {
  const now = NOW(), day = isoLocal(now);
  if (lastBuild === day + cfg.city_key + cfg.method + cfg.hijri_mode + cfg.hijri_adjust + cfg.morocco_plus1 + JSON.stringify(cfg.tune)) return;
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
  lastBuild = day + cfg.city_key + cfg.method + cfg.hijri_mode + cfg.hijri_adjust + cfg.morocco_plus1 + JSON.stringify(cfg.tune);
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

// ---------------------------------------------------------------- screens
function hizbHtml(row) {
  if (!AHZAB || !row) return '';
  const r = cfg.riwaya === 'hafs' ? 'hafs' : 'warsh', A = AHZAB[r];
  const d = Math.min(30, row.hday), f = A[2 * d - 2], m = A[2 * d - 1];
  const one = (h, lab) => `<div class="hz"><div class="hzt"><span>${lab}</span><b>الحزب ${dg(h.n)}</b></div>
    <div class="q">${qt(h.words)} …</div><div class="hzr">من سورة ${h.sura_name} ${dg(h.aya)} إلى سورة ${h.end_sura_name} ${dg(h.end_aya)}</div></div>`;
  return `<h3>الحزب الراتب لليوم</h3>${one(f, 'بعد صلاة الصبح')}${one(m, 'بعد صلاة المغرب')}`;
}
function slides(row) {
  const list = [];
  if (row) list.push(hizbHtml(row));
  for (const ev of (row && row.events) || []) list.push(`<h3>مناسبة اليوم</h3><div class="big">${ev[0]}</div>`);
  for (const line of (cfg.tv_news || '').split('\n').map(s => s.trim()).filter(Boolean)) list.push(`<h3>إعلان</h3><div class="big">${line}</div>`);
  return list.length ? list : ['<div class="big">' + (cfg.mosque_name || 'كتابا موقوتا') + '</div>'];
}
const AFTER_FAJR_MAGHRIB = ['بعد صلاة الصبح والمغرب', ['لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ ، يُحْيِي وَيُمِيتُ ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ <i>10</i>'], 'رواه الترمذي'];
// KFGQPC Uthmanic fonts expect their own code points for the open tanween
const qt = s => cfg.riwaya === 'hafs' ? s : s.replace(/\u08F2/g, '\u0656').replace(/\u08F0/g, '\u0657').replace(/\u08F1/g, '\u065E');
function adhkarSlide(i, prayer) {
  const r = cfg.riwaya === 'hafs' ? 'hafs' : 'warsh';
  const list = (prayer === 'fajr' || prayer === 'maghrib') ? [...ADHKAR.slice(0, 3), AFTER_FAJR_MAGHRIB, ...ADHKAR.slice(3)] : ADHKAR;
  const A = list[i % list.length];
  if (A[0] === 'kursi' && Q) return `<h2>آية الكرسي</h2><div class="q big2">${qt(Q[r].kursi.join(' ۝ '))}</div><div class="src">${Q[r].kursi_ref}</div>`;
  if (A[0] === 'quls' && Q) {
    const s = (name, v) => `<div class="sura"><b>سورة ${name}</b><div class="q">${qt(v.join(' ۝ '))}</div></div>`;
    return `<h2>المعوذات</h2>${s('الإخلاص', Q[r].ikhlas)}${s('الفلق', Q[r].falaq)}${s('الناس', Q[r].nas)}`;
  }
  return `<h2>${A[0]}</h2>${A[1].map(t => `<p>${t}</p>`).join('')}<div class="src">${A[2]}</div>`;
}

function render() {
  const now = NOW(), sch = schedule(now), row = DAYS[isoLocal(now)];
  // header
  $('tv-clock').textContent = dg(pad(now.getHours()) + ':' + pad(now.getMinutes()));
  $('tv-sec').textContent = dg(pad(now.getSeconds()));
  const gm = (S.GREG.ar_ma && cfg.country === 'MA' ? S.GREG.ar_ma : S.GREG.ar)[now.getMonth()];
  $('tv-date').innerHTML = `<b>${S.DAYS.ar[(now.getDay() + 6) % 7]}</b> ${row ? dg(row.hday) + ' ' + S.HIJRI.ar[row.mois - 1] + ' ' + dg(row.annee) + ' هـ' : ''}<br>${dg(now.getDate())} ${gm} ${dg(now.getFullYear())}`;

  // phase
  const today = sch.filter(p => p.day === 0);
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
  document.body.dataset.phase = phase;

  // prayer cards
  $('tv-prayers').innerHTML = today.map(p => {
    const on = next && p === next, done = p.adhan <= now && !(cur && cur === p);
    return `<div class="pc${on ? ' next' : ''}${cur === p ? ' cur' : ''}${done ? ' done' : ''}"><div class="pn">${NAMES[p.k]}</div>
      <div class="pt">${hm(p.adhan)}</div><div class="pi">${p.iqama ? 'الإقامة ' + hm(p.iqama) : '&nbsp;'}</div></div>`;
  }).join('');

  // main box
  if (next) {
    $('tv-next').innerHTML = `<div class="lab">${next.k === 'sunrise' ? 'الشروق' : 'الصلاة القادمة'}</div><div class="nm">${NAMES[next.k]}</div>
      <div class="tm">${hm(next.adhan)}</div><div class="cd"><span>بعد</span> ${dur(next.adhan - now)}</div>
      ${next.iqama ? `<div class="iq">الإقامة ${hm(next.iqama)}</div>` : ''}`;
  }
  // rotating panel
  if (now - lastSlide > 15000) { lastSlide = +now; slideI++; }
  const sl = slides(row); $('tv-panel').innerHTML = sl[slideI % sl.length];

  // full-screen overlays
  const ov = $('tv-over');
  if (phase === 'iqama') {
    ov.innerHTML = `<div class="ovl">أُذّن لصلاة ${NAMES[cur.k]}</div><div class="ovt">الإقامة بعد</div><div class="ovc">${dur(cur.iqama - now)}</div>
      <div class="ovn">${(cfg.tv_news || '').split('\n')[0] || ''}</div>`;
  } else if (phase === 'prayer') {
    ov.innerHTML = `<div class="ovt">الصلاة قائمة</div><div class="ovl">صلاة ${NAMES[cur.k]}</div><div class="ovn">يُرجى إغلاق الهاتف</div>`;
  } else if (phase === 'adhkar') {
    if (now - lastAdhkar > 25000) { lastAdhkar = +now; adhkarI++; }
    ov.innerHTML = `<div class="adk">${adhkarSlide(adhkarI, cur.base)}</div>`;
  } else if (phase === 'jumua') {
    const toAdhan = cur.adhan > now;
    ov.innerHTML = `<div class="ovt">صلاة الجمعة</div><div class="hadith">${(cfg.tv_hadith || '').split('\n').map(l => `<p>${l}</p>`).join('')}</div>
      <div class="ovn">${toAdhan ? 'الأذان بعد ' + dur(cur.adhan - now) : 'الإقامة بعد ' + dur(cur.iqama - now)} · يُرجى إغلاق الهاتف والإنصات للخطبة</div>`;
  } else ov.innerHTML = '';
  if (phase !== 'adhkar') { adhkarI = 0; lastAdhkar = +now; }

  // ticker
  const news = (cfg.tv_news || '').split('\n').map(s => s.trim()).filter(Boolean).join('  ✦  ');
  if ($('tv-ticker').dataset.t !== news) { $('tv-ticker').dataset.t = news; $('tv-ticker').innerHTML = `<span>${news || ' '}</span>`; }
}

// ---------------------------------------------------------------- settings (remote-control friendly)
function settingsHtml() {
  const th = Object.entries(THEMES).map(([k, v]) => `<option value="${k}">${v[0]}</option>`).join('');
  const iq = PRAYERS.map(k => `<label>${NAMES[k]}<input type="number" min="0" max="90" data-iq="${k}" value="${cfg.iqama[k]}"></label>`).join('');
  return `<div class="set"><h2>إعدادات شاشة المسجد</h2>
   <div class="g2">
    <label>اسم المسجد<input type="text" id="s-mosque" value="${(cfg.mosque_name || '').replace(/"/g, '&quot;')}"></label>
    <label>التصميم<select id="s-theme">${th}</select></label>
    <label>البلد<select id="s-country"></select></label>
    <label>المدينة (اكتب للبحث)<input type="search" id="s-city" placeholder="${cfg.city_ar || ''}"><div id="s-cities" class="cl"></div></label>
    <label>الرواية (الأحزاب والآيات)<select id="s-riwaya"><option value="warsh">ورش عن نافع</option><option value="hafs">حفص عن عاصم</option></select></label>
    <label>شكل الأرقام<select id="s-digits"><option value="auto">تلقائي</option><option value="western">0123</option><option value="eastern">٠١٢٣</option></select></label>
   </div>
   <h3>الإقامة بعد الأذان (بالدقائق)</h3><div class="g5">${iq}<label>الجمعة<input type="number" min="0" max="90" id="s-jiq" value="${cfg.jumua_iqama}"></label></div>
   <div class="g3">
    <label>مدة الصلاة (دقيقة)<input type="number" min="3" max="40" id="s-pmin" value="${cfg.prayer_min}"></label>
    <label>عرض الأذكار بعد الصلاة (دقيقة)<input type="number" min="0" max="30" id="s-amin" value="${cfg.adhkar_min}"></label>
    <label>عرض حديث الجمعة قبل الأذان (دقيقة)<input type="number" min="0" max="180" id="s-fri" value="${cfg.friday_before}"></label>
   </div>
   <label>إعلانات للمصلين (سطر لكل إعلان)<textarea id="s-news" rows="3">${cfg.tv_news || ''}</textarea></label>
   <label>حديث الجمعة<textarea id="s-hadith" rows="3">${cfg.tv_hadith || ''}</textarea></label>
   <div class="row"><button id="s-save" class="b1">حفظ وإغلاق</button><button id="s-cancel">إغلاق</button><button id="s-phone">التحويل إلى وضع الهاتف</button></div>
   <p class="hint">يُفتح هذا الإعداد بزر OK أو Menu في جهاز التحكم. استعمل الأسهم للتنقل.</p></div>`;
}
let cityRows = [], pendingCity = null;
async function openSettings() {
  const box = $('tv-settings'); box.innerHTML = settingsHtml(); box.classList.add('on');
  $('s-country').innerHTML = model.countries().map(([cc, ar]) => `<option value="${cc}">${ar}</option>`).join('');
  $('s-country').value = cfg.country; $('s-theme').value = cfg.tv_theme; $('s-riwaya').value = cfg.riwaya || 'warsh'; $('s-digits').value = cfg.digits || 'auto';
  cityRows = model.cities(cfg.country); pendingCity = null;
  $('s-country').onchange = () => { cityRows = model.cities($('s-country').value); pendingCity = null; $('s-city').placeholder = 'اختر المدينة'; };
  $('s-city').oninput = () => {
    const q = $('s-city').value.trim().toLowerCase();
    const hits = q ? cityRows.filter(c => c[1].toLowerCase().includes(q) || (c[2] || '').toLowerCase().includes(q)).slice(0, 8) : [];
    $('s-cities').innerHTML = hits.map(c => `<button data-k="${c[0]}">${c[1]}${c[2] && c[2] !== c[1] ? ' — ' + c[2] : ''}</button>`).join('');
  };
  $('s-cities').onclick = e => { e.preventDefault(); const b = e.target.closest('[data-k]'); if (!b) return;   // inside <label>: no click forwarding to the input
    pendingCity = { cc: $('s-country').value, k: b.dataset.k }; $('s-city').value = b.textContent; $('s-cities').innerHTML = ''; $('s-city').readOnly = true; $('s-riwaya').focus(); };
  $('s-save').onclick = async () => {
    const cc = $('s-country').value, changed = cc !== cfg.country;
    if (changed) Object.assign(cfg, { country: cc }, model.countryDefaults(cc));
    if (pendingCity) Object.assign(cfg, model.cityInfo(pendingCity.cc, pendingCity.k), { city_key: pendingCity.k });
    else if (changed) { const f = model.cities(cc)[0]; Object.assign(cfg, model.cityInfo(cc, f[0]), { city_key: f[0] }); }
    if (cfg.country !== 'MA' && cfg.method === 'MOROCCO') cfg.method = S.COUNTRY_METHOD[cfg.country] || 'MWL';
    if (cfg.country !== 'MA' && cfg.hijri_mode === 'morocco') cfg.hijri_mode = 'ummalqura';
    Object.assign(cfg, { mosque_name: $('s-mosque').value.trim(), tv_theme: $('s-theme').value, riwaya: $('s-riwaya').value, digits: $('s-digits').value,
      jumua_iqama: +$('s-jiq').value || 0, prayer_min: +$('s-pmin').value || 10, adhkar_min: +$('s-amin').value || 0,
      friday_before: +$('s-fri').value || 0, tv_news: $('s-news').value, tv_hadith: $('s-hadith').value });
    document.querySelectorAll('[data-iq]').forEach(i => cfg.iqama[i.dataset.iq] = +i.value || 0);
    save(); closeSettings(); applyTheme(); lastBuild = ''; await build(); render();
  };
  $('s-cancel').onclick = closeSettings;
  $('s-phone').onclick = () => { localStorage.setItem('mode', 'phone'); location.reload(); };
  // TV remote: text fields open the on-screen keyboard only after OK (otherwise the arrows get stuck in the keyboard)
  box.querySelectorAll('input,textarea').forEach(el => {
    el.readOnly = true;
    el.addEventListener('blur', () => { el.readOnly = true; });
    el.addEventListener('click', () => { el.readOnly = false; });
  });
  setTimeout(() => $('s-theme').focus(), 50);
}
function closeSettings() { $('tv-settings').classList.remove('on'); $('tv-settings').innerHTML = ''; }
function focusables() { return [...$('tv-settings').querySelectorAll('input,select,textarea,button')].filter(e => e.offsetParent); }
function onKey(e) {
  const open = $('tv-settings').classList.contains('on');
  if (!open) {
    if (['Enter', 'ContextMenu', 'MediaPlayPause', ' '].includes(e.key) || e.keyCode === 82 || e.keyCode === 23) { e.preventDefault(); openSettings(); }
    return;
  }
  const f = focusables(), i = f.indexOf(document.activeElement), el = document.activeElement;
  const typing = el && !el.readOnly && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT');
  if (e.key === 'Enter' && el && el.readOnly && (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT')) {
    e.preventDefault(); el.readOnly = false; el.blur(); el.focus(); el.click(); return; }
  if (e.key === 'Escape' || e.key === 'GoBack' || e.key === 'BrowserBack') { e.preventDefault(); closeSettings(); return; }
  const dir = { ArrowDown: [0, 1], ArrowUp: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
  if (!dir) return;
  if (typing && (el.tagName === 'TEXTAREA' || dir[0])) return;                        // let the cursor move inside the text
  e.preventDefault();
  // spatial navigation: the nearest field in the pressed direction
  const r0 = el && f.includes(el) ? el.getBoundingClientRect() : { left: 0, top: 0, width: 0, height: 0 };
  const c0 = [r0.left + r0.width / 2, r0.top + r0.height / 2];
  let best = null, bs = 1e9;
  for (const x of f) {
    if (x === el) continue;
    const r = x.getBoundingClientRect(), c = [r.left + r.width / 2, r.top + r.height / 2];
    const dx = c[0] - c0[0], dy = c[1] - c0[1], along = dx * dir[0] + dy * dir[1], across = Math.abs(dx * dir[1] + dy * dir[0]);
    if (along <= 4) continue;
    const s = along + across * 2.5;
    if (s < bs) { bs = s; best = x; }
  }
  if (best) { best.focus(); best.scrollIntoView({ block: 'nearest' }); }
}

// ---------------------------------------------------------------- page
const CSS = `
@font-face{font-family:'QuranText';src:url('fonts/KFGQPC-Warsh.ttf')}
@font-face{font-family:'QuranHafs';src:url('fonts/KFGQPC-Hafs.ttf')}
html,body{height:100%;margin:0;overflow:hidden}
body.tv{background:var(--bg);color:var(--fg);font-family:var(--font),'Noto Kufi Arabic','UILatin',sans-serif;direction:rtl;cursor:none}
.tv *{box-sizing:border-box}
#tv{position:fixed;inset:0;display:grid;grid-template-rows:auto 1fr auto auto;gap:1.6vh;padding:2.4vh 2.4vw}
.tv-head{display:grid;grid-template-columns:1fr auto 1fr;align-items:center}
.tv-mos{font-family:'Amiri',serif;font-weight:700;font-size:4.6vh;color:var(--accent);line-height:1.15}.tv-mos small{display:block;font-size:2.3vh;color:var(--muted);font-family:var(--font)}
#tv-clockbox{text-align:center;direction:ltr;font-family:'UILatin',sans-serif;font-weight:700;line-height:1}
#tv-clock{font-size:12vh;letter-spacing:.3vw}#tv-sec{font-size:4vh;color:var(--accent);margin-left:.5vw;vertical-align:top}
#tv-date{text-align:left;font-size:2.8vh;line-height:1.6;color:var(--muted)}#tv-date b{color:var(--fg)}
.tv-mid{display:grid;grid-template-columns:1fr 1.35fr;gap:1.6vw;min-height:0}
.box{background:var(--card);border:1px solid var(--line);border-radius:2.2vh;padding:2.4vh 2vw;min-height:0;overflow:hidden;backdrop-filter:blur(12px)}
#tv-next{display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}
#tv-next .lab{font-size:2.8vh;color:var(--muted)}#tv-next .nm{font-size:9vh;font-weight:800;color:var(--accent);line-height:1.2}
#tv-next .tm{font-size:5vh;font-family:'UILatin';font-weight:700}#tv-next .cd{font-size:7.5vh;font-family:'UILatin';font-weight:700;direction:ltr;margin-top:.5vh}
#tv-next .cd span{font-family:var(--font);font-size:3vh;color:var(--muted);margin-inline-end:1vw}#tv-next .iq{margin-top:1vh;font-size:3vh;color:var(--accent2)}
#tv-panel{display:flex;flex-direction:column;justify-content:center;text-align:center;gap:1.4vh}
#tv-panel h3{margin:0;font-size:3vh;color:var(--accent)}#tv-panel .big{font-size:4.8vh;font-weight:700;line-height:1.5}
.hz{border-top:1px solid var(--line);padding-top:1.2vh}.hzt{display:flex;justify-content:center;gap:1.5vw;align-items:baseline;font-size:2.6vh;color:var(--muted)}
.hzt b{font-size:4vh;color:var(--fg)}.q{font-family:'QuranText','Amiri',serif;font-size:4.4vh;line-height:1.75}.hzr{font-size:2.2vh;color:var(--muted)}
body[data-riwaya=hafs] .q{font-family:'QuranHafs','Amiri',serif}
#tv-prayers{display:grid;grid-template-columns:repeat(6,1fr);gap:1vw}
.pc{background:var(--card);border:1px solid var(--line);border-radius:2vh;padding:1.6vh .6vw;text-align:center;transition:.3s}
.pc .pn{font-size:3.4vh;font-weight:700}.pc .pt{font-size:6vh;font-weight:700;font-family:'UILatin';line-height:1.2}.pc .pi{font-size:2.3vh;color:var(--muted)}
.pc.next{background:var(--hl);border-color:var(--accent);box-shadow:0 0 0 .3vh var(--accent) inset}.pc.next .pn,.pc.next .pt{color:var(--accent)}
.pc.done{opacity:.55}
#tv-ticker{overflow:hidden;white-space:nowrap;font-size:3vh;color:var(--fg);background:var(--card);border-radius:1.4vh;padding:.8vh 0;border:1px solid var(--line);direction:ltr;position:relative;height:6.2vh}
#tv-ticker span{position:absolute;left:0;top:50%;margin-top:-2.4vh;line-height:4.8vh;direction:rtl;animation:tick 45s linear infinite}
@keyframes tick{from{transform:translateX(-100%)}to{transform:translateX(100vw)}}
#tv-over{position:fixed;inset:0;display:none;flex-direction:column;justify-content:center;align-items:center;text-align:center;background:var(--bg);padding:5vh 6vw;gap:2vh}
body:not([data-phase=normal]) #tv-over{display:flex}
.ovl{font-size:5vh;color:var(--muted)}.ovt{font-size:9vh;font-weight:800;color:var(--accent)}.ovc{font-size:26vh;font-family:'UILatin';font-weight:700;direction:ltr;line-height:1}
.ovn{font-size:3.6vh;color:var(--accent2)}
body[data-phase=prayer] #tv-over{background:#000;color:#777}body[data-phase=prayer] .ovt{color:#9a8a5a}
.adk,.hadith{width:100%;max-width:100%;white-space:normal;overflow-wrap:break-word}
.adk h2{font-size:6vh;color:var(--accent);margin:0 0 3vh}.adk p{font-family:'Amiri',serif;font-size:5.6vh;line-height:1.8;margin:1.4vh 0}.adk i{font-style:normal;color:var(--accent);font-family:'UILatin';font-size:.7em;margin:0 .4vw}
.adk .src{font-size:2.6vh;color:var(--muted);margin-top:2vh}.adk .q{font-size:5vh}.adk .big2{font-size:4.6vh;line-height:1.9}
.adk .sura{margin:1.4vh 0}.adk .sura b{font-size:3vh;color:var(--accent)}.adk .sura .q{font-size:4.2vh}
.hadith p{font-family:'Amiri',serif;font-size:6vh;line-height:1.7;margin:2vh 0}
#tv-settings{position:fixed;inset:0;display:none;background:rgba(0,0,0,.6);z-index:5;overflow:auto;padding:3vh 4vw;cursor:default}
#tv-settings.on{display:block}
.set{max-width:1200px;margin:auto;background:#fff;color:#1d2b36;border-radius:18px;padding:22px 28px;font-family:'Noto Kufi Arabic',sans-serif;font-size:16px}
.set h2{margin:0 0 10px;color:#0f5e4f}.set h3{margin:14px 0 6px;font-size:15px;color:#0f5e4f}.set label{display:block;font-size:13px;color:#456;margin:6px 0}
.set input,.set select,.set textarea{display:block;width:100%;font:inherit;font-size:16px;padding:8px 10px;margin-top:3px;border:2px solid #d5dde3;border-radius:10px;background:#f7f9fa;color:#1d2b36}
.set :focus{outline:none;border-color:#e0a100 !important;box-shadow:0 0 0 3px rgba(224,161,0,.35)}
.g2{display:grid;grid-template-columns:1fr 1fr;gap:4px 18px}.g3{display:grid;grid-template-columns:repeat(3,1fr);gap:4px 14px}.g5{display:grid;grid-template-columns:repeat(6,1fr);gap:4px 10px}
.set .row{display:flex;gap:10px;margin-top:14px}.set button{font:inherit;font-size:16px;padding:10px 18px;border-radius:10px;border:2px solid #d5dde3;background:#f1f4f6;cursor:pointer}
.set button.b1{background:#0f5e4f;color:#fff;border-color:#0f5e4f}.set .hint{font-size:12px;color:#789;margin:10px 0 0}
.cl{display:flex;flex-direction:column;gap:4px;margin-top:4px}.cl button{display:block;width:100%;text-align:right;font-size:15px;padding:8px 12px}
`;
function applyTheme() {
  const t = THEMES[cfg.tv_theme] || THEMES.night;
  $('tv-theme').textContent = 'body.tv{' + t[1] + '}';
  document.body.dataset.riwaya = cfg.riwaya === 'hafs' ? 'hafs' : 'warsh';
  $('tv-mos').innerHTML = `${cfg.mosque_name || 'مواقيت الصلاة'}<small>${cfg.city_ar || ''}${cfg.city_name && cfg.city_name !== cfg.city_ar ? ' · ' + cfg.city_name : ''}</small>`;
}

export async function start() {
  cfg = load();
  document.body.className = 'tv'; document.body.dataset.phase = 'normal';
  document.body.innerHTML = `<style>${CSS}</style><style id="tv-theme"></style>
   <div id="tv"><div class="tv-head"><div class="tv-mos" id="tv-mos"></div><div id="tv-clockbox"><span id="tv-clock"></span><span id="tv-sec"></span></div><div id="tv-date"></div></div>
    <div class="tv-mid"><div class="box" id="tv-next"></div><div class="box" id="tv-panel"></div></div>
    <div id="tv-prayers"></div><div id="tv-ticker"></div></div>
   <div id="tv-over"></div><div id="tv-settings"></div>`;
  applyTheme();
  try { if (P.Screen) await P.Screen.keepOn({ on: true }); } catch (e) { }
  await model.loadPlaces();
  [AHZAB, Q] = await Promise.all([fetch('data/ahzab.json').then(r => r.json()), fetch('data/adhkar_quran.json').then(r => r.json())]);
  await build(); render();
  document.addEventListener('keydown', onKey);
  // remote «Back»: closes the settings; on the display itself it does nothing (the screen must stay on)
  try { if (P.App) P.App.addListener('backButton', () => { if ($('tv-settings').classList.contains('on')) closeSettings(); }); } catch (e) { }
  document.addEventListener('click', e => {                 // touch / mouse on the display opens the settings
    if (!e.target.closest || !e.target.closest('#tv,#tv-over')) return;
    if (!$('tv-settings').classList.contains('on')) openSettings();
  });
  setInterval(() => { try { render(); } catch (e) { console.error(e); } }, 1000);
  setInterval(() => build().catch(console.error), 10 * 60000);      // new day / new month
}
export { THEMES };
