// Kaptan Bolt — oyun kuralları (oyun, çözücü ve testler aynı dosyayı kullanır)
// Kare tipleri
export const HOLE = 0, TILE = 1, ICE = 2;
export const DIRS = {
  up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0],
};
export const DIR_LIST = ['up', 'down', 'left', 'right'];

/**
 * Bölüm verisi:
 * { id, grid: ["S.#K", ...] }   . kare  # boşluk  i buz  S başlangıç  K anahtar  D kapı
 */
export function parseLevel(level) {
  const rows = level.grid;
  const h = rows.length, w = rows[0].length;
  const cells = new Uint8Array(w * h);
  const keys = [];
  let start = -1, door = -1;
  for (let y = 0; y < h; y++) {
    if (rows[y].length !== w) throw new Error(`Bölüm ${level.id}: satır uzunlukları farklı`);
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x], i = y * w + x;
      switch (ch) {
        case '#': cells[i] = HOLE; break;
        case '.': cells[i] = TILE; break;
        case 'i': cells[i] = ICE; break;
        case 'S': cells[i] = TILE; start = i; break;
        case 'K': cells[i] = TILE; keys.push(i); break;
        case 'D': cells[i] = TILE; door = i; break;
        default: throw new Error(`Bölüm ${level.id}: bilinmeyen karakter '${ch}'`);
      }
    }
  }
  if (start < 0 || door < 0) throw new Error(`Bölüm ${level.id}: başlangıç veya kapı yok`);
  let tileCount = 0;
  for (let i = 0; i < cells.length; i++) if (cells[i] !== HOLE) tileCount++;
  return { id: level.id, w, h, cells, keys, start, door, tileCount };
}

export function newState(board) {
  return {
    board,
    pos: board.start,
    collapsed: new Uint8Array(board.w * board.h),
    keysTaken: board.keys.map(() => false),
    moves: 0,
    status: 'play', // play | win | stuck
  };
}

export function cloneState(s) {
  return {
    board: s.board, pos: s.pos, collapsed: s.collapsed.slice(),
    keysTaken: s.keysTaken.slice(), moves: s.moves, status: s.status,
  };
}

export const allKeys = (s) => s.keysTaken.every(Boolean);
export const doorOpen = allKeys;
export const collapsedCount = (s) => { let n = 0; for (const c of s.collapsed) n += c; return n; };

function step(board, i, dir) {
  const [dx, dy] = DIRS[dir];
  const x = (i % board.w) + dx, y = Math.floor(i / board.w) + dy;
  if (x < 0 || y < 0 || x >= board.w || y >= board.h) return -1;
  return y * board.w + x;
}

/** Robot bu kareye girebilir mi? */
export function enterable(s, i) {
  if (i < 0) return false;
  const b = s.board;
  if (b.cells[i] === HOLE || s.collapsed[i]) return false;
  if (i === b.door && !doorOpen(s)) return false; // kilitli kapı duvardır
  return true;
}

export function canMove(s, dir) {
  return s.status === 'play' && enterable(s, step(s.board, s.pos, dir));
}

export function validMoves(s) {
  return DIR_LIST.filter((d) => canMove(s, d));
}

function arrive(s, i, events) {
  const b = s.board;
  const k = b.keys.indexOf(i);
  if (k >= 0 && !s.keysTaken[k]) {
    s.keysTaken[k] = true;
    events.push({ t: 'key', cell: i, index: k });
    if (allKeys(s)) events.push({ t: 'doorOpen', cell: b.door });
  }
  if (i === b.door && doorOpen(s)) {
    s.status = 'win';
    events.push({ t: 'win' });
    return true;
  }
  return false;
}

/**
 * Hamle yap. Geçersizse null döner (hamle sayılmaz).
 * Geçerliyse durumu yerinde değiştirir ve animasyon olaylarını döndürür.
 */
export function move(s, dir) {
  if (!canMove(s, dir)) return null;
  const b = s.board;
  const events = [];
  let next = step(b, s.pos, dir);
  s.moves++;
  // ilk adım
  s.collapsed[s.pos] = 1;
  events.push({ t: 'collapse', cell: s.pos });
  events.push({ t: 'step', from: s.pos, to: next, slide: false });
  s.pos = next;
  if (!arrive(s, next, events)) {
    // buzda kayma
    while (b.cells[s.pos] === ICE) {
      const n2 = step(b, s.pos, dir);
      if (!enterable(s, n2)) break; // geçemiyorsa buzun üstünde durur
      s.collapsed[s.pos] = 1;
      events.push({ t: 'collapse', cell: s.pos });
      events.push({ t: 'step', from: s.pos, to: n2, slide: true });
      s.pos = n2;
      if (arrive(s, n2, events)) break;
    }
  }
  if (s.status === 'play' && validMoves(s).length === 0) {
    s.status = 'stuck';
    events.push({ t: 'stuck' });
  }
  return events;
}

/** Kapı hariç tüm kareler çöktü mü (3 yıldız şartı) */
export function coverTarget(board) { return board.tileCount - 1; }

export function starsFor(s) {
  if (s.status !== 'win') return 0;
  const ratio = collapsedCount(s) / coverTarget(s.board);
  if (ratio >= 1) return 3;
  if (ratio >= 0.7) return 2;
  return 1;
}
