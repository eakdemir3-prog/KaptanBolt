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
 * enemies: [{ type: 'patrol'|'chaser'|'sentry'|'gnawer', at: [x, y], dir?: 'left'|... }]
 *   sentry: yerinden kıpırdamaz; iki hamlede bir baktığı yöne lazer atar (bir hamle önce uyarır)
 *   gnawer: devriye gibi gidip gelir, terk ettiği kareyi çökertir; yakalamaz, üstüne basınca ezilir
 * boss: { at: [x, y] (2x2 sol üst), every: 1|2 }
 * X kutu (itilir; çukura/çökmüş kareye düşerse orayı doldurur, üstünden bir kez geçilir)
 * r R / g G: renkli anahtar ve bariyer (anahtarı alınca aynı renkteki bariyer açılır, normal kare olur)
 * timed: [[x, y, n]] zamanlı taş: n. hamleden sonra kendiliğinden çöker (üstündeysen düşersin)
 * floorH: [h1, h2, ...] çok katlı bölüm (katlar arasında 2 boş satır); asansör çiftleri sırayla L M Q W Y
 *   (eski biçim: floors: h1, floors2: h2)
 * liftLock: [n1, n2, ...] her katta asansöre binmek için o katta çökmesi gereken taş sayısı
 * darkFloors: [f...] karanlık katlar
 * floors: N  => iki katlı bölüm: ilk N satır 1. kat, sonra 2 boş ayırıcı satır, kalanlar 2. kat.
 *   L L: asansör çifti (portal gibi çalışır: binince öbür kata çıkar, bindiği kare çöker)
 */
export function parseLevel(level) {
  const rows = level.grid;
  const h = rows.length, w = rows[0].length;
  const cells = new Uint8Array(w * h);
  const portal = new Int16Array(w * h).fill(-1);
  const keys = [], pmap = {}, boxes = [];
  const ckey = new Uint8Array(w * h), gate = new Uint8Array(w * h);
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
        case 'L': cells[i] = TILE; (pmap.L = pmap.L || []).push(i); break;
        case 'M': case 'Q': case 'W': case 'Y': cells[i] = TILE; (pmap[ch] = pmap[ch] || []).push(i); break;
        case 'X': cells[i] = TILE; boxes.push(i); break;
        case 'r': cells[i] = TILE; ckey[i] = 1; break;
        case 'g': cells[i] = TILE; ckey[i] = 2; break;
        case 'R': cells[i] = TILE; gate[i] = 1; break;
        case 'G': cells[i] = TILE; gate[i] = 2; break;
        default:
          if (ch >= '1' && ch <= '9') { cells[i] = TILE; (pmap[ch] = pmap[ch] || []).push(i); break; }
          throw new Error(`Bölüm ${level.id}: bilinmeyen karakter '${ch}'`);
      }
    }
  }
  if (level.floors && (!pmap.L || pmap.L.length !== 2)) throw new Error(`Bölüm ${level.id}: iki katlı bölümde asansör çifti yok`);
  if (level.floors2 && (!pmap.M || pmap.M.length !== 2)) throw new Error(`Bölüm ${level.id}: üç katlı bölümde ikinci asansör yok`);
  // kat yükseklikleri
  let fh = null;
  if (level.floorH) fh = level.floorH.slice();
  else if (level.floors) { fh = [level.floors]; if (level.floors2) { fh.push(level.floors2); fh.push(h - level.floors - 2 - level.floors2 - 2); } else fh.push(h - level.floors - 2); }
  const liftPairs = ['L', 'M', 'Q', 'W', 'Y'].map((c) => pmap[c]).filter(Boolean);
  if (fh && liftPairs.length !== fh.length - 1) throw new Error(`Bölüm ${level.id}: ${fh.length} kat için ${fh.length - 1} asansör çifti gerekli`);
  for (const [k, v] of Object.entries(pmap)) {
    if (v.length !== 2) throw new Error(`Bölüm ${level.id}: portal ${k} çift değil`);
    portal[v[0]] = v[1]; portal[v[1]] = v[0];
  }
  if (start < 0 || door < 0) throw new Error(`Bölüm ${level.id}: başlangıç veya kapı yok`);
  let tileCount = 0, strongCount = 0;
  for (let i = 0; i < cells.length; i++) { if (cells[i] !== HOLE) tileCount++; if (cells[i] === STRONG) strongCount++; }
  const enemies = (level.enemies || []).map((e) => ({ type: e.type, pos: e.at[1] * w + e.at[0], dir: e.dir || 'right' }));
  tileCount -= enemies.filter((e) => e.type === 'sentry').length; // nöbetçinin karesi hiç çökmez
  const boss = level.boss ? { pos: level.boss.at[1] * w + level.boss.at[0], every: level.boss.every || 2 } : null;
  return { id: level.id, w, h, cells, portal, keys, start, door, tileCount, strongCount, enemies, boss, lock: level.lock || 0, floors: fh ? fh[0] : 0, fh, liftPairs, liftLock: level.liftLock || null, darkFloors: level.darkFloors || [], floorThemes: level.floorThemes || null, floorNames: level.floorNames || null, lift: pmap.L || null, boxes, ckey, gate, hasGate: gate.some((x) => x), timed: (level.timed || []).map(([x, y, n]) => [y * w + x, n]), dark: !!level.dark, challenge: !!level.challenge, gear: level.gear ? level.gear[1] * w + level.gear[0] : -1, stars: level.stars || { mode: 'cover' } };
}

export function newState(board) {
  return {
    board,
    pos: board.start,
    collapsed: new Uint8Array(board.w * board.h),
    hits: new Uint8Array(board.w * board.h),
    keysTaken: board.keys.map(() => false),
    enemies: board.enemies.map((e) => ({ ...e, alive: true, tick: 0 })),
    boss: board.boss ? { pos: board.boss.pos, every: board.boss.every, alive: true, tick: 0 } : null,
    pressed: false,
    box: Int16Array.from(board.boxes), fill: new Uint8Array(board.w * board.h), cks: 0, gear: false,
    frozen: 0,
    moves: 0,
    status: 'play', // play | win | stuck | caught
  };
}

export function cloneState(s) {
  return {
    board: s.board, pos: s.pos, collapsed: s.collapsed.slice(), hits: s.hits.slice(),
    keysTaken: s.keysTaken.slice(), enemies: s.enemies.map((e) => ({ ...e })),
    boss: s.boss ? { ...s.boss } : null, pressed: s.pressed, box: s.box.slice(), fill: s.fill.slice(), cks: s.cks, gear: s.gear, frozen: s.frozen || 0, moves: s.moves, status: s.status,
  };
}

export const allKeys = (s) => s.keysTaken.every(Boolean);
export const collapsedCount = (s) => { let n = 0; for (const c of s.collapsed) n += c; return n; };
/** Kapı: tüm anahtarlar + boss yenik + (kilitli kapıda) yeterli taş çökmüş */
export const doorOpen = (s) => allKeys(s) && (!s.boss || !s.boss.alive) && (!s.board.lock || collapsedCount(s) >= s.board.lock);

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
  if (s.fill[i]) return false; // kutuyla doldurulmuş çukur
  return c === HOLE || s.collapsed[i] === 1 || (c === BRIDGE && !s.pressed);
}

/** Bu karede düşman veya boss var mı (forPlayer: kemirici böcek robotun önünü kesmez, ezilir) */
export const gateClosed = (s, i) => s.board.gate[i] && !(s.cks & s.board.gate[i]);
export const boxAt = (s, i) => s.box.indexOf(i);
export function occupied(s, i, skip, forPlayer = false) {
  if (gateClosed(s, i)) return true;
  if (!forPlayer && s.box.includes(i)) return true;
  for (const e of s.enemies) if (e !== skip && e.alive && e.pos === i && !(forPlayer && e.type === 'gnawer')) return true;
  if (s.boss && s.boss.alive && s.boss !== skip && bossCells(s.board, s.boss.pos).includes(i)) return true;
  return false;
}

/** Robot bu kareye girebilir mi? */
export function enterable(s, i) {
  if (i < 0) return false;
  const b = s.board;
  if (isGap(s, i)) return false;
  if (i === b.door && !doorOpen(s)) return false; // kilitli kapı duvardır
  if (occupied(s, i, null, true)) return false;     // düşmanın üstüne yürünmez (böcek hariç)
  if (s.box.includes(i)) return false;              // kutu: ancak itilerek (canMove)
  if (b.liftLock && b.portal[i] >= 0 && isLift(b, i)) {   // kat kilidi: o katta yeterli taş çökmeden asansör çalışmaz
    const f = floorOf(b, i);
    if (floorOf(b, b.portal[i]) > f && floorCollapsed(s, f) < (b.liftLock[f] || 0)) return false;
  }
  return true;
}

/** Kutu i karesinden dir yönüne itilebilir mi: hedef boş kare ya da çukur (çukura düşer) */
export function pushTarget(s, i, dir) {
  const b = s.board, p = step(b, i, dir);
  if (p < 0 || p === b.door || p === s.pos) return -1;
  if (s.box.includes(p) || occupied(s, p, null, false) || b.portal[p] >= 0 || b.keys.includes(p) || b.ckey[p]) return -1;
  if (b.cells[p] === BUTTON) return -1;
  return p;
}
export function canMove(s, dir) {
  if (s.status !== 'play') return false;
  const n = step(s.board, s.pos, dir);
  if (n >= 0 && s.box.includes(n)) {
    if (isGap(s, n) || occupied(s, n, null, true)) return false;
    return pushTarget(s, n, dir) >= 0;
  }
  return enterable(s, n);
}
/** Zıpla gücü: bir karenin (boşluk/çöken/düşman) üstünden atlayıp ikinci kareye iner */
export function jumpTarget(s, dir) {
  const mid = step(s.board, s.pos, dir);
  if (mid < 0 || mid === s.board.door) return -1;
  const t = step(s.board, mid, dir);
  return enterable(s, t) ? t : -1;
}
export const canJump = (s, dir) => s.status === 'play' && jumpTarget(s, dir) >= 0;
export function validMoves(s) { return DIR_LIST.filter((d) => canMove(s, d)); }

function leave(s, i, events) {
  if (s.fill[i]) { s.fill[i] = 0; events.push({ t: 'unfill', cell: i }); return; } // kutu da düşer
  if (s.board.cells[i] === STRONG && s.hits[i] === 0) { s.hits[i] = 1; events.push({ t: 'crack', cell: i }); return; }
  const was = s.board.lock ? doorOpen(s) : true;
  s.collapsed[i] = 1; events.push({ t: 'collapse', cell: i });
  if (!was) checkDoor(s, was, events);
}

function checkDoor(s, wasOpen, events) {
  if (!wasOpen && doorOpen(s)) events.push({ t: 'doorOpen', cell: s.board.door });
}

/** Robot i karesine vardı: anahtar, kapı, portal. true => hareket bitti (kazandı veya ışınlandı) */
function arrive(s, i, events) {
  const b = s.board;
  for (const e of s.enemies) if (e.alive && e.type === 'gnawer' && e.pos === i) { e.alive = false; events.push({ t: 'squash', id: s.enemies.indexOf(e), cell: i }); }
  if (b.ckey[i] && !(s.cks & b.ckey[i])) { s.cks |= b.ckey[i]; events.push({ t: 'ckey', cell: i, color: b.ckey[i] }); }
  if (i === b.gear && !s.gear) { s.gear = true; events.push({ t: 'gear', cell: i }); }
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
  const pf = b.fh ? floorOf(b, s.pos) : 0;
  for (const e of s.enemies) {
    if (!e.alive) continue;
    if (b.fh && floorOf(b, e.pos) !== pf) continue; // başka kattaki düşmanlar bekler
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
    } else if (e.type === 'sentry') {
      e.tick++;
      const beam = laserCells(b, e);
      if (e.tick % 2 === 0) {
        events.push({ t: 'laser', id: s.enemies.indexOf(e), cells: beam });
        if (beam.includes(s.pos)) { s.status = 'caught'; events.push({ t: 'caught', by: 'laser' }); return; }
      } else events.push({ t: 'laserCharge', id: s.enemies.indexOf(e), cells: beam });
      continue;
    } else if (e.type === 'gnawer') {
      const nx = gnawerNext(s, e);
      if (!nx) { events.push({ t: 'enemyWait', id: s.enemies.indexOf(e) }); continue; }
      const from = e.pos;
      events.push({ t: 'enemyMove', id: s.enemies.indexOf(e), from, to: nx.n, dir: nx.d });
      e.pos = nx.n; e.dir = nx.d;
      const ki = b.keys.indexOf(from);
      if (!(ki >= 0 && !s.keysTaken[ki])) leave(s, from, events);
      continue;
    } else {
      chase(s, e, 1, events);
    }
    if (e.alive && e.pos === s.pos) { s.status = 'caught'; events.push({ t: 'caught', by: s.enemies.indexOf(e) }); return; }
  }
  const bo = s.boss;
  if (bo && bo.alive && (!b.fh || floorOf(b, bo.pos) === pf)) {
    bo.tick++;
    if (bo.tick % bo.every === 0) chase(s, bo, 2, events);
    else events.push({ t: 'bossCharge' });
    if (bo.alive && bossCells(b, bo.pos).includes(s.pos)) { s.status = 'caught'; events.push({ t: 'caught', by: 'boss' }); }
  }
}

/** Nöbetçinin lazerinin geçtiği kareler (kendi karesi hariç, tahta kenarına kadar) */
export function laserCells(b, e) {
  const out = []; let n = step(b, e.pos, e.dir);
  while (n >= 0) { out.push(n); n = step(b, n, e.dir); }
  return out;
}
/** Kemirici böceğin bir sonraki karesi: önü kapalıysa geri döner. Sadece düz/buz/sağlam karelerde yürür. */
export function gnawerNext(s, e) {
  const b = s.board;
  for (const d of [e.dir, OPP[e.dir]]) {
    const n = step(b, e.pos, d);
    if (n < 0 || isGap(s, n) || n === b.door || n === s.pos || occupied(s, n, e) || b.portal[n] >= 0) continue;
    const c = b.cells[n];
    if (c !== TILE && c !== ICE && c !== STRONG) continue;
    return { n, d };
  }
  return null;
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
export function move(s, dir, opt = {}) {
  if (opt.jump ? !canJump(s, dir) : !canMove(s, dir)) return null;
  const b = s.board;
  const events = [];
  const next = opt.jump ? jumpTarget(s, dir) : step(b, s.pos, dir);
  s.moves++;
  if (!opt.jump) {
    const bi = s.box.indexOf(next);
    if (bi >= 0) {
      const p = pushTarget(s, next, dir);
      if (isGap(s, p)) { s.box[bi] = -1; s.fill[p] = 1; events.push({ t: 'push', box: bi, from: next, to: p, sink: true }); }
      else { s.box[bi] = p; events.push({ t: 'push', box: bi, from: next, to: p, sink: false }); }
    }
  }
  leave(s, s.pos, events);
  events.push({ t: 'step', from: s.pos, to: next, slide: false, jump: !!opt.jump });
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
  // Düşmanlar ilk hamlende uyanır: ilk hamle her zaman güvenlidir. Dondur gücü varken beklerler.
  if (s.status === 'play' && s.frozen > 0 && (s.enemies.length || s.boss)) { s.frozen--; events.push({ t: 'frozen', left: s.frozen }); }
  else if (s.status === 'play' && s.moves > 1) moveEnemies(s, events);
  else if (s.status === 'play' && s.moves === 1 && (s.enemies.length || s.boss)) events.push({ t: 'wake' });
  // zamanlı taşlar: süresi dolan kendiliğinden çöker
  if (s.status === 'play' && b.timed.length) {
    const was = doorOpen(s);
    for (const [c, n] of b.timed) {
      if (s.moves < n || s.collapsed[c]) continue;
      if (s.fill[c]) continue;
      s.collapsed[c] = 1; events.push({ t: 'collapse', cell: c, timed: true });
      if (s.pos === c) { s.status = 'caught'; events.push({ t: 'caught', by: 'fall' }); break; }
    }
    checkDoor(s, was, events);
  }
  if (s.status === 'play' && validMoves(s).length === 0) { s.status = 'stuck'; events.push({ t: 'stuck' }); }
  return events;
}

/** 3 yıldız için çökmesi gereken kare sayısı (kapı hariç tüm kareler) */
export function coverTarget(board) { return board.stars && board.stars.target ? board.stars.target : board.tileCount - 1; }

export function starsFor(s) {
  if (s.status !== 'win') return 0;
  const st = s.board.stars;
  if (st.mode === 'moves') return s.moves <= st.par[0] ? 3 : s.moves <= st.par[1] ? 2 : 1;
  const ratio = collapsedCount(s) / coverTarget(s.board);
  if (ratio >= 1) return 3;
  if (ratio >= 0.75) return 2;
  return 1;
}

/** İki katlı bölümde karenin katı (0 = 1. kat, 1 = 2. kat) */
export function floorOf(board, i) {
  if (!board.fh) return 0;
  let y = Math.floor(i / board.w);
  for (let f = 0; f < board.fh.length; f++) { if (y < board.fh[f] + (f < board.fh.length - 1 ? 2 : 0)) return f; y -= board.fh[f] + 2; }
  return board.fh.length - 1;
}
/** Kat sayısı */
export const floorCount = (b) => (b.fh ? b.fh.length : 1);
/** Katın ilk satırı */
export const floorStartRow = (b, f) => { let y = 0; for (let k = 0; k < f; k++) y += b.fh[k] + 2; return y; };
/** O katta çöken taş sayısı */
export function floorCollapsed(s, f) { const b = s.board; let n = 0; for (let i = 0; i < b.cells.length; i++) if (s.collapsed[i] && floorOf(b, i) === f) n++; return n; }
export const isLift = (b, i) => !!(b.liftPairs && b.liftPairs.some((p) => p.includes(i)));
