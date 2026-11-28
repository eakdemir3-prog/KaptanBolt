// Erişilebilirlik testi: her bölümde kafeslere, kristal yıldıza, bitişe ve altınlara gerçek fizikle gidilebiliyor mu?
import { buildLevel } from '../src/level.js';
import { LEVELS } from '../src/levels.js';
import { P, stepPlayer, newPlayer, coinHit, applyFields } from '../src/physics.js';

const DT = 1 / 60;
function simLevel(n) {
  const L = buildLevel(n);
  L.crates.clear(); L.iceb.clear(); // sandıklar kırılabilir, buz blokları şimşekle erir: engel sayılmaz
  // sallar: menzil boyunca 5 sabit konumdan örnek
  const ow = L.oneway.filter((s) => !L.rafts.some((r) => r.s === s)).map((s) => ({ ...s }));
  for (const r of L.rafts) for (const k of [0, 0.25, 0.5, 0.75, 1]) {
    const x0 = r.axis === 'x' ? r.x + k * r.range : r.x, y = r.axis === 'y' ? r.t + k * r.range : r.t;
    ow.push({ x0, x1: x0 + r.w, y, raft: true });
  }
  L.oneway = ow;
  const got = { cages: new Set(), star: false, end: false, coins: new Set() };
  const touch = (p) => {
    L.cages.forEach((c, i) => { if (Math.abs(p.x - c.x) < 1.0 && p.y > c.y - 1.2 && p.y < c.y + 3.2) got.cages.add(i); });
    if (L.star && Math.abs(p.x - L.star.x) < P.PW / 2 + 0.45 && L.star.y > p.y - 0.5 && L.star.y < p.y + P.PH + 0.5) got.star = true;
    if (L.end && p.x > L.end.x - 0.3 && Math.abs(p.y - L.end.y) < 2) got.end = true;
    L.coins.forEach((c, i) => { if (coinHit(p, c)) got.coins.add(i); });
    L.hearts.forEach(() => {});
  };
  const thorn = (p) => L.thorns.some((t) => p.x + P.PW / 2 > t.x0 + 0.15 && p.x - P.PW / 2 < t.x1 - 0.15 && p.y < t.y + 0.55 && p.y + P.PH > t.y);
  const spring = (p) => !!applyFields(L, p, DT);
  const key = (p) => `${Math.round(p.x * 4)},${Math.round(p.y * 20)}`;
  const start = newPlayer(L.start.x, L.cols[2] || 2); start.ground = true;
  const seen = new Set([key(start)]); const q = [start];
  const run = (s0, act) => {
    const p = { ...s0 }; const inp = { left: false, right: false, jump: false, jumpPressed: false };
    if (act.v) p.vx = act.dir * P.RUN;
    let t = 0, air = false, moved = 0; const x0 = p.x;
    if (act.jump) { inp.jump = true; inp.jumpPressed = true; }
    while (t < (act.late ? 5 : 3.2)) {
      if (act.jump) { inp.jump = t < act.hold; const d = air ? (t < (act.pre || 0) ? act.dir : act.late && t > act.at ? act.late : act.air) : act.dir; inp.left = d < 0; inp.right = d > 0; }
      else { inp.left = act.dir < 0; inp.right = act.dir > 0; }
      stepPlayer(L, p, inp, DT); t += DT;
      spring(p);
      if (thorn(p)) return null;
      touch(p);
      if (p.y < -3) return null;
      if (!p.ground) air = true;
      if (air && p.ground) return p;
      if (!act.jump && !air && Math.abs(p.x - x0) >= 0.5) return p;
      if (!act.jump && !air && t > 0.5) return p;
    }
    return null;
  };
  const acts = [];
  for (const dir of [-1, 1]) {
    acts.push({ jump: false, dir });
    for (const v of [0, 1]) for (const hold of [0, 0.14, 1]) for (const air of [dir, 0, -dir]) acts.push({ jump: true, dir, v, hold, air });
    // spor bulutu: önce yerinde süzül, sonra bir yöne kay
    for (const at of [0.8, 1.6, 2.4]) for (const late of [-1, 1]) for (const pre of [0, 0.25]) acts.push({ jump: true, dir, v: 0, hold: 1, air: 0, late, at, pre });
  }
  while (q.length && seen.size < 9000) {
    const s = q.shift();
    for (const a of acts) {
      const r = run(s, a); if (!r) continue;
      r.vx = 0; r.vy = 0;
      const k = key(r); if (seen.has(k)) continue; seen.add(k); q.push(r);
    }
  }
  got.maxX = Math.max(...[...seen].map((k) => +k.split(',')[0] / 4));
  return { L, got, states: seen.size };
}
const only = process.argv[2] ? [+process.argv[2]] : LEVELS.map((_, i) => i + 1);
let bad = 0;
for (const n of only) {
  const t0 = Date.now();
  const { L, got, states } = simLevel(n);
  const miss = [];
  L.cages.forEach((c, i) => { if (!got.cages.has(i)) miss.push(`kafes@${c.x}`); });
  if (L.star && !got.star) miss.push(`yıldız@${L.star.x},${L.star.y}`);
  if (!got.end) miss.push('BİTİŞ');
  const missC = L.coins.map((c, i) => (got.coins.has(i) ? null : `${c.x.toFixed(1)},${c.y.toFixed(1)}`)).filter(Boolean);
  // altın katı blok içinde ya da diken üstünde mi? düşman devriyesi kafes/kayıt noktasına giriyor mu?
  const L2 = buildLevel(n);
  for (const c of L2.coins) { if (L2.solid(Math.floor(c.x), Math.floor(c.y))) miss.push(`blok-içi-altın@${c.x.toFixed(1)},${c.y.toFixed(1)}`); if (L2.thorns.some((t) => c.x > t.x0 && c.x < t.x1 && c.y < t.y + 1.2)) miss.push(`diken-altın@${c.x.toFixed(1)}`); }
  for (const e of L2.enemies) { for (const c of [...L2.cages, ...L2.checkpoints]) if (c.x > e.x0 - 1.2 && c.x < e.x1 + 1.2 && Math.abs(c.y - e.t) < 0.5) miss.push(`devriye-çakışma ${e.type}@${e.x0.toFixed(1)}-${e.x1.toFixed(1)}`); if (e.x1 - e.x0 < 0.3) miss.push(`devriye-dar ${e.type}@${e.x.toFixed(1)}`); }
  if (miss.length) bad++;
  console.log(`${String(n).padStart(2)} ${LEVELS[n - 1].name.padEnd(20)} w=${L.w} altın=${L.coins.length} alınan=${got.coins.size} kafes=${L.cages.length} durum=${states} enUzak=${got.maxX} ${((Date.now() - t0) / 1000).toFixed(1)}sn ${miss.length ? 'EKSİK: ' + miss.join(' ') : 'TAMAM'}${missC.length ? ' | ulaşılamayan altın: ' + missC.join(' ') : ''}`);
}
process.exitCode = bad ? 1 : 0;
