// Option list drawn by the app itself, replacing the native <select> pop-up.
// Some Android TV WebViews open the native list but keep sending the remote's arrows to the page,
// so ▼ left the list and jumped to the next field. This list is plain buttons the app controls.
let box = null, sel = null, prevFocus = null;

const CSS = `#km-pick{position:fixed;top:0;right:0;bottom:0;left:0;z-index:10000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;direction:rtl}
#km-pick .pk{background:#fff;color:#1d2b36;border-radius:16px;width:560px;max-width:90vw;max-height:84vh;display:flex;flex-direction:column;box-shadow:0 10px 40px rgba(0,0,0,.5);font-family:'Noto Kufi Arabic',sans-serif}
#km-pick h4{margin:0;padding:14px 20px;font-size:18px;color:#0f5e4f;border-bottom:2px solid #e6ecef}
#km-pick .ls{overflow-y:auto;padding:8px}
#km-pick button{display:block;width:100%;text-align:right;font:inherit;font-size:18px;padding:10px 16px;margin:3px 0;border:2px solid transparent;border-radius:10px;background:#f4f7f8;color:#1d2b36}
#km-pick button.cur{background:#e3f1ec;color:#0f5e4f;font-weight:700}
#km-pick button.cur:after{content:' ✓'}
#km-pick button:focus{outline:none;border-color:#e0a100;background:#fff6dc;box-shadow:0 0 0 3px rgba(224,161,0,.35)}
#km-pick small{display:block;padding:8px 20px 12px;color:#789;font-size:13px}`;

export const pickerOpen = () => !!box;

export function openPicker(select) {
  if (box || !select || select.disabled) return;
  sel = select; prevFocus = document.activeElement;
  if (!document.getElementById('km-pick-css')) { const s = document.createElement('style'); s.id = 'km-pick-css'; s.textContent = CSS; document.head.appendChild(s); }
  const label = select.closest('label');
  const title = label ? (label.childNodes[0] && label.childNodes[0].textContent || '').trim() : '';
  box = document.createElement('div'); box.id = 'km-pick';
  const opts = Array.prototype.slice.call(select.options);
  box.innerHTML = `<div class="pk">${title ? `<h4></h4>` : ''}<div class="ls">${opts.map((o, i) =>
    `<button data-i="${i}"${i === select.selectedIndex ? ' class="cur"' : ''}${o.disabled ? ' disabled' : ''}></button>`).join('')}</div>
    <small>▲▼ للاختيار · OK للتأكيد · الرجوع للإلغاء</small></div>`;
  if (title) box.querySelector('h4').textContent = title;
  const bs = box.querySelectorAll('button');
  opts.forEach((o, i) => { bs[i].textContent = o.textContent; });
  box.addEventListener('click', e => {
    const b = e.target.closest ? e.target.closest('button') : null;
    if (b) choose(+b.dataset.i); else if (e.target === box) closePicker();
  });
  document.body.appendChild(box);
  const cur = bs[Math.max(0, select.selectedIndex)] || bs[0];
  if (cur) { cur.focus(); cur.scrollIntoView({ block: 'center' }); }
}

function choose(i) {
  const s = sel;
  closePicker();
  if (s && s.selectedIndex !== i) { s.selectedIndex = i; s.dispatchEvent(new Event('change', { bubbles: true })); }
}

export function closePicker() {
  if (!box) return;
  box.remove(); box = null;
  const back = sel || prevFocus; sel = null;
  if (back && back.focus) back.focus({ preventScroll: true });
}

// keys while the list is open: returns true when the key was used
export function pickerKey(e) {
  if (!box) return false;
  const bs = Array.prototype.slice.call(box.querySelectorAll('button:not([disabled])'));
  let i = bs.indexOf(document.activeElement);
  const k = e.key;
  e.preventDefault(); e.stopPropagation();
  if (k === 'ArrowDown' || k === 'ArrowLeft') i = Math.min(bs.length - 1, i + 1);
  else if (k === 'ArrowUp' || k === 'ArrowRight') i = Math.max(0, i - 1);
  else if (k === 'PageDown') i = Math.min(bs.length - 1, i + 8);
  else if (k === 'PageUp') i = Math.max(0, i - 8);
  else if (k === 'Enter' || k === ' ') { if (i >= 0) choose(+bs[i].dataset.i); return true; }
  else if (k === 'Escape' || k === 'GoBack' || k === 'BrowserBack' || k === 'Backspace') { closePicker(); return true; }
  else return true;
  if (i < 0) i = 0;
  bs[i].focus({ preventScroll: true }); bs[i].scrollIntoView({ block: 'nearest' });
  return true;
}

// every <select> on the page opens this list instead of the native one (remote OK, touch and mouse)
export function takeOverSelects(root = document) {
  const stop = e => {
    const s = e.target && e.target.tagName === 'SELECT' ? e.target : null;
    if (!s || s.disabled) return;
    e.preventDefault(); e.stopPropagation();
    if (e.type === 'click' || e.type === 'touchend') openPicker(s);
  };
  for (const t of ['mousedown', 'touchstart', 'touchend', 'click']) root.addEventListener(t, stop, true);
}
