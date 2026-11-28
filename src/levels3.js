// Güneş Kanyonu — 41–60. bölümler. Yeni: çöken kum platformları, bataklık kumu (yavaşlatır, zıplamayı kısaltır),
// kum fırtınası (rüzgâr sola iter). Düşmanlar: akrep (böcek kuralı: üstüne bas), yılan (kirpi kuralı: kumdan çıkar, önce şimşek).
// Hayvan ve düşman adları Yeşil Vadi'deki gibi yazılır; tema onları Güneş Kanyonu modellerine çevirir.

export const LEVELS3 = [
  // ---------------- 41–45: yeni mekanikler ----------------
  { name: 'Kanyon Kapısı', build(b) {
    b.ground(16, 2).sign(3, 'crumble').row(5, 2, 3).cage(10, 2, 'kus');
    b.gap(6).crumble(2, 2, 2).row(2, 2, 2);
    b.ground(14, 2).e('bocek', 7, null, [4, 11]).row(11, 2, 2);
    b.ground(10, 2).cp(2).crumble(5, 5, 3).row(5, 5, 3);
    b.ground(6, 3).star(3, 3).row(0, 3, 2);
    b.gap(7).crumble(2, 3, 3).row(2, 3, 3);
    b.ground(14, 2).cage(5, 2, 'tilki').e('bocek', 10, null, [8, 13]);
    b.ground(12, 2).cage(4, 2, 'maymun').row(7, 2, 3);
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Bataklık Kumu', build(b) {
    b.ground(18, 2).sign(3, 'sand').sand(6, 6).row(6, 2, 6).cage(15, 2, 'kus');
    b.gap(2);
    b.ground(14, 2).arc(-2.9, 2, 5).e('bocek', 7, null, [4, 11]).cp(12);
    b.ground(16, 2).sand(3, 7).row(3, 2, 7).spring(13, 2).plat(14, 7, 3).star(15, 7);
    b.ground(10, 2).cage(4, 2, 'tilki');
    b.gap(6).crumble(2, 2, 2).row(2, 2, 2);
    b.ground(14, 2).e('kirpi', 7, null, [4, 11]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Kum Fırtınası', build(b) {
    b.ground(18, 2).sign(2, 'storm').storm(5, 10).row(5, 2, 8).cage(16, 2, 'kus');
    b.ground(12, 2).e('bocek', 6, null, [3, 9]).cp(10);
    b.ground(16, 2).storm(2, 12).crate(6, 3).row(3, 2, 3).row(9, 2, 3);
    b.gap(2);
    b.ground(12, 2).arc(-2.9, 2, 5).crumble(5, 5, 3).star(6, 5).cage(10, 2, 'tilki');
    b.ground(14, 2).e('kirpi', 7, null, [4, 10]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Yılan Vadisi', build(b) {
    b.ground(16, 2).sign(3, 'snake').row(1, 2, 2).e('kirpi', 10, null, [7, 14]);
    b.ground(10, 2).cage(4, 2, 'kus').row(6, 2, 3);
    b.gap(6).crumble(2, 2, 2).row(2, 2, 2);
    b.ground(14, 2).sand(2, 5).row(2, 2, 5).e('bocek', 10, null, [9, 13]).cp(13);
    b.ground(6, 3).crate(2, 3).row(1, 5, 3);
    b.ground(14, 2).e('kirpi', 6, null, [3, 9]).crumble(10, 6, 3).star(11, 6);
    b.ground(10, 2).cage(5, 2, 'tilki');
    b.gap(2);
    b.ground(14, 2).arc(-2.9, 2, 5).cage(10, 2, 'maymun').e('bocek', 5, null, [3, 7]);
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Çöken Köprüler', build(b) {
    b.ground(12, 2).row(2, 2, 4).cage(9, 2, 'kus');
    b.gap(9).crumble(2, 2, 2).crumble(5, 2, 2).row(2, 2, 2).row(5, 2, 2);
    b.ground(12, 2).cp(2).e('bocek', 7, null, [5, 10]);
    b.ground(6, 3).ground(6, 4).row(1, 4, 4);
    b.gap(9).crumble(2, 4, 2).crumble(5, 3, 2).row(2, 4, 2).row(5, 3, 2);
    b.ground(14, 2).cage(4, 2, 'tilki').crumble(8, 5, 3).star(9, 5).heart(12);
    b.ground(14, 2).e('kirpi', 6, null, [3, 9]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  // ---------------- 46–50 ----------------
  { name: 'Kızıl Kayalar', build(b) {
    b.ground(14, 2).row(1, 2, 3).e('bocek', 8, null, [5, 11]);
    b.ground(8, 4).cage(3, 4, 'kus').row(5, 4, 2);
    b.gap(2);
    b.ground(14, 2).arc(-2.9, 2, 5).storm(4, 8).row(5, 2, 4).cp(12);
    b.ground(16, 2).sand(2, 6).row(2, 2, 6).e('kirpi', 12, null, [10, 14]);
    b.gap(6).crumble(2, 2, 2).row(2, 2, 2);
    b.ground(12, 2).spring(3, 2).plat(5, 8, 3).star(6, 8).cage(9, 2, 'tilki');
    b.ground(14, 2).e('bocek', 6, null, [3, 9]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Rüzgâr Geçidi', build(b) {
    b.ground(12, 2).row(2, 2, 4).cage(9, 2, 'kus');
    b.ground(18, 2).storm(1, 16).crate(5, 3).e('bocek', 12, null, [10, 15]).row(2, 2, 2);
    b.ground(10, 2).cp(2).heart(6);
    b.gap(6).crumble(2, 2, 2).row(2, 2, 2);
    b.ground(16, 2).storm(2, 10).row(3, 2, 6).cage(14, 2, 'tilki');
    b.ground(10, 2).crumble(4, 5, 3).star(5, 5);
    b.ground(14, 2).e('kirpi', 6, null, [3, 9]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Kum Tepeleri', build(b) {
    b.ground(10, 2).row(2, 2, 3);
    b.ground(6, 3).ground(6, 4).cage(3, 4, 'kus').row(1, 4, 2);
    b.ground(8, 5).row(1, 5, 4).star(6, 5);
    b.ground(6, 3).ground(10, 2).cp(2).sand(4, 5).row(4, 2, 5);
    b.gap(2);
    b.ground(14, 2).arc(-2.9, 2, 5).e('bocek', 7, null, [4, 11]).cage(12, 2, 'tilki');
    b.gap(6).crumble(2, 2, 2).row(2, 2, 2);
    b.ground(14, 2).e('kirpi', 6, null, [3, 9]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Akrep Yuvası', build(b) {
    b.ground(16, 2).row(1, 2, 2).e('bocek', 6, null, [4, 8]).e('bocek', 12, null, [10, 15]);
    b.ground(10, 2).cage(3, 2, 'kus').crumble(6, 5, 3).row(6, 5, 3);
    b.gap(2);
    b.ground(16, 2).arc(-2.9, 2, 5).e('bocek', 5, null, [3, 7]).e('kirpi', 11, null, [9, 14]).cp(14);
    b.gap(6).crumble(2, 2, 2).row(2, 2, 2);
    b.ground(14, 2).e('bocek', 6, null, [4, 9]).cage(11, 2, 'tilki').heart(2);
    b.ground(12, 2).spring(3, 2).plat(5, 8, 3).star(6, 8).e('bocek', 9, null, [8, 11]);
    b.ground(14, 2).e('kirpi', 5, null, [2, 8]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Serap', build(b) {
    b.ground(14, 2).row(1, 2, 3).sand(5, 6).cage(12, 2, 'kus');
    b.gap(9).crumble(2, 2, 2).crumble(5, 3, 2).row(2, 2, 2).row(5, 3, 2);
    b.ground(14, 2).storm(2, 9).row(3, 2, 6).e('bocek', 12, null, [11, 13]).cp(1);
    b.ground(8, 3).crumble(2, 6, 3).star(3, 6).row(1, 3, 2);
    b.ground(14, 2).cage(4, 2, 'tilki').e('kirpi', 9, null, [7, 12]);
    b.gap(2);
    b.ground(14, 2).arc(-2.9, 2, 5).cage(10, 2, 'maymun').e('bocek', 5, null, [3, 7]);
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  // ---------------- 51–55 ----------------
  { name: 'Kemer Kaya', build(b) {
    b.ground(14, 2).row(1, 2, 3).spring(7, 2).plat(9, 7, 4).row(9, 7, 4).cage(10, 7, 'kus');
    b.ground(10, 2).e('bocek', 5, null, [3, 8]);
    b.gap(6).crumble(2, 2, 2).row(2, 2, 2);
    b.ground(12, 2).cp(2).sand(5, 5).row(5, 2, 5);
    b.ground(6, 4).ground(6, 6).row(1, 6, 4).crumble(7, 9, 3).star(8, 9);
    b.ground(14, 6).cage(5, 6, 'tilki').e('bocek', 10, 6, [8, 12]);
    b.ground(6, 2).heart(3);
    b.ground(14, 2).e('kirpi', 6, null, [4, 9]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Fırtına Tepesi', build(b) {
    b.ground(12, 2).row(2, 2, 4).cage(9, 2, 'kus');
    b.ground(6, 3).ground(6, 4).storm(0, 12).row(1, 4, 4);
    b.ground(8, 5).storm(0, 8).row(1, 5, 4).star(6, 5);
    b.ground(10, 2).cp(2).e('bocek', 6, null, [4, 9]);
    b.gap(6).crumble(2, 2, 2).row(2, 2, 2);
    b.ground(14, 2).sand(2, 6).row(2, 2, 6).cage(12, 2, 'tilki');
    b.ground(14, 2).e('kirpi', 6, null, [3, 9]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Yılan Çukuru', build(b) {
    b.ground(16, 2).row(1, 2, 3).e('kirpi', 7, null, [4, 10]).e('kirpi', 13, null, [11, 15]);
    b.ground(8, 3).crate(3, 3).row(1, 5, 2).cage(6, 3, 'kus');
    b.gap(2);
    b.ground(14, 2).arc(-2.9, 2, 5).crumble(4, 5, 3).row(4, 5, 3).e('kirpi', 10, null, [8, 13]);
    b.ground(10, 2).cp(2).heart(6);
    b.gap(6).crumble(2, 2, 2).row(2, 2, 2);
    b.ground(16, 2).e('kirpi', 5, null, [2, 8]).cage(10, 2, 'tilki').e('bocek', 14, null, [12, 15]);
    b.ground(10, 2).spring(3, 2).plat(5, 8, 3).star(6, 8).row(5, 8, 1);
    b.ground(14, 2).e('kirpi', 5, null, [2, 8]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Kuru Nehir', build(b) {
    b.ground(14, 2).row(1, 2, 3).cage(8, 2, 'kus');
    b.gap(10).raft(0.5, 2, 2.4, 'x', 5.6, 1.8).thorns(0, 10, -3).row(2, 4, 3);
    b.ground(12, 2).cp(2).sand(4, 6).row(4, 2, 6);
    b.gap(6).crumble(2, 2, 2).row(2, 2, 2);
    b.ground(14, 2).e('bocek', 6, null, [3, 9]).crumble(10, 5, 3).star(11, 5);
    b.ground(10, 2).cage(4, 2, 'tilki');
    b.ground(14, 2).storm(2, 8).row(3, 2, 4).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Dikenli Kanyon', build(b) {
    b.ground(16, 2).row(1, 2, 3).thorns(6, 2).spring(10, 2).plat(12, 6, 3).row(12, 6, 3);
    b.ground(10, 2).cage(3, 2, 'kus').e('bocek', 7, null, [6, 9]);
    b.gap(9).crumble(2, 2, 2).crumble(5, 2, 2).thorns(0, 9, -3).row(2, 2, 2).row(5, 2, 2);
    b.ground(10, 2).cp(2).row(5, 2, 3);
    b.ground(16, 2).e('kirpi', 5, null, [2, 8]).thorns(10, 2).cage(14, 2, 'tilki');
    b.ground(12, 2).crumble(4, 5, 3).star(5, 5).cage(9, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  // ---------------- 56–59 ----------------
  { name: 'Kum Saati', build(b) {
    b.ground(18, 2).sand(3, 12).row(3, 2, 6).cage(16, 2, 'kus');
    b.gap(6).crumble(2, 2, 2).row(2, 2, 2);
    b.ground(14, 2).cp(2).e('bocek', 8, null, [6, 11]);
    b.ground(6, 3).ground(6, 4).row(1, 4, 4);
    b.gap(9).crumble(2, 4, 2).crumble(5, 4, 2).row(2, 4, 2).row(5, 4, 2);
    b.ground(14, 4).cage(5, 4, 'tilki').crumble(9, 7, 3).star(10, 7);
    b.ground(6, 2).heart(3);
    b.ground(14, 2).e('kirpi', 6, null, [3, 9]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Ters Rüzgâr', build(b) {
    b.ground(12, 2).row(2, 2, 4).cage(9, 2, 'kus');
    b.ground(20, 2).storm(0, 20).e('bocek', 8, null, [5, 11]).e('kirpi', 15, null, [13, 18]).row(2, 2, 2);
    b.ground(10, 2).cp(2).heart(6);
    b.gap(6).crumble(2, 2, 2).row(2, 2, 2);
    b.ground(14, 2).storm(1, 10).crumble(5, 5, 3).star(6, 5).cage(12, 2, 'tilki');
    b.ground(14, 2).e('bocek', 6, null, [3, 9]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Güneş Tapınağı', build(b) {
    b.ground(10, 2).row(2, 2, 3).spring(7, 2);
    b.ground(6, 5).cage(2, 5, 'kus').row(4, 5, 2);
    b.gap(6).crumble(2, 5, 2).row(2, 5, 2);
    b.ground(8, 5).row(1, 5, 4).star(6, 5);
    b.ground(6, 3).ground(10, 2).cp(2).e('bocek', 6, null, [4, 9]);
    b.gap(2);
    b.ground(14, 2).arc(-2.9, 2, 5).sand(4, 6).row(4, 2, 6).cage(12, 2, 'tilki');
    b.gap(6).crumble(2, 2, 2).row(2, 2, 2);
    b.ground(14, 2).e('kirpi', 6, null, [3, 9]).cage(12, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  { name: 'Akrep Kapısı', build(b) {
    b.ground(14, 2).row(1, 2, 3).e('kirpi', 7, null, [4, 10]).cage(12, 2, 'kus');
    b.gap(9).crumble(2, 2, 2).crumble(5, 2, 2).thorns(0, 9, -3).row(2, 2, 2).row(5, 2, 2);
    b.ground(14, 2).storm(2, 8).row(3, 2, 4).e('bocek', 11, null, [10, 13]);
    b.ground(10, 2).cp(2).heart(5);
    b.gap(10).raft(0.5, 2, 2.4, 'x', 5.6, 2.0).thorns(0, 10, -3).row(2, 4, 3);
    b.ground(14, 2).e('bocek', 5, null, [3, 7]).e('kirpi', 10, null, [9, 13]).cage(13, 2, 'tilki');
    b.ground(10, 2).crumble(4, 5, 3).star(5, 5);
    b.gap(2);
    b.ground(14, 2).arc(-2.9, 2, 5).sand(3, 5).cage(11, 2, 'maymun');
    b.ground(12, 2).row(1, 2, 4).end(7);
  } },
  // ---------------- 60: boss ----------------
  { name: 'Dev Akrep', boss: true, bossKind: 'akrep', build(b) {
    b.ground(12, 2).row(2, 2, 5).cage(9, 2, 'kus');
    b.gap(3);
    b.ground(10, 2).arc(-3.2, 2, 5).cage(7, 2, 'tilki').cp(2).heart(5);
    b.ground(28, 2).boss(2, 26).cage(25, 2, 'maymun').row(5, 2, 4).row(17, 2, 4).star(14, 2);
    b.ground(16, 2).end(9);
  } },
];
