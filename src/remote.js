// Ölçüm (Firebase Analytics + Crashlytics) ve uzaktan ayar (Remote Config)
import { Capacitor } from '@capacitor/core';
import { KbNative } from './purchases.js';
import { ADS } from './ads.js';

const native = Capacitor.isNativePlatform();

/** Uzaktan değiştirilebilen ayarlar. Firebase Remote Config'te aynı adla anahtar açılırsa onun değeri kullanılır. */
export const RC = {
  inter_every: 4,          // kaç bölümde bir geçiş reklamı
  inter_from: 11,          // geçiş reklamının başladığı bölüm
  weekly_on: true,         // haftalık etkinlik açık mı
  weekly_reward: 300,      // haftalık etkinlik ödülü (altın)
  kb2_teaser: true,        // ana menüde Kaptan Bolt 2 kartı
  kb2_url: '',             // KB2 yayınlanınca Play linki (boşsa "Yakında")
  pro_sale_end: '',        // Pro indiriminin bitişi (ISO tarih) — boşsa uygulamadaki değer
  notice: '',              // ana menüde gösterilecek kısa duyuru
};

function coerce(def, v) {
  if (typeof def === 'number') { const n = Number(v); return Number.isFinite(n) ? n : def; }
  if (typeof def === 'boolean') return v === 'true' || v === true;
  return String(v);
}

export async function initRemote(onReady) {
  if (!native) { onReady && onReady(RC); return; }
  try {
    const r = await KbNative.remoteConfig();
    const vals = (r && r.values) || {};
    for (const k of Object.keys(RC)) if (vals[k] !== undefined && vals[k] !== '') RC[k] = coerce(RC[k], vals[k]);
  } catch { /* varsayılanlar */ }
  ADS.interstitialEvery = Math.max(2, RC.inter_every | 0);
  ADS.interstitialFromLevel = Math.max(1, RC.inter_from | 0);
  onReady && onReady(RC);
}

/** Analytics olayı — olmayan ortamda sessizce geçer */
export function track(name, params = {}) {
  if (!native) return;
  try { KbNative.logEvent({ name, params }).catch(() => {}); } catch { /* yok */ }
}
export function setUserProps(props) {
  if (!native) return;
  try { KbNative.setUser({ props }).catch(() => {}); } catch { /* yok */ }
}

/** Yakalanmamış JS hatalarını Crashlytics'e gönder (oturum başına en fazla 5) */
let sent = 0;
function report(message, stack) {
  if (!native || sent >= 5) return; sent++;
  try { KbNative.logError({ message: String(message).slice(0, 300), stack: String(stack || '') }).catch(() => {}); } catch { /* yok */ }
}
export function initCrashReports() {
  window.addEventListener('error', (e) => report(e.message, e.error && e.error.stack));
  window.addEventListener('unhandledrejection', (e) => { const r = e.reason || {}; report(r.message || String(r), r.stack); });
}
