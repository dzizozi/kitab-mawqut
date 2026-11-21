// «كتابا موقوتا» – adhan screen background: a built-in animated scene per prayer (vector, works offline),
// or optional downloaded videos (real photographs of mosques, animated). Videos live on a GitHub release and are
// downloaded on demand by the native plugin «AdhanMedia» (files/adhan/ in the app's private storage).
const CAP = globalThis.Capacitor, P = (CAP && CAP.Plugins) || {};
const $ = id => document.getElementById(id);
export const BASE = localStorage.getItem('km_media_base') || 'https://github.com/dzizozi/kitab-mawqut/releases/download/adhan-media-v1/';
export const ADHAN_DEFAULTS = { adhan_on: true, adhan_mode: 'inside', adhan_bg: 'video', adhan_protect: true,
  adhan_s: { fajr: 300, dhuhr: 240, asr: 240, maghrib: 240, isha: 240 }, adhan_vids: {} };
export const DUA = 'اللَّهُمَّ رَبَّ هَذِهِ الدَّعْوَةِ التَّامَّةِ، وَالصَّلَاةِ الْقَائِمَةِ، آتِ مُحَمَّدًا الْوَسِيلَةَ وَالْفَضِيلَةَ، وَابْعَثْهُ مَقَامًا مَحْمُودًا الَّذِي وَعَدْتَهُ';
export const DUA_SRC = 'الدعاء بعد الأذان — رواه البخاري';
export const STYLES = [['maghreb', 'مغربي وشمال إفريقي'], ['orient', 'شرقي (الحرمان)'], ['turkish', 'تركي'], ['nature', 'طبيعة']];

// ---------------------------------------------------------------- durations «m:ss»
export const fmtS = s => Math.floor(s / 60) + ':' + String(Math.round(s % 60)).padStart(2, '0');
export function parseS(v, def) {
  const t = String(v || '').replace(/[٠-٩]/g, c => '٠١٢٣٤٥٦٧٨٩'.indexOf(c)).replace(/[۰-۹]/g, c => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c)).replace(',', '.').trim();
  let m = /^(\d{1,2})\s*[:.]\s*(\d{1,2})$/.exec(t);
  if (m && t.includes(':')) return Math.min(1800, +m[1] * 60 + +m[2]);
  const f = parseFloat(t); return isFinite(f) && f >= 0 ? Math.min(1800, Math.round(f * 60)) : def;
}

// ---------------------------------------------------------------- built-in animated scenes (CSS + SVG, transform/opacity only)
const SKY = {
  fajr: 'linear-gradient(#050d1f 0%,#0f2244 45%,#2c4373 72%,#8c6a7a 90%,#d69a68 100%)',
  dhuhr: 'linear-gradient(#1f6fc4 0%,#4f98dc 45%,#9fcbef 100%)',
  asr: 'linear-gradient(#2f78bd 0%,#79acd8 50%,#e8cf9f 88%,#f0c27e 100%)',
  maghrib: 'linear-gradient(#1d1238 0%,#5a1f48 30%,#b8324a 55%,#ee7a3a 78%,#ffc874 100%)',
  isha: 'linear-gradient(#01040c 0%,#06122a 55%,#0d2142 100%)',
};
const TONE = {            // minaret / mosque colours per scene: [stone, shade, band, roof, windows]
  fajr: ['#101a2c', '#0b1322', '#14283a', '#0d1d24', '#c98f4e'], dhuhr: ['#efe3cb', '#d9c7a6', '#1f7a5a', '#2f8a62', '#6b5638'],
  asr: ['#eed6ad', '#d3b383', '#1f7a5a', '#2f8a62', '#6b5638'], maghrib: ['#241221', '#190c18', '#2a1624', '#1d0f1a', '#f3a24a'],
  isha: ['#f2c46c', '#c9963f', '#1f7a5a', '#245f48', '#fff1c4'],
};
function mosqueSvg(k) {
  const [st, sh, band, roof, win] = TONE[k];
  const lit = k === 'isha' || k === 'fajr' || k === 'maghrib';
  const wins = [];
  for (let i = 0; i < 7; i++) wins.push(`<path d="M${600 + i * 95} 900v-120a26 26 0 0 1 52 0v120z" fill="${lit ? win : sh}" opacity="${lit ? .85 : .55}"/>`);
  const mw = [];
  for (let y = 300; y < 820; y += 95) mw.push(`<path d="M1117 ${y + 46}v-28a13 13 0 0 1 26 0v28z" fill="${lit ? win : sh}" opacity="${lit ? .9 : .7}"/>`);
  const cren = []; for (let x = 1070; x < 1190; x += 24) cren.push(`<rect x="${x}" y="128" width="14" height="16" fill="${st}"/>`);
  const cren2 = []; for (let x = 1100; x < 1160; x += 16) cren2.push(`<rect x="${x}" y="62" width="9" height="10" fill="${st}"/>`);
  return `<svg class="mq" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
   ${k === 'isha' ? '<radialGradient id="mqg"><stop offset="0" stop-color="#ffd27a" stop-opacity=".35"/><stop offset="1" stop-color="#ffd27a" stop-opacity="0"/></radialGradient><ellipse cx="1130" cy="520" rx="420" ry="520" fill="url(#mqg)"/>' : ''}
   <path d="M520 900V738h860v162z" fill="${st}"/><path d="M500 742l40-34h800l40 34z" fill="${roof}"/>
   ${wins.join('')}
   <rect x="1068" y="140" width="124" height="760" fill="${st}"/><rect x="1068" y="140" width="22" height="760" fill="${sh}" opacity=".55"/>
   <rect x="1068" y="190" width="124" height="70" fill="${band}"/>${cren.join('')}
   <path d="M1090 330h80v-10a40 40 0 0 0-80 0z" fill="none" stroke="${sh}" stroke-width="6"/>
   ${mw.join('')}
   <rect x="1098" y="72" width="64" height="68" fill="${st}"/><rect x="1098" y="88" width="64" height="18" fill="${band}"/>${cren2.join('')}
   <path d="M1104 62a26 22 0 0 1 52 0z" fill="${st}"/><rect x="1128.5" y="8" width="3" height="34" fill="#d8b24a"/>
   <circle cx="1130" cy="38" r="8" fill="#d8b24a"/><circle cx="1130" cy="22" r="6" fill="#d8b24a"/><circle cx="1130" cy="10" r="4" fill="#d8b24a"/>
   <rect x="0" y="886" width="1600" height="14" fill="${sh}" opacity=".6"/></svg>`;
}
function sceneHtml(k) {
  const starsOn = k === 'isha' || k === 'fajr';
  let stars = '';
  if (starsOn) for (let i = 0; i < 46; i++) {
    const h = n => { const v = Math.sin(n) * 43758.5453; return v - Math.floor(v); };   // fixed pseudo-random spread
    const x = h(i * 12.9898) * 100, y = h(i * 78.233 + 1) * (k === 'fajr' ? 40 : 62), d = (i % 5) * .9, s = 2 + (i % 3);
    stars += `<i style="left:${x.toFixed(1)}%;top:${y.toFixed(1)}%;width:${s}px;height:${s}px;animation-delay:${d}s"></i>`;
  }
  const clouds = k === 'dhuhr' || k === 'asr' ? `<div class="cl1"></div><div class="cl2"></div><div class="cl3"></div>` : '';
  const birds = k === 'maghrib' || k === 'asr' || k === 'fajr' ? `<svg class="birds" viewBox="0 0 400 120" aria-hidden="true">${[[20, 60, 1], [70, 40, .8], [110, 70, .9], [150, 30, .7], [200, 55, .75]].map(([x, y, s]) =>
    `<path transform="translate(${x} ${y}) scale(${s})" d="M0 0q12-12 24 0q12-12 24 0" fill="none" stroke="${k === 'maghrib' ? '#2a1222' : '#26303a'}" stroke-width="3.5" stroke-linecap="round"/>`).join('')}</svg>` : '';
  return `<div class="as as-${k}" style="background:${SKY[k]}"><div class="sun"></div>${starsOn ? `<div class="stars">${stars}</div>` : ''}${clouds}${birds}${mosqueSvg(k)}<div class="shade"></div></div>`;
}
export const CSS = `
#tv-abg{position:fixed;inset:0;display:none;overflow:hidden;background:#000}
body[data-phase=adhan] #tv-abg{display:block}
body[data-phase=adhan] #tv-over{background:transparent}body[data-phase=adhan] #tv-over::before,body[data-phase=adhan] #tv-over::after{display:none}
#tv-abg .as,#tv-abg video{position:absolute;inset:0;width:100%;height:100%}
#tv-abg video{object-fit:cover;opacity:0;transition:opacity 1.2s linear}#tv-abg video.on{opacity:1}
.as .mq{position:absolute;left:0;right:0;bottom:0;width:100%;height:100%}
.as .shade{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 55%,rgba(0,0,0,.42),rgba(0,0,0,.05) 70%)}
.as .sun{position:absolute;border-radius:50%;will-change:transform}
.as-dhuhr .sun{left:18%;top:8%;width:14vh;height:14vh;background:radial-gradient(#fff,#fff7d6 40%,rgba(255,247,214,0) 70%);transform:scale(2.4)}
.as-asr .sun{left:16%;top:36%;width:14vh;height:14vh;background:radial-gradient(#fff3cf,#ffd98e 45%,rgba(255,217,142,0) 70%);transform:scale(2.6)}
.as-maghrib .sun{left:20%;top:64%;width:22vh;height:22vh;background:radial-gradient(#fff0c4,#ffb04d 35%,#f06a2c 55%,rgba(240,106,44,0) 72%);animation:sunset 60s linear infinite alternate}
.as-fajr .sun{left:-10%;right:-10%;top:78%;height:40vh;width:120%;border-radius:50%;background:radial-gradient(ellipse at 50% 100%,rgba(240,170,110,.55),rgba(240,170,110,0) 65%)}
@keyframes sunset{from{transform:translate3d(0,0,0)}to{transform:translate3d(0,6vh,0)}}
.as .stars{position:absolute;inset:0}.as .stars i{position:absolute;border-radius:50%;background:#fff;opacity:.25;animation:tw 4.5s ease-in-out infinite alternate}
@keyframes tw{from{opacity:.15}to{opacity:.9}}
.as .cl1,.as .cl2,.as .cl3{position:absolute;height:9vh;border-radius:9vh;background:rgba(255,255,255,.78);filter:blur(1.2vh);will-change:transform;animation:drift 90s linear infinite}
.as .cl1{top:12%;left:-30%;width:38vw}.as .cl2{top:24%;left:-45%;width:26vw;opacity:.7;animation-duration:130s;animation-delay:-40s}
.as .cl3{top:6%;left:-25%;width:20vw;opacity:.6;animation-duration:160s;animation-delay:-90s}
.as-asr .cl1,.as-asr .cl2,.as-asr .cl3{background:rgba(255,236,205,.7)}
@keyframes drift{from{transform:translate3d(0,0,0)}to{transform:translate3d(160vw,0,0)}}
.as .birds{position:absolute;left:-30vw;top:22%;width:24vw;height:8vw;will-change:transform;animation:fly 38s linear infinite}
.as-fajr .birds{top:30%;opacity:.55;animation-duration:50s}
@keyframes fly{from{transform:translate3d(0,0,0)}to{transform:translate3d(140vw,-6vh,0)}}
#tv-over .adn{display:flex;flex-direction:column;align-items:center;gap:1.4vh;text-shadow:0 .3vh 1.2vh rgba(0,0,0,.75),0 0 4vh rgba(0,0,0,.45);color:#fff}
#tv-over .adn-l{font-size:5rem;color:#f7e7c0}#tv-over .adn-t{font-size:14rem;font-weight:800;line-height:1.1;color:#fff}
#tv-over .adn-tm{font-size:6rem;font-weight:800;direction:ltr;color:#ffe3a3}#tv-over .adn-iq{font-size:3.6rem;color:#f2ead8}
#tv-over .adn-d{margin-top:2vh;max-width:78vw;font-family:'Amiri',serif;font-size:3.4rem;line-height:1.7;color:#fff8e6;background:rgba(0,0,0,.28);padding:1.2vh 2vw;border-radius:2vh}
#tv-over .adn-d small{display:block;font-family:inherit;font-size:.6em;opacity:.8}
body.setting.pv #tv-abg{position:fixed;inset:auto;left:1.6vw;top:24vh;width:100vw;height:100vh;transform:scale(.41);transform-origin:0 0;z-index:6;border-radius:3vh;pointer-events:none}
body.setting:not(.pv) #tv-abg{display:none !important}
.set .vgal{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:8px}
.set .vgal button.vt{display:flex;flex-direction:column;padding:0 !important;overflow:hidden;text-align:center;border-radius:12px;background:#0b1a24;color:#fff;border:3px solid transparent}
.set .vgal button.vt img{width:100%;height:118px;object-fit:cover;display:block;background:#123}
.set .vgal button.vt span{font-size:13px;padding:4px 6px 0}.set .vgal button.vt em{font-style:normal;font-size:12px;padding:0 6px 6px;color:#9fd6c2}
.set .vgal button.vt.dl{border-color:#2f8a62}.set .vgal button.vt:focus{border-color:#e0a100}
.set .g6 button.ms{font-size:13px;padding:6px 4px}.set .g6 button.ms.run{background:#b3261e;color:#fff;border-color:#b3261e}
`;

// ---------------------------------------------------------------- downloaded files (index in localStorage)
const FKEY = 'km_adhan_files';
export const files = () => { try { return JSON.parse(localStorage.getItem(FKEY) || '{}'); } catch (e) { return {}; } };
const saveFiles = f => localStorage.setItem(FKEY, JSON.stringify(f));
const srcOf = id => { const f = files()[id]; if (!f) return null; return f.path.startsWith('http') ? f.path : (CAP && CAP.convertFileSrc ? CAP.convertFileSrc(f.path) : f.path); };
export async function syncFiles() {          // drop index entries whose file vanished (cleared storage)
  if (!P.AdhanMedia) return;
  try {
    const r = await P.AdhanMedia.list(), have = new Set(r.files.map(x => x.name)), f = files();
    for (const id of Object.keys(f)) if (!have.has(id + '.mp4')) delete f[id];
    saveFiles(f); return r;
  } catch (e) { return null; }
}
let CAT = null;
export async function catalog(force) {
  if (CAT && !force) return CAT;
  let text = null;
  try {
    if (P.AdhanMedia) text = (await P.AdhanMedia.fetchText({ url: BASE + 'adhan-videos.json' })).text;
    else text = await (await fetch(BASE + 'adhan-videos.json')).text();
    CAT = JSON.parse(text); localStorage.setItem('km_adhan_cat', text);
  } catch (e) {
    try { CAT = JSON.parse(localStorage.getItem('km_adhan_cat') || 'null'); } catch (e2) { CAT = null; }
  }
  return CAT;
}
export const CATV = id => (CAT && CAT.videos.find(v => v.id === id)) || null;
const OVR = localStorage.getItem('km_media_base');               // test override (local media server)
export const remote = (v) => (OVR || CAT && CAT.base || BASE) + v.file;
export const previewUrl = (v) => (OVR || CAT && CAT.base || BASE) + v.preview;

export async function download(v, onPct) {
  let sub = null;
  try {
    if (P.AdhanMedia) {
      sub = await P.AdhanMedia.addListener('progress', p => { if (p.name === v.id + '.mp4' && onPct) onPct(p.pct); });
      const r = await P.AdhanMedia.download({ url: remote(v), name: v.id + '.mp4' });
      const f = files(); f[v.id] = { path: r.path, bytes: r.size }; saveFiles(f);
    } else {                                  // browser test: play from the web
      const f = files(); f[v.id] = { path: remote(v), bytes: v.bytes || 0 }; saveFiles(f);
    }
  } finally { try { sub && sub.remove(); } catch (e) { } }
}
export async function removeFile(id) {
  try { if (P.AdhanMedia) await P.AdhanMedia.remove({ name: id + '.mp4' }); } catch (e) { }
  const f = files(); delete f[id]; saveFiles(f);
}

// ---------------------------------------------------------------- background player
let SIG = '', VI = 0;
function playList(box, list) {
  box.innerHTML = '<video muted playsinline preload="auto"></video><video muted playsinline preload="auto"></video>';
  const vs = box.querySelectorAll('video');
  const start = (i) => {
    const v = vs[i % 2], o = vs[(i + 1) % 2];
    v.src = list[i % list.length]; v.loop = list.length === 1;
    const p = v.play(); if (p && p.catch) p.catch(() => { });
    v.classList.add('on'); setTimeout(() => o.classList.remove('on'), 1300);
    v.onended = () => { if (box._list === list) start(i + 1); };
    v.onerror = () => { if (box._list !== list) return; if (list.length > 1) start(i + 1); else { box._list = null; box.innerHTML = sceneHtml(box._k || 'dhuhr'); } };
  };
  box._list = list; start(VI++ % list.length);
}
/** k: prayer key; vid: a catalog video to preview from the web (settings gallery) or null */
export function show(cfg, k, vid) {
  const box = $('tv-abg'); if (!box) return;
  const ids = (cfg.adhan_vids || {})[k] || [];
  const list = vid ? [remote(vid)] : cfg.adhan_bg === 'anim' ? [] : ids.map(srcOf).filter(Boolean);
  const sig = k + '|' + list.join(',');
  if (sig === SIG) return; SIG = sig; box._k = k === 'jumua' ? 'dhuhr' : k;
  if (list.length) playList(box, list);
  else { box._list = null; box.innerHTML = sceneHtml(k === 'jumua' ? 'dhuhr' : k); }
}
export function hide() {
  if (!SIG) return; SIG = '';
  const box = $('tv-abg'); if (box) { box._list = null; box.querySelectorAll('video').forEach(v => { try { v.pause(); v.removeAttribute('src'); v.load(); } catch (e) { } }); box.innerHTML = ''; }
}

// ---------------------------------------------------------------- settings gallery
export function galleryTiles(cfg, k, style) {
  if (!CAT) return '<small>جارٍ تحميل قائمة الفيديوهات… (تحتاج الإنترنت أول مرة)</small>';
  const f = files(), mine = (cfg.adhan_vids || {})[k] || [];
  const vs = CAT.videos.filter(v => v.prayers.includes(k) && (!style || v.style === style));
  if (!vs.length) return '<small>لا توجد فيديوهات لهذه الصلاة بهذا النمط بعد. ستُضاف فيديوهات أخرى لاحقاً، وتظهر هنا وحدها.</small>';
  return '<div class="vgal">' + vs.map(v => {
    const used = mine.includes(v.id), have = !!f[v.id];
    const st = used ? '✓ مختار لهذه الصلاة — OK للحذف' : have ? 'مُنزّل — OK لاختياره' : `OK للتنزيل (${(v.bytes / 1048576).toFixed(1)} ميغا)`;
    return `<button class="vt${used ? ' dl' : ''}" data-vid="${v.id}" data-pv="adhan" data-pvk="${k}"><img src="${previewUrl(v)}" alt="" loading="lazy"><span>${v.title_ar}</span><em id="vst-${v.id}">${st}</em></button>`;
  }).join('') + '</div>';
}
/** OK on a tile: download + select it for prayer k (or unselect / delete it). */
export async function tileAction(cfg, k, id, say) {
  const v = CAT && CAT.videos.find(x => x.id === id); if (!v) return;
  const vids = { ...(cfg.adhan_vids || {}) }, mine = [...(vids[k] || [])];
  const usedElsewhere = (x) => Object.entries(vids).some(([kk, l]) => kk !== k && (l || []).includes(x));
  if (mine.includes(id)) {                    // unselect; delete the file when no other prayer uses it
    vids[k] = mine.filter(x => x !== id); cfg.adhan_vids = vids;
    if (!usedElsewhere(id)) await removeFile(id);
    say('حُذف الفيديو من هذه الصلاة.'); return;
  }
  if (!files()[id]) {
    say('جارٍ التنزيل… 0%');
    try { await download(v, pct => say(`جارٍ التنزيل… ${pct}%`)); }
    catch (e) { say('تعذّر التنزيل: ' + (String(e && e.message || e).includes('space') ? 'المساحة غير كافية في الجهاز.' : 'تحقّق من الإنترنت ثم أعد المحاولة.')); return; }
  }
  if (cfg.adhan_protect !== false) {          // memory protection: one video per prayer, the new one replaces the old
    for (const old of mine) { vids[k] = []; if (!usedElsewhere(old) && old !== id) await removeFile(old); }
    vids[k] = [id];
  } else vids[k] = [...mine, id];
  cfg.adhan_vids = vids;
  say(cfg.adhan_protect !== false ? '✓ نُزّل واختير لهذه الصلاة.' : `✓ نُزّل وأُضيف: ${vids[k].length} فيديو لهذه الصلاة تُعرض متتابعة.`);
}
export async function spaceInfo(cfg) {
  const r = await syncFiles(); const f = files();
  const used = Object.values(f).reduce((a, x) => a + (x.bytes || 0), 0);
  const n = Object.keys(f).length;
  return `الفيديوهات المنزّلة: ${n} (${(used / 1048576).toFixed(1)} ميغا)` + (r ? ` · المساحة الحرة في الجهاز: ${(r.free / 1073741824).toFixed(1)} جيغا` : '');
}
