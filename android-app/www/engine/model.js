// Monthly model + places + Habous source – JS port of mawaqit/core.py (build_model) and config.py
import { S } from './shared.js';
import * as calc from './calc.js';
import * as hijri from './hijri.js';
const { civ, addDays, iso } = hijri;

export const DEFAULTS = {
  country: 'MA', city_key: 'h58', city_name: 'Casablanca', city_ar: 'الدار البيضاء', lat: 33.5731, lon: -7.5898,
  tz: 'Africa/Casablanca', habous_id: 58, approx_coords: false, method: 'MOROCCO', asr: 1, hijri_mode: 'morocco',
  hijri_adjust: 0, morocco_plus1: false, tune: { fajr: 0, sunrise: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
  lang2: 'fr', mosque_name: '', mosque_image: '', dua: '', theme: 'glass', paper: 'A4', reminder: false,
};

// ---------------------------------------------------------------- places (bundled, GeoNames + Habous list)
let PLACES = null, HABOUS_CITIES = null;
export async function loadPlaces() {
  if (!PLACES) {
    const r = await fetch('data/places.dat');
    const ds = r.body.pipeThrough(new DecompressionStream('gzip'));
    PLACES = JSON.parse(await new Response(ds).text());
    HABOUS_CITIES = await (await fetch('data/habous_cities.json')).json();
  }
  return PLACES;
}
export function countries() {
  return Object.entries(PLACES.countries).map(([cc, v]) => [cc, v.ar, v.fr, v.en]).sort((a, b) => a[1].localeCompare(b[1], 'ar'));
}
export function cities(cc) {
  if (cc === 'MA') return HABOUS_CITIES.map(c => ['h' + c.id, c.ar, c.fr || '']);
  return (PLACES.cities[cc] || []).map((c, i) => ['g' + i, c[1] || c[0], c[0]]);
}
export function cityInfo(cc, key) {
  if (key[0] === 'h') {
    const c = HABOUS_CITIES.find(x => x.id === +key.slice(1));
    return { city_ar: c.ar, city_name: c.fr || c.ar, lat: c.lat ?? 33.5883, lon: c.lon ?? -7.6114, tz: 'Africa/Casablanca',
             habous_id: c.id, approx_coords: c.lat == null };
  }
  const c = PLACES.cities[cc][+key.slice(1)];
  return { city_ar: c[1] || c[0], city_name: c[0], lat: c[2], lon: c[3], tz: c[4], habous_id: null, approx_coords: false };
}
const LANG_FR = new Set(['MA', 'DZ', 'TN', 'MR', 'FR', 'BE', 'SN', 'ML', 'NE', 'TD', 'CH', 'LU', 'CI', 'GN', 'BF', 'CM', 'KM', 'DJ', 'LB']);
export function countryDefaults(cc) {
  return { method: S.COUNTRY_METHOD[cc] || 'MWL', asr: S.HANAFI.includes(cc) ? 2 : 1,
           hijri_mode: cc === 'MA' ? 'morocco' : 'ummalqura', hijri_adjust: 0, lang2: LANG_FR.has(cc) ? 'fr' : 'en' };
}

// ---------------------------------------------------------------- Habous (Morocco official) with cache
const HABOUS = 'https://www.habous.gov.ma/data/';
async function fetchHabous(name, maxAgeH) {
  const key = 'habous:' + name;
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(key) || 'null'); } catch (e) { }
  if (cached && Date.now() - cached.t < maxAgeH * 3600000) return cached.v;
  try {
    let ok, t;
    const http = globalThis.Capacitor?.isNativePlatform?.() && globalThis.Capacitor.Plugins?.CapacitorHttp;
    if (http) {        // native HTTP: no CORS restriction
      const r = await http.get({ url: HABOUS + name, responseType: 'text', connectTimeout: 20000, readTimeout: 30000 });
      ok = r.status === 200; t = typeof r.data === 'string' ? r.data : JSON.stringify(r.data);
    } else {
      const r = await fetch(HABOUS + name, { cache: 'no-store' }); ok = r.ok; t = await r.text();
    }
    if (ok && t.length > 200 && !t.slice(0, 200).toLowerCase().includes('<html')) {
      try { localStorage.setItem(key, JSON.stringify({ t: Date.now(), v: t })); } catch (e) { }
      return t;
    }
  } catch (e) { /* offline or CORS (browser preview) */ }
  return cached ? cached.v : null;
}
const habCache = {};
async function habousMonth(y, m) {
  const k = y + '-' + m;
  if (!(k in habCache)) {
    const past = civ(y, m, 1) < civ(new Date().getFullYear(), new Date().getMonth() + 1, 1);
    const t = await fetchHabous(`horaires-${y}-${String(m).padStart(2, '0')}.js`, past ? 24 * 365 : 12);
    habCache[k] = null;
    if (t && t.includes('push(')) {
      const d = JSON.parse(t.slice(t.indexOf('push(') + 5, t.lastIndexOf(')')));
      habCache[k] = Object.fromEntries(d.villes.map(v => [v.c, v.h]));
    }
  }
  return habCache[k];
}
async function habousOffsets(cityId) {      // town without coordinates: offset vs Casablanca
  const now = new Date();
  for (const back of [0, 1, 2]) {
    const dt = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const v = await habousMonth(dt.getFullYear(), dt.getMonth() + 1);
    if (v && v[cityId] && v[58]) {
      const mins = s => +s.slice(0, 2) * 60 + +s.slice(3);
      return [0, 1, 2, 3, 4, 5].map(j => Math.round(v[cityId].reduce((a, r, i) => a + mins(r[j]) - mins(v[58][i][j]), 0) / v[58].length));
    }
  }
  return [0, 0, 0, 0, 0, 0];
}
const shift = (s, n) => { if (!n || s === '--:--') return s; let t = (+s.slice(0, 2) * 60 + +s.slice(3) + n) % 1440; if (t < 0) t += 1440;
  return String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0'); };

// ---------------------------------------------------------------- model
export async function buildModel(cfg, ref) {
  const now = ref || new Date();
  const today = civ(now.getFullYear(), now.getMonth() + 1, now.getDate());
  const morocco = cfg.country === 'MA' && cfg.hijri_mode === 'morocco';
  const official = morocco ? hijri.parseHabousHijri(await fetchHabous('hijri.js', 1)) : null;
  const cur = hijri.monthAt(addDays(today, morocco ? 1 : 0), cfg, official);
  const start = cur.debut, hm = cur.mois, hy = cur.annee;
  const length = cur.duree || hijri.diffDays(cur.est_next, start);
  const known = !!cur.known;
  const useHabous = cfg.country === 'MA' && cfg.method === 'MOROCCO' && cfg.habous_id;
  const plus = cfg.country === 'MA' && cfg.morocco_plus1 ? 60 : 0;
  const tune = cfg.tune || {};
  const offs = useHabous && cfg.approx_coords ? await habousOffsets(cfg.habous_id) : null;
  const rows = []; let calcUsed = false;
  for (let i = 0; i < 30; i++) {
    const day = addDays(start, i), y = day.getUTCFullYear(), m = day.getUTCMonth() + 1, d = day.getUTCDate();
    const hd = i + 1, ramadan = hm === 9 && hd <= length;
    let t = null;
    if (useHabous) { const v = await habousMonth(y, m); const h = v && v[cfg.habous_id]; if (h && d <= h.length) t = h[d - 1]; }
    if (t) t = t.map((x, j) => shift(x, plus + (tune[calc.KEYS[j]] || 0)));
    else if (offs) {
      t = calc.times(33.5883, -7.6114, y, m, d, 'MOROCCO', 1, cfg.tz, {}, ramadan, plus)
        .map((x, j) => shift(x, offs[j] + (tune[calc.KEYS[j]] || 0))); calcUsed = true;
    } else {
      t = calc.times(cfg.lat, cfg.lon, y, m, d, cfg.method, +cfg.asr || 1, cfg.tz, tune, ramadan, plus);
      if (useHabous) calcUsed = true;
    }
    const isNext = known && length === 29 && i === 29;
    const ev = [];
    if (!isNext) {
      for (const tb of [S.HIJRI_EVENTS, cfg.country === 'MA' ? S.HIJRI_EVENTS_MA : {}]) if (tb[hm + '-' + hd]) ev.push(tb[hm + '-' + hd]);
    }
    const nat = (S.NATIONAL[cfg.country] || {})[m + '-' + d];
    if (nat) ev.push([...nat, 'fete']);
    rows.push({ date: day, hday: hd, times: t, events: ev, is_next: isNext, uncertain: i === 29 && !known });
  }
  const nxt = hijri.following(cur, cfg, official);
  return { start, mois: hm, annee: hy, length, length_known: known, rows, nxt, calc_used: calcUsed,
           key: hy + '-' + String(hm).padStart(2, '0'), announced: !!(official && official.length) };
}
export { iso };
