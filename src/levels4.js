// Buzul Dağları — 61–80. bölümler. Yeni: kaygan buz (kayarsın), buz sarkıtları (yaklaşınca düşer),
// buz blokları (yolu kapatır, şimşekle erir). Düşmanlar: buz böceği (böcek kuralı: üstüne bas),
// yeti (kirpi kuralı: kartopu atar, önce şimşek sonra üstüne zıpla). Boss: Buz Golemi.

export const LEVELS4 = [
  // ---------------- 61–65: yeni mekanikler ----------------
  { name: 'Karlı Patika', build(b) {
    b.ground(18, 2).sign(3, 'ice').ice(6, 8).row(6, 2, 8).cage(16, 2, 'kus');
    b.gap(2);
    b.ground(14, 2).arc(-2.9, 2, 5).e('bocek', 7, null, [4, 11]).cp(12);
    b.ground(16, 2).ice(2, 10).row(3, 2, 6).spring(13, 2).plat(14, 7, 3).star(15, 7);
    b.ground(10, 2).cage(4, 2, 'tilki');
    b.gap(2);
    b.ground(14, 2).arc(-2.9, 2, 5).e('bocek', 7, null, [4, 11]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Sarkıt Mağarası', build(b) {
    b.ground(16, 2).sign(2, 'icicle').row(2, 2, 3).icicle(8).icicle(11).cage(14, 2, 'kus');
    b.ground(12, 2).e('bocek', 6, null, [3, 9]).cp(10);
    b.gap(2);
    b.ground(16, 2).arc(-2.9, 2, 5).icicle(5).icicle(9).row(4, 2, 7).crumble(12, 5, 3).star(13, 5);
    b.ground(10, 2).cage(4, 2, 'tilki');
    b.ground(14, 2).icicle(4).e('bocek', 9, null, [7, 12]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Buz Duvarı', build(b) {
    b.ground(16, 2).sign(3, 'iceblock').row(1, 2, 2).iceWall(8, 3).row(10, 2, 3).cage(14, 2, 'kus');
    b.ground(12, 2).e('bocek', 6, null, [3, 9]).cp(10);
    b.ground(14, 2).iceWall(4, 3).cage(8, 2, 'tilki').row(9, 2, 3);
    b.gap(2);
    b.ground(14, 2).arc(-2.9, 2, 5).ice(4, 6).row(4, 2, 6).plat(9, 6, 3).star(10, 6);
    b.ground(14, 2).iceWall(3, 2).e('bocek', 9, null, [6, 12]).cage(13, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Yeti Tepesi', build(b) {
    b.ground(16, 2).sign(3, 'yeti').row(1, 2, 2).e('kirpi', 11, null, [9, 14]);
    b.ground(10, 2).cage(4, 2, 'kus').row(6, 2, 3);
    b.gap(2);
    b.ground(14, 2).arc(-2.9, 2, 5).ice(2, 6).row(2, 2, 6).e('bocek', 10, null, [9, 13]).cp(13);
    b.ground(6, 3).crate(2, 3).row(1, 5, 3);
    b.ground(14, 2).e('kirpi', 7, null, [5, 9]).spring(11, 2).plat(12, 7, 2).star(12, 7);
    b.ground(10, 2).cage(5, 2, 'tilki');
    b.gap(2);
    b.ground(14, 2).arc(-2.9, 2, 5).cage(10, 2, 'maymun').e('bocek', 5, null, [3, 7]);
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Kayak Yokuşu', build(b) {
    b.ground(10, 2).row(2, 2, 3).cage(7, 2, 'kus');
    b.ground(6, 3).ground(6, 4).row(1, 4, 4);
    b.ground(16, 4).ice(0, 14).row(2, 4, 8).icicle(7, 4).cp(15);
    b.gap(2);
    b.ground(14, 4).arc(-2.9, 4, 5).e('bocek', 7, 4, [4, 11]).cage(12, 4, 'tilki');
    b.ground(6, 3).ground(10, 2).iceWall(4, 2).plat(6, 6, 3).star(7, 6);
    b.ground(14, 2).e('kirpi', 6, null, [3, 9]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  // ---------------- 66–70 ----------------
  { name: 'Donmuş Göl', build(b) {
    b.ground(20, 2).ice(2, 16).row(3, 2, 8).e('bocek', 12, null, [9, 16]).cage(18, 2, 'kus');
    b.gap(2);
    b.ground(14, 2).arc(-2.9, 2, 5).cp(2).icicle(7).row(5, 2, 4);
    b.ground(16, 2).ice(0, 14).e('kirpi', 10, null, [8, 13]).crumble(4, 5, 3).star(5, 5);
    b.ground(10, 2).cage(4, 2, 'tilki');
    b.gap(2);
    b.ground(14, 2).arc(-2.9, 2, 5).iceWall(5, 2).cage(10, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Buz Kristalleri', build(b) {
    b.ground(14, 2).row(1, 2, 3).iceWall(7, 2).cage(11, 2, 'kus');
    b.ground(8, 4).row(1, 4, 4).iceWall(6, 2, 4);
    b.gap(2);
    b.ground(14, 2).arc(-2.9, 2, 5).e('bocek', 7, null, [4, 11]).cp(12);
    b.ground(14, 2).icicle(3).icicle(6).row(2, 2, 6).cage(11, 2, 'tilki');
    b.ground(10, 2).spring(3, 2).plat(5, 8, 3).star(6, 8);
    b.ground(14, 2).e('kirpi', 6, null, [3, 9]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Çığ Yolu', build(b) {
    b.ground(18, 2).icicle(4).icicle(7).icicle(10).icicle(13).row(3, 2, 10).cage(16, 2, 'kus');
    b.ground(10, 2).cp(2).heart(6);
    b.gap(6).crumble(2, 2, 2).row(2, 2, 2);
    b.ground(16, 2).ice(2, 10).e('bocek', 8, null, [5, 11]).cage(14, 2, 'tilki');
    b.ground(10, 2).crumble(4, 5, 3).star(5, 5);
    b.ground(14, 2).e('kirpi', 6, null, [3, 9]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Yeti Köyü', build(b) {
    b.ground(16, 2).row(1, 2, 2).e('kirpi', 7, null, [5, 9]).e('kirpi', 13, null, [11, 15]);
    b.ground(10, 2).cage(3, 2, 'kus').iceWall(6, 2).row(7, 2, 2);
    b.gap(2);
    b.ground(16, 2).arc(-2.9, 2, 5).e('bocek', 5, null, [3, 7]).e('kirpi', 11, null, [9, 14]).cp(14);
    b.ground(14, 2).ice(2, 8).cage(11, 2, 'tilki').heart(2);
    b.ground(12, 2).spring(3, 2).plat(5, 8, 3).star(6, 8).e('bocek', 9, null, [8, 11]);
    b.ground(14, 2).e('kirpi', 5, null, [2, 8]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Kuzey Işıkları', build(b) {
    b.ground(14, 2).row(1, 2, 3).ice(5, 6).cage(12, 2, 'kus');
    b.gap(9).crumble(2, 2, 2).crumble(5, 3, 2).row(2, 2, 2).row(5, 3, 2);
    b.ground(14, 2).icicle(4).icicle(8).row(3, 2, 6).e('bocek', 12, null, [11, 13]).cp(1);
    b.ground(8, 3).plat(2, 6, 3).star(3, 6).row(1, 3, 2);
    b.ground(14, 2).cage(4, 2, 'tilki').e('kirpi', 9, null, [7, 12]);
    b.gap(2);
    b.ground(14, 2).arc(-2.9, 2, 5).iceWall(4, 2).cage(10, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  // ---------------- 71–75 ----------------
  { name: 'Buzul Kemeri', build(b) {
    b.ground(14, 2).row(1, 2, 3).spring(7, 2).plat(9, 7, 4).row(9, 7, 4).cage(10, 7, 'kus');
    b.ground(10, 2).e('bocek', 5, null, [3, 8]);
    b.gap(6).crumble(2, 2, 2).row(2, 2, 2);
    b.ground(12, 2).cp(2).ice(4, 6).row(4, 2, 5);
    b.ground(6, 4).ground(6, 6).row(1, 6, 4).plat(7, 9, 3).star(8, 9);
    b.ground(14, 6).cage(5, 6, 'tilki').e('bocek', 10, 6, [8, 12]);
    b.ground(6, 2).heart(3);
    b.ground(14, 2).e('kirpi', 6, null, [4, 9]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Kar Fırtınası', build(b) {
    b.ground(12, 2).row(2, 2, 4).cage(9, 2, 'kus');
    b.ground(18, 2).storm(1, 16).ice(4, 8).e('bocek', 13, null, [11, 16]).row(2, 2, 2);
    b.ground(10, 2).cp(2).heart(6);
    b.gap(6).crumble(2, 2, 2).row(2, 2, 2);
    b.ground(16, 2).storm(2, 10).icicle(6).row(3, 2, 6).cage(14, 2, 'tilki');
    b.ground(10, 2).crumble(4, 5, 3).star(5, 5);
    b.ground(14, 2).e('kirpi', 6, null, [3, 9]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Buz Sarayı Bahçesi', build(b) {
    b.ground(16, 2).row(1, 2, 3).iceWall(5, 2).iceWall(9, 3).cage(13, 2, 'kus');
    b.ground(8, 3).crate(3, 3).row(1, 5, 2);
    b.gap(2);
    b.ground(14, 2).arc(-2.9, 2, 5).ice(3, 8).row(3, 2, 6).e('kirpi', 11, null, [9, 13]);
    b.ground(10, 2).cp(2).heart(6);
    b.gap(6).crumble(2, 2, 2).row(2, 2, 2);
    b.ground(16, 2).e('bocek', 5, null, [2, 8]).cage(10, 2, 'tilki').icicle(13);
    b.ground(10, 2).spring(3, 2).plat(5, 8, 3).star(6, 8).row(5, 8, 1);
    b.ground(14, 2).e('kirpi', 5, null, [2, 8]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Donmuş Nehir', build(b) {
    b.ground(14, 2).row(1, 2, 3).cage(8, 2, 'kus');
    b.gap(10).raft(0.5, 2, 2.4, 'x', 5.6, 1.8).thorns(0, 10, -3).row(2, 4, 3);
    b.ground(14, 2).cp(2).ice(3, 9).row(4, 2, 6);
    b.gap(6).crumble(2, 2, 2).row(2, 2, 2);
    b.ground(14, 2).e('bocek', 6, null, [3, 9]).crumble(10, 5, 3).star(11, 5);
    b.ground(10, 2).cage(4, 2, 'tilki');
    b.ground(14, 2).icicle(4).icicle(8).row(3, 2, 4).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Sarkıtlı Kanyon', build(b) {
    b.ground(16, 2).row(1, 2, 3).icicle(6).icicle(9).spring(12, 2).plat(13, 6, 3).row(13, 6, 3);
    b.ground(10, 2).cage(3, 2, 'kus').e('bocek', 7, null, [6, 9]);
    b.gap(9).crumble(2, 2, 2).crumble(5, 2, 2).thorns(0, 9, -3).row(2, 2, 2).row(5, 2, 2);
    b.ground(10, 2).cp(2).row(5, 2, 3);
    b.ground(16, 2).e('kirpi', 5, null, [2, 8]).ice(9, 6).cage(14, 2, 'tilki');
    b.ground(12, 2).crumble(4, 5, 3).star(5, 5).cage(9, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  // ---------------- 76–79 ----------------
  { name: 'Buz Labirenti', build(b) {
    b.ground(18, 2).iceWall(4, 2).iceWall(9, 3).iceWall(14, 2).row(1, 2, 2).row(6, 2, 2).row(11, 2, 2).cage(16, 2, 'kus');
    b.gap(6).crumble(2, 2, 2).row(2, 2, 2);
    b.ground(14, 2).cp(2).e('bocek', 8, null, [6, 11]);
    b.ground(6, 3).ground(6, 4).row(1, 4, 4);
    b.gap(9).crumble(2, 4, 2).crumble(5, 4, 2).row(2, 4, 2).row(5, 4, 2);
    b.ground(14, 4).cage(5, 4, 'tilki').plat(9, 7, 3).star(10, 7);
    b.ground(6, 2).heart(3);
    b.ground(14, 2).e('kirpi', 6, null, [3, 9]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Kaygan Zirve', build(b) {
    b.ground(12, 2).row(2, 2, 4).cage(9, 2, 'kus');
    b.ground(20, 2).ice(0, 20).e('bocek', 8, null, [5, 11]).e('kirpi', 15, null, [13, 18]).row(2, 2, 2);
    b.ground(10, 2).cp(2).heart(6);
    b.gap(6).crumble(2, 2, 2).row(2, 2, 2);
    b.ground(14, 2).ice(1, 10).crumble(5, 5, 3).star(6, 5).cage(12, 2, 'tilki');
    b.ground(14, 2).e('bocek', 6, null, [3, 9]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Kristal Tapınak', build(b) {
    b.ground(10, 2).row(2, 2, 3).spring(7, 2);
    b.ground(6, 5).cage(2, 5, 'kus').row(4, 5, 2);
    b.gap(6).crumble(2, 5, 2).row(2, 5, 2);
    b.ground(8, 5).row(1, 5, 4).star(6, 5);
    b.ground(6, 3).ground(10, 2).cp(2).e('bocek', 6, null, [4, 9]);
    b.gap(2);
    b.ground(14, 2).arc(-2.9, 2, 5).iceWall(4, 2).ice(6, 6).cage(12, 2, 'tilki');
    b.gap(6).crumble(2, 2, 2).row(2, 2, 2);
    b.ground(14, 2).e('kirpi', 6, null, [3, 9]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Golem Kapısı', build(b) {
    b.ground(14, 2).row(1, 2, 3).e('kirpi', 7, null, [4, 10]).cage(12, 2, 'kus');
    b.gap(9).crumble(2, 2, 2).crumble(5, 2, 2).thorns(0, 9, -3).row(2, 2, 2).row(5, 2, 2);
    b.ground(14, 2).ice(2, 8).row(3, 2, 4).e('bocek', 11, null, [10, 13]);
    b.ground(10, 2).cp(2).heart(5);
    b.gap(10).raft(0.5, 2, 2.4, 'x', 5.6, 2.0).thorns(0, 10, -3).row(2, 4, 3);
    b.ground(14, 2).e('bocek', 5, null, [3, 7]).e('kirpi', 10, null, [9, 13]).cage(13, 2, 'tilki');
    b.ground(10, 2).crumble(4, 5, 3).star(5, 5);
    b.gap(2);
    b.ground(14, 2).arc(-2.9, 2, 5).iceWall(4, 2).cage(11, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  // ---------------- 80: boss ----------------
  { name: 'Buz Golemi', boss: true, bossKind: 'golem', build(b) {
    b.ground(12, 2).row(2, 2, 5).cage(9, 2, 'kus');
    b.gap(3);
    b.ground(10, 2).arc(-3.2, 2, 5).cage(7, 2, 'tilki').cp(2).heart(5);
    b.ground(28, 2).boss(2, 26).cage(25, 2, 'maymun').row(5, 2, 4).row(17, 2, 4).star(14, 2);
    b.ground(16, 2).end(9);
  } },
];
