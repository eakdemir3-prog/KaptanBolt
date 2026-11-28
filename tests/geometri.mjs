// Geometri taraması (140 bölüm): zorunlu zıplamaların kalkış penceresi (kusursuz zamanlama gerekmesin),
// basamak tırmanışları, havadaki blok altında kafa çarpması, kafes tabanı ve hayvanın çıkış alanı.
import { buildLevel } from '../src/level.js';
import { P, stepPlayer, newPlayer } from '../src/physics.js';
const DT = 1 / 60;
const run = (L, x, y, hold) => { const p = newPlayer(x, y); p.ground = true; p.vx = P.RUN; const inp = { right: true, jump: true, jumpPressed: true }; let t = 0, air = false;
  while (t < 3) { inp.jump = t < hold; stepPlayer(L, p, inp, DT); t += DT; if (!p.ground) air = true; if (air && p.ground) return p; if (p.y < -2) return null; } return null; };
let bad = 0; const rep = [];
const only = process.argv[2] ? [+process.argv[2]] : Array.from({ length: 140 }, (_, i) => i + 1);
for (const n of only) {
  const L = buildLevel(n); L.crates.clear(); L.iceb.clear(); const out = [];
  const covered = (x0, x1) => L.bridges.some((b) => b.x0 < x0 + 0.5 && b.x1 > x1 + 0.5) || L.rafts.some((r) => r.x < x1 + 1 && r.x + r.w + (r.axis === 'x' ? r.range : 0) > x0) || L.crumbles.some((c) => c.x < x1 + 1 && c.x + c.w > x0) || L.spores.some((z) => z.x0 < x1 + 1 && z.x1 > x0) || L.plats.some((q) => q.x < x1 + 1 && q.x + q.w > x0 && q.y + 1 <= Math.max(L.cols[x0 - 1] || 0, L.cols[x1 + 1] || 0) + 2.5);
  // boşluklar: tam zıplamayla karşıya geçilen kalkış aralığı en az 0,5 blok
  for (const g of L.gaps) {
    if (covered(g.s, g.e)) continue; const hb = L.cols[g.s - 1], ha = L.cols[g.e + 1]; if (!hb || !ha) continue;
    let win = 0; for (let d = 0; d <= 3.5; d += 0.05) { const r = run(L, g.s - d, hb, 9); if (r && r.x > g.e + 1 && r.y >= ha - 0.01) win += 0.05; }
    if (win < 0.5) out.push(`boşluk X${g.s}-${g.e} (${g.e - g.s + 1} blok, ${hb}→${ha}) pencere ${win.toFixed(2)}`);
  }
  // basamaklar: 2 ve üzeri yükseklik farkı koşarak çıkılmalı (pencere ≥ 0,5)
  for (let x = 1; x < L.w; x++) { const a = L.cols[x - 1], b = L.cols[x]; if (!a || !b || b - a < 2) continue;
    if (L.springs.some((s) => s.x > x - 8 && s.x < x) || L.spores.some((z) => z.x1 > x - 8 && z.x0 < x)) continue; // yayla/rüzgârla çıkılan basamak
    let win = 0; for (let d = 0.4; d <= 4; d += 0.05) { const r = run(L, x - d, a, 9); if (r && r.x > x && r.y >= b - 0.01) win += 0.05; }
    if (win < 0.5) out.push(`basamak X${x} ${a}→${b} pencere ${win.toFixed(2)}`); }
  // kafesler: taban zeminde, iki yanı aynı yükseklikte; önünde 2 blok boş
  for (const c of L.cages) { const fx = Math.floor(c.x); const g = [L.cols[fx - 1], L.cols[fx], L.cols[fx + 1]];
    const sup = (x) => L.cols[Math.floor(x)] === c.y || L.oneway.some((s) => x >= s.x0 && x <= s.x1 && Math.abs(s.y - c.y) < 0.05);
    if (![c.x - 0.5, c.x, c.x + 0.5].every(sup)) out.push(`kafes tabanı X${c.x} (${g.join(',')} / ${c.y})`);
    for (let k = 1; k <= 2; k++) if (L.solid(fx + k, Math.floor(c.y)) || L.solid(fx + k, Math.floor(c.y + 1))) out.push(`kafes önü dolu X${c.x}`); }
  if (out.length) { bad += out.length; rep.push(`${n}: ${out.join(' | ')}`); }
}
console.log(rep.join('\n') || 'geometri sorunu yok'); console.log(bad ? `GEOMETRİ SORUNU: ${bad}` : 'Geometri taraması TAMAM'); process.exitCode = bad ? 1 : 0;
