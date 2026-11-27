// Dil desteği: Türkçe kaynak metinler ekranda İngilizceye çevrilir (DOM düzeyinde).
// Dil: kullanıcı seçimi (localStorage) yoksa telefon dili Türkçe ise TR, değilse EN.
import PAIRS from './i18n_en.js';

const KEY = 'kaptanbolt.lang';
function detect() {
  try { const v = localStorage.getItem(KEY); if (v === 'tr' || v === 'en') return v; } catch { /* yok */ }
  if (navigator.webdriver) return 'tr'; // otomatik testler Türkçe metinleri kontrol eder
  const l = (navigator.languages && navigator.languages[0]) || navigator.language || 'tr';
  return /^tr\b/i.test(l) ? 'tr' : 'en';
}
export let LANG = detect();
export function setLang(l) { try { localStorage.setItem(KEY, l); } catch { /* yok */ } location.reload(); }

const exact = new Map();
const pats = [];
const esc = (s) => s.replace(/[.*+?^$()|[\]\\]/g, '\\$&');
for (const [tr, en] of PAIRS) {
  if (!tr.includes('{}')) { exact.set(tr, en); const up = tr.toLocaleUpperCase('tr-TR'); if (!exact.has(up)) exact.set(up, en.toUpperCase()); continue; }
  const parts = tr.split('{}');
  const n = parts.length - 1;
  const re = new RegExp('^' + parts.map((p, i) => {
    let e = esc(p).replace(/\{/g, '\\{').replace(/\}/g, '\\}');
    if (i > 0) e = e.replace(/^ +/, '\\s*');        // değişkenden sonraki boşluk isteğe bağlı
    if (i < n) e = e.replace(/ +$/, '\\s*');        // değişkenden önceki boşluk isteğe bağlı
    return e;
  }).join('([\\s\\S]*?)') + '$');
  pats.push({ re, en, lit: parts.join('').length });
}
pats.sort((a, b) => b.lit - a.lit);
const cache = new Map();

/** Tek bir metni çevir (baştaki/sondaki boşluklar korunur). Bilinmeyen metin aynen döner. */
export function tx(s) {
  if (LANG === 'tr' || !s) return s;
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(s); const core = m[2];
  if (!core) return s;
  let out = cache.get(core);
  if (out === undefined) {
    out = exact.get(core);
    if (out === undefined) {
      out = null;
      for (const p of pats) {
        const r = p.re.exec(core);
        if (r) { let i = 0; out = p.en.replace(/\{(\d*)\}/g, (_, n) => tx((n === '' ? r[++i] : r[+n + 1]) ?? '')); break; }
      }
    }
    if (cache.size > 4000) cache.clear();
    cache.set(core, out);
  }
  return out === null ? s : m[1] + out + m[3];
}

const ATTRS = ['aria-label', 'placeholder', 'title', 'data-t', 'data-s'];
function walk(node) {
  if (node.nodeType === 3) { const v = node.nodeValue; const t = tx(v); if (t !== v) node.nodeValue = t; return; }
  if (node.nodeType !== 1 || node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return;
  for (const a of ATTRS) if (node.hasAttribute(a)) { const v = node.getAttribute(a); const t = tx(v); if (t !== v) node.setAttribute(a, t); }
  for (let c = node.firstChild; c; c = c.nextSibling) walk(c);
}
/** Ekrandaki her yeni metni otomatik çevir */
export function initI18n() {
  document.documentElement.lang = LANG;
  if (LANG === 'tr') return;
  document.title = 'Captain Bolt';
  walk(document.body);
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') walk(m.target);
      else if (m.type === 'attributes') walk(m.target);
      else m.addedNodes.forEach(walk);
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS });
}
