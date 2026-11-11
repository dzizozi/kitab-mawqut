// Sheet HTML – JS port of mawaqit/render.py (same CSS themes, exported in shared.js)
import { S } from './shared.js';

const CRESCENT = '<svg viewBox="0 0 64 64" class="ic"><path d="M40 6a26 26 0 1 0 18 44A22 22 0 1 1 40 6z"/>' +
  '<path d="M48 18l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7z"/></svg>';
const DEFS = '<svg width="0" height="0" style="position:absolute"><defs>' +
  '<linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f6d58a"/><stop offset="1" stop-color="#b8862f"/></linearGradient>' +
  '<linearGradient id="holo" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#00b7ff"/><stop offset=".5" stop-color="#ff2fb8"/><stop offset="1" stop-color="#7a00ff"/></linearGradient>' +
  '</defs></svg>';
const MOSQUE = '<svg viewBox="0 0 400 60" preserveAspectRatio="none" class="skyline"><path d="' +
  'M0 60V44h30v-8h6v8h20V30c0-10 14-18 14-18s14 8 14 18v14h18V18l4-10 4 10v26h22V36c0-14 22-24 22-24s22 10 22 24v8h20V18l4-10 4 10v26h18V30' +
  'c0-10 14-18 14-18s14 8 14 18v14h22v-8h6v8h30v16z"/></svg>';
const BGDECO = '<div class="bgdeco"><div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div>' +
  '<div class="blob b4"></div><div class="pattern"></div><div class="sq s1"></div><div class="sq s2"></div>' +
  '<div class="bar"></div><div class="spark sp1">✦</div><div class="spark sp2">✧</div><div class="spark sp3">✦</div></div>';
const FONTS = [['Amiri', 'Amiri-Regular.ttf', 400], ['Amiri', 'Amiri-Bold.ttf', 700],
  ['Noto Kufi Arabic', 'NotoKufiArabic-Regular.ttf', 400], ['Noto Kufi Arabic', 'NotoKufiArabic-Bold.ttf', 700],
  ['Noto Kufi Arabic', 'NotoKufiArabic-Bold.ttf', 800], ['Noto Sans Arabic', 'NotoSansArabic-Regular.ttf', 400],
  ['Noto Sans Arabic', 'NotoSansArabic-Bold.ttf', 700], ['UILatin', 'NotoSans-Regular.ttf', 400],
  ['UILatin', 'NotoSans-Bold.ttf', 600], ['UILatin', 'NotoSans-Bold.ttf', 700]];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const p2 = n => String(n).padStart(2, '0');
const fmt = d => p2(d.getUTCDate()) + '/' + p2(d.getUTCMonth() + 1) + '/' + d.getUTCFullYear();
const wd = d => (d.getUTCDay() + 6) % 7;          // Monday = 0 (as Python)
function gregAr(cc) {
  if (cc === 'MA') return S.GREG.ar_ma;
  if (cc === 'DZ' || cc === 'TN') return S.GREG.ar_dz;
  if (['SY', 'LB', 'JO', 'PS', 'IQ'].includes(cc)) return S.GREG.ar_lv;
  return S.GREG.ar;
}

export function renderHtml(M, cfg, theme, fontBase = 'fonts/') {
  theme = theme || cfg.theme || 'glass';
  const L = (cfg.lang2 || 'fr') === 'fr' ? 1 : 2, l2 = L === 1 ? 'fr' : 'en';
  const UI = S.UI, HIJRI = S.HIJRI, DAYS = S.DAYS, G = gregAr(cfg.country);
  const rows = M.rows, g0 = rows[0].date, g1 = rows[rows.length - 1].date;
  const m0 = g0.getUTCMonth(), m1 = g1.getUTCMonth();
  const gar = G[m0] + (m1 !== m0 ? ' – ' + G[m1] : '');
  const g2 = S.GREG[l2][m0] + (m1 !== m0 ? ' – ' + S.GREG[l2][m1] : '');
  const gyear = g0.getUTCFullYear() === g1.getUTCFullYear() ? String(g0.getUTCFullYear()) : g0.getUTCFullYear() + ' – ' + g1.getUTCFullYear();
  const nm = M.mois === 12 ? 1 : M.mois + 1;
  const now = new Date(), todayIso = now.getFullYear() + '-' + p2(now.getMonth() + 1) + '-' + p2(now.getDate());
  const tr = rows.map((r, i) => {
    const d = r.date, w = wd(d);
    const cls = [['fri', w === 4], ['sun', w === 6], ['ev', r.events.length > 0], ['today', d.toISOString().slice(0, 10) === todayIso],
      ['next', r.is_next], ['unc', r.uncertain]].filter(x => x[1]).map(x => x[0]).join(' ');
    let side;
    if (i === 12) side = `<td class="side" rowspan="3"><div class="vbadge">${UI.white_badge[0]}</div></td>`;
    else if (i === 13 || i === 14) side = '';
    else if (i === 28) side = `<td class="side"><div class="moonb">${CRESCENT}</div></td>`;
    else side = '<td class="side"></td>';
    const hd = r.is_next ? '01' : (r.uncertain ? '30*' : p2(r.hday));
    let gd = p2(d.getUTCDate());
    if (i === 0 || d.getUTCDate() === 1) gd += `<i>${G[d.getUTCMonth()]}</i>`;
    const t = r.times;
    return `<tr class="${cls}">${side}<td class="day">${DAYS.ar[w]}<small>${DAYS[l2][w]}</small></td><td class="hd">${hd}</td><td class="gd">${gd}</td>` +
      `<td class="t acc">${t[0]}</td><td class="t">${t[1]}</td><td class="t acc">${t[2]}</td><td class="t">${t[3]}</td>` +
      `<td class="t acc">${t[4]}</td><td class="t isha">${t[5]}</td></tr>`;
  }).join('');
  const evs = [];
  for (const r of rows) for (const ev of r.events)
    evs.push(`<li><i class="dot ${ev[3]}"></i><span class="dt">${DAYS.ar[wd(r.date)]} · ${fmt(r.date)}</span><span>${esc(ev[0])}</span><span class="fr">${esc(ev[L])}</span></li>`);
  evs.push(`<li><i class="dot relig"></i><span class="dt"><bdi dir="ltr">${fmt(rows[12].date).slice(0, 5)} – ${fmt(rows[14].date)}</bdi></span><span>${UI.white[0]}</span><span class="fr">${UI.white[L]}</span></li>`);
  const d29 = rows[28].date;
  evs.push(`<li><i class="dot relig"></i><span class="dt">${DAYS.ar[wd(d29)]} · ${fmt(d29)}</span><span>${UI.crescent[0].replace('%s', HIJRI.ar[nm - 1])}</span><span class="fr">${UI.crescent[L]}</span></li>`);
  const chips = M.nxt.map(n => `<div class="${n.mois === 9 ? 'chip ram' : 'chip'}">${HIJRI.ar[n.mois - 1]}<span>${DAYS[l2][wd(n.debut)]} ${fmt(n.debut)}</span></div>`).join('');
  const note = [];
  if (!M.length_known) note.push(UI.unc[0]);
  if (M.calc_used) note.push(UI.calc[0]);
  const footNote = note.length ? ' · ' + note.join(' · ') : '';
  const monthAr = HIJRI.ar[M.mois - 1];
  let source, sourceR;
  if (cfg.country === 'MA' && cfg.method === 'MOROCCO') {
    source = 'المصدر: وزارة الأوقاف والشؤون الإسلامية' + (cfg.morocco_plus1 ? ' · التوقيت +1 ساعة' : ' · التوقيت الرسمي (GMT)');
    sourceR = 'habous.gov.ma';
  } else {
    source = 'طريقة الحساب: ' + S.METHODS[cfg.method].ar + (+cfg.asr === 2 ? ' · العصر: حنفي' : '');
    sourceR = cfg.tz || '';
  }
  const mosque = (cfg.mosque_name || '').trim(), img = cfg.mosque_image || '';
  const emblem = img ? `<div class="emblem photo"><img src="${img}"></div>` : `<div class="emblem">${CRESCENT}</div>`;
  const cityAr = cfg.city_ar || cfg.city_name || '';
  const left = mosque
    ? `<div class="h-left has-mosque"><div class="h-title">${esc(mosque)}</div><div class="h-sub2">${UI.in_city[0]} ${esc(cityAr)} · ${esc(cfg.city_name)}</div></div>`
    : `<div class="h-left"><div class="h-title">${UI.in_city[0]} ${esc(cityAr)}</div><div class="h-sub">${esc(cfg.city_name)}</div></div>`;
  const fontCss = FONTS.map(([f, n, w]) => `@font-face{font-family:'${f}';src:url('${fontBase}${n}');font-weight:${w}}`).join('');
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${esc(monthAr)} ${M.annee}</title>
<style>${fontCss}${S.themes[theme].css}</style></head><body class="t-${theme}">${DEFS}${BGDECO}
<div class="page">
 <div class="panel head">
  <div class="h-right"><div class="h-title">${UI.title[0]}</div><div class="h-sub">${UI.title[L]}</div></div>
  <div class="h-mid">${emblem}<div class="month">${esc(monthAr)}</div><div class="month-fr">${HIJRI[l2][M.mois - 1]} ${M.annee}</div></div>
  ${left}
  ${MOSQUE}
 </div>
 <div class="meta"><span><b>${M.annee} هـ</b> · ${gar} ${gyear} · <span class="fr">${g2} ${gyear}</span></span><span class="dua">${esc(cfg.dua || '')}</span></div>
 <div class="panel tbl"><table>
  <thead><tr><th class="side"></th><th class="c1">${UI.day[0]}<small>${UI.day[L]}</small></th><th>${esc(monthAr)}<small>${UI.hijri[L]}</small></th>
  <th>${gar}<small>${g2}</small></th>
  <th>${UI.fajr[0]}<small>${UI.fajr[L]}</small></th><th>${UI.sunrise[0]}<small>${UI.sunrise[L]}</small></th>
  <th>${UI.dhuhr[0]}<small>${UI.dhuhr[L]}</small></th><th>${UI.asr[0]}<small>${UI.asr[L]}</small></th>
  <th>${UI.maghrib[0]}<small>${UI.maghrib[L]}</small></th><th class="cl">${UI.isha[0]}<small>${UI.isha[L]}</small></th></tr></thead>
  <tbody>${tr}</tbody></table></div>
 <div class="bottom">
  <div class="panel card"><h3>${UI.events[0]} <small>${UI.events[L]}</small></h3><ul class="evl">${evs.join('')}</ul></div>
  <div class="panel card"><h3>${UI.next[0]} <small>${UI.next[L]}</small></h3><div class="chips">${chips}</div></div>
 </div>
 <div class="foot"><span>${esc(source)}${footNote}</span><span>${esc(sourceR)} · ${p2(now.getDate())}/${p2(now.getMonth() + 1)}/${now.getFullYear()}</span></div>
</div></body></html>`;
}
