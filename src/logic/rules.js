// Kaptan Bolt — oyun kuralları (oyun, çözücü ve testler aynı dosyayı kullanır)
export const HOLE = 0, TILE = 1, ICE = 2, STRONG = 3, BRIDGE = 4, BUTTON = 5, ARROW_U = 6, ARROW_D = 7, ARROW_L = 8, ARROW_R = 9;
export const ARROW_DIR = { [ARROW_U]: 'up', [ARROW_D]: 'down', [ARROW_L]: 'left', [ARROW_R]: 'right' };
const ARROW_CH = { '^': ARROW_U, 'v': ARROW_D, '<': ARROW_L, '>': ARROW_R };
export const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export const DIR_LIST = ['up', 'down', 'left', 'right'];
const OPP = { up: 'down', down: 'up', left: 'right', right: 'left' };

/**
 * Bölüm verisi:
 * grid: . kare  # boşluk  i buz  o sağlam taş  S başlangıç  K anahtar  D kapı  1-4 portal çiftleri
 *       b düğme  = köprü (düğmeye basılınca açılır)  ^ v < > ok kareler
 * enemies: [{ type: 'patrol'|'chaser', at: [x, y], dir?: 'left'|... }]
 * boss: { at: [x, y] (2x2 sol üst), every: 1|2 }
 */
export function parseLevel(level) {
  const rows = level.grid;
  const h = rows.length, w = rows[0].length;
  const cells = new Uint8Array(w * h);
  const portal = new Int16Array(w * h).fill(-1);
  const keys = [], pmap = {};
  let start = -1, door = -1;
  for (let y = 0; y < h; y++) {
    if (rows[y].length !== w) throw new Error(`Bölüm ${level.id}: satır uzunlukları farklı`);
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x], i = y * w + x;
      switch (ch) {
        case '#': cells[i] = HOLE; break;
        case '.': cells[i] = TILE; break;
        case 'i': cells[i] = ICE; break;
        case 'o': cells[i] = STRONG; break;
        case '=': cells[i] = BRIDGE; break;
        case 'b': cells[i] = BUTTON; break;
        case '^': case 'v': case '<': case '>': cells[i] = ARROW_CH[ch]; break;
        case 'S': cells[i] = TILE; start = i; break;
        case 'K': cells[i] = TILE; keys.push(i); break;
        case 'D': cells[i] = TILE; door = i; break;
        default:
          if (ch >= '1' && ch <= '9') { cells[i] = TILE; (pmap[ch] = pmap[ch] || []).push(i); break; }
          throw new Error(`Bölüm ${level.id}: bilinmeyen karakter '${ch}'`);
      }
    }
  }
  for (const [k, v] of Object.entries(pmap)) {
    if (v.length !== 2) throw new Error(`Bölüm ${level.id}: portal ${k} çift değil`);
    portal[v[0]] = v[1]; portal[v[1]] = v[0];
  }
  if (start < 0 || door < 0) throw new Error(`Bölüm ${level.id}: başlangıç veya kapı yok`);
  let tileCount = 0, strongCount = 0;
  for (let i = 0; i < cells.length; i++) { if (cells[i] !== HOLE) tileCount++; if (cells[i] === STRONG) strongCount++; }
  const enemies = (level.enemies || []).map((e) => ({ type: e.type, pos: e.at[1] * w + e.at[0], dir: e.dir || 'right' }));
  const boss = level.boss ? { pos: level.boss.at[1] * w + level.boss.at[0], every: level.boss.every || 2 } : null;
  return { id: level.id, w, h, cells, portal, keys, start, door, tileCount, strongCount, enemies, boss, stars: level.stars || { mode: 'cover' } };
}

export function newState(board) {
  return {
    board,
    pos: board.start,
    collapsed: new Uint8Array(board.w * board.h),
    hits: new Uint8Array(board.w * board.h),
    keysTaken: board.keys.map(() => false),
    enemies: board.enemies.map((e) => ({ ...e, alive: true })),
    boss: board.boss ? { pos: board.boss.pos, every: board.boss.every, alive: true, tick: 0 } : null,
    pressed: false,
    moves: 0,
    status: 'play', // play | win | stuck | caught
  };
}

export function cloneState(s) {
  return {
    board: s.board, pos: s.pos, collapsed: s.collapsed.slice(), hits: s.hits.slice(),
    keysTaken: s.keysTaken.slice(), enemies: s.enemies.map((e) => ({ ...e })),
    boss: s.boss ? { ...s.boss } : null, pressed: s.pressed, moves: s.moves, status: s.status,
  };
}

export const allKeys = (s) => s.keysTaken.every(Boolean);
export const doorOpen = (s) => allKeys(s) && (!s.boss || !s.boss.alive);
export const collapsedCount = (s) => { let n = 0; for (const c of s.collapsed) n += c; return n; };

export function step(board, i, dir) {
  const [dx, dy] = DIRS[dir];
  const x = (i % board.w) + dx, y = Math.floor(i / board.w) + dy;
  if (x < 0 || y < 0 || x >= board.w || y >= board.h) return -1;
  return y * board.w + x;
}

export function bossCells(board, pos) {
  return [pos, pos + 1, pos + board.w, pos + board.w + 1];
}

/** Bu kare boşluk mu (çukur, çökmüş kare veya kapalı köprü) */
export function isGap(s, i) {
  const c = s.board.cells[i];
  return c === HOLE || s.collapsed[i] === 1 || (c === BRIDGE && !s.pressed);
}

/** Bu karede düşman veya boss var mı */
export function occupied(s, i, skip) {
  for (const e of s.enemies) if (e !== skip && e.alive && e.pos === i) return true;
  if (s.boss && s.boss.alive && s.boss !== skip && bossCells(s.board, s.boss.pos).includes(i)) return true;
  return false;
}

/** Robot bu kareye girebilir mi? */
export function enterable(s, i) {
  if (i < 0) return false;
  const b = s.board;
  if (isGap(s, i)) return false;
  if (i === b.door && !doorOpen(s)) return false; // kilitli kapı duvardır
  if (occupied(s, i)) return false;                 // düşmanın üstüne yürünmez
  return true;
}

export function canMove(s, dir) { return s.status === 'play' && enterable(s, step(s.board, s.pos, dir)); }
export function validMoves(s) { return DIR_LIST.filter((d) => canMove(s, d)); }

function leave(s, i, events) {
  if (s.board.cells[i] === STRONG && s.hits[i] === 0) { s.hits[i] = 1; events.push({ t: 'crack', cell: i }); return; }
  s.collapsed[i] = 1; events.push({ t: 'collapse', cell: i });
}

function checkDoor(s, wasOpen, events) {
  if (!wasOpen && doorOpen(s)) events.push({ t: 'doorOpen', cell: s.board.door });
}

/** Robot i karesine vardı: anahtar, kapı, portal. true => hareket bitti (kazandı veya ışınlandı) */
function arrive(s, i, events) {
  const b = s.board;
  const k = b.keys.indexOf(i);
  if (k >= 0 && !s.keysTaken[k]) {
    const was = doorOpen(s);
    s.keysTaken[k] = true;
    events.push({ t: 'key', cell: i, index: k });
    checkDoor(s, was, events);
  }
  if (i === b.door && doorOpen(s)) { s.status = 'win'; events.push({ t: 'win' }); return true; }
  if (b.cells[i] === BUTTON && !s.pressed) { s.pressed = true; events.push({ t: 'bridgeOpen', cell: i }); }
  const q = b.portal[i];
  if (q >= 0 && enterable(s, q)) {
    leave(s, i, events);
    events.push({ t: 'teleport', from: i, to: q });
    s.pos = q;
    return true;
  }
  return false;
}

function moveEnemies(s, events) {
  const b = s.board;
  for (const e of s.enemies) {
    if (!e.alive) continue;
    if (e.type === 'patrol') {
      let moved = false;
      for (const d of [e.dir, OPP[e.dir]]) {
        const n = step(b, e.pos, d);
        if (n < 0 || isGap(s, n) || n === b.door || occupied(s, n, e)) continue;
        events.push({ t: 'enemyMove', id: s.enemies.indexOf(e), from: e.pos, to: n, dir: d });
        e.pos = n; e.dir = d; moved = true;
        break;
      }
      if (!moved) events.push({ t: 'enemyWait', id: s.enemies.indexOf(e) });
    } else {
      chase(s, e, 1, events);
    }
    if (e.alive && e.pos === s.pos) { s.status = 'caught'; events.push({ t: 'caught', by: s.enemies.indexOf(e) }); return; }
  }
  const bo = s.boss;
  if (bo && bo.alive) {
    bo.tick++;
    if (bo.tick % bo.every === 0) chase(s, bo, 2, events);
    else events.push({ t: 'bossCharge' });
    if (bo.alive && bossCells(b, bo.pos).includes(s.pos)) { s.status = 'caught'; events.push({ t: 'caught', by: 'boss' }); }
  }
}

/** Takipçi / boss: oyuncuya doğru bir adım. Önündeki çukuru görmez, düşer. */
function chase(s, e, size, events) {
  const b = s.board, isBoss = size === 2;
  const ex = e.pos % b.w + (size - 1) / 2, ey = Math.floor(e.pos / b.w) + (size - 1) / 2;
  const px = s.pos % b.w, py = Math.floor(s.pos / b.w);
  const dx = px - ex, dy = py - ey;
  const hx = dx > 0 ? 'right' : dx < 0 ? 'left' : null, vy = dy > 0 ? 'down' : dy < 0 ? 'up' : null;
  const order = Math.abs(dx) >= Math.abs(dy) ? [hx, vy] : [vy, hx];
  const wasOpen = doorOpen(s);
  for (const d of order) {
    if (!d) continue;
    const n = step(b, e.pos, d);
    if (n < 0) continue;
    const cells = isBoss ? bossCells(b, n) : [n];
    // boss için 2x2 alanın tamamı tahtada olmalı
    if (isBoss && (n % b.w > b.w - 2 || Math.floor(n / b.w) > b.h - 2)) continue;
    if (cells.some((c) => c === b.door)) continue;
    if (cells.some((c) => occupied(s, c, e))) continue;
    const from = e.pos;
    e.pos = n;
    if (cells.some((c) => isGap(s, c))) {
      e.alive = false;
      events.push({ t: isBoss ? 'bossFall' : 'enemyFall', id: isBoss ? 'boss' : s.enemies.indexOf(e), from, to: n, dir: d });
      checkDoor(s, wasOpen, events);
    } else {
      events.push({ t: isBoss ? 'bossMove' : 'enemyMove', id: isBoss ? 'boss' : s.enemies.indexOf(e), from, to: n, dir: d });
    }
    return;
  }
  events.push({ t: isBoss ? 'bossWait' : 'enemyWait', id: isBoss ? 'boss' : s.enemies.indexOf(e) });
}

/**
 * Hamle yap. Geçersizse null döner (hamle sayılmaz).
 * Geçerliyse durumu yerinde değiştirir ve animasyon olaylarını döndürür.
 */
export function move(s, dir) {
  if (!canMove(s, dir)) return null;
  const b = s.board;
  const events = [];
  const next = step(b, s.pos, dir);
  s.moves++;
  leave(s, s.pos, events);
  events.push({ t: 'step', from: s.pos, to: next, slide: false });
  s.pos = next;
  if (!arrive(s, next, events)) {
    let cur = dir;
    // buzda kayma / ok karelerde itilme
    while (b.cells[s.pos] === ICE || ARROW_DIR[b.cells[s.pos]]) {
      const push = !!ARROW_DIR[b.cells[s.pos]];
      if (push) cur = ARROW_DIR[b.cells[s.pos]];
      const n2 = step(b, s.pos, cur);
      if (!enterable(s, n2)) break;              // geçemiyorsa olduğu yerde durur
      leave(s, s.pos, events);
      events.push({ t: 'step', from: s.pos, to: n2, slide: true, push });
      s.pos = n2;
      if (arrive(s, n2, events)) break;
    }
  }
  // Düşmanlar ilk hamlende uyanır: ilk hamle her zaman güvenlidir
  if (s.status === 'play' && s.moves > 1) moveEnemies(s, events);
  else if (s.status === 'play' && s.moves === 1 && (s.enemies.length || s.boss)) events.push({ t: 'wake' });
  if (s.status === 'play' && validMoves(s).length === 0) { s.status = 'stuck'; events.push({ t: 'stuck' }); }
  return events;
}

/** 3 yıldız için çökmesi gereken kare sayısı (kapı hariç tüm kareler) */
export function coverTarget(board) { return board.tileCount - 1; }

export function starsFor(s) {
  if (s.status !== 'win') return 0;
  const st = s.board.stars;
  if (st.mode === 'moves') return s.moves <= st.par[0] ? 3 : s.moves <= st.par[1] ? 2 : 1;
  const ratio = collapsedCount(s) / coverTarget(s.board);
  if (ratio >= 1) return 3;
  if (ratio >= 0.7) return 2;
  return 1;
}
