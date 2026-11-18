// Bölüm doğrulayıcı: node tools/validate.mjs
// levels.json'daki her bölümü oyunla aynı kurallarla çözer ve tablo halinde raporlar.
import fs from 'node:fs';
import { parseLevel, newState, collapsedCount, coverTarget } from '../src/logic/rules.js';
import { shortest, fullCover, failRate, replay } from '../src/logic/solver.js';

const levels = JSON.parse(fs.readFileSync(new URL('../src/levels/levels.json', import.meta.url)));
let bad = 0;
const rows = [];
for (const lv of levels) {
  const b = parseLevel(lv);
  const s = newState(b);
  const sh = shortest(s);
  const fc = fullCover(s);
  let ok = !!(sh && sh.moves && fc && fc.moves);
  // çözümleri oyun kurallarıyla tekrar oynat
  if (ok) {
    const r1 = replay(b, sh.moves), r2 = replay(b, fc.moves);
    ok = r1.ok && r1.state.status === 'win' && r2.ok && r2.state.status === 'win' && collapsedCount(r2.state) === coverTarget(b);
  }
  if (!ok) bad++;
  rows.push({
    no: lv.id, dunya: lv.world, tahta: `${b.w}x${b.h}`, kare: b.tileCount, anahtar: b.keys.length,
    buz: lv.grid.join('').split('i').length - 1, enKisa: sh?.moves?.length ?? '-', ucYildiz: fc?.moves?.length ?? '-',
    kaybetme: failRate(s, 300, lv.id).toFixed(2), durum: ok ? 'OK' : 'HATA',
  });
}
console.table(rows);
fs.writeFileSync(new URL('../tests/level-report.json', import.meta.url), JSON.stringify(rows, null, 1));
console.log(bad ? `${bad} bölüm HATALI` : `Tüm ${levels.length} bölüm çözülebilir ve 3 yıldız alınabilir.`);
process.exit(bad ? 1 : 0);
