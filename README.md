# Kaptan Bolt: Son Hamle

EA Vision Labs – çevrimdışı, tek oyunculu 3D bulmaca oyunu (Android).

## İçerik (1. + 2. + 3. aşama)
- 3D oyun (three.js) + Android paketi (Capacitor 6)
- 10 dünya, 200 bölüm: Taş Zindan, Anahtar Mahzeni, Buz Mağarası, Devriye Fabrikası, Yosunlu Kale, Işınlanma Labı, Takipçi İni, Köprü Ustası, Ok Labirenti, Son Kale
- Düğme/köprü ve ok kareler; düşmanlar ilk hamlede uyanır, tehlikeli kareler kırmızı X ile gösterilir, bölüm başına 3 Geri Al
- 8 robot kostümü (yıldızla açılır), her gün tarihten üretilen günlük bulmaca ve seri
- TEST MODU: Ayarlar'da "Tüm bölümler açık" (Play Store'dan önce varsayılanı kapatılacak: src/save.js)
- Her dünyanın 20. bölümü boss (2x2 dev robot; çukurlara çekilip düşürülür)
- Devriye ve takipçi düşman robotlar, sağlam taş, portallar
- Kaydırma kontrolü, çöken kareler, anahtarlar, kilitli kapı, buzda kayma
- 3 yıldız sistemi: bitir / karelerin %70'ini çökert / hepsini çökert
- İpucu (çözücü sıradaki doğru hamleyi gösterir), çıkmaz rota uyarısı
- Öğreticiler (bölüm 1, 21, 41), ayarlar, ses/müzik/titreşim, ilerleme kaydı

## Komutlar
| İş | Komut |
|---|---|
| Kurulum | `npm ci` |
| Geliştirme sunucusu | `npm run dev` |
| Kural testleri + 200 bölüm çözücü kontrolü | `npm test` |
| Bölümleri yeniden üret | `npm run generate` |
| Web derlemesi | `npm run build` |
| Debug APK (Android SDK + JDK 17 gerekir) | `npm run android:apk` |
| Tarayıcı testleri (Python Playwright) | `npx vite preview --port 4173` sonra `python3 tests/e2e.py` |

APK, GitHub'a her gönderimde `.github/workflows/android.yml` ile otomatik üretilir ve
"Releases → son-surum" sayfasına konur.

## Klasörler
- `src/logic/rules.js` – oyun kuralları (oyun, çözücü ve testler aynı dosyayı kullanır)
- `src/logic/solver.js` – çözücü (en kısa çözüm, 3 yıldız çözümü, çıkmaz tespiti)
- `src/levels/levels.json` – bölüm verileri (elle düzenlenebilir: `.` kare, `#` boşluk, `i` buz, `o` sağlam taş, `1-4` portal çifti, `b` düğme, `=` köprü, `^ v < >` ok kareler, `S` başlangıç, `K` anahtar, `D` kapı; `enemies`, `boss`, `stars` alanları)
- `tools/generate.mjs`, `tools/validate.mjs` – bölüm üretici ve doğrulayıcı
- `src/game/` – 3D sahne, modeller, animasyon
- `android/` – Android projesi (paket: com.eavisionlabs.kaptanbolt)

## Ses ve müzik
Tüm müzik ve sesler `tools/audio/synth.py` ile kodla bestelenir/sentezlenir (telifli örnek yok): `python3 tools/audio/synth.py` → `public/audio/*.ogg`.
Menü teması, boss parçası ve her dünya için ayrı oyun teması varyasyonu var.

## Reklamlar (AdMob)
`src/ads.js` içinde şimdilik Google TEST kimlikleri kullanılıyor. Yayından önce:
1. `src/ads.js` → `testing: false`, kendi ödüllü ve geçiş reklamı birim kimlikleri
2. `android/app/src/main/AndroidManifest.xml` → `com.google.android.gms.ads.APPLICATION_ID` kendi uygulama kimliğin
Yerleşimler: enerji (+1, günde 5), bölüm sonu altın x2, ipucu, kaybedince devam; geçiş reklamı bölüm 11'den sonra her 4 bölümde bir.

## Mağaza, güçler ve satın alma
- Güçler (altınla): Onarım, Dondur, Zıpla, Kalkan, Yol Haritası, +3 Geri Al — `src/economy.js` POWERS
- Altın sadece bölüm/boss/günlük/görev/başarım/reklam ile kazanılır; tekrar oynamada sadece yeni yıldızların karşılığı verilir
- Gerçek para: `src/purchases.js` (RevenueCat). Yayından önce `IAP.apiKey` doldurulmalı; Play Console ürün kimlikleri:
  kb_coins_500, kb_coins_1300, kb_coins_3000, kb_coins_8000 (tüketilebilir), kb_pro_lifetime (tek seferlik), kb_pro_monthly (abonelik). RevenueCat yetki (entitlement) adı: `pro`
- Pro: geçiş reklamı yok, sınırsız enerji, günlük 100 altın, 2x bölüm altını, Pro Kaptan kostümü
