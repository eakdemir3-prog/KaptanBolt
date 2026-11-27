// Oyuncu fiziği — oyun ve erişilebilirlik testi aynı kodu kullanır.
// Birim = 1 kare. y yukarı. Oyuncunun konumu ayaklarının ortası.
export const P = {
  RUN: 6.8, ACC: 55, AIR_ACC: 38, FRICT: 60, TURN: 2.0,
  G_UP: 46, G_DOWN: 74, G_APEX: 0.6, MAXFALL: 22,
  JUMP_H: 3.3, SPRING_H: 6.4, STOMP_H: 2.0, STOMP_HOLD_H: 3.6,
  PW: 0.62, PH: 1.22,
  COYOTE: 0.1, BUFFER: 0.13,
};
P.JUMP = Math.sqrt(2 * P.G_UP * P.JUMP_H);
P.SPRING = Math.sqrt(2 * P.G_UP * P.SPRING_H);
P.STOMP = Math.sqrt(2 * P.G_UP * P.STOMP_H);
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
    const acc = (p.ground ? P.ACC : P.AIR_ACC) * (p.vx * dir < 0 ? P.TURN : 1);
    p.vx = Math.max(-P.RUN, Math.min(P.RUN, p.vx + dir * acc * dt)); p.face = dir;
  } else { const f = (p.ground ? P.FRICT : P.FRICT * 0.3) * dt; p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f; }
  p.coyote = p.ground ? P.COYOTE : p.coyote - dt;
  p.buffer = inp.jumpPressed ? P.BUFFER : p.buffer - dt; inp.jumpPressed = false;
  if (p.buffer > 0 && p.coyote > 0) { p.vy = P.JUMP; p.ground = false; p.surf = null; p.coyote = 0; p.buffer = 0; p.cut = false; ev.push('jump'); }
  if (!inp.jump && !p.noCut && !p.cut && p.vy > 0) { p.vy *= 0.5; p.cut = true; }
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
