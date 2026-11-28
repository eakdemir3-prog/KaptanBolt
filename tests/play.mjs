// Ek oynanış testleri: (1) boşluk kalkış pencereleri, (2) altın–devriye çakışması, (3) ölçümler
import { buildLevel } from '../src/level.js';
import { P, stepPlayer, newPlayer } from '../src/physics.js';
const DT = 1 / 60;
function runJump(L, x, y, hold, tap = true) {
  const p = newPlayer(x, y); p.ground = true; p.vx = P.RUN; const inp = { right: true, jump: true, jumpPressed: true };
  let t = 0, air = false;
  while (t < 3) { inp.jump = t < hold; stepPlayer(L, p, inp, DT); t += DT; if (!p.ground) air = true; if (air && p.ground) return p; if (p.y < -2) return null; }
  return null;
}
let bad = 0;
for (let n = 1; n <= 5; n++) {
  const L = buildLevel(n);
  for (let x = 1; x < L.w; x++) {
    if (L.cols[x] || !L.cols[x - 1]) continue;
    let e = x; while (!L.cols[e + 1] && e < L.w) e++;
    const w = e - x + 1, h = L.cols[x - 1];
    // kalkış: kenardan 0–2,5 kare önce, 0,05 adımla; kısa dokunuş (1 kare) ve basılı tutma
    const win = { short: 0, long: 0 };
    for (let d = 0.05; d <= 2.5; d += 0.05) {
      const sx = x - d;
      for (const [k, hold] of [['short', 0.001], ['long', 9]]) { const r = runJump(L, sx, h, hold); if (r && r.x > e + 1 && r.y > 0.5) win[k] += 0.05; }
    }
    const ok = (w <= 1 ? win.short : win.long) >= 0.5;
    if (!ok) bad++;
    console.log(`${n} boşluk X${x}-${e} (${w} blok, ${h}→${L.cols[e + 1]}): kısa dokunuş penceresi ${win.short.toFixed(2)} blok, uzun ${win.long.toFixed(2)} blok ${ok ? '✔' : '✘'}`);
    x = e;
  }
  const HW = { bocek: 0.53, kirpi: 0.55 };
  for (const e of L.enemies) for (const c of L.coins) {
    if (c.x > e.x0 - HW[e.type] - 0.4 && c.x < e.x1 + HW[e.type] + 0.4 && c.y < e.t + 1.3 && c.y > e.t) { bad++; console.log(`${n} ✘ altın X${c.x} devriye içinde (${e.type} ${e.x0.toFixed(2)}-${e.x1.toFixed(2)})`); }
  }
}
process.exitCode = bad ? 1 : 0; console.log(bad ? `HATA: ${bad}` : 'Ek testler TAMAM');
