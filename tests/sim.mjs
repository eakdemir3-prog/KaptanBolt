// Erişilebilirlik testi: her bölümde kafeslere, kristal yıldıza, bitişe ve altınlara gerçek fizikle gidilebiliyor mu?
import { buildLevel } from '../src/level.js';
import { LEVELS } from '../src/levels.js';
import { P, stepPlayer, newPlayer } from '../src/physics.js';

const DT = 1 / 60;
function simLevel(n) {
  const L = buildLevel(n);
  L.crates.clear(); // sandıklar kırılabilir: engel sayılmaz
  // sallar: menzil boyunca 5 sabit konumdan örnek
  const ow = L.bridges.map((s) => ({ ...s }));
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
    L.coins.forEach((c, i) => { if (Math.abs(p.x - c.x) < P.PW / 2 + 0.38 && c.y > p.y - 0.4 && c.y < p.y + P.PH + 0.4) got.coins.add(i); });
    L.hearts.forEach(() => {});
  };
  const thorn = (p) => L.thorns.some((t) => p.x + P.PW / 2 > t.x0 + 0.15 && p.x - P.PW / 2 < t.x1 - 0.15 && p.y < t.y + 0.55 && p.y + P.PH > t.y);
  const spring = (p) => { for (const s of L.springs) if (p.vy <= 0 && Math.abs(p.x - s.x) < 0.75 && p.y >= s.y - 0.05 && p.y < s.y + 0.9) { p.vy = P.SPRING; p.noCut = true; p.ground = false; p.surf = null; return true; } return false; };
  const key = (p) => `${Math.round(p.x * 4)},${Math.round(p.y * 20)}`;
  const start = newPlayer(L.start.x, L.cols[2] || 2); start.ground = true;
  const seen = new Set([key(start)]); const q = [start];
  const run = (s0, act) => {
    const p = { ...s0 }; const inp = { left: false, right: false, jump: false, jumpPressed: false };
    if (act.v) p.vx = act.dir * P.RUN;
    let t = 0, air = false, moved = 0; const x0 = p.x;
    if (act.jump) { inp.jump = true; inp.jumpPressed = true; }
    while (t < 3.2) {
      if (act.jump) { inp.jump = t < act.hold; const d = air ? act.air : act.dir; inp.left = d < 0; inp.right = d > 0; }
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
  }
  while (q.length && seen.size < 9000) {
    const s = q.shift();
    for (const a of acts) {
      const r = run(s, a); if (!r) continue;
      r.vx = 0; r.vy = 0;
      const k = key(r); if (seen.has(k)) continue; seen.add(k); q.push(r);
    }
  }
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
  if (miss.length) bad++;
  console.log(`${String(n).padStart(2)} ${LEVELS[n - 1].name.padEnd(20)} w=${L.w} altın=${L.coins.length} alınan=${got.coins.size} kafes=${L.cages.length} durum=${states} ${((Date.now() - t0) / 1000).toFixed(1)}sn ${miss.length ? 'EKSİK: ' + miss.join(' ') : 'TAMAM'}${missC.length ? ' | ulaşılamayan altın: ' + missC.join(' ') : ''}`);
}
process.exitCode = bad ? 1 : 0;
