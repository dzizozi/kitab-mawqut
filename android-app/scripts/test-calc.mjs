import { createRequire } from 'module';
const require = createRequire(import.meta.url);
globalThis.Astronomy = require('astronomy-engine');
const { times } = await import('../www/engine/calc.js');
const cases = JSON.parse(process.argv[2]);
const out = cases.map(c => times(c.lat, c.lon, c.y, c.m, c.d, c.method, c.asr, c.tz));
console.log(JSON.stringify(out));
