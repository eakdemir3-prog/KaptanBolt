// Bölüm kurucu: levels.js'deki tarifleri oyunun kullandığı ızgaraya çevirir.
// Koordinatlar: 1 birim = 1 kare, y=0 en alt. "t" = üstünde durulan yüzeyin yüksekliği.
import { LEVELS } from './levels.js';
import { P, stepPlayer, newPlayer, coinHit } from './physics.js';

// Bölüm tarifleri eski (3,3 kare) zıplamaya göre yazıldı: yükseklikler 2,5 kareye göre sıkıştırılır
const V = (t) => 2 + Math.round((t - 2) * 0.75);
const VF = (t) => 2 + (t - 2) * 0.75;

export function buildLevel(n) {
  const def = LEVELS[n - 1];
  const L = {
    n, name: def.name, world: Math.ceil(n / 20), w: 0, cols: [], plats: [], crates: new Map(), bridges: [], rafts: [], coins: [], enemies: [], cages: [],
    springs: [], spores: [], crumbles: [], sands: [], storms: [], ices: [], icicles: [], iceb: new Map(), thorns: [], hearts: [], star: null, signs: [], decos: [], vines: [], checkpoints: [], end: null, boss: null, start: { x: 2.5, y: 2 }, ship: false,
  };
  const b = {
    x: 0, at: 0, h: 2,
    ground(n, h = null) { b.at = b.x; b.h = h == null ? b.h : V(h); const hh = b.h; for (let i = 0; i < n; i++) L.cols[b.x++] = hh; return b; },
    gap(n) { if (n === 4) n = 3; b.at = b.x; for (let i = 0; i < n; i++) L.cols[b.x++] = 0; return b; },
    /** boşluk + üstünde ip köprü (yalnızca yukarıdan basılır) */
    bridge(n) { b.at = b.x; L.bridges.push({ x0: b.x - 0.2, x1: b.x + n + 0.2, y: b.h }); for (let i = 0; i < n; i++) L.cols[b.x++] = 0; return b; },
    /** yüzen kaya: üst yüzeyi t */
    plat(dx, t, w) { L.plats.push({ x: b.at + dx, y: V(t) - 1, w }); return b; },
    /** hareketli sal: axis 'x' ya da 'y', range kare, hız kare/sn */
    raft(dx, t, w, axis = 'x', range = 3, speed = 1.6) { L.rafts.push({ x: b.at + dx, t: V(t), w, axis, range: axis === 'y' ? Math.max(2, Math.round(range * 0.75)) : range, speed: speed * 0.8 }); return b; },
    row(dx, t, n, step = 1) { const y = Number.isInteger(t) ? V(t) : VF(t); for (let i = 0; i < n; i++) L.coins.push({ x: b.at + dx + i * step + 0.5, y: y + 0.75 }); return b; },
    /** gerçek zıplama eğrisi üzerinde para (koşarak, tuş basılı) */
    arc(dx, t, n, step = 0.9) {
      t = V(t); const RUN = P.RUN, GU = P.G_UP, GD = P.G_DOWN, H = P.JUMP_H, V0 = Math.sqrt(2 * GU * H), tu = V0 / GU; step *= RUN / 6.8;
      for (let i = 1; i <= n; i++) { const tt = (i * step) / RUN; const y = tt <= tu ? V0 * tt - 0.5 * GU * tt * tt : H - 0.5 * GD * (tt - tu) ** 2; L.coins.push({ x: b.at + dx + i * step, y: t + y + 0.6, arc: true }); }
      return b;
    },
    col(dx, t0, n) { const y0 = VF(t0); for (let i = 0; i < n; i++) L.coins.push({ x: b.at + dx + 0.5, y: y0 + 0.75 + i * 0.85 }); return b; },
    e(type, dx, t = null, range = null) { L.enemies.push({ type, x: b.at + dx + 0.5, t: t == null ? b.h : V(t), range: range && [b.at + range[0], b.at + range[1]] }); return b; },
    cage(dx, t = null, animal = null) { L.cages.push({ x: b.at + dx + 0.5, y: t == null ? b.h : V(t), animal }); return b; },
    spring(dx, t = null, kind = null) { L.springs.push({ x: b.at + dx + 0.5, y: t == null ? b.h : V(t), kind }); return b; },
    /** çöken kum platformu: üst yüzey t, w kare (basınca 0,6 sn sonra çatlar, 1 sn'de düşer, 3,5 sn sonra geri gelir) */
    crumble(dx, t, w) { L.crumbles.push({ x: b.at + dx, y: V(t), w }); return b; },
    /** bataklık kumu: zeminde dx'ten w kare (yavaşlatır, zıplamayı kısaltır) */
    sand(dx, w) { L.sands.push({ x0: b.at + dx, x1: b.at + dx + w, y: b.h }); return b; },
    /** kum fırtınası: dx'ten w kare boyunca rüzgâr sola iter */
    storm(dx, w) { L.storms.push({ x0: b.at + dx, x1: b.at + dx + w }); return b; },
    /** kaygan buz: zeminde dx'ten w kare */
    ice(dx, w) { L.ices.push({ x0: b.at + dx, x1: b.at + dx + w, y: b.h }); return b; },
    /** buz sarkıtı: zeminin h kare yukarısında asılı; Bolt yaklaşınca titreyip düşer */
    icicle(dx, h = 3.7) { L.icicles.push({ x: b.at + dx + 0.5, y: b.h, top: b.h + h }); return b; },
    /** buz bloğu (yolu kapatır, şimşekle erir): dx, zeminden n blok yüksek duvar */
    iceWall(dx, n = 2, t = null) { const y0 = t == null ? b.h : V(t); for (let i = 0; i < n; i++) L.iceb.set(`${b.at + dx},${y0 + i}`, { x: b.at + dx, y: y0 + i }); return b; },
    /** spor bulutu: dx'ten w kare genişlik, t yüzeyinden h kare yukarı (içinde süzülürsün) */
    spore(dx, t, w, h) { const y0 = V(t); L.spores.push({ x0: b.at + dx, x1: b.at + dx + w, y0, y1: y0 + h }); return b; },
    crate(dx, t = null) { const y = t == null ? b.h : V(t); L.crates.set(`${b.at + dx},${y}`, { x: b.at + dx, y }); return b; },
    thorns(dx, w, t = null) { if (t == null || t >= 0) w = Math.min(w, 2); L.thorns.push({ x0: b.at + dx, x1: b.at + dx + w, y: t == null ? b.h : t < 0 ? t : V(t) }); return b; },
    heart(dx, t = null) { L.hearts.push({ x: b.at + dx + 0.5, y: (t == null ? b.h : V(t)) + 0.8 }); return b; },
    star(dx, t = null) { L.star = { x: b.at + dx + 0.5, y: (t == null ? b.h : V(t)) + 0.9 }; return b; },
    sign(dx, text = '') { L.signs.push({ x: b.at + dx + 0.5, y: b.h, text }); return b; },
    deco(kind, dx, t = null, z = -0.85, s = 1) { L.decos.push({ kind, x: b.at + dx + 0.5, y: t ?? b.h, z, s }); return b; },
    cp(dx = 1) { L.checkpoints.push({ x: b.at + dx + 0.5, y: b.h }); return b; },
    end(dx = 4) { L.end = { x: b.at + dx + 0.5, y: b.h }; return b; },
    boss(x0, x1) { L.boss = { x0: b.at + x0, x1: b.at + x1, y: b.h }; return b; },
  };
  def.build(b);
  L.w = b.x;

  const cols = L.cols;
  L.solid = (x, y) => {
    if (x < 0 || x >= L.w) return y < 40; // kenar duvarları
    if (y < 0) return false;
    if (y < cols[x]) return true;
    if (L.crates.has(`${x},${y}`)) return true;
    if (L.iceb.has(`${x},${y}`)) return true;
    return false;
  };
  // tek yönlü yüzeyler: köprüler sabit, sallar her karede güncellenir
  // yüzen kayalar tek yönlü: alttan geçilir, üstüne basılır
  L.oneway = [...L.bridges.map((s) => ({ ...s })), ...L.plats.map((p) => ({ x0: p.x - 0.05, x1: p.x + p.w + 0.05, y: p.y + 1, plat: true }))];
  for (const r of L.rafts) { r.s = { x0: r.x, x1: r.x + r.w, y: r.t, dx: 0 }; r.ph = 0; L.oneway.push(r.s); }
  for (const c of L.crumbles) { c.s = { x0: c.x - 0.05, x1: c.x + c.w + 0.05, y: c.y, crumble: true }; L.oneway.push(c.s); }
  L.groundAt = (x) => cols[Math.floor(x)] || 0;
  L.gaps = []; for (let x = 1; x < L.w; x++) if (!cols[x] && cols[x - 1]) { let e = x; while (e + 1 < L.w && !cols[e + 1]) e++; L.gaps.push({ s: x, e }); x = e; }
  // altın blok içinde ya da diken üstünde kalmasın
  const badCoin = (c) => L.solid(Math.floor(c.x), Math.floor(c.y)) || L.thorns.some((t) => c.x > t.x0 && c.x < t.x1 && c.y < t.y + 1.2);
  L.coins = L.coins.filter((c) => !badCoin(c));
  patrols(L);
  groundGapCoins(L);
  fillCoins(L, def.coins || 50);
  separateRewards(L);
  return L;
}

/** Salları t anına göre konumlandır (oyun ve test ortak) */
export function updateRafts(L, time, dt) {
  for (const r of L.rafts) {
    const k = Math.sin(time * r.speed / Math.max(1, r.range) * 2) * 0.5 + 0.5; // 0..1 arası gidip gelir
    const off = k * r.range;
    const x0 = r.axis === 'x' ? r.x + off : r.x, y = r.axis === 'y' ? r.t + off : r.t;
    r.s.dx = x0 - r.s.x0; r.s.dy = y - r.s.y;
    r.s.x0 = x0; r.s.x1 = x0 + r.w; r.s.y = y;
  }
}

/** Altın sayısı hedefin altındaysa: önce boş kaya platformlarının üstüne, sonra boş düz zemine 3'lü sıralar ekler */
function fillCoins(L, target) {
  const near = (x, y, r = 1.6) => L.coins.some((c) => Math.abs(c.x - x) < r && Math.abs(c.y - y) < 2) || L.cages.some((c) => Math.abs(c.x - x) < 1.6 && Math.abs(c.y - y) < 2) || (L.star && Math.abs(L.star.x - x) < 1.2 && Math.abs(L.star.y - y) < 2);
  for (const p of L.plats) {
    if (L.coins.length >= target) return;
    const t = p.y + 1, cx = p.x + p.w / 2;
    if (near(cx, t + 0.75, p.w / 2 + 0.6)) continue;
    for (let i = 0; i < p.w; i++) L.coins.push({ x: p.x + i + 0.5, y: t + 0.75 });
  }
  const busy = (x, h) => near(x, h + 0.75, 3) || L.enemies.some((e) => x + 1.5 > e.x0 - 1.2 && x - 1.5 < e.x1 + 1.2 && Math.abs(e.t - h) < 0.5) || L.springs.some((s) => Math.abs(s.x - x) < 2.5) || L.thorns.some((t) => x > t.x0 - 2 && x < t.x1 + 2) || L.checkpoints.some((c) => Math.abs(c.x - x) < 2) || (L.end && x > L.end.x - 4) || [...L.crates.values()].some((c) => Math.abs(c.x - x) < 2) || L.plats.some((p) => x > p.x - 1 && x < p.x + p.w + 1 && p.y - L.cols[Math.floor(x)] < 3);
  for (let x = 6; x < L.w - 4 && L.coins.length < target; x++) {
    const h = L.cols[x]; if (!h || L.cols[x + 1] !== h || L.cols[x + 2] !== h || L.cols[x - 1] !== h) continue;
    if (busy(x + 1.5, h)) continue;
    for (let i = 0; i < 3; i++) L.coins.push({ x: x + i + 0.5, y: h + 0.75 });
    x += 5;
  }
}

/** Her düşmana devriye aralığı: bastığı yüzeyde, başlangıcın ±3 karesi; kafes, kayıt noktası, mantar ve
 *  bitişe 1,6 kareden fazla yaklaşmaz; aynı yüzeydeki düşmanların aralıkları çakışmaz (arada ≥1,5 kare boşluk). */
/** Kalp ve kristal sabit kalır; üstüne binen sıradan altın aynı yükseklikte boş bir yere kaydırılır (yoksa kaldırılır). */
function separateRewards(L) {
  const fixed = [...L.hearts.map((h) => ({ x: h.x, y: h.y, r: 0.36 })), ...(L.star ? [{ x: L.star.x, y: L.star.y, r: 0.42 }] : [])];
  // kalp ile kristal çakışırsa kalbi yana al
  if (L.star) for (const h of L.hearts) if (Math.abs(h.x - L.star.x) < 0.95 && Math.abs(h.y - L.star.y) < 0.95) h.x += h.x >= L.star.x ? 1 : -1;
  const hits = (x, y, self) => fixed.some((f) => Math.abs(f.x - x) < f.r + 0.45 && Math.abs(f.y - y) < f.r + 0.45) || L.coins.some((c) => c !== self && Math.abs(c.x - x) < 0.6 && Math.abs(c.y - y) < 0.5);
  const okAt = (c, x) => { const ix = Math.floor(x); if (L.solid(ix, Math.floor(c.y)) || L.thorns.some((t) => x > t.x0 - 0.3 && x < t.x1 + 0.3 && c.y < t.y + 1.3)) return false;
    const g = L.cols[Math.floor(c.x)], onGround = g && Math.abs(c.y - (g + 0.75)) < 0.05; return !onGround || L.cols[ix] === g; };
  const drop = [];
  for (const c of L.coins) {
    const buried = L.solid(Math.floor(c.x), Math.floor(c.y)) || L.solid(Math.floor(c.x), Math.floor(c.y - 0.25));
    if (!buried && !hits(c.x, c.y, c)) continue;
    let moved = false;
    for (const d of [0.9, -0.9, 1.8, -1.8, 2.7, -2.7]) if (okAt(c, c.x + d) && !L.solid(Math.floor(c.x + d), Math.floor(c.y - 0.25)) && !hits(c.x + d, c.y, c)) { c.x += d; moved = true; break; }
    if (!moved) drop.push(c);
  }
  L.coins = L.coins.filter((c) => !drop.includes(c));
}
function patrols(L) {
  const HW = { bocek: 0.53, kirpi: 0.55 };
  for (const e of L.enemies) {
    const hw = HW[e.type] || 0.55, y = e.t, fx = Math.floor(e.x);
    let a, b;
    const plat = L.oneway.find((s) => e.x >= s.x0 && e.x <= s.x1 && Math.abs(s.y - y) < 0.05);
    if (plat) { a = plat.x0; b = plat.x1; }
    else { a = fx; while (a - 1 >= 0 && L.cols[a - 1] === y && !L.solid(a - 1, y)) a--; b = fx + 1; while (b < L.w && L.cols[b] === y && !L.solid(b, y)) b++; }
    // geniş zeminde uzun devriye: başlangıç etrafında en fazla 8 blok (tek yönde 6–8 blok yürür)
    a = Math.max(a, e.x - 4); b = Math.min(b, e.x + 4);
    const avoid = [...L.cages.map((c) => c.x), ...L.checkpoints.map((c) => c.x), ...L.springs.map((c) => c.x), ...(L.end ? [L.end.x] : [])];
    for (const ox of avoid) { if (ox > e.x && ox - 1.6 < b) b = ox - 1.6; if (ox < e.x && ox + 1.6 > a) a = ox + 1.6; }
    // boşluk sonrası güvenli iniş alanı (karşı kıyının ilk 2,5 bloğu) ve boşluk öncesi kalkış alanı (son 1,5 blok) boş kalsın
    for (const LZ of [2.5, 1.6]) { // önce 2,5 blok güvenli iniş; dar zeminde 1,6'ya iner
      let a2 = a, b2 = b;
      for (const g of L.gaps) {
        if (Math.abs(L.cols[g.e + 1] - y) < 0.05 && g.e + 1 <= e.x + 1 && g.e + 1 + LZ > a2) a2 = g.e + 1 + LZ;
        if (Math.abs(L.cols[g.s - 1] - y) < 0.05 && g.s >= e.x - 1 && g.s - LZ * 0.6 < b2) b2 = g.s - LZ * 0.6;
      }
      if (b2 - a2 >= 2 * hw + 1 || LZ === 1.6) { a = a2; b = Math.max(a2 + 2 * hw + 0.3, b2); break; }
    }
    e.x0 = a + hw; e.x1 = Math.max(a + hw, b - hw); e.x = Math.min(e.x1, Math.max(e.x0, e.x));
  }
  for (const e of L.enemies) for (const f of L.enemies) {
    if (e === f || e.t !== f.t || f.x <= e.x || e.x1 + 0.53 + 2.5 <= f.x0 - 0.53) continue; // arada en az 2,5 blok boş iniş yeri
    const mid = (e.x + f.x) / 2; e.x1 = Math.max(e.x0, Math.min(e.x1, mid - 1.25 - 0.53)); f.x0 = Math.min(f.x1, Math.max(f.x0, mid + 1.25 + 0.53));
  }
  // sıkışıp yürüyemeyen düşman (dar zemin + kafes + komşu düşman) kaldırılır: yerinde sayan düşman tuzak olur
  L.enemies = L.enemies.filter((e) => e.x1 - e.x0 >= 0.6);
}

// Gerçek zıplama ölçümü: düz zeminde tam hızda, tuş basılı tam zıplama → rota uzunluğu
let JUMP = null;
function jumpPath() {
  if (JUMP) return JUMP;
  const flat = { solid: (x, y) => y < 0, oneway: [] }, p = newPlayer(0, 0); p.ground = true; p.vx = P.RUN;
  const inp = { right: true, jump: true, jumpPressed: true }, pts = [];
  for (let t = 0; t < 3; t += 1 / 60) { stepPlayer(flat, p, inp, 1 / 60); pts.push({ x: p.x, y: p.y }); if (t > 0.1 && p.ground) break; }
  return (JUMP = { pts, len: pts[pts.length - 1].x });
}
/** Boşluk geçişleri: altınlar doğru zıplamayı gösterir.
 *  - Güvenli kalkış noktası hesaplanır (tam zıplama karşı kıyıya kenardan ~1 blok sonra iner) ve oraya tabela konur.
 *  - Kalkıştan önceki altınlar yerde, kalkış noktasına doğru eşit aralıklı.
 *  - Boşluk üstündeki altınlar, o kalkıştan yapılan GERÇEK zıplamanın rotası üzerinde (Bolt'un gövde hizasında):
 *    ilk altın kalkıştan hemen sonra, son altın inişten hemen önce. Erken zıplatan yay kalmaz.
 *  - Fazla altınlar karşı kıyıda, iniş noktasının ötesinde yerde. */
function groundGapCoins(L) {
  const J = jumpPath(), cols = L.cols, DT = 1 / 60;
  for (const g of L.gaps) {
    const hb = cols[g.s - 1], ha = cols[g.e + 1], w = g.e - g.s + 1;
    if (!hb || !ha || ha > hb + 1 || w > 3) continue;                       // yalnızca tek zıplamalık boşluklar
    if (L.bridges.some((br) => br.x0 < g.s + 0.5 && br.x1 > g.e + 0.5)) continue; // köprülü boşluk
    if (L.rafts.some((r) => r.x < g.e + 1 && r.x + r.w + (r.axis === 'x' ? r.range : 0) > g.s)) continue;
    const mine = L.coins.filter((c) => c.x > g.s - 4.5 && c.x < g.e + 1 + 4.5 && (c.arc || c.y > Math.max(hb, ha) + 0.9 || !cols[Math.floor(c.x)]));
    // kalkış tabelası: tam zıplamayla karşıya geçilen kalkış aralığının ORTASI (önünden ve arkasından da geçilir)
    const lands = (d) => { const q = newPlayer(g.s - d, hb); q.ground = true; q.vx = P.RUN; const ii = { right: true, jump: true, jumpPressed: true }; let a = false;
      for (let t = 0; t < 3; t += DT) { stepPlayer(L, q, ii, DT); if (!q.ground) a = true; if (a && q.ground) return q.x > g.e + 1; if (q.y < -2) return false; } return false; };
    let best = null, cur = null;
    for (let d = -0.3; d <= 3.0001; d += 0.05) { if (lands(d)) { if (!cur) cur = [d, d]; else cur[1] = d; if (!best || cur[1] - cur[0] > best[1] - best[0]) best = [...cur]; } else cur = null; }
    if (!best) continue;
    const take = g.s - (best[0] + best[1]) / 2;
    // bu bölümün kendi zemininde gerçek zıplama
    const p = newPlayer(take, hb); p.ground = true; p.vx = P.RUN; const inp = { right: true, jump: true, jumpPressed: true }, path = [];
    let air = false;
    for (let t = 0; t < 3; t += DT) { stepPlayer(L, p, inp, DT); path.push({ x: p.x, y: p.y }); if (!p.ground) air = true; if (air && p.ground) break; if (p.y < -2) break; }
    if (!(p.ground && p.x > g.e + 1)) continue;                              // güvenli değilse dokunma
    const landX = p.x;
    L.signs.push({ x: take, y: hb, text: '', jump: true });
    // rota üstünde eşit aralıklı altınlar (yatayda 0,85)
    const arc = []; const x0 = take + 0.55, x1 = landX - 0.45, n = Math.max(3, Math.round((x1 - x0) / 0.85) + 1);
    for (let i = 0; i < n; i++) {
      const x = x0 + ((x1 - x0) * i) / (n - 1); const q = path.find((pt) => pt.x >= x) || path[path.length - 1];
      arc.push({ x, y: q.y + 0.72, gapArc: true });
    }
    // eski altınlar: kalkış öncesindekiler yere (kalkışa doğru), diğerleri iniş sonrasına (yere)
    const before = mine.filter((c) => c.x < take - 0.3).sort((a, b2) => a.x - b2.x);
    before.forEach((c, i, arr) => { c.x = take - 0.9 - (arr.length - 1 - i) * 0.9; c.y = hb + 0.75; c.arc = false; });
    const rest = mine.filter((c) => !before.includes(c)); const extra = Math.max(0, rest.length - arc.length);
    const thornAt = (x) => L.thorns.some((t) => x > t.x0 - 0.6 && x < t.x1 + 0.6);
    let lx = landX + 0.9;
    L.coins = L.coins.filter((c) => !rest.includes(c));
    for (let i = 0; i < extra; i++) { while (thornAt(lx) || L.solid(Math.floor(lx), Math.floor(ha + 0.75))) lx += 0.9; L.coins.push({ x: lx, y: (cols[Math.floor(lx)] || ha) + 0.75 }); lx += 0.9; }
    L.coins.push(...arc);
  }
  // aynı yere düşen altınları ayıkla
  L.coins = L.coins.filter((c, i) => !L.coins.some((d, j) => j < i && Math.abs(d.x - c.x) < 0.5 && Math.abs(d.y - c.y) < 0.5));
}
