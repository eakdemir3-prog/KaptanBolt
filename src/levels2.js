// Mantar Ormanı — 21–40. bölümler. Yeni: zıplatan mantarlar (1 pembe az, 2 turkuaz orta, 3 altın çok),
// spor bulutları (içinde süzülürsün), mantarcık (bocek gibi ezilir), zırhlı salyangoz (kirpi kuralı: önce ateş, sonra ez).
// Hayvan ve düşman adları Yeşil Vadi'deki gibi yazılır; tema onları Mantar Ormanı modellerine çevirir.

export const LEVELS2 = [
  // ---------------- 21–25: yeni mekanikler ----------------
  { name: 'Mantar Kapısı', build(b) {
    b.ground(16, 2).sign(3, 'bounce').row(5, 2, 3).cage(9, 2, 'kus').spring(13, 2, 1).col(13, 4, 3).plat(15, 6, 3).row(15, 6, 3);
    b.ground(6, 2).row(2, 2, 3);
    b.gap(2);
    b.ground(14, 2).arc(-2.9, 2, 5).e('bocek', 7, null, [4, 10]).row(11, 2, 2);
    b.ground(12, 2).spring(3, 2, 2).col(3, 4.5, 4).plat(5, 8, 3).row(5, 8, 3);
    b.ground(14, 2).cage(5, 2, 'tilki').cp(1).row(8, 2, 4);
    b.ground(10, 2).spring(3, 2, 3).col(3, 5, 4).plat(5, 11, 3).star(6, 11).row(5, 11, 1).row(7, 11, 1);
    b.gap(3);
    b.ground(14, 2).arc(-3.6, 2, 5).e('bocek', 7, null, [4, 11]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Salyangoz Patikası', build(b) {
    b.ground(16, 2).sign(3, 'snail').row(1, 2, 2).e('kirpi', 10, null, [7, 14]);
    b.ground(10, 2).row(2, 2, 4).cage(8, 2, 'kus');
    b.gap(2);
    b.ground(14, 2).arc(-2.9, 2, 5).spring(4, 2, 1).plat(6, 6, 3).row(6, 6, 3).e('bocek', 11, null, [9, 13]);
    b.ground(16, 2).e('kirpi', 5, null, [2, 8]).cp(11).row(12, 2, 3);
    b.ground(6, 3).crate(2, 3).row(1, 5, 3);
    b.ground(14, 2).spring(3, 2, 2).plat(6, 8, 3).cage(7, 8, 'tilki').row(6, 8, 1).row(8, 8, 1).e('kirpi', 11, null, [9, 13]);
    b.gap(2);
    b.ground(12, 2).arc(-2.9, 2, 5).star(9, 2).e('bocek', 5, null, [3, 7]);
    b.ground(14, 2).cage(4, 2, 'maymun').e('kirpi', 10, null, [8, 13]).row(7, 2, 2);
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Renkli Sıçrayış', build(b) {
    b.ground(14, 2).sign(2, 'bounce').spring(5, 2, 1).spring(9, 2, 2).col(5, 4, 2).col(9, 5, 3).plat(11, 8, 3).row(11, 8, 3);
    b.ground(10, 2).cage(5, 2, 'kus').row(2, 2, 2);
    b.ground(14, 2).spring(3, 2, 3).col(3, 5, 5).plat(5, 11, 4).row(5, 11, 4).star(9, 11).plat(8, 6, 3).row(8, 6, 2);
    b.ground(12, 2).cp(2).e('bocek', 7, null, [5, 10]);
    b.gap(3);
    b.ground(12, 2).arc(-3.6, 2, 5).spring(6, 2, 2).plat(8, 8, 3).cage(9, 8, 'tilki').row(8, 8, 1);
    b.ground(14, 2).e('kirpi', 6, null, [3, 9]).row(10, 2, 3);
    b.gap(2);
    b.ground(14, 2).arc(-2.9, 2, 5).cage(10, 2, 'maymun').e('bocek', 5, null, [3, 8]);
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Spor Bulutu', build(b) {
    b.ground(14, 2).row(1, 2, 3).cage(5, 2, 'kus').sign(9, 'spore');
    b.ground(10, 2).spore(3, 2, 3, 7.6).plat(5, 10, 3).row(5, 10, 3).star(6, 10).cage(1, 2, 'tilki');
    b.ground(8, 2).cp(2).row(4, 2, 3);
    b.gap(6).spore(0.5, 2, 5, 4).row(1, 6, 4);
    b.ground(14, 2).row(2, 2, 3).e('bocek', 9, null, [6, 12]);
    b.gap(7).spore(0.5, 2, 6, 4.5).row(1, 6, 5);
    b.ground(14, 2).e('kirpi', 6, null, [3, 9]).cage(12, 2, 'maymun').row(1, 2, 2);
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Ateşböceği Yolu', build(b) {
    b.ground(14, 2).row(2, 2, 4).e('bocek', 9, null, [7, 12]);
    b.gap(2);
    b.ground(12, 2).arc(-2.9, 2, 5).spring(5, 2, 2).plat(7, 8, 3).row(7, 8, 3).cage(2, 2, 'kus');
    b.gap(6).spore(0.5, 2, 5, 4).row(1, 6, 4);
    b.ground(14, 2).e('kirpi', 5, null, [2, 8]).cp(11).heart(12);
    b.ground(6, 3).ground(6, 4).row(1, 4, 4).crate(3, 7);
    b.ground(14, 2).spring(4, 2, 3).plat(6, 11, 3).star(7, 11).row(6, 11, 1).cage(10, 2, 'tilki');
    b.gap(2);
    b.ground(14, 2).arc(-2.9, 2, 5).e('bocek', 5, null, [3, 7]).e('bocek', 10, null, [9, 12]).cage(13, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  // ---------------- 26–30 ----------------
  { name: 'Parlak Mağara Ağzı', build(b) {
    b.ground(14, 2).row(2, 2, 3).spring(8, 2, 1).plat(10, 6, 3).row(10, 6, 3);
    b.ground(8, 4).cage(3, 4, 'kus').row(5, 4, 2);
    b.gap(2);
    b.ground(14, 2).arc(-2.9, 2, 5).e('kirpi', 6, null, [3, 9]).e('bocek', 11, null, [10, 13]);
    b.gap(7).spore(0.5, 2, 6, 4.5).row(1, 6, 5);
    b.ground(12, 2).cp(2).spring(7, 2, 3).plat(9, 11, 3).row(9, 11, 2).star(11, 11);
    b.ground(14, 2).cage(4, 2, 'tilki').e('bocek', 9, null, [7, 12]);
    b.ground(6, 3).crate(1, 3).row(3, 3, 2);
    b.gap(3);
    b.ground(14, 2).arc(-3.6, 2, 5).e('kirpi', 7, null, [4, 10]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Mantar Basamakları', build(b) {
    b.ground(12, 2).row(2, 2, 3).spring(8, 2, 1);
    b.ground(6, 5).row(1, 5, 4).cage(3, 5, 'kus');
    b.ground(6, 2).spring(3, 2, 2);
    b.ground(8, 7).row(1, 7, 5);
    b.ground(10, 2).cp(2).e('bocek', 6, null, [4, 8]);
    b.gap(2);
    b.ground(14, 2).arc(-2.9, 2, 5).spring(5, 2, 3).plat(7, 11, 4).cage(8, 11, 'tilki').row(9, 11, 2).e('kirpi', 11, null, [10, 13]);
    b.gap(6).spore(0.5, 2, 5, 4).row(1, 6, 4);
    b.ground(14, 2).star(3, 2).e('bocek', 8, null, [6, 11]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Salyangoz Çiftliği', build(b) {
    b.ground(16, 2).row(1, 2, 3).e('kirpi', 7, null, [4, 10]).e('kirpi', 13, null, [11, 15]);
    b.ground(8, 3).crate(3, 3).row(1, 5, 2).cage(6, 3, 'kus');
    b.gap(2);
    b.ground(14, 2).arc(-2.9, 2, 5).spring(4, 2, 2).plat(6, 8, 4).row(6, 8, 4).e('kirpi', 10, null, [8, 13]);
    b.ground(10, 2).cp(2).heart(6);
    b.gap(6).spore(0.5, 2, 5, 4).row(1, 6, 4);
    b.ground(16, 2).e('kirpi', 5, null, [2, 8]).cage(10, 2, 'tilki').e('bocek', 14, null, [12, 15]);
    b.ground(10, 2).spring(3, 2, 3).plat(5, 11, 3).star(6, 11).row(5, 11, 1);
    b.ground(14, 2).e('kirpi', 5, null, [2, 8]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Süzülen Adalar', build(b) {
    b.ground(12, 2).row(2, 2, 4).cage(8, 2, 'kus');
    b.gap(6).spore(0.5, 2, 5, 4).row(1, 6, 4);
    b.ground(8, 3).row(1, 3, 3);
    b.gap(7).spore(0.5, 3, 6, 4.5).row(1, 7, 5).plat(2, 9, 3).star(3, 9);
    b.ground(14, 2).cp(2).e('bocek', 8, null, [5, 11]).cage(12, 2, 'tilki');
    b.gap(6).spore(0.5, 2, 5, 4).row(1, 6, 4);
    b.ground(14, 2).spring(4, 2, 2).plat(6, 8, 3).row(6, 8, 3).e('kirpi', 11, null, [9, 13]);
    b.ground(12, 2).cage(4, 2, 'maymun').row(7, 2, 3);
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Orman Kalbi', build(b) {
    b.ground(14, 2).row(1, 2, 3).spring(7, 2, 2).plat(9, 8, 4).row(9, 8, 4).cage(10, 8, 'kus');
    b.ground(10, 2).e('bocek', 5, null, [3, 8]);
    b.gap(3);
    b.ground(12, 2).arc(-3.6, 2, 5).e('kirpi', 7, null, [4, 10]).cp(1);
    b.ground(6, 4).ground(6, 6).row(1, 6, 4).crate(3, 9);
    b.gap(6).spore(0.5, 2, 5, 5).row(1, 7, 4);
    b.ground(14, 6).cage(5, 6, 'tilki').e('bocek', 10, 6, [8, 12]);
    b.ground(6, 2).spring(3, 2, 3).plat(4, 11, 3).star(5, 11).row(4, 11, 1);
    b.ground(14, 2).heart(2).e('kirpi', 6, null, [4, 9]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  // ---------------- 31–35 ----------------
  { name: 'Dikenli Mantarlık', build(b) {
    b.ground(16, 2).row(1, 2, 3).thorns(6, 2).spring(10, 2, 1).plat(12, 6, 3).row(12, 6, 3);
    b.ground(10, 2).cage(3, 2, 'kus').e('bocek', 7, null, [6, 9]);
    b.gap(2);
    b.ground(14, 2).arc(-2.9, 2, 5).thorns(5, 2).spring(10, 2, 2).plat(12, 8, 3).star(13, 8);
    b.ground(10, 2).cp(2).row(5, 2, 3);
    b.gap(7).spore(0.5, 2, 6, 4.5).thorns(0, 7, -3).row(1, 6, 5);
    b.ground(16, 2).e('kirpi', 5, null, [2, 8]).thorns(10, 2).cage(14, 2, 'tilki');
    b.ground(12, 2).spring(3, 2, 2).plat(5, 8, 4).cage(6, 8, 'maymun').row(8, 8, 1);
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Sal ve Spor', build(b) {
    b.ground(12, 2).row(2, 2, 4).cage(9, 2, 'kus');
    b.gap(10).raft(0.5, 2, 2.4, 'x', 5.6, 1.8).thorns(0, 10, -3).row(2, 4, 3);
    b.ground(12, 2).cp(2).e('bocek', 7, null, [5, 10]);
    b.gap(6).spore(0.5, 2, 5, 4).row(1, 6, 4);
    b.ground(14, 2).spring(3, 2, 3).plat(5, 11, 3).star(6, 11).row(5, 11, 1).e('kirpi', 10, null, [8, 13]);
    b.ground(10, 2).cage(4, 2, 'tilki');
    b.gap(8).raft(0.5, 2, 2.4, 'x', 4.2, 1.6).thorns(0, 8, -3).row(2, 4, 3);
    b.ground(14, 2).e('bocek', 5, null, [3, 8]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Yükselen Mantarlar', build(b) {
    b.ground(10, 2).row(2, 2, 3).spring(7, 2, 1);
    b.ground(6, 5).cage(2, 5, 'kus').spring(4, 5, 1);
    b.ground(6, 8).row(1, 8, 4);
    b.ground(8, 5).row(1, 5, 3).e('bocek', 5, 5, [3, 7]);
    b.ground(10, 2).cp(2).spring(6, 2, 3).plat(8, 11, 3).star(9, 11).row(8, 11, 1);
    b.gap(3);
    b.ground(14, 2).arc(-3.6, 2, 5).e('kirpi', 6, null, [3, 9]).cage(12, 2, 'tilki');
    b.gap(6).spore(0.5, 2, 5, 4).row(1, 6, 4);
    b.ground(14, 2).spring(3, 2, 2).plat(5, 8, 4).row(5, 8, 4).cage(11, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Gölgeli Koru', build(b) {
    b.ground(14, 2).row(1, 2, 3).e('bocek', 8, null, [6, 11]).e('kirpi', 12, null, [11, 13]);
    b.gap(2);
    b.ground(12, 2).arc(-2.9, 2, 5).cage(5, 2, 'kus').spring(9, 2, 2).plat(10, 8, 2);
    b.ground(6, 3).crate(2, 3).crate(3, 3).row(1, 5, 4);
    b.gap(7).spore(0.5, 3, 6, 4.5).row(1, 7, 5);
    b.ground(12, 2).cp(2).heart(5).e('bocek', 9, null, [7, 11]);
    b.ground(14, 2).spring(3, 2, 3).plat(5, 11, 4).cage(6, 11, 'tilki').row(8, 11, 1).star(12, 2);
    b.gap(3);
    b.ground(14, 2).arc(-3.6, 2, 5).e('kirpi', 6, null, [3, 9]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Spor Merdiveni', build(b) {
    b.ground(12, 2).row(2, 2, 4).cage(9, 2, 'kus');
    b.ground(10, 2).spore(3, 2, 3, 6).plat(5, 9, 3).row(5, 9, 3);
    b.ground(6, 2).row(1, 2, 3);
    b.ground(10, 2).spore(2, 2, 3, 8).plat(4, 11, 3).star(5, 11).row(4, 11, 1).cp(8);
    b.gap(6).spore(0.5, 2, 5, 4).row(1, 6, 4);
    b.ground(14, 2).e('bocek', 5, null, [3, 8]).cage(11, 2, 'tilki');
    b.ground(14, 2).spring(3, 2, 2).plat(5, 8, 3).row(5, 8, 3).e('kirpi', 11, null, [9, 13]);
    b.gap(2);
    b.ground(14, 2).arc(-2.9, 2, 5).cage(10, 2, 'maymun').e('bocek', 5, null, [3, 7]);
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  // ---------------- 36–39 ----------------
  { name: 'Mantarcık Ordusu', build(b) {
    b.ground(16, 2).row(1, 2, 2).e('bocek', 6, null, [4, 8]).e('bocek', 12, null, [10, 15]);
    b.ground(10, 2).cage(3, 2, 'kus').spring(7, 2, 2).plat(8, 8, 2);
    b.gap(2);
    b.ground(16, 2).arc(-2.9, 2, 5).e('bocek', 5, null, [3, 7]).e('kirpi', 11, null, [9, 14]).cp(14);
    b.gap(6).spore(0.5, 2, 5, 4).row(1, 6, 4);
    b.ground(14, 2).e('bocek', 6, null, [4, 9]).cage(11, 2, 'tilki').heart(2);
    b.ground(12, 2).spring(3, 2, 3).plat(5, 11, 3).star(6, 11).row(5, 11, 1).e('bocek', 9, null, [8, 11]);
    b.ground(14, 2).e('kirpi', 5, null, [2, 8]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Uçurum Bulutları', build(b) {
    b.ground(12, 2).row(2, 2, 4).cage(8, 2, 'kus');
    b.gap(7).spore(0.5, 2, 6, 4.5).thorns(0, 7, -3).row(1, 6, 5);
    b.ground(6, 3).row(1, 3, 3);
    b.gap(7).spore(0.5, 3, 6, 4.5).thorns(0, 7, -3).row(1, 7, 5).plat(3, 10, 2).star(3, 10);
    b.ground(12, 2).cp(2).e('bocek', 7, null, [5, 10]).cage(10, 2, 'tilki');
    b.gap(6).spore(0.5, 2, 5, 4).thorns(0, 6, -3).row(1, 6, 4);
    b.ground(14, 2).e('kirpi', 5, null, [2, 8]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Altın Mantar Tepesi', build(b) {
    b.ground(12, 2).row(1, 2, 3).spring(7, 2, 3).plat(9, 11, 4).row(9, 11, 4);
    b.ground(8, 2).cage(2, 2, 'kus').spring(6, 2, 2);
    b.ground(6, 6).row(1, 6, 3).spring(4, 6, 2);
    b.ground(8, 9).row(1, 9, 5).star(6, 9);
    b.ground(10, 2).cp(2).e('bocek', 6, null, [4, 9]);
    b.gap(3);
    b.ground(14, 2).arc(-3.6, 2, 5).spring(4, 2, 2).plat(6, 8, 3).cage(7, 8, 'tilki').row(6, 8, 1).e('kirpi', 11, null, [9, 13]);
    b.gap(6).spore(0.5, 2, 5, 4).row(1, 6, 4);
    b.ground(14, 2).e('bocek', 5, null, [3, 8]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Kral Kapısı', build(b) {
    b.ground(14, 2).row(1, 2, 3).e('kirpi', 7, null, [4, 10]).cage(12, 2, 'kus');
    b.gap(6).spore(0.5, 2, 5, 4).thorns(0, 6, -3).row(1, 6, 4);
    b.ground(14, 2).spring(3, 2, 2).plat(5, 8, 3).row(5, 8, 3).e('bocek', 10, null, [8, 13]);
    b.ground(10, 2).cp(2).heart(5);
    b.gap(10).raft(0.5, 2, 2.4, 'x', 5.6, 2.0).thorns(0, 10, -3).row(2, 4, 3);
    b.ground(14, 2).e('bocek', 5, null, [3, 7]).e('kirpi', 10, null, [9, 13]).cage(13, 2, 'tilki');
    b.ground(10, 2).spring(3, 2, 3).plat(5, 11, 3).star(6, 11).row(5, 11, 1);
    b.gap(3);
    b.ground(14, 2).arc(-3.6, 2, 5).cage(10, 2, 'maymun').e('bocek', 5, null, [3, 8]);
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  // ---------------- 40: boss ----------------
  { name: 'Mantar Kral', boss: true, bossKind: 'kral', build(b) {
    b.ground(12, 2).row(2, 2, 5).cage(9, 2, 'kus');
    b.gap(3);
    b.ground(10, 2).arc(-3.2, 2, 5).cage(7, 2, 'tilki').cp(2).heart(5);
    b.ground(28, 2).boss(2, 26).cage(25, 2, 'maymun').row(5, 2, 4).row(17, 2, 4).star(14, 2);
    b.ground(16, 2).end(9);
  } },
];
