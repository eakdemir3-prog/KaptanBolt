// Günlük bulmaca: tarihten üretilen, internetsiz, her gün aynı bölüm
import { parseLevel, newState } from './rules.js';
import { shortest, fullCover } from './solver.js';

const THEMES = [
  { name: 'Pazar Karışığı', world: 9, o: { ice: 0.2, arrows: 0.2 } },
  { name: 'Pazartesi Klasiği', world: 2, o: {} },
  { name: 'Salı Buzu', world: 3, o: { ice: 0.4 } },
  { name: 'Çarşamba Kalesi', world: 5, o: { strong: 0.15 } },
  { name: 'Perşembe Köprüsü', world: 8, o: { bridge: true } },
  { name: 'Cuma Okları', world: 9, o: { arrows: 0.3 } },
  { name: 'Cumartesi Labirenti', world: 10, o: { ice: 0.2, strong: 0.1 } },
];

export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
export function yesterdayKey(d = new Date()) { const y = new Date(d); y.setDate(y.getDate() - 1); return dateKey(y); }

function rng(seed) { return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

function path(rnd, w, h, target) {
  const nb = (i) => { const x = i % w, y = (i / w) | 0, o = []; if (x > 0) o.push(i - 1); if (x < w - 1) o.push(i + 1); if (y > 0) o.push(i - w); if (y < h - 1) o.push(i + w); return o; };
  let best = [];
  for (let a = 0; a < 60 && best.length < target; a++) {
    const u = new Uint8Array(w * h), p = [Math.floor(rnd() * w * h)]; u[p[0]] = 1;
    while (p.length < target) {
      const o = nb(p[p.length - 1]).filter((n) => !u[n]); if (!o.length) break;
      o.sort((x, y) => (nb(x).filter((n) => !u[n]).length + rnd() * 2.2) - (nb(y).filter((n) => !u[n]).length + rnd() * 2.2));
      u[o[0]] = 1; p.push(o[0]);
    }
    if (p.length > best.length) best = p;
  }
  return best;
}

function build(rnd, o) {
  const w = 6, h = 6, len = 20 + Math.floor(rnd() * 9), keys = 1 + Math.floor(rnd() * 2);
  const p = path(rnd, w, h, len); if (p.length < len) return null;
  const g = Array.from({ length: h }, () => Array(w).fill('#'));
  const put = (i, c) => { g[(i / w) | 0][i % w] = c; }, get = (i) => g[(i / w) | 0][i % w];
  p.forEach((i) => put(i, '.')); put(p[0], 'S'); put(p[p.length - 1], 'D');
  const slots = []; for (let k = 2; k < p.length - 2; k++) slots.push(k);
  for (let k = 0; k < keys; k++) put(p[slots.splice(Math.floor(rnd() * slots.length), 1)[0]], 'K');
  if (o.ice) for (let k = 1; k < p.length - 1; k++) if (get(p[k]) === '.' && p[k] - p[k - 1] === p[k + 1] - p[k] && rnd() < o.ice) put(p[k], 'i');
  if (o.strong) for (let k = 1; k < p.length - 1; k++) if (get(p[k]) === '.' && rnd() < o.strong) put(p[k], 'o');
  if (o.bridge) {
    const kb = 2 + Math.floor(rnd() * Math.max(1, p.length / 2 - 2)); if (get(p[kb]) !== '.') return null; put(p[kb], 'b');
    let n = 0; for (let k = kb + 2; k < p.length - 1; k++) if (get(p[k]) === '.' && rnd() < 0.3) { put(p[k], '='); n++; }
    if (!n) return null;
  }
  if (o.arrows) for (let k = 1; k < p.length - 1; k++) if (get(p[k]) === '.' && rnd() < o.arrows) { const d = p[k + 1] - p[k]; put(p[k], d === 1 ? '>' : d === -1 ? '<' : d === w ? 'v' : '^'); }
  return g.map((r) => r.join(''));
}

/** Bugünün bulmacası. Çözülebilir ve 3 yıldız alınabilir olduğu çözücüyle doğrulanır. */
export function dailyLevel(d = new Date()) {
  const key = dateKey(d);
  const th = THEMES[d.getDay()];
  let seed = 0; for (const c of key) seed = (seed * 31 + c.charCodeAt(0)) | 0;
  const rnd = rng(seed);
  for (let attempt = 0; attempt < 60; attempt++) {
    const grid = build(rnd, th.o);
    if (!grid) continue;
    const lv = { id: 'daily', world: th.world, grid, daily: key, dailyName: th.name };
    const s = newState(parseLevel(lv));
    const sh = shortest(s, 200000, 400);
    if (!sh || sh.unknown || sh.moves.length < 6) continue;
    const fc = fullCover(s, 300000);
    if (!fc || !fc.moves) continue;
    return lv;
  }
  // olağan dışı durumda basit yedek bölüm
  return { id: 'daily', world: 1, grid: ['S....', '####.', 'K....', '.####', '....D'], daily: key, dailyName: th.name };
}
