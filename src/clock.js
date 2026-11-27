// Saat geri alma koruması: telefonun saati ileri alınıp geri getirilirse enerji ve günlük ödüller
// gerçek zaman o noktayı geçene kadar yenilenmez. Saat yanlışlıkla çok ileri gitmişse (3 günden fazla) kabul edilir.
const K = 'kaptanbolt.maxSeen';
const LIMIT = 3 * 24 * 3600 * 1000;
let maxSeen = 0;
try { maxSeen = +(globalThis.localStorage && localStorage.getItem(K)) || 0; } catch { maxSeen = 0; }
export function safeNow() {
  const n = Date.now();
  if (n > maxSeen || maxSeen - n > LIMIT) { maxSeen = n; try { globalThis.localStorage && localStorage.setItem(K, String(n)); } catch { /* yok */ } }
  return maxSeen;
}
