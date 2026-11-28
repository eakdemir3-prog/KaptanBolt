// Ödül taraması: kalp, kristal yıldız ve altınlar üst üste mi, zemine/sandığa gömülü mü, diken/çukur üstünde mi?
import { buildLevel } from '../src/level.js';
const near = (a, b, d) => Math.abs(a.x - b.x) < d && Math.abs(a.y - b.y) < d;
let bad = 0; const rep = [];
for (let n = 1; n <= 60; n++) {
  const L = buildLevel(n), out = [];
  const items = [...L.hearts.map((h) => ({ k: 'kalp', x: h.x, y: h.y, r: 0.36 })), ...(L.star ? [{ k: 'kristal', x: L.star.x, y: L.star.y, r: 0.42 }] : []), ...L.coins.map((c) => ({ k: 'altın', x: c.x, y: c.y, r: 0.37 }))];
  for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
    const a = items[i], b = items[j]; if (a.k === 'altın' && b.k === 'altın') { if (near(a, b, 0.5)) out.push(`altın-altın X${a.x.toFixed(1)},${a.y.toFixed(1)}`); continue; }
    const d = a.r + b.r + 0.08; if (Math.abs(a.x - b.x) < d && Math.abs(a.y - b.y) < d) out.push(`${a.k}+${b.k} X${a.x.toFixed(1)},${a.y.toFixed(1)} / X${b.x.toFixed(1)},${b.y.toFixed(1)}`);
  }
  for (const it of items) {
    if (L.solid(Math.floor(it.x), Math.floor(it.y - 0.25)) || L.solid(Math.floor(it.x), Math.floor(it.y))) out.push(`gömülü ${it.k} X${it.x.toFixed(1)},${it.y.toFixed(1)}`);
    if (L.thorns.some((t) => it.x > t.x0 - 0.2 && it.x < t.x1 + 0.2 && it.y < t.y + 1.3 && it.y > t.y - 0.5)) out.push(`diken-üstü ${it.k} X${it.x.toFixed(1)}`);
    if (it.k !== 'altın' && !L.cols[Math.floor(it.x)] && it.y < 2.5 && !L.oneway.some((s) => it.x > s.x0 && it.x < s.x1)) out.push(`çukur-üstü ${it.k} X${it.x.toFixed(1)},${it.y.toFixed(1)}`);
  }
  for (const h of L.hearts) { const g = L.cols[Math.floor(h.x)]; if (!(g && h.y - g < 1.6) && !L.oneway.some((s) => h.x > s.x0 && h.x < s.x1 && h.y - s.y < 1.6)) out.push(`kalp havada X${h.x.toFixed(1)},${h.y.toFixed(1)}`); }
  if (out.length) { bad += out.length; rep.push(`${n}: ${out.join(' | ')}`); }
}
console.log(rep.join('\n') || 'çakışma yok'); console.log(bad ? `ÖDÜL SORUNU: ${bad}` : 'Ödül taraması TAMAM'); process.exitCode = bad ? 1 : 0;
