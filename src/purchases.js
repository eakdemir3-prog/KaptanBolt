// Gerçek parayla satın alma — doğrudan Google Play Faturalandırma (KbNative eklentisi, RevenueCat yok).
// Akış: buy() → Google ödeme ekranı → eklenti "purchase" olayı gönderir → oyun ödülü verip kaydeder → finish() ile tüketilir/onaylanır.
// Aynı satın alma (token) iki kez ödüllendirilmez; jetonlar kayıtta (data.iapTokens) tutulur ve buluta da gider.
import { Capacitor, registerPlugin } from '@capacitor/core';

export const KbNative = registerPlugin('KbNative');

export const IAP = {
  products: {
    coins500: { id: 'kb_coins_500', coins: 500, price: '₺19,99' },
    coins1300: { id: 'kb_coins_1300', coins: 1300, bonus: 10, price: '₺44,99' },
    coins3000: { id: 'kb_coins_3000', coins: 3000, bonus: 20, price: '₺89,99' },
    coins8000: { id: 'kb_coins_8000', coins: 8000, bonus: 35, price: '₺199,99' },
    // bir kez alınabilen başlangıç paketi: 1500 altın + her güçten 3 + Korsan kostümü (tüketilmez, onaylanır)
    starter: { id: 'kb_starter_pack', coins: 1500, powers: 3, skin: 'korsan', once: true, price: '₺29,99' },
    // Play'deki "ocak-indirimi" teklifi 31 Ocak 2027'ye kadar %33 indirim: 299,99 → 200,99
    proLifetime: { id: 'kb_pro_lifetime', pro: true, price: '₺200,99', oldPrice: '₺299,99', saleEnd: '2027-02-01T00:00:00+03:00', salePct: 33 },
  },
};
/** Tüketilen (tekrar alınabilen) ürünler */
export const consumable = (key) => !!IAP.products[key] && !IAP.products[key].once && !IAP.products[key].pro;
export const keyOf = (id) => Object.keys(IAP.products).find((k) => IAP.products[k].id === id);

const native = Capacitor.isNativePlatform();
let ready = false;
let onPurchase = null;     // (key, token, info) => true | 'dup' | false
let pendingBuy = null;     // { key, resolve }

/** Oyun tarafı: satın alma geldiğinde çağrılacak işleyici */
export function setPurchaseHandler(fn) { onPurchase = fn; }

async function handle(ev) {
  const key = keyOf(ev.id);
  if (!key || ev.state !== 'purchased') {
    if (pendingBuy && ev.state === 'pending') { pendingBuy.resolve({ ok: false, message: 'Ödeme onay bekliyor. Onaylanınca ürün otomatik gelecek.' }); pendingBuy = null; }
    return;
  }
  let granted = false;  // true: ödül verildi, 'dup': bu jeton zaten verilmişti, false: verilemedi (sonra tekrar denenir)
  try { granted = onPurchase ? await onPurchase(key, ev.token, ev) : false; } catch { granted = false; }
  if (granted) {
    if (consumable(key)) KbNative.finish({ token: ev.token, consume: true }).catch(() => {});
    else if (!ev.acknowledged) KbNative.finish({ token: ev.token, consume: false }).catch(() => {});
  }
  if (pendingBuy && pendingBuy.key === key) { pendingBuy.resolve({ ok: true, handled: true }); pendingBuy = null; }
}

export async function initPurchases() {
  if (!native) return false;
  try {
    await KbNative.addListener('purchase', (ev) => { handle(ev); });
    await KbNative.addListener('purchaseError', (ev) => {
      if (pendingBuy) { pendingBuy.resolve(ev.cancelled ? { ok: false, cancelled: true } : { ok: false, message: 'Satın alma tamamlanamadı.' }); pendingBuy = null; }
    });
    const r = await KbNative.init({ ids: Object.values(IAP.products).map((p) => p.id) });
    const ps = r.products || {};
    for (const p of Object.values(IAP.products)) {
      const s = ps[p.id];
      if (!s) continue;
      p.price = s.price || p.price;
      if (p.pro) { p.oldPrice = s.sale ? s.full : ''; if (!s.sale) p.saleEnd = '2000-01-01T00:00:00Z'; }
    }
    ready = !!r.ready;
    // Bekleyen / daha önce alınmış ürünleri getir (yarım kalan ödemeler, Pro)
    KbNative.restore().catch(() => {});
  } catch { ready = false; }
  return ready;
}

/** Satın alma: { ok, cancelled, message, handled }. Tarayıcıda (test) sahte satın alma yapar. */
export async function buy(key) {
  const p = IAP.products[key];
  if (!native) return new Promise((res) => setTimeout(() => res({ ok: true, test: true }), 600));
  if (!ready) return { ok: false, message: 'Mağazaya bağlanılamadı. İnternetini kontrol edip tekrar dene.' };
  if (pendingBuy) return { ok: false, message: 'Bir satın alma zaten sürüyor.' };
  return new Promise((resolve) => {
    pendingBuy = { key, resolve };
    KbNative.buy({ id: p.id }).catch(() => { if (pendingBuy) { pendingBuy = null; resolve({ ok: false, message: 'Satın alma başlatılamadı.' }); } });
  });
}

/** Geri yükle: Play'deki sahip olunan ürünleri yeniden işler. { ok, owned:[key] } */
export async function restore() {
  if (!native || !ready) return null;
  try { const r = await KbNative.restore(); return { ok: r.ok, owned: (r.owned || []).map(keyOf).filter(Boolean) }; } catch { return null; }
}
export const purchasesReady = () => !native || ready;
export const isNative = native;
