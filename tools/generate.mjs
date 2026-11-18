// Bölüm üretici: node tools/generate.mjs  -> src/levels/levels.json
// Her bölüm çözücüyle doğrulanır: çözülebilir, 3 yıldızlık (tüm kareler) çözüm var, en kısa çözüm ve zorluk ölçülür.
import fs from 'node:fs';
import { parseLevel, newState } from '../src/logic/rules.js';
import { shortest, fullCover, failRate } from '../src/logic/solver.js';

let seed = 20261118;
const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));

function randomPath(w, h, target) {
  const N = w * h;
  const nb = (i) => { const x = i % w, y = (i / w) | 0, o = []; if (x > 0) o.push(i - 1); if (x < w - 1) o.push(i + 1); if (y > 0) o.push(i - w); if (y < h - 1) o.push(i + w); return o; };
  let best = [];
  for (let attempt = 0; attempt < 80; attempt++) {
    const used = new Uint8Array(N);
    const path = [ri(0, N - 1)]; used[path[0]] = 1;
    while (path.length < target) {
      const c = path[path.length - 1];
      const opts = nb(c).filter((n) => !used[n]);
      if (!opts.length) break;
      // Warnsdorff + rastgelelik: az çıkışlı kareleri tercih et
      opts.sort((a, b) => (nb(a).filter((n) => !used[n]).length + rnd() * 2.2) - (nb(b).filter((n) => !used[n]).length + rnd() * 2.2));
      const n = opts[0]; used[n] = 1; path.push(n);
    }
    if (path.length > best.length) best = path;
    if (best.length >= target) break;
  }
  return best;
}

function build(w, h, { len, keys, ice }) {
  const path = randomPath(w, h, len);
  if (path.length < len) return null;
  const g = Array.from({ length: h }, () => Array(w).fill('#'));
  const put = (i, ch) => { g[(i / w) | 0][i % w] = ch; };
  path.forEach((i) => put(i, '.'));
  put(path[0], 'S'); put(path[path.length - 1], 'D');
  // anahtarlar yolun ikinci yarısına daha olası
  const slots = [];
  for (let k = 2; k < path.length - 2; k++) slots.push(k);
  const keyIdx = new Set();
  while (keyIdx.size < keys && slots.length) {
    const pick = slots.splice(Math.floor(Math.pow(rnd(), 0.6) * slots.length), 1)[0];
    keyIdx.add(pick);
  }
  keyIdx.forEach((k) => put(path[k], 'K'));
  if (ice) {
    for (let k = 1; k < path.length - 1; k++) {
      if (keyIdx.has(k)) continue;
      const a = path[k - 1], b = path[k], c = path[k + 1];
      if (b - a === c - b && rnd() < ice) put(b, 'i');
    }
  }
  const grid = g.map((r) => r.join(''));
  const sx = path[0] % w, sy = (path[0] / w) | 0, dx = path[path.length - 1] % w, dy = (path[path.length - 1] / w) | 0;
  if (Math.abs(sx - dx) + Math.abs(sy - dy) < 2) return null;
  return grid;
}

function evaluate(id, grid) {
  const board = parseLevel({ id, grid });
  const s = newState(board);
  const sh = shortest(s);
  if (!sh || sh.unknown) return null;
  const fc = fullCover(s);
  if (!fc || fc.unknown) return null;
  const fr = failRate(s, 300, id * 7 + 3);
  const iceN = grid.join('').split('i').length - 1;
  const score = board.tileCount * 0.5 + sh.moves.length * 0.8 + fr * 12 + board.keys.length * 2 + iceN * 0.6;
  return { grid, min: sh.moves.length, cover: fc.moves.length, fail: +fr.toFixed(2), tiles: board.tileCount, score };
}

const SEGMENTS = [
  // [ilk bölüm, son bölüm, dünya, w, h, len aralığı, anahtar aralığı, buz olasılığı]
  [2, 5, 1, 5, 5, [7, 10], [1, 1], 0],
  [6, 12, 1, 5, 5, [11, 16], [1, 1], 0],
  [13, 20, 1, 5, 5, [16, 22], [1, 1], 0],
  [21, 30, 2, 5, 5, [14, 22], [2, 2], 0],
  [31, 40, 2, 6, 6, [20, 30], [2, 3], 0],
  [41, 45, 3, 5, 5, [10, 16], [1, 1], 0.55],
  [46, 52, 3, 6, 6, [16, 24], [1, 2], 0.5],
  [53, 60, 3, 6, 6, [22, 32], [2, 3], 0.45],
];

const levels = [{
  id: 1, world: 1,
  grid: ['#####', 'S...K', '####.', 'D....', '#####'],
  tutorial: 'swipe',
}];

for (const [a, b, world, w, h, lenR, keyR, ice] of SEGMENTS) {
  const need = b - a + 1;
  const pool = [];
  const seen = new Set();
  let tries = 0;
  while (pool.length < need * 30 && tries < need * 3000) {
    tries++;
    const grid = build(w, h, { len: ri(...lenR), keys: ri(...keyR), ice });
    if (!grid) continue;
    const key = grid.join('/');
    if (seen.has(key)) continue;
    seen.add(key);
    const ev = evaluate(a, grid);
    if (!ev || ev.min < 4) continue;
    pool.push(ev);
  }
  pool.sort((x, y) => x.score - y.score);
  console.log(`Bölüm ${a}-${b}: ${pool.length} aday (${tries} deneme)`);
  for (let k = 0; k < need; k++) {
    const q = 0.12 + (0.83 * k) / Math.max(1, need - 1);
    const ev = pool[Math.min(pool.length - 1, Math.floor(q * pool.length))];
    pool.splice(pool.indexOf(ev), 1);
    const id = a + k;
    const lv = { id, world, grid: ev.grid };
    if (id === 21) lv.tutorial = 'keys';
    if (id === 41) lv.tutorial = 'ice';
    if (id % 20 === 0) lv.final = true;
    levels.push(lv);
  }
}
levels.sort((x, y) => x.id - y.id);
// Tamamen boş satır/sütunları kırp (tahta ekranda daha büyük görünür)
for (const lv of levels) {
  let g = lv.grid;
  while (g.length > 2 && /^#+$/.test(g[0])) g = g.slice(1);
  while (g.length > 2 && /^#+$/.test(g[g.length - 1])) g = g.slice(0, -1);
  const colEmpty = (c) => g.every((r) => r[c] === '#');
  while (g[0].length > 2 && colEmpty(0)) g = g.map((r) => r.slice(1));
  while (g[0].length > 2 && colEmpty(g[0].length - 1)) g = g.map((r) => r.slice(0, -1));
  lv.grid = g;
}
fs.mkdirSync(new URL('../src/levels/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('../src/levels/levels.json', import.meta.url), JSON.stringify(levels, null, 1));
console.log('Toplam', levels.length, 'bölüm yazıldı');
