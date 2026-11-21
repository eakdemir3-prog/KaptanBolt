// Gerçek parayla satın alma (Google Play, RevenueCat üzerinden).
// Yayından önce: RevenueCat panelinden aldığın Google Play "public SDK key"i IAP.apiKey'e yaz,
// Play Console'da aşağıdaki ürün kimlikleriyle ürünleri ve aboneliği oluştur.
import { Capacitor } from '@capacitor/core';

export const IAP = {
  apiKey: '',                      // örn. 'goog_xxxxxxxx' (RevenueCat > Project > API keys)
  entitlement: 'pro',
  products: {
    coins500: { id: 'kb_coins_500', coins: 500, price: '₺19,99' },
    coins1300: { id: 'kb_coins_1300', coins: 1300, bonus: 10, price: '₺44,99' },
    coins3000: { id: 'kb_coins_3000', coins: 3000, bonus: 20, price: '₺89,99' },
    coins8000: { id: 'kb_coins_8000', coins: 8000, bonus: 35, price: '₺199,99' },
    // bir kez alınabilen başlangıç paketi: 1500 altın + her güçten 3 + Korsan kostümü
    starter: { id: 'kb_starter_pack', coins: 1500, powers: 3, skin: 'korsan', once: true, price: '₺29,99' },
    proMonthly: { id: 'kb_pro_monthly', sub: true, price: '₺49,99 / ay' },
    proLifetime: { id: 'kb_pro_lifetime', price: '₺299,99' },
  },
};

const native = Capacitor.isNativePlatform();
let P = null, CAT = null, ready = false;
const storeProducts = {};

export async function initPurchases() {
  if (!native || !IAP.apiKey) return false;
  try {
    const mod = await import('@revenuecat/purchases-capacitor');
    P = mod.Purchases; CAT = mod.PRODUCT_CATEGORY;
    await P.configure({ apiKey: IAP.apiKey });
    const one = Object.values(IAP.products).filter((p) => !p.sub).map((p) => p.id);
    const subs = Object.values(IAP.products).filter((p) => p.sub).map((p) => p.id);
    const a = await P.getProducts({ productIdentifiers: one, type: CAT.NON_SUBSCRIPTION });
    const b = await P.getProducts({ productIdentifiers: subs, type: CAT.SUBSCRIPTION });
    for (const sp of [...(a.products || []), ...(b.products || [])]) storeProducts[sp.identifier.split(':')[0]] = sp;
    for (const p of Object.values(IAP.products)) if (storeProducts[p.id]) p.price = storeProducts[p.id].priceString + (p.sub ? ' / ay' : '');
    ready = true;
  } catch { ready = false; }
  return ready;
}

/** Satın alma: { ok, cancelled, message }. Tarayıcıda (test) sahte satın alma yapar. */
export async function buy(key) {
  const p = IAP.products[key];
  if (!native) return new Promise((res) => setTimeout(() => res({ ok: true, test: true }), 600));
  if (!ready) return { ok: false, message: 'Satın alma henüz aktif değil (mağaza bağlantısı kurulmadı).' };
  try {
    const sp = storeProducts[p.id];
    if (!sp) return { ok: false, message: 'Ürün bulunamadı.' };
    const r = await P.purchaseStoreProduct({ product: sp });
    return { ok: true, info: r.customerInfo };
  } catch (e) {
    if (e && (e.userCancelled || e.code === '1')) return { ok: false, cancelled: true };
    return { ok: false, message: 'Satın alma tamamlanamadı.' };
  }
}

/** Pro durumunu mağazadan oku: { active, lifetime, until } veya null */
export async function proStatus(info) {
  if (!native || !ready) return null;
  try {
    const ci = info || (await P.getCustomerInfo()).customerInfo;
    const ent = ci.entitlements.active[IAP.entitlement];
    if (!ent) return { active: false, lifetime: false, until: 0 };
    return { active: true, lifetime: !ent.expirationDate, until: ent.expirationDate ? Date.parse(ent.expirationDate) : 0 };
  } catch { return null; }
}

export async function restore() {
  if (!native || !ready) return null;
  try { const r = await P.restorePurchases(); return proStatus(r.customerInfo); } catch { return null; }
}
export const purchasesReady = () => !native || ready;
