// Yeşil Vadi 1-1 (deneme bölümü). Izgara: 1 birim = 1 kare, y=0 en alt sıra.
// Çıktı: { w, h, solid:Set("x,y"), cols:[yükseklik], plats:[{x,y,w}], coins, enemies, cages, springs, checkpoints, start, end }

export function buildLevel() {
  const L = { w: 142, h: 16, ground: [], plats: [], coins: [], enemies: [], cages: [], springs: [], checkpoints: [], start: { x: 2, y: 2 }, end: { x: 134 } };
  const cols = new Array(L.w).fill(0);
  const ground = (x0, x1, h) => { for (let x = x0; x <= x1; x++) cols[x] = h; };
  const plat = (x, y, w) => L.plats.push({ x, y, w });
  const coin = (x, y) => L.coins.push({ x: x + 0.5, y: y + 0.5 });
  const row = (x, y, n) => { for (let i = 0; i < n; i++) coin(x + i, y); };
  const arc = (x, y, n, hgt) => { for (let i = 0; i < n; i++) { const t = i / (n - 1); coin(x + i, y + Math.round(Math.sin(t * Math.PI) * hgt)); } };
  const enemy = (type, x) => L.enemies.push({ type, x: x + 0.5 });

  // 1) Başlangıç: düz çimen, para sırası
  ground(0, 18, 2); row(6, 3, 5);
  // 2) İlk boşluk + böcek
  ground(22, 34, 2); arc(18, 3, 5, 2); enemy('bocek', 28); row(29, 3, 3);
  // 3) Basamaklar ve yüzen kayalar
  ground(35, 40, 3); ground(41, 46, 4); row(42, 5, 4);
  plat(49, 6, 3); plat(54, 7, 3); arc(48, 7, 9, 2);
  // 4) Kirpi ve böcek; üstteki kayada 1. kafes (kuş)
  ground(59, 80, 2); enemy('kirpi', 66); enemy('bocek', 75);
  plat(62, 3, 2); plat(66, 5, 2); plat(69, 6, 5); L.cages.push({ x: 71.5, y: 7, animal: 'kus' }); row(70, 7, 1); row(73, 7, 1);
  row(60, 3, 4);
  // 5) Kontrol noktası, zıplatan mantar, yüksek kayada 2. kafes (tilki)
  ground(81, 95, 2); L.checkpoints.push({ x: 83 }); L.springs.push({ x: 86.5, y: 2 });
  plat(90, 9, 5); L.cages.push({ x: 92.5, y: 10, animal: 'tilki' }); arc(89, 11, 5, 1);
  // 6) Son bölüm: boşluk, iki böcek, duvar, kirpi, 3. kafes (maymun)
  ground(100, 125, 2); ground(108, 109, 3);
  arc(95, 4, 6, 2);
  enemy('bocek', 104); enemy('bocek', 113); enemy('kirpi', 118);
  arc(102, 3, 4, 2);
  L.cages.push({ x: 123.5, y: 2, animal: 'maymun' });
  // 7) Bitiş
  ground(126, 141, 2); row(128, 3, 3); L.end = { x: 134.5 };

  L.cols = cols;
  L.solid = (x, y) => {
    if (x < 0 || x >= L.w) return y < 20; // kenar duvarları
    if (y < 0) return false;
    if (y < cols[x]) return true;
    for (const p of L.plats) if (y === p.y && x >= p.x && x < p.x + p.w) return true;
    return false;
  };
  return L;
}
