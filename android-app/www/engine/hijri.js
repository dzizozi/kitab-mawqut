// Hijri calendar – JS port of mawaqit/hijri.py
const A = globalThis.Astronomy;
const DAY = 86400000;
// civil dates are handled as UTC-midnight Date objects
export const civ = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
export const addDays = (d, n) => new Date(d.getTime() + n * DAY);
export const iso = d => d.toISOString().slice(0, 10);
export const diffDays = (a, b) => Math.round((a - b) / DAY);

// ---------------------------------------------------------------- crescent visibility
export function eveningParams(day, lat, lon) {
  const obs = new A.Observer(lat, lon, 0);
  const noon = new Date(day.getTime() + 12 * 3600000 - lon / 15 * 3600000);
  const ss = A.SearchAltitude(A.Body.Sun, obs, -1, noon, 1, -50 / 60);
  if (!ss) return null;
  const sunset = ss.date;
  const ms = A.SearchRiseSet(A.Body.Moon, obs, -1, sunset, 2);
  if (!ms) return null;
  const nm = A.SearchMoonPhase(0, new Date(sunset.getTime() - 35 * DAY), 35);
  const eqm = A.Equator(A.Body.Moon, sunset, obs, true, true);
  const hor = A.Horizon(sunset, obs, eqm.ra, eqm.dec, 'normal');
  return { lag: (ms.date - sunset) / 60000, age: (sunset - nm.date) / 3600000, alt: hor.altitude,
           elong: A.AngleFromSun(A.Body.Moon, sunset) };
}
export function visible(day, lat, lon) {
  const p = eveningParams(day, lat, lon);
  return !!p && p.lag >= 29 && p.age >= 15 && p.elong >= 10.5;
}
export function nextStartVisibility(prevStart, lat, lon) {
  const d29 = addDays(prevStart, 28);
  return visible(d29, lat, lon) ? addDays(d29, 1) : addDays(d29, 2);
}

// ---------------------------------------------------------------- Umm al-Qura (built into ICU)
const fmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura-nu-latn', { timeZone: 'UTC', day: 'numeric', month: 'numeric', year: 'numeric' });
export function toHijri(d) {
  const p = fmt.formatToParts(d).reduce((o, x) => (o[x.type] = x.value, o), {});
  return { y: parseInt(p.year), m: parseInt(p.month), d: parseInt(p.day) };
}
function uqMonth(day) {
  const h = toHijri(day);
  const start = addDays(day, -(h.d - 1));
  let len = 29;
  if (toHijri(addDays(start, 29)).d === 30) len = 30;
  return { debut: start, mois: h.m, annee: h.y, duree: len };
}

// ---------------------------------------------------------------- month lists
export function monthAt(day, cfg, official) {
  let mode = cfg.hijri_mode || 'ummalqura';
  const adj = parseInt(cfg.hijri_adjust || 0);
  const { lat, lon } = cfg;
  if (mode === 'morocco' && official && official.length) {
    const cand = official.filter(m => m.debut <= day && (m.duree == null || day < addDays(m.debut, m.duree)));
    if (cand.length) {
      const cur = { ...cand[cand.length - 1] };
      cur.known = cur.duree != null;
      if (cur.duree == null) cur.est_next = nextStartVisibility(cur.debut, 33.5731, -7.5898);
      return cur;
    }
    mode = 'visibility';
  }
  if (mode === 'visibility' || mode === 'morocco') {
    let nmT = A.SearchMoonPhase(0, addDays(day, -31), 31.5).date;
    for (let back = 0; back < 2; back++) {
      const conj = civ(nmT.getUTCFullYear(), nmT.getUTCMonth() + 1, nmT.getUTCDate());
      let start = null;
      for (let k = 0; k < 4; k++) if (visible(addDays(conj, k), lat, lon)) { start = addDays(conj, k + 1); break; }
      start = addDays(start || addDays(conj, 2), adj);
      if (start <= day) {
        let nxt = addDays(nextStartVisibility(addDays(start, -adj), lat, lon), adj);
        if (nxt <= day) { start = nxt; nxt = addDays(nextStartVisibility(addDays(nxt, -adj), lat, lon), adj); }
        const h = toHijri(addDays(start, 10));
        return { debut: start, mois: h.m, annee: h.y, duree: diffDays(nxt, start), known: false, est_next: nxt };
      }
      nmT = A.SearchMoonPhase(0, new Date(nmT.getTime() - 31 * DAY), 30).date;
    }
    throw new Error('month not found');
  }
  const base = addDays(day, -adj);
  const u = uqMonth(base);
  return { ...u, debut: addDays(u.debut, adj), known: true };
}

export function following(cur, cfg, official, n = 6) {
  const mode = cfg.hijri_mode || 'ummalqura';
  const [lat, lon] = mode === 'morocco' ? [33.5731, -7.5898] : [cfg.lat, cfg.lon];
  const out = [];
  let m = cur.mois, y = cur.annee;
  let start = cur.duree ? addDays(cur.debut, cur.duree) : cur.est_next;
  for (let i = 0; i < n; i++) {
    [m, y] = m === 12 ? [1, y + 1] : [m + 1, y];
    const off = (official || []).find(o => o.mois === m && o.annee === y);
    if (off) start = off.debut;
    out.push({ mois: m, annee: y, debut: start, official: !!off });
    if (mode === 'ummalqura') { const nx = monthAt(start, cfg); start = addDays(nx.debut, nx.duree); }
    else {
      const adj = mode === 'visibility' ? parseInt(cfg.hijri_adjust || 0) : 0;
      start = addDays(nextStartVisibility(addDays(start, -adj), lat, lon), adj);
    }
  }
  return out;
}

export function parseHabousHijri(text) {
  const re = /debut:\s*'(\d{4})-(\d\d)-(\d\d)',\s*mois:\s*(\d+),\s*annee:\s*(\d+),\s*duree:\s*(null|\d+)/g;
  const out = []; let m;
  while ((m = re.exec(text || ''))) out.push({ debut: civ(+m[1], +m[2], +m[3]), mois: +m[4], annee: +m[5], duree: m[6] === 'null' ? null : +m[6] });
  return out;
}
