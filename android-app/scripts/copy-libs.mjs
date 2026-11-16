import fs from 'fs';
fs.mkdirSync('www/lib', { recursive: true });
fs.copyFileSync('node_modules/astronomy-engine/astronomy.browser.min.js', 'www/lib/astronomy.browser.min.js');
// gunzip for old WebViews without DecompressionStream (fflate, MIT): tree-shaken ESM, ~10 KB
const { buildSync } = await import('esbuild');
buildSync({ stdin: { contents: "export { gunzipSync, strFromU8 } from 'fflate';", resolveDir: '.' }, bundle: true, format: 'esm', minify: true,
  target: 'chrome63', outfile: 'www/lib/gunzip.js', legalComments: 'inline' });
console.log('libs copied');
