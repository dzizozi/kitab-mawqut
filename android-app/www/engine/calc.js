// Prayer-time calculation – JS port of mawaqit/calc.py (astronomy-engine instead of PyEphem).
import { S } from './shared.js';
const A = globalThis.Astronomy;
export const KEYS = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
const DAY = 86400000;

// civil date (y,m,d) -> approximate local noon in UTC from longitude
function localNoonUTC(y, m, d, lon) { return new Date(Date.UTC(y, m - 1, d, 12) - lon / 15 * 3600000); }

function altEvent(obs, start, dir, alt, limitDays = 1) {
  const r = A.SearchAltitude(A.Body.Sun, obs, dir, start, limitDays, alt);
  return r ? r.date : null;
}

export function rawEvents(lat, lon, y, m, d, method) {
  const M = S.METHODS[method];
  const obs = new A.Observer(lat, lon, 0);
  const t0 = new Date(localNoonUTC(y, m, d, lon).getTime() - DAY / 2);
  const transit = A.SearchHourAngle(A.Body.Sun, obs, 0, t0).time.date;
  const back = new Date(transit.getTime() - DAY / 2);
  // sunrise/sunset: general = centre at -50' ; Morocco calibration = upper limb at -50' without refraction
  const hz = method === 'MOROCCO' ? -(50 + 16.2) / 60 : -50 / 60;
  const sunrise = altEvent(obs, back, +1, hz);
  const sunset = altEvent(obs, transit, -1, hz);
  const eq = A.Equator(A.Body.Sun, transit, obs, true, true);
  const decl = eq.dec * Math.PI / 180, phi = lat * Math.PI / 180;
  const noonAlt = Math.PI / 2 - Math.abs(phi - decl);
  const out = { dhuhr: transit, sunrise, maghrib: sunset };
  for (const f of [1, 2]) {
    const a = Math.atan(1 / (f + 1 / Math.tan(noonAlt))) * 180 / Math.PI;
    out['asr' + f] = altEvent(obs, transit, -1, a);
  }
  out.fajr = altEvent(obs, back, +1, -M.fajr);
  if (M.maghrib) out.maghrib = altEvent(obs, transit, -1, -M.maghrib);
  if (M.isha) out.isha = altEvent(obs, transit, -1, -M.isha);
  if (sunrise && sunset) {           // high latitudes: angle-based rule
    const night = DAY - (sunset - sunrise);
    const lf = night * M.fajr / 60;
    if (!out.fajr || (Math.abs(lat) > 48 && sunrise - out.fajr > lf)) out.fajr = new Date(sunrise - lf);
    if (M.isha) {
      const li = night * M.isha / 60;
      if (!out.isha || (Math.abs(lat) > 48 && out.isha - sunset > li)) out.isha = new Date(sunset.getTime() + li);
    }
  }
  return out;
}

// minutes since local midnight in IANA time zone
function localMinutes(date, tz) {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' })
    .formatToParts(date).reduce((o, x) => (o[x.type] = x.value, o), {});
  return +p.hour * 60 + +p.minute + +p.second / 60;
}
const R = { round: Math.round, ceil: Math.ceil, floor: Math.floor };
const hhmm = m => { m = ((m % 1440) + 1440) % 1440; return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); };

export function times(lat, lon, y, m, d, method = 'MWL', asr = 1, tz = 'UTC', tune = {}, ramadan = false, plus = 0) {
  const M = S.METHODS[method];
  const ev = rawEvents(lat, lon, y, m, d, method);
  return KEYS.map(k => {
    let v = k === 'asr' ? ev['asr' + asr] : ev[k];
    if (k === 'isha' && M.isha_min) v = ev.maghrib && new Date(ev.maghrib.getTime() + ((ramadan && M.isha_min_ramadan) || M.isha_min) * 60000);
    if (!v) return '--:--';
    let mins, off, mode;
    if (method === 'MOROCCO') {           // Ministry tables are published in GMT
      mins = v.getUTCHours() * 60 + v.getUTCMinutes() + v.getUTCSeconds() / 60 + plus;
      [off, mode] = S.MOROCCO_CALIB[k];
    } else {
      mins = localMinutes(v, tz) + plus; off = (M.adj || {})[k] || 0; mode = 'round';
    }
    return hhmm(R[mode](mins + off + (tune[k] || 0)));
  });
}
