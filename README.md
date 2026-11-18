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
