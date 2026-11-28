// Volkan Adası (81–100), Kristal Mağaralar (101–120), Bulut Kalesi (121–140; 131–139 Amiral'in kalesi).
// Bölümler parça kütüphanesinden kurulur: her dünyanın kendi mekanikleri + ortak parçalar. Sıra, bölüm numarasına
// bağlı sabit bir tohumla seçilir (SEEDS); tohumlar erişilebilirlik testinden (tests/sim.mjs) geçen ilk değerlerdir.

const NAMES = {
  5: ['Kül Sahili', 'Lav Gölü', 'Magma Asansörü', 'Yarasa Mağarası', 'Lav Kaçışı', 'Obsidyen Yolu', 'Sıcak Kayalar', 'Ateş Çiçekleri', 'Tiki Köyü', 'Volkan Eteği',
    'Kızgın Köprüler', 'Duman Vadisi', 'Lav Nehri', 'Kor Ormanı', 'Büyük Kaçış', 'Ejder Yuvası', 'Kraterin Kenarı', 'Son Patlama', 'Ejder Kapısı'],
  6: ['Mağara Girişi', 'Karanlık Tünel', 'Kristal Köprü', 'Maden Rayları', 'Düşen Kayalar', 'Fener Yolu', 'Köstebek Yuvası', 'Örümcek Ağı', 'Altın Damarı', 'Yeraltı Şelalesi',
    'Mor Kristaller', 'Gölge Galerisi', 'Eski Maden', 'Işıklı Göl', 'Derin Kuyu', 'Kristal Labirent', 'Mantar Mağarası', 'Karanlığın Kalbi', 'Dev\'in Kapısı'],
  7: ['Bulut Adası', 'Gökkuşağı Yolu', 'Rüzgâr Sütunları', 'Uçan Bahçeler', 'Kaybolan Bulutlar', 'Balon Limanı', 'Drone Devriyesi', 'Yel Değirmeni', 'Gök Köprüsü', 'Kale Kapısı',
    'Çark Odası', 'Bant Koridoru', 'Lazer Salonu', 'Buhar Kazanı', 'Asker Kışlası', 'Kontrol Odası', 'Gemi Hangarı', 'Kaptan Köşkü', 'Amiral\'in Kapısı'],
};
const SEEDS = {}; // bölüm numarası → tohum (yoksa 0)

const rnd = (seed) => { let s = seed * 9301 + 49297; return () => ((s = (s * 16807) % 2147483647) / 2147483647); };

// ---- ortak parçalar ----
const P = {
  gap2: (b) => { b.gap(2); b.ground(14, 2).arc(-2.9, 2, 5).row(9, 2, 3); },
  gap3: (b) => { b.gap(3); b.ground(14, 2).arc(-3.6, 2, 5).row(9, 2, 3); },
  enemy: (b) => { b.ground(16, 2).e('bocek', 7, null, [4, 11]).row(12, 2, 3); },
  enemy2: (b) => { b.ground(18, 2).e('bocek', 5, null, [2, 8]).e('kirpi', 13, null, [11, 16]).row(0, 2, 2); },
  kirpi: (b) => { b.ground(14, 2).e('kirpi', 7, null, [4, 10]).row(11, 2, 2); },
  stairs: (b) => { b.ground(6, 3).ground(6, 4).row(1, 4, 4); b.ground(6, 3); b.ground(6, 2).row(1, 2, 3); },
  crumble: (b) => { b.gap(6).crumble(2, 2, 2).row(2, 2, 2); b.ground(10, 2).row(4, 2, 3); },
  crumble2: (b) => { b.gap(9).crumble(2, 2, 2).crumble(5, 3, 2).row(2, 2, 2).row(5, 3, 2); b.ground(10, 2).row(4, 2, 3); },
  raft: (b) => { b.gap(10).raft(0.5, 2, 2.4, 'x', 5.6, 1.8).thorns(0, 10, -3).row(2, 4, 3); b.ground(10, 2).row(3, 2, 3); },
  spring: (b) => { b.ground(12, 2).spring(3, 2).plat(5, 8, 3).row(5, 8, 3); },
  heart: (b) => { b.ground(10, 2).heart(5).row(1, 2, 3); },
  crate: (b) => { b.ground(8, 3).crate(3, 3).row(1, 5, 2); b.ground(6, 2); },
};
// ---- dünyaya özel parçalar ----
const W = {
  5: {
    lavapool: (b) => { b.ground(16, 2).thorns(6, 2).row(1, 2, 4).row(10, 2, 4); },
    lavapit: (b) => { b.gap(3).thorns(0, 3, -3); b.ground(14, 2).arc(-3.6, 2, 5).row(9, 2, 3); },
    magma: (b) => { b.gap(6).raft(1.5, 2, 2.4, 'y', 3, 1.4).thorns(0, 6, -3).row(2, 5, 2); b.ground(8, 5).row(1, 5, 4); b.ground(6, 3); b.ground(6, 2).row(1, 2, 3); },
    magmaraft: (b) => { b.gap(10).raft(0.5, 2, 2.4, 'x', 5.6, 1.8).thorns(0, 10, -3).row(2, 4, 3); b.ground(10, 2).row(3, 2, 3); },
    bat: (b) => { b.ground(16, 2).e('bocek', 8, null, [4, 12]).thorns(13, 2).row(1, 2, 3); },
  },
  6: {
    rocks: (b) => { b.ground(16, 2).icicle(5).icicle(10).row(3, 2, 9); },
    cart: (b) => { b.gap(10).raft(0.5, 2, 2.4, 'x', 5.6, 1.8).thorns(0, 10, -3).row(2, 4, 3); b.ground(10, 2).row(3, 2, 3); },
    cbridge: (b) => { b.gap(9).crumble(2, 2, 2).crumble(5, 3, 2).row(2, 2, 2).row(5, 3, 2); b.ground(10, 2).row(4, 2, 3); },
    mole: (b) => { b.ground(16, 2).e('kirpi', 8, null, [5, 11]).row(1, 2, 3).row(13, 2, 2); },
    spider: (b) => { b.ground(16, 2).e('bocek', 6, null, [3, 9]).icicle(12).row(11, 2, 3); },
  },
  7: {
    cloud: (b) => { b.gap(9).crumble(2, 2, 2).crumble(5, 3, 2).row(2, 2, 2).row(5, 3, 2); b.ground(10, 2).row(4, 2, 3); },
    wind: (b) => { b.gap(6).spore(0.5, 2, 5, 4).row(1, 6, 4); b.ground(12, 2).row(3, 2, 4); },
    storm: (b) => { b.ground(18, 2).storm(2, 14).row(3, 2, 8); },
    drone: (b) => { b.ground(16, 2).e('bocek', 8, null, [4, 12]).row(1, 2, 3); },
    windup: (b) => { b.ground(10, 2).spore(3, 2, 3, 7.6).plat(5, 10, 3).row(5, 10, 3); b.ground(6, 2); },
  },
  8: {
    belt: (b) => { b.ground(18, 2).belt(2, 13, 1).row(3, 2, 8); },
    beltback: (b) => { b.ground(18, 2).belt(2, 12, -1).row(3, 2, 7); },
    laser: (b) => { b.ground(14, 2).laser(7, 0).row(1, 2, 3).row(10, 2, 3); },
    laser2: (b) => { b.ground(18, 2).laser(5, 0).laser(11, 1.5).row(1, 2, 3).row(14, 2, 3); },
    asker: (b) => { b.ground(16, 2).e('kirpi', 8, null, [5, 11]).row(1, 2, 3); },
    drone: (b) => { b.ground(16, 2).e('bocek', 8, null, [4, 12]).row(1, 2, 3); },
  },
};
const POOL = {
  5: [['lavapool', 3], ['lavapit', 3], ['magma', 2], ['magmaraft', 1], ['bat', 3], ['kirpi', 2], ['gap2', 2], ['stairs', 1], ['crumble', 1], ['spring', 1], ['crate', 1]],
  6: [['rocks', 3], ['cart', 2], ['cbridge', 2], ['mole', 3], ['spider', 3], ['gap2', 2], ['stairs', 1], ['spring', 1], ['crate', 1]],
  7: [['cloud', 3], ['wind', 3], ['storm', 2], ['drone', 3], ['kirpi', 2], ['gap2', 2], ['stairs', 1], ['raft', 1]],
  8: [['belt', 3], ['beltback', 2], ['laser', 3], ['laser2', 2], ['asker', 3], ['drone', 2], ['gap2', 1], ['crate', 1]],
};
// her dünyanın ilk bölümlerinde yeni mekaniği tanıtan parçalar (tabelayla)
const INTRO = {
  5: [['lava', 'lavapool'], ['magma', 'magma'], ['bat', 'bat']],
  6: [['rocks', 'rocks'], ['cart', 'cart'], ['mole', 'mole']],
  7: [['cloud', 'cloud'], ['wind', 'wind'], ['drone', 'drone']],
  8: [['belt', 'belt'], ['laser', 'laser'], ['asker', 'asker']],
};

function makeLevel(world, i) { // i: 1..19
  const n = (world - 1) * 20 + i, kit = world === 7 && i >= 11 ? 8 : world;
  const pool = POOL[kit], tot = pool.reduce((a, p) => a + p[1], 0);
  const lib = { ...P, ...W[kit] };
  const dark = world === 6 && i % 2 === 0, chase = world === 5 && [5, 10, 15, 18].includes(i);
  const def = {
    name: NAMES[world][i - 1], dark, chase,
    build(b) {
      const R = rnd(n * 31 + (SEEDS[n] || 0) * 977);
      const pick = () => { let r = R() * tot; for (const [k, w] of pool) { if ((r -= w) <= 0) return k; } return pool[0][0]; };
      const intro = (kit === 8 ? INTRO[8][i - 11] : INTRO[world][i - 1]);
      b.ground(14, 2).row(1, 2, 3).cage(10, 2, 'kus'); if (intro) b.sign(6, intro[0]); else if (dark) b.sign(6, 'dark'); else if (chase) b.sign(6, 'chase');
      if (dark) b.light(3);
      const k = 6 + Math.floor(i / 5); let last = '';
      const seq = []; if (intro) seq.push(intro[1]);
      while (seq.length < k) { const s = pick(); if (s !== last) { seq.push(s); last = s; } }
      const cageAt = Math.floor(k / 3), cpAt = Math.floor(k / 2), starAt = Math.floor((2 * k) / 3);
      seq.forEach((s, j) => {
        if (j === cageAt) { b.ground(12, 2).cage(6, 2, 'tilki').row(1, 2, 3); if (dark) b.light(10); }
        if (j === cpAt) { b.ground(10, 2).cp(2).row(5, 2, 3); if (dark) b.light(7); }
        if (j === starAt) { if (kit === 7) { b.ground(10, 2).spore(3, 2, 3, 7.6).plat(5, 10, 3).star(6, 10).row(5, 10, 1); b.ground(6, 2); } else b.ground(12, 2).spring(3, 2).plat(5, 8, 3).star(6, 8).row(5, 8, 1).row(7, 8, 1); }
        if (j === k - 2 && R() < 0.5) P.heart(b);
        lib[s](b);
      });
      b.ground(14, 2).row(1, 2, 3).cage(11, 2, 'maymun'); if (dark) b.light(5);
      b.ground(12, 2).row(1, 2, 4).end(7);
    },
  };
  return def;
}
const BOSS = {
  5: { name: 'Lav Ejderi', bossKind: 'ejder' },
  6: { name: 'Kristal Dev', bossKind: 'dev' },
  7: { name: 'Amiral', bossKind: 'amiral' },
};
function bossLevel(world) {
  return { ...BOSS[world], boss: true, build(b) {
    b.ground(12, 2).row(2, 2, 5).cage(9, 2, 'kus');
    b.gap(3);
    b.ground(10, 2).arc(-3.2, 2, 5).cage(7, 2, 'tilki').cp(2).heart(5);
    b.ground(28, 2).boss(2, 26).cage(25, 2, 'maymun').row(5, 2, 4).row(17, 2, 4).star(14, 2);
    b.ground(16, 2).end(9);
  } };
}
// ---- elle tasarlanmış rotalar: önce yeni mekanik tek başına ve güvenli gösterilir, sonra diğerleriyle birleşir ----
const HAND = {
  // 116 Kristal Labirent (karanlık): maden arabası + kristal köprü
  116: { name: 'Kristal Labirent', dark: true, build(b) {
    b.ground(14, 2).row(1, 2, 3).cage(10, 2, 'kus').sign(6, 'cart').light(3);
    // 1) araba tek başına: kısa çukur, geniş iniş
    b.gap(6).raft(0.5, 2, 2.4, 'x', 2.4, 1.6).thorns(0, 6, -3).row(2, 4, 2);
    b.ground(12, 2).row(3, 2, 3).light(6).sign(9, 'crystal');
    // 2) kristal köprü tek başına: iki kırılan kristal, aralar 1 blok
    b.gap(5).crumble(1, 2, 2).row(1, 3, 2);
    b.ground(12, 2).cage(7, 2, 'tilki').row(1, 2, 3).light(10);
    // 3) birleşim: araba kristal köprüye taşır, köprüden karşı kıyıya
    b.gap(14).raft(0.5, 2, 2.4, 'x', 5.0, 1.7).crumble(9, 2, 2).thorns(0, 14, -3).row(2, 4, 3).row(9, 3, 2);
    b.ground(10, 2).cp(2).row(5, 2, 3).light(7);
    // 4) örümcekli düşen kaya koridoru, sonra köprü → araba (ters sıra)
    b.ground(16, 2).e('bocek', 6, null, [3, 9]).icicle(12).row(11, 2, 3).light(4);
    b.gap(12).crumble(1, 2, 2).raft(4, 2, 2.4, 'x', 4.0, 1.7).thorns(0, 12, -3).row(1, 3, 2).row(6, 4, 2);
    b.ground(12, 2).spring(3, 2).plat(5, 8, 3).star(6, 8).row(5, 8, 1).row(7, 8, 1).light(9);
    b.ground(16, 2).e('kirpi', 8, null, [5, 11]).row(1, 2, 3).row(13, 2, 2);
    b.ground(14, 2).row(1, 2, 3).cage(11, 2, 'maymun').light(5);
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  // 138 Kaptan Köşkü: rüzgâr sütunu + yürüyen bant + lazer
  138: { name: 'Kaptan Köşkü', build(b) {
    b.ground(14, 2).row(1, 2, 3).cage(10, 2, 'kus').sign(6, 'wind');
    // 1) rüzgâr sütunu tek başına (altında diken yok, düşersen sütun geri taşır)
    b.gap(6).spore(0.5, 2, 5, 4).row(1, 6, 4);
    b.ground(12, 2).row(3, 2, 4).sign(8, 'belt');
    // 2) bant tek başına, sonra lazer tek başına (bantsız)
    b.ground(16, 2).belt(2, 10, 1).row(3, 2, 6);
    b.ground(14, 2).sign(2, 'laser').laser(8, 0).row(1, 2, 3).row(11, 2, 2).cage(4, 2, 'tilki');
    // 3) birleşim: rüzgârdan bantlı zemine in, bant lazere taşır (lazer kapanınca geç ya da zıpla)
    b.gap(6).spore(0.5, 2, 5, 4).row(1, 6, 4);
    b.ground(20, 2).belt(1, 15, 1).laser(11, 0.8).row(3, 2, 4).row(16, 2, 3).cp(18);
    // 4) ters bant + iki lazer, sonra rüzgârla yıldız platformu
    b.ground(20, 2).belt(2, 14, -1).laser(6, 0).laser(12, 1.6).row(1, 2, 2).row(16, 2, 3);
    b.ground(10, 2).spore(3, 2, 3, 7.6).plat(5, 10, 3).star(6, 10).row(5, 10, 1); b.ground(6, 2);
    b.ground(16, 2).e('kirpi', 8, null, [5, 11]).row(1, 2, 3);
    b.ground(14, 2).row(1, 2, 3).cage(11, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
};
export const LEVELS5 = [];
for (const w of [5, 6, 7]) { for (let i = 1; i <= 19; i++) { const n = (w - 1) * 20 + i; LEVELS5.push(HAND[n] || makeLevel(w, i)); } LEVELS5.push(bossLevel(w)); }
export const setSeeds = (o) => Object.assign(SEEDS, o);
