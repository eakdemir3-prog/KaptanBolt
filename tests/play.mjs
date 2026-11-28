// Ek oynanış testleri: (1) boşluk kalkış pencereleri, (2) altın–devriye çakışması, (3) ölçümler
import { buildLevel } from '../src/level.js';
import { P, stepPlayer, newPlayer, coinHit } from '../src/physics.js';
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
  // devriye uzunlukları ve güvenli iniş alanı
  for (const e of L.enemies) {
    let landBad = L.gaps.some((g) => Math.abs(L.cols[g.e + 1] - e.t) < 0.05 && e.x0 - 0.53 < g.e + 1 + 2.5 && e.x1 + 0.53 > g.e + 1);
    for (const c of [...L.cages, ...L.checkpoints]) if (Math.abs(c.y - e.t) < 0.5 && c.x > e.x0 - 1.1 && c.x < e.x1 + 1.1) landBad = true;
    if (landBad) bad++;
    console.log(`${n} ${e.type} devriye X${e.x0.toFixed(1)}–${e.x1.toFixed(1)} (${(e.x1 - e.x0).toFixed(1)} blok yürür) ${landBad ? '✘ güvenli alana giriyor' : '✔'}`);
  }
}
// zıplama tabelası: tabeladan 0,5 önce, tabeladan ve 0,5 sonra basılı tutarak kalkınca karşıya ulaşılmalı (bütün bölümler)
for (let n = 1; n <= 40; n++) {
  const L = buildLevel(n);
  for (const s of L.signs.filter((q) => q.jump)) {
    const g = L.gaps.find((q) => q.s > s.x && q.s - s.x < 3); if (!g) continue;
    const m = g.e - g.s + 1 >= 3 ? 0.25 : 0.5; const res = [-m, 0, m].map((d) => { const r = runJump(L, s.x + d, s.y, 9); return r && r.x > g.e + 1 && r.y > 0.5; });
    if (res.includes(false)) bad++;
    console.log(`${n} tabela X${s.x.toFixed(2)} → boşluk X${g.s}-${g.e}: -${m} ${res[0] ? '✔' : '✘'} 0 ${res[1] ? '✔' : '✘'} +${m} ${res[2] ? '✔' : '✘'}`);
  }
}
// 39. bölüm sal: salın iki ucundan rahat binilir/inilir (uçtan en fazla 2,2 kare zıplama)
{ const L = buildLevel(39); for (const r of L.rafts) { let g0 = Math.floor(r.x); while (L.cols[g0 - 1] === 0) g0--; let g1 = Math.ceil(r.x + r.w); while (L.cols[g1] === 0) g1++;
  const left = r.x - g0, right = g1 - (r.x + r.range + r.w); const ok = left <= 1.2 && right <= 2.2; if (!ok) bad++;
  console.log(`39 sal X${r.x}–${(r.x + r.range + r.w).toFixed(1)}: sol kıyıya ${left.toFixed(1)}, sağ kıyıya ${right.toFixed(1)} kare ${ok ? '✔' : '✘'}`); } }
// Vadi Girişi X86,5–89,5 altınları yerde ve aynı yükseklikte
{ const L = buildLevel(1); const cs = L.coins.filter((c) => c.x > 86 && c.x < 90); const ok = cs.length === 4 && cs.every((c) => Math.abs(c.y - (L.cols[Math.floor(c.x)] + 0.75)) < 0.01); if (!ok) bad++; console.log(`1 X86,5–89,5 yerde 4 altın ${ok ? '✔' : '✘'}`); }
process.exitCode = bad ? 1 : 0; console.log(bad ? `HATA: ${bad}` : 'Ek testler TAMAM');
