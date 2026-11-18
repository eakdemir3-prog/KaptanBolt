# Kaptan Bolt: Son Hamle

EA Vision Labs – çevrimdışı, tek oyunculu 3D bulmaca oyunu (Android).

## 1. aşama içeriği
- 3D oyun (three.js) + Android paketi (Capacitor 6)
- 3 dünya, 60 bölüm: Taş Zindan (1–20), Anahtar Mahzeni (21–40), Buz Mağarası (41–60)
- Kaydırma kontrolü, çöken kareler, anahtarlar, kilitli kapı, buzda kayma
- 3 yıldız sistemi: bitir / karelerin %70'ini çökert / hepsini çökert
- İpucu (çözücü sıradaki doğru hamleyi gösterir), çıkmaz rota uyarısı
- Öğreticiler (bölüm 1, 21, 41), ayarlar, ses/müzik/titreşim, ilerleme kaydı

## Komutlar
| İş | Komut |
|---|---|
| Kurulum | `npm ci` |
| Geliştirme sunucusu | `npm run dev` |
| Kural testleri + 60 bölüm çözücü kontrolü | `npm test` |
| Bölümleri yeniden üret | `npm run generate` |
| Web derlemesi | `npm run build` |
| Debug APK (Android SDK + JDK 17 gerekir) | `npm run android:apk` |
| Tarayıcı testleri (Python Playwright) | `npx vite preview --port 4173` sonra `python3 tests/e2e.py` |

APK, GitHub'a her gönderimde `.github/workflows/android.yml` ile otomatik üretilir ve
"Releases → son-surum" sayfasına konur.

## Klasörler
- `src/logic/rules.js` – oyun kuralları (oyun, çözücü ve testler aynı dosyayı kullanır)
- `src/logic/solver.js` – çözücü (en kısa çözüm, 3 yıldız çözümü, çıkmaz tespiti)
- `src/levels/levels.json` – bölüm verileri (elle düzenlenebilir: `.` kare, `#` boşluk, `i` buz, `S` başlangıç, `K` anahtar, `D` kapı)
- `tools/generate.mjs`, `tools/validate.mjs` – bölüm üretici ve doğrulayıcı
- `src/game/` – 3D sahne, modeller, animasyon
- `android/` – Android projesi (paket: com.eavisionlabs.kaptanbolt)
