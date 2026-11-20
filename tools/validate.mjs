// Bölüm doğrulayıcı: node tools/validate.mjs
// levels.json'daki her bölümü oyunla aynı kurallarla çözer, çözümü tekrar oynatır ve tablo halinde raporlar.
import fs from 'node:fs';
import { parseLevel, newState, collapsedCount, coverTarget, starsFor } from '../src/logic/rules.js';
import { shortest, bestCover, failRate, replay } from '../src/logic/solver.js';

const levels = JSON.parse(fs.readFileSync(new URL('../src/levels/levels.json', import.meta.url)));
let bad = 0;
const rows = [];
for (const lv of levels) {
  const b = parseLevel(lv);
  const s = newState(b);
  let sh = shortest(s, 800000);
  // meydan okumada kapı ancak hepsi çökünce açılır: en kısa çözüm = 3 yıldızlı çözüm
  if ((!sh || !sh.moves) && b.challenge) { const bc = bestCover(s, 3000000, 20000, coverTarget(b)); if (bc && bc.moves) sh = { moves: bc.moves }; }
  let ok = !!(sh && sh.moves), three = '-';
  if (ok) {
    const r1 = replay(b, sh.moves);
    ok = r1.ok && r1.state.status === 'win';
    if (b.boss) { three = 'boss'; ok = ok && starsFor(r1.state) >= 1; }
    else if (b.stars.mode === 'cover') {
      // 3 yıldız hedefine ulaşan bir çözüm bulunmalı (hedef çözücünün kanıtladığı sayı)
      const fc = bestCover(s, 3000000, 20000, coverTarget(b));
      const r2 = fc && fc.moves ? replay(b, fc.moves) : null;
      ok = ok && !!r2 && r2.ok && r2.state.status === 'win' && collapsedCount(r2.state) >= coverTarget(b) && starsFor(r2.state) === 3;
      three = fc?.moves?.length ?? 'YOK';
    } else {
      ok = ok && starsFor(r1.state) === 3; // en kısa çözüm 3 yıldız almalı
      three = `≤${b.stars.par[0]} hamle`;
    }
  }
  if (!ok) bad++;
  const ch = lv.grid.join('');
  rows.push({
    no: lv.id, dunya: lv.world, tahta: `${b.w}x${b.h}`, kare: b.tileCount, anahtar: b.keys.length,
    ozel: [ch.includes('i') && 'buz', ch.includes('o') && 'sağlam', /[1-9]/.test(ch) && 'portal', ch.includes('=') && 'köprü', /[<>^v]/.test(ch) && 'ok', b.enemies.some((e) => e.type === 'patrol') && 'devriye', b.enemies.some((e) => e.type === 'chaser') && 'takipçi', b.boss && 'BOSS', b.floors && (b.floors2 ? '3kat' : '2kat'), b.boxes.length && 'kutu', b.hasGate && 'bariyer', b.timed.length && 'zamanlı', b.dark && 'karanlık', b.challenge && 'meydan', b.lock && 'kilit' + b.lock, lv.gear && 'dişli'].filter(Boolean).join(' '),
    enKisa: sh?.moves?.length ?? '-', ucYildiz: three, kaybetme: failRate(s, 300, lv.id).toFixed(2), durum: ok ? 'OK' : 'HATA',
  });
}
if (!process.argv.includes('--quiet')) console.table(rows);
fs.writeFileSync(new URL('../tests/level-report.json', import.meta.url), JSON.stringify(rows, null, 1));
console.log(bad ? `${bad} bölüm HATALI` : `Tüm ${levels.length} bölüm çözülebilir ve 3 yıldız alınabilir.`);
process.exit(bad ? 1 : 0);
