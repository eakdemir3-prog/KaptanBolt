// Haftalık etkinlik: her pazartesi yenilenen, internetsiz, haftaya göre seçilen 3 kademeli hedef
import { safeNow } from './clock.js';

const EVENTS = [
  { id: 'wins', ic: '🏁', name: 'Maraton Haftası', text: (n) => `${n} bölüm bitir`, tiers: [8, 20, 40] },
  { id: 'stars3', ic: '⭐', name: 'Mükemmellik Haftası', text: (n) => `${n} kez ⭐⭐⭐ al`, tiers: [5, 12, 25] },
  { id: 'daily', ic: '🧩', name: 'Bulmaca Haftası', text: (n) => `${n} günlük bulmaca çöz`, tiers: [2, 4, 6] },
  { id: 'bosses', ic: '👑', name: 'Boss Avı Haftası', text: (n) => `${n} boss yen (tekrar dahil)`, tiers: [1, 3, 5] },
];

/** Pazartesi 00:00 yerel saatine göre hafta anahtarı: "2026-11-23" */
export function weekKey(t = safeNow()) {
  const d = new Date(t); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
/** Haftanın bitimine kalan süre (ms) */
export function weekLeft(t = safeNow()) {
  const d = new Date(t); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7) + 7);
  return d.getTime() - t;
}
function eventFor(wk) {
  let h = 0; for (const c of wk) h = (h * 31 + c.charCodeAt(0)) | 0;
  return EVENTS[Math.abs(h) % EVENTS.length];
}

/** Haftalık durumu hazırlar; hafta değiştiyse sayacı sıfırlar. stats: data.stats */
export function weekly(d, reward = 300, t = safeNow()) {
  const wk = weekKey(t);
  const ev = eventFor(wk);
  const st = d.stats || {};
  if (!d.weekly || d.weekly.wk !== wk) d.weekly = { wk, base: st[ev.id] || 0, claimed: 0 };
  const w = d.weekly;
  const have = Math.max(0, (st[ev.id] || 0) - w.base);
  const tiers = ev.tiers.map((n, i) => ({
    n, i, done: have >= n, claimed: w.claimed > i,
    coins: Math.round(reward * [0.25, 0.5, 1][i]), power: i === 2,
  }));
  return { ev, wk, have, tiers, text: ev.text, ready: tiers.filter((x) => x.done && !x.claimed).length };
}

/** Sıradaki kademeyi al. Dönüş: {coins, power} ya da null */
export function claimWeekly(d, reward = 300, t = safeNow()) {
  const s = weekly(d, reward, t);
  const tier = s.tiers[d.weekly.claimed];
  if (!tier || !tier.done) return null;
  d.weekly.claimed++;
  return tier;
}
