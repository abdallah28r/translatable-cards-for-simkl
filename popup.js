const toggle = document.getElementById('toggle');
const status = document.getElementById('status');
const size = document.getElementById('size');
const sizeVal = document.getElementById('sizeVal');
const sizeBox = document.getElementById('sizeBox');

function renderEnabled(on) {
  toggle.checked = on;
  status.textContent = on ? 'Enabled' : 'Disabled';
  sizeBox.classList.toggle('disabled', !on);
}
function renderSize(v) { size.value = v; sizeVal.textContent = v + '%'; }

chrome.storage.local.get({ enabled: true, descScale: 100 }, r => { renderEnabled(r.enabled); renderSize(r.descScale); requestAnimationFrame(() => document.body.classList.add("ready")); });

toggle.addEventListener('change', () => { chrome.storage.local.set({ enabled: toggle.checked }); renderEnabled(toggle.checked); });
size.addEventListener('input', () => { const v = +size.value; renderSize(v); chrome.storage.local.set({ descScale: v }); });
document.getElementById('reset').addEventListener('click', () => { renderSize(100); chrome.storage.local.set({ descScale: 100 }); });
