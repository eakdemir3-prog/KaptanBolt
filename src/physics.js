// Oyuncu fiziği — oyun ve erişilebilirlik testi aynı kodu kullanır.
// Birim = 1 kare. y yukarı. Oyuncunun konumu ayaklarının ortası.
export const P = {
  RUN: 5.2, ACC: 22, AIR_ACC: 24, FRICT: 58, TURN: 2.8,
  G_UP: 38, G_DOWN: 60, G_APEX: 0.6, MAXFALL: 18,
  JUMP_H: 2.5, SPRING_H: 5.4, STOMP_H: 1.6, STOMP_HOLD_H: 2.8,
  PW: 0.62, PH: 1.22,
  COYOTE: 0.1, BUFFER: 0.13,
  MIN_JUMP: 0.05, CUT: 0.42,
  // altın toplama alanı (Bolt'un kutusuna göre): yanlardan 0,38, ayak altı 0,4, kafa+şapka üstü 0,6
  COIN_X: 0.38, COIN_DOWN: 0.4, COIN_UP: 0.6,
};
/** Altın, Bolt'un toplama alanında mı? (oyun, simülasyon ve geliştirici modu aynı kuralı kullanır) */
export const coinHit = (p, c) => Math.abs(p.x - c.x) < P.PW / 2 + P.COIN_X && c.y > p.y - P.COIN_DOWN && c.y < p.y + P.PH + P.COIN_UP;
P.JUMP = Math.sqrt(2 * P.G_UP * P.JUMP_H);
P.SPRING = Math.sqrt(2 * P.G_UP * P.SPRING_H);
P.STOMP = Math.sqrt(2 * P.G_UP * P.STOMP_H);
// zıplatan mantar türleri (Mantar Ormanı): 1 pembe az, 2 turkuaz orta, 3 altın çok
P.BOUNCE_H = { 1: 4.0, 2: 5.4, 3: 7.6 };
P.springV = (kind) => Math.sqrt(2 * P.G_UP * (P.BOUNCE_H[kind] || P.SPRING_H));
// spor bulutu: içindeyken yukarı süzülür (yerçekimini yener, hız sınırlı)
P.SPORE_LIFT = 95; P.SPORE_MAX = 4.6; P.STORM = 2.0; P.BELT = 2.4;
/** Yay/mantar ve spor bulutu etkileri (oyun ve test aynı kural). Basılan yayı döndürür. */
export function applyFields(L, p, dt) {
  let hit = null;
  for (const s of L.springs) if (p.vy <= 0 && Math.abs(p.x - s.x) < 0.75 && p.y >= s.y - 0.05 && p.y < s.y + 0.9) { p.vy = P.springV(s.kind); p.noCut = true; p.ground = false; p.surf = null; hit = s; break; }
  // bataklık kumu: yavaşlatır, zıplamayı kısaltır
  if (p.sandT > 0 && p.vy > P.JUMP * 0.76) p.vy = P.JUMP * 0.76;
  p.sandT = Math.max(0, (p.sandT || 0) - dt); p.inSand = false;
  if (L.sands) for (const z of L.sands) if (p.ground && Math.abs(p.y - z.y) < 0.05 && p.x > z.x0 && p.x < z.x1) { p.inSand = true; p.sandT = 0.09; p.vx = Math.max(-P.RUN * 0.45, Math.min(P.RUN * 0.45, p.vx)); break; }
  // kaygan buz: bir sonraki adımda ivme ve sürtünme azalır (kayarsın)
  p.onIce = false;
  if (L.ices) for (const z of L.ices) if (p.ground && Math.abs(p.y - z.y) < 0.05 && p.x > z.x0 && p.x < z.x1) { p.onIce = true; break; }
  // konveyör bant: üstünde durana yön verir
  if (L.belts) for (const z of L.belts) if (p.ground && Math.abs(p.y - z.y) < 0.05 && p.x > z.x0 && p.x < z.x1) { moveX(L, p, z.dir * P.BELT * dt, P.PW, P.PH); break; }
  // kum fırtınası: rüzgâr sola iter
  p.inStorm = false;
  if (L.storms) for (const z of L.storms) if (p.x > z.x0 && p.x < z.x1) { p.inStorm = true; moveX(L, p, -P.STORM * dt, P.PW, P.PH); break; }
  p.inSpore = false;
  if (L.spores) for (const z of L.spores) if (p.x > z.x0 && p.x < z.x1 && p.y + P.PH * 0.5 > z.y0 && p.y < z.y1) {
    p.inSpore = true; p.noCut = true; p.vy = Math.min(Math.max(p.vy, -6) + P.SPORE_LIFT * dt, P.SPORE_MAX); if (p.vy > 0) { p.ground = false; p.surf = null; }
    break;
  }
  return hit;
}
P.STOMP_HOLD = Math.sqrt(2 * P.G_UP * P.STOMP_HOLD_H);

/** Yatay hareket + duvar çarpışması. L.solid(ix, iy) */
export function moveX(L, o, dx, w, h) {
  o.x += dx;
  const y0 = o.y + 0.02, y1 = o.y + h - 0.02;
  if (dx > 0) { const xr = o.x + w / 2; for (let y = Math.floor(y0); y <= Math.floor(y1); y++) if (L.solid(Math.floor(xr), y)) { o.x = Math.floor(xr) - w / 2 - 0.001; return true; } }
  else if (dx < 0) { const xl = o.x - w / 2; for (let y = Math.floor(y0); y <= Math.floor(y1); y++) if (L.solid(Math.floor(xl), y)) { o.x = Math.floor(xl) + 1 + w / 2 + 0.001; return true; } }
  return false;
}
/** Dikey hareket: katı kareler + tek yönlü yüzeyler (köprü, sal). Dönüş: 'down' | 'up' | null; o.on = üstünde durulan sal */
export function moveY(L, o, dy, w, h) {
  const yPrev = o.y;
  o.y += dy;
  const x0 = o.x - w / 2 + 0.03, x1 = o.x + w / 2 - 0.03;
  if (dy < 0) {
    for (let x = Math.floor(x0); x <= Math.floor(x1); x++) if (L.solid(x, Math.floor(o.y))) { o.y = Math.floor(o.y) + 1; return { hit: 'down', solidBlock: { x, y: Math.floor(o.y) - 1 } }; }
    for (const s of L.oneway) { // yalnızca yukarıdan basılır
      if (x1 < s.x0 || x0 > s.x1) continue;
      if (yPrev >= s.y - 0.001 && o.y <= s.y) { o.y = s.y; return { hit: 'down', surf: s }; }
    }
  } else if (dy > 0) {
    const yt = o.y + h;
    for (let x = Math.floor(x0); x <= Math.floor(x1); x++) if (L.solid(x, Math.floor(yt))) { o.y = Math.floor(yt) - h - 0.001; return { hit: 'up', block: { x, y: Math.floor(yt) } }; }
  }
  return null;
}

/** Oyuncuyu bir adım ilerletir. inp: {left,right,jump,jumpPressed}. Olayları ev dizisine yazar. */
export function stepPlayer(L, p, inp, dt, ev = []) {
  // üstünde durduğu sal hareket ediyorsa onunla taşın
  if (p.ground && p.surf && p.surf.dx !== undefined) { moveX(L, p, p.surf.dx, P.PW, P.PH); p.y = p.surf.y; }
  const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
  if (dir) {
    const acc = (p.ground ? P.ACC * (p.onIce ? 0.3 : 1) : P.AIR_ACC) * (p.vx * dir < 0 ? (p.onIce && p.ground ? 1.2 : P.TURN) : 1);
    p.vx = Math.max(-P.RUN, Math.min(P.RUN, p.vx + dir * acc * dt)); p.face = dir;
  } else { const f = (p.ground ? P.FRICT * (p.onIce ? 0.06 : 1) : P.FRICT * 0.3) * dt; p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f; }
  p.coyote = p.ground ? P.COYOTE : p.coyote - dt;
  p.buffer = inp.jumpPressed ? P.BUFFER : p.buffer - dt; inp.jumpPressed = false;
  if (p.buffer > 0 && p.coyote > 0) { p.vy = P.JUMP; p.ground = false; p.surf = null; p.coyote = 0; p.buffer = 0; p.cut = false; p.jt = 0; ev.push('jump'); }
  // kısa dokunuşta bile en az MIN_JUMP sn tam güçle yükselir (telefonda 1 karelik dokunuş da okunaklı zıplasın)
  p.jt = (p.jt || 0) + dt;
  if (!inp.jump && !p.noCut && !p.cut && p.vy > 0 && p.jt >= P.MIN_JUMP) { p.vy *= P.CUT; p.cut = true; }
  if (p.vy <= 0) p.noCut = false;
  let g = p.vy > 0 ? P.G_UP : P.G_DOWN;
  if (Math.abs(p.vy) < 2 && inp.jump && !p.ground) g *= P.G_APEX;
  p.vy = Math.max(-P.MAXFALL, p.vy - g * dt);
  if (moveX(L, p, p.vx * dt, P.PW, P.PH)) p.vx = 0;
  const vyBefore = p.vy;
  const r = moveY(L, p, p.vy * dt, P.PW, P.PH);
  if (r && r.hit === 'down') { if (!p.ground) { ev.push(vyBefore < -8 ? 'landHard' : 'land'); if (r.solidBlock && vyBefore < -3) ev.push({ landOn: r.solidBlock }); } p.ground = true; p.vy = 0; p.surf = r.surf || null; p.landVy = vyBefore; }
  else { if (r && r.hit === 'up') { p.vy = Math.min(0, p.vy); ev.push({ bump: r.block }); } p.ground = false; p.surf = null; }
  return ev;
}

export function newPlayer(x, y) { return { x, y, vx: 0, vy: 0, ground: false, face: 1, coyote: 0, buffer: 0, surf: null }; }
