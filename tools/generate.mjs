// Bölüm üretici: node tools/generate.mjs  -> src/levels/levels.json
// Her bölüm oyunla aynı kuralları kullanan çözücüyle doğrulanır.
import fs from 'node:fs';
import { parseLevel, newState, move } from '../src/logic/rules.js';
import { shortest, fullCover, failRate, bestCover } from '../src/logic/solver.js';

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

/** Kesişmeli yol: bir kareden iki kez dik açıyla geçebilir (sağlam taş için). Dönüş: { path, cross:Set } */
function crossPath(w, h, target, wantCross) {
  const nb = nbFor(w, h);
  let best = null;
  for (let attempt = 0; attempt < 120; attempt++) {
    const cnt = new Uint8Array(w * h), axis = new Array(w * h).fill(null), cross = new Set();
    const p = [ri(0, w * h - 1)]; cnt[p[0]] = 1;
    while (p.length < target) {
      const c = p[p.length - 1], prev = p.length > 1 ? p[p.length - 2] : -1;
      const opts = [];
      for (const n of nb(c)) {
        if (!cnt[n]) opts.push({ n, score: nb(n).filter((m) => !cnt[m]).length + rnd() * 2.2 });
        else if (cnt[n] === 1 && cross.size < wantCross && axis[n]) {
          const d = n - c, beyond = n + d, ax = Math.abs(d) === 1 ? 'h' : 'v';
          const inb = Math.abs(d) === 1 ? Math.floor(beyond / w) === Math.floor(n / w) && beyond >= 0 : beyond >= 0 && beyond < w * h;
          if (axis[n] !== ax && inb && !cnt[beyond]) opts.push({ n, beyond, score: -1 + rnd() });
        }
      }
      if (!opts.length) break;
      opts.sort((a, b) => a.score - b.score);
      const o = opts[0];
      if (o.beyond !== undefined) { cnt[o.n] = 2; cross.add(o.n); p.push(o.n, o.beyond); cnt[o.beyond] = 1; }
      else { cnt[o.n] = 1; p.push(o.n); }
      // ilk geçişin ekseni (düz geçişse) — kesişme ancak düz geçilen karede olur
      if (p.length >= 3) { const a = p[p.length - 3], b = p[p.length - 2], cc = p[p.length - 1]; if (cnt[b] === 1 && b - a === cc - b) axis[b] = Math.abs(b - a) === 1 ? 'h' : 'v'; }
    }
    if (p.length >= target && cross.size >= 1) { best = { path: p, cross }; break; }
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
  } else if (o.strong) {
    const cp = crossPath(w, h, o.len, 1 + Math.floor(rnd() * 2));
    if (!cp) return null;
    path = cp.path; o = { ...o, _cross: cp.cross };
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
  if (o._cross) for (const c of o._cross) { if (get(c) !== '.') return null; put(c, 'o'); }
  if (o.bridge) {
    const bs = []; for (let k = 2; k < Math.floor(path.length / 2); k++) if (get(path[k]) === '.') bs.push(k);
    if (!bs.length) return null;
    const kb = pick(bs); put(path[kb], 'b');
    let nb = 0;
    for (let k = kb + 2; k < path.length - 1; k++) if (get(path[k]) === '.' && rnd() < 0.3) { put(path[k], '='); nb++; }
    if (!nb) return null;
  }
  if (o.arrows) for (let k = 1; k < path.length - 1; k++) {
    if (get(path[k]) !== '.' || rnd() >= o.arrows) continue;
    const d = path[k + 1] - path[k];
    put(path[k], d === 1 ? '>' : d === -1 ? '<' : d === w ? 'v' : '^');
  }
  if (dist(w, path[0], path[path.length - 1]) < 2) return null;
  // dünyanın mekaniği bölümde mutlaka bulunsun
  const flat = g.map((r) => r.join('')).join('');
  if (o.ice && !flat.includes('i')) return null;
  if (o.strong && !flat.includes('o')) return null;
  if (o.arrows && !/[<>^v]/.test(flat)) return null;
  const enemies = [];
  const occupiedCells = new Set();
  for (let n = 0; n < (o.patrols || 0); n++) {
    const cand = [];
    for (let k = 3; k < path.length - 1; k++) {
      const c = path[k];
      if (get(c) !== '.' || occupiedCells.has(c) || dist(w, c, path[0]) < 4) continue;
      const d = path[k + 1] - c;
      const dir = d === 1 ? 'right' : d === -1 ? 'left' : d === w ? 'down' : 'up';
      cand.push({ c, dir });
    }
    if (!cand.length) return null;
    const p = pick(cand); occupiedCells.add(p.c);
    enemies.push({ type: 'patrol', at: [p.c % w, (p.c / w) | 0], dir: p.dir });
  }
  for (let n = 0; n < (o.chasers || 0); n++) {
    const cand = path.filter((c) => get(c) === '.' && !occupiedCells.has(c) && dist(w, c, path[0]) >= 5);
    if (!cand.length) return null;
    const c = pick(cand); occupiedCells.add(c);
    enemies.push({ type: 'chaser', at: [c % w, (c / w) | 0] });
  }
  // Lazer nöbetçi: yolun dışında bir karede durur, ışını yolu en az 2 yerden keser
  for (let n = 0; n < (o.sentries || 0); n++) {
    const cand = [];
    const near = new Set(path.slice(0, 3));
    for (let c = 0; c < w * h; c++) {
      if (get(c) !== '#') continue;
      for (const [dir, dx, dy] of [['right', 1, 0], ['left', -1, 0], ['down', 0, 1], ['up', 0, -1]]) {
        let x = c % w + dx, y = ((c / w) | 0) + dy, hit = 0, bad = false;
        while (x >= 0 && y >= 0 && x < w && y < h) { const i = y * w + x; if (get(i) !== '#') hit++; if (near.has(i)) bad = true; x += dx; y += dy; }
        if (hit >= 3 && !bad) cand.push({ c, dir });
      }
    }
    if (!cand.length) return null;
    const p = pick(cand); put(p.c, '.'); occupiedCells.add(p.c);
    enemies.push({ type: 'sentry', at: [p.c % w, (p.c / w) | 0], dir: p.dir });
  }
  // Kemirici böcek: yolun ortasında, yol boyunca gidip gelir
  for (let n = 0; n < (o.gnawers || 0); n++) {
    const cand = [];
    for (let k = 4; k < path.length - 2; k++) {
      const c = path[k];
      if (get(c) !== '.' || occupiedCells.has(c) || dist(w, c, path[0]) < 3) continue;
      const d = path[k + 1] - c;
      cand.push({ c, dir: d === 1 ? 'right' : d === -1 ? 'left' : d === w ? 'down' : 'up' });
    }
    if (!cand.length) return null;
    const p = pick(cand); occupiedCells.add(p.c);
    enemies.push({ type: 'gnawer', at: [p.c % w, (p.c / w) | 0], dir: p.dir });
  }
  return { grid: g.map((r) => r.join('')), enemies };
}

/** Açık alan bölümü: dolu tahta + birkaç çukur. Her adımda 2-3 seçenek; yanlış sıra = çıkmaz */
function buildArea(w, h, o) {
  const N = w * h;
  const g = Array.from({ length: h }, () => Array(w).fill('.'));
  const put = (i, ch) => { g[(i / w) | 0][i % w] = ch; };
  const get = (i) => g[(i / w) | 0][i % w];
  const nb = nbFor(w, h);
  const holes = ri(...o.holes);
  for (let k = 0, t = 0; k < holes && t < 200; t++) { const i = ri(0, N - 1); if (get(i) === '.') { put(i, '#'); k++; } }
  // zorunlu başlangıç (asansörden gelinen kare): kare olsun, arkası boş olsun (kabin arkayı örtmesin)
  if (o.forceS != null) { put(o.forceS, '.'); if (o.forceS >= w) put(o.forceS - w, '#'); }
  const tiles = []; for (let i = 0; i < N; i++) if (get(i) === '.') tiles.push(i);
  if (tiles.length < o.minTiles) return null;
  // bağlantılı olsun, uçta tek komşulu kare en fazla 2 (yoksa çözüm zorunlu tek yola iner)
  const seen = new Set([tiles[0]]), q = [tiles[0]];
  while (q.length) { const c = q.pop(); for (const n of nb(c)) if (get(n) !== '#' && !seen.has(n)) { seen.add(n); q.push(n); } }
  if (seen.size !== tiles.length) return null;
  const deg = (i) => nb(i).filter((n) => get(n) !== '#').length;
  const leaves = tiles.filter((i) => deg(i) === 1);
  if (leaves.length > 2) return null;
  const free = () => tiles.filter((i) => get(i) === '.');
  // başlangıç: kenar/köşe tercih
  const sC = o.forceS != null ? [o.forceS] : free().filter((i) => deg(i) <= 3);
  if (!sC.length) return null;
  const s = pick(sC); put(s, 'S');
  // kapı: başlangıçtan uzak değil ama bitişik de değil — kısa yoldan kaçmak zor olsun diye anahtarlar uzağa
  // kapı uzun bir model: arkasında kare kalmasın ki hiçbir şeyi örtmesin (arka sıra ya da arkası çukur)
  const dC = free().filter((i) => dist(w, i, s) >= (o.dMin || 2) && (i < w || get(i - w) === '#'));
  if (!dC.length) return null;
  const d = pick(dC); put(d, 'D');
  for (let k = 0; k < o.keys; k++) {
    const f = free().filter((i) => dist(w, i, d) >= 2);
    if (!f.length) return null;
    f.sort((a, b) => dist(w, b, s) + dist(w, b, d) - dist(w, a, s) - dist(w, a, d));
    put(f[Math.floor(Math.pow(rnd(), 1.6) * Math.min(f.length, 6))], 'K');
  }
  if (o.ice) for (const i of free()) if (rnd() < o.ice) put(i, 'i');
  if (o.strong) { let n = 0; for (const i of free()) if (deg(i) >= 3 && rnd() < o.strong) { put(i, 'o'); n++; } if (!n) return null; }
  if (o.arrows) for (const i of free()) if (rnd() < o.arrows) put(i, pick(['<', '>', '^', 'v']));
  if (o.bridge) {
    const hl = []; for (let i = 0; i < N; i++) if (get(i) === '#') hl.push(i);
    if (!hl.length) return null;
    let nb2 = 0; for (const i of hl) if (rnd() < 0.6) { put(i, '='); nb2++; }
    const f = free().filter((i) => dist(w, i, s) >= 2); if (!nb2 || !f.length) return null; put(pick(f), 'b');
  }
  if (o.portal) {
    const f = free().filter((i) => i !== s); if (f.length < 2) return null;
    const a = pick(f); put(a, '1');
    const f2 = free().filter((i) => dist(w, i, a) >= 3); if (!f2.length) return null; put(pick(f2), '1');
  }
  // kutular: yanında çukur olan, arkasından itilebilecek karelere
  if (o.boxes) {
    let n = 0;
    for (let t = 0; t < 40 && n < o.boxes; t++) {
      const c = pick(free()); if (!c || dist(w, c, s) < 2) continue;
      const x = c % w, y = (c / w) | 0;
      const ok = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
        const bx = x - dx, by = y - dy, tx = x + dx, ty = y + dy;
        if (bx < 0 || by < 0 || bx >= w || by >= h || tx < 0 || ty < 0 || tx >= w || ty >= h) return false;
        return get(by * w + bx) !== '#' && get(ty * w + tx) === '#';
      });
      if (ok) { put(c, 'X'); n++; }
    }
    if (!n) return null;
  }
  // renkli anahtar + bariyer: bariyer başlangıçtan uzak, anahtar başlangıç tarafında
  if (o.gates) {
    const f = free().filter((i) => dist(w, i, s) >= 3 && nb(i).filter((q) => get(q) !== '#').length >= 2);
    if (f.length < 2) return null;
    const gcount = ri(1, 2);
    for (let k = 0; k < gcount; k++) { const c = pick(free().filter((i) => dist(w, i, s) >= 3 && get(i) === '.')); if (c == null) return null; put(c, 'R'); }
    const kc = free().filter((i) => dist(w, i, s) >= 2 && dist(w, i, s) <= 4);
    if (!kc.length) return null; put(pick(kc), 'r');
  }
  const timed = [];
  if (o.timed) {
    const f = free().filter((i) => dist(w, i, s) >= 2);
    for (let k = 0; k < o.timed && f.length; k++) { const c = f.splice(ri(0, f.length - 1), 1)[0]; timed.push([c % w, (c / w) | 0, ri(4, 4 + Math.round(w * h * 0.35))]); }
  }
  const flat = g.map((r) => r.join('')).join('');
  if (o.ice && !flat.includes('i')) return null;
  if (o.arrows && !/[<>^v]/.test(flat)) return null;
  const enemies = [], occ = new Set();
  const at = (c) => [c % w, (c / w) | 0];
  for (let n = 0; n < (o.patrols || 0); n++) {
    const f = free().filter((i) => !occ.has(i) && dist(w, i, s) >= 3);
    if (!f.length) return null; const c = pick(f); occ.add(c);
    enemies.push({ type: 'patrol', at: at(c), dir: pick(['left', 'right', 'up', 'down']) });
  }
  for (let n = 0; n < (o.chasers || 0); n++) {
    const f = free().filter((i) => !occ.has(i) && dist(w, i, s) >= 3 && dist(w, i, s) <= 4);
    if (!f.length) return null; const c = pick(f); occ.add(c);
    enemies.push({ type: 'chaser', at: at(c) });
  }
  for (let n = 0; n < (o.sentries || 0); n++) {
    // nöbetçi bir karede durur (üzerine basılamaz), ışını en az 2 kareyi keser, başlangıca değmez
    const cand = [];
    for (const c of free()) {
      if (occ.has(c) || dist(w, c, s) < 2) continue;
      for (const [dir, dx, dy] of [['right', 1, 0], ['left', -1, 0], ['down', 0, 1], ['up', 0, -1]]) {
        let x = c % w + dx, y = ((c / w) | 0) + dy, hit = 0, bad = false;
        while (x >= 0 && y >= 0 && x < w && y < h) { const i = y * w + x; if (get(i) !== '#') hit++; if (i === s || nb(s).includes(i)) bad = true; x += dx; y += dy; }
        if (hit >= 3 && !bad) cand.push({ c, dir });
      }
    }
    if (!cand.length) return null;
    const p = pick(cand); occ.add(p.c);
    enemies.push({ type: 'sentry', at: at(p.c), dir: p.dir });
  }
  for (let n = 0; n < (o.gnawers || 0); n++) {
    const f = free().filter((i) => !occ.has(i) && dist(w, i, s) >= 3);
    if (!f.length) return null; const c = pick(f); occ.add(c);
    enemies.push({ type: 'gnawer', at: at(c), dir: pick(['left', 'right', 'up', 'down']) });
  }
  return { grid: g.map((r) => r.join('')), enemies, timed };
}

/** Bağlantılı açık alan şekli (yalnızca '.' ve '#'); uçta tek komşulu kare en fazla 2 */
function areaShape(w, h, holesR, minTiles) {
  const N = w * h, g = Array(N).fill('.'), nb = nbFor(w, h);
  const holes = ri(...holesR);
  for (let k = 0, t = 0; k < holes && t < 200; t++) { const i = ri(0, N - 1); if (g[i] === '.') { g[i] = '#'; k++; } }
  const tiles = []; for (let i = 0; i < N; i++) if (g[i] === '.') tiles.push(i);
  if (tiles.length < minTiles) return null;
  const seen = new Set([tiles[0]]), q = [tiles[0]];
  while (q.length) { const c = q.pop(); for (const n of nb(c)) if (g[n] !== '#' && !seen.has(n)) { seen.add(n); q.push(n); } }
  if (seen.size !== tiles.length) return null;
  if (tiles.filter((i) => nb(i).filter((n) => g[n] !== '#').length === 1).length > 2) return null;
  return g;
}
/** İki katlı bölüm: 1. katta S + anahtar + asansör, 2. katta asansör + anahtar + kapı */
function buildFloors(w, h1, h2, o) {
  const A = areaShape(w, h1, o.holes, o.minTiles1), B = areaShape(w, h2, o.holes2 || o.holes, o.minTiles2);
  if (!A || !B) return null;
  const tall = (g, i) => i < w || g[i - w] === '#'; // uzun model (asansör/kapı) arkasındaki kareyi örtmesin
  const free = (g) => g.map((c, i) => (c === '.' ? i : -1)).filter((i) => i >= 0);
  // 1. kat
  const sA = free(A).filter((i) => !tall(A, i) || true); const s = pick(sA); A[s] = 'S';
  const lA = free(A).filter((i) => tall(A, i) && dist(w, i, s) >= 2); if (!lA.length) return null;
  const la = pick(lA); A[la] = 'L';
  for (let k = 0; k < o.keys1; k++) { const f = free(A).filter((i) => dist(w, i, la) >= 2 && dist(w, i, s) >= 2); if (!f.length) return null; A[pick(f)] = 'K'; }
  // 2. kat
  // asansör üst katta da aynı karede çıkar (katlar aynı boyda olmalı)
  if (h1 !== h2 || B[la] !== '.' || !tall(B, la)) return null;
  const lb = la; B[lb] = 'L';
  // üç katlı: 2. katta ikinci asansör (M), 3. katta aynı karede iniş; kapı en üst katta
  let C = null, top = B, lt = lb;
  if (o.three) {
    C = areaShape(w, h1, o.holes, o.minTiles2); if (!C) return null;
    const mB = free(B).filter((i) => tall(B, i) && dist(w, i, lb) >= 3 && C[i] === '.' && tall(C, i)); if (!mB.length) return null;
    const mb = pick(mB); B[mb] = 'M'; C[mb] = 'M';
    for (let k = 0; k < o.keys2; k++) { const f = free(B).filter((i) => dist(w, i, lb) >= 2 && dist(w, i, mb) >= 2); if (!f.length) return null; B[pick(f)] = 'K'; }
    top = C; lt = mb;
  }
  const dB = free(top).filter((i) => tall(top, i) && dist(w, i, lt) >= 2); if (!dB.length) return null;
  const d = pick(dB); top[d] = 'D';
  if (!o.three) for (let k = 0; k < o.keys2; k++) { const f = free(B).filter((i) => dist(w, i, lb) >= 2 && dist(w, i, d) >= 2); if (!f.length) return null; B[pick(f)] = 'K'; }
  else { const f = free(C).filter((i) => dist(w, i, lt) >= 2 && dist(w, i, d) >= 2); if (!f.length) return null; C[pick(f)] = 'K'; }
  const nbA = nbFor(w, h1), deg = (g, i) => nbA(i).filter((n) => g[n] !== '#').length;
  const GS = C ? [A, B, C] : [A, B];
  if (o.ice) { for (const g of GS) for (const i of free(g)) if (rnd() < o.ice) g[i] = 'i'; }
  if (o.strong) { let n = 0; for (const g of GS) for (const i of free(g)) if (deg(g, i) >= 3 && rnd() < o.strong) { g[i] = 'o'; n++; } if (!n) return null; }
  if (o.arrows) { let n = 0; for (const g of GS) for (const i of free(g)) if (rnd() < o.arrows) { g[i] = pick(['<', '>', '^', 'v']); n++; } if (!n) return null; }
  if (o.portal) { const g = rnd() < 0.5 ? A : B; const f = free(g); if (f.length < 2) return null; const a = pick(f); g[a] = '1'; const f2 = free(g).filter((i) => dist(w, i, a) >= 3); if (!f2.length) return null; g[pick(f2)] = '1'; }
  const enemies = [];
  if (o.patrols) { const f = free(B).filter((i) => dist(w, i, lb) >= 3); if (!f.length) return null; const c = pick(f); enemies.push({ type: 'patrol', at: [c % w, h1 + 2 + ((c / w) | 0)], dir: pick(['left', 'right', 'up', 'down']) }); }
  const rows = (g, h) => Array.from({ length: h }, (_, y) => g.slice(y * w, y * w + w).join(''));
  const sep = ['#'.repeat(w), '#'.repeat(w)];
  if (C) return { grid: [...rows(A, h1), ...sep, ...rows(B, h2), ...sep, ...rows(C, h1)], enemies, floors: h1, floors2: h2 };
  return { grid: [...rows(A, h1), ...sep, ...rows(B, h2)], enemies, floors: h1 };
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
  if (o.forceS != null && (bcells.includes(o.forceS))) return null;
  if (o.forceS != null) { put(o.forceS, '.'); if (o.forceS >= w && !bcells.includes(o.forceS - w)) put(o.forceS - w, '#'); }
  const far = o.forceS != null ? [o.forceS] : free().filter((i) => bcells.every((c) => dist(w, i, c) >= 4));
  if (!far.length || (o.forceS != null && !bcells.every((c) => dist(w, o.forceS, c) >= 4))) return null;
  const s = pick(far); put(s, 'S');
  const dCand = free().filter((i) => dist(w, i, s) >= 3 && (i < w || get(i - w) === '#' || !o.tallDoor));
  if (!dCand.length) return null;
  put(pick(dCand), 'D');
  for (let k = 0; k < o.keys; k++) { const f = free(); if (!f.length) return null; put(pick(f), 'K'); }
  if (o.ice) for (const i of free()) if (rnd() < o.ice) put(i, 'i');
  if (o.strong) for (const i of free()) if (rnd() < o.strong) put(i, 'o');
  if (o.bridge) {
    const hl = []; for (let i = 0; i < N; i++) if (get(i) === '#') hl.push(i);
    let nb = 0; for (const i of hl) if (rnd() < 0.5) { put(i, '='); nb++; }
    const f = free(); if (!nb || !f.length) return null; put(pick(f), 'b');
  }
  if (o.arrows) for (const i of free()) if (rnd() < o.arrows) put(i, pick(['<', '>', '^', 'v']));
  if (o.portal) { const f = free(); if (f.length < 2) return null; const a = pick(f); put(a, '1'); const f2 = free().filter((i) => dist(w, i, a) >= 3); if (!f2.length) return null; put(pick(f2), '1'); }
  const enemies = [];
  for (let n = 0; n < (o.patrols || 0); n++) { const f = free().filter((i) => dist(w, i, s) >= 4); if (!f.length) return null; const c = pick(f); enemies.push({ type: 'patrol', at: [c % w, (c / w) | 0], dir: pick(['left', 'right', 'up', 'down']) }); }
  for (let n = 0; n < (o.chasers || 0); n++) { const f = free().filter((i) => dist(w, i, s) >= 5 && !enemies.some((e) => e.at[0] === i % w && e.at[1] === ((i / w) | 0))); if (!f.length) return null; const c = pick(f); enemies.push({ type: 'chaser', at: [c % w, (c / w) | 0] }); }
  return { grid: g.map((r) => r.join('')), enemies, boss: { at: [bp % w, (bp / w) | 0], every: o.every } };
}

function evaluate(id, cand, isBoss, o = {}) {
  const lv0 = { id, grid: cand.grid, enemies: cand.enemies, boss: cand.boss, floors: cand.floors, floors2: cand.floors2, timed: cand.timed && cand.timed.length ? cand.timed : undefined };
  // kilitli kapı: taşların belli bir kısmı çökmeden kapı açılmaz (boss bölümünde boss yeter)
  const tiles = parseLevel(lv0).tileCount;
  const lock = isBoss || o.noLock ? 0 : Math.ceil((tiles - 1) * (o.lockFrac || 0.5));
  const lv = { ...lv0, lock };
  const board = parseLevel(lv);
  const s = newState(board);
  const sh = shortest(s, isBoss ? 600000 : 400000);
  if (!sh || sh.unknown) return null;
  // 3 yıldız hedefi: çökertilebilecek en fazla kare (kanıtlı çözümle)
  let target = null;
  if (!isBoss) {
    const bc = bestCover(s, board.enemies.length ? 300000 : 600000, board.floors ? 2500 : 4000);
    if (!bc) return null;
    target = bc.count;
    if (target < (tiles - 1) * (o.challenge ? 0.9 : 0.8)) return null; // hedef tahtanın çoğu olmalı
  }
  // meydan okuma: kapı ancak hedefin tamamı çökünce açılır
  // (kapıya adım atarken üstünde durduğun taş da çöker: kilit = hedef - 1)
  if (o.challenge && target) { lv.lock = target - 1; board.lock = target - 1; }
  const fr = failRate(s, 300, id * 7 + 3);
  // düşmanlar işe yaramalı: düşmansız hali belirgin şekilde daha kolay olmalı
  if (board.enemies.length && !isBoss) {
    const b0 = parseLevel({ ...lv, enemies: [] }), s0 = newState(b0);
    const sh0 = shortest(s0, 400000);
    const fr0 = failRate(s0, 300, id * 7 + 3);
    const bc0 = bestCover(s0, 400000, 3000);
    const harder = fr - fr0 >= 0.06 || (sh0 && sh0.moves && sh.moves.length - sh0.moves.length >= 2) || (bc0 && bc0.count - target >= 2);
    if (!harder) return null;
  }
  const full = target != null && target >= tiles - 1;
  const stars = isBoss ? null : full ? null : { mode: 'cover', target };
  const extras = (cand.grid.join('').match(/[io1=b<>^v]/g) || []).length;
  const score = tiles * 0.5 + sh.moves.length * 1.2 + fr * 12 + board.keys.length * 2 + extras * 0.5 + board.enemies.length * 2;
  return {
    lv: { ...(cand.floors ? { floors: cand.floors } : {}), ...(cand.floors2 ? { floors2: cand.floors2 } : {}), ...(lv.lock ? { lock: lv.lock } : {}), grid: cand.grid, ...(lv0.timed ? { timed: lv0.timed } : {}), ...(cand.enemies.length ? { enemies: cand.enemies } : {}), ...(cand.boss ? { boss: cand.boss } : {}), ...(stars ? { stars } : {}) },
    min: sh.moves.length, cover: target, fail: fr, score, tiles, special: true,
  };
}

// [ilk, son, dünya, w, h, seçenekler, etiket]
/** Her dünya 35 bölüm: tanıtım, normal, 3 meydan okuma (10/20/30), karanlık, 4 asansörlü (son dünyalarda 3 katlı),
 *  21. bölümden itibaren dünyanın ikinci mekaniği, 3 gizli dişli ve 35. bölümde boss. */
const WS = 35;
const WM = { 1: {}, 2: {}, 3: { ice: 0.22 }, 4: { patrols: 1 }, 5: { strong: 0.3 }, 6: { portal: true }, 7: { chasers: 1 }, 8: { bridge: true }, 9: { arrows: 0.14 }, 10: { mix: true } };
const FM = { 1: {}, 2: {}, 3: { ice: 0.18 }, 4: { patrols: 1 }, 5: { strong: 0.25 }, 6: { portal: true }, 7: {}, 8: {}, 9: { arrows: 0.12 }, 10: {} };
const SECOND = { 1: { boxes: 1 }, 2: { timed: 2 }, 3: { gates: true }, 4: { boxes: 1 }, 5: { timed: 2 }, 6: { gates: true }, 7: { boxes: 2 }, 8: { timed: 3 }, 9: { gates: true }, 10: { boxes: 1, timed: 2 } };
const SECOND_TUT = { 1: 'box', 2: 'timed', 3: 'gate' };
const BASE_TUT = { 2: 'keys', 3: 'ice', 4: 'patrol', 5: 'strong', 6: 'portal', 7: 'chaser', 8: 'bridge', 9: 'arrow', 10: 'castle' };
const BOSS = { 1: { keys: 1, maxFail: 0.8, q: 0.15 }, 2: { keys: 2 }, 3: { keys: 1, ice: 0.12 }, 4: { keys: 1, patrols: 1 }, 5: { keys: 2, strong: 0.12 }, 6: { keys: 1, portal: true }, 7: { keys: 2, chasers: 1 }, 8: { keys: 1, bridge: true }, 9: { keys: 1, arrows: 0.1 }, 10: { keys: 2, chasers: 1, patrols: 1, every: 1 } };
function allSegs() {
  const out = [[1, 1, 1, 5, 5, { corridor: true, tut: 'swipe' }]];
  for (let W = 1; W <= 10; W++) {
    const b0 = (W - 1) * WS + 1, m = WM[W], sec = { ...m, ...SECOND[W] };
    const hard = (W - 1) / 9;
    const F = (k) => Math.min(0.975, 0.74 + hard * 0.14 + (k / 34) * 0.1);
    const extra = W % 2 ? { gnawers: 1 } : { sentries: 1 };
    const enemyWorld = m.patrols || m.chasers;
    const add = (k, w, h, o, tag) => out.push([b0 + k, b0 + k, W, w, h, o, tag]);
    const A = (k, w, h, o, tag) => add(k, w, h, { area: true, holes: w * h > 30 ? [4, 7] : [2, 5], minTiles: Math.round(w * h * 0.74), keys: [1, 2], fail: F(k), ...m, ...o }, tag);
    const L = (k, sz, three, o = {}) => add(k, sz, sz, { floors: true, three, h2: sz, holes: [1, 3], minTiles1: Math.round(sz * sz * 0.72), minTiles2: Math.round(sz * sz * 0.72), keys1: [1, 1], keys2: [1, W >= 5 ? 2 : 1], fail: Math.min(0.97, F(k) + 0.02), ...FM[W], ...o });
    const small = W === 1 ? 4 : 5, mid = 5, big = W >= 5 ? 6 : 5;
    const ws = (k) => (k < 9 ? [small, small + 1] : k < 20 ? [mid, 6] : [big, 6]);
    for (let k = 0; k <= 34; k++) {
      if (W === 1 && k === 0) continue; // 1. bölüm: kaydırma öğreticisi (sabit)
      const [w, h] = ws(k);
      const s2 = k >= 20 ? SECOND[W] : {};
      if (k === 34) { out.push([b0 + 34, b0 + 34, W, W >= 5 ? 7 : 6, W >= 5 ? 7 : 6, { boss: true, every: 2, ...BOSS[W], tut: W === 1 ? 'boss' : undefined }]); continue; }
      if (k === 9 || k === 19 || k === 29) { A(k, 5, 5, { holes: [2, 4], minTiles: 18, keys: [1, 1], challenge: true, fail: 0.6, ...s2, tut: k === 9 && W === 1 ? 'challenge' : undefined }, 'easy'); continue; }
      if (k === 14 || k === 25) { A(k, 5, 5, { holes: [2, 4], minTiles: 18, keys: [1, 1], dark: true, fail: 0.6, ...s2, tut: k === 14 && W === 1 ? 'dark' : undefined }, 'easy'); continue; }
      if (k === 12 || k === 16 || k === 23 || k === 27) {
        const three = (k === 27 && W >= 6) || (k === 23 && W >= 8);
        L(k, k < 20 ? 4 : 5, three, { tut: W === 1 && k === 12 ? 'lift' : three && ((W === 6 && k === 27) || (W === 8 && k === 23)) ? 'floors3' : undefined });
        continue;
      }
      const o = {};
      if (W === 1) {
        // 1. dünya: her şeyin tadımlığı
        const T1 = { 1: ['lock', {}, 'easy'], 4: ['sentry', { sentries: 1 }, 'easy'], 5: ['keys', { keys: [2, 2] }], 6: ['gear', {}], 7: ['patrol', { patrols: 1 }, 'easy'], 10: ['gnawer', { gnawers: 1 }, 'easy'], 13: ['ice', { ice: 0.2 }, 'easy'], 20: ['box', { boxes: 1 }, 'easy'] };
        if (T1[k]) { const [tt, oo, tag] = T1[k]; A(k, w, h, { ...oo, ...s2, tut: tt, ...(k <= 7 ? { holes: [1, 3], minTiles: Math.round(w * h * 0.8) } : {}) }, tag); continue; }
        if (k === 18) Object.assign(o, { sentries: 1 });
        if (k === 22) Object.assign(o, { gnawers: 1 });
        if (k === 32) Object.assign(o, { patrols: 1 });
        if (k < 4) Object.assign(o, { holes: [1, 3] });
        A(k, w, h, { ...o, ...s2 }, (k + 1) % 5 === 0 ? 'easy' : undefined); continue;
      }
      if (k <= 1) { A(k, 5, 5, { holes: [2, 4], minTiles: 18, keys: [1, 1], fail: 0.7, tut: k === 0 ? BASE_TUT[W] : undefined }, 'easy'); continue; }
      if (k === 20) { A(k, 5, 5, { holes: [2, 4], minTiles: 18, keys: [1, 1], fail: 0.7, ...s2, tut: SECOND_TUT[W] }, 'easy'); continue; }
      if ((k === 4 || k === 18) && !enemyWorld && !m.mix) Object.assign(o, extra);
      if (k === 5 || k === 28) Object.assign(o, { keys: [2, 2] });
      if (k >= 30) Object.assign(o, { keys: [2, 3] });
      A(k, w, h, { ...o, ...s2 }, (k + 1) % 5 === 0 && k !== 34 ? 'easy' : undefined);
    }
  }
  return out;
}
const SEG = allSegs();
const GEAR_K = new Set([6, 17, 31]); // her dünyada gizli dişli olan bölümler (dünya içi sıra)
const MIX = [{ ice: 0.25 }, { strong: true }, { portal: true }, { bridge: true }, { arrows: 0.2 }, { patrols: 1 }, { chasers: 1 }, { sentries: 1 }, { gnawers: 1 }, { boxes: 1 }, { timed: 2 }, { gates: true }];

/** Gizli dişli: en kısa çözüm yolunun geçmediği, ama ulaşılabilir bir düz kareye */
function placeGear(lv) {
  const b = parseLevel(lv), s0 = newState(b);
  const sh = shortest(s0, 400000); if (!sh || !sh.moves) return;
  const used = new Set([s0.pos]); const st = newState(b);
  for (const d of sh.moves) { move(st, d); used.add(st.pos); }
  const cand = [];
  for (let i = 0; i < b.cells.length; i++) {
    if (b.cells[i] !== 1 || used.has(i) || b.keys.includes(i) || i === b.door || b.portal[i] >= 0 || b.ckey[i] || b.gate[i] || b.boxes.includes(i)) continue;
    if (b.enemies.some((e) => e.pos === i)) continue;
    cand.push(i);
  }
  if (!cand.length) return;
  const c = pick(cand); lv.gear = [c % b.w, Math.floor(c / b.w)];
}

export { buildArea, buildBoss, evaluate, placeGear, ri, pick, dist };
export const setSeed = (v) => { seed = v; };
const IS_MAIN = import.meta.url === 'file://' + process.argv[1];
if (IS_MAIN) main();
function main() {
const only = process.argv[2] ? +process.argv[2] : 0; // hızlı deneme: belirli bir segment
const levels = [{ id: 1, world: 1, grid: ['#####', 'S...K', '####.', 'D....', '#####'], tutorial: 'swipe' }];
const t0 = Date.now();
// RESUME=1: yarıda kalan üretime /tmp/gen_partial.json'dan devam
const RESUMED = new Set();
if (process.env.RESUME && fs.existsSync('/tmp/gen_partial.json')) { const prev = JSON.parse(fs.readFileSync('/tmp/gen_partial.json', 'utf8')); levels.length = 0; levels.push(...prev); for (const l of prev) RESUMED.add(l.id); }
for (const [a, b, world, w, h, o, tag] of SEG) {
  if (o.corridor) continue;
  if (only && only !== a) continue;
  if (process.env.UPTO && a > +process.env.UPTO) continue;
  const need = b - a + 1;
  if (RESUMED.has(a)) continue;
  const isBoss = !!o.boss;
  const pool = [], seen = new Set(), segT = Date.now();
  let tries = 0;
  const target = isBoss ? 30 : need * 14, maxTries = isBoss ? 6000 : need * (o.area || o.floors ? 20000 : 4000);
  while (pool.length < target && tries < maxTries) {
    tries++;
    // süre sınırı: yeterince aday varsa beklemeden devam
    if (tries % 50 === 0) { const el = Date.now() - segT; if ((el > 50000 && pool.length >= need * 4) || (el > 150000 && pool.length >= need)) break; }
    let oo = o;
    if (o.mix) { const a2 = MIX.slice().sort(() => rnd() - 0.5).slice(0, 2); oo = Object.assign({}, o, ...a2); { const ek = ['patrols', 'chasers', 'sentries', 'gnawers'].filter((k) => oo[k]); for (const k of ek.slice(1)) delete oo[k]; } }
    const cand = isBoss ? buildBoss(w, h, oo) : oo.floors ? buildFloors(w, h, oo.h2, { ...oo, keys1: ri(...oo.keys1), keys2: ri(...oo.keys2) }) : oo.area ? buildArea(w, h, { ...oo, keys: ri(...oo.keys) }) : buildPath(w, h, { ...oo, len: ri(...oo.len), keys: ri(...oo.keys) });
    if (!cand) continue;
    const k = (cand.floors || '') + cand.grid.join('/') + JSON.stringify(cand.enemies) + JSON.stringify(cand.boss || '');
    if (seen.has(k)) continue;
    seen.add(k);
    const ev = evaluate(a, cand, isBoss, { ...o, lockFrac: o.lockFrac ?? (0.45 + (world - 1) * 0.017), noLock: a === 1 });
    if (!ev || ev.min < (isBoss ? 8 : 4)) continue;
    if (o.maxFail && ev.fail > o.maxFail) continue;
    // kestirme yol olmasın: en kısa çözüm karelerin en az yarısı kadar (öğreticiler hariç)
    if (o.area || o.floors) { if (ev.fail < o.fail || (ev.cover == null && !ev.special && !o.sentries && !o.gnawers)) continue; if (ev.min < Math.ceil(ev.tiles * 0.3)) continue; }
    else if (!isBoss && tag !== 'easy' && ev.min < Math.ceil(ev.tiles * (o.patrols || o.chasers || o.sentries || o.gnawers ? 0.42 : 0.5))) continue;
    pool.push(ev);
  }
  pool.sort((x, y) => x.score - y.score);
  console.log(`Bölüm ${a}-${b}: ${pool.length} aday (${tries} deneme, ${((Date.now() - t0) / 1000).toFixed(0)} sn)`);
  if (pool.length < need) throw new Error(`Bölüm ${a}-${b} için yeterli aday yok`);
  for (let k = 0; k < need; k++) {
    let q;
    if (isBoss) q = o.q ?? 0.6;
    else if (tag === 'easy') q = 0.12 + (0.83 * k) / Math.max(1, need - 1);
    else if (o.patrols || o.chasers || o.sentries || o.gnawers) q = 0.25 + (0.65 * k) / Math.max(1, need - 1); // düşmanlı bölümler bir kademe kolay
    else if (o.area || o.floors) q = 0.6 + (0.38 * k) / Math.max(1, need - 1);
    else q = 0.4 + (0.58 * k) / Math.max(1, need - 1);
    const ev = pool[Math.min(pool.length - 1, Math.floor(q * pool.length))];
    pool.splice(pool.indexOf(ev), 1);
    const id = a + k;
    const lv = { id, world, ...ev.lv };
    if (isBoss) lv.final = true;
    if (o.tut && k === 0) lv.tutorial = o.tut;
    if (o.dark) lv.dark = true;
    if (o.challenge) lv.challenge = true;
    if (GEAR_K.has((id - 1) % WS)) placeGear(lv);
    levels.push(lv);
  }
  if (!only) fs.writeFileSync('/tmp/gen_partial.json', JSON.stringify(levels));
}
if (only) process.exit(0);
const upTo = +(process.env.UPTO || 0);
if (upTo) { const old = JSON.parse(fs.readFileSync(new URL('../src/levels/levels.json', import.meta.url), 'utf8')); for (let i = levels.length - 1; i >= 0; i--) if (levels[i].id > upTo) levels.splice(i, 1); for (const l of old) if (l.id > upTo) levels.push(l); }
levels.find((l) => l.id === 1).tutorial = 'swipe';
levels.sort((x, y) => x.id - y.id);
// Tamamen boş satır/sütunları kırp (boss ve düşman koordinatlarını da kaydır)
for (const lv of levels) {
  if (upTo && lv.id > upTo) continue;
  if (lv.floors) continue; // iki katlı: katlar hizalı kalsın, kırpma yok
  let g = lv.grid, ox = 0, oy = 0;
  const rowEmpty = (y) => /^#+$/.test(g[y]);
  while (g.length > 2 && rowEmpty(0)) { g = g.slice(1); oy++; if (lv.floors) lv.floors--; }
  while (g.length > 2 && rowEmpty(g.length - 1)) g = g.slice(0, -1);
  const colEmpty = (c) => g.every((r) => r[c] === '#');
  while (g[0].length > 2 && colEmpty(0)) { g = g.map((r) => r.slice(1)); ox++; }
  while (g[0].length > 2 && colEmpty(g[0].length - 1)) g = g.map((r) => r.slice(0, -1));
  lv.grid = g;
  for (const e of lv.enemies || []) e.at = [e.at[0] - ox, e.at[1] - oy];
  if (lv.boss) lv.boss.at = [lv.boss.at[0] - ox, lv.boss.at[1] - oy];
  if (lv.timed) lv.timed = lv.timed.map(([x, y, n]) => [x - ox, y - oy, n]);
  if (lv.gear) lv.gear = [lv.gear[0] - ox, lv.gear[1] - oy];
}
fs.mkdirSync(new URL('../src/levels/', import.meta.url), { recursive: true });
fs.writeFileSync(new URL('../src/levels/levels.json', import.meta.url), '[\n' + levels.map((l) => JSON.stringify(l)).join(',\n') + '\n]\n');
console.log('Toplam', levels.length, 'bölüm yazıldı');
}
