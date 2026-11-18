// Basit animasyon sistemi
const active = new Set();
export const ease = {
  linear: (t) => t,
  outQuad: (t) => 1 - (1 - t) * (1 - t),
  inQuad: (t) => t * t,
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  outBack: (t) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
  outElastic: (t) => (t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
};

/** tween(süre ms, (t)=>{...}, easing) -> Promise */
export function tween(ms, fn, e = ease.linear) {
  return new Promise((resolve) => {
    active.add({ start: performance.now(), ms, fn, e, resolve });
  });
}
export const wait = (ms) => tween(ms, () => {});

export function updateTweens(now) {
  for (const a of active) {
    const t = Math.min(1, (now - a.start) / a.ms);
    a.fn(a.e(t), t);
    if (t >= 1) { active.delete(a); a.resolve(); }
  }
}
export const tweensRunning = () => active.size > 0;
export function clearTweens() { for (const a of active) a.resolve(); active.clear(); }
