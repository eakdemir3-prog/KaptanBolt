// Bölüm üretici: node tools/generate.mjs  -> src/levels/levels.json
// Her bölüm oyunla aynı kuralları kullanan çözücüyle doğrulanır.
import fs from 'node:fs';
import { parseLevel, newState } from '../src/logic/rules.js';
import { shortest, fullCover, failRate } from '../src/logic/solver.js';

let seed = 20261118;
const rnd = () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

function nbFor(w, h) { return (i) => { const x = i % w, y = (i / w) | 0, o = []; if (x > 0) o.push(i - 1); if (x < w - 1) o.push(i + 1); if (y > 0) o.push(i - w); if (y < h - 1) o.push(i + w); return o; }; }

function randomPath(w, h, target, used = new Uint8Array(w * h), startCell = null) {
  const nb = nbFor(w, h);
  let best = [];
  for (let attempt = 0; attempt < 80; attempt++) {
    const u = used.slice();
    let s0 = startCell;
    if (s0 == null) { const free = []; for (let i = 0; i < w * h; i++) if (!u[i]) free.push(i); if (!free.length) return []; s0 = pick(free); }
    const path = [s0]; u[s0] = 1;
    while (path.length < target) {
      const c = path[path.length - 1];
      const opts = nb(c).filter((n) => !u[n]);
      if (!opts.length) break;
      opts.sort((a, b) => (nb(a).filter((n) => !u[n]).length + rnd() * 2.2) - (nb(b).filter((n) => !u[n]).length + rnd() * 2.2));
      u[opts[0]] = 1; path.push(opts[0]);
    }
    if (path.length > best.length) best = path;
    if (best.length >= target) break;
  }
  return best;
}

const dist = (w, a, b) => Math.abs((a % w) - (b % w)) + Math.abs(((a / w) | 0) - ((b / w) | 0));

/** Yol tabanlı bölüm: kareler = yol (3 yıldızlık çözüm yapı gereği var) */
function buildPath(w, h, o) {
  let path, portalAt = -1;
  if (o.portal) {
    const l1 = Math.floor(o.len * (0.35 + rnd() * 0.3));
    const p1 = randomPath(w, h, l1);
    if (p1.length < l1) return null;
    const used = new Uint8Array(w * h); p1.forEach((i) => (used[i] = 1));
    const free = []; for (let i = 0; i < w * h; i++) if (!used[i] && dist(w, i, p1[p1.length - 1]) >= 3) free.push(i);
    if (!free.length) return null;
    const p2 = randomPath(w, h, o.len - l1, used, pick(free));
    if (p2.length < o.len - l1) return null;
    portalAt = p1.length - 1;
    path = p1.concat(p2);
  } else {
    path = randomPath(w, h, o.len);
    if (path.length < o.len) return null;
  }
  const g = Array.from({ length: h }, () => Array(w).fill('#'));
  const put = (i, ch) => { g[(i / w) | 0][i % w] = ch; };
  const get = (i) => g[(i / w) | 0][i % w];
  path.forEach((i) => put(i, '.'));
  put(path[0], 'S'); put(path[path.length - 1], 'D');
  if (portalAt >= 0) { put(path[portalAt], '1'); put(path[portalAt + 1], '1'); }
  const slots = [];
  for (let k = 2; k < path.length - 2; k++) if (get(path[k]) === '.') slots.push(k);
  const keyIdx = new Set();
  while (keyIdx.size < o.keys && slots.length) keyIdx.add(slots.splice(Math.floor(Math.pow(rnd(), 0.6) * slots.length), 1)[0]);
  keyIdx.forEach((k) => put(path[k], 'K'));
  if (o.ice) for (let k = 1; k < path.length - 1; k++) {
    if (get(path[k]) !== '.') continue;
    const a = path[k - 1], b = path[k], c = path[k + 1];
    if (b - a === c - b && rnd() < o.ice) put(b, 'i');
  }
  if (o.strong) for (let k = 1; k < path.length - 1; k++) if (get(path[k]) === '.' && rnd() < o.strong) put(path[k], 'o');
  if (dist(w, path[0], path[path.length - 1]) < 2) return null;
  // dünyanın mekaniği bölümde mutlaka bulunsun
  const flat = g.map((r) => r.join('')).join('');
  if (o.ice && !flat.includes('i')) return null;
  if (o.strong && !flat.includes('o')) return null;
  const enemies = [];
  const occupiedCells = new Set();
  for (let n = 0; n < (o.patrols || 0); n++) {
    const cand = [];
    for (let k = 3; k < path.length - 1; k++) {
      const c = path[k];
      if (get(c) !== '.' || occupiedCells.has(c) || dist(w, c, path[0]) < 3) continue;
      const d = path[k + 1] - c;
      const dir = d === 1 ? 'right' : d === -1 ? 'left' : d === w ? 'down' : 'up';
      cand.push({ c, dir });
    }
    if (!cand.length) return null;
    const p = pick(cand); occupiedCells.add(p.c);
    enemies.push({ type: 'patrol', at: [p.c % w, (p.c / w) | 0], dir: p.dir });
  }
  for (let n = 0; n < (o.chasers || 0); n++) {
    const cand = path.filter((c) => get(c) === '.' && !occupiedCells.has(c) && dist(w, c, path[0]) >= 4);
    if (!cand.length) return null;
    const c = pick(cand); occupiedCells.add(c);
    enemies.push({ type: 'chaser', at: [c % w, (c / w) | 0] });
  }
  return { grid: g.map((r) => r.join('')), enemies };
}

/** Boss bölümü: açık alan, dağınık çukurlar, 2x2 boss */
function buildBoss(w, h, o) {
  const g = Array.from({ length: h }, () => Array(w).fill('.'));
  const N = w * h;
  const holes = Math.floor(N * (0.12 + rnd() * 0.1));
  for (let k = 0; k < holes; k++) { const i = ri(0, N - 1); g[(i / w) | 0][i % w] = '#'; }
  const tiles = []; for (let i = 0; i < N; i++) if (g[(i / w) | 0][i % w] === '.') tiles.push(i);
  const put = (i, ch) => { g[(i / w) | 0][i % w] = ch; };
  const get = (i) => g[(i / w) | 0][i % w];
  const bossOpts = [];
  for (let y = 0; y < h - 1; y++) for (let x = 0; x < w - 1; x++) { const c = [y * w + x, y * w + x + 1, (y + 1) * w + x, (y + 1) * w + x + 1]; if (c.every((i) => get(i) === '.')) bossOpts.push(y * w + x); }
  if (!bossOpts.length) return null;
  const bp = pick(bossOpts);
  const bcells = [bp, bp + 1, bp + w, bp + w + 1];
  const free = () => tiles.filter((i) => get(i) === '.' && !bcells.includes(i));
  const far = free().filter((i) => bcells.every((c) => dist(w, i, c) >= 3));
  if (!far.length) return null;
  const s = pick(far); put(s, 'S');
  const dCand = free().filter((i) => dist(w, i, s) >= 3);
  if (!dCand.length) return null;
  put(pick(dCand), 'D');
  for (let k = 0; k < o.keys; k++) { const f = free(); if (!f.length) return null; put(pick(f), 'K'); }
  if (o.ice) for (const i of free()) if (rnd() < o.ice) put(i, 'i');
  if (o.strong) for (const i of free()) if (rnd() < o.strong) put(i, 'o');
  if (o.portal) { const f = free(); if (f.length < 2) return null; const a = pick(f); put(a, '1'); const f2 = free().filter((i) => dist(w, i, a) >= 3); if (!f2.length) return null; put(pick(f2), '1'); }
  const enemies = [];
  for (let n = 0; n < (o.patrols || 0); n++) { const f = free().filter((i) => dist(w, i, s) >= 3); if (!f.length) return null; const c = pick(f); enemies.push({ type: 'patrol', at: [c % w, (c / w) | 0], dir: pick(['left', 'right', 'up', 'down']) }); }
  for (let n = 0; n < (o.chasers || 0); n++) { const f = free().filter((i) => dist(w, i, s) >= 4 && !enemies.some((e) => e.at[0] === i % w && e.at[1] === ((i / w) | 0))); if (!f.length) return null; const c = pick(f); enemies.push({ type: 'chaser', at: [c % w, (c / w) | 0] }); }
  return { grid: g.map((r) => r.join('')), enemies, boss: { at: [bp % w, (bp / w) | 0], every: o.every } };
}

function evaluate(id, cand, isBoss) {
  const lv = { id, grid: cand.grid, enemies: cand.enemies, boss: cand.boss };
  const board = parseLevel(lv);
  const s = newState(board);
  const sh = shortest(s, isBoss ? 600000 : 400000);
  if (!sh || sh.unknown) return null;
  let stars = { mode: 'cover' }, cover = null;
  const special = board.enemies.length || board.strongCount || board.portal.some((p) => p >= 0);
  if (!isBoss) {
    const fc = fullCover(s, special ? 300000 : 2000000);
    if (fc && fc.moves) cover = fc.moves.length;
    else if (!special) return null; // düz yol bölümünde 3 yıldız şart
  }
  if (cover == null) { const m = sh.moves.length; stars = { mode: 'moves', par: [m + 1, m + Math.max(3, Math.ceil(m * 0.4))] }; }
  const fr = failRate(s, 300, id * 7 + 3);
  const extras = (cand.grid.join('').match(/[io1]/g) || []).length;
  const score = board.tileCount * 0.5 + sh.moves.length * 0.8 + fr * 12 + board.keys.length * 2 + extras * 0.5 + board.enemies.length * 2;
  return {
    lv: { grid: cand.grid, ...(cand.enemies.length ? { enemies: cand.enemies } : {}), ...(cand.boss ? { boss: cand.boss } : {}), ...(stars.mode !== 'cover' ? { stars } : {}) },
    min: sh.moves.length, cover, fail: fr, score,
  };
}

// [ilk, son, dünya, w, h, seçenekler, etiket]
const SEG = [
  [2, 5, 1, 5, 5, { len: [7, 10], keys: [1, 1] }, 'easy'],
  [6, 12, 1, 5, 5, { len: [11, 16], keys: [1, 1] }],
  [13, 19, 1, 5, 5, { len: [16, 22], keys: [1, 1] }],
  [20, 20, 1, 6, 6, { boss: true, keys: 1, every: 2 }],
  [21, 30, 2, 5, 5, { len: [14, 22], keys: [2, 2] }],
  [31, 39, 2, 6, 6, { len: [20, 30], keys: [2, 3] }],
  [40, 40, 2, 6, 6, { boss: true, keys: 2, every: 2 }],
  [41, 45, 3, 5, 5, { len: [10, 16], keys: [1, 1], ice: 0.55 }, 'easy'],
  [46, 52, 3, 6, 6, { len: [16, 24], keys: [1, 2], ice: 0.5 }],
  [53, 59, 3, 6, 6, { len: [22, 32], keys: [2, 3], ice: 0.45 }],
  [60, 60, 3, 6, 6, { boss: true, keys: 1, every: 2, ice: 0.12 }],
  // Dünya 4: Devriye
  [61, 65, 4, 5, 5, { len: [12, 18], keys: [1, 1], patrols: 1 }, 'easy'],
  [66, 72, 4, 6, 6, { len: [16, 26], keys: [1, 2], patrols: 1 }],
  [73, 79, 4, 6, 6, { len: [20, 30], keys: [2, 2], patrols: 2 }],
  [80, 80, 4, 6, 6, { boss: true, keys: 1, every: 1, patrols: 1 }],
  // Dünya 5: Sağlam Taş
  [81, 85, 5, 5, 5, { len: [10, 16], keys: [1, 1], strong: 0.2 }, 'easy'],
  [86, 92, 5, 6, 6, { len: [16, 26], keys: [1, 2], strong: 0.2 }],
  [93, 99, 5, 7, 7, { len: [22, 32], keys: [2, 2], strong: 0.18, patrols: 1 }],
  [100, 100, 5, 7, 7, { boss: true, keys: 2, every: 1, strong: 0.12 }],
  // Dünya 6: Işınlanma
  [101, 105, 6, 6, 6, { len: [12, 18], keys: [1, 1], portal: true }, 'easy'],
  [106, 112, 6, 7, 7, { len: [18, 28], keys: [1, 2], portal: true }],
  [113, 119, 6, 7, 7, { len: [24, 34], keys: [2, 3], portal: true, ice: 0.2 }],
  [120, 120, 6, 7, 7, { boss: true, keys: 1, every: 1, portal: true }],
  // Dünya 7: Takipçi
  [121, 125, 7, 6, 6, { len: [12, 18], keys: [1, 1], chasers: 1 }, 'easy'],
  [126, 132, 7, 6, 6, { len: [16, 26], keys: [1, 2], chasers: 1 }],
  [133, 139, 7, 7, 7, { len: [20, 32], keys: [2, 2], chasers: 1, patrols: 1 }],
  [140, 140, 7, 7, 7, { boss: true, keys: 2, every: 1, chasers: 1 }],
];

const TUT = { 1: 'swipe', 20: 'boss', 21: 'keys', 41: 'ice', 61: 'patrol', 81: 'strong', 101: 'portal', 121: 'chaser' };

const only = process.argv[2] ? +process.argv[2] : 0; // hızlı deneme: belirli bir segment
const levels = [{ id: 1, world: 1, grid: ['#####', 'S...K', '####.', 'D....', '#####'] }];
const t0 = Date.now();
for (const [a, b, world, w, h, o, tag] of SEG) {
  if (only && only !== a) continue;
  const need = b - a + 1;
  const isBoss = !!o.boss;
  const pool = [], seen = new Set();
  let tries = 0;
  const target = isBoss ? 40 : need * 25, maxTries = isBoss ? 6000 : need * 2500;
  while (pool.length < target && tries < maxTries) {
    tries++;
    const cand = isBoss ? buildBoss(w, h, o) : buildPath(w, h, { ...o, len: ri(...o.len), keys: ri(...o.keys) });
    if (!cand) continue;
    const k = cand.grid.join('/') + JSON.stringify(cand.enemies) + JSON.stringify(cand.boss || '');
    if (seen.has(k)) continue;
    seen.add(k);
    const ev = evaluate(a, cand, isBoss);
    if (!ev || ev.min < (isBoss ? 7 : 4)) continue;
    pool.push(ev);
  }
  pool.sort((x, y) => x.score - y.score);
  console.log(`Bölüm ${a}-${b}: ${pool.length} aday (${tries} deneme, ${((Date.now() - t0) / 1000).toFixed(0)} sn)`);
  if (pool.length < need) throw new Error(`Bölüm ${a}-${b} için yeterli aday yok`);
  for (let k = 0; k < need; k++) {
    let q;
    if (isBoss) q = 0.6;
    else if (tag === 'easy') q = 0.12 + (0.83 * k) / Math.max(1, need - 1);
    else q = 0.3 + (0.68 * k) / Math.max(1, need - 1);
    const ev = pool[Math.min(pool.length - 1, Math.floor(q * pool.length))];
    pool.splice(pool.indexOf(ev), 1);
    const id = a + k;
    const lv = { id, world, ...ev.lv };
    if (isBoss) lv.final = true;
    if (TUT[id]) lv.tutorial = TUT[id];
    levels.push(lv);
  }
}
if (only) process.exit(0);
levels.find((l) => l.id === 1).tutorial = 'swipe';
levels.sort((x, y) => x.id - y.id);
// Tamamen boş satır/sütunları kırp (boss ve düşman koordinatlarını da kaydır)
for (const lv of levels) {
  let g = lv.grid, ox = 0, oy = 0;
  const rowEmpty = (y) => /^#+$/.test(g[y]);
  while (g.length > 2 && rowEmpty(0)) { g = g.slice(1); oy++; }
  while (g.length > 2 && rowEmpty(g.length - 1)) g = g.slice(0, -1);
  const colEmpty = (c) => g.every((r) => r[c] === '#');
  while (g[0].length > 2 && colEmpty(0)) { g = g.map((r) => r.slice(1)); ox++; }
  while (g[0].length > 2 && colEmpty(g[0].length - 1)) g = g.map((r) => r.slice(0, -1));
  lv.grid = g;
  for (const e of lv.enemies || []) e.at = [e.at[0] - ox, e.at[1] - oy];
  if (lv.boss) lv.boss.at = [lv.boss.at[0] - ox, lv.boss.at[1] - oy];
}
fs.mkdirSync(new URL('../src/levels/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('../src/levels/levels.json', import.meta.url), '[\n' + levels.map((l) => JSON.stringify(l)).join(',\n') + '\n]\n');
console.log('Toplam', levels.length, 'bölüm yazıldı');
