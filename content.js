// Translatable Cards for Simkl v1.5.0
// Simkl paints card text with CSS (e.g. item-2-2-1::after { content: var(--description) }),
// which Chrome Translate can't see. We put the same text into real <span>s and hide the CSS copy.
// To look identical, we MIRROR Simkl's own CSS rules for those pseudo-elements onto the spans
// (same media queries, hover states, transitions, fonts, colors…) instead of hard-coding styles.
(() => {
  'use strict';

  // Which elements' pseudo-elements we convert. Text comes from the CSS variable each one shows.
  const TARGETS = ['item-2-2-1'];          // genres (::before) + description (::after)
  const PSEUDOS = ['before', 'after'];
  const BASE_ID = 'stc-base';
  const MIRROR_ID = 'stc-mirror';
  const ITEM_SEL = 'a.SimklItem';
  const cls = (t, p) => `stc-${t}-${p}`;    // span class, also used as container flag class

  let enabled = false;
  let descScale = 100;                      // user setting: description text size in %
  const SIZE_ID = 'stc-size';
  const DESC_KEY = 'stc-item-2-2-1-after';  // span that holds the description
  let sizeSig = '';
  let observer = null;
  let scheduled = false;
  let mirrorReady = null;                   // Promise while building
  let sheetsSig = '';
  const sheetCache = new Map();             // href -> Promise<CSSRuleList|null>
  // Only Simkl's own stylesheets matter; ignore <style> tags other extensions/Translate inject.
  const relevantSheet = s => {
    const n = s.ownerNode; if (!n || n.id === BASE_ID || n.id === MIRROR_ID) return false;
    if (s.href) return /(^|\.)simkl\.(in|com)$/.test(new URL(s.href).hostname);
    return !n.id && !n.className;           // Simkl's anonymous inline <style> blocks
  };

  // ---------- helpers ----------
  function cssString(raw) {
    let s = (raw || '').trim();
    if (s.length >= 2 && (s[0] === "'" || s[0] === '"') && s[s.length - 1] === s[0]) s = s.slice(1, -1);
    return s.replace(/\\([0-9a-fA-F]{1,6})\s?|\\\n|\\(.)/g, (m, hex, ch) => {
      if (hex) { const cp = parseInt(hex, 16); return cp === 0 || cp > 0x10FFFF ? '�' : String.fromCodePoint(cp); }
      return ch !== undefined ? ch : '';
    }).replace(/[ \t]*\n[ \t]*/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }
  const isOwn = n => { const el = n && (n.nodeType === 1 ? n : n.parentElement); return !!(el && el.closest && el.closest('[data-stc]')); };

  // ---------- base CSS: hide original pseudo text, show spans only where it applied ----------
  function baseCss() {
    let css = '[data-stc]{display:none}';
    for (const t of TARGETS) for (const p of PSEUDOS) {
      const c = cls(t, p);
      css += `simklitems.${c}-on ${t}::${p}{content:none!important}`;
      css += `simklitems.${c}-on ${t} > .${c}{display:block;unicode-bidi:plaintext;white-space:pre-line}`;
    }
    // When translated to an RTL language, align to the start of the (Arabic) text.
    // Direction is decided per span from its actual (possibly translated) text – see setDir().
    css += 'simklitems [data-stc][dir="rtl"]{direction:rtl!important;text-align:right!important;align-self:stretch!important}';
    css += 'simklitems [data-stc][dir="ltr"]{direction:ltr!important;text-align:left!important}';
    return css;
  }

  // ---------- mirror Simkl's pseudo-element rules onto the spans ----------
  function rewriteSelector(sel) {
    // split on top-level commas only
    const parts = []; let depth = 0, cur = '';
    for (const ch of sel) {
      if (ch === '(') depth++; else if (ch === ')') depth--;
      if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; } else cur += ch;
    }
    parts.push(cur);
    const out = [];
    for (let s of parts) {
      s = s.trim();
      const pm = s.match(/::?(before|after)$/);
      if (!pm) continue;
      const p = pm[1];
      const head = s.slice(0, pm.index);
      for (const t of TARGETS) {
        const re = new RegExp(`(^|[\\s>+~])${t}((?:[.#\\[]|:(?!:))[^\\s>+~]*)?$`);
        if (re.test(head)) out.push(`${head} > .${cls(t, p)}`);
      }
    }
    return out.join(', ');
  }

  function mirrorRules(rules) {
    let css = '';
    for (const r of rules) {
      if (r.selectorText !== undefined && r.style) {
        if (!/::?(before|after)/.test(r.selectorText) || !TARGETS.some(t => r.selectorText.includes(t))) continue;
        const sel = rewriteSelector(r.selectorText);
        if (!sel) continue;
        const decls = r.style.cssText.split(';').filter(d => d.trim() && !/^\s*content\s*:/i.test(d)).join(';');
        if (decls.replace(/;/g, '').trim()) css += `${sel}{${decls}}\n`;
      } else if (r.cssRules) {
        const inner = mirrorRules(r.cssRules);
        if (!inner) continue;
        if (r instanceof CSSMediaRule) css += `@media ${(r.media && r.media.mediaText) || 'all'}{${inner}}\n`;
        else if (typeof CSSSupportsRule !== 'undefined' && r instanceof CSSSupportsRule) css += `@supports ${r.conditionText}{${inner}}\n`;
        else if (typeof CSSContainerRule !== 'undefined' && r instanceof CSSContainerRule) css += `@container ${r.conditionText}{${inner}}\n`;
        else css += inner;
      }
    }
    return css;
  }

  async function rulesOf(sheet) {
    try { return sheet.cssRules; } catch (_) { /* cross-origin */ }
    if (!sheet.href) return null;
    if (!sheetCache.has(sheet.href)) {
      sheetCache.set(sheet.href, (async () => {
        try {
          // The page already downloaded this stylesheet; 'force-cache' reuses that copy
          // instead of asking Simkl's servers again.
          const txt = await (await fetch(sheet.href, { credentials: 'omit', cache: 'force-cache' })).text();
          const cs = new CSSStyleSheet();
          cs.replaceSync(txt);
          return cs.cssRules;
        } catch (_) { return null; }
      })());
    }
    return sheetCache.get(sheet.href);
  }

  async function buildMirror() {
    const sheets = [...document.styleSheets].filter(relevantSheet);
    let css = '';
    for (const s of sheets) {
      const rules = await rulesOf(s);
      if (rules) css += mirrorRules(rules);
    }
    let st = document.getElementById(MIRROR_ID);
    if (!st) { st = document.createElement('style'); st.id = MIRROR_ID; document.head.appendChild(st); }
    st.textContent = css;
  }

  function sheetsSignature() {
    return [...document.styleSheets].filter(relevantSheet)
      .map(s => s.href || ('s' + (s.ownerNode.textContent || '').length)).join('|');
  }
  function refreshMirror() {
    const sig = sheetsSignature();
    if (sig === sheetsSig && mirrorReady) return mirrorReady;
    sheetsSig = sig;
    mirrorReady = buildMirror().catch(() => {});
    return mirrorReady;
  }

  // ---------- detect which pseudo shows which CSS variable (per list container) ----------
  function detect(container) {
    const flags = [];
    for (const t of TARGETS) for (const p of PSEUDOS) flags.push(cls(t, p) + '-on');
    container.classList.remove(...flags);           // reveal original pseudos to inspect them
    const map = {};
    const sample = container.querySelector(ITEM_SEL);
    if (sample) {
      const vars = [...sample.style].filter(v => v.startsWith('--'));
      for (const t of TARGETS) {
        const el = sample.querySelector(t);
        if (!el) continue;
        for (const p of PSEUDOS) {
          const c = getComputedStyle(el, '::' + p).content;
          if (!c || c === 'none' || c === 'normal' || c === '""' || !/^["']/.test(c)) continue;
          const txt = cssString(c);
          const v = vars.find(n => { const val = cssString(sample.style.getPropertyValue(n)); return val.length > 1 && val === txt; });
          if (v) map[cls(t, p)] = { t, p, v };
        }
      }
    }
    // drop spans that no longer apply (e.g. switched from Card to Poster view)
    container.querySelectorAll('[data-stc]').forEach(n => { if (!map[n.className]) n.remove(); });
    container._stcMap = map;
    container.classList.add(...Object.keys(map).map(k => k + '-on'));
    container._stcSig = container.className;
    return map;
  }

  // ---------- inject spans ----------
  function processItem(a, map) {
    for (const key in map) {
      const { t, v } = map[key];
      const box = a.querySelector(t);
      if (!box) continue;
      const raw = a.style.getPropertyValue(v);
      let span = box.querySelector(`:scope > .${key}`);
      if (span && span.dataset.src === raw) continue;   // unchanged → keep existing translation
      if (!span) {
        span = document.createElement('span');
        span.className = key; span.dataset.stc = '';
        if (map[key].p === 'before') box.prepend(span); else box.append(span);
      }
      span.dataset.src = raw;
      span.textContent = cssString(raw);
      setDir(span);
    }
  }

  function scan() {
    scheduled = false;
    if (!enabled) return;
    refreshMirror();
    for (const c of document.querySelectorAll('simklitems')) {
      const map = (c._stcMap && c._stcSig === c.className) ? c._stcMap : detect(c);
      if (!Object.keys(map).length) continue;
      c.querySelectorAll(ITEM_SEL).forEach(a => processItem(a, map));
    }
    applySize();
    document.querySelectorAll('[data-stc]').forEach(setDir);
  }

  // ---------- user text-size setting ----------
  // Reads Simkl's own description size for the current layout/screen width, then scales it.
  function applySize() {
    let css = '';
    if (enabled && descScale !== 100) {
      const c = [...document.querySelectorAll('simklitems')].find(x => x._stcMap && x._stcMap[DESC_KEY]);
      const box = c && c.querySelector(`${ITEM_SEL} ${c._stcMap[DESC_KEY].t}`);
      const base = box && parseFloat(getComputedStyle(box, '::after').fontSize);
      if (base) css = `simklitems.${DESC_KEY}-on item-2-2-1 > .${DESC_KEY}{font-size:${(base * descScale / 100).toFixed(2)}px!important}`;
    }
    if (css === sizeSig) return;
    sizeSig = css;
    let st = document.getElementById(SIZE_ID);
    if (!css) { st && st.remove(); return; }
    if (!st) { st = document.createElement('style'); st.id = SIZE_ID; document.head.appendChild(st); }
    st.textContent = css;
  }
  // ---------- text direction (for RTL translations: Arabic, Hebrew, Persian, Urdu…) ----------
  const RTL_RE = /[\u0590-\u08FF\uFB1D-\uFDFF\uFE70-\uFEFF]/g;
  const LTR_RE = /[A-Za-z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF]/g;
  function setDir(span) {
    const t = span.textContent || '';
    const rtl = (t.match(RTL_RE) || []).length, ltr = (t.match(LTR_RE) || []).length;
    const dir = rtl > ltr ? 'rtl' : 'ltr';
    if (span.getAttribute('dir') !== dir) span.setAttribute('dir', dir);
  }
  const dirQueue = new Set();
  let dirScheduled = false;
  function queueDir(span) {
    dirQueue.add(span);
    if (!dirScheduled) {
      dirScheduled = true;
      requestAnimationFrame(() => { dirScheduled = false; dirQueue.forEach(setDir); dirQueue.clear(); });
    }
  }

  function schedule() { if (!scheduled && enabled) { scheduled = true; requestAnimationFrame(scan); } }

  // ---------- on / off ----------
  function onResize() { document.querySelectorAll('simklitems').forEach(c => { c._stcSig = null; }); schedule(); }

  function enable() {
    if (enabled) return;
    enabled = true;
    if (!document.getElementById(BASE_ID)) {
      const st = document.createElement('style'); st.id = BASE_ID; st.textContent = baseCss();
      document.head.appendChild(st);
    }
    observer = new MutationObserver(muts => {
      // Go through EVERY mutation in the batch (Chrome Translate sends large batches);
      // never stop early, or changes to our spans get missed.
      let needScan = false;
      for (const m of muts) {
        if (isOwn(m.target)) {                      // Chrome Translate rewriting our spans
          const n = m.target.nodeType === 1 ? m.target : m.target.parentElement;
          const span = n && n.closest('[data-stc]');
          if (span) queueDir(span);
          continue;
        }
        if (needScan) continue;
        if (m.type === 'attributes') {
          const el = m.target;
          if (m.attributeName === 'class' && el.tagName === 'SIMKLITEMS') {
            // ignore our own flag changes
            const clean = s => (s || '').split(/\s+/).filter(x => !x.startsWith('stc-')).sort().join(' ');
            if (clean(m.oldValue) !== clean(el.className)) { el._stcSig = null; needScan = true; }
          } else if (m.attributeName === 'style' && el.matches(ITEM_SEL)) needScan = true;
          continue;
        }
        for (const n of m.addedNodes) if (n.nodeType === 1 && !isOwn(n)) { needScan = true; break; }
      }
      if (needScan) schedule();
    });
    observer.observe(document.documentElement, {
      childList: true, subtree: true, characterData: true, attributes: true, attributeOldValue: true, attributeFilter: ['style', 'class']
    });
    addEventListener('resize', onResize);
    sheetsSig = ''; mirrorReady = null;
    scan();
  }

  function disable() {
    if (!enabled) return;
    enabled = false;
    observer && observer.disconnect(); observer = null;
    removeEventListener('resize', onResize);
    document.getElementById(BASE_ID)?.remove();
    document.getElementById(MIRROR_ID)?.remove();
    document.getElementById(SIZE_ID)?.remove(); sizeSig = '';
    document.querySelectorAll('[data-stc]').forEach(n => n.remove());
    document.querySelectorAll('simklitems').forEach(c => {
      c.classList.remove(...[...c.classList].filter(x => x.startsWith('stc-')));
      c._stcMap = null; c._stcSig = null;
    });
    mirrorReady = null;
  }

  const apply = v => (v === false ? disable() : enable());
  try {
    chrome.storage.local.get({ enabled: true, descScale: 100 }, r => { descScale = +r.descScale || 100; apply(r.enabled); });
    // Remove data left by the "Full description" feature of v1.4 (setting + cached texts).
    chrome.storage.local.get(null, all => {
      const old = Object.keys(all || {}).filter(k => k === 'fullDesc' || k.startsWith('fd:'));
      if (old.length) chrome.storage.local.remove(old);
    });
    chrome.storage.onChanged.addListener((ch, area) => {
      if (area !== 'local') return;
      if ('descScale' in ch) { descScale = +ch.descScale.newValue || 100; applySize(); }
      if ('enabled' in ch) apply(ch.enabled.newValue);
    });
  } catch (_) { enable(); }
})();
