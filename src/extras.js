// Büyüme özellikleri: puan isteme, paylaşım kartı, hatırlatma bildirimleri
import { Capacitor } from '@capacitor/core';
import { KbNative } from './purchases.js';
import { tx } from './i18n.js';

const native = Capacitor.isNativePlatform();
export const STORE_URL = 'https://play.google.com/store/apps/details?id=com.eavisionlabs.kaptanbolt';

// ---------------- Puan isteme ----------------
/** Mutlu anda (boss yenildi, 2+ yıldız) Google Play'in puan penceresini aç. En fazla 3 kez, aralarında 60 gün. */
export function maybeReview(data, { boss, stars }) {
  if (!native || !boss || stars < 2) return false;
  const r = data.review || (data.review = { n: 0, at: 0 });
  const wins = (data.stats && data.stats.wins) || 0;
  if (r.n >= 3 || wins < 15 || Date.now() - r.at < 60 * 864e5) return false;
  r.n++; r.at = Date.now();
  setTimeout(() => { KbNative.requestReview().catch(() => {}); }, 1600);
  return true;
}

// ---------------- Paylaşım kartı ----------------
function loadImg(src) { return new Promise((ok) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; }); }
/** 1080×1080 paylaşım kartı: kostümlü Bolt, bölüm, yıldızlar */
export async function shareCard({ title, sub, stars = 0, heroSrc }) {
  const c = document.createElement('canvas'); c.width = 1080; c.height = 1080; const g = c.getContext('2d');
  const bg = g.createRadialGradient(540, 420, 80, 540, 540, 760); bg.addColorStop(0, '#3a2f8f'); bg.addColorStop(0.6, '#1b1450'); bg.addColorStop(1, '#0b0a24'); g.fillStyle = bg; g.fillRect(0, 0, 1080, 1080);
  for (let i = 0; i < 90; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + Math.random() * 0.6})`; g.beginPath(); g.arc(Math.random() * 1080, Math.random() * 700, Math.random() * 2.4, 0, 7); g.fill(); }
  const glow = g.createRadialGradient(540, 520, 20, 540, 520, 330); glow.addColorStop(0, 'rgba(90,230,255,.45)'); glow.addColorStop(1, 'rgba(90,230,255,0)'); g.fillStyle = glow; g.fillRect(0, 0, 1080, 1080);
  const hero = heroSrc ? await loadImg(heroSrc) : null;
  if (hero) { const h = 560, w = h * (hero.width / hero.height); g.drawImage(hero, 540 - w / 2, 250, w, h); }
  g.textAlign = 'center';
  g.font = '900 italic 92px Montserrat, Poppins, sans-serif'; g.fillStyle = '#e8fbff'; g.shadowColor = 'rgba(90,230,255,.9)'; g.shadowBlur = 30;
  g.fillText(tx('KAPTAN BOLT'), 540, 150); g.shadowBlur = 0;
  g.font = '800 46px Poppins, sans-serif'; g.fillStyle = '#ffd23a'; g.fillText(tx(title), 540, 880);
  g.font = '700 34px Poppins, sans-serif'; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText(tx(sub), 540, 935);
  for (let i = 0; i < 3; i++) { g.font = '80px sans-serif'; g.fillStyle = i < stars ? '#ffd23a' : 'rgba(255,255,255,.18)'; g.fillText('★', 420 + i * 120, 230); }
  g.font = '700 28px Poppins, sans-serif'; g.fillStyle = 'rgba(255,255,255,.6)'; g.fillText('Google Play • EA Vision Labs', 540, 1030);
  const png = c.toDataURL('image/png');
  const text = tx(`${tx(title)} — ${tx(sub)}\nKaptan Bolt: Son Hamle'yi sen de oyna: ${STORE_URL}`);
  if (native) { try { await KbNative.shareImage({ png, text }); return true; } catch { return false; } }
  try { if (navigator.share) { await navigator.share({ text }); return true; } } catch { /* yok */ }
  return false;
}

// ---------------- Hatırlatma bildirimleri ----------------
let LN = null;
async function ln() { if (!native) return null; if (!LN) { try { LN = (await import('@capacitor/local-notifications')).LocalNotifications; } catch { LN = null; } } return LN; }
/** İzin: ilk birkaç bölümden sonra bir kez sorulur */
export async function askNotifyPermission(data) {
  const L = await ln(); if (!L || data.notifAsked) return;
  data.notifAsked = true;
  try { const p = await L.checkPermissions(); if (p.display !== 'granted') await L.requestPermissions(); } catch { /* yok */ }
}
/** Uygulama arka plana geçince: enerji dolunca ve ertesi gün akşam günlük bulmaca için hatırlat */
export async function scheduleReminders({ enabled, fullEnergyMs, dailyDoneToday }) {
  const L = await ln(); if (!L) return;
  try {
    await L.cancel({ notifications: [{ id: 101 }, { id: 102 }] });
    if (!enabled) return;
    const p = await L.checkPermissions(); if (p.display !== 'granted') return;
    const list = [];
    if (fullEnergyMs > 60000) list.push({ id: 101, title: tx('⚡ Enerjin doldu!'), body: tx('Kaptan Bolt seni bekliyor, yeni bölümlere hazırsın.'), schedule: { at: new Date(Date.now() + fullEnergyMs), allowWhileIdle: true }, smallIcon: 'ic_stat_bolt' });
    const t = new Date(); t.setHours(19, 0, 0, 0); if (dailyDoneToday || t.getTime() < Date.now() + 30 * 60000) t.setDate(t.getDate() + 1);
    list.push({ id: 102, title: tx('🧩 Günün bulmacası hazır'), body: tx('Serini bozma! Bugünün bulmacasını çöz, altını kap.'), schedule: { at: t, allowWhileIdle: true }, smallIcon: 'ic_stat_bolt' });
    await L.schedule({ notifications: list });
  } catch { /* yok */ }
}
export async function cancelReminders() { const L = await ln(); if (!L) return; try { await L.cancel({ notifications: [{ id: 101 }, { id: 102 }] }); } catch { /* yok */ } }
