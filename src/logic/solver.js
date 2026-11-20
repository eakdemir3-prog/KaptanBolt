// Kaptan Bolt — otomatik çözücü. Oyunla aynı rules.js'i kullanır.
import { HOLE, DIR_LIST, newState, cloneState, move, validMoves, enterable, collapsedCount, coverTarget } from './rules.js';

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
const keyOf = (s) => s.pos + ':' + s.collapsed.join('') + (s.board.strongCount ? ':' + s.hits.join('') : '')
  + (s.enemies.length ? ':' + s.enemies.map((e) => (e.alive ? e.pos + e.dir[0] + (e.type === 'sentry' ? e.tick % 2 : '') : 'x')).join(',') : '')
  + (s.boss ? ':' + (s.boss.alive ? s.boss.pos + '/' + (s.boss.tick % s.boss.every) : 'x') : '')
  + (s.pressed ? 'P' : '') + (s.moves === 0 ? 'Z' : '') + (s.frozen ? 'F' + s.frozen : '')
  + (s.box.length ? ':B' + s.box.join(',') + ':' + s.fill.join('') : '') + (s.cks ? 'C' + s.cks : '')
  + (s.board.timed.length ? 'T' + Math.min(s.moves, s.board.tmax || (s.board.tmax = Math.max(...s.board.timed.map((t) => t[1])))) : '');

function neighbors(b, i) {
  const x = i % b.w, y = (i / b.w) | 0, out = [];
  if (x > 0) out.push(i - 1);
  if (x < b.w - 1) out.push(i + 1);
  if (y > 0) out.push(i - b.w);
  if (y < b.h - 1) out.push(i + b.w);
  if (b.portal[i] >= 0) out.push(b.portal[i]);
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
export function shortest(state, limit = 400000, ms = 0) {
  const deadline = ms ? now() + ms : 0;
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
        if (++nodes > limit || (deadline && (nodes & 127) === 0 && now() > deadline)) return { unknown: true };
        next.push({ s: n, path: p });
      }
    }
    frontier = next;
  }
  return null;
}

/** Hızlı kazanılabilirlik kontrolü (DFS). true/false/null(bilinmiyor) */
export function canWin(state, limit = 150000, ms = 0) {
  const deadline = ms ? now() + ms : 0;
  const dead = new Set();
  let nodes = 0;
  function dfs(s) {
    if (s.status === 'win') return true;
    if (s.status !== 'play' || !reachableOk(s)) return false;
    const k = keyOf(s);
    if (dead.has(k)) return false;
    if (++nodes > limit || (deadline && (nodes & 127) === 0 && now() > deadline)) throw 'limit';
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

/** Kazanırken çökertilebilecek en fazla kare (dal-sınır DFS). { count, moves } ; budget aşılırsa o ana kadarki en iyisi.
 *  need verilirse o sayıya ulaşınca hemen döner (ipucu için). */
export function bestCover(state, limit = 600000, ms = 0, need = 0) {
  const b = state.board, t0 = now();
  let nodes = 0, best = -1, bestMoves = null, done = false;
  const seenAt = new Map();
  const path = [];
  const upper = (s) => {
    // şu ana kadar çöken + robotun ulaşabileceği sağlam kareler (kapı hariç)
    const seen = new Uint8Array(b.w * b.h); const st = [s.pos]; seen[s.pos] = 1; let n = 0;
    while (st.length) { const c = st.pop(); for (const q of neighbors(b, c)) { if (seen[q] || b.cells[q] === HOLE || s.collapsed[q]) continue; seen[q] = 1; if (q === b.door) continue; n++; st.push(q); } }
    return collapsedCount(s) + n + 1;
  };
  function dfs(s) {
    if (done) return;
    if (s.status === 'win') { const c = collapsedCount(s); if (c > best) { best = c; bestMoves = path.slice(); if (need && c >= need) done = true; } return; }
    if (s.status !== 'play') return;
    if (++nodes > limit || (ms && (nodes & 255) === 0 && now() - t0 > ms)) { done = true; return; }
    if (upper(s) <= best) return;
    const k = keyOf(s); if (seenAt.has(k)) return; seenAt.set(k, 1);
    if (!reachableOk(s)) return;
    for (const d of validMoves(s)) {
      const n = cloneState(s); move(n, d);
      path.push(d); dfs(n); path.pop();
      if (done) return;
    }
  }
  dfs(cloneState(state));
  return best < 0 ? null : { count: best, moves: bestMoves, complete: !done || (need && best >= need) };
}
