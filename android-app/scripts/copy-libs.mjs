import fs from 'fs';
fs.mkdirSync('www/lib', { recursive: true });
fs.copyFileSync('node_modules/astronomy-engine/astronomy.browser.min.js', 'www/lib/astronomy.browser.min.js');
console.log('libs copied');
