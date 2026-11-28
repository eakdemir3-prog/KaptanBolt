// Yeşil Vadi — 20 bölüm. Her bölümde 3 kafes (hayvan), 1 gizli kristal yıldız ve yaklaşık 45–60 altın.
// b.ground(uzunluk, yükseklik) / b.gap(n) / b.bridge(n) imleci ilerletir; diğerleri son parçanın başına göre (dx) yerleşir.
// Sınırlar (fizik): zıplama 3,3 kare yükselir, düz koşuda ~4 kare boşluk geçilir; mantar 6,4 kare atar.

const A = ['kus', 'tilki', 'maymun'];

export const LEVELS = [
  // ---------------- 1–5: öğretici ----------------
  { name: 'Vadi Girişi', build(b) {
    b.ground(18, 2).sign(3, 'move').row(6, 2, 5).sign(11, 'jump');
    b.cage(15, 2, 'kus');
    b.gap(1);
    b.ground(14, 2).row(4, 2, 4).arc(11.6, 2, 4);
    b.gap(2);
    b.ground(6, 2).row(1, 2, 3);
    b.ground(12, 2).sign(1, 'stomp').e('bocek', 6, null, [5, 9]).row(9, 2, 3);
    b.ground(5, 3).plat(3, 6, 3).star(4, 6).row(0, 3, 2);
    b.ground(14, 2).cage(6, 2, 'tilki').row(9, 2, 4).cp(1);
    b.gap(2);
    b.ground(10, 2).arc(-2.9, 2, 5).plat(4, 5, 3).row(4, 5, 3);
    b.ground(16, 2).e('bocek', 6, null, [3, 10]).cage(13, 2, 'maymun').row(2, 2, 4);
    b.ground(12, 2).row(1, 2, 3).end(6);
  } },
  { name: 'Böcek Çayırı', build(b) {
    b.ground(14, 2).sign(4, 'stomp').row(7, 2, 4);
    b.ground(16, 2).e('bocek', 5).e('bocek', 12).arc(1, 2, 4).arc(9, 2, 4);
    b.gap(2);
    b.ground(8, 3).crate(3, 3).crate(4, 3).row(2, 5, 4);
    b.ground(10, 2).cage(6, 2, 'kus').plat(2, 5, 2).row(2, 5, 2);
    b.gap(2);
    b.ground(14, 2).arc(-2.9, 2, 5).e('bocek', 9).cp(2).row(5, 2, 3);
    b.ground(4, 3).ground(4, 4).ground(6, 5).row(1, 5, 4).crate(4, 8);
    b.ground(6, 3).plat(0, 7, 3).star(1, 7).row(0, 7, 1).row(2, 7, 1);
    b.ground(14, 2).e('bocek', 4, null, [1, 7]).e('bocek', 8, null, [7.5, 10]).cage(12, 2, 'tilki').row(5, 2, 4);
    b.gap(2);
    b.ground(12, 2).plat(3, 5, 4).cage(5, 5, 'maymun').row(8, 2, 3);
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Kirpi Yolu', build(b) {
    b.ground(14, 2).sign(5, 'spike').row(1, 2, 3).e('kirpi', 10);
    b.ground(12, 2).arc(-4.5, 2, 5).heart(8).row(9, 2, 2);
    b.gap(2);
    b.ground(16, 2).e('kirpi', 6).e('bocek', 12).arc(3.5, 2, 5).cage(14, 2, 'kus');
    b.ground(6, 3).crate(2, 3).row(2, 5, 2);
    b.ground(14, 2).plat(3, 5, 3).plat(8, 6, 3).row(3, 5, 2).arc(5.4, 5, 3, 0.75).row(10, 6, 1).cage(9, 6, 'tilki').cp(1);
    b.gap(2);
    b.ground(16, 2).arc(-2.9, 2, 5).e('kirpi', 6, null, [5, 8]).e('kirpi', 13, null, [12, 15]).row(1, 2, 3).row(9, 2, 2);
    b.ground(8, 4).row(1, 4, 4).star(6, 4);
    b.ground(14, 2).e('bocek', 6).cage(11, 2, 'maymun').row(2, 2, 3);
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Mantar Sıçrayışı', build(b) {
    b.ground(14, 2).sign(3, 'spring').spring(8).col(8, 4.5, 4).plat(10, 8, 4).row(10, 8, 4);
    b.ground(10, 2).cage(3, 2, 'kus').spring(8).col(8, 4.5, 3);
    b.ground(4, 6).row(0, 6, 4);
    b.ground(10, 2).spring(5).col(5, 4, 3).plat(7, 9, 3).cage(8, 9, 'tilki').row(7, 9, 1);
    b.gap(2);
    b.ground(12, 2).arc(-2.9, 2, 5).e('bocek', 7).cp(1).row(4, 2, 3);
    b.ground(14, 2).spring(3).plat(6, 8, 3).plat(11, 8, 3).row(6, 8, 3).row(11, 8, 3).star(12, 8).e('kirpi', 9);
    b.gap(2);
    b.ground(14, 2).arc(-2.9, 2, 5).cage(8, 2, 'maymun').e('bocek', 11).row(2, 2, 4);
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Dikenli Çalılar', build(b) {
    b.ground(16, 2).sign(3, 'thorn').thorns(7, 2).arc(5.6, 2, 4).row(11, 2, 3);
    b.ground(14, 2).thorns(4, 3).arc(2.4, 2, 5).cage(11, 2, 'kus');
    b.gap(2);
    b.ground(12, 2).thorns(3, 2).thorns(8, 2).arc(1.6, 2, 4).arc(6.6, 2, 4).heart(11);
    b.ground(6, 3).plat(1, 6, 3).cage(2, 6, 'tilki').row(4, 3, 2);
    b.ground(16, 2).cp(1).e('bocek', 6).thorns(10, 3).arc(8.4, 2, 5);
    b.gap(2);
    b.ground(20, 2).arc(-2.9, 2, 5).spring(3).plat(5, 8, 3).star(6, 8).row(10, 2, 1).thorns(13, 2).arc(11.6, 2, 4).e('kirpi', 17, null, [16, 20]);
    b.ground(14, 2).cage(6, 2, 'maymun').row(1, 2, 4).e('bocek', 10);
    b.ground(10, 2).row(1, 2, 3).end(6);
  } },
  // ---------------- 6–10: yüzen kayalar, köprüler, uzun boşluklar ----------------
  { name: 'Asma Köprüler', build(b) {
    b.ground(12, 2).sign(5, 'gun').row(2, 2, 2).sign(10, 'bridge');
    b.bridge(6).row(1, 2, 4);
    b.ground(10, 2).e('bocek', 5).cage(8, 2, 'kus');
    b.bridge(8).e('bocek', 4, 2).row(1, 2, 6);
    b.ground(8, 3).crate(5, 3).row(1, 3, 3);
    b.gap(4);
    b.ground(14, 3).plat(-3, 6, 2).row(-3, 6, 2).cp(2).e('kirpi', 9).cage(12, 3, 'tilki');
    b.bridge(10).row(1, 3, 8).e('bocek', 6, 3);
    b.ground(6, 3).plat(2, 6, 2).plat(5, 9, 2).star(5, 9);
    b.ground(14, 2).cage(10, 2, 'maymun').row(2, 2, 4).e('bocek', 6);
    b.ground(12, 2).row(1, 2, 3).end(7);
  } },
  { name: 'Uçan Kayalar', build(b) {
    b.ground(10, 2).row(2, 2, 4);
    b.gap(12).plat(1, 4, 3).plat(6, 5, 2).plat(10, 4, 2).row(1, 4, 3).row(6, 5, 2).row(10, 4, 2);
    b.ground(12, 2).e('bocek', 6).cage(10, 2, 'kus');
    b.gap(14).plat(1, 3, 2).plat(5, 5, 2).plat(9, 7, 3).plat(13, 5, 1).row(9, 7, 3).cage(10, 7, 'tilki').plat(5, 10, 2).star(5, 10);
    b.ground(12, 2).cp(2).arc(-2, 5, 3).e('kirpi', 8);
    b.gap(10).plat(2, 4, 2).plat(6, 4, 2).arc(-1.2, 2, 3).arc(2.8, 4, 3).arc(6.8, 4, 4);
    b.ground(14, 2).e('bocek', 5).e('bocek', 9).cage(12, 2, 'maymun').row(2, 2, 3);
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Sandık Tepesi', build(b) {
    b.ground(14, 2).sign(3, 'crate').crate(7, 2).crate(8, 2).crate(8, 3).row(10, 2, 3);
    b.ground(12, 3).crate(3, 3).crate(4, 3).crate(5, 3).crate(4, 4).cage(9, 3, 'kus').row(3, 5, 3);
    b.gap(3);
    b.ground(14, 3).arc(-3.2, 3, 5).e('bocek', 5).crate(10, 5).crate(11, 5).row(10, 6, 2).heart(12);
    b.ground(16, 2).cp(1).e('kirpi', 6).crate(10, 2).crate(10, 3).plat(12, 5, 3).cage(13, 5, 'tilki');
    b.gap(3);
    b.ground(14, 2).arc(-3.2, 2, 5).spring(1).plat(3, 8, 3).star(4, 8).row(3, 8, 1).row(5, 8, 1).e('bocek', 10);
    b.ground(14, 2).crate(4, 2).crate(5, 2).cage(10, 2, 'maymun').row(1, 2, 3).e('bocek', 8);
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Şelale Kıyısı', build(b) {
    b.ground(10, 2).row(2, 2, 4);
    b.gap(3);
    b.ground(8, 3).arc(-3.2, 2, 5).e('bocek', 4);
    b.gap(3);
    b.ground(8, 4).arc(-3.2, 3, 5).cage(5, 4, 'kus');
    b.bridge(8).row(1, 4, 6).e('kirpi', 4, 4);
    b.ground(10, 4).cp(1).plat(5, 7, 3).row(5, 7, 3);
    b.gap(4);
    b.ground(6, 3).arc(-4.2, 4, 5).thorns(3, 2);
    b.ground(14, 2).spring(3).plat(5, 8, 2).plat(9, 10, 2).star(9, 10).cage(5, 8, 'tilki').e('bocek', 11);
    b.gap(3);
    b.ground(14, 2).arc(-3.2, 2, 5).e('bocek', 5).e('kirpi', 10).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Yosunlu Basamaklar', build(b) {
    b.ground(8, 2).row(2, 2, 3).ground(4, 3).ground(4, 4).ground(4, 5).row(-8, 3, 3).row(-4, 4, 3).row(0, 5, 3);
    b.gap(3);
    b.ground(10, 5).arc(-3.2, 5, 5).e('bocek', 6).cage(8, 5, 'kus');
    b.ground(4, 4).ground(4, 3).ground(10, 2).cp(2).thorns(5, 2).arc(3.6, 2, 4);
    b.gap(2);
    b.ground(6, 4).plat(2, 7, 2).plat(5, 10, 3).cage(6, 10, 'tilki').row(5, 10, 1);
    b.ground(14, 2).e('kirpi', 5).e('bocek', 10).heart(13).row(1, 2, 3);
    b.bridge(6).row(1, 2, 4);
    b.ground(10, 3).crate(1, 3).crate(1, 4).plat(3, 6, 1).plat(5, 8, 2).star(5, 8).cage(8, 3, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  // ---------------- 11–15: hareketli sallar, gizli yollar ----------------
  { name: 'Sal Geçidi', build(b) {
    b.ground(12, 2).sign(6, 'raft').row(2, 2, 4);
    b.gap(10).raft(0.5, 2, 2.6, 'x', 6, 1.6).row(3, 3.4, 4);
    b.ground(12, 2).e('bocek', 6).cage(10, 2, 'kus');
    b.gap(12).raft(0.5, 3, 2.6, 'x', 8, 1.8).row(2, 4.2, 6).star(5, 5);
    b.ground(14, 2).cp(1).e('kirpi', 7).cage(12, 2, 'tilki').row(2, 2, 3);
    b.gap(8).raft(0.5, 2, 2.4, 'x', 4.5, 1.4).row(2, 3.4, 4);
    b.ground(14, 2).e('bocek', 5).e('bocek', 9).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Asansör Sallar', build(b) {
    b.ground(12, 2).row(2, 2, 4);
    b.gap(3).raft(0.2, 2, 2.6, 'y', 5, 1.4);
    b.ground(10, 7).row(1, 7, 4).cage(7, 7, 'kus').e('bocek', 5, 7);
    b.gap(4);
    b.ground(14, 3).arc(-4.2, 7, 4).cp(2).e('kirpi', 9);
    b.gap(3).raft(0.2, 3, 2.6, 'y', 6, 1.5).col(1, 5, 4);
    b.ground(8, 9).plat(3, 11, 3).star(4, 11).cage(6, 9, 'tilki');
    b.gap(3);
    b.ground(16, 2).arc(-3.2, 9, 3).e('bocek', 6).e('bocek', 11).cage(14, 2, 'maymun').row(2, 2, 3);
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Gizli Yollar', build(b) {
    b.ground(16, 2).row(2, 2, 4).plat(9, 5, 3).plat(13, 7, 3).plat(17, 10, 4).row(17, 10, 4).star(19, 10);
    b.ground(10, 2).e('bocek', 5).cage(8, 2, 'kus');
    b.gap(3);
    b.ground(12, 2).arc(-3.2, 2, 5).crate(5, 2).crate(6, 2).crate(5, 3).crate(6, 3).cage(9, 2, 'tilki').heart(1);
    b.gap(10).raft(0.5, 2, 2.6, 'x', 6, 1.7).row(3, 3.4, 5);
    b.ground(14, 2).cp(1).thorns(6, 3).arc(4.4, 2, 5).e('kirpi', 11);
    b.ground(10, 2).spring(2).plat(4, 8, 4).cage(6, 8, 'maymun').row(4, 8, 2);
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Diken Vadisi', build(b) {
    b.ground(10, 2).row(2, 2, 3);
    b.ground(16, 2).thorns(0, 4).thorns(8, 4).plat(1, 5, 2).plat(9, 5, 2).row(1, 5, 2).row(9, 5, 2).cage(5, 2, 'kus');
    b.ground(6, 2).heart(3);
    b.gap(10).raft(0.5, 2, 2.6, 'x', 6, 1.8).thorns(0, 10, -3);
    b.ground(14, 2).cp(1).e('bocek', 4).thorns(8, 3).arc(6.4, 2, 5).cage(13, 2, 'tilki');
    b.ground(12, 2).spring(1).plat(3, 8, 2).plat(7, 8, 2).star(8, 8).thorns(3, 6).row(3, 8, 2);
    b.gap(3);
    b.ground(14, 2).arc(-3.2, 2, 5).e('kirpi', 6).e('bocek', 10).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Ağaç Tepeleri', build(b) {
    b.ground(10, 2).row(2, 2, 4);
    b.gap(16).plat(1, 4, 2).raft(4, 5, 2.4, 'y', 3, 1.2).plat(8, 7, 3).raft(12, 7, 2.4, 'x', 2, 1.4).row(8, 7, 3).cage(9, 7, 'kus');
    b.ground(10, 4).arc(-2, 7, 3).cp(2).e('bocek', 6, 4);
    b.gap(12).plat(2, 6, 2).plat(6, 8, 2).plat(10, 6, 2).row(2, 6, 2).row(6, 8, 2).row(10, 6, 2).star(6, 10);
    b.ground(12, 3).cage(6, 3, 'tilki').e('kirpi', 9, 3);
    b.bridge(8).row(1, 3, 6).e('bocek', 5, 3);
    b.ground(12, 3).cage(9, 3, 'maymun').row(1, 3, 4);
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  // ---------------- 16–19: hepsi bir arada ----------------
  { name: 'Uzun Yol', build(b) {
    b.ground(12, 2).row(2, 2, 4).e('bocek', 8);
    b.gap(4);
    b.ground(10, 2).arc(-4.2, 2, 5).thorns(4, 2).arc(2.6, 2, 4).cage(8, 2, 'kus');
    b.bridge(8).e('bocek', 3, 2).e('bocek', 6, 2).row(1, 2, 6);
    b.ground(8, 3).crate(4, 3).crate(4, 4).row(1, 3, 2);
    b.gap(10).raft(0.5, 3, 2.4, 'x', 6, 2.0).row(2, 4.4, 5);
    b.ground(12, 3).cp(1).e('kirpi', 4).spring(7, 3).plat(9, 9, 3).star(10, 9);
    b.gap(4);
    b.ground(12, 3).arc(-4.2, 3, 5).cage(6, 3, 'tilki').e('bocek', 9);
    b.gap(3).raft(0.2, 3, 2.4, 'y', 4, 1.6);
    b.ground(10, 7).cage(5, 7, 'maymun').row(1, 7, 3).e('kirpi', 7, 7);
    b.ground(4, 5).ground(4, 3).ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Kafes Avı', build(b) {
    b.ground(12, 2).row(2, 2, 4);
    b.ground(10, 2).spring(2).plat(4, 8, 2).plat(8, 11, 3).cage(9, 11, 'kus').row(4, 8, 2);
    b.gap(3);
    b.ground(14, 2).arc(-3.2, 2, 5).e('bocek', 5).e('kirpi', 10).crate(7, 4).crate(8, 4).row(7, 5, 2);
    b.gap(12).raft(0.5, 2, 2.4, 'x', 7, 1.8).thorns(0, 12, -3).plat(5, 6, 2).cage(5, 6, 'tilki');
    b.ground(12, 2).cp(1).e('bocek', 6).row(2, 2, 4);
    b.ground(6, 3).ground(6, 4).ground(10, 5).thorns(3, 2).arc(1.6, 5, 4).plat(5, 7, 2).star(5, 7);
    b.gap(4);
    b.ground(14, 2).arc(-4.2, 5, 4).cage(10, 2, 'maymun').e('bocek', 3, null, [1, 5]).e('bocek', 7, null, [6.5, 9]);
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Paslı İzler', build(b) {
    b.ground(12, 2).row(2, 2, 4).e('kirpi', 9);
    b.gap(3);
    b.ground(10, 3).arc(-3.2, 2, 5).e('bocek', 3).e('bocek', 7).cage(9, 3, 'kus');
    b.bridge(10).e('kirpi', 5, 3).row(1, 3, 3).plat(4, 6, 2).row(4, 6, 2);
    b.ground(12, 3).cp(1).thorns(4, 3).arc(2.4, 3, 5).heart(10);
    b.gap(12).raft(0.5, 3, 2.4, 'y', 4, 1.4).raft(5, 6, 2.4, 'x', 4, 1.7).row(6, 7.4, 4).plat(5, 10, 2).star(5, 10);
    b.ground(12, 6).cage(4, 6, 'tilki').e('bocek', 8, 6);
    b.ground(4, 4).ground(14, 2).thorns(2, 2).thorns(8, 2).arc(0.6, 2, 4).arc(6.6, 2, 4).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: "Amiral'in Gölgesi", build(b) {
    b.ground(12, 2).row(2, 2, 4);
    b.gap(4);
    b.ground(8, 2).arc(-4.2, 2, 5).e('kirpi', 4);
    b.gap(4);
    b.ground(10, 3).arc(-4.2, 2, 5).e('bocek', 3).e('bocek', 7).cage(9, 3, 'kus');
    b.gap(12).raft(0.5, 3, 2.4, 'x', 4, 2.0).raft(7, 5, 2.4, 'y', 3, 1.6).thorns(0, 12, -3).row(2, 4.4, 3);
    b.ground(12, 6).cp(1).e('kirpi', 6, 6).cage(10, 6, 'tilki');
    b.ground(4, 4).ground(12, 2).spring(2).plat(4, 8, 2).plat(8, 10, 3).star(9, 10).thorns(5, 4);
    b.gap(4);
    b.ground(14, 2).arc(-4.2, 2, 5).e('bocek', 5).e('kirpi', 9).cage(12, 2, 'maymun').heart(2);
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  // ---------------- 20: boss ----------------
  { name: 'Dev Paslı Böcek', boss: true, build(b) {
    b.ground(12, 2).row(2, 2, 5).cage(9, 2, 'kus');
    b.gap(3);
    b.ground(10, 2).arc(-3.2, 2, 5).cage(7, 2, 'tilki').cp(2).heart(5);
    b.ground(28, 2).boss(2, 26).cage(25, 2, 'maymun').row(5, 2, 4).row(17, 2, 4).star(14, 2);
    b.ground(16, 2).end(9);
  } },
];
export const ANIMALS = A;
