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
  assert.equal(d.settings.unlockAll, Save.TEST_BUILD);  // test sürümünde açık, yayında kapalı
  d.settings.unlockAll = false;
  assert.equal(Save.isUnlocked(d, 2), false);
  Save.recordWin(d, 1, 3, 10, 60);
  const d2 = Save.load();
  d2.settings.unlockAll = false;
  assert.equal(d2.stars[1], 3); assert.equal(Save.isUnlocked(d2, 2), true); assert.equal(d2.best[1], 10);
  Save.recordWin(d2, 1, 3, 4, 60, true);
  assert.equal(Save.load().best[1], 10); // güç kullanılınca en iyi değişmez
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

// ---------------- ekonomi ----------------
import * as Eco from '../src/economy.js';
test('enerji: kaybedince 1 düşer, 20 dakikada 1 dolar, 0 iken oynatmaz', () => {
  const d = Eco.ensure({ settings: {}, hints: 0 });
  const t0 = 1_000_000;
  d.energyAt = t0;
  for (let i = 0; i < 5; i++) assert.equal(Eco.spendEnergy(d, t0), true);
  assert.equal(d.energy, 0); assert.equal(Eco.spendEnergy(d, t0), false);
  assert.equal(Eco.tickEnergy(d, t0 + Eco.ENERGY_MS * 2 + 5), 2);
  assert.ok(Eco.nextEnergyIn(d, t0 + Eco.ENERGY_MS * 2 + 5) < Eco.ENERGY_MS);
  assert.equal(Eco.tickEnergy(d, t0 + Eco.ENERGY_MS * 50), 5);
  d.settings.infiniteEnergy = true; d.energy = 0;
  assert.equal(Eco.spendEnergy(d, t0), true);
});
test('günlük görevler: tarihe göre aynı, ilerler, ödül ve bonus verir', () => {
  const d = Eco.ensure({ settings: {}, hints: 0 });
  const q = Eco.dailyQuests(d, '2026-11-18');
  assert.equal(q.list.length, 3);
  assert.deepEqual(Eco.dailyQuests(Eco.ensure({ settings: {}, hints: 0 }), '2026-11-18').list.map((x) => x.k), q.list.map((x) => x.k));
  for (const x of q.list) Eco.stat(d, x.k, x.n);
  assert.equal(Eco.questsReady(d), 3);
  q.list.forEach((_, i) => Eco.claimQuest(d, i));
  assert.equal(Eco.claimBonus(d), true);
  assert.ok(d.coins >= Eco.QUEST_BONUS);
  assert.equal(Eco.claimBonus(d), false);
});
test('başarım: hedefe ulaşınca bir kez ödül', () => {
  const d = Eco.ensure({ settings: {}, hints: 0, stars: {} });
  Eco.stat(d, 'wins', 1);
  assert.equal(Eco.claimAch(d, 'ilk'), 50);
  assert.equal(Eco.claimAch(d, 'ilk'), 0);
});
test('dünya kilidi: önceki boss veya yıldız eşiği açar', () => {
  const d = Save.load(); d.settings.unlockAll = false; d.stars = {};
  assert.equal(Save.isUnlocked(d, 36), false);
  d.stars[35] = 1;
  assert.equal(Save.isUnlocked(d, 36), true);
  assert.equal(Save.isUnlocked(d, 37), false);
  const e = Save.load(); e.settings.unlockAll = false; e.stars = {}; for (let i = 1; i <= 15; i++) e.stars[i] = 3; // 45 yıldız
  assert.equal(Save.isUnlocked(e, 36), true);
});

test('enerji asla 5i geçmez, taşan ödül altına dönüşür', () => {
  const d = Eco.ensure({ settings: {}, hints: 0, coins: 0 });
  d.energy = 4;
  assert.equal(Eco.addEnergy(d, 3), 2 * Eco.OVERFLOW_COINS);
  assert.equal(d.energy, 5); assert.equal(d.coins, 40);
  d.energy = 7; Eco.tickEnergy(d); assert.equal(d.energy, 5);
});

test('güç: zıpla bir boşluğun üstünden atlar', () => {
  const s = newState(parseLevel({ id: 0, grid: ['S#.K', '###D'] }));
  assert.equal(canMove(s, 'right'), false);
  const ev = move(s, 'right', { jump: true });
  assert.ok(ev); assert.equal(s.pos, 2); assert.equal(s.collapsed[0], 1);
});
test('güç: dondur düşmanları bekletir', () => {
  const s = LV(['S....', '.....', 'K...D'], { enemies: [{ type: 'patrol', at: [3, 1], dir: 'right' }] });
  s.frozen = 2;
  move(s, 'down'); assert.equal(s.enemies[0].pos, 8); assert.equal(s.frozen, 1);
  move(s, 'down'); assert.equal(s.enemies[0].pos, 8); assert.equal(s.frozen, 0);
  move(s, 'right'); assert.notEqual(s.enemies[0].pos, 8);
});

test('altın: ilk bitiriş taban+yıldız, tekrar sadece yeni yıldız, boss fazla, Pro 2 kat', () => {
  assert.equal(Eco.winCoins({ stars: 3 }), 8);
  assert.equal(Eco.winCoins({ stars: 3, prevStars: 3 }), 0);
  assert.equal(Eco.winCoins({ stars: 3, prevStars: 1 }), 4);
  assert.equal(Eco.winCoins({ stars: 3, boss: true }), 50);
  assert.equal(Eco.winCoins({ stars: 2, pro: true }), 12);
});

test('lazer nöbetçi: bir hamle uyarır, sonraki hamle ateş eder', () => {
  // nöbetçi (0,0) aşağı bakıyor: x=0 sütunu
  const s = newState(parseLevel({ id: 0, grid: ['.....', '.....', 'S...D', '.....'], enemies: [{ type: 'sentry', at: [0, 0], dir: 'down' }] }));
  assert.equal(s.board.tileCount, 19); // nöbetçinin karesi sayılmaz
  let ev = move(s, 'right'); // hamle 1: uyanır
  assert.ok(ev.some((e) => e.t === 'wake'));
  ev = move(s, 'up');        // hamle 2: uyarı
  assert.ok(ev.some((e) => e.t === 'laserCharge'));
  ev = move(s, 'left');      // hamle 3: (0,1) sütunda -> ateş, yakalanır
  assert.ok(ev.some((e) => e.t === 'laser'));
  assert.equal(s.status, 'caught');
});

test('lazer nöbetçi: ışın dışında kalınca güvende, üstüne yürünmez', () => {
  const s = newState(parseLevel({ id: 0, grid: ['.....', 'S...D'], enemies: [{ type: 'sentry', at: [0, 0], dir: 'right' }] }));
  assert.equal(canMove(s, 'up'), false);
  move(s, 'right'); move(s, 'right'); move(s, 'right');
  assert.equal(s.status, 'play');
});

test('kemirici böcek: arkasındaki kareyi çökertir, yakalamaz, üstüne basınca ezilir', () => {
  const s = newState(parseLevel({ id: 0, grid: ['S....D', '......'], enemies: [{ type: 'gnawer', at: [3, 1], dir: 'right' }] }));
  move(s, 'down'); // uyanır
  const c0 = collapsedCount(s);
  const ev = move(s, 'right'); // böcek (3,1)->(4,1), (3,1) çöker
  assert.ok(ev.some((e) => e.t === 'enemyMove'));
  assert.equal(s.collapsed[1 * 6 + 3], 1);
  assert.equal(collapsedCount(s), c0 + 2);
  assert.equal(s.status, 'play');
  // böceğin yanına gel ve üstüne bas
  const s2 = newState(parseLevel({ id: 0, grid: ['S.D', '...'], enemies: [{ type: 'gnawer', at: [1, 1], dir: 'left' }] }));
  assert.equal(canMove(s2, 'down'), true);
  move(s2, 'right'); // uyanır
  const e2 = move(s2, 'down'); // (1,1)'deki böceğin üstüne
  assert.ok(e2.some((e) => e.t === 'squash'));
  assert.equal(s2.enemies[0].alive, false);
});

test('kemirici böcek anahtarlı kareyi çökertmez', () => {
  const s = newState(parseLevel({ id: 0, grid: ['S...D', '#.K.#'], enemies: [{ type: 'gnawer', at: [2, 1], dir: 'right' }] }));
  move(s, 'right'); move(s, 'right');
  assert.equal(s.collapsed[1 * 5 + 2], 0);
});

test('iki katlı bölüm: asansör öbür kata taşır, bindiği asansör çöker', () => {
  const b = parseLevel({ id: 1, floors: 2, grid: ['SL', 'K.', '##', '##', 'L.', 'KD'] });
  const s = newState(b);
  move(s, 'right');
  assert.equal(s.pos, b.lift[1]);
  assert.equal(s.collapsed[b.lift[0]], 1);
});

// ---- Yeni mekanikler ----
test('kutu itilir', () => { const s = newState(parseLevel({ id: 1, grid: ['SX..', '...D'] })); move(s, 'right'); assert.equal(s.pos, 1); assert.equal(s.box[0], 2); });
test('kutu çukura düşer, üstünden bir kez geçilir', () => {
  const s = newState(parseLevel({ id: 1, grid: ['SX#.D'] }));
  move(s, 'right'); assert.equal(s.box[0], -1); assert.equal(s.fill[2], 1);
  move(s, 'right'); assert.equal(s.pos, 2); move(s, 'right'); assert.equal(s.fill[2], 0); move(s, 'right'); assert.equal(s.status, 'win');
});
test('kutu duvara itilemez', () => { const s = newState(parseLevel({ id: 1, grid: ['S.XD'] })); move(s, 'right'); assert.equal(move(s, 'right'), null); });
test('renkli bariyer anahtarla açılır', () => {
  const s = newState(parseLevel({ id: 1, grid: ['SR.D', 'r...'] }));
  assert.equal(move(s, 'right'), null); move(s, 'down'); assert.equal(s.cks, 1); move(s, 'right'); move(s, 'up'); assert.equal(s.pos, 1);
});
test('zamanlı taş süresi dolunca çöker, üstündeysen düşersin', () => {
  const a = newState(parseLevel({ id: 1, grid: ['S...D'], timed: [[3, 0, 2]] })); move(a, 'right'); move(a, 'right'); assert.equal(a.collapsed[3], 1);
  const b = newState(parseLevel({ id: 1, grid: ['S..D'], timed: [[1, 0, 1]] })); move(b, 'right'); assert.equal(b.status, 'caught');
});
test('kilitli kapı yeterli taş çökünce açılır', () => {
  const s = newState(parseLevel({ id: 1, lock: 3, grid: ['S..', '...', '..D'] }));
  assert.equal(canMove(s, 'down'), true); move(s, 'right'); move(s, 'right'); assert.equal(doorOpen(s), false); move(s, 'down'); assert.equal(doorOpen(s), true);
});
