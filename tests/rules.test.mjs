// Kural testleri: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLevel, newState, move, canMove, starsFor, collapsedCount, doorOpen } from '../src/logic/rules.js';
import { shortest, canWin, fullCover } from '../src/logic/solver.js';
import * as Save from '../src/save.js';

const L = (grid) => newState(parseLevel({ id: 0, grid }));

test('kaydırma robotu bir kare ilerletir ve ayrılınan kare çöker', () => {
  const s = L(['S..K', '###D']);
  const ev = move(s, 'right');
  assert.ok(ev); assert.equal(s.pos, 1); assert.equal(s.moves, 1); assert.equal(s.collapsed[0], 1);
});
test('boşluğa, tahta dışına ve çöken kareye gidilemez, hamle sayılmaz', () => {
  const s = L(['S.#K', '#..D']);
  assert.equal(move(s, 'up'), null); assert.equal(move(s, 'left'), null); assert.equal(move(s, 'down'), null);
  assert.equal(s.moves, 0);
  move(s, 'right');
  assert.equal(move(s, 'left'), null); assert.equal(move(s, 'right'), null); // çöken kare ve boşluk
  assert.equal(s.moves, 1);
});
test('kilitli kapı duvar gibidir, anahtarlar toplanınca açılır', () => {
  const s = L(['SD.', '#.K', '#..']);
  assert.equal(canMove(s, 'right'), false);
  const t = L(['.D.', 'SK.']);
  move(t, 'right'); // anahtar
  assert.deepEqual(t.keysTaken, [true]);
  move(t, 'up');
  assert.equal(t.status, 'win');
});
test('iki anahtar: biri eksikken kapı kapalı', () => {
  const s = L(['SKD', '..K']);
  move(s, 'right');
  assert.equal(canMove(s, 'right'), false);
  move(s, 'down'); move(s, 'right');
  assert.equal(s.keysTaken.every(Boolean), true);
  move(s, 'up');
  assert.equal(s.status, 'win');
});
test('buzda kayma: ilk normal karede durur ve geçilen kareler çöker', () => {
  const s = L(['Sii..', '####D']);
  move(s, 'right');
  assert.equal(s.pos, 3); assert.equal(s.moves, 1);
  assert.equal(collapsedCount(s), 3);
});
test('buzda kayma: önü kapalıysa buzun üstünde durur', () => {
  const s = L(['Sii#', '...D']);
  move(s, 'right');
  assert.equal(s.pos, 2);
});
test('buzda kayarken açık kapıya girilirse bölüm biter', () => {
  const s = L(['SKiiD']);
  move(s, 'right'); assert.deepEqual(s.keysTaken, [true]);
  move(s, 'right');
  assert.equal(s.status, 'win'); assert.equal(s.moves, 2);
});
test('buz kilitli kapının önünde durur', () => {
  const s = L(['SiiD', 'K###']);
  move(s, 'right');
  assert.equal(s.pos, 2); assert.equal(s.status, 'stuck');
});
test('geçerli hamle kalmayınca yol kapanır', () => {
  const s = L(['S.#', '##K', 'D..']);
  move(s, 'right');
  assert.equal(s.status, 'stuck');
});
test('yıldızlar: bütün kareler çökerse 3 yıldız', () => {
  const s = L(['S.', 'DK']);
  move(s, 'right'); move(s, 'down'); move(s, 'left');
  assert.equal(s.status, 'win'); assert.equal(starsFor(s), 3);
  const t = L(['S..', 'DK.']);
  move(t, 'down');
  assert.equal(t.status, 'play');
});
test('çözücü: en kısa çözüm ve 3 yıldız çözümü bulur, çıkmazı tanır', () => {
  const s = L(['S.K', '..D']);
  assert.equal(shortest(s).moves.length, 3);
  assert.equal(fullCover(s).moves.length, 5);
  const d = L(['S.K', '...', '#D#']);
  move(d, 'right'); move(d, 'down');
  assert.equal(d.status, 'play');
  assert.equal(canWin(d), false);
  assert.equal(shortest(d), null);
});
test('ilerleme kaydı: kazanınca yıldız, kilit açılır, ipucu ödülü', () => {
  const mem = {}; Save._setStorage({ getItem: (k) => mem[k] ?? null, setItem: (k, v) => { mem[k] = v; } });
  const d = Save.load();
  assert.equal(Save.isUnlocked(d, 2), true);           // test modu varsayılan açık
  d.settings.unlockAll = false;
  assert.equal(Save.isUnlocked(d, 2), false);
  const r = Save.recordWin(d, 1, 3, 10, 60);
  assert.equal(r.bonusHint, 1);
  const d2 = Save.load();
  assert.equal(d2.stars[1], 3); assert.equal(Save.isUnlocked(d2, 2), true); assert.equal(d2.hints, 6);
  Save.recordWin(d2, 1, 1, 8, 60);
  assert.equal(Save.load().stars[1], 3); // daha düşük yıldız eskiyi silmez
});

// ---------------- 2. aşama mekanikleri ----------------
// awake: ilk-hamle korumasını atla (düşman hareketini doğrudan test etmek için)
const LV = (grid, extra = {}) => { const s = newState(parseLevel({ id: 0, grid, ...extra })); s.moves = 1; return s; };

test('devriye robotu her hamlede bir kare gider, duvarda geri döner', () => {
  const s = LV(['S....', '.....', 'K...D'], { enemies: [{ type: 'patrol', at: [3, 1], dir: 'right' }] });
  move(s, 'down');
  assert.equal(s.enemies[0].pos, 1 * 5 + 4);
  move(s, 'down');
  assert.equal(s.enemies[0].pos, 1 * 5 + 3); assert.equal(s.enemies[0].dir, 'left');
});
test('düşmanın olduğu kareye yürünemez, düşman üstüne gelirse yakalanırsın', () => {
  const s = LV(['S.K.D'], { enemies: [{ type: 'patrol', at: [2, 0], dir: 'left' }] });
  assert.equal(canMove(s, 'right'), true);
  move(s, 'right'); // robot 1'e, devriye 2'den 1'e gelir
  assert.equal(s.status, 'caught');
  const t = LV(['SK..D'], { enemies: [{ type: 'patrol', at: [1, 0], dir: 'right' }] });
  assert.equal(canMove(t, 'right'), false);
});
test('takipçi oyuncuya yaklaşır ve çöken kareye basınca düşer', () => {
  const s = LV(['..S..', '.....', 'K...D'], { enemies: [{ type: 'chaser', at: [0, 0] }] });
  move(s, 'down'); // robot (2,1), (2,0) çöktü; takipçi sağa (1,0)
  assert.equal(s.enemies[0].pos, 1);
  move(s, 'down'); // robot (2,2); takipçi hedefi: dy=2 > dx=1 -> aşağı (1,1)
  assert.equal(s.enemies[0].pos, 6);
  const t = LV(['.S.', '...', 'K.D'], { enemies: [{ type: 'chaser', at: [0, 0] }] });
  move(t, 'right'); // (1,0) çöktü, takipçi sağa basar -> düşer
  assert.equal(t.enemies[0].alive, false);
});
test('sağlam taş: ilk ayrılışta çatlar, ikincide çöker', () => {
  const s = LV(['So.', '...', 'K.D']);
  move(s, 'right'); move(s, 'down');
  assert.equal(s.collapsed[1], 0); assert.equal(s.hits[1], 1);
  move(s, 'right'); move(s, 'up'); move(s, 'left');
  assert.equal(s.pos, 1); move(s, 'down') ; // (1,1) çökmüştü -> geçersiz
  assert.equal(s.pos, 1);
});
test('portal: girince eşine ışınlanır, giriş portalı çöker, kayma durur', () => {
  const s = LV(['S1.#', '###.', 'K.1D']);
  move(s, 'right');
  assert.equal(s.pos, 2 * 4 + 2); assert.equal(s.collapsed[1], 1);
  move(s, 'left'); move(s, 'left');
  assert.deepEqual(s.keysTaken, [true]);
});
test('boss: kapı boss düşmeden açılmaz, boss oyuncuyu kovalar ve çukura düşer', () => {
  const s = LV(['....D', '.....', '.....', '..#..', 'SK...'], { boss: { at: [1, 0], every: 1 } });
  const ev1 = move(s, 'right');
  assert.equal(s.keysTaken[0], true);
  assert.equal(doorOpen(s), false);                 // anahtar var ama boss yaşıyor
  assert.equal(s.boss.pos, 1 * 5 + 1);              // boss bir kare aşağı indi
  const ev2 = move(s, 'right');
  assert.equal(s.boss.alive, false);                 // çukura düştü
  assert.ok(ev2.some((e) => e.t === 'bossFall') && ev2.some((e) => e.t === 'doorOpen'));
});
test('boss iki hamlede bir yürür ve üstüne gelirse yakalar', () => {
  const s = LV(['S...D', '.....', 'K....'], { boss: { at: [2, 0], every: 2 } });
  move(s, 'down');
  assert.equal(s.boss.pos, 2);                       // ilk tur bekler
  move(s, 'right');                                  // ikinci tur yürür: oyuncu (1,1) -> boss sola
  assert.equal(s.status, 'caught');
});

// ---------------- 3. aşama ----------------
test('ilk hamle her zaman güvenli: düşmanlar ilk hamlede uyanır', () => {
  const s = newState(parseLevel({ id: 0, grid: ['S...D', 'K....'], enemies: [{ type: 'patrol', at: [2, 0], dir: 'left' }] }));
  const ev = move(s, 'right');
  assert.equal(s.status, 'play'); assert.equal(s.enemies[0].pos, 2);
  assert.ok(ev.some((e) => e.t === 'wake'));
  move(s, 'left') ; // geçersiz (çöken kare)
  assert.equal(s.moves, 1);
});
test('düğme köprüyü açar; kapalı köprü boşluktur', () => {
  const s = newState(parseLevel({ id: 0, grid: ['Sb.', '#=#', 'K.D'] }));
  move(s, 'right');
  assert.equal(s.pressed, true);
  assert.equal(canMove(s, 'down'), true);
  const t = newState(parseLevel({ id: 0, grid: ['S.b', '=##', 'K.D'] }));
  assert.equal(canMove(t, 'down'), false); // köprü kapalı
});
test('ok kare robotu okun yönüne iter, önü kapalıysa okta durur', () => {
  const s = newState(parseLevel({ id: 0, grid: ['S>..', '##.#', 'K..D'] }));
  move(s, 'right');
  assert.equal(s.pos, 2); assert.equal(s.moves, 1); assert.equal(s.collapsed[1], 1);
  const t = newState(parseLevel({ id: 0, grid: ['Sv.', '.#.', 'K.D'] }));
  move(t, 'right');
  assert.equal(t.pos, 1); // aşağısı boşluk: okta durur
  const u = newState(parseLevel({ id: 0, grid: ['S>v', '##.', 'K.D'] }));
  move(u, 'right');
  assert.equal(u.pos, 5); // sağa, sonra aşağı itilir
});
