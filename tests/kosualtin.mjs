// Koşarken alınan yer altınları: zemin/platform/köprü üstündeki altınlar koşan Bolt'un çarpışma kutusuna girmeli,
// "ne yerde ne havada" (zıplamadan alınamayan ama zıplama yayında da olmayan) altın kalmamalı.
import { buildLevel } from '../src/level.js';
import { P } from '../src/physics.js';
const reach = P.PH + P.COIN_UP; let bad = 0, ground = 0, total = 0;
for (let n = 1; n <= 140; n++) { const L = buildLevel(n); const out = [];
  const floor = (c) => { let best = -1e9; const h = L.cols[Math.floor(c.x)]; if (h && h <= c.y) best = h;
    for (const s of L.oneway) if (c.x >= s.x0 && c.x <= s.x1 && s.y <= c.y + 0.01) best = Math.max(best, s.y);
    for (const b of L.bridges || []) if (c.x >= b.x0 && c.x <= b.x1 && b.y <= c.y + 0.01) best = Math.max(best, b.y); return best; };
  for (const c of L.coins) { total++; const d = c.y - floor(c); if (d < 0.2) out.push(`gömülü X${c.x.toFixed(1)} d=${d.toFixed(2)}`); else if (d < reach) ground++; else if (d < 1.95 && !c.gapArc && !c.arc) out.push(`yarım-yükseklik X${c.x.toFixed(1)} d=${d.toFixed(2)}`); }
  if (out.length) { bad += out.length; console.log(n, out.slice(0, 6).join(' | ')); } }
console.log(`toplam ${total} altın, koşarken alınan yer altını ${ground}`); console.log(bad ? `KOŞU ALTIN SORUNU: ${bad}` : 'Koşu altın taraması TAMAM');
