// Reklamlar (AdMob) — gerçek EA Vision Labs kimlikleri.
// Uygulama kimliği android/app/src/main/AndroidManifest.xml içindeki APPLICATION_ID'de.
import { Capacitor } from '@capacitor/core';

export const ADS = {
  testing: false,
  rewarded: 'ca-app-pub-2435516035253344/7380675767',     // Odullu
  interstitial: 'ca-app-pub-2435516035253344/1282171274', // Gecis
  interstitialEvery: 4,   // her 4 bölümde bir
  interstitialFromLevel: 11, // ilk 10 bölümde hiç geçiş reklamı yok
};

const native = Capacitor.isNativePlatform();
let AdMob = null, Events = null, ready = false, sinceInterstitial = 0;

export async function initAds() {
  if (!native) return;
  try {
    const mod = await import('@capacitor-community/admob');
    AdMob = mod.AdMob; Events = mod.RewardAdPluginEvents;
    await AdMob.initialize({ initializeForTesting: ADS.testing });
    // Avrupa (GDPR) izin formu: gerekiyorsa gösterilir
    try {
      const info = await AdMob.requestConsentInfo();
      if (info.isConsentFormAvailable && info.status === mod.AdmobConsentStatus.REQUIRED) await AdMob.showConsentForm();
    } catch { /* izin formu yoksa sorun değil */ }
    ready = true;
  } catch (e) { ready = false; }
}

/** Tarayıcıda (test için) sahte reklam: 2 sn bekler, ödül verir */
function fakeAd(label) {
  return new Promise((res) => {
    const d = document.createElement('div');
    d.style.cssText = 'position:fixed;inset:0;z-index:99;background:#000d;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;font:700 18px Poppins,sans-serif;gap:10px';
    d.innerHTML = `<div style="font-size:40px">📺</div><div>${label}</div><div style="font-size:12px;opacity:.7">Test reklamı • 2 sn</div>`;
    document.body.appendChild(d);
    setTimeout(() => { d.remove(); res(true); }, 2000);
  });
}

/** Ödüllü reklam: izlenip ödül hak edilirse true döner */
export async function showRewarded() {
  if (!native) return fakeAd('Ödüllü reklam');
  if (!ready) return false;
  let rewarded = false;
  const h = await AdMob.addListener(Events.Rewarded, () => { rewarded = true; });
  try {
    await AdMob.prepareRewardVideoAd({ adId: ADS.rewarded, isTesting: ADS.testing });
    const item = await AdMob.showRewardVideoAd();
    if (item) rewarded = true;
  } catch { /* yüklenemedi veya kapatıldı */ }
  h.remove();
  return rewarded;
}

/** Bölüm bitince çağrılır; uygun zamandaysa geçiş reklamı gösterir */
export async function maybeInterstitial(levelId) {
  if (levelId < ADS.interstitialFromLevel) return false;
  sinceInterstitial++;
  if (sinceInterstitial < ADS.interstitialEvery) return false;
  sinceInterstitial = 0;
  if (!native) { await fakeAd('Geçiş reklamı'); return true; }
  if (!ready) return false;
  try {
    await AdMob.prepareInterstitial({ adId: ADS.interstitial, isTesting: ADS.testing });
    await AdMob.showInterstitial();
    return true;
  } catch { return false; }
}
export const adsAvailable = () => !native || ready;
