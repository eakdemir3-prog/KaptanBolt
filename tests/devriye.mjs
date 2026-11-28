// Devriye raporu: 3 bloktan kısa devriye, kafes/bayrak/boşluk kenarına giren ya da üst üste binen rota
import { buildLevel } from '../src/level.js';
let bad = 0, short = [];
for (let n = 1; n <= 140; n++) {
  const L = buildLevel(n); const out = [];
  for (const e of L.enemies) {
    const len = e.x1 - e.x0; if (len < 2.95) { out.push(`kısa ${e.type}@${e.x.toFixed(1)} ${len.toFixed(1)}`); }
    for (const c of [...L.cages, ...L.checkpoints]) if (Math.abs(c.y - e.t) < 0.5 && c.x > e.x0 - 1.5 && c.x < e.x1 + 1.5) out.push(`kafes/bayrak ${e.type}@${e.x.toFixed(1)}`);
    for (const g of L.gaps) { if (Math.abs(L.cols[g.e + 1] - e.t) < 0.05 && e.x0 - 0.5 < g.e + 1 + 2.4 && e.x1 + 0.5 > g.e + 1) out.push(`iniş-alanı ${e.type}@${e.x.toFixed(1)}`); }
    for (const f of L.enemies) if (f !== e && f.t === e.t && f.x > e.x && e.x1 + 0.5 + 2.4 > f.x0 - 0.5) out.push(`iç-içe ${e.type}@${e.x.toFixed(1)}`);
  }
  if (out.length) { bad += out.length; short.push(`${n}: ${out.join(' | ')}`); }
}
console.log(short.join('\n') || 'devriye sorunu yok'); console.log(bad ? `DEVRİYE SORUNU: ${bad}` : 'Devriye taraması TAMAM'); process.exitCode = bad ? 1 : 0;
