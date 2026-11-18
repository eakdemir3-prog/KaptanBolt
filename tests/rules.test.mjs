// Kural testleri: node --test tests/
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseLevel, newState, move, canMove, starsFor, collapsedCount } from '../src/logic/rules.js';
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
  assert.equal(Save.isUnlocked(d, 2), false);
  const r = Save.recordWin(d, 1, 3, 10, 60);
  assert.equal(r.bonusHint, 1);
  const d2 = Save.load();
  assert.equal(d2.stars[1], 3); assert.equal(Save.isUnlocked(d2, 2), true); assert.equal(d2.hints, 6);
  Save.recordWin(d2, 1, 1, 8, 60);
  assert.equal(Save.load().stars[1], 3); // daha düşük yıldız eskiyi silmez
});
