// Make the copied web assets run on old Android TV WebViews (Chrome 63+, e.g. Android 9 TV boxes with WebView 66).
// Run after `npx cap copy android` / `npx cap sync android`. Sources in www/ stay modern; only the APK copy is lowered.
//  - JavaScript syntax lowered with esbuild (?. ?? etc.), ES modules kept.
//  - CSS shorthand `inset:` (Chrome 87) expanded to top/right/bottom/left in JS template strings and HTML.
//  - small polyfills (globalThis, Object.fromEntries, Array.flat/flatMap) loaded before the modules.
import { transform } from 'esbuild';
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'android', 'app', 'src', 'main', 'assets', 'public');
const TARGET = 'chrome63';

const insetFix = s => s
  .replace(/inset:\s*0(?![.\d])/g, 'top:0;right:0;bottom:0;left:0')
  .replace(/inset:\s*auto/g, 'top:auto;right:auto;bottom:auto;left:auto');

const POLY = `(function(){var g=typeof globalThis!=='undefined'?globalThis:typeof self!=='undefined'?self:window;
if(typeof globalThis==='undefined'){g.globalThis=g;}
if(!Object.fromEntries){Object.fromEntries=function(it){var o={};Array.from(it).forEach(function(p){o[p[0]]=p[1];});return o;};}
if(!Array.prototype.flat){Object.defineProperty(Array.prototype,'flat',{configurable:true,writable:true,value:function(d){d=d===undefined?1:d;return d>0?this.reduce(function(a,v){return a.concat(Array.isArray(v)?v.flat(d-1):v);},[]):this.slice();}});}
if(!Array.prototype.flatMap){Object.defineProperty(Array.prototype,'flatMap',{configurable:true,writable:true,value:function(f,t){return this.map(f,t).flat();}});}
if(!String.prototype.replaceAll){String.prototype.replaceAll=function(a,b){return this.split(a).join(b);};}
})();`;

// KM_DEBUG=1: show JavaScript errors on the screen (release builds have no console in logcat)
const DEBUG = `<script>window.__errs=[];function __show(m){window.__errs.push(m);var d=document.getElementById("__err");if(!d){d=document.createElement("pre");d.id="__err";(document.body||document.documentElement).appendChild(d);}d.style.cssText="position:fixed;z-index:99999;top:0;left:0;right:0;background:#fff;color:#b00;font:16px monospace;white-space:pre-wrap;direction:ltr;padding:8px";d.textContent=window.__errs.join("\\n")}
window.addEventListener("error",function(e){__show("ERR "+e.message+" @"+(e.filename||"").split("/").pop()+":"+e.lineno+":"+e.colno)},true);
window.addEventListener("unhandledrejection",function(e){__show("REJ "+(e.reason&&(e.reason.stack||e.reason.message)||e.reason))});
document.addEventListener("focusin",function(e){var t=e.target,f=document.getElementById("__foc");if(!f){f=document.createElement("b");f.id="__foc";document.body.appendChild(f);}f.style.cssText="position:fixed;z-index:99999;bottom:0;right:0;background:#000;color:#ff0;font:20px monospace;padding:4px 10px;direction:ltr";f.textContent="focus: "+(t.id||(t.dataset&&(t.dataset.zone||t.dataset.i))||t.tagName)},true);
var __ce=console.error;console.error=function(){__show("CE "+Array.prototype.map.call(arguments,function(a){return a&&a.stack||String(a)}).join(" "));__ce.apply(console,arguments)};</script>
`;
const walk = d => readdirSync(d).flatMap(n => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
let js = 0, html = 0;
for (const f of walk(OUT)) {
  const rel = f.slice(OUT.length + 1).replace(/\\/g, '/');
  if (rel.startsWith('lib/') || rel.startsWith('data/') || rel.startsWith('fonts/') || rel.startsWith('cordova') || rel === 'native-bridge.js') continue;
  if (f.endsWith('.js')) {
    const src = readFileSync(f, 'utf8');
    const r = await transform(src, { target: TARGET, format: 'esm', loader: 'js', charset: 'utf8', legalComments: 'inline' });
    writeFileSync(f, insetFix(r.code)); js++;
  } else if (f.endsWith('.html')) {
    let s = insetFix(readFileSync(f, 'utf8'));
    if (rel === 'index.html' && !s.includes('legacy-poly')) s = s.replace('<script', `${process.env.KM_DEBUG ? DEBUG : ''}<script id="legacy-poly">${POLY}</script>\n<script`);
    writeFileSync(f, s); html++;
  }
}
writeFileSync(join(OUT, 'legacy.txt'), `lowered to ${TARGET}: ${js} js, ${html} html\n`);
console.log(`legacy: ${js} js + ${html} html lowered to ${TARGET}`);
