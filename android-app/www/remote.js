// D-pad / remote-control navigation for the phone layout when it runs on a TV (Android TV / TV Box).
// Arrows move the focus to the nearest control in that direction; when there is none, the page scrolls.
// Text fields open the on-screen keyboard only after OK (Enter), so the arrows never get trapped.
const TEXT = el => el && ((el.tagName === 'INPUT' && !['checkbox', 'radio', 'button', 'submit', 'range', 'color', 'file'].includes(el.type)) || el.tagName === 'TEXTAREA');
let remote = false, lastNav = 0;

function visible(el) {
  if (el.disabled || el.closest('.hide,[hidden]')) return false;
  const d = el.closest('details'); if (d && !d.open && el.tagName !== 'SUMMARY') return false;     // closed section
  const r = el.getBoundingClientRect();
  if (!r.width || !r.height) return false;
  const s = getComputedStyle(el);
  return s.visibility !== 'hidden' && s.display !== 'none';
}
function focusables() {
  return [...document.querySelectorAll('button,select,input,textarea,summary,a[href],[tabindex]:not([tabindex="-1"])')]
    .filter(e => e.type !== 'file' && e.type !== 'hidden' && visible(e));
}
function scroller(el) {
  for (let p = el && el.parentElement; p && p !== document.body; p = p.parentElement) {
    const s = getComputedStyle(p);
    if (/(auto|scroll)/.test(s.overflowY) && p.scrollHeight > p.clientHeight + 4) return p;
  }
  let best = null;                                       // e.g. focus on the bottom bar: scroll the main content
  for (const p of document.querySelectorAll('main,section,div,article')) {
    const s = getComputedStyle(p);
    if (/(auto|scroll)/.test(s.overflowY) && p.scrollHeight > p.clientHeight + 4 && (!best || p.clientHeight > best.clientHeight)) best = p;
  }
  return best || document.scrollingElement || document.documentElement;
}
function go(el) {
  if (TEXT(el)) { el.readOnly = true; el.dataset.kmro = '1'; }
  el.focus({ preventScroll: true });
  el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
}

import * as PK from './picker.js';
const isTV = () => localStorage.getItem('mode') === 'tv' || document.body.classList.contains('tv');
export function enableRemote() {
  if (!isTV()) PK.takeOverSelects();
  document.addEventListener('keydown', e => {
    if (isTV()) return;     // the mosque display has its own navigation (otherwise every press moves the focus twice)
    if (PK.pickerKey(e)) return;
    if ((e.key === 'Enter' || e.key === ' ') && document.activeElement && document.activeElement.tagName === 'SELECT') { e.preventDefault(); PK.openPicker(document.activeElement); return; }
    const dir = { ArrowDown: [0, 1], ArrowUp: [0, -1], ArrowLeft: [-1, 0], ArrowRight: [1, 0] }[e.key];
    const el = document.activeElement && document.activeElement !== document.body ? document.activeElement : null;
    if (e.key === 'Enter' && el && TEXT(el) && el.readOnly && el.dataset.kmro) {      // OK on a text field: start typing
      e.preventDefault(); el.readOnly = false; el.blur(); el.focus(); el.click(); return;
    }
    if (!dir) return;
    const tNow = performance.now();                    // one press = one step (no repeat bursts)
    if ((e.repeat && tNow - lastNav < 260) || tNow - lastNav < 110) { e.preventDefault(); return; }
    lastNav = tNow;
    remote = true;
    const typing = el && TEXT(el) && !el.readOnly;
    if (typing && (el.tagName === 'TEXTAREA' || dir[0])) return;          // let the cursor move inside the text
    e.preventDefault();
    const list = focusables();
    if (!el || !list.includes(el)) {                                       // nothing focused yet: first control on screen
      const onScreen = list.filter(x => { const r = x.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; });
      const first = onScreen.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[0] || list[0];
      if (first) go(first);
      return;
    }
    const r0 = el.getBoundingClientRect(), c0 = [r0.left + r0.width / 2, r0.top + r0.height / 2];
    let best = null, bs = 1e9;
    for (const x of list) {
      if (x === el) continue;
      if (dir[1] < 0 && !el.closest('nav') && x.closest('nav')) continue;      // «up» stays in the page content
      const r = x.getBoundingClientRect(), c = [r.left + r.width / 2, r.top + r.height / 2];
      const dx = c[0] - c0[0], dy = c[1] - c0[1], along = dx * dir[0] + dy * dir[1], across = Math.abs(dx * dir[1] + dy * dir[0]);
      if (along <= 4) continue;
      const far = dir[1] && (r.bottom < -innerHeight * 0.6 || r.top > innerHeight * 1.6);     // too far off screen: scroll first
      if (far) continue;
      const s = along + across * 2.5;
      if (s < bs) { bs = s; best = x; }
    }
    if (best) go(best);
    else if (dir[1]) { const sc = scroller(el); sc.scrollTop += dir[1] * Math.round(innerHeight * 0.45); }
  }, true);
  document.addEventListener('focusout', e => {           // keep touch typing normal
    const el = e.target; if (isTV()) return; if (TEXT(el) && el.dataset.kmro) { el.readOnly = false; delete el.dataset.kmro; }
  });
  const st = document.createElement('style');
  st.textContent = ':focus-visible,select:focus,button:focus{outline:3px solid #e0a100 !important;outline-offset:2px}';
  document.head.appendChild(st);
}
export const usingRemote = () => remote;
