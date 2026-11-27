// Bölüm kurucu: levels.js'deki tarifleri oyunun kullandığı ızgaraya çevirir.
// Koordinatlar: 1 birim = 1 kare, y=0 en alt. "t" = üstünde durulan yüzeyin yüksekliği.
import { LEVELS } from './levels.js';

export function buildLevel(n) {
  const def = LEVELS[n - 1];
  const L = {
    n, name: def.name, w: 0, cols: [], plats: [], crates: new Map(), bridges: [], rafts: [], coins: [], enemies: [], cages: [],
    springs: [], thorns: [], hearts: [], star: null, signs: [], decos: [], vines: [], checkpoints: [], end: null, boss: null, start: { x: 2.5, y: 2 }, ship: false,
  };
  const b = {
    x: 0, at: 0, h: 2,
    ground(n, h = b.h) { b.at = b.x; b.h = h; for (let i = 0; i < n; i++) L.cols[b.x++] = h; return b; },
    gap(n) { b.at = b.x; for (let i = 0; i < n; i++) L.cols[b.x++] = 0; return b; },
    /** boşluk + üstünde ip köprü (yalnızca yukarıdan basılır) */
    bridge(n) { b.at = b.x; L.bridges.push({ x0: b.x - 0.2, x1: b.x + n + 0.2, y: b.h }); for (let i = 0; i < n; i++) L.cols[b.x++] = 0; return b; },
    /** yüzen kaya: üst yüzeyi t */
    plat(dx, t, w) { L.plats.push({ x: b.at + dx, y: t - 1, w }); return b; },
    /** hareketli sal: axis 'x' ya da 'y', range kare, hız kare/sn */
    raft(dx, t, w, axis = 'x', range = 3, speed = 1.6) { L.rafts.push({ x: b.at + dx, t, w, axis, range, speed }); return b; },
    row(dx, t, n, step = 1) { for (let i = 0; i < n; i++) L.coins.push({ x: b.at + dx + i * step + 0.5, y: t + 0.75 }); return b; },
    /** gerçek zıplama eğrisi üzerinde para (koşarak, tuş basılı) */
    arc(dx, t, n, step = 0.9) {
      const RUN = 6.8, GU = 46, GD = 74, H = 3.3, V0 = Math.sqrt(2 * GU * H), tu = V0 / GU;
      for (let i = 1; i <= n; i++) { const tt = (i * step) / RUN; const y = tt <= tu ? V0 * tt - 0.5 * GU * tt * tt : H - 0.5 * GD * (tt - tu) ** 2; L.coins.push({ x: b.at + dx + i * step, y: t + y + 0.6 }); }
      return b;
    },
    col(dx, t0, n) { for (let i = 0; i < n; i++) L.coins.push({ x: b.at + dx + 0.5, y: t0 + 0.75 + i }); return b; },
    e(type, dx, t = null) { L.enemies.push({ type, x: b.at + dx + 0.5, t: t ?? b.h }); return b; },
    cage(dx, t = null, animal = null) { L.cages.push({ x: b.at + dx + 0.5, y: t ?? b.h, animal }); return b; },
    spring(dx, t = null) { L.springs.push({ x: b.at + dx + 0.5, y: t ?? b.h }); return b; },
    crate(dx, t = null) { const y = t ?? b.h; L.crates.set(`${b.at + dx},${y}`, { x: b.at + dx, y }); return b; },
    thorns(dx, w, t = null) { L.thorns.push({ x0: b.at + dx, x1: b.at + dx + w, y: t ?? b.h }); return b; },
    heart(dx, t = null) { L.hearts.push({ x: b.at + dx + 0.5, y: (t ?? b.h) + 0.8 }); return b; },
    star(dx, t = null) { L.star = { x: b.at + dx + 0.5, y: (t ?? b.h) + 0.9 }; return b; },
    sign(dx, text = '') { L.signs.push({ x: b.at + dx + 0.5, y: b.h, text }); return b; },
    deco(kind, dx, t = null, z = -0.85, s = 1) { L.decos.push({ kind, x: b.at + dx + 0.5, y: t ?? b.h, z, s }); return b; },
    cp(dx = 1) { L.checkpoints.push({ x: b.at + dx + 0.5, y: b.h }); return b; },
    end(dx = 4) { L.end = { x: b.at + dx + 0.5, y: b.h }; return b; },
    boss(x0, x1) { L.boss = { x0: b.at + x0, x1: b.at + x1, y: b.h }; return b; },
  };
  def.build(b);
  L.w = b.x;
  fillCoins(L, def.coins || 50);
  const cols = L.cols;
  L.solid = (x, y) => {
    if (x < 0 || x >= L.w) return y < 40; // kenar duvarları
    if (y < 0) return false;
    if (y < cols[x]) return true;
    if (L.crates.has(`${x},${y}`)) return true;
    for (const p of L.plats) if (y === p.y && x >= p.x && x < p.x + p.w) return true;
    return false;
  };
  // tek yönlü yüzeyler: köprüler sabit, sallar her karede güncellenir
  L.oneway = L.bridges.map((s) => ({ ...s }));
  for (const r of L.rafts) { r.s = { x0: r.x, x1: r.x + r.w, y: r.t, dx: 0 }; r.ph = 0; L.oneway.push(r.s); }
  L.groundAt = (x) => cols[Math.floor(x)] || 0;
  return L;
}

/** Salları t anına göre konumlandır (oyun ve test ortak) */
export function updateRafts(L, time, dt) {
  for (const r of L.rafts) {
    const k = Math.sin(time * r.speed / Math.max(1, r.range) * 2) * 0.5 + 0.5; // 0..1 arası gidip gelir
    const off = k * r.range;
    const x0 = r.axis === 'x' ? r.x + off : r.x, y = r.axis === 'y' ? r.t + off : r.t;
    r.s.dx = x0 - r.s.x0; r.s.dy = y - r.s.y;
    r.s.x0 = x0; r.s.x1 = x0 + r.w; r.s.y = y;
  }
}

/** Altın sayısı hedefin altındaysa: önce boş kaya platformlarının üstüne, sonra boş düz zemine 3'lü sıralar ekler */
function fillCoins(L, target) {
  const near = (x, y, r = 1.6) => L.coins.some((c) => Math.abs(c.x - x) < r && Math.abs(c.y - y) < 2) || L.cages.some((c) => Math.abs(c.x - x) < 1.6 && Math.abs(c.y - y) < 2) || (L.star && Math.abs(L.star.x - x) < 1.2 && Math.abs(L.star.y - y) < 2);
  for (const p of L.plats) {
    if (L.coins.length >= target) return;
    const t = p.y + 1, cx = p.x + p.w / 2;
    if (near(cx, t + 0.75, p.w / 2 + 0.6)) continue;
    for (let i = 0; i < p.w; i++) L.coins.push({ x: p.x + i + 0.5, y: t + 0.75 });
  }
  const busy = (x, h) => near(x, h + 0.75, 3) || L.enemies.some((e) => Math.abs(e.x - x) < 3) || L.springs.some((s) => Math.abs(s.x - x) < 2.5) || L.thorns.some((t) => x > t.x0 - 2 && x < t.x1 + 2) || L.checkpoints.some((c) => Math.abs(c.x - x) < 2) || (L.end && x > L.end.x - 4) || [...L.crates.values()].some((c) => Math.abs(c.x - x) < 2) || L.plats.some((p) => x > p.x - 1 && x < p.x + p.w + 1 && p.y - L.cols[Math.floor(x)] < 3);
  for (let x = 6; x < L.w - 4 && L.coins.length < target; x++) {
    const h = L.cols[x]; if (!h || L.cols[x + 1] !== h || L.cols[x + 2] !== h || L.cols[x - 1] !== h) continue;
    if (busy(x + 1.5, h)) continue;
    for (let i = 0; i < 3; i++) L.coins.push({ x: x + i + 0.5, y: h + 0.75 });
    x += 5;
  }
}
