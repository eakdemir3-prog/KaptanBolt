// Yeşil Vadi 1-1 (deneme bölümü). Izgara: 1 birim = 1 kare, y=0 en alt sıra.
// Çıktı: { w, h, solid:Set("x,y"), cols:[yükseklik], plats:[{x,y,w}], coins, enemies, cages, springs, checkpoints, start, end }

export function buildLevel() {
  const L = { w: 142, h: 16, ground: [], plats: [], coins: [], enemies: [], cages: [], springs: [], checkpoints: [], start: { x: 2, y: 2 }, end: { x: 134 } };
  const cols = new Array(L.w).fill(0);
  const ground = (x0, x1, h) => { for (let x = x0; x <= x1; x++) cols[x] = h; };
  const plat = (x, y, w) => L.plats.push({ x, y, w });
  const coin = (x, y) => L.coins.push({ x: x + 0.5, y: y + 0.75 }); // y = durulan yüzey: yürürken alınır
  const row = (x, y, n) => { for (let i = 0; i < n; i++) coin(x + i, y); };
  const arc = (x, y, n, hgt) => { for (let i = 0; i < n; i++) { const t = i / (n - 1); coin(x + i, y + Math.round(Math.sin(t * Math.PI) * hgt)); } };
  // Zıplama yayı: oyuncunun gerçek zıplama eğrisi üzerinde para dizisi (tam koşu hızıyla, tuş basılı)
  const RUN = 8.4, G_UP = 50, G_DOWN = 82, V0 = Math.sqrt(2 * 50 * 3.75);
  const jumpArc = (x0, y0, n, step = 0.95) => {
    for (let i = 1; i <= n; i++) {
      const t = (i * step) / RUN, tUp = V0 / G_UP;
      const y = t <= tUp ? V0 * t - 0.5 * G_UP * t * t : 3.75 - 0.5 * G_DOWN * (t - tUp) ** 2;
      L.coins.push({ x: x0 + i * step, y: y0 + y + 0.65 });
    }
  };
  const column = (x, y0, n) => { for (let i = 0; i < n; i++) L.coins.push({ x: x + 0.5, y: y0 + i * 1.0 }); };
  const enemy = (type, x) => L.enemies.push({ type, x: x + 0.5 });

  // 1) Başlangıç: düz çimen, para sırası
  ground(0, 18, 2); row(6, 2, 5);
  // 2) İlk boşluk + böcek
  ground(22, 34, 2); jumpArc(17.6, 2, 5); enemy('bocek', 28); row(29, 2, 3);
  // 3) Basamaklar ve yüzen kayalar
  ground(35, 40, 3); ground(41, 46, 4); row(42, 4, 4);
  plat(49, 6, 3); plat(54, 7, 3); row(49, 7, 3); row(54, 8, 3); jumpArc(51.6, 7, 3);
  // 4) Kirpi ve böcek; üstteki kayada 1. kafes (kuş)
  ground(59, 80, 2); enemy('kirpi', 66); enemy('bocek', 75);
  plat(62, 3, 2); plat(66, 5, 2); plat(69, 6, 5); L.cages.push({ x: 71.5, y: 7, animal: 'kus' }); row(70, 7, 1); row(73, 7, 1);
  row(60, 2, 4);
  // 5) Kontrol noktası, zıplatan mantar, yüksek kayada 2. kafes (tilki)
  ground(81, 95, 2); L.checkpoints.push({ x: 83 }); L.springs.push({ x: 86.5, y: 2 }); column(86, 4.2, 5);
  plat(90, 9, 5); L.cages.push({ x: 92.5, y: 10, animal: 'tilki' }); row(90, 10, 1); row(94, 10, 1);
  // 6) Son bölüm: boşluk, iki böcek, duvar, kirpi, 3. kafes (maymun)
  ground(100, 125, 2); ground(108, 109, 3);
  jumpArc(94.2, 2, 6);
  enemy('bocek', 104); enemy('bocek', 113); enemy('kirpi', 118);
  jumpArc(101.2, 2, 5);
  L.cages.push({ x: 123.5, y: 2, animal: 'maymun' });
  // 7) Bitiş
  ground(126, 141, 2); row(128, 2, 3); L.end = { x: 134.5 };

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
