// Kaptan Bolt — otomatik çözücü. Oyunla aynı rules.js'i kullanır.
import { HOLE, DIR_LIST, newState, cloneState, move, validMoves, enterable, collapsedCount, coverTarget } from './rules.js';

const keyOf = (s) => s.pos + ':' + s.collapsed.join('');

function neighbors(b, i) {
  const x = i % b.w, y = (i / b.w) | 0, out = [];
  if (x > 0) out.push(i - 1);
  if (x < b.w - 1) out.push(i + 1);
  if (y > 0) out.push(i - b.w);
  if (y < b.h - 1) out.push(i + b.w);
  return out;
}

/** Kalan anahtar ve kapıya komşuluk grafiğinde ulaşılabiliyor mu (güvenli budama). */
function reachableOk(s) {
  const b = s.board;
  const seen = new Uint8Array(b.w * b.h);
  const st = [s.pos]; seen[s.pos] = 1;
  while (st.length) {
    const c = st.pop();
    for (const n of neighbors(b, c)) {
      if (seen[n] || b.cells[n] === HOLE || s.collapsed[n]) continue;
      seen[n] = 1;
      if (n === b.door) continue; // kapıdan geçilmez, kapı son duraktır
      st.push(n);
    }
  }
  if (!seen[b.door]) return false;
  for (let k = 0; k < b.keys.length; k++) if (!s.keysTaken[k] && !seen[b.keys[k]]) return false;
  return true;
}

/** En kısa çözüm (BFS). { moves:[dir..] } veya null. limit aşılırsa {unknown:true} */
export function shortest(state, limit = 400000) {
  const start = cloneState(state);
  if (start.status === 'win') return { moves: [] };
  if (start.status !== 'play' || !reachableOk(start)) return null;
  const seen = new Set([keyOf(start)]);
  let frontier = [{ s: start, path: [] }];
  let nodes = 0;
  while (frontier.length) {
    const next = [];
    for (const { s, path } of frontier) {
      for (const d of validMoves(s)) {
        const n = cloneState(s);
        move(n, d);
        const p = path.concat(d);
        if (n.status === 'win') return { moves: p };
        if (n.status !== 'play' || !reachableOk(n)) continue;
        const k = keyOf(n);
        if (seen.has(k)) continue;
        seen.add(k);
        if (++nodes > limit) return { unknown: true };
        next.push({ s: n, path: p });
      }
    }
    frontier = next;
  }
  return null;
}

/** Hızlı kazanılabilirlik kontrolü (DFS). true/false/null(bilinmiyor) */
export function canWin(state, limit = 150000) {
  const dead = new Set();
  let nodes = 0;
  function dfs(s) {
    if (s.status === 'win') return true;
    if (s.status !== 'play' || !reachableOk(s)) return false;
    const k = keyOf(s);
    if (dead.has(k)) return false;
    if (++nodes > limit) throw 'limit';
    for (const d of validMoves(s)) {
      const n = cloneState(s); move(n, d);
      if (dfs(n)) return true;
    }
    dead.add(k);
    return false;
  }
  try { return dfs(cloneState(state)); } catch (e) { if (e === 'limit') return null; throw e; }
}

/** Kapı hariç tüm kareleri çökerterek bitiren çözüm (3 yıldız). */
export function fullCover(state, limit = 2000000) {
  const b = state.board;
  const target = coverTarget(b);
  let nodes = 0;
  function prune(s) {
    // kalan kareler bağlı olmalı ve kapı dışında çıkmaz kare olmamalı
    const alive = [];
    for (let i = 0; i < b.cells.length; i++) if (b.cells[i] !== HOLE && !s.collapsed[i] && i !== s.pos) alive.push(i);
    const isAlive = (i) => i === s.pos || (b.cells[i] !== HOLE && !s.collapsed[i]);
    for (const c of alive) {
      if (c === b.door) continue;
      let deg = 0;
      for (const n of neighbors(b, c)) if (isAlive(n)) deg++;
      if (deg < 2) return true;
    }
    const seen = new Set([s.pos]); const st = [s.pos];
    while (st.length) { const c = st.pop(); for (const n of neighbors(b, c)) if (!seen.has(n) && isAlive(n)) { seen.add(n); st.push(n); } }
    return seen.size !== alive.length + 1;
  }
  const path = [];
  function dfs(s) {
    if (s.status === 'win') return collapsedCount(s) === target;
    if (s.status !== 'play' || prune(s)) return false;
    if (++nodes > limit) throw 'limit';
    for (const d of validMoves(s)) {
      const n = cloneState(s); move(n, d);
      path.push(d);
      if (dfs(n)) return true;
      path.pop();
    }
    return false;
  }
  try { return dfs(cloneState(state)) ? { moves: path.slice() } : null; }
  catch (e) { if (e === 'limit') return { unknown: true }; throw e; }
}

/** Rastgele oynayan birinin kaybetme oranı (zorluk ölçüsü). Basit deterministik RNG. */
export function failRate(state, runs = 400, seed = 1) {
  let r = seed >>> 0;
  const rnd = () => ((r = (r * 1664525 + 1013904223) >>> 0) / 4294967296);
  let fail = 0;
  for (let t = 0; t < runs; t++) {
    const s = cloneState(state);
    while (s.status === 'play') {
      const v = validMoves(s);
      move(s, v[(rnd() * v.length) | 0]);
    }
    if (s.status !== 'win') fail++;
  }
  return fail / runs;
}

export function replay(board, moves) {
  const s = newState(board);
  for (const d of moves) if (!move(s, d)) return { ok: false, state: s };
  return { ok: true, state: s };
}
